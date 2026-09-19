import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { Client } from 'pg';

/**
 * Operator/CI validation tool -- NOT runtime server code, never imported by
 * apps/server/src/**. Connects as each of the three fixed BurningSpace
 * roles and empirically proves the exact privilege boundary Packet 7
 * establishes. Never logs a connection string or any credential; only role
 * names and pass/fail booleans are printed.
 */

const CONNECT_TIMEOUT_MILLIS = 5_000;

interface ProbeResult {
  readonly name: string;
  readonly ok: boolean;
  readonly detail?: string;
}

function isPermissionError(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  // 42501 = insufficient_privilege (PostgreSQL SQLSTATE).
  return code === '42501';
}

async function expectSuccess(
  client: Client,
  name: string,
  run: () => Promise<void>
): Promise<ProbeResult> {
  try {
    await client.query('BEGIN');
    await run();
    await client.query('ROLLBACK');
    return { name, ok: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return { name, ok: false, detail: 'Expected operation failed.' };
  }
}

async function expectPermissionDenied(
  client: Client,
  name: string,
  run: () => Promise<void>
): Promise<ProbeResult> {
  try {
    await client.query('BEGIN');
    await run();
    await client.query('ROLLBACK');
    return { name, ok: false, detail: 'expected a permission-denied error, but the operation succeeded' };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (isPermissionError(error)) {
      return { name, ok: true };
    }
    return {
      name,
      ok: false,
      detail: 'Expected permission denial was not observed.'
    };
  }
}

export async function checkRuntime(url: string): Promise<ProbeResult[]> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: CONNECT_TIMEOUT_MILLIS });
  await client.connect();
  const results: ProbeResult[] = [];

  try {
    results.push(
      await expectSuccess(client, 'runtime:select_schema_migrations', async () => {
        await client.query('SELECT 1 FROM schema_migrations LIMIT 1');
      })
    );
    results.push(
      await expectSuccess(client, 'runtime:select_worlds', async () => {
        await client.query('SELECT 1 FROM worlds LIMIT 1');
      })
    );
    results.push(
      await expectSuccess(client, 'runtime:update_worlds_noop', async () => {
        await client.query('UPDATE worlds SET updated_at = updated_at WHERE false');
      })
    );
    results.push(
      await expectSuccess(client, 'runtime:write_identity_tables', async () => {
        const player = await client.query<{ player_id: string }>('INSERT INTO players DEFAULT VALUES RETURNING player_id');
        const playerId = player.rows[0]!.player_id;
        await client.query(
          `INSERT INTO player_credentials (player_id, credential_version, algorithm, credential_hash)
           VALUES ($1, 1, 'sha256', decode(repeat('00', 32), 'hex'))`,
          [playerId]
        );
        await client.query('UPDATE players SET display_name = $1 WHERE player_id = $2', ['privilege-check', playerId]);
      })
    );
    results.push(
      await expectPermissionDenied(client, 'runtime:cannot_insert_worlds', async () => {
        await client.query("INSERT INTO worlds (world_slug) VALUES ('db-privilege-check-should-fail')");
      })
    );
    results.push(
      await expectPermissionDenied(client, 'runtime:cannot_mutate_schema_migrations', async () => {
        await client.query('UPDATE schema_migrations SET filename = filename WHERE false');
      })
    );
    results.push(
      await expectPermissionDenied(client, 'runtime:cannot_delete_players', async () => {
        await client.query('DELETE FROM players WHERE false');
      })
    );
    results.push(
      await expectPermissionDenied(client, 'runtime:cannot_delete_leases', async () => {
        await client.query('DELETE FROM active_session_leases WHERE false');
      })
    );
    results.push(
      await expectPermissionDenied(client, 'runtime:cannot_create_table', async () => {
        await client.query('CREATE TABLE db_privilege_check_should_fail (x int)');
      })
    );
    results.push(
      await expectPermissionDenied(client, 'runtime:cannot_drop_table', async () => {
        await client.query('DROP TABLE worlds');
      })
    );
  } finally {
    await client.end().catch(() => undefined);
  }

  return results;
}

export async function checkBackup(url: string): Promise<ProbeResult[]> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: CONNECT_TIMEOUT_MILLIS });
  await client.connect();
  const results: ProbeResult[] = [];
  const tables = ['schema_migrations', 'worlds', 'players', 'player_credentials', 'world_memberships', 'active_session_leases'];

  try {
    for (const table of tables) {
      results.push(
        await expectSuccess(client, `backup:select_${table}`, async () => {
          await client.query(`SELECT 1 FROM ${table} LIMIT 1`);
        })
      );
    }
    results.push(
      await expectPermissionDenied(client, 'backup:cannot_insert_players', async () => {
        await client.query('INSERT INTO players DEFAULT VALUES');
      })
    );
    results.push(
      await expectPermissionDenied(client, 'backup:cannot_update_worlds', async () => {
        await client.query('UPDATE worlds SET updated_at = updated_at WHERE false');
      })
    );
    results.push(
      await expectPermissionDenied(client, 'backup:cannot_delete_players', async () => {
        await client.query('DELETE FROM players WHERE false');
      })
    );
    results.push(
      await expectPermissionDenied(client, 'backup:cannot_create_table', async () => {
        await client.query('CREATE TABLE db_privilege_check_should_fail (x int)');
      })
    );
  } finally {
    await client.end().catch(() => undefined);
  }

  return results;
}

export async function checkMigrator(url: string): Promise<ProbeResult[]> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: CONNECT_TIMEOUT_MILLIS });
  await client.connect();
  const results: ProbeResult[] = [];

  try {
    results.push(
      await expectSuccess(client, 'migrator:select_worlds', async () => {
        await client.query('SELECT 1 FROM worlds LIMIT 1');
      })
    );
    results.push(
      await expectSuccess(client, 'migrator:transactional_ddl_probe', async () => {
        await client.query('CREATE TABLE db_privilege_check_migrator_probe (x int)');
        await client.query('DROP TABLE db_privilege_check_migrator_probe');
      })
    );
  } finally {
    await client.end().catch(() => undefined);
  }

  return results;
}

function printResult(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

function isMainModule(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && fileURLToPath(import.meta.url) === resolvePath(entrypoint);
}

async function main(): Promise<number> {
  const runtimeUrl = process.env.DATABASE_URL;
  const migratorUrl = process.env.MIGRATION_DATABASE_URL;
  const backupUrl = process.env.BACKUP_DATABASE_URL;

  if (!runtimeUrl || !migratorUrl || !backupUrl) {
    printResult({
      ok: false,
      errorType: 'config',
      message: 'DATABASE_URL, MIGRATION_DATABASE_URL, and BACKUP_DATABASE_URL are all required.'
    });
    return 1;
  }

  try {
    const [runtime, backup, migrator] = await Promise.all([
      checkRuntime(runtimeUrl),
      checkBackup(backupUrl),
      checkMigrator(migratorUrl)
    ]);

    const all = [...runtime, ...backup, ...migrator];
    const failed = all.filter((probe) => !probe.ok);

    printResult({
      ok: failed.length === 0,
      event: 'db_privilege_check_completed',
      totalProbes: all.length,
      failedProbes: failed.length,
      runtime,
      backup,
      migrator
    });

    return failed.length === 0 ? 0 : 1;
  } catch (error) {
    printResult({
      ok: false,
      errorType: 'unexpected',
      message: 'Privilege verification failed.'
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
      printResult({ ok: false, errorType: 'fatal', message: 'Privilege verification failed.' });
      process.exitCode = 1;
    });
}
