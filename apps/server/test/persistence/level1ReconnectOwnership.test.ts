import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { Client, type Room } from 'colyseus.js';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileClientMessages, ProfileServerMessages } from '@burningspace/protocol';
import { ServerMessages } from '@burningspace/shared';
import { createPersistencePool, withTransaction } from '../../src/persistence/pool.js';
import { createPlayer } from '../../src/persistence/repositories/playersRepository.js';
import { insertCredential, revokeCredential } from '../../src/persistence/repositories/credentialsRepository.js';
import { establishPlayerFaction } from '../../src/persistence/repositories/membershipsRepository.js';
import { claimWorldWriter } from '../../src/persistence/repositories/worldsRepository.js';
import * as sessionLeasesRepository from '../../src/persistence/repositories/sessionLeasesRepository.js';
import { createGameplayAuthority } from '../../src/persistence/gameplayAuthority.js';
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
  console.warn(describeUnreachableDatabaseWarning('level1ReconnectOwnership.test.ts'));
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

interface RoomShipSchema {
  ownerSessionId: string;
  x: number;
  y: number;
  health: number;
}

interface BattleStateSchema {
  ships: Map<string, RoomShipSchema> & { get(key: string): RoomShipSchema | undefined };
}

describe.skipIf(!databaseAvailable)('Level-1 (transient session) lease-fenced reconnect (real PostgreSQL)', () => {
  let server: ProductionBattleServerHandle | undefined;
  const rooms: Array<Room<unknown>> = [];

  afterEach(async () => {
    await Promise.allSettled(
      rooms.splice(0).map((room) => (room.connection?.isOpen ? room.leave(true) : Promise.resolve()))
    );
    await server?.stop();
    server = undefined;
  });

  it(
    'a valid active-lease player who disconnects unexpectedly and reconnects within grace resumes the SAME lease and ship',
    async () => {
      server = await startProductionBattleServer();
      const { credential } = await createTestGuestIdentity(server.url);
      const room = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
      room.onMessage(ServerMessages.ROOM_INFO, () => undefined);
      const accepted: unknown[] = [];
      room.onMessage(ProfileServerMessages.PROFILE_ACCEPTED, (message) => accepted.push(message));
      room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Recon', mode: 'player', faction: 'red' });
      await waitFor(() => accepted.length === 1, 'profile acceptance');
      await waitFor(() => Boolean(room.state.ships.get(room.sessionId)), 'initial ship replication');

      const sessionId = room.sessionId;
      const token = room.reconnectionToken;
      const beforeShip = { ...room.state.ships.get(sessionId)! };

      const beforeLease = await withDirectConnection(server.databaseUrl, (client) =>
        client.query<{ lease_id: string; status: string }>(
          'SELECT lease_id, status FROM active_session_leases WHERE world_id = $1',
          [server?.worldId]
        )
      );
      const originalLeaseId = beforeLease.rows[0]?.lease_id;
      expect(beforeLease.rows[0]?.status).toBe('active');

      await room.leave(false);

      await waitFor(async () => {
        const during = await withDirectConnection(server!.databaseUrl, (client) =>
          client.query<{ status: string }>('SELECT status FROM active_session_leases WHERE world_id = $1', [
            server?.worldId
          ])
        );
        return during.rows[0]?.status === 'recovering';
      }, 'lease to become recovering');

      let reconnected: Room<BattleStateSchema> | undefined;
      const startedAt = Date.now();
      while (Date.now() - startedAt < 5_000 && !reconnected) {
        try {
          reconnected = await new Client(server.url).reconnect<BattleStateSchema>(token as string);
        } catch {
          await delay(20);
        }
      }
      if (!reconnected) {
        throw new Error('Reconnect did not become ready.');
      }
      rooms.push(reconnected);

      expect(reconnected.sessionId).toBe(sessionId);
      await waitFor(
        () => Boolean(reconnected!.state?.ships?.get(sessionId)),
        'ship replicated after reconnect'
      );
      const afterShip = reconnected.state.ships.get(sessionId)!;
      expect(afterShip.x).toBeCloseTo(beforeShip.x, 4);
      expect(afterShip.y).toBeCloseTo(beforeShip.y, 4);
      expect(afterShip.health).toBe(beforeShip.health);

      const afterLease = await withDirectConnection(server.databaseUrl, (client) =>
        client.query<{ lease_id: string; status: string }>(
          'SELECT lease_id, status FROM active_session_leases WHERE world_id = $1',
          [server?.worldId]
        )
      );
      expect(afterLease.rows[0]?.status).toBe('active');
      expect(afterLease.rows[0]?.lease_id).toBe(originalLeaseId);
    },
    TEST_TIMEOUT_MS
  );

  it(
    'a credential revoked during the recovering grace window blocks Level-1 resume',
    async () => {
      server = await startProductionBattleServer();
      const { credential, playerId } = await createTestGuestIdentity(server.url);
      const room = await joinCanonicalBattleRoom(server.url, credential);
      const accepted: unknown[] = [];
      room.onMessage(ProfileServerMessages.PROFILE_ACCEPTED, (message) => accepted.push(message));
      room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Revoked', mode: 'player', faction: 'red' });
      await waitFor(() => accepted.length === 1, 'profile acceptance');
      const token = room.reconnectionToken;

      await room.leave(false);
      await waitFor(async () => {
        const during = await withDirectConnection(server!.databaseUrl, (client) =>
          client.query<{ status: string }>('SELECT status FROM active_session_leases WHERE world_id = $1', [
            server?.worldId
          ])
        );
        return during.rows[0]?.status === 'recovering';
      }, 'lease to become recovering');

      const credentialRow = await withDirectConnection(server.databaseUrl, (client) =>
        client.query<{ credential_id: string }>('SELECT credential_id FROM player_credentials WHERE player_id = $1', [
          playerId
        ])
      );
      const credentialId = credentialRow.rows[0]!.credential_id;
      await withDirectConnection(server.databaseUrl, (client) => revokeCredential(client, playerId, credentialId));

      // The reconnection token itself is untouched, so the Colyseus
      // transport-level reconnect succeeds; the room's own lease-fenced
      // gate then closes it moments later -- this is not a rejected
      // reconnect() call, but an immediate consented kick.
      const reconnected = await new Client(server.url).reconnect(token as string);
      await waitFor(() => !reconnected.connection.isOpen, 'the revoked session to be kicked');

      const leaseAfter = await withDirectConnection(server.databaseUrl, (client) =>
        client.query<{ status: string }>('SELECT status FROM active_session_leases WHERE world_id = $1', [
          server?.worldId
        ])
      );
      // Revocation itself released the lease (credentialsRepository), so
      // there is nothing left to resume regardless.
      expect(leaseAfter.rows[0]?.status).toBe('released');
    },
    TEST_TIMEOUT_MS
  );
});

interface Fixture {
  readonly pool: Pool;
  readonly database: BootstrappedTestDatabase;
  readonly worldId: string;
  readonly playerId: string;
  readonly credentialId: string;
}

async function createFixture(): Promise<Fixture> {
  const database = await createBootstrappedTestDatabase();
  const pool = createPersistencePool(database.databaseUrl);
  const { playerId, credentialId } = await withTransaction(pool, async (client) => {
    const player = await createPlayer(client);
    const credential = await insertCredential(client, player.playerId, {
      version: 1,
      algorithm: 'sha256',
      hash: Buffer.alloc(32, 3)
    });
    await establishPlayerFaction(client, database.worldId, player.playerId, 'red');
    return { playerId: player.playerId, credentialId: credential.credentialId };
  });
  return { pool, database, worldId: database.worldId, playerId, credentialId };
}

describe.skipIf(!databaseAvailable)('Level-1 resume edge cases (repository/orchestration level, real PostgreSQL)', () => {
  const fixtures: Fixture[] = [];

  afterEach(async () => {
    await Promise.allSettled(
      fixtures.splice(0).map(async (fixture) => {
        await fixture.pool.end().catch(() => undefined);
        await fixture.database.drop().catch(() => undefined);
      })
    );
  });

  async function setupActiveLease(): Promise<{ fixture: Fixture; leaseId: string }> {
    const database = await createBootstrappedTestDatabase();
    const pool = createPersistencePool(database.databaseUrl);
    const { playerId, credentialId } = await withTransaction(pool, async (client) => {
      const player = await createPlayer(client);
      const credential = await insertCredential(client, player.playerId, {
        version: 1,
        algorithm: 'sha256',
        hash: Buffer.alloc(32, 4)
      });
      await establishPlayerFaction(client, database.worldId, player.playerId, 'red');
      return { playerId: player.playerId, credentialId: credential.credentialId };
    });
    const fixture: Fixture = { pool, database, worldId: database.worldId, playerId, credentialId };
    fixtures.push(fixture);

    const acquired = await withTransaction(pool, (client) =>
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
    return { fixture, leaseId };
  }

  it('a fixed reconnect_deadline is never extended by a repeated markRecovering call for the same lease', async () => {
    const { fixture, leaseId } = await setupActiveLease();
    const first = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.markRecovering(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        graceSeconds: 5
      })
    );
    expect(first.outcome).toBe('recovering');

    await delay(50);

    const second = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.markRecovering(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        graceSeconds: 5
      })
    );
    expect(second.outcome).toBe('already_recovering');
    expect((second as { reconnectDeadline: Date }).reconnectDeadline.getTime()).toBe(
      (first as { reconnectDeadline: Date }).reconnectDeadline.getTime()
    );
  }, TEST_TIMEOUT_MS);

  it('resume is rejected once reconnect_deadline has passed', async () => {
    const { fixture, leaseId } = await setupActiveLease();
    await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.markRecovering(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        graceSeconds: 1
      })
    );

    await delay(1_200);

    const resumed = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.resumeRecoveringLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId,
        credentialId: fixture.credentialId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );
    expect(resumed).toBeNull();
  }, TEST_TIMEOUT_MS);

  it('resume is rejected once the exact lease has been released (replaced/superseded)', async () => {
    const { fixture, leaseId } = await setupActiveLease();
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
    await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.releaseGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId
      })
    );

    const resumed = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.resumeRecoveringLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId,
        credentialId: fixture.credentialId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );
    expect(resumed).toBeNull();
  }, TEST_TIMEOUT_MS);

  it('resume is rejected for a mismatched writer_epoch (stale process attempting to resume)', async () => {
    const { fixture, leaseId } = await setupActiveLease();
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

    const resumed = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.resumeRecoveringLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId,
        credentialId: fixture.credentialId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH + 1n,
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );
    expect(resumed).toBeNull();
  }, TEST_TIMEOUT_MS);

  it('gameplayAuthority.resumeRecoveringSession rejects when membership/faction is required but missing', async () => {
    // A gameplay lease cannot exist without an established membership in
    // production (acquireGameplayLease only ever runs after
    // establishPlayerFaction in the same transaction), but the
    // orchestration-level guard is exercised directly here for defense in
    // depth: requireFaction=true against a fixture with a real claimed
    // writer, an active credential, but no membership row.
    const database = await createBootstrappedTestDatabase();
    const pool = createPersistencePool(database.databaseUrl);
    const { playerId, credentialId } = await withTransaction(pool, async (client) => {
      const player = await createPlayer(client);
      const credential = await insertCredential(client, player.playerId, {
        version: 1,
        algorithm: 'sha256',
        hash: Buffer.alloc(32, 5)
      });
      return { playerId: player.playerId, credentialId: credential.credentialId };
    });
    fixtures.push({ pool, database, worldId: database.worldId, playerId, credentialId });

    const claimClient = await pool.connect();
    try {
      const claim = await claimWorldWriter(claimClient, {
        worldId: database.worldId,
        serverInstanceId: SERVER_INSTANCE_A
      });
      expect(claim.kind).toBe('claimed');
    } finally {
      claimClient.release();
    }

    const authority = createGameplayAuthority({
      pool,
      worldId: database.worldId,
      serverInstanceId: SERVER_INSTANCE_A,
      writerEpoch: WRITER_EPOCH
    });

    const result = await authority.resumeRecoveringSession({
      playerId,
      credentialId,
      leaseId: randomUUID(),
      graceSeconds: 10,
      requireFaction: true
    });
    expect(result).toEqual({ outcome: 'rejected', reason: 'membership_missing' });
  }, TEST_TIMEOUT_MS);
});
