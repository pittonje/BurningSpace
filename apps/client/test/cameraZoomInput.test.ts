import { describe, expect, it } from 'vitest';
import { CameraZoomInput, clampCameraZoom, smoothCameraZoom } from '../src/input/CameraZoomInput';
import { CAMERA_ZOOM } from '../src/config/gameConfig';
import { TouchInputSource } from '../src/input/TouchInputSource';
import { FakeDocument, pointer } from './fakeTouchDom';

function fixture(mode: 'touch' | 'desktop' = 'touch') {
  const doc = new FakeDocument(); const canvas = doc.createElement('canvas');
  canvas.style.touchAction = 'pan-y'; doc.body.append(canvas);
  const input = new CameraZoomInput(canvas as unknown as HTMLCanvasElement, mode);
  return { doc, canvas, input };
}
function wheel(deltaY: number, deltaMode = 0) {
  return Object.assign(new Event('wheel', { cancelable: true }), { deltaY, deltaMode });
}
describe('local tactical zoom', () => {
  it('defaults to .86 and clamps to .40..1.15, showing a local battlefield on phone', () => {
    expect(CAMERA_ZOOM).toBe(0.86);
    expect(clampCameraZoom(0.1)).toBe(0.4); expect(clampCameraZoom(10)).toBe(1.15);
    expect(clampCameraZoom(NaN)).toBe(0.86);
    expect(844 / clampCameraZoom(0)).toBeLessThan(12000);
  });
  it('smoothly converges independently of frame rate without overshoot', () => {
    const atRate = (rate: number) => { let z = 0.86; for (let i = 0; i < rate; i++) z = smoothCameraZoom(z, 0.4, 1 / rate); return z; };
    expect(atRate(30)).toBeCloseTo(atRate(144), 12);
    expect(smoothCameraZoom(0.86, 1.15, 1 / 60)).toBeGreaterThan(0.86);
    expect(smoothCameraZoom(0.86, 1.15, 1 / 60)).toBeLessThan(1.15);
    expect(smoothCameraZoom(0.86, 1.15, 0)).toBe(0.86);
  });
  it('wheel direction, canvas scroll suppression and cleanup preserve lobby behavior', () => {
    const f = fixture('desktop'); const up = wheel(-60); f.canvas.dispatchEvent(up);
    expect(up.defaultPrevented).toBe(true); expect(f.input.consumeScaleFactor()).toBeGreaterThan(1);
    expect(f.input.consumeScaleFactor()).toBe(1);
    f.canvas.dispatchEvent(wheel(3, 1)); expect(f.input.consumeScaleFactor()).toBeLessThan(1);
    expect(f.canvas.style.touchAction).toBe('pan-y');
    f.input.destroy(); f.input.destroy(); expect(f.canvas.listenerCount).toBe(0);
    const after = wheel(-50); f.canvas.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false); expect(f.input.consumeScaleFactor()).toBe(1);
  });
  it('two free pointers pinch by distance ratio, one alone does not zoom', () => {
    const f = fixture();
    f.canvas.dispatchEvent(pointer('pointerdown', 1, 0, 0));
    f.canvas.dispatchEvent(pointer('pointermove', 1, 10, 0)); expect(f.input.consumeScaleFactor()).toBe(1);
    f.canvas.dispatchEvent(pointer('pointerdown', 2, 110, 0));
    f.canvas.dispatchEvent(pointer('pointermove', 2, 210, 0)); expect(f.input.consumeScaleFactor()).toBe(2);
    f.canvas.dispatchEvent(pointer('pointermove', 2, 60, 0)); expect(f.input.consumeScaleFactor()).toBe(0.25);
  });
  it.each(['pointercancel', 'pointerup', 'lostpointercapture', 'reset', 'resize'])('%s releases pinch and ignores late moves', action => {
    const f = fixture();
    f.canvas.dispatchEvent(pointer('pointerdown', 1, 0, 0)); f.canvas.dispatchEvent(pointer('pointerdown', 2, 100, 0));
    if (action === 'reset') f.input.reset();
    else if (action === 'resize') f.doc.defaultView.dispatchEvent(new Event('resize'));
    else f.canvas.dispatchEvent(pointer(action, 1));
    f.canvas.dispatchEvent(pointer('pointermove', 2, 300, 0));
    expect(f.input.consumeScaleFactor()).toBe(1); expect(f.canvas.captured.size).toBe(0);
  });
  it('MOVE + AIM/FIRE + LOBBY cannot zoom; two additional free canvas pointers can', () => {
    const f = fixture(); const touch = new TouchInputSource(f.doc.body as unknown as HTMLElement);
    const root = f.doc.body.children[1]!;
    expect(root.children.map(c => c.dataset.control)).toEqual(['movement', 'aim', 'back']);
    const [move, aim, back] = root.children;
    move!.dispatchEvent(pointer('pointerdown', 1, 100, 60)); aim!.dispatchEvent(pointer('pointerdown', 2, 60, 100));
    back!.dispatchEvent(pointer('pointerdown', 3));
    move!.dispatchEvent(pointer('pointermove', 1, 120, 60)); aim!.dispatchEvent(pointer('pointermove', 2, 20, 60));
    expect(f.input.consumeScaleFactor()).toBe(1); expect(f.canvas.captured.size).toBe(0);
    expect(touch.samplePlayerInput({ camera: { getWorldPoint: (x, y) => ({ x, y }) }, aimOrigin: { x: 0, y: 0 }, canShoot: true, fallbackAimAngle: 0 })).toMatchObject({ right: true, shooting: true, aimAngle: Math.PI });
    f.canvas.dispatchEvent(pointer('pointerdown', 4, 0, 0)); f.canvas.dispatchEvent(pointer('pointerdown', 5, 100, 0));
    aim!.dispatchEvent(pointer('pointermove', 2, 60, 100)); expect(f.input.consumeScaleFactor()).toBe(1);
    f.canvas.dispatchEvent(pointer('pointermove', 5, 150, 0)); expect(f.input.consumeScaleFactor()).toBe(1.5);
    touch.destroy(); f.input.destroy();
    expect(f.doc.body.children).toEqual([f.canvas]); expect(f.canvas.style.touchAction).toBe('pan-y');
    expect(f.canvas.listenerCount).toBe(0);
  });
  it('ignores third and mouse pointers and fails safe when capture fails', () => {
    const f = fixture(); f.canvas.captureFails = true;
    f.canvas.dispatchEvent(pointer('pointerdown', 1)); expect(f.canvas.captured.size).toBe(0);
    f.canvas.captureFails = false;
    f.canvas.dispatchEvent(Object.assign(pointer('pointerdown', 1), { pointerType: 'mouse' }));
    expect(f.canvas.captured.size).toBe(0);
    f.canvas.dispatchEvent(pointer('pointerdown', 2, 0, 0)); f.canvas.dispatchEvent(pointer('pointerdown', 3, 100, 0));
    f.canvas.dispatchEvent(pointer('pointerdown', 4, 200, 0)); f.canvas.dispatchEvent(pointer('pointermove', 4, 400, 0));
    expect(f.canvas.captured.size).toBe(2); expect(f.input.consumeScaleFactor()).toBe(1);
  });
});
