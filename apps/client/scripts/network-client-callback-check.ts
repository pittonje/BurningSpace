import { NetworkClient } from '../src/network/NetworkClient';

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(condition: () => boolean, label: string, timeoutMs = 5000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (condition()) {
      return;
    }

    await wait(100);
  }

  throw new Error(`Timed out waiting for ${label}`);
}

async function main(): Promise<void> {
  const first = new NetworkClient();
  const second = new NetworkClient();
  const spectator = new NetworkClient();
  const firstEvents: string[] = [];
  const secondEvents: string[] = [];
  const shipEvents: string[] = [];

  first.onParticipantAdded((participant) => firstEvents.push(`add:${participant.nickname}`));
  first.onParticipantChanged((participant) => firstEvents.push(`change:${participant.nickname}`));
  first.onParticipantRemoved((sessionId) => firstEvents.push(`remove:${sessionId}`));
  second.onParticipantAdded((participant) => secondEvents.push(`add:${participant.nickname}`));
  second.onParticipantChanged((participant) => secondEvents.push(`change:${participant.nickname}`));
  second.onParticipantRemoved((sessionId) => secondEvents.push(`remove:${sessionId}`));
  first.onShipAdded((ship) => shipEvents.push(`ship-add:${ship.nickname}`));
  first.onShipChanged((ship) => shipEvents.push(`ship-change:${ship.nickname}`));
  first.onShipRemoved((shipId) => shipEvents.push(`ship-remove:${shipId}`));

  await first.connect();
  await second.connect();
  await spectator.connect();

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

  first.setProfile({ nickname: 'AliceNew', mode: 'player', faction: 'red' });

  await waitFor(
    () => second.currentParticipants.some((participant) => participant.nickname === 'AliceNew'),
    'second client to receive changed first participant'
  );

  const firstShipBeforeMove = first.currentShips.find((ship) => ship.ownerSessionId === first.getSessionId());
  const secondShipBeforeMove = first.currentShips.find((ship) => ship.ownerSessionId === second.getSessionId());

  if (!firstShipBeforeMove || !secondShipBeforeMove) {
    throw new Error('Expected both player ships before movement check.');
  }

  first.sendPlayerInput({
    up: false,
    down: false,
    left: false,
    right: true,
    aimAngle: 0,
    sequence: 1
  });

  await waitFor(() => {
    const movedShip = second.currentShips.find((ship) => ship.ownerSessionId === first.getSessionId());
    return Boolean(movedShip && movedShip.x > firstShipBeforeMove.x + 20);
  }, 'first player input to move first ship');

  first.sendPlayerInput({
    up: false,
    down: false,
    left: false,
    right: false,
    aimAngle: 0,
    sequence: 2
  });

  const secondShipAfterFirstMove = first.currentShips.find((ship) => ship.ownerSessionId === second.getSessionId());

  if (!secondShipAfterFirstMove) {
    throw new Error('Expected second ship after first movement check.');
  }

  if (Math.abs(secondShipAfterFirstMove.x - secondShipBeforeMove.x) > 1 || Math.abs(secondShipAfterFirstMove.y - secondShipBeforeMove.y) > 1) {
    throw new Error('First player input unexpectedly moved the second ship.');
  }

  spectator.sendPlayerInput({
    up: true,
    down: false,
    left: false,
    right: false,
    aimAngle: 0,
    sequence: 1
  });

  await wait(300);

  if (spectator.currentShips.some((ship) => ship.ownerSessionId === spectator.getSessionId())) {
    throw new Error('Spectator unexpectedly received a ship.');
  }

  await second.disconnect();

  await waitFor(
    () => first.currentShips.length === 1 && first.currentParticipants.length === 2,
    'first client to receive participant and ship removal'
  );

  first.setProfile({ nickname: 'AliceNew', mode: 'spectator' });

  await waitFor(
    () => first.currentShips.length === 0 && spectator.currentShips.length === 0,
    'player to spectator to remove ship'
  );

  await first.disconnect();
  await spectator.disconnect();

  console.log(JSON.stringify({
    ok: true,
    firstEvents,
    secondEvents,
    shipEvents
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
