import process from 'node:process';
import { Client } from 'pg';
import { SCHEMA_MAINTENANCE_LOCK_KEY, acquireAdvisorySharedLock, releaseAdvisorySharedLock } from '../src/persistence/advisoryLocks.js';
import { readMigrationDatabaseUrl, readWorldSlug } from '../src/persistence/config.js';
import { MigrationLedgerError, MigrationLockTimeoutError, PersistenceConfigError, PersistenceConnectionError } from '../src/persistence/errors.js';
import { readMigrationStatus } from '../src/persistence/migrationRunner.js';
import { bootstrapWorld, WorldIncompatibleError, WorldNotFoundError } from '../src/persistence/repositories/worldsRepository.js';

const DEFAULT_WORLD_SLUG = 'public-arena';
const CONNECT_TIMEOUT_MILLIS = 5_000;

const EXIT_SUCCESS = 0;
const EXIT_INFRASTRUCTURE_ERROR = 1;
const EXIT_INCOMPATIBLE = 2;
const EXIT_LOCK_CONTENTION = 3;

function printResult(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

async function main(): Promise<number> {
  let databaseUrl: string;
  try {
    databaseUrl = readMigrationDatabaseUrl();
  } catch (error) {
    printResult({ ok: false, errorType: 'config', message: (error as Error).message });
    return EXIT_INFRASTRUCTURE_ERROR;
  }

  const worldSlug = readWorldSlug() ?? DEFAULT_WORLD_SLUG;
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: CONNECT_TIMEOUT_MILLIS });

  try {
    try {
      await client.connect();
    } catch (cause) {
      throw new PersistenceConnectionError('Failed to connect to the bootstrap database.', { cause });
    }

    await acquireAdvisorySharedLock(client, SCHEMA_MAINTENANCE_LOCK_KEY);
    try {
      const status = await readMigrationStatus(databaseUrl);
      if (status.status !== 'up_to_date' || status.appliedVersion !== 1 || status.expectedVersion !== 1) {
        printResult({
          ok: false,
          errorType: 'schema_incompatible',
          status: status.status,
          appliedVersion: status.appliedVersion,
          expectedVersion: status.expectedVersion,
          message: 'Database schema is not in the exact expected state. Run db:migrate first.'
        });
        return EXIT_INCOMPATIBLE;
      }

      const result = await bootstrapWorld(client, worldSlug);
      printResult({
        ok: true,
        status: result.status,
        worldId: result.world.worldId,
        worldSlug: result.world.worldSlug,
        domainVersion: result.world.domainVersion,
        stateRevision: result.world.stateRevision.toString()
      });
      return EXIT_SUCCESS;
    } finally {
      await releaseAdvisorySharedLock(client, SCHEMA_MAINTENANCE_LOCK_KEY).catch(() => undefined);
    }
  } catch (error) {
    if (error instanceof WorldIncompatibleError) {
      printResult({ ok: false, errorType: 'world_incompatible', reason: error.reason, message: error.message });
      return EXIT_INCOMPATIBLE;
    }
    if (error instanceof WorldNotFoundError) {
      printResult({ ok: false, errorType: 'world_not_found', message: error.message });
      return EXIT_INCOMPATIBLE;
    }
    if (error instanceof MigrationLockTimeoutError) {
      printResult({ ok: false, errorType: 'lock_timeout', lockName: error.lockName, message: error.message });
      return EXIT_LOCK_CONTENTION;
    }
    if (error instanceof MigrationLedgerError) {
      printResult({ ok: false, errorType: 'ledger', reason: error.reason, message: error.message });
      return EXIT_INFRASTRUCTURE_ERROR;
    }
    if (error instanceof PersistenceConnectionError || error instanceof PersistenceConfigError) {
      printResult({ ok: false, errorType: 'infrastructure', message: error.message });
      return EXIT_INFRASTRUCTURE_ERROR;
    }
    printResult({
      ok: false,
      errorType: 'unexpected',
      message: error instanceof Error ? error.message : String(error)
    });
    return EXIT_INFRASTRUCTURE_ERROR;
  } finally {
    await client.end().catch(() => undefined);
  }
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    printResult({
      ok: false,
      errorType: 'fatal',
      message: error instanceof Error ? error.message : String(error)
    });
    process.exitCode = EXIT_INFRASTRUCTURE_ERROR;
  });
