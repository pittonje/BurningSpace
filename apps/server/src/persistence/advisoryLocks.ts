import type { Client } from 'pg';
import { MigrationLockTimeoutError, PersistenceConnectionError } from './errors.js';

export const BURNINGSPACE_ADVISORY_NAMESPACE = 0x4253; // "BS"

export const MIGRATION_RUNNER_LOCK: readonly [number, number] = [BURNINGSPACE_ADVISORY_NAMESPACE, 1];
export const SCHEMA_MAINTENANCE_LOCK: readonly [number, number] = [BURNINGSPACE_ADVISORY_NAMESPACE, 2];

export interface AdvisoryLockKey {
  readonly name: string;
  readonly key: readonly [number, number];
}

export const MIGRATION_RUNNER_LOCK_KEY: AdvisoryLockKey = {
  name: 'MIGRATION_RUNNER_LOCK',
  key: MIGRATION_RUNNER_LOCK
};

export const SCHEMA_MAINTENANCE_LOCK_KEY: AdvisoryLockKey = {
  name: 'SCHEMA_MAINTENANCE_LOCK',
  key: SCHEMA_MAINTENANCE_LOCK
};

const ADVISORY_LOCK_TIMEOUT_SQL = "SET lock_timeout = '5s'";
const RESET_LOCK_TIMEOUT_SQL = 'RESET lock_timeout';

// PostgreSQL SQLSTATE for a statement cancelled because lock_timeout elapsed.
const LOCK_TIMEOUT_SQLSTATE = '55P03';

function isLockTimeoutError(cause: unknown): boolean {
  return typeof cause === 'object' && cause !== null && (cause as { code?: string }).code === LOCK_TIMEOUT_SQLSTATE;
}

/**
 * Session-level exclusive advisory lock acquisition bounded by a 5-second
 * lock_timeout. SET (not SET LOCAL) is correct here: these locks are
 * session-scoped, not transaction-scoped.
 */
export async function acquireAdvisoryLock(client: Client, lock: AdvisoryLockKey): Promise<void> {
  await client.query(ADVISORY_LOCK_TIMEOUT_SQL);
  try {
    await client.query('SELECT pg_advisory_lock($1, $2)', [lock.key[0], lock.key[1]]);
  } catch (cause) {
    if (isLockTimeoutError(cause)) {
      throw new MigrationLockTimeoutError(lock.name, `Timed out acquiring advisory lock ${lock.name}.`);
    }
    throw new PersistenceConnectionError(`Failed to acquire advisory lock ${lock.name}.`, { cause });
  } finally {
    await client.query(RESET_LOCK_TIMEOUT_SQL).catch(() => undefined);
  }
}

export async function releaseAdvisoryLock(client: Client, lock: AdvisoryLockKey): Promise<void> {
  await client.query('SELECT pg_advisory_unlock($1, $2)', [lock.key[0], lock.key[1]]);
}

/**
 * Shared-mode counterparts, exported as reusable primitives only. No shared
 * advisory-lock runtime lifecycle is wired up in this packet; Packet 3 owns
 * runtime shared usage of SCHEMA_MAINTENANCE_LOCK.
 */
export async function acquireAdvisorySharedLock(client: Client, lock: AdvisoryLockKey): Promise<void> {
  await client.query(ADVISORY_LOCK_TIMEOUT_SQL);
  try {
    await client.query('SELECT pg_advisory_lock_shared($1, $2)', [lock.key[0], lock.key[1]]);
  } catch (cause) {
    if (isLockTimeoutError(cause)) {
      throw new MigrationLockTimeoutError(lock.name, `Timed out acquiring shared advisory lock ${lock.name}.`);
    }
    throw new PersistenceConnectionError(`Failed to acquire shared advisory lock ${lock.name}.`, { cause });
  } finally {
    await client.query(RESET_LOCK_TIMEOUT_SQL).catch(() => undefined);
  }
}

export async function releaseAdvisorySharedLock(client: Client, lock: AdvisoryLockKey): Promise<void> {
  await client.query('SELECT pg_advisory_unlock_shared($1, $2)', [lock.key[0], lock.key[1]]);
}

/**
 * Non-blocking runtime acquisition: a live application process holds
 * SCHEMA_MAINTENANCE_LOCK in shared mode for its entire lifetime, which is
 * incompatible with pg_advisory_lock()'s session-blocking semantics used by
 * acquireAdvisorySharedLock above (Packet-2 migration path). Runtime callers
 * poll this instead and apply their own bounded retry using monotonic time.
 */
export async function tryAcquireAdvisorySharedLock(client: Client, lock: AdvisoryLockKey): Promise<boolean> {
  const result = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock_shared($1, $2) AS locked', [
    lock.key[0],
    lock.key[1]
  ]);
  return result.rows[0]?.locked ?? false;
}
