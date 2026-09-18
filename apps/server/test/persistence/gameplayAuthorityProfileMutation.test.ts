import { randomUUID, randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, describe, expect, test } from 'vitest';
import { redactDatabaseUrl } from '../../src/persistence/config.js';
import { createGameplayAuthority } from '../../src/persistence/gameplayAuthority.js';
import { createPersistencePool } from '../../src/persistence/pool.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { createPlayer } from '../../src/persistence/repositories/playersRepository.js';
import { insertCredential, revokeCredential } from '../../src/persistence/repositories/credentialsRepository.js';
import { bootstrapWorld, claimWorldWriter } from '../../src/persistence/repositories/worldsRepository.js';

/**
 * PERSIST002-SEC-02 regression: lockProfilePrefix() must never mutate
 * display_name for a rejected (invalid/revoked/mismatched) credential. All
 * fixtures here are genuine inserts through the same repositories
 * production code uses -- never a fabricated row shape.
 */

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
    '[gameplayAuthorityProfileMutation.test.ts] Skipping real-PostgreSQL tests: ' +
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

interface Fixture {
  readonly playerId: string;
  readonly credentialId: string;
}

async function createActiveFixture(client: Client): Promise<Fixture> {
  const player = await createPlayer(client);
  const credential = await insertCredential(client, player.playerId, {
    version: 1,
    algorithm: 'sha256',
    hash: randomBytes(32)
  });
  return { playerId: player.playerId, credentialId: credential.credentialId };
}

async function readDisplayName(client: Client, playerId: string): Promise<string | null> {
  const result = await client.query<{ display_name: string | null }>(
    'SELECT display_name FROM players WHERE player_id = $1',
    [playerId]
  );
  return result.rows[0]?.display_name ?? null;
}

async function countMembershipsAndLeases(
  client: Client,
  worldId: string,
  playerId: string
): Promise<{ memberships: number; leases: number }> {
  const memberships = await client.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM world_memberships WHERE world_id = $1 AND player_id = $2',
    [worldId, playerId]
  );
  const leases = await client.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
    [worldId, playerId]
  );
  return {
    memberships: Number(memberships.rows[0]?.count ?? '0'),
    leases: Number(leases.rows[0]?.count ?? '0')
  };
}

describe.skipIf(!databaseAvailable)(
  'gameplay-authority profile transactions never mutate display_name for a rejected credential (real PostgreSQL)',
  () => {
    afterAll(async () => {
      for (const name of [...disposableDatabaseNames]) {
        await dropDatabase(name).catch(() => undefined);
      }
    });

    async function setupAuthority(databaseUrl: string) {
      const setupClient = new Client({ connectionString: databaseUrl });
      await setupClient.connect();
      const { world } = await bootstrapWorld(setupClient, 'public-arena');
      const serverInstanceId = randomUUID();
      const claim = await claimWorldWriter(setupClient, { worldId: world.worldId, serverInstanceId });
      if (claim.kind !== 'claimed') {
        throw new Error('unreachable: fresh world must claim on first attempt');
      }
      const pool = createPersistencePool(databaseUrl);
      const authority = createGameplayAuthority({
        pool,
        worldId: world.worldId,
        serverInstanceId,
        writerEpoch: claim.claim.writerEpoch
      });
      return { setupClient, world, authority, pool };
    }

    test('a revoked credential is rejected by applySpectatorProfile and never mutates display_name', async () => {
      const { databaseUrl, databaseName } = await createMigratedDatabase();
      try {
        const { setupClient, authority, pool } = await setupAuthority(databaseUrl);
        try {
          const fixture = await createActiveFixture(setupClient);
          await revokeCredential(setupClient, fixture.playerId, fixture.credentialId);

          const result = await authority.applySpectatorProfile({
            playerId: fixture.playerId,
            credentialId: fixture.credentialId,
            transportSessionId: 'transport-1',
            roomId: 'room-1',
            nickname: 'ShouldNeverStick',
            reconnectGraceSeconds: 10
          });

          expect(result.kind).toBe('credential_invalid');
          expect(await readDisplayName(setupClient, fixture.playerId)).toBeNull();
        } finally {
          await pool.end();
          await setupClient.end();
        }
      } finally {
        await dropDatabase(databaseName);
      }
    });

    test('a revoked credential is rejected by applyPlayerProfile, never mutates display_name, and creates no membership/lease', async () => {
      const { databaseUrl, databaseName } = await createMigratedDatabase();
      try {
        const { setupClient, world, authority, pool } = await setupAuthority(databaseUrl);
        try {
          const fixture = await createActiveFixture(setupClient);
          await revokeCredential(setupClient, fixture.playerId, fixture.credentialId);

          const result = await authority.applyPlayerProfile({
            playerId: fixture.playerId,
            credentialId: fixture.credentialId,
            transportSessionId: 'transport-2',
            roomId: 'room-1',
            nickname: 'ShouldNeverStick',
            reconnectGraceSeconds: 10,
            faction: 'red'
          });

          expect(result.kind).toBe('credential_invalid');
          expect(await readDisplayName(setupClient, fixture.playerId)).toBeNull();
          const counts = await countMembershipsAndLeases(setupClient, world.worldId, fixture.playerId);
          expect(counts.memberships).toBe(0);
          expect(counts.leases).toBe(0);
        } finally {
          await pool.end();
          await setupClient.end();
        }
      } finally {
        await dropDatabase(databaseName);
      }
    });

    test('a wrong player/credential association is rejected and mutates neither player\'s display_name', async () => {
      const { databaseUrl, databaseName } = await createMigratedDatabase();
      try {
        const { setupClient, authority, pool } = await setupAuthority(databaseUrl);
        try {
          const playerA = await createActiveFixture(setupClient);
          const playerB = await createActiveFixture(setupClient);

          // playerA's own id, but playerB's credentialId -- a genuine
          // cross-player mismatch, not a fabricated row.
          const result = await authority.applySpectatorProfile({
            playerId: playerA.playerId,
            credentialId: playerB.credentialId,
            transportSessionId: 'transport-3',
            roomId: 'room-1',
            nickname: 'ShouldNeverStick',
            reconnectGraceSeconds: 10
          });

          expect(result.kind).toBe('credential_invalid');
          expect(await readDisplayName(setupClient, playerA.playerId)).toBeNull();
          expect(await readDisplayName(setupClient, playerB.playerId)).toBeNull();
        } finally {
          await pool.end();
          await setupClient.end();
        }
      } finally {
        await dropDatabase(databaseName);
      }
    });

    test('a valid credential still updates display_name via applySpectatorProfile and applyPlayerProfile (positive controls)', async () => {
      const { databaseUrl, databaseName } = await createMigratedDatabase();
      try {
        const { setupClient, authority, pool } = await setupAuthority(databaseUrl);
        try {
          const spectatorFixture = await createActiveFixture(setupClient);
          const spectatorResult = await authority.applySpectatorProfile({
            playerId: spectatorFixture.playerId,
            credentialId: spectatorFixture.credentialId,
            transportSessionId: 'transport-4',
            roomId: 'room-1',
            nickname: 'ValidSpectator',
            reconnectGraceSeconds: 10
          });
          expect(spectatorResult.kind).toBe('spectator_accepted');
          expect(await readDisplayName(setupClient, spectatorFixture.playerId)).toBe('ValidSpectator');

          const playerFixture = await createActiveFixture(setupClient);
          const playerResult = await authority.applyPlayerProfile({
            playerId: playerFixture.playerId,
            credentialId: playerFixture.credentialId,
            transportSessionId: 'transport-5',
            roomId: 'room-1',
            nickname: 'ValidPlayer',
            reconnectGraceSeconds: 10,
            faction: 'blue'
          });
          expect(playerResult.kind).toBe('player_accepted');
          expect(await readDisplayName(setupClient, playerFixture.playerId)).toBe('ValidPlayer');
        } finally {
          await pool.end();
          await setupClient.end();
        }
      } finally {
        await dropDatabase(databaseName);
      }
    });

    test('connected spectator: authenticate while valid, revoke, then a later profile update is rejected and the durable name from before revocation survives unchanged', async () => {
      const { databaseUrl, databaseName } = await createMigratedDatabase();
      try {
        const { setupClient, authority, pool } = await setupAuthority(databaseUrl);
        try {
          const fixture = await createActiveFixture(setupClient);

          const firstResult = await authority.applySpectatorProfile({
            playerId: fixture.playerId,
            credentialId: fixture.credentialId,
            transportSessionId: 'transport-6',
            roomId: 'room-1',
            nickname: 'BeforeRevocation',
            reconnectGraceSeconds: 10
          });
          expect(firstResult.kind).toBe('spectator_accepted');
          expect(await readDisplayName(setupClient, fixture.playerId)).toBe('BeforeRevocation');

          await revokeCredential(setupClient, fixture.playerId, fixture.credentialId);

          const secondResult = await authority.applySpectatorProfile({
            playerId: fixture.playerId,
            credentialId: fixture.credentialId,
            transportSessionId: 'transport-6',
            roomId: 'room-1',
            nickname: 'AfterRevocationShouldNeverStick',
            reconnectGraceSeconds: 10
          });

          expect(secondResult.kind).toBe('credential_invalid');
          // Settled, real durable state -- read back fresh from the
          // database, not the in-memory result of the rejected call.
          expect(await readDisplayName(setupClient, fixture.playerId)).toBe('BeforeRevocation');
        } finally {
          await pool.end();
          await setupClient.end();
        }
      } finally {
        await dropDatabase(databaseName);
      }
    });
  }
);
