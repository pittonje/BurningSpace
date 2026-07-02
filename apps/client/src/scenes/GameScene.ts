import Phaser from 'phaser';
import {
  CAMERA_LERP,
  CAMERA_ZOOM,
  NPC_ASTEROID_COLLISION_DAMAGE,
  NPC_PLAYER_COLLISION_DAMAGE,
  BLUE_BASE_X,
  BLUE_BASE_Y,
  RED_BASE_X,
  RED_BASE_Y,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Y,
  PROJECTILE_POOL_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';
import { resetRuntimeBalance, runtimeBalance } from '../config/runtimeBalance';
import { PlayerShip, type MovementInput } from '../entities/PlayerShip';
import { Projectile } from '../entities/Projectile';
import { AsteroidManager } from '../systems/AsteroidManager';
import { NpcManager } from '../systems/NpcManager';
import { AdminPanel } from '../ui/AdminPanel';
import { Hud } from '../ui/Hud';
import { circlesOverlap } from '../utils/math';
import { SpaceMap } from '../world/SpaceMap';

export class GameScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyS?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyM?: Phaser.Input.Keyboard.Key;
  private keyP?: Phaser.Input.Keyboard.Key;
  private keyF1?: Phaser.Input.Keyboard.Key;
  private player?: PlayerShip;
  private hud?: Hud;
  private adminPanel?: AdminPanel;
  private asteroidManager?: AsteroidManager;
  private npcManager?: NpcManager;
  private projectiles: Projectile[] = [];
  private playerAsteroidContacts = new Set<number>();
  private nextPlayerAsteroidContacts = new Set<number>();
  private npcAsteroidContacts = new Set<number>();
  private nextNpcAsteroidContacts = new Set<number>();
  private playerNpcContact = false;
  private lastFireAt = -runtimeBalance.player.fireCooldownMs;
  private lastBlueBaseDamageAt = -Infinity;
  private lastRedBaseDamageAt = -Infinity;
  private baseDebugGraphics?: Phaser.GameObjects.Graphics;
  private debugVisible = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.setRoundPixels(false);

    const map = new SpaceMap(this);
    map.create();

    this.player = new PlayerShip(this, PLAYER_SPAWN_X, PLAYER_SPAWN_Y);
    this.projectiles = Array.from({ length: PROJECTILE_POOL_SIZE }, () => new Projectile(this));
    this.asteroidManager = new AsteroidManager(this);
    this.asteroidManager.createInitialField(this.player.x, this.player.y);
    this.npcManager = new NpcManager(this);
    this.hud = new Hud(this);
    this.baseDebugGraphics = this.add.graphics().setDepth(6).setVisible(false);

    const isDev = Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);

    if (isDev) {
      this.adminPanel = new AdminPanel(this, this.createAdminActions());
    }

    this.setupInput();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.handleResize();
  }

  update(time: number, deltaMs: number): void {
    if (!this.player || !this.hud) {
      return;
    }

    this.updateToggles();

    const deltaSeconds = deltaMs / 1000;
    const adminPanelOpen = Boolean(this.adminPanel?.isVisible);
    const pointerWorld = adminPanelOpen ? this.getCurrentFacingPoint() : this.getPointerWorldPosition();
    const movementInput = adminPanelOpen || !this.player.isAlive
      ? this.getDisabledMovementInput()
      : this.getMovementInput();

    this.player.update(movementInput, pointerWorld, deltaSeconds, this.getPlayerRegenRate());

    if (
      this.player.isAlive &&
      !adminPanelOpen &&
      this.input.activePointer.leftButtonDown() &&
      !this.adminPanel?.blocksPointer()
    ) {
      this.tryFire(time);
    }

    for (const projectile of this.projectiles) {
      projectile.update(deltaSeconds, deltaMs);
    }

    this.asteroidManager?.update(deltaSeconds);
    this.npcManager?.update(time, deltaMs, this.player, this.asteroidManager?.activeAsteroids ?? []);
    this.applyBaseEffects(time, deltaSeconds);
    this.handlePlayerProjectileNpcCollisions();
    this.handleNpcProjectileCollisions();
    this.handleProjectileAsteroidCollisions();
    this.handlePlayerAsteroidCollisions();
    this.handleNpcAsteroidCollisions();
    this.handlePlayerNpcCollision();
    this.drawBaseDebug();
    this.updateCamera(deltaSeconds);

    this.hud.update({
      x: this.player.x,
      y: this.player.y,
      speed: this.player.speed,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      alert: this.isPlayerInEnemyBaseDefense() ? 'ENEMY BASE DEFENSE' : undefined,
      npc: this.npcManager
        ? {
            x: this.npcManager.ship.x,
            y: this.npcManager.ship.y,
            isAlive: this.npcManager.ship.isAlive
          }
        : undefined,
      weaponCooldownRemainingMs: Math.max(0, runtimeBalance.player.fireCooldownMs - (time - this.lastFireAt)),
      fps: this.game.loop.actualFps
    });
  }

  private setupInput(): void {
    if (!this.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyM = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyF1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
  }

  private getMovementInput(): MovementInput {
    return {
      up: Boolean(this.keyW?.isDown || this.cursors?.up.isDown),
      down: Boolean(this.keyS?.isDown || this.cursors?.down.isDown),
      left: Boolean(this.keyA?.isDown || this.cursors?.left.isDown),
      right: Boolean(this.keyD?.isDown || this.cursors?.right.isDown)
    };
  }

  private getDisabledMovementInput(): MovementInput {
    return {
      up: false,
      down: false,
      left: false,
      right: false
    };
  }

  private getPointerWorldPosition(): Phaser.Math.Vector2 {
    const pointer = this.input.activePointer;
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  private getCurrentFacingPoint(): Phaser.Math.Vector2 {
    if (!this.player) {
      return new Phaser.Math.Vector2(0, 0);
    }

    return new Phaser.Math.Vector2(
      this.player.x + Math.cos(this.player.rotation),
      this.player.y + Math.sin(this.player.rotation)
    );
  }

  private tryFire(time: number): void {
    if (!this.player || !this.player.isAlive || time - this.lastFireAt < runtimeBalance.player.fireCooldownMs) {
      return;
    }

    const [leftProjectile, rightProjectile] = this.projectiles.filter((candidate) => !candidate.isActive);

    if (!leftProjectile || !rightProjectile) {
      return;
    }

    const [leftMuzzle, rightMuzzle] = this.player.getMuzzlePositions();
    leftProjectile.spawn(leftMuzzle.x, leftMuzzle.y, this.player.rotation, {
      damage: runtimeBalance.player.projectileDamage,
      speed: runtimeBalance.player.projectileSpeed,
      range: runtimeBalance.player.projectileRange
    });
    rightProjectile.spawn(rightMuzzle.x, rightMuzzle.y, this.player.rotation, {
      damage: runtimeBalance.player.projectileDamage,
      speed: runtimeBalance.player.projectileSpeed,
      range: runtimeBalance.player.projectileRange
    });
    this.lastFireAt = time;
  }

  private handleProjectileAsteroidCollisions(): void {
    if (!this.asteroidManager || !this.player) {
      return;
    }

    for (const projectile of this.projectiles) {
      if (!projectile.isActive) {
        continue;
      }

      for (const asteroid of this.asteroidManager.activeAsteroids) {
        if (
          !asteroid.isAlive ||
          !circlesOverlap(
            projectile.x,
            projectile.y,
            projectile.collisionRadius,
            asteroid.x,
            asteroid.y,
            asteroid.radius
          )
        ) {
          continue;
        }

        projectile.despawn();
        asteroid.takeDamage(projectile.damage);

        if (!asteroid.isAlive) {
          this.asteroidManager.scheduleRespawn(asteroid, () => ({
            x: this.player?.x ?? PLAYER_SPAWN_X,
            y: this.player?.y ?? PLAYER_SPAWN_Y
          }));
        }

        break;
      }
    }
  }

  private handlePlayerProjectileNpcCollisions(): void {
    if (!this.npcManager || !this.npcManager.ship.isAlive) {
      return;
    }

    const npc = this.npcManager.ship;

    for (const projectile of this.projectiles) {
      if (
        !projectile.isActive ||
        !circlesOverlap(projectile.x, projectile.y, projectile.collisionRadius, npc.x, npc.y, npc.collisionRadius)
      ) {
        continue;
      }

      projectile.despawn();
      npc.takeDamage(projectile.damage);
    }
  }

  private handleNpcProjectileCollisions(): void {
    if (!this.npcManager || !this.player || !this.asteroidManager) {
      return;
    }

    for (const projectile of this.npcManager.projectiles) {
      if (!projectile.isActive) {
        continue;
      }

      if (
        this.player.isAlive &&
        circlesOverlap(projectile.x, projectile.y, projectile.collisionRadius, this.player.x, this.player.y, this.player.collisionRadius)
      ) {
        const damaged = this.player.takeDamage(projectile.damage);
        projectile.despawn();

        if (damaged) {
          this.cameras.main.shake(90, 0.0025);
        }

        continue;
      }

      for (const asteroid of this.asteroidManager.activeAsteroids) {
        if (
          !asteroid.isAlive ||
          !circlesOverlap(projectile.x, projectile.y, projectile.collisionRadius, asteroid.x, asteroid.y, asteroid.radius)
        ) {
          continue;
        }

        projectile.despawn();
        asteroid.takeDamage(projectile.damage);

        if (!asteroid.isAlive) {
          this.asteroidManager.scheduleRespawn(asteroid, () => ({
            x: this.player?.x ?? PLAYER_SPAWN_X,
            y: this.player?.y ?? PLAYER_SPAWN_Y
          }));
        }

        break;
      }
    }
  }

  private handlePlayerAsteroidCollisions(): void {
    if (!this.asteroidManager || !this.player || !this.player.isAlive) {
      this.playerAsteroidContacts.clear();
      this.nextPlayerAsteroidContacts.clear();
      return;
    }

    this.nextPlayerAsteroidContacts.clear();

    for (const asteroid of this.asteroidManager.activeAsteroids) {
      if (!asteroid.isAlive) {
        continue;
      }

      const combinedRadius = this.player.collisionRadius + asteroid.radius;

      if (!circlesOverlap(this.player.x, this.player.y, this.player.collisionRadius, asteroid.x, asteroid.y, asteroid.radius)) {
        continue;
      }

      this.nextPlayerAsteroidContacts.add(asteroid.id);
      this.player.separateFrom(asteroid.x, asteroid.y, combinedRadius);

      if (!this.playerAsteroidContacts.has(asteroid.id)) {
        const damaged = this.player.takeDamage(runtimeBalance.player.asteroidCollisionDamage);

        if (damaged) {
          this.cameras.main.shake(120, 0.004);
        }
      }
    }

    const previousContacts = this.playerAsteroidContacts;
    this.playerAsteroidContacts = this.nextPlayerAsteroidContacts;
    this.nextPlayerAsteroidContacts = previousContacts;
  }

  private handleNpcAsteroidCollisions(): void {
    if (!this.asteroidManager || !this.npcManager || !this.npcManager.ship.isAlive) {
      this.npcAsteroidContacts.clear();
      this.nextNpcAsteroidContacts.clear();
      return;
    }

    const npc = this.npcManager.ship;
    this.nextNpcAsteroidContacts.clear();

    for (const asteroid of this.asteroidManager.activeAsteroids) {
      if (!asteroid.isAlive) {
        continue;
      }

      const combinedRadius = npc.collisionRadius + asteroid.radius;

      if (!circlesOverlap(npc.x, npc.y, npc.collisionRadius, asteroid.x, asteroid.y, asteroid.radius)) {
        continue;
      }

      this.nextNpcAsteroidContacts.add(asteroid.id);
      npc.separateFrom(asteroid.x, asteroid.y, combinedRadius);

      if (!this.npcAsteroidContacts.has(asteroid.id)) {
        npc.takeDamage(NPC_ASTEROID_COLLISION_DAMAGE);
      }
    }

    const previousContacts = this.npcAsteroidContacts;
    this.npcAsteroidContacts = this.nextNpcAsteroidContacts;
    this.nextNpcAsteroidContacts = previousContacts;
  }

  private handlePlayerNpcCollision(): void {
    if (!this.player || !this.player.isAlive || !this.npcManager?.ship.isAlive) {
      this.playerNpcContact = false;
      return;
    }

    const npc = this.npcManager.ship;
    const combinedRadius = this.player.collisionRadius + npc.collisionRadius;
    const touching = circlesOverlap(this.player.x, this.player.y, this.player.collisionRadius, npc.x, npc.y, npc.collisionRadius);

    if (!touching) {
      this.playerNpcContact = false;
      return;
    }

    this.player.separateFrom(npc.x, npc.y, combinedRadius);
    npc.separateFrom(this.player.x, this.player.y, combinedRadius);

    if (!this.playerNpcContact) {
      const playerDamaged = this.player.takeDamage(NPC_PLAYER_COLLISION_DAMAGE);
      const npcDamaged = npc.takeDamage(NPC_PLAYER_COLLISION_DAMAGE);

      if (playerDamaged || npcDamaged) {
        this.cameras.main.shake(110, 0.003);
      }
    }

    this.playerNpcContact = true;
  }

  private getPlayerRegenRate(): number {
    if (!this.player?.isAlive) {
      return 0;
    }

    if (this.isInsideCircle(this.player.x, this.player.y, RED_BASE_X, RED_BASE_Y, runtimeBalance.redBase.zoneRadius)) {
      return Math.max(runtimeBalance.player.baseHealthRegenPerSecond, runtimeBalance.redBase.alliedRegenPerSecond);
    }

    return runtimeBalance.player.healthRegenPerSecond;
  }

  private applyBaseEffects(time: number, deltaSeconds: number): void {
    if (!this.player) {
      return;
    }

    const npc = this.npcManager?.ship;

    if (
      npc?.isAlive &&
      this.npcManager?.state !== 'repairing' &&
      this.isInsideCircle(npc.x, npc.y, BLUE_BASE_X, BLUE_BASE_Y, runtimeBalance.blueBase.zoneRadius)
    ) {
      npc.heal(Math.max(runtimeBalance.npc.baseRepairPerSecond, runtimeBalance.blueBase.alliedRegenPerSecond) * deltaSeconds);
    }

    if (
      this.player.isAlive &&
      runtimeBalance.blueBase.defenseEnabled &&
      this.isPlayerInEnemyBaseDefense() &&
      time - this.lastBlueBaseDamageAt >= runtimeBalance.blueBase.enemyDamageIntervalMs
    ) {
      const damaged = this.player.takeDamage(runtimeBalance.blueBase.enemyDamagePerTick);
      this.lastBlueBaseDamageAt = time;

      if (damaged) {
        this.createBaseDefenseHit(BLUE_BASE_X, BLUE_BASE_Y, this.player.x, this.player.y, 0x38bdf8);
      }
    }

    if (
      npc?.isAlive &&
      runtimeBalance.redBase.defenseEnabled &&
      this.isInsideCircle(npc.x, npc.y, RED_BASE_X, RED_BASE_Y, runtimeBalance.redBase.defenseRadius) &&
      time - this.lastRedBaseDamageAt >= runtimeBalance.redBase.enemyDamageIntervalMs
    ) {
      npc.takeDamage(runtimeBalance.redBase.enemyDamagePerTick);
      this.lastRedBaseDamageAt = time;
      this.createBaseDefenseHit(RED_BASE_X, RED_BASE_Y, npc.x, npc.y, 0xef4444);
    }
  }

  private isPlayerInEnemyBaseDefense(): boolean {
    return Boolean(
      this.player?.isAlive &&
      this.isInsideCircle(this.player.x, this.player.y, BLUE_BASE_X, BLUE_BASE_Y, runtimeBalance.blueBase.defenseRadius)
    );
  }

  private isInsideCircle(x: number, y: number, centerX: number, centerY: number, radius: number): boolean {
    const dx = x - centerX;
    const dy = y - centerY;

    return dx * dx + dy * dy <= radius * radius;
  }

  private createBaseDefenseHit(baseX: number, baseY: number, targetX: number, targetY: number, color: number): void {
    const beam = this.add.graphics();
    beam.setDepth(29);
    beam.setBlendMode(Phaser.BlendModes.ADD);
    beam.lineStyle(3, color, 0.68);
    beam.lineBetween(baseX, baseY, targetX, targetY);
    beam.fillStyle(0xffffff, 0.8);
    beam.fillCircle(targetX, targetY, 9);

    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 180,
      ease: 'Sine.easeOut',
      onComplete: () => {
        beam.destroy();
      }
    });
  }

  private updateCamera(deltaSeconds: number): void {
    if (!this.player) {
      return;
    }

    const camera = this.cameras.main;
    const viewportWorldWidth = camera.width / camera.zoom;
    const viewportWorldHeight = camera.height / camera.zoom;
    const minX = viewportWorldWidth / 2;
    const minY = viewportWorldHeight / 2;
    const maxX = WORLD_WIDTH - viewportWorldWidth / 2;
    const maxY = WORLD_HEIGHT - viewportWorldHeight / 2;
    const targetX = Phaser.Math.Clamp(this.player.x, minX, maxX);
    const targetY = Phaser.Math.Clamp(this.player.y, minY, maxY);
    const lerp = 1 - Math.pow(1 - CAMERA_LERP, deltaSeconds * 60);

    camera.centerOn(
      Phaser.Math.Linear(camera.midPoint.x, targetX, lerp),
      Phaser.Math.Linear(camera.midPoint.y, targetY, lerp)
    );
  }

  private updateToggles(): void {
    if (this.keyP && Phaser.Input.Keyboard.JustDown(this.keyP)) {
      this.adminPanel?.toggle();
    }

    if (this.adminPanel?.isVisible) {
      return;
    }

    if (this.keyM && Phaser.Input.Keyboard.JustDown(this.keyM)) {
      this.hud?.toggleBigMap();
    }

    if (this.keyF1 && Phaser.Input.Keyboard.JustDown(this.keyF1)) {
      this.debugVisible = !this.debugVisible;
      this.hud?.setDebugVisible(this.debugVisible);
      this.asteroidManager?.setDebugVisible(this.debugVisible);
      this.npcManager?.setDebugVisible(this.debugVisible);
      this.drawBaseDebug();
    }
  }

  private handleResize(): void {
    this.hud?.layout();
    this.adminPanel?.layout();
    this.updateCamera(1 / 60);
  }

  private drawBaseDebug(): void {
    this.baseDebugGraphics?.clear();
    this.baseDebugGraphics?.setVisible(this.debugVisible);

    if (!this.debugVisible || !this.baseDebugGraphics) {
      return;
    }

    this.baseDebugGraphics.lineStyle(2, 0xef4444, 0.28);
    this.baseDebugGraphics.strokeCircle(RED_BASE_X, RED_BASE_Y, runtimeBalance.redBase.zoneRadius);
    this.baseDebugGraphics.lineStyle(1, 0xef4444, 0.16);
    this.baseDebugGraphics.strokeCircle(RED_BASE_X, RED_BASE_Y, runtimeBalance.redBase.defenseRadius);

    this.baseDebugGraphics.lineStyle(2, 0x38bdf8, 0.28);
    this.baseDebugGraphics.strokeCircle(BLUE_BASE_X, BLUE_BASE_Y, runtimeBalance.blueBase.zoneRadius);
    this.baseDebugGraphics.lineStyle(1, 0x38bdf8, 0.16);
    this.baseDebugGraphics.strokeCircle(BLUE_BASE_X, BLUE_BASE_Y, runtimeBalance.blueBase.defenseRadius);
  }

  private createAdminActions(): ConstructorParameters<typeof AdminPanel>[1] {
    return {
      healPlayer: () => this.player?.heal(runtimeBalance.player.maxHealth),
      killPlayer: () => this.player?.kill(),
      respawnPlayer: () => this.player?.respawn(),
      teleportPlayerToRedBase: () => this.player?.teleportTo(RED_BASE_X, RED_BASE_Y),
      teleportPlayerToCenter: () => this.player?.teleportTo(WORLD_WIDTH / 2, WORLD_HEIGHT / 2),
      healNpc: () => this.npcManager?.healFull(),
      damageNpc: () => this.npcManager?.damage(10),
      killNpc: () => this.npcManager?.kill(),
      respawnNpc: () => this.npcManager?.respawnNow(),
      teleportNpcToBlueBase: () => this.npcManager?.teleportToBlueBase(),
      teleportNpcToCenter: () => this.npcManager?.teleportToCenter(),
      forceNpcRetreat: () => this.npcManager?.forceRetreat(),
      resetNpcState: () => this.npcManager?.resetState(),
      respawnAllAsteroids: () => this.asteroidManager?.respawnAll(this.player?.x ?? PLAYER_SPAWN_X, this.player?.y ?? PLAYER_SPAWN_Y),
      destroyAllAsteroids: () => this.asteroidManager?.destroyAll()
    };
  }
}
