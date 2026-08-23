import { randomBytes } from 'node:crypto';
import { connect as connectTcp, type Socket } from 'node:net';
import { connect as connectTls, type TLSSocket } from 'node:tls';
import type { MapSchema } from '@colyseus/schema';
import { Client, Room } from 'colyseus.js';
import {
  ProfileClientMessages,
  ProfileServerMessages,
  type ProfileAcceptedMessage
} from '@burningspace/protocol';
import { ClientMessages, type PlayerInputMessage } from '@burningspace/shared';

interface SmokeEnvironment {
  BURNINGSPACE_EXTERNAL_SMOKE_CLIENT_ORIGIN?: string;
  BURNINGSPACE_EXTERNAL_SMOKE_SERVER_ORIGIN?: string;
  BURNINGSPACE_EXTERNAL_SMOKE_ALLOWED_ORIGIN?: string;
  BURNINGSPACE_EXTERNAL_SMOKE_HOSTILE_ORIGIN?: string;
  BURNINGSPACE_EXTERNAL_SMOKE_ALLOW_LOOPBACK_HTTP?: string;
  BURNINGSPACE_EXTERNAL_SMOKE_TIMEOUT_MS?: string;
}

interface ParticipantSchema { profileReady: boolean; }
interface ShipSchema { ownerSessionId: string; x: number; y: number; lastProcessedInput: number; }
interface BattleStateSchema {
  participants: MapSchema<ParticipantSchema, string>;
  ships: MapSchema<ShipSchema, string>;
}

const MAX_RESPONSE_BYTES = 65_536;

class SmokeError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'SmokeError';
  }
}

class QuietSmokeClient extends Client {
  protected override createRoom<T = unknown>(roomName: string): Room<T> {
    const room = new Room<T>(roomName);
    room.onMessage('*', () => undefined);
    return room;
  }
}

function fail(code: string, message: string): never { throw new SmokeError(code, message); }

function exactOrigin(raw: string | undefined, name: string): URL {
  if (!raw || raw.length > 300 || /\s|[\\\u0000-\u001f\u007f]/u.test(raw)) {
    fail('ORIGIN_INPUT', `${name} must be a bounded exact HTTP or HTTPS origin.`);
  }
  let url: URL;
  try { url = new URL(raw); } catch { fail('ORIGIN_INPUT', `${name} is malformed.`); }
  if (
    !['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
    url.pathname !== '/' || url.search || url.hash || raw.endsWith('/')
  ) fail('ORIGIN_INPUT', `${name} must not contain credentials, path, query, or fragment.`);
  return url;
}

function isLoopback(url: URL): boolean {
  return url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]';
}

function parseTimeout(raw: string | undefined): number {
  const value = raw === undefined ? 15_000 : Number(raw);
  if (!Number.isInteger(value) || value < 1_000 || value > 60_000) {
    fail('TIMEOUT_INPUT', 'Smoke timeout must be an integer from 1000 through 60000 milliseconds.');
  }
  return value;
}

function requireTransportSafety(client: URL, server: URL, allowLoopbackHttp: boolean): void {
  const usesHttp = client.protocol === 'http:' || server.protocol === 'http:';
  if (!usesHttp) return;
  if (!allowLoopbackHttp || !isLoopback(client) || !isLoopback(server)) {
    fail('TLS_REQUIRED', 'HTTP is permitted only by explicit override when both targets are loopback.');
  }
}

async function boundedFetch(url: URL, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    fail('HTTP_NETWORK', 'A required HTTP request failed before a valid bounded response was received.');
  }
}

async function boundedText(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    fail('HTTP_SIZE', 'A required HTTP response exceeded the bounded size.');
  }
  const text = await response.text();
  if (text.length > MAX_RESPONSE_BYTES) fail('HTTP_SIZE', 'A required HTTP response exceeded the bounded size.');
  return text;
}

async function checkClient(clientOrigin: URL, timeoutMs: number): Promise<void> {
  const root = await boundedFetch(new URL('/', clientOrigin), timeoutMs);
  if (root.status !== 200) fail('CLIENT_ROOT', 'Client root did not return HTTP 200.');
  await boundedText(root);
  const index = await boundedFetch(new URL('/index.html', clientOrigin), timeoutMs);
  if (index.status !== 200) fail('CLIENT_INDEX', 'Client index did not return HTTP 200.');
  const html = await boundedText(index);
  const match = html.match(/(?:src|href)=["'](\/assets\/index-[A-Za-z0-9_-]+\.(?:js|css))["']/u);
  if (!match) fail('CLIENT_ASSET', 'Client index did not reference a fingerprinted entry asset.');
  const asset = await boundedFetch(new URL(match[1]!, clientOrigin), timeoutMs);
  if (asset.status !== 200) fail('CLIENT_ASSET', 'Fingerprinted client entry asset did not return HTTP 200.');
  await asset.body?.cancel();
}

async function checkJsonEndpoint(serverOrigin: URL, path: '/health' | '/ready', timeoutMs: number): Promise<void> {
  const response = await boundedFetch(new URL(path, serverOrigin), timeoutMs);
  if (response.status !== 200) fail('SERVER_ENDPOINT', 'A required server endpoint did not return HTTP 200.');
  let body: Record<string, unknown>;
  try { body = JSON.parse(await boundedText(response)) as Record<string, unknown>; }
  catch { fail('SERVER_ENDPOINT', 'A required server endpoint returned invalid JSON.'); }
  if (body.ok !== true || body.service !== 'burningspace-server' || (path === '/ready' && body.ready !== true)) {
    fail('SERVER_ENDPOINT', 'A required server endpoint returned an unexpected bounded shape.');
  }
}

async function checkHostileMatchmaking(serverOrigin: URL, hostileOrigin: string): Promise<void> {
  const client = new QuietSmokeClient(serverOrigin.origin, { headers: { Origin: hostileOrigin } });
  let room: Room<BattleStateSchema> | undefined;
  try { room = await client.joinOrCreate<BattleStateSchema>('battle'); }
  catch { return; }
  finally { if (room?.connection.isOpen) await room.leave(true).catch(() => undefined); }
  fail('HOSTILE_MATCHMAKING', 'Hostile Origin unexpectedly passed matchmaking.');
}

function rawHostileWebSocketProbe(serverOrigin: URL, hostileOrigin: string, timeoutMs: number): Promise<void> {
  return new Promise((resolveProbe, rejectProbe) => {
    const secure = serverOrigin.protocol === 'https:';
    const port = Number(serverOrigin.port || (secure ? 443 : 80));
    let socket: Socket | TLSSocket;
    let response = '';
    let settled = false;
    const finish = (error?: SmokeError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      error ? rejectProbe(error) : resolveProbe();
    };
    const onConnected = () => {
      const host = serverOrigin.port ? `${serverOrigin.hostname}:${serverOrigin.port}` : serverOrigin.hostname;
      socket.write([
        'GET / HTTP/1.1',
        `Host: ${host}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${randomBytes(16).toString('base64')}`,
        'Sec-WebSocket-Version: 13',
        `Origin: ${hostileOrigin}`,
        '', ''
      ].join('\r\n'));
    };
    socket = secure
      ? connectTls({ host: serverOrigin.hostname, port, servername: serverOrigin.hostname, rejectUnauthorized: true }, onConnected)
      : connectTcp({ host: serverOrigin.hostname, port }, onConnected);
    const timer = setTimeout(() => finish(new SmokeError('RAW_WS_TIMEOUT', 'Hostile raw WebSocket probe timed out.')), timeoutMs);
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      response += chunk;
      if (response.length > 4096) return finish(new SmokeError('RAW_WS_RESPONSE', 'Raw WebSocket response exceeded the bounded header size.'));
      const end = response.indexOf('\r\n');
      if (end < 0) return;
      const match = /^HTTP\/1\.[01] (\d{3})\b/u.exec(response.slice(0, end));
      if (!match) return finish(new SmokeError('RAW_WS_RESPONSE', 'Raw WebSocket probe received a malformed HTTP response.'));
      const status = Number(match[1]);
      if (status !== 403) return finish(new SmokeError('RAW_WS_STATUS', 'Hostile raw WebSocket upgrade did not receive the expected HTTP 403 rejection.'));
      finish();
    });
    socket.on('error', () => finish(new SmokeError(secure ? 'RAW_WS_TLS_OR_NETWORK' : 'RAW_WS_NETWORK', 'Raw WebSocket probe failed before an HTTP rejection was received.')));
    socket.on('close', () => {
      if (!settled) finish(new SmokeError('RAW_WS_CLOSED', 'Raw WebSocket probe closed without the expected HTTP rejection.'));
    });
  });
}

function delay(ms: number): Promise<void> { return new Promise((resolveDelay) => setTimeout(resolveDelay, ms)); }

function withTimeout<T>(operation: Promise<T>, timeoutMs: number, code: string, message: string): Promise<T> {
  return new Promise((resolveOperation, rejectOperation) => {
    const timer = setTimeout(() => rejectOperation(new SmokeError(code, message)), timeoutMs);
    operation.then(
      (value) => { clearTimeout(timer); resolveOperation(value); },
      (error: unknown) => { clearTimeout(timer); rejectOperation(error); }
    );
  });
}

async function waitFor(condition: () => boolean, label: string, timeoutMs: number): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (condition()) return;
    await delay(25);
  }
  fail('GAMEPLAY_TIMEOUT', `Timed out waiting for ${label}.`);
}

function input(sequence: number, right: boolean): PlayerInputMessage {
  return { up: false, down: false, left: false, right, aimAngle: 0, shooting: false, sequence };
}

function ownerCount(room: Room<BattleStateSchema>, sessionId: string): number {
  return Array.from(room.state.ships.values()).filter((ship) => ship.ownerSessionId === sessionId).length;
}

async function checkGameplayAndReconnect(serverOrigin: URL, allowedOrigin: string, timeoutMs: number): Promise<void> {
  const client = new QuietSmokeClient(serverOrigin.origin, { headers: { Origin: allowedOrigin } });
  let room: Room<BattleStateSchema> | undefined;
  let reconnected: Room<BattleStateSchema> | undefined;
  try {
    room = await client.joinOrCreate<BattleStateSchema>('battle');
    const accepted: ProfileAcceptedMessage[] = [];
    room.onMessage<ProfileAcceptedMessage>(ProfileServerMessages.PROFILE_ACCEPTED, (message) => accepted.push(message));
    room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'ExternalSmoke', mode: 'player', faction: 'red' });
    await waitFor(() => Boolean(
      room && accepted.length === 1 && room.state.participants.get(room.sessionId)?.profileReady === true &&
      room.state.ships.has(room.sessionId)
    ), 'authoritative participant and ship replication', timeoutMs);

    const sessionId = room.sessionId;
    const roomId = room.roomId;
    const token = room.reconnectionToken;
    const participantCount = room.state.participants.size;
    const shipCount = room.state.ships.size;
    const ship = room.state.ships.get(sessionId);
    if (!ship || ship.ownerSessionId !== sessionId || ownerCount(room, sessionId) !== 1) {
      fail('OWNERSHIP', 'Authoritative owned ship state was incoherent before reconnect.');
    }
    const startX = ship.x;
    const startY = ship.y;
    for (let sequence = 1; sequence <= 8; sequence += 1) {
      room.send(ClientMessages.PLAYER_INPUT, input(sequence, true));
      await delay(50);
    }
    room.send(ClientMessages.PLAYER_INPUT, input(9, false));
    await waitFor(() => {
      const current = room?.state.ships.get(sessionId);
      return Boolean(current && current.lastProcessedInput >= 8 && Math.hypot(current.x - startX, current.y - startY) > 5);
    }, 'authoritative movement', timeoutMs);
    const beforeReconnect = room.state.ships.get(sessionId);
    if (!beforeReconnect) fail('OWNERSHIP', 'Owned ship disappeared before reconnect.');

    await room.leave(false);
    room = undefined;
    reconnected = await withTimeout(
      client.reconnect<BattleStateSchema>(token),
      timeoutMs,
      'RECONNECT_TIMEOUT',
      'The real reconnect call timed out.'
    );
    if (reconnected.sessionId !== sessionId || reconnected.roomId !== roomId) {
      fail('RECONNECT_SESSION', 'Reconnect did not retain the original session and room ownership.');
    }
    await waitFor(() => Boolean(
      reconnected?.state?.participants?.has(sessionId) && reconnected.state.ships?.has(sessionId)
    ), 'reconnected authoritative state', timeoutMs);
    const afterReconnect = reconnected.state.ships.get(sessionId);
    if (!afterReconnect || ownerCount(reconnected, sessionId) !== 1 ||
        reconnected.state.participants.size !== participantCount || reconnected.state.ships.size !== shipCount) {
      fail('RECONNECT_DUPLICATE', 'Reconnect changed participant/ship cardinality or duplicated ownership.');
    }
    if (Math.hypot(afterReconnect.x - beforeReconnect.x, afterReconnect.y - beforeReconnect.y) > 100) {
      fail('RECONNECT_CONTINUITY', 'Owned ship continuity was incoherent after reconnect.');
    }
    await reconnected.leave(true);
    reconnected = undefined;
  } finally {
    if (room?.connection.isOpen) await room.leave(true).catch(() => undefined);
    if (reconnected?.connection.isOpen) await reconnected.leave(true).catch(() => undefined);
  }
}

function safeError(error: unknown): { code: string; message: string } {
  if (error instanceof SmokeError) return { code: error.code, message: error.message.slice(0, 300) };
  const diagnostic = error instanceof Error ? error.message : 'Unexpected external smoke failure.';
  const redacted = diagnostic
    .replace(/\b[A-Za-z0-9_-]{8,}:[A-Za-z0-9_-]{8,}\b/gu, '[redacted-token]')
    .replace(/https?:\/\/[^\s]+/gu, '[redacted-origin]')
    .replace(/[\r\n\t]+/gu, ' ')
    .slice(0, 300);
  return { code: 'UNEXPECTED', message: redacted || 'Unexpected bounded external smoke failure.' };
}

async function run(environment: SmokeEnvironment): Promise<void> {
  const startedAt = Date.now();
  const client = exactOrigin(environment.BURNINGSPACE_EXTERNAL_SMOKE_CLIENT_ORIGIN, 'client origin');
  const server = exactOrigin(environment.BURNINGSPACE_EXTERNAL_SMOKE_SERVER_ORIGIN, 'server origin');
  const allowed = exactOrigin(environment.BURNINGSPACE_EXTERNAL_SMOKE_ALLOWED_ORIGIN, 'allowed browser Origin');
  const hostile = exactOrigin(environment.BURNINGSPACE_EXTERNAL_SMOKE_HOSTILE_ORIGIN, 'hostile Origin');
  const allowLoopbackHttp = environment.BURNINGSPACE_EXTERNAL_SMOKE_ALLOW_LOOPBACK_HTTP === 'true';
  requireTransportSafety(client, server, allowLoopbackHttp);
  if ((!allowLoopbackHttp && allowed.origin !== client.origin) || hostile.origin === allowed.origin) {
    fail('ORIGIN_CONTRACT', 'External allowed Origin must equal the client origin and hostile Origin must differ.');
  }
  const timeoutMs = parseTimeout(environment.BURNINGSPACE_EXTERNAL_SMOKE_TIMEOUT_MS);

  await checkClient(client, timeoutMs);
  await checkJsonEndpoint(server, '/health', timeoutMs);
  await checkJsonEndpoint(server, '/ready', timeoutMs);
  await checkHostileMatchmaking(server, hostile.origin);
  await rawHostileWebSocketProbe(server, hostile.origin, timeoutMs);
  await checkGameplayAndReconnect(server, allowed.origin, timeoutMs);

  console.log(JSON.stringify({
    ok: true,
    event: 'external_staging_smoke_completed',
    checks: {
      clientRoot: true, index: true, staticAsset: true, health: true, readiness: true,
      hostileMatchmakingRejected: true, hostileRawWebSocketRejected: true,
      allowedMatchmaking: true, participantReplication: true, shipReplication: true,
      authoritativeMovement: true, reconnectCallSucceeded: true, sameSession: true,
      shipContinuity: true, noDuplicateParticipantPlayer: true, noDuplicateShip: true,
      noDuplicateParticipantOrShip: true, intentionalLeave: true
    },
    tlsRequiredForExternal: true,
    loopbackHttpOverride: allowLoopbackHttp,
    reconnectTokenPrinted: false,
    durationMs: Date.now() - startedAt
  }));
}

run(process.env).catch((error: unknown) => {
  console.error(JSON.stringify({ ok: false, event: 'external_staging_smoke_failed', error: safeError(error) }));
  process.exitCode = 1;
});
