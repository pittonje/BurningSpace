import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.image('blue-deck-turret', 'assets/blue-deck-turret.png');
    this.load.image('blue-station-base', 'assets/blue-station-base.png');
    this.load.image('player-ship', 'assets/player-ship-game.png');
    this.load.image('red-deck-turret', 'assets/red-deck-turret.png');
    this.load.image('red-station-base', 'assets/red-station-base.png');
    this.load.image('space-background', 'assets/space-background.jpg');
  }

  create(): void {
    this.scene.start('NetworkTestScene');
  }
}
