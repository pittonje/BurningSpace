import { Client as PgClient } from 'pg';
import { Client, type Room } from 'colyseus.js';
import { afterEach, describe, expect, it } from 'vitest';
import { revokeCredential } from '../../src/persistence/repositories/credentialsRepository.js';
import { parseNetworkBoundaryConfig } from '../../src/security/networkBoundary.js';
import {
  startProductionBattleServer,
  type ProductionBattleServerHandle
} from '../support/startProductionBattleServer.js';
import {
  createTestGuestIdentity,
  discoverCanonicalBattleRoom,
  joinCanonicalBattleRoom
} from '../support/testIdentityHelper.js';
import { describeUnreachableDatabaseWarning, isTestDatabaseReachable } from '../support/testPersistenceDatabase.js';

const TEST_TIMEOUT_MS = 15_000;
const databaseAvailable = await isTestDatabaseReachable();

if (!databaseAvailable) {
  console.warn(describeUnreachableDatabaseWarning('durableRoomAuth.test.ts'));
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function reconnectWhenReady(serverUrl: string, token: string, timeoutMs = 5_000): Promise<Room<unknown>> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await new Client(serverUrl).reconnect(token);
    } catch (error) {
      lastError = error;
      await delay(20);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Reconnect did not become ready.');
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

async function credentialIdFor(databaseUrl: string, playerId: string): Promise<string> {
  const client = new PgClient({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query<{ credential_id: string }>(
      'SELECT credential_id FROM player_credentials WHERE player_id = $1',
      [playerId]
    );
    const row = result.rows[0];

    if (!row) {
      throw new Error(`Expected a credential row for player ${playerId}.`);
    }

    return row.credential_id;
  } finally {
    await client.end();
  }
}

async function countIdentityRows(databaseUrl: string): Promise<{ players: number; credentials: number }> {
  const client = new PgClient({ connectionString: databaseUrl });
  await client.connect();
  try {
    const players = await client.query<{ count: number }>('SELECT count(*)::int AS count FROM players');
    const credentials = await client.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM player_credentials'
    );
    return {
      players: players.rows[0]?.count ?? 0,
      credentials: credentials.rows[0]?.count ?? 0
    };
  } finally {
    await client.end();
  }
}

describe.skipIf(!databaseAvailable)('durable BattleRoom credential authentication (real PostgreSQL)', () => {
  let server: ProductionBattleServerHandle | undefined;
  const rooms: Array<Room<unknown>> = [];

  afterEach(async () => {
    await Promise.allSettled(
      rooms.splice(0).map((room) => (room.connection?.isOpen ? room.leave(true) : Promise.resolve()))
    );
    await server?.stop();
    server = undefined;
  });

  it('rejects a join with no credential at all', async () => {
    server = await startProductionBattleServer();
    const roomId = await discoverCanonicalBattleRoom(server.url);

    await expect(new Client(server.url).joinById(roomId, {})).rejects.toThrow('identity_rejected');
  }, TEST_TIMEOUT_MS);

  it(
    'rejects a syntactically malformed credential, an unknown (but valid-shaped) credential, and a revoked credential identically',
    async () => {
      server = await startProductionBattleServer();
      const roomId = await discoverCanonicalBattleRoom(server.url);

      const malformedError: unknown = await new Client(server.url)
        .joinById(roomId, { credential: 'not-a-real-credential' })
        .catch((error: unknown) => error);
      const unknownError: unknown = await new Client(server.url)
        .joinById(roomId, { credential: `bsc1_${'Z'.repeat(43)}` })
        .catch((error: unknown) => error);

      const { playerId, credential } = await createTestGuestIdentity(server.url);
      const credentialId = await credentialIdFor(server.databaseUrl, playerId);
      const revokeClient = new PgClient({ connectionString: server.databaseUrl });
      await revokeClient.connect();
      try {
        expect(await revokeCredential(revokeClient, playerId, credentialId)).toBe('revoked');
      } finally {
        await revokeClient.end();
      }
      const revokedError: unknown = await new Client(server.url)
        .joinById(roomId, { credential })
        .catch((error: unknown) => error);

      expect(malformedError).toBeInstanceOf(Error);
      expect(unknownError).toBeInstanceOf(Error);
      expect(revokedError).toBeInstanceOf(Error);
      const messages = [malformedError, unknownError, revokedError].map((error) => (error as Error).message);
      expect(new Set(messages)).toEqual(new Set(['identity_rejected']));
    },
    TEST_TIMEOUT_MS
  );

  it(
    'joins a valid credential as a transient participant without creating any new identity row',
    async () => {
      server = await startProductionBattleServer();
      const before = await countIdentityRows(server.databaseUrl);
      const { credential } = await createTestGuestIdentity(server.url);
      const afterGuestCreation = await countIdentityRows(server.databaseUrl);
      expect(afterGuestCreation.players).toBe(before.players + 1);
      expect(afterGuestCreation.credentials).toBe(before.credentials + 1);

      const room = await joinCanonicalBattleRoom(server.url, credential);
      rooms.push(room);
      await waitFor(() => room.connection?.isOpen === true, 'joined room connection');

      const afterJoin = await countIdentityRows(server.databaseUrl);

      // Joining creates no membership/lease row and does not touch the
      // players/player_credentials tables again: this packet's join is a
      // transient spectator connection only, never a durable membership.
      expect(afterJoin).toEqual(afterGuestCreation);
    },
    TEST_TIMEOUT_MS
  );

  it(
    'ignores a forged client-supplied playerId: the server always resolves the real credential owner',
    async () => {
      server = await startProductionBattleServer({
        networkBoundaryConfig: parseNetworkBoundaryConfig({
          NODE_ENV: 'test',
          BURNINGSPACE_RECONNECT_GRACE_SECONDS: '3'
        })
      });
      const real = await createTestGuestIdentity(server.url);
      const other = await createTestGuestIdentity(server.url);
      const roomId = await discoverCanonicalBattleRoom(server.url);

      // A forged playerId belonging to a DIFFERENT real player, alongside a
      // genuinely valid credential for `real`.
      const room = await new Client(server.url).joinById(roomId, {
        credential: real.credential,
        playerId: other.playerId
      });
      rooms.push(room);
      const token = room.reconnectionToken;
      const sessionId = room.sessionId;

      await room.leave(false);

      // If the forged playerId had any effect, the server would have bound
      // this session to `other`'s identity, and the reconnect revalidation
      // query (player_id = other.playerId AND credential_id = real's
      // credential_id) would find no matching row -- denying reconnection.
      // Correct behavior (forged playerId ignored, real owner resolved from
      // the credential hash) lets the reconnect succeed.
      if (!token) {
        throw new Error('Expected a reconnection token.');
      }

      const reconnected = await reconnectWhenReady(server.url, token);
      rooms.push(reconnected);
      expect(reconnected.sessionId).toBe(sessionId);
    },
    TEST_TIMEOUT_MS
  );

  it(
    'never lets the raw credential appear in room state, broadcasted messages, or operational logs',
    async () => {
      const logLines: string[] = [];
      server = await startProductionBattleServer({ logSink: (line) => logLines.push(line) });
      const { credential } = await createTestGuestIdentity(server.url);
      const room = await joinCanonicalBattleRoom(server.url, credential);
      rooms.push(room);

      const messages: unknown[] = [];
      room.onMessage('*', (_type: string | number, message: unknown) => messages.push(message));
      await delay(150);

      const serializedState = JSON.stringify(room.state);
      const serializedMessages = JSON.stringify(messages);
      const serializedLogs = logLines.join('\n');

      expect(serializedState).not.toContain(credential);
      expect(serializedMessages).not.toContain(credential);
      expect(serializedLogs).not.toContain(credential);
    },
    TEST_TIMEOUT_MS
  );
});
