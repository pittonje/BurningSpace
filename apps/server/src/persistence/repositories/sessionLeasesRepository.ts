import type { Client } from 'pg';

export type Queryable = Pick<Client, 'query'>;

export type LeaseStatus = 'active' | 'recovering' | 'released';

export interface DurableLease {
  readonly worldId: string;
  readonly playerId: string;
  readonly leaseId: string;
  readonly credentialId: string;
  readonly serverInstanceId: string;
  readonly writerEpoch: bigint;
  readonly roomId: string;
  readonly transportSessionId: string;
  readonly status: LeaseStatus;
  readonly expiresAt: Date;
  readonly reconnectDeadline: Date | null;
}

interface LeaseRow {
  readonly world_id: string;
  readonly player_id: string;
  readonly lease_id: string;
  readonly credential_id: string;
  readonly server_instance_id: string;
  readonly writer_epoch: string;
  readonly room_id: string;
  readonly transport_session_id: string;
  readonly status: LeaseStatus;
  readonly expires_at: Date;
  readonly reconnect_deadline: Date | null;
}

function toLease(row: LeaseRow): DurableLease {
  return {
    worldId: row.world_id,
    playerId: row.player_id,
    leaseId: row.lease_id,
    credentialId: row.credential_id,
    serverInstanceId: row.server_instance_id,
    writerEpoch: BigInt(row.writer_epoch),
    roomId: row.room_id,
    transportSessionId: row.transport_session_id,
    status: row.status,
    expiresAt: row.expires_at,
    reconnectDeadline: row.reconnect_deadline
  };
}

export interface AcquireLeaseParams {
  readonly worldId: string;
  readonly playerId: string;
  readonly credentialId: string;
  readonly serverInstanceId: string;
  readonly writerEpoch: bigint;
  readonly roomId: string;
  readonly transportSessionId: string;
  readonly activeTtlSeconds: number;
}

export type AcquireLeaseResult =
  | { readonly outcome: 'acquired'; readonly leaseId: string; readonly expiresAt: Date }
  | { readonly outcome: 'identity_in_use' };

function requirePositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return value;
}

/**
 * One gameplay lease per (world_id, player_id) -- enforced structurally by
 * the migration's primary key, never by application-level dedup. Locks the
 * existing row (if any) for the caller's transaction, then:
 *
 * - no row: inserts a brand-new active lease with a fresh lease_id;
 * - an exact-match unexpired active row (same server/epoch/room/transport/
 *   credential): idempotent -- refreshes expiry, returns the SAME lease_id;
 * - a released row, an expired active row, or an expired-deadline
 *   recovering row: reclaimed with a NEW lease_id;
 * - any other unexpired active/recovering row (i.e. belonging to a
 *   different transport session): rejected as identity_in_use, no mutation.
 */
export async function acquireGameplayLease(
  client: Queryable,
  params: AcquireLeaseParams
): Promise<AcquireLeaseResult> {
  const ttlSeconds = requirePositiveInteger(params.activeTtlSeconds, 'activeTtlSeconds');

  // Race-safe insert-first convergence (mirrors bootstrapWorld's and
  // establishPlayerFaction's pattern): normal callers always reach this
  // serialized behind the membership row lock already taken earlier in
  // the same profile transaction, but this function is independently
  // race-safe too -- a concurrent first-ever acquisition for the same
  // (world_id, player_id) never raises a raw unique-constraint error.
  const insertResult = await client.query<LeaseRow>(
    `INSERT INTO active_session_leases
       (world_id, player_id, lease_id, credential_id, server_instance_id, writer_epoch,
        room_id, transport_session_id, status, acquired_at, updated_at, expires_at, reconnect_deadline)
     VALUES ($1, $2, gen_random_uuid(), $3, $4, $5, $6, $7, 'active',
             clock_timestamp(), clock_timestamp(), clock_timestamp() + interval '${ttlSeconds} seconds', NULL)
     ON CONFLICT (world_id, player_id) DO NOTHING
     RETURNING world_id, player_id, lease_id, credential_id, server_instance_id, writer_epoch,
               room_id, transport_session_id, status, expires_at, reconnect_deadline`,
    [
      params.worldId,
      params.playerId,
      params.credentialId,
      params.serverInstanceId,
      params.writerEpoch.toString(),
      params.roomId,
      params.transportSessionId
    ]
  );
  const insertedRow = insertResult.rows[0];

  if (insertedRow) {
    return { outcome: 'acquired', leaseId: insertedRow.lease_id, expiresAt: insertedRow.expires_at };
  }

  const lockResult = await client.query<LeaseRow & { db_now: Date }>(
    `SELECT world_id, player_id, lease_id, credential_id, server_instance_id, writer_epoch,
            room_id, transport_session_id, status, expires_at, reconnect_deadline, clock_timestamp() AS db_now
     FROM active_session_leases WHERE world_id = $1 AND player_id = $2 FOR UPDATE`,
    [params.worldId, params.playerId]
  );
  const existingRow = lockResult.rows[0];

  if (!existingRow) {
    throw new Error('Failed to create or find gameplay lease after an INSERT conflict.');
  }

  const existing = toLease(existingRow);
  const dbNow = existingRow.db_now;
  const isExpired =
    (existing.status === 'active' && existing.expiresAt.getTime() <= dbNow.getTime()) ||
    (existing.status === 'recovering' &&
      existing.reconnectDeadline !== null &&
      existing.reconnectDeadline.getTime() <= dbNow.getTime());
  const isReleased = existing.status === 'released';
  const isSameSession =
    existing.serverInstanceId === params.serverInstanceId &&
    existing.writerEpoch === params.writerEpoch &&
    existing.roomId === params.roomId &&
    existing.transportSessionId === params.transportSessionId &&
    existing.credentialId === params.credentialId;

  if (isReleased || isExpired) {
    const reclaimResult = await client.query<LeaseRow>(
      `UPDATE active_session_leases
       SET lease_id = gen_random_uuid(), credential_id = $3, server_instance_id = $4, writer_epoch = $5,
           room_id = $6, transport_session_id = $7, status = 'active', reconnect_deadline = NULL,
           acquired_at = clock_timestamp(), updated_at = clock_timestamp(),
           expires_at = clock_timestamp() + interval '${ttlSeconds} seconds'
       WHERE world_id = $1 AND player_id = $2
       RETURNING world_id, player_id, lease_id, credential_id, server_instance_id, writer_epoch,
                 room_id, transport_session_id, status, expires_at, reconnect_deadline`,
      [
        params.worldId,
        params.playerId,
        params.credentialId,
        params.serverInstanceId,
        params.writerEpoch.toString(),
        params.roomId,
        params.transportSessionId
      ]
    );
    const row = reclaimResult.rows[0];
    if (!row) {
      throw new Error('Failed to reclaim gameplay lease: no row returned.');
    }
    return { outcome: 'acquired', leaseId: row.lease_id, expiresAt: row.expires_at };
  }

  if (isSameSession && existing.status === 'active') {
    const refreshResult = await client.query<{ expires_at: Date }>(
      `UPDATE active_session_leases
       SET updated_at = clock_timestamp(), expires_at = clock_timestamp() + interval '${ttlSeconds} seconds'
       WHERE world_id = $1 AND player_id = $2 AND lease_id = $3
       RETURNING expires_at`,
      [params.worldId, params.playerId, existing.leaseId]
    );
    const row = refreshResult.rows[0];
    return { outcome: 'acquired', leaseId: existing.leaseId, expiresAt: row?.expires_at ?? existing.expiresAt };
  }

  return { outcome: 'identity_in_use' };
}

export interface LeaseIdentityParams {
  readonly worldId: string;
  readonly playerId: string;
  readonly leaseId: string;
  readonly serverInstanceId: string;
  readonly writerEpoch: bigint;
}

/**
 * Lease-table-only renewal: requires the exact lease/world/player/server/
 * epoch, status='active', and an unexpired current lease. Callers
 * (gameplayAuthority) are responsible for also verifying world writer
 * authority and credential liveness in the SAME transaction -- this
 * function deliberately does not join other tables.
 */
export async function renewGameplayLease(
  client: Queryable,
  params: LeaseIdentityParams & { readonly activeTtlSeconds: number }
): Promise<Date | null> {
  const ttlSeconds = requirePositiveInteger(params.activeTtlSeconds, 'activeTtlSeconds');
  const result = await client.query<{ expires_at: Date }>(
    `UPDATE active_session_leases
     SET expires_at = clock_timestamp() + interval '${ttlSeconds} seconds', updated_at = clock_timestamp()
     WHERE world_id = $1 AND player_id = $2 AND lease_id = $3 AND server_instance_id = $4 AND writer_epoch = $5
       AND status = 'active' AND expires_at > clock_timestamp()
     RETURNING expires_at`,
    [params.worldId, params.playerId, params.leaseId, params.serverInstanceId, params.writerEpoch.toString()]
  );
  return result.rows[0]?.expires_at ?? null;
}

export type MarkRecoveringResult =
  | { readonly outcome: 'recovering'; readonly reconnectDeadline: Date }
  | { readonly outcome: 'already_recovering'; readonly reconnectDeadline: Date }
  | { readonly outcome: 'not_found' };

/**
 * Transitions active -> recovering exactly once, using a single DB
 * timestamp for both reconnect_deadline and expires_at (migration 001's
 * CHECK requires them equal while recovering). A repeat call against an
 * already-recovering exact lease returns the EXISTING fixed deadline
 * unchanged -- it is never extended by retries.
 */
export async function markRecovering(
  client: Queryable,
  params: LeaseIdentityParams & { readonly graceSeconds: number }
): Promise<MarkRecoveringResult> {
  const graceSeconds = requirePositiveInteger(params.graceSeconds, 'graceSeconds');
  const updateResult = await client.query<{ reconnect_deadline: Date }>(
    `WITH db_time AS (SELECT clock_timestamp() AS now)
     UPDATE active_session_leases
     SET status = 'recovering',
         reconnect_deadline = (SELECT now FROM db_time) + interval '${graceSeconds} seconds',
         expires_at = (SELECT now FROM db_time) + interval '${graceSeconds} seconds',
         updated_at = (SELECT now FROM db_time)
     FROM db_time
     WHERE world_id = $1 AND player_id = $2 AND lease_id = $3 AND server_instance_id = $4 AND writer_epoch = $5
       AND status = 'active'
     RETURNING reconnect_deadline`,
    [params.worldId, params.playerId, params.leaseId, params.serverInstanceId, params.writerEpoch.toString()]
  );
  const updatedRow = updateResult.rows[0];

  if (updatedRow) {
    return { outcome: 'recovering', reconnectDeadline: updatedRow.reconnect_deadline };
  }

  const currentResult = await client.query<{ status: LeaseStatus; reconnect_deadline: Date | null }>(
    `SELECT status, reconnect_deadline FROM active_session_leases
     WHERE world_id = $1 AND player_id = $2 AND lease_id = $3 AND server_instance_id = $4 AND writer_epoch = $5`,
    [params.worldId, params.playerId, params.leaseId, params.serverInstanceId, params.writerEpoch.toString()]
  );
  const currentRow = currentResult.rows[0];

  if (currentRow && currentRow.status === 'recovering' && currentRow.reconnect_deadline !== null) {
    return { outcome: 'already_recovering', reconnectDeadline: currentRow.reconnect_deadline };
  }

  return { outcome: 'not_found' };
}

/**
 * Transitions recovering -> active only for the exact lease/world/player/
 * credential/server/epoch, only while status='recovering' and the fixed
 * reconnect_deadline has not yet passed. Returns the new expires_at, or
 * null if any condition fails (caller must then keep control closed).
 */
export async function resumeRecoveringLease(
  client: Queryable,
  params: LeaseIdentityParams & { readonly credentialId: string; readonly activeTtlSeconds: number }
): Promise<Date | null> {
  const ttlSeconds = requirePositiveInteger(params.activeTtlSeconds, 'activeTtlSeconds');
  const result = await client.query<{ expires_at: Date }>(
    `WITH db_time AS (SELECT clock_timestamp() AS now)
     UPDATE active_session_leases
     SET status = 'active', reconnect_deadline = NULL,
         expires_at = (SELECT now FROM db_time) + interval '${ttlSeconds} seconds',
         updated_at = (SELECT now FROM db_time)
     FROM db_time
     WHERE world_id = $1 AND player_id = $2 AND lease_id = $3 AND server_instance_id = $4 AND writer_epoch = $5
       AND credential_id = $6
       AND status = 'recovering' AND reconnect_deadline > db_time.now
     RETURNING expires_at`,
    [
      params.worldId,
      params.playerId,
      params.leaseId,
      params.serverInstanceId,
      params.writerEpoch.toString(),
      params.credentialId
    ]
  );
  return result.rows[0]?.expires_at ?? null;
}

export interface ReleaseLeaseParams {
  readonly worldId: string;
  readonly playerId: string;
  readonly leaseId: string;
}

/**
 * Releases the exact lease_id, using one DB timestamp for both expires_at
 * and updated_at. Filtering by exact lease_id is the callback fence: a
 * stale release for an already-reclaimed (different lease_id) row affects
 * zero rows and never touches the successor lease.
 */
export async function releaseGameplayLease(client: Queryable, params: ReleaseLeaseParams): Promise<boolean> {
  const result = await client.query(
    `WITH db_time AS (SELECT clock_timestamp() AS now)
     UPDATE active_session_leases
     SET status = 'released', reconnect_deadline = NULL,
         expires_at = (SELECT now FROM db_time), updated_at = (SELECT now FROM db_time)
     FROM db_time
     WHERE world_id = $1 AND player_id = $2 AND lease_id = $3 AND status <> 'released'`,
    [params.worldId, params.playerId, params.leaseId]
  );
  return (result.rowCount ?? 0) > 0;
}

/** Read-only lookup, for tests and diagnostics. Never used to gate authority. */
export async function findGameplayLease(
  client: Queryable,
  worldId: string,
  playerId: string
): Promise<DurableLease | null> {
  const result = await client.query<LeaseRow>(
    `SELECT world_id, player_id, lease_id, credential_id, server_instance_id, writer_epoch,
            room_id, transport_session_id, status, expires_at, reconnect_deadline
     FROM active_session_leases WHERE world_id = $1 AND player_id = $2`,
    [worldId, playerId]
  );
  const row = result.rows[0];
  return row ? toLease(row) : null;
}
