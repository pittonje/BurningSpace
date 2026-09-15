import { Client } from 'pg';
import {
  MIGRATION_RUNNER_LOCK_KEY,
  SCHEMA_MAINTENANCE_LOCK_KEY,
  acquireAdvisoryLock,
  releaseAdvisoryLock
} from './advisoryLocks.js';
import { MigrationApplyError, MigrationLedgerError, PersistenceConnectionError } from './errors.js';
import { discoverMigrations, readMigrationSql, type DiscoveredMigration } from './schemaMigrations.js';

const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const CONNECT_TIMEOUT_MILLIS = 5000;

export interface LedgerRow {
  readonly version: number;
  readonly filename: string;
  readonly checksum: Buffer;
}

export type MigrationStatusKind =
  | 'uninitialized'
  | 'up_to_date'
  | 'pending'
  | 'checksum_drift'
  | 'version_gap'
  | 'missing_file'
  | 'unexpected_version';

export interface MigrationStatus {
  readonly status: MigrationStatusKind;
  readonly appliedVersion: number;
  readonly expectedVersion: number;
  readonly pendingVersions: number[];
  readonly mismatches: string[];
}

export interface MigrationRunResult {
  readonly status: 'up_to_date' | 'migrated';
  readonly appliedVersions: number[];
  readonly appliedCount: number;
  readonly pendingCountBefore: number;
  readonly currentVersion: number;
  readonly expectedVersion: number;
}

async function connectMigrationClient(databaseUrl: string): Promise<Client> {
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: CONNECT_TIMEOUT_MILLIS });
  try {
    await client.connect();
  } catch (cause) {
    throw new PersistenceConnectionError('Failed to connect to the migration database.', { cause });
  }
  return client;
}

async function ledgerTableExists(client: Client): Promise<boolean> {
  const result = await client.query<{ reg: string | null }>("SELECT to_regclass('public.schema_migrations') AS reg");
  return (result.rows[0]?.reg ?? null) !== null;
}

async function readLedger(client: Client): Promise<LedgerRow[]> {
  if (!(await ledgerTableExists(client))) {
    return [];
  }
  const result = await client.query<{ version: number; filename: string; checksum: Buffer }>(
    'SELECT version, filename, checksum FROM schema_migrations ORDER BY version ASC'
  );
  return result.rows.map((row) => ({ version: row.version, filename: row.filename, checksum: row.checksum }));
}

/**
 * Fails closed on any ledger/file disagreement: contiguity, duplicates,
 * missing files, filename drift, and checksum drift are all rejected before
 * any migration is applied.
 */
export function validateLedgerAgainstDiscovered(ledger: LedgerRow[], discovered: DiscoveredMigration[]): void {
  const sortedLedger = [...ledger].sort((a, b) => a.version - b.version);

  const seen = new Set<number>();
  let expected = 1;
  for (const row of sortedLedger) {
    if (seen.has(row.version)) {
      throw new MigrationLedgerError('duplicate_version', `Duplicate ledger entry for version ${row.version}.`);
    }
    seen.add(row.version);
    if (row.version !== expected) {
      throw new MigrationLedgerError(
        'version_gap',
        `Migration ledger is not contiguous: expected version ${expected}, found ${row.version}.`
      );
    }
    expected += 1;
  }

  const discoveredByVersion = new Map(discovered.map((item) => [item.version, item]));
  for (const row of sortedLedger) {
    const file = discoveredByVersion.get(row.version);
    if (!file) {
      throw new MigrationLedgerError(
        'missing_file',
        `Applied migration version ${row.version} has no corresponding migration file on disk.`
      );
    }
    if (file.filename !== row.filename) {
      throw new MigrationLedgerError(
        'filename_mismatch',
        `Applied migration version ${row.version} filename mismatch: ledger has "${row.filename}", disk has "${file.filename}".`
      );
    }
    if (!file.checksum.equals(row.checksum)) {
      throw new MigrationLedgerError(
        'checksum_mismatch',
        `Applied migration version ${row.version} checksum mismatch against its recorded ledger entry.`
      );
    }
  }
}

export function computePendingMigrations(
  ledger: LedgerRow[],
  discovered: DiscoveredMigration[]
): DiscoveredMigration[] {
  const appliedCount = ledger.length;
  return discovered.filter((item) => item.version > appliedCount).sort((a, b) => a.version - b.version);
}

function resolveApplicationCommit(env: NodeJS.ProcessEnv = process.env): string | null {
  const value = env.BURNINGSPACE_GIT_COMMIT;
  return value !== undefined && GIT_SHA_PATTERN.test(value) ? value : null;
}

async function applyMigration(client: Client, migration: DiscoveredMigration): Promise<void> {
  const sql = await readMigrationSql(migration.filePath);
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (version, filename, checksum, application_commit) VALUES ($1, $2, $3, $4)',
      [migration.version, migration.filename, migration.checksum, resolveApplicationCommit()]
    );
    await client.query('COMMIT');
  } catch (cause) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw new MigrationApplyError(
      migration.version,
      `Failed to apply migration ${migration.filename} (version ${migration.version}).`,
      { cause }
    );
  }
}

/**
 * Exact flow: connect -> hold MIGRATION_RUNNER_LOCK for the runner lifetime ->
 * validate the ledger seen before waiting -> take SCHEMA_MAINTENANCE_LOCK ->
 * re-read/re-validate the ledger (a concurrent runner may have applied
 * pending migrations while this one waited) -> apply remaining pending
 * migrations sequentially, each in its own transaction -> unlock in reverse
 * order -> close the connection.
 */
export async function runMigrations(databaseUrl: string, migrationsDir?: string): Promise<MigrationRunResult> {
  const client = await connectMigrationClient(databaseUrl);
  try {
    await acquireAdvisoryLock(client, MIGRATION_RUNNER_LOCK_KEY);
    try {
      const discovered = await discoverMigrations(migrationsDir);
      const ledgerBefore = await readLedger(client);
      validateLedgerAgainstDiscovered(ledgerBefore, discovered);
      const pendingBefore = computePendingMigrations(ledgerBefore, discovered);

      await acquireAdvisoryLock(client, SCHEMA_MAINTENANCE_LOCK_KEY);
      try {
        const ledgerAfterLock = await readLedger(client);
        validateLedgerAgainstDiscovered(ledgerAfterLock, discovered);
        const pending = computePendingMigrations(ledgerAfterLock, discovered);

        for (const migration of pending) {
          await applyMigration(client, migration);
        }

        const finalLedger = await readLedger(client);
        return {
          status: pending.length > 0 ? 'migrated' : 'up_to_date',
          appliedVersions: pending.map((item) => item.version),
          appliedCount: pending.length,
          pendingCountBefore: pendingBefore.length,
          currentVersion: finalLedger.length,
          expectedVersion: discovered.length
        };
      } finally {
        await releaseAdvisoryLock(client, SCHEMA_MAINTENANCE_LOCK_KEY);
      }
    } finally {
      await releaseAdvisoryLock(client, MIGRATION_RUNNER_LOCK_KEY);
    }
  } finally {
    await client.end();
  }
}

const LEDGER_ERROR_TO_STATUS: Record<MigrationLedgerError['reason'], MigrationStatusKind> = {
  checksum_mismatch: 'checksum_drift',
  version_gap: 'version_gap',
  duplicate_version: 'unexpected_version',
  missing_file: 'missing_file',
  filename_mismatch: 'unexpected_version'
};

/**
 * Read-only: uses the same discovery/checksum validation as the runner, but
 * never takes SCHEMA_MAINTENANCE_LOCK and never applies changes.
 */
export async function readMigrationStatus(databaseUrl: string, migrationsDir?: string): Promise<MigrationStatus> {
  const client = await connectMigrationClient(databaseUrl);
  try {
    const discovered = await discoverMigrations(migrationsDir);
    const expectedVersion = discovered.length;

    if (!(await ledgerTableExists(client))) {
      return {
        status: 'uninitialized',
        appliedVersion: 0,
        expectedVersion,
        pendingVersions: discovered.map((item) => item.version),
        mismatches: []
      };
    }

    const ledger = await readLedger(client);
    try {
      validateLedgerAgainstDiscovered(ledger, discovered);
    } catch (error) {
      if (error instanceof MigrationLedgerError) {
        return {
          status: LEDGER_ERROR_TO_STATUS[error.reason],
          appliedVersion: ledger.length,
          expectedVersion,
          pendingVersions: [],
          mismatches: [error.message]
        };
      }
      throw error;
    }

    const pending = computePendingMigrations(ledger, discovered);
    return {
      status: pending.length > 0 ? 'pending' : 'up_to_date',
      appliedVersion: ledger.length,
      expectedVersion,
      pendingVersions: pending.map((item) => item.version),
      mismatches: []
    };
  } finally {
    await client.end();
  }
}
