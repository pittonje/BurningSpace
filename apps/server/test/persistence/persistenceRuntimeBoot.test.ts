import { randomUUID } from 'node:crypto';
import { matchMaker } from 'colyseus';
import { Client } from 'pg';
import { afterAll, afterEach, describe, expect, test } from 'vitest';
import { SCHEMA_MAINTENANCE_LOCK_KEY } from '../../src/persistence/advisoryLocks.js';
import { redactDatabaseUrl } from '../../src/persistence/config.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import {
  bootPersistenceRuntime,
  SchemaCompatibilityError
} from '../../src/persistence/persistenceRuntime.js';
import { bootstrapWorld, claimWorldWriter, WorldNotFoundError } from '../../src/persistence/repositories/worldsRepository.js';
import { WriterClaimTimeoutError } from '../../src/persistence/writerLifecycle.js';
import { startProductionServer, type ProductionServerHandle } from '../../src/index.js';

const PM2_TELEMETRY_FILTER_MARKER = Symbol.for('burningspace.test.pm2-telemetry-worker-filter');

function installPm2TelemetryFilterForWorkerIpc(): void {
  const workerSend = process.send;
  if (!workerSend || Reflect.get(workerSend, PM2_TELEMETRY_FILTER_MARKER) === true) {
    return;
  }
  const filteredSend = ((message: unknown, ...args: unknown[]): boolean => {
    if (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      typeof message.type === 'string' &&
      message.type.startsWith('axm:')
    ) {
      return true;
    }
    return Reflect.apply(workerSend, process, [message, ...args]) as boolean;
  }) as typeof process.send;
  Reflect.defineProperty(filteredSend, PM2_TELEMETRY_FILTER_MARKER, { value: true });
  process.send = filteredSend;
}

installPm2TelemetryFilterForWorkerIpc();

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
    '[persistenceRuntimeBoot.test.ts] Skipping real-PostgreSQL tests: ' +
      `no reachable database at ${redactDatabaseUrl(ADMIN_DATABASE_URL)}. ` +
      'Start deploy/docker-compose.test.db.yml to run them.'
  );
}

const disposableDatabaseNames: string[] = [];

async function createDatabase(): Promise<{ databaseUrl: string; databaseName: string }> {
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
  return { databaseUrl: url.toString(), databaseName };
}

async function createMigratedDatabase(): Promise<{ databaseUrl: string; databaseName: string }> {
  const { databaseUrl, databaseName } = await createDatabase();
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

async function tryExclusiveSchemaLock(databaseUrl: string): Promise<boolean> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock($1, $2) AS locked', [
      SCHEMA_MAINTENANCE_LOCK_KEY.key[0],
      SCHEMA_MAINTENANCE_LOCK_KEY.key[1]
    ]);
    const locked = result.rows[0]?.locked ?? false;
    if (locked) {
      await client.query('SELECT pg_advisory_unlock($1, $2)', [
        SCHEMA_MAINTENANCE_LOCK_KEY.key[0],
        SCHEMA_MAINTENANCE_LOCK_KEY.key[1]
      ]);
    }
    return locked;
  } finally {
    await client.end();
  }
}

describe.skipIf(!databaseAvailable)('bootPersistenceRuntime (real PostgreSQL)', () => {
  afterAll(async () => {
    for (const name of [...disposableDatabaseNames]) {
      await dropDatabase(name).catch(() => undefined);
    }
  });

  test('a migrated + bootstrapped world boots, claims the writer, and holds the shared maintenance lock', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const setupClient = new Client({ connectionString: databaseUrl });
      await setupClient.connect();
      const bootstrap = await bootstrapWorld(setupClient, 'public-arena');
      await setupClient.end();

      const runtime = await bootPersistenceRuntime({ environment: { DATABASE_URL: databaseUrl } });
      try {
        expect(runtime.worldId).toBe(bootstrap.world.worldId);
        expect(runtime.worldSlug).toBe('public-arena');
        expect(runtime.writerEpoch).toBe(1n);
        expect(runtime.writer.state).toBe('owning');

        // Proof the shared lock is actually held: a concurrent EXCLUSIVE
        // attempt on the same key must fail while it lives.
        expect(await tryExclusiveSchemaLock(databaseUrl)).toBe(false);
      } finally {
        await runtime.shutdown();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('a missing world fails closed with an operator message and never auto-inserts one', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      let caught: unknown;
      try {
        await bootPersistenceRuntime({ environment: { DATABASE_URL: databaseUrl } });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(WorldNotFoundError);
      expect((caught as Error).message).toMatch(/world:bootstrap/i);

      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const rows = await client.query('SELECT count(*)::int AS count FROM worlds');
        expect(rows.rows[0]?.count).toBe(0);
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('an uninitialized schema fails closed without any world claim attempt', async () => {
    const { databaseUrl, databaseName } = await createDatabase();
    try {
      // Deliberately not migrated.
      await expect(bootPersistenceRuntime({ environment: { DATABASE_URL: databaseUrl } })).rejects.toBeInstanceOf(
        SchemaCompatibilityError
      );
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('a live foreign writer is not stolen; bounded claim failure is demonstrated with a short test deadline', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const setupClient = new Client({ connectionString: databaseUrl });
      await setupClient.connect();
      const { world } = await bootstrapWorld(setupClient, 'public-arena');
      const otherInstance = randomUUID();
      const foreignClaim = await claimWorldWriter(setupClient, { worldId: world.worldId, serverInstanceId: otherInstance });
      expect(foreignClaim.kind).toBe('claimed');
      await setupClient.end();

      const startedAt = performance.now();
      await expect(
        bootPersistenceRuntime({
          environment: { DATABASE_URL: databaseUrl },
          writerOptions: { bootDeadlineMillis: 1_200, claimRetryIntervalMillis: 300 }
        })
      ).rejects.toBeInstanceOf(WriterClaimTimeoutError);
      const elapsedMs = performance.now() - startedAt;

      expect(elapsedMs).toBeGreaterThanOrEqual(1_000);
      expect(elapsedMs).toBeLessThan(5_000);

      const check = new Client({ connectionString: databaseUrl });
      await check.connect();
      try {
        const row = await check.query<{ writer_instance_id: string; writer_epoch: string }>(
          'SELECT writer_instance_id, writer_epoch FROM worlds WHERE world_id = $1',
          [world.worldId]
        );
        expect(row.rows[0]?.writer_instance_id).toBe(otherInstance);
        expect(row.rows[0]?.writer_epoch).toBe('1');
      } finally {
        await check.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  }, 10_000);

  test('loss of the shared schema-maintenance connection triggers authority loss without reacquisition', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const setupClient = new Client({ connectionString: databaseUrl });
      await setupClient.connect();
      await bootstrapWorld(setupClient, 'public-arena');

      let authorityLostCount = 0;
      let authorityLostReason: string | undefined;
      let resolveAuthorityLost: (() => void) | undefined;
      const authorityLost = new Promise<void>((resolve) => {
        resolveAuthorityLost = resolve;
      });

      const runtime = await bootPersistenceRuntime({
        environment: { DATABASE_URL: databaseUrl },
        onAuthorityLost: (reason) => {
          authorityLostCount += 1;
          authorityLostReason = reason;
          resolveAuthorityLost?.();
        }
      });

      try {
        // Identify and terminate ONLY the dedicated schema-maintenance
        // backend, by its application_name -- not the writer connection.
        const pidResult = await setupClient.query<{ pid: number }>(
          "SELECT pid FROM pg_stat_activity WHERE application_name = 'burningspace-schema-maintenance' AND datname = current_database()"
        );
        expect(pidResult.rows.length).toBeGreaterThan(0);
        await setupClient.query('SELECT pg_terminate_backend($1)', [pidResult.rows[0]!.pid]);

        await Promise.race([
          authorityLost,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timed out waiting for authority loss')), 5_000))
        ]);

        expect(authorityLostReason).toBe('schema_authority_lost');
        // No reacquisition attempt is coded in this runtime: the shared
        // lock is now free (the terminated session released it), which a
        // second unrelated process/client can independently confirm.
        expect(await tryExclusiveSchemaLock(databaseUrl)).toBe(true);
        expect(authorityLostCount).toBe(1);
      } finally {
        await runtime.shutdown().catch(() => undefined);
        await setupClient.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  }, 10_000);

  test('shutdown conditionally releases the writer, releases the schema lock, and repeat shutdown is harmless', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const setupClient = new Client({ connectionString: databaseUrl });
      await setupClient.connect();
      const { world } = await bootstrapWorld(setupClient, 'public-arena');
      await setupClient.end();

      const runtime = await bootPersistenceRuntime({ environment: { DATABASE_URL: databaseUrl } });
      await runtime.shutdown();

      const check = new Client({ connectionString: databaseUrl });
      await check.connect();
      try {
        const row = await check.query<{ writer_instance_id: string | null }>(
          'SELECT writer_instance_id FROM worlds WHERE world_id = $1',
          [world.worldId]
        );
        expect(row.rows[0]?.writer_instance_id).toBeNull();
      } finally {
        await check.end();
      }

      expect(await tryExclusiveSchemaLock(databaseUrl)).toBe(true);

      await expect(runtime.shutdown()).resolves.toBeUndefined();
    } finally {
      await dropDatabase(databaseName);
    }
  });
});

describe.skipIf(!databaseAvailable)('startProductionServer persistence integration (real PostgreSQL)', () => {
  const runningServers: ProductionServerHandle[] = [];

  afterEach(async () => {
    await Promise.allSettled(runningServers.splice(0).map((server) => server.shutdown('SIGTERM')));
  });

  afterAll(async () => {
    for (const name of [...disposableDatabaseNames]) {
      await dropDatabase(name).catch(() => undefined);
    }
  });

  test('boots only after persistence success, creates exactly one battle room that survives zero clients, and releases the writer on shutdown', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const setupClient = new Client({ connectionString: databaseUrl });
      await setupClient.connect();
      const { world } = await bootstrapWorld(setupClient, 'public-arena');
      await setupClient.end();

      const server = await startProductionServer({
        environment: {
          NODE_ENV: 'production',
          BURNINGSPACE_ALLOWED_ORIGINS: 'https://arena.example.com',
          BURNINGSPACE_RECONNECT_GRACE_SECONDS: '10',
          BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS: '2',
          DATABASE_URL: databaseUrl
        },
        port: 0,
        hostname: '127.0.0.1',
        registerSignalHandlers: false,
        exitOnAuthorityLoss: false
      });
      runningServers.push(server);

      expect(server.lifecycle.state).toBe('ready');
      expect(server.persistence.worldId).toBe(world.worldId);
      expect(server.persistence.writerEpoch).toBe(1n);

      const canonicalRoomId = server.persistence.getCanonicalRoomId();
      expect(typeof canonicalRoomId).toBe('string');
      expect(matchMaker.getLocalRoomById(canonicalRoomId as string)).toBeTruthy();

      // Bounded zero-client observation window: the canonical room must
      // still be present (autoDispose = false), not just the HTTP server.
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(matchMaker.getLocalRoomById(canonicalRoomId as string)).toBeTruthy();

      const healthResponse = await fetch(`${server.url}/health`);
      expect(healthResponse.status).toBe(200);

      await server.shutdown('SIGTERM');
      runningServers.splice(runningServers.indexOf(server), 1);

      const check = new Client({ connectionString: databaseUrl });
      await check.connect();
      try {
        const row = await check.query<{ writer_instance_id: string | null }>(
          'SELECT writer_instance_id FROM worlds WHERE world_id = $1',
          [world.worldId]
        );
        expect(row.rows[0]?.writer_instance_id).toBeNull();
      } finally {
        await check.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  }, 15_000);
});
