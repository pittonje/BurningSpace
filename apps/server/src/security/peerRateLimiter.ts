import { performance } from 'node:perf_hooks';
import { TokenBucketRateLimiter, type MonotonicClock } from './tokenBucketRateLimiter.js';

export interface PeerRateLimiterOptions {
  readonly capacity: number;
  readonly refillRatePerSecond: number;
  readonly maxBuckets: number;
  readonly idleEvictionMs: number;
  readonly monotonicNow?: MonotonicClock;
}

export interface PeerRateLimitResult {
  readonly allowed: boolean;
  readonly retryAfterMs: number;
  readonly reason?: 'bucket_capacity_reached';
}

function requirePositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}

/**
 * Wraps the existing TokenBucketRateLimiter with a bounded number of
 * per-peer buckets plus idle eviction, so an unbounded set of attacker-
 * controlled peer keys cannot grow the underlying Map without limit.
 */
export class PeerRateLimiter {
  private readonly limiter: TokenBucketRateLimiter;
  private readonly lastAccessAt = new Map<string, number>();
  private readonly maxBuckets: number;
  private readonly idleEvictionMs: number;
  private readonly now: MonotonicClock;

  constructor(options: PeerRateLimiterOptions) {
    this.limiter = new TokenBucketRateLimiter({
      capacity: options.capacity,
      refillRatePerSecond: options.refillRatePerSecond,
      now: options.monotonicNow
    });
    this.maxBuckets = requirePositiveInteger(options.maxBuckets, 'maxBuckets');
    this.idleEvictionMs = requirePositiveInteger(options.idleEvictionMs, 'idleEvictionMs');
    this.now = options.monotonicNow ?? performance.now.bind(performance);
  }

  get bucketCount(): number {
    return this.lastAccessAt.size;
  }

  consume(peerKey: string): PeerRateLimitResult {
    const now = this.now();
    const isKnownPeer = this.lastAccessAt.has(peerKey);

    if (!isKnownPeer) {
      if (this.lastAccessAt.size >= this.maxBuckets) {
        this.evictIdle(now);
      }

      // Never evict a non-idle arbitrary peer merely to admit a new key;
      // existing peers keep operating even while the cap is reached.
      if (this.lastAccessAt.size >= this.maxBuckets) {
        return Object.freeze({
          allowed: false,
          retryAfterMs: this.idleEvictionMs,
          reason: 'bucket_capacity_reached' as const
        });
      }
    }

    this.lastAccessAt.set(peerKey, now);
    const result = this.limiter.consume(peerKey);
    return Object.freeze({ allowed: result.allowed, retryAfterMs: result.retryAfterMs });
  }

  private evictIdle(now: number): void {
    for (const [key, lastAccess] of this.lastAccessAt) {
      if (now - lastAccess >= this.idleEvictionMs) {
        this.lastAccessAt.delete(key);
        this.limiter.delete(key);
      }
    }
  }
}
