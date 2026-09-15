import { performance } from 'node:perf_hooks';
import { Client, ClientState, ErrorCode, Protocol, Room, ServerError, type AuthContext } from 'colyseus';
import {
  ProfileClientMessages,
  ProfileServerMessages,
  type JoinMode,
  type JoinRequest,
  type ProfileAcceptedMessage,
  type ProfileRejectedMessage
} from '@burningspace/protocol';
import {
  ClientMessages,
  MAX_ROOM_CLIENTS,
  NETWORK_INPUT_TIMEOUT_MS,
  NETWORK_MAX_ACTIVE_PROJECTILES_PER_SHIP,
  NETWORK_PROJECTILE_DAMAGE,
  NETWORK_PROJECTILE_MAX_RANGE,
  NETWORK_PROJECTILE_MUZZLE_OFFSET,
  NETWORK_PROJECTILE_RADIUS,
  NETWORK_PROJECTILE_SPEED,
  NETWORK_SHIP_MAX_HEALTH,
  NETWORK_SHIP_RADIUS,
  NETWORK_TICK_INTERVAL_MS,
  NETWORK_WEAPON_FIRE_INTERVAL_MS,
  ServerMessages,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type Faction,
  type HitEventMessage,
  type PlayerInputMessage,
  type RoomInfoMessage,
  type ShipDestroyedMessage
} from '@burningspace/shared';
import { BattleState } from '../schema/BattleState.js';
import { ParticipantState } from '../schema/ParticipantState.js';
import { ProjectileState } from '../schema/ProjectileState.js';
import { ShipState } from '../schema/ShipState.js';
import {
  getActiveProductionRoomDependencies,
  type DurableRoomAuth
} from '../persistence/productionRoomDependencies.js';
import type { ProfileTransactionResult } from '../persistence/gameplayAuthority.js';
import {
  assertRequestOrigin,
  getActiveNetworkBoundaryConfig
} from '../security/networkBoundary.js';
import { TokenBucketRateLimiter } from '../security/tokenBucketRateLimiter.js';
import { applyDamage, canDamageShip, respawnShip, segmentCircleIntersectionT } from '../systems/combat.js';
import { getFactionSpawnPosition } from '../systems/spawn.js';
import { simulateShipMovement } from '../systems/shipMovement.js';
import { validateNickname } from '../validation/nickname.js';
import { createNeutralInput, validatePlayerInputMessage } from '../validation/playerInput.js';

type ProfileValidationResult =
  | { ok: true; profile: Required<Pick<JoinRequest, 'nickname' | 'mode'>> & { faction?: Faction } }
  | { ok: false; reason: string };

interface WeaponRuntimeState {
  lastShotAt: number;
}

const PROFILE_RATE_LIMIT_NOTICE_INTERVAL_MS = 1000;
const LEASE_HEARTBEAT_INTERVAL_MS = 5000;
const GENERIC_PROFILE_RETRY_REASON = 'Unable to complete profile update. Please retry.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateProfile(message: unknown): ProfileValidationResult {
  if (!isRecord(message)) {
    return { ok: false, reason: 'Profile payload must be an object.' };
  }

  const nicknameResult = validateNickname(message.nickname);

  if (!nicknameResult.ok) {
    return nicknameResult;
  }

  if (message.mode !== 'player' && message.mode !== 'spectator') {
    return { ok: false, reason: 'Mode must be player or spectator.' };
  }

  const mode = message.mode;
  const faction = message.faction;

  if (mode === 'player' && faction !== 'red' && faction !== 'blue') {
    return { ok: false, reason: 'Player faction must be red or blue.' };
  }

  if (mode === 'spectator' && faction !== undefined && faction !== 'red' && faction !== 'blue') {
    return { ok: false, reason: 'Spectator faction must be empty, red or blue.' };
  }

  const normalizedFaction = faction === 'red' || faction === 'blue' ? faction : undefined;

  return {
    ok: true,
    profile: {
      nickname: nicknameResult.nickname,
      mode,
      faction: mode === 'player' ? normalizedFaction : undefined
    }
  };
}

export class BattleRoom extends Room<BattleState, unknown, unknown, DurableRoomAuth> {
  static override async onAuth(
    _token: string,
    options: unknown,
    context: AuthContext
  ): Promise<DurableRoomAuth | false> {
    try {
      assertRequestOrigin(context);
    } catch {
      return false;
    }

    const dependencies = getActiveProductionRoomDependencies();

    if (!dependencies) {
      throw new ServerError(ErrorCode.AUTH_FAILED, 'persistence_unavailable');
    }

    const peerKey = dependencies.getAuthPeerKey(context);
    const limiterResult = dependencies.freshAuthLimiter.consume(peerKey);

    if (!limiterResult.allowed) {
      throw new ServerError(ErrorCode.AUTH_FAILED, 'auth_rate_limited');
    }

    if (!dependencies.isAuthoritySafe()) {
      throw new ServerError(ErrorCode.AUTH_FAILED, 'persistence_unavailable');
    }

    // Only `credential` has any authority. playerId/credentialId/worldId/
    // sessionId/shipId/faction from the client are never trusted here; a
    // forged playerId alongside a valid credential is silently ignored --
    // the DB lookup below resolves the actual credential owner.
    const rawCredential = isRecord(options) ? options.credential : undefined;
    const auth = await dependencies.authenticateCredential(rawCredential);

    if (!auth || auth.worldId !== dependencies.worldId) {
      throw new ServerError(ErrorCode.AUTH_FAILED, 'identity_rejected');
    }

    return auth;
  }

  maxClients = MAX_ROOM_CLIENTS;
  private readonly networkBoundaryConfig = getActiveNetworkBoundaryConfig();
  private readonly profileMessageLimiter = new TokenBucketRateLimiter({
    capacity: this.networkBoundaryConfig.profileRateLimit.burst,
    refillRatePerSecond: this.networkBoundaryConfig.profileRateLimit.refillRatePerSecond,
    now: this.networkBoundaryConfig.monotonicNow
  });
  private readonly playerInputLimiter = new TokenBucketRateLimiter({
    capacity: this.networkBoundaryConfig.inputRateLimit.burst,
    refillRatePerSecond: this.networkBoundaryConfig.inputRateLimit.refillRatePerSecond,
    now: this.networkBoundaryConfig.monotonicNow
  });
  private readonly lastProfileRateLimitNoticeAt = new Map<string, number>();
  private readonly inputs = new Map<string, PlayerInputMessage>();
  private readonly weapons = new Map<string, WeaponRuntimeState>();
  private readonly lastInputReceivedAt = new Map<string, number>();
  private readonly finalizedSessions = new Set<string>();
  private readonly profileOperationTails = new Map<string, Promise<void>>();
  private leaseHeartbeatInFlight = false;
  private nextProjectileId = 1;

  onCreate(): void {
    // Exactly one canonical world room per process (BS-ARCH-011): it must
    // survive zero connected clients rather than self-disposing.
    this.autoDispose = false;
    this.setState(new BattleState());
    this.onMessage<unknown>(ProfileClientMessages.SET_PROFILE, (client, message) => {
      this.queueProfileOperation(client.sessionId, () => this.handleSetProfile(client, message));
    });
    this.onMessage<unknown>(ClientMessages.PLAYER_INPUT, (client, message) => {
      this.handlePlayerInput(client, message);
    });

    this.setSimulationInterval((deltaTimeMs) => {
      this.updateSimulation(deltaTimeMs);
    }, NETWORK_TICK_INTERVAL_MS);

    // Room-owned clock: cleared automatically on room disposal, unlike a
    // raw setInterval. One bounded batch every 5s, never per-tick DB writes.
    this.clock.setInterval(() => {
      void this.runLeaseHeartbeat();
    }, LEASE_HEARTBEAT_INTERVAL_MS);

    console.log(`[BattleRoom] created roomId=${this.roomId}`);
  }

  onJoin(client: Client, _options?: unknown, auth?: DurableRoomAuth): void {
    const dependencies = getActiveProductionRoomDependencies();

    if (!auth || !dependencies || auth.worldId !== dependencies.worldId) {
      // onAuth already guarantees a structurally valid auth result for any
      // real client; this is defense in depth only.
      client.leave(Protocol.WS_CLOSE_CONSENTED);
      return;
    }

    dependencies.sessionBindings.bindFreshSession(client.sessionId, auth);

    const participant = new ParticipantState();
    participant.sessionId = client.sessionId;
    participant.nickname = `Guest-${client.sessionId.slice(0, 4)}`;
    participant.mode = 'spectator';
    participant.faction = '';
    participant.connectedAt = Date.now();
    participant.profileReady = false;

    this.state.participants.set(client.sessionId, participant);
    this.sendRoomInfo();

    console.log(`[BattleRoom] joined sessionId=${client.sessionId}`);
  }

  async onLeave(client: Client, consented?: boolean): Promise<void> {
    const sessionId = client.sessionId;
    const dependencies = getActiveProductionRoomDependencies();

    // Invalidate control/generation FIRST: any profile transaction already
    // in flight for this session, once it settles below, must observe a
    // stale generation and never re-open control or leave an orphan lease.
    this.neutralizeInput(sessionId);
    dependencies?.sessionBindings.setControlAllowed(sessionId, false);
    dependencies?.sessionBindings.beginConnectionGeneration(sessionId);

    // Wait for any in-flight SET_PROFILE transaction to fully settle
    // (commit + its own compensation) before deciding what to do with the
    // lease -- otherwise a profile transaction could commit a lease AFTER
    // this method already concluded "no lease".
    await this.awaitProfileTail(sessionId);

    const binding = dependencies?.sessionBindings.get(sessionId);
    const leaseId = binding?.leaseId;

    if (consented) {
      if (dependencies && binding && leaseId) {
        await dependencies.releaseSessionLease({ playerId: binding.playerId, leaseId }).catch(() => undefined);
      }
      this.finalizeSession(sessionId, true);
      return;
    }

    this.sendRoomInfo();

    if (!dependencies || !binding || !leaseId) {
      // No gameplay lease held (dependencies unavailable, or a
      // spectator-only session): Packet-5's credential-only transient
      // reconnection behavior is unchanged.
      try {
        const reconnectedClient = await this.allowReconnection(
          client,
          this.networkBoundaryConfig.reconnectGraceSeconds
        );
        const controlReopened = await this.revalidateReconnectedSession(sessionId, dependencies);

        if (controlReopened) {
          this.sendRoomInfo();
        } else {
          reconnectedClient.leave(Protocol.WS_CLOSE_CONSENTED);
        }
      } catch (error) {
        if (!this.isExpectedReconnectionRejection(error)) {
          throw error;
        }

        this.finalizeSession(sessionId, false);
      }
      return;
    }

    const graceSeconds = this.networkBoundaryConfig.reconnectGraceSeconds;
    const recoveringResult = await dependencies.markSessionRecovering({
      playerId: binding.playerId,
      credentialId: binding.credentialId,
      leaseId,
      graceSeconds
    });

    if (recoveringResult.outcome === 'not_found') {
      // The exact active lease is absent/lost (already reclaimed/expired
      // elsewhere): no gameplay control recovery can be offered.
      dependencies.sessionBindings.clearLease(sessionId);
    } else {
      dependencies.sessionBindings.setLease(sessionId, leaseId, 'recovering');
    }

    try {
      const reconnectedClient = await this.allowReconnection(client, graceSeconds);
      const controlReopened = await this.revalidateReconnectedSession(sessionId, dependencies);

      if (controlReopened) {
        this.sendRoomInfo();
      } else {
        reconnectedClient.leave(Protocol.WS_CLOSE_CONSENTED);
      }
    } catch (error) {
      if (!this.isExpectedReconnectionRejection(error)) {
        throw error;
      }

      // Unclean leave timeout: release the exact old leaseId. Filtering by
      // exact lease_id means this can never touch a later successor lease.
      await dependencies.releaseSessionLease({ playerId: binding.playerId, leaseId }).catch(() => undefined);
      this.finalizeSession(sessionId, false);
    }
  }

  /**
   * Packet-5 credential + writer revalidation, extended by Packet 6 with
   * exact lease-fenced resume: a session that held a gameplay lease may
   * only regain control by resuming that SAME recovering lease (exact
   * world/player/credential/server/writer-epoch/lease_id, unexpired
   * reconnect_deadline); a spectator-only session (never held a lease)
   * keeps Packet 5's credential-only gate unchanged. Protected throughout
   * against a stale async completion via SessionBindingRegistry's
   * connection generation.
   */
  private async revalidateReconnectedSession(
    sessionId: string,
    dependencies: ReturnType<typeof getActiveProductionRoomDependencies>
  ): Promise<boolean> {
    const binding = dependencies?.sessionBindings.get(sessionId);

    if (!dependencies || !binding || binding.worldId !== dependencies.worldId) {
      return false;
    }

    if (!dependencies.isAuthoritySafe()) {
      return false;
    }

    const generation = dependencies.sessionBindings.beginConnectionGeneration(sessionId);

    if (generation === undefined) {
      return false;
    }

    const leaseId = binding.leaseId;
    let stillActive: boolean;
    let resumedLease = false;

    if (leaseId) {
      if (binding.leaseStatus !== 'recovering') {
        // markSessionRecovering never found a matching active lease to
        // transition (already reclaimed/expired/lost elsewhere): no lease
        // to resume, and control must never be silently reopened.
        stillActive = false;
      } else {
        const participant = this.state.participants.get(sessionId);
        const resumeResult = await dependencies.resumeRecoveringSession({
          playerId: binding.playerId,
          credentialId: binding.credentialId,
          leaseId,
          graceSeconds: this.networkBoundaryConfig.reconnectGraceSeconds,
          requireFaction: participant?.mode === 'player'
        });
        stillActive = resumeResult.outcome === 'resumed';
        resumedLease = stillActive;
      }
    } else {
      stillActive = await dependencies.revalidateCredential(binding.playerId, binding.credentialId);
    }

    if (!dependencies.sessionBindings.isCurrentGeneration(sessionId, generation)) {
      // A newer connection attempt (or finalize) already superseded this
      // one; never reopen control based on a stale completion. If we just
      // resumed a lease under that stale generation, release it again.
      if (resumedLease && leaseId) {
        await dependencies.releaseSessionLease({ playerId: binding.playerId, leaseId }).catch(() => undefined);
      }
      return false;
    }

    if (!stillActive || !dependencies.isAuthoritySafe()) {
      if (leaseId) {
        await dependencies.releaseSessionLease({ playerId: binding.playerId, leaseId }).catch(() => undefined);
        dependencies.sessionBindings.clearLease(sessionId);
      }
      return false;
    }

    if (leaseId) {
      dependencies.sessionBindings.setLease(sessionId, leaseId, 'active');
    }
    dependencies.sessionBindings.setControlAllowed(sessionId, true);
    return true;
  }

  /**
   * One bounded batch every 5s (never per-tick DB writes). A prior batch
   * still running suppresses this tick entirely rather than overlapping --
   * one shared in-flight guard, not one timer/lock per player.
   */
  private async runLeaseHeartbeat(): Promise<void> {
    if (this.leaseHeartbeatInFlight) {
      return;
    }

    const dependencies = getActiveProductionRoomDependencies();

    if (!dependencies) {
      return;
    }

    const snapshot = dependencies.sessionBindings.snapshotActiveLeaseBindings();

    if (snapshot.length === 0) {
      return;
    }

    this.leaseHeartbeatInFlight = true;

    try {
      await Promise.all(
        snapshot.map(async ({ sessionId, playerId, leaseId }) => {
          const binding = dependencies.sessionBindings.get(sessionId);

          // The binding may have moved on (new lease, cleared, removed)
          // since the snapshot was taken; only ever renew the exact lease
          // this snapshot entry named.
          if (!binding || binding.leaseId !== leaseId || binding.leaseStatus !== 'active') {
            return;
          }

          let renewed: boolean;
          try {
            renewed = await dependencies.renewGameplayLease({
              playerId,
              credentialId: binding.credentialId,
              leaseId,
              graceSeconds: this.networkBoundaryConfig.reconnectGraceSeconds
            });
          } catch (error) {
            console.error(`[BattleRoom] lease heartbeat renewal failed sessionId=${sessionId}`, error);
            renewed = false;
          }

          if (renewed) {
            return;
          }

          // Fail closed for this session only: never continue memory-only
          // gameplay authority, and never silently re-acquire a new lease
          // from the heartbeat.
          const currentBinding = dependencies.sessionBindings.get(sessionId);
          if (currentBinding && currentBinding.leaseId === leaseId) {
            dependencies.sessionBindings.setControlAllowed(sessionId, false);
            dependencies.sessionBindings.clearLease(sessionId);
            this.neutralizeInput(sessionId);
          }
        })
      );
    } finally {
      this.leaseHeartbeatInFlight = false;
    }
  }

  private neutralizeInput(sessionId: string): void {
    const ship = this.state.ships.get(sessionId);
    const previousInput = this.inputs.get(sessionId);
    const sequence = previousInput?.sequence ?? ship?.lastProcessedInput ?? 0;
    const neutralInput = createNeutralInput(sequence);

    neutralInput.aimAngle = previousInput?.aimAngle ?? ship?.rotation ?? 0;
    this.inputs.set(sessionId, neutralInput);
    this.lastInputReceivedAt.delete(sessionId);
  }

  private isExpectedReconnectionRejection(error: unknown): boolean {
    return (
      error === false ||
      (error instanceof Error && (error.message === 'disconnecting' || error.message === 'disposing'))
    );
  }

  private isControlAllowed(sessionId: string): boolean {
    return getActiveProductionRoomDependencies()?.sessionBindings.isControlAllowed(sessionId) ?? false;
  }

  private finalizeSession(sessionId: string, consented: boolean): void {
    if (this.finalizedSessions.has(sessionId)) {
      return;
    }

    this.finalizedSessions.add(sessionId);
    getActiveProductionRoomDependencies()?.sessionBindings.remove(sessionId);
    this.state.participants.delete(sessionId);
    this.removeShip(sessionId);
    this.inputs.delete(sessionId);
    this.weapons.delete(sessionId);
    this.lastInputReceivedAt.delete(sessionId);
    this.profileMessageLimiter.delete(sessionId);
    this.playerInputLimiter.delete(sessionId);
    this.lastProfileRateLimitNoticeAt.delete(sessionId);
    this.sendRoomInfo();

    console.log(`[BattleRoom] left sessionId=${sessionId} consented=${consented}`);
  }

  /**
   * Runs `operation` only after every previously queued operation for this
   * exact transient session has settled -- a per-session Promise tail, not
   * a global/per-player lock. DB world-row locking already provides the
   * durable ordering guarantee across sessions; this only prevents two
   * SET_PROFILE messages from the SAME session racing each other.
   */
  private queueProfileOperation(sessionId: string, operation: () => Promise<void>): void {
    const previousTail = this.profileOperationTails.get(sessionId) ?? Promise.resolve();
    const tail = previousTail.then(operation, operation).catch((error: unknown) => {
      console.error(`[BattleRoom] profile operation failed sessionId=${sessionId}`, error);
    });
    this.profileOperationTails.set(sessionId, tail);
  }

  private async awaitProfileTail(sessionId: string): Promise<void> {
    await (this.profileOperationTails.get(sessionId) ?? Promise.resolve());
  }

  private sendGenericProfileRejection(client: Client, reason: string = GENERIC_PROFILE_RETRY_REASON): void {
    if (client.state !== ClientState.JOINED) {
      return;
    }
    client.send(ProfileServerMessages.PROFILE_REJECTED, { reason } satisfies ProfileRejectedMessage);
  }

  private async handleSetProfile(client: Client, message: unknown): Promise<void> {
    const sessionId = client.sessionId;

    if (!this.isControlAllowed(sessionId)) {
      return;
    }

    if (!this.profileMessageLimiter.consume(sessionId).allowed) {
      this.sendBoundedProfileRateLimitNotice(client);
      return;
    }

    const participant = this.state.participants.get(sessionId);

    if (!participant) {
      client.send(ProfileServerMessages.PROFILE_REJECTED, {
        reason: 'Participant was not found.'
      } satisfies ProfileRejectedMessage);
      return;
    }

    const validation = validateProfile(message);

    if (!validation.ok) {
      client.send(ProfileServerMessages.PROFILE_REJECTED, {
        reason: validation.reason
      } satisfies ProfileRejectedMessage);
      return;
    }

    const requestedFaction = validation.profile.faction ?? '';

    if (
      participant.profileReady &&
      (participant.mode !== validation.profile.mode || participant.faction !== requestedFaction)
    ) {
      client.send(ProfileServerMessages.PROFILE_REJECTED, {
        reason: 'Disconnect before changing mode or faction.'
      } satisfies ProfileRejectedMessage);
      return;
    }

    const dependencies = getActiveProductionRoomDependencies();
    const binding = dependencies?.sessionBindings.get(sessionId);

    if (!dependencies || !binding) {
      this.sendGenericProfileRejection(client);
      return;
    }

    // Captured BEFORE the durable transaction: onLeave increments this on
    // invalidation, so a completion that arrives after this session was
    // superseded is detected below and never mutates transient state.
    const generation = binding.connectionGeneration;
    const nickname = validation.profile.nickname;
    const profileContext = {
      playerId: binding.playerId,
      credentialId: binding.credentialId,
      transportSessionId: sessionId,
      roomId: this.roomId,
      nickname,
      reconnectGraceSeconds: this.networkBoundaryConfig.reconnectGraceSeconds
    };

    let result: ProfileTransactionResult;

    try {
      result =
        validation.profile.mode === 'player' && validation.profile.faction
          ? await dependencies.applyPlayerProfile({ ...profileContext, faction: validation.profile.faction })
          : await dependencies.applySpectatorProfile(profileContext);
    } catch (error) {
      // Unknown commit outcome: never assume rollback, never mutate
      // transient state. A retry safely queries canonical durable state.
      console.error(`[BattleRoom] profile transaction failed sessionId=${sessionId}`, error);
      this.sendGenericProfileRejection(client);
      return;
    }

    if (!dependencies.sessionBindings.isCurrentGeneration(sessionId, generation)) {
      // A newer event (onLeave/reconnect) already superseded this
      // completion. Compensate for any lease this stale commit acquired,
      // but never touch transient participant/ship state.
      if (result.kind === 'player_accepted') {
        await dependencies.releaseSessionLease({ playerId: binding.playerId, leaseId: result.leaseId }).catch(() => undefined);
      }
      return;
    }

    if (
      result.kind === 'writer_authority_lost' ||
      result.kind === 'credential_invalid' ||
      result.kind === 'faction_conflict' ||
      result.kind === 'identity_in_use'
    ) {
      const reason =
        result.kind === 'faction_conflict'
          ? 'Your durable faction is already assigned and cannot be changed.'
          : result.kind === 'identity_in_use'
            ? 'This identity is already controlling a ship elsewhere.'
            : GENERIC_PROFILE_RETRY_REASON;
      this.sendGenericProfileRejection(client, reason);
      return;
    }

    if (result.kind === 'player_accepted') {
      try {
        this.upsertShip(sessionId, nickname, result.faction);
      } catch (error) {
        // Spawn-failure compensation: the durable commit stands (faction/
        // membership/revision are never rolled back), but release ONLY
        // this exact new/current lease and report a bounded rejection.
        console.error(`[BattleRoom] transient ship spawn failed sessionId=${sessionId}`, error);
        dependencies.sessionBindings.clearLease(sessionId);
        await dependencies.releaseSessionLease({ playerId: binding.playerId, leaseId: result.leaseId }).catch(() => undefined);
        this.sendGenericProfileRejection(client);
        return;
      }

      dependencies.sessionBindings.setLease(sessionId, result.leaseId, 'active');
      participant.nickname = nickname;
      participant.mode = 'player';
      participant.faction = result.faction;
      participant.profileReady = true;
    } else {
      participant.nickname = nickname;
      participant.mode = 'spectator';
      participant.faction = '';
      participant.profileReady = true;
      this.removeShip(sessionId);
      this.inputs.delete(sessionId);
    }

    client.send(ProfileServerMessages.PROFILE_ACCEPTED, {
      sessionId: participant.sessionId,
      nickname: participant.nickname,
      mode: participant.mode as JoinMode,
      faction: participant.faction === '' ? undefined : (participant.faction as Faction),
      connectedAt: participant.connectedAt
    } satisfies ProfileAcceptedMessage);

    this.sendRoomInfo();

    console.log(
      `[BattleRoom] profile sessionId=${sessionId} nickname=${participant.nickname} mode=${participant.mode}`
    );
  }

  private sendBoundedProfileRateLimitNotice(client: Client): void {
    const now = this.networkBoundaryConfig.monotonicNow();
    const lastNoticeAt = this.lastProfileRateLimitNoticeAt.get(client.sessionId);

    if (
      lastNoticeAt !== undefined &&
      now - lastNoticeAt < PROFILE_RATE_LIMIT_NOTICE_INTERVAL_MS
    ) {
      return;
    }

    this.lastProfileRateLimitNoticeAt.set(client.sessionId, now);
    client.send(ProfileServerMessages.PROFILE_REJECTED, {
      reason: 'Profile update rate limit exceeded.'
    } satisfies ProfileRejectedMessage);
  }

  private sendRoomInfo(): void {
    this.broadcast(ServerMessages.ROOM_INFO, {
      roomId: this.roomId,
      connectedClients: this.clients.length,
      maxClients: this.maxClients,
      serverTime: Date.now()
    } satisfies RoomInfoMessage);
  }

  /**
   * protected (not private) solely so a test-only subclass can override it
   * to simulate a spawn failure after the durable profile transaction has
   * already committed (see TestBattleRoom.ts / spawnFailure tests).
   * Production semantics are unchanged.
   */
  protected upsertShip(sessionId: string, nickname: string, faction: Faction): void {
    const existingShip = this.state.ships.get(sessionId);

    if (existingShip && existingShip.faction === faction) {
      existingShip.nickname = nickname;
      return;
    }

    if (existingShip && existingShip.faction !== faction) {
      console.log(`[BattleRoom] ship faction changed sessionId=${sessionId} faction=${faction}`);
    }

    const spawn = getFactionSpawnPosition(faction, sessionId);
    const ship = existingShip ?? new ShipState();
    ship.id = sessionId;
    ship.ownerSessionId = sessionId;
    ship.nickname = nickname;
    ship.faction = faction;
    ship.x = spawn.x;
    ship.y = spawn.y;
    ship.rotation = spawn.rotation;
    ship.velocityX = 0;
    ship.velocityY = 0;
    ship.lastProcessedInput = 0;
    ship.active = true;
    ship.maxHealth = NETWORK_SHIP_MAX_HEALTH;
    ship.health = NETWORK_SHIP_MAX_HEALTH;
    ship.alive = true;
    ship.respawnAt = 0;
    ship.invulnerableUntil = 0;
    ship.lastDamageAt = 0;

    this.state.ships.set(sessionId, ship);
    this.inputs.set(sessionId, createNeutralInput());
    this.weapons.set(sessionId, { lastShotAt: -Infinity });

    if (!existingShip) {
      console.log(`[BattleRoom] ship created sessionId=${sessionId} faction=${faction}`);
    }
  }

  private removeShip(sessionId: string): void {
    if (!this.state.ships.has(sessionId)) {
      return;
    }

    this.state.ships.delete(sessionId);
    this.inputs.delete(sessionId);
    this.weapons.delete(sessionId);
    this.lastInputReceivedAt.delete(sessionId);
    console.log(`[BattleRoom] ship removed sessionId=${sessionId}`);
  }

  private handlePlayerInput(client: Client, message: unknown): void {
    if (!this.isControlAllowed(client.sessionId)) {
      return;
    }

    if (!this.playerInputLimiter.consume(client.sessionId).allowed) {
      return;
    }

    const ship = this.state.ships.get(client.sessionId);

    if (!ship) {
      return;
    }

    const participant = this.state.participants.get(client.sessionId);

    if (!participant || participant.mode !== 'player') {
      return;
    }

    const now = performance.now();
    const lastReceivedAt = this.lastInputReceivedAt.get(client.sessionId) ?? -Infinity;

    if (now - lastReceivedAt < 10) {
      return;
    }

    const previousSequence = this.inputs.get(client.sessionId)?.sequence ?? ship.lastProcessedInput;
    const validation = validatePlayerInputMessage(message, previousSequence);

    if (!validation.ok) {
      return;
    }

    this.lastInputReceivedAt.set(client.sessionId, now);
    this.inputs.set(client.sessionId, validation.input);
  }

  private updateSimulation(deltaTimeMs: number): void {
    const runtimeNow = performance.now();
    const wallNow = Date.now();
    const deltaSeconds = Math.min(deltaTimeMs / 1000, 0.1);

    this.state.ships.forEach((ship, sessionId) => {
      if (!ship.alive) {
        this.tryRespawnShip(ship, sessionId, wallNow);
        return;
      }

      if (!ship.active) {
        return;
      }

      const input = this.getRuntimeInput(sessionId, ship, runtimeNow);
      simulateShipMovement(ship, input, deltaSeconds);
      this.tryFireProjectile(ship, input, runtimeNow, wallNow);
    });

    this.updateProjectiles(deltaSeconds, wallNow, runtimeNow);
  }

  private getRuntimeInput(sessionId: string, ship: ShipState, now: number): PlayerInputMessage {
    const input = this.inputs.get(sessionId) ?? createNeutralInput(ship.lastProcessedInput);
    const lastReceivedAt = this.lastInputReceivedAt.get(sessionId) ?? -Infinity;

    if (now - lastReceivedAt <= NETWORK_INPUT_TIMEOUT_MS) {
      return input;
    }

    return {
      ...createNeutralInput(input.sequence),
      aimAngle: input.aimAngle
    };
  }

  private tryFireProjectile(
    ship: ShipState,
    input: PlayerInputMessage,
    runtimeNow: number,
    wallNow: number
  ): void {
    if (!input.shooting || !ship.alive || !ship.active) {
      return;
    }

    const weapon = this.weapons.get(ship.ownerSessionId) ?? { lastShotAt: -Infinity };

    if (runtimeNow - weapon.lastShotAt < NETWORK_WEAPON_FIRE_INTERVAL_MS) {
      this.weapons.set(ship.ownerSessionId, weapon);
      return;
    }

    if (this.countActiveProjectilesForOwner(ship.ownerSessionId) >= NETWORK_MAX_ACTIVE_PROJECTILES_PER_SHIP) {
      this.weapons.set(ship.ownerSessionId, weapon);
      return;
    }

    const projectileId = `projectile-${this.nextProjectileId}`;
    this.nextProjectileId += 1;
    const muzzleX = ship.x + Math.cos(ship.rotation) * NETWORK_PROJECTILE_MUZZLE_OFFSET;
    const muzzleY = ship.y + Math.sin(ship.rotation) * NETWORK_PROJECTILE_MUZZLE_OFFSET;
    const projectile = new ProjectileState();
    projectile.id = projectileId;
    projectile.ownerSessionId = ship.ownerSessionId;
    projectile.faction = ship.faction;
    projectile.x = muzzleX;
    projectile.y = muzzleY;
    projectile.previousX = muzzleX;
    projectile.previousY = muzzleY;
    projectile.velocityX = Math.cos(ship.rotation) * NETWORK_PROJECTILE_SPEED;
    projectile.velocityY = Math.sin(ship.rotation) * NETWORK_PROJECTILE_SPEED;
    projectile.rotation = ship.rotation;
    projectile.spawnX = muzzleX;
    projectile.spawnY = muzzleY;
    projectile.distanceTraveled = 0;
    projectile.active = true;
    projectile.createdAt = wallNow;
    this.state.projectiles.set(projectileId, projectile);
    weapon.lastShotAt = runtimeNow;
    this.weapons.set(ship.ownerSessionId, weapon);
  }

  private countActiveProjectilesForOwner(ownerSessionId: string): number {
    let count = 0;

    this.state.projectiles.forEach((projectile) => {
      if (projectile.ownerSessionId === ownerSessionId && projectile.active) {
        count += 1;
      }
    });

    return count;
  }

  private updateProjectiles(deltaSeconds: number, wallNow: number, runtimeNow: number): void {
    const projectileIdsToRemove: string[] = [];

    this.state.projectiles.forEach((projectile, projectileId) => {
      projectile.previousX = projectile.x;
      projectile.previousY = projectile.y;
      projectile.x += projectile.velocityX * deltaSeconds;
      projectile.y += projectile.velocityY * deltaSeconds;
      projectile.distanceTraveled += Math.hypot(
        projectile.x - projectile.previousX,
        projectile.y - projectile.previousY
      );

      if (
        projectile.distanceTraveled >= NETWORK_PROJECTILE_MAX_RANGE ||
        projectile.x < 0 ||
        projectile.y < 0 ||
        projectile.x > WORLD_WIDTH ||
        projectile.y > WORLD_HEIGHT
      ) {
        projectileIdsToRemove.push(projectileId);
        return;
      }

      const hit = this.findProjectileHit(projectile, wallNow);

      if (!hit) {
        return;
      }

      const target = this.state.ships.get(hit.shipId);

      if (!target) {
        return;
      }

      const killed = applyDamage(target, NETWORK_PROJECTILE_DAMAGE, wallNow);
      this.broadcast(ServerMessages.HIT_EVENT, {
        projectileId,
        targetShipId: hit.shipId,
        x: hit.x,
        y: hit.y,
        damage: NETWORK_PROJECTILE_DAMAGE
      } satisfies HitEventMessage);
      projectileIdsToRemove.push(projectileId);

      if (killed) {
        this.inputs.set(hit.shipId, createNeutralInput(target.lastProcessedInput));
        this.weapons.set(hit.shipId, { lastShotAt: runtimeNow });
        this.broadcast(ServerMessages.SHIP_DESTROYED, {
          shipId: hit.shipId,
          x: target.x,
          y: target.y,
          respawnAt: target.respawnAt
        } satisfies ShipDestroyedMessage);
      }
    });

    for (const projectileId of projectileIdsToRemove) {
      this.state.projectiles.delete(projectileId);
    }
  }

  private findProjectileHit(projectile: ProjectileState, now: number): { shipId: string; x: number; y: number } | undefined {
    let best: { shipId: string; t: number } | undefined;

    this.state.ships.forEach((ship, shipId) => {
      if (!canDamageShip(ship, projectile.ownerSessionId, projectile.faction, now)) {
        return;
      }

      const hit = segmentCircleIntersectionT(
        projectile.previousX,
        projectile.previousY,
        projectile.x,
        projectile.y,
        ship.x,
        ship.y,
        NETWORK_PROJECTILE_RADIUS + NETWORK_SHIP_RADIUS
      );

      if (!hit.hit || (best && hit.t >= best.t)) {
        return;
      }

      best = { shipId, t: hit.t };
    });

    if (!best) {
      return undefined;
    }

    return {
      shipId: best.shipId,
      x: projectile.previousX + (projectile.x - projectile.previousX) * best.t,
      y: projectile.previousY + (projectile.y - projectile.previousY) * best.t
    };
  }

  private tryRespawnShip(ship: ShipState, sessionId: string, wallNow: number): void {
    if (ship.respawnAt <= 0 || wallNow < ship.respawnAt) {
      return;
    }

    respawnShip(ship, wallNow);
    this.inputs.set(sessionId, createNeutralInput(ship.lastProcessedInput));
    this.weapons.set(sessionId, { lastShotAt: -Infinity });
  }
}
