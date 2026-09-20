import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { PersistenceToolError, runPgRestore, runPsqlFile, sha256File } from './persistence-tooling.js';
import type { BackupManifest } from './backup-dump.js';
import { MIGRATION_AUTHORITY, requireRollout } from './persistent-rollout-contract.js';
import { assertRehearsalDatabase } from './restore-target.js';
import { readMigrationStatus } from '../src/persistence/migrationRunner.js';

const CONNECT_TIMEOUT_MILLIS = 5_000;

/** Constraint names migration 001 is expected to define on each durable table. */
const EXPECTED_CONSTRAINTS: Record<string, readonly string[]> = {
  schema_migrations: ['schema_migrations_pkey', 'schema_migrations_version_positive_check', 'schema_migrations_filename_unique', 'schema_migrations_checksum_length_check', 'schema_migrations_application_commit_format_check'],
  players: ['players_pkey'],
  worlds: [
    'worlds_pkey',
    'worlds_world_slug_unique',
    'worlds_world_slug_not_blank_check',
    'worlds_lifecycle_status_check',
    'worlds_state_revision_non_negative_check',
    'worlds_domain_version_positive_check',
    'worlds_writer_epoch_non_negative_check',
    'worlds_writer_lease_pair_check'
  ],
  player_credentials: [
    'player_credentials_pkey',
    'player_credentials_player_id_fkey',
    'player_credentials_credential_version_positive_check',
    'player_credentials_algorithm_check',
    'player_credentials_credential_hash_length_check',
    'player_credentials_credential_hash_unique',
    'player_credentials_player_credential_unique'
  ],
  world_memberships: [
    'world_memberships_pkey',
    'world_memberships_world_id_fkey',
    'world_memberships_player_id_fkey',
    'world_memberships_faction_value_check',
    'world_memberships_faction_pair_check'
  ],
  active_session_leases: [
    'active_session_leases_pkey',
    'active_session_leases_lease_id_unique',
    'active_session_leases_membership_fkey',
    'active_session_leases_credential_fkey',
    'active_session_leases_writer_epoch_non_negative_check',
    'active_session_leases_room_id_not_blank_check',
    'active_session_leases_transport_session_id_not_blank_check',
    'active_session_leases_server_transport_unique',
    'active_session_leases_status_check',
    'active_session_leases_state_shape_check'
  ]
};

export interface RestoreVerifyOptions {
  readonly dumpPath: string;
  readonly manifestPath: string;
  /** Connection string for the FRESH, isolated target database, as its migrator/owner role. */
  readonly targetMigratorUrl: string;
  readonly grantsSqlPath: string;
  readonly sourceDatabase: string;
}

export interface RestoreVerificationResult {
  readonly ok: true;
  readonly manifest: BackupManifest;
  readonly schemaMigrations: {
    readonly appliedVersion: number;
    readonly checksumsMatch: boolean;
  };
  readonly world: {
    readonly worldId: string;
    readonly worldSlug: string;
    readonly stateRevision: string;
    readonly domainVersion: number;
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
  readonly foreignKeyConsistency: boolean;
  readonly expectedConstraintsPresent: boolean;
}

/**
 * Verifies the manifest's recorded SHA-256 against the ACTUAL dump bytes on
 * disk. Must be called, and must pass, before any pg_restore attempt --
 * a single corrupted byte in the dump must be caught here, not discovered
 * partway through a restore.
 */
export async function verifyDumpIntegrity(dumpPath: string, manifestPath: string): Promise<BackupManifest> {
  const contents = await readFile(manifestPath, 'utf8');
  requireRollout(contents.length <= 16384, 'RESTORE_MANIFEST');
  const manifest = JSON.parse(contents) as BackupManifest;
  requireRollout(manifest.formatVersion === 1 && manifest.postgresServerMajor === 17 && manifest.pgDumpMajor === 17 &&
    manifest.world?.domainVersion === 1 && manifest.world.worldSlug === 'public-arena' && manifest.migration?.appliedVersion === 1 &&
    manifest.migration.migrations.length === 1 && manifest.migration.migrations[0]?.version === MIGRATION_AUTHORITY.version &&
    manifest.migration.migrations[0]?.filename === MIGRATION_AUTHORITY.filename && manifest.migration.migrations[0]?.checksumHex === MIGRATION_AUTHORITY.sha256, 'RESTORE_AUTHORITY');
  const actualSha256 = await sha256File(dumpPath);

  if (actualSha256 !== manifest.dumpSha256) {
    throw new PersistenceToolError(
      'Dump integrity check failed.'
    );
  }

  return manifest;
}

async function queryForeignKeyConsistency(client: Client): Promise<boolean> {
  const result = await client.query<{ orphans: string }>(`
    SELECT (
      (SELECT count(*) FROM player_credentials pc LEFT JOIN players p ON p.player_id = pc.player_id WHERE p.player_id IS NULL) +
      (SELECT count(*) FROM world_memberships wm LEFT JOIN worlds w ON w.world_id = wm.world_id WHERE w.world_id IS NULL) +
      (SELECT count(*) FROM world_memberships wm LEFT JOIN players p ON p.player_id = wm.player_id WHERE p.player_id IS NULL) +
      (SELECT count(*) FROM active_session_leases l
         LEFT JOIN world_memberships wm ON wm.world_id = l.world_id AND wm.player_id = l.player_id
         WHERE wm.world_id IS NULL) +
      (SELECT count(*) FROM active_session_leases l
         LEFT JOIN player_credentials pc ON pc.player_id = l.player_id AND pc.credential_id = l.credential_id
         WHERE pc.credential_id IS NULL)
    )::text AS orphans
  `);
  return result.rows[0]?.orphans === '0';
}

async function queryExpectedConstraintsPresent(client: Client): Promise<boolean> {
  for (const [table, constraints] of Object.entries(EXPECTED_CONSTRAINTS)) {
    const result = await client.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND convalidated`,
      [table]
    );
    const present = new Set(result.rows.map((row) => row.conname));
    if (present.size !== constraints.length) return false;
    for (const expected of constraints) {
      if (!present.has(expected)) {
        return false;
      }
    }
  }
  return true;
}

export async function restoreAndVerify(options: RestoreVerifyOptions): Promise<RestoreVerificationResult> {
  const manifest = await verifyDumpIntegrity(options.dumpPath, options.manifestPath);

  const target = new URL(options.targetMigratorUrl).pathname.slice(1);
  const guard = new Client({ connectionString: options.targetMigratorUrl, connectionTimeoutMillis: CONNECT_TIMEOUT_MILLIS });
  await guard.connect();
  try { await assertRehearsalDatabase(guard, target, options.sourceDatabase, true); }
  finally { await guard.end(); }

  await runPgRestore({ dumpPath: options.dumpPath, targetUrl: options.targetMigratorUrl });
  await runPsqlFile({ targetUrl: options.targetMigratorUrl, sqlPath: options.grantsSqlPath });

  const client = new Client({ connectionString: options.targetMigratorUrl, connectionTimeoutMillis: CONNECT_TIMEOUT_MILLIS });
  await client.connect();

  try {
    const status = await readMigrationStatus(options.targetMigratorUrl);
    requireRollout(status.status === 'up_to_date' && status.appliedVersion === 1 && status.expectedVersion === 1, 'RESTORE_CANONICAL_SCHEMA');
    const ledgerResult = await client.query<{ version: number; filename: string; checksum: Buffer }>(
      'SELECT version, filename, checksum FROM schema_migrations ORDER BY version ASC'
    );
    const checksumsMatch =
      ledgerResult.rows.length === manifest.migration.migrations.length &&
      ledgerResult.rows.every((row, index) => {
        const expected = manifest.migration.migrations[index];
        return (
          expected !== undefined &&
          expected.version === row.version &&
          expected.filename === row.filename &&
          expected.checksumHex === row.checksum.toString('hex')
        );
      });

    requireRollout(checksumsMatch, 'RESTORE_LEDGER');
    const worldResult = await client.query<{
      world_id: string;
      world_slug: string;
      state_revision: string;
      domain_version: number;
      writer_epoch: string;
      lifecycle_status: string;
    }>('SELECT world_id, world_slug, state_revision, domain_version, writer_epoch, lifecycle_status FROM worlds WHERE world_slug = $1', [
      manifest.world.worldSlug
    ]);
    const world = worldResult.rows[0];

    if (!world || world.world_id !== manifest.world.worldId || world.state_revision !== manifest.world.stateRevision ||
        world.domain_version !== manifest.world.domainVersion || world.domain_version !== 1 || world.lifecycle_status !== 'active' || world.writer_epoch !== manifest.world.writerEpoch ||
        (await client.query('SELECT count(*)::int AS count FROM worlds')).rows[0]?.count !== 1) {
      throw new PersistenceToolError('Restored canonical world identity/state_revision does not match the manifest.');
    }

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

    if (
      Number(counts.players) !== manifest.counts.players ||
      Number(counts.player_credentials) !== manifest.counts.playerCredentials ||
      Number(counts.world_memberships) !== manifest.counts.worldMemberships ||
      Number(counts.active_session_leases) !== manifest.counts.activeSessionLeases
    ) {
      throw new PersistenceToolError('Restored row counts do not match the manifest.');
    }

    const credentialStateResult = await client.query<{ active: string; revoked: string }>(
      `SELECT
         count(*) FILTER (WHERE revoked_at IS NULL) AS active,
         count(*) FILTER (WHERE revoked_at IS NOT NULL) AS revoked
       FROM player_credentials`
    );
    const credentialState = credentialStateResult.rows[0]!;

    if (
      Number(credentialState.active) !== manifest.credentialState.active ||
      Number(credentialState.revoked) !== manifest.credentialState.revoked
    ) {
      throw new PersistenceToolError('Restored credential active/revoked counts do not match the manifest.');
    }

    const foreignKeyConsistency = await queryForeignKeyConsistency(client);

    if (!foreignKeyConsistency) {
      throw new PersistenceToolError('Restored data contains foreign-key orphans.');
    }

    const expectedConstraintsPresent = await queryExpectedConstraintsPresent(client);

    if (!expectedConstraintsPresent) {
      throw new PersistenceToolError('Restored schema is missing an expected constraint.');
    }

    return {
      ok: true,
      manifest,
      schemaMigrations: { appliedVersion: ledgerResult.rows.length, checksumsMatch },
      world: {
        worldId: world.world_id,
        worldSlug: world.world_slug,
        stateRevision: world.state_revision,
        domainVersion: world.domain_version
      },
      counts: {
        players: Number(counts.players),
        playerCredentials: Number(counts.player_credentials),
        worldMemberships: Number(counts.world_memberships),
        activeSessionLeases: Number(counts.active_session_leases)
      },
      credentialState: { active: Number(credentialState.active), revoked: Number(credentialState.revoked) },
      foreignKeyConsistency,
      expectedConstraintsPresent
    };
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
  const dumpPath = process.env.BURNINGSPACE_RESTORE_DUMP_PATH;
  const manifestPath = process.env.BURNINGSPACE_RESTORE_MANIFEST_PATH ?? (dumpPath ? `${dumpPath}.manifest.json` : undefined);
  const targetMigratorUrl = process.env.MIGRATION_DATABASE_URL;
  const grantsSqlPath =
    process.env.BURNINGSPACE_GRANTS_SQL_PATH ?? resolvePath(fileURLToPath(import.meta.url), '../../../../deploy/postgres/apply-runtime-grants.sql');

  if (!dumpPath || !manifestPath || !targetMigratorUrl) {
    printResult({
      ok: false,
      errorType: 'config',
      message: 'BURNINGSPACE_RESTORE_DUMP_PATH and MIGRATION_DATABASE_URL are required.'
    });
    return 1;
  }

  try {
    const result = await restoreAndVerify({ dumpPath, manifestPath, targetMigratorUrl, grantsSqlPath, sourceDatabase: process.env.BURNINGSPACE_SOURCE_DATABASE ?? 'burningspace' });
    printResult({ event: 'restore_verified', ...result });
    return 0;
  } catch (error) {
    printResult({
      ok: false,
      errorType: error instanceof PersistenceToolError ? 'restore' : 'unexpected',
      message: 'Restore verification failed.'
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
      printResult({ ok: false, errorType: 'fatal', message: 'Restore verification failed.' });
      process.exitCode = 1;
    });
}
