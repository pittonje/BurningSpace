import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, describe, expect, test } from 'vitest';
import { redactDatabaseUrl } from '../../src/persistence/config.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { bootstrapWorld, claimWorldWriter, renewWorldWriter } from '../../src/persistence/repositories/worldsRepository.js';
import {
  WriterLifecycle,
  type MonotonicClock,
  type WriterConnectionEvents,
  type WriterRepositoryPort
} from '../../src/persistence/writerLifecycle.js';

const ADMIN_DATABASE_URL =
  process.env.BURNINGSPACE_TEST_DATABASE_URL ??
  'postgres://burningspace_test_admin:burningspace_test_password@127.0.0.1:55432/burningspace_test';

async function isDatabaseReachable(): Promise<boolean> {
  const client = new Client({ connectionString: ADMIN_DATABASE_URL, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

const databaseAvailable = await isDatabaseReachable();

if (!databaseAvailable) {
  console.warn(
    '[writerHeartbeatFailure.test.ts] Skipping real-PostgreSQL tests: ' +
      `no reachable database at ${redactDatabaseUrl(ADMIN_DATABASE_URL)}. ` +
      'Start deploy/docker-compose.test.db.yml to run them.'
  );
}

const disposableDatabaseNames: string[] = [];

async function createMigratedDatabase(): Promise<{ databaseUrl: string; databaseName: string }> {
  const databaseName = `bs_test_${randomUUID().replace(/-/g, '')}`;
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${databaseName}`);
  } finally {
    await admin.end();
  }
  disposableDatabaseNames.push(databaseName);
  const url = new URL(ADMIN_DATABASE_URL);
  url.pathname = `/${databaseName}`;
  const databaseUrl = url.toString();
  await runMigrations(databaseUrl);
  return { databaseUrl, databaseName };
}

async function dropDatabase(databaseName: string): Promise<void> {
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  try {
    await admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [databaseName]
    );
    await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
  } finally {
    await admin.end();
    const index = disposableDatabaseNames.indexOf(databaseName);
    if (index >= 0) {
      disposableDatabaseNames.splice(index, 1);
    }
  }
}

function createQueuedClock(values: number[]): MonotonicClock {
  const queue = [...values];
  return {
    now: () => (queue.length > 1 ? (queue.shift() as number) : (queue[0] as number))
  };
}

function createRealRepositoryPort(client: Client): WriterRepositoryPort {
  return {
    claimWorldWriter: (worldId, serverInstanceId) => claimWorldWriter(client, { worldId, serverInstanceId }),
    renewWorldWriter: (worldId, serverInstanceId, writerEpoch) =>
      renewWorldWriter(client, { worldId, serverInstanceId, writerEpoch }),
    releaseWorldWriter: async () => true
  };
}

class FakeConnection implements WriterConnectionEvents {
  private errorListener?: (error: Error) => void;
  private endListener?: () => void;

  once(event: 'error' | 'end', listener: ((error: Error) => void) | (() => void)): unknown {
    if (event === 'error') {
      this.errorListener = listener as (error: Error) => void;
    } else {
      this.endListener = listener as () => void;
    }
    return this;
  }

  emitError(error: Error): void {
    this.errorListener?.(error);
  }

  emitEnd(): void {
    this.endListener?.();
  }
}

describe.skipIf(!databaseAvailable)('WriterLifecycle heartbeat failure (real PostgreSQL where appropriate)', () => {
  afterAll(async () => {
    for (const name of [...disposableDatabaseNames]) {
      await dropDatabase(name).catch(() => undefined);
    }
  });

  test('heartbeat renews only for the exact worldId + serverInstanceId + unexpired writerEpoch', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const { world } = await bootstrapWorld(client, 'public-arena');
        const serverInstanceId = randomUUID();
        const lifecycle = new WriterLifecycle({
          worldId: world.worldId,
          serverInstanceId,
          repository: createRealRepositoryPort(client),
          connection: new FakeConnection()
        });

        await lifecycle.claim();
        expect(lifecycle.state).toBe('owning');
        expect(lifecycle.writerEpoch).toBe(1n);

        await lifecycle.performHeartbeat();
        expect(lifecycle.state).toBe('owning');
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('a stale/foreign epoch renewal (zero rows) causes authority loss', async () => {
    // The real-PostgreSQL WHERE-clause behavior for a stale epoch is
    // independently proven in writerFencing.test.ts (renewWorldWriter
    // returns null after takeover) and the "expired writer" case above.
    // This proves the WriterLifecycle state machine's own reaction to that
    // zero-row result, isolated behind a fake repository.
    let lostReason: string | undefined;
    const lifecycle = new WriterLifecycle({
      worldId: 'world-1',
      serverInstanceId: 'instance-1',
      repository: {
        claimWorldWriter: async () => ({
          kind: 'claimed',
          claim: { worldId: 'world-1', serverInstanceId: 'instance-1', writerEpoch: 1n, writerExpiresAt: new Date(0) }
        }),
        renewWorldWriter: async () => null,
        releaseWorldWriter: async () => true
      },
      connection: new FakeConnection(),
      onAuthorityLost: (reason) => {
        lostReason = reason;
      }
    });

    await lifecycle.claim();
    expect(lifecycle.state).toBe('owning');

    await lifecycle.performHeartbeat();

    expect(lifecycle.state).toBe('failed');
    expect(lostReason).toBe('heartbeat_zero_rows');
  });

  test('an expired writer cannot be resurrected by heartbeat', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const { world } = await bootstrapWorld(client, 'public-arena');
        const serverInstanceId = randomUUID();
        const claim = await claimWorldWriter(client, { worldId: world.worldId, serverInstanceId });
        expect(claim.kind).toBe('claimed');
        if (claim.kind !== 'claimed') {
          throw new Error('unreachable');
        }

        await client.query("UPDATE worlds SET writer_expires_at = clock_timestamp() - interval '1 second' WHERE world_id = $1", [
          world.worldId
        ]);

        const renewed = await renewWorldWriter(client, {
          worldId: world.worldId,
          serverInstanceId,
          writerEpoch: claim.claim.writerEpoch
        });
        expect(renewed).toBeNull();
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('a dedicated writer connection failure invokes the authority-loss path', async () => {
    const connection = new FakeConnection();
    let lostReason: string | undefined;
    const lifecycle = new WriterLifecycle({
      worldId: 'world-1',
      serverInstanceId: 'instance-1',
      repository: {
        claimWorldWriter: async () => ({
          kind: 'claimed',
          claim: { worldId: 'world-1', serverInstanceId: 'instance-1', writerEpoch: 1n, writerExpiresAt: new Date(0) }
        }),
        renewWorldWriter: async () => new Date(0),
        releaseWorldWriter: async () => true
      },
      connection,
      onAuthorityLost: (reason) => {
        lostReason = reason;
      }
    });

    await lifecycle.claim();
    expect(lifecycle.state).toBe('owning');

    connection.emitError(new Error('simulated connection loss'));

    expect(lifecycle.state).toBe('failed');
    expect(lostReason).toBe('connection_error');
  });

  test('a late heartbeat response is discarded for local safety even when the DB call itself succeeds', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const { world } = await bootstrapWorld(client, 'public-arena');
        const serverInstanceId = randomUUID();

        // Real Postgres responds fast; the injected clock fakes a slow
        // round-trip deterministically so no real sleep is needed.
        const clock = createQueuedClock([
          0, // claim(): deadline base
          0, // claim(): lastConfirmedHeartbeatAt
          0, // performHeartbeat(): isControlSafe() precheck
          0, // performHeartbeat(): requestStartedAt
          15_000 // performHeartbeat(): responseAt -- fake a slow round trip
        ]);

        const lifecycle = new WriterLifecycle({
          worldId: world.worldId,
          serverInstanceId,
          repository: createRealRepositoryPort(client),
          connection: new FakeConnection(),
          clock
        });

        await lifecycle.claim();
        await lifecycle.performHeartbeat();

        // The real DB renewal succeeded, so the lifecycle is not failed,
        // but the confirmation must have been discarded.
        expect(lifecycle.state).toBe('owning');

        const row = await client.query<{ writer_instance_id: string }>(
          'SELECT writer_instance_id FROM worlds WHERE world_id = $1',
          [world.worldId]
        );
        expect(row.rows[0]?.writer_instance_id).toBe(serverInstanceId);
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('once failed, the same WriterLifecycle instance cannot return to owning even if the DB is healthy', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const { world } = await bootstrapWorld(client, 'public-arena');
        const serverInstanceId = randomUUID();
        const connection = new FakeConnection();
        const lifecycle = new WriterLifecycle({
          worldId: world.worldId,
          serverInstanceId,
          repository: createRealRepositoryPort(client),
          connection
        });

        await lifecycle.claim();
        expect(lifecycle.state).toBe('owning');

        connection.emitError(new Error('simulated connection loss'));
        expect(lifecycle.state).toBe('failed');

        // The database is perfectly healthy; a fresh heartbeat/claim
        // attempt on the SAME instance must still refuse to recover.
        await lifecycle.performHeartbeat();
        expect(lifecycle.state).toBe('failed');

        await expect(lifecycle.claim()).rejects.toThrow();
        expect(lifecycle.state).toBe('failed');
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });
});
