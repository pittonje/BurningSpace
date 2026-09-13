import { describe, expect, it } from 'vitest';
import { TouchInputState } from '../src/input/TouchInputState';
import type { PlayerInputContext } from '../src/input/GameplayInputSource';

const context: PlayerInputContext = { camera: { getWorldPoint: (x, y) => ({ x, y }) }, aimOrigin: { x: 0, y: 0 }, fallbackAimAngle: 0.8, canShoot: true };
const neutral = { up: false, down: false, left: false, right: false };
const sectors = [
  { right: true }, { right: true, down: true }, { down: true }, { down: true, left: true },
  { left: true }, { left: true, up: true }, { up: true }, { up: true, right: true }
];
function moving(angle: number, radius = 1) {
  const state = new TouchInputState(); state.begin('movement', 1);
  state.move('movement', 1, Math.cos(angle) * radius, Math.sin(angle) * radius, 1);
  return state;
}
describe('touch combat priorities and equal sectors', () => {
  it.each(sectors.map((direction, i) => ({ direction, i })))('sector $i maps movement and facing to the same digital direction', ({ direction, i }) => {
    for (const offset of [-0.38, 0, 0.38]) {
      const s = moving(i * Math.PI / 4 + offset);
      expect(s.getMovement()).toEqual({ ...neutral, ...direction });
      const m = s.getMovement();
      expect(s.samplePlayerInput(context)).toEqual({ ...m, aimAngle: Math.atan2(Number(m.down) - Number(m.up), Number(m.right) - Number(m.left)), shooting: false });
    }
  });
  it.each([0, 1, 2, 3, 4, 5, 6, 7])('boundary after sector %s is at the 22.5 degree half-sector', i => {
    const boundary = i * Math.PI / 4 + Math.PI / 8;
    expect(moving(boundary - 0.00001).getMovement()).toEqual({ ...neutral, ...sectors[i] });
    expect(moving(boundary + 0.00001).getMovement()).toEqual({ ...neutral, ...sectors[(i + 1) % 8] });
  });
  it('slight cardinal thumb drift stays cardinal, radial dead zone applies to diagonals', () => {
    expect(moving(Math.atan2(0.25, 1)).getMovement()).toEqual({ ...neutral, right: true });
    expect(moving(Math.PI / 4, 0.17).getMovement()).toEqual(neutral);
    expect(moving(Math.PI / 4, 0.20).getMovement()).toEqual({ ...neutral, right: true, down: true });
  });
  it('center-held fires toward fallback; meaningful analog aim stays while held and resets next hold', () => {
    const s = moving(0); s.begin('aim', 2);
    expect(s.samplePlayerInput(context)).toMatchObject({ right: true, aimAngle: 0.8, shooting: true });
    s.move('aim', 2, Math.cos(0.123), Math.sin(0.123), 1);
    s.move('movement', 1, 0, -1, 1);
    expect(s.samplePlayerInput(context)).toMatchObject({ up: true, shooting: true });
    expect(s.samplePlayerInput(context).aimAngle).toBeCloseTo(0.123);
    s.move('aim', 2, 0, 0, 1);
    expect(s.samplePlayerInput(context).aimAngle).toBeCloseTo(0.123);
    s.end('aim', 2);
    expect(s.samplePlayerInput(context)).toMatchObject({ aimAngle: -Math.PI / 2, shooting: false });
    s.begin('aim', 3);
    expect(s.samplePlayerInput({ ...context, fallbackAimAngle: 1.7 }).aimAngle).toBe(1.7);
    s.end('aim', 3); s.end('movement', 1);
    expect(s.samplePlayerInput({ ...context, fallbackAimAngle: 1.9 })).toEqual({ ...neutral, aimAngle: 1.9, shooting: false });
  });
});
