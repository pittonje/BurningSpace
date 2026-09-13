import { describe, expect, it } from 'vitest';
import { TouchInputSource } from '../src/input/TouchInputSource';
import { FakeDocument, pointer } from './fakeTouchDom';
import type { PlayerInputContext } from '../src/input/GameplayInputSource';

const context: PlayerInputContext = { camera: { getWorldPoint: (x, y) => ({ x, y }) }, aimOrigin: { x: 0, y: 0 }, canShoot: true, fallbackAimAngle: 0.5 };
function fixture() {
  const doc = new FakeDocument(); const source = new TouchInputSource(doc.body as unknown as HTMLElement);
  const root = doc.body.children[0]!;
  const control = (name: string) => root.children.find(e => e.dataset.control === name)!;
  return { doc, source, root, control };
}

describe('touch overlay Pointer Events and resource lifecycle', () => {
  it.each(['pointerup', 'pointercancel', 'lostpointercapture'])('%s releases FIRE and leaves other pointers active', event => {
    const f = fixture();
    f.control('movement').dispatchEvent(pointer('pointerdown', 1, 100, 60));
    f.control('aim').dispatchEvent(pointer('pointerdown', 2, 60, 100));
    f.control('fire').dispatchEvent(pointer('pointerdown', 3));
    expect(f.source.samplePlayerInput(context)).toMatchObject({ right: true, aimAngle: Math.PI / 2, shooting: true });
    f.control('fire').dispatchEvent(pointer(event, 3));
    expect(f.source.samplePlayerInput(context)).toMatchObject({ right: true, aimAngle: Math.PI / 2, shooting: false });
    expect(f.control('movement').captured.has(1)).toBe(true);
    expect(f.control('aim').captured.has(2)).toBe(true);
  });
  it.each(['movement', 'aim'])('cancelled %s pointer cannot be revived by late moves', control => {
    const f = fixture(); const element = f.control(control);
    element.dispatchEvent(pointer('pointerdown', 8, 60, 100));
    element.dispatchEvent(pointer('pointercancel', 8));
    element.dispatchEvent(pointer('pointermove', 8, 100, 60));
    expect(f.source.getMovement()).toEqual({ up: false, down: false, left: false, right: false });
    expect(element.children[1]!.style.transform).toBe('translate(0px, 0px)');
    expect(element.classes.has('is-held')).toBe(false);
  });
  it('ignores a second pointer on an owned stick and suppresses native gestures', () => {
    const f = fixture(); const movement = f.control('movement');
    const down = pointer('pointerdown', 1, 100, 60); movement.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    movement.dispatchEvent(pointer('pointerdown', 2, 20, 60));
    movement.dispatchEvent(pointer('pointermove', 2, 20, 60));
    expect(f.source.getMovement().right).toBe(true);
    movement.dispatchEvent(pointer('pointerup', 2)); expect(f.source.getMovement().right).toBe(true);
    const menu = new Event('contextmenu', { cancelable: true }); movement.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
  });
  it('reset and resize release all captures, neutralize knobs and discard pending back', () => {
    const f = fixture();
    for (const [i, control] of f.root.children.entries()) control.dispatchEvent(pointer('pointerdown', i + 1, 100, 60));
    f.source.reset();
    expect(f.root.children.every(c => c.captured.size === 0 && !c.classes.has('is-held'))).toBe(true);
    expect(f.source.getMovement().right).toBe(false); expect(f.source.samplePlayerInput(context).shooting).toBe(false);
    expect(f.source.consumeBackRequest()).toBe(false);
    f.control('movement').dispatchEvent(pointer('pointerdown', 10, 100, 60));
    f.doc.defaultView.dispatchEvent(new Event('resize'));
    expect(f.source.getMovement().right).toBe(false);
    expect(f.doc.body.children).toHaveLength(1);
  });
  it('creates one fresh overlay per source; destroy removes listeners and DOM exactly once', () => {
    const f = fixture(); f.control('fire').dispatchEvent(pointer('pointerdown', 3));
    f.source.destroy(); f.source.destroy();
    expect(f.doc.body.children).toHaveLength(0);
    expect(f.root.children.every(c => c.listenerCount === 0 && c.captured.size === 0)).toBe(true);
    f.control('fire').dispatchEvent(pointer('pointerdown', 3));
    expect(f.source.samplePlayerInput(context).shooting).toBe(false);
    const next = new TouchInputSource(f.doc.body as unknown as HTMLElement);
    expect(f.doc.body.children).toHaveLength(1); expect(f.doc.body.children[0]).not.toBe(f.root);
    next.destroy(); expect(f.doc.body.children).toHaveLength(0);
  });
  it('routes LOBBY as one-shot semantic intent', () => {
    const f = fixture(); f.control('back').dispatchEvent(pointer('pointerdown', 5));
    expect(f.source.consumeBackRequest()).toBe(true); expect(f.source.consumeBackRequest()).toBe(false);
  });
  it('fails safe if pointer capture fails', () => {
    const f = fixture(); f.control('fire').captureFails = true;
    f.control('fire').dispatchEvent(pointer('pointerdown', 1));
    expect(f.source.samplePlayerInput(context).shooting).toBe(false);
    f.control('back').captureFails = true; f.control('back').dispatchEvent(pointer('pointerdown', 2));
    expect(f.source.consumeBackRequest()).toBe(false);
  });
});
