import Phaser from 'phaser';
import {
  CAMERA_LERP,
  CAMERA_ZOOM
} from '../config/gameConfig';
import { NetworkProjectileView } from '../entities/NetworkProjectileView';
import { NetworkShipView } from '../entities/NetworkShipView';
import { DesktopInputSource } from '../input/DesktopInputSource';
import type { GameplayInputSource } from '../input/GameplayInputSource';
import { networkClient } from '../network/networkSession';
import type { ConnectionState, PlayerInputPayload, Unsubscribe } from '../network/NetworkClient';
import { getConnectionPresentationCopy } from '../network/connectionPresentation';
import { SpaceMap } from '../world/SpaceMap';
import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type HitEventMessage,
  type ProjectileSnapshot,
  type ShipSnapshot
} from '@burningspace/shared';

const INPUT_SEND_INTERVAL_MS = 50;
const SPECTATOR_CAMERA_ACCELERATION = 7200;
const SPECTATOR_CAMERA_DECELERATION = 9000;
const SPECTATOR_CAMERA_MAX_SPEED = 9500;

export class MultiplayerGameScene extends Phaser.Scene {
  private inputSource?: GameplayInputSource;
  private hudText?: Phaser.GameObjects.Text;
  private connectionBanner?: Phaser.GameObjects.Text;
  private respawnText?: Phaser.GameObjects.Text;
  private readonly shipViews = new Map<string, NetworkShipView>();
  private readonly projectileViews = new Map<string, NetworkProjectileView>();
  private readonly disposers: Unsubscribe[] = [];
  private inputAccumulatorMs = 0;
  private spectatorCameraVelocityX = 0;
  private spectatorCameraVelocityY = 0;
  private connectionState: ConnectionState = networkClient.getConnectionState();

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

    if (this.inputSource?.consumeBackRequest()) {
      this.sendNeutralInput();
      this.scene.start('NetworkTestScene');
    }
  }

  private setupInput(): void {
    this.inputSource = new DesktopInputSource(this.input);
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
    this.connectionBanner = this.add.text(0, 14, '', {
      align: 'center',
      backgroundColor: '#78350f',
      color: '#fef3c7',
      fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      fontSize: '13px',
      padding: { x: 12, y: 8 },
      stroke: '#020617',
      strokeThickness: 3
    });
    this.connectionBanner.setOrigin(0.5, 0);
    this.connectionBanner.setScrollFactor(0);
    this.connectionBanner.setDepth(102);
    this.connectionBanner.setVisible(false);
    this.respawnText = this.add.text(0, 0, '', {
      align: 'center',
      color: '#f8fafc',
      fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      fontSize: '22px',
      stroke: '#020617',
      strokeThickness: 6
    });
    this.respawnText.setOrigin(0.5);
    this.respawnText.setScrollFactor(0);
    this.respawnText.setDepth(101);
    this.respawnText.setVisible(false);
    this.layoutHud();
  }

  private bindNetwork(): void {
    this.connectionState = networkClient.getConnectionState();
    this.renderConnectionPresentation();
    this.disposers.push(
      networkClient.onConnectionStateChanged((state) => {
        this.connectionState = state;
        this.renderConnectionPresentation();

        if (state.lifecycle === 'idle'
          || state.lifecycle === 'connection_problem'
          || state.lifecycle === 'terminal_failure') {
          this.scene.start('NetworkTestScene');
        }
      }),
      networkClient.onShipAdded((ship) => this.addOrUpdateShip(ship)),
      networkClient.onShipChanged((ship) => this.addOrUpdateShip(ship)),
      networkClient.onShipRemoved((shipId) => this.removeShip(shipId)),
      networkClient.onProjectileAdded((projectile) => this.addOrUpdateProjectile(projectile)),
      networkClient.onProjectileChanged((projectile) => this.addOrUpdateProjectile(projectile)),
      networkClient.onProjectileRemoved((projectileId) => this.removeProjectile(projectileId)),
      networkClient.onHitEvent((message) => this.createHitEffect(message)),
      networkClient.onShipDestroyed((message) => {
        if (message.shipId === networkClient.getSessionId()) {
          this.cameras.main.shake(180, 0.004);
        }
      })
    );
  }

  private rebuildShipViews(): void {
    for (const ship of networkClient.currentShips) {
      this.addOrUpdateShip(ship);
    }

    for (const projectile of networkClient.currentProjectiles) {
      this.addOrUpdateProjectile(projectile);
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

  private addOrUpdateProjectile(projectile: ProjectileSnapshot): void {
    const view = this.projectileViews.get(projectile.id);

    if (view) {
      view.updateTarget(projectile);
      return;
    }

    this.projectileViews.set(projectile.id, new NetworkProjectileView(this, projectile));
  }

  private removeProjectile(projectileId: string): void {
    this.projectileViews.get(projectileId)?.destroy();
    this.projectileViews.delete(projectileId);
  }

  private updateViews(deltaSeconds: number): void {
    const serverNowMs = networkClient.getEstimatedServerTime();

    for (const view of this.shipViews.values()) {
      view.update(deltaSeconds, serverNowMs);
    }

    for (const view of this.projectileViews.values()) {
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

  private createPlayerInput(): PlayerInputPayload {
    const ownShip = this.getOwnShipSnapshot();

    return this.inputSource!.samplePlayerInput({
      camera: this.cameras.main,
      aimOrigin: ownShip ?? this.cameras.main.midPoint,
      canShoot: Boolean(ownShip?.alive)
    });
  }

  private sendNeutralInput(): void {
    if (networkClient.profile?.mode !== 'player') {
      return;
    }

    networkClient.sendPlayerInput({
      up: false,
      down: false,
      left: false,
      right: false,
      aimAngle: this.getOwnShipSnapshot()?.rotation ?? 0,
      shooting: false
    });
  }

  private updateCamera(deltaSeconds: number): void {
    const ownShip = this.getOwnShipSnapshot();

    if (ownShip) {
      this.spectatorCameraVelocityX = 0;
      this.spectatorCameraVelocityY = 0;
      const camera = this.cameras.main;
      const ownShipView = this.shipViews.get(ownShip.id);
      const targetX = ownShipView?.getDisplayX() ?? ownShip.x;
      const targetY = ownShipView?.getDisplayY() ?? ownShip.y;
      const lerp = 1 - Math.pow(1 - CAMERA_LERP, deltaSeconds * 60);
      camera.centerOn(
        Phaser.Math.Linear(camera.midPoint.x, targetX, lerp),
        Phaser.Math.Linear(camera.midPoint.y, targetY, lerp)
      );
      return;
    }

    this.updateSpectatorCamera(deltaSeconds);
  }

  private updateSpectatorCamera(deltaSeconds: number): void {
    const movement = this.inputSource?.getMovement();
    const inputX = (movement?.right ? 1 : 0) - (movement?.left ? 1 : 0);
    const inputY = (movement?.down ? 1 : 0) - (movement?.up ? 1 : 0);
    const length = Math.hypot(inputX, inputY);

    if (length > 0) {
      this.spectatorCameraVelocityX += (inputX / length) * SPECTATOR_CAMERA_ACCELERATION * deltaSeconds;
      this.spectatorCameraVelocityY += (inputY / length) * SPECTATOR_CAMERA_ACCELERATION * deltaSeconds;
    } else {
      const speed = Math.hypot(this.spectatorCameraVelocityX, this.spectatorCameraVelocityY);
      const nextSpeed = Math.max(0, speed - SPECTATOR_CAMERA_DECELERATION * deltaSeconds);

      if (nextSpeed <= 0 || speed <= 0) {
        this.spectatorCameraVelocityX = 0;
        this.spectatorCameraVelocityY = 0;
      } else {
        const decelerationScale = nextSpeed / speed;
        this.spectatorCameraVelocityX *= decelerationScale;
        this.spectatorCameraVelocityY *= decelerationScale;
      }
    }

    const velocityLength = Math.hypot(this.spectatorCameraVelocityX, this.spectatorCameraVelocityY);

    if (velocityLength > SPECTATOR_CAMERA_MAX_SPEED) {
      const speedScale = SPECTATOR_CAMERA_MAX_SPEED / velocityLength;
      this.spectatorCameraVelocityX *= speedScale;
      this.spectatorCameraVelocityY *= speedScale;
    }

    const camera = this.cameras.main;
    const minX = camera.width / camera.zoom / 2;
    const maxX = WORLD_WIDTH - minX;
    const minY = camera.height / camera.zoom / 2;
    const maxY = WORLD_HEIGHT - minY;
    const rawNextX = camera.midPoint.x + this.spectatorCameraVelocityX * deltaSeconds;
    const rawNextY = camera.midPoint.y + this.spectatorCameraVelocityY * deltaSeconds;
    const nextX = Phaser.Math.Clamp(rawNextX, minX, maxX);
    const nextY = Phaser.Math.Clamp(rawNextY, minY, maxY);

    if (nextX !== rawNextX) {
      this.spectatorCameraVelocityX = 0;
    }

    if (nextY !== rawNextY) {
      this.spectatorCameraVelocityY = 0;
    }

    camera.centerOn(nextX, nextY);
  }

  private getOwnShipSnapshot(): ShipSnapshot | undefined {
    return networkClient.getOwnShipSnapshot();
  }

  private updateHud(): void {
    if (!this.hudText) {
      return;
    }

    const profile = networkClient.profile;
    const ownShip = this.getOwnShipSnapshot();
    const connectionCopy = getConnectionPresentationCopy(this.connectionState);
    const factionLabel = profile?.mode === 'player' ? profile.faction ?? '-' : 'spectator';
    const hpLabel = ownShip ? `${Math.ceil(ownShip.health)} / ${ownShip.maxHealth}` : '-';
    this.hudText.setText([
      `Status: ${connectionCopy.label}`,
      `Nickname: ${profile?.nickname ?? '-'}`,
      `Mode: ${factionLabel}`,
      `HP: ${hpLabel}`,
      `Ships: ${networkClient.currentShips.length}`,
      `Projectiles: ${networkClient.currentProjectiles.length}`,
      `Participants: ${networkClient.currentParticipants.length}`,
      profile?.mode === 'player' ? 'WASD - movement | Mouse - aim | LMB/Space - fire | Esc - lobby' : 'WASD - free camera | Esc - lobby'
    ]);

    this.updateRespawnOverlay(ownShip);
  }

  private layoutHud(): void {
    this.connectionBanner?.setPosition(this.scale.width / 2, 14);
    this.connectionBanner?.setWordWrapWidth(
      Math.min(520, Math.max(280, this.scale.width - 32)),
      true
    );
    const hudTop = this.connectionBanner?.visible
      ? 26 + this.connectionBanner.displayHeight
      : 14;
    this.hudText?.setPosition(16, hudTop);
    this.respawnText?.setPosition(this.scale.width / 2, this.scale.height * 0.42);
  }

  private renderConnectionPresentation(): void {
    if (!this.connectionBanner) {
      return;
    }

    const copy = getConnectionPresentationCopy(this.connectionState);
    const visible = this.connectionState.lifecycle === 'connection_lost'
      || this.connectionState.lifecycle === 'reconnecting'
      || this.connectionState.lifecycle === 'reconnected'
      || this.connectionState.lifecycle === 'connection_problem'
      || Boolean(this.connectionState.error);

    this.connectionBanner.setText(`${copy.label} — ${this.connectionState.error ?? copy.detail}`);
    const successful = copy.tone === 'success' && !this.connectionState.error;
    this.connectionBanner.setBackgroundColor(successful ? '#14532d' : '#78350f');
    this.connectionBanner.setColor(successful ? '#dcfce7' : '#fef3c7');
    this.connectionBanner.setVisible(visible);
    this.layoutHud();
  }

  private updateRespawnOverlay(ownShip: ShipSnapshot | undefined): void {
    if (!this.respawnText) {
      return;
    }

    if (!ownShip || ownShip.alive) {
      this.respawnText.setVisible(false);
      return;
    }

    const seconds = Math.max(0, Math.ceil((ownShip.respawnAt - networkClient.getEstimatedServerTime()) / 1000));
    this.respawnText.setText(`DESTROYED\nRESPAWN IN ${seconds}s`);
    this.respawnText.setVisible(true);
  }

  private createHitEffect(message: HitEventMessage): void {
    const ring = this.add.circle(message.x, message.y, 8, 0xffffff, 0);
    ring.setStrokeStyle(2, 0xffffff, 0.9);
    ring.setDepth(31);

    const flash = this.add.circle(message.x, message.y, 10, 0x93c5fd, 0.35);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    flash.setDepth(30);

    this.tweens.add({
      targets: ring,
      radius: 42,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });
    this.tweens.add({
      targets: flash,
      radius: 36,
      alpha: 0,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy()
    });
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
    this.inputSource?.destroy();
    this.inputSource = undefined;

    for (const dispose of this.disposers.splice(0)) {
      dispose();
    }

    for (const view of this.shipViews.values()) {
      view.destroy();
    }

    for (const view of this.projectileViews.values()) {
      view.destroy();
    }

    this.shipViews.clear();
    this.projectileViews.clear();
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutHud, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.handleFocusLost, this);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}
