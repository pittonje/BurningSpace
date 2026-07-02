import Phaser from 'phaser';
import { gameConfig } from './config/phaserConfig';
import { loadRuntimeBalance } from './config/runtimeBalance';

import './styles.css';

loadRuntimeBalance();
new Phaser.Game(gameConfig);
