import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetworkClient, type ConnectionState } from '../src/network/NetworkClient';
import {
  classifyInitialConnectionError,
  createIdleConnectionPresentation,
  getConnectionPresentationCopy,
  getPlayerConnectionErrorMessage,
  type ConnectionErrorCategory
} from '../src/network/connectionPresentation';

type Callback<TArgs extends unknown[]> = (...args: TArgs) => void;

interface TestSignal<TArgs extends unknown[]> {
  (callback: Callback<TArgs>): () => void;
  callbacks: Callback<TArgs>[];
  invoke(...args: TArgs): void;
  remove(callback: Callback<TArgs>): void;
  clear(): void;
}

interface TestRoom {
  sessionId: string;
  reconnectionToken: string;
  state: {
    participants: Map<string, never>;
    ships: Map<string, never>;
    projectiles: Map<string, never>;
  };
  onStateChange: TestSignal<[]>;
  onError: TestSignal<[number, string?]>;
  onLeave: TestSignal<[number]>;
  onMessage(type: string, callback: Callback<[unknown]>): () => void;
  leave(consented?: boolean): Promise<void>;
  removeAllListeners(): void;
  send(): void;
}

interface NetworkClientInternals {
  client: {
    joinOrCreate: ReturnType<typeof vi.fn>;
    reconnect: ReturnType<typeof vi.fn>;
  };
  room?: TestRoom;
  connectionEpoch: number;
  connectingPromise?: Promise<void>;
  registerParticipantListeners(): void;
  registerShipListeners(): void;
  registerProjectileListeners(): void;
  beginConnectionOperation(): number;
  connectInternal(epoch: number): Promise<void>;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

const errorCategories: readonly ConnectionErrorCategory[] = [
  'server_unavailable',
  'join_failed',
  'connection_lost',
  'reconnect_failed',
  'unexpected_failure'
];

function createSignal<TArgs extends unknown[]>(): TestSignal<TArgs> {
  const callbacks: Callback<TArgs>[] = [];
  const signal = ((callback: Callback<TArgs>) => {
    callbacks.push(callback);
    return () => signal.remove(callback);
  }) as TestSignal<TArgs>;
  signal.callbacks = callbacks;
  signal.invoke = (...args: TArgs) => {
    for (const callback of [...callbacks]) {
      callback(...args);
    }
  };
  signal.remove = (callback) => {
    const index = callbacks.indexOf(callback);

    if (index >= 0) {
      callbacks.splice(index, 1);
    }
  };
  signal.clear = () => callbacks.splice(0);
  return signal;
}

function createTestRoom(id: string): TestRoom {
  const onStateChange = createSignal<[]>();
  const onError = createSignal<[number, string?]>();
  const onLeave = createSignal<[number]>();
  const messageDisposers: Array<() => void> = [];

  return {
    sessionId: id,
    reconnectionToken: `opaque-${id}`,
    state: {
      participants: new Map<string, never>(),
      ships: new Map<string, never>(),
      projectiles: new Map<string, never>()
    },
    onStateChange,
    onError,
    onLeave,
    onMessage: () => {
      const dispose = vi.fn();
      messageDisposers.push(dispose);
      return dispose;
    },
    async leave(consented = true): Promise<void> {
      if (consented) {
        onLeave.invoke(4000);
      }
    },
    removeAllListeners(): void {
      onStateChange.clear();
      onError.clear();
      onLeave.clear();

      for (const dispose of messageDisposers.splice(0)) {
        dispose();
      }
    },
    send(): void {}
  };
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createHarness(): {
  network: NetworkClient;
  internals: NetworkClientInternals;
  joinOrCreate: ReturnType<typeof vi.fn>;
  reconnect: ReturnType<typeof vi.fn>;
} {
  const network = new NetworkClient({ serverUrl: 'http://127.0.0.1:2567' });
  const internals = network as unknown as NetworkClientInternals;
  const joinOrCreate = vi.fn();
  const reconnect = vi.fn();
  internals.client.joinOrCreate = joinOrCreate;
  internals.client.reconnect = reconnect;
  internals.registerParticipantListeners = vi.fn();
  internals.registerShipListeners = vi.fn();
  internals.registerProjectileListeners = vi.fn();
  return { network, internals, joinOrCreate, reconnect };
}

function collectStates(network: NetworkClient): ConnectionState[] {
  const states: ConnectionState[] = [];
  network.onConnectionStateChanged((state) => states.push(state));
  return states;
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('connection presentation', () => {
  it('defines bounded copy for every lifecycle state', () => {
    const idle = createIdleConnectionPresentation();
    expect(getConnectionPresentationCopy(idle)).toEqual({
      label: 'Not connected',
      detail: 'Connect when you are ready to enter the Public Arena.',
      tone: 'neutral'
    });

    for (const lifecycle of [
      'connecting',
      'connected',
      'connection_lost',
      'reconnecting',
      'reconnected',
      'connection_problem',
      'terminal_failure'
    ] as const) {
      const copy = getConnectionPresentationCopy({
        lifecycle,
        operation: lifecycle === 'connecting' ? 'initial_connect' : 'none',
        recovery: 'none',
        errorCategory: lifecycle === 'terminal_failure' ? 'unexpected_failure' : undefined
      });
      expect(copy.label.length).toBeGreaterThan(0);
      expect(copy.detail.length).toBeLessThanOrEqual(100);
    }
  });

  it('classifies transport failures without exposing diagnostics', () => {
    expect(classifyInitialConnectionError(new Error('WebSocket ECONNREFUSED wss://internal.example')))
      .toBe('server_unavailable');
    expect(classifyInitialConnectionError(new Error('MATCHMAKE_INVALID_CRITERIA token=secret')))
      .toBe('join_failed');

    for (const category of errorCategories) {
      const message = getPlayerConnectionErrorMessage(category);
      expect(message.length).toBeLessThanOrEqual(100);
      expect(message).not.toMatch(/secret|token|internal\.example|econnrefused|matchmake/i);
    }
  });
});

describe('NetworkClient lifecycle ownership', () => {
  it('moves idle to connecting to connected and suppresses duplicate initial connects', async () => {
    const { network, joinOrCreate } = createHarness();
    const room = createTestRoom('initial');
    const pendingJoin = deferred<TestRoom>();
    joinOrCreate.mockReturnValueOnce(pendingJoin.promise);
    const states = collectStates(network);

    const first = network.connect();
    const duplicate = network.connect();

    expect(joinOrCreate).toHaveBeenCalledTimes(1);
    expect(network.getConnectionState()).toMatchObject({
      status: 'connecting',
      lifecycle: 'connecting',
      operation: 'initial_connect',
      recovery: 'none'
    });

    pendingJoin.resolve(room);
    await Promise.all([first, duplicate]);

    expect(network.getConnectionState()).toMatchObject({
      status: 'connected',
      lifecycle: 'connected',
      operation: 'none'
    });
    expect(states.map((state) => state.lifecycle)).toEqual(['idle', 'connecting', 'connected']);
  });

  it('keeps an initial failure terminal and starts retry as a fresh operation', async () => {
    const { network, internals, joinOrCreate } = createHarness();
    joinOrCreate.mockRejectedValueOnce(new Error('MATCHMAKE failure at https://internal.example?token=secret'));

    await network.connect();
    const failedEpoch = internals.connectionEpoch;
    expect(network.getConnectionState()).toMatchObject({
      status: 'error',
      lifecycle: 'terminal_failure',
      recovery: 'retry_connection',
      errorCategory: 'join_failed'
    });
    expect(network.getConnectionState().error).not.toMatch(/internal|token|matchmake/i);

    network.setProfile({ nickname: 'Pilot', mode: 'spectator' });
    expect(network.getConnectionState()).toMatchObject({
      lifecycle: 'terminal_failure',
      errorCategory: 'join_failed',
      profileError: 'Connect before applying a profile.'
    });

    const retryRoom = createTestRoom('retry');
    const retryJoin = deferred<TestRoom>();
    joinOrCreate.mockReturnValueOnce(retryJoin.promise);
    const retry = network.connect();
    expect(internals.connectionEpoch).toBe(failedEpoch + 1);
    expect(network.getConnectionState()).toMatchObject({ lifecycle: 'connecting', operation: 'initial_connect' });
    retryJoin.resolve(retryRoom);
    await retry;
    expect(network.getConnectionState().lifecycle).toBe('connected');
  });

  it('reports loss and reconnecting, suppresses duplicate reconnect work, and reports actual success', async () => {
    vi.useFakeTimers();
    const { network, joinOrCreate, reconnect } = createHarness();
    const firstRoom = createTestRoom('first');
    const secondRoom = createTestRoom('second');
    joinOrCreate.mockResolvedValueOnce(firstRoom);
    reconnect.mockResolvedValueOnce(secondRoom);
    const states = collectStates(network);
    await network.connect();
    const staleLeave = firstRoom.onLeave.callbacks[0];
    const staleError = firstRoom.onError.callbacks[0];

    firstRoom.onLeave.invoke(1006);
    expect(states.map((state) => state.lifecycle)).toContain('connection_lost');
    expect(network.getConnectionState()).toMatchObject({
      status: 'connecting',
      lifecycle: 'reconnecting',
      operation: 'reconnect'
    });

    const retryDuringReconnect = network.connect();
    staleLeave?.(1006);
    await vi.advanceTimersByTimeAsync(250);
    await retryDuringReconnect;

    expect(joinOrCreate).toHaveBeenCalledTimes(1);
    expect(reconnect).toHaveBeenCalledTimes(1);
    expect(network.getConnectionState()).toMatchObject({
      status: 'connected',
      lifecycle: 'reconnected',
      operation: 'none'
    });

    staleError?.(500, 'token=secret internal host');
    expect(network.getConnectionState().lifecycle).toBe('reconnected');

    await vi.advanceTimersByTimeAsync(1200);
    expect(network.getConnectionState().lifecycle).toBe('connected');
  });

  it('returns consented disconnect to idle without starting reconnect work', async () => {
    const { network, joinOrCreate, reconnect } = createHarness();
    joinOrCreate.mockResolvedValueOnce(createTestRoom('consented'));
    await network.connect();

    await Promise.all([network.disconnect(), network.disconnect()]);

    expect(network.getConnectionState()).toMatchObject({
      status: 'disconnected',
      lifecycle: 'idle',
      operation: 'none',
      recovery: 'none'
    });
    expect(reconnect).not.toHaveBeenCalled();
  });

  it('prevents a new connect from racing a pending explicit disconnect', async () => {
    const { network, joinOrCreate } = createHarness();
    const firstRoom = createTestRoom('disconnecting');
    const pendingLeave = deferred<void>();
    firstRoom.leave = vi.fn(() => pendingLeave.promise);
    joinOrCreate.mockResolvedValueOnce(firstRoom);
    await network.connect();

    const disconnect = network.disconnect();
    const connectDuringDisconnect = network.connect();
    expect(joinOrCreate).toHaveBeenCalledTimes(1);

    pendingLeave.resolve();
    await Promise.all([disconnect, connectDuringDisconnect]);
    expect(network.getConnectionState()).toMatchObject({
      status: 'disconnected',
      lifecycle: 'idle',
      operation: 'none'
    });

    joinOrCreate.mockResolvedValueOnce(createTestRoom('after-disconnect'));
    await network.connect();
    expect(joinOrCreate).toHaveBeenCalledTimes(2);
    expect(network.getConnectionState().lifecycle).toBe('connected');
  });

  it('uses the unchanged bounded reconnect schedule, then permits a new connection', async () => {
    vi.useFakeTimers();
    const { network, joinOrCreate, reconnect } = createHarness();
    const room = createTestRoom('failure');
    joinOrCreate.mockResolvedValueOnce(room);
    reconnect.mockRejectedValue(new Error('expired opaque-secret-token'));
    await network.connect();

    room.onLeave.invoke(1006);
    let expectedAttempts = 0;

    for (const delayMs of [250, 500, 1000, 2000, 3000]) {
      await vi.advanceTimersByTimeAsync(delayMs);
      expectedAttempts += 1;
      expect(reconnect).toHaveBeenCalledTimes(expectedAttempts);
    }

    expect(reconnect).toHaveBeenCalledTimes(5);
    expect(network.getConnectionState()).toMatchObject({
      status: 'error',
      lifecycle: 'terminal_failure',
      operation: 'none',
      recovery: 'retry_connection',
      errorCategory: 'reconnect_failed'
    });
    expect(network.getConnectionState().error).not.toMatch(/opaque|secret|token|expired/i);
    await vi.runAllTimersAsync();
    expect(reconnect).toHaveBeenCalledTimes(5);

    joinOrCreate.mockResolvedValueOnce(createTestRoom('new-session'));
    await network.connect();
    expect(joinOrCreate).toHaveBeenCalledTimes(2);
    expect(network.getConnectionState().lifecycle).toBe('connected');
  });

  it('prevents a stale reconnected presentation timer from clearing a newer room error', async () => {
    vi.useFakeTimers();
    const { network, joinOrCreate, reconnect } = createHarness();
    const firstRoom = createTestRoom('timer-first');
    const reconnectedRoom = createTestRoom('timer-reconnected');
    joinOrCreate.mockResolvedValueOnce(firstRoom);
    reconnect.mockResolvedValueOnce(reconnectedRoom);
    await network.connect();

    firstRoom.onLeave.invoke(1006);
    await vi.advanceTimersByTimeAsync(250);
    expect(network.getConnectionState().lifecycle).toBe('reconnected');

    reconnectedRoom.onError.invoke(500, 'raw internal failure');
    expect(network.getConnectionState().lifecycle).toBe('connection_problem');
    await vi.advanceTimersByTimeAsync(1200);
    expect(network.getConnectionState()).toMatchObject({
      status: 'error',
      lifecycle: 'connection_problem',
      recovery: 'disconnect'
    });
  });

  it('rejects a stale prior operation after a newer operation succeeds', async () => {
    const { network, internals, joinOrCreate } = createHarness();
    const firstJoin = deferred<TestRoom>();
    const secondJoin = deferred<TestRoom>();
    const staleRoom = createTestRoom('stale');
    const currentRoom = createTestRoom('current');
    joinOrCreate.mockReturnValueOnce(firstJoin.promise).mockReturnValueOnce(secondJoin.promise);

    const firstEpoch = internals.beginConnectionOperation();
    const firstOperation = internals.connectInternal(firstEpoch);
    const secondEpoch = internals.beginConnectionOperation();
    const secondOperation = internals.connectInternal(secondEpoch);

    secondJoin.resolve(currentRoom);
    await secondOperation;
    expect(internals.room).toBe(currentRoom);
    expect(network.getConnectionState().lifecycle).toBe('connected');

    firstJoin.resolve(staleRoom);
    await firstOperation;
    await flushPromises();
    expect(internals.room).toBe(currentRoom);
    expect(network.getConnectionState().lifecycle).toBe('connected');
  });

  it('preserves callback compatibility and sanitizes active-room errors', async () => {
    const { network, joinOrCreate } = createHarness();
    const room = createTestRoom('callbacks');
    joinOrCreate.mockResolvedValueOnce(room);
    const callback = vi.fn();
    const unsubscribe = network.onConnectionStateChanged(callback);
    expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({
      status: 'disconnected',
      lifecycle: 'idle'
    }));

    await network.connect();
    room.onError.invoke(500, 'stack token=secret https://internal.example');
    expect(network.getConnectionState()).toMatchObject({
      status: 'error',
      lifecycle: 'connection_problem',
      recovery: 'disconnect',
      errorCategory: 'unexpected_failure'
    });
    expect(network.getConnectionState().error).toBe(
      getPlayerConnectionErrorMessage('unexpected_failure', 'disconnect')
    );
    expect(network.getConnectionState().error).toMatch(/disconnect, then connect again/i);
    expect(getConnectionPresentationCopy(network.getConnectionState())).toMatchObject({
      label: 'Connection problem',
      tone: 'warning'
    });

    const callsBeforeUnsubscribe = callback.mock.calls.length;
    unsubscribe();
    await network.disconnect();
    expect(callback).toHaveBeenCalledTimes(callsBeforeUnsubscribe);
  });
});
