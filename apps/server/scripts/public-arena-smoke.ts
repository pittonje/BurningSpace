import type { MapSchema } from '@colyseus/schema';
import { Client, type Room } from 'colyseus.js';
import {
  ProfileClientMessages,
  ProfileServerMessages,
  type ProfileAcceptedMessage
} from '@burningspace/protocol';
import { ClientMessages, type PlayerInputMessage } from '@burningspace/shared';

const WAIT_TIMEOUT_MS = 10_000;

interface SmokeEnvironment {
  readonly BURNINGSPACE_SMOKE_SERVER_URL?: string;
  readonly BURNINGSPACE_SMOKE_ORIGIN?: string;
  readonly BURNINGSPACE_SMOKE_HOSTILE_ORIGIN?: string;
}

interface ParticipantSchema {
  profileReady: boolean;
}

interface ShipSchema {
  ownerSessionId: string;
  x: number;
  y: number;
  lastProcessedInput: number;
}

interface BattleStateSchema {
  participants: MapSchema<ParticipantSchema, string>;
  ships: MapSchema<ShipSchema, string>;
}

function normalizeExactHttpOrigin(rawValue: string | undefined, name: string): string {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  const candidate = rawValue.trim();

  if (
    /\s/u.test(candidate) ||
    /[\u0000-\u001f\u007f]/u.test(candidate) ||
    candidate.includes('\\') ||
    !/^https?:\/\//iu.test(candidate)
  ) {
    throw new Error(`${name} must be an exact HTTP or HTTPS origin.`);
  }

  const authorityStart = candidate.indexOf('://') + 3;
  const remainderOffset = candidate.slice(authorityStart).search(/[/?#]/u);
  const rawAuthority = remainderOffset === -1
    ? candidate.slice(authorityStart)
    : candidate.slice(authorityStart, authorityStart + remainderOffset);
  const rawRemainder = remainderOffset === -1
    ? ''
    : candidate.slice(authorityStart + remainderOffset);

  if (
    rawAuthority.length === 0 ||
    rawAuthority.endsWith(':') ||
    rawRemainder !== '' && rawRemainder !== '/'
  ) {
    throw new Error(`${name} must not contain a path, query, or fragment.`);
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error(`${name} must be an exact HTTP or HTTPS origin.`);
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error(`${name} must be an exact HTTP or HTTPS origin without credentials.`);
  }

  return url.origin;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
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

    await delay(25);
  }

  throw new Error(`Timed out waiting for ${label}.`);
}

async function requireJsonEndpoint(
  serverOrigin: string,
  path: '/health' | '/ready',
  expectedStatus: number
): Promise<void> {
  const response = await fetch(`${serverOrigin}${path}`);

  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned HTTP ${response.status}.`);
  }

  const body = await response.json() as Record<string, unknown>;

  if (body.service !== 'burningspace-server' || body.ok !== true) {
    throw new Error(`${path} returned an unexpected response.`);
  }

  if (path === '/ready' && body.ready !== true) {
    throw new Error('/ready did not report ready=true.');
  }
}

function movementInput(sequence: number, right: boolean): PlayerInputMessage {
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

async function assertHostileOriginRejected(
  serverOrigin: string,
  hostileOrigin: string
): Promise<void> {
  const client = new Client(serverOrigin, { headers: { Origin: hostileOrigin } });
  let room: Room<BattleStateSchema> | undefined;
  let rejected = false;

  try {
    room = await client.joinOrCreate<BattleStateSchema>('battle');
  } catch {
    rejected = true;
  } finally {
    if (room?.connection?.isOpen) {
      await room.leave(true);
    }
  }

  if (!rejected) {
    throw new Error('Hostile Origin unexpectedly joined battle.');
  }
}

async function runSmoke(environment: SmokeEnvironment): Promise<void> {
  const startedAt = Date.now();
  const serverOrigin = normalizeExactHttpOrigin(
    environment.BURNINGSPACE_SMOKE_SERVER_URL,
    'BURNINGSPACE_SMOKE_SERVER_URL'
  );
  const origin = normalizeExactHttpOrigin(
    environment.BURNINGSPACE_SMOKE_ORIGIN,
    'BURNINGSPACE_SMOKE_ORIGIN'
  );
  const hostileOrigin = environment.BURNINGSPACE_SMOKE_HOSTILE_ORIGIN === undefined
    ? undefined
    : normalizeExactHttpOrigin(
      environment.BURNINGSPACE_SMOKE_HOSTILE_ORIGIN,
      'BURNINGSPACE_SMOKE_HOSTILE_ORIGIN'
    );

  await requireJsonEndpoint(serverOrigin, '/health', 200);
  await requireJsonEndpoint(serverOrigin, '/ready', 200);

  if (hostileOrigin !== undefined) {
    await assertHostileOriginRejected(serverOrigin, hostileOrigin);
  }

  const client = new Client(serverOrigin, { headers: { Origin: origin } });
  let room: Room<BattleStateSchema> | undefined;

  try {
    room = await client.joinOrCreate<BattleStateSchema>('battle');
    const acceptedProfiles: ProfileAcceptedMessage[] = [];
    room.onMessage<ProfileAcceptedMessage>(
      ProfileServerMessages.PROFILE_ACCEPTED,
      (message) => acceptedProfiles.push(message)
    );
    room.send(ProfileClientMessages.SET_PROFILE, {
      nickname: 'ArenaSmoke',
      mode: 'player',
      faction: 'red'
    });

    await waitFor(() => {
      const state = room?.state;

      if (!state?.participants || !state.ships || !room) {
        return false;
      }

      const participant = state.participants.get(room.sessionId);
      return (
        acceptedProfiles.length === 1 &&
        participant?.profileReady === true &&
        state.ships.has(room.sessionId)
      );
    }, 'participant profile and owned ship replication');

    const ownedShip = room.state.ships.get(room.sessionId);

    if (!ownedShip || ownedShip.ownerSessionId !== room.sessionId) {
      throw new Error('Owned authoritative ship was not replicated.');
    }

    const startX = ownedShip.x;
    const startY = ownedShip.y;

    for (let sequence = 1; sequence <= 8; sequence += 1) {
      room.send(ClientMessages.PLAYER_INPUT, movementInput(sequence, true));
      await delay(50);
    }

    room.send(ClientMessages.PLAYER_INPUT, movementInput(9, false));
    await waitFor(() => {
      const state = room?.state;
      const ship = state?.ships?.get(room.sessionId);
      return Boolean(
        ship &&
        ship.lastProcessedInput >= 8 &&
        Math.hypot(ship.x - startX, ship.y - startY) > 5
      );
    }, 'authoritative owned-ship movement');

    await room.leave(true);
    room = undefined;

    console.log(JSON.stringify({
      ok: true,
      event: 'public_arena_smoke_completed',
      hostileOriginChecked: hostileOrigin !== undefined,
      durationMs: Date.now() - startedAt
    }));
  } finally {
    if (room?.connection?.isOpen) {
      await room.leave(true).catch(() => undefined);
    }
  }
}

runSmoke(process.env).catch((error: unknown) => {
  const safeError = error instanceof Error
    ? { name: error.name, message: error.message.slice(0, 500) }
    : { name: 'Error', message: String(error).slice(0, 500) };

  console.error(JSON.stringify({
    ok: false,
    event: 'public_arena_smoke_failed',
    error: safeError
  }));
  process.exitCode = 1;
});
