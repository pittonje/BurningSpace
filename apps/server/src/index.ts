import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { registerProductionRooms } from './rooms/productionRoomRegistry.js';
import {
  createWebSocketVerifyClient,
  describeNetworkBoundaryMode,
  installNetworkBoundary,
  parseNetworkBoundaryConfig
} from './security/networkBoundary.js';

const port = Number(process.env.PORT ?? 2567);

function closeHttpServer(httpServer: HttpServer): Promise<void> {
  return new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function startServer(): Promise<void> {
  const networkBoundaryConfig = parseNetworkBoundaryConfig();
  const httpServer = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true, service: 'burningspace-server' }));
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false, error: 'not_found' }));
  });
  const networkBoundary = installNetworkBoundary(networkBoundaryConfig);
  let gameServer: Server | undefined;

  try {
    gameServer = new Server({
      transport: new WebSocketTransport({
        server: httpServer,
        verifyClient: createWebSocketVerifyClient(networkBoundaryConfig)
      })
    });
    gameServer.onShutdown(() => {
      networkBoundary.restore();
    });

    registerProductionRooms(gameServer);

    await new Promise<void>((resolve, reject) => {
      const handleError = (error: Error): void => {
        httpServer.off('listening', handleListening);
        reject(error);
      };
      const handleListening = (): void => {
        httpServer.off('error', handleError);
        resolve();
      };

      httpServer.once('error', handleError);
      httpServer.once('listening', handleListening);
      httpServer.listen(port);
    });
  } catch (error) {
    await gameServer?.gracefullyShutdown(false).catch(() => undefined);

    if (httpServer.listening) {
      await closeHttpServer(httpServer).catch(() => undefined);
    }

    networkBoundary.restore();
    throw error;
  }

  console.log(`BurningSpace server listening on http://localhost:${port}`);
  console.log('Health endpoint: /health');
  console.log('Colyseus room: battle');
  console.log(`Network security: ${describeNetworkBoundaryMode(networkBoundaryConfig)}`);
}

startServer().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
