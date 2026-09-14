import type { Client } from 'pg';

/**
 * Every method here accepts an already-connected client so callers control
 * connection/transaction lifetime (a dedicated pg.Client for writer/bootstrap
 * work, never the shared application Pool for these operations).
 */
export type Queryable = Pick<Client, 'query'>;

export const WORLD_LIFECYCLE_ACTIVE = 'active';
export const WORLD_LIFECYCLE_RETIRED = 'retired';
export const SUPPORTED_DOMAIN_VERSION = 1;
export const WORLD_WRITER_TTL_SECONDS = 15;

export class WorldNotFoundError extends Error {
  constructor(worldSlugOrId: string) {
    super(`World not bootstrapped: "${worldSlugOrId}". Run world:bootstrap to create it.`);
    this.name = 'WorldNotFoundError';
  }
}

export type WorldIncompatibleReason = 'retired' | 'domain_version_mismatch';

export class WorldIncompatibleError extends Error {
  readonly reason: WorldIncompatibleReason;

  constructor(reason: WorldIncompatibleReason, message: string) {
    super(message);
    this.name = 'WorldIncompatibleError';
    this.reason = reason;
  }
}

export interface DurableWorld {
  readonly worldId: string;
  readonly worldSlug: string;
  readonly lifecycleStatus: 'active' | 'retired';
  readonly stateRevision: bigint;
  readonly domainVersion: number;
}

export interface WriterClaim {
  readonly worldId: string;
  readonly serverInstanceId: string;
  readonly writerEpoch: bigint;
  readonly writerExpiresAt: Date;
}

export interface WorldWriterConflict {
  readonly kind: 'live_writer_conflict';
  readonly writerExpiresAt: Date;
}

export type ClaimWorldWriterResult = { readonly kind: 'claimed'; readonly claim: WriterClaim } | WorldWriterConflict;

interface WorldRow {
  readonly world_id: string;
  readonly world_slug: string;
  readonly lifecycle_status: 'active' | 'retired';
  readonly state_revision: string;
  readonly domain_version: number;
}

function toDurableWorld(row: WorldRow): DurableWorld {
  return {
    worldId: row.world_id,
    worldSlug: row.world_slug,
    lifecycleStatus: row.lifecycle_status,
    stateRevision: BigInt(row.state_revision),
    domainVersion: row.domain_version
  };
}

function assertCompatible(identifier: string, lifecycleStatus: 'active' | 'retired', domainVersion: number): void {
  if (lifecycleStatus !== WORLD_LIFECYCLE_ACTIVE) {
    throw new WorldIncompatibleError('retired', `World "${identifier}" is retired and cannot be used.`);
  }
  if (domainVersion !== SUPPORTED_DOMAIN_VERSION) {
    throw new WorldIncompatibleError(
      'domain_version_mismatch',
      `World "${identifier}" has incompatible domain_version ${domainVersion}; expected ${SUPPORTED_DOMAIN_VERSION}.`
    );
  }
}

export async function findWorldBySlug(client: Queryable, worldSlug: string): Promise<DurableWorld | null> {
  const result = await client.query<WorldRow>(
    'SELECT world_id, world_slug, lifecycle_status, state_revision, domain_version FROM worlds WHERE world_slug = $1',
    [worldSlug]
  );
  const row = result.rows[0];
  return row ? toDurableWorld(row) : null;
}

export interface BootstrapWorldResult {
  readonly status: 'created' | 'existing';
  readonly world: DurableWorld;
}

/**
 * Race-safe insert-first convergence: the loser of a concurrent INSERT blocks
 * on the winner's row lock, then reads back the one canonical row. Never
 * generates a second UUID for the same slug.
 */
export async function bootstrapWorld(client: Queryable, worldSlug: string): Promise<BootstrapWorldResult> {
  await client.query('BEGIN');
  try {
    const insertResult = await client.query<WorldRow>(
      `INSERT INTO worlds (world_slug, lifecycle_status, state_revision, domain_version)
       VALUES ($1, 'active', 0, 1)
       ON CONFLICT (world_slug) DO NOTHING
       RETURNING world_id, world_slug, lifecycle_status, state_revision, domain_version`,
      [worldSlug]
    );

    let row: WorldRow;
    let status: 'created' | 'existing';

    const insertedRow = insertResult.rows[0];
    if (insertedRow) {
      row = insertedRow;
      status = 'created';
    } else {
      const selectResult = await client.query<WorldRow>(
        `SELECT world_id, world_slug, lifecycle_status, state_revision, domain_version
         FROM worlds WHERE world_slug = $1 FOR UPDATE`,
        [worldSlug]
      );
      const selectedRow = selectResult.rows[0];
      if (!selectedRow) {
        throw new WorldNotFoundError(worldSlug);
      }
      row = selectedRow;
      status = 'existing';
    }

    const world = toDurableWorld(row);
    assertCompatible(worldSlug, world.lifecycleStatus, world.domainVersion);

    await client.query('COMMIT');
    return { status, world };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}

export interface ClaimWorldWriterParams {
  readonly worldId: string;
  readonly serverInstanceId: string;
}

interface WorldWriterRow {
  readonly world_id: string;
  readonly lifecycle_status: 'active' | 'retired';
  readonly domain_version: number;
  readonly writer_instance_id: string | null;
  readonly writer_expires_at: Date | null;
  readonly writer_epoch: string;
  readonly db_now: Date;
}

/**
 * One DB transaction: locks the world row, validates compatibility, refuses
 * to evict a live foreign writer, idempotently renews this same process's
 * still-live claim, or takes over (incrementing writer_epoch) and reconciles
 * stale prior-epoch operational leases to 'released' in the same transaction.
 * Never touches membership/faction rows or worlds.state_revision.
 */
export async function claimWorldWriter(client: Queryable, params: ClaimWorldWriterParams): Promise<ClaimWorldWriterResult> {
  const { worldId, serverInstanceId } = params;
  await client.query('BEGIN');
  try {
    const selectResult = await client.query<WorldWriterRow>(
      `SELECT world_id, lifecycle_status, domain_version, writer_instance_id, writer_expires_at, writer_epoch, clock_timestamp() AS db_now
       FROM worlds WHERE world_id = $1 FOR UPDATE`,
      [worldId]
    );
    const row = selectResult.rows[0];
    if (!row) {
      throw new WorldNotFoundError(worldId);
    }

    assertCompatible(worldId, row.lifecycle_status, row.domain_version);

    const dbNow = row.db_now;
    const currentEpoch = BigInt(row.writer_epoch);
    const hasLiveOtherWriter =
      row.writer_instance_id !== null &&
      row.writer_expires_at !== null &&
      row.writer_expires_at.getTime() > dbNow.getTime() &&
      row.writer_instance_id !== serverInstanceId;

    if (hasLiveOtherWriter) {
      await client.query('ROLLBACK');
      return { kind: 'live_writer_conflict', writerExpiresAt: row.writer_expires_at as Date };
    }

    const sameProcessStillLive =
      row.writer_instance_id === serverInstanceId &&
      row.writer_expires_at !== null &&
      row.writer_expires_at.getTime() > dbNow.getTime();

    let writerEpoch: bigint;
    let writerExpiresAt: Date;

    if (sameProcessStillLive) {
      writerEpoch = currentEpoch;
      const renewResult = await client.query<{ writer_expires_at: Date }>(
        `UPDATE worlds
         SET writer_expires_at = clock_timestamp() + interval '${WORLD_WRITER_TTL_SECONDS} seconds', updated_at = clock_timestamp()
         WHERE world_id = $1
         RETURNING writer_expires_at`,
        [worldId]
      );
      writerExpiresAt = renewResult.rows[0]!.writer_expires_at;
    } else {
      writerEpoch = currentEpoch + 1n;
      const claimResult = await client.query<{ writer_expires_at: Date }>(
        `UPDATE worlds
         SET writer_instance_id = $2,
             writer_epoch = $3,
             writer_expires_at = clock_timestamp() + interval '${WORLD_WRITER_TTL_SECONDS} seconds',
             updated_at = clock_timestamp()
         WHERE world_id = $1
         RETURNING writer_expires_at`,
        [worldId, serverInstanceId, writerEpoch.toString()]
      );
      writerExpiresAt = claimResult.rows[0]!.writer_expires_at;

      await client.query(
        `UPDATE active_session_leases
         SET status = 'released', reconnect_deadline = NULL, updated_at = clock_timestamp(), expires_at = clock_timestamp()
         WHERE world_id = $1 AND status <> 'released' AND writer_epoch <> $2`,
        [worldId, writerEpoch.toString()]
      );
    }

    await client.query('COMMIT');
    return {
      kind: 'claimed',
      claim: { worldId, serverInstanceId, writerEpoch, writerExpiresAt }
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}

export interface RenewWorldWriterParams {
  readonly worldId: string;
  readonly serverInstanceId: string;
  readonly writerEpoch: bigint;
}

/**
 * Conditional renewal: zero rows means writer authority is lost (stale
 * epoch, foreign instance, or already-expired lease). Never resurrects an
 * expired writer.
 */
export async function renewWorldWriter(client: Queryable, params: RenewWorldWriterParams): Promise<Date | null> {
  const result = await client.query<{ writer_expires_at: Date }>(
    `UPDATE worlds
     SET writer_expires_at = clock_timestamp() + interval '${WORLD_WRITER_TTL_SECONDS} seconds', updated_at = clock_timestamp()
     WHERE world_id = $1 AND writer_instance_id = $2 AND writer_epoch = $3 AND writer_expires_at > clock_timestamp()
     RETURNING writer_expires_at`,
    [params.worldId, params.serverInstanceId, params.writerEpoch.toString()]
  );
  return result.rows[0]?.writer_expires_at ?? null;
}

export interface VerifyCurrentWriterParams {
  readonly worldId: string;
  readonly serverInstanceId: string;
  readonly writerEpoch: bigint;
}

export interface VerifiedWriter {
  readonly dbNow: Date;
}

/**
 * Locks the world row (FOR UPDATE) for the duration of the caller's
 * transaction and verifies, using DB time, that this exact process is
 * CURRENTLY the live writer: active lifecycle, supported domain version,
 * matching instance/epoch, and an unexpired writer lease. Intended to be
 * called as the first step inside a durable gameplay-authority transaction
 * (world -> player -> credential -> membership -> session lease lock
 * order); Packet-3's in-memory isControlSafe() remains a useful cheap gate
 * BEFORE opening the transaction, but this is the authoritative DB-verified
 * check INSIDE it. Returns null (never throws) on any mismatch so callers
 * uniformly roll back and report writer_authority_lost.
 */
export async function lockAndVerifyCurrentWriter(
  client: Queryable,
  params: VerifyCurrentWriterParams
): Promise<VerifiedWriter | null> {
  const result = await client.query<{
    lifecycle_status: 'active' | 'retired';
    domain_version: number;
    writer_instance_id: string | null;
    writer_epoch: string;
    writer_expires_at: Date | null;
    db_now: Date;
  }>(
    `SELECT lifecycle_status, domain_version, writer_instance_id, writer_epoch, writer_expires_at, clock_timestamp() AS db_now
     FROM worlds WHERE world_id = $1 FOR UPDATE`,
    [params.worldId]
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const isVerified =
    row.lifecycle_status === WORLD_LIFECYCLE_ACTIVE &&
    row.domain_version === SUPPORTED_DOMAIN_VERSION &&
    row.writer_instance_id === params.serverInstanceId &&
    BigInt(row.writer_epoch) === params.writerEpoch &&
    row.writer_expires_at !== null &&
    row.writer_expires_at.getTime() > row.db_now.getTime();

  return isVerified ? { dbNow: row.db_now } : null;
}

/**
 * Increments worlds.state_revision by exactly one. Callers are responsible
 * for calling this exactly once per semantic durable transition (never for
 * retries, heartbeats, or metadata-only changes) -- see gameplayAuthority.ts.
 */
export async function incrementWorldStateRevision(client: Queryable, worldId: string): Promise<void> {
  await client.query(
    'UPDATE worlds SET state_revision = state_revision + 1, updated_at = clock_timestamp() WHERE world_id = $1',
    [worldId]
  );
}

export interface ReleaseWorldWriterParams {
  readonly worldId: string;
  readonly serverInstanceId: string;
  readonly writerEpoch: bigint;
}

/**
 * Conditional release: never clears another instance's or another epoch's
 * writer row, never decrements/resets writer_epoch.
 */
export async function releaseWorldWriter(client: Queryable, params: ReleaseWorldWriterParams): Promise<boolean> {
  const result = await client.query(
    `UPDATE worlds
     SET writer_instance_id = NULL, writer_expires_at = NULL, updated_at = clock_timestamp()
     WHERE world_id = $1 AND writer_instance_id = $2 AND writer_epoch = $3`,
    [params.worldId, params.serverInstanceId, params.writerEpoch.toString()]
  );
  return (result.rowCount ?? 0) > 0;
}
