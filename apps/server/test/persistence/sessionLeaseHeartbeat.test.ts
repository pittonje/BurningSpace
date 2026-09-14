import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileClientMessages, ProfileServerMessages } from '@burningspace/protocol';
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
const HEARTBEAT_WIRING_TIMEOUT_MS = 15_000;
const ACTIVE_TTL_SECONDS = 25;
const SERVER_INSTANCE_A = randomUUID();
const WRITER_EPOCH = 1n;

const databaseAvailable = await isTestDatabaseReachable();

if (!databaseAvailable) {
  console.warn(describeUnreachableDatabaseWarning('sessionLeaseHeartbeat.test.ts'));
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

async function createFixture(): Promise<Fixture> {
  const database = await createBootstrappedTestDatabase();
  const pool = createPersistencePool(database.databaseUrl);
  const { playerId, credentialId } = await withTransaction(pool, async (client) => {
    const player = await createPlayer(client);
    const credential = await insertCredential(client, player.playerId, {
      version: 1,
      algorithm: 'sha256',
      hash: Buffer.alloc(32, 2)
    });
    await establishPlayerFaction(client, database.worldId, player.playerId, 'red');
    return { playerId: player.playerId, credentialId: credential.credentialId };
  });
  return { pool, database, worldId: database.worldId, playerId, credentialId };
}

describe.skipIf(!databaseAvailable)('gameplay lease renewal (real PostgreSQL)', () => {
  const fixtures: Fixture[] = [];

  afterEach(async () => {
    await Promise.allSettled(
      fixtures.splice(0).map(async (fixture) => {
        await fixture.pool.end().catch(() => undefined);
        await fixture.database.drop().catch(() => undefined);
      })
    );
  });

  async function setup(): Promise<Fixture> {
    const fixture = await createFixture();
    fixtures.push(fixture);
    return fixture;
  }

  it('renews an exact-match active, unexpired lease and extends expires_at', async () => {
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
    const initialExpiresAt = acquired.outcome === 'acquired' ? acquired.expiresAt : new Date(0);

    await delay(50);

    const renewedExpiresAt = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.renewGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );

    expect(renewedExpiresAt).not.toBeNull();
    expect((renewedExpiresAt as Date).getTime()).toBeGreaterThan(initialExpiresAt.getTime());
  }, TEST_TIMEOUT_MS);

  it('rejects renewal for a wrong lease_id, wrong server instance, wrong writer epoch, or non-active status', async () => {
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

    const wrongLease = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.renewGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId: randomUUID(),
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );
    expect(wrongLease).toBeNull();

    const wrongServer = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.renewGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId,
        serverInstanceId: randomUUID(),
        writerEpoch: WRITER_EPOCH,
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );
    expect(wrongServer).toBeNull();

    const wrongEpoch = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.renewGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH + 1n,
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );
    expect(wrongEpoch).toBeNull();

    await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.markRecovering(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        graceSeconds: 10
      })
    );
    const whileRecovering = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.renewGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );
    expect(whileRecovering).toBeNull();
  }, TEST_TIMEOUT_MS);

  it('gameplayAuthority.renewGameplayLease fails closed when the credential has been revoked', async () => {
    const fixture = await setup();
    const claimClient = await fixture.pool.connect();
    try {
      const claim = await claimWorldWriter(claimClient, {
        worldId: fixture.worldId,
        serverInstanceId: SERVER_INSTANCE_A
      });
      expect(claim.kind).toBe('claimed');
    } finally {
      claimClient.release();
    }

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

    const authority = createGameplayAuthority({
      pool: fixture.pool,
      worldId: fixture.worldId,
      serverInstanceId: SERVER_INSTANCE_A,
      writerEpoch: WRITER_EPOCH
    });

    const beforeRevocation = await authority.renewGameplayLease({
      playerId: fixture.playerId,
      credentialId: fixture.credentialId,
      leaseId,
      graceSeconds: 10
    });
    expect(beforeRevocation).toBe(true);

    await withTransaction(fixture.pool, (client) => revokeCredential(client, fixture.playerId, fixture.credentialId));

    const afterRevocation = await authority.renewGameplayLease({
      playerId: fixture.playerId,
      credentialId: fixture.credentialId,
      leaseId,
      graceSeconds: 10
    });
    expect(afterRevocation).toBe(false);

    const current = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.findGameplayLease(client, fixture.worldId, fixture.playerId)
    );
    // Revocation itself released the lease in the same transaction (see
    // credentialRotationRevocation.test.ts); the heartbeat's own credential
    // check is a second, independent line of defense.
    expect(current?.status).toBe('released');
  }, TEST_TIMEOUT_MS);

  it('gameplayAuthority.renewGameplayLease fails closed when this process is no longer the current writer', async () => {
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

    // This world was bootstrapped by createBootstrappedTestDatabase() but
    // never had a writer claimed (no persistenceRuntime boot in this
    // fixture), so worlds.writer_instance_id is NULL: the DB-verified
    // writer check inside renewGameplayLease must fail regardless of the
    // caller's believed serverInstanceId/writerEpoch.
    const authority = createGameplayAuthority({
      pool: fixture.pool,
      worldId: fixture.worldId,
      serverInstanceId: SERVER_INSTANCE_A,
      writerEpoch: WRITER_EPOCH
    });

    const result = await authority.renewGameplayLease({
      playerId: fixture.playerId,
      credentialId: fixture.credentialId,
      leaseId,
      graceSeconds: 10
    });
    expect(result).toBe(false);
  }, TEST_TIMEOUT_MS);
});

describe.skipIf(!databaseAvailable)('gameplay lease room heartbeat wiring (real PostgreSQL)', () => {
  let server: ProductionBattleServerHandle | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it(
    'renews a connected player session lease on the real 5-second room heartbeat, without a fake clock',
    async () => {
      server = await startProductionBattleServer();
      const { credential, playerId } = await createTestGuestIdentity(server.url);
      const room = await joinCanonicalBattleRoom(server.url, credential);
      const accepted: unknown[] = [];
      room.onMessage(ProfileServerMessages.PROFILE_ACCEPTED, (message) => accepted.push(message));
      room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Heartbeat', mode: 'player', faction: 'red' });
      await waitFor(() => accepted.length === 1, 'profile acceptance');

      const initial = await withDirectConnection(server.databaseUrl, (client) =>
        client.query<{ lease_id: string; updated_at: Date }>(
          'SELECT lease_id, updated_at FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
          [server?.worldId, playerId]
        )
      );
      const initialRow = initial.rows[0];
      expect(initialRow).toBeDefined();

      // One real wait past a single 5s heartbeat tick, with margin -- not
      // "many 5-second periods".
      await delay(6_500);

      const renewed = await withDirectConnection(server.databaseUrl, (client) =>
        client.query<{ lease_id: string; updated_at: Date; status: string }>(
          'SELECT lease_id, updated_at, status FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
          [server?.worldId, playerId]
        )
      );
      const renewedRow = renewed.rows[0];

      expect(renewedRow?.status).toBe('active');
      expect(renewedRow?.lease_id).toBe(initialRow?.lease_id);
      expect(renewedRow?.updated_at.getTime()).toBeGreaterThan(initialRow?.updated_at.getTime() ?? 0);
      expect(room.connection.isOpen).toBe(true);

      await room.leave(true).catch(() => undefined);
    },
    HEARTBEAT_WIRING_TIMEOUT_MS
  );
});
