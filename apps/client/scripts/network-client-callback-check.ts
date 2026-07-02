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
  const firstEvents: string[] = [];
  const secondEvents: string[] = [];

  first.onParticipantAdded((participant) => firstEvents.push(`add:${participant.nickname}`));
  first.onParticipantChanged((participant) => firstEvents.push(`change:${participant.nickname}`));
  first.onParticipantRemoved((sessionId) => firstEvents.push(`remove:${sessionId}`));
  second.onParticipantAdded((participant) => secondEvents.push(`add:${participant.nickname}`));
  second.onParticipantChanged((participant) => secondEvents.push(`change:${participant.nickname}`));
  second.onParticipantRemoved((sessionId) => secondEvents.push(`remove:${sessionId}`));

  await first.connect();
  await second.connect();

  first.setProfile({ nickname: 'Alice', mode: 'player', faction: 'red' });
  second.setProfile({ nickname: 'Observer', mode: 'spectator' });

  await waitFor(
    () => first.currentParticipants.length === 2 && second.currentParticipants.length === 2,
    'both clients to see two participants'
  );

  first.setProfile({ nickname: 'AliceNew', mode: 'player', faction: 'red' });

  await waitFor(
    () => second.currentParticipants.some((participant) => participant.nickname === 'AliceNew'),
    'second client to receive changed first participant'
  );

  await second.disconnect();

  await waitFor(
    () => first.currentParticipants.length === 1,
    'first client to receive participant removal'
  );

  await first.disconnect();

  console.log(JSON.stringify({
    ok: true,
    firstEvents,
    secondEvents
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
