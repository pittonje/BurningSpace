import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath, dirname } from 'node:path';
import { Client } from 'pg';
import { redactDatabaseUrl } from '../../src/persistence/config.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { bootstrapWorld } from '../../src/persistence/repositories/worldsRepository.js';
import { POSTGRES_17_IMAGE, runCommand } from '../../scripts/persistence-tooling.js';

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

const ROLE_INIT_SCRIPT_PATH = resolvePath(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../deploy/postgres/init/001-burningspace-roles.sh'
);

export interface RoleSeparatedPostgres {
  readonly containerName: string;
  readonly hostPort: number;
  readonly adminUrl: string;
  readonly migratorUrl: string;
  readonly runtimeUrl: string;
  readonly backupUrl: string;
  stop(): Promise<void>;
}

async function isPostgresReachable(url: string): Promise<boolean> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 1_000 });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

/**
 * A DEDICATED, throwaway, role-separated PostgreSQL container (migrator/
 * runtime/backup, exactly the deploy/postgres/init/001-burningspace-roles.sh
 * model) on a Docker-assigned dynamic host port -- distinct from and never
 * sharing state with the plain-admin deploy/docker-compose.test.db.yml
 * harness the rest of the suite uses. Only backupRestore.test.ts needs the
 * real role separation; every other real-PG test intentionally keeps using
 * the simpler shared admin harness above.
 */
export async function startRoleSeparatedPostgres(): Promise<RoleSeparatedPostgres> {
  const containerName = `bs_backup_test_${randomUUID().replace(/-/g, '')}`;
  const dbName = 'burningspace';
  const adminPassword = randomUUID();
  const migratorPassword = randomUUID();
  const runtimePassword = randomUUID();
  const backupPassword = randomUUID();

  const runResult = await runCommand('docker', [
    'run',
    '-d',
    '--name',
    containerName,
    '-e',
    `POSTGRES_DB=${dbName}`,
    '-e',
    'POSTGRES_USER=burningspace_admin',
    '-e',
    `POSTGRES_PASSWORD=${adminPassword}`,
    '-e',
    `BURNINGSPACE_MIGRATOR_PASSWORD=${migratorPassword}`,
    '-e',
    `BURNINGSPACE_RUNTIME_PASSWORD=${runtimePassword}`,
    '-e',
    `BURNINGSPACE_BACKUP_PASSWORD=${backupPassword}`,
    '-p',
    '127.0.0.1::5432',
    '-v',
    `${ROLE_INIT_SCRIPT_PATH}:/docker-entrypoint-initdb.d/001-burningspace-roles.sh:ro`,
    POSTGRES_17_IMAGE
  ]);

  if (runResult.exitCode !== 0) {
    throw new Error(`Failed to start role-separated PostgreSQL container: ${runResult.stderr.slice(0, 1000)}`);
  }

  const stop = async (): Promise<void> => {
    await runCommand('docker', ['rm', '-f', containerName]);
  };

  try {
    const portResult = await runCommand('docker', ['port', containerName, '5432/tcp']);
    const portMatch = /:(\d+)\s*$/mu.exec(portResult.stdout.trim());

    if (portResult.exitCode !== 0 || !portMatch) {
      throw new Error(`Failed to resolve the published host port: ${portResult.stderr.slice(0, 500)}`);
    }

    const hostPort = Number(portMatch[1]);
    const adminUrl = `postgres://burningspace_admin:${adminPassword}@127.0.0.1:${hostPort}/${dbName}`;
    const migratorUrl = `postgres://burningspace_migrator:${migratorPassword}@127.0.0.1:${hostPort}/${dbName}`;
    const runtimeUrl = `postgres://burningspace_runtime:${runtimePassword}@127.0.0.1:${hostPort}/${dbName}`;
    const backupUrl = `postgres://burningspace_backup:${backupPassword}@127.0.0.1:${hostPort}/${dbName}`;

    const readyDeadline = Date.now() + 30_000;
    let ready = false;
    while (Date.now() < readyDeadline) {
      if (await isPostgresReachable(migratorUrl)) {
        ready = true;
        break;
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
    }

    if (!ready) {
      throw new Error('Role-separated PostgreSQL container did not become reachable in time.');
    }

    return { containerName, hostPort, adminUrl, migratorUrl, runtimeUrl, backupUrl, stop };
  } catch (error) {
    await stop().catch(() => undefined);
    throw error;
  }
}
