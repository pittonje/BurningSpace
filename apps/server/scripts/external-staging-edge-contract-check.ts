import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer, request as httpRequest, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { connect, createServer as createTcpServer, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';

interface SeenRequest {
  kind: 'client' | 'server';
  url: string;
  host?: string;
  origin?: string;
  forwardedHost?: string;
  forwardedProto?: string;
  /** PERSIST002-NET-02: exactly what the upstream observed, never what the client sent. */
  edgePeer?: string | string[];
  edgePeerCount?: number;
  /**
   * PA FIX2: whether the upstream's observed proof matched the operator
   * value, and how many proof headers arrived. The proof VALUE is
   * deliberately never stored here and never printed.
   */
  edgeProofMatches?: boolean;
  edgeProofCount?: number;
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
const EDGE_PEER_HEADER = 'x-burningspace-edge-peer';
const EDGE_PROOF_HEADER = 'x-burningspace-edge-proof';
/** What a hostile public client tries to make the upstream believe. */
const EDGE_PEER_SPOOF = '198.51.100.66';
/** What Caddy's own {remote_host} must produce for a loopback client instead. */
const EDGE_PEER_EXPECTED = '127.0.0.1';
/**
 * PA FIX2: a DISPOSABLE 32-byte edge secret, generated fresh in this process
 * for this run only. It is never persisted, never committed and never
 * printed -- only the boolean "the upstream observed exactly this" is.
 */
const EDGE_PROOF_SECRET = randomBytes(32).toString('base64url');
/** A hostile client's own attempt at a proof. Never the operator value. */
const EDGE_PROOF_SPOOF = 'A'.repeat(43);
/**
 * PA FIX3-A: the operator hop's secret reaches Caddy exactly the way the real
 * unit does -- as a systemd CREDENTIAL file, never as service environment.
 * The real service credential lives at
 * /run/credentials/caddy.service/burningspace-edge-assertion-secret; this
 * disposable proof environment creates that exact path, read-only, holding
 * exactly the 43 secret bytes with no trailing newline.
 *
 * The secret is deliberately NOT exported into this process's environment,
 * so no child Caddy (`adapt`, `validate`, `run`, `reload`) can ever see it
 * as a variable.
 */
const EDGE_CREDENTIAL_ID = 'burningspace-edge-assertion-secret';
const EDGE_CREDENTIAL_RUNTIME_PATH = `/run/credentials/caddy.service/${EDGE_CREDENTIAL_ID}`;
const EDGE_PROOF_SOURCE_PLACEHOLDER = `{file.${EDGE_CREDENTIAL_RUNTIME_PATH}}`;

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

function observedEdgeHeaders(request: IncomingMessage): Pick<
  SeenRequest,
  'edgePeer' | 'edgePeerCount' | 'edgeProofMatches' | 'edgeProofCount'
> {
  const raw = request.rawHeaders;
  let peerCount = 0;
  let proofCount = 0;
  for (let index = 0; index + 1 < raw.length; index += 2) {
    const name = raw[index]!.toLowerCase();
    if (name === EDGE_PEER_HEADER) peerCount += 1;
    if (name === EDGE_PROOF_HEADER) proofCount += 1;
  }
  const proof = request.headers[EDGE_PROOF_HEADER];
  return {
    edgePeer: request.headers[EDGE_PEER_HEADER],
    edgePeerCount: peerCount,
    // Only the comparison result is retained: the proof value itself never
    // enters a record that could be logged or printed.
    edgeProofMatches: typeof proof === 'string' && proof === EDGE_PROOF_SECRET,
    edgeProofCount: proofCount
  };
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
      forwardedProto: typeof request.headers['x-forwarded-proto'] === 'string' ? request.headers['x-forwarded-proto'] : undefined,
      ...observedEdgeHeaders(request)
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
      forwardedProto: typeof request.headers['x-forwarded-proto'] === 'string' ? request.headers['x-forwarded-proto'] : undefined,
      ...observedEdgeHeaders(request)
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
  const proxy = (upstream: number, edgePeer: 'set' | 'remove'): string => {
    // PA FIX2: the real template's per-route contract, reproduced exactly --
    // the server route SETs both internal headers, the client route REMOVEs
    // both. The proof value reaches Caddy ONLY as a systemd credential file,
    // read at request time through {file.*} -- never through its environment.
    const directives = edgePeer === 'set'
      ? `header_up X-BurningSpace-Edge-Peer {remote_host}
		header_up X-BurningSpace-Edge-Proof ${EDGE_PROOF_SOURCE_PLACEHOLDER}`
      : 'header_up -X-BurningSpace-Edge-Peer\n\t\theader_up -X-BurningSpace-Edge-Proof';
    return `
\treverse_proxy 127.0.0.1:${upstream} {
\t\t${directives}
\t\tstream_timeout 24h
\t\tstream_close_delay 5m
\t\ttransport http {
\t\t\tversions 1.1
\t\t\tdial_timeout 5s
\t\t\tresponse_header_timeout 30s
\t\t\tkeepalive 2m
\t\t}
\t}`;
  };
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
\tbind 127.0.0.1${logBlock('client-access.log')}${proxy(values.clientUpstream, 'remove')}
}

http://:${values.serverPort} {
\tbind 127.0.0.1${logBlock('server-access.log')}${proxy(values.serverUpstream, 'set')}
}
`;
}

function boundedRequest(port: number, path: string, headers: Record<string, string | string[]> = {}): Promise<SeenRequest> {
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

/**
 * Materializes the disposable operator credential at the EXACT path systemd
 * would expose for caddy.service, so the runtime proof exercises the real
 * {file.*} source rather than a stand-in. Written 0400, exactly 43 bytes,
 * no trailing newline, then made read-only for the Caddy process.
 *
 * This only ever runs inside the throwaway Linux proof environment; the
 * value is generated per run and never leaves it.
 */
function installDisposableEdgeCredential(): void {
  const directory = dirname(EDGE_CREDENTIAL_RUNTIME_PATH);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  writeFileSync(EDGE_CREDENTIAL_RUNTIME_PATH, EDGE_PROOF_SECRET, { encoding: 'utf8', mode: 0o400 });
  chmodSync(EDGE_CREDENTIAL_RUNTIME_PATH, 0o400);

  const written = readFileSync(EDGE_CREDENTIAL_RUNTIME_PATH);

  if (written.length !== 43 || written.toString('utf8') !== EDGE_PROOF_SECRET) {
    fail('EDGE_CREDENTIAL_FILE', 'The disposable edge credential was not written as exactly 43 bytes without a newline.');
  }
}

function removeDisposableEdgeCredential(): void {
  if (!existsSync(EDGE_CREDENTIAL_RUNTIME_PATH)) return;
  chmodSync(EDGE_CREDENTIAL_RUNTIME_PATH, 0o600);
  rmSync(EDGE_CREDENTIAL_RUNTIME_PATH, { force: true });
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
  let stage = 'initialization';
  try {
    installDisposableEdgeCredential();
    const [clientPort, serverPort, clientUpstreamPort, serverUpstreamPort] = await freePorts(4);
    const ports = {
      adminSocket, clientPort: clientPort!, serverPort: serverPort!,
      clientUpstream: clientUpstreamPort!, serverUpstream: serverUpstreamPort!, logDirectory: work.replaceAll('\\', '/')
    };
    clientUpstream = await startUpstream('client', ports.clientUpstream, seen);
    serverUpstream = await startUpstream('server', ports.serverUpstream, seen);
    stage = 'configuration-validation';
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
    stage = 'admin-socket-inspection';
    if (!existsSync(adminSocket) || !lstatSync(adminSocket).isSocket()) fail('ADMIN_SOCKET', 'Caddy did not create the configured Unix admin socket.');
    const directory = statSync(work);
    const socket = statSync(adminSocket);
    if ((directory.mode & 0o777) !== 0o700) fail('ADMIN_DIRECTORY_MODE', 'Temporary admin socket directory was not private mode 0700.');
    if ((socket.mode & 0o077) !== 0 || socket.uid !== process.geteuid?.()) fail('ADMIN_SOCKET_MODE', 'Admin socket ownership or mode was not service-only.');
    await assertTcpClosed('127.0.0.1', 2019);
    await assertTcpClosed('::1', 2019);
    assertNoAdminTcpListener();
    assertUnrelatedUserDenied(adminSocket);

    stage = 'routing-contract';
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
    // PA FIX3-A transport proof: the running Caddy must have obtained the
    // proof from the credential FILE, and its own environment must not
    // contain the secret anywhere.
    const caddyEnvironment = readFileSync(`/proc/${String(caddy.pid ?? 0)}/environ`, 'utf8');

    // Guard against a vacuous pass: an unreadable or empty environ would
    // otherwise "prove" the secret is absent.
    if (!caddyEnvironment.includes('PATH=')) {
      fail('EDGE_CREDENTIAL_ENV', 'The Caddy process environment could not be read for inspection.');
    }
    if (caddyEnvironment.includes(EDGE_PROOF_SECRET)) {
      fail('EDGE_CREDENTIAL_ENV', 'The Caddy process environment contained the edge secret.');
    }
    if (/BURNINGSPACE_EDGE_ASSERTION_SECRET=/u.test(caddyEnvironment)) {
      fail('EDGE_CREDENTIAL_ENV', 'The Caddy process environment declared the edge secret variable.');
    }
    if (readFileSync(configPath, 'utf8').includes(EDGE_PROOF_SECRET)) {
      fail('EDGE_CREDENTIAL_CONFIG', 'The on-disk Caddyfile contained the edge secret.');
    }

    // PERSIST002-NET-02 + PA FIX2 real-runtime spoof-resistance proof. Every
    // one of these is a hostile PUBLIC request trying to dictate BOTH its own
    // admission identity and its own edge proof. The upstream must observe
    // exactly Caddy's {remote_host} and exactly the operator secret.
    const edgeSpoofs: { readonly label: string; readonly headers: Record<string, string | string[]> }[] = [
      {
        label: 'single',
        headers: { 'X-BurningSpace-Edge-Peer': EDGE_PEER_SPOOF, 'X-BurningSpace-Edge-Proof': EDGE_PROOF_SPOOF }
      },
      {
        label: 'repeated',
        headers: {
          'X-BurningSpace-Edge-Peer': [EDGE_PEER_SPOOF, '203.0.113.9'],
          'X-BurningSpace-Edge-Proof': [EDGE_PROOF_SPOOF, 'B'.repeat(43)]
        }
      },
      {
        label: 'casing',
        headers: { 'x-burningspace-EDGE-peer': EDGE_PEER_SPOOF, 'X-BURNINGSPACE-edge-PROOF': EDGE_PROOF_SPOOF }
      },
      {
        label: 'comma',
        headers: {
          'X-BurningSpace-Edge-Peer': `${EDGE_PEER_SPOOF},203.0.113.9`,
          'X-BurningSpace-Edge-Proof': `${EDGE_PROOF_SPOOF},${'B'.repeat(43)}`
        }
      },
      { label: 'forwarded-for', headers: { 'X-Forwarded-For': EDGE_PEER_SPOOF } },
      { label: 'real-ip', headers: { 'X-Real-IP': EDGE_PEER_SPOOF } },
      { label: 'forwarded', headers: { Forwarded: `for=${EDGE_PEER_SPOOF}` } },
      { label: 'proof-absent', headers: { 'X-BurningSpace-Edge-Peer': EDGE_PEER_SPOOF } },
      { label: 'proof-empty', headers: { 'X-BurningSpace-Edge-Proof': '' } },
      {
        label: 'combined',
        headers: {
          'X-BurningSpace-Edge-Peer': [EDGE_PEER_SPOOF, `${EDGE_PEER_SPOOF}:443`],
          'X-BurningSpace-Edge-Proof': [EDGE_PROOF_SPOOF, `${EDGE_PROOF_SPOOF}x`],
          'X-Forwarded-For': EDGE_PEER_SPOOF,
          'X-Real-IP': EDGE_PEER_SPOOF,
          Forwarded: `for=${EDGE_PEER_SPOOF}`
        }
      }
    ];

    for (const spoof of edgeSpoofs) {
      const observed = await boundedRequest(ports.serverPort, `/edge-peer-${spoof.label}`, {
        Host: 'arena-api.example.invalid',
        Origin: 'https://arena.example.invalid',
        ...spoof.headers
      });
      if (observed.edgePeer !== EDGE_PEER_EXPECTED || observed.edgePeerCount !== 1) {
        fail('EDGE_PEER_SPOOF', 'The upstream did not observe exactly the Caddy {remote_host} admission-peer value.');
      }
      if (observed.edgeProofMatches !== true || observed.edgeProofCount !== 1) {
        fail('EDGE_PROOF_SPOOF', 'The upstream did not observe exactly one operator-generated edge proof.');
      }
    }

    // PA FIX1/FIX2 least-privilege proof: the public CLIENT route REMOVEs both
    // internal headers, so the static client upstream must observe ZERO values
    // for every public request shape -- and Caddy must never synthesize either
    // one there.
    const clientShapes: { readonly label: string; readonly headers: Record<string, string | string[]> }[] = [
      { label: 'absent', headers: {} },
      {
        label: 'single',
        headers: { 'X-BurningSpace-Edge-Peer': EDGE_PEER_SPOOF, 'X-BurningSpace-Edge-Proof': EDGE_PROOF_SPOOF }
      },
      {
        label: 'repeated',
        headers: {
          'X-BurningSpace-Edge-Peer': [EDGE_PEER_SPOOF, '203.0.113.9'],
          'X-BurningSpace-Edge-Proof': [EDGE_PROOF_SPOOF, 'B'.repeat(43)]
        }
      },
      {
        label: 'casing',
        headers: { 'x-burningspace-EDGE-peer': EDGE_PEER_SPOOF, 'X-BURNINGSPACE-edge-PROOF': EDGE_PROOF_SPOOF }
      },
      {
        label: 'comma',
        headers: {
          'X-BurningSpace-Edge-Peer': `${EDGE_PEER_SPOOF},203.0.113.9`,
          'X-BurningSpace-Edge-Proof': `${EDGE_PROOF_SPOOF},${'B'.repeat(43)}`
        }
      }
    ];

    for (const shape of clientShapes) {
      const observed = await boundedRequest(ports.clientPort, `/edge-peer-client-${shape.label}`, {
        Host: 'arena.example.invalid',
        ...shape.headers
      });
      if (observed.kind !== 'client' || observed.edgePeer !== undefined || observed.edgePeerCount !== 0) {
        fail(
          'EDGE_PEER_CLIENT_ROUTE',
          'The public client upstream must observe zero internal admission-peer header values.'
        );
      }
      if (observed.edgeProofCount !== 0 || observed.edgeProofMatches !== false) {
        fail(
          'EDGE_PROOF_CLIENT_ROUTE',
          'The public client upstream must observe zero internal edge-proof header values.'
        );
      }
    }

    const websocket = await websocketRoundTrip(ports.serverPort);
    const expectedWebSocketQuery = `/battle?reconnectionToken=${TOKEN_CANARY}&other=unchanged`;
    const wsSeen = seen.find((entry) => entry.url === expectedWebSocketQuery);
    if (!wsSeen) fail('QUERY_PASS', 'WebSocket query did not reach the server upstream unchanged.');
    if (wsSeen.edgePeer !== EDGE_PEER_EXPECTED || wsSeen.edgePeerCount !== 1) {
      fail('EDGE_PEER_UPGRADE', 'The WebSocket upgrade did not carry exactly the Caddy {remote_host} admission-peer value.');
    }
    if (wsSeen.edgeProofMatches !== true || wsSeen.edgeProofCount !== 1) {
      fail('EDGE_PROOF_UPGRADE', 'The WebSocket upgrade did not carry exactly one operator-generated edge proof.');
    }
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

    stage = 'unix-socket-reload';
    const reloadValidation = spawnSync(exactBinary, ['validate', '--config', configPath, '--adapter', 'caddyfile'], { encoding: 'utf8', windowsHide: true });
    if (reloadValidation.status !== 0) fail('RELOAD_VALIDATE', 'Reload-time validation failed without external services.');
    serverUpstream = await startUpstream('server', ports.serverUpstream, seen);
    const reload = spawnSync(exactBinary, ['reload', '--config', configPath, '--force', '--address', adminAddress], {
      encoding: 'utf8', windowsHide: true, timeout: TIMEOUT_MS
    });
    if (reload.status !== 0) fail('ADMIN_RELOAD', 'Caddy reload through the Unix admin socket failed.');
    await waitForCaddy(ports.clientPort);
    stage = 'post-reload-routing';
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
    stage = 'cleanup-and-log-inspection';
    if (existsSync(adminSocket)) rmSync(adminSocket, { force: true });
    if (existsSync(adminSocket)) fail('ADMIN_SOCKET_CLEANUP', 'Admin socket cleanup after process termination failed.');
    const clientLog = readFileSync(join(work, 'client-access.log'), 'utf8');
    const serverLog = readFileSync(join(work, 'server-access.log'), 'utf8');
    const allRuntimeOutput = `${clientLog}\n${serverLog}\n${stdout}\n${stderr}`;
    for (const canary of [TOKEN_CANARY, CLIENT_QUERY_CANARY, ERROR_QUERY_CANARY, AUTH_CANARY, COOKIE_CANARY]) {
      if (allRuntimeOutput.includes(canary)) fail('LOG_LEAK', 'A seeded query or credential canary appeared in edge output.');
    }
    // PA FIX2 secret hygiene: the operator edge proof must never reach any
    // access log, any Caddy stream, or this script's own output.
    if (allRuntimeOutput.includes(EDGE_PROOF_SECRET)) {
      fail('EDGE_PROOF_LEAK', 'The operator edge proof appeared in edge runtime output.');
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
      errorLogSafe: true, reloadValidationOffline: true, socketCleanup: true, cleanupBounded: true,
      edgePeerSetFromRemoteHost: true, edgePeerOverwritesClientValue: true,
      edgePeerOverwritesRepeatedValue: true, edgePeerOverwritesHeaderCasing: true,
      edgePeerOverwritesCommaValue: true, edgePeerIgnoresForwardedHeaders: true,
      edgePeerSingleValuedUpstream: true, edgePeerOnWebSocketUpgrade: true,
      edgePeerAbsentOnClientRoute: true, edgePeerStrippedOnClientRoute: true,
      edgePeerRepeatedStrippedOnClientRoute: true, edgePeerCasingStrippedOnClientRoute: true,
      edgePeerCommaStrippedOnClientRoute: true,
      edgeProofSetFromSystemdCredential: true, edgeProofOverwritesClientValue: true,
      edgeProofOverwritesRepeatedValue: true, edgeProofOverwritesHeaderCasing: true,
      edgeProofOverwritesCommaValue: true, edgeProofSuppliedWhenClientOmitsIt: true,
      edgeProofSuppliedWhenClientSendsEmpty: true, edgeProofSingleValuedUpstream: true,
      edgeProofOnWebSocketUpgrade: true, edgeProofAbsentOnClientRoute: true,
      edgeProofStrippedOnClientRoute: true, edgeProofRepeatedStrippedOnClientRoute: true,
      edgeProofCasingStrippedOnClientRoute: true, edgeProofCommaStrippedOnClientRoute: true,
      edgeProofNeverLogged: true,
      edgeProofFromSystemdCredentialFile: true, edgeProofAbsentFromCaddyEnvironment: true,
      edgeProofAbsentFromOnDiskConfig: true
    };
  } catch (error) {
    if (error instanceof ContractError) throw error;
    fail('RUNTIME_UNEXPECTED', `Unexpected bounded edge-contract failure during ${stage}.`);
  } finally {
    removeDisposableEdgeCredential();
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
    ok: true, event: 'external_staging_edge_contract_self_tested', tests: 59,
    runtimeExecuted: true, caddyVersion: '2.11.4', checks
  }));
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ ok: false, event: 'external_staging_edge_contract_failed', error: safeError(error) }));
  process.exitCode = 1;
});
