import Phaser from 'phaser';
import type { ProjectileSnapshot } from '@burningspace/shared';

const POSITION_SMOOTHING = 28;
const ROTATION_SMOOTHING = 24;
const SNAP_DISTANCE = 420;

export class NetworkProjectileView {
  private readonly container: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Rectangle;
  private readonly core: Phaser.GameObjects.Rectangle;
  private targetX: number;
  private targetY: number;
  private targetRotation: number;

  constructor(scene: Phaser.Scene, projectile: ProjectileSnapshot) {
    this.targetX = projectile.x;
    this.targetY = projectile.y;
    this.targetRotation = projectile.rotation;

    const tint = projectile.faction === 'red' ? 0xff4545 : 0x38bdf8;
    this.glow = scene.add.rectangle(0, 0, 42, 8, tint, 0.25);
    this.core = scene.add.rectangle(0, 0, 30, 4, tint, 0.95);
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    this.core.setBlendMode(Phaser.BlendModes.ADD);

    this.container = scene.add.container(projectile.x, projectile.y, [this.glow, this.core]);
    this.container.setRotation(projectile.rotation);
    this.container.setDepth(21);
  }

  updateTarget(projectile: ProjectileSnapshot): void {
    this.targetX = projectile.x;
    this.targetY = projectile.y;
    this.targetRotation = projectile.rotation;

    const tint = projectile.faction === 'red' ? 0xff4545 : 0x38bdf8;
    this.glow.setFillStyle(tint, 0.25);
    this.core.setFillStyle(tint, 0.95);

    const distance = Phaser.Math.Distance.Between(this.container.x, this.container.y, projectile.x, projectile.y);

    if (distance > SNAP_DISTANCE) {
      this.container.setPosition(projectile.x, projectile.y);
      this.container.setRotation(projectile.rotation);
    }
  }

  update(deltaSeconds: number): void {
    const positionAlpha = 1 - Math.exp(-POSITION_SMOOTHING * deltaSeconds);
    const rotationAlpha = 1 - Math.exp(-ROTATION_SMOOTHING * deltaSeconds);
    this.container.x = Phaser.Math.Linear(this.container.x, this.targetX, positionAlpha);
    this.container.y = Phaser.Math.Linear(this.container.y, this.targetY, positionAlpha);

    const rotationDelta = Phaser.Math.Angle.Wrap(this.targetRotation - this.container.rotation);
    this.container.rotation = Phaser.Math.Angle.Wrap(this.container.rotation + rotationDelta * rotationAlpha);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
