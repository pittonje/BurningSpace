import Phaser from 'phaser';
import {
  PLAYER_ACCELERATION,
  PLAYER_DRAG,
  PLAYER_MAX_SPEED,
  PLAYER_ROTATION_SMOOTHING,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';
import { approachZero, clamp, magnitude, normalizeVector, shortestAngleStep } from '../utils/math';

export type MovementInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export class PlayerShip {
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly engineGlow: Phaser.GameObjects.Graphics;
  private velocityX = 0;
  private velocityY = 0;
  private thrusting = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.engineGlow = scene.add.graphics();
    this.engineGlow.setDepth(18);

    this.body = scene.add.graphics();
    this.body.setDepth(20);
    this.body.setPosition(x, y);
    this.engineGlow.setPosition(x, y);

    this.redraw();
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  get rotation(): number {
    return this.body.rotation;
  }

  get speed(): number {
    return magnitude(this.velocityX, this.velocityY);
  }

  update(input: MovementInput, targetWorld: Phaser.Math.Vector2, deltaSeconds: number): void {
    const inputX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const inputY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const thrust = normalizeVector(inputX, inputY);
    this.thrusting = thrust.lengthSq() > 0;

    if (this.thrusting) {
      this.velocityX += thrust.x * PLAYER_ACCELERATION * deltaSeconds;
      this.velocityY += thrust.y * PLAYER_ACCELERATION * deltaSeconds;
    } else {
      const dragAmount = PLAYER_DRAG * deltaSeconds;
      this.velocityX = approachZero(this.velocityX, dragAmount);
      this.velocityY = approachZero(this.velocityY, dragAmount);
    }

    this.limitSpeed();

    const nextX = clamp(this.body.x + this.velocityX * deltaSeconds, 0, WORLD_WIDTH);
    const nextY = clamp(this.body.y + this.velocityY * deltaSeconds, 0, WORLD_HEIGHT);

    if (nextX === 0 || nextX === WORLD_WIDTH) {
      this.velocityX = 0;
    }

    if (nextY === 0 || nextY === WORLD_HEIGHT) {
      this.velocityY = 0;
    }

    this.body.setPosition(nextX, nextY);
    this.engineGlow.setPosition(nextX, nextY);

    const targetAngle = Phaser.Math.Angle.Between(nextX, nextY, targetWorld.x, targetWorld.y);
    const smoothing = 1 - Math.exp(-PLAYER_ROTATION_SMOOTHING * deltaSeconds);
    const rotation = shortestAngleStep(this.body.rotation, targetAngle, smoothing);
    this.body.setRotation(rotation);
    this.engineGlow.setRotation(rotation);

    this.redraw();
  }

  getMuzzlePosition(offset = 42): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.body.x + Math.cos(this.body.rotation) * offset,
      this.body.y + Math.sin(this.body.rotation) * offset
    );
  }

  destroy(): void {
    this.engineGlow.destroy();
    this.body.destroy();
  }

  private limitSpeed(): void {
    const currentSpeed = this.speed;

    if (currentSpeed <= PLAYER_MAX_SPEED) {
      return;
    }

    const scale = PLAYER_MAX_SPEED / currentSpeed;
    this.velocityX *= scale;
    this.velocityY *= scale;
  }

  private redraw(): void {
    this.body.clear();
    this.engineGlow.clear();

    if (this.thrusting) {
      this.engineGlow.fillStyle(0xf97316, 0.28);
      this.engineGlow.fillTriangle(-52, -16, -52, 16, -18, 0);
      this.engineGlow.fillStyle(0xfacc15, 0.55);
      this.engineGlow.fillTriangle(-42, -8, -42, 8, -16, 0);
    }

    this.body.fillStyle(0xdbeafe, 1);
    this.body.fillTriangle(38, 0, -28, -22, -18, 0);
    this.body.fillTriangle(38, 0, -18, 0, -28, 22);

    this.body.lineStyle(3, 0x38bdf8, 0.95);
    this.body.strokeTriangle(38, 0, -28, -22, -18, 0);
    this.body.strokeTriangle(38, 0, -18, 0, -28, 22);

    this.body.fillStyle(0x0f172a, 1);
    this.body.fillCircle(4, 0, 8);

    this.body.lineStyle(2, 0xf8fafc, 0.95);
    this.body.beginPath();
    this.body.moveTo(36, 0);
    this.body.lineTo(16, 0);
    this.body.strokePath();
  }
}
