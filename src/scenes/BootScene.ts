import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.image('blue-base', 'assets/blue-base-blended.png');
    this.load.image('red-base', 'assets/red-base-blended.png');
  }

  create(): void {
    this.createStarTexture();
    this.createBaseSpaceTextures();
    this.scene.start('GameScene');
  }

  private createStarTexture(): void {
    const size = 1024;
    const graphics = this.add.graphics();

    graphics.fillStyle(0x050b18, 1);
    graphics.fillRect(0, 0, size, size);

    const random = new Phaser.Math.RandomDataGenerator(['burning-space-stars']);

    for (let index = 0; index < 580; index += 1) {
      const x = random.between(0, size);
      const y = random.between(0, size);
      const radius = random.realInRange(0.6, 1.8);
      const alpha = random.realInRange(0.25, 0.95);
      const color = random.pick([0xdbeafe, 0xe0f2fe, 0xfef3c7, 0xf8fafc]) as number;

      graphics.fillStyle(color, alpha);
      graphics.fillCircle(x, y, radius);
    }

    graphics.generateTexture('starfield-tile', size, size);
    graphics.destroy();
  }

  private createBaseSpaceTextures(): void {
    this.createNebulaTexture('red-base-space', 'burning-space-red-base-nebula', [
      { r: 239, g: 68, b: 68 },
      { r: 249, g: 115, b: 22 },
      { r: 147, g: 197, b: 253 }
    ]);
    this.createNebulaTexture('blue-base-space', 'burning-space-blue-base-nebula', [
      { r: 56, g: 189, b: 248 },
      { r: 37, g: 99, b: 235 },
      { r: 165, g: 243, b: 252 }
    ]);
  }

  private createNebulaTexture(
    key: string,
    seed: string,
    palette: Array<{ r: number; g: number; b: number }>
  ): void {
    const width = 1024;
    const height = 768;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';

    const random = new Phaser.Math.RandomDataGenerator([seed]);
    const colorAt = (index: number, alpha: number): string => {
      const color = palette[index % palette.length];
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    };
    const drawGlow = (x: number, y: number, radius: number, colorIndex: number, alpha: number): void => {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, colorAt(colorIndex, alpha));
      gradient.addColorStop(0.38, colorAt(colorIndex, alpha * 0.34));
      gradient.addColorStop(0.72, colorAt(colorIndex, alpha * 0.09));
      gradient.addColorStop(1, colorAt(colorIndex, 0));

      context.fillStyle = gradient;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };

    for (let index = 0; index < 420; index += 1) {
      const t = random.frac();
      const strand = random.realInRange(-1, 1);
      const curve = Math.sin(t * Math.PI * 2.3 + strand * 0.65) * 58;
      const x = width * (0.06 + t * 0.92) + random.realInRange(-110, 110);
      const y = height * (0.74 - t * 0.42) + curve + random.realInRange(-120, 120);
      const radius = random.realInRange(18, 110);
      const alpha = random.realInRange(0.004, 0.024);

      drawGlow(x, y, radius, random.between(0, palette.length - 1), alpha);
    }

    for (let index = 0; index < 140; index += 1) {
      const x = random.realInRange(0, width);
      const y = random.realInRange(0, height);
      const radius = random.realInRange(35, 180);
      const alpha = random.realInRange(0.002, 0.012);

      drawGlow(x, y, radius, random.between(0, palette.length - 1), alpha);
    }

    for (let index = 0; index < 520; index += 1) {
      const x = random.realInRange(0, width);
      const y = random.realInRange(0, height);
      const radius = random.realInRange(0.45, 1.7);
      const alpha = random.realInRange(0.16, 0.72);
      const color = random.pick(['#f8fafc', '#dbeafe', '#fef3c7', colorAt(0, 1)]) as string;

      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';

    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }

    this.textures.addCanvas(key, canvas);
  }
}
