import Phaser from 'phaser';
import { ASTEROID_MAX_HEALTH } from '../config/gameConfig';

type AsteroidPoint = {
  x: number;
  y: number;
};

export class Asteroid {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly points: AsteroidPoint[] = [];
  private rotationSpeed = 0;
  private radiusValue = 60;
  private healthValue = ASTEROID_MAX_HEALTH;
  private alive = false;
  private damaged = false;

  constructor(scene: Phaser.Scene, readonly id: number) {
    this.scene = scene;
    this.body = scene.add.graphics();
    this.healthBar = scene.add.graphics();
    this.container = scene.add.container(0, 0, [this.body, this.healthBar]);
    this.container.setDepth(10);
    this.container.setVisible(false);
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  get radius(): number {
    return this.radiusValue;
  }

  get health(): number {
    return this.healthValue;
  }

  get maxHealth(): number {
    return ASTEROID_MAX_HEALTH;
  }

  get isAlive(): boolean {
    return this.alive;
  }

  activate(x: number, y: number, radius: number): void {
    this.radiusValue = radius;
    this.healthValue = ASTEROID_MAX_HEALTH;
    this.alive = true;
    this.damaged = false;
    this.rotationSpeed = Phaser.Math.FloatBetween(-0.22, 0.22);
    this.container.setPosition(x, y);
    this.container.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    this.container.setAlpha(1);
    this.container.setVisible(true);
    this.generateShape();
    this.redrawBody();
    this.drawHealthBar();
    this.healthBar.setRotation(-this.container.rotation);
  }

  update(deltaSeconds: number): void {
    if (!this.alive) {
      return;
    }

    this.container.rotation += this.rotationSpeed * deltaSeconds;
    this.healthBar.setRotation(-this.container.rotation);
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) {
      return false;
    }

    this.healthValue = Math.max(0, this.healthValue - amount);
    this.damaged = true;
    this.drawHealthBar();
    this.createHitEffect();

    if (this.healthValue <= 0) {
      this.destroyAsteroid();
    }

    return true;
  }

  deactivate(): void {
    this.alive = false;
    this.container.setVisible(false);
    this.body.clear();
    this.healthBar.clear();
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private generateShape(): void {
    this.points.length = 0;
    const pointCount = Phaser.Math.Between(10, 15);

    for (let i = 0; i < pointCount; i += 1) {
      const angle = (i / pointCount) * Math.PI * 2;
      const roughness = Phaser.Math.FloatBetween(0.78, 1.16);
      this.points.push({
        x: Math.cos(angle) * this.radiusValue * roughness,
        y: Math.sin(angle) * this.radiusValue * roughness
      });
    }
  }

  private redrawBody(): void {
    this.body.clear();
    const baseColor = Phaser.Math.RND.pick([0x4b4540, 0x55514c, 0x3f4447, 0x5a5148]);
    const edgeColor = Phaser.Display.Color.ValueToColor(baseColor).brighten(28).color;

    this.body.fillStyle(baseColor, 0.98);
    this.body.lineStyle(2, edgeColor, 0.72);
    this.body.beginPath();
    this.body.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 1; i < this.points.length; i += 1) {
      this.body.lineTo(this.points[i].x, this.points[i].y);
    }

    this.body.closePath();
    this.body.fillPath();
    this.body.strokePath();

    const craterCount = Phaser.Math.Between(3, 5);
    for (let i = 0; i < craterCount; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(this.radiusValue * 0.12, this.radiusValue * 0.58);
      const craterRadius = Phaser.Math.FloatBetween(this.radiusValue * 0.07, this.radiusValue * 0.15);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      this.body.fillStyle(0x171717, 0.24);
      this.body.fillCircle(x, y, craterRadius);
      this.body.lineStyle(1, 0xcbd5e1, 0.16);
      this.body.strokeCircle(x, y, craterRadius * 0.86);
    }
  }

  private drawHealthBar(): void {
    this.healthBar.clear();

    if (!this.damaged || !this.alive) {
      return;
    }

    const width = Math.max(46, this.radiusValue * 1.25);
    const height = 6;
    const x = -width / 2;
    const y = -this.radiusValue - 18;
    const percent = Phaser.Math.Clamp(this.healthValue / ASTEROID_MAX_HEALTH, 0, 1);

    this.healthBar.fillStyle(0x020617, 0.78);
    this.healthBar.fillRoundedRect(x, y, width, height, 2);
    this.healthBar.fillStyle(0xf97316, 0.95);
    this.healthBar.fillRoundedRect(x + 1, y + 1, Math.max(0, (width - 2) * percent), height - 2, 2);
    this.healthBar.lineStyle(1, 0xe2e8f0, 0.35);
    this.healthBar.strokeRoundedRect(x, y, width, height, 2);
  }

  private createHitEffect(): void {
    const spark = this.scene.add.circle(this.x, this.y, 6, 0xfff1f2, 0.82);
    spark.setDepth(28);
    spark.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: spark,
      alpha: 0,
      scale: 2.6,
      duration: 160,
      ease: 'Sine.easeOut',
      onComplete: () => {
        spark.destroy();
      }
    });
  }

  private destroyAsteroid(): void {
    this.alive = false;
    this.createDestructionEffect();
    this.container.setVisible(false);
    this.body.clear();
    this.healthBar.clear();
  }

  private createDestructionEffect(): void {
    const burst = this.scene.add.graphics();
    burst.setPosition(this.x, this.y);
    burst.setDepth(27);
    burst.setBlendMode(Phaser.BlendModes.ADD);
    burst.lineStyle(3, 0xf8fafc, 0.46);
    burst.strokeCircle(0, 0, this.radiusValue * 0.62);
    burst.lineStyle(2, 0xf97316, 0.58);
    burst.strokeCircle(0, 0, this.radiusValue);

    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = this.radiusValue * Phaser.Math.FloatBetween(0.25, 0.72);
      burst.fillStyle(0xcbd5e1, 0.52);
      burst.fillCircle(Math.cos(angle) * distance, Math.sin(angle) * distance, Phaser.Math.FloatBetween(2, 4));
    }

    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 1.9,
      duration: 420,
      ease: 'Sine.easeOut',
      onComplete: () => {
        burst.destroy();
      }
    });
  }
}
