import Phaser from 'phaser';
import {
  BLUE_BASE_SPAWN_X,
  BLUE_BASE_SPAWN_Y,
  NPC_COLLISION_RADIUS,
  NPC_DRAG,
  NPC_RESPAWN_INVULNERABILITY_MS,
  NPC_ROTATION_SMOOTHING,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';
import { runtimeBalance } from '../config/runtimeBalance';
import { approachZero, clamp, magnitude, normalizeVector, shortestAngleStep } from '../utils/math';

export type NpcMoveCommand = {
  thrustX: number;
  thrustY: number;
  faceX: number;
  faceY: number;
};

export class NpcShip {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly shipSprite: Phaser.GameObjects.Image;
  private readonly engineGlow: Phaser.GameObjects.Graphics;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly repairGlow: Phaser.GameObjects.Graphics;
  private readonly spriteBaseScaleX: number;
  private readonly spriteBaseScaleY: number;
  private velocityX = 0;
  private velocityY = 0;
  private healthValue = runtimeBalance.npc.maxHealth;
  private alive = true;
  private damaged = false;
  private enginePower = 0;
  private enginePhase = 0;
  private bank = 0;
  private invulnerableUntil = 0;
  private repairing = false;

  constructor(scene: Phaser.Scene, readonly id: string, x = BLUE_BASE_SPAWN_X, y = BLUE_BASE_SPAWN_Y) {
    this.scene = scene;
    this.engineGlow = scene.add.graphics();
    this.engineGlow.setBlendMode(Phaser.BlendModes.ADD);

    this.repairGlow = scene.add.graphics();
    this.repairGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.repairGlow.setVisible(false);

    this.shipSprite = scene.add.image(0, 0, 'player-ship');
    this.shipSprite.setOrigin(0.5);
    this.shipSprite.setDisplaySize(142, 142);
    this.shipSprite.setRotation(Math.PI / 2);
    this.shipSprite.setTint(0x38bdf8, 0x7dd3fc, 0x0ea5e9, 0x1d4ed8);
    this.spriteBaseScaleX = this.shipSprite.scaleX;
    this.spriteBaseScaleY = this.shipSprite.scaleY;

    this.healthBar = scene.add.graphics();
    this.container = scene.add.container(x, y, [this.repairGlow, this.engineGlow, this.shipSprite, this.healthBar]);
    this.container.setDepth(19);

    this.redraw();
    this.drawHealthBar();
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

  get health(): number {
    return this.healthValue;
  }

  get maxHealth(): number {
    return runtimeBalance.npc.maxHealth;
  }

  get isAlive(): boolean {
    return this.alive;
  }

  get isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil;
  }

  get collisionRadius(): number {
    return NPC_COLLISION_RADIUS;
  }

  update(command: NpcMoveCommand, deltaSeconds: number): void {
    if (!this.alive) {
      return;
    }

    this.updateInvulnerabilityVisual();
    this.updateRepairVisual();
    this.healthValue = Math.min(this.healthValue, runtimeBalance.npc.maxHealth);

    const thrust = normalizeVector(command.thrustX, command.thrustY);
    const thrusting = thrust.lengthSq() > 0;

    if (thrusting) {
      this.velocityX += thrust.x * runtimeBalance.npc.acceleration * deltaSeconds;
      this.velocityY += thrust.y * runtimeBalance.npc.acceleration * deltaSeconds;
    } else {
      const dragAmount = NPC_DRAG * deltaSeconds;
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

    const targetAngle = Phaser.Math.Angle.Between(nextX, nextY, command.faceX, command.faceY);
    const smoothing = 1 - Math.exp(-NPC_ROTATION_SMOOTHING * deltaSeconds);
    const currentRotation = this.container.rotation;
    const rotation = shortestAngleStep(currentRotation, targetAngle, smoothing);
    const turnRate = Phaser.Math.Angle.Wrap(rotation - currentRotation) / Math.max(deltaSeconds, 0.001);
    this.container.setRotation(rotation);

    const targetBank = Phaser.Math.Clamp(turnRate / 5.4, -1, 1);
    const bankSmoothing = 1 - Math.exp(-10 * deltaSeconds);
    this.bank = Phaser.Math.Linear(this.bank, targetBank, bankSmoothing);

    const speedPercent = Phaser.Math.Clamp(this.speed / runtimeBalance.npc.maxSpeed, 0, 1);
    const targetEnginePower = thrusting ? Phaser.Math.Clamp(0.42 + speedPercent * 0.62, 0.42, 0.9) : speedPercent * 0.2;
    const engineSmoothing = 1 - Math.exp(-10 * deltaSeconds);
    this.enginePower = Phaser.Math.Linear(this.enginePower, targetEnginePower, engineSmoothing);
    this.enginePhase += deltaSeconds * (8 + this.enginePower * 18);

    this.redraw();
    this.drawHealthBar();
  }

  takeDamage(amount: number): boolean {
    if (!this.alive || this.isInvulnerable) {
      return false;
    }

    this.healthValue = Math.max(0, this.healthValue - amount);
    this.damaged = true;
    this.drawHealthBar();
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

    this.healthValue = Math.min(runtimeBalance.npc.maxHealth, this.healthValue + amount);

    if (this.healthValue >= runtimeBalance.npc.maxHealth) {
      this.healthValue = runtimeBalance.npc.maxHealth;
      this.damaged = false;
    }

    this.drawHealthBar();
  }

  setRepairing(value: boolean): void {
    this.repairing = value;
    this.repairGlow.setVisible(value && this.alive);
  }

  stop(): void {
    this.velocityX = 0;
    this.velocityY = 0;
    this.enginePower = 0;
  }

  respawn(): void {
    this.alive = true;
    this.healthValue = runtimeBalance.npc.maxHealth;
    this.damaged = false;
    this.repairing = false;
    this.velocityX = 0;
    this.velocityY = 0;
    this.container.setPosition(BLUE_BASE_SPAWN_X, BLUE_BASE_SPAWN_Y);
    this.container.setRotation(-Math.PI * 0.75);
    this.container.setAlpha(1);
    this.container.setVisible(true);
    this.repairGlow.setVisible(false);
    this.invulnerableUntil = this.scene.time.now + NPC_RESPAWN_INVULNERABILITY_MS;
    this.drawHealthBar();
  }

  kill(): void {
    if (!this.alive) {
      return;
    }

    this.healthValue = 0;
    this.die();
  }

  teleportTo(x: number, y: number): void {
    this.container.setPosition(clamp(x, 0, WORLD_WIDTH), clamp(y, 0, WORLD_HEIGHT));
    this.velocityX = 0;
    this.velocityY = 0;
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

    const push = Math.min(34, penetration * 0.48);
    const normalX = dx / distance;
    const normalY = dy / distance;
    this.container.setPosition(
      clamp(this.container.x + normalX * push, 0, WORLD_WIDTH),
      clamp(this.container.y + normalY * push, 0, WORLD_HEIGHT)
    );
    this.velocityX = approachZero(this.velocityX, Math.abs(this.velocityX) * 0.32 + 16);
    this.velocityY = approachZero(this.velocityY, Math.abs(this.velocityY) * 0.32 + 16);
  }

  getMuzzlePosition(offset = 76): Phaser.Math.Vector2 {
    return this.localToWorld(offset, 0);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private die(): void {
    if (!this.alive) {
      return;
    }

    this.alive = false;
    this.repairing = false;
    this.stop();
    this.createDeathEffect();
    this.container.setVisible(false);
    this.healthBar.clear();
  }

  private limitSpeed(): void {
    const currentSpeed = this.speed;

    if (currentSpeed <= runtimeBalance.npc.maxSpeed) {
      return;
    }

    const scale = runtimeBalance.npc.maxSpeed / currentSpeed;
    this.velocityX *= scale;
    this.velocityY *= scale;
  }

  private drawHealthBar(): void {
    this.healthBar.clear();

    if (!this.alive || (!this.damaged && this.healthValue >= runtimeBalance.npc.maxHealth)) {
      return;
    }

    const width = 76;
    const height = 6;
    const x = -width / 2;
    const y = -86;
    const percent = Phaser.Math.Clamp(this.healthValue / runtimeBalance.npc.maxHealth, 0, 1);

    this.healthBar.setRotation(-this.container.rotation);
    this.healthBar.fillStyle(0x020617, 0.78);
    this.healthBar.fillRoundedRect(x, y, width, height, 2);
    this.healthBar.fillStyle(0x38bdf8, 0.95);
    this.healthBar.fillRoundedRect(x + 1, y + 1, Math.max(0, (width - 2) * percent), height - 2, 2);
    this.healthBar.lineStyle(1, 0xe0f2fe, 0.38);
    this.healthBar.strokeRoundedRect(x, y, width, height, 2);
  }

  private redraw(): void {
    this.engineGlow.clear();
    this.repairGlow.clear();

    const bankAmount = Math.abs(this.bank);
    this.shipSprite.setRotation(Math.PI / 2 + this.bank * 0.07);
    this.shipSprite.setScale(
      this.spriteBaseScaleX * (1 + bankAmount * 0.018),
      this.spriteBaseScaleY * (1 - bankAmount * 0.055)
    );

    const flicker = 0.82 + Math.sin(this.enginePhase) * 0.12 + Math.sin(this.enginePhase * 2.4) * 0.05;
    const engineAlpha = Phaser.Math.Clamp(this.enginePower * flicker, 0, 0.92);

    if (engineAlpha > 0.02) {
      const plumeLength = 24 + engineAlpha * 38;

      this.engineGlow.fillStyle(0x0ea5e9, 0.12 * engineAlpha);
      this.engineGlow.fillEllipse(-78 - plumeLength * 0.12, 0, plumeLength, 22 + engineAlpha * 8);
      this.engineGlow.fillStyle(0x38bdf8, 0.28 * engineAlpha);
      this.engineGlow.fillTriangle(-60, -13, -60, 13, -70 - plumeLength, 0);
      this.engineGlow.fillStyle(0xe0f2fe, 0.58 * engineAlpha);
      this.engineGlow.fillTriangle(-63, -5, -63, 5, -70 - plumeLength * 0.44, 0);
    }

    if (this.repairing) {
      const repairAlpha = 0.14 + Math.sin(this.scene.time.now * 0.006) * 0.05;
      this.repairGlow.fillStyle(0x38bdf8, repairAlpha);
      this.repairGlow.fillCircle(0, 0, 104);
      this.repairGlow.lineStyle(2, 0xe0f2fe, repairAlpha * 1.3);
      this.repairGlow.strokeCircle(0, 0, 118);
    }
  }

  private flashDamage(): void {
    this.scene.tweens.add({
      targets: this.shipSprite,
      alpha: { from: 0.38, to: 1 },
      duration: 120,
      ease: 'Sine.easeOut'
    });
  }

  private createDeathEffect(): void {
    const burst = this.scene.add.graphics();
    burst.setDepth(24);
    burst.setPosition(this.container.x, this.container.y);
    burst.setBlendMode(Phaser.BlendModes.ADD);
    burst.fillStyle(0xe0f2fe, 0.88);
    burst.fillCircle(0, 0, 16);
    burst.lineStyle(4, 0x38bdf8, 0.66);
    burst.strokeCircle(0, 0, 42);
    burst.lineStyle(2, 0x0ea5e9, 0.72);
    burst.strokeCircle(0, 0, 68);

    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 2,
      duration: 430,
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

    const pulse = 0.66 + Math.sin(this.scene.time.now * 0.017) * 0.2;
    this.container.setAlpha(pulse);
  }

  private updateRepairVisual(): void {
    this.repairGlow.setVisible(this.repairing && this.alive);
  }

  private localToWorld(localX: number, localY: number): Phaser.Math.Vector2 {
    const spriteBankRotation = this.shipSprite.rotation - Math.PI / 2;
    const spriteCos = Math.cos(spriteBankRotation);
    const spriteSin = Math.sin(spriteBankRotation);
    const bankedX = spriteCos * localX - spriteSin * localY * (this.shipSprite.scaleY / this.spriteBaseScaleY);
    const bankedY = spriteSin * localX + spriteCos * localY * (this.shipSprite.scaleY / this.spriteBaseScaleY);
    const cos = Math.cos(this.container.rotation);
    const sin = Math.sin(this.container.rotation);

    return new Phaser.Math.Vector2(
      this.container.x + cos * bankedX - sin * bankedY,
      this.container.y + sin * bankedX + cos * bankedY
    );
  }
}
