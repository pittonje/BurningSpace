import Phaser from 'phaser';
import {
  PROJECTILE_LIFETIME_MS,
  PROJECTILE_SPEED,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';

export class Projectile {
  private readonly body: Phaser.GameObjects.Graphics;
  private velocityX = 0;
  private velocityY = 0;
  private ageMs = 0;
  private active = false;

  constructor(scene: Phaser.Scene) {
    this.body = scene.add.graphics();
    this.body.setDepth(15);
    this.body.setVisible(false);
  }

  get isActive(): boolean {
    return this.active;
  }

  spawn(x: number, y: number, angle: number): void {
    this.active = true;
    this.ageMs = 0;
    this.velocityX = Math.cos(angle) * PROJECTILE_SPEED;
    this.velocityY = Math.sin(angle) * PROJECTILE_SPEED;
    this.body.setPosition(x, y);
    this.body.setRotation(angle);
    this.body.setVisible(true);
    this.redraw();
  }

  update(deltaSeconds: number, deltaMs: number): void {
    if (!this.active) {
      return;
    }

    this.ageMs += deltaMs;
    this.body.x += this.velocityX * deltaSeconds;
    this.body.y += this.velocityY * deltaSeconds;
    this.redraw();

    if (
      this.ageMs >= PROJECTILE_LIFETIME_MS ||
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
    const agePercent = Phaser.Math.Clamp(this.ageMs / PROJECTILE_LIFETIME_MS, 0, 1);
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
