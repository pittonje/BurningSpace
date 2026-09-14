import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { redactDatabaseUrl } from '../../src/persistence/config.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { bootstrapWorld } from '../../src/persistence/repositories/worldsRepository.js';

/**
 * Short-lived direct connection for test-side assertions against canonical
 * durable state (never used by production code, which only ever goes
 * through the application Pool via the narrow repositories).
 */
export async function withDirectConnection<T>(
  databaseUrl: string,
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export const ADMIN_DATABASE_URL =
  process.env.BURNINGSPACE_TEST_DATABASE_URL ??
  'postgres://burningspace_test_admin:burningspace_test_password@127.0.0.1:55432/burningspace_test';

export async function isTestDatabaseReachable(): Promise<boolean> {
  const client = new Client({ connectionString: ADMIN_DATABASE_URL, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

export function describeUnreachableDatabaseWarning(source: string): string {
  return (
    `[${source}] Skipping real-PostgreSQL tests: no reachable database at ` +
    `${redactDatabaseUrl(ADMIN_DATABASE_URL)}. Start deploy/docker-compose.test.db.yml to run them.`
  );
}

export interface DisposableTestDatabase {
  readonly databaseUrl: string;
  readonly databaseName: string;
}

export async function createTestDatabase(): Promise<DisposableTestDatabase> {
  const databaseName = `bs_test_${randomUUID().replace(/-/g, '')}`;
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${databaseName}`);
  } finally {
    await admin.end();
  }
  const url = new URL(ADMIN_DATABASE_URL);
  url.pathname = `/${databaseName}`;
  return { databaseUrl: url.toString(), databaseName };
}

export async function createMigratedTestDatabase(): Promise<DisposableTestDatabase> {
  const database = await createTestDatabase();
  await runMigrations(database.databaseUrl);
  return database;
}

export async function dropTestDatabase(databaseName: string): Promise<void> {
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
  }
}

export interface BootstrappedTestDatabase extends DisposableTestDatabase {
  readonly worldId: string;
  readonly worldSlug: string;
  drop(): Promise<void>;
}

/**
 * Full setup a production-shaped test server needs: a fresh disposable
 * database, migrated to the current schema, with exactly one bootstrapped
 * world -- matching bootPersistenceRuntime's fail-closed expectation that a
 * world already exists before it ever attempts a writer claim.
 */
export async function createBootstrappedTestDatabase(
  worldSlug = 'public-arena'
): Promise<BootstrappedTestDatabase> {
  const { databaseUrl, databaseName } = await createMigratedTestDatabase();
  const setupClient = new Client({ connectionString: databaseUrl });
  await setupClient.connect();
  let worldId: string;
  try {
    const bootstrap = await bootstrapWorld(setupClient, worldSlug);
    worldId = bootstrap.world.worldId;
  } finally {
    await setupClient.end();
  }

  let dropped = false;

  return {
    databaseUrl,
    databaseName,
    worldId,
    worldSlug,
    async drop(): Promise<void> {
      if (dropped) {
        return;
      }
      dropped = true;
      await dropTestDatabase(databaseName);
    }
  };
}
