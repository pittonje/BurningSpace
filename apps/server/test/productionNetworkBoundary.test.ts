import type { MapSchema } from '@colyseus/schema';
import { Client, Room } from 'colyseus.js';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ProfileClientMessages,
  ProfileServerMessages,
  type ProfileAcceptedMessage,
  type ProfileRejectedMessage
} from '@burningspace/protocol';
import {
  ClientMessages,
  ServerMessages,
  type PlayerInputMessage,
  type RoomInfoMessage
} from '@burningspace/shared';
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
const TEST_TIMEOUT_MS = 15_000;

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
}

interface BattleStateSchema {
  participants: MapSchema<ParticipantSchema, string>;
  ships: MapSchema<ShipSchema, string>;
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

function productionConfig(
  overrides: Partial<{
    profileBurst: string;
    profileRate: string;
    inputBurst: string;
    inputRate: string;
  }> = {},
  monotonicNow?: () => number
): NetworkBoundaryConfig {
  return parseNetworkBoundaryConfig(
    {
      NODE_ENV: 'production',
      BURNINGSPACE_ALLOWED_ORIGINS: ALLOWED_ORIGIN,
      BURNINGSPACE_PROFILE_RATE_BURST: overrides.profileBurst,
      BURNINGSPACE_PROFILE_RATE_PER_SECOND: overrides.profileRate,
      BURNINGSPACE_INPUT_RATE_BURST: overrides.inputBurst,
      BURNINGSPACE_INPUT_RATE_PER_SECOND: overrides.inputRate
    },
    { monotonicNow }
  );
}

function createClient(serverUrl: string, origin?: string): Client {
  return origin === undefined
    ? new Client(serverUrl)
    : new Client(serverUrl, { headers: { Origin: origin } });
}

function input(sequence: number, right = false): PlayerInputMessage {
  return {
    up: false,
    down: false,
    left: false,
    right,
    aimAngle: 0,
    shooting: false,
    sequence
  };
}

function requireShip(room: Room<BattleStateSchema>, sessionId: string): ShipSchema {
  const ship = room.state.ships.get(sessionId);

  if (!ship) {
    throw new Error(`Expected a replicated ship for session ${sessionId}.`);
  }

  return ship;
}

describe('production network boundary', () => {
  let server: ProductionBattleServerHandle | undefined;
  const rooms: Array<Room<BattleStateSchema>> = [];

  async function joinAllowedBattleRoom(): Promise<Room<BattleStateSchema>> {
    if (!server) {
      throw new Error('Production network-boundary server is not running.');
    }

    const room = await createClient(server.url, ALLOWED_ORIGIN)
      .joinOrCreate<BattleStateSchema>('battle');
    room.onMessage<RoomInfoMessage>(ServerMessages.ROOM_INFO, () => undefined);
    await waitFor(
      () => Boolean(room.state?.participants && room.state?.ships),
      'the initial production room state'
    );
    rooms.push(room);
    return room;
  }

  afterEach(async () => {
    await Promise.allSettled(rooms.splice(0).map((room) => room.leave(true)));
    await server?.stop();
    server = undefined;
  });

  it('enforces production matchmaking, WebSocket, CORS, and health boundaries', async () => {
    server = await startProductionBattleServer({
      networkBoundaryConfig: productionConfig()
    });

    const allowedPreflight = await fetch(`${server.url}/matchmake/joinOrCreate/battle`, {
      method: 'OPTIONS',
      headers: { Origin: ALLOWED_ORIGIN }
    });
    expect(allowedPreflight.status).toBe(204);
    expect(allowedPreflight.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN);
    expect(allowedPreflight.headers.get('vary')).toBe('Origin');

    const deniedPreflight = await fetch(`${server.url}/matchmake/joinOrCreate/battle`, {
      method: 'OPTIONS',
      headers: { Origin: HOSTILE_ORIGIN }
    });
    expect(deniedPreflight.status).toBe(204);
    expect(deniedPreflight.headers.get('access-control-allow-origin')).toBe('');
    expect(deniedPreflight.headers.get('access-control-allow-origin')).not.toBe('*');
    expect(deniedPreflight.headers.get('access-control-allow-origin')).not.toBe(HOSTILE_ORIGIN);
    expect(deniedPreflight.headers.get('vary')).toBe('Origin');

    await expect(
      createClient(server.url, HOSTILE_ORIGIN).joinOrCreate('battle')
    ).rejects.toThrow('onAuth failed');
    await expect(createClient(server.url).joinOrCreate('battle')).rejects.toThrow(
      'onAuth failed'
    );

    const health = await fetch(`${server.url}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true, service: 'burningspace-server' });

    const allowedRoom = await joinAllowedBattleRoom();
    const acceptedProfiles: ProfileAcceptedMessage[] = [];
    allowedRoom.onMessage<ProfileAcceptedMessage>(
      ProfileServerMessages.PROFILE_ACCEPTED,
      (message) => acceptedProfiles.push(message)
    );
    allowedRoom.send(ProfileClientMessages.SET_PROFILE, {
      nickname: 'Allowed',
      mode: 'player',
      faction: 'red'
    });

    await waitFor(
      () => acceptedProfiles.length === 1 && allowedRoom.state.ships.size === 1,
      'an allowed-origin production client to become usable'
    );
    expect(allowedRoom.state.participants.size).toBe(1);
    expect(requireShip(allowedRoom, allowedRoom.sessionId).ownerSessionId).toBe(
      allowedRoom.sessionId
    );
  }, TEST_TIMEOUT_MS);

  it('bounds profile floods before mutation and limits rejection amplification', async () => {
    let securityNow = 0;
    server = await startProductionBattleServer({
      networkBoundaryConfig: productionConfig(
        { profileBurst: '2', profileRate: '0.25' },
        () => securityNow
      )
    });

    const room = await joinAllowedBattleRoom();
    const acceptedProfiles: ProfileAcceptedMessage[] = [];
    const rejectedProfiles: ProfileRejectedMessage[] = [];
    room.onMessage<ProfileAcceptedMessage>(
      ProfileServerMessages.PROFILE_ACCEPTED,
      (message) => acceptedProfiles.push(message)
    );
    room.onMessage<ProfileRejectedMessage>(
      ProfileServerMessages.PROFILE_REJECTED,
      (message) => rejectedProfiles.push(message)
    );

    room.send(ProfileClientMessages.SET_PROFILE, {
      nickname: 'Alpha',
      mode: 'player',
      faction: 'red'
    });
    await waitFor(() => acceptedProfiles.length === 1, 'the initial profile to be accepted');

    room.send(ProfileClientMessages.SET_PROFILE, {
      nickname: 'AlphaTwo',
      mode: 'player',
      faction: 'red'
    });
    await waitFor(() => acceptedProfiles.length === 2, 'the allowed profile update to be accepted');

    room.send(ProfileClientMessages.SET_PROFILE, {
      nickname: 'BlockedOne',
      mode: 'player',
      faction: 'red'
    });
    await waitFor(() => rejectedProfiles.length === 1, 'the first excess profile rejection');

    for (let index = 0; index < 12; index += 1) {
      room.send(ProfileClientMessages.SET_PROFILE, {
        nickname: `Flood${index}`,
        mode: 'player',
        faction: 'red'
      });
    }

    room.send(ClientMessages.PLAYER_INPUT, input(1));
    await waitFor(
      () => requireShip(room, room.sessionId).lastProcessedInput === 1,
      'an ordered input barrier after the profile flood'
    );
    expect(rejectedProfiles).toEqual([
      { reason: 'Profile update rate limit exceeded.' }
    ]);

    const participant = room.state.participants.get(room.sessionId);
    const ship = requireShip(room, room.sessionId);
    expect(participant?.nickname).toBe('AlphaTwo');
    expect(participant?.mode).toBe('player');
    expect(participant?.faction).toBe('red');
    expect(ship.nickname).toBe('AlphaTwo');
    expect(ship.faction).toBe('red');
    expect(ship.ownerSessionId).toBe(room.sessionId);

    expect(room.connection.isOpen).toBe(true);

    securityNow += 4_000;
  }, TEST_TIMEOUT_MS);

  it('drops input floods without refreshing authority timing and refills deterministically', async () => {
    let securityNow = 0;
    server = await startProductionBattleServer({
      networkBoundaryConfig: productionConfig(
        { inputBurst: '2', inputRate: '1' },
        () => securityNow
      )
    });

    const attacker = await joinAllowedBattleRoom();
    const observer = await joinAllowedBattleRoom();
    attacker.send(ProfileClientMessages.SET_PROFILE, {
      nickname: 'InputOne',
      mode: 'player',
      faction: 'red'
    });
    observer.send(ProfileClientMessages.SET_PROFILE, {
      nickname: 'InputTwo',
      mode: 'player',
      faction: 'blue'
    });

    await waitFor(
      () => attacker.state.ships.size === 2 && observer.state.ships.size === 2,
      'both production players to receive ships'
    );

    const observerStart = { ...requireShip(attacker, observer.sessionId) };
    attacker.send(ClientMessages.PLAYER_INPUT, input(1, true));
    await delay(15);
    attacker.send(ClientMessages.PLAYER_INPUT, input(2, true));
    await waitFor(
      () => requireShip(observer, attacker.sessionId).lastProcessedInput === 2,
      'the input burst budget to be accepted'
    );

    for (let sequence = 3; sequence <= 24; sequence += 1) {
      attacker.send(ClientMessages.PLAYER_INPUT, input(sequence, true));
      await delay(30);
    }

    const floodedShip = requireShip(observer, attacker.sessionId);
    const unaffectedShip = requireShip(attacker, observer.sessionId);
    expect(floodedShip.lastProcessedInput).toBe(2);
    expect(Math.hypot(floodedShip.velocityX, floodedShip.velocityY)).toBeLessThan(100);
    expect(unaffectedShip.x).toBeCloseTo(observerStart.x, 4);
    expect(unaffectedShip.y).toBeCloseTo(observerStart.y, 4);

    securityNow += 1_000;
    attacker.send(ClientMessages.PLAYER_INPUT, input(25));
    await waitFor(
      () => requireShip(observer, attacker.sessionId).lastProcessedInput === 25,
      'a later input to be accepted after deterministic token refill'
    );
    expect(attacker.connection.isOpen).toBe(true);
    expect(observer.connection.isOpen).toBe(true);
  }, TEST_TIMEOUT_MS);

  it('preserves ordinary profile setup and approximately 20 Hz production input', async () => {
    server = await startProductionBattleServer({
      networkBoundaryConfig: productionConfig()
    });

    const room = await joinAllowedBattleRoom();
    const rejectedProfiles: ProfileRejectedMessage[] = [];
    room.onMessage<ProfileRejectedMessage>(
      ProfileServerMessages.PROFILE_REJECTED,
      (message) => rejectedProfiles.push(message)
    );
    room.send(ProfileClientMessages.SET_PROFILE, {
      nickname: 'NormalClient',
      mode: 'player',
      faction: 'red'
    });
    await waitFor(() => room.state.ships.size === 1, 'ordinary production profile setup');

    for (let sequence = 1; sequence <= 25; sequence += 1) {
      room.send(ClientMessages.PLAYER_INPUT, input(sequence, sequence % 2 === 0));
      await delay(50);
    }

    await waitFor(
      () => requireShip(room, room.sessionId).lastProcessedInput === 25,
      'the final normal-rate input sequence'
    );
    expect(rejectedProfiles).toEqual([]);
    expect(room.connection.isOpen).toBe(true);
  }, TEST_TIMEOUT_MS);
});
