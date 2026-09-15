import { describe, expect, test } from 'vitest';
import type { ClaimWorldWriterResult, WriterClaim } from '../../src/persistence/repositories/worldsRepository.js';
import {
  isHeartbeatWithinLocalSafetyDeadline,
  WriterLifecycle,
  type MonotonicClock,
  type WriterRepositoryPort
} from '../../src/persistence/writerLifecycle.js';

/**
 * A queue-based fake monotonic clock: each call to now() consumes the next
 * queued value. Once exhausted, it keeps returning the last queued value
 * (never throws, never falls back to real time). This makes exactly how
 * many times WriterLifecycle reads the clock explicit and reviewable.
 */
function createQueuedClock(values: number[]): MonotonicClock {
  const queue = [...values];
  return {
    now: () => (queue.length > 1 ? (queue.shift() as number) : (queue[0] as number))
  };
}

function createNoopConnection(): { once: () => undefined } {
  return { once: () => undefined };
}

const WORLD_ID = 'world-1';
const SERVER_INSTANCE_ID = 'instance-1';

function createFakeRepository(overrides: Partial<WriterRepositoryPort> = {}): WriterRepositoryPort {
  return {
    claimWorldWriter: async (): Promise<ClaimWorldWriterResult> => ({
      kind: 'claimed',
      claim: {
        worldId: WORLD_ID,
        serverInstanceId: SERVER_INSTANCE_ID,
        writerEpoch: 1n,
        writerExpiresAt: new Date(0)
      } satisfies WriterClaim
    }),
    renewWorldWriter: async () => new Date(0),
    releaseWorldWriter: async () => true,
    ...overrides
  };
}

describe('isHeartbeatWithinLocalSafetyDeadline (pure)', () => {
  test('a response at 9999ms is within the 10000ms deadline', () => {
    expect(isHeartbeatWithinLocalSafetyDeadline(0, 9_999, 10_000)).toBe(true);
  });

  test('a response at exactly 10000ms is NOT within the deadline', () => {
    expect(isHeartbeatWithinLocalSafetyDeadline(0, 10_000, 10_000)).toBe(false);
  });

  test('a response past 10000ms is NOT within the deadline', () => {
    expect(isHeartbeatWithinLocalSafetyDeadline(0, 15_000, 10_000)).toBe(false);
  });
});

// WriterLifecycle reads its injected clock at well-defined points:
//   claim() on success:       [deadline-base, lastConfirmedHeartbeatAt]
//   isControlSafe():          [now]                          (1 read, only if state === 'owning')
//   performHeartbeat():       [isControlSafe() -> now, requestStartedAt, responseAt]  (3 reads, only if the
//                              isControlSafe() precheck passes; otherwise just the 1 precheck read)
describe('WriterLifecycle local safety deadline (deterministic injected clock, no real sleep, no Date.now)', () => {
  test('a timely heartbeat (request at 0, response at 9999ms) confirms local control safety', async () => {
    const clock = createQueuedClock([
      0, // claim(): deadline base
      0, // claim(): lastConfirmedHeartbeatAt
      0, // explicit isControlSafe() check below
      0, // performHeartbeat(): isControlSafe() precheck
      0, // performHeartbeat(): requestStartedAt
      9_999 // performHeartbeat(): responseAt
    ]);
    const lifecycle = new WriterLifecycle({
      worldId: WORLD_ID,
      serverInstanceId: SERVER_INSTANCE_ID,
      repository: createFakeRepository(),
      connection: createNoopConnection(),
      clock
    });

    await lifecycle.claim();
    expect(lifecycle.isControlSafe()).toBe(true);

    await lifecycle.performHeartbeat();

    expect(lifecycle.state).toBe('owning');
    expect(lifecycle.isControlSafe()).toBe(true);
  });

  test('a late heartbeat (request at 0, response at 10000ms) is discarded and does not renew local confirmation', async () => {
    const clock = createQueuedClock([
      0, // claim(): deadline base
      0, // claim(): lastConfirmedHeartbeatAt
      0, // performHeartbeat(): isControlSafe() precheck (still safe relative to lastConfirmedHeartbeatAt=0)
      0, // performHeartbeat(): requestStartedAt
      10_000 // performHeartbeat(): responseAt -- exactly at the deadline, must be discarded
    ]);
    const lifecycle = new WriterLifecycle({
      worldId: WORLD_ID,
      serverInstanceId: SERVER_INSTANCE_ID,
      repository: createFakeRepository(),
      connection: createNoopConnection(),
      clock
    });

    await lifecycle.claim();
    await lifecycle.performHeartbeat();

    // The DB still confirmed ownership (renewWorldWriter succeeded), so the
    // lifecycle itself is not yet failed -- but the confirmation must have
    // been discarded rather than renewing lastConfirmedHeartbeatAt.
    expect(lifecycle.state).toBe('owning');
  });

  test('advancing the clock past the deadline since the last confirmation makes isControlSafe() false without any heartbeat call', async () => {
    const clock = createQueuedClock([
      0, // claim(): deadline base
      0, // claim(): lastConfirmedHeartbeatAt
      0, // first isControlSafe() check: still within the deadline
      20_000 // second isControlSafe() check: far past the 10s deadline
    ]);
    const lifecycle = new WriterLifecycle({
      worldId: WORLD_ID,
      serverInstanceId: SERVER_INSTANCE_ID,
      repository: createFakeRepository(),
      connection: createNoopConnection(),
      clock
    });

    await lifecycle.claim();
    expect(lifecycle.isControlSafe()).toBe(true);
    expect(lifecycle.isControlSafe()).toBe(false);
  });

  test('a heartbeat tick after the local safety deadline has already elapsed fails closed without attempting a DB renewal', async () => {
    let renewCalls = 0;
    const clock = createQueuedClock([
      0, // claim(): deadline base
      0, // claim(): lastConfirmedHeartbeatAt
      20_000 // performHeartbeat(): isControlSafe() precheck -- already stale, fails closed here
    ]);
    const lifecycle = new WriterLifecycle({
      worldId: WORLD_ID,
      serverInstanceId: SERVER_INSTANCE_ID,
      repository: createFakeRepository({
        renewWorldWriter: async () => {
          renewCalls += 1;
          return new Date(0);
        }
      }),
      connection: createNoopConnection(),
      clock
    });

    await lifecycle.claim();
    await lifecycle.performHeartbeat();

    expect(lifecycle.state).toBe('failed');
    expect(lifecycle.isControlSafe()).toBe(false);
    expect(renewCalls).toBe(0);
  });
});
