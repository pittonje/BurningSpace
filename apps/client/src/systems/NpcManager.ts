import Phaser from 'phaser';
import {
  BLUE_BASE_SPAWN_X,
  BLUE_BASE_SPAWN_Y,
  NPC_ASTEROID_ATTACK_RANGE,
  NPC_ASTEROID_SEARCH_RADIUS,
  NPC_BASE_ARRIVAL_RADIUS,
  NPC_MIN_ATTACK_RANGE,
  NPC_PROJECTILE_POOL_SIZE,
  NPC_TARGET_REEVALUATION_MS,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';
import { runtimeBalance } from '../config/runtimeBalance';
import { Asteroid } from '../entities/Asteroid';
import { NpcProjectile } from '../entities/NpcProjectile';
import { NpcShip, type NpcMoveCommand } from '../entities/NpcShip';
import { PlayerShip } from '../entities/PlayerShip';
import { distanceSquared } from '../utils/math';

export type NpcState =
  | 'moveToCenter'
  | 'attackAsteroid'
  | 'chasePlayer'
  | 'retreatToBase'
  | 'repairing'
  | 'dead';

export class NpcManager {
  readonly ship: NpcShip;
  readonly projectiles: NpcProjectile[] = [];
  private readonly scene: Phaser.Scene;
  private readonly debugGraphics: Phaser.GameObjects.Graphics;
  private readonly debugText: Phaser.GameObjects.Text;
  private readonly moveCommand: NpcMoveCommand = {
    thrustX: 0,
    thrustY: 0,
    faceX: WORLD_WIDTH / 2,
    faceY: WORLD_HEIGHT / 2
  };
  private stateValue: NpcState = 'moveToCenter';
  private targetAsteroid?: Asteroid;
  private lastTargetReevaluationAt = -NPC_TARGET_REEVALUATION_MS;
  private lastFireAt = -runtimeBalance.npc.fireCooldownMs;
  private respawnScheduled = false;
  private debugVisible = false;
  private centerWanderX = WORLD_WIDTH / 2;
  private centerWanderY = WORLD_HEIGHT / 2;
  private nextWanderAt = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.ship = new NpcShip(scene, 'blue-npc-1');
    this.debugGraphics = scene.add.graphics();
    this.debugGraphics.setDepth(7);
    this.debugGraphics.setVisible(false);
    this.debugText = scene.add.text(0, 0, '', {
      color: '#e0f2fe',
      fontFamily: 'ui-monospace, monospace',
      fontSize: '12px'
    });
    this.debugText.setDepth(1002);
    this.debugText.setVisible(false);

    for (let i = 0; i < NPC_PROJECTILE_POOL_SIZE; i += 1) {
      this.projectiles.push(new NpcProjectile(scene, this.ship.id));
    }
  }

  get state(): NpcState {
    return this.stateValue;
  }

  get activeProjectileCount(): number {
    let count = 0;

    for (const projectile of this.projectiles) {
      if (projectile.isActive) {
        count += 1;
      }
    }

    return count;
  }

  update(time: number, deltaMs: number, player: PlayerShip, asteroids: readonly Asteroid[]): void {
    const deltaSeconds = deltaMs / 1000;

    for (const projectile of this.projectiles) {
      projectile.update(deltaSeconds, deltaMs);
    }

    if (!this.ship.isAlive) {
      this.enterDead();
      this.drawDebug(player);
      return;
    }

    if (runtimeBalance.aiPaused) {
      this.ship.heal(runtimeBalance.npc.healthRegenPerSecond * deltaSeconds);
      this.clearMoveCommand(this.ship.x + Math.cos(this.ship.rotation), this.ship.y + Math.sin(this.ship.rotation));
      this.ship.update(this.moveCommand, deltaSeconds);
      this.drawDebug(player);
      return;
    }

    if (this.stateValue === 'repairing') {
      this.updateRepairing(deltaSeconds);
      this.drawDebug(player);
      return;
    }

    this.ship.heal(runtimeBalance.npc.healthRegenPerSecond * deltaSeconds);

    if (this.stateValue === 'retreatToBase' || this.ship.health < runtimeBalance.npc.retreatHealthThreshold) {
      this.enterRetreat();
      this.updateRetreat(deltaSeconds);
      this.drawDebug(player);
      return;
    }

    if (this.shouldChasePlayer(player)) {
      this.stateValue = 'chasePlayer';
      this.targetAsteroid = undefined;
      this.updateChasePlayer(time, deltaSeconds, player);
      this.drawDebug(player);
      return;
    }

    this.updateAsteroidBehavior(time, deltaSeconds, asteroids);
    this.drawDebug(player);
  }

  setDebugVisible(value: boolean): void {
    this.debugVisible = value;
    this.debugGraphics.setVisible(value);
    this.debugText.setVisible(value);
  }

  destroy(): void {
    this.debugGraphics.destroy();
    this.debugText.destroy();
    this.ship.destroy();

    for (const projectile of this.projectiles) {
      projectile.destroy();
    }
  }

  private updateAsteroidBehavior(time: number, deltaSeconds: number, asteroids: readonly Asteroid[]): void {
    if (time - this.lastTargetReevaluationAt >= NPC_TARGET_REEVALUATION_MS) {
      this.lastTargetReevaluationAt = time;
      this.targetAsteroid = this.findAsteroidTarget(asteroids);
    }

    if (!this.targetAsteroid?.isAlive) {
      this.targetAsteroid = undefined;
    }

    if (!this.targetAsteroid) {
      this.stateValue = 'moveToCenter';
      this.moveToCenter(time, deltaSeconds);
      return;
    }

    this.stateValue = 'attackAsteroid';
    this.attackPosition(
      time,
      deltaSeconds,
      this.targetAsteroid.x,
      this.targetAsteroid.y,
      NPC_ASTEROID_ATTACK_RANGE,
      runtimeBalance.npc.preferredAttackRange,
      NPC_MIN_ATTACK_RANGE
    );
  }

  private updateChasePlayer(time: number, deltaSeconds: number, player: PlayerShip): void {
    this.attackPosition(
      time,
      deltaSeconds,
      player.x,
      player.y,
      runtimeBalance.npc.attackRange,
      runtimeBalance.npc.preferredAttackRange,
      NPC_MIN_ATTACK_RANGE
    );
  }

  private updateRetreat(deltaSeconds: number): void {
    this.targetAsteroid = undefined;
    this.lastFireAt = this.scene.time.now;
    this.setMoveCommandToward(BLUE_BASE_SPAWN_X, BLUE_BASE_SPAWN_Y);
    this.ship.update(this.moveCommand, deltaSeconds);

    if (distanceSquared(this.ship.x, this.ship.y, BLUE_BASE_SPAWN_X, BLUE_BASE_SPAWN_Y) <= NPC_BASE_ARRIVAL_RADIUS * NPC_BASE_ARRIVAL_RADIUS) {
      this.stateValue = 'repairing';
      this.ship.stop();
      this.ship.setRepairing(true);
    }
  }

  private updateRepairing(deltaSeconds: number): void {
    this.targetAsteroid = undefined;
    this.ship.setRepairing(true);
    this.ship.heal(Math.max(runtimeBalance.npc.baseRepairPerSecond, runtimeBalance.blueBase.alliedRegenPerSecond) * deltaSeconds);
    this.clearMoveCommand(BLUE_BASE_SPAWN_X, BLUE_BASE_SPAWN_Y);
    this.ship.update(this.moveCommand, deltaSeconds);

    if (this.ship.health >= runtimeBalance.npc.maxHealth) {
      this.ship.setRepairing(false);
      this.stateValue = 'moveToCenter';
      this.lastTargetReevaluationAt = -NPC_TARGET_REEVALUATION_MS;
    }
  }

  private moveToCenter(time: number, deltaSeconds: number): void {
    if (time >= this.nextWanderAt) {
      this.centerWanderX = WORLD_WIDTH / 2 + Phaser.Math.Between(-360, 360);
      this.centerWanderY = WORLD_HEIGHT / 2 + Phaser.Math.Between(-260, 260);
      this.nextWanderAt = time + 2200;
    }

    this.setMoveCommandToward(this.centerWanderX, this.centerWanderY);
    this.ship.update(this.moveCommand, deltaSeconds);
  }

  private attackPosition(
    time: number,
    deltaSeconds: number,
    targetX: number,
    targetY: number,
    fireRange: number,
    preferredRange: number,
    minRange: number
  ): void {
    const dx = targetX - this.ship.x;
    const dy = targetY - this.ship.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));

    this.moveCommand.faceX = targetX;
    this.moveCommand.faceY = targetY;

    if (distance > preferredRange + 80) {
      this.moveCommand.thrustX = dx / distance;
      this.moveCommand.thrustY = dy / distance;
    } else if (distance < minRange) {
      this.moveCommand.thrustX = -dx / distance;
      this.moveCommand.thrustY = -dy / distance;
    } else {
      const orbitDirection = this.ship.id.length % 2 === 0 ? 1 : -1;
      this.moveCommand.thrustX = (-dy / distance) * 0.34 * orbitDirection;
      this.moveCommand.thrustY = (dx / distance) * 0.34 * orbitDirection;
    }

    this.ship.update(this.moveCommand, deltaSeconds);

    if (distance <= fireRange) {
      this.tryFire(time, targetX, targetY);
    }
  }

  private tryFire(time: number, targetX: number, targetY: number): void {
    if (time - this.lastFireAt < runtimeBalance.npc.fireCooldownMs || !this.ship.isAlive) {
      return;
    }

    let projectileToUse: NpcProjectile | undefined;

    for (const projectile of this.projectiles) {
      if (!projectile.isActive) {
        projectileToUse = projectile;
        break;
      }
    }

    if (!projectileToUse) {
      return;
    }

    const muzzle = this.ship.getMuzzlePosition();
    const angle = Phaser.Math.Angle.Between(muzzle.x, muzzle.y, targetX, targetY);
    projectileToUse.spawn(muzzle.x, muzzle.y, angle, {
      damage: runtimeBalance.npc.projectileDamage,
      speed: runtimeBalance.npc.projectileSpeed,
      range: runtimeBalance.npc.projectileRange
    });
    this.lastFireAt = time;
  }

  private shouldChasePlayer(player: PlayerShip): boolean {
    if (!player.isAlive || player.isInvulnerable) {
      return false;
    }

    const distanceToPlayerSquared = distanceSquared(this.ship.x, this.ship.y, player.x, player.y);
    const radius = this.stateValue === 'chasePlayer' ? runtimeBalance.npc.loseRadius : runtimeBalance.npc.detectionRadius;

    return distanceToPlayerSquared <= radius * radius;
  }

  private findAsteroidTarget(asteroids: readonly Asteroid[]): Asteroid | undefined {
    let bestTarget: Asteroid | undefined;
    let bestDistanceSquared = NPC_ASTEROID_SEARCH_RADIUS * NPC_ASTEROID_SEARCH_RADIUS;

    for (const asteroid of asteroids) {
      if (!asteroid.isAlive) {
        continue;
      }

      const candidateDistanceSquared = distanceSquared(this.ship.x, this.ship.y, asteroid.x, asteroid.y);

      if (candidateDistanceSquared <= bestDistanceSquared) {
        bestTarget = asteroid;
        bestDistanceSquared = candidateDistanceSquared;
      }
    }

    return bestTarget;
  }

  private enterRetreat(): void {
    if (this.stateValue === 'retreatToBase') {
      return;
    }

    this.stateValue = 'retreatToBase';
    this.targetAsteroid = undefined;
    this.ship.setRepairing(false);
  }

  private enterDead(): void {
    if (this.stateValue !== 'dead') {
      this.stateValue = 'dead';
      this.targetAsteroid = undefined;
      this.ship.setRepairing(false);
      this.despawnProjectiles();
    }

    if (this.respawnScheduled) {
      return;
    }

    this.respawnScheduled = true;
    this.scene.time.delayedCall(runtimeBalance.npc.respawnDelayMs, () => {
      this.ship.respawn();
      this.stateValue = 'moveToCenter';
      this.targetAsteroid = undefined;
      this.lastTargetReevaluationAt = -NPC_TARGET_REEVALUATION_MS;
      this.lastFireAt = this.scene.time.now;
      this.respawnScheduled = false;
    });
  }

  private setMoveCommandToward(targetX: number, targetY: number): void {
    const dx = targetX - this.ship.x;
    const dy = targetY - this.ship.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));

    this.moveCommand.thrustX = dx / distance;
    this.moveCommand.thrustY = dy / distance;
    this.moveCommand.faceX = targetX;
    this.moveCommand.faceY = targetY;
  }

  private despawnProjectiles(): void {
    for (const projectile of this.projectiles) {
      if (projectile.isActive) {
        projectile.despawn();
      }
    }
  }

  private clearMoveCommand(faceX: number, faceY: number): void {
    this.moveCommand.thrustX = 0;
    this.moveCommand.thrustY = 0;
    this.moveCommand.faceX = faceX;
    this.moveCommand.faceY = faceY;
  }

  healFull(): void {
    this.ship.heal(runtimeBalance.npc.maxHealth);
  }

  damage(amount: number): void {
    this.ship.takeDamage(amount);
  }

  kill(): void {
    this.ship.kill();
    this.enterDead();
  }

  respawnNow(): void {
    this.respawnScheduled = false;
    this.ship.respawn();
    this.stateValue = 'moveToCenter';
    this.targetAsteroid = undefined;
  }

  teleportToBlueBase(): void {
    this.ship.teleportTo(BLUE_BASE_SPAWN_X, BLUE_BASE_SPAWN_Y);
  }

  teleportToCenter(): void {
    this.ship.teleportTo(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  }

  forceRetreat(): void {
    this.enterRetreat();
  }

  resetState(): void {
    this.stateValue = 'moveToCenter';
    this.targetAsteroid = undefined;
    this.ship.setRepairing(false);
  }

  private drawDebug(player: PlayerShip): void {
    this.debugGraphics.clear();
    this.debugGraphics.setVisible(this.debugVisible);
    this.debugText.setVisible(this.debugVisible && this.ship.isAlive);

    if (!this.debugVisible || !this.ship.isAlive) {
      return;
    }

    this.debugGraphics.lineStyle(1, 0x38bdf8, 0.18);
    this.debugGraphics.strokeCircle(this.ship.x, this.ship.y, runtimeBalance.npc.detectionRadius);
    this.debugGraphics.lineStyle(1, 0x7dd3fc, 0.12);
    this.debugGraphics.strokeCircle(this.ship.x, this.ship.y, runtimeBalance.npc.loseRadius);
    this.debugGraphics.lineStyle(1, 0x60a5fa, 0.2);
    this.debugGraphics.strokeCircle(this.ship.x, this.ship.y, runtimeBalance.npc.attackRange);

    if (this.stateValue === 'chasePlayer' && player.isAlive) {
      this.debugGraphics.lineStyle(2, 0x60a5fa, 0.42);
      this.debugGraphics.lineBetween(this.ship.x, this.ship.y, player.x, player.y);
    } else if (this.targetAsteroid?.isAlive) {
      this.debugGraphics.lineStyle(2, 0xfacc15, 0.34);
      this.debugGraphics.lineBetween(this.ship.x, this.ship.y, this.targetAsteroid.x, this.targetAsteroid.y);
    }

    const label = `${this.stateValue} HP ${Math.ceil(this.ship.health)}/${runtimeBalance.npc.maxHealth} shots ${this.activeProjectileCount}`;
    this.debugGraphics.fillStyle(0x020617, 0.72);
    this.debugGraphics.fillRect(this.ship.x - 82, this.ship.y - 128, 164, 18);
    this.debugGraphics.lineStyle(1, 0x38bdf8, 0.4);
    this.debugGraphics.strokeRect(this.ship.x - 82, this.ship.y - 128, 164, 18);
    this.debugText.setText(label);
    this.debugText.setPosition(this.ship.x - 78, this.ship.y - 126);
  }
}
