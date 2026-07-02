import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/gameConfig';

const STATION_COORDINATE_SIZE = 1254;
const STATION_REFERENCE_DISPLAY_SIZE = 2050;
const STATION_DISPLAY_SIZE = 1500;
const STATION_EDGE_OVERHANG = 190;

type StationFrame = {
  left: number;
  top: number;
  size: number;
};

type FactionVisuals = {
  color: number;
  turretKey: string;
};

type TurretLayout = {
  sourceX: number;
  sourceY: number;
  displayWidth: number;
  baseAngle: number;
  sweep: number;
  delay: number;
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
    this.createStationBases();
  }

  private createBackground(): void {
    const background = this.scene.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'space-background');
    background
      .setDepth(-100)
      .setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);

    this.worldLayer.add(background);
  }

  private createStationBases(): void {
    this.drawRedStation();
    this.drawBlueStation();
  }

  private drawRedStation(): void {
    const frame = {
      left: -STATION_EDGE_OVERHANG,
      top: -STATION_EDGE_OVERHANG,
      size: STATION_DISPLAY_SIZE
    };
    const station = this.scene.add.image(frame.left, frame.top, 'red-station-base');
    station
      .setDepth(-12)
      .setOrigin(0, 0)
      .setDisplaySize(frame.size, frame.size)
      .setAlpha(0.98);

    this.worldLayer.add(station);
    this.createStationAnimations(frame, {
      color: 0xff3333,
      turretKey: 'red-deck-turret'
    }, {
      beacon: [650, 305],
      turrets: [
        { sourceX: 690, sourceY: 675, displayWidth: 260, baseAngle: 0, sweep: 4, delay: 0 }
      ]
    });
  }

  private drawBlueStation(): void {
    const frame = {
      left: WORLD_WIDTH + STATION_EDGE_OVERHANG - STATION_DISPLAY_SIZE,
      top: WORLD_HEIGHT + STATION_EDGE_OVERHANG - STATION_DISPLAY_SIZE,
      size: STATION_DISPLAY_SIZE
    };
    const station = this.scene.add.image(
      WORLD_WIDTH + STATION_EDGE_OVERHANG,
      WORLD_HEIGHT + STATION_EDGE_OVERHANG,
      'blue-station-base'
    );
    station
      .setDepth(-12)
      .setOrigin(1, 1)
      .setDisplaySize(frame.size, frame.size)
      .setAlpha(0.98);

    this.worldLayer.add(station);
    this.createStationAnimations(frame, {
      color: 0x12cfff,
      turretKey: 'blue-deck-turret'
    }, {
      beacon: [792, 337],
      turrets: [
        { sourceX: 800, sourceY: 898, displayWidth: 260, baseAngle: 0, sweep: 4, delay: 240 },
        { sourceX: 224, sourceY: 390, displayWidth: 190, baseAngle: 0, sweep: 3, delay: 860 }
      ]
    });
  }

  private createStationAnimations(
    frame: StationFrame,
    visuals: FactionVisuals,
    layout: {
      beacon: [number, number];
      turrets: TurretLayout[];
    }
  ): void {
    this.createBeaconPulse(frame, layout.beacon[0], layout.beacon[1], visuals.color);

    layout.turrets.forEach((turret) => {
      this.createDeckTurret(frame, turret, visuals.turretKey);
    });
  }

  private createBeaconPulse(
    frame: StationFrame,
    sourceX: number,
    sourceY: number,
    color: number
  ): void {
    const scale = frame.size / STATION_REFERENCE_DISPLAY_SIZE;
    const position = this.texturePointToWorld(frame, sourceX, sourceY);
    const pulse = this.scene.add.circle(position.x, position.y, 38 * scale, color, 0.18);
    pulse
      .setDepth(-5)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: pulse,
      alpha: { from: 0.08, to: 0.26 },
      scale: { from: 0.82, to: 1.22 },
      duration: 1250,
      ease: 'Sine.easeInOut',
      repeat: -1,
      yoyo: true
    });

    this.worldLayer.add(pulse);
  }

  private createDeckTurret(
    frame: StationFrame,
    layout: TurretLayout,
    textureKey: string
  ): void {
    const scale = frame.size / STATION_REFERENCE_DISPLAY_SIZE;
    const position = this.texturePointToWorld(frame, layout.sourceX, layout.sourceY);
    const source = this.scene.textures.get(textureKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const displayWidth = layout.displayWidth * scale;
    const displayHeight = displayWidth * (source.height / source.width);
    const turret = this.scene.add.image(position.x, position.y, textureKey);
    turret
      .setDepth(-4)
      .setOrigin(0.5, 0.58)
      .setDisplaySize(displayWidth, displayHeight)
      .setAngle(layout.baseAngle);

    this.worldLayer.add(turret);

    this.scene.tweens.add({
      targets: turret,
      angle: {
        from: layout.baseAngle - layout.sweep,
        to: layout.baseAngle + layout.sweep
      },
      duration: 2600,
      delay: layout.delay,
      ease: 'Sine.easeInOut',
      repeat: -1,
      yoyo: true
    });
  }

  private texturePointToWorld(frame: StationFrame, sourceX: number, sourceY: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      frame.left + (sourceX / STATION_COORDINATE_SIZE) * frame.size,
      frame.top + (sourceY / STATION_COORDINATE_SIZE) * frame.size
    );
  }
}
