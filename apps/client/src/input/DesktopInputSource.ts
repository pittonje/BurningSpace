import Phaser from 'phaser';
import type { PlayerInputPayload } from '../network/NetworkClient';
import type { GameplayInputSource, MovementIntent, PlayerInputContext } from './GameplayInputSource';

export class DesktopInputSource implements GameplayInputSource {
  private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin;
  private readonly keys: Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'ESC' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SHIFT', Phaser.Input.Keyboard.Key>;
  private destroyed = false;

  constructor(private readonly input: Pick<Phaser.Input.InputPlugin, 'keyboard' | 'activePointer'>) {
    if (!input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.keyboard = input.keyboard;
    const cursors = this.keyboard.createCursorKeys();
    this.keys = {
      W: this.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: cursors.space,
      ESC: this.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      UP: cursors.up,
      DOWN: cursors.down,
      LEFT: cursors.left,
      RIGHT: cursors.right,
      // Preserve createCursorKeys' existing capture set; Shift has no gameplay action.
      SHIFT: cursors.shift
    };
  }

  getMovement(): MovementIntent {
    return {
      up: !this.destroyed && (this.keys.W.isDown || this.keys.UP.isDown),
      down: !this.destroyed && (this.keys.S.isDown || this.keys.DOWN.isDown),
      left: !this.destroyed && (this.keys.A.isDown || this.keys.LEFT.isDown),
      right: !this.destroyed && (this.keys.D.isDown || this.keys.RIGHT.isDown)
    };
  }

  samplePlayerInput({ camera, aimOrigin, canShoot }: PlayerInputContext): PlayerInputPayload {
    const pointer = this.input.activePointer;
    const pointerWorld = camera.getWorldPoint(pointer.x, pointer.y);

    return {
      ...this.getMovement(),
      aimAngle: Phaser.Math.Angle.Between(aimOrigin.x, aimOrigin.y, pointerWorld.x, pointerWorld.y),
      shooting: !this.destroyed && Boolean(canShoot && (pointer.leftButtonDown() || this.keys.SPACE.isDown))
    };
  }

  consumeBackRequest(): boolean {
    return !this.destroyed && Phaser.Input.Keyboard.JustDown(this.keys.ESC);
  }

  reset(): void {
    // Phaser owns desktop key reset on blur; preserve its existing behavior.
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    for (const key of Object.values(this.keys)) {
      // Captures are game-wide; leave them intact as Phaser's scene shutdown does.
      this.keyboard.removeKey(key, true);
    }
  }
}
