import { createServer, type RequestListener, type Server as HttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Server, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import type { Pool } from 'pg';
import {
  createOperationalLogger,
  operationalErrorDetails,
  parseShutdownTimeoutSeconds,
  RuntimeLifecycle,
  type OperationalLogSink
} from './ops/runtimeLifecycle.js';
import { readMigrationStatusDatabaseUrl, type PersistenceEnv } from './persistence/config.js';
import { createPersistencePool } from './persistence/pool.js';
import {
  bootPersistenceRuntime,
  type PersistenceRuntime,
  type PersistenceRuntimeOptions
} from './persistence/persistenceRuntime.js';
import {
  handleIdentityGuestRequest,
  matchesIdentityGuestPath,
  type IdentityGuestEndpointContext
} from './http/identityGuestEndpoint.js';
import {
  handleWorldDiscoveryRequest,
  matchesWorldDiscoveryPath,
  type WorldDiscoveryEndpointContext
} from './http/worldDiscoveryEndpoint.js';
import { registerProductionRooms } from './rooms/productionRoomRegistry.js';
import {
  createWebSocketVerifyClient,
  describeNetworkBoundaryMode,
  installNetworkBoundary,
  parseNetworkBoundaryConfig,
  type NetworkBoundaryEnvironment
} from './security/networkBoundary.js';
import { PeerRateLimiter } from './security/peerRateLimiter.js';
import type { MonotonicClock } from './security/tokenBucketRateLimiter.js';

const DEFAULT_PORT = 2567;
const HEALTH_BODY = JSON.stringify({ ok: true, service: 'burningspace-server' });
const CANONICAL_BATTLE_ROOM_NAME = 'battle';
const CANONICAL_ROOM_WATCH_INTERVAL_MILLIS = 5_000;
const GUEST_IDENTITY_LIMITER_CAPACITY = 3;
const GUEST_IDENTITY_LIMITER_REFILL_PER_SECOND = 1 / 60;
const GUEST_IDENTITY_LIMITER_MAX_BUCKETS = 10_000;
const GUEST_IDENTITY_LIMITER_IDLE_EVICTION_MILLIS = 10 * 60 * 1000;

export interface ProductionServerEnvironment extends NetworkBoundaryEnvironment, PersistenceEnv {
  readonly PORT?: string;
  readonly BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS?: string;
}

export interface StartProductionServerOptions {
  readonly environment?: ProductionServerEnvironment;
  readonly port?: number;
  readonly hostname?: string;
  readonly registerSignalHandlers?: boolean;
  readonly logSink?: OperationalLogSink;
  readonly persistence?: Omit<PersistenceRuntimeOptions, 'environment' | 'onAuthorityLost'>;
  /** Set false in tests: real production always terminates the process on authority loss. */
  readonly exitOnAuthorityLoss?: boolean;
  /** Test-only: injects a monotonic clock into the single per-process /identity/guest limiter to avoid real sleeps. */
  readonly guestIdentityLimiterClock?: MonotonicClock;
}

export interface ProductionServerHandle {
  readonly url: string;
  readonly lifecycle: RuntimeLifecycle;
  readonly persistence: PersistenceRuntime;
  shutdown(signal?: 'SIGINT' | 'SIGTERM'): Promise<void>;
}

function parsePort(rawValue: string | undefined): number {
  if (rawValue === undefined) {
    return DEFAULT_PORT;
  }

  if (rawValue.trim().length === 0) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }

  return value;
}

function waitForHttpServerClose(httpServer: HttpServer): Promise<void> {
  if (!httpServer.listening) {
    return Promise.resolve();
  }

  return new Promise((resolveClose) => {
    httpServer.once('close', resolveClose);
  });
}

function withTimeout(operation: Promise<void>, timeoutSeconds: number): Promise<void> {
  return new Promise((resolveOperation, rejectOperation) => {
    const timeout = setTimeout(() => {
      rejectOperation(new Error(
        `Graceful shutdown exceeded ${timeoutSeconds} seconds.`
      ));
    }, timeoutSeconds * 1000);

    operation.then(
      () => {
        clearTimeout(timeout);
        resolveOperation();
      },
      (error: unknown) => {
        clearTimeout(timeout);
        rejectOperation(error);
      }
    );
  });
}

export interface RuntimeRequestListenerContext {
  readonly lifecycle: RuntimeLifecycle;
  readonly identityGuest: IdentityGuestEndpointContext;
  readonly worldDiscovery: WorldDiscoveryEndpointContext;
}

/**
 * Accepts either a bare RuntimeLifecycle (the pre-Packet-4 calling
 * convention, still used directly by productionReadiness.test.ts for
 * health/ready-only scenarios) or the full endpoint-routing context. This
 * keeps that existing test's direct call working unchanged while
 * production composition uses the richer context.
 */
export function createRuntimeRequestListener(
  lifecycleOrContext: RuntimeLifecycle | RuntimeRequestListenerContext
): RequestListener {
  const context: RuntimeRequestListenerContext | undefined =
    lifecycleOrContext instanceof RuntimeLifecycle ? undefined : lifecycleOrContext;
  const lifecycle: RuntimeLifecycle =
    lifecycleOrContext instanceof RuntimeLifecycle ? lifecycleOrContext : lifecycleOrContext.lifecycle;

  return (request, response) => {
    const pathname = (request.url ?? '/').split('?')[0] ?? '/';

    if (pathname === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(HEALTH_BODY);
      return;
    }

    if (pathname === '/ready') {
      const readiness = lifecycle.readiness;
      response.writeHead(readiness.status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(readiness.body));
      return;
    }

    if (context && matchesIdentityGuestPath(pathname)) {
      void handleIdentityGuestRequest(request, response, context.identityGuest);
      return;
    }

    if (context && matchesWorldDiscoveryPath(pathname)) {
      handleWorldDiscoveryRequest(request, response, context.worldDiscovery);
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false, error: 'not_found' }));
  };
}

export async function startProductionServer(
  options: StartProductionServerOptions = {}
): Promise<ProductionServerHandle> {
  const environment = options.environment ?? process.env;
  const candidatePort = options.port ?? Number(environment.PORT ?? DEFAULT_PORT);
  const environmentName = environment.NODE_ENV?.trim() || 'development';
  const log = createOperationalLogger({
    environment: environmentName,
    port: candidatePort
  }, options.logSink);
  const lifecycle = new RuntimeLifecycle();

  log('info', 'server_starting');

  let httpServer: HttpServer | undefined;
  let gameServer: Server | undefined;
  let restoreNetworkBoundary: (() => void) | undefined;
  let persistenceRuntime: PersistenceRuntime | undefined;
  let identityPool: Pool | undefined;
  let canonicalRoomWatcher: ReturnType<typeof setInterval> | undefined;

  try {
    const port = options.port ?? parsePort(environment.PORT);
    const shutdownTimeoutSeconds = parseShutdownTimeoutSeconds(environment);
    const networkBoundaryConfig = parseNetworkBoundaryConfig(environment);
    const securityMode = describeNetworkBoundaryMode(networkBoundaryConfig);
    const operationalDetails = {
      securityMode,
      reconnectGraceSeconds: networkBoundaryConfig.reconnectGraceSeconds,
      shutdownTimeoutSeconds
    } as const;

    const isLifecycleReady = (): boolean => lifecycle.state === 'ready';
    const getWriterAuthority = () => persistenceRuntime?.writer;
    const getCanonicalRoomId = (): string | undefined => persistenceRuntime?.getCanonicalRoomId();
    // createOperationalLogger's event parameter is intentionally narrowed to
    // the existing lifecycle event union (runtimeLifecycle.ts is out of
    // scope for this packet); the underlying JSON-log implementation and
    // bounded-value truncation are otherwise identical, so widen the type
    // at this one integration seam for the endpoints' own event names.
    const identityLog: IdentityGuestEndpointContext['log'] = log as unknown as IdentityGuestEndpointContext['log'];
    const guestIdentityLimiter = new PeerRateLimiter({
      capacity: GUEST_IDENTITY_LIMITER_CAPACITY,
      refillRatePerSecond: GUEST_IDENTITY_LIMITER_REFILL_PER_SECOND,
      maxBuckets: GUEST_IDENTITY_LIMITER_MAX_BUCKETS,
      idleEvictionMs: GUEST_IDENTITY_LIMITER_IDLE_EVICTION_MILLIS,
      monotonicNow: options.guestIdentityLimiterClock
    });

    const requestListenerContext: RuntimeRequestListenerContext = {
      lifecycle,
      identityGuest: {
        isLifecycleReady,
        getWriterAuthority,
        getPool: () => identityPool,
        networkBoundaryConfig,
        limiter: guestIdentityLimiter,
        log: identityLog
      },
      worldDiscovery: {
        isLifecycleReady,
        getWriterAuthority,
        getCanonicalRoomId,
        networkBoundaryConfig
      }
    };

    httpServer = createServer(createRuntimeRequestListener(requestListenerContext));
    const networkBoundary = installNetworkBoundary(networkBoundaryConfig);
    restoreNetworkBoundary = networkBoundary.restore;

    gameServer = new Server({
      gracefullyShutdown: false,
      greet: false,
      transport: new WebSocketTransport({
        server: httpServer,
        verifyClient: createWebSocketVerifyClient(networkBoundaryConfig)
      })
    });
    gameServer.onShutdown(networkBoundary.restore);

    let shutdownPromise: Promise<void> | undefined;
    let teardownPromise: Promise<void> | undefined;
    const signalHandlers = new Map<'SIGINT' | 'SIGTERM', () => void>();
    const removeSignalHandlers = (): void => {
      for (const [signal, handler] of signalHandlers) {
        process.off(signal, handler);
      }
      signalHandlers.clear();
    };

    const performTeardown = (): Promise<void> => {
      if (teardownPromise) {
        return teardownPromise;
      }
      if (canonicalRoomWatcher) {
        clearInterval(canonicalRoomWatcher);
        canonicalRoomWatcher = undefined;
      }
      const closed = waitForHttpServerClose(httpServer as HttpServer);
      teardownPromise = (async () => {
        await gameServer?.gracefullyShutdown(false);
        await closed;
        restoreNetworkBoundary?.();
        await persistenceRuntime?.shutdown();
        await identityPool?.end().catch(() => undefined);
      })();
      return teardownPromise;
    };

    let authorityLostHandled = false;
    const handleAuthorityLost = (reason: string, cause?: unknown): void => {
      if (authorityLostHandled) {
        return;
      }
      authorityLostHandled = true;
      log('error', 'startup_failed', {
        ...operationalDetails,
        errorName: 'PersistenceAuthorityLost',
        errorMessage: reason,
        ...(cause instanceof Error ? operationalErrorDetails(cause) : {})
      });
      lifecycle.markFailed();
      const bounded = withTimeout(performTeardown(), shutdownTimeoutSeconds).catch(() => undefined);
      if (options.exitOnAuthorityLoss !== false) {
        void bounded.finally(() => {
          process.exitCode = 1;
          setImmediate(() => process.exit(1));
        });
      }
    };

    persistenceRuntime = await bootPersistenceRuntime({
      ...options.persistence,
      environment,
      onAuthorityLost: handleAuthorityLost
    });

    // A separate pool dedicated to HTTP identity writes: PersistenceRuntime
    // does not expose its own internal pool, and Packet 3's boot/fencing
    // semantics are intentionally not touched by this packet. Same
    // connection string PersistenceRuntime itself resolved (pure function
    // of the same environment).
    identityPool = createPersistencePool(readMigrationStatusDatabaseUrl(environment));

    registerProductionRooms(gameServer);

    const canonicalRoom = await matchMaker.createRoom(CANONICAL_BATTLE_ROOM_NAME, {});
    persistenceRuntime.publishCanonicalRoomId(canonicalRoom.roomId);

    canonicalRoomWatcher = setInterval(() => {
      if (lifecycle.state !== 'ready') {
        return;
      }
      if (!matchMaker.getLocalRoomById(canonicalRoom.roomId)) {
        handleAuthorityLost('canonical_room_disposed_unexpectedly');
      }
    }, CANONICAL_ROOM_WATCH_INTERVAL_MILLIS);
    canonicalRoomWatcher.unref?.();

    await new Promise<void>((resolveListen, rejectListen) => {
      const handleError = (error: Error): void => {
        httpServer?.off('listening', handleListening);
        rejectListen(error);
      };
      const handleListening = (): void => {
        httpServer?.off('error', handleError);
        resolveListen();
      };

      httpServer?.once('error', handleError);
      httpServer?.once('listening', handleListening);
      httpServer?.listen(port, options.hostname);
    });

    if (!lifecycle.markReady()) {
      throw new Error('Runtime lifecycle could not transition to ready.');
    }

    const address = httpServer.address();
    const listeningPort = typeof address === 'object' && address !== null
      ? address.port
      : port;
    const publicHost = options.hostname === undefined || options.hostname === '0.0.0.0'
      ? '127.0.0.1'
      : options.hostname;

    log('info', 'server_ready', operationalDetails);

    const shutdown = (signal: 'SIGINT' | 'SIGTERM' = 'SIGTERM'): Promise<void> => {
      if (shutdownPromise) {
        return shutdownPromise;
      }

      if (!lifecycle.beginShutdown()) {
        return Promise.resolve();
      }

      log('info', 'shutdown_started', { ...operationalDetails, signal });

      shutdownPromise = withTimeout(performTeardown(), shutdownTimeoutSeconds)
        .then(() => {
          lifecycle.completeShutdown();
          removeSignalHandlers();
          log('info', 'shutdown_completed', { ...operationalDetails, signal });
        })
        .catch((error: unknown) => {
          lifecycle.markFailed();
          removeSignalHandlers();
          log('error', 'shutdown_failed', {
            ...operationalDetails,
            signal,
            ...operationalErrorDetails(error)
          });
          throw error;
        });

      return shutdownPromise;
    };

    if (options.registerSignalHandlers !== false) {
      for (const signal of ['SIGTERM', 'SIGINT'] as const) {
        const handler = (): void => {
          void shutdown(signal).then(
            () => {
              process.exitCode = 0;
            },
            () => {
              process.exitCode = 1;
              setImmediate(() => process.exit(1));
            }
          );
        };
        signalHandlers.set(signal, handler);
        process.on(signal, handler);
      }
    }

    return {
      url: `http://${publicHost}:${listeningPort}`,
      lifecycle,
      persistence: persistenceRuntime,
      shutdown
    };
  } catch (error) {
    lifecycle.markFailed();
    await gameServer?.gracefullyShutdown(false).catch(() => undefined);
    restoreNetworkBoundary?.();
    await persistenceRuntime?.shutdown().catch(() => undefined);
    await identityPool?.end().catch(() => undefined);
    log('error', 'startup_failed', operationalErrorDetails(error));
    throw error;
  }
}

function isMainModule(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && fileURLToPath(import.meta.url) === resolve(entrypoint);
}

if (isMainModule()) {
  startProductionServer().catch(() => {
    process.exitCode = 1;
  });
}
