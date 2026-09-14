import { matchMaker } from 'colyseus';
import { afterEach, describe, expect, it } from 'vitest';
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
const databaseAvailable = await isTestDatabaseReachable();

if (!databaseAvailable) {
  console.warn(describeUnreachableDatabaseWarning('canonicalRoomLifecycle.test.ts'));
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

      // The canonical room identity is unchanged, and it is still the only
      // locally registered 'battle' room.
      const roomIdAfter = await discoverCanonicalBattleRoom(server.url);
      expect(roomIdAfter).toBe(roomId);
      expect(matchMaker.getLocalRoomById(roomId)?.roomId).toBe(roomId);

      const worldCount = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query('SELECT world_id FROM worlds');
        return result.rowCount ?? 0;
      });
      expect(worldCount).toBe(1);

      await roomA.leave(true).catch(() => undefined);
    },
    TEST_TIMEOUT_MS
  );
});
