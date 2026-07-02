import Phaser from 'phaser';
import {
  CAMERA_LERP,
  CAMERA_ZOOM
} from '../config/gameConfig';
import { NetworkShipView } from '../entities/NetworkShipView';
import { networkClient } from '../network/networkSession';
import type { ConnectionState, Unsubscribe } from '../network/NetworkClient';
import { SpaceMap } from '../world/SpaceMap';
import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type PlayerInputMessage,
  type ShipSnapshot
} from '@burningspace/shared';

const INPUT_SEND_INTERVAL_MS = 50;
const SPECTATOR_CAMERA_SPEED = 900;

export class MultiplayerGameScene extends Phaser.Scene {
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyS?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyEsc?: Phaser.Input.Keyboard.Key;
  private hudText?: Phaser.GameObjects.Text;
  private readonly shipViews = new Map<string, NetworkShipView>();
  private readonly disposers: Unsubscribe[] = [];
  private inputAccumulatorMs = 0;
  private inputSequence = 0;
  private connectionState: ConnectionState = { status: 'disconnected' };

  constructor() {
    super('MultiplayerGameScene');
  }

  create(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);

    new SpaceMap(this).create();
    this.setupInput();
    this.createHud();
    this.bindNetwork();
    this.rebuildShipViews();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutHud, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  update(_time: number, deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;
    this.updateViews(deltaSeconds);
    this.updateInput(deltaMs);
    this.updateCamera(deltaSeconds);
    this.updateHud();

    if (this.keyEsc && Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.sendNeutralInput();
      this.scene.start('NetworkTestScene');
    }
  }

  private setupInput(): void {
    if (!this.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.game.events.on(Phaser.Core.Events.BLUR, this.handleFocusLost, this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private createHud(): void {
    this.hudText = this.add.text(16, 14, '', {
      color: '#e0f2fe',
      fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      fontSize: '13px',
      lineSpacing: 4,
      stroke: '#020617',
      strokeThickness: 4
    });
    this.hudText.setScrollFactor(0);
    this.hudText.setDepth(100);
    this.layoutHud();
  }

  private bindNetwork(): void {
    this.connectionState = { status: networkClient.getSessionId() ? 'connected' : 'disconnected' };
    this.disposers.push(
      networkClient.onConnectionStateChanged((state) => {
        this.connectionState = state;

        if (state.status === 'disconnected' || state.status === 'error') {
          this.scene.start('NetworkTestScene');
        }
      }),
      networkClient.onShipAdded((ship) => this.addOrUpdateShip(ship)),
      networkClient.onShipChanged((ship) => this.addOrUpdateShip(ship)),
      networkClient.onShipRemoved((shipId) => this.removeShip(shipId))
    );
  }

  private rebuildShipViews(): void {
    for (const ship of networkClient.currentShips) {
      this.addOrUpdateShip(ship);
    }
  }

  private addOrUpdateShip(ship: ShipSnapshot): void {
    const isOwnShip = ship.ownerSessionId === networkClient.getSessionId();
    const view = this.shipViews.get(ship.id);

    if (view) {
      view.updateTarget(ship, isOwnShip);
      return;
    }

    this.shipViews.set(ship.id, new NetworkShipView(this, ship, isOwnShip));
  }

  private removeShip(shipId: string): void {
    this.shipViews.get(shipId)?.destroy();
    this.shipViews.delete(shipId);
  }

  private updateViews(deltaSeconds: number): void {
    for (const view of this.shipViews.values()) {
      view.update(deltaSeconds);
    }
  }

  private updateInput(deltaMs: number): void {
    if (networkClient.profile?.mode !== 'player') {
      return;
    }

    this.inputAccumulatorMs += deltaMs;

    if (this.inputAccumulatorMs < INPUT_SEND_INTERVAL_MS) {
      return;
    }

    this.inputAccumulatorMs %= INPUT_SEND_INTERVAL_MS;
    networkClient.sendPlayerInput(this.createPlayerInput());
  }

  private createPlayerInput(): PlayerInputMessage {
    const pointer = this.input.activePointer;
    const pointerWorld = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const ownShip = this.getOwnShipSnapshot();
    const originX = ownShip?.x ?? this.cameras.main.midPoint.x;
    const originY = ownShip?.y ?? this.cameras.main.midPoint.y;
    this.inputSequence += 1;

    return {
      up: Boolean(this.keyW?.isDown || this.cursors?.up.isDown),
      down: Boolean(this.keyS?.isDown || this.cursors?.down.isDown),
      left: Boolean(this.keyA?.isDown || this.cursors?.left.isDown),
      right: Boolean(this.keyD?.isDown || this.cursors?.right.isDown),
      aimAngle: Phaser.Math.Angle.Between(originX, originY, pointerWorld.x, pointerWorld.y),
      sequence: this.inputSequence
    };
  }

  private sendNeutralInput(): void {
    if (networkClient.profile?.mode !== 'player') {
      return;
    }

    this.inputSequence += 1;
    networkClient.sendPlayerInput({
      up: false,
      down: false,
      left: false,
      right: false,
      aimAngle: this.getOwnShipSnapshot()?.rotation ?? 0,
      sequence: this.inputSequence
    });
  }

  private updateCamera(deltaSeconds: number): void {
    const ownShip = this.getOwnShipSnapshot();

    if (ownShip) {
      const camera = this.cameras.main;
      const lerp = 1 - Math.pow(1 - CAMERA_LERP, deltaSeconds * 60);
      camera.centerOn(
        Phaser.Math.Linear(camera.midPoint.x, ownShip.x, lerp),
        Phaser.Math.Linear(camera.midPoint.y, ownShip.y, lerp)
      );
      return;
    }

    this.updateSpectatorCamera(deltaSeconds);
  }

  private updateSpectatorCamera(deltaSeconds: number): void {
    const inputX = (this.keyD?.isDown || this.cursors?.right.isDown ? 1 : 0) - (this.keyA?.isDown || this.cursors?.left.isDown ? 1 : 0);
    const inputY = (this.keyS?.isDown || this.cursors?.down.isDown ? 1 : 0) - (this.keyW?.isDown || this.cursors?.up.isDown ? 1 : 0);
    const length = Math.hypot(inputX, inputY);

    if (length <= 0) {
      return;
    }

    const camera = this.cameras.main;
    const nextX = Phaser.Math.Clamp(
      camera.midPoint.x + (inputX / length) * SPECTATOR_CAMERA_SPEED * deltaSeconds,
      camera.width / camera.zoom / 2,
      WORLD_WIDTH - camera.width / camera.zoom / 2
    );
    const nextY = Phaser.Math.Clamp(
      camera.midPoint.y + (inputY / length) * SPECTATOR_CAMERA_SPEED * deltaSeconds,
      camera.height / camera.zoom / 2,
      WORLD_HEIGHT - camera.height / camera.zoom / 2
    );
    camera.centerOn(nextX, nextY);
  }

  private getOwnShipSnapshot(): ShipSnapshot | undefined {
    const sessionId = networkClient.getSessionId();
    return networkClient.currentShips.find((ship) => ship.ownerSessionId === sessionId);
  }

  private updateHud(): void {
    if (!this.hudText) {
      return;
    }

    const profile = networkClient.profile;
    const factionLabel = profile?.mode === 'player' ? profile.faction ?? '-' : 'spectator';
    this.hudText.setText([
      `Status: ${this.connectionState.status}`,
      `Nickname: ${profile?.nickname ?? '-'}`,
      `Mode: ${factionLabel}`,
      `Ships: ${networkClient.currentShips.length}`,
      `Participants: ${networkClient.currentParticipants.length}`,
      profile?.mode === 'player' ? 'WASD - movement | Mouse - aim | Esc - lobby' : 'WASD - free camera | Esc - lobby'
    ]);
  }

  private layoutHud(): void {
    this.hudText?.setPosition(16, 14);
  }

  private handleFocusLost = (): void => {
    this.sendNeutralInput();
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.sendNeutralInput();
    }
  };

  private cleanup(): void {
    this.sendNeutralInput();

    for (const dispose of this.disposers.splice(0)) {
      dispose();
    }

    for (const view of this.shipViews.values()) {
      view.destroy();
    }

    this.shipViews.clear();
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutHud, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.handleFocusLost, this);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}
