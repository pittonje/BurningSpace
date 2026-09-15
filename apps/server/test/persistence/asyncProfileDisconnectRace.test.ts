import { afterEach, describe, expect, it } from 'vitest';
import {
  ProfileClientMessages,
  ProfileServerMessages,
  type ProfileAcceptedMessage,
  type ProfileRejectedMessage
} from '@burningspace/protocol';
import {
  startProductionBattleServer,
  type ProductionBattleServerHandle
} from '../support/startProductionBattleServer.js';
import { createTestGuestIdentity, joinCanonicalBattleRoom } from '../support/testIdentityHelper.js';
import { TestBattleRoom, TestRoomMessages } from '../support/TestBattleRoom.js';
import {
  describeUnreachableDatabaseWarning,
  isTestDatabaseReachable,
  withDirectConnection
} from '../support/testPersistenceDatabase.js';

const TEST_TIMEOUT_MS = 15_000;
const databaseAvailable = await isTestDatabaseReachable();

if (!databaseAvailable) {
  console.warn(describeUnreachableDatabaseWarning('asyncProfileDisconnectRace.test.ts'));
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

describe.skipIf(!databaseAvailable)('SET_PROFILE / disconnect race (real PostgreSQL)', () => {
  let server: ProductionBattleServerHandle | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it(
    'a disconnect that arrives while SET_PROFILE is still in flight never lets the stale completion spawn a ship or leak an orphan lease',
    async () => {
      let releaseGate: (() => void) | undefined;
      const gate = new Promise<void>((resolve) => {
        releaseGate = resolve;
      });
      let gateEntered = false;

      server = await startProductionBattleServer({
        gameplayAuthorityTestHooks: {
          beforePlayerProfileTransaction: async () => {
            gateEntered = true;
            await gate;
          }
        }
      });

      const { credential, playerId } = await createTestGuestIdentity(server.url);
      const room = await joinCanonicalBattleRoom(server.url, credential);
      const accepted: unknown[] = [];
      const rejected: ProfileRejectedMessage[] = [];
      room.onMessage(ProfileServerMessages.PROFILE_ACCEPTED, (message) => accepted.push(message));
      room.onMessage<ProfileRejectedMessage>(ProfileServerMessages.PROFILE_REJECTED, (message) =>
        rejected.push(message)
      );

      room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'RaceProfile', mode: 'player', faction: 'red' });
      await waitFor(() => gateEntered, 'the profile transaction to reach the in-flight gate');

      // Disconnect while the durable transaction is still gated (not yet
      // started). onLeave must invalidate control/generation and then wait
      // for this in-flight operation to fully settle before it can decide
      // there is no gameplay lease.
      const leavePromise = room.leave(false);

      // Give onLeave a moment to run its synchronous invalidation and
      // reach its own await on the profile tail, then release the gate so
      // the durable transaction actually proceeds and commits.
      await delay(100);
      releaseGate?.();

      await leavePromise.catch(() => undefined);
      await delay(200);

      // Never accepted, never rejected via a normal profile message: the
      // stale completion returns silently after compensating.
      expect(accepted).toHaveLength(0);
      expect(rejected).toHaveLength(0);

      // Durable transaction either fully committed or fully rolled back --
      // membership must be either absent or exactly 'red', never partial.
      const membership = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query<{ faction: string | null }>(
          'SELECT faction FROM world_memberships WHERE world_id = $1 AND player_id = $2',
          [server?.worldId, playerId]
        );
        return result.rows[0]?.faction;
      });
      expect(membership === undefined || membership === 'red').toBe(true);

      // No orphan indefinitely-active lease: whatever lease this
      // now-stale commit may have created was compensated away.
      const lease = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query<{ status: string }>(
          'SELECT status FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
          [server?.worldId, playerId]
        );
        return result.rows[0]?.status;
      });
      expect(lease === undefined || lease === 'released').toBe(true);
    },
    TEST_TIMEOUT_MS
  );
});

describe.skipIf(!databaseAvailable)('spawn-failure compensation after a committed durable transaction (real PostgreSQL)', () => {
  let server: ProductionBattleServerHandle | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it(
    'a transient ship-spawn failure after the durable commit releases only the exact new lease, keeps the durable faction, and allows a later retry to reacquire',
    async () => {
      server = await startProductionBattleServer({ battleRoomClassOverride: TestBattleRoom });
      const { credential, playerId } = await createTestGuestIdentity(server.url);
      const room = await joinCanonicalBattleRoom(server.url, credential);
      const accepted: ProfileAcceptedMessage[] = [];
      const rejected: ProfileRejectedMessage[] = [];
      room.onMessage<ProfileAcceptedMessage>(ProfileServerMessages.PROFILE_ACCEPTED, (message) =>
        accepted.push(message)
      );
      room.onMessage<ProfileRejectedMessage>(ProfileServerMessages.PROFILE_REJECTED, (message) =>
        rejected.push(message)
      );

      room.send(TestRoomMessages.FORCE_UPSERT_SHIP_FAILURE_ONCE, {});
      await delay(50);
      room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'SpawnFail', mode: 'player', faction: 'red' });
      await waitFor(() => rejected.length === 1, 'the spawn-failure rejection');

      expect(accepted).toHaveLength(0);

      // Durable transaction stands: membership/faction and state_revision
      // are never rolled back merely because transient spawn failed.
      const membership = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query<{ faction: string | null }>(
          'SELECT faction FROM world_memberships WHERE world_id = $1 AND player_id = $2',
          [server?.worldId, playerId]
        );
        return result.rows[0]?.faction;
      });
      expect(membership).toBe('red');

      const revision = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query<{ state_revision: string }>(
          'SELECT state_revision FROM worlds WHERE world_id = $1',
          [server?.worldId]
        );
        return BigInt(result.rows[0]?.state_revision ?? '0');
      });
      expect(revision).toBe(1n);

      // The exact new lease was compensatingly released; no ship remains.
      const firstLease = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query<{ status: string; lease_id: string }>(
          'SELECT status, lease_id FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
          [server?.worldId, playerId]
        );
        return result.rows[0];
      });
      expect(firstLease?.status).toBe('released');

      // A later retry (no forced failure this time) safely reacquires a
      // brand-new lease and spawns a ship normally.
      room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'SpawnFail', mode: 'player', faction: 'red' });
      await waitFor(() => accepted.length === 1, 'the retry acceptance');
      expect(accepted[0]?.faction).toBe('red');

      const secondLease = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query<{ status: string; lease_id: string }>(
          'SELECT status, lease_id FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
          [server?.worldId, playerId]
        );
        return result.rows[0];
      });
      expect(secondLease?.status).toBe('active');
      expect(secondLease?.lease_id).not.toBe(firstLease?.lease_id);

      // Revision is still 1 -- the retry is the same established faction.
      const revisionAfterRetry = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query<{ state_revision: string }>(
          'SELECT state_revision FROM worlds WHERE world_id = $1',
          [server?.worldId]
        );
        return BigInt(result.rows[0]?.state_revision ?? '0');
      });
      expect(revisionAfterRetry).toBe(1n);

      await room.leave(true).catch(() => undefined);
    },
    TEST_TIMEOUT_MS
  );
});
