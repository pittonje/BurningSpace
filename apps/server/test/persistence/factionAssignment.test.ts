import type { MapSchema } from '@colyseus/schema';
import type { Room } from 'colyseus.js';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileClientMessages, ProfileServerMessages, type ProfileRejectedMessage } from '@burningspace/protocol';
import {
  startProductionBattleServer,
  type ProductionBattleServerHandle
} from '../support/startProductionBattleServer.js';
import { createTestGuestIdentity, joinCanonicalBattleRoom } from '../support/testIdentityHelper.js';
import {
  describeUnreachableDatabaseWarning,
  isTestDatabaseReachable,
  withDirectConnection
} from '../support/testPersistenceDatabase.js';

const TEST_TIMEOUT_MS = 15_000;
const databaseAvailable = await isTestDatabaseReachable();

if (!databaseAvailable) {
  console.warn(describeUnreachableDatabaseWarning('factionAssignment.test.ts'));
}

interface BattleStateSchema {
  participants: MapSchema<{ sessionId: string }, string>;
  ships: MapSchema<{ ownerSessionId: string; faction: string }, string>;
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

async function getStateRevision(databaseUrl: string, worldId: string): Promise<bigint> {
  return withDirectConnection(databaseUrl, async (client) => {
    const result = await client.query<{ state_revision: string }>(
      'SELECT state_revision FROM worlds WHERE world_id = $1',
      [worldId]
    );
    return BigInt(result.rows[0]?.state_revision ?? '0');
  });
}

async function getMembershipFaction(
  databaseUrl: string,
  worldId: string,
  playerId: string
): Promise<string | null | undefined> {
  return withDirectConnection(databaseUrl, async (client) => {
    const result = await client.query<{ faction: string | null }>(
      'SELECT faction FROM world_memberships WHERE world_id = $1 AND player_id = $2',
      [worldId, playerId]
    );
    return result.rows[0]?.faction;
  });
}

async function countMemberships(databaseUrl: string, worldId: string, playerId: string): Promise<number> {
  return withDirectConnection(databaseUrl, async (client) => {
    const result = await client.query(
      'SELECT 1 FROM world_memberships WHERE world_id = $1 AND player_id = $2',
      [worldId, playerId]
    );
    return result.rowCount ?? 0;
  });
}

async function getDisplayName(databaseUrl: string, playerId: string): Promise<string | null | undefined> {
  return withDirectConnection(databaseUrl, async (client) => {
    const result = await client.query<{ display_name: string | null }>(
      'SELECT display_name FROM players WHERE player_id = $1',
      [playerId]
    );
    return result.rows[0]?.display_name;
  });
}

/**
 * Counts only NON-released lease rows: a clean leave marks the row
 * 'released' (migration 001 never deletes lease rows), so "no gameplay
 * lease" means no row, or a row whose status is 'released'.
 */
async function countNonReleasedLeases(databaseUrl: string, worldId: string, playerId: string): Promise<number> {
  return withDirectConnection(databaseUrl, async (client) => {
    const result = await client.query(
      "SELECT 1 FROM active_session_leases WHERE world_id = $1 AND player_id = $2 AND status <> 'released'",
      [worldId, playerId]
    );
    return result.rowCount ?? 0;
  });
}

interface AcceptedOrRejected {
  accepted: unknown[];
  rejected: ProfileRejectedMessage[];
}

function observeProfileMessages(room: Room<BattleStateSchema>): AcceptedOrRejected {
  const observed: AcceptedOrRejected = { accepted: [], rejected: [] };
  room.onMessage(ProfileServerMessages.PROFILE_ACCEPTED, (message) => observed.accepted.push(message));
  room.onMessage<ProfileRejectedMessage>(ProfileServerMessages.PROFILE_REJECTED, (message) =>
    observed.rejected.push(message)
  );
  return observed;
}

describe.skipIf(!databaseAvailable)('durable membership/faction assignment (real PostgreSQL)', () => {
  let server: ProductionBattleServerHandle | undefined;
  const rooms: Array<Room<BattleStateSchema>> = [];

  afterEach(async () => {
    await Promise.allSettled(
      rooms.splice(0).map((room) => (room.connection?.isOpen ? room.leave(true) : Promise.resolve()))
    );
    await server?.stop();
    server = undefined;
  });

  async function joinAsGuest(): Promise<{ room: Room<BattleStateSchema>; playerId: string }> {
    if (!server) {
      throw new Error('Server is not running.');
    }
    const { playerId, credential } = await createTestGuestIdentity(server.url);
    const room = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
    rooms.push(room);
    await waitFor(() => Boolean(room.state?.participants), 'initial room state');
    return { room, playerId };
  }

  it('first red selection persists membership/red and increments state_revision exactly once', async () => {
    server = await startProductionBattleServer();
    const { room, playerId } = await joinAsGuest();
    const observed = observeProfileMessages(room);
    const before = await getStateRevision(server.databaseUrl, server.worldId);

    room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Red1', mode: 'player', faction: 'red' });
    await waitFor(() => observed.accepted.length === 1, 'first red acceptance');

    expect(await getMembershipFaction(server.databaseUrl, server.worldId, playerId)).toBe('red');
    expect(await getStateRevision(server.databaseUrl, server.worldId)).toBe(before + 1n);
  }, TEST_TIMEOUT_MS);

  it('a same-faction retry (fresh session) is idempotent and does not increment revision again', async () => {
    server = await startProductionBattleServer();
    const { credential, playerId } = await createTestGuestIdentity(server.url);

    const firstRoom = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
    rooms.push(firstRoom);
    await waitFor(() => Boolean(firstRoom.state?.participants), 'first session state');
    const firstObserved = observeProfileMessages(firstRoom);
    firstRoom.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Red', mode: 'player', faction: 'red' });
    await waitFor(() => firstObserved.accepted.length === 1, 'first red acceptance');
    await firstRoom.leave(true);

    const afterFirst = await getStateRevision(server.databaseUrl, server.worldId);

    const secondRoom = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
    rooms.push(secondRoom);
    await waitFor(() => Boolean(secondRoom.state?.participants), 'second session state');
    const secondObserved = observeProfileMessages(secondRoom);
    secondRoom.send(ProfileClientMessages.SET_PROFILE, { nickname: 'RedAgain', mode: 'player', faction: 'red' });
    await waitFor(() => secondObserved.accepted.length === 1, 'idempotent red acceptance');

    expect(await getMembershipFaction(server.databaseUrl, server.worldId, playerId)).toBe('red');
    expect(await getStateRevision(server.databaseUrl, server.worldId)).toBe(afterFirst);
  }, TEST_TIMEOUT_MS);

  it('a fresh session requesting the opposite faction is rejected with no mutation', async () => {
    server = await startProductionBattleServer();
    const { credential, playerId } = await createTestGuestIdentity(server.url);

    const firstRoom = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
    rooms.push(firstRoom);
    await waitFor(() => Boolean(firstRoom.state?.participants), 'first session state');
    const firstObserved = observeProfileMessages(firstRoom);
    firstRoom.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Red', mode: 'player', faction: 'red' });
    await waitFor(() => firstObserved.accepted.length === 1, 'first red acceptance');
    await firstRoom.leave(true);

    const afterFirst = await getStateRevision(server.databaseUrl, server.worldId);

    const secondRoom = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
    rooms.push(secondRoom);
    await waitFor(() => Boolean(secondRoom.state?.participants), 'second session state');
    const secondObserved = observeProfileMessages(secondRoom);
    secondRoom.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Blue', mode: 'player', faction: 'blue' });
    await waitFor(() => secondObserved.rejected.length === 1, 'blue conflict rejection');

    expect(secondObserved.accepted).toHaveLength(0);
    expect(await getMembershipFaction(server.databaseUrl, server.worldId, playerId)).toBe('red');
    expect(await getStateRevision(server.databaseUrl, server.worldId)).toBe(afterFirst);
    expect(await countNonReleasedLeases(server.databaseUrl, server.worldId, playerId)).toBe(0);
  }, TEST_TIMEOUT_MS);

  it('two concurrent first-choice requests (red vs blue, same durable player) produce exactly one durable winner', async () => {
    server = await startProductionBattleServer();
    const { credential, playerId } = await createTestGuestIdentity(server.url);

    const roomA = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
    const roomB = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
    rooms.push(roomA, roomB);
    await waitFor(() => Boolean(roomA.state?.participants), 'session A state');
    await waitFor(() => Boolean(roomB.state?.participants), 'session B state');

    const observedA = observeProfileMessages(roomA);
    const observedB = observeProfileMessages(roomB);
    const before = await getStateRevision(server.databaseUrl, server.worldId);

    roomA.send(ProfileClientMessages.SET_PROFILE, { nickname: 'PlayerA', mode: 'player', faction: 'red' });
    roomB.send(ProfileClientMessages.SET_PROFILE, { nickname: 'PlayerB', mode: 'player', faction: 'blue' });

    await waitFor(
      () => observedA.accepted.length + observedA.rejected.length === 1 &&
        observedB.accepted.length + observedB.rejected.length === 1,
      'both concurrent requests to settle'
    );

    const totalAccepted = observedA.accepted.length + observedB.accepted.length;
    expect(totalAccepted).toBe(1);

    const finalFaction = await getMembershipFaction(server.databaseUrl, server.worldId, playerId);
    expect(finalFaction === 'red' || finalFaction === 'blue').toBe(true);
    expect(await countMemberships(server.databaseUrl, server.worldId, playerId)).toBe(1);
    expect(await getStateRevision(server.databaseUrl, server.worldId)).toBe(before + 1n);
  }, TEST_TIMEOUT_MS);

  it('a spectator profile creates no membership row', async () => {
    server = await startProductionBattleServer();
    const { room, playerId } = await joinAsGuest();
    const observed = observeProfileMessages(room);

    room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Watcher', mode: 'spectator' });
    await waitFor(() => observed.accepted.length === 1, 'spectator acceptance');

    expect(await countMemberships(server.databaseUrl, server.worldId, playerId)).toBe(0);
  }, TEST_TIMEOUT_MS);

  it('a durable red player who later joins a fresh session as spectator keeps red durable, with no lease', async () => {
    server = await startProductionBattleServer();
    const { credential, playerId } = await createTestGuestIdentity(server.url);

    const firstRoom = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
    rooms.push(firstRoom);
    await waitFor(() => Boolean(firstRoom.state?.participants), 'first session state');
    const firstObserved = observeProfileMessages(firstRoom);
    firstRoom.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Red', mode: 'player', faction: 'red' });
    await waitFor(() => firstObserved.accepted.length === 1, 'first red acceptance');
    await firstRoom.leave(true);

    const secondRoom = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
    rooms.push(secondRoom);
    await waitFor(() => Boolean(secondRoom.state?.participants), 'second session state');
    const secondObserved = observeProfileMessages(secondRoom);
    secondRoom.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Watcher', mode: 'spectator' });
    await waitFor(() => secondObserved.accepted.length === 1, 'spectator acceptance');

    expect(await getMembershipFaction(server.databaseUrl, server.worldId, playerId)).toBe('red');
    expect(await countNonReleasedLeases(server.databaseUrl, server.worldId, playerId)).toBe(0);
  }, TEST_TIMEOUT_MS);

  it('a nickname-only metadata update changes display_name without touching state_revision', async () => {
    server = await startProductionBattleServer();
    const { credential, playerId } = await createTestGuestIdentity(server.url);

    const firstRoom = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
    rooms.push(firstRoom);
    await waitFor(() => Boolean(firstRoom.state?.participants), 'first session state');
    const firstObserved = observeProfileMessages(firstRoom);
    firstRoom.send(ProfileClientMessages.SET_PROFILE, { nickname: 'FirstName', mode: 'spectator' });
    await waitFor(() => firstObserved.accepted.length === 1, 'first spectator acceptance');
    expect(await getDisplayName(server.databaseUrl, playerId)).toBe('FirstName');
    await firstRoom.leave(true);

    const before = await getStateRevision(server.databaseUrl, server.worldId);

    const secondRoom = await joinCanonicalBattleRoom<BattleStateSchema>(server.url, credential);
    rooms.push(secondRoom);
    await waitFor(() => Boolean(secondRoom.state?.participants), 'second session state');
    const secondObserved = observeProfileMessages(secondRoom);
    secondRoom.send(ProfileClientMessages.SET_PROFILE, { nickname: 'SecondName', mode: 'spectator' });
    await waitFor(() => secondObserved.accepted.length === 1, 'second spectator acceptance');

    expect(await getDisplayName(server.databaseUrl, playerId)).toBe('SecondName');
    expect(await getStateRevision(server.databaseUrl, server.worldId)).toBe(before);
  }, TEST_TIMEOUT_MS);
});
