import { PersistenceConfigError } from './errors.js';

export interface PersistenceEnv {
  readonly DATABASE_URL?: string;
  readonly MIGRATION_DATABASE_URL?: string;
  readonly BURNINGSPACE_WORLD_SLUG?: string;
}

function isSetValue(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

/**
 * Redacts userinfo from a Postgres connection string so it is safe to log.
 * Never returns the raw input on the success path.
 */
export function redactDatabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.username !== '' || url.password !== '') {
      url.username = 'REDACTED';
      url.password = '';
    }
    return url.toString();
  } catch {
    return 'REDACTED_INVALID_CONNECTION_STRING';
  }
}

/**
 * MIGRATION_DATABASE_URL is mandatory for migration application.
 * DATABASE_URL is intentionally never accepted as a silent substitute.
 */
export function readMigrationDatabaseUrl(env: PersistenceEnv = process.env): string {
  if (isSetValue(env.MIGRATION_DATABASE_URL)) {
    return env.MIGRATION_DATABASE_URL;
  }
  throw new PersistenceConfigError(
    'MIGRATION_DATABASE_URL is required to run migrations; DATABASE_URL is not an accepted substitute.'
  );
}

/**
 * The running application (server process) always connects with
 * DATABASE_URL -- never MIGRATION_DATABASE_URL, even when DATABASE_URL is
 * absent and only MIGRATION_DATABASE_URL is set. An operator's migration
 * step configuring MIGRATION_DATABASE_URL in the same environment must
 * never let the running application implicitly acquire elevated migration
 * credentials, and an invalid/unreachable MIGRATION_DATABASE_URL must never
 * break an otherwise valid DATABASE_URL runtime configuration -- this
 * function never inspects MIGRATION_DATABASE_URL at all. Use this for every
 * runtime-created database connection (schema checking, writer/maintenance
 * connections, and the HTTP identity/gameplay pool); it is distinct from
 * readMigrationDatabaseUrl()/readMigrationStatusDatabaseUrl(), which remain
 * the operator CLI's own, separately documented selection policies.
 */
export function readRuntimeDatabaseUrl(env: PersistenceEnv = process.env): string {
  if (isSetValue(env.DATABASE_URL)) {
    return env.DATABASE_URL;
  }
  throw new PersistenceConfigError(
    'DATABASE_URL is required to start the runtime; MIGRATION_DATABASE_URL is not an accepted substitute.'
  );
}

/**
 * Read-only migration status may fall back to DATABASE_URL when
 * MIGRATION_DATABASE_URL is not configured.
 */
export function readMigrationStatusDatabaseUrl(env: PersistenceEnv = process.env): string {
  if (isSetValue(env.MIGRATION_DATABASE_URL)) {
    return env.MIGRATION_DATABASE_URL;
  }
  if (isSetValue(env.DATABASE_URL)) {
    return env.DATABASE_URL;
  }
  throw new PersistenceConfigError(
    'Either MIGRATION_DATABASE_URL or DATABASE_URL must be set to read migration status.'
  );
}

export function readWorldSlug(env: PersistenceEnv = process.env): string | undefined {
  return isSetValue(env.BURNINGSPACE_WORLD_SLUG) ? env.BURNINGSPACE_WORLD_SLUG : undefined;
}
