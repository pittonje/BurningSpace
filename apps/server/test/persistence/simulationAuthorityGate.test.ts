import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchMaker } from 'colyseus';
import {
  NETWORK_SHIP_MAX_HEALTH,
  NETWORK_TICK_INTERVAL_MS,
  NETWORK_WEAPON_FIRE_INTERVAL_MS
} from '@burningspace/shared';
import {
  ProfileClientMessages,
  ProfileServerMessages,
  type ProfileRejectedMessage
} from '@burningspace/protocol';
import {
  NetworkClient,
  type ConnectionState,
  type PlayerInputPayload
} from '../../../client/src/network/NetworkClient';
import { startProductionServer, type ProductionServerHandle } from '../../src/index.js';
import type { RuntimeLifecycle } from '../../src/ops/runtimeLifecycle.js';
import type { PersistenceRuntime } from '../../src/persistence/persistenceRuntime.js';
import type { GameplayAuthorityTestHooks } from '../../src/persistence/gameplayAuthority.js';
import type { MonotonicClock } from '../../src/persistence/writerLifecycle.js';
import type { BattleState } from '../../src/schema/BattleState.js';
import type { ProjectileState } from '../../src/schema/ProjectileState.js';
import * as productionRoomDependenciesModule from '../../src/persistence/productionRoomDependencies.js';
import { getActiveNetworkBoundaryConfig } from '../../src/security/networkBoundary.js';
import { TestBattleRoom, TestRoomMessages } from '../support/TestBattleRoom.js';
import {
  createInMemoryIdentityStorage,
  createTestGuestIdentity,
  discoverCanonicalBattleRoom,
  joinCanonicalBattleRoom
} from '../support/testIdentityHelper.js';
import {
  ADMIN_DATABASE_URL,
  createBootstrappedTestDatabase,
  describeUnreachableDatabaseWarning,
  isTestDatabaseReachable,
  withDirectConnection
} from '../support/testPersistenceDatabase.js';

const TEST_TIMEOUT_MS = 15_000;
const TEST_TIMEOUT_MS_LONG = 20_000;
const WAIT_TIMEOUT_MS = 5_000;
// Bound for each individual observable-teardown-completion check inside
// the shared cleanup path (see bootAuthorityTestServer's stop()). Kept
// well under HOOK_TIMEOUT_MS even if every one of them had to use its
// full budget.
const CLEANUP_STEP_DEADLINE_MS = 6_000;
// Explicit afterEach/hook timeout: default Vitest hook timeout (10s) is
// not guaranteed to cover the shared cleanup path's worst case (multiple
// sequential CLEANUP_STEP_DEADLINE_MS-bounded waits plus a real DB round
// trip), even though it resolves near-instantly in the common case.
const HOOK_TIMEOUT_MS = 40_000;
// Large enough that this harness's own real setInterval-based heartbeat
// never fires during a test -- every authority-unsafe observation below
// comes from the synchronous writer.isControlSafe() clock check (or an
// explicit lifecycle.markFailed() call), never from a heartbeat failure
// callback actually running.
const NEVER_FIRING_HEARTBEAT_INTERVAL_MS = 999_999_999;
// Matches createTestDatabase()'s own bs_test_<32-hex> naming exactly, but
// is re-validated here (rather than trusted) before this file interpolates
// the name into a DROP DATABASE statement.
const SAFE_DATABASE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_]+$/;

function assertSafeDatabaseIdentifier(name: string): void {
  if (!SAFE_DATABASE_IDENTIFIER_PATTERN.test(name)) {
    throw new Error(`Refusing to interpolate an unsafe database identifier: ${JSON.stringify(name)}.`);
  }
}

const databaseAvailable = await isTestDatabaseReachable();

if (!databaseAvailable) {
  console.warn(describeUnreachableDatabaseWarning('simulationAuthorityGate.test.ts'));
}

const PM2_TELEMETRY_FILTER_MARKER = Symbol.for('burningspace.test.pm2-telemetry-worker-filter');

function isPm2TelemetryMessage(message: unknown): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof message.type === 'string' &&
    message.type.startsWith('axm:')
  );
}

/**
 * Duplicated verbatim from startProductionBattleServer.ts (not importable --
 * that file's own harness doesn't expose lifecycle/persistence/a
 * controllable writer clock, which every scenario in this file needs). Same
 * PM2/@pm2-io worker-IPC guard, kept idempotent via the shared well-known
 * Symbol so it is harmless if both harnesses run in the same worker.
 */
function installPm2TelemetryFilterForWorkerIpc(): void {
  const workerSend = process.send;

  if (!workerSend || Reflect.get(workerSend, PM2_TELEMETRY_FILTER_MARKER) === true) {
    return;
  }

  const filteredSend = ((message: unknown, ...args: unknown[]): boolean => {
    if (isPm2TelemetryMessage(message)) {
      return true;
    }

    return Reflect.apply(workerSend, process, [message, ...args]) as boolean;
  }) as typeof process.send;

  Reflect.defineProperty(filteredSend, PM2_TELEMETRY_FILTER_MARKER, { value: true });
  process.send = filteredSend;
}

interface AuthorityTestServer {
  readonly url: string;
  readonly databaseUrl: string;
  readonly databaseName: string;
  readonly worldId: string;
  readonly lifecycle: RuntimeLifecycle;
  readonly persistence: PersistenceRuntime;
  /** Mutable box backing the injected writer MonotonicClock -- advance or rewind `.value` to control writer.isControlSafe() deterministically. */
  readonly writerClock: { value: number };
  /**
   * Guaranteed, state-aware, idempotent cleanup. Does not depend on the
   * test body having reached any particular line -- REVIEW-C01-A's
   * confirmed defect was that this used to live inline in one scenario's
   * body, after its freeze assertions, so an earlier thrown assertion
   * skipped it entirely. Every scenario's afterEach/finally (and this
   * harness's own boot-failure path) calls this exact method; there is no
   * separate cleanup implementation anywhere else in this file.
   */
  stop(): Promise<void>;
}

interface BootAuthorityTestServerOptions {
  readonly gameplayAuthorityTestHooks?: GameplayAuthorityTestHooks;
}

async function waitForAsync(
  condition: () => Promise<boolean>,
  label: string,
  timeoutMs = WAIT_TIMEOUT_MS
): Promise<void> {
  const startedAt = Date.now();

  for (;;) {
    if (await condition()) {
      return;
    }

    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}.`);
    }

    await delay(20);
  }
}

/**
 * True only once nothing is listening on this origin at all (a definitive
 * ECONNREFUSED from the underlying connection attempt). A 503 (or any
 * other) HTTP response means the listener is still accepting connections;
 * an aborted/timed-out attempt is inconclusive (the process could simply
 * be slow for an unrelated reason) and must NOT be treated as proof of
 * closure either way.
 */
async function isHttpListenerClosed(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);

  try {
    await fetch(url, { signal: controller.signal });
    return false;
  } catch (error) {
    const cause = (error as { cause?: { code?: string } } | undefined)?.cause;
    return cause?.code === 'ECONNREFUSED';
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * A self-contained composition mirroring startProductionBattleServer.ts, but
 * built directly on startProductionServer() so this test file can reach
 * `lifecycle`, `persistence.writer`, and a controllable writer clock -- none
 * of which the existing test harness exposes, and none of which
 * ARCH-FIX1 is permitted to add to that shared file. No persistence bypass,
 * no auth bypass: real disposable PostgreSQL, real identity/discovery HTTP
 * routes, real productionRoomDependencies/BattleRoom auth.
 */
async function bootAuthorityTestServer(
  options: BootAuthorityTestServerOptions = {}
): Promise<AuthorityTestServer> {
  installPm2TelemetryFilterForWorkerIpc();

  const writerClock = { value: 0 };
  const clock: MonotonicClock = { now: () => writerClock.value };

  // Captured BEFORE booting, inside the harness, so cleanup can always
  // compare against the true pre-boot baseline even if the test body
  // itself never reaches a line that would otherwise have captured it.
  const dependenciesBaselineBeforeBoot = productionRoomDependenciesModule.getActiveProductionRoomDependencies();
  const networkBoundaryBaselineBeforeBoot = getActiveNetworkBoundaryConfig();

  const database = await createBootstrappedTestDatabase();
  assertSafeDatabaseIdentifier(database.databaseName);
  let server: ProductionServerHandle | undefined;

  try {
    server = await startProductionServer({
      environment: { NODE_ENV: 'test', DATABASE_URL: database.databaseUrl },
      port: 0,
      hostname: '127.0.0.1',
      registerSignalHandlers: false,
      exitOnAuthorityLoss: false,
      battleRoomClassOverride: TestBattleRoom,
      gameplayAuthorityTestHooks: options.gameplayAuthorityTestHooks,
      persistence: {
        writerOptions: {
          clock,
          heartbeatIntervalMillis: NEVER_FIRING_HEARTBEAT_INTERVAL_MS
        }
      }
    });
  } catch (error) {
    await server?.shutdown('SIGTERM').catch(() => undefined);
    await database.drop().catch(() => undefined);
    throw error;
  }

  const runningServer = server;
  // Published before startProductionServer()'s own promise resolves (see
  // index.ts's boot order), so this is already available here regardless
  // of whether the test body ever discovers the room itself.
  const roomId = runningServer.persistence.getCanonicalRoomId();
  let cleanupPromise: Promise<void> | undefined;

  async function performCleanup(): Promise<void> {
    const writer = runningServer.persistence.writer;
    const lifecycle = runningServer.lifecycle;

    // State 2: a synthetic scenario already declared RuntimeLifecycle
    // failed directly (bypassing handleAuthorityLost()'s own teardown
    // trigger), but the writer itself was never touched and still
    // believes it owns control. Drive the REAL authority-loss callback
    // via the exact method production's heartbeat timer would have
    // called, BEFORE any direct release/shutdown below -- release()/
    // persistence.shutdown() would stop the heartbeat and leave
    // performHeartbeat()'s stateValue==='owning' guard permanently
    // false, disabling this route. A test body that already drove this
    // itself (or a genuine schema-maintenance-connection loss that never
    // touched the writer) leaves writer.state !== 'owning' or
    // lifecycle.state !== 'failed', so this is skipped either way --
    // state 1 (still starting/ready) never takes this branch, and
    // performHeartbeat() is never called on a healthy server.
    if (lifecycle.state === 'failed' && writer.state === 'owning') {
      writerClock.value += 999_999;
      await writer.performHeartbeat().catch(() => undefined);
    }

    // State 1 (still starting/ready): begins real teardown normally.
    // State 2 (now failed via the branch above) and state 3 (teardown
    // already initiated for real, by this cleanup's own earlier call or
    // by the test body itself): beginShutdown()'s guard makes this a
    // harmless no-op, since lifecycle.state is already 'failed' either
    // way -- the waits below observe the actual completion regardless of
    // who triggered it, never assuming completion from state alone.
    await runningServer.shutdown('SIGTERM').catch(() => undefined);

    if (roomId) {
      await waitForAsync(
        async () => matchMaker.getLocalRoomById(roomId) === undefined,
        'the canonical room to be disposed by teardown',
        CLEANUP_STEP_DEADLINE_MS
      );
    }
    await waitForAsync(
      async () => isHttpListenerClosed(`${runningServer.url}/world/battle-room`),
      'the HTTP listener to stop accepting connections',
      CLEANUP_STEP_DEADLINE_MS
    );
    await waitForAsync(
      async () =>
        productionRoomDependenciesModule.getActiveProductionRoomDependencies() ===
        dependenciesBaselineBeforeBoot,
      'production room dependencies installation to be restored to its pre-boot baseline',
      CLEANUP_STEP_DEADLINE_MS
    );
    await waitForAsync(
      async () => getActiveNetworkBoundaryConfig() === networkBoundaryBaselineBeforeBoot,
      'the network boundary installation to be restored to its pre-boot baseline',
      CLEANUP_STEP_DEADLINE_MS
    );

    // Application DB connections (writer, schema-maintenance, and the
    // process-private HTTP identity pool) must all be closed by the real
    // teardown above -- proven with a separate observer connection to a
    // DIFFERENT database, never the disposable one itself, so it can
    // never appear in its own count.
    await withDirectConnection(ADMIN_DATABASE_URL, async (observer) => {
      await waitForAsync(
        async () => {
          const result = await observer.query<{ count: string }>(
            'SELECT count(*)::text AS count FROM pg_stat_activity WHERE datname = $1',
            [database.databaseName]
          );
          return result.rows[0]?.count === '0';
        },
        'every application connection to this disposable database to close',
        CLEANUP_STEP_DEADLINE_MS
      );

      const existing = await observer.query<{ datname: string }>(
        'SELECT datname FROM pg_database WHERE datname = $1',
        [database.databaseName]
      );

      if (existing.rows.length === 0) {
        // State 4: a previous cleanup attempt (or a concurrent/repeated
        // stop() call already sharing this same promise) already
        // dropped it -- nothing destructive left to repeat.
        return;
      }

      assertSafeDatabaseIdentifier(database.databaseName);
      // A plain DROP DATABASE (no FORCE, no pg_terminate_backend): it
      // only succeeds if nothing is still attached, so this is itself
      // proof of the connection-closure claim above, not merely a
      // cleanup convenience.
      await observer.query(`DROP DATABASE ${database.databaseName}`);
      const stillExists = await observer.query<{ datname: string }>(
        'SELECT datname FROM pg_database WHERE datname = $1',
        [database.databaseName]
      );

      if (stillExists.rows.length > 0) {
        throw new Error(`Disposable database ${database.databaseName} still exists after DROP DATABASE.`);
      }
    });
  }

  return {
    url: runningServer.url,
    databaseUrl: database.databaseUrl,
    databaseName: database.databaseName,
    worldId: database.worldId,
    lifecycle: runningServer.lifecycle,
    persistence: runningServer.persistence,
    writerClock,
    stop(): Promise<void> {
      if (cleanupPromise) {
        return cleanupPromise;
      }

      // Concurrent/repeated callers share this exact in-flight promise.
      // On rejection, the slot is cleared (not cached as a permanent
      // failure) so a later call can genuinely retry rather than either
      // repeating already-succeeded destructive work or silently
      // reporting success without having actually re-verified anything.
      cleanupPromise = performCleanup().catch((error: unknown) => {
        cleanupPromise = undefined;
        throw error;
      });
      return cleanupPromise;
    }
  };
}

/**
 * Test-only reflection seam onto the REAL, already-running server-side
 * BattleRoom instance (found the same way index.ts's own canonical-room
 * watchdog does: matchMaker.getLocalRoomById()) -- not a remotely
 * selectable hook, not an auth bypass. Lets scenarios read authoritative
 * ship/projectile state without client-replication lag, and drive the
 * real, private updateSimulation() tick deterministically instead of only
 * waiting on the room's own internal timer.
 */
interface BattleRoomTestAccess {
  readonly state: BattleState;
  updateSimulation(deltaTimeMs: number): void;
  /** Reflects the room's own private per-session profile-operation tail (see queueProfileOperation/awaitProfileTail in BattleRoom.ts) -- resolves once that session's in-flight SET_PROFILE handling (including its compensation) has fully settled. */
  awaitProfileTail(sessionId: string): Promise<void>;
}

function serverRoom(roomId: string): BattleRoomTestAccess {
  const room = matchMaker.getLocalRoomById(roomId);

  if (!room) {
    throw new Error(`Expected a local server-side room for roomId=${roomId}.`);
  }

  return room as unknown as BattleRoomTestAccess;
}

function projectilesFor(room: BattleRoomTestAccess, ownerSessionId: string): ProjectileState[] {
  const matches: ProjectileState[] = [];
  room.state.projectiles.forEach((projectile) => {
    if (projectile.ownerSessionId === ownerSessionId) {
      matches.push(projectile);
    }
  });
  return matches;
}

interface RawRoomSender {
  send(type: string, message: unknown): void;
}

interface ObservedClient {
  readonly client: NetworkClient;
  getState(): ConnectionState;
  dispose(): Promise<void>;
}

function createObservedClient(serverUrl: string, roomName = 'battle'): ObservedClient {
  const client = new NetworkClient({ serverUrl, roomName, identityStorage: createInMemoryIdentityStorage() });
  let state: ConnectionState = { status: 'disconnected' };
  const unsubscribe = client.onConnectionStateChanged((nextState) => {
    state = nextState;
  });

  return {
    client,
    getState: () => state,
    async dispose(): Promise<void> {
      unsubscribe();
      await client.disconnect().catch(() => undefined);
    }
  };
}

function rawRoomFor(client: NetworkClient): RawRoomSender {
  const holder = client as unknown as { room?: RawRoomSender };

  if (!holder.room) {
    throw new Error('Expected a connected production battle room.');
  }

  return holder.room;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(condition: () => boolean, label: string, timeoutMs = WAIT_TIMEOUT_MS): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (condition()) {
      return;
    }

    await delay(20);
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}.`);
}

function neutralInput(aimAngle = 0): PlayerInputPayload {
  return { up: false, down: false, left: false, right: false, aimAngle, shooting: false };
}

function rightInput(aimAngle = 0): PlayerInputPayload {
  return { ...neutralInput(aimAngle), right: true };
}

function shootingInput(aimAngle = 0): PlayerInputPayload {
  return { ...neutralInput(aimAngle), shooting: true };
}

function movingAndShootingInput(aimAngle = 0): PlayerInputPayload {
  return { ...neutralInput(aimAngle), right: true, shooting: true };
}

describe.skipIf(!databaseAvailable)('healthy positive control (real PostgreSQL)', () => {
  let server: AuthorityTestServer | undefined;
  const clients: ObservedClient[] = [];

  afterEach(async () => {
    await Promise.allSettled(clients.splice(0).map((observed) => observed.dispose()));
    await server?.stop();
    server = undefined;
  }, HOOK_TIMEOUT_MS);

  it(
    'a safe-authority tick actually advances real movement, firing, and projectile state',
    async () => {
      server = await bootAuthorityTestServer();
      const mover = createObservedClient(server.url);
      clients.push(mover);
      await mover.client.connect();
      mover.client.setProfile({ nickname: 'Mover', mode: 'player', faction: 'red' });
      await waitFor(() => mover.client.profile?.faction === 'red', 'profile acceptance');

      const moverSessionId = mover.client.getSessionId();
      if (!moverSessionId) {
        throw new Error('Expected a session id.');
      }

      const roomId = await discoverCanonicalBattleRoom(server.url);
      const room = serverRoom(roomId);
      const startX = room.state.ships.get(moverSessionId)?.x ?? 0;

      expect(server.persistence.writer.isControlSafe()).toBe(true);
      expect(server.lifecycle.state).toBe('ready');

      mover.client.sendPlayerInput(rightInput());
      await waitFor(
        () => (room.state.ships.get(moverSessionId)?.x ?? 0) > startX + 10,
        'real movement under safe authority'
      );

      mover.client.sendPlayerInput(shootingInput());
      await waitFor(
        () => projectilesFor(room, moverSessionId).length > 0,
        'a real server-created projectile under safe authority'
      );
    },
    TEST_TIMEOUT_MS
  );
});

describe.skipIf(!databaseAvailable)('authority loss before the next tick freezes primed live state (real PostgreSQL)', () => {
  let server: AuthorityTestServer | undefined;
  const clients: ObservedClient[] = [];

  afterEach(async () => {
    await Promise.allSettled(clients.splice(0).map((observed) => observed.dispose()));
    await server?.stop();
    server = undefined;
  }, HOOK_TIMEOUT_MS);

  it(
    'freezes a moving/firing ship, its in-flight projectile aimed at a live target, and a respawn-due dead ship the instant authority becomes unsafe',
    async () => {
      server = await bootAuthorityTestServer();
      const mover = createObservedClient(server.url);
      const target = createObservedClient(server.url);
      const victim = createObservedClient(server.url);
      clients.push(mover, target, victim);
      await Promise.all([mover.client.connect(), target.client.connect(), victim.client.connect()]);

      mover.client.setProfile({ nickname: 'Mover', mode: 'player', faction: 'red' });
      target.client.setProfile({ nickname: 'Target', mode: 'player', faction: 'blue' });
      victim.client.setProfile({ nickname: 'Victim', mode: 'player', faction: 'blue' });
      await waitFor(
        () =>
          mover.client.profile?.faction === 'red' &&
          target.client.profile?.faction === 'blue' &&
          victim.client.profile?.faction === 'blue',
        'all three profiles to be accepted'
      );

      const moverSessionId = mover.client.getSessionId();
      const targetSessionId = target.client.getSessionId();
      const victimSessionId = victim.client.getSessionId();

      if (!moverSessionId || !targetSessionId || !victimSessionId) {
        throw new Error('Expected every client to have a session id.');
      }

      const roomId = await discoverCanonicalBattleRoom(server.url);
      const room = serverRoom(roomId);
      const sender = rawRoomFor(mover.client);

      // Kill `victim` with a single real shot (health set to 1 -- position
      // and health only, never `alive`/`respawnAt` directly: TestBattleRoom
      // does not expose those) so its respawn becomes genuinely due after a
      // real NETWORK_RESPAWN_DELAY_MS wait.
      sender.send(TestRoomMessages.SET_SHIP_STATE, { targetSessionId: moverSessionId, x: 4000, y: 4000, rotation: 0 });
      sender.send(TestRoomMessages.SET_SHIP_STATE, { targetSessionId: victimSessionId, x: 4100, y: 4000, health: 1 });
      await waitFor(
        () => room.state.ships.get(moverSessionId)?.x === 4000 && room.state.ships.get(victimSessionId)?.health === 1,
        'victim positioned at reduced health'
      );

      mover.client.sendPlayerInput(shootingInput());
      await waitFor(() => room.state.ships.get(victimSessionId)?.alive === false, 'victim to die from real combat');
      mover.client.sendPlayerInput(neutralInput());

      const victimShip = room.state.ships.get(victimSessionId);
      if (!victimShip) {
        throw new Error('Expected the dead victim ship to still exist.');
      }

      // Captured now, but deliberately NOT waited out yet: the real,
      // still-safe background tick would otherwise legitimately respawn
      // victim on its own the moment this deadline passes (correct normal
      // behavior). The deadline is instead crossed AFTER authority becomes
      // unsafe, below, so the primed "respawn is due" element is proven to
      // stay frozen precisely because the fenced tick never runs.
      const victimRespawnAt = victimShip.respawnAt;
      expect(room.state.ships.get(victimSessionId)?.alive).toBe(false);

      // The kill shot above set mover's own weapon cooldown
      // (NETWORK_WEAPON_FIRE_INTERVAL_MS); wait it out in real time so the
      // second shot below is not silently rate-limited away.
      await delay(NETWORK_WEAPON_FIRE_INTERVAL_MS + 100);

      // Reposition mover/target for the moving+firing+in-flight-projectile
      // element, well away from the still-dead, respawn-due victim. The gap
      // (900 units, under NETWORK_PROJECTILE_MAX_RANGE) is deliberately
      // wide: at NETWORK_PROJECTILE_SPEED the shot needs several ticks to
      // cross it, so it is genuinely observable "in flight" instead of
      // resolving to a hit within the very next tick.
      sender.send(TestRoomMessages.SET_SHIP_STATE, { targetSessionId: moverSessionId, x: 6000, y: 6000, rotation: 0 });
      sender.send(TestRoomMessages.SET_SHIP_STATE, {
        targetSessionId: targetSessionId,
        x: 6900,
        y: 6000,
        health: NETWORK_SHIP_MAX_HEALTH
      });
      await waitFor(
        () => room.state.ships.get(moverSessionId)?.x === 6000 && room.state.ships.get(targetSessionId)?.x === 6900,
        'mover/target repositioned for the projectile element'
      );

      const hitEvents: unknown[] = [];
      const destroyedEvents: unknown[] = [];
      mover.client.onHitEvent((message) => hitEvents.push(message));
      mover.client.onShipDestroyed((message) => destroyedEvents.push(message));

      // One combined input: real recent movement AND firing intent from the
      // same tick.
      mover.client.sendPlayerInput(movingAndShootingInput());
      await waitFor(
        () =>
          projectilesFor(room, moverSessionId).length > 0 &&
          (room.state.ships.get(moverSessionId)?.velocityX ?? 0) > 0,
        'mover moving with a live in-flight projectile aimed at target'
      );

      const moverBefore = { ...room.state.ships.get(moverSessionId)! };
      const targetBefore = { ...room.state.ships.get(targetSessionId)! };
      const victimBefore = { ...room.state.ships.get(victimSessionId)! };
      const projectileBefore = projectilesFor(room, moverSessionId).map((projectile) => ({ ...projectile }));
      expect(projectileBefore.length).toBeGreaterThan(0);

      // Flip process authority unsafe via the local monotonic deadline path
      // (scenario 4, below, separately covers the schema-authority-loss /
      // lifecycle.markFailed() path).
      server.writerClock.value += 999_999;

      // Only NOW cross victim's respawn deadline (real wall-clock wait),
      // with authority already unsafe: if the fence were missing, the
      // room's own still-running background tick would respawn victim the
      // moment this elapses.
      await delay(Math.max(0, victimRespawnAt - Date.now()) + 100);
      expect(Date.now()).toBeGreaterThanOrEqual(victimRespawnAt);

      // Drive the real simulation callback directly, several times: a
      // stronger proof than only waiting on the room's own timer, since it
      // guarantees the fenced tick actually ran while every element above
      // was primed.
      room.updateSimulation(NETWORK_TICK_INTERVAL_MS);
      room.updateSimulation(NETWORK_TICK_INTERVAL_MS);
      room.updateSimulation(NETWORK_TICK_INTERVAL_MS);
      await delay(200);

      const moverAfter = room.state.ships.get(moverSessionId)!;
      const targetAfter = room.state.ships.get(targetSessionId)!;
      const victimAfter = room.state.ships.get(victimSessionId)!;
      const projectileAfter = projectilesFor(room, moverSessionId);

      expect(moverAfter.x).toBeCloseTo(moverBefore.x, 4);
      expect(moverAfter.y).toBeCloseTo(moverBefore.y, 4);
      expect(moverAfter.velocityX).toBeCloseTo(moverBefore.velocityX, 4);
      expect(targetAfter.health).toBe(targetBefore.health);
      expect(targetAfter.alive).toBe(targetBefore.alive);
      // Respawn was due (deadline crossed above) yet victim was never
      // revived: proof the fenced tick truly did not run tryRespawnShip.
      expect(victimAfter.alive).toBe(false);
      expect(victimAfter.respawnAt).toBe(victimBefore.respawnAt);
      expect(projectileAfter.length).toBe(projectileBefore.length);

      if (projectileAfter[0] && projectileBefore[0]) {
        expect(projectileAfter[0].x).toBeCloseTo(projectileBefore[0].x, 4);
        expect(projectileAfter[0].y).toBeCloseTo(projectileBefore[0].y, 4);
      }

      expect(hitEvents).toHaveLength(0);
      expect(destroyedEvents).toHaveLength(0);
    },
    TEST_TIMEOUT_MS_LONG
  );
});

describe.skipIf(!databaseAvailable)(
  'the local monotonic deadline freezes simulation before any heartbeat callback runs (real PostgreSQL)',
  () => {
    let server: AuthorityTestServer | undefined;
    const clients: ObservedClient[] = [];

    afterEach(async () => {
      await Promise.allSettled(clients.splice(0).map((observed) => observed.dispose()));
      await server?.stop();
      server = undefined;
    }, HOOK_TIMEOUT_MS);

    it(
      'a tick at/after the (unmodified) local safety deadline is rejected purely via writer.isControlSafe(), even though the heartbeat timer has not run its own failure callback and RuntimeLifecycle is still ready',
      async () => {
        server = await bootAuthorityTestServer();
        const mover = createObservedClient(server.url);
        clients.push(mover);
        await mover.client.connect();
        mover.client.setProfile({ nickname: 'Mover', mode: 'player', faction: 'red' });
        await waitFor(() => mover.client.profile?.faction === 'red', 'profile acceptance');

        const moverSessionId = mover.client.getSessionId();
        if (!moverSessionId) {
          throw new Error('Expected a session id.');
        }

        const roomId = await discoverCanonicalBattleRoom(server.url);
        const room = serverRoom(roomId);
        const startX = room.state.ships.get(moverSessionId)?.x ?? 0;

        mover.client.sendPlayerInput(rightInput());
        await waitFor(() => (room.state.ships.get(moverSessionId)?.x ?? 0) > startX + 5, 'real movement while safe');

        expect(server.lifecycle.state).toBe('ready');

        server.writerClock.value += 999_999;
        expect(server.persistence.writer.isControlSafe()).toBe(false);
        // No lifecycle transition happened -- this is purely the writer's
        // own local-deadline clock check, never a heartbeat failure
        // callback (which this harness's effectively-infinite
        // heartbeatIntervalMillis structurally cannot have run yet).
        expect(server.lifecycle.state).toBe('ready');

        const frozen = { ...room.state.ships.get(moverSessionId)! };
        mover.client.sendPlayerInput(rightInput());
        await delay(NETWORK_TICK_INTERVAL_MS * 6);

        const after = room.state.ships.get(moverSessionId)!;
        expect(after.x).toBeCloseTo(frozen.x, 4);
        expect(after.velocityX).toBeCloseTo(frozen.velocityX, 4);
        expect(server.lifecycle.state).toBe('ready');
      },
      TEST_TIMEOUT_MS
    );
  }
);

describe.skipIf(!databaseAvailable)(
  'the asynchronous teardown window is fenced even while the writer alone still reports safe (real PostgreSQL)',
  () => {
    let server: AuthorityTestServer | undefined;
    const clients: ObservedClient[] = [];

    afterEach(async () => {
      await Promise.allSettled(clients.splice(0).map((observed) => observed.dispose()));
      // ARCH-FIX3: the shared, guaranteed harness cleanup (see
      // bootAuthorityTestServer's stop()) is solely responsible for
      // driving and observing the real authority-loss teardown this
      // scenario's ending state (lifecycle 'failed', writer still
      // 'owning') requires -- not inline code in the test body below,
      // which an earlier thrown assertion would have skipped entirely
      // (REVIEW-C01-A's confirmed defect).
      await server?.stop();
      server = undefined;
    }, HOOK_TIMEOUT_MS);

    it(
      'a room must not resume gameplay merely because writer.isControlSafe() remains true after RuntimeLifecycle has already been marked failed',
      async () => {
        server = await bootAuthorityTestServer();
        const mover = createObservedClient(server.url);
        clients.push(mover);
        await mover.client.connect();
        mover.client.setProfile({ nickname: 'Mover', mode: 'player', faction: 'red' });
        await waitFor(() => mover.client.profile?.faction === 'red', 'profile acceptance');

        const moverSessionId = mover.client.getSessionId();
        if (!moverSessionId) {
          throw new Error('Expected a session id.');
        }

        const roomId = await discoverCanonicalBattleRoom(server.url);
        const room = serverRoom(roomId);
        const startX = room.state.ships.get(moverSessionId)?.x ?? 0;

        mover.client.sendPlayerInput(rightInput());
        await waitFor(() => (room.state.ships.get(moverSessionId)?.x ?? 0) > startX + 5, 'real movement while safe');

        // Precisely documented composition seam: this is the exact call
        // index.ts's handleAuthorityLost() makes synchronously, before its
        // async bounded teardown begins. It reproduces the observable
        // effect of the separate schema-maintenance-connection
        // authority-loss path (which never touches the writer object) on
        // RuntimeLifecycle, without needing to actually break a real DB
        // connection -- that detection code is a distinct, already-covered
        // mechanism, not re-proven here. This proves the ROOM's reaction to
        // an already-declared process authority loss during the teardown
        // window that follows it -- deliberately WITHOUT also triggering
        // handleAuthorityLost's real teardown yet, since a real trigger
        // tears the room down almost immediately regardless of this fence,
        // which would prove nothing about the fence specifically. The
        // shared afterEach cleanup above drives the real authority-loss
        // path and proves its full resource teardown, strictly AFTER this
        // test function returns -- never before the freeze assertions
        // below, which must prove the fence itself, not disposal.
        server.lifecycle.markFailed();

        // The writer connection/heartbeat itself was never touched: this is
        // exactly the gap PERSIST002-C-01 identified. A room gating only on
        // writer.isControlSafe() would incorrectly keep treating this
        // process as safe.
        expect(server.persistence.writer.isControlSafe()).toBe(true);

        const frozen = { ...room.state.ships.get(moverSessionId)! };
        mover.client.sendPlayerInput(rightInput());
        await delay(NETWORK_TICK_INTERVAL_MS * 6);

        const after = room.state.ships.get(moverSessionId)!;
        expect(after.x).toBeCloseTo(frozen.x, 4);
        expect(after.velocityX).toBeCloseTo(frozen.velocityX, 4);
      },
      TEST_TIMEOUT_MS_LONG
    );
  }
);

describe.skipIf(!databaseAvailable)(
  'guaranteed cleanup after an early test failure (real PostgreSQL, REVIEW-C01-A regression)',
  () => {
    it(
      'the shared stop() path fully tears down and drops its database even when a synthetic assertion throws before any explicit teardown-triggering code runs, and preserves the original failure',
      async () => {
        // Independent baseline, captured the same way the harness captures
        // its own -- this test does not trust stop()'s internal checks to
        // self-report success; it re-verifies resource state itself.
        const dependenciesBaselineBeforeBoot = productionRoomDependenciesModule.getActiveProductionRoomDependencies();
        const networkBoundaryBaselineBeforeBoot = getActiveNetworkBoundaryConfig();

        const server = await bootAuthorityTestServer();
        const mover = createObservedClient(server.url);

        const SYNTHETIC_MARKER = 'ARCH-FIX3-SYNTHETIC-EARLY-FAILURE-7f3c1a9b';
        let caught: unknown;
        let roomId: string | undefined;

        try {
          await mover.client.connect();
          mover.client.setProfile({ nickname: 'Mover', mode: 'player', faction: 'red' });
          await waitFor(() => mover.client.profile?.faction === 'red', 'profile acceptance');

          const moverSessionId = mover.client.getSessionId();
          if (!moverSessionId) {
            throw new Error('Expected a session id.');
          }

          // Sufficient authenticated activity that the identity pool and
          // the room/ship genuinely exist before the synthetic failure --
          // this must not be a test that "fails" trivially against an
          // empty server.
          roomId = await discoverCanonicalBattleRoom(server.url);
          const room = serverRoom(roomId);
          await waitFor(
            () => room.state.ships.get(moverSessionId) !== undefined,
            'a real ship to exist before the synthetic failure'
          );

          // The exact precondition REVIEW-C01-A's confirmed defect
          // required: RuntimeLifecycle failed directly (bypassing
          // handleAuthorityLost()'s own teardown trigger), writer still
          // 'owning'.
          server.lifecycle.markFailed();

          // Thrown BEFORE any explicit performHeartbeat()-style
          // teardown-triggering code in this test body -- there is none
          // here at all; only the shared stop() path in the finally below
          // may ever drive it.
          throw new Error(SYNTHETIC_MARKER);
        } catch (error) {
          caught = error;
        } finally {
          // The exact same guaranteed path every other scenario's
          // afterEach/finally uses -- not a bespoke cleanup helper an
          // ordinarily failing test would never reach.
          await server.stop();
          // Repeated/concurrent callers must stay safe once cleanup has
          // already fully succeeded once.
          await Promise.all([server.stop(), server.stop()]);
          await mover.dispose().catch(() => undefined);
        }

        // The original failure must survive cleanup, whatever cleanup did.
        expect(caught).toBeInstanceOf(Error);
        expect((caught as Error).message).toBe(SYNTHETIC_MARKER);

        // Independent resource verification -- not merely that stop()
        // returned without throwing.
        if (roomId) {
          expect(matchMaker.getLocalRoomById(roomId)).toBeUndefined();
        }
        expect(
          productionRoomDependenciesModule.getActiveProductionRoomDependencies()
        ).toBe(dependenciesBaselineBeforeBoot);
        expect(getActiveNetworkBoundaryConfig()).toBe(networkBoundaryBaselineBeforeBoot);

        await withDirectConnection(ADMIN_DATABASE_URL, async (observer) => {
          const connections = await observer.query<{ count: string }>(
            'SELECT count(*)::text AS count FROM pg_stat_activity WHERE datname = $1',
            [server.databaseName]
          );
          expect(connections.rows[0]?.count).toBe('0');

          const stillExists = await observer.query<{ datname: string }>(
            'SELECT datname FROM pg_database WHERE datname = $1',
            [server.databaseName]
          );
          expect(stillExists.rows).toHaveLength(0);
        });
      },
      HOOK_TIMEOUT_MS
    );
  }
);

describe.skipIf(!databaseAvailable)('fail-closed on a missing authority capability (real PostgreSQL)', () => {
  it(
    'a live, primed ship/projectile cannot advance on the one tick where the dependency lookup itself returns undefined, without emptying or disposing the room',
    async () => {
      const server = await bootAuthorityTestServer();
      const mover = createObservedClient(server.url);

      try {
        await mover.client.connect();
        mover.client.setProfile({ nickname: 'Mover', mode: 'player', faction: 'red' });
        await waitFor(() => mover.client.profile?.faction === 'red', 'profile acceptance');

        const moverSessionId = mover.client.getSessionId();
        if (!moverSessionId) {
          throw new Error('Expected a session id.');
        }

        const roomId = await discoverCanonicalBattleRoom(server.url);
        const room = serverRoom(roomId);
        const startX = room.state.ships.get(moverSessionId)?.x ?? 0;

        // Healthy positive control: with the real capability present, a
        // moving+firing input genuinely advances position and creates a
        // real projectile. This proves the fixture is not accidentally
        // priming an inactive/stationary ship where "no advance" would be
        // true regardless of any fence.
        mover.client.sendPlayerInput(movingAndShootingInput());
        await waitFor(() => (room.state.ships.get(moverSessionId)?.x ?? 0) > startX + 5, 'positive control: real movement while the capability is present');
        await waitFor(
          () => projectilesFor(room, moverSessionId).length > 0,
          'positive control: a real projectile while the capability is present'
        );
        const positiveControlShip = room.state.ships.get(moverSessionId);
        expect(positiveControlShip?.velocityX ?? 0).toBeGreaterThan(0);

        // Weapon cooldown from the positive-control shot above; wait it out
        // in real time so the fresh input primed below is not silently
        // rate-limited away on the tick under test.
        await delay(NETWORK_WEAPON_FIRE_INTERVAL_MS + 100);

        // Fresh recent input, still with the room/ship fully intact and
        // alive -- the capability is made unavailable ONLY for the single
        // updateSimulation() call below, not by destroying or emptying
        // anything.
        mover.client.sendPlayerInput(movingAndShootingInput());
        await delay(20);
        const primedShip = { ...room.state.ships.get(moverSessionId)! };
        expect(primedShip.alive).toBe(true);
        expect(primedShip.velocityX).toBeGreaterThan(0);

        // Captured immediately adjacent to the spied call (no further
        // await in between until it is restored below): the room's own
        // real background simulation timer keeps running throughout this
        // whole test on its own schedule, so a snapshot taken any earlier
        // could race a later, entirely legitimate, real-authority tick
        // that fires its own new projectile for unrelated reasons.
        const beforeProjectileIds = new Set(projectilesFor(room, moverSessionId).map((projectile) => projectile.id));

        let lookupReached = false;
        const dependenciesSpy = vi
          .spyOn(productionRoomDependenciesModule, 'getActiveProductionRoomDependencies')
          .mockImplementation(() => {
            lookupReached = true;
            return undefined;
          });

        let threw = false;
        let afterShip: ReturnType<typeof room.state.ships.get>;
        let afterProjectileIds: Set<string>;
        try {
          room.updateSimulation(NETWORK_TICK_INTERVAL_MS);
          afterShip = room.state.ships.get(moverSessionId);
          afterProjectileIds = new Set(projectilesFor(room, moverSessionId).map((projectile) => projectile.id));
        } catch {
          threw = true;
          afterShip = undefined;
          afterProjectileIds = new Set();
        } finally {
          // Restored synchronously, before any further async work (in
          // particular before the cleanup below), so the room's own
          // real background simulation timer is never left observing a
          // permanently-missing capability for longer than this one
          // deliberate tick.
          dependenciesSpy.mockRestore();
        }

        // Ordered so the primary behavioral claim (the primed simulation
        // did not advance) is the first thing checked -- see the negative
        // control in the ARCH-FIX2 evidence: against the pre-fix
        // BattleRoom.ts this is exactly where the corrected scenario fails
        // (the ship genuinely keeps moving), rather than failing on the
        // spy-mechanism assertion below.
        expect(threw).toBe(false);
        expect(afterShip).toBeDefined();
        expect(afterShip?.alive).toBe(true);
        expect(afterShip?.x).toBeCloseTo(primedShip.x, 4);
        expect(afterShip?.velocityX).toBeCloseTo(primedShip.velocityX, 4);

        for (const id of afterProjectileIds) {
          expect(beforeProjectileIds.has(id)).toBe(true);
        }

        // Confirms the missing-authority path was actually exercised (not
        // merely that nothing happened to throw).
        expect(lookupReached).toBe(true);
      } finally {
        await mover.dispose().catch(() => undefined);
        await server.stop().catch(() => undefined);
      }
    },
    TEST_TIMEOUT_MS
  );
});

describe.skipIf(!databaseAvailable)(
  'a terminally fenced room cannot be resumed by a later apparently-safe value (real PostgreSQL)',
  () => {
    let server: AuthorityTestServer | undefined;
    const clients: ObservedClient[] = [];

    afterEach(async () => {
      await Promise.allSettled(clients.splice(0).map((observed) => observed.dispose()));
      await server?.stop();
      server = undefined;
    }, HOOK_TIMEOUT_MS);

    it(
      'repeated callbacks after loss keep rejecting simulation, and winding the writer clock back to a safe value again cannot resurrect the room',
      async () => {
        server = await bootAuthorityTestServer();
        const mover = createObservedClient(server.url);
        clients.push(mover);
        await mover.client.connect();
        mover.client.setProfile({ nickname: 'Mover', mode: 'player', faction: 'red' });
        await waitFor(() => mover.client.profile?.faction === 'red', 'profile acceptance');

        const moverSessionId = mover.client.getSessionId();
        if (!moverSessionId) {
          throw new Error('Expected a session id.');
        }

        const roomId = await discoverCanonicalBattleRoom(server.url);
        const room = serverRoom(roomId);
        const startX = room.state.ships.get(moverSessionId)?.x ?? 0;

        mover.client.sendPlayerInput(rightInput());
        await waitFor(
          () => (room.state.ships.get(moverSessionId)?.x ?? 0) > startX + 5,
          'real movement while safe (latches hasObservedAuthoritySafe)'
        );

        server.writerClock.value += 999_999;
        room.updateSimulation(NETWORK_TICK_INTERVAL_MS);
        await delay(NETWORK_TICK_INTERVAL_MS * 3);

        const frozenOnce = { ...room.state.ships.get(moverSessionId)! };

        // Repeated callbacks after loss: several more ticks, still nothing.
        room.updateSimulation(NETWORK_TICK_INTERVAL_MS);
        room.updateSimulation(NETWORK_TICK_INTERVAL_MS);
        expect(room.state.ships.get(moverSessionId)!.x).toBeCloseTo(frozenOnce.x, 4);

        // Wind the underlying signal back to an apparently-safe value,
        // purely via the clock -- no real heartbeat renewal happened.
        server.writerClock.value = 0;
        expect(server.persistence.writer.isControlSafe()).toBe(true);
        expect(server.lifecycle.state).toBe('ready');

        mover.client.sendPlayerInput(rightInput());
        room.updateSimulation(NETWORK_TICK_INTERVAL_MS);
        await delay(NETWORK_TICK_INTERVAL_MS * 4);

        const after = room.state.ships.get(moverSessionId)!;
        expect(after.x).toBeCloseTo(frozenOnce.x, 4);
        expect(after.velocityX).toBeCloseTo(frozenOnce.velocityX, 4);
      },
      TEST_TIMEOUT_MS
    );
  }
);

describe.skipIf(!databaseAvailable)(
  'a delayed SET_PROFILE completion cannot spawn or acknowledge gameplay after authority loss (real PostgreSQL)',
  () => {
    let server: AuthorityTestServer | undefined;

    afterEach(async () => {
      await server?.stop();
      server = undefined;
    }, HOOK_TIMEOUT_MS);

    it(
      'process authority lost while a durable profile transaction is gated in flight: the durable commit stands, but no ship spawns, no PROFILE_ACCEPTED is sent, and the newly-acquired lease is released -- input arriving after loss is separately covered by the deadline/teardown/latch scenarios above',
      async () => {
        let releaseGate: (() => void) | undefined;
        const gate = new Promise<void>((resolve) => {
          releaseGate = resolve;
        });
        let gateEntered = false;

        server = await bootAuthorityTestServer({
          gameplayAuthorityTestHooks: {
            beforePlayerProfileTransaction: async () => {
              gateEntered = true;
              await gate;
            }
          }
        });

        const { credential, playerId } = await createTestGuestIdentity(server.url);
        const room = await joinCanonicalBattleRoom(server.url, credential);
        const accepted: unknown[] = [];
        const rejected: ProfileRejectedMessage[] = [];
        room.onMessage(ProfileServerMessages.PROFILE_ACCEPTED, (message) => accepted.push(message));
        room.onMessage<ProfileRejectedMessage>(ProfileServerMessages.PROFILE_REJECTED, (message) =>
          rejected.push(message)
        );

        room.send(ProfileClientMessages.SET_PROFILE, { nickname: 'RaceProfile', mode: 'player', faction: 'red' });
        await waitFor(() => gateEntered, 'the profile transaction to reach the in-flight gate');

        // Discovered BEFORE flipping authority unsafe: GET /world/battle-room
        // itself depends on writer.isControlSafe() and would otherwise
        // start reporting 503 the moment the clock advances below.
        const roomId = await discoverCanonicalBattleRoom(server.url);
        const serverSideRoom = serverRoom(roomId);

        // Process authority is lost while the durable transaction is still
        // gated (not yet committed).
        server.writerClock.value += 999_999;
        expect(server.persistence.writer.isControlSafe()).toBe(false);

        releaseGate?.();
        // Bounded wait on the room's own real per-session operation tail
        // (the same mechanism BattleRoom.onLeave() itself awaits) rather
        // than a fixed sleep: resolves exactly when this session's gated
        // handleSetProfile() call -- including whichever branch it took --
        // has fully settled.
        await serverSideRoom.awaitProfileTail(room.sessionId);

        // Never accepted, never rejected via a normal profile message: the
        // now-stale completion returns silently after compensating, exactly
        // like the pre-existing generation-mismatch branch it sits beside.
        expect(accepted).toHaveLength(0);
        expect(rejected).toHaveLength(0);

        let shipCount = 0;
        serverSideRoom.state.ships.forEach(() => {
          shipCount += 1;
        });
        expect(shipCount).toBe(0);

        // Durable commit stands: faction/membership is never rolled back
        // merely because authority was lost before this completion ran.
        const membership = await withDirectConnection(server.databaseUrl, async (client) => {
          const result = await client.query<{ faction: string | null }>(
            'SELECT faction FROM world_memberships WHERE world_id = $1 AND player_id = $2',
            [server?.worldId, playerId]
          );
          return result.rows[0]?.faction;
        });
        expect(membership).toBe('red');

        // Existing exact-lease compensation remains safe: whatever lease
        // this now-stale commit may have just acquired was released, not
        // left orphaned active.
        const lease = await withDirectConnection(server.databaseUrl, async (client) => {
          const result = await client.query<{ status: string }>(
            'SELECT status FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
            [server?.worldId, playerId]
          );
          return result.rows[0]?.status;
        });
        expect(lease === undefined || lease === 'released').toBe(true);

        await room.leave(false).catch(() => undefined);
      },
      TEST_TIMEOUT_MS
    );
  }
);

describe.skipIf(!databaseAvailable)(
  'ordinary per-player disconnect does not freeze the world while process authority remains safe (real PostgreSQL)',
  () => {
    let server: AuthorityTestServer | undefined;
    const clients: ObservedClient[] = [];

    afterEach(async () => {
      await Promise.allSettled(clients.splice(0).map((observed) => observed.dispose()));
      await server?.stop();
      server = undefined;
    }, HOOK_TIMEOUT_MS);

    it(
      "one disconnecting player does not stop another player's ship from continuing to move under safe authority",
      async () => {
        server = await bootAuthorityTestServer();
        const mover = createObservedClient(server.url);
        const leaver = createObservedClient(server.url);
        clients.push(mover, leaver);
        await Promise.all([mover.client.connect(), leaver.client.connect()]);

        mover.client.setProfile({ nickname: 'Mover', mode: 'player', faction: 'red' });
        leaver.client.setProfile({ nickname: 'Leaver', mode: 'player', faction: 'blue' });
        await waitFor(
          () => mover.client.profile?.faction === 'red' && leaver.client.profile?.faction === 'blue',
          'both profiles accepted'
        );

        const moverSessionId = mover.client.getSessionId();
        const leaverSessionId = leaver.client.getSessionId();

        if (!moverSessionId || !leaverSessionId) {
          throw new Error('Expected session ids.');
        }

        const roomId = await discoverCanonicalBattleRoom(server.url);
        const room = serverRoom(roomId);

        expect(server.persistence.writer.isControlSafe()).toBe(true);
        expect(server.lifecycle.state).toBe('ready');

        mover.client.sendPlayerInput(rightInput());
        const beforeDisconnectX = room.state.ships.get(moverSessionId)?.x ?? 0;
        await waitFor(
          () => (room.state.ships.get(moverSessionId)?.x ?? 0) > beforeDisconnectX + 5,
          'mover moving before the disconnect'
        );

        await leaver.client.disconnect();
        await waitFor(() => !room.state.participants.has(leaverSessionId), "leaver's participant cleanup");

        const afterDisconnectX = room.state.ships.get(moverSessionId)?.x ?? 0;
        await waitFor(
          () => (room.state.ships.get(moverSessionId)?.x ?? 0) > afterDisconnectX + 5,
          "mover's ship keeps moving after another player's disconnect, proving no global pause"
        );

        expect(server.persistence.writer.isControlSafe()).toBe(true);
        expect(server.lifecycle.state).toBe('ready');
      },
      TEST_TIMEOUT_MS
    );
  }
);
