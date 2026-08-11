import type { IncomingMessage } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { matchMaker } from 'colyseus';
import {
  createWebSocketVerifyClient,
  installNetworkBoundary,
  isRequestOriginAllowed,
  parseNetworkBoundaryConfig,
  type NetworkBoundaryConfig,
  type NetworkBoundaryInstallation,
  type WebSocketVerifyClientInfo
} from '../src/security/networkBoundary.js';
import { TokenBucketRateLimiter } from '../src/security/tokenBucketRateLimiter.js';

const installations: NetworkBoundaryInstallation[] = [];

function productionConfig(
  allowedOrigins = 'https://play.example.com'
): NetworkBoundaryConfig {
  return parseNetworkBoundaryConfig({
    NODE_ENV: 'production',
    BURNINGSPACE_ALLOWED_ORIGINS: allowedOrigins
  });
}

function install(config: NetworkBoundaryConfig): NetworkBoundaryInstallation {
  const installation = installNetworkBoundary(config);
  installations.push(installation);
  return installation;
}

function requestWithOrigin(origin?: string): IncomingMessage {
  return {
    headers: origin === undefined ? {} : { origin }
  } as IncomingMessage;
}

function verify(
  config: NetworkBoundaryConfig,
  origin?: string,
  additionalHeaders: Record<string, string> = {}
): readonly [boolean, number?, string?] {
  let result: readonly [boolean, number?, string?] | undefined;
  const verifier = createWebSocketVerifyClient(config);
  const req = {
    headers: {
      ...additionalHeaders,
      ...(origin === undefined ? {} : { origin })
    }
  } as IncomingMessage;
  const info: WebSocketVerifyClientInfo = {
    origin,
    secure: false,
    req
  };

  verifier(info, (accepted, code, message) => {
    result = [accepted, code, message];
  });

  if (!result) {
    throw new Error('Expected the WebSocket verifier to complete synchronously.');
  }

  return result;
}

afterEach(() => {
  for (const installation of installations.splice(0).reverse()) {
    installation.restore();
  }
});

describe('network boundary configuration and Origin policy', () => {
  it('fails closed when production has no allowed-origin configuration', () => {
    expect(() => parseNetworkBoundaryConfig({ NODE_ENV: 'production' })).toThrow(
      'BURNINGSPACE_ALLOWED_ORIGINS is required in production.'
    );
  });

  it('rejects an empty production allowed-origin value', () => {
    expect(() =>
      parseNetworkBoundaryConfig({
        NODE_ENV: 'production',
        BURNINGSPACE_ALLOWED_ORIGINS: '   '
      })
    ).toThrow('BURNINGSPACE_ALLOWED_ORIGINS must not be empty.');
  });

  it.each([
    ['wildcard', '*'],
    ['wildcard hostname', 'https://*.example.com'],
    ['malformed value', 'not an origin'],
    ['embedded newline', 'https://play.\nexample.com'],
    ['embedded tab', 'https://play.\texample.com'],
    ['terminal backslash', 'https://play.example.com\\'],
    ['backslash path', 'https://play.example.com\\arena'],
    ['scheme without authority separator', 'https:play.example.com'],
    ['path', 'https://play.example.com/game'],
    ['normalized dot path', 'https://play.example.com/./'],
    ['query', 'https://play.example.com?mode=test'],
    ['empty query', 'https://play.example.com?'],
    ['fragment', 'https://play.example.com/#arena'],
    ['credentials', 'https://user:secret@play.example.com'],
    ['empty username', 'https://@play.example.com'],
    ['empty username and password', 'https://:@play.example.com'],
    ['empty port', 'https://play.example.com:'],
    ['empty IPv6 port', 'https://[::1]:'],
    ['unsupported scheme', 'file://play.example.com'],
    ['null origin', 'null']
  ])('rejects %s in configured origins', (_label, origin) => {
    expect(() => productionConfig(origin)).toThrow();
  });

  it('normalizes exact valid origins and removes duplicates deterministically', () => {
    const config = productionConfig(
      'HTTPS://PLAY.EXAMPLE.COM:443,https://play.example.com/,http://LOCALHOST:80'
    );

    expect(config.allowedOrigins).toEqual([
      'https://play.example.com',
      'http://localhost'
    ]);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.allowedOrigins)).toBe(true);
  });

  it.each([
    'BURNINGSPACE_PROFILE_RATE_BURST',
    'BURNINGSPACE_PROFILE_RATE_PER_SECOND',
    'BURNINGSPACE_INPUT_RATE_BURST',
    'BURNINGSPACE_INPUT_RATE_PER_SECOND'
  ] as const)('rejects invalid %s overrides', (variableName) => {
    expect(() =>
      parseNetworkBoundaryConfig({
        NODE_ENV: 'production',
        BURNINGSPACE_ALLOWED_ORIGINS: 'https://play.example.com',
        [variableName]: '0'
      })
    ).toThrow(`${variableName} must be a finite positive number.`);
  });

  it.each(['', '-1', 'NaN', 'Infinity'])('rejects a non-positive or non-finite rate value: %j', (value) => {
    expect(() =>
      parseNetworkBoundaryConfig({
        NODE_ENV: 'production',
        BURNINGSPACE_ALLOWED_ORIGINS: 'https://play.example.com',
        BURNINGSPACE_INPUT_RATE_PER_SECOND: value
      })
    ).toThrow('BURNINGSPACE_INPUT_RATE_PER_SECOND must be a finite positive number.');
  });

  it('parses finite positive rate overrides', () => {
    const config = parseNetworkBoundaryConfig({
      NODE_ENV: 'production',
      BURNINGSPACE_ALLOWED_ORIGINS: 'https://play.example.com',
      BURNINGSPACE_PROFILE_RATE_BURST: '3.5',
      BURNINGSPACE_PROFILE_RATE_PER_SECOND: '2',
      BURNINGSPACE_INPUT_RATE_BURST: '9',
      BURNINGSPACE_INPUT_RATE_PER_SECOND: '4.25'
    });

    expect(config.profileRateLimit).toEqual({ burst: 3.5, refillRatePerSecond: 2 });
    expect(config.inputRateLimit).toEqual({ burst: 9, refillRatePerSecond: 4.25 });
  });

  it.each([
    ['BURNINGSPACE_INPUT_RATE_BURST', '0.5'],
    ['BURNINGSPACE_INPUT_RATE_BURST', '100000000000000000000'],
    ['BURNINGSPACE_INPUT_RATE_PER_SECOND', '1e-320'],
    ['BURNINGSPACE_INPUT_RATE_PER_SECOND', '100000000000000000000']
  ] as const)('rejects a limiter-disabling %s override', (variableName, value) => {
    expect(() =>
      parseNetworkBoundaryConfig({
        NODE_ENV: 'production',
        BURNINGSPACE_ALLOWED_ORIGINS: 'https://play.example.com',
        [variableName]: value
      })
    ).toThrow(`${variableName} is outside the precision-safe token-bucket range.`);
  });

  it('uses the exact approved production rate defaults', () => {
    const config = productionConfig();

    expect(config.profileRateLimit).toEqual({ burst: 8, refillRatePerSecond: 1 });
    expect(config.inputRateLimit).toEqual({ burst: 80, refillRatePerSecond: 40 });
  });

  it('requires a production Origin and matches only exact normalized origins', () => {
    const config = productionConfig(
      'https://play.example.com,https://play.example.com:8443'
    );

    expect(isRequestOriginAllowed(config, undefined)).toBe(false);
    expect(isRequestOriginAllowed(config, 'https://play.example.com')).toBe(true);
    expect(isRequestOriginAllowed(config, 'HTTPS://PLAY.EXAMPLE.COM:443')).toBe(true);
    expect(isRequestOriginAllowed(config, 'https://play.example.com:8443')).toBe(true);
    expect(isRequestOriginAllowed(config, 'https://play.example.com.evil.test')).toBe(false);
    expect(isRequestOriginAllowed(config, 'https://evil.test/play.example.com')).toBe(false);
    expect(isRequestOriginAllowed(config, ['https://play.example.com'])).toBe(false);
  });

  it('allows only missing or loopback HTTP/HTTPS Origins by development default', () => {
    const config = parseNetworkBoundaryConfig({ NODE_ENV: 'development' });

    expect(isRequestOriginAllowed(config, undefined)).toBe(true);
    expect(isRequestOriginAllowed(config, 'http://localhost:5173')).toBe(true);
    expect(isRequestOriginAllowed(config, 'https://127.0.0.1:7443')).toBe(true);
    expect(isRequestOriginAllowed(config, 'http://[::1]:3000')).toBe(true);
    expect(isRequestOriginAllowed(config, 'https://remote.example.com')).toBe(false);
    expect(isRequestOriginAllowed(config, 'file://localhost')).toBe(false);
  });

  it('uses only an explicit development allowlist while retaining missing-Origin support', () => {
    const config = parseNetworkBoundaryConfig({
      NODE_ENV: 'test',
      BURNINGSPACE_ALLOWED_ORIGINS: 'https://test.example.com'
    });

    expect(isRequestOriginAllowed(config, undefined)).toBe(true);
    expect(isRequestOriginAllowed(config, 'https://test.example.com')).toBe(true);
    expect(isRequestOriginAllowed(config, 'http://localhost:5173')).toBe(false);
  });

  it('reflects only allowed exact CORS origins and always varies on Origin', () => {
    install(productionConfig());

    const allowed = matchMaker.controller.getCorsHeaders(
      requestWithOrigin('HTTPS://PLAY.EXAMPLE.COM:443')
    );
    const denied = matchMaker.controller.getCorsHeaders(
      requestWithOrigin('https://hostile.example')
    );

    expect(allowed['Access-Control-Allow-Origin']).toBe('https://play.example.com');
    expect(allowed.Vary).toBe('Origin');
    expect(denied['Access-Control-Allow-Origin']).toBe('');
    expect(denied['Access-Control-Allow-Origin']).not.toBe('*');
    expect(Object.values(denied)).not.toContain('https://hostile.example');
    expect(denied.Vary).toBe('Origin');
  });

  it('restores nested global policies safely even when stopped out of order', () => {
    const originalCorsFactory = matchMaker.controller.getCorsHeaders;
    const first = install(productionConfig('https://first.example'));
    const second = install(productionConfig('https://second.example'));

    first.restore();
    expect(
      matchMaker.controller.getCorsHeaders(requestWithOrigin('https://second.example'))[
        'Access-Control-Allow-Origin'
      ]
    ).toBe('https://second.example');

    second.restore();
    expect(matchMaker.controller.getCorsHeaders).toBe(originalCorsFactory);
  });
});

describe('WebSocket Origin verifier', () => {
  it('accepts an allowed origin without performing identity checks', () => {
    expect(
      verify(productionConfig(), 'https://play.example.com', {
        authorization: 'Bearer deliberately-invalid'
      })
    ).toEqual([true, undefined, undefined]);
  });

  it('rejects a disallowed origin with HTTP 403 and a clear reason', () => {
    expect(verify(productionConfig(), 'https://hostile.example')).toEqual([
      false,
      403,
      'Origin is not allowed.'
    ]);
  });

  it('rejects a missing production origin with HTTP 403', () => {
    expect(verify(productionConfig())).toEqual([
      false,
      403,
      'Origin is not allowed.'
    ]);
  });
});

describe('token bucket rate limiter', () => {
  it('starts full, consumes capacity, and reports bounded retry timing when empty', () => {
    let now = 100;
    const limiter = new TokenBucketRateLimiter({
      capacity: 2,
      refillRatePerSecond: 2,
      now: () => now
    });

    expect(limiter.consume('client')).toMatchObject({ allowed: true, remainingTokens: 1 });
    expect(limiter.consume('client')).toMatchObject({ allowed: true, remainingTokens: 0 });
    expect(limiter.consume('client')).toEqual({
      allowed: false,
      remainingTokens: 0,
      retryAfterMs: 500
    });

    now += 250;
    expect(limiter.consume('client')).toEqual({
      allowed: false,
      remainingTokens: 0.5,
      retryAfterMs: 250
    });
  });

  it('refills from injected time and caps accumulated tokens at capacity', () => {
    let now = 0;
    const limiter = new TokenBucketRateLimiter({
      capacity: 3,
      refillRatePerSecond: 1,
      now: () => now
    });

    limiter.consume('client');
    limiter.consume('client');
    limiter.consume('client');
    now = 10_000;

    expect(limiter.consume('client')).toEqual({
      allowed: true,
      remainingTokens: 2,
      retryAfterMs: 0
    });
  });

  it('isolates keys and delete resets only the requested key', () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 1,
      refillRatePerSecond: 1,
      now: () => 0
    });

    expect(limiter.consume('first').allowed).toBe(true);
    expect(limiter.consume('first').allowed).toBe(false);
    expect(limiter.consume('second').allowed).toBe(true);
    expect(limiter.delete('first')).toBe(true);
    expect(limiter.consume('first').allowed).toBe(true);
    expect(limiter.consume('second').allowed).toBe(false);
  });

  it('clear resets every key', () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 1,
      refillRatePerSecond: 1,
      now: () => 0
    });

    limiter.consume('first');
    limiter.consume('second');
    limiter.clear();

    expect(limiter.consume('first').allowed).toBe(true);
    expect(limiter.consume('second').allowed).toBe(true);
  });

  it.each([
    [{ capacity: 0, refillRatePerSecond: 1 }, 'Token bucket capacity'],
    [{ capacity: Number.POSITIVE_INFINITY, refillRatePerSecond: 1 }, 'Token bucket capacity'],
    [{ capacity: 1, refillRatePerSecond: -1 }, 'Token bucket refill rate'],
    [{ capacity: 1, refillRatePerSecond: Number.NaN }, 'Token bucket refill rate']
  ])('rejects invalid configuration %#', (options, expectedMessage) => {
    expect(() => new TokenBucketRateLimiter(options)).toThrow(
      `${expectedMessage} must be a finite positive number.`
    );
  });

  it.each([
    [
      { capacity: 0.5, refillRatePerSecond: 1 },
      'Token bucket capacity must be between 1 and Number.MAX_SAFE_INTEGER.'
    ],
    [
      { capacity: 100000000000000000000, refillRatePerSecond: 1 },
      'Token bucket capacity must be between 1 and Number.MAX_SAFE_INTEGER.'
    ],
    [
      { capacity: 1, refillRatePerSecond: 1e-320 },
      'Token bucket refill rate is outside the precision-safe range.'
    ],
    [
      { capacity: 1, refillRatePerSecond: 100000000000000000000 },
      'Token bucket refill rate is outside the precision-safe range.'
    ]
  ])('rejects limiter-disabling numeric configuration %#', (options, expectedMessage) => {
    expect(() => new TokenBucketRateLimiter(options)).toThrow(expectedMessage);
  });

  it('rejects a non-monotonic injected clock', () => {
    let now = 10;
    const limiter = new TokenBucketRateLimiter({
      capacity: 1,
      refillRatePerSecond: 1,
      now: () => now
    });

    limiter.consume('client');
    now = 9;

    expect(() => limiter.consume('client')).toThrow('Token bucket clock must be monotonic.');
  });
});
