import type { AuthContext } from 'colyseus';
import type { Pool } from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BattleRoom } from '../../src/rooms/BattleRoom.js';
import { generateCredential } from '../../src/persistence/credential.js';
import {
  createProductionRoomDependencies,
  installProductionRoomDependencies,
  type ProductionRoomDependenciesInstallation
} from '../../src/persistence/productionRoomDependencies.js';
import {
  installNetworkBoundary,
  parseNetworkBoundaryConfig,
  type NetworkBoundaryInstallation
} from '../../src/security/networkBoundary.js';
import { PeerRateLimiter } from '../../src/security/peerRateLimiter.js';
import {
  createTestGuestIdentity,
  joinCanonicalBattleRoom
} from '../support/testIdentityHelper.js';
import { startProductionBattleServer, type ProductionBattleServerHandle } from '../support/startProductionBattleServer.js';
import { describeUnreachableDatabaseWarning, isTestDatabaseReachable } from '../support/testPersistenceDatabase.js';

const databaseAvailable = await isTestDatabaseReachable();

if (!databaseAvailable) {
  console.warn(describeUnreachableDatabaseWarning('freshAuthRateLimiting.test.ts'));
}

const WORLD_ID = '11111111-2222-4333-8444-555555555555';
const VALID_CREDENTIAL = generateCredential().credential;
const ALLOWED_ORIGIN = 'https://play.example.com';
const HOSTILE_ORIGIN = 'https://hostile.example';

function fakeContext(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    token: undefined,
    headers: {},
    ip: '203.0.113.9',
    req: { socket: { remoteAddress: '198.51.100.7' } } as unknown as AuthContext['req'],
    ...overrides
  } as AuthContext;
}

interface Harness {
  readonly pool: { query: ReturnType<typeof vi.fn> };
  readonly limiter: PeerRateLimiter;
  restore(): void;
}

function installHarness(options: {
  monotonicNow?: () => number;
  maxBuckets?: number;
  isAuthoritySafe?: boolean;
} = {}): Harness {
  const networkBoundary: NetworkBoundaryInstallation = installNetworkBoundary(
    parseNetworkBoundaryConfig({
      NODE_ENV: 'production',
      BURNINGSPACE_ALLOWED_ORIGINS: ALLOWED_ORIGIN
    })
  );
  const pool = {
    query: vi.fn().mockResolvedValue({
      rows: [{ credential_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', player_id: 'pppppppp-pppp-4ppp-8ppp-pppppppppppp' }],
      rowCount: 1
    })
  };
  const limiter = new PeerRateLimiter({
    capacity: 10,
    refillRatePerSecond: 1,
    maxBuckets: options.maxBuckets ?? 10_000,
    idleEvictionMs: 600_000,
    monotonicNow: options.monotonicNow
  });
  const dependenciesInstallation: ProductionRoomDependenciesInstallation = installProductionRoomDependencies(
    createProductionRoomDependencies({
      worldId: WORLD_ID,
      writerEpoch: 1n,
      pool: pool as unknown as Pool,
      writer: { isControlSafe: () => options.isAuthoritySafe ?? true },
      freshAuthLimiter: limiter
    })
  );

  return {
    pool,
    limiter,
    restore(): void {
      dependenciesInstallation.restore();
      networkBoundary.restore();
    }
  };
}

let harness: Harness | undefined;

afterEach(() => {
  harness?.restore();
  harness = undefined;
});

describe('fresh-auth rate limiting (BattleRoom.onAuth)', () => {
  it('rejects a disallowed Origin before ever consuming a rate-limit token or touching the database', async () => {
    harness = installHarness();
    const context = fakeContext({ headers: { origin: HOSTILE_ORIGIN } });

    const result = await BattleRoom.onAuth('', { credential: VALID_CREDENTIAL }, context);

    expect(result).toBe(false);
    expect(harness.limiter.bucketCount).toBe(0);
    expect(harness.pool.query).not.toHaveBeenCalled();
  });

  it('allows exactly 10 fresh-auth attempts per peer, denies the 11th before any database lookup, and never trusts forwarded headers for peer identity', async () => {
    harness = installHarness();
    const sharedSocketContext = (forwardedFor?: string): AuthContext =>
      fakeContext({
        headers: { origin: ALLOWED_ORIGIN, ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}) },
        // A forged/differing context.ip (as Colyseus populates it from
        // X-Forwarded-For/X-Real-IP) must have zero effect: only
        // req.socket.remoteAddress may key the bucket.
        ip: forwardedFor ?? '203.0.113.9',
        req: { socket: { remoteAddress: '198.51.100.7' } } as unknown as AuthContext['req']
      });

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const forwardedFor = attempt % 2 === 0 ? `10.0.0.${attempt}` : undefined;
      const result = await BattleRoom.onAuth('', { credential: VALID_CREDENTIAL }, sharedSocketContext(forwardedFor));
      expect(result).not.toBe(false);
    }

    expect(harness.pool.query).toHaveBeenCalledTimes(10);

    await expect(
      BattleRoom.onAuth('', { credential: VALID_CREDENTIAL }, sharedSocketContext())
    ).rejects.toMatchObject({ message: 'auth_rate_limited' });

    // The 11th (denied) attempt must not have reached the database.
    expect(harness.pool.query).toHaveBeenCalledTimes(10);
  });

  it('restores exactly one bucket slot after a 1-second monotonic advance', async () => {
    let now = 0;
    harness = installHarness({ monotonicNow: () => now });
    const context = fakeContext({ headers: { origin: ALLOWED_ORIGIN } });

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await BattleRoom.onAuth('', { credential: VALID_CREDENTIAL }, context);
    }

    await expect(BattleRoom.onAuth('', { credential: VALID_CREDENTIAL }, context)).rejects.toMatchObject({
      message: 'auth_rate_limited'
    });

    now += 1_000;

    const restored = await BattleRoom.onAuth('', { credential: VALID_CREDENTIAL }, context);
    expect(restored).not.toBe(false);
    expect(harness.pool.query).toHaveBeenCalledTimes(11);

    await expect(BattleRoom.onAuth('', { credential: VALID_CREDENTIAL }, context)).rejects.toMatchObject({
      message: 'auth_rate_limited'
    });
  });

  it('bounds the number of distinct peer buckets (scaled-down maxBuckets, proven through the wired onAuth path)', async () => {
    harness = installHarness({ maxBuckets: 3 });

    for (let peer = 1; peer <= 3; peer += 1) {
      const context = fakeContext({
        headers: { origin: ALLOWED_ORIGIN },
        req: { socket: { remoteAddress: `192.0.2.${peer}` } } as unknown as AuthContext['req']
      });
      const result = await BattleRoom.onAuth('', { credential: VALID_CREDENTIAL }, context);
      expect(result).not.toBe(false);
    }

    expect(harness.limiter.bucketCount).toBe(3);

    // A 4th, never-seen peer exceeds maxBuckets with no idle bucket to
    // evict, so it must be denied before any database lookup.
    const fourthPeerContext = fakeContext({
      headers: { origin: ALLOWED_ORIGIN },
      req: { socket: { remoteAddress: '192.0.2.4' } } as unknown as AuthContext['req']
    });
    await expect(
      BattleRoom.onAuth('', { credential: VALID_CREDENTIAL }, fourthPeerContext)
    ).rejects.toMatchObject({ message: 'auth_rate_limited' });
    expect(harness.pool.query).toHaveBeenCalledTimes(3);
  });

  it.skipIf(!databaseAvailable)('smoke test: a real server enforces the fresh-auth limiter over the wire and recovers after a monotonic advance', async () => {
    let now = 0;
    let server: ProductionBattleServerHandle | undefined;

    try {
      server = await startProductionBattleServer({
        networkBoundaryConfig: parseNetworkBoundaryConfig({ NODE_ENV: 'test' }),
        freshAuthLimiterClock: () => now
      });

      // One guest identity, reused for every join attempt below: the
      // fresh-auth limiter is keyed by peer (every attempt below shares the
      // loopback socket), not by credential, so reusing one credential
      // isolates the fresh-auth limiter from the separate, much tighter
      // /identity/guest creation limiter (Packet 4, capacity 3).
      const { credential } = await createTestGuestIdentity(server.url);
      let rejectedCount = 0;

      for (let attempt = 1; attempt <= 11; attempt += 1) {
        try {
          const room = await joinCanonicalBattleRoom(server.url, credential);
          await room.leave(true).catch(() => undefined);
        } catch {
          rejectedCount += 1;
        }
      }

      // All 11 real join attempts share one peer bucket (loopback), so
      // exactly the 11th must be denied by the capacity-10 fresh-auth limiter.
      expect(rejectedCount).toBe(1);

      now += 1_000;
      const recovered = await joinCanonicalBattleRoom(server.url, credential);
      await recovered.leave(true).catch(() => undefined);
    } finally {
      await server?.stop();
    }
  }, 20_000);
});
