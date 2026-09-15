import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createPersistencePool } from '../../src/persistence/pool.js';
import { withTransaction } from '../../src/persistence/pool.js';
import { createPlayer } from '../../src/persistence/repositories/playersRepository.js';
import { insertCredential } from '../../src/persistence/repositories/credentialsRepository.js';
import { establishPlayerFaction } from '../../src/persistence/repositories/membershipsRepository.js';
import * as sessionLeasesRepository from '../../src/persistence/repositories/sessionLeasesRepository.js';
import {
  createBootstrappedTestDatabase,
  isTestDatabaseReachable,
  describeUnreachableDatabaseWarning,
  type BootstrappedTestDatabase
} from '../support/testPersistenceDatabase.js';

const TEST_TIMEOUT_MS = 15_000;
const databaseAvailable = await isTestDatabaseReachable();

if (!databaseAvailable) {
  console.warn(describeUnreachableDatabaseWarning('sessionLeaseRaces.test.ts'));
}

const ACTIVE_TTL_SECONDS = 25;
const SERVER_INSTANCE_A = randomUUID();
const SERVER_INSTANCE_B = randomUUID();
const WRITER_EPOCH = 1n;

interface Fixture {
  readonly pool: Pool;
  readonly database: BootstrappedTestDatabase;
  readonly worldId: string;
  readonly playerId: string;
  readonly credentialId: string;
}

async function createFixture(faction: 'red' | 'blue' = 'red'): Promise<Fixture> {
  const database = await createBootstrappedTestDatabase();
  const pool = createPersistencePool(database.databaseUrl);

  const { playerId, credentialId } = await withTransaction(pool, async (client) => {
    const player = await createPlayer(client);
    // These tests never authenticate over the wire, so a fixed 32-byte hash
    // is fine -- each fixture owns its own isolated disposable database, so
    // the credential_hash uniqueness constraint is never at risk here.
    const credential = await insertCredential(client, player.playerId, {
      version: 1,
      algorithm: 'sha256',
      hash: Buffer.alloc(32, 1)
    });
    await establishPlayerFaction(client, database.worldId, player.playerId, faction);
    return { playerId: player.playerId, credentialId: credential.credentialId };
  });

  return { pool, database, worldId: database.worldId, playerId, credentialId };
}

describe.skipIf(!databaseAvailable)('gameplay session lease races (real PostgreSQL)', () => {
  const fixtures: Fixture[] = [];

  afterEach(async () => {
    await Promise.allSettled(
      fixtures.splice(0).map(async (fixture) => {
        await fixture.pool.end().catch(() => undefined);
        await fixture.database.drop().catch(() => undefined);
      })
    );
  });

  async function setup(faction: 'red' | 'blue' = 'red'): Promise<Fixture> {
    const fixture = await createFixture(faction);
    fixtures.push(fixture);
    return fixture;
  }

  function acquireParams(
    fixture: Fixture,
    overrides: Partial<sessionLeasesRepository.AcquireLeaseParams> = {}
  ): sessionLeasesRepository.AcquireLeaseParams {
    return {
      worldId: fixture.worldId,
      playerId: fixture.playerId,
      credentialId: fixture.credentialId,
      serverInstanceId: SERVER_INSTANCE_A,
      writerEpoch: WRITER_EPOCH,
      roomId: 'room-1',
      transportSessionId: 'session-1',
      activeTtlSeconds: ACTIVE_TTL_SECONDS,
      ...overrides
    };
  }

  it('acquires a brand-new lease when no row exists yet', async () => {
    const fixture = await setup();
    const result = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(client, acquireParams(fixture))
    );
    expect(result.outcome).toBe('acquired');
  }, TEST_TIMEOUT_MS);

  it('one lease per (world_id, player_id): a second distinct transport session is rejected while the first is active and unexpired', async () => {
    const fixture = await setup();
    const first = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(client, acquireParams(fixture))
    );
    expect(first.outcome).toBe('acquired');

    const second = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(
        client,
        acquireParams(fixture, { transportSessionId: 'session-2' })
      )
    );
    expect(second.outcome).toBe('identity_in_use');

    const current = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.findGameplayLease(client, fixture.worldId, fixture.playerId)
    );
    expect(current?.leaseId).toBe(first.outcome === 'acquired' ? first.leaseId : undefined);
    expect(current?.transportSessionId).toBe('session-1');
  }, TEST_TIMEOUT_MS);

  it('the same exact transport session re-acquiring is idempotent (same lease_id, refreshed expiry)', async () => {
    const fixture = await setup();
    const first = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(client, acquireParams(fixture))
    );
    expect(first.outcome).toBe('acquired');
    const firstLeaseId = first.outcome === 'acquired' ? first.leaseId : undefined;

    const retry = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(client, acquireParams(fixture))
    );
    expect(retry.outcome).toBe('acquired');
    expect(retry.outcome === 'acquired' ? retry.leaseId : undefined).toBe(firstLeaseId);
  }, TEST_TIMEOUT_MS);

  it('a released lease is reclaimable with a brand-new lease_id', async () => {
    const fixture = await setup();
    const first = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(client, acquireParams(fixture))
    );
    const firstLeaseId = first.outcome === 'acquired' ? first.leaseId : '';
    const released = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.releaseGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId: firstLeaseId
      })
    );
    expect(released).toBe(true);

    const reclaimed = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(
        client,
        acquireParams(fixture, { transportSessionId: 'session-2' })
      )
    );
    expect(reclaimed.outcome).toBe('acquired');
    expect(reclaimed.outcome === 'acquired' ? reclaimed.leaseId : undefined).not.toBe(firstLeaseId);
  }, TEST_TIMEOUT_MS);

  it('an expired active lease is reclaimable with a brand-new lease_id', async () => {
    const fixture = await setup();
    const first = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(client, acquireParams(fixture, { activeTtlSeconds: 1 }))
    );
    const firstLeaseId = first.outcome === 'acquired' ? first.leaseId : '';
    await new Promise((resolve) => setTimeout(resolve, 1_200));

    const reclaimed = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(
        client,
        acquireParams(fixture, { transportSessionId: 'session-2' })
      )
    );
    expect(reclaimed.outcome).toBe('acquired');
    expect(reclaimed.outcome === 'acquired' ? reclaimed.leaseId : undefined).not.toBe(firstLeaseId);
  }, TEST_TIMEOUT_MS);

  it('a recovering lease blocks a second claimant until the deadline passes, then is reclaimable', async () => {
    const fixture = await setup();
    const first = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(client, acquireParams(fixture))
    );
    const firstLeaseId = first.outcome === 'acquired' ? first.leaseId : '';

    const recovering = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.markRecovering(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId: firstLeaseId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        graceSeconds: 1
      })
    );
    expect(recovering.outcome).toBe('recovering');

    const blockedClaim = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(
        client,
        acquireParams(fixture, { transportSessionId: 'session-2' })
      )
    );
    expect(blockedClaim.outcome).toBe('identity_in_use');

    await new Promise((resolve) => setTimeout(resolve, 1_200));

    const reclaimed = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(
        client,
        acquireParams(fixture, { transportSessionId: 'session-2' })
      )
    );
    expect(reclaimed.outcome).toBe('acquired');
    expect(reclaimed.outcome === 'acquired' ? reclaimed.leaseId : undefined).not.toBe(firstLeaseId);
  }, TEST_TIMEOUT_MS);

  it('a stale old release, heartbeat, and markRecovering against a superseded lease_id never affect the successor lease', async () => {
    const fixture = await setup();
    const first = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(client, acquireParams(fixture))
    );
    const staleLeaseId = first.outcome === 'acquired' ? first.leaseId : '';

    await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.releaseGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId: staleLeaseId
      })
    );

    const successor = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.acquireGameplayLease(
        client,
        acquireParams(fixture, { transportSessionId: 'session-2' })
      )
    );
    const successorLeaseId = successor.outcome === 'acquired' ? successor.leaseId : '';
    expect(successorLeaseId).not.toBe(staleLeaseId);

    const staleRelease = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.releaseGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId: staleLeaseId
      })
    );
    expect(staleRelease).toBe(false);

    const staleHeartbeat = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.renewGameplayLease(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId: staleLeaseId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        activeTtlSeconds: ACTIVE_TTL_SECONDS
      })
    );
    expect(staleHeartbeat).toBeNull();

    const staleRecovering = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.markRecovering(client, {
        worldId: fixture.worldId,
        playerId: fixture.playerId,
        leaseId: staleLeaseId,
        serverInstanceId: SERVER_INSTANCE_A,
        writerEpoch: WRITER_EPOCH,
        graceSeconds: 10
      })
    );
    expect(staleRecovering.outcome).toBe('not_found');

    const current = await withTransaction(fixture.pool, (client) =>
      sessionLeasesRepository.findGameplayLease(client, fixture.worldId, fixture.playerId)
    );
    expect(current?.leaseId).toBe(successorLeaseId);
    expect(current?.status).toBe('active');
  }, TEST_TIMEOUT_MS);

  it('successor gets a brand-new lease_id distinct from every prior lease for the same player', async () => {
    const fixture = await setup();
    const leaseIds = new Set<string>();

    for (let round = 0; round < 3; round += 1) {
      const acquired = await withTransaction(fixture.pool, (client) =>
        sessionLeasesRepository.acquireGameplayLease(
          client,
          acquireParams(fixture, { transportSessionId: `session-${round}` })
        )
      );
      expect(acquired.outcome).toBe('acquired');
      const leaseId = acquired.outcome === 'acquired' ? acquired.leaseId : '';
      expect(leaseIds.has(leaseId)).toBe(false);
      leaseIds.add(leaseId);
      await withTransaction(fixture.pool, (client) =>
        sessionLeasesRepository.releaseGameplayLease(client, {
          worldId: fixture.worldId,
          playerId: fixture.playerId,
          leaseId
        })
      );
    }

    expect(leaseIds.size).toBe(3);
  }, TEST_TIMEOUT_MS);
});
