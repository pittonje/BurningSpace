import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, describe, expect, test } from 'vitest';
import { redactDatabaseUrl } from '../../src/persistence/config.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import {
  bootstrapWorld,
  claimWorldWriter,
  renewWorldWriter,
  releaseWorldWriter,
  type Queryable
} from '../../src/persistence/repositories/worldsRepository.js';

const ADMIN_DATABASE_URL =
  process.env.BURNINGSPACE_TEST_DATABASE_URL ??
  'postgres://burningspace_test_admin:burningspace_test_password@127.0.0.1:55432/burningspace_test';

async function isDatabaseReachable(): Promise<boolean> {
  const client = new Client({ connectionString: ADMIN_DATABASE_URL, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

const databaseAvailable = await isDatabaseReachable();

if (!databaseAvailable) {
  console.warn(
    '[writerFencing.test.ts] Skipping real-PostgreSQL tests: ' +
      `no reachable database at ${redactDatabaseUrl(ADMIN_DATABASE_URL)}. ` +
      'Start deploy/docker-compose.test.db.yml to run them.'
  );
}

const disposableDatabaseNames: string[] = [];

async function createMigratedDatabase(): Promise<{ databaseUrl: string; databaseName: string }> {
  const databaseName = `bs_test_${randomUUID().replace(/-/g, '')}`;
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${databaseName}`);
  } finally {
    await admin.end();
  }
  disposableDatabaseNames.push(databaseName);
  const url = new URL(ADMIN_DATABASE_URL);
  url.pathname = `/${databaseName}`;
  const databaseUrl = url.toString();
  await runMigrations(databaseUrl);
  return { databaseUrl, databaseName };
}

async function dropDatabase(databaseName: string): Promise<void> {
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  try {
    await admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [databaseName]
    );
    await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
  } finally {
    await admin.end();
    const index = disposableDatabaseNames.indexOf(databaseName);
    if (index >= 0) {
      disposableDatabaseNames.splice(index, 1);
    }
  }
}

interface SeedLeaseParams {
  readonly worldId: string;
  readonly faction: 'red' | 'blue';
  readonly serverInstanceId: string;
  readonly writerEpoch: number;
  readonly status: 'active' | 'recovering' | 'released';
  /** Exactly two hex characters; must be unique per call within one test. */
  readonly hashByte: string;
}

/**
 * Seeds a real player + immutable faction membership + credential + one
 * active_session_leases row through genuine inserts (never a fabricated
 * shape), for tests that need a durable lease under a specific starting
 * status/epoch. Uses `now()` (transaction-stable), not `clock_timestamp()`,
 * so a 'released' fixture row's own expires_at/updated_at are trivially
 * equal and never itself a source of shape-check flakiness.
 */
async function seedPlayerAndLease(client: Client, params: SeedLeaseParams): Promise<string> {
  const playerResult = await client.query<{ player_id: string }>(
    'INSERT INTO players DEFAULT VALUES RETURNING player_id'
  );
  const playerId = playerResult.rows[0]!.player_id;
  await client.query(
    `INSERT INTO world_memberships (world_id, player_id, faction, faction_assigned_at)
     VALUES ($1, $2, $3, now())`,
    [params.worldId, playerId, params.faction]
  );
  const credentialResult = await client.query<{ credential_id: string }>(
    `INSERT INTO player_credentials (player_id, algorithm, credential_hash)
     VALUES ($1, 'sha256', decode(repeat($2, 32), 'hex'))
     RETURNING credential_id`,
    [playerId, params.hashByte]
  );
  const credentialId = credentialResult.rows[0]!.credential_id;
  const roomId = `room-${params.hashByte}`;
  const transportSessionId = `transport-${params.hashByte}`;

  if (params.status === 'released') {
    await client.query(
      `INSERT INTO active_session_leases
         (world_id, player_id, credential_id, server_instance_id, writer_epoch, room_id, transport_session_id, status, expires_at, reconnect_deadline, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'released', now(), NULL, now())`,
      [params.worldId, playerId, credentialId, params.serverInstanceId, params.writerEpoch, roomId, transportSessionId]
    );
  } else if (params.status === 'recovering') {
    await client.query(
      `INSERT INTO active_session_leases
         (world_id, player_id, credential_id, server_instance_id, writer_epoch, room_id, transport_session_id, status, expires_at, reconnect_deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'recovering', now() + interval '1 hour', now() + interval '1 hour')`,
      [params.worldId, playerId, credentialId, params.serverInstanceId, params.writerEpoch, roomId, transportSessionId]
    );
  } else {
    await client.query(
      `INSERT INTO active_session_leases
         (world_id, player_id, credential_id, server_instance_id, writer_epoch, room_id, transport_session_id, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', now() + interval '1 hour')`,
      [params.worldId, playerId, credentialId, params.serverInstanceId, params.writerEpoch, roomId, transportSessionId]
    );
  }

  return playerId;
}

async function readLeaseShape(
  client: Client,
  worldId: string,
  playerId: string
): Promise<{ status: string; reconnectDeadline: Date | null; expiresEqualsUpdated: boolean; updatedAt: Date }> {
  const result = await client.query<{
    status: string;
    reconnect_deadline: Date | null;
    expires_equals_updated: boolean;
    updated_at: Date;
  }>(
    `SELECT status, reconnect_deadline,
            (expires_at = updated_at) AS expires_equals_updated,
            updated_at
     FROM active_session_leases WHERE world_id = $1 AND player_id = $2`,
    [worldId, playerId]
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error(`No active_session_leases row for world ${worldId} / player ${playerId}.`);
  }
  return {
    status: row.status,
    reconnectDeadline: row.reconnect_deadline,
    expiresEqualsUpdated: row.expires_equals_updated,
    updatedAt: row.updated_at
  };
}

async function readStateRevision(client: Client, worldId: string): Promise<bigint> {
  const result = await client.query<{ state_revision: string }>(
    'SELECT state_revision FROM worlds WHERE world_id = $1',
    [worldId]
  );
  return BigInt(result.rows[0]!.state_revision);
}

/**
 * Installs a schema-qualified, test-only VOLATILE clock: every call inserts
 * a row and returns a value derived from that row's own strictly-increasing
 * identity, so distinct calls are provably distinct without depending on
 * real wall-clock timing or machine load. Confined to this disposable test
 * database only; nothing here is ever installed against a real migration.
 */
async function installTestOnlyAdvancingClock(client: Client): Promise<void> {
  await client.query('CREATE SCHEMA IF NOT EXISTS test_only');
  await client.query('CREATE TABLE IF NOT EXISTS test_only.clock_calls (n BIGSERIAL PRIMARY KEY)');
  await client.query(`
    CREATE OR REPLACE FUNCTION test_only.advancing_clock() RETURNS timestamptz
    LANGUAGE sql VOLATILE AS $$
      INSERT INTO test_only.clock_calls DEFAULT VALUES
      RETURNING TIMESTAMPTZ '2000-01-01 00:00:00 UTC' + (n * INTERVAL '1 second')
    $$
  `);
}

async function countTestOnlyClockCalls(client: Client): Promise<number> {
  const result = await client.query<{ count: string }>('SELECT count(*)::text AS count FROM test_only.clock_calls');
  return Number(result.rows[0]!.count);
}

/** Uniquely identifies claimWorldWriter's stale-lease reconciliation UPDATE, and only it. */
const RECONCILIATION_STATEMENT_FINGERPRINT = ['active_session_leases', 'writer_epoch <>'];

/**
 * A narrowly scoped Queryable forwarding wrapper (no production
 * clock-injection API, no bespoke DB driver): every call is forwarded
 * unchanged to the real client EXCEPT the one statement matching
 * RECONCILIATION_STATEMENT_FINGERPRINT, where every clock_timestamp() text
 * occurrence is substituted with the deterministic test-only clock before
 * forwarding. Transaction control, predicates, assignments, and the real
 * constraint are all left completely intact -- only the volatile timestamp
 * SOURCE is swapped. Works identically against pre-fix SQL (two separate
 * clock_timestamp() call sites -> two distinct substituted values, the real
 * defect) and fixed SQL (one call site inside a multiply-referenced CTE ->
 * one substituted value, reused).
 */
function createClockDivergenceProbe(real: Queryable): { readonly probe: Queryable; interceptions(): number } {
  let interceptionCount = 0;

  function query(...args: unknown[]): unknown {
    const text = args[0];
    if (
      typeof text === 'string' &&
      RECONCILIATION_STATEMENT_FINGERPRINT.every((fragment) => text.includes(fragment))
    ) {
      interceptionCount += 1;
      const rewritten = text.replaceAll('clock_timestamp()', 'test_only.advancing_clock()');
      return (real.query as (...forwarded: unknown[]) => unknown)(rewritten, ...args.slice(1));
    }
    return (real.query as (...forwarded: unknown[]) => unknown)(...args);
  }

  return {
    probe: { query } as unknown as Queryable,
    interceptions: () => interceptionCount
  };
}

describe.skipIf(!databaseAvailable)('world writer fencing (real PostgreSQL)', () => {
  afterAll(async () => {
    for (const name of [...disposableDatabaseNames]) {
      await dropDatabase(name).catch(() => undefined);
    }
  });

  test('B cannot steal a live writer, but can take over strictly after expiry and prior-epoch leases are released', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const { world } = await bootstrapWorld(client, 'public-arena');
        const instanceA = randomUUID();
        const instanceB = randomUUID();
        const stateRevisionBefore = await readStateRevision(client, world.worldId);

        const claimA = await claimWorldWriter(client, { worldId: world.worldId, serverInstanceId: instanceA });
        expect(claimA.kind).toBe('claimed');
        if (claimA.kind !== 'claimed') {
          throw new Error('unreachable');
        }
        expect(claimA.claim.writerEpoch).toBe(1n);

        // Seed a player/membership/lease under epoch 1 to prove reconciliation later.
        const playerResult = await client.query<{ player_id: string }>(
          'INSERT INTO players DEFAULT VALUES RETURNING player_id'
        );
        const playerId = playerResult.rows[0]!.player_id;
        await client.query(
          `INSERT INTO world_memberships (world_id, player_id, faction, faction_assigned_at)
           VALUES ($1, $2, 'red', now())`,
          [world.worldId, playerId]
        );
        const credentialResult = await client.query<{ credential_id: string }>(
          `INSERT INTO player_credentials (player_id, algorithm, credential_hash)
           VALUES ($1, 'sha256', decode(repeat('11', 32), 'hex'))
           RETURNING credential_id`,
          [playerId]
        );
        const credentialId = credentialResult.rows[0]!.credential_id;
        await client.query(
          `INSERT INTO active_session_leases
             (world_id, player_id, credential_id, server_instance_id, writer_epoch, room_id, transport_session_id, status, expires_at)
           VALUES ($1, $2, $3, $4, 1, 'room-1', 'transport-1', 'active', now() + interval '1 hour')`,
          [world.worldId, playerId, credentialId, instanceA]
        );

        // B cannot steal while A's writer_expires_at is live.
        const stolen = await claimWorldWriter(client, { worldId: world.worldId, serverInstanceId: instanceB });
        expect(stolen.kind).toBe('live_writer_conflict');

        // A's own retry while still live is idempotent and does not bump the epoch.
        const claimARetry = await claimWorldWriter(client, { worldId: world.worldId, serverInstanceId: instanceA });
        expect(claimARetry.kind).toBe('claimed');
        if (claimARetry.kind !== 'claimed') {
          throw new Error('unreachable');
        }
        expect(claimARetry.claim.writerEpoch).toBe(1n);

        // Force expiry using DB time (never faking with application Date.now).
        await client.query('UPDATE worlds SET writer_expires_at = clock_timestamp() - interval \'1 second\' WHERE world_id = $1', [
          world.worldId
        ]);

        const claimB = await claimWorldWriter(client, { worldId: world.worldId, serverInstanceId: instanceB });
        expect(claimB.kind).toBe('claimed');
        if (claimB.kind !== 'claimed') {
          throw new Error('unreachable');
        }
        expect(claimB.claim.writerEpoch).toBe(2n);
        expect(claimB.claim.writerEpoch > claimA.claim.writerEpoch).toBe(true);

        // Prior-epoch active lease was moved to released by the legitimate
        // takeover, and the released-state shape check (expires_at <=
        // updated_at) holds with a genuine equality -- verified INSIDE
        // PostgreSQL, not by comparing two separately-fetched JS Dates.
        const shape = await readLeaseShape(client, world.worldId, playerId);
        expect(shape.status).toBe('released');
        expect(shape.reconnectDeadline).toBeNull();
        expect(shape.expiresEqualsUpdated).toBe(true);

        // Membership/faction rows are untouched by writer takeover.
        const membershipRow = await client.query<{ faction: string }>(
          'SELECT faction FROM world_memberships WHERE world_id = $1 AND player_id = $2',
          [world.worldId, playerId]
        );
        expect(membershipRow.rows[0]?.faction).toBe('red');

        // Writer takeover never touches worlds.state_revision.
        const stateRevisionAfter = await readStateRevision(client, world.worldId);
        expect(stateRevisionAfter).toBe(stateRevisionBefore);

        // A's stale heartbeat (still epoch 1) returns zero rows after B's takeover.
        const staleRenew = await renewWorldWriter(client, {
          worldId: world.worldId,
          serverInstanceId: instanceA,
          writerEpoch: 1n
        });
        expect(staleRenew).toBeNull();

        // A cannot clear B's writer via a stale-instance/epoch conditional release.
        const staleRelease = await releaseWorldWriter(client, {
          worldId: world.worldId,
          serverInstanceId: instanceA,
          writerEpoch: 1n
        });
        expect(staleRelease).toBe(false);

        const worldAfter = await client.query<{ writer_instance_id: string; writer_epoch: string }>(
          'SELECT writer_instance_id, writer_epoch FROM worlds WHERE world_id = $1',
          [world.worldId]
        );
        expect(worldAfter.rows[0]?.writer_instance_id).toBe(instanceB);
        expect(worldAfter.rows[0]?.writer_epoch).toBe('2');

        // B can legitimately release its own current writer claim.
        const legitimateRelease = await releaseWorldWriter(client, {
          worldId: world.worldId,
          serverInstanceId: instanceB,
          writerEpoch: 2n
        });
        expect(legitimateRelease).toBe(true);
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('restored/stale operational rows from a previous writer epoch cannot remain active/recovering after a new claim', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const { world } = await bootstrapWorld(client, 'public-arena');
        const staleInstance = randomUUID();
        const newInstance = randomUUID();
        const stateRevisionBefore = await readStateRevision(client, world.worldId);

        // Seed a world with an active_session_leases row carrying an
        // obsolete writer epoch and 'recovering' status (with
        // reconnect_deadline = expires_at, satisfying that state's own
        // shape branch), as if restored from a backup taken mid-session.
        const playerId = await seedPlayerAndLease(client, {
          worldId: world.worldId,
          faction: 'blue',
          serverInstanceId: staleInstance,
          writerEpoch: 7,
          status: 'recovering',
          hashByte: '22'
        });

        const claim = await claimWorldWriter(client, { worldId: world.worldId, serverInstanceId: newInstance });
        expect(claim.kind).toBe('claimed');
        if (claim.kind !== 'claimed') {
          throw new Error('unreachable');
        }
        expect(claim.claim.writerEpoch).toBe(1n);

        const shape = await readLeaseShape(client, world.worldId, playerId);
        expect(shape.status).toBe('released');
        expect(shape.reconnectDeadline).toBeNull();
        expect(shape.expiresEqualsUpdated).toBe(true);

        const stateRevisionAfter = await readStateRevision(client, world.worldId);
        expect(stateRevisionAfter).toBe(stateRevisionBefore);
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('a takeover only reconciles this world\'s non-released, prior-epoch leases -- another world and an already-released row are untouched', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const { world: worldA } = await bootstrapWorld(client, 'public-arena');
        const { world: worldB } = await bootstrapWorld(client, 'isolation-control-world');
        const staleInstanceA = randomUUID();
        const newInstanceA = randomUUID();
        const instanceB = randomUUID();

        // worldA: one prior-epoch 'active' lease that SHOULD be reconciled,
        // and one already-'released' prior-epoch lease that must NOT be
        // rewritten (the UPDATE's own WHERE excludes status = 'released').
        const activePlayerId = await seedPlayerAndLease(client, {
          worldId: worldA.worldId,
          faction: 'red',
          serverInstanceId: staleInstanceA,
          writerEpoch: 1,
          status: 'active',
          hashByte: '33'
        });
        const alreadyReleasedPlayerId = await seedPlayerAndLease(client, {
          worldId: worldA.worldId,
          faction: 'blue',
          serverInstanceId: staleInstanceA,
          writerEpoch: 1,
          status: 'released',
          hashByte: '44'
        });
        const alreadyReleasedBefore = await readLeaseShape(client, worldA.worldId, alreadyReleasedPlayerId);

        // worldB: a completely unrelated world with its own live 'active'
        // lease under its own writer scheme. worldA's takeover must never
        // touch it, whether or not worldB even has a current writer.
        const unrelatedPlayerId = await seedPlayerAndLease(client, {
          worldId: worldB.worldId,
          faction: 'red',
          serverInstanceId: instanceB,
          writerEpoch: 0,
          status: 'active',
          hashByte: '55'
        });
        const unrelatedBefore = await readLeaseShape(client, worldB.worldId, unrelatedPlayerId);

        // First claim (epoch 1), force expiry, then a legitimate takeover
        // (epoch 2) is what actually drives stale-lease reconciliation.
        const firstClaim = await claimWorldWriter(client, { worldId: worldA.worldId, serverInstanceId: staleInstanceA });
        expect(firstClaim.kind).toBe('claimed');
        await client.query(
          'UPDATE worlds SET writer_expires_at = clock_timestamp() - interval \'1 second\' WHERE world_id = $1',
          [worldA.worldId]
        );
        const takeover = await claimWorldWriter(client, { worldId: worldA.worldId, serverInstanceId: newInstanceA });
        expect(takeover.kind).toBe('claimed');
        if (takeover.kind !== 'claimed') {
          throw new Error('unreachable');
        }
        expect(takeover.claim.writerEpoch).toBe(2n);

        const activeAfter = await readLeaseShape(client, worldA.worldId, activePlayerId);
        expect(activeAfter.status).toBe('released');
        expect(activeAfter.reconnectDeadline).toBeNull();
        expect(activeAfter.expiresEqualsUpdated).toBe(true);

        const alreadyReleasedAfter = await readLeaseShape(client, worldA.worldId, alreadyReleasedPlayerId);
        expect(alreadyReleasedAfter.status).toBe('released');
        expect(alreadyReleasedAfter.updatedAt.getTime()).toBe(alreadyReleasedBefore.updatedAt.getTime());

        const unrelatedAfter = await readLeaseShape(client, worldB.worldId, unrelatedPlayerId);
        expect(unrelatedAfter.status).toBe('active');
        expect(unrelatedAfter.updatedAt.getTime()).toBe(unrelatedBefore.updatedAt.getTime());
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('stale-lease reconciliation reuses one DB timestamp: a substituted, deterministically-advancing clock proves single evaluation', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        await installTestOnlyAdvancingClock(client);
        const { world } = await bootstrapWorld(client, 'public-arena');
        const staleInstance = randomUUID();
        const newInstance = randomUUID();

        // First claim (epoch 1) establishes the "prior" writer whose lease
        // we then seed at that same epoch. Only the SECOND claim (the
        // takeover, epoch 2) is wrapped by the probe -- that is the call
        // whose reconciliation UPDATE must diverge under the substituted
        // clock if the two timestamp columns are evaluated independently.
        const firstClaim = await claimWorldWriter(client, { worldId: world.worldId, serverInstanceId: staleInstance });
        expect(firstClaim.kind).toBe('claimed');

        const playerId = await seedPlayerAndLease(client, {
          worldId: world.worldId,
          faction: 'red',
          serverInstanceId: staleInstance,
          writerEpoch: 1,
          status: 'active',
          hashByte: '66'
        });

        await client.query(
          'UPDATE worlds SET writer_expires_at = clock_timestamp() - interval \'1 second\' WHERE world_id = $1',
          [world.worldId]
        );

        const { probe, interceptions } = createClockDivergenceProbe(client);
        const claim = await claimWorldWriter(probe, { worldId: world.worldId, serverInstanceId: newInstance });

        expect(claim.kind).toBe('claimed');
        if (claim.kind !== 'claimed') {
          throw new Error('unreachable');
        }
        expect(claim.claim.writerEpoch).toBe(2n);
        // Confirms the instrumentation actually exercised the intended
        // statement exactly once (the takeover branch runs reconciliation
        // exactly once per claim).
        expect(interceptions()).toBe(1);

        // The production statement's own clock_timestamp() text occurrence
        // count, after substitution, is exactly how many times the
        // deterministic test clock was actually called -- proving a single
        // DB-time evaluation under the installed PostgreSQL version, not
        // merely a coincidentally-equal pair of independent evaluations.
        const callCount = await countTestOnlyClockCalls(client);
        expect(callCount).toBe(1);

        const shape = await readLeaseShape(client, world.worldId, playerId);
        expect(shape.status).toBe('released');
        expect(shape.reconnectDeadline).toBeNull();
        expect(shape.expiresEqualsUpdated).toBe(true);
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });
});
