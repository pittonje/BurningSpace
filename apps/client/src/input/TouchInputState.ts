import type { MovementIntent, PlayerInputContext } from './GameplayInputSource';

export type TouchControl = 'movement' | 'aim' | 'back';
export const STICK_DEAD_ZONE = 0.18;
export interface StickVector { x: number; y: number }

export function normalizeStick(x: number, y: number, radius: number): StickVector {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius <= 0) {
    return { x: 0, y: 0 };
  }
  const scale = Math.max(radius, Math.hypot(x, y));
  return { x: x / scale, y: y / scale };
}

/** Pointer ownership and semantic intent, independent of DOM, Phaser and networking. */
export class TouchInputState {
  private readonly owners = new Map<TouchControl, number>();
  private movement: StickVector = { x: 0, y: 0 };
  private aim: StickVector = { x: 0, y: 0 };
  private lastAimAngle?: number;
  private backRequested = false;

  owns(control: TouchControl, pointerId: number): boolean {
    return this.owners.get(control) === pointerId;
  }

  begin(control: TouchControl, pointerId: number): boolean {
    if (this.owners.has(control) || [...this.owners.values()].includes(pointerId)) return false;
    this.owners.set(control, pointerId);
    if (control === 'aim') this.lastAimAngle = undefined;
    if (control === 'back') this.backRequested = true;
    return true;
  }

  move(control: TouchControl, pointerId: number, x: number, y: number, radius: number): void {
    if (!this.owns(control, pointerId)) return;
    const vector = normalizeStick(x, y, radius);
    if (control === 'movement') this.movement = vector;
    if (control === 'aim') {
      this.aim = vector;
      if (Math.hypot(vector.x, vector.y) > STICK_DEAD_ZONE) {
        this.lastAimAngle = Math.atan2(vector.y, vector.x);
      }
    }
  }

  end(control: TouchControl, pointerId: number): void {
    if (!this.owns(control, pointerId)) return;
    this.owners.delete(control);
    if (control === 'movement') this.movement = { x: 0, y: 0 };
    if (control === 'aim') this.aim = { x: 0, y: 0 };
  }

  getVector(control: 'movement' | 'aim'): StickVector {
    return { ...(control === 'movement' ? this.movement : this.aim) };
  }

  getMovement(): MovementIntent {
    if (Math.hypot(this.movement.x, this.movement.y) <= STICK_DEAD_ZONE) {
      return { up: false, down: false, left: false, right: false };
    }
    // Eight equal 45-degree sectors; exact boundaries choose the clockwise sector.
    const sector = (Math.round(Math.atan2(this.movement.y, this.movement.x) / (Math.PI / 4)) + 8) % 8;
    return {
      up: sector >= 5, down: sector >= 1 && sector <= 3,
      left: sector >= 3 && sector <= 5, right: sector === 0 || sector === 1 || sector === 7
    };
  }

  samplePlayerInput(context: PlayerInputContext) {
    const movement = this.getMovement();
    const x = Number(movement.right) - Number(movement.left);
    const y = Number(movement.down) - Number(movement.up);
    const aiming = this.owners.has('aim');
    const aimAngle = aiming
      ? this.lastAimAngle ?? context.fallbackAimAngle
      : (x || y) ? Math.atan2(y, x) : context.fallbackAimAngle;
    return {
      ...movement, aimAngle, shooting: context.canShoot && aiming
    };
  }

  consumeBackRequest(): boolean {
    const requested = this.backRequested;
    this.backRequested = false;
    return requested;
  }

  reset(): void {
    this.owners.clear();
    this.movement = { x: 0, y: 0 };
    this.aim = { x: 0, y: 0 };
    this.backRequested = false;
    this.lastAimAngle = undefined;
  }
}
