import Phaser from 'phaser';
import {
  BASE_RADIUS,
  CENTRAL_ZONE_RADIUS,
  GRID_STEP,
  MAP_PADDING,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';

type Nebula = {
  x: number;
  y: number;
  radius: number;
  color: number;
  alpha: number;
};

export class SpaceMap {
  private readonly scene: Phaser.Scene;
  private readonly worldLayer: Phaser.GameObjects.Layer;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.worldLayer = scene.add.layer();
    this.worldLayer.setDepth(-50);
  }

  create(): void {
    this.createBackground();
    this.createNebulae();
    this.createGrid();
    this.createBasesAndCenter();
    this.createBorder();
  }

  private createBackground(): void {
    const background = this.scene.add.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      0x030712
    );

    const starfield = this.scene.add.tileSprite(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      'starfield-tile'
    );
    starfield.setAlpha(0.94);

    this.worldLayer.add([background, starfield]);
  }

  private createNebulae(): void {
    const nebulae: Nebula[] = [
      { x: 2450, y: 3600, radius: 900, color: 0x7c3aed, alpha: 0.08 },
      { x: 6400, y: 5200, radius: 1200, color: 0x0891b2, alpha: 0.07 },
      { x: 8750, y: 2700, radius: 820, color: 0xf97316, alpha: 0.045 },
      { x: 9700, y: 8600, radius: 1040, color: 0x2563eb, alpha: 0.07 },
      { x: 4200, y: 9450, radius: 780, color: 0x16a34a, alpha: 0.045 }
    ];

    const random = new Phaser.Math.RandomDataGenerator(['burning-space-nebulae']);
    const graphics = this.scene.add.graphics();
    graphics.setDepth(-35);

    for (const nebula of nebulae) {
      for (let ring = 0; ring < 16; ring += 1) {
        const offsetX = random.realInRange(-nebula.radius * 0.35, nebula.radius * 0.35);
        const offsetY = random.realInRange(-nebula.radius * 0.35, nebula.radius * 0.35);
        const radius = nebula.radius * random.realInRange(0.18, 0.48);
        const alpha = nebula.alpha * random.realInRange(0.35, 1);

        graphics.fillStyle(nebula.color, alpha);
        graphics.fillCircle(nebula.x + offsetX, nebula.y + offsetY, radius);
      }
    }

    this.worldLayer.add(graphics);
  }

  private createGrid(): void {
    const graphics = this.scene.add.graphics();
    graphics.setDepth(-25);
    graphics.lineStyle(1, 0x1f2937, 0.38);

    for (let x = GRID_STEP; x < WORLD_WIDTH; x += GRID_STEP) {
      graphics.lineBetween(x, 0, x, WORLD_HEIGHT);
    }

    for (let y = GRID_STEP; y < WORLD_HEIGHT; y += GRID_STEP) {
      graphics.lineBetween(0, y, WORLD_WIDTH, y);
    }

    graphics.lineStyle(2, 0x475569, 0.48);
    for (let x = GRID_STEP * 3; x < WORLD_WIDTH; x += GRID_STEP * 3) {
      graphics.lineBetween(x, 0, x, WORLD_HEIGHT);
    }

    for (let y = GRID_STEP * 3; y < WORLD_HEIGHT; y += GRID_STEP * 3) {
      graphics.lineBetween(0, y, WORLD_WIDTH, y);
    }

    this.worldLayer.add(graphics);
  }

  private createBasesAndCenter(): void {
    const graphics = this.scene.add.graphics();
    graphics.setDepth(-10);

    this.drawBase(graphics, MAP_PADDING, MAP_PADDING, 0xef4444, 'RED');
    this.drawBase(graphics, WORLD_WIDTH - MAP_PADDING, WORLD_HEIGHT - MAP_PADDING, 0x3b82f6, 'BLUE');

    graphics.lineStyle(3, 0xf8fafc, 0.26);
    graphics.fillStyle(0xf8fafc, 0.035);
    graphics.strokeCircle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, CENTRAL_ZONE_RADIUS);
    graphics.fillCircle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, CENTRAL_ZONE_RADIUS);

    graphics.lineStyle(1, 0xf8fafc, 0.24);
    graphics.lineBetween(WORLD_WIDTH / 2 - 120, WORLD_HEIGHT / 2, WORLD_WIDTH / 2 + 120, WORLD_HEIGHT / 2);
    graphics.lineBetween(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 120, WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 120);

    const label = this.scene.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - CENTRAL_ZONE_RADIUS - 80, 'NEUTRAL CORE', {
        color: '#e5e7eb',
        fontFamily: 'ui-monospace, monospace',
        fontSize: '34px',
        letterSpacing: 2
      })
      .setOrigin(0.5)
      .setAlpha(0.62)
      .setDepth(-8);

    this.worldLayer.add([graphics, label]);
  }

  private createBorder(): void {
    const graphics = this.scene.add.graphics();
    graphics.setDepth(-5);
    graphics.lineStyle(8, 0xf8fafc, 0.75);
    graphics.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.lineStyle(22, 0x38bdf8, 0.12);
    graphics.strokeRect(8, 8, WORLD_WIDTH - 16, WORLD_HEIGHT - 16);
    this.worldLayer.add(graphics);
  }

  private drawBase(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
    labelText: string
  ): void {
    graphics.lineStyle(8, color, 0.9);
    graphics.fillStyle(color, 0.12);
    graphics.strokeCircle(x, y, BASE_RADIUS);
    graphics.fillCircle(x, y, BASE_RADIUS);

    graphics.lineStyle(4, color, 0.72);
    graphics.strokeRect(x - 150, y - 150, 300, 300);
    graphics.lineBetween(x - 260, y, x + 260, y);
    graphics.lineBetween(x, y - 260, x, y + 260);

    const label = this.scene.add
      .text(x, y + BASE_RADIUS + 78, `${labelText} BASE`, {
        color: '#f8fafc',
        fontFamily: 'ui-monospace, monospace',
        fontSize: '34px',
        letterSpacing: 2
      })
      .setOrigin(0.5)
      .setAlpha(0.78)
      .setDepth(-8);

    this.worldLayer.add(label);
  }
}
