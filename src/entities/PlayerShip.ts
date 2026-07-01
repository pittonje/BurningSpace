import Phaser from 'phaser';
import {
  PLAYER_ACCELERATION,
  PLAYER_COLLISION_RADIUS,
  PLAYER_DRAG,
  PLAYER_HEALTH_REGEN_PER_SECOND,
  PLAYER_MAX_SPEED,
  PLAYER_MAX_HEALTH,
  PLAYER_RESPAWN_DELAY_MS,
  PLAYER_RESPAWN_INVULNERABILITY_MS,
  PLAYER_ROTATION_SMOOTHING,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Y
} from '../config/gameConfig';
import { approachZero, clamp, magnitude, normalizeVector, shortestAngleStep } from '../utils/math';

export type MovementInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export class PlayerShip {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly shipSprite: Phaser.GameObjects.Image;
  private readonly engineGlow: Phaser.GameObjects.Graphics;
  private readonly spriteBaseScaleX: number;
  private readonly spriteBaseScaleY: number;
  private velocityX = 0;
  private velocityY = 0;
  private thrusting = false;
  private maxSpeed = PLAYER_MAX_SPEED;
  private enginePower = 0;
  private enginePhase = 0;
  private bank = 0;
  private healthValue = PLAYER_MAX_HEALTH;
  private alive = true;
  private invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.engineGlow = scene.add.graphics();
    this.engineGlow.setBlendMode(Phaser.BlendModes.ADD);

    this.shipSprite = scene.add.image(0, 0, 'player-ship');
    this.shipSprite.setOrigin(0.5);
    this.shipSprite.setDisplaySize(142, 142);
    this.shipSprite.setRotation(Math.PI / 2);
    this.spriteBaseScaleX = this.shipSprite.scaleX;
    this.spriteBaseScaleY = this.shipSprite.scaleY;

    this.container = scene.add.container(x, y, [this.engineGlow, this.shipSprite]);
    this.container.setDepth(20);

    this.redraw();
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  get rotation(): number {
    return this.container.rotation;
  }

  get speed(): number {
    return magnitude(this.velocityX, this.velocityY);
  }

  get speedLimit(): number {
    return this.maxSpeed;
  }

  get health(): number {
    return this.healthValue;
  }

  get maxHealth(): number {
    return PLAYER_MAX_HEALTH;
  }

  get isAlive(): boolean {
    return this.alive;
  }

  get isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil;
  }

  get collisionRadius(): number {
    return PLAYER_COLLISION_RADIUS;
  }

  setSpeedLimit(speedLimit: number): void {
    this.maxSpeed = Math.max(1, speedLimit);
    this.limitSpeed();
  }

  update(input: MovementInput, targetWorld: Phaser.Math.Vector2, deltaSeconds: number): void {
    if (!this.alive) {
      return;
    }

    this.regenerate(deltaSeconds);
    this.updateInvulnerabilityVisual();

    const inputX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const inputY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const thrust = normalizeVector(inputX, inputY);
    this.thrusting = thrust.lengthSq() > 0;
    const speedScale = Math.max(1, Math.sqrt(this.maxSpeed / PLAYER_MAX_SPEED));

    if (this.thrusting) {
      this.velocityX += thrust.x * PLAYER_ACCELERATION * speedScale * deltaSeconds;
      this.velocityY += thrust.y * PLAYER_ACCELERATION * speedScale * deltaSeconds;
    } else {
      const dragAmount = PLAYER_DRAG * speedScale * deltaSeconds;
      this.velocityX = approachZero(this.velocityX, dragAmount);
      this.velocityY = approachZero(this.velocityY, dragAmount);
    }

    this.limitSpeed();

    const nextX = clamp(this.container.x + this.velocityX * deltaSeconds, 0, WORLD_WIDTH);
    const nextY = clamp(this.container.y + this.velocityY * deltaSeconds, 0, WORLD_HEIGHT);

    if (nextX === 0 || nextX === WORLD_WIDTH) {
      this.velocityX = 0;
    }

    if (nextY === 0 || nextY === WORLD_HEIGHT) {
      this.velocityY = 0;
    }

    this.container.setPosition(nextX, nextY);

    const targetAngle = Phaser.Math.Angle.Between(nextX, nextY, targetWorld.x, targetWorld.y);
    const smoothing = 1 - Math.exp(-PLAYER_ROTATION_SMOOTHING * deltaSeconds);
    const currentRotation = this.container.rotation;
    const rotation = shortestAngleStep(currentRotation, targetAngle, smoothing);
    const turnRate = Phaser.Math.Angle.Wrap(rotation - currentRotation) / Math.max(deltaSeconds, 0.001);
    this.container.setRotation(rotation);

    const targetBank = Phaser.Math.Clamp(turnRate / 5.2, -1, 1);
    const bankSmoothing = 1 - Math.exp(-12 * deltaSeconds);
    this.bank = Phaser.Math.Linear(this.bank, targetBank, bankSmoothing);

    const speedPercent = Phaser.Math.Clamp(this.speed / this.maxSpeed, 0, 1);
    const targetEnginePower = this.thrusting ? Phaser.Math.Clamp(0.46 + speedPercent * 0.7, 0.46, 1) : speedPercent * 0.26;
    const engineSmoothing = 1 - Math.exp(-12 * deltaSeconds);
    this.enginePower = Phaser.Math.Linear(this.enginePower, targetEnginePower, engineSmoothing);
    this.enginePhase += deltaSeconds * (9 + this.enginePower * 22);

    this.redraw();
  }

  takeDamage(amount: number): boolean {
    if (!this.alive || this.isInvulnerable) {
      return false;
    }

    this.healthValue = Math.max(0, this.healthValue - amount);
    this.flashDamage();

    if (this.healthValue <= 0) {
      this.die();
    }

    return true;
  }

  heal(amount: number): void {
    if (!this.alive) {
      return;
    }

    this.healthValue = Math.min(PLAYER_MAX_HEALTH, this.healthValue + amount);
  }

  respawn(): void {
    this.alive = true;
    this.healthValue = PLAYER_MAX_HEALTH;
    this.velocityX = 0;
    this.velocityY = 0;
    this.container.setPosition(PLAYER_SPAWN_X, PLAYER_SPAWN_Y);
    this.container.setVisible(true);
    this.container.setAlpha(1);
    this.invulnerableUntil = this.scene.time.now + PLAYER_RESPAWN_INVULNERABILITY_MS;
  }

  separateFrom(worldX: number, worldY: number, minDistance: number): void {
    if (!this.alive) {
      return;
    }

    const dx = this.container.x - worldX;
    const dy = this.container.y - worldY;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const penetration = minDistance - distance;

    if (penetration <= 0) {
      return;
    }

    const push = Math.min(36, penetration * 0.45);
    const normalX = dx / distance;
    const normalY = dy / distance;
    this.container.setPosition(
      clamp(this.container.x + normalX * push, 0, WORLD_WIDTH),
      clamp(this.container.y + normalY * push, 0, WORLD_HEIGHT)
    );
    this.velocityX = approachZero(this.velocityX, Math.abs(this.velocityX) * 0.28 + 18);
    this.velocityY = approachZero(this.velocityY, Math.abs(this.velocityY) * 0.28 + 18);
  }

  getMuzzlePosition(offset = 74): Phaser.Math.Vector2 {
    return this.localToWorld(offset, 0);
  }

  getMuzzlePositions(): [Phaser.Math.Vector2, Phaser.Math.Vector2] {
    return [this.localToWorld(76, -17), this.localToWorld(76, 17)];
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private limitSpeed(): void {
    const currentSpeed = this.speed;

    if (currentSpeed <= this.maxSpeed) {
      return;
    }

    const scale = this.maxSpeed / currentSpeed;
    this.velocityX *= scale;
    this.velocityY *= scale;
  }

  private regenerate(deltaSeconds: number): void {
    if (this.healthValue >= PLAYER_MAX_HEALTH) {
      return;
    }

    this.healthValue = Math.min(
      PLAYER_MAX_HEALTH,
      this.healthValue + PLAYER_HEALTH_REGEN_PER_SECOND * deltaSeconds
    );
  }

  private die(): void {
    if (!this.alive) {
      return;
    }

    this.alive = false;
    this.velocityX = 0;
    this.velocityY = 0;
    this.enginePower = 0;
    this.createDeathEffect();
    this.container.setVisible(false);

    this.scene.time.delayedCall(PLAYER_RESPAWN_DELAY_MS, () => {
      this.respawn();
    });
  }

  private flashDamage(): void {
    this.scene.tweens.add({
      targets: this.shipSprite,
      alpha: { from: 0.45, to: 1 },
      duration: 120,
      ease: 'Sine.easeOut'
    });
  }

  private createDeathEffect(): void {
    const burst = this.scene.add.graphics();
    burst.setDepth(24);
    burst.setPosition(this.container.x, this.container.y);
    burst.setBlendMode(Phaser.BlendModes.ADD);
    burst.fillStyle(0xfff1f2, 0.9);
    burst.fillCircle(0, 0, 18);
    burst.lineStyle(5, 0xef4444, 0.62);
    burst.strokeCircle(0, 0, 44);
    burst.lineStyle(2, 0xf97316, 0.74);
    burst.strokeCircle(0, 0, 70);

    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 2.1,
      duration: 460,
      ease: 'Sine.easeOut',
      onComplete: () => {
        burst.destroy();
      }
    });
  }

  private updateInvulnerabilityVisual(): void {
    if (!this.isInvulnerable) {
      this.container.setAlpha(1);
      return;
    }

    const pulse = 0.62 + Math.sin(this.scene.time.now * 0.018) * 0.22;
    this.container.setAlpha(pulse);
  }

  private redraw(): void {
    this.engineGlow.clear();

    const bankAmount = Math.abs(this.bank);
    this.shipSprite.setRotation(Math.PI / 2 + this.bank * 0.07);
    this.shipSprite.setScale(
      this.spriteBaseScaleX * (1 + bankAmount * 0.018),
      this.spriteBaseScaleY * (1 - bankAmount * 0.055)
    );
    this.shipSprite.setY(0);

    this.engineGlow.setScale(1, 1 + bankAmount * 0.04);
    this.engineGlow.setRotation(this.bank * 0.025);
    this.engineGlow.setY(0);

    const flicker = 0.82 + Math.sin(this.enginePhase) * 0.12 + Math.sin(this.enginePhase * 2.7) * 0.06;
    const engineAlpha = Phaser.Math.Clamp(this.enginePower * flicker, 0, 1);

    if (engineAlpha > 0.02) {
      const plumeLength = 30 + engineAlpha * 46;
      const sidePlumeLength = 17 + engineAlpha * 25;

      this.engineGlow.fillStyle(0xef4444, 0.08 * engineAlpha);
      this.engineGlow.fillEllipse(-82 - plumeLength * 0.14, 0, plumeLength * 1.15, 25 + engineAlpha * 10);
      this.engineGlow.fillStyle(0xef4444, 0.26 * engineAlpha);
      this.engineGlow.fillTriangle(-61, -15, -61, 15, -76 - plumeLength, 0);
      this.engineGlow.fillStyle(0xf97316, 0.5 * engineAlpha);
      this.engineGlow.fillTriangle(-64, -8, -64, 8, -72 - plumeLength * 0.72, 0);
      this.engineGlow.fillStyle(0xffffff, 0.7 * engineAlpha);
      this.engineGlow.fillTriangle(-66, -4, -66, 4, -73 - plumeLength * 0.36, 0);

      for (const y of [-30, 30]) {
        this.engineGlow.fillStyle(0xff3b30, 0.32 * engineAlpha);
        this.engineGlow.fillTriangle(-55, y - 5, -55, y + 5, -67 - sidePlumeLength, y);
        this.engineGlow.fillStyle(0xfff1f2, 0.44 * engineAlpha);
        this.engineGlow.fillTriangle(-58, y - 2, -58, y + 2, -66 - sidePlumeLength * 0.45, y);
      }
    }
  }

  private localToWorld(localX: number, localY: number): Phaser.Math.Vector2 {
    const spriteBankRotation = this.shipSprite.rotation - Math.PI / 2;
    const spriteCos = Math.cos(spriteBankRotation);
    const spriteSin = Math.sin(spriteBankRotation);
    const bankedX = spriteCos * localX - spriteSin * localY * (this.shipSprite.scaleY / this.spriteBaseScaleY);
    const bankedY =
      this.shipSprite.y +
      spriteSin * localX +
      spriteCos * localY * (this.shipSprite.scaleY / this.spriteBaseScaleY);
    const cos = Math.cos(this.container.rotation);
    const sin = Math.sin(this.container.rotation);

    return new Phaser.Math.Vector2(
      this.container.x + cos * bankedX - sin * bankedY,
      this.container.y + sin * bankedX + cos * bankedY
    );
  }
}
