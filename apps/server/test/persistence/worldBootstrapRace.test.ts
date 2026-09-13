import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Client } from 'pg';
import { describe, expect, test } from 'vitest';
import { redactDatabaseUrl } from '../../src/persistence/config.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';

const execFileAsync = promisify(execFile);

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
    '[worldBootstrapRace.test.ts] Skipping real-PostgreSQL race test: ' +
      `no reachable database at ${redactDatabaseUrl(ADMIN_DATABASE_URL)}. ` +
      'Start deploy/docker-compose.test.db.yml to run it.'
  );
}

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORLD_BOOTSTRAP_SCRIPT = path.resolve(MODULE_DIR, '../../scripts/world-bootstrap.ts');
const TSX_CLI = path.resolve(MODULE_DIR, '../../../../node_modules/tsx/dist/cli.mjs');

interface BootstrapCliResult {
  readonly exitCode: number;
  readonly stdout: unknown;
}

async function runBootstrapCli(databaseUrl: string): Promise<BootstrapCliResult> {
  try {
    const { stdout } = await execFileAsync(process.execPath, [TSX_CLI, WORLD_BOOTSTRAP_SCRIPT], {
      env: { ...process.env, MIGRATION_DATABASE_URL: databaseUrl }
    });
    return { exitCode: 0, stdout: JSON.parse(stdout) };
  } catch (error) {
    const execError = error as { code?: number; stdout?: string };
    return { exitCode: execError.code ?? 1, stdout: execError.stdout ? JSON.parse(execError.stdout) : undefined };
  }
}

describe.skipIf(!databaseAvailable)('world-bootstrap CLI race (real PostgreSQL, real process boundary)', () => {
  test('two concurrent bootstrap processes converge on exactly one world row', async () => {
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
    const databaseUrl = url.toString();

    try {
      await runMigrations(databaseUrl);

      const [resultA, resultB] = await Promise.all([runBootstrapCli(databaseUrl), runBootstrapCli(databaseUrl)]);

      expect(resultA.exitCode).toBe(0);
      expect(resultB.exitCode).toBe(0);

      const statuses = [resultA, resultB].map(
        (result) => (result.stdout as { status: string }).status
      );
      expect(statuses.sort()).toEqual(['created', 'existing']);

      const worldIdA = (resultA.stdout as { worldId: string }).worldId;
      const worldIdB = (resultB.stdout as { worldId: string }).worldId;
      expect(worldIdA).toBe(worldIdB);

      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const rows = await client.query("SELECT count(*)::int AS count FROM worlds WHERE world_slug = 'public-arena'");
        expect(rows.rows[0]?.count).toBe(1);
      } finally {
        await client.end();
      }
    } finally {
      const cleanupAdmin = new Client({ connectionString: ADMIN_DATABASE_URL });
      await cleanupAdmin.connect();
      try {
        await cleanupAdmin.query(
          'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
          [databaseName]
        );
        await cleanupAdmin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
      } finally {
        await cleanupAdmin.end();
      }
    }
  }, 30_000);
});
