import type { MapSchema } from '@colyseus/schema';
import { Client, Room, getStateCallbacks } from 'colyseus.js';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ProfileClientMessages,
  ProfileServerMessages,
  type ProfileAcceptedMessage
} from '@burningspace/protocol';
import {
  ClientMessages,
  ServerMessages,
  type PlayerInputMessage
} from '@burningspace/shared';
import {
  NetworkClient,
  type ConnectionState,
  type PlayerInputPayload
} from '../../client/src/network/NetworkClient';
import {
  parseNetworkBoundaryConfig,
  type NetworkBoundaryConfig
} from '../src/security/networkBoundary.js';
import {
  startProductionBattleServer,
  type ProductionBattleServerHandle
} from './support/startProductionBattleServer.js';

const ALLOWED_ORIGIN = 'https://play.example.com';
const HOSTILE_ORIGIN = 'https://hostile.example';
const WAIT_TIMEOUT_MS = 5_000;
const TEST_TIMEOUT_MS = 20_000;

interface ParticipantSchema {
  sessionId: string;
  nickname: string;
  mode: string;
  faction: string;
  profileReady: boolean;
}

interface ShipSchema {
  ownerSessionId: string;
  nickname: string;
  faction: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  lastProcessedInput: number;
  health: number;
}

interface ProjectileSchema {
  id: string;
  ownerSessionId: string;
}

interface BattleStateSchema {
  participants: MapSchema<ParticipantSchema, string>;
  ships: MapSchema<ShipSchema, string>;
  projectiles: MapSchema<ProjectileSchema, string>;
}

interface NetworkClientRoomAccess {
  room?: Room<BattleStateSchema>;
}

interface NetworkClientInternalAccess extends NetworkClientRoomAccess {
  client: Client;
  reconnectionToken?: string;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(
  condition: () => boolean,
  label: string,
  timeoutMs = WAIT_TIMEOUT_MS
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (condition()) {
      return;
    }

    await delay(20);
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}.`);
}

function testConfig(
  options: {
    production?: boolean;
    reconnectGraceSeconds?: number;
    inputBurst?: number;
    inputRate?: number;
    monotonicNow?: () => number;
  } = {}
): NetworkBoundaryConfig {
  return parseNetworkBoundaryConfig(
    {
      NODE_ENV: options.production ? 'production' : 'test',
      BURNINGSPACE_ALLOWED_ORIGINS: options.production ? ALLOWED_ORIGIN : undefined,
      BURNINGSPACE_RECONNECT_GRACE_SECONDS: String(options.reconnectGraceSeconds ?? 2),
      BURNINGSPACE_INPUT_RATE_BURST: options.inputBurst === undefined
        ? undefined
        : String(options.inputBurst),
      BURNINGSPACE_INPUT_RATE_PER_SECOND: options.inputRate === undefined
        ? undefined
        : String(options.inputRate)
    },
    { monotonicNow: options.monotonicNow }
  );
}

function createClient(serverUrl: string, origin?: string): Client {
  return origin === undefined
    ? new Client(serverUrl)
    : new Client(serverUrl, { headers: { Origin: origin } });
}

function input(
  sequence: number,
  options: { right?: boolean; shooting?: boolean; aimAngle?: number } = {}
): PlayerInputMessage {
  return {
    up: false,
    down: false,
    left: false,
    right: options.right ?? false,
    aimAngle: options.aimAngle ?? 0,
    shooting: options.shooting ?? false,
    sequence
  };
}

function playerInput(right = false): PlayerInputPayload {
  return {
    up: false,
    down: false,
    left: false,
    right,
    aimAngle: 0,
    shooting: false
  };
}

function requireShip(room: Room<BattleStateSchema>, sessionId: string): ShipSchema {
  const ship = room.state.ships.get(sessionId);

  if (!ship) {
    throw new Error(`Expected a replicated ship for session ${sessionId}.`);
  }

  return ship;
}

function ownerCount(room: Room<BattleStateSchema>, sessionId: string): number {
  return Array.from(room.state.ships.values())
    .filter(({ ownerSessionId }) => ownerSessionId === sessionId).length;
}

async function setPlayerProfile(
  room: Room<BattleStateSchema>,
  nickname: string,
  faction: 'red' | 'blue'
): Promise<void> {
  const accepted: ProfileAcceptedMessage[] = [];
  room.onMessage<ProfileAcceptedMessage>(
    ProfileServerMessages.PROFILE_ACCEPTED,
    (message) => accepted.push(message)
  );
  room.send(ProfileClientMessages.SET_PROFILE, { nickname, mode: 'player', faction });
  await waitFor(
    () => accepted.length === 1 && room.state.ships.has(room.sessionId),
    `${nickname} profile acceptance`
  );
}

async function leaveIfOpen(room: Room<BattleStateSchema>): Promise<void> {
  if (room.connection?.isOpen) {
    await room.leave(true);
  }
}

async function reconnectWhenReady(
  client: Client,
  token: string,
  timeoutMs = WAIT_TIMEOUT_MS
): Promise<Room<BattleStateSchema>> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const room = await client.reconnect<BattleStateSchema>(token);
      room.onMessage(ServerMessages.ROOM_INFO, () => undefined);
      return room;
    } catch (error) {
      lastError = error;
      await delay(20);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Reconnect did not become ready.');
}

describe('production reconnect ownership lifecycle', () => {
  let server: ProductionBattleServerHandle | undefined;
  const rooms: Array<Room<BattleStateSchema>> = [];
  const networkClients: NetworkClient[] = [];

  async function join(origin?: string): Promise<Room<BattleStateSchema>> {
    if (!server) {
      throw new Error('Production reconnect test server is not running.');
    }

    const room = await createClient(server.url, origin)
      .joinOrCreate<BattleStateSchema>('battle');
    room.onMessage(ServerMessages.ROOM_INFO, () => undefined);
    rooms.push(room);
    await waitFor(
      () => Boolean(room.state?.participants && room.state?.ships),
      'initial reconnect test room state'
    );
    return room;
  }

  afterEach(async () => {
    await Promise.allSettled(networkClients.splice(0).map((client) => client.dispose()));
    await Promise.allSettled(rooms.splice(0).map(leaveIfOpen));
    await server?.stop();
    server = undefined;
  });

  it.each(['', '0', '61', '1.5', 'NaN', 'Infinity'])(
    'rejects an invalid reconnect grace override: %j',
    (value) => {
      expect(() => parseNetworkBoundaryConfig({
        NODE_ENV: 'development',
        BURNINGSPACE_RECONNECT_GRACE_SECONDS: value
      })).toThrow(
        'BURNINGSPACE_RECONNECT_GRACE_SECONDS must be an integer from 1 to 60.'
      );
    }
  );

  it('uses the approved reconnect grace default and accepts the inclusive bounds', () => {
    expect(parseNetworkBoundaryConfig({ NODE_ENV: 'development' }).reconnectGraceSeconds)
      .toBe(10);
    expect(parseNetworkBoundaryConfig({
      NODE_ENV: 'development',
      BURNINGSPACE_RECONNECT_GRACE_SECONDS: '1'
    }).reconnectGraceSeconds).toBe(1);
    expect(parseNetworkBoundaryConfig({
      NODE_ENV: 'development',
      BURNINGSPACE_RECONNECT_GRACE_SECONDS: '60'
    }).reconnectGraceSeconds).toBe(60);
  });

  it('preserves one authoritative owner and neutralizes stale input across a valid reconnect', async () => {
    server = await startProductionBattleServer({
      networkBoundaryConfig: testConfig()
    });
    const player = await join();
    const observer = await join();
    await setPlayerProfile(player, 'ReconnectA', 'red');
    await setPlayerProfile(observer, 'ObserverB', 'blue');
    await waitFor(() => observer.state.ships.size === 2, 'both ships to replicate');

    const sessionId = player.sessionId;
    const roomId = player.roomId;
    const token = player.reconnectionToken;
    const start = { ...requireShip(observer, sessionId) };
    player.send(ClientMessages.PLAYER_INPUT, input(1, { right: true, shooting: true }));
    await waitFor(
      () => requireShip(observer, sessionId).x > start.x + 10,
      'pre-disconnect movement'
    );
    const beforeDisconnect = { ...requireShip(observer, sessionId) };

    await player.leave(false);
    await waitFor(
      () => observer.state.participants.has(sessionId) && ownerCount(observer, sessionId) === 1,
      'ownership preservation during grace'
    );
    await delay(120);
    const projectileCountAfterNeutralization = Array.from(observer.state.projectiles.values())
      .filter(({ ownerSessionId }) => ownerSessionId === sessionId).length;
    await delay(450);
    const disconnectedShip = requireShip(observer, sessionId);
    const laterProjectileCount = Array.from(observer.state.projectiles.values())
      .filter(({ ownerSessionId }) => ownerSessionId === sessionId).length;
    expect(disconnectedShip.lastProcessedInput).toBe(1);
    expect(Math.hypot(disconnectedShip.velocityX, disconnectedShip.velocityY))
      .toBeLessThan(Math.hypot(beforeDisconnect.velocityX, beforeDisconnect.velocityY));
    expect(laterProjectileCount).toBeLessThanOrEqual(projectileCountAfterNeutralization);
    expect(disconnectedShip.health).toBe(beforeDisconnect.health);

    if (!server) {
      throw new Error('Reconnect test server stopped unexpectedly.');
    }

    const reconnected = await reconnectWhenReady(createClient(server.url), token);
    rooms.push(reconnected);
    expect(reconnected.roomId).toBe(roomId);
    expect(reconnected.sessionId).toBe(sessionId);
    await waitFor(
      () => Boolean(
        reconnected.state?.participants?.size === 2 &&
        reconnected.state?.ships?.size === 2
      ),
      'authoritative reconnect state'
    );
    expect(reconnected.state.participants.get(sessionId)?.nickname).toBe('ReconnectA');
    expect(requireShip(reconnected, sessionId).faction).toBe('red');
    expect(ownerCount(reconnected, sessionId)).toBe(1);
    expect(ownerCount(observer, sessionId)).toBe(1);
    expect(requireShip(reconnected, sessionId).x).toBeGreaterThan(start.x + 10);
    expect(requireShip(reconnected, sessionId).health).toBe(beforeDisconnect.health);

    reconnected.send(ClientMessages.PLAYER_INPUT, input(2, { right: true }));
    await waitFor(
      () => requireShip(observer, sessionId).lastProcessedInput === 2,
      'input after reconnect'
    );
  }, TEST_TIMEOUT_MS);

  it('automatically reconnects NetworkClient once and keeps existing callbacks usable', async () => {
    server = await startProductionBattleServer({
      networkBoundaryConfig: testConfig({ reconnectGraceSeconds: 3 })
    });
    const observer = await join();
    await setPlayerProfile(observer, 'AutoObserver', 'blue');
    const network = new NetworkClient({ serverUrl: server.url });
    networkClients.push(network);
    const states: ConnectionState[] = [];
    let addedShips = 0;
    let changedShips = 0;
    network.onConnectionStateChanged((state) => states.push(state));
    network.onShipAdded(() => { addedShips += 1; });
    network.onShipChanged(() => { changedShips += 1; });
    await network.connect();
    network.setProfile({ nickname: 'AutoReconnect', mode: 'player', faction: 'red' });
    await waitFor(() => network.profile?.nickname === 'AutoReconnect', 'automatic client profile');
    const sessionId = network.getSessionId();

    if (!sessionId) {
      throw new Error('Expected the automatic reconnect client session.');
    }

    await waitFor(() => ownerCount(observer, sessionId) === 1, 'automatic client ship');
    const room = (network as unknown as NetworkClientRoomAccess).room;

    if (!room) {
      throw new Error('Expected the automatic client room connection.');
    }

    await room.leave(false);
    await waitFor(
      () => states.some(({ status }) => status === 'connecting'),
      'automatic reconnect to begin'
    );
    await waitFor(
      () => network.getSessionId() === sessionId && states.at(-1)?.status === 'connected',
      'automatic reconnect to complete'
    );
    expect(network.currentParticipants.filter(({ sessionId: id }) => id === sessionId)).toHaveLength(1);
    expect(network.currentShips.filter(({ ownerSessionId }) => ownerSessionId === sessionId)).toHaveLength(1);
    expect(ownerCount(observer, sessionId)).toBe(1);
    expect(addedShips).toBe(2);
    expect(changedShips).toBeGreaterThan(0);

    const sequence = network.getOwnShipSnapshot()?.lastProcessedInput ?? 0;
    network.sendPlayerInput(playerInput(true));
    await waitFor(
      () => requireShip(observer, sessionId).lastProcessedInput > sequence,
      'automatic client input after reconnect'
    );

    await network.disconnect();
    const stateCount = states.length;
    await waitFor(
      () => !observer.state.participants.has(sessionId) && ownerCount(observer, sessionId) === 0,
      'automatic client consented cleanup'
    );
    await delay(350);
    expect(states).toHaveLength(stateCount);
    expect(states.at(-1)?.status).toBe('disconnected');
  }, TEST_TIMEOUT_MS);

  it('makes consented leave final and expires unconsented ownership exactly once', async () => {
    server = await startProductionBattleServer({
      networkBoundaryConfig: testConfig({ reconnectGraceSeconds: 1 })
    });
    const consented = await join();
    const observer = await join();
    await setPlayerProfile(consented, 'Consented', 'red');
    await setPlayerProfile(observer, 'ExpiryObserver', 'blue');
    const consentedSessionId = consented.sessionId;
    const consentedToken = consented.reconnectionToken;
    const startedAt = Date.now();
    await consented.leave(true);
    await waitFor(
      () => !observer.state.participants.has(consentedSessionId) && ownerCount(observer, consentedSessionId) === 0,
      'immediate consented cleanup'
    );
    expect(Date.now() - startedAt).toBeLessThan(900);
    await expect(createClient(server.url).reconnect(consentedToken)).rejects.toThrow();

    const expiring = await join();
    await setPlayerProfile(expiring, 'Expiring', 'red');
    const expiringSessionId = expiring.sessionId;
    const expiredToken = expiring.reconnectionToken;
    let participantRemovals = 0;
    let shipRemovals = 0;
    const $ = getStateCallbacks(observer);
    $(observer.state).participants.onRemove((_participant, sessionId) => {
      if (sessionId === expiringSessionId) {
        participantRemovals += 1;
      }
    });
    $(observer.state).ships.onRemove((_ship, shipId) => {
      if (shipId === expiringSessionId) {
        shipRemovals += 1;
      }
    });
    await expiring.leave(false);
    expect(observer.state.participants.has(expiringSessionId)).toBe(true);
    await waitFor(
      () => !observer.state.participants.has(expiringSessionId) && ownerCount(observer, expiringSessionId) === 0,
      'grace expiry cleanup',
      3_000
    );
    expect(participantRemovals).toBe(1);
    expect(shipRemovals).toBe(1);
    await expect(createClient(server.url).reconnect(expiredToken)).rejects.toThrow();

    const observerSequence = requireShip(observer, observer.sessionId).lastProcessedInput;
    observer.send(ClientMessages.PLAYER_INPUT, input(observerSequence + 1));
    await waitFor(
      () => requireShip(observer, observer.sessionId).lastProcessedInput === observerSequence + 1,
      'remaining room usability after expiry'
    );
  }, TEST_TIMEOUT_MS);

  it('isolates invalid tokens and preserves the production Origin gate during reconnect', async () => {
    server = await startProductionBattleServer({
      networkBoundaryConfig: testConfig({ production: true, reconnectGraceSeconds: 3 })
    });
    const player = await join(ALLOWED_ORIGIN);
    const observer = await join(ALLOWED_ORIGIN);
    await setPlayerProfile(player, 'OriginReconnect', 'red');
    await setPlayerProfile(observer, 'OriginObserver', 'blue');
    const sessionId = player.sessionId;
    const token = player.reconnectionToken;
    const otherToken = observer.reconnectionToken;
    await player.leave(false);

    await expect(
      createClient(server.url, ALLOWED_ORIGIN).reconnect(`${player.roomId}:invalid-token`)
    ).rejects.toThrow();
    await expect(createClient(server.url, ALLOWED_ORIGIN).reconnect(otherToken)).rejects.toThrow();
    expect(observer.state.participants.has(sessionId)).toBe(true);
    expect(ownerCount(observer, sessionId)).toBe(1);

    await expect(createClient(server.url, HOSTILE_ORIGIN).reconnect(token)).rejects.toThrow();
    expect(observer.state.participants.has(sessionId)).toBe(true);
    expect(ownerCount(observer, sessionId)).toBe(1);

    const reconnected = await createClient(server.url, ALLOWED_ORIGIN)
      .reconnect<BattleStateSchema>(token);
    rooms.push(reconnected);
    expect(reconnected.sessionId).toBe(sessionId);
    await waitFor(() => ownerCount(observer, sessionId) === 1, 'allowed-Origin reconnect');
    expect(observer.state.participants.size).toBe(2);
    expect(observer.state.ships.size).toBe(2);
  }, TEST_TIMEOUT_MS);

  it('retains the input limiter bucket across reconnect', async () => {
    let securityNow = 0;
    server = await startProductionBattleServer({
      networkBoundaryConfig: testConfig({
        reconnectGraceSeconds: 3,
        inputBurst: 2,
        inputRate: 1,
        monotonicNow: () => securityNow
      })
    });
    const player = await join();
    const observer = await join();
    await setPlayerProfile(player, 'LimitedReconnect', 'red');
    await setPlayerProfile(observer, 'LimiterObserver', 'blue');
    const sessionId = player.sessionId;
    const token = player.reconnectionToken;
    player.send(ClientMessages.PLAYER_INPUT, input(1));
    await delay(15);
    player.send(ClientMessages.PLAYER_INPUT, input(2));
    await waitFor(() => requireShip(observer, sessionId).lastProcessedInput === 2, 'input budget consumption');
    player.send(ClientMessages.PLAYER_INPUT, input(3));
    await delay(100);
    expect(requireShip(observer, sessionId).lastProcessedInput).toBe(2);

    await player.leave(false);
    const reconnected = await reconnectWhenReady(createClient(server.url), token);
    rooms.push(reconnected);
    reconnected.send(ClientMessages.PLAYER_INPUT, input(4));
    await delay(150);
    expect(requireShip(observer, sessionId).lastProcessedInput).toBe(2);

    securityNow += 1_000;
    reconnected.send(ClientMessages.PLAYER_INPUT, input(5));
    await waitFor(
      () => requireShip(observer, sessionId).lastProcessedInput === 5,
      'retained limiter refill after reconnect'
    );
  }, TEST_TIMEOUT_MS);

  it('bounds final client failure to five attempts and lets disposal cancel pending retry', async () => {
    server = await startProductionBattleServer({
      networkBoundaryConfig: testConfig({ reconnectGraceSeconds: 1 })
    });
    const failing = new NetworkClient({ serverUrl: server.url });
    networkClients.push(failing);
    let failureState: ConnectionState = { status: 'disconnected' };
    failing.onConnectionStateChanged((state) => { failureState = state; });
    await failing.connect();
    const failingAccess = failing as unknown as NetworkClientInternalAccess;
    const failingRoom = failingAccess.room;

    if (!failingRoom) {
      throw new Error('Expected the bounded-failure client room.');
    }

    let reconnectAttempts = 0;
    failingAccess.client.reconnect = async () => {
      reconnectAttempts += 1;
      throw new Error('Synthetic reconnect failure.');
    };
    await failingRoom.leave(false);
    await waitFor(
      () => failureState.status === 'error' && reconnectAttempts === 5,
      'five-attempt reconnect exhaustion',
      9_000
    );
    expect(reconnectAttempts).toBe(5);
    expect(failingAccess.reconnectionToken).toBeUndefined();

    const cancellable = new NetworkClient({ serverUrl: server.url });
    networkClients.push(cancellable);
    await cancellable.connect();
    const cancellableAccess = cancellable as unknown as NetworkClientInternalAccess;
    const cancellableRoom = cancellableAccess.room;

    if (!cancellableRoom) {
      throw new Error('Expected the cancellable reconnect client room.');
    }

    let cancelledAttempts = 0;
    cancellableAccess.client.reconnect = async () => {
      cancelledAttempts += 1;
      throw new Error('A disposed client must not retry.');
    };
    await cancellableRoom.leave(false);
    await cancellable.dispose();
    await delay(350);
    expect(cancelledAttempts).toBe(0);
    expect(cancellableAccess.reconnectionToken).toBeUndefined();
  }, TEST_TIMEOUT_MS);

  it('shuts down cleanly while reconnection is pending', async () => {
    server = await startProductionBattleServer({
      networkBoundaryConfig: testConfig({ reconnectGraceSeconds: 3 })
    });
    const player = await join();
    const observer = await join();
    await setPlayerProfile(player, 'ShutdownPending', 'red');
    await setPlayerProfile(observer, 'ShutdownObserver', 'blue');
    const sessionId = player.sessionId;
    const connectedCounts: number[] = [];
    observer.onMessage<{ connectedClients: number }>(ServerMessages.ROOM_INFO, (message) => {
      connectedCounts.push(message.connectedClients);
    });
    await player.leave(false);
    await waitFor(
      () => connectedCounts.at(-1) === 1 && observer.state.participants.has(sessionId),
      'pending reconnect before shutdown'
    );
    const stopping = server.stop();
    await expect(stopping).resolves.toBeUndefined();
    server = undefined;
  }, TEST_TIMEOUT_MS);
});
