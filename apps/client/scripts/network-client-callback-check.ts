import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import {
  BLUE_BASE_X,
  BLUE_BASE_Y,
  NETWORK_INPUT_TIMEOUT_MS,
  NETWORK_PROJECTILE_DAMAGE,
  NETWORK_RESPAWN_DELAY_MS,
  NETWORK_SHIP_MAX_HEALTH,
  NETWORK_SPAWN_INVULNERABILITY_MS,
  type ProjectileSnapshot,
  type ShipSnapshot
} from '@burningspace/shared';
import { TestBattleRoom, TestRoomMessages } from '../../server/src/rooms/TestBattleRoom.js';
import { NetworkClient, type ConnectionState, type PlayerInputPayload } from '../src/network/NetworkClient';

const TEST_ROOM_NAME = 'battle-test';
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface DiagnosticRoom {
  send(type: string, message: unknown): void;
}

interface TestServerHandle {
  url: string;
  stop(): Promise<void>;
}

interface TestShipStatePatch {
  x?: number;
  y?: number;
  rotation?: number;
  health?: number;
  invulnerableUntil?: number;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitFor(condition: () => boolean, label: string, timeoutMs = 6000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (condition()) {
      return;
    }

    await wait(50);
  }

  throw new Error(`Timed out waiting for ${label}`);
}

async function startTestServer(): Promise<TestServerHandle> {
  const httpServer = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true, service: 'burningspace-test-server' }));
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false, error: 'not_found' }));
  });
  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer
    })
  });
  gameServer.define(TEST_ROOM_NAME, TestBattleRoom);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', resolve);
  });

  const address = httpServer.address();

  if (!address || typeof address === 'string') {
    throw new Error('Unable to resolve test server address.');
  }

  return {
    url: `http://127.0.0.1:${(address as AddressInfo).port}`,
    async stop(): Promise<void> {
      await gameServer.gracefullyShutdown(false).catch(() => undefined);

      if (httpServer.listening) {
        await closeHttpServer(httpServer).catch(() => undefined);
      }
    }
  };
}

function closeHttpServer(httpServer: HttpServer): Promise<void> {
  return new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function createClient(serverUrl: string): NetworkClient {
  return new NetworkClient({
    serverUrl,
    roomName: TEST_ROOM_NAME
  });
}

function getDiagnosticRoom(client: NetworkClient): DiagnosticRoom {
  const holder = client as unknown as { room?: DiagnosticRoom };

  if (!holder.room) {
    throw new Error('Expected connected diagnostic room.');
  }

  return holder.room;
}

function setShipState(
  controller: NetworkClient,
  targetSessionId: string,
  patch: TestShipStatePatch
): void {
  getDiagnosticRoom(controller).send(TestRoomMessages.SET_SHIP_STATE, {
    targetSessionId,
    ...patch
  });
}

function shipFor(client: NetworkClient, ownerSessionId: string | undefined): ShipSnapshot | undefined {
  return ownerSessionId
    ? client.currentShips.find((ship) => ship.ownerSessionId === ownerSessionId)
    : undefined;
}

function projectileForOwner(client: NetworkClient, ownerSessionId: string | undefined): ProjectileSnapshot | undefined {
  return ownerSessionId
    ? client.currentProjectiles.find((projectile) => projectile.ownerSessionId === ownerSessionId)
    : undefined;
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

function shootingInput(aimAngle = 0): PlayerInputPayload {
  return {
    ...neutralInput(aimAngle),
    shooting: true
  };
}

async function waitForNoProjectiles(client: NetworkClient): Promise<void> {
  await waitFor(() => client.currentProjectiles.length === 0, 'projectiles to clear', 5000);
}

async function main(): Promise<void> {
  const testServer = await startTestServer();
  const first = createClient(testServer.url);
  const second = createClient(testServer.url);
  const spectator = createClient(testServer.url);
  const firstEvents: string[] = [];
  const secondEvents: string[] = [];
  const shipEvents: string[] = [];
  const projectileEvents: string[] = [];
  const hitEvents: string[] = [];
  let firstState: ConnectionState = { status: 'disconnected' };
  let secondState: ConnectionState = { status: 'disconnected' };
  let spectatorState: ConnectionState = { status: 'disconnected' };
  let profileErrorKeptConnection = false;

  first.onConnectionStateChanged((state) => {
    firstState = state;
  });
  second.onConnectionStateChanged((state) => {
    secondState = state;
  });
  spectator.onConnectionStateChanged((state) => {
    spectatorState = state;
  });
  first.onParticipantAdded((participant) => firstEvents.push(`add:${participant.nickname}`));
  first.onParticipantChanged((participant) => firstEvents.push(`change:${participant.nickname}`));
  first.onParticipantRemoved((sessionId) => firstEvents.push(`remove:${sessionId}`));
  second.onParticipantAdded((participant) => secondEvents.push(`add:${participant.nickname}`));
  second.onParticipantChanged((participant) => secondEvents.push(`change:${participant.nickname}`));
  second.onParticipantRemoved((sessionId) => secondEvents.push(`remove:${sessionId}`));
  first.onShipAdded((ship) => shipEvents.push(`ship-add:${ship.nickname}`));
  first.onShipChanged((ship) => shipEvents.push(`ship-change:${ship.nickname}`));
  first.onShipRemoved((shipId) => shipEvents.push(`ship-remove:${shipId}`));
  first.onProjectileAdded((projectile) => projectileEvents.push(`projectile-add:${projectile.id}`));
  first.onProjectileChanged((projectile) => projectileEvents.push(`projectile-change:${projectile.id}`));
  first.onProjectileRemoved((projectileId) => projectileEvents.push(`projectile-remove:${projectileId}`));
  first.onHitEvent((message) => hitEvents.push(`hit:${message.targetShipId}:${message.damage}`));

  try {
    await first.connect();
    await second.connect();
    await spectator.connect();

    first.setProfile({ nickname: 'Al', mode: 'player', faction: 'red' });
    await waitFor(
      () => firstState.status === 'connected' && firstState.profileError !== undefined,
      'profile rejection to keep connection connected'
    );
    assert(firstState.profileError !== firstState.error, 'Profile rejection should not become a connection error.');
    profileErrorKeptConnection = firstState.status === 'connected';

    first.setProfile({ nickname: 'Alice', mode: 'player', faction: 'red' });
    second.setProfile({ nickname: 'Bob', mode: 'player', faction: 'blue' });
    spectator.setProfile({ nickname: 'Observer', mode: 'spectator' });

    await waitFor(
      () => first.currentParticipants.length === 3 && second.currentParticipants.length === 3,
      'clients to see three participants'
    );
    await waitFor(
      () => first.currentShips.length === 2 && second.currentShips.length === 2 && spectator.currentShips.length === 2,
      'clients to see two player ships'
    );
    assert(!spectator.currentShips.some((ship) => ship.ownerSessionId === spectator.getSessionId()), 'Spectator should not receive a ship.');
    assert(Math.abs(first.getEstimatedServerTime() - Date.now()) < 2000, 'Estimated server time should be close to local wall time.');

    first.setProfile({ nickname: 'AliceNew', mode: 'player', faction: 'red' });
    await waitFor(
      () => second.currentParticipants.some((participant) => participant.nickname === 'AliceNew'),
      'nickname-only profile update'
    );

    first.setProfile({ nickname: 'AliceBlue', mode: 'player', faction: 'blue' });
    await waitFor(
      () => firstState.status === 'connected' && firstState.profileError === 'Disconnect before changing mode or faction.',
      'faction change rejection'
    );
    assert(shipFor(first, first.getSessionId())?.faction === 'red', 'Rejected faction change should keep old faction.');

    first.setProfile({ nickname: 'AliceSpectator', mode: 'spectator' });
    await waitFor(
      () => firstState.status === 'connected' && firstState.profileError === 'Disconnect before changing mode or faction.',
      'mode change rejection'
    );

    spectator.setProfile({ nickname: 'ObserverPlayer', mode: 'player', faction: 'blue' });
    await waitFor(
      () => spectatorState.status === 'connected' && spectatorState.profileError === 'Disconnect before changing mode or faction.',
      'spectator to player rejection'
    );

    const firstShipBeforeMove = shipFor(first, first.getSessionId());
    const secondShipBeforeMove = shipFor(first, second.getSessionId());

    if (!firstShipBeforeMove || !secondShipBeforeMove) {
      throw new Error('Expected both player ships before movement check.');
    }

    first.sendPlayerInput({
      ...neutralInput(0),
      right: true
    });

    await waitFor(() => {
      const movedShip = shipFor(second, first.getSessionId());
      return Boolean(movedShip && movedShip.x > firstShipBeforeMove.x + 20);
    }, 'first player input to move first ship');

    const sequenceAfterMove = shipFor(second, first.getSessionId())?.lastProcessedInput ?? 0;
    first.sendPlayerInput(neutralInput(0));
    await waitFor(
      () => (shipFor(second, first.getSessionId())?.lastProcessedInput ?? 0) > sequenceAfterMove,
      'NetworkClient sequence to continue after simulated scene re-entry'
    );

    const secondShipAfterFirstMove = shipFor(first, second.getSessionId());

    if (!secondShipAfterFirstMove) {
      throw new Error('Expected second ship after first movement check.');
    }

    assert(
      Math.abs(secondShipAfterFirstMove.x - secondShipBeforeMove.x) <= 1 &&
      Math.abs(secondShipAfterFirstMove.y - secondShipBeforeMove.y) <= 1,
      'First player input unexpectedly moved the second ship.'
    );

    await waitForNoProjectiles(first);
    setShipState(spectator, first.getSessionId() ?? '', {
      x: 4800,
      y: 5000,
      rotation: 0,
      health: NETWORK_SHIP_MAX_HEALTH,
      invulnerableUntil: 0
    });
    setShipState(spectator, second.getSessionId() ?? '', {
      x: 7000,
      y: 5000,
      rotation: Math.PI,
      health: NETWORK_SHIP_MAX_HEALTH,
      invulnerableUntil: 0
    });
    await waitFor(() => {
      const red = shipFor(spectator, first.getSessionId());
      const blue = shipFor(spectator, second.getSessionId());
      return Boolean(red && blue && Math.abs(red.x - 4800) < 2 && Math.abs(blue.x - 7000) < 2);
    }, 'test room positioning for stale input');

    first.sendPlayerInput({
      ...shootingInput(0),
      right: true
    });
    await waitFor(
      () => projectileEvents.some((event) => event.startsWith('projectile-add')),
      'projectile creation before stale input timeout'
    );
    await wait(180);
    const speedBeforeTimeout = Math.hypot(
      shipFor(spectator, first.getSessionId())?.velocityX ?? 0,
      shipFor(spectator, first.getSessionId())?.velocityY ?? 0
    );
    const projectileAddsBeforeTimeout = projectileEvents.filter((event) => event.startsWith('projectile-add')).length;
    await wait(NETWORK_INPUT_TIMEOUT_MS + 550);
    const projectileAddsAfterTimeout = projectileEvents.filter((event) => event.startsWith('projectile-add')).length;
    await wait(400);
    assert(
      projectileEvents.filter((event) => event.startsWith('projectile-add')).length === projectileAddsAfterTimeout,
      'Stale shooting input should stop creating projectiles.'
    );
    assert(projectileAddsAfterTimeout >= projectileAddsBeforeTimeout, 'Expected projectile accounting to remain monotonic.');
    const speedAfterTimeout = Math.hypot(
      shipFor(spectator, first.getSessionId())?.velocityX ?? 0,
      shipFor(spectator, first.getSessionId())?.velocityY ?? 0
    );
    assert(speedAfterTimeout <= speedBeforeTimeout + 20, 'Stale movement input should stop accelerating the ship.');

    await waitForNoProjectiles(first);
    setShipState(spectator, first.getSessionId() ?? '', {
      x: 5000,
      y: 5000,
      rotation: 0,
      health: NETWORK_SHIP_MAX_HEALTH,
      invulnerableUntil: 0
    });
    setShipState(spectator, second.getSessionId() ?? '', {
      x: 5400,
      y: 5000,
      rotation: Math.PI,
      health: NETWORK_SHIP_MAX_HEALTH,
      invulnerableUntil: 0
    });

    await waitFor(() => {
      const red = shipFor(spectator, first.getSessionId());
      const blue = shipFor(spectator, second.getSessionId());
      return Boolean(red && blue && Math.abs(red.x - 5000) < 2 && Math.abs(blue.x - 5400) < 2);
    }, 'test room positioning for combat');

    for (let index = 0; index < 40; index += 1) {
      const blue = shipFor(spectator, second.getSessionId());

      if (blue && !blue.alive) {
        break;
      }

      first.sendPlayerInput(shootingInput(0));
      await wait(90);
    }

    await waitFor(() => {
      const blue = shipFor(spectator, second.getSessionId());
      return Boolean(blue && blue.health === 0 && !blue.alive);
    }, 'blue ship death');

    const deadBlue = shipFor(spectator, second.getSessionId());
    assert(deadBlue?.velocityX === 0 && deadBlue.velocityY === 0, 'Dead ship velocity should be cleared.');
    const blueProjectileCountBeforeDeadInput = spectator.currentProjectiles.filter((projectile) => projectile.ownerSessionId === second.getSessionId()).length;
    const blueDeadX = deadBlue?.x ?? 0;
    second.sendPlayerInput({
      ...shootingInput(Math.PI),
      left: true
    });
    await wait(500);
    const blueAfterDeadInput = shipFor(spectator, second.getSessionId());
    assert(Math.abs((blueAfterDeadInput?.x ?? 0) - blueDeadX) < 1, 'Dead ship should not move from input.');
    assert(
      spectator.currentProjectiles.filter((projectile) => projectile.ownerSessionId === second.getSessionId()).length === blueProjectileCountBeforeDeadInput,
      'Dead ship should not create projectiles.'
    );

    await waitFor(() => {
      const blue = shipFor(spectator, second.getSessionId());
      return Boolean(
        blue &&
        blue.alive &&
        blue.health === blue.maxHealth &&
        Math.hypot(blue.x - BLUE_BASE_X, blue.y - BLUE_BASE_Y) < 360 &&
        blue.velocityX === 0 &&
        blue.velocityY === 0 &&
        blue.invulnerableUntil > second.getEstimatedServerTime()
      );
    }, 'blue respawn with invulnerability', NETWORK_RESPAWN_DELAY_MS + 4000);

    await waitForNoProjectiles(spectator);
    const invulnerableBlue = shipFor(spectator, second.getSessionId());

    if (!invulnerableBlue) {
      throw new Error('Expected blue ship after respawn.');
    }

    setShipState(spectator, first.getSessionId() ?? '', {
      x: 5000,
      y: 5000,
      rotation: 0,
      health: NETWORK_SHIP_MAX_HEALTH,
      invulnerableUntil: 0
    });
    setShipState(spectator, second.getSessionId() ?? '', {
      x: 5400,
      y: 5000,
      rotation: Math.PI,
      health: NETWORK_SHIP_MAX_HEALTH,
      invulnerableUntil: invulnerableBlue.invulnerableUntil
    });
    first.sendPlayerInput(shootingInput(0));
    await wait(750);
    assert(shipFor(spectator, second.getSessionId())?.health === NETWORK_SHIP_MAX_HEALTH, 'Spawn invulnerability should ignore damage.');

    const waitForInvulnerabilityMs = Math.max(
      0,
      invulnerableBlue.invulnerableUntil - second.getEstimatedServerTime() + 120
    );
    await wait(waitForInvulnerabilityMs);
    await waitForNoProjectiles(spectator);
    setShipState(spectator, first.getSessionId() ?? '', {
      x: 5000,
      y: 5000,
      rotation: 0,
      invulnerableUntil: 0
    });
    setShipState(spectator, second.getSessionId() ?? '', {
      x: 5400,
      y: 5000,
      rotation: Math.PI,
      health: NETWORK_SHIP_MAX_HEALTH,
      invulnerableUntil: 0
    });
    first.sendPlayerInput(shootingInput(0));
    await waitFor(() => {
      const blue = shipFor(spectator, second.getSessionId());
      return Boolean(blue && blue.health === NETWORK_SHIP_MAX_HEALTH - NETWORK_PROJECTILE_DAMAGE);
    }, 'damage after invulnerability expires');

    await waitForNoProjectiles(spectator);
    setShipState(spectator, first.getSessionId() ?? '', {
      x: 5000,
      y: 5000,
      rotation: 0,
      health: NETWORK_SHIP_MAX_HEALTH,
      invulnerableUntil: 0
    });
    setShipState(spectator, second.getSessionId() ?? '', {
      x: 6100,
      y: 5000,
      rotation: Math.PI,
      health: NETWORK_SHIP_MAX_HEALTH,
      invulnerableUntil: 0
    });
    await waitFor(() => {
      const red = shipFor(spectator, first.getSessionId());
      const blue = shipFor(spectator, second.getSessionId());
      return Boolean(red && blue && Math.abs(red.x - 5000) < 2 && Math.abs(blue.x - 6100) < 2);
    }, 'test room positioning for disconnect projectile');
    first.sendPlayerInput(shootingInput(0));
    await waitFor(
      () => projectileForOwner(spectator, first.getSessionId()) !== undefined,
      'projectile before owner disconnect'
    );
    const firstSessionId = first.getSessionId();
    await first.disconnect();
    assert(projectileForOwner(spectator, firstSessionId) !== undefined, 'Projectile should survive owner disconnect.');
    await waitFor(() => {
      const blue = shipFor(spectator, second.getSessionId());
      return Boolean(blue && blue.health < NETWORK_SHIP_MAX_HEALTH);
    }, 'disconnect projectile to hit target');
    await waitFor(
      () => spectator.currentProjectiles.every((projectile) => projectile.ownerSessionId !== firstSessionId),
      'disconnect projectile to clear after hit or range'
    );

    const rejoined = createClient(testServer.url);
    await rejoined.connect();
    rejoined.setProfile({ nickname: 'RejoinedBlue', mode: 'player', faction: 'blue' });
    await waitFor(
      () => rejoined.currentShips.some((ship) => ship.ownerSessionId === rejoined.getSessionId() && ship.faction === 'blue'),
      'new connection to choose a different faction'
    );
    await rejoined.disconnect();

    await second.disconnect();
    await spectator.disconnect();

    console.log(JSON.stringify({
      ok: true,
      firstEvents,
      secondEvents,
      shipEvents,
      projectileEvents,
      hitEvents,
      profileErrorKeptConnection,
      serverClockOffsetMs: Math.round(first.getEstimatedServerTime() - Date.now()),
      respawnDelayMs: NETWORK_RESPAWN_DELAY_MS,
      inputTimeoutMs: NETWORK_INPUT_TIMEOUT_MS,
      spawnInvulnerabilityMs: NETWORK_SPAWN_INVULNERABILITY_MS
    }, null, 2));
  } finally {
    await Promise.allSettled([
      first.disconnect(),
      second.disconnect(),
      spectator.disconnect()
    ]);
    await testServer.stop();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
