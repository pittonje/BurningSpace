import { randomBytes } from 'node:crypto';
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type Server,
  type ServerResponse
} from 'node:http';
import type { Duplex } from 'node:stream';
import { Client as PgClient } from 'pg';
import { Client } from 'colyseus.js';
import { afterEach, describe, expect, it } from 'vitest';
import { IdentityGuestIntent } from '@burningspace/shared';
import { startProductionServer, type ProductionServerHandle } from '../../src/index.js';
import { generateCredential } from '../../src/persistence/credential.js';
import { runAdmissionPhase, probeGuest, type AdmissionConfig } from '../../scripts/external-staging-admission-smoke.js';
import {
  ADMISSION_EDGE_PEER_HEADER,
  ADMISSION_EDGE_PROOF_HEADER
} from '../../src/security/admissionPeerIdentity.js';
import {
  createBootstrappedTestDatabase,
  describeUnreachableDatabaseWarning,
  isTestDatabaseReachable,
  type BootstrappedTestDatabase
} from '../support/testPersistenceDatabase.js';

const PM2_TELEMETRY_FILTER_MARKER = Symbol.for('burningspace.test.pm2-telemetry-worker-filter');

function installPm2TelemetryFilterForWorkerIpc(): void {
  const workerSend = process.send;

  if (!workerSend || Reflect.get(workerSend, PM2_TELEMETRY_FILTER_MARKER) === true) {
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

  Reflect.defineProperty(filteredSend, PM2_TELEMETRY_FILTER_MARKER, { value: true });
  process.send = filteredSend;
}

installPm2TelemetryFilterForWorkerIpc();

const databaseAvailable = await isTestDatabaseReachable();

if (!databaseAvailable) {
  console.warn(describeUnreachableDatabaseWarning('admissionBudgetIsolation.test.ts'));
}

/** Two synthetic public clients, as Caddy's {remote_host} would observe them. */
const PUBLIC_CLIENT_A = '198.51.100.11';
const PUBLIC_CLIENT_B = '198.51.100.22';
/** A trusted peer that the loopback test proxies are deliberately NOT. */
const FOREIGN_TRUSTED_PEER = '192.0.2.77';
/**
 * PA FIX2: one disposable 32-byte operator edge secret per test process. It
 * is generated at runtime, never written to the repository and never printed.
 */
const EDGE_SECRET = randomBytes(32).toString('base64url');
/** A validly shaped proof that is NOT the operator secret. */
const WRONG_EDGE_SECRET = randomBytes(32).toString('base64url');
const HOSTILE_ORIGIN = 'https://hostile.example.invalid';

/**
 * One real local HTTP/WebSocket reverse proxy peer standing in for Caddy.
 *
 * It connects to the Node server over loopback, so EVERY request routed
 * through any of these proxies reaches Node with the SAME direct socket peer
 * (127.0.0.1) -- exactly the collapse the real
 * client -> Caddy -> loopback -> Docker NAT -> Node topology produces. The
 * only thing distinguishing two public clients is the internal edge
 * assertion, which the proxy SETS (overwrites), never appends, mirroring
 * Caddy's `header_up X-BurningSpace-Edge-Peer {remote_host}`.
 */
interface EdgeProxy {
  readonly url: string;
  close(): Promise<void>;
}

async function startEdgeProxy(
  targetUrl: string,
  assertion: string | readonly string[] | undefined,
  /** The proof this proxy SET-overwrites. Defaults to the operator secret. */
  proof: string | readonly string[] | undefined = EDGE_SECRET
): Promise<EdgeProxy> {
  const target = new URL(targetUrl);
  const targetHost = target.hostname;
  const targetPort = Number(target.port);

  const applyAssertion = (source: IncomingMessage): Record<string, string | string[] | number> => {
    const headers: Record<string, string | string[] | number> = {};

    for (const [name, value] of Object.entries(source.headers)) {
      // SET semantics: a client-supplied internal header is discarded first.
      if (name === ADMISSION_EDGE_PEER_HEADER || name === ADMISSION_EDGE_PROOF_HEADER || value === undefined) {
        continue;
      }
      headers[name] = value;
    }

    if (assertion !== undefined) {
      headers[ADMISSION_EDGE_PEER_HEADER] = Array.isArray(assertion) ? [...assertion] : (assertion as string);
    }

    if (proof !== undefined) {
      headers[ADMISSION_EDGE_PROOF_HEADER] = Array.isArray(proof) ? [...proof] : (proof as string);
    }

    return headers;
  };

  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    const upstream = httpRequest(
      { host: targetHost, port: targetPort, method: request.method, path: request.url, headers: applyAssertion(request) },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      }
    );

    upstream.on('error', () => {
      if (!response.headersSent) {
        response.writeHead(502, { 'content-type': 'application/json' });
      }
      response.end();
    });

    request.pipe(upstream);
  });

  server.on('upgrade', (request: IncomingMessage, clientSocket: Duplex, head: Buffer) => {
    const upstream = httpRequest({
      host: targetHost,
      port: targetPort,
      method: request.method ?? 'GET',
      path: request.url,
      headers: applyAssertion(request)
    });

    upstream.on('upgrade', (upstreamResponse, upstreamSocket, upstreamHead) => {
      const statusLine = `HTTP/1.1 ${upstreamResponse.statusCode ?? 502} ${upstreamResponse.statusMessage ?? ''}\r\n`;
      const raw = upstreamResponse.rawHeaders;
      let rendered = statusLine;

      for (let index = 0; index + 1 < raw.length; index += 2) {
        rendered += `${raw[index]}: ${raw[index + 1]}\r\n`;
      }

      clientSocket.write(`${rendered}\r\n`);

      if (upstreamHead.length > 0) {
        clientSocket.write(upstreamHead);
      }
      if (head.length > 0) {
        upstreamSocket.write(head);
      }

      upstreamSocket.on('error', () => clientSocket.destroy());
      clientSocket.on('error', () => upstreamSocket.destroy());
      upstreamSocket.pipe(clientSocket);
      clientSocket.pipe(upstreamSocket);
    });

    upstream.on('error', () => clientSocket.destroy());
    upstream.end();
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    throw new Error('Edge proxy did not bind a loopback port.');
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => closeServer(server)
  };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose) => {
    server.closeAllConnections?.();
    server.close(() => resolveClose());
  });
}

interface Harness {
  readonly server: ProductionServerHandle;
  readonly database: BootstrappedTestDatabase;
  readonly logLines: string[];
  advanceGuestClock(ms: number): void;
  advanceAuthClock(ms: number): void;
}

const openHarnesses: Harness[] = [];
const openProxies: EdgeProxy[] = [];

/**
 * A real production server: real bootPersistenceRuntime against a real
 * disposable PostgreSQL database, real /identity/guest and world-discovery
 * HTTP routes, real durable BattleRoom.onAuth. No admission bypass.
 */
async function bootHarness(trustedEdgePeers?: string, edgeSecret: string = EDGE_SECRET, allowedOrigin?: string): Promise<Harness> {
  const database = await createBootstrappedTestDatabase();
  const logLines: string[] = [];
  let guestClock = 0;
  let authClock = 0;

  let server: ProductionServerHandle | undefined;

  try {
    server = await startProductionServer({
      environment: {
        NODE_ENV: 'test',
        DATABASE_URL: database.databaseUrl,
        ...(allowedOrigin ? { BURNINGSPACE_ALLOWED_ORIGINS: allowedOrigin } : {}),
        ...(trustedEdgePeers === undefined
          ? {}
          : {
              BURNINGSPACE_TRUSTED_EDGE_PEERS: trustedEdgePeers,
              BURNINGSPACE_EDGE_ASSERTION_SECRET: edgeSecret
            })
      },
      port: 0,
      hostname: '127.0.0.1',
      registerSignalHandlers: false,
      exitOnAuthorityLoss: false,
      logSink: (line) => logLines.push(line),
      guestIdentityLimiterClock: () => guestClock,
      freshAuthLimiterClock: () => authClock
    });
  } catch (error) {
    await database.drop().catch(() => undefined);
    throw error;
  }

  const harness: Harness = {
    server,
    database,
    logLines,
    advanceGuestClock: (ms) => {
      guestClock += ms;
    },
    advanceAuthClock: (ms) => {
      authClock += ms;
    }
  };
  openHarnesses.push(harness);
  return harness;
}

async function proxy(
  target: string,
  assertion: string | readonly string[] | undefined,
  proof: string | readonly string[] | undefined = EDGE_SECRET
): Promise<EdgeProxy> {
  const created = await startEdgeProxy(target, assertion, proof);
  openProxies.push(created);
  return created;
}

afterEach(async () => {
  await Promise.allSettled(openProxies.splice(0).map((entry) => entry.close()));

  for (const harness of openHarnesses.splice(0)) {
    await harness.server.shutdown('SIGTERM').catch(() => undefined);
    await harness.database.drop().catch(() => undefined);
  }
});

interface GuestAttempt {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

async function createGuest(baseUrl: string, origin?: string): Promise<GuestAttempt> {
  const response = await fetch(`${baseUrl}/identity/guest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(origin === undefined ? {} : { Origin: origin }) },
    body: JSON.stringify({ intent: IdentityGuestIntent })
  });

  return { status: response.status, body: (await response.json().catch(() => ({}))) as Record<string, unknown> };
}

async function countRows(databaseUrl: string, table: string): Promise<number> {
  const client = new PgClient({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query<{ count: number }>(`SELECT count(*)::int AS count FROM ${table}`);
    return Number(result.rows[0]?.count ?? 0);
  } finally {
    await client.end();
  }
}

async function discoverRoomId(baseUrl: string): Promise<string> {
  const response = await fetch(`${baseUrl}/world/battle-room`);

  if (!response.ok) {
    throw new Error(`world discovery failed with ${response.status}`);
  }

  return ((await response.json()) as { roomId: string }).roomId;
}

interface JoinOutcome {
  readonly joined: boolean;
  readonly failure?: string;
}

async function attemptJoin(
  baseUrl: string,
  roomId: string,
  options: Record<string, unknown>
): Promise<JoinOutcome> {
  try {
    const room = await new Client(baseUrl).joinById(roomId, options);
    await room.leave(true).catch(() => undefined);
    return { joined: true };
  } catch (error) {
    return { joined: false, failure: error instanceof Error ? error.message : 'unknown' };
  }
}

describe.skipIf(!databaseAvailable)(
  'PERSIST002-NET-02 admission budget isolation (real server + real PostgreSQL + real proxy peer)',
  () => {
    it('freezes invalid-body ordering and the bounded rollout protocol with zero durable guests', async () => {
      const harness = await bootHarness('127.0.0.1', EDGE_SECRET, 'https://arena.example.invalid');
      const edgeA = await proxy(harness.server.url, PUBLIC_CLIENT_A);
      const edgeB = await proxy(harness.server.url, PUBLIC_CLIENT_B);
      const config: AdmissionConfig = { runId: randomBytes(16).toString('hex'), targetCommit: 'a'.repeat(40), environmentId: 'local-test', topologyId: 'test-topology', edgeConfigId: 'test-edge', serverOrigin: 'https://api.example.invalid', allowedOrigin: 'https://arena.example.invalid', sourceAddress: PUBLIC_CLIENT_A, nodePeer: '127.0.0.1' };
      const at = (url: string) => (_origin: string, allowed: string, headers: import('node:http').OutgoingHttpHeaders) => probeGuest(url, allowed, headers);
      await runAdmissionPhase(config, 'a-exhaust', undefined, at(edgeA.url));
      await runAdmissionPhase({ ...config, sourceAddress: PUBLIC_CLIENT_B }, 'b-isolation', undefined, at(edgeB.url));
      await runAdmissionPhase(config, 'a-spoof', undefined, at(edgeA.url));
      await runAdmissionPhase({ ...config, serverOrigin: harness.server.url, sourceAddress: '198.51.100.254' }, 'local-proof', EDGE_SECRET);
      for (const table of ['players', 'player_credentials', 'world_memberships', 'active_session_leases']) expect(await countRows(harness.database.databaseUrl, table)).toBe(0);
      const logs = harness.logLines.join('\n');
      for (const reason of ['edge_proof_missing', 'edge_proof_malformed', 'edge_proof_rejected']) expect(logs).toContain(reason);
      expect(logs).not.toContain(EDGE_SECRET);
    }, 60_000);
    /**
     * PERSIST002-NET02-EDGE-AUTH-01 -- the discriminating regression.
     *
     * The real staging topology is
     *
     *   public client -> Caddy -> host loopback published port
     *                 -> Docker NAT -> Node
     *
     * so the direct socket peer Node observes is the Docker bridge / NAT
     * gateway. That address identifies the NAT path, NOT the Caddy process:
     * any other local process on the host can reach the same published port
     * and arrive with the SAME trusted direct peer.
     *
     * These calls are exactly that attacker. They go DIRECTLY to the Node
     * server over loopback, bypassing the test edge proxy entirely, while the
     * server trusts 127.0.0.1 as its edge peer. Every one of them must fail
     * closed, and -- critically -- a forged peer assertion must never create
     * an independent budget.
     */
    it.each([
      ['no edge proof at all', undefined],
      ['a wrong but validly shaped proof', WRONG_EDGE_SECRET],
      ['a malformed proof', 'not-a-valid-proof'],
      ['a padded proof', `${WRONG_EDGE_SECRET}=`],
      ['a repeated proof', `${EDGE_SECRET},${EDGE_SECRET}`],
      ['an empty proof', '']
    ])('refuses a direct host-local bypass carrying a forged peer and %s', async (_label, proof) => {
      const harness = await bootHarness('127.0.0.1');

      for (const forgedPeer of [PUBLIC_CLIENT_A, PUBLIC_CLIENT_B]) {
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const response = await fetch(`${harness.server.url}/identity/guest`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              [ADMISSION_EDGE_PEER_HEADER]: forgedPeer,
              ...(proof === undefined ? {} : { [ADMISSION_EDGE_PROOF_HEADER]: proof })
            },
            body: JSON.stringify({ intent: IdentityGuestIntent })
          });

          expect(response.status).toBe(429);
          expect(await response.json()).toEqual({ ok: false, error: 'rate_limited' });
        }
      }

      // The blocker, stated as an assertion: eight forged admissions across
      // two distinct forged identities created no durable player whatsoever.
      expect(await countRows(harness.database.databaseUrl, 'players')).toBe(0);
    }, 120_000);

    it('gives a direct bypass no independent budget, and leaves the real edge budget intact', async () => {
      const harness = await bootHarness('127.0.0.1');

      // A host-local process forges 20 distinct public identities directly.
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const response = await fetch(`${harness.server.url}/identity/guest`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [ADMISSION_EDGE_PEER_HEADER]: `198.51.100.${String(attempt + 1)}`
          },
          body: JSON.stringify({ intent: IdentityGuestIntent })
        });
        expect(response.status).toBe(429);
      }

      // No token was consumed for any of them, so a genuine client arriving
      // through the trusted edge still has its full capacity-3 burst.
      const edge = await proxy(harness.server.url, PUBLIC_CLIENT_A);
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        expect((await createGuest(edge.url)).status).toBe(201);
      }
      expect((await createGuest(edge.url)).status).toBe(429);
      expect(await countRows(harness.database.databaseUrl, 'players')).toBe(3);
    }, 120_000);

    it('admits the same request through the trusted edge proxy that SET-overwrites both headers', async () => {
      const harness = await bootHarness('127.0.0.1');
      const edge = await proxy(harness.server.url, PUBLIC_CLIENT_A);

      // Identical forged headers to the bypass above, but now arriving
      // through a hop that overwrites BOTH with the operator values.
      const response = await fetch(`${edge.url}/identity/guest`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [ADMISSION_EDGE_PEER_HEADER]: PUBLIC_CLIENT_B,
          [ADMISSION_EDGE_PROOF_HEADER]: WRONG_EDGE_SECRET
        },
        body: JSON.stringify({ intent: IdentityGuestIntent })
      });

      expect(response.status).toBe(201);
      expect(await countRows(harness.database.databaseUrl, 'players')).toBe(1);
    }, 120_000);

    it('fails fresh auth closed for a direct host-local bypass', async () => {
      const harness = await bootHarness('127.0.0.1');
      const edge = await proxy(harness.server.url, PUBLIC_CLIENT_A);
      const identity = (await createGuest(edge.url)).body as { credential: string };
      const roomId = await discoverRoomId(edge.url);

      // A real, valid credential presented by a host-local process that
      // reaches Node directly on the trusted Docker-NAT peer address but
      // carries no edge proof. Admission fails before authentication, so the
      // credential never even gets looked up.
      const outcome = await attemptJoin(harness.server.url, roomId, { credential: identity.credential });

      expect(outcome.joined).toBe(false);
      expect(outcome.failure).toContain('auth_rate_limited');

      // The same credential still joins through the trusted edge hop.
      const admitted = await attemptJoin(edge.url, roomId, { credential: identity.credential });
      expect(admitted.joined).toBe(true);
    }, 120_000);

    it('never writes the operator edge secret or a supplied proof into a diagnostic', async () => {
      const harness = await bootHarness('127.0.0.1');

      for (const proof of [WRONG_EDGE_SECRET, 'not-a-valid-proof', '']) {
        await fetch(`${harness.server.url}/identity/guest`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [ADMISSION_EDGE_PEER_HEADER]: PUBLIC_CLIENT_A,
            [ADMISSION_EDGE_PROOF_HEADER]: proof
          },
          body: JSON.stringify({ intent: IdentityGuestIntent })
        });
      }

      const all = harness.logLines.join('\n');

      expect(all).not.toContain(EDGE_SECRET);
      expect(all).not.toContain(WRONG_EDGE_SECRET);
      expect(all).not.toContain(ADMISSION_EDGE_PROOF_HEADER);
      // Only the fixed reason codes are operationally reportable.
      expect(all).toContain('edge_proof_rejected');
      expect(all).toContain('edge_proof_malformed');
    }, 120_000);

    it('gives two public clients behind one trusted edge peer isolated guest budgets', async () => {
      const harness = await bootHarness('127.0.0.1');
      const edgeA = await proxy(harness.server.url, PUBLIC_CLIENT_A);
      const edgeB = await proxy(harness.server.url, PUBLIC_CLIENT_B);

      // Client A exhausts its own capacity-3 burst.
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const created = await createGuest(edgeA.url);
        expect(created.status).toBe(201);
      }

      const fourthFromA = await createGuest(edgeA.url);
      expect(fourthFromA.status).toBe(429);
      expect(fourthFromA.body).toEqual({ ok: false, error: 'rate_limited' });

      // Client B, arriving through the SAME socket peer, keeps a full budget.
      const firstFromB = await createGuest(edgeB.url);
      expect(firstFromB.status).toBe(201);

      expect(await countRows(harness.database.databaseUrl, 'players')).toBe(4);
    }, 60_000);

    it('shares one direct-peer budget when the asserting proxy is not trusted', async () => {
      const harness = await bootHarness(FOREIGN_TRUSTED_PEER);
      const edgeA = await proxy(harness.server.url, PUBLIC_CLIENT_A);
      const edgeB = await proxy(harness.server.url, PUBLIC_CLIENT_B);

      expect((await createGuest(edgeA.url)).status).toBe(201);
      expect((await createGuest(edgeB.url)).status).toBe(201);
      expect((await createGuest(edgeA.url)).status).toBe(201);

      // The internal header alone grants no authority: A and B collide.
      expect((await createGuest(edgeB.url)).status).toBe(429);
      expect((await createGuest(edgeA.url)).status).toBe(429);

      expect(await countRows(harness.database.databaseUrl, 'players')).toBe(3);
    }, 60_000);

    it('shares one direct-peer budget when no trusted-edge configuration exists at all', async () => {
      const harness = await bootHarness();
      const edgeA = await proxy(harness.server.url, PUBLIC_CLIENT_A);
      const edgeB = await proxy(harness.server.url, PUBLIC_CLIENT_B);

      expect((await createGuest(edgeA.url)).status).toBe(201);
      expect((await createGuest(edgeB.url)).status).toBe(201);
      expect((await createGuest(edgeA.url)).status).toBe(201);
      expect((await createGuest(edgeB.url)).status).toBe(429);

      expect(await countRows(harness.database.databaseUrl, 'players')).toBe(3);
    }, 60_000);

    it.each([
      ['a malformed literal', 'not-an-ip'],
      ['a value carrying a port', `${PUBLIC_CLIENT_A}:51234`],
      ['a bracketed IPv6 form', '[2001:db8::1]'],
      ['a zone identifier', 'fe80::1%eth0'],
      ['a comma list', `${PUBLIC_CLIENT_A},${PUBLIC_CLIENT_B}`],
      ['a CIDR range', '198.51.100.0/24'],
      ['an overlong value', `${'9'.repeat(60)}.1.2.3`],
      ['an empty value', '']
    ])('fails a trusted-edge assertion closed with the existing 429 shape for %s', async (_label, assertion) => {
      const harness = await bootHarness('127.0.0.1');
      const edge = await proxy(harness.server.url, assertion);

      const attempt = await createGuest(edge.url);

      expect(attempt.status).toBe(429);
      expect(attempt.body).toEqual({ ok: false, error: 'rate_limited' });
      expect(Number(await countRows(harness.database.databaseUrl, 'players'))).toBe(0);
    }, 60_000);

    it('fails closed when a trusted edge peer sends the internal header twice', async () => {
      const harness = await bootHarness('127.0.0.1');
      const edge = await proxy(harness.server.url, [PUBLIC_CLIENT_A, PUBLIC_CLIENT_B]);

      const attempt = await createGuest(edge.url);

      expect(attempt.status).toBe(429);
      expect(attempt.body).toEqual({ ok: false, error: 'rate_limited' });
      expect(await countRows(harness.database.databaseUrl, 'players')).toBe(0);
    }, 60_000);

    it('fails closed when a trusted edge peer sends no internal header at all', async () => {
      const harness = await bootHarness('127.0.0.1');
      const edge = await proxy(harness.server.url, undefined);

      const attempt = await createGuest(edge.url);

      expect(attempt.status).toBe(429);
      expect(attempt.body).toEqual({ ok: false, error: 'rate_limited' });
      expect(await countRows(harness.database.databaseUrl, 'players')).toBe(0);
    }, 60_000);

    it('reports a bounded, sanitized diagnostic for a rejected trusted-edge assertion', async () => {
      const harness = await bootHarness('127.0.0.1');
      const edge = await proxy(harness.server.url, 'not-an-ip');

      for (let attempt = 0; attempt < 6; attempt += 1) {
        expect((await createGuest(edge.url)).status).toBe(429);
      }

      const diagnostics = harness.logLines.filter((line) =>
        line.includes('admission_trusted_edge_assertion_rejected')
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toContain('edge_assertion_malformed');
      expect(diagnostics[0]).not.toContain('not-an-ip');
      expect(diagnostics[0]).not.toContain('127.0.0.1');
      expect(diagnostics[0]).not.toContain(ADMISSION_EDGE_PEER_HEADER);
    }, 60_000);

    it('rejects a hostile Origin before any admission budget token is consumed', async () => {
      const harness = await bootHarness('127.0.0.1');
      const edge = await proxy(harness.server.url, PUBLIC_CLIENT_A);

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const hostile = await createGuest(edge.url, HOSTILE_ORIGIN);
        expect(hostile.status).toBe(403);
      }

      // The full capacity-3 burst survives five rejected hostile-Origin calls.
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        expect((await createGuest(edge.url)).status).toBe(201);
      }
      expect((await createGuest(edge.url)).status).toBe(429);
      expect(await countRows(harness.database.databaseUrl, 'players')).toBe(3);
    }, 60_000);

    it('rejects a hostile Origin before the trusted-edge assertion is even inspected', async () => {
      const harness = await bootHarness('127.0.0.1');
      const edge = await proxy(harness.server.url, 'not-an-ip');

      const hostile = await createGuest(edge.url, HOSTILE_ORIGIN);

      expect(hostile.status).toBe(403);
      expect(harness.logLines.some((line) => line.includes('admission_trusted_edge_assertion_rejected'))).toBe(false);
    }, 60_000);

    it('gives two public clients behind one trusted edge peer isolated fresh-auth budgets', async () => {
      const harness = await bootHarness('127.0.0.1');
      const edgeA = await proxy(harness.server.url, PUBLIC_CLIENT_A);
      const edgeB = await proxy(harness.server.url, PUBLIC_CLIENT_B);

      const identityA = (await createGuest(edgeA.url)).body as { credential: string };
      const identityB = (await createGuest(edgeB.url)).body as { credential: string };
      expect(identityA.credential).toBeTypeOf('string');
      expect(identityB.credential).toBeTypeOf('string');

      const roomId = await discoverRoomId(edgeA.url);
      let rejectedFromA = 0;

      // Exactly the capacity-10 fresh-auth burst, then one rejection. Forged
      // client-side identity fields vary every attempt and must never
      // manufacture a fresh admission bucket.
      for (let attempt = 1; attempt <= 11; attempt += 1) {
        const outcome = await attemptJoin(edgeA.url, roomId, {
          credential: identityA.credential,
          playerId: `forged-player-${attempt}`,
          sessionId: `forged-session-${attempt}`,
          faction: attempt % 2 === 0 ? 'red' : 'blue'
        });

        if (!outcome.joined) {
          rejectedFromA += 1;
          expect(outcome.failure).toContain('auth_rate_limited');
        }
      }

      expect(rejectedFromA).toBe(1);

      // Client B's valid credential still reaches authentication and joins.
      const fromB = await attemptJoin(edgeB.url, roomId, { credential: identityB.credential });
      expect(fromB.failure).toBeUndefined();
      expect(fromB.joined).toBe(true);
    }, 180_000);

    it('fails fresh auth closed with the existing auth_rate_limited shape on a malformed trusted assertion', async () => {
      const harness = await bootHarness('127.0.0.1');
      const valid = await proxy(harness.server.url, PUBLIC_CLIENT_A);
      const malformed = await proxy(harness.server.url, `${PUBLIC_CLIENT_A}:51234`);

      const identity = (await createGuest(valid.url)).body as { credential: string };
      const roomId = await discoverRoomId(valid.url);

      const outcome = await attemptJoin(malformed.url, roomId, { credential: identity.credential });

      expect(outcome.joined).toBe(false);
      expect(outcome.failure).toContain('auth_rate_limited');
    }, 120_000);

    it('still rejects an unknown credential after a valid trusted-edge admission identity', async () => {
      const harness = await bootHarness('127.0.0.1');
      const edge = await proxy(harness.server.url, PUBLIC_CLIENT_A);
      const roomId = await discoverRoomId(edge.url);

      const outcome = await attemptJoin(edge.url, roomId, { credential: generateCredential().credential });

      expect(outcome.joined).toBe(false);
      expect(outcome.failure).toContain('identity_rejected');
    }, 120_000);

    it('keeps joinById and reconnect continuity unchanged through the trusted edge peer', async () => {
      const harness = await bootHarness('127.0.0.1');
      const edge = await proxy(harness.server.url, PUBLIC_CLIENT_A);
      const identity = (await createGuest(edge.url)).body as { credential: string };
      const roomId = await discoverRoomId(edge.url);

      const client = new Client(edge.url);
      const room = await client.joinById(roomId, { credential: identity.credential });
      expect(room.roomId).toBe(roomId);

      const reconnectionToken = room.reconnectionToken;
      await room.leave(false);

      const reconnected = await client.reconnect(reconnectionToken);
      expect(reconnected.roomId).toBe(roomId);
      await reconnected.leave(true).catch(() => undefined);
    }, 120_000);
  }
);
