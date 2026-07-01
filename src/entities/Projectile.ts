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
    this.body.clear();
    this.body.lineStyle(12, 0x38bdf8, 0.18);
    this.body.beginPath();
    this.body.moveTo(-30, 0);
    this.body.lineTo(6, 0);
    this.body.strokePath();

    this.body.fillStyle(0xe0f2fe, 1);
    this.body.fillCircle(10, 0, 4);
    this.body.fillStyle(0x38bdf8, 0.55);
    this.body.fillCircle(5, 0, 9);
  }
}
