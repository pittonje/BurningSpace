import { performance } from 'node:perf_hooks';
import { Client, Room } from 'colyseus';
import {
  ClientMessages as ProfileClientMessages,
  ServerMessages as ProfileServerMessages,
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

export class BattleRoom extends Room<BattleState> {
  maxClients = MAX_ROOM_CLIENTS;
  private readonly inputs = new Map<string, PlayerInputMessage>();
  private readonly weapons = new Map<string, WeaponRuntimeState>();
  private readonly lastInputReceivedAt = new Map<string, number>();
  private nextProjectileId = 1;

  onCreate(): void {
    this.setState(new BattleState());
    this.onMessage<unknown>(ProfileClientMessages.SET_PROFILE, (client, message) => {
      this.handleSetProfile(client, message);
    });
    this.onMessage<unknown>(ClientMessages.PLAYER_INPUT, (client, message) => {
      this.handlePlayerInput(client, message);
    });

    this.setSimulationInterval((deltaTimeMs) => {
      this.updateSimulation(deltaTimeMs);
    }, NETWORK_TICK_INTERVAL_MS);

    console.log(`[BattleRoom] created roomId=${this.roomId}`);
  }

  onJoin(client: Client): void {
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

  onLeave(client: Client, consented?: boolean): void {
    this.state.participants.delete(client.sessionId);
    this.removeShip(client.sessionId);
    this.inputs.delete(client.sessionId);
    this.weapons.delete(client.sessionId);
    this.lastInputReceivedAt.delete(client.sessionId);
    this.sendRoomInfo();

    console.log(`[BattleRoom] left sessionId=${client.sessionId} consented=${Boolean(consented)}`);
  }

  private handleSetProfile(client: Client, message: unknown): void {
    const participant = this.state.participants.get(client.sessionId);

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

    participant.nickname = validation.profile.nickname;
    participant.mode = validation.profile.mode;
    participant.faction = requestedFaction;
    participant.profileReady = true;

    if (validation.profile.mode === 'player' && validation.profile.faction) {
      this.upsertShip(client.sessionId, validation.profile.nickname, validation.profile.faction);
    } else {
      this.removeShip(client.sessionId);
      this.inputs.delete(client.sessionId);
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
      `[BattleRoom] profile sessionId=${client.sessionId} nickname=${participant.nickname} mode=${participant.mode}`
    );
  }

  private sendRoomInfo(): void {
    this.broadcast(ServerMessages.ROOM_INFO, {
      roomId: this.roomId,
      connectedClients: this.clients.length,
      maxClients: this.maxClients,
      serverTime: Date.now()
    } satisfies RoomInfoMessage);
  }

  private upsertShip(sessionId: string, nickname: string, faction: Faction): void {
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
