import Phaser from 'phaser';
import {
  NPC_PROJECTILE_COLLISION_RADIUS,
  NPC_PROJECTILE_DAMAGE,
  NPC_PROJECTILE_RANGE,
  NPC_PROJECTILE_SPEED,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';
import { runtimeBalance } from '../config/runtimeBalance';

type NpcProjectileLaunchOptions = {
  damage: number;
  speed: number;
  range: number;
};

export class NpcProjectile {
  readonly ownerId: string;
  readonly faction = 'blue';
  private readonly body: Phaser.GameObjects.Graphics;
  private velocityX = 0;
  private velocityY = 0;
  private startX = 0;
  private startY = 0;
  private range = NPC_PROJECTILE_RANGE;
  private damageValue = NPC_PROJECTILE_DAMAGE;
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

  get damage(): number {
    return this.damageValue;
  }

  spawn(x: number, y: number, angle: number, options?: Partial<NpcProjectileLaunchOptions>): void {
    const speed = options?.speed ?? runtimeBalance.npc.projectileSpeed;
    this.active = true;
    this.startX = x;
    this.startY = y;
    this.range = options?.range ?? runtimeBalance.npc.projectileRange;
    this.damageValue = options?.damage ?? runtimeBalance.npc.projectileDamage;
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
