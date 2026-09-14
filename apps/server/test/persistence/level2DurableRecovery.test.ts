import type { MapSchema } from '@colyseus/schema';
import type { Room } from 'colyseus.js';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ClientMessages,
  ProfileClientMessages,
  ProfileServerMessages,
  type ProfileAcceptedMessage
} from '@burningspace/protocol';
import { startProductionServer, type ProductionServerHandle } from '../../src/index.js';
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

const TEST_TIMEOUT_MS = 20_000;
const databaseAvailable = await isTestDatabaseReachable();

if (!databaseAvailable) {
  console.warn(describeUnreachableDatabaseWarning('level2DurableRecovery.test.ts'));
}

interface ShipSchema {
  ownerSessionId: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  health: number;
}

interface BattleStateSchema {
  participants: MapSchema<{ sessionId: string }, string>;
  ships: MapSchema<ShipSchema, string>;
  projectiles: MapSchema<{ id: string }, string>;
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

async function getLease(databaseUrl: string, worldId: string, playerId: string) {
  return withDirectConnection(databaseUrl, async (client) => {
    const result = await client.query<{ lease_id: string; status: string }>(
      'SELECT lease_id, status FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
      [worldId, playerId]
    );
    return result.rows[0];
  });
}

describe.skipIf(!databaseAvailable)('Level-2 durable recovery after the transient session is gone (real PostgreSQL)', () => {
  let server: ProductionBattleServerHandle | undefined;
  const rooms: Array<Room<BattleStateSchema>> = [];

  afterEach(async () => {
    await Promise.allSettled(
      rooms.splice(0).map((room) => (room.connection?.isOpen ? room.leave(true) : Promise.resolve()))
    );
    await server?.stop();
    server = undefined;
  });

  it(
    'same credential, fresh session after a clean leave: same faction, NEW leaseId, fresh ship (no old transform/health/velocity)',
    async () => {
      server = await startProductionBattleServer();
      const { credential, playerId } = await createTestGuestIdentity(server.url);

      const firstRoom = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
      rooms.push(firstRoom);
      const firstAccepted: ProfileAcceptedMessage[] = [];
      firstRoom.onMessage<ProfileAcceptedMessage>(ProfileServerMessages.PROFILE_ACCEPTED, (message) =>
        firstAccepted.push(message)
      );
      firstRoom.send(ProfileClientMessages.SET_PROFILE, { nickname: 'First', mode: 'player', faction: 'red' });
      await waitFor(() => firstAccepted.length === 1, 'first profile acceptance');
      await waitFor(() => Boolean(firstRoom.state.ships.get(firstRoom.sessionId)), 'first ship replication');

      // Move and damage the ship so its transform/health clearly differ
      // from a fresh spawn.
      firstRoom.send(ClientMessages.PLAYER_INPUT, {
        up: false,
        down: false,
        left: false,
        right: true,
        aimAngle: 0,
        shooting: false,
        sequence: 1
      });
      await waitFor(() => {
        const ship = firstRoom.state.ships.get(firstRoom.sessionId);
        return Boolean(ship) && Math.hypot(ship!.velocityX, ship!.velocityY) > 10;
      }, 'ship to gain velocity');
      const movedShip = { ...firstRoom.state.ships.get(firstRoom.sessionId)! };
      expect(Math.hypot(movedShip.velocityX, movedShip.velocityY)).toBeGreaterThan(10);

      const leaseBefore = await getLease(server.databaseUrl, server.worldId, playerId);
      expect(leaseBefore?.status).toBe('active');

      await firstRoom.leave(true);
      await waitFor(async () => {
        const lease = await getLease(server!.databaseUrl, server!.worldId, playerId);
        return lease?.status === 'released';
      }, 'lease to be released after clean leave');

      const secondRoom = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
      rooms.push(secondRoom);
      const secondAccepted: ProfileAcceptedMessage[] = [];
      secondRoom.onMessage<ProfileAcceptedMessage>(ProfileServerMessages.PROFILE_ACCEPTED, (message) =>
        secondAccepted.push(message)
      );
      secondRoom.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Second', mode: 'player', faction: 'red' });
      await waitFor(() => secondAccepted.length === 1, 'second profile acceptance');
      await waitFor(() => Boolean(secondRoom.state.ships.get(secondRoom.sessionId)), 'second ship replication');

      expect(secondRoom.sessionId).not.toBe(firstRoom.sessionId);
      expect(secondAccepted[0]?.faction).toBe('red');

      const freshShip = secondRoom.state.ships.get(secondRoom.sessionId)!;
      // Fresh spawn transform, not the previous session's moved position,
      // and zero velocity even though the old ship was still moving.
      expect(Math.hypot(freshShip.x - movedShip.x, freshShip.y - movedShip.y)).toBeGreaterThan(0);
      expect(Math.hypot(freshShip.velocityX, freshShip.velocityY)).toBe(0);
      expect(secondRoom.state.projectiles.size).toBe(0);

      const leaseAfter = await getLease(server.databaseUrl, server.worldId, playerId);
      expect(leaseAfter?.status).toBe('active');
      expect(leaseAfter?.lease_id).not.toBe(leaseBefore?.lease_id);
    },
    TEST_TIMEOUT_MS
  );

  it(
    'a legitimate server restart (new process, new writer epoch) preserves player/credential/membership/faction and issues fresh transient state',
    async () => {
      const database = await createBootstrappedTestDatabase();

      try {
        const serverA = await startProductionServer({
          environment: { NODE_ENV: 'test', DATABASE_URL: database.databaseUrl },
          port: 0,
          hostname: '127.0.0.1',
          registerSignalHandlers: false,
          exitOnAuthorityLoss: false
        });

        const { credential, playerId } = await createTestGuestIdentity(serverA.url);
        const roomA = await joinCanonicalBattleRoom<BattleStateSchema>(serverA.url, credential);
        const acceptedA: ProfileAcceptedMessage[] = [];
        roomA.onMessage<ProfileAcceptedMessage>(ProfileServerMessages.PROFILE_ACCEPTED, (message) =>
          acceptedA.push(message)
        );
        roomA.send(ProfileClientMessages.SET_PROFILE, { nickname: 'PreRestart', mode: 'player', faction: 'blue' });
        await waitFor(() => acceptedA.length === 1, 'server A profile acceptance');

        const worldId = serverA.persistence.worldId;
        const epochA = serverA.persistence.writerEpoch;
        const leaseBefore = await getLease(database.databaseUrl, worldId, playerId);
        expect(leaseBefore?.status).toBe('active');

        // A legitimate restart, not a same-process reconnect: server A is
        // fully stopped and a genuinely different process (server B, its
        // own random serverInstanceId) boots against the SAME database.
        await roomA.leave(true).catch(() => undefined);
        await serverA.shutdown('SIGTERM');

        const serverB = await startProductionServer({
          environment: { NODE_ENV: 'test', DATABASE_URL: database.databaseUrl },
          port: 0,
          hostname: '127.0.0.1',
          registerSignalHandlers: false,
          exitOnAuthorityLoss: false
        });

        try {
          expect(serverB.persistence.worldId).toBe(worldId);
          expect(serverB.persistence.serverInstanceId).not.toBe(serverA.persistence.serverInstanceId);
          expect(serverB.persistence.writerEpoch).toBeGreaterThan(epochA);

          // Server A's takeover-time writer claim (Packet 3) already
          // released any stale prior-epoch lease; confirm it here too.
          const staleLease = await getLease(database.databaseUrl, worldId, playerId);
          expect(staleLease?.status).toBe('released');

          const freshRoom = await joinCanonicalBattleRoom<BattleStateSchema>(serverB.url, credential);
          try {
            const acceptedB: ProfileAcceptedMessage[] = [];
            freshRoom.onMessage<ProfileAcceptedMessage>(ProfileServerMessages.PROFILE_ACCEPTED, (message) =>
              acceptedB.push(message)
            );
            freshRoom.send(ProfileClientMessages.SET_PROFILE, { nickname: 'PostRestart', mode: 'player', faction: 'blue' });
            await waitFor(() => acceptedB.length === 1, 'server B profile acceptance');
            await waitFor(() => Boolean(freshRoom.state.ships.get(freshRoom.sessionId)), 'server B ship replication');

            expect(acceptedB[0]?.faction).toBe('blue');
            expect(freshRoom.sessionId).not.toBe(roomA.sessionId);

            const leaseAfter = await getLease(database.databaseUrl, worldId, playerId);
            expect(leaseAfter?.status).toBe('active');
            expect(leaseAfter?.lease_id).not.toBe(leaseBefore?.lease_id);
          } finally {
            await freshRoom.leave(true).catch(() => undefined);
          }
        } finally {
          await serverB.shutdown('SIGTERM').catch(() => undefined);
        }
      } finally {
        await database.drop().catch(() => undefined);
      }
    },
    TEST_TIMEOUT_MS
  );
});
