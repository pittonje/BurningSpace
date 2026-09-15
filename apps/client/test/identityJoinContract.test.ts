import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkClient } from '../src/network/NetworkClient';
import { IDENTITY_STORAGE_KEY, readIdentity } from '../src/network/identityStorage';

const VALID_IDENTITY = {
  version: 1,
  playerId: '11111111-2222-4333-8444-555555555555',
  credential: `bsc1_${'A'.repeat(43)}`
};
const ALLOWED_ORIGIN_ROOM_ID = 'canonical-room-id';
const SERVER_URL = 'http://127.0.0.1:2567';

function stubLocalStorage(initial: Record<string, string> = {}): Map<string, string> {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key)
  });
  return store;
}

interface FetchCall {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

function stubFetch(handlers: { guestBody?: unknown; discoveryBody?: unknown }): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      calls.push({ url, init });

      if (url.includes('/identity/guest')) {
        return new Response(JSON.stringify(handlers.guestBody ?? { ok: true, ...VALID_IDENTITY }), { status: 201 });
      }

      if (url.includes('/world/battle-room')) {
        return new Response(
          JSON.stringify(handlers.discoveryBody ?? { ok: true, roomId: ALLOWED_ORIGIN_ROOM_ID }),
          { status: 200 }
        );
      }

      throw new Error(`Unexpected fetch to ${url}`);
    })
  );
  return calls;
}

interface NetworkClientInternals {
  client: {
    joinById: ReturnType<typeof vi.fn>;
    http: { post(...args: unknown[]): Promise<unknown> };
  };
}

function createHarness(): { network: NetworkClient; internals: NetworkClientInternals; joinById: ReturnType<typeof vi.fn> } {
  const network = new NetworkClient({ serverUrl: SERVER_URL });
  const internals = network as unknown as NetworkClientInternals;
  const joinById = vi.fn().mockResolvedValue({
    sessionId: 'session-1',
    reconnectionToken: 'token-1',
    state: { participants: new Map(), ships: new Map(), projectiles: new Map() },
    onStateChange: () => () => undefined,
    onError: () => () => undefined,
    onLeave: () => () => undefined,
    onMessage: () => () => undefined,
    removeAllListeners: () => undefined,
    leave: async () => undefined
  });
  internals.client.joinById = joinById;
  return { network, internals, joinById };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Layer A -- NetworkClient identity/discovery/join behavior', () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  it('missing identity triggers POST /identity/guest, saves before discovery/join', async () => {
    const calls = stubFetch({});
    const { network, joinById } = createHarness();

    await network.connect();

    const guestCallIndex = calls.findIndex((call) => call.url.includes('/identity/guest'));
    const discoveryCallIndex = calls.findIndex((call) => call.url.includes('/world/battle-room'));

    expect(guestCallIndex).toBeGreaterThanOrEqual(0);
    expect(discoveryCallIndex).toBeGreaterThan(guestCallIndex);
    expect(readIdentity()).toEqual({ status: 'available', identity: VALID_IDENTITY });

    expect(joinById).toHaveBeenCalledTimes(1);
    expect(joinById.mock.calls[0]?.[0]).toBe(ALLOWED_ORIGIN_ROOM_ID);
  });

  it('an available stored identity skips guest creation entirely', async () => {
    stubLocalStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify(VALID_IDENTITY) });
    const calls = stubFetch({});
    const { network } = createHarness();

    await network.connect();

    expect(calls.some((call) => call.url.includes('/identity/guest'))).toBe(false);
    expect(calls.some((call) => call.url.includes('/world/battle-room'))).toBe(true);
  });

  it('join options contain ONLY credential authority -- no playerId', async () => {
    stubLocalStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify(VALID_IDENTITY) });
    stubFetch({});
    const { network, joinById } = createHarness();

    await network.connect();

    const [, options] = joinById.mock.calls[0] as [string, Record<string, unknown>];
    expect(Object.keys(options)).toEqual(['credential']);
    expect(options.credential).toBe(VALID_IDENTITY.credential);
    expect(options.playerId).toBeUndefined();
  });

  it('discovers via GET /world/battle-room and calls joinById for the exact returned roomId', async () => {
    stubLocalStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify(VALID_IDENTITY) });
    stubFetch({ discoveryBody: { ok: true, roomId: 'a-different-room' } });
    const { network, joinById } = createHarness();

    await network.connect();

    expect(joinById.mock.calls[0]?.[0]).toBe('a-different-room');
  });

  it('never falls back to joinOrCreate', async () => {
    stubLocalStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify(VALID_IDENTITY) });
    stubFetch({});
    const { network, internals } = createHarness();
    const joinOrCreate = vi.fn();
    (internals.client as unknown as { joinOrCreate: unknown }).joinOrCreate = joinOrCreate;

    await network.connect();

    expect(joinOrCreate).not.toHaveBeenCalled();
  });
});

describe('Layer B -- pinned colyseus.js wire-transport form', () => {
  beforeEach(() => {
    stubLocalStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify(VALID_IDENTITY) });
    stubFetch({});
  });

  it('the credential is serialized into the matchmaking POST body, never the request path/query', async () => {
    const network = new NetworkClient({ serverUrl: SERVER_URL });
    const internals = network as unknown as NetworkClientInternals;

    let capturedPath: string | undefined;
    let capturedOptions: Record<string, unknown> | undefined;
    const sentinel = new Error('stop-before-websocket');

    vi.spyOn(internals.client.http, 'post').mockImplementation(async (path: unknown, options: unknown) => {
      capturedPath = path as string;
      capturedOptions = options as Record<string, unknown>;
      throw sentinel;
    });

    await expect(network.connect()).resolves.toBeUndefined();

    expect(capturedPath).toBeDefined();
    expect(capturedPath).toContain('matchmake/joinById/');
    expect(capturedPath).not.toContain(VALID_IDENTITY.credential);

    const bodyText = (capturedOptions?.body as string) ?? '';
    expect(bodyText).toContain(VALID_IDENTITY.credential);
    const parsedBody = JSON.parse(bodyText) as Record<string, unknown>;
    expect(parsedBody).toEqual({ credential: VALID_IDENTITY.credential });
  });

  it('the WebSocket endpoint colyseus.js builds from a seat reservation never includes arbitrary join options (source-verified: consumeSeatReservation only forwards sessionId/reconnectionToken)', async () => {
    const network = new NetworkClient({ serverUrl: SERVER_URL });
    const internals = network as unknown as NetworkClientInternals & {
      client: NetworkClientInternals['client'] & {
        buildEndpoint(room: unknown, options?: unknown, protocol?: string): string;
      };
    };

    // Mirrors exactly what colyseus.js's Client.consumeSeatReservation
    // constructs as `options` before calling room.connect() -- confirmed
    // from the installed colyseus.js source, which builds `{ sessionId }`
    // (plus reconnectionToken when present) and never spreads the original
    // join options (our `{ credential }`) into it.
    const endpoint = internals.client.buildEndpoint(
      { name: 'battle', roomId: ALLOWED_ORIGIN_ROOM_ID, clients: 0, maxClients: 32 },
      { sessionId: 'session-1' }
    );

    expect(endpoint).not.toContain(VALID_IDENTITY.credential);
    expect(endpoint).not.toContain('credential');
  });
});

describe('Layer C -- discovery CORS dependency', () => {
  beforeEach(() => {
    stubLocalStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify(VALID_IDENTITY) });
  });

  it('a successful discovery response drives the exact roomId used for joinById', async () => {
    stubFetch({ discoveryBody: { ok: true, roomId: ALLOWED_ORIGIN_ROOM_ID } });
    const { network, joinById } = createHarness();

    await network.connect();

    expect(joinById.mock.calls[0]?.[0]).toBe(ALLOWED_ORIGIN_ROOM_ID);
  });

  it('a denied/failed discovery response prevents any join attempt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/world/battle-room')) {
          return new Response(JSON.stringify({ ok: false, error: 'invalid_request' }), { status: 403 });
        }

        return new Response(JSON.stringify({ ok: true, ...VALID_IDENTITY }), { status: 201 });
      })
    );
    const { network, joinById } = createHarness();

    await network.connect();

    expect(joinById).not.toHaveBeenCalled();
    expect(network.getConnectionState()).toMatchObject({ status: 'error', lifecycle: 'terminal_failure' });
  });
});
