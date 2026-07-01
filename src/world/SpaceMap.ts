import Phaser from 'phaser';
import {
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
    this.createBaseSpaceFields();
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
    background.setDepth(-100);

    const starfield = this.scene.add.tileSprite(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      'starfield-tile'
    );
    starfield.setDepth(-95).setAlpha(0.94);

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

  private createBaseSpaceFields(): void {
    this.drawBaseSpaceTexture({
      textureKey: 'red-base-space',
      x: 680,
      y: 570,
      displayWidth: 2450,
      displayHeight: 1740,
      alpha: 0.66,
      angle: -8
    });

    this.drawBaseSpaceTexture({
      textureKey: 'blue-base-space',
      x: WORLD_WIDTH - 760,
      y: WORLD_HEIGHT - 660,
      displayWidth: 2550,
      displayHeight: 1820,
      alpha: 0.68,
      angle: 172
    });
  }

  private drawBaseSpaceTexture({
    textureKey,
    x,
    y,
    displayWidth,
    displayHeight,
    alpha,
    angle
  }: {
    textureKey: string;
    x: number;
    y: number;
    displayWidth: number;
    displayHeight: number;
    alpha: number;
    angle: number;
  }): void {
    const space = this.scene.add.image(x, y, textureKey);
    space
      .setDepth(-88)
      .setDisplaySize(displayWidth, displayHeight)
      .setAlpha(alpha)
      .setAngle(angle)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: space,
      alpha: { from: alpha * 0.82, to: alpha },
      duration: 5600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    this.worldLayer.add(space);
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

    this.drawRedBase();
    this.drawBlueBase();

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

    graphics.lineStyle(12, 0x020617, 0.92);
    graphics.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.lineStyle(4, 0x0f172a, 0.95);
    graphics.strokeRect(7, 7, WORLD_WIDTH - 14, WORLD_HEIGHT - 14);
    graphics.lineStyle(18, 0x38bdf8, 0.045);
    graphics.strokeRect(14, 14, WORLD_WIDTH - 28, WORLD_HEIGHT - 28);
    graphics.lineStyle(2, 0x1e3a5f, 0.34);
    graphics.strokeRect(23, 23, WORLD_WIDTH - 46, WORLD_HEIGHT - 46);

    this.worldLayer.add(graphics);
  }

  private drawRedBase(): void {
    const sourceWidth = 1672;
    const sourceHeight = 941;
    const displayWidth = 1450;
    const displayHeight = 816;
    const imageLeft = -70;
    const imageTop = -18;
    const toWorld = (sourceX: number, sourceY: number): Phaser.Math.Vector2 =>
      new Phaser.Math.Vector2(
        imageLeft + (sourceX / sourceWidth) * displayWidth,
        imageTop + (sourceY / sourceHeight) * displayHeight
      );
    const commandCore = toWorld(475, 380);
    const beaconPad = toWorld(650, 255);
    const beaconTop = toWorld(650, 128);
    const glow = this.scene.add.ellipse(MAP_PADDING - 30, MAP_PADDING - 10, 1260, 710, 0xef4444, 0.065);
    glow.setDepth(-14).setBlendMode(Phaser.BlendModes.ADD);

    const base = this.scene.add.image(imageLeft, imageTop, 'red-base');
    base
      .setDepth(-12)
      .setOrigin(0, 0)
      .setDisplaySize(displayWidth, displayHeight)
      .setAlpha(0.97);

    const coreGlow = this.scene.add.circle(commandCore.x, commandCore.y, 96, 0xef4444, 0.12);
    coreGlow.setDepth(-9).setBlendMode(Phaser.BlendModes.ADD);

    const beaconBeam = this.scene.add.graphics().setDepth(-9);
    beaconBeam.fillStyle(0xef4444, 0.2);
    beaconBeam.fillTriangle(
      beaconPad.x,
      beaconPad.y,
      beaconTop.x - 85,
      beaconTop.y,
      beaconTop.x + 85,
      beaconTop.y
    );
    beaconBeam.setBlendMode(Phaser.BlendModes.ADD);

    const beaconRings = [
      this.scene.add.ellipse(beaconTop.x, beaconTop.y, 220, 52),
      this.scene.add.ellipse(beaconTop.x, beaconTop.y + 62, 170, 40)
    ];
    for (const ring of beaconRings) {
      ring
        .setDepth(-8)
        .setStrokeStyle(3, 0xef4444, 0.45)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    const beaconCore = this.scene.add.circle(beaconPad.x, beaconPad.y - 10, 34, 0xfca5a5, 0.26);
    beaconCore.setDepth(-8).setBlendMode(Phaser.BlendModes.ADD);

    const lightPoints = [
      { position: toWorld(215, 318), radius: 14 },
      { position: toWorld(430, 300), radius: 13 },
      { position: toWorld(790, 440), radius: 13 },
      { position: toWorld(900, 545), radius: 15 },
      { position: toWorld(525, 720), radius: 13 },
      { position: toWorld(320, 650), radius: 14 },
      { position: toWorld(760, 632), radius: 12 }
    ].map((point) => {
      const light = this.scene.add.circle(point.position.x, point.position.y, point.radius, 0xef4444, 0.22);
      light.setDepth(-8).setBlendMode(Phaser.BlendModes.ADD);
      return light;
    });

    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.035, to: 0.11 },
      scaleX: { from: 0.98, to: 1.04 },
      scaleY: { from: 0.98, to: 1.05 },
      duration: 2700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    this.scene.tweens.add({
      targets: coreGlow,
      alpha: { from: 0.08, to: 0.22 },
      scale: { from: 0.88, to: 1.18 },
      duration: 1280,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    this.scene.tweens.add({
      targets: beaconBeam,
      alpha: { from: 0.28, to: 0.72 },
      duration: 1700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    this.scene.tweens.add({
      targets: beaconRings,
      alpha: { from: 0.34, to: 0.82 },
      scaleX: { from: 0.9, to: 1.08 },
      scaleY: { from: 0.9, to: 1.08 },
      duration: 2050,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    this.scene.tweens.add({
      targets: beaconCore,
      alpha: { from: 0.18, to: 0.42 },
      scale: { from: 0.85, to: 1.25 },
      duration: 910,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    lightPoints.forEach((light, index) => {
      this.scene.tweens.add({
        targets: light,
        alpha: { from: 0.12, to: 0.45 },
        scale: { from: 0.72, to: 1.28 },
        duration: 850 + index * 170,
        delay: index * 120,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    });

    this.worldLayer.add([glow, base, coreGlow, beaconBeam, beaconCore, ...beaconRings, ...lightPoints]);
  }

  private drawBlueBase(): void {
    const x = WORLD_WIDTH - MAP_PADDING;
    const y = WORLD_HEIGHT - MAP_PADDING;
    const sourceWidth = 1535;
    const sourceHeight = 1024;
    const displayWidth = 1350;
    const displayHeight = 900;
    const imageRight = WORLD_WIDTH + 140;
    const imageBottom = WORLD_HEIGHT + 70;
    const imageLeft = imageRight - displayWidth;
    const imageTop = imageBottom - displayHeight;
    const toWorld = (sourceX: number, sourceY: number): Phaser.Math.Vector2 =>
      new Phaser.Math.Vector2(
        imageLeft + (sourceX / sourceWidth) * displayWidth,
        imageTop + (sourceY / sourceHeight) * displayHeight
      );
    const commandCore = toWorld(1010, 570);
    const beaconPad = toWorld(1220, 585);
    const beaconTop = toWorld(1220, 405);
    const glow = this.scene.add.ellipse(x + 170, y + 110, 1500, 740, 0x0ea5e9, 0.07);
    glow.setDepth(-14).setBlendMode(Phaser.BlendModes.ADD);

    const base = this.scene.add.image(imageRight, imageBottom, 'blue-base');
    base
      .setDepth(-12)
      .setOrigin(1, 1)
      .setDisplaySize(displayWidth, displayHeight)
      .setAlpha(0.97);

    const coreGlow = this.scene.add.circle(commandCore.x, commandCore.y, 96, 0x38bdf8, 0.12);
    coreGlow.setDepth(-9).setBlendMode(Phaser.BlendModes.ADD);

    const beaconBeam = this.scene.add.graphics().setDepth(-9);
    beaconBeam.fillStyle(0x38bdf8, 0.2);
    beaconBeam.fillTriangle(
      beaconPad.x,
      beaconPad.y,
      beaconTop.x - 85,
      beaconTop.y,
      beaconTop.x + 85,
      beaconTop.y
    );
    beaconBeam.setBlendMode(Phaser.BlendModes.ADD);

    const beaconRings = [
      this.scene.add.ellipse(beaconTop.x, beaconTop.y, 220, 52),
      this.scene.add.ellipse(beaconTop.x, beaconTop.y + 66, 170, 40)
    ];
    for (const ring of beaconRings) {
      ring
        .setDepth(-8)
        .setStrokeStyle(3, 0x38bdf8, 0.45)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    const beaconCore = this.scene.add.circle(beaconPad.x, beaconPad.y - 16, 34, 0x67e8f9, 0.26);
    beaconCore.setDepth(-8).setBlendMode(Phaser.BlendModes.ADD);

    const lightPoints = [
      { position: toWorld(610, 810), radius: 15 },
      { position: toWorld(725, 785), radius: 12 },
      { position: toWorld(1070, 930), radius: 14 },
      { position: toWorld(1390, 760), radius: 12 },
      { position: toWorld(1460, 565), radius: 16 },
      { position: toWorld(900, 520), radius: 10 }
    ].map((point) => {
      const light = this.scene.add.circle(point.position.x, point.position.y, point.radius, 0x38bdf8, 0.22);
      light.setDepth(-8).setBlendMode(Phaser.BlendModes.ADD);
      return light;
    });

    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.04, to: 0.12 },
      scaleX: { from: 0.98, to: 1.04 },
      scaleY: { from: 0.98, to: 1.05 },
      duration: 2600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    this.scene.tweens.add({
      targets: coreGlow,
      alpha: { from: 0.08, to: 0.22 },
      scale: { from: 0.88, to: 1.18 },
      duration: 1350,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    this.scene.tweens.add({
      targets: beaconBeam,
      alpha: { from: 0.28, to: 0.72 },
      duration: 1800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    this.scene.tweens.add({
      targets: beaconRings,
      alpha: { from: 0.34, to: 0.82 },
      scaleX: { from: 0.9, to: 1.08 },
      scaleY: { from: 0.9, to: 1.08 },
      duration: 2100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    this.scene.tweens.add({
      targets: beaconCore,
      alpha: { from: 0.18, to: 0.42 },
      scale: { from: 0.85, to: 1.25 },
      duration: 950,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    lightPoints.forEach((light, index) => {
      this.scene.tweens.add({
        targets: light,
        alpha: { from: 0.12, to: 0.45 },
        scale: { from: 0.72, to: 1.28 },
        duration: 900 + index * 180,
        delay: index * 130,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    });

    this.worldLayer.add([glow, base, coreGlow, beaconBeam, beaconCore, ...beaconRings, ...lightPoints]);
  }
}
