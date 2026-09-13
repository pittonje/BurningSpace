import { describe, expect, it } from 'vitest';
import { normalizeStick, TouchInputState } from '../src/input/TouchInputState';
import type { PlayerInputContext } from '../src/input/GameplayInputSource';

const context: PlayerInputContext = { camera: { getWorldPoint: (x, y) => ({ x, y }) }, aimOrigin: { x: 0, y: 0 }, fallbackAimAngle: 0.8, canShoot: true };
const neutral = { up: false, down: false, left: false, right: false };

describe('touch intent without renderer or networking', () => {
  it('starts neutral with the supplied fallback aim', () => {
    const s = new TouchInputState();
    expect(s.samplePlayerInput(context)).toEqual({ ...neutral, aimAngle: 0.8, shooting: false });
    expect(s.samplePlayerInput({ ...context, fallbackAimAngle: 1.4 }).aimAngle).toBe(1.4);
  });
  it.each([
    [0, -100, { up: true }], [0, 100, { down: true }], [-100, 0, { left: true }],
    [100, 0, { right: true }], [100, -100, { right: true, up: true }],
    [0, 0, {}], [10, -10, {}], [18, 0, {}]
  ])('maps movement (%s, %s) through the radial dead zone', (x, y, expected) => {
    const s = new TouchInputState(); s.begin('movement', 1); s.move('movement', 1, x as number, y as number, 100);
    expect(s.getMovement()).toEqual({ ...neutral, ...expected as object });
    expect(s.samplePlayerInput(context)).toMatchObject(s.getMovement());
  });
  it('clamps vector length to the stick radius', () => {
    expect(normalizeStick(200, 0, 100)).toEqual({ x: 1, y: 0 });
    const v = normalizeStick(100, 100, 10);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
    expect(v.x).toBeCloseTo(Math.SQRT1_2);
    expect(normalizeStick(5, 5, 0)).toEqual({ x: 0, y: 0 });
  });
  it.each([[100, 0, 0], [0, 100, Math.PI / 2], [0, -100, -Math.PI / 2], [-100, 0, Math.PI]])('aims (%s,%s) in world orientation', (x, y, angle) => {
    const s = new TouchInputState(); s.begin('aim', 2); s.move('aim', 2, x!, y!, 100);
    expect(s.samplePlayerInput(context).aimAngle).toBe(angle);
    expect(s.samplePlayerInput(context).shooting).toBe(true);
    s.move('aim', 2, 10, 0, 100);
    expect(s.samplePlayerInput(context).aimAngle).toBe(angle);
    s.move('aim', 2, 0, 0, 100); s.end('aim', 2);
    expect(s.samplePlayerInput(context).aimAngle).toBe(0.8);
  });
  it('supports movement, aim and FIRE with independent ownership and release', () => {
    const s = new TouchInputState();
    expect(s.begin('movement', 1)).toBe(true); s.move('movement', 1, -100, 0, 100);
    expect(s.begin('aim', 2)).toBe(true); s.move('aim', 2, 0, 100, 100);
    expect(s.begin('aim', 4)).toBe(false); expect(s.begin('back', 1)).toBe(false);
    expect(s.samplePlayerInput(context)).toEqual({ ...neutral, left: true, aimAngle: Math.PI / 2, shooting: true });
    expect(s.samplePlayerInput({ ...context, canShoot: false }).shooting).toBe(false);
    s.end('aim', 4); expect(s.samplePlayerInput(context).shooting).toBe(true);
    s.end('aim', 2); expect(s.samplePlayerInput(context)).toMatchObject({ left: true, aimAngle: Math.PI, shooting: false });
    s.end('movement', 1); expect(s.getMovement()).toEqual(neutral);
  });
  it('reset clears all ownership, intents and pending back; late moves cannot revive them', () => {
    const s = new TouchInputState();
    s.begin('movement', 1); s.begin('aim', 2); s.begin('back', 4);
    s.move('movement', 1, 100, 0, 100); s.move('aim', 2, 0, 100, 100);
    s.reset(); s.move('movement', 1, 100, 0, 100);
    expect(s.getMovement()).toEqual(neutral);
    expect(s.samplePlayerInput(context).shooting).toBe(false);
    expect(s.getVector('aim')).toEqual({ x: 0, y: 0 });
    expect(s.consumeBackRequest()).toBe(false);
    for (const [i, name] of (['movement', 'aim', 'back'] as const).entries()) expect(s.begin(name, i + 1)).toBe(true);
  });
  it('back requests are consumable and do not repeat while held', () => {
    const s = new TouchInputState(); s.begin('back', 5);
    expect(s.consumeBackRequest()).toBe(true); expect(s.consumeBackRequest()).toBe(false);
    expect(s.begin('back', 5)).toBe(false); expect(s.consumeBackRequest()).toBe(false);
    s.end('back', 5); s.begin('back', 6); expect(s.consumeBackRequest()).toBe(true);
  });
});
