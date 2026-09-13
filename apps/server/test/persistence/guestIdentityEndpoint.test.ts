import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, afterEach, describe, expect, test } from 'vitest';
import { redactDatabaseUrl } from '../../src/persistence/config.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { bootstrapWorld } from '../../src/persistence/repositories/worldsRepository.js';
import { startProductionServer, type ProductionServerHandle } from '../../src/index.js';

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

const ADMIN_DATABASE_URL =
  process.env.BURNINGSPACE_TEST_DATABASE_URL ??
  'postgres://burningspace_test_admin:burningspace_test_password@127.0.0.1:55432/burningspace_test';
const ALLOWED_ORIGIN = 'https://arena.example.com';
const HOSTILE_ORIGIN = 'https://hostile.example.net';

async function isDatabaseReachable(): Promise<boolean> {
  const client = new Client({ connectionString: ADMIN_DATABASE_URL, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

const databaseAvailable = await isDatabaseReachable();

if (!databaseAvailable) {
  console.warn(
    '[guestIdentityEndpoint.test.ts] Skipping real-PostgreSQL/HTTP tests: ' +
      `no reachable database at ${redactDatabaseUrl(ADMIN_DATABASE_URL)}. ` +
      'Start deploy/docker-compose.test.db.yml to run them.'
  );
}

const disposableDatabaseNames: string[] = [];
const runningServers: ProductionServerHandle[] = [];
const allCapturedLogLines: string[] = [];
const issuedRawCredentials: string[] = [];

async function createBootstrappedDatabase(): Promise<{ databaseUrl: string; databaseName: string }> {
  const databaseName = `bs_test_${randomUUID().replace(/-/g, '')}`;
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${databaseName}`);
  } finally {
    await admin.end();
  }
  disposableDatabaseNames.push(databaseName);
  const url = new URL(ADMIN_DATABASE_URL);
  url.pathname = `/${databaseName}`;
  const databaseUrl = url.toString();
  await runMigrations(databaseUrl);

  const setupClient = new Client({ connectionString: databaseUrl });
  await setupClient.connect();
  try {
    await bootstrapWorld(setupClient, 'public-arena');
  } finally {
    await setupClient.end();
  }

  return { databaseUrl, databaseName };
}

async function dropDatabase(databaseName: string): Promise<void> {
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  try {
    await admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [databaseName]
    );
    await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
  } finally {
    await admin.end();
    const index = disposableDatabaseNames.indexOf(databaseName);
    if (index >= 0) {
      disposableDatabaseNames.splice(index, 1);
    }
  }
}

interface TestServer {
  readonly server: ProductionServerHandle;
  readonly databaseUrl: string;
  readonly databaseName: string;
  readonly logLines: string[];
  advanceClock(ms: number): void;
}

async function bootTestServer(): Promise<TestServer> {
  const { databaseUrl, databaseName } = await createBootstrappedDatabase();
  const logLines: string[] = [];
  let clockValue = 0;

  const server = await startProductionServer({
    environment: {
      NODE_ENV: 'production',
      BURNINGSPACE_ALLOWED_ORIGINS: ALLOWED_ORIGIN,
      BURNINGSPACE_RECONNECT_GRACE_SECONDS: '10',
      BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS: '2',
      DATABASE_URL: databaseUrl
    },
    port: 0,
    hostname: '127.0.0.1',
    registerSignalHandlers: false,
    exitOnAuthorityLoss: false,
    logSink: (line) => {
      logLines.push(line);
      allCapturedLogLines.push(line);
    },
    guestIdentityLimiterClock: () => clockValue
  });
  runningServers.push(server);

  return {
    server,
    databaseUrl,
    databaseName,
    logLines,
    advanceClock: (ms: number) => {
      clockValue += ms;
    }
  };
}

async function teardown(instance: TestServer): Promise<void> {
  await instance.server.shutdown('SIGTERM').catch(() => undefined);
  runningServers.splice(runningServers.indexOf(instance.server), 1);
  await dropDatabase(instance.databaseName);
}

async function countRows(databaseUrl: string, table: string): Promise<number> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query<{ count: string }>(`SELECT count(*)::int AS count FROM ${table}`);
    return Number(result.rows[0]?.count ?? 0);
  } finally {
    await client.end();
  }
}

afterEach(async () => {
  await Promise.allSettled(runningServers.splice(0).map((server) => server.shutdown('SIGTERM')));
});

describe.skipIf(!databaseAvailable)('POST /identity/guest (real PostgreSQL + real HTTP)', () => {
  afterAll(async () => {
    for (const name of [...disposableDatabaseNames]) {
      await dropDatabase(name).catch(() => undefined);
    }

    // Security search: raw credentials and the DB password must never
    // appear in ANY log line captured across every server/test in this file.
    for (const line of allCapturedLogLines) {
      for (const credential of issuedRawCredentials) {
        expect(line).not.toContain(credential);
      }
      expect(line).not.toContain('burningspace_test_password');
    }
  });

  test('an allowed-Origin POST creates a durable guest identity with correct CORS and no-store', async () => {
    const instance = await bootTestServer();
    try {
      const response = await fetch(`${instance.server.url}/identity/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
        body: JSON.stringify({ intent: 'create_guest' })
      });

      expect(response.status).toBe(201);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN);
      expect(response.headers.get('vary')).toContain('Origin');

      const body = (await response.json()) as { ok: boolean; playerId: string; credential: string };
      expect(body.ok).toBe(true);
      expect(body.playerId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(body.credential).toMatch(/^bsc1_[A-Za-z0-9_-]{43}$/);
      issuedRawCredentials.push(body.credential);

      const client = new Client({ connectionString: instance.databaseUrl });
      await client.connect();
      try {
        const players = await client.query('SELECT player_id FROM players');
        expect(players.rowCount).toBe(1);
        expect(players.rows[0]?.player_id).toBe(body.playerId);

        const credentials = await client.query<{
          credential_version: number;
          algorithm: string;
          credential_hash: Buffer;
          revoked_at: Date | null;
        }>('SELECT credential_version, algorithm, credential_hash, revoked_at FROM player_credentials');
        expect(credentials.rowCount).toBe(1);
        expect(credentials.rows[0]?.credential_version).toBe(1);
        expect(credentials.rows[0]?.algorithm).toBe('sha256');
        expect(credentials.rows[0]?.credential_hash).toHaveLength(32);
        expect(credentials.rows[0]?.revoked_at).toBeNull();

        const memberships = await client.query('SELECT * FROM world_memberships');
        expect(memberships.rowCount).toBe(0);

        const world = await client.query<{ state_revision: string }>(
          "SELECT state_revision FROM worlds WHERE world_slug = 'public-arena'"
        );
        expect(world.rows[0]?.state_revision).toBe('0');

        // The raw credential must not appear in any text/bytea representation.
        const rawSecretPart = body.credential.slice('bsc1_'.length);
        const allText = await client.query<{ text: string }>(
          `SELECT string_agg(t::text, ' ') AS text FROM (
             SELECT player_id::text, display_name::text FROM players
             UNION ALL
             SELECT credential_id::text, encode(credential_hash, 'hex') FROM player_credentials
           ) AS t(x, y)`
        );
        const dumped = JSON.stringify(allText.rows);
        expect(dumped).not.toContain(rawSecretPart);
        expect(dumped).not.toContain(body.credential);
      } finally {
        await client.end();
      }
    } finally {
      await teardown(instance);
    }
  });

  test('a second normal guest call creates a different player and credential (no Sybil prevention claimed)', async () => {
    const instance = await bootTestServer();
    try {
      const first = await fetch(`${instance.server.url}/identity/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
        body: JSON.stringify({ intent: 'create_guest' })
      });
      const firstBody = (await first.json()) as { playerId: string; credential: string };
      issuedRawCredentials.push(firstBody.credential);

      instance.advanceClock(120_000);

      const second = await fetch(`${instance.server.url}/identity/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
        body: JSON.stringify({ intent: 'create_guest' })
      });
      const secondBody = (await second.json()) as { playerId: string; credential: string };
      issuedRawCredentials.push(secondBody.credential);

      expect(second.status).toBe(201);
      expect(secondBody.playerId).not.toBe(firstBody.playerId);
      expect(secondBody.credential).not.toBe(firstBody.credential);

      expect(await countRows(instance.databaseUrl, 'players')).toBe(2);
      expect(await countRows(instance.databaseUrl, 'player_credentials')).toBe(2);
    } finally {
      await teardown(instance);
    }
  });

  test('malformed requests are rejected 400 and create no player row', async () => {
    const instance = await bootTestServer();
    try {
      const malformedBodies: unknown[] = [
        undefined,
        'not json{{{',
        [],
        null,
        { intent: 'wrong_intent' },
        { intent: 'create_guest', playerId: 'attacker-supplied' },
        { intent: 'create_guest', credential: 'bsc1_attacker' }
      ];

      for (const malformed of malformedBodies) {
        instance.advanceClock(120_000);
        const rawBody = typeof malformed === 'string' ? malformed : malformed === undefined ? '' : JSON.stringify(malformed);
        const response = await fetch(`${instance.server.url}/identity/guest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
          body: rawBody
        });
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body).toEqual({ ok: false, error: 'invalid_request' });
      }

      expect(await countRows(instance.databaseUrl, 'players')).toBe(0);
    } finally {
      await teardown(instance);
    }
  });

  test('a body over 1024 bytes is bounded-rejected and creates no player row', async () => {
    const instance = await bootTestServer();
    try {
      const oversizedPadding = 'x'.repeat(2000);
      const response = await fetch(`${instance.server.url}/identity/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
        body: JSON.stringify({ intent: 'create_guest', padding: oversizedPadding })
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ ok: false, error: 'invalid_request' });
      expect(await countRows(instance.databaseUrl, 'players')).toBe(0);
    } finally {
      await teardown(instance);
    }
  });

  test('an unsupported method returns 405', async () => {
    const instance = await bootTestServer();
    try {
      const response = await fetch(`${instance.server.url}/identity/guest`, {
        method: 'GET',
        headers: { Origin: ALLOWED_ORIGIN }
      });
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('POST, OPTIONS');
    } finally {
      await teardown(instance);
    }
  });

  test('a denied Origin is rejected 403 with no CORS header and no DB creation', async () => {
    const instance = await bootTestServer();
    try {
      const response = await fetch(`${instance.server.url}/identity/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: HOSTILE_ORIGIN },
        body: JSON.stringify({ intent: 'create_guest' })
      });

      expect(response.status).toBe(403);
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
      expect(await countRows(instance.databaseUrl, 'players')).toBe(0);
    } finally {
      await teardown(instance);
    }
  });

  test('the peer burst limit permits exactly 3 immediate creates and rejects the 4th with 429 before any DB write', async () => {
    const instance = await bootTestServer();
    try {
      for (let i = 0; i < 3; i += 1) {
        const response = await fetch(`${instance.server.url}/identity/guest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
          body: JSON.stringify({ intent: 'create_guest' })
        });
        expect(response.status).toBe(201);
        const body = (await response.json()) as { credential: string };
        issuedRawCredentials.push(body.credential);
      }

      const fourth = await fetch(`${instance.server.url}/identity/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
        body: JSON.stringify({ intent: 'create_guest' })
      });
      expect(fourth.status).toBe(429);
      const fourthBody = await fourth.json();
      expect(fourthBody).toEqual({ ok: false, error: 'rate_limited' });
      expect(Number(fourth.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);

      expect(await countRows(instance.databaseUrl, 'players')).toBe(3);
    } finally {
      await teardown(instance);
    }
  });

  test('writer authority no longer safe returns 503 from the live endpoint and creates no guest', async () => {
    const instance = await bootTestServer();
    try {
      // Use only the public Packet-3 WriterLifecycle API (release()) to make
      // isControlSafe() false, without reaching into private fields and
      // without tearing down the HTTP server itself.
      await instance.server.persistence.writer.release();
      expect(instance.server.persistence.writer.isControlSafe()).toBe(false);
      expect(instance.server.lifecycle.state).toBe('ready');

      const response = await fetch(`${instance.server.url}/identity/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
        body: JSON.stringify({ intent: 'create_guest' })
      });
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body).toEqual({ ok: false, error: 'persistence_unavailable' });

      expect(await countRows(instance.databaseUrl, 'players')).toBe(0);
    } finally {
      await teardown(instance);
    }
  });
});
