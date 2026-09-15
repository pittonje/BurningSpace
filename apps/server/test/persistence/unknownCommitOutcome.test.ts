import { afterEach, describe, expect, it } from 'vitest';
import { ProfileClientMessages, ProfileServerMessages, type ProfileAcceptedMessage, type ProfileRejectedMessage } from '@burningspace/protocol';
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
  console.warn(describeUnreachableDatabaseWarning('unknownCommitOutcome.test.ts'));
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

describe.skipIf(!databaseAvailable)('unknown post-COMMIT outcome (real PostgreSQL)', () => {
  let server: ProductionBattleServerHandle | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it(
    'a real COMMIT the process cannot observe never mutates transient state; an authenticated retry safely converges on canonical durable state',
    async () => {
      let throwOnNextCommit = true;

      server = await startProductionBattleServer({
        gameplayAuthorityTestHooks: {
          afterPlayerProfileCommit: () => {
            if (throwOnNextCommit) {
              throwOnNextCommit = false;
              throw new Error('synthetic: commit outcome unknown to the caller');
            }
          }
        }
      });

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

      room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Uncertain', mode: 'player', faction: 'red' });
      await waitFor(() => rejected.length === 1, 'the uncertain-outcome rejection');

      // No transient authoritative mutation from the uncertain attempt.
      expect(accepted).toHaveLength(0);
      expect(rejected[0]?.reason).not.toMatch(/\blease\b|credential|writer|epoch|\bsql\b/i);

      // The DB canonical state is REALLY committed and queryable, even
      // though the caller never observed success.
      const membershipAfterFirst = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query<{ faction: string | null }>(
          'SELECT faction FROM world_memberships WHERE world_id = $1 AND player_id = $2',
          [server?.worldId, playerId]
        );
        return result.rows[0]?.faction;
      });
      expect(membershipAfterFirst).toBe('red');

      const leaseAfterFirst = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query<{ status: string; lease_id: string }>(
          'SELECT status, lease_id FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
          [server?.worldId, playerId]
        );
        return result.rows[0];
      });
      expect(leaseAfterFirst?.status).toBe('active');

      const revisionAfterFirst = await getStateRevision(server.databaseUrl, server.worldId);
      expect(revisionAfterFirst).toBe(1n);

      // Authenticated retry, same session, same faction: queries canonical
      // state naturally via the normal transaction path.
      room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Uncertain', mode: 'player', faction: 'red' });
      await waitFor(() => accepted.length === 1, 'the retry acceptance');
      expect(accepted[0]?.faction).toBe('red');

      const membershipAfterRetry = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query<{ faction: string | null }>(
          'SELECT faction FROM world_memberships WHERE world_id = $1 AND player_id = $2',
          [server?.worldId, playerId]
        );
        return result.rows[0]?.faction;
      });
      expect(membershipAfterRetry).toBe('red');

      // Revision is NOT incremented again -- same faction, idempotent.
      expect(await getStateRevision(server.databaseUrl, server.worldId)).toBe(1n);

      // Exactly one membership row, and the SAME-session active lease was
      // reused/refreshed rather than duplicated.
      const membershipCount = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query(
          'SELECT 1 FROM world_memberships WHERE world_id = $1 AND player_id = $2',
          [server?.worldId, playerId]
        );
        return result.rowCount ?? 0;
      });
      expect(membershipCount).toBe(1);

      const leaseAfterRetry = await withDirectConnection(server.databaseUrl, async (client) => {
        const result = await client.query<{ lease_id: string; status: string }>(
          'SELECT lease_id, status FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
          [server?.worldId, playerId]
        );
        return result.rows[0];
      });
      expect(leaseAfterRetry?.status).toBe('active');
      expect(leaseAfterRetry?.lease_id).toBe(leaseAfterFirst?.lease_id);

      await room.leave(true).catch(() => undefined);
    },
    TEST_TIMEOUT_MS
  );
});
