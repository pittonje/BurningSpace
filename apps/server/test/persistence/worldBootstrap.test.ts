import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, describe, expect, test } from 'vitest';
import { redactDatabaseUrl } from '../../src/persistence/config.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import {
  bootstrapWorld,
  WorldIncompatibleError
} from '../../src/persistence/repositories/worldsRepository.js';

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
    '[worldBootstrap.test.ts] Skipping real-PostgreSQL tests: ' +
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

describe.skipIf(!databaseAvailable)('worldsRepository.bootstrapWorld (real PostgreSQL)', () => {
  afterAll(async () => {
    for (const name of [...disposableDatabaseNames]) {
      await dropDatabase(name).catch(() => undefined);
    }
  });

  test('first bootstrap creates the world; second reports existing with identical identity', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const first = await bootstrapWorld(client, 'public-arena');
        expect(first.status).toBe('created');
        expect(first.world.worldSlug).toBe('public-arena');
        expect(first.world.lifecycleStatus).toBe('active');
        expect(first.world.stateRevision).toBe(0n);
        expect(first.world.domainVersion).toBe(1);

        const second = await bootstrapWorld(client, 'public-arena');
        expect(second.status).toBe('existing');
        expect(second.world.worldId).toBe(first.world.worldId);
        expect(second.world.stateRevision).toBe(0n);
        expect(second.world.domainVersion).toBe(1);

        const rows = await client.query('SELECT world_id FROM worlds WHERE world_slug = $1', ['public-arena']);
        expect(rows.rowCount).toBe(1);
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('retired existing world is rejected', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        await bootstrapWorld(client, 'public-arena');
        await client.query("UPDATE worlds SET lifecycle_status = 'retired' WHERE world_slug = $1", ['public-arena']);

        await expect(bootstrapWorld(client, 'public-arena')).rejects.toBeInstanceOf(WorldIncompatibleError);

        const status = await client.query('SELECT lifecycle_status FROM worlds WHERE world_slug = $1', [
          'public-arena'
        ]);
        expect(status.rows[0]?.lifecycle_status).toBe('retired');

        const rows = await client.query('SELECT world_id FROM worlds WHERE world_slug = $1', ['public-arena']);
        expect(rows.rowCount).toBe(1);
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('incompatible domain_version is rejected', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        await bootstrapWorld(client, 'public-arena');
        await client.query('UPDATE worlds SET domain_version = 2 WHERE world_slug = $1', ['public-arena']);

        let caught: unknown;
        try {
          await bootstrapWorld(client, 'public-arena');
        } catch (error) {
          caught = error;
        }
        expect(caught).toBeInstanceOf(WorldIncompatibleError);
        expect((caught as WorldIncompatibleError).reason).toBe('domain_version_mismatch');

        const rows = await client.query('SELECT world_id FROM worlds WHERE world_slug = $1', ['public-arena']);
        expect(rows.rowCount).toBe(1);
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });
});
