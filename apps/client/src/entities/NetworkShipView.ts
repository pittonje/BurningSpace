import Phaser from 'phaser';
import type { ShipSnapshot } from '@burningspace/shared';

const SNAP_DISTANCE = 700;
const POSITION_SMOOTHING = 14;
const ROTATION_SMOOTHING = 18;
const HEALTH_BAR_WIDTH = 72;
const HEALTH_BAR_HEIGHT = 6;

export class NetworkShipView {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly shipContainer: Phaser.GameObjects.Container;
  private readonly hudContainer: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly selfMarker: Phaser.GameObjects.Arc;
  private readonly healthBack: Phaser.GameObjects.Rectangle;
  private readonly healthFill: Phaser.GameObjects.Rectangle;
  private targetX: number;
  private targetY: number;
  private targetRotation: number;
  private health: number;
  private maxHealth: number;
  private alive: boolean;
  private invulnerableUntil: number;

  constructor(scene: Phaser.Scene, ship: ShipSnapshot, isOwnShip: boolean) {
    this.scene = scene;
    this.targetX = ship.x;
    this.targetY = ship.y;
    this.targetRotation = ship.rotation;
    this.health = ship.health;
    this.maxHealth = ship.maxHealth;
    this.alive = ship.alive;
    this.invulnerableUntil = ship.invulnerableUntil;
    this.sprite = scene.add.image(0, 0, 'player-ship');
    this.sprite.setDisplaySize(142, 142);
    this.sprite.setRotation(Math.PI / 2);
    this.sprite.setTint(ship.faction === 'red' ? 0xff6666 : 0x55c7ff);

    this.label = scene.add.text(0, -92, ship.nickname, {
      color: ship.faction === 'red' ? '#fecaca' : '#bae6fd',
      fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      fontSize: '14px',
      stroke: '#020617',
      strokeThickness: 4
    });
    this.label.setOrigin(0.5);

    this.selfMarker = scene.add.circle(0, 0, 78, 0xffffff, 0);
    this.selfMarker.setStrokeStyle(2, 0xf8fafc, isOwnShip ? 0.48 : 0);

    this.healthBack = scene.add.rectangle(0, -70, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 0x020617, 0.72);
    this.healthBack.setStrokeStyle(1, 0xe2e8f0, 0.38);
    this.healthFill = scene.add.rectangle(-HEALTH_BAR_WIDTH / 2, -70, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 0x22c55e, 0.95);
    this.healthFill.setOrigin(0, 0.5);

    this.shipContainer = scene.add.container(0, 0, [this.selfMarker, this.sprite]);
    this.shipContainer.setRotation(ship.rotation);
    this.hudContainer = scene.add.container(0, 0, [this.label, this.healthBack, this.healthFill]);
    this.container = scene.add.container(ship.x, ship.y, [this.shipContainer, this.hudContainer]);
    this.container.setDepth(isOwnShip ? 24 : 22);
    this.updateHealthBar();
    this.updateAliveVisibility();
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  getDisplayX(): number {
    return this.container.x;
  }

  getDisplayY(): number {
    return this.container.y;
  }

  updateTarget(ship: ShipSnapshot, isOwnShip: boolean): void {
    if (this.alive && !ship.alive) {
      this.createDeathEffect(ship);
    }

    this.targetX = ship.x;
    this.targetY = ship.y;
    this.targetRotation = ship.rotation;
    this.health = ship.health;
    this.maxHealth = ship.maxHealth;
    this.alive = ship.alive;
    this.invulnerableUntil = ship.invulnerableUntil;
    this.label.setText(ship.nickname);
    this.sprite.setTint(ship.faction === 'red' ? 0xff6666 : 0x55c7ff);
    this.label.setColor(ship.faction === 'red' ? '#fecaca' : '#bae6fd');
    this.selfMarker.setStrokeStyle(2, 0xf8fafc, isOwnShip ? 0.48 : 0);
    this.container.setDepth(isOwnShip ? 24 : 22);

    const distance = Phaser.Math.Distance.Between(this.container.x, this.container.y, ship.x, ship.y);

    if (distance > SNAP_DISTANCE) {
      this.container.setPosition(ship.x, ship.y);
      this.shipContainer.setRotation(ship.rotation);
    }

    this.updateHealthBar();
    this.updateAliveVisibility();
  }

  update(deltaSeconds: number, serverNowMs: number): void {
    const positionAlpha = 1 - Math.exp(-POSITION_SMOOTHING * deltaSeconds);
    const rotationAlpha = 1 - Math.exp(-ROTATION_SMOOTHING * deltaSeconds);
    this.container.x = Phaser.Math.Linear(this.container.x, this.targetX, positionAlpha);
    this.container.y = Phaser.Math.Linear(this.container.y, this.targetY, positionAlpha);

    const rotationDelta = Phaser.Math.Angle.Wrap(this.targetRotation - this.shipContainer.rotation);
    this.shipContainer.rotation = Phaser.Math.Angle.Wrap(this.shipContainer.rotation + rotationDelta * rotationAlpha);

    if (this.alive && serverNowMs < this.invulnerableUntil) {
      this.container.setAlpha(0.54 + Math.sin(this.scene.time.now * 0.018) * 0.22);
    } else {
      this.container.setAlpha(1);
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private updateHealthBar(): void {
    const ratio = this.maxHealth > 0 ? Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1) : 0;
    const color = ratio > 0.55 ? 0x22c55e : ratio > 0.25 ? 0xfacc15 : 0xef4444;
    this.healthFill.setFillStyle(color, 0.95);
    this.healthFill.setDisplaySize(Math.max(1, HEALTH_BAR_WIDTH * ratio), HEALTH_BAR_HEIGHT);
  }

  private updateAliveVisibility(): void {
    this.container.setVisible(this.alive);
    this.healthBack.setVisible(this.alive);
    this.healthFill.setVisible(this.alive);
  }

  private createDeathEffect(ship: ShipSnapshot): void {
    const color = ship.faction === 'red' ? 0xff6666 : 0x55c7ff;
    const ring = this.scene.add.circle(this.container.x, this.container.y, 18, color, 0);
    ring.setStrokeStyle(3, color, 0.95);
    ring.setDepth(30);

    const flash = this.scene.add.circle(this.container.x, this.container.y, 20, color, 0.42);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    flash.setDepth(29);

    this.scene.tweens.add({
      targets: ring,
      radius: 132,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });
    this.scene.tweens.add({
      targets: flash,
      radius: 96,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy()
    });
  }
}
