import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { Client } from 'pg';
import {
  POSTGRES_17_IMAGE,
  PersistenceToolError,
  resolvePgToolMajorVersion,
  runPgDumpSnapshot,
  sha256File
} from './persistence-tooling.js';

const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const CONNECT_TIMEOUT_MILLIS = 5_000;

export interface BackupManifest {
  readonly formatVersion: 1;
  readonly createdAtUtc: string;
  readonly completedAtUtc: string;
  readonly dumpFilename: string;
  readonly dumpSha256: string;
  readonly postgresServerMajor: number;
  readonly pgDumpMajor: number;
  readonly applicationCommit: string | null;
  readonly world: {
    readonly worldId: string;
    readonly worldSlug: string;
    readonly stateRevision: string;
    readonly domainVersion: number;
    readonly writerEpoch: string;
  };
  readonly migration: {
    readonly appliedVersion: number;
    readonly migrations: ReadonlyArray<{ readonly version: number; readonly filename: string; readonly checksumHex: string }>;
  };
  readonly counts: {
    readonly players: number;
    readonly playerCredentials: number;
    readonly worldMemberships: number;
    readonly activeSessionLeases: number;
  };
  readonly credentialState: {
    readonly active: number;
    readonly revoked: number;
  };
  readonly backupMode: 'quiesced-exported-snapshot';
}

export interface PerformBackupOptions {
  /**
   * Holds the snapshot-fence transaction (BEGIN REPEATABLE READ, FOR SHARE
   * row lock, pg_export_snapshot()). Empirically, PostgreSQL's row-locking
   * clauses (FOR SHARE included) require more than SELECT alone -- a
   * read-only role cannot take even a shared row lock. burningspace_migrator
   * (already the schema-owning operator role) is used for this connection;
   * burningspace_backup remains exactly SELECT-only throughout, and is used
   * for the actual pg_dump process below.
   */
  readonly fenceUrl: string;
  /** Host-reachable connection string for the pg_dump PROCESS, using burningspace_backup. */
  readonly dumpUrl: string;
  readonly worldSlug: string;
  readonly outputDir: string;
  readonly dumpFilename: string;
  readonly applicationCommit?: string;
}

export interface PerformBackupResult {
  readonly manifest: BackupManifest;
  readonly dumpPath: string;
  readonly manifestPath: string;
}

function resolveApplicationCommit(explicit: string | undefined): string | null {
  const candidate = explicit ?? process.env.BURNINGSPACE_GIT_COMMIT;
  return candidate !== undefined && GIT_SHA_PATTERN.test(candidate) ? candidate : null;
}

interface WorldRow {
  readonly world_id: string;
  readonly world_slug: string;
  readonly state_revision: string;
  readonly domain_version: number;
  readonly writer_epoch: string;
  readonly writer_instance_id: string | null;
  readonly writer_expires_at: Date | null;
  readonly db_now: Date;
}

/**
 * Real snapshot-consistency fence:
 *
 * 1. connect (this IS the "operator-capable safe connection" -- the
 *    read-only burningspace_backup role is sufficient and preferred);
 * 2. verify the canonical world has NO live unexpired writer (refuses to
 *    back up a running, non-quiesced application);
 * 3. BEGIN ISOLATION LEVEL REPEATABLE READ;
 * 4. lock the canonical world row FOR SHARE -- this blocks any concurrent
 *    writer-claim/gameplay-authority transaction (all of which take
 *    FOR UPDATE on this exact row) for as long as this transaction is open,
 *    without requiring any write privilege of our own;
 * 5. pg_export_snapshot() inside that same transaction;
 * 6. collect manifest metadata using the SAME transaction's consistent view;
 * 7. run pg_dump --snapshot=<id> through a SEPARATE session while this
 *    transaction remains open;
 * 8. only after pg_dump succeeds, COMMIT (closing the fence).
 */
export async function performQuiescedBackup(options: PerformBackupOptions): Promise<PerformBackupResult> {
  const createdAtUtc = new Date().toISOString();
  await mkdir(options.outputDir, { recursive: true });
  const dumpPath = resolvePath(options.outputDir, options.dumpFilename);
  const manifestPath = `${dumpPath}.manifest.json`;

  const client = new Client({ connectionString: options.fenceUrl, connectionTimeoutMillis: CONNECT_TIMEOUT_MILLIS });
  await client.connect();

  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    try {
      const worldResult = await client.query<WorldRow>(
        `SELECT world_id, world_slug, state_revision, domain_version, writer_epoch,
                writer_instance_id, writer_expires_at, clock_timestamp() AS db_now
         FROM worlds WHERE world_slug = $1 FOR SHARE`,
        [options.worldSlug]
      );
      const world = worldResult.rows[0];

      if (!world) {
        throw new PersistenceToolError(`No world found for slug "${options.worldSlug}".`);
      }

      const writerLive =
        world.writer_instance_id !== null &&
        world.writer_expires_at !== null &&
        world.writer_expires_at.getTime() > world.db_now.getTime();

      if (writerLive) {
        throw new PersistenceToolError(
          'Refusing to back up: the canonical world has a live, unexpired writer. Stop/quiesce the application first.'
        );
      }

      const snapshotResult = await client.query<{ snapshot_id: string }>('SELECT pg_export_snapshot() AS snapshot_id');
      const snapshotId = snapshotResult.rows[0]?.snapshot_id;

      if (!snapshotId) {
        throw new PersistenceToolError('Failed to export a PostgreSQL snapshot.');
      }

      const ledgerResult = await client.query<{ version: number; filename: string; checksum: Buffer }>(
        'SELECT version, filename, checksum FROM schema_migrations ORDER BY version ASC'
      );

      const countsResult = await client.query<{
        players: string;
        player_credentials: string;
        world_memberships: string;
        active_session_leases: string;
      }>(
        `SELECT
           (SELECT count(*) FROM players) AS players,
           (SELECT count(*) FROM player_credentials) AS player_credentials,
           (SELECT count(*) FROM world_memberships) AS world_memberships,
           (SELECT count(*) FROM active_session_leases) AS active_session_leases`
      );
      const counts = countsResult.rows[0]!;

      const credentialStateResult = await client.query<{ active: string; revoked: string }>(
        `SELECT
           count(*) FILTER (WHERE revoked_at IS NULL) AS active,
           count(*) FILTER (WHERE revoked_at IS NOT NULL) AS revoked
         FROM player_credentials`
      );
      const credentialState = credentialStateResult.rows[0]!;

      const [postgresServerMajor, pgDumpMajor] = await Promise.all([
        client
          .query<{ server_major: number }>("SELECT split_part(current_setting('server_version'), '.', 1)::int AS server_major")
          .then((result) => result.rows[0]!.server_major),
        resolvePgToolMajorVersion('pg_dump')
      ]);

      await runPgDumpSnapshot({ sourceUrl: options.dumpUrl, snapshotId, outputPath: dumpPath });

      const dumpSha256 = await sha256File(dumpPath);
      const completedAtUtc = new Date().toISOString();

      const manifest: BackupManifest = {
        formatVersion: 1,
        createdAtUtc,
        completedAtUtc,
        dumpFilename: options.dumpFilename,
        dumpSha256,
        postgresServerMajor,
        pgDumpMajor,
        applicationCommit: resolveApplicationCommit(options.applicationCommit),
        world: {
          worldId: world.world_id,
          worldSlug: world.world_slug,
          stateRevision: world.state_revision,
          domainVersion: world.domain_version,
          writerEpoch: world.writer_epoch
        },
        migration: {
          appliedVersion: ledgerResult.rows.length,
          migrations: ledgerResult.rows.map((row) => ({
            version: row.version,
            filename: row.filename,
            checksumHex: row.checksum.toString('hex')
          }))
        },
        counts: {
          players: Number(counts.players),
          playerCredentials: Number(counts.player_credentials),
          worldMemberships: Number(counts.world_memberships),
          activeSessionLeases: Number(counts.active_session_leases)
        },
        credentialState: {
          active: Number(credentialState.active),
          revoked: Number(credentialState.revoked)
        },
        backupMode: 'quiesced-exported-snapshot'
      };

      await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      await client.query('COMMIT');

      return { manifest, dumpPath, manifestPath };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

function printResult(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

function isMainModule(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && fileURLToPath(import.meta.url) === resolvePath(entrypoint);
}

async function main(): Promise<number> {
  const fenceUrl = process.env.MIGRATION_DATABASE_URL;
  const dumpUrl = process.env.BACKUP_DATABASE_URL;

  if (!fenceUrl || !dumpUrl) {
    printResult({
      ok: false,
      errorType: 'config',
      message: 'MIGRATION_DATABASE_URL (snapshot fence) and BACKUP_DATABASE_URL (pg_dump role) are both required.'
    });
    return 1;
  }

  const worldSlug = process.env.BURNINGSPACE_WORLD_SLUG?.trim() || 'public-arena';
  const outputDir = process.env.BURNINGSPACE_BACKUP_OUTPUT_DIR?.trim() || process.cwd();
  const dumpFilename = process.env.BURNINGSPACE_BACKUP_FILENAME?.trim() || `burningspace-${Date.now()}.dump`;

  try {
    const { manifest, dumpPath, manifestPath } = await performQuiescedBackup({
      fenceUrl,
      dumpUrl,
      worldSlug,
      outputDir,
      dumpFilename
    });
    printResult({
      ok: true,
      event: 'backup_completed',
      dumpPath,
      manifestPath,
      dumpSha256: manifest.dumpSha256,
      postgresServerMajor: manifest.postgresServerMajor,
      pgDumpMajor: manifest.pgDumpMajor,
      worldId: manifest.world.worldId,
      stateRevision: manifest.world.stateRevision
    });
    return 0;
  } catch (error) {
    printResult({
      ok: false,
      errorType: error instanceof PersistenceToolError ? 'backup' : 'unexpected',
      message: error instanceof Error ? error.message : String(error)
    });
    return 1;
  }
}

if (isMainModule()) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      printResult({ ok: false, errorType: 'fatal', message: error instanceof Error ? error.message : String(error) });
      process.exitCode = 1;
    });
}

export { POSTGRES_17_IMAGE };
