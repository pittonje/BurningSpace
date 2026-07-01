import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.createStarTexture();
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
}
