import Phaser from 'phaser';
import {
  BASE_RADIUS,
  CENTRAL_ZONE_RADIUS,
  FIRE_COOLDOWN_MS,
  MAP_PADDING,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';
import { formatInteger } from '../utils/math';

export type HudState = {
  x: number;
  y: number;
  speed: number;
  health: number;
  maxHealth: number;
  npc?: {
    x: number;
    y: number;
    isAlive: boolean;
  };
  alert?: string;
  weaponCooldownRemainingMs: number;
  fps: number;
};

const PANEL_MARGIN = 18;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 220;

export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly controlsText: Phaser.GameObjects.Text;
  private readonly alertText: Phaser.GameObjects.Text;
  private readonly minimap: Phaser.GameObjects.Graphics;
  private readonly bigMap: Phaser.GameObjects.Graphics;
  private readonly bigMapLabels: Phaser.GameObjects.Text[] = [];
  private debugVisible = false;
  private bigMapVisible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);

    this.panel = scene.add.graphics();
    this.titleText = scene.add.text(0, 0, 'BurningSpace', this.titleStyle());
    this.statusText = scene.add.text(0, 0, '', this.statusStyle());
    this.healthBar = scene.add.graphics();
    this.controlsText = scene.add.text(0, 0, 'WASD move\nMouse aim / LMB fire\nM map / F1 debug\nP admin', {
      color: '#cbd5e1',
      fontFamily: 'ui-monospace, monospace',
      fontSize: '13px',
      lineSpacing: 3
    });
    this.alertText = scene.add.text(0, 0, '', {
      color: '#fef2f2',
      fontFamily: 'ui-monospace, monospace',
      fontSize: '15px',
      fontStyle: '700'
    }).setScrollFactor(0).setDepth(1001);

    this.minimap = scene.add.graphics();
    this.bigMap = scene.add.graphics().setScrollFactor(0).setDepth(999).setVisible(false);

    this.container.add([this.panel, this.titleText, this.statusText, this.healthBar, this.controlsText, this.minimap]);
    this.layout();
  }

  setDebugVisible(value: boolean): void {
    this.debugVisible = value;
  }

  toggleBigMap(): void {
    this.bigMapVisible = !this.bigMapVisible;
    this.bigMap.setVisible(this.bigMapVisible);
    for (const label of this.bigMapLabels) {
      label.setVisible(this.bigMapVisible);
    }
  }

  update(state: HudState): void {
    const ready = state.weaponCooldownRemainingMs <= 0;
    const cooldownPercent = Phaser.Math.Clamp(
      1 - state.weaponCooldownRemainingMs / FIRE_COOLDOWN_MS,
      0,
      1
    );
    const lines = [
      `Speed ${formatInteger(state.speed)} u/s`,
      `Coords ${formatInteger(state.x)} : ${formatInteger(state.y)}`,
      `Weapon ${ready ? 'READY' : `${Math.round(cooldownPercent * 100)}%`}`,
      `HP: ${Math.ceil(state.health)} / ${state.maxHealth}`
    ];

    if (this.debugVisible) {
      lines.push(`FPS ${Math.round(state.fps)}`);
    }

    this.statusText.setText(lines.join('\n'));
    this.drawPanel();
    this.drawHealthBar(state.health, state.maxHealth);
    this.alertText.setText(state.alert ?? '');
    this.alertText.setVisible(Boolean(state.alert));
    this.alertText.setPosition(this.scene.scale.width / 2 - this.alertText.width / 2, 24);
    this.drawMinimap(state);
    this.drawBigMap(state);
  }

  layout(): void {
    this.container.setPosition(
      PANEL_MARGIN,
      Math.max(PANEL_MARGIN, this.scene.scale.height - PANEL_HEIGHT - PANEL_MARGIN)
    );
    this.drawPanel();
    this.titleText.setPosition(14, 10);
    this.statusText.setPosition(14, 38);
    this.healthBar.setPosition(14, 120);
    this.controlsText.setPosition(14, 146);
    this.minimap.setPosition(200, 32);
    this.alertText.setPosition(this.scene.scale.width / 2 - this.alertText.width / 2, 24);
    this.drawBigMapLabels();
  }

  destroy(): void {
    for (const label of this.bigMapLabels) {
      label.destroy();
    }

    this.bigMap.destroy();
    this.alertText.destroy();
    this.container.destroy();
  }

  private drawPanel(): void {
    this.panel.clear();
    this.panel.fillStyle(0x020617, 0.68);
    this.panel.fillRoundedRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 8);
    this.panel.lineStyle(1, 0x38bdf8, 0.32);
    this.panel.strokeRoundedRect(0.5, 0.5, PANEL_WIDTH - 1, PANEL_HEIGHT - 1, 8);
  }

  private drawHealthBar(health: number, maxHealth: number): void {
    const width = 156;
    const height = 9;
    const percent = Phaser.Math.Clamp(health / maxHealth, 0, 1);
    const fillColor = percent > 0.55 ? 0x22c55e : percent > 0.25 ? 0xfacc15 : 0xef4444;

    this.healthBar.clear();
    this.healthBar.fillStyle(0x020617, 0.86);
    this.healthBar.fillRoundedRect(0, 0, width, height, 3);
    this.healthBar.fillStyle(fillColor, 0.95);
    this.healthBar.fillRoundedRect(1, 1, Math.max(0, (width - 2) * percent), height - 2, 3);
    this.healthBar.lineStyle(1, 0xe2e8f0, 0.32);
    this.healthBar.strokeRoundedRect(0, 0, width, height, 3);
  }

  private drawMinimap(state: HudState): void {
    const size = 142;
    const playerX = (state.x / WORLD_WIDTH) * size;
    const playerY = (state.y / WORLD_HEIGHT) * size;
    const npcX = state.npc ? (state.npc.x / WORLD_WIDTH) * size : 0;
    const npcY = state.npc ? (state.npc.y / WORLD_HEIGHT) * size : 0;

    this.minimap.clear();
    this.minimap.fillStyle(0x020617, 0.82);
    this.minimap.fillRect(0, 0, size, size);
    this.minimap.lineStyle(1, 0x94a3b8, 0.55);
    this.minimap.strokeRect(0, 0, size, size);

    this.drawMapMarkers(this.minimap, 0, 0, size, playerX, playerY, state.npc?.isAlive ? { x: npcX, y: npcY } : undefined);
  }

  private drawBigMap(state: HudState): void {
    if (!this.bigMapVisible) {
      return;
    }

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const mapSize = Math.max(280, Math.min(width, height) * 0.72);
    const x = (width - mapSize) / 2;
    const y = (height - mapSize) / 2;
    const playerX = x + (state.x / WORLD_WIDTH) * mapSize;
    const playerY = y + (state.y / WORLD_HEIGHT) * mapSize;
    const npcX = state.npc ? x + (state.npc.x / WORLD_WIDTH) * mapSize : 0;
    const npcY = state.npc ? y + (state.npc.y / WORLD_HEIGHT) * mapSize : 0;

    this.bigMap.clear();
    this.bigMap.fillStyle(0x020617, 0.82);
    this.bigMap.fillRect(0, 0, width, height);
    this.bigMap.fillStyle(0x0f172a, 0.88);
    this.bigMap.fillRect(x, y, mapSize, mapSize);
    this.bigMap.lineStyle(2, 0xe2e8f0, 0.72);
    this.bigMap.strokeRect(x, y, mapSize, mapSize);

    this.drawMapMarkers(
      this.bigMap,
      x,
      y,
      mapSize,
      playerX,
      playerY,
      state.npc?.isAlive ? { x: npcX, y: npcY } : undefined
    );
    this.positionBigMapLabels(x, y, mapSize);
  }

  private drawMapMarkers(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    playerX: number,
    playerY: number,
    npc?: {
      x: number;
      y: number;
    }
  ): void {
    const redX = x + (MAP_PADDING / WORLD_WIDTH) * size;
    const redY = y + (MAP_PADDING / WORLD_HEIGHT) * size;
    const blueX = x + ((WORLD_WIDTH - MAP_PADDING) / WORLD_WIDTH) * size;
    const blueY = y + ((WORLD_HEIGHT - MAP_PADDING) / WORLD_HEIGHT) * size;
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const baseRadius = Math.max(4, (BASE_RADIUS / WORLD_WIDTH) * size);
    const centerRadius = Math.max(5, (CENTRAL_ZONE_RADIUS / WORLD_WIDTH) * size);

    graphics.lineStyle(1, 0x334155, 0.72);
    graphics.lineBetween(x, centerY, x + size, centerY);
    graphics.lineBetween(centerX, y, centerX, y + size);

    graphics.fillStyle(0xef4444, 0.75);
    graphics.fillCircle(redX, redY, baseRadius);
    graphics.fillStyle(0x3b82f6, 0.75);
    graphics.fillCircle(blueX, blueY, baseRadius);

    graphics.lineStyle(1, 0xf8fafc, 0.55);
    graphics.strokeCircle(centerX, centerY, centerRadius);
    graphics.fillStyle(0xf8fafc, 0.28);
    graphics.fillCircle(centerX, centerY, 3);

    graphics.lineStyle(2, 0xfacc15, 0.95);
    graphics.strokeCircle(playerX, playerY, 5);
    graphics.fillStyle(0xfacc15, 1);
    graphics.fillCircle(playerX, playerY, 2);

    if (npc) {
      graphics.fillStyle(0x38bdf8, 0.95);
      graphics.fillTriangle(npc.x, npc.y - 5, npc.x - 4, npc.y + 4, npc.x + 4, npc.y + 4);
      graphics.lineStyle(1, 0xe0f2fe, 0.8);
      graphics.strokeTriangle(npc.x, npc.y - 5, npc.x - 4, npc.y + 4, npc.x + 4, npc.y + 4);
    }
  }

  private drawBigMapLabels(): void {
    if (this.bigMapLabels.length > 0) {
      return;
    }

    const labels = ['RED BASE', 'NEUTRAL', 'BLUE BASE', 'M to close'];

    for (const label of labels) {
      const text = this.scene.add
        .text(0, 0, label, {
          color: '#e2e8f0',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '16px'
        })
        .setScrollFactor(0)
        .setDepth(1001)
        .setVisible(false);

      this.bigMapLabels.push(text);
    }
  }

  private positionBigMapLabels(x: number, y: number, size: number): void {
    const [redLabel, centerLabel, blueLabel, closeLabel] = this.bigMapLabels;

    if (!redLabel || !centerLabel || !blueLabel || !closeLabel) {
      return;
    }

    redLabel.setPosition(x + 18, y + 18);
    centerLabel.setPosition(x + size / 2 - centerLabel.width / 2, y + size / 2 + 16);
    blueLabel.setPosition(x + size - blueLabel.width - 18, y + size - 38);
    closeLabel.setPosition(x + size - closeLabel.width, y - 30);
  }

  private titleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: '#f8fafc',
      fontFamily: 'ui-monospace, monospace',
      fontSize: '19px',
      fontStyle: '700'
    };
  }

  private statusStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: '#dbeafe',
      fontFamily: 'ui-monospace, monospace',
      fontSize: '14px',
      lineSpacing: 5
    };
  }
}
