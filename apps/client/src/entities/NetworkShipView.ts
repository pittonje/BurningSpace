import Phaser from 'phaser';
import type { ShipSnapshot } from '@burningspace/shared';

const SNAP_DISTANCE = 700;
const POSITION_SMOOTHING = 14;
const ROTATION_SMOOTHING = 18;

export class NetworkShipView {
  private readonly container: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly selfMarker: Phaser.GameObjects.Arc;
  private targetX: number;
  private targetY: number;
  private targetRotation: number;

  constructor(scene: Phaser.Scene, ship: ShipSnapshot, isOwnShip: boolean) {
    this.targetX = ship.x;
    this.targetY = ship.y;
    this.targetRotation = ship.rotation;
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

    this.container = scene.add.container(ship.x, ship.y, [this.selfMarker, this.sprite, this.label]);
    this.container.setDepth(isOwnShip ? 24 : 22);
    this.container.setRotation(ship.rotation);
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  updateTarget(ship: ShipSnapshot, isOwnShip: boolean): void {
    this.targetX = ship.x;
    this.targetY = ship.y;
    this.targetRotation = ship.rotation;
    this.label.setText(ship.nickname);
    this.sprite.setTint(ship.faction === 'red' ? 0xff6666 : 0x55c7ff);
    this.label.setColor(ship.faction === 'red' ? '#fecaca' : '#bae6fd');
    this.selfMarker.setStrokeStyle(2, 0xf8fafc, isOwnShip ? 0.48 : 0);
    this.container.setDepth(isOwnShip ? 24 : 22);

    const distance = Phaser.Math.Distance.Between(this.container.x, this.container.y, ship.x, ship.y);

    if (distance > SNAP_DISTANCE) {
      this.container.setPosition(ship.x, ship.y);
      this.container.setRotation(ship.rotation);
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
