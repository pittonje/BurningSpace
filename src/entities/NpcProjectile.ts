import Phaser from 'phaser';
import {
  NPC_PROJECTILE_COLLISION_RADIUS,
  NPC_PROJECTILE_DAMAGE,
  NPC_PROJECTILE_LIFETIME_MS,
  NPC_PROJECTILE_SPEED,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';

export class NpcProjectile {
  readonly ownerId: string;
  readonly faction = 'blue';
  readonly damage = NPC_PROJECTILE_DAMAGE;
  private readonly body: Phaser.GameObjects.Graphics;
  private velocityX = 0;
  private velocityY = 0;
  private ageMs = 0;
  private active = false;

  constructor(scene: Phaser.Scene, ownerId: string) {
    this.ownerId = ownerId;
    this.body = scene.add.graphics();
    this.body.setDepth(14);
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
    return NPC_PROJECTILE_COLLISION_RADIUS;
  }

  spawn(x: number, y: number, angle: number): void {
    this.active = true;
    this.ageMs = 0;
    this.velocityX = Math.cos(angle) * NPC_PROJECTILE_SPEED;
    this.velocityY = Math.sin(angle) * NPC_PROJECTILE_SPEED;
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
      this.ageMs >= NPC_PROJECTILE_LIFETIME_MS ||
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
    const agePercent = Phaser.Math.Clamp(this.ageMs / NPC_PROJECTILE_LIFETIME_MS, 0, 1);
    const alpha = 1 - agePercent * 0.32;
    const pulse = 0.86 + Math.sin(agePercent * Math.PI * 7) * 0.07;

    this.body.clear();
    this.body.lineStyle(15, 0x38bdf8, 0.09 * alpha);
    this.body.beginPath();
    this.body.moveTo(-34, 0);
    this.body.lineTo(18, 0);
    this.body.strokePath();

    this.body.lineStyle(6 * pulse, 0x0ea5e9, 0.42 * alpha);
    this.body.beginPath();
    this.body.moveTo(-30, 0);
    this.body.lineTo(18, 0);
    this.body.strokePath();

    this.body.lineStyle(2, 0xe0f2fe, 0.84 * alpha);
    this.body.beginPath();
    this.body.moveTo(-18, 0);
    this.body.lineTo(21, 0);
    this.body.strokePath();

    this.body.fillStyle(0xe0f2fe, 0.82 * alpha);
    this.body.fillCircle(20, 0, 2.8);
    this.body.fillStyle(0x38bdf8, 0.42 * alpha);
    this.body.fillCircle(16, 0, 7);
  }
}
