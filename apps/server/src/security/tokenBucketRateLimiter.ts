import { performance } from 'node:perf_hooks';

export type MonotonicClock = () => number;

export interface TokenBucketRateLimiterOptions {
  readonly capacity: number;
  readonly refillRatePerSecond: number;
  readonly now?: MonotonicClock;
}

export interface TokenBucketConsumeResult {
  readonly allowed: boolean;
  readonly remainingTokens: number;
  readonly retryAfterMs: number;
}

interface TokenBucketState {
  tokens: number;
  lastRefillAt: number;
}

const MAXIMUM_PRECISION_SAFE_RATE_LIMIT_VALUE = Number.MAX_SAFE_INTEGER;
const MINIMUM_FINITE_RETRY_REFILL_RATE = 1000 / Number.MAX_VALUE;

function requireFinitePositive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite positive number.`);
  }

  return value;
}

function requireCapacity(value: number): number {
  requireFinitePositive(value, 'Token bucket capacity');

  if (value < 1 || value > MAXIMUM_PRECISION_SAFE_RATE_LIMIT_VALUE) {
    throw new Error('Token bucket capacity must be between 1 and Number.MAX_SAFE_INTEGER.');
  }

  return value;
}

function requireRefillRate(value: number): number {
  requireFinitePositive(value, 'Token bucket refill rate');

  if (
    value < MINIMUM_FINITE_RETRY_REFILL_RATE ||
    value > MAXIMUM_PRECISION_SAFE_RATE_LIMIT_VALUE
  ) {
    throw new Error('Token bucket refill rate is outside the precision-safe range.');
  }

  return value;
}

export class TokenBucketRateLimiter {
  readonly capacity: number;
  readonly refillRatePerSecond: number;
  private readonly now: MonotonicClock;
  private readonly buckets = new Map<string, TokenBucketState>();

  constructor(options: TokenBucketRateLimiterOptions) {
    this.capacity = requireCapacity(options.capacity);
    this.refillRatePerSecond = requireRefillRate(options.refillRatePerSecond);
    this.now = options.now ?? performance.now.bind(performance);
  }

  consume(key: string): TokenBucketConsumeResult {
    const now = this.readClock();
    const existing = this.buckets.get(key);
    const bucket = existing ?? {
      tokens: this.capacity,
      lastRefillAt: now
    };

    if (now < bucket.lastRefillAt) {
      throw new Error('Token bucket clock must be monotonic.');
    }

    const elapsedSeconds = (now - bucket.lastRefillAt) / 1000;
    bucket.tokens = Math.min(
      this.capacity,
      bucket.tokens + elapsedSeconds * this.refillRatePerSecond
    );
    bucket.lastRefillAt = now;

    const allowed = bucket.tokens >= 1;

    if (allowed) {
      bucket.tokens -= 1;
    }

    this.buckets.set(key, bucket);

    return Object.freeze({
      allowed,
      remainingTokens: bucket.tokens,
      retryAfterMs: allowed
        ? 0
        : ((1 - bucket.tokens) * 1000) / this.refillRatePerSecond
    });
  }

  delete(key: string): boolean {
    return this.buckets.delete(key);
  }

  clear(): void {
    this.buckets.clear();
  }

  private readClock(): number {
    const value = this.now();

    if (!Number.isFinite(value)) {
      throw new Error('Token bucket clock must return a finite number.');
    }

    return value;
  }
}
