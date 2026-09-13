import type { MovementIntent, PlayerInputContext } from './GameplayInputSource';

export type TouchControl = 'movement' | 'aim' | 'fire' | 'back';
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
    return {
      up: this.movement.y < -STICK_DEAD_ZONE, down: this.movement.y > STICK_DEAD_ZONE,
      left: this.movement.x < -STICK_DEAD_ZONE, right: this.movement.x > STICK_DEAD_ZONE
    };
  }

  samplePlayerInput(context: PlayerInputContext) {
    return {
      ...this.getMovement(), aimAngle: this.lastAimAngle ?? context.fallbackAimAngle,
      shooting: context.canShoot && this.owners.has('fire')
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
    // Keep the last meaningful heading; reset releases controls, not orientation.
  }
}
