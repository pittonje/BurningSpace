import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, describe, expect, test } from 'vitest';
import { redactDatabaseUrl } from '../../src/persistence/config.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { bootstrapWorld, claimWorldWriter, renewWorldWriter, releaseWorldWriter } from '../../src/persistence/repositories/worldsRepository.js';

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

        // Prior-epoch active lease was moved to released by the legitimate takeover.
        const leaseRow = await client.query<{ status: string; reconnect_deadline: Date | null }>(
          'SELECT status, reconnect_deadline FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
          [world.worldId, playerId]
        );
        expect(leaseRow.rows[0]?.status).toBe('released');
        expect(leaseRow.rows[0]?.reconnect_deadline).toBeNull();

        // Membership/faction rows are untouched by writer takeover.
        const membershipRow = await client.query<{ faction: string }>(
          'SELECT faction FROM world_memberships WHERE world_id = $1 AND player_id = $2',
          [world.worldId, playerId]
        );
        expect(membershipRow.rows[0]?.faction).toBe('red');

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

        // Seed a world with active_session_leases rows carrying an obsolete
        // writer epoch, as if restored from a backup taken mid-session.
        const playerResult = await client.query<{ player_id: string }>(
          'INSERT INTO players DEFAULT VALUES RETURNING player_id'
        );
        const playerId = playerResult.rows[0]!.player_id;
        await client.query(
          `INSERT INTO world_memberships (world_id, player_id, faction, faction_assigned_at)
           VALUES ($1, $2, 'blue', now())`,
          [world.worldId, playerId]
        );
        const credentialResult = await client.query<{ credential_id: string }>(
          `INSERT INTO player_credentials (player_id, algorithm, credential_hash)
           VALUES ($1, 'sha256', decode(repeat('22', 32), 'hex'))
           RETURNING credential_id`,
          [playerId]
        );
        const credentialId = credentialResult.rows[0]!.credential_id;
        await client.query(
          `INSERT INTO active_session_leases
             (world_id, player_id, credential_id, server_instance_id, writer_epoch, room_id, transport_session_id, status, expires_at, reconnect_deadline)
           VALUES ($1, $2, $3, $4, 7, 'stale-room', 'stale-transport', 'recovering', now() + interval '1 hour', now() + interval '1 hour')`,
          [world.worldId, playerId, credentialId, staleInstance]
        );

        const claim = await claimWorldWriter(client, { worldId: world.worldId, serverInstanceId: newInstance });
        expect(claim.kind).toBe('claimed');
        if (claim.kind !== 'claimed') {
          throw new Error('unreachable');
        }
        expect(claim.claim.writerEpoch).toBe(1n);

        const leaseRow = await client.query<{ status: string }>(
          'SELECT status FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
          [world.worldId, playerId]
        );
        expect(leaseRow.rows[0]?.status).toBe('released');
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });
});
