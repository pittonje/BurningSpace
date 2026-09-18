import { randomUUID } from 'node:crypto';
import { Client, type Pool } from 'pg';
import {
  SCHEMA_MAINTENANCE_LOCK_KEY,
  releaseAdvisorySharedLock,
  tryAcquireAdvisorySharedLock
} from './advisoryLocks.js';
import { readRuntimeDatabaseUrl, readWorldSlug, type PersistenceEnv } from './config.js';
import { readMigrationStatus } from './migrationRunner.js';
import { createPersistencePool } from './pool.js';
import * as worldsRepository from './repositories/worldsRepository.js';
import { WorldIncompatibleError, WorldNotFoundError } from './repositories/worldsRepository.js';
import {
  WriterLifecycle,
  type WriterAuthorityLossReason,
  type WriterLifecycleOptions,
  type WriterRepositoryPort
} from './writerLifecycle.js';

export const DEFAULT_WORLD_SLUG = 'public-arena';
const CONNECT_TIMEOUT_MILLIS = 5_000;
const SCHEMA_LOCK_ACQUIRE_BUDGET_MILLIS = 30_000;
const SCHEMA_LOCK_RETRY_INTERVAL_MILLIS = 500;

export class SchemaAuthorityUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaAuthorityUnavailableError';
  }
}

export class SchemaCompatibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaCompatibilityError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createWriterRepositoryPort(client: Client): WriterRepositoryPort {
  return {
    claimWorldWriter: (worldId, serverInstanceId) =>
      worldsRepository.claimWorldWriter(client, { worldId, serverInstanceId }),
    renewWorldWriter: (worldId, serverInstanceId, writerEpoch) =>
      worldsRepository.renewWorldWriter(client, { worldId, serverInstanceId, writerEpoch }),
    releaseWorldWriter: (worldId, serverInstanceId, writerEpoch) =>
      worldsRepository.releaseWorldWriter(client, { worldId, serverInstanceId, writerEpoch })
  };
}

export interface PersistenceRuntimeWriterOptions {
  readonly clock?: WriterLifecycleOptions['clock'];
  readonly bootDeadlineMillis?: number;
  readonly claimRetryIntervalMillis?: number;
  readonly heartbeatIntervalMillis?: number;
  readonly localSafetyDeadlineMillis?: number;
}

export interface PersistenceRuntimeOptions {
  readonly environment?: PersistenceEnv;
  readonly migrationsDir?: string;
  readonly writerOptions?: PersistenceRuntimeWriterOptions;
  readonly onAuthorityLost?: (reason: WriterAuthorityLossReason | 'schema_authority_lost', cause?: unknown) => void;
}

export interface PersistenceRuntime {
  readonly worldId: string;
  readonly worldSlug: string;
  readonly serverInstanceId: string;
  readonly writer: WriterLifecycle;
  readonly writerEpoch: bigint;
  getCanonicalRoomId(): string | undefined;
  publishCanonicalRoomId(roomId: string): void;
  shutdown(): Promise<void>;
}

async function acquireSchemaMaintenanceLock(client: Client): Promise<void> {
  const deadline = performance.now() + SCHEMA_LOCK_ACQUIRE_BUDGET_MILLIS;
  for (;;) {
    const acquired = await tryAcquireAdvisorySharedLock(client, SCHEMA_MAINTENANCE_LOCK_KEY);
    if (acquired) {
      return;
    }
    if (performance.now() >= deadline) {
      throw new SchemaAuthorityUnavailableError(
        `Timed out acquiring the shared schema-maintenance advisory lock within ${SCHEMA_LOCK_ACQUIRE_BUDGET_MILLIS}ms.`
      );
    }
    await sleep(SCHEMA_LOCK_RETRY_INTERVAL_MILLIS);
  }
}

async function verifyExactSchemaState(connectionString: string, migrationsDir: string | undefined): Promise<void> {
  const status = await readMigrationStatus(connectionString, migrationsDir);
  if (status.status !== 'up_to_date' || status.appliedVersion !== 1 || status.expectedVersion !== 1) {
    throw new SchemaCompatibilityError(
      `Database schema is not in the exact expected state (status=${status.status}, appliedVersion=${status.appliedVersion}, expectedVersion=${status.expectedVersion}). Run db:migrate.`
    );
  }
}

/**
 * Process-level composition root for persistence resources. Business SQL
 * stays in repositories; this only sequences connections, the shared
 * schema-maintenance lock, schema verification, world resolution, and the
 * writer claim/heartbeat lifecycle, per the accepted PERSIST-002 boot order.
 */
export async function bootPersistenceRuntime(options: PersistenceRuntimeOptions = {}): Promise<PersistenceRuntime> {
  const environment = options.environment ?? process.env;
  const connectionString = readRuntimeDatabaseUrl(environment);
  const worldSlug = readWorldSlug(environment) ?? DEFAULT_WORLD_SLUG;
  const serverInstanceId = randomUUID();

  const pool: Pool = createPersistencePool(connectionString);
  const maintenanceClient = new Client({
    connectionString,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MILLIS,
    application_name: 'burningspace-schema-maintenance'
  });
  let writerClient: Client | undefined;
  let writer: WriterLifecycle | undefined;
  let maintenanceAuthorityLost = false;

  const reportAuthorityLost = (reason: WriterAuthorityLossReason | 'schema_authority_lost', cause?: unknown): void => {
    options.onAuthorityLost?.(reason, cause);
  };

  try {
    await maintenanceClient.connect();
    await acquireSchemaMaintenanceLock(maintenanceClient);
    await verifyExactSchemaState(connectionString, options.migrationsDir);

    const world = await worldsRepository.findWorldBySlug(maintenanceClient, worldSlug);
    if (!world) {
      throw new WorldNotFoundError(worldSlug);
    }
    if (world.lifecycleStatus !== 'active') {
      throw new WorldIncompatibleError('retired', `World "${worldSlug}" is retired and cannot be used.`);
    }
    if (world.domainVersion !== worldsRepository.SUPPORTED_DOMAIN_VERSION) {
      throw new WorldIncompatibleError(
        'domain_version_mismatch',
        `World "${worldSlug}" has incompatible domain_version ${world.domainVersion}.`
      );
    }

    writerClient = new Client({
      connectionString,
      connectionTimeoutMillis: CONNECT_TIMEOUT_MILLIS,
      application_name: 'burningspace-writer'
    });
    await writerClient.connect();

    writer = new WriterLifecycle({
      worldId: world.worldId,
      serverInstanceId,
      repository: createWriterRepositoryPort(writerClient),
      connection: writerClient,
      clock: options.writerOptions?.clock,
      bootDeadlineMillis: options.writerOptions?.bootDeadlineMillis,
      claimRetryIntervalMillis: options.writerOptions?.claimRetryIntervalMillis,
      heartbeatIntervalMillis: options.writerOptions?.heartbeatIntervalMillis,
      localSafetyDeadlineMillis: options.writerOptions?.localSafetyDeadlineMillis,
      onAuthorityLost: reportAuthorityLost
    });

    await writer.claim();
    writer.startHeartbeat();

    maintenanceClient.on('error', (error) => {
      if (maintenanceAuthorityLost) {
        return;
      }
      maintenanceAuthorityLost = true;
      reportAuthorityLost('schema_authority_lost', error);
    });
    maintenanceClient.on('end', () => {
      if (maintenanceAuthorityLost) {
        return;
      }
      maintenanceAuthorityLost = true;
      reportAuthorityLost('schema_authority_lost');
    });

    let canonicalRoomId: string | undefined;
    let shuttingDown = false;

    const capturedWriter = writer;
    const capturedWriterClient = writerClient;

    return {
      worldId: world.worldId,
      worldSlug: world.worldSlug,
      serverInstanceId,
      writer: capturedWriter,
      get writerEpoch(): bigint {
        return capturedWriter.writerEpoch ?? 0n;
      },
      getCanonicalRoomId: () => canonicalRoomId,
      publishCanonicalRoomId: (roomId: string) => {
        if (canonicalRoomId !== undefined) {
          throw new Error(
            `Canonical room id already published for this runtime (existing="${canonicalRoomId}", attempted="${roomId}"); only one publication is allowed.`
          );
        }
        canonicalRoomId = roomId;
      },
      shutdown: async () => {
        if (shuttingDown) {
          return;
        }
        shuttingDown = true;
        // Mark authority-loss reporting as already handled before our own
        // intentional client.end() calls below, so a graceful shutdown
        // never mis-fires the same 'end'/'error' listeners used to detect
        // an unexpected schema-maintenance connection loss.
        maintenanceAuthorityLost = true;
        await capturedWriter.release().catch(() => undefined);
        await releaseAdvisorySharedLock(maintenanceClient, SCHEMA_MAINTENANCE_LOCK_KEY).catch(() => undefined);
        await capturedWriterClient.end().catch(() => undefined);
        await maintenanceClient.end().catch(() => undefined);
        await pool.end().catch(() => undefined);
      }
    };
  } catch (error) {
    await writer?.release().catch(() => undefined);
    await writerClient?.end().catch(() => undefined);
    await maintenanceClient.end().catch(() => undefined);
    await pool.end().catch(() => undefined);
    throw error;
  }
}
