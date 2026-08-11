import { createServer, type RequestListener, type Server as HttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import {
  createOperationalLogger,
  operationalErrorDetails,
  parseShutdownTimeoutSeconds,
  RuntimeLifecycle,
  type OperationalLogSink
} from './ops/runtimeLifecycle.js';
import { registerProductionRooms } from './rooms/productionRoomRegistry.js';
import {
  createWebSocketVerifyClient,
  describeNetworkBoundaryMode,
  installNetworkBoundary,
  parseNetworkBoundaryConfig,
  type NetworkBoundaryEnvironment
} from './security/networkBoundary.js';

const DEFAULT_PORT = 2567;
const HEALTH_BODY = JSON.stringify({ ok: true, service: 'burningspace-server' });

export interface ProductionServerEnvironment extends NetworkBoundaryEnvironment {
  readonly PORT?: string;
  readonly BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS?: string;
}

export interface StartProductionServerOptions {
  readonly environment?: ProductionServerEnvironment;
  readonly port?: number;
  readonly hostname?: string;
  readonly registerSignalHandlers?: boolean;
  readonly logSink?: OperationalLogSink;
}

export interface ProductionServerHandle {
  readonly url: string;
  readonly lifecycle: RuntimeLifecycle;
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

export function createRuntimeRequestListener(
  lifecycle: RuntimeLifecycle
): RequestListener {
  return (request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(HEALTH_BODY);
      return;
    }

    if (request.url === '/ready') {
      const readiness = lifecycle.readiness;
      response.writeHead(readiness.status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(readiness.body));
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

    httpServer = createServer(createRuntimeRequestListener(lifecycle));
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
    registerProductionRooms(gameServer);

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

    let shutdownPromise: Promise<void> | undefined;
    const signalHandlers = new Map<'SIGINT' | 'SIGTERM', () => void>();
    const removeSignalHandlers = (): void => {
      for (const [signal, handler] of signalHandlers) {
        process.off(signal, handler);
      }
      signalHandlers.clear();
    };

    const shutdown = (signal: 'SIGINT' | 'SIGTERM' = 'SIGTERM'): Promise<void> => {
      if (shutdownPromise) {
        return shutdownPromise;
      }

      if (!lifecycle.beginShutdown()) {
        return Promise.resolve();
      }

      log('info', 'shutdown_started', { ...operationalDetails, signal });
      const closed = waitForHttpServerClose(httpServer as HttpServer);
      const gracefulShutdown = (async () => {
        await gameServer?.gracefullyShutdown(false);
        await closed;
        restoreNetworkBoundary?.();
      })();

      shutdownPromise = withTimeout(gracefulShutdown, shutdownTimeoutSeconds)
        .then(() => {
          lifecycle.completeShutdown();
          removeSignalHandlers();
          log('info', 'shutdown_completed', { ...operationalDetails, signal });
        })
        .catch((error: unknown) => {
          lifecycle.markFailed();
          removeSignalHandlers();
          restoreNetworkBoundary?.();
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
      shutdown
    };
  } catch (error) {
    lifecycle.markFailed();
    await gameServer?.gracefullyShutdown(false).catch(() => undefined);
    restoreNetworkBoundary?.();
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
