import { Pool, type PoolClient } from 'pg';
import { PersistenceConnectionError } from './errors.js';

export const POOL_CONNECTION_TIMEOUT_MILLIS = 5000;
export const POOL_STATEMENT_TIMEOUT_MILLIS = 5000;
export const POOL_LOCK_TIMEOUT_MILLIS = 5000;
export const POOL_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MILLIS = 5000;
export const POOL_MAX_CLIENTS = 10;
export const POOL_IDLE_TIMEOUT_MILLIS = 10000;
export const POOL_MAX_PENDING_OPERATIONS = 50;

export function createPersistencePool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: POOL_MAX_CLIENTS,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MILLIS,
    connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MILLIS,
    statement_timeout: POOL_STATEMENT_TIMEOUT_MILLIS,
    lock_timeout: POOL_LOCK_TIMEOUT_MILLIS,
    idle_in_transaction_session_timeout: POOL_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MILLIS
  });
}

/**
 * Bounded admission counter shared across all withTransaction() callers on
 * this process. Rejects fast once the ceiling is reached instead of allowing
 * an unbounded pool.connect() queue to build up behind the pool's own limit.
 */
let pendingOperationCount = 0;

export function currentPendingOperationCount(): number {
  return pendingOperationCount;
}

export async function withTransaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (pendingOperationCount >= POOL_MAX_PENDING_OPERATIONS) {
    throw new PersistenceConnectionError(
      'Persistence admission limit reached; too many pending or running database operations.'
    );
  }

  pendingOperationCount += 1;
  let client: PoolClient;
  try {
    client = await pool.connect();
  } catch (cause) {
    pendingOperationCount -= 1;
    throw new PersistenceConnectionError('Failed to acquire a database connection.', { cause });
  }

  try {
    await client.query('BEGIN');
    try {
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (cause) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw cause;
    }
  } finally {
    client.release();
    pendingOperationCount -= 1;
  }
}
