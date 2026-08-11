import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { registerProductionRooms } from '../../src/rooms/productionRoomRegistry.js';

export interface ProductionBattleServerHandle {
  readonly url: string;
  stop(): Promise<void>;
}

function isPm2TelemetryMessage(message: unknown): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof message.type === 'string' &&
    message.type.startsWith('axm:')
  );
}

function filterPm2TelemetryFromWorkerIpc(): () => void {
  const workerSend = process.send;

  if (!workerSend) {
    return () => undefined;
  }

  // Colyseus loads @pm2/io for optional metrics. Filter only its axm messages
  // so they cannot collide with Vitest's fork-worker IPC protocol.
  const filteredSend = ((message: unknown, ...args: unknown[]): boolean => {
    if (isPm2TelemetryMessage(message)) {
      return true;
    }

    return Reflect.apply(workerSend, process, [message, ...args]) as boolean;
  }) as typeof process.send;

  process.send = filteredSend;

  return () => {
    if (process.send === filteredSend) {
      process.send = workerSend;
    }
  };
}

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

export async function startProductionBattleServer(): Promise<ProductionBattleServerHandle> {
  const restoreWorkerIpc = filterPm2TelemetryFromWorkerIpc();
  const httpServer = createServer();
  let gameServer: Server;

  try {
    gameServer = new Server({
      transport: new WebSocketTransport({
        server: httpServer
      })
    });
  } catch (error) {
    restoreWorkerIpc();
    throw error;
  }

  try {
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
      httpServer.listen(0, '127.0.0.1');
    });
  } catch (error) {
    await gameServer.gracefullyShutdown(false).catch(() => undefined);

    if (httpServer.listening) {
      await closeHttpServer(httpServer).catch(() => undefined);
    }

    restoreWorkerIpc();
    throw error;
  }

  const address = httpServer.address();

  if (!address || typeof address === 'string') {
    await gameServer.gracefullyShutdown(false).catch(() => undefined);
    restoreWorkerIpc();
    throw new Error('Unable to resolve production BattleRoom test server address.');
  }

  let stopped = false;

  return {
    url: `http://127.0.0.1:${(address as AddressInfo).port}`,
    async stop(): Promise<void> {
      if (stopped) {
        return;
      }

      stopped = true;
      try {
        await gameServer.gracefullyShutdown(false).catch(() => undefined);

        if (httpServer.listening) {
          await closeHttpServer(httpServer).catch(() => undefined);
        }
      } finally {
        restoreWorkerIpc();
      }
    }
  };
}
