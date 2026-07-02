import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { GameScene } from '../scenes/GameScene';
import { NetworkTestScene } from '../scenes/NetworkTestScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#030712',
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'game',
    width: window.innerWidth,
    height: window.innerHeight,
    min: {
      width: 720,
      height: 420
    }
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  scene: [BootScene, NetworkTestScene, GameScene]
};
