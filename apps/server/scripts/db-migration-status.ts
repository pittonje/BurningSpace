import process from 'node:process';
import { readMigrationStatusDatabaseUrl } from '../src/persistence/config.js';
import { PersistenceConfigError, PersistenceConnectionError } from '../src/persistence/errors.js';
import { readMigrationStatus } from '../src/persistence/migrationRunner.js';

const EXIT_UP_TO_DATE = 0;
const EXIT_INFRASTRUCTURE_ERROR = 1;
const EXIT_NOT_UP_TO_DATE = 2;

function printResult(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

async function main(): Promise<number> {
  let databaseUrl: string;
  try {
    databaseUrl = readMigrationStatusDatabaseUrl();
  } catch (error) {
    printResult({ ok: false, errorType: 'config', message: (error as Error).message });
    return EXIT_INFRASTRUCTURE_ERROR;
  }

  try {
    const status = await readMigrationStatus(databaseUrl);
    printResult({
      status: status.status,
      appliedVersion: status.appliedVersion,
      expectedVersion: status.expectedVersion,
      pendingVersions: status.pendingVersions,
      mismatches: status.mismatches
    });
    return status.status === 'up_to_date' ? EXIT_UP_TO_DATE : EXIT_NOT_UP_TO_DATE;
  } catch (error) {
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
