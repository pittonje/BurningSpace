import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer, request as httpRequest, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { connect, createServer as createTcpServer, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';

interface SeenRequest {
  kind: 'client' | 'server';
  url: string;
  host?: string;
  origin?: string;
  forwardedHost?: string;
  forwardedProto?: string;
}

class ContractError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'ContractError';
  }
}

const TIMEOUT_MS = 8_000;
const TOKEN_CANARY = 'ops002-reconnect-canary-4f1d2a';
const CLIENT_QUERY_CANARY = 'ops002-client-query-canary-9c7b3e';
const AUTH_CANARY = 'Bearer ops002-authorization-canary-7b2d';
const COOKIE_CANARY = 'ops002-cookie-canary-5e8a';
const ERROR_QUERY_CANARY = 'ops002-error-query-canary-73da';

function fail(code: string, message: string): never { throw new ContractError(code, message); }

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function freePorts(count: number): Promise<number[]> {
  const reservations = Array.from({ length: count }, () => createTcpServer());
  try {
    await Promise.all(reservations.map((server) => new Promise<void>((resolveListen, rejectListen) => {
      server.once('error', rejectListen);
      server.listen(0, '127.0.0.1', resolveListen);
    })));
    return reservations.map((server) => {
      const address = server.address();
      if (!address || typeof address === 'string') fail('PORT', 'Unable to reserve an unprivileged loopback port.');
      return address.port;
    });
  } finally {
    await Promise.all(reservations.map((server) => new Promise<void>((resolveClose) => server.close(() => resolveClose()))));
  }
}

function websocketAccept(key: string): string {
  return createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
}

function decodeClientFrame(frame: Buffer): string {
  if (frame.length < 6 || (frame[1]! & 0x80) === 0) fail('WS_FRAME', 'Upstream received an invalid masked WebSocket frame.');
  const length = frame[1]! & 0x7f;
  if (length >= 126 || frame.length < 6 + length) fail('WS_FRAME', 'Contract check supports only one bounded small WebSocket frame.');
  const mask = frame.subarray(2, 6);
  const payload = Buffer.from(frame.subarray(6, 6 + length));
  for (let index = 0; index < payload.length; index += 1) payload[index] = payload[index]! ^ mask[index % 4]!;
  return payload.toString('utf8');
}

function serverFrame(text: string): Buffer {
  const payload = Buffer.from(text, 'utf8');
  if (payload.length >= 126) fail('WS_FRAME', 'Synthetic WebSocket payload exceeds its bounded frame.');
  return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
}

function clientFrame(text: string): Buffer {
  const payload = Buffer.from(text, 'utf8');
  if (payload.length >= 126) fail('WS_FRAME', 'Synthetic WebSocket payload exceeds its bounded frame.');
  const mask = randomBytes(4);
  const masked = Buffer.alloc(payload.length);
  for (let index = 0; index < payload.length; index += 1) masked[index] = payload[index]! ^ mask[index % 4]!;
  return Buffer.concat([Buffer.from([0x81, 0x80 | payload.length]), mask, masked]);
}

async function startUpstream(kind: 'client' | 'server', port: number, seen: SeenRequest[]): Promise<Server> {
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    const item: SeenRequest = {
      kind,
      url: request.url ?? '',
      host: request.headers.host,
      origin: typeof request.headers.origin === 'string' ? request.headers.origin : undefined,
      forwardedHost: typeof request.headers['x-forwarded-host'] === 'string' ? request.headers['x-forwarded-host'] : undefined,
      forwardedProto: typeof request.headers['x-forwarded-proto'] === 'string' ? request.headers['x-forwarded-proto'] : undefined
    };
    seen.push(item);
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(item));
  });
  server.on('upgrade', (request, socket, head) => {
    if (kind !== 'server') { socket.destroy(); return; }
    const key = request.headers['sec-websocket-key'];
    if (typeof key !== 'string') { socket.destroy(); return; }
    seen.push({
      kind,
      url: request.url ?? '',
      host: request.headers.host,
      origin: typeof request.headers.origin === 'string' ? request.headers.origin : undefined,
      forwardedHost: typeof request.headers['x-forwarded-host'] === 'string' ? request.headers['x-forwarded-host'] : undefined,
      forwardedProto: typeof request.headers['x-forwarded-proto'] === 'string' ? request.headers['x-forwarded-proto'] : undefined
    });
    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${websocketAccept(key)}`,
      '', ''
    ].join('\r\n'));
    let buffered = Buffer.from(head);
    const consume = (chunk: Buffer): void => {
      buffered = Buffer.concat([buffered, chunk]);
      if (buffered.length < 6) return;
      const length = buffered[1]! & 0x7f;
      if (length >= 126 || buffered.length < 6 + length) return;
      const message = decodeClientFrame(buffered);
      socket.end(serverFrame(`echo:${message}`));
    };
    if (head.length > 0) consume(Buffer.alloc(0));
    socket.on('data', consume);
  });
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(port, '127.0.0.1', resolveListen);
  });
  return server;
}

function testCaddyfile(values: {
  adminSocket: string; clientPort: number; serverPort: number;
  clientUpstream: number; serverUpstream: number; logDirectory: string;
}): string {
  const logBlock = (filename: string): string => `
\tlog {
\t\toutput file ${values.logDirectory}/${filename} {
\t\t\troll_size 10MiB
\t\t\troll_keep 3
\t\t\troll_keep_for 72h
\t\t}
\t\tformat filter {
\t\t\twrap json
\t\t\tfields {
\t\t\t\trequest>uri delete
\t\t\t\trequest>headers>Authorization delete
\t\t\t\trequest>headers>Proxy-Authorization delete
\t\t\t\trequest>headers>Cookie delete
\t\t\t}
\t\t}
\t}`;
  const proxy = (upstream: number): string => `
\treverse_proxy 127.0.0.1:${upstream} {
\t\tstream_timeout 24h
\t\tstream_close_delay 5m
\t\ttransport http {
\t\t\tversions 1.1
\t\t\tdial_timeout 5s
\t\t\tresponse_header_timeout 30s
\t\t\tkeepalive 2m
\t\t}
\t}`;
  return `{
\tadmin unix/${values.adminSocket}
\tpersist_config off
\tauto_https off
\tgrace_period 2s
\tlog default {
\t\tformat filter {
\t\t\twrap json
\t\t\tfields {
\t\t\t\trequest>uri delete
\t\t\t\trequest>headers>Authorization delete
\t\t\t\trequest>headers>Proxy-Authorization delete
\t\t\t\trequest>headers>Cookie delete
\t\t\t}
\t\t}
\t}
\tservers {
\t\tprotocols h1 h2
\t\tstrict_sni_host on
\t}
}

http://:${values.clientPort} {
\tbind 127.0.0.1${logBlock('client-access.log')}${proxy(values.clientUpstream)}
}

http://:${values.serverPort} {
\tbind 127.0.0.1${logBlock('server-access.log')}${proxy(values.serverUpstream)}
}
`;
}

function boundedRequest(port: number, path: string, headers: Record<string, string> = {}): Promise<SeenRequest> {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpRequest({ host: '127.0.0.1', port, path, method: 'GET', headers }, (response) => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 65_536) { request.destroy(); rejectRequest(new ContractError('HTTP_SIZE', 'Proxy response exceeded the bounded size.')); return; }
        chunks.push(chunk);
      });
      response.on('end', () => {
        if (response.statusCode !== 200) { rejectRequest(new ContractError('HTTP_STATUS', 'Proxy request did not return HTTP 200.')); return; }
        try { resolveRequest(JSON.parse(Buffer.concat(chunks).toString('utf8')) as SeenRequest); }
        catch {
          const contentLength = response.headers['content-length'] ?? 'absent';
          rejectRequest(new ContractError('HTTP_JSON', `Synthetic upstream returned malformed JSON (${bytes} bytes; status ${response.statusCode}; content-length ${contentLength}).`));
        }
      });
    });
    request.setTimeout(TIMEOUT_MS, () => request.destroy(new ContractError('HTTP_TIMEOUT', 'Proxy request timed out.')));
    request.on('error', rejectRequest);
    request.end();
  });
}

function boundedStatusRequest(port: number, path: string, headers: Record<string, string> = {}): Promise<number> {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpRequest({ host: '127.0.0.1', port, path, method: 'GET', headers }, (response) => {
      response.resume();
      response.on('end', () => resolveRequest(response.statusCode ?? 0));
    });
    request.setTimeout(TIMEOUT_MS, () => request.destroy(new ContractError('HTTP_TIMEOUT', 'Proxy failure request timed out.')));
    request.on('error', rejectRequest);
    request.end();
  });
}

function websocketRoundTrip(port: number): Promise<{ response: string; requestHeaders: string }> {
  return new Promise((resolveSocket, rejectSocket) => {
    const socket = connect({ host: '127.0.0.1', port });
    const key = randomBytes(16).toString('base64');
    const path = `/battle?reconnectionToken=${TOKEN_CANARY}&other=unchanged`;
    let headers = '';
    let upgraded = false;
    let frame = Buffer.alloc(0);
    const timer = setTimeout(() => finish(new ContractError('WS_TIMEOUT', 'WebSocket proxy check timed out.')), TIMEOUT_MS);
    const finish = (error?: Error, value?: { response: string; requestHeaders: string }): void => {
      clearTimeout(timer);
      socket.destroy();
      if (error) rejectSocket(error); else if (value) resolveSocket(value);
    };
    socket.once('connect', () => {
      socket.write([
        `GET ${path} HTTP/1.1`,
        'Host: arena-api.example.invalid',
        'Origin: https://arena.example.invalid',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        `Authorization: ${AUTH_CANARY}`,
        `Cookie: session=${COOKIE_CANARY}`,
        '', ''
      ].join('\r\n'));
    });
    socket.on('data', (chunk: Buffer) => {
      if (!upgraded) {
        headers += chunk.toString('latin1');
        const boundary = headers.indexOf('\r\n\r\n');
        if (boundary < 0) return;
        if (!headers.startsWith('HTTP/1.1 101')) { finish(new ContractError('WS_UPGRADE', 'Caddy did not complete the WebSocket upgrade.')); return; }
        upgraded = true;
        const remaining = Buffer.from(headers.slice(boundary + 4), 'latin1');
        headers = headers.slice(0, boundary + 4);
        frame = Buffer.concat([frame, remaining]);
        socket.write(clientFrame('ping'));
      } else {
        frame = Buffer.concat([frame, chunk]);
      }
      if (frame.length < 2) return;
      const length = frame[1]! & 0x7f;
      if (length >= 126 || frame.length < 2 + length) return;
      const response = frame.subarray(2, 2 + length).toString('utf8');
      finish(undefined, { response, requestHeaders: headers });
    });
    socket.on('error', (error) => finish(error));
  });
}

async function waitForCaddy(port: number): Promise<void> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    try { await boundedRequest(port, '/startup'); return; }
    catch { await delay(50); }
  }
  fail('CADDY_START', 'Temporary Caddy did not become ready within the bounded timeout.');
}

async function closeServer(server: Server | undefined): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
}

async function stopProcess(process: ChildProcessWithoutNullStreams | undefined): Promise<void> {
  if (!process || process.exitCode !== null) return;
  process.kill('SIGTERM');
  await Promise.race([
    new Promise<void>((resolveExit) => process.once('exit', () => resolveExit())),
    delay(5_000).then(() => { if (process.exitCode === null) process.kill('SIGKILL'); })
  ]);
}

async function assertTcpClosed(host: string, port: number): Promise<void> {
  await new Promise<void>((resolveCheck, rejectCheck) => {
    const socket = connect({ host, port });
    const timer = setTimeout(() => { socket.destroy(); resolveCheck(); }, 500);
    socket.once('connect', () => { clearTimeout(timer); socket.destroy(); rejectCheck(new ContractError('ADMIN_TCP', 'A forbidden TCP Caddy admin listener was reachable.')); });
    socket.once('error', () => { clearTimeout(timer); resolveCheck(); });
  });
}

function assertNoAdminTcpListener(): void {
  const listeners = spawnSync('ss', ['-H', '-ltn'], { encoding: 'utf8', timeout: TIMEOUT_MS });
  if (listeners.status !== 0) fail('ADMIN_TCP_INSPECTION', 'Linux listener inspection with ss failed.');
  if (listeners.stdout.split(/\r?\n/u).some((line) => /(?:^|\s)\S*:2019(?:\s|$)/u.test(line))) {
    fail('ADMIN_TCP', 'Live listener state retained a forbidden TCP admin listener on port 2019.');
  }
}

function assertUnrelatedUserDenied(socketPath: string): void {
  const script = [
    "const { connect } = require('node:net');",
    "if (typeof process.geteuid !== 'function') process.exit(3);",
    'const socket = connect(process.argv[1]);',
    'const timer = setTimeout(() => { socket.destroy(); process.exit(2); }, 1500);',
    "socket.once('connect', () => { clearTimeout(timer); socket.destroy(); process.exit(0); });",
    "socket.once('error', (error) => { clearTimeout(timer); process.stdout.write(`DENIED:${error.code}`); process.exit(error.code === 'EACCES' ? 13 : 12); });"
  ].join('');
  const denied = spawnSync('sudo', ['-n', '-u', 'nobody', '--', process.execPath, '-e', script, socketPath], {
    encoding: 'utf8', timeout: TIMEOUT_MS
  });
  if (denied.status !== 13 || denied.stdout !== 'DENIED:EACCES' || denied.error) {
    fail('ADMIN_USER_ACCESS', 'A distinct unprivileged Linux user was not proven denied by socket-directory permissions.');
  }
}

async function runRuntime(binary: string): Promise<Record<string, boolean>> {
  const exactBinary = resolve(binary);
  if (!existsSync(exactBinary)) fail('CADDY_BINARY', 'The supplied Caddy binary does not exist.');
  const version = spawnSync(exactBinary, ['version'], { encoding: 'utf8', windowsHide: true });
  if (version.status !== 0 || !version.stdout.startsWith('v2.11.4 ')) fail('CADDY_VERSION', 'Runtime contract check requires exact Caddy v2.11.4.');

  const work = mkdtempSync(join(tmpdir(), 'burningspace-caddy-contract-'));
  chmodSync(work, 0o700);
  const configPath = join(work, 'Caddyfile');
  const adminSocket = join(work, 'burningspace-admin.sock').replaceAll('\\', '/');
  const adminAddress = `unix/${adminSocket}`;
  const seen: SeenRequest[] = [];
  let clientUpstream: Server | undefined;
  let serverUpstream: Server | undefined;
  let caddy: ChildProcessWithoutNullStreams | undefined;
  let stdout = '';
  let stderr = '';
  try {
    const [clientPort, serverPort, clientUpstreamPort, serverUpstreamPort] = await freePorts(4);
    const ports = {
      adminSocket, clientPort: clientPort!, serverPort: serverPort!,
      clientUpstream: clientUpstreamPort!, serverUpstream: serverUpstreamPort!, logDirectory: work.replaceAll('\\', '/')
    };
    clientUpstream = await startUpstream('client', ports.clientUpstream, seen);
    serverUpstream = await startUpstream('server', ports.serverUpstream, seen);
    writeFileSync(configPath, testCaddyfile(ports), { encoding: 'utf8', mode: 0o600 });
    const formatted = spawnSync(exactBinary, ['fmt', '--overwrite', configPath], { encoding: 'utf8', windowsHide: true });
    if (formatted.status !== 0) fail('CADDY_VALIDATION', 'Temporary Caddy configuration could not be formatted.');
    for (const command of [['fmt', '--diff', configPath], ['adapt', '--config', configPath, '--adapter', 'caddyfile'], ['validate', '--config', configPath, '--adapter', 'caddyfile']]) {
      const result = spawnSync(exactBinary, command, { encoding: 'utf8', windowsHide: true });
      const changed = command[0] === 'fmt' && result.stdout.split(/\r?\n/u).some((line) => /^[+-]/u.test(line));
      if (result.status !== 0 || changed) fail('CADDY_VALIDATION', 'Temporary Caddy configuration failed format, adapt, or validate.');
    }
    const previousUmask = process.umask(0o077);
    try {
      caddy = spawn(exactBinary, ['run', '--config', configPath, '--adapter', 'caddyfile'], { stdio: 'pipe', windowsHide: true });
    } finally {
      process.umask(previousUmask);
    }
    caddy.stdout.setEncoding('utf8');
    caddy.stderr.setEncoding('utf8');
    caddy.stdout.on('data', (chunk: string) => { stdout = `${stdout}${chunk}`.slice(-65_536); });
    caddy.stderr.on('data', (chunk: string) => { stderr = `${stderr}${chunk}`.slice(-65_536); });
    await waitForCaddy(ports.clientPort);
    if (!existsSync(adminSocket) || !lstatSync(adminSocket).isSocket()) fail('ADMIN_SOCKET', 'Caddy did not create the configured Unix admin socket.');
    const directory = statSync(work);
    const socket = statSync(adminSocket);
    if ((directory.mode & 0o777) !== 0o700) fail('ADMIN_DIRECTORY_MODE', 'Temporary admin socket directory was not private mode 0700.');
    if ((socket.mode & 0o077) !== 0 || socket.uid !== process.geteuid?.()) fail('ADMIN_SOCKET_MODE', 'Admin socket ownership or mode was not service-only.');
    await assertTcpClosed('127.0.0.1', 2019);
    await assertTcpClosed('::1', 2019);
    assertNoAdminTcpListener();
    assertUnrelatedUserDenied(adminSocket);

    const client = await boundedRequest(ports.clientPort, `/index.html?canary=${CLIENT_QUERY_CANARY}`, {
      Host: 'arena.example.invalid', Authorization: AUTH_CANARY, Cookie: `session=${COOKIE_CANARY}`
    });
    const exactOrigin = await boundedRequest(ports.serverPort, `/health?reconnectionToken=${TOKEN_CANARY}`, {
      Host: 'arena-api.example.invalid', Origin: 'https://arena.example.invalid', Authorization: AUTH_CANARY,
      'Proxy-Authorization': AUTH_CANARY, Cookie: `session=${COOKIE_CANARY}`
    });
    const hostileOrigin = await boundedRequest(ports.serverPort, '/hostile', {
      Host: 'arena-api.example.invalid', Origin: 'https://hostile.example.invalid'
    });
    const absentOrigin = await boundedRequest(ports.serverPort, '/absent', { Host: 'arena-api.example.invalid' });
    const websocket = await websocketRoundTrip(ports.serverPort);
    const expectedWebSocketQuery = `/battle?reconnectionToken=${TOKEN_CANARY}&other=unchanged`;
    const wsSeen = seen.find((entry) => entry.url === expectedWebSocketQuery);
    if (!wsSeen) fail('QUERY_PASS', 'WebSocket query did not reach the server upstream unchanged.');
    if (client.kind !== 'client' || exactOrigin.kind !== 'server') fail('ROUTING', 'Client/server edge routing crossed upstreams.');
    if (exactOrigin.origin !== 'https://arena.example.invalid' || hostileOrigin.origin !== 'https://hostile.example.invalid' || absentOrigin.origin !== undefined) {
      fail('ORIGIN', 'Exact, hostile, or absent Origin was not preserved unchanged.');
    }
    if (exactOrigin.host !== 'arena-api.example.invalid' || exactOrigin.forwardedHost !== 'arena-api.example.invalid' || exactOrigin.forwardedProto !== 'http') {
      fail('FORWARDED_HEADERS', 'Public Host or forwarded protocol metadata was incoherent at the upstream.');
    }
    if (websocket.response !== 'echo:ping') fail('WS_TRAFFIC', 'Bidirectional WebSocket traffic did not pass through Caddy.');
    await closeServer(serverUpstream);
    serverUpstream = undefined;
    const failureStatus = await boundedStatusRequest(
      ports.serverPort,
      `/battle?reconnectionToken=${ERROR_QUERY_CANARY}`,
      { Host: 'arena-api.example.invalid', Authorization: AUTH_CANARY, Cookie: `session=${COOKIE_CANARY}` }
    );
    if (failureStatus !== 502) fail('ERROR_PATH', 'Unavailable upstream did not exercise the expected Caddy error path.');
    await delay(100);

    const reloadValidation = spawnSync(exactBinary, ['validate', '--config', configPath, '--adapter', 'caddyfile'], { encoding: 'utf8', windowsHide: true });
    if (reloadValidation.status !== 0) fail('RELOAD_VALIDATE', 'Reload-time validation failed without external services.');
    serverUpstream = await startUpstream('server', ports.serverUpstream, seen);
    const reload = spawnSync(exactBinary, ['reload', '--config', configPath, '--force', '--address', adminAddress], {
      encoding: 'utf8', windowsHide: true, timeout: TIMEOUT_MS
    });
    if (reload.status !== 0) fail('ADMIN_RELOAD', 'Caddy reload through the Unix admin socket failed.');
    const postReloadClient = await boundedRequest(ports.clientPort, '/post-reload-client', { Host: 'arena.example.invalid' });
    const postReloadServer = await boundedRequest(ports.serverPort, '/post-reload-server', {
      Host: 'arena-api.example.invalid', Origin: 'https://arena.example.invalid'
    });
    if (postReloadClient.kind !== 'client' || postReloadServer.kind !== 'server' || postReloadServer.origin !== 'https://arena.example.invalid') {
      fail('POST_RELOAD', 'Routing or Origin preservation was incoherent after Unix-socket reload.');
    }
    await stopProcess(caddy);
    caddy = undefined;
    await delay(100);
    if (existsSync(adminSocket)) rmSync(adminSocket, { force: true });
    if (existsSync(adminSocket)) fail('ADMIN_SOCKET_CLEANUP', 'Admin socket cleanup after process termination failed.');
    const clientLog = readFileSync(join(work, 'client-access.log'), 'utf8');
    const serverLog = readFileSync(join(work, 'server-access.log'), 'utf8');
    const allRuntimeOutput = `${clientLog}\n${serverLog}\n${stdout}\n${stderr}`;
    for (const canary of [TOKEN_CANARY, CLIENT_QUERY_CANARY, ERROR_QUERY_CANARY, AUTH_CANARY, COOKIE_CANARY]) {
      if (allRuntimeOutput.includes(canary)) fail('LOG_LEAK', 'A seeded query or credential canary appeared in edge output.');
    }
    for (const line of serverLog.trim().split(/\r?\n/u).filter(Boolean)) {
      const entry = JSON.parse(line) as Record<string, unknown>;
      const request = entry.request as Record<string, unknown> | undefined;
      if (request && Object.hasOwn(request, 'uri')) fail('LOG_URI', 'Server access log retained the complete request URI.');
    }
    return {
      clientRouting: true, serverRouting: true, exactOrigin: true, hostileOrigin: true,
      absentOrigin: true, hostCoherent: true, forwardedProtoCoherent: true, webSocketUpgrade: true,
      bidirectionalWebSocket: true, queryPassThrough: true, tokenLogSafe: true,
      authorizationLogSafe: true, cookieLogSafe: true, routeSeparation: true,
      adminSocketCreated: true, adminSocketDirectoryPrivate: true, adminSocketServiceOnly: true,
      adminTcpListenerAbsent: true, unrelatedUserDenied: true, unixSocketReload: true,
      postReloadClientRouting: true, postReloadServerRouting: true,
      errorLogSafe: true, reloadValidationOffline: true, socketCleanup: true, cleanupBounded: true
    };
  } finally {
    await stopProcess(caddy);
    await closeServer(clientUpstream);
    await closeServer(serverUpstream);
    rmSync(work, { recursive: true, force: true });
  }
}

function safeError(error: unknown): { code: string; message: string } {
  if (error instanceof ContractError) return { code: error.code, message: error.message.slice(0, 300) };
  return { code: 'UNEXPECTED', message: 'Unexpected bounded edge-contract failure.' };
}

async function main(): Promise<void> {
  if (!process.argv.slice(2).includes('--self-test')) fail('MODE', 'The edge contract check requires --self-test.');
  if (decodeClientFrame(clientFrame('self-test')) !== 'self-test' || serverFrame('ok').subarray(2).toString('utf8') !== 'ok') {
    fail('SELF_TEST', 'Deterministic WebSocket frame self-test failed.');
  }
  const binary = process.env.BURNINGSPACE_CADDY_BINARY;
  if (!binary) {
    console.log(JSON.stringify({
      ok: true, event: 'external_staging_edge_contract_self_tested', tests: 2,
      runtimeExecuted: false, reason: 'CADDY_BINARY_UNAVAILABLE', cleanupBounded: true
    }));
    return;
  }
  if (process.platform === 'win32') {
    console.log(JSON.stringify({
      ok: true, event: 'external_staging_edge_contract_self_tested', tests: 2,
      runtimeExecuted: false, reason: 'UNIX_ADMIN_RUNTIME_REQUIRES_LINUX', cleanupBounded: true
    }));
    return;
  }
  const checks = await runRuntime(binary);
  console.log(JSON.stringify({
    ok: true, event: 'external_staging_edge_contract_self_tested', tests: 28,
    runtimeExecuted: true, caddyVersion: '2.11.4', checks
  }));
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ ok: false, event: 'external_staging_edge_contract_failed', error: safeError(error) }));
  process.exitCode = 1;
});
