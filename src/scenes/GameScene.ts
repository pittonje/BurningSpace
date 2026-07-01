import Phaser from 'phaser';
import {
  CAMERA_LERP,
  CAMERA_ZOOM,
  FIRE_COOLDOWN_MS,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Y,
  PROJECTILE_POOL_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';
import { PlayerShip, type MovementInput } from '../entities/PlayerShip';
import { Projectile } from '../entities/Projectile';
import { Hud } from '../ui/Hud';
import { SpaceMap } from '../world/SpaceMap';

export class GameScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyS?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyM?: Phaser.Input.Keyboard.Key;
  private keyF1?: Phaser.Input.Keyboard.Key;
  private player?: PlayerShip;
  private hud?: Hud;
  private projectiles: Projectile[] = [];
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
    this.hud = new Hud(this);

    this.setupInput();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.handleResize();
  }

  update(time: number, deltaMs: number): void {
    if (!this.player || !this.hud) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    const pointerWorld = this.getPointerWorldPosition();

    this.player.update(this.getMovementInput(), pointerWorld, deltaSeconds);

    if (this.input.activePointer.leftButtonDown()) {
      this.tryFire(time);
    }

    for (const projectile of this.projectiles) {
      projectile.update(deltaSeconds, deltaMs);
    }

    this.updateCamera(deltaSeconds);
    this.updateToggles();

    this.hud.update({
      x: this.player.x,
      y: this.player.y,
      speed: this.player.speed,
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

  private getPointerWorldPosition(): Phaser.Math.Vector2 {
    const pointer = this.input.activePointer;
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  private tryFire(time: number): void {
    if (!this.player || time - this.lastFireAt < FIRE_COOLDOWN_MS) {
      return;
    }

    const projectile = this.projectiles.find((candidate) => !candidate.isActive);

    if (!projectile) {
      return;
    }

    const muzzle = this.player.getMuzzlePosition();
    projectile.spawn(muzzle.x, muzzle.y, this.player.rotation);
    this.lastFireAt = time;
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
    if (this.keyM && Phaser.Input.Keyboard.JustDown(this.keyM)) {
      this.hud?.toggleBigMap();
    }

    if (this.keyF1 && Phaser.Input.Keyboard.JustDown(this.keyF1)) {
      this.debugVisible = !this.debugVisible;
      this.hud?.setDebugVisible(this.debugVisible);
    }
  }

  private handleResize(): void {
    this.hud?.layout();
    this.updateCamera(1 / 60);
  }
}
