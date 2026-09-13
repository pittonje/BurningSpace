import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { afterAll, describe, expect, test } from 'vitest';
import { redactDatabaseUrl } from '../../src/persistence/config.js';
import { SCHEMA_MAINTENANCE_LOCK_KEY } from '../../src/persistence/advisoryLocks.js';
import { MigrationLedgerError, MigrationLockTimeoutError } from '../../src/persistence/errors.js';
import { readMigrationStatus, runMigrations } from '../../src/persistence/migrationRunner.js';

describe('redactDatabaseUrl', () => {
  test('redacts username and password', () => {
    const redacted = redactDatabaseUrl('postgres://alice:s3cret@db.example.com:5432/burningspace');
    expect(redacted).not.toContain('alice');
    expect(redacted).not.toContain('s3cret');
    expect(redacted).toContain('db.example.com');
  });

  test('leaves a URL without userinfo unchanged in shape', () => {
    const redacted = redactDatabaseUrl('postgres://db.example.com:5432/burningspace');
    expect(redacted).toBe('postgres://db.example.com:5432/burningspace');
  });

  test('never throws on an invalid connection string', () => {
    expect(redactDatabaseUrl('not a url')).toBe('REDACTED_INVALID_CONNECTION_STRING');
  });
});

const ADMIN_DATABASE_URL =
  process.env.BURNINGSPACE_TEST_DATABASE_URL ??
  'postgres://burningspace_test_admin:burningspace_test_password@127.0.0.1:55432/burningspace_test';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REAL_MIGRATIONS_DIR = path.resolve(MODULE_DIR, '../../db/migrations');
const REAL_MIGRATION_FILENAME = '001_persistent_identity_foundation.sql';
const REAL_MIGRATION_FILE = path.join(REAL_MIGRATIONS_DIR, REAL_MIGRATION_FILENAME);

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
    '[migrationRunner.test.ts] Skipping real-PostgreSQL integration tests: ' +
      `no reachable database at ${redactDatabaseUrl(ADMIN_DATABASE_URL)}. ` +
      'Start deploy/docker-compose.test.db.yml (docker compose -f deploy/docker-compose.test.db.yml up -d --wait) to run them.'
  );
}

const disposableDatabaseNames: string[] = [];

async function createDisposableDatabase(): Promise<{ databaseUrl: string; databaseName: string }> {
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

async function dropDisposableDatabase(databaseName: string): Promise<void> {
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
    disposableDatabaseNames.splice(disposableDatabaseNames.indexOf(databaseName), 1);
  }
}

describe.skipIf(!databaseAvailable)('migrationRunner (real PostgreSQL)', () => {
  afterAll(async () => {
    for (const name of [...disposableDatabaseNames]) {
      await dropDisposableDatabase(name).catch(() => undefined);
    }
  });

  test('empty DB migration creates all foundation tables and an up-to-date ledger', async () => {
    const { databaseUrl, databaseName } = await createDisposableDatabase();
    try {
      const statusBefore = await readMigrationStatus(databaseUrl);
      expect(statusBefore.status).toBe('uninitialized');

      const result = await runMigrations(databaseUrl);
      expect(result.status).toBe('migrated');
      expect(result.appliedVersions).toEqual([1]);

      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const tables = await client.query<{ table_name: string }>(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        );
        const names = tables.rows.map((row) => row.table_name);
        for (const expected of [
          'worlds',
          'players',
          'player_credentials',
          'world_memberships',
          'active_session_leases',
          'schema_migrations'
        ]) {
          expect(names).toContain(expected);
        }

        const ledger = await client.query<{ checksum: Buffer }>(
          'SELECT checksum FROM schema_migrations WHERE version = 1'
        );
        expect(ledger.rows).toHaveLength(1);
        expect(ledger.rows[0]?.checksum.length).toBe(32);
      } finally {
        await client.end();
      }

      const statusAfter = await readMigrationStatus(databaseUrl);
      expect(statusAfter.status).toBe('up_to_date');
    } finally {
      await dropDisposableDatabase(databaseName);
    }
  });

  test('second run is idempotent: no schema duplication, no extra ledger row', async () => {
    const { databaseUrl, databaseName } = await createDisposableDatabase();
    try {
      await runMigrations(databaseUrl);
      const second = await runMigrations(databaseUrl);
      expect(second.status).toBe('up_to_date');
      expect(second.appliedVersions).toEqual([]);

      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const rows = await client.query('SELECT version FROM schema_migrations');
        expect(rows.rowCount).toBe(1);
      } finally {
        await client.end();
      }
    } finally {
      await dropDisposableDatabase(databaseName);
    }
  });

  test('concurrent migration runners serialize without duplication or half-applied schema', async () => {
    const { databaseUrl, databaseName } = await createDisposableDatabase();
    try {
      const outcomes = await Promise.allSettled([runMigrations(databaseUrl), runMigrations(databaseUrl)]);
      for (const outcome of outcomes) {
        expect(outcome.status).toBe('fulfilled');
      }

      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const rows = await client.query('SELECT version FROM schema_migrations WHERE version = 1');
        expect(rows.rowCount).toBe(1);
      } finally {
        await client.end();
      }

      const status = await readMigrationStatus(databaseUrl);
      expect(status.status).toBe('up_to_date');
    } finally {
      await dropDisposableDatabase(databaseName);
    }
  });

  test('checksum drift fails closed as a migration ledger error', async () => {
    const { databaseUrl, databaseName } = await createDisposableDatabase();
    try {
      await runMigrations(databaseUrl);

      const tempDir = await mkdtemp(path.join(tmpdir(), 'bs-migration-drift-'));
      try {
        const original = await readFile(REAL_MIGRATION_FILE, 'utf8');
        await writeFile(path.join(tempDir, REAL_MIGRATION_FILENAME), `${original}\n-- drift marker\n`);

        const status = await readMigrationStatus(databaseUrl, tempDir);
        expect(status.status).toBe('checksum_drift');

        await expect(runMigrations(databaseUrl, tempDir)).rejects.toBeInstanceOf(MigrationLedgerError);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    } finally {
      await dropDisposableDatabase(databaseName);
    }
  });

  test('version gap in the ledger is rejected by status and migrate', async () => {
    const { databaseUrl, databaseName } = await createDisposableDatabase();
    try {
      await runMigrations(databaseUrl);

      const tempDir = await mkdtemp(path.join(tmpdir(), 'bs-migration-gap-'));
      try {
        const original = await readFile(REAL_MIGRATION_FILE);
        await writeFile(path.join(tempDir, REAL_MIGRATION_FILENAME), original);
        await writeFile(
          path.join(tempDir, '003_gap_fixture.sql'),
          '-- test-only fixture, never applied to the real ledger\nSELECT 1;'
        );

        const client = new Client({ connectionString: databaseUrl });
        await client.connect();
        try {
          await client.query(
            "INSERT INTO schema_migrations (version, filename, checksum) VALUES (3, '003_gap_fixture.sql', decode(repeat('00', 32), 'hex'))"
          );
        } finally {
          await client.end();
        }

        const status = await readMigrationStatus(databaseUrl, tempDir);
        expect(status.status).toBe('version_gap');

        await expect(runMigrations(databaseUrl, tempDir)).rejects.toBeInstanceOf(MigrationLedgerError);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    } finally {
      await dropDisposableDatabase(databaseName);
    }
  });

  test('schema maintenance lock contention fails closed as a bounded lock timeout', async () => {
    const { databaseUrl, databaseName } = await createDisposableDatabase();
    try {
      await runMigrations(databaseUrl);

      const holder = new Client({ connectionString: databaseUrl });
      await holder.connect();
      try {
        await holder.query('SELECT pg_advisory_lock_shared($1, $2)', [
          SCHEMA_MAINTENANCE_LOCK_KEY.key[0],
          SCHEMA_MAINTENANCE_LOCK_KEY.key[1]
        ]);

        const start = Date.now();
        await expect(runMigrations(databaseUrl)).rejects.toBeInstanceOf(MigrationLockTimeoutError);
        const elapsedMs = Date.now() - start;
        expect(elapsedMs).toBeGreaterThanOrEqual(4500);
        expect(elapsedMs).toBeLessThan(6000);

        const check = new Client({ connectionString: databaseUrl });
        await check.connect();
        try {
          const setting = await check.query<{ lock_timeout: string }>('SHOW lock_timeout');
          expect(setting.rows[0]?.lock_timeout).toBe('0');
        } finally {
          await check.end();
        }
      } finally {
        await holder
          .query('SELECT pg_advisory_unlock_shared($1, $2)', [
            SCHEMA_MAINTENANCE_LOCK_KEY.key[0],
            SCHEMA_MAINTENANCE_LOCK_KEY.key[1]
          ])
          .catch(() => undefined);
        await holder.end();
      }
    } finally {
      await dropDisposableDatabase(databaseName);
    }
  }, 15000);

  test('migration 001 is atomic: a forced failure rolls back schema and ledger together', async () => {
    const { databaseUrl, databaseName } = await createDisposableDatabase();
    try {
      const tempDir = await mkdtemp(path.join(tmpdir(), 'bs-migration-atomicity-'));
      try {
        const original = await readFile(REAL_MIGRATION_FILE, 'utf8');
        const broken = `${original}\nCREATE TABLE worlds (world_id UUID);\n`;
        await writeFile(path.join(tempDir, REAL_MIGRATION_FILENAME), broken);

        await expect(runMigrations(databaseUrl, tempDir)).rejects.toThrow();

        const client = new Client({ connectionString: databaseUrl });
        await client.connect();
        try {
          const ledgerExists = await client.query<{ reg: string | null }>(
            "SELECT to_regclass('public.schema_migrations') AS reg"
          );
          expect(ledgerExists.rows[0]?.reg).toBeNull();
        } finally {
          await client.end();
        }
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    } finally {
      await dropDisposableDatabase(databaseName);
    }
  });

  test('foundation invariants: constraints, indexes, trigger, and no pgcrypto extension', async () => {
    const { databaseUrl, databaseName } = await createDisposableDatabase();
    try {
      await runMigrations(databaseUrl);
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const extensions = await client.query("SELECT extname FROM pg_extension WHERE extname = 'pgcrypto'");
        expect(extensions.rowCount).toBe(0);

        const worldSlugUnique = await client.query(
          "SELECT conname FROM pg_constraint WHERE conrelid = 'public.worlds'::regclass AND contype = 'u'"
        );
        expect(worldSlugUnique.rowCount).toBeGreaterThan(0);

        const credentialChecks = await client.query<{ consrc: string }>(
          `SELECT pg_get_constraintdef(oid) AS consrc
           FROM pg_constraint WHERE conrelid = 'public.player_credentials'::regclass AND contype = 'c'`
        );
        expect(credentialChecks.rows.some((row) => row.consrc.includes('octet_length'))).toBe(true);

        const activeCredentialIndex = await client.query<{ indexdef: string }>(
          "SELECT indexdef FROM pg_indexes WHERE tablename = 'player_credentials'"
        );
        expect(
          activeCredentialIndex.rows.some(
            (row) =>
              row.indexdef.includes('UNIQUE') && row.indexdef.includes('WHERE') && row.indexdef.includes('revoked_at')
          )
        ).toBe(true);

        const membershipPk = await client.query(
          "SELECT conname FROM pg_constraint WHERE conrelid = 'public.world_memberships'::regclass AND contype = 'p'"
        );
        expect(membershipPk.rowCount).toBe(1);

        const membershipChecks = await client.query<{ consrc: string }>(
          `SELECT pg_get_constraintdef(oid) AS consrc
           FROM pg_constraint WHERE conrelid = 'public.world_memberships'::regclass AND contype = 'c'`
        );
        expect(membershipChecks.rows.some((row) => row.consrc.includes('faction_assigned_at'))).toBe(true);

        const trigger = await client.query(
          "SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.world_memberships'::regclass AND NOT tgisinternal"
        );
        expect(trigger.rowCount).toBeGreaterThan(0);

        const leasePk = await client.query(
          "SELECT conname FROM pg_constraint WHERE conrelid = 'public.active_session_leases'::regclass AND contype = 'p'"
        );
        expect(leasePk.rowCount).toBe(1);

        const leaseUnique = await client.query(
          "SELECT conname FROM pg_constraint WHERE conrelid = 'public.active_session_leases'::regclass AND contype = 'u'"
        );
        expect(leaseUnique.rowCount).toBeGreaterThanOrEqual(2);

        const leaseForeignKeys = await client.query(
          "SELECT conname FROM pg_constraint WHERE conrelid = 'public.active_session_leases'::regclass AND contype = 'f'"
        );
        expect(leaseForeignKeys.rowCount).toBeGreaterThanOrEqual(2);

        const leaseChecks = await client.query<{ consrc: string }>(
          `SELECT pg_get_constraintdef(oid) AS consrc
           FROM pg_constraint WHERE conrelid = 'public.active_session_leases'::regclass AND contype = 'c'`
        );
        expect(leaseChecks.rows.some((row) => row.consrc.includes('reconnect_deadline'))).toBe(true);

        const columns = await client.query<{ column_name: string }>(
          "SELECT column_name FROM information_schema.columns WHERE table_name = 'player_credentials'"
        );
        const columnNames = columns.rows.map((row) => row.column_name);
        expect(columnNames).not.toContain('plaintext_credential');
        expect(columnNames).not.toContain('credential');
        expect(columnNames).not.toContain('password');
      } finally {
        await client.end();
      }
    } finally {
      await dropDisposableDatabase(databaseName);
    }
  });
});
