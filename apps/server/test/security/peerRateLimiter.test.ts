import { describe, expect, test } from 'vitest';
import { PeerRateLimiter } from '../../src/security/peerRateLimiter.js';

function createManualClock(start = 0): { now: () => number; advance: (ms: number) => void } {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    }
  };
}

const CAPACITY = 3;
const REFILL_PER_SECOND = 1 / 60;
const MAX_BUCKETS = 10_000;
const IDLE_EVICTION_MS = 10 * 60 * 1000;

describe('PeerRateLimiter', () => {
  test('burst capacity allows exactly the first N requests', () => {
    const clock = createManualClock();
    const limiter = new PeerRateLimiter({
      capacity: CAPACITY,
      refillRatePerSecond: REFILL_PER_SECOND,
      maxBuckets: MAX_BUCKETS,
      idleEvictionMs: IDLE_EVICTION_MS,
      monotonicNow: clock.now
    });

    expect(limiter.consume('peer-a').allowed).toBe(true);
    expect(limiter.consume('peer-a').allowed).toBe(true);
    expect(limiter.consume('peer-a').allowed).toBe(true);
  });

  test('the (N+1)th immediate request is denied', () => {
    const clock = createManualClock();
    const limiter = new PeerRateLimiter({
      capacity: CAPACITY,
      refillRatePerSecond: REFILL_PER_SECOND,
      maxBuckets: MAX_BUCKETS,
      idleEvictionMs: IDLE_EVICTION_MS,
      monotonicNow: clock.now
    });

    for (let i = 0; i < CAPACITY; i += 1) {
      limiter.consume('peer-a');
    }
    const fourth = limiter.consume('peer-a');
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  test('advancing 60 seconds restores exactly one token', () => {
    const clock = createManualClock();
    const limiter = new PeerRateLimiter({
      capacity: CAPACITY,
      refillRatePerSecond: REFILL_PER_SECOND,
      maxBuckets: MAX_BUCKETS,
      idleEvictionMs: IDLE_EVICTION_MS,
      monotonicNow: clock.now
    });

    for (let i = 0; i < CAPACITY; i += 1) {
      limiter.consume('peer-a');
    }
    expect(limiter.consume('peer-a').allowed).toBe(false);

    clock.advance(60_000);
    expect(limiter.consume('peer-a').allowed).toBe(true);
    expect(limiter.consume('peer-a').allowed).toBe(false);
  });

  test('an idle peer (>= idleEvictionMs) becomes eligible for eviction, freeing capacity for a new key', () => {
    const clock = createManualClock();
    const limiter = new PeerRateLimiter({
      capacity: CAPACITY,
      refillRatePerSecond: REFILL_PER_SECOND,
      maxBuckets: 1,
      idleEvictionMs: IDLE_EVICTION_MS,
      monotonicNow: clock.now
    });

    limiter.consume('peer-a');
    expect(limiter.consume('peer-b').allowed).toBe(false); // cap reached, peer-a not idle yet

    clock.advance(IDLE_EVICTION_MS);
    const result = limiter.consume('peer-b');
    expect(result.allowed).toBe(true);
    expect(limiter.bucketCount).toBe(1);
  });

  test('10,000 distinct peer keys are all accepted/allocated', () => {
    const clock = createManualClock();
    const limiter = new PeerRateLimiter({
      capacity: CAPACITY,
      refillRatePerSecond: REFILL_PER_SECOND,
      maxBuckets: MAX_BUCKETS,
      idleEvictionMs: IDLE_EVICTION_MS,
      monotonicNow: clock.now
    });

    for (let i = 0; i < MAX_BUCKETS; i += 1) {
      const result = limiter.consume(`peer-${i}`);
      expect(result.allowed).toBe(true);
    }
    expect(limiter.bucketCount).toBe(MAX_BUCKETS);
  });

  test('the 10,001st new key is rejected when no idle bucket can be swept', () => {
    const clock = createManualClock();
    const limiter = new PeerRateLimiter({
      capacity: CAPACITY,
      refillRatePerSecond: REFILL_PER_SECOND,
      maxBuckets: MAX_BUCKETS,
      idleEvictionMs: IDLE_EVICTION_MS,
      monotonicNow: clock.now
    });

    for (let i = 0; i < MAX_BUCKETS; i += 1) {
      limiter.consume(`peer-${i}`);
    }
    const overflow = limiter.consume('peer-overflow');
    expect(overflow.allowed).toBe(false);
    expect(overflow.reason).toBe('bucket_capacity_reached');
    expect(limiter.bucketCount).toBe(MAX_BUCKETS);
  });

  test('an existing key keeps operating normally while the cap is reached', () => {
    const clock = createManualClock();
    const limiter = new PeerRateLimiter({
      capacity: CAPACITY,
      refillRatePerSecond: REFILL_PER_SECOND,
      maxBuckets: 1,
      idleEvictionMs: IDLE_EVICTION_MS,
      monotonicNow: clock.now
    });

    limiter.consume('peer-a');
    limiter.consume('peer-b'); // rejected: cap reached, peer-a not idle

    // peer-a must still be able to consume its remaining burst tokens.
    expect(limiter.consume('peer-a').allowed).toBe(true);
    expect(limiter.consume('peer-a').allowed).toBe(true);
    expect(limiter.consume('peer-a').allowed).toBe(false);
  });

  test('after an old bucket becomes idle and is evicted, a genuinely new peer may enter', () => {
    const clock = createManualClock();
    const limiter = new PeerRateLimiter({
      capacity: CAPACITY,
      refillRatePerSecond: REFILL_PER_SECOND,
      maxBuckets: 2,
      idleEvictionMs: IDLE_EVICTION_MS,
      monotonicNow: clock.now
    });

    limiter.consume('peer-a');
    clock.advance(1_000);
    limiter.consume('peer-b');
    expect(limiter.consume('peer-c').allowed).toBe(false);

    clock.advance(IDLE_EVICTION_MS);
    // peer-a and peer-b are now both idle; peer-c should be admitted.
    expect(limiter.consume('peer-c').allowed).toBe(true);
    expect(limiter.bucketCount).toBeLessThanOrEqual(2);
  });

  test('monotonic clock regression fails safely by following the existing TokenBucketRateLimiter invariant', () => {
    const clock = createManualClock(10_000);
    const limiter = new PeerRateLimiter({
      capacity: CAPACITY,
      refillRatePerSecond: REFILL_PER_SECOND,
      maxBuckets: MAX_BUCKETS,
      idleEvictionMs: IDLE_EVICTION_MS,
      monotonicNow: clock.now
    });

    limiter.consume('peer-a');
    clock.advance(-1_000);
    expect(() => limiter.consume('peer-a')).toThrow(/monotonic/i);
  });

  test('the tracked bucket map never grows beyond the configured maximum', () => {
    const clock = createManualClock();
    const limiter = new PeerRateLimiter({
      capacity: CAPACITY,
      refillRatePerSecond: REFILL_PER_SECOND,
      maxBuckets: 5,
      idleEvictionMs: IDLE_EVICTION_MS,
      monotonicNow: clock.now
    });

    for (let i = 0; i < 50; i += 1) {
      limiter.consume(`peer-${i}`);
      expect(limiter.bucketCount).toBeLessThanOrEqual(5);
    }
  });
});
