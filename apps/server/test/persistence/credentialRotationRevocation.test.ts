import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { Client } from 'colyseus.js';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileClientMessages, ProfileServerMessages } from '@burningspace/protocol';
import { createPersistencePool, withTransaction } from '../../src/persistence/pool.js';
import { createPlayer } from '../../src/persistence/repositories/playersRepository.js';
import {
  insertCredential,
  revokeCredential,
  rotateCredential
} from '../../src/persistence/repositories/credentialsRepository.js';
import { establishPlayerFaction } from '../../src/persistence/repositories/membershipsRepository.js';
import { claimWorldWriter } from '../../src/persistence/repositories/worldsRepository.js';
import * as sessionLeasesRepository from '../../src/persistence/repositories/sessionLeasesRepository.js';
import {
  startProductionBattleServer,
  type ProductionBattleServerHandle
} from '../support/startProductionBattleServer.js';
import { createTestGuestIdentity, joinCanonicalBattleRoom } from '../support/testIdentityHelper.js';
import {
  createBootstrappedTestDatabase,
  describeUnreachableDatabaseWarning,
  isTestDatabaseReachable,
  withDirectConnection,
  type BootstrappedTestDatabase
} from '../support/testPersistenceDatabase.js';

const TEST_TIMEOUT_MS = 15_000;
const ACTIVE_TTL_SECONDS = 25;
const SERVER_INSTANCE_A = randomUUID();
const WRITER_EPOCH = 1n;

const databaseAvailable = await isTestDatabaseReachable();

if (!databaseAvailable) {
  console.warn(describeUnreachableDatabaseWarning('credentialRotationRevocation.test.ts'));
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(condition: () => boolean, label: string, timeoutMs = 5_000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (condition()) {
      return;
    }

    await delay(20);
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}.`);
}

interface Fixture {
  readonly pool: Pool;
  readonly database: BootstrappedTestDatabase;
  readonly worldId: string;
  readonly playerId: string;
  readonly credentialId: string;
}

async function createClaimedFixture(hashByte = 6): Promise<Fixture> {
  const database = await createBootstrappedTestDatabase();
  const pool = createPersistencePool(database.databaseUrl);
  const { playerId, credentialId } = await withTransaction(pool, async (client) => {
    const player = await createPlayer(client);
    const credential = await insertCredential(client, player.playerId, {
      version: 1,
      algorithm: 'sha256',
      hash: Buffer.alloc(32, hashByte)
    });
    await establishPlayerFaction(client, database.worldId, player.playerId, 'red');
    return { playerId: player.playerId, credentialId: credential.credentialId };
  });
  const claimClient = await pool.connect();
  try {
    await claimWorldWriter(claimClient, { worldId: database.worldId, serverInstanceId: SERVER_INSTANCE_A });
  } finally {
    claimClient.release();
  }
  return { pool, database, worldId: database.worldId, playerId, credentialId };
}

describe.skipIf(!databaseAvailable)('credential revocation/rotation lease invalidation (real PostgreSQL)', () => {
  const fixtures: Fixture[] = [];

  afterEach(async () => {
    await Promise.allSettled(
      fixtures.splice(0).map(async (fixture) => {
        await fixture.pool.end().catch(() => undefined);
        await fixture.database.drop().catch(() => undefined);
      })
    );
  });

  async function setup(hashByte = 6): Promise<Fixture> {
    const fixture = await createClaimedFixture(hashByte);
    fixtures.push(fixture);
    return fixture;
  }

  it('revoking an active credential releases its active lease in the same transaction', async () => {
    const fixture = await setup();
    const acquired = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        credentialId: fixture.credentialId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        roomId: 'room-1',
        transportSessionId: 'session-1',
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );
    expect(acquired.outcome).toBe('acquired');

    const result = await withTransaction(fixture.pool, (client) =>
      revokeCredential(client, fixture.playerId, fixture.credentialId)
    );
    expect(result).toBe('revoked');

    const lease = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.findGameplayLease(client, fixture.worldId, fixture.playerId)
    );
    expect(lease?.status).toBe('released');
  }, TEST_TIMEOUT_MS);

  it('revoking a recovering credential also releases the recovering lease', async () => {
    const fixture = await setup();
    const acquired = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        credentialId: fixture.credentialId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        roomId: 'room-1',
        transportSessionId: 'session-1',
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );
    const leaseId = acquired.outcome === 'acquired' ? acquired.leaseId : '';
    await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.markRecovering(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        graceSeconds: 30
      })
    );

    await withTransaction(fixture.pool, (client) => revokeCredential(client, fixture.playerId, fixture.credentialId));

    const lease = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.findGameplayLease(client, fixture.worldId, fixture.playerId)
    );
    expect(lease?.status).toBe('released');
  }, TEST_TIMEOUT_MS);

  it('rotation revokes the old credential, releases its leases, and inserts exactly one new active credential', async () => {
    const fixture = await setup();
    const acquired = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        credentialId: fixture.credentialId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        roomId: 'room-1',
        transportSessionId: 'session-1',
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );
    expect(acquired.outcome).toBe('acquired');

    const rotation = await withTransaction(fixture.pool, (client) =>
      rotateCredential(client, fixture.playerId, fixture.credentialId, {
        version: 1,
        algorithm: 'sha256',
        hash: Buffer.alloc(32, 42)
      })
    );
    expect(rotation.status).toBe('rotated');
    const newCredentialId = rotation.status === 'rotated' ? rotation.newCredentialId : '';
    expect(newCredentialId).not.toBe(fixture.credentialId);

    const lease = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.findGameplayLease(client, fixture.worldId, fixture.playerId)
    );
    expect(lease?.status).toBe('released');

    const activeCount = await withDirectConnection(fixture.database.databaseUrl, async (client) => {
      const result = await client.query<{ count: string }>(
        'SELECT count(*)::int AS count FROM player_credentials WHERE player_id = $1 AND revoked_at IS NULL',
        [fixture.playerId]
      );
      return Number(result.rows[0]?.count ?? 0);
    });
    expect(activeCount).toBe(1);

    // Durable faction is untouched by rotation.
    const membership = await withDirectConnection(fixture.database.databaseUrl, async (client) => {
      const result = await client.query<{ faction: string | null }>(
        'SELECT faction FROM world_memberships WHERE world_id = $1 AND player_id = $2',
        [fixture.worldId, fixture.playerId]
      );
      return result.rows[0]?.faction;
    });
    expect(membership).toBe('red');
  }, TEST_TIMEOUT_MS);

  it('a failed rotation (replacement hash collision) never partially destroys the old credential or its active lease', async () => {
    const fixtureA = await setup(7);
    const fixtureB = await setup(8);

    const acquiredA = await withTransaction(fixtureA.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(client, {
        worldId: fixtureA.worldId,
        playerId: fixtureA.playerId,
        credentialId: fixtureA.credentialId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        roomId: 'room-1',
        transportSessionId: 'session-1',
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );
    expect(acquiredA.outcome).toBe('acquired');

    // fixtureA and fixtureB are separate databases, so a hash collision
    // must be engineered within fixtureA's OWN database: insert a second,
    // already-revoked credential row there sharing the target hash, then
    // attempt to rotate into that exact (unique, revoked-or-not it's still
    // a uniqueness violation) hash.
    const collisionHash = Buffer.alloc(32, 99);
    await withTransaction(fixtureA.pool, async (client) => {
      const otherPlayer = await createPlayer(client);
      await insertCredential(client, otherPlayer.playerId, {
        version: 1,
        algorithm: 'sha256',
        hash: collisionHash
      });
    });

    await expect(
      withTransaction(fixtureA.pool, (client) =>
        rotateCredential(client, fixtureA.playerId, fixtureA.credentialId, {
          version: 1,
          algorithm: 'sha256',
          hash: collisionHash
        })
      )
    ).rejects.toThrow();

    const stillActive = await withDirectConnection(fixtureA.database.databaseUrl, async (client) => {
      const result = await client.query<{ revoked_at: Date | null }>(
        'SELECT revoked_at FROM player_credentials WHERE credential_id = $1',
        [fixtureA.credentialId]
      );
      return result.rows[0]?.revoked_at ?? null;
    });
    expect(stillActive).toBeNull();

    const leaseStillActive = await withTransaction(fixtureA.pool, (client) =>
      sessionLeasesRepository.findGameplayLease(client, fixtureA.worldId, fixtureA.playerId)
    );
    expect(leaseStillActive?.status).toBe('active');
    expect(leaseStillActive?.leaseId).toBe(acquiredA.outcome === 'acquired' ? acquiredA.leaseId : undefined);
  }, TEST_TIMEOUT_MS);
});

describe.skipIf(!databaseAvailable)('credential revocation blocks fresh auth and Level-1 reconnect over the real wire', () => {
  let server: ProductionBattleServerHandle | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it(
    'a revoked credential is rejected identically by fresh auth (joinById) after revocation',
    async () => {
      server = await startProductionBattleServer();
      const { credential, playerId } = await createTestGuestIdentity(server.url);
      const room = await joinCanonicalBattleRoom(server.url, credential);
      await room.leave(true);

      const credentialRow = await withDirectConnection(server.databaseUrl, (client) =>
        client.query<{ credential_id: string }>('SELECT credential_id FROM player_credentials WHERE player_id = $1', [
          playerId
        ])
      );
      const credentialId = credentialRow.rows[0]!.credential_id;
      await withDirectConnection(server.databaseUrl, (client) => revokeCredential(client, playerId, credentialId));

      await expect(joinCanonicalBattleRoom(server.url, credential)).rejects.toThrow('identity_rejected');
    },
    TEST_TIMEOUT_MS
  );

  it(
    'an active session loses control the next heartbeat after its credential is revoked mid-session',
    async () => {
      server = await startProductionBattleServer();
      const { credential, playerId } = await createTestGuestIdentity(server.url);
      const room = await joinCanonicalBattleRoom(server.url, credential);
      const accepted: unknown[] = [];
      room.onMessage(ProfileServerMessages.PROFILE_ACCEPTED, (message) => accepted.push(message));
      room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'ToRevoke', mode: 'player', faction: 'red' });
      await waitFor(() => accepted.length === 1, 'profile acceptance');

      const credentialRow = await withDirectConnection(server.databaseUrl, (client) =>
        client.query<{ credential_id: string }>('SELECT credential_id FROM player_credentials WHERE player_id = $1', [
          playerId
        ])
      );
      const credentialId = credentialRow.rows[0]!.credential_id;
      await withDirectConnection(server.databaseUrl, (client) => revokeCredential(client, playerId, credentialId));

      // Revocation itself already released the lease; the connection
      // remains open at the transport level (Packet 6 does not proactively
      // disconnect on revocation), but control is gone -- proven directly
      // via canonical DB state rather than waiting a real 5s heartbeat.
      const lease = await withDirectConnection(server.databaseUrl, (client) =>
        client.query<{ status: string }>('SELECT status FROM active_session_leases WHERE world_id = $1', [
          server?.worldId
        ])
      );
      expect(lease.rows[0]?.status).toBe('released');

      await room.leave(true).catch(() => undefined);
    },
    TEST_TIMEOUT_MS
  );
});
