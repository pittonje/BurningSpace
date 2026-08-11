import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { MapSchema } from '@colyseus/schema';
import { Client, type Room } from 'colyseus.js';
import { afterEach, describe, expect, it } from 'vitest';
import { ServerMessages, type RoomInfoMessage } from '@burningspace/shared';
import {
  createRuntimeRequestListener,
  startProductionServer,
  type ProductionServerEnvironment,
  type ProductionServerHandle
} from '../src/index.js';
import { RuntimeLifecycle } from '../src/ops/runtimeLifecycle.js';

const ALLOWED_ORIGIN = 'https://arena.example.com';
const TEST_TIMEOUT_MS = 10_000;
const PM2_TELEMETRY_FILTER_MARKER = Symbol.for(
  'burningspace.test.pm2-telemetry-worker-filter'
);

interface JsonResponse {
  readonly status: number;
  readonly body: unknown;
}

interface ReadinessBattleState {
  participants: MapSchema<{ sessionId: string }, string>;
}

const runningServers: ProductionServerHandle[] = [];
const openRooms: Room[] = [];

function installPm2TelemetryFilterForWorkerIpc(): void {
  const workerSend = process.send;

  if (
    !workerSend ||
    Reflect.get(workerSend, PM2_TELEMETRY_FILTER_MARKER) === true
  ) {
    return;
  }

  const filteredSend = ((message: unknown, ...args: unknown[]): boolean => {
    if (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      typeof message.type === 'string' &&
      message.type.startsWith('axm:')
    ) {
      return true;
    }

    return Reflect.apply(workerSend, process, [message, ...args]) as boolean;
  }) as typeof process.send;

  Reflect.defineProperty(filteredSend, PM2_TELEMETRY_FILTER_MARKER, {
    value: true
  });
  process.send = filteredSend;
}

installPm2TelemetryFilterForWorkerIpc();

function productionEnvironment(
  overrides: Partial<ProductionServerEnvironment> = {}
): ProductionServerEnvironment {
  return {
    NODE_ENV: 'production',
    BURNINGSPACE_ALLOWED_ORIGINS: ALLOWED_ORIGIN,
    BURNINGSPACE_RECONNECT_GRACE_SECONDS: '10',
    BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS: '2',
    ...overrides
  };
}

async function fetchJson(url: string): Promise<JsonResponse> {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.json()
  };
}

async function waitFor(
  condition: () => boolean,
  label: string,
  timeoutMs = 5_000
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (condition()) {
      return;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
  }

  throw new Error(`Timed out waiting for ${label}.`);
}

afterEach(async () => {
  await Promise.allSettled(openRooms.splice(0).map((room) =>
    room.connection?.isOpen ? room.leave(true) : Promise.resolve()
  ));
  await Promise.allSettled(runningServers.splice(0).map((server) =>
    server.shutdown('SIGTERM')
  ));
});

describe('production readiness bootstrap', () => {
  it('preserves health and reports ready only after listening', async () => {
    const server = await startProductionServer({
      environment: productionEnvironment(),
      port: 0,
      hostname: '127.0.0.1',
      registerSignalHandlers: false
    });
    runningServers.push(server);

    expect(await fetchJson(`${server.url}/health`)).toEqual({
      status: 200,
      body: { ok: true, service: 'burningspace-server' }
    });
    expect(await fetchJson(`${server.url}/ready`)).toEqual({
      status: 200,
      body: { ok: true, service: 'burningspace-server', ready: true }
    });
  });

  it('serves a 503 readiness response while draining', async () => {
    const lifecycle = new RuntimeLifecycle();
    const httpServer = createServer(createRuntimeRequestListener(lifecycle));
    await new Promise<void>((resolveListen) => {
      httpServer.listen(0, '127.0.0.1', resolveListen);
    });
    const address = httpServer.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}`;

    try {
      lifecycle.markReady();
      expect((await fetchJson(`${url}/ready`)).status).toBe(200);
      lifecycle.beginShutdown();
      expect(await fetchJson(`${url}/ready`)).toEqual({
        status: 503,
        body: { ok: false, service: 'burningspace-server', ready: false }
      });
    } finally {
      await new Promise<void>((resolveClose, rejectClose) => {
        httpServer.close((error) => error ? rejectClose(error) : resolveClose());
      });
    }
  });

  it('fails invalid shutdown configuration before listening', async () => {
    const lines: string[] = [];

    await expect(startProductionServer({
      environment: productionEnvironment({
        BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS: '0'
      }),
      port: 0,
      hostname: '127.0.0.1',
      registerSignalHandlers: false,
      logSink: (line) => lines.push(line)
    })).rejects.toThrow(
      'BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS must be an integer from 1 to 60.'
    );

    expect(lines.map((line) => JSON.parse(line).event)).toEqual([
      'server_starting',
      'startup_failed'
    ]);
  });

  it('handles SIGTERM once, settles pending reconnect work, and closes cleanly', async () => {
    const lines: string[] = [];
    const server = await startProductionServer({
      environment: productionEnvironment(),
      port: 0,
      hostname: '127.0.0.1',
      registerSignalHandlers: false,
      logSink: (line) => lines.push(line)
    });
    runningServers.push(server);

    const client = new Client(server.url, { headers: { Origin: ALLOWED_ORIGIN } });
    const observerClient = new Client(server.url, {
      headers: { Origin: ALLOWED_ORIGIN }
    });
    const room = await client.joinOrCreate<ReadinessBattleState>('battle');
    const observer = await observerClient.joinById<ReadinessBattleState>(room.roomId);
    openRooms.push(room, observer);
    const roomInfo: RoomInfoMessage[] = [];
    observer.onMessage<RoomInfoMessage>(ServerMessages.ROOM_INFO, (message) => {
      roomInfo.push(message);
    });
    const disconnectedSessionId = room.sessionId;
    await room.leave(false);
    await waitFor(
      () => (
        roomInfo.some(({ connectedClients }) => connectedClients === 1) &&
        observer.state.participants.has(disconnectedSessionId)
      ),
      'pending reconnect reservation before shutdown'
    );

    const startedAt = Date.now();
    const firstShutdown = server.shutdown('SIGTERM');
    const duplicateShutdown = server.shutdown('SIGINT');

    expect(duplicateShutdown).toBe(firstShutdown);
    await firstShutdown;
    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect(server.lifecycle.state).toBe('stopped');
    expect(server.lifecycle.readiness.status).toBe(503);

    const events = lines.map((line) => JSON.parse(line).event as string);
    expect(events.filter((event) => event === 'shutdown_started')).toHaveLength(1);
    expect(events.filter((event) => event === 'shutdown_completed')).toHaveLength(1);
    expect(events).not.toContain('shutdown_failed');

    const serializedLogs = lines.join('\n');
    expect(serializedLogs).not.toContain(ALLOWED_ORIGIN);
    expect(serializedLogs.toLowerCase()).not.toContain('reconnectiontoken');

    await expect(fetch(`${server.url}/health`)).rejects.toThrow();
    runningServers.splice(runningServers.indexOf(server), 1);
  }, TEST_TIMEOUT_MS);
});
