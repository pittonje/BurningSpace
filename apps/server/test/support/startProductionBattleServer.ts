import { startProductionServer, type ProductionServerHandle } from '../../src/index.js';
import type { BattleRoom } from '../../src/rooms/BattleRoom.js';
import type { GameplayAuthorityTestHooks } from '../../src/persistence/gameplayAuthority.js';
import type { OperationalLogSink } from '../../src/ops/runtimeLifecycle.js';
import type { NetworkBoundaryConfig } from '../../src/security/networkBoundary.js';
import type { MonotonicClock } from '../../src/security/tokenBucketRateLimiter.js';
import { createBootstrappedTestDatabase, type BootstrappedTestDatabase } from './testPersistenceDatabase.js';

const PM2_TELEMETRY_FILTER_MARKER = Symbol.for(
  'burningspace.test.pm2-telemetry-worker-filter'
);

function isPm2TelemetryMessage(message: unknown): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof message.type === 'string' &&
    message.type.startsWith('axm:')
  );
}

function installPm2TelemetryFilterForWorkerIpc(): void {
  const workerSend = process.send;

  if (
    !workerSend ||
    Reflect.get(workerSend, PM2_TELEMETRY_FILTER_MARKER) === true
  ) {
    return;
  }

  // Colyseus loads process-global @pm2/io metrics with an unref'd timer that
  // outlives Server.gracefullyShutdown(). Keep this axm-only wrapper for the
  // worker lifetime so a later metrics tick cannot enter Vitest's fork IPC.
  // Every non-PM2 message and argument is forwarded unchanged.
  const filteredSend = ((message: unknown, ...args: unknown[]): boolean => {
    if (isPm2TelemetryMessage(message)) {
      return true;
    }

    return Reflect.apply(workerSend, process, [message, ...args]) as boolean;
  }) as typeof process.send;

  Reflect.defineProperty(filteredSend, PM2_TELEMETRY_FILTER_MARKER, {
    value: true
  });
  process.send = filteredSend;
}

export interface StartProductionBattleServerOptions {
  readonly networkBoundaryConfig?: NetworkBoundaryConfig;
  /** Test-only: injects a monotonic clock into the fresh-auth (BattleRoom.onAuth) limiter. */
  readonly freshAuthLimiterClock?: MonotonicClock;
  /** Test-only: injects a monotonic clock into the /identity/guest limiter. */
  readonly guestIdentityLimiterClock?: MonotonicClock;
  /** Test-only: captures operational log lines (e.g. to prove no raw secret is ever logged). */
  readonly logSink?: OperationalLogSink;
  /** Test-only: forwarded to gameplayAuthority.ts's createGameplayAuthority(). */
  readonly gameplayAuthorityTestHooks?: GameplayAuthorityTestHooks;
  /** Test-only: registers this class as the canonical 'battle' room instead of the real BattleRoom. */
  readonly battleRoomClassOverride?: typeof BattleRoom;
}

export interface ProductionBattleServerHandle {
  readonly url: string;
  /** The disposable real-PostgreSQL database backing this server instance. */
  readonly databaseUrl: string;
  readonly worldId: string;
  stop(): Promise<void>;
}

/**
 * A thin composition around the real startProductionServer: boots real
 * Packet-3 persistence against a fresh disposable+migrated+bootstrapped
 * database, real Packet-4 identity/discovery HTTP routes, and real
 * Packet-5 productionRoomDependencies/durable BattleRoom auth. No
 * persistence bypass, no auth bypass, no env flag to disable auth --
 * callers authenticate via the same public HTTP/matchmaking boundaries
 * production traffic uses (see testIdentityHelper.ts).
 */
export async function startProductionBattleServer(
  options: StartProductionBattleServerOptions = {}
): Promise<ProductionBattleServerHandle> {
  installPm2TelemetryFilterForWorkerIpc();

  let database: BootstrappedTestDatabase | undefined;
  let server: ProductionServerHandle | undefined;

  try {
    database = await createBootstrappedTestDatabase();

    server = await startProductionServer({
      environment: {
        NODE_ENV: options.networkBoundaryConfig?.production ? 'production' : 'test',
        DATABASE_URL: database.databaseUrl
      },
      port: 0,
      hostname: '127.0.0.1',
      registerSignalHandlers: false,
      exitOnAuthorityLoss: false,
      networkBoundaryConfigOverride: options.networkBoundaryConfig,
      freshAuthLimiterClock: options.freshAuthLimiterClock,
      guestIdentityLimiterClock: options.guestIdentityLimiterClock,
      logSink: options.logSink,
      gameplayAuthorityTestHooks: options.gameplayAuthorityTestHooks,
      battleRoomClassOverride: options.battleRoomClassOverride
    });
  } catch (error) {
    await server?.shutdown('SIGTERM').catch(() => undefined);
    await database?.drop().catch(() => undefined);
    throw error;
  }

  const runningServer = server;
  const runningDatabase = database;
  let stopped = false;

  return {
    url: runningServer.url,
    databaseUrl: runningDatabase.databaseUrl,
    worldId: runningDatabase.worldId,
    async stop(): Promise<void> {
      if (stopped) {
        return;
      }

      stopped = true;
      try {
        await runningServer.shutdown('SIGTERM');
      } finally {
        await runningDatabase.drop().catch(() => undefined);
      }
    }
  };
}
