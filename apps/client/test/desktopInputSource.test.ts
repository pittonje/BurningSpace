import { createRequire } from 'node:module';
import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { DesktopInputSource } from '../src/input/DesktopInputSource';
import type { PlayerInputContext } from '../src/input/GameplayInputSource';

// Exercise Phaser's actual Key/JustDown/Angle functions without loading its renderer.
vi.mock('phaser', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  return { default: {
    Input: { Keyboard: {
      KeyCodes: require('phaser/src/input/keyboard/keys/KeyCodes.js'),
      JustDown: require('phaser/src/input/keyboard/keys/JustDown.js')
    } },
    Math: { Angle: { Between: require('phaser/src/math/angle/Between.js') } }
  } };
});

const require = createRequire(import.meta.url);
const Key = require('phaser/src/input/keyboard/keys/Key.js') as typeof Phaser.Input.Keyboard.Key;
const codes = require('phaser/src/input/keyboard/keys/KeyCodes.js') as Record<string, number>;
const neutral = { up: false, down: false, left: false, right: false };

function fixture() {
  const keys = new Map<number, Phaser.Input.Keyboard.Key>();
  const keyboard: {
    addKey: ReturnType<typeof vi.fn<(code: number) => Phaser.Input.Keyboard.Key>>;
    createCursorKeys(): Phaser.Types.Input.Keyboard.CursorKeys;
    removeKey: ReturnType<typeof vi.fn<(key: Phaser.Input.Keyboard.Key, destroy: boolean) => void>>;
  } = {
    addKey: vi.fn((code: number) => {
      const key = new Key(keyboard as unknown as Phaser.Input.Keyboard.KeyboardPlugin, code);
      keys.set(code, key);
      return key;
    }),
    createCursorKeys: () => ({
      up: keyboard.addKey(codes.UP!), down: keyboard.addKey(codes.DOWN!),
      left: keyboard.addKey(codes.LEFT!), right: keyboard.addKey(codes.RIGHT!),
      space: keyboard.addKey(codes.SPACE!), shift: keyboard.addKey(codes.SHIFT!)
    }),
    removeKey: vi.fn((key: Phaser.Input.Keyboard.Key, destroy: boolean) => {
      keys.delete(key.keyCode);
      if (destroy) key.destroy();
    })
  };
  const pointer = { x: 30, y: 40, leftButtonDown: vi.fn(() => false) };
  const input = { keyboard, activePointer: pointer };
  const source = new DesktopInputSource(input as unknown as ConstructorParameters<typeof DesktopInputSource>[0]);
  const context: PlayerInputContext = {
    camera: { getWorldPoint: vi.fn((x, y) => ({ x: x * 2 + 100, y: y * 2 + 200 })) },
    aimOrigin: { x: 110, y: 240 },
    canShoot: true,
    fallbackAimAngle: 1.2
  };
  const key = (name: string) => keys.get(codes[name]!)!;
  const event = { timeStamp: 1, altKey: false, ctrlKey: false, shiftKey: false, metaKey: false, location: 0 } as KeyboardEvent;
  return { source, context, keyboard, input, keys, pointer, key, event };
}

describe('DesktopInputSource', () => {
  it.each([
    ['W', 'up'], ['UP', 'up'], ['S', 'down'], ['DOWN', 'down'],
    ['A', 'left'], ['LEFT', 'left'], ['D', 'right'], ['RIGHT', 'right']
  ] as const)('%s preserves %s for player and spectator intent', (name, direction) => {
    const f = fixture();
    f.key(name).onDown(f.event);
    const expected = { ...neutral, [direction]: true };
    expect(f.source.getMovement()).toEqual(expected);
    expect(f.source.samplePlayerInput(f.context)).toMatchObject(expected);
    f.key(name).onUp(f.event);
    expect(f.source.getMovement()).toEqual(neutral);
  });

  it('keeps aliases and opposite directions independent', () => {
    const f = fixture();
    for (const name of ['W', 'UP', 'S', 'LEFT', 'D']) f.key(name).onDown(f.event);
    f.key('W').onUp(f.event);
    expect(f.source.getMovement()).toEqual({ up: true, down: true, left: true, right: true });
  });

  it('produces neutral movement and fire when idle', () => {
    const f = fixture();
    expect(f.source.getMovement()).toEqual(neutral);
    expect(f.source.samplePlayerInput(f.context)).toMatchObject({ ...neutral, shooting: false });
  });

  it('transforms the active screen pointer through the camera before world-space aim', () => {
    const f = fixture();
    expect(f.source.samplePlayerInput(f.context).aimAngle).toBe(Math.atan2(40, 50));
    expect(f.context.camera.getWorldPoint).toHaveBeenCalledWith(30, 40);
    f.input.activePointer = { x: 5, y: 10, leftButtonDown: vi.fn(() => false) };
    expect(f.source.samplePlayerInput(f.context).aimAngle).toBe(-Math.PI / 2);
    expect(f.context.camera.getWorldPoint).toHaveBeenLastCalledWith(5, 10);
  });

  it('keeps mouse aim independent of every movement direction', () => {
    const f = fixture();
    for (const [key, direction] of [['W', 'up'], ['S', 'down'], ['A', 'left'], ['D', 'right']] as const) {
      f.key(key).onDown(f.event);
      expect(f.source.samplePlayerInput(f.context)).toMatchObject({
        ...neutral, [direction]: true, aimAngle: Math.atan2(40, 50)
      });
      f.key(key).onUp(f.event);
    }
    f.key('A').onDown(f.event);
    f.input.activePointer = { x: 5, y: 10, leftButtonDown: vi.fn(() => false) };
    expect(f.source.samplePlayerInput(f.context)).toMatchObject({ left: true, aimAngle: -Math.PI / 2 });
  });

  it.each(['mouse', 'space', 'both'])('preserves held %s shooting', (control) => {
    const f = fixture();
    if (control !== 'space') f.pointer.leftButtonDown.mockReturnValue(true);
    if (control !== 'mouse') f.key('SPACE').onDown(f.event);
    expect(f.source.samplePlayerInput(f.context).shooting).toBe(true);
    expect(f.source.samplePlayerInput(f.context).shooting).toBe(true);
    f.pointer.leftButtonDown.mockReturnValue(false);
    f.key('SPACE').onUp(f.event);
    expect(f.source.samplePlayerInput(f.context).shooting).toBe(false);
  });

  it('honors scene shooting eligibility even with both fire controls held', () => {
    const f = fixture();
    f.pointer.leftButtonDown.mockReturnValue(true);
    f.key('SPACE').onDown(f.event);
    expect(f.source.samplePlayerInput({ ...f.context, canShoot: false }).shooting).toBe(false);
  });

  it('consumes Esc once per press, not per held/repeated keydown', () => {
    const f = fixture();
    expect(f.source.consumeBackRequest()).toBe(false);
    f.key('ESC').onDown(f.event);
    expect(f.source.consumeBackRequest()).toBe(true);
    f.key('ESC').onDown(f.event);
    expect(f.source.consumeBackRequest()).toBe(false);
    f.key('ESC').onUp(f.event);
    f.key('ESC').onDown(f.event);
    expect(f.source.consumeBackRequest()).toBe(true);
    expect(f.source.consumeBackRequest()).toBe(false);
  });

  it('preserves JustDown release-before-sampling behavior', () => {
    const f = fixture();
    f.key('ESC').onDown(f.event);
    f.key('ESC').onUp(f.event);
    expect(f.source.consumeBackRequest()).toBe(false);
  });

  it('destroys and removes its keys once and becomes inactive', () => {
    const f = fixture();
    const ownedKeys = [...f.keys.values()];
    f.key('W').onDown(f.event);
    f.key('ESC').onDown(f.event);
    f.source.destroy();
    f.source.destroy();
    expect(f.keyboard.removeKey).toHaveBeenCalledTimes(11);
    for (const key of ownedKeys) expect(f.keyboard.removeKey).toHaveBeenCalledWith(key, true);
    expect(f.keys.size).toBe(0);
    expect(f.source.getMovement()).toEqual(neutral);
    expect(f.source.consumeBackRequest()).toBe(false);
    expect(f.source.samplePlayerInput(f.context).shooting).toBe(false);
    expect(ownedKeys.every(key => key.listenerCount('down') === 0)).toBe(true);
  });

  it('preserves the missing keyboard failure', () => {
    expect(() => new DesktopInputSource({ keyboard: null } as unknown as ConstructorParameters<typeof DesktopInputSource>[0]))
      .toThrow('Keyboard input is unavailable.');
  });
});
