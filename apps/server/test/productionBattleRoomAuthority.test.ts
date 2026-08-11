import { afterEach, describe, expect, it } from 'vitest';
import {
  ClientMessages,
  NETWORK_TICK_INTERVAL_MS,
  type ShipSnapshot
} from '@burningspace/shared';
import {
  NetworkClient,
  type ConnectionState,
  type PlayerInputPayload
} from '../../client/src/network/NetworkClient';
import {
  startProductionBattleServer,
  type ProductionBattleServerHandle
} from './support/startProductionBattleServer.js';

const TEST_TIMEOUT_MS = 15_000;
const WAIT_TIMEOUT_MS = 5_000;
const AUTHORITY_OBSERVATION_MS = NETWORK_TICK_INTERVAL_MS * 6;

interface RawRoomSender {
  send(type: string, message: unknown): void;
}

interface ObservedClient {
  readonly client: NetworkClient;
  getState(): ConnectionState;
  dispose(): Promise<void>;
}

function createObservedClient(serverUrl: string, roomName = 'battle'): ObservedClient {
  const client = new NetworkClient({ serverUrl, roomName });
  let state: ConnectionState = { status: 'disconnected' };
  const unsubscribe = client.onConnectionStateChanged((nextState) => {
    state = nextState;
  });

  return {
    client,
    getState: () => state,
    async dispose(): Promise<void> {
      unsubscribe();
      await client.disconnect();
    }
  };
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

function rawRoomFor(client: NetworkClient): RawRoomSender {
  const holder = client as unknown as { room?: RawRoomSender };

  if (!holder.room) {
    throw new Error('Expected a connected production battle room.');
  }

  return holder.room;
}

function shipFor(client: NetworkClient, ownerSessionId: string): ShipSnapshot | undefined {
  return client.currentShips.find((ship) => ship.ownerSessionId === ownerSessionId);
}

function requireShip(client: NetworkClient, ownerSessionId: string): ShipSnapshot {
  const ship = shipFor(client, ownerSessionId);

  if (!ship) {
    throw new Error(`Expected replicated ship for session ${ownerSessionId}.`);
  }

  return ship;
}

function neutralInput(aimAngle = 0): PlayerInputPayload {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    aimAngle,
    shooting: false
  };
}

function rightInput(): PlayerInputPayload {
  return {
    ...neutralInput(),
    right: true
  };
}

function shootingInput(aimAngle = 0): PlayerInputPayload {
  return {
    ...neutralInput(aimAngle),
    shooting: true
  };
}

function expectPositionUnchanged(actual: ShipSnapshot | undefined, expected: ShipSnapshot): void {
  expect(actual).toBeDefined();
  expect(actual?.x).toBeCloseTo(expected.x, 4);
  expect(actual?.y).toBeCloseTo(expected.y, 4);
}

async function expectShipUnchangedFor(
  client: NetworkClient,
  ownerSessionId: string,
  expected: ShipSnapshot,
  label: string
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < AUTHORITY_OBSERVATION_MS) {
    const actual = requireShip(client, ownerSessionId);

    if (
      Math.abs(actual.x - expected.x) > 0.0001 ||
      Math.abs(actual.y - expected.y) > 0.0001 ||
      actual.health !== expected.health ||
      actual.ownerSessionId !== expected.ownerSessionId
    ) {
      throw new Error(
        `${label}: expected ship ${ownerSessionId} to remain unchanged, ` +
        `received x=${actual.x}, y=${actual.y}, health=${actual.health}, ` +
        `owner=${actual.ownerSessionId}.`
      );
    }

    await delay(20);
  }
}

describe('production BattleRoom multi-client authority', () => {
  let server: ProductionBattleServerHandle | undefined;
  const clients: ObservedClient[] = [];

  function addClient(roomName = 'battle'): ObservedClient {
    if (!server) {
      throw new Error('Production BattleRoom test server is not running.');
    }

    const observed = createObservedClient(server.url, roomName);
    clients.push(observed);
    return observed;
  }

  afterEach(async () => {
    await Promise.allSettled(clients.splice(0).map((observed) => observed.dispose()));
    await server?.stop();
    server = undefined;
  });

  it('preserves server authority across real production clients', async () => {
    server = await startProductionBattleServer();

    const unavailableDiagnosticRoom = addClient('battle-test');
    await unavailableDiagnosticRoom.client.connect();
    expect(unavailableDiagnosticRoom.getState().status).toBe('error');
    expect(unavailableDiagnosticRoom.client.getSessionId()).toBeUndefined();

    const playerA = addClient();
    const playerB = addClient();
    const spectator = addClient();

    await playerA.client.connect();
    await playerB.client.connect();
    await spectator.client.connect();

    expect(playerA.getState().status).toBe('connected');
    expect(playerB.getState().status).toBe('connected');
    expect(spectator.getState().status).toBe('connected');

    playerA.client.setProfile({ nickname: 'Alice', mode: 'player', faction: 'red' });
    playerB.client.setProfile({ nickname: 'Bob', mode: 'player', faction: 'blue' });
    spectator.client.setProfile({ nickname: 'Observer', mode: 'spectator' });

    await waitFor(
      () =>
        playerA.client.profile?.faction === 'red' &&
        playerB.client.profile?.faction === 'blue' &&
        spectator.client.profile?.mode === 'spectator',
      'all production profiles to be accepted'
    );
    await waitFor(
      () =>
        [playerA.client, playerB.client, spectator.client].every(
          (client) => client.currentParticipants.length === 3 && client.currentShips.length === 2
        ),
      'all clients to replicate three participants and two ships'
    );

    const playerASessionId = playerA.client.getSessionId();
    const playerBSessionId = playerB.client.getSessionId();
    const spectatorSessionId = spectator.client.getSessionId();

    expect(playerASessionId).toBeDefined();
    expect(playerBSessionId).toBeDefined();
    expect(spectatorSessionId).toBeDefined();

    if (!playerASessionId || !playerBSessionId || !spectatorSessionId) {
      throw new Error('Expected every production client to have a session ID.');
    }

    const expectedParticipantIds = [playerASessionId, playerBSessionId, spectatorSessionId].sort();

    for (const observer of [playerA.client, playerB.client, spectator.client]) {
      expect(observer.currentParticipants.map(({ sessionId }) => sessionId).sort()).toEqual(
        expectedParticipantIds
      );
      expect(observer.currentShips.map(({ ownerSessionId }) => ownerSessionId).sort()).toEqual(
        [playerASessionId, playerBSessionId].sort()
      );
      expect(shipFor(observer, playerASessionId)?.faction).toBe('red');
      expect(shipFor(observer, playerBSessionId)?.faction).toBe('blue');
      expect(shipFor(observer, spectatorSessionId)).toBeUndefined();
    }

    const playerAStart = { ...requireShip(spectator.client, playerASessionId) };
    const playerBStart = { ...requireShip(spectator.client, playerBSessionId) };

    playerA.client.sendPlayerInput(rightInput());

    await waitFor(
      () =>
        [playerA.client, playerB.client, spectator.client].every(
          (observer) => (shipFor(observer, playerASessionId)?.x ?? 0) > playerAStart.x + 10
        ),
      'player A movement to replicate to every observer'
    );

    expectPositionUnchanged(shipFor(spectator.client, playerBSessionId), playerBStart);
    expect(shipFor(spectator.client, playerASessionId)?.ownerSessionId).toBe(playerASessionId);
    expect(shipFor(playerB.client, playerBSessionId)?.ownerSessionId).toBe(playerBSessionId);

    const movingSequence = shipFor(spectator.client, playerASessionId)?.lastProcessedInput ?? 0;
    playerA.client.sendPlayerInput(neutralInput());
    await waitFor(
      () => (shipFor(spectator.client, playerASessionId)?.lastProcessedInput ?? 0) > movingSequence,
      'player A neutral input to be processed'
    );
    await waitFor(() => {
      const ship = shipFor(spectator.client, playerASessionId);
      return Boolean(ship && Math.hypot(ship.velocityX, ship.velocityY) < 1);
    }, 'player A ship to stop after neutral input');

    playerA.client.setProfile({ nickname: 'AliceBlue', mode: 'player', faction: 'blue' });
    await waitFor(
      () =>
        playerA.getState().profileError === 'Disconnect before changing mode or faction.',
      'server rejection of an in-session faction change'
    );

    expect(playerA.getState().status).toBe('connected');
    expect(playerA.client.profile?.faction).toBe('red');
    expect(shipFor(spectator.client, playerASessionId)?.faction).toBe('red');
    expect(shipFor(spectator.client, playerASessionId)?.ownerSessionId).toBe(playerASessionId);

    const postRejectionSequence =
      shipFor(spectator.client, playerASessionId)?.lastProcessedInput ?? 0;
    playerA.client.sendPlayerInput(neutralInput());
    await waitFor(
      () =>
        (shipFor(spectator.client, playerASessionId)?.lastProcessedInput ?? 0) >
        postRejectionSequence,
      'player A input after profile rejection'
    );

    playerA.client.sendPlayerInput(shootingInput());
    await waitFor(
      () => spectator.client.currentProjectiles.some(
        ({ ownerSessionId }) => ownerSessionId === playerASessionId
      ),
      'a server-created projectile owned by player A'
    );

    const projectile = spectator.client.currentProjectiles.find(
      ({ ownerSessionId }) => ownerSessionId === playerASessionId
    );

    expect(projectile).toBeDefined();
    expect(projectile?.ownerSessionId).toBe(playerASessionId);
    expect(projectile?.ownerSessionId).not.toBe(playerBSessionId);
    expect(
      playerB.client.currentProjectiles.find(({ id }) => id === projectile?.id)?.ownerSessionId
    ).toBe(playerASessionId);

    playerA.client.sendPlayerInput(neutralInput());

    if (!projectile) {
      throw new Error('Expected a production projectile snapshot.');
    }

    await waitFor(
      () =>
        !spectator.client.currentProjectiles.some(({ id }) => id === projectile.id) &&
        !playerB.client.currentProjectiles.some(({ id }) => id === projectile.id),
      'the server-controlled projectile lifecycle to remove the projectile'
    );

    const targetBeforeSpectatorInput = { ...requireShip(spectator.client, playerBSessionId) };
    rawRoomFor(spectator.client).send(ClientMessages.PLAYER_INPUT, {
      ...rightInput(),
      sequence: 1
    });
    await expectShipUnchangedFor(
      spectator.client,
      playerBSessionId,
      targetBeforeSpectatorInput,
      'spectator input must not move another player ship'
    );

    expect(spectator.getState().status).toBe('connected');
    expect(shipFor(spectator.client, spectatorSessionId)).toBeUndefined();

    const targetBeforeDiagnostic = { ...requireShip(spectator.client, playerBSessionId) };
    rawRoomFor(playerA.client).send('test:setShipState', {
      targetSessionId: playerBSessionId,
      x: 6_000,
      y: 6_000,
      health: 1
    });
    await expectShipUnchangedFor(
      spectator.client,
      playerBSessionId,
      targetBeforeDiagnostic,
      'diagnostic mutation authority must be unavailable'
    );

    const targetAfterDiagnostic = shipFor(spectator.client, playerBSessionId);
    expectPositionUnchanged(targetAfterDiagnostic, targetBeforeDiagnostic);
    expect(targetAfterDiagnostic?.health).toBe(targetBeforeDiagnostic.health);
    expect(targetAfterDiagnostic?.ownerSessionId).toBe(playerBSessionId);

    await playerA.client.disconnect();
    await waitFor(
      () =>
        [playerB.client, spectator.client].every(
          (observer) =>
            !observer.currentParticipants.some(({ sessionId }) => sessionId === playerASessionId) &&
            !observer.currentShips.some(({ ownerSessionId }) => ownerSessionId === playerASessionId)
        ),
      'player A participant and ship cleanup after disconnect'
    );

    for (const observer of [playerB.client, spectator.client]) {
      expect(
        observer.currentParticipants.some(({ sessionId }) => sessionId === playerBSessionId)
      ).toBe(true);
      expect(shipFor(observer, playerBSessionId)?.ownerSessionId).toBe(playerBSessionId);
    }

    const remainingPlayerSequence =
      shipFor(spectator.client, playerBSessionId)?.lastProcessedInput ?? 0;
    playerB.client.sendPlayerInput(neutralInput(Math.PI));
    await waitFor(
      () =>
        (shipFor(spectator.client, playerBSessionId)?.lastProcessedInput ?? 0) >
        remainingPlayerSequence,
      'remaining player input after player A disconnect'
    );
    expect(spectator.getState().status).toBe('connected');
  }, TEST_TIMEOUT_MS);
});
