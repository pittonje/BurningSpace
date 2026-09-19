import { Client } from 'colyseus.js';
import { matchMaker } from 'colyseus';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileClientMessages, ProfileServerMessages } from '@burningspace/protocol';
import {
  startProductionBattleServer,
  type ProductionBattleServerHandle
} from '../support/startProductionBattleServer.js';
import { createTestGuestIdentity, discoverCanonicalBattleRoom, joinCanonicalBattleRoom } from '../support/testIdentityHelper.js';
import {
  describeUnreachableDatabaseWarning,
  isTestDatabaseReachable,
  withDirectConnection
} from '../support/testPersistenceDatabase.js';

const TEST_TIMEOUT_MS = 15_000;
// Colyseus @colyseus/core's ErrorCode enum (Protocol.js): the numeric
// codes carried through client-side MatchMakeError.code, and through the
// raw /matchmake/* JSON response body's own "code" field.
const MATCHMAKE_NO_HANDLER = 4210;
const MATCHMAKE_INVALID_ROOM_ID = 4212;
const databaseAvailable = await isTestDatabaseReachable();

if (!databaseAvailable) {
  console.warn(describeUnreachableDatabaseWarning('canonicalRoomLifecycle.test.ts'));
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

/** The actual total server-side battle-room inventory (matchMaker.query
 * against the driver), never inferred from the published canonical id,
 * the worlds table, or a client-side room reference alone. */
async function battleRoomInventory(): Promise<string[]> {
  const rooms = await matchMaker.query({ name: 'battle' });
  return rooms.map((room) => room.roomId).sort();
}

async function activeLeaseCount(databaseUrl: string, worldId: string): Promise<number> {
  return withDirectConnection(databaseUrl, async (client) => {
    const result = await client.query(
      "SELECT count(*)::int AS count FROM active_session_leases WHERE world_id = $1 AND status = 'active'",
      [worldId]
    );
    return (result.rows[0] as { count: number } | undefined)?.count ?? 0;
  });
}

async function worldRowCount(databaseUrl: string): Promise<number> {
  return withDirectConnection(databaseUrl, async (client) => {
    const result = await client.query('SELECT world_id FROM worlds');
    return result.rowCount ?? 0;
  });
}

describe.skipIf(!databaseAvailable)('canonical room capacity and singleton lifecycle (real PostgreSQL)', () => {
  let server: ProductionBattleServerHandle | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it(
    'a full canonical room rejects a further valid join without creating a second room or a second world',
    async () => {
      server = await startProductionBattleServer();
      const roomId = await discoverCanonicalBattleRoom(server.url);

      // Bounded, test-only capacity reduction on the one already-running
      // local room instance -- production MAX_ROOM_CLIENTS is untouched.
      const localRoom = matchMaker.getLocalRoomById(roomId);
      if (!localRoom) {
        throw new Error('Expected the canonical room to be locally registered.');
      }
      localRoom.maxClients = 1;

      const clientA = await createTestGuestIdentity(server.url);
      const roomA = await joinCanonicalBattleRoom(server.url, clientA.credential);

      const clientB = await createTestGuestIdentity(server.url);
      await expect(joinCanonicalBattleRoom(server.url, clientB.credential)).rejects.toThrow();

      // NET-01, case C: create/joinOrCreate still cannot spin up an
      // overflow room merely because the canonical room is full --
      // exposedMethods rejects them before capacity is ever consulted.
      const rawClient = new Client(server.url);
      const createWhileFull = await rawClient
        .create('battle', { credential: clientB.credential })
        .catch((error: unknown) => error);
      expect((createWhileFull as { code?: number }).code).toBe(MATCHMAKE_NO_HANDLER);
      const joinOrCreateWhileFull = await new Client(server.url)
        .joinOrCreate('battle', { credential: clientB.credential })
        .catch((error: unknown) => error);
      expect((joinOrCreateWhileFull as { code?: number }).code).toBe(MATCHMAKE_NO_HANDLER);

      // The canonical room identity is unchanged, and it is still the only
      // room in the actual server-side inventory -- not merely the only
      // locally-registered handle, and not inferred from the published id
      // or the worlds table alone.
      const roomIdAfter = await discoverCanonicalBattleRoom(server.url);
      expect(roomIdAfter).toBe(roomId);
      expect(matchMaker.getLocalRoomById(roomId)?.roomId).toBe(roomId);
      expect(await battleRoomInventory()).toEqual([roomId]);

      expect(await worldRowCount(server.databaseUrl)).toBe(1);

      await roomA.leave(true).catch(() => undefined);
    },
    TEST_TIMEOUT_MS
  );
});

describe.skipIf(!databaseAvailable)(
  'PERSIST002-NET-01: public matchmaking cannot create a parallel battle room (real PostgreSQL)',
  () => {
    let server: ProductionBattleServerHandle | undefined;

    afterEach(async () => {
      await server?.stop();
      server = undefined;
    });

    it(
      'case A: with free capacity, public create/joinOrCreate/join are all rejected by the public-method policy, and no additional room, participant, ship, or lease is produced',
      async () => {
        server = await startProductionBattleServer();
        const roomId = await discoverCanonicalBattleRoom(server.url);
        expect(await battleRoomInventory()).toEqual([roomId]);

        const { credential, playerId } = await createTestGuestIdentity(server.url);
        const leasesBefore = await activeLeaseCount(server.databaseUrl, server.worldId);

        for (const method of ['create', 'joinOrCreate', 'join'] as const) {
          const error = await new Client(server.url)[method]('battle', { credential }).catch(
            (caught: unknown) => caught
          );
          // Proves the PUBLIC-METHOD POLICY specifically caused the
          // rejection -- not an invalid credential (which would surface
          // as onAuth's own AUTH_FAILED / "identity_rejected" only after
          // dispatch), not a hostile Origin, not an exhausted limiter,
          // and not an unreachable server. MATCHMAKE_NO_HANDLER is thrown
          // by controller.invokeMethod() BEFORE matchMaker[method](...)
          // is ever called, so onAuth (and thus credential/Origin
          // checking) never runs for these three methods at all.
          expect((error as { code?: number }).code).toBe(MATCHMAKE_NO_HANDLER);
          expect((error as Error).message).toContain(`invalid method "${method}"`);
        }

        expect(await battleRoomInventory()).toEqual([roomId]);
        expect(await activeLeaseCount(server.databaseUrl, server.worldId)).toBe(leasesBefore);

        const membershipRows = await withDirectConnection(server.databaseUrl, async (client) => {
          const result = await client.query(
            'SELECT faction FROM world_memberships WHERE world_id = $1 AND player_id = $2',
            [server?.worldId, playerId]
          );
          return result.rowCount ?? 0;
        });
        // No SET_PROFILE was ever reachable through a rejected public
        // creation attempt, so no membership/faction row exists for this
        // guest identity at all.
        expect(membershipRows).toBe(0);
      },
      TEST_TIMEOUT_MS
    );

    it(
      'case A (unauthenticated): create/joinOrCreate/join are rejected before dispatch even with no credential at all, proving onAuth is never required to run for them',
      async () => {
        server = await startProductionBattleServer();
        const roomId = await discoverCanonicalBattleRoom(server.url);

        for (const method of ['create', 'joinOrCreate', 'join'] as const) {
          const error = await new Client(server.url)[method]('battle', {}).catch(
            (caught: unknown) => caught
          );
          expect((error as { code?: number }).code).toBe(MATCHMAKE_NO_HANDLER);
        }

        expect(await battleRoomInventory()).toEqual([roomId]);
      },
      TEST_TIMEOUT_MS
    );

    it(
      'the raw /matchmake HTTP response body proves the public-method policy caused the rejection, since this transport always answers 200 OK regardless of outcome',
      async () => {
        server = await startProductionBattleServer();
        const roomId = await discoverCanonicalBattleRoom(server.url);
        const { credential } = await createTestGuestIdentity(server.url);

        const response = await fetch(`${server.url}/matchmake/create/battle`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ credential })
        });

        // The installed transport (@colyseus/core's Server.handleMatchMakeRequest)
        // writes HTTP 200 for every /matchmake/* response, success or
        // failure alike -- response.ok is true either way, so only the
        // JSON body's own "code"/"error" fields distinguish the cause.
        expect(response.status).toBe(200);
        const body = (await response.json()) as { code?: number; error?: string };
        expect(body.code).toBe(MATCHMAKE_NO_HANDLER);
        expect(body.error).toContain('invalid method "create"');

        expect(await battleRoomInventory()).toEqual([roomId]);
      },
      TEST_TIMEOUT_MS
    );

    it(
      'case B: repeated sequential and bounded concurrent public creation attempts are all rejected, and no accumulation remains after a real client joins and leaves',
      async () => {
        server = await startProductionBattleServer();
        const roomId = await discoverCanonicalBattleRoom(server.url);
        const { credential } = await createTestGuestIdentity(server.url);

        // Repeated sequential attempts (bounded, well under an abuse-test
        // budget -- this is a correctness proof, not a load test).
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const error = await new Client(server.url)
            .create('battle', { credential })
            .catch((caught: unknown) => caught);
          expect((error as { code?: number }).code).toBe(MATCHMAKE_NO_HANDLER);
        }

        // Bounded concurrent attempts, mixing methods.
        const concurrentOutcomes = await Promise.allSettled([
          new Client(server.url).create('battle', { credential }),
          new Client(server.url).joinOrCreate('battle', { credential }),
          new Client(server.url).join('battle', { credential })
        ]);
        for (const outcome of concurrentOutcomes) {
          expect(outcome.status).toBe('rejected');
          if (outcome.status === 'rejected') {
            expect((outcome.reason as { code?: number }).code).toBe(MATCHMAKE_NO_HANDLER);
          }
        }

        expect(await battleRoomInventory()).toEqual([roomId]);
        expect(await discoverCanonicalBattleRoom(server.url)).toBe(roomId);

        // A real client actually joining and leaving the one real room
        // must not leave any accumulation behind either.
        const room = await joinCanonicalBattleRoom(server.url, credential);
        await room.leave(true).catch(() => undefined);
        await delay(100);

        expect(await battleRoomInventory()).toEqual([roomId]);
      },
      TEST_TIMEOUT_MS
    );

    it(
      'case D: an invalid/unknown room id through the allowed joinById method is rejected without creating a replacement room',
      async () => {
        server = await startProductionBattleServer();
        const roomId = await discoverCanonicalBattleRoom(server.url);
        const { credential } = await createTestGuestIdentity(server.url);

        const error = await new Client(server.url)
          .joinById('this-room-id-does-not-exist', { credential })
          .catch((caught: unknown) => caught);

        // joinById ITSELF is exposed -- this must fail for a genuinely
        // different reason (the room id does not exist), not the
        // exposedMethods gate, and must not fall back to creating one.
        expect((error as { code?: number }).code).toBe(MATCHMAKE_INVALID_ROOM_ID);
        expect((error as { code?: number }).code).not.toBe(MATCHMAKE_NO_HANDLER);

        expect(await battleRoomInventory()).toEqual([roomId]);
      },
      TEST_TIMEOUT_MS
    );

    it(
      'case E: ordinary joinById admission -> SET_PROFILE still acquires exactly one real gameplay lease whose room_id is the canonical room',
      async () => {
        server = await startProductionBattleServer();
        const roomId = await discoverCanonicalBattleRoom(server.url);
        const { credential, playerId } = await createTestGuestIdentity(server.url);

        const room = await joinCanonicalBattleRoom(server.url, credential);
        expect(room.roomId).toBe(roomId);

        const accepted: unknown[] = [];
        room.onMessage(ProfileServerMessages.PROFILE_ACCEPTED, (message) => accepted.push(message));
        room.send(ProfileClientMessages.SET_PROFILE, {
          nickname: 'NetFix1CaseE',
          mode: 'player',
          faction: 'red'
        });
        await waitFor(() => accepted.length === 1, 'the real SET_PROFILE flow to acquire a gameplay lease');

        const lease = await withDirectConnection(server.databaseUrl, async (client) => {
          const result = await client.query<{ room_id: string; status: string }>(
            'SELECT room_id, status FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
            [server?.worldId, playerId]
          );
          return result.rows[0];
        });
        expect(lease?.status).toBe('active');
        expect(lease?.room_id).toBe(roomId);

        expect(await battleRoomInventory()).toEqual([roomId]);
        await room.leave(true).catch(() => undefined);
      },
      TEST_TIMEOUT_MS
    );
  }
);
