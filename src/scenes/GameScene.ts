import Phaser from 'phaser';
import {
  CAMERA_LERP,
  CAMERA_ZOOM,
  ASTEROID_COLLISION_DAMAGE,
  ASTEROID_PROJECTILE_DAMAGE,
  FIRE_COOLDOWN_MS,
  NPC_ASTEROID_COLLISION_DAMAGE,
  NPC_PLAYER_COLLISION_DAMAGE,
  PLAYER_PROJECTILE_DAMAGE_TO_NPC,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Y,
  PROJECTILE_POOL_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';
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
  private lastFireAt = -FIRE_COOLDOWN_MS;
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
    this.adminPanel = new AdminPanel(this, this.player.speedLimit, (speedLimit) => {
      this.player?.setSpeedLimit(speedLimit);
    });

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

    this.player.update(movementInput, pointerWorld, deltaSeconds);

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
    this.handlePlayerProjectileNpcCollisions();
    this.handleNpcProjectileCollisions();
    this.handleProjectileAsteroidCollisions();
    this.handlePlayerAsteroidCollisions();
    this.handleNpcAsteroidCollisions();
    this.handlePlayerNpcCollision();
    this.updateCamera(deltaSeconds);

    this.hud.update({
      x: this.player.x,
      y: this.player.y,
      speed: this.player.speed,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      npc: this.npcManager
        ? {
            x: this.npcManager.ship.x,
            y: this.npcManager.ship.y,
            isAlive: this.npcManager.ship.isAlive
          }
        : undefined,
      weaponCooldownRemainingMs: Math.max(0, FIRE_COOLDOWN_MS - (time - this.lastFireAt)),
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
    if (!this.player || !this.player.isAlive || time - this.lastFireAt < FIRE_COOLDOWN_MS) {
      return;
    }

    const [leftProjectile, rightProjectile] = this.projectiles.filter((candidate) => !candidate.isActive);

    if (!leftProjectile || !rightProjectile) {
      return;
    }

    const [leftMuzzle, rightMuzzle] = this.player.getMuzzlePositions();
    leftProjectile.spawn(leftMuzzle.x, leftMuzzle.y, this.player.rotation);
    rightProjectile.spawn(rightMuzzle.x, rightMuzzle.y, this.player.rotation);
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
        asteroid.takeDamage(ASTEROID_PROJECTILE_DAMAGE);

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
      npc.takeDamage(PLAYER_PROJECTILE_DAMAGE_TO_NPC);
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
        const damaged = this.player.takeDamage(ASTEROID_COLLISION_DAMAGE);

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
    }
  }

  private handleResize(): void {
    this.hud?.layout();
    this.adminPanel?.layout();
    this.updateCamera(1 / 60);
  }
}
