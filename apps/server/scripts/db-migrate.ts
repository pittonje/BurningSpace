import process from 'node:process';
import { readMigrationDatabaseUrl } from '../src/persistence/config.js';
import {
  MigrationApplyError,
  MigrationLedgerError,
  MigrationLockTimeoutError,
  PersistenceConfigError,
  PersistenceConnectionError
} from '../src/persistence/errors.js';
import { runMigrations } from '../src/persistence/migrationRunner.js';

const EXIT_SUCCESS = 0;
const EXIT_INFRASTRUCTURE_ERROR = 1;
const EXIT_LEDGER_ERROR = 2;
const EXIT_LOCK_CONTENTION = 3;
const EXIT_APPLY_ERROR = 4;

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

  try {
    const result = await runMigrations(databaseUrl);
    printResult({
      ok: true,
      status: result.status,
      appliedVersions: result.appliedVersions,
      appliedCount: result.appliedCount,
      pendingCountBefore: result.pendingCountBefore,
      currentVersion: result.currentVersion,
      expectedVersion: result.expectedVersion
    });
    return EXIT_SUCCESS;
  } catch (error) {
    if (error instanceof MigrationLedgerError) {
      printResult({ ok: false, errorType: 'ledger', reason: error.reason, message: error.message });
      return EXIT_LEDGER_ERROR;
    }
    if (error instanceof MigrationLockTimeoutError) {
      printResult({ ok: false, errorType: 'lock_timeout', lockName: error.lockName, message: error.message });
      return EXIT_LOCK_CONTENTION;
    }
    if (error instanceof MigrationApplyError) {
      printResult({ ok: false, errorType: 'apply', version: error.version, message: error.message });
      return EXIT_APPLY_ERROR;
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
