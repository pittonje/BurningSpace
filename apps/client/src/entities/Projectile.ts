import Phaser from 'phaser';
import {
  PROJECTILE_COLLISION_RADIUS,
  PROJECTILE_SPEED,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';
import { runtimeBalance } from '../config/runtimeBalance';

type ProjectileLaunchOptions = {
  damage: number;
  speed: number;
  range: number;
};

export class Projectile {
  private readonly body: Phaser.GameObjects.Graphics;
  private velocityX = 0;
  private velocityY = 0;
  private startX = 0;
  private startY = 0;
  private range = runtimeBalance.player.projectileRange;
  private damageValue = runtimeBalance.player.projectileDamage;
  private active = false;

  constructor(scene: Phaser.Scene) {
    this.body = scene.add.graphics();
    this.body.setDepth(15);
    this.body.setVisible(false);
  }

  get isActive(): boolean {
    return this.active;
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  get collisionRadius(): number {
    return PROJECTILE_COLLISION_RADIUS;
  }

  get damage(): number {
    return this.damageValue;
  }

  spawn(x: number, y: number, angle: number, options?: Partial<ProjectileLaunchOptions>): void {
    const speed = options?.speed ?? PROJECTILE_SPEED;
    this.active = true;
    this.startX = x;
    this.startY = y;
    this.range = options?.range ?? runtimeBalance.player.projectileRange;
    this.damageValue = options?.damage ?? runtimeBalance.player.projectileDamage;
    this.velocityX = Math.cos(angle) * speed;
    this.velocityY = Math.sin(angle) * speed;
    this.body.setPosition(x, y);
    this.body.setRotation(angle);
    this.body.setVisible(true);
    this.redraw();
  }

  update(deltaSeconds: number, deltaMs: number): void {
    if (!this.active) {
      return;
    }

    this.body.x += this.velocityX * deltaSeconds;
    this.body.y += this.velocityY * deltaSeconds;
    this.redraw();

    const travelledX = this.body.x - this.startX;
    const travelledY = this.body.y - this.startY;

    if (
      travelledX * travelledX + travelledY * travelledY >= this.range * this.range ||
      this.body.x < 0 ||
      this.body.y < 0 ||
      this.body.x > WORLD_WIDTH ||
      this.body.y > WORLD_HEIGHT
    ) {
      this.despawn();
    }
  }

  despawn(): void {
    this.active = false;
    this.body.setVisible(false);
    this.body.clear();
  }

  destroy(): void {
    this.body.destroy();
  }

  private redraw(): void {
    const travelled = Math.hypot(this.body.x - this.startX, this.body.y - this.startY);
    const agePercent = Phaser.Math.Clamp(travelled / this.range, 0, 1);
    const alpha = 1 - agePercent * 0.28;
    const pulse = 0.8 + Math.sin(agePercent * Math.PI * 8) * 0.08;

    this.body.clear();
    this.body.lineStyle(18, 0xef4444, 0.1 * alpha);
    this.body.beginPath();
    this.body.moveTo(-42, 0);
    this.body.lineTo(20, 0);
    this.body.strokePath();

    this.body.lineStyle(8 * pulse, 0xff1f1f, 0.46 * alpha);
    this.body.beginPath();
    this.body.moveTo(-36, 0);
    this.body.lineTo(22, 0);
    this.body.strokePath();

    this.body.lineStyle(3, 0xfff1f2, 0.92 * alpha);
    this.body.beginPath();
    this.body.moveTo(-24, 0);
    this.body.lineTo(24, 0);
    this.body.strokePath();

    this.body.fillStyle(0xfff1f2, 0.95 * alpha);
    this.body.fillCircle(25, 0, 3.5);
    this.body.fillStyle(0xef4444, 0.48 * alpha);
    this.body.fillCircle(20, 0, 9);
  }
}
