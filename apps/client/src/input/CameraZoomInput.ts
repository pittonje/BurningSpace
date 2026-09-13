import { CAMERA_ZOOM, CAMERA_ZOOM_MAX, CAMERA_ZOOM_MIN } from '../config/gameConfig';
import type { ResolvedInputMode } from './inputMode';

export function clampCameraZoom(value: number): number {
  return Number.isFinite(value) ? Math.max(CAMERA_ZOOM_MIN, Math.min(CAMERA_ZOOM_MAX, value)) : CAMERA_ZOOM;
}

export function smoothCameraZoom(current: number, target: number, deltaSeconds: number): number {
  const weight = 1 - Math.exp(-12 * Math.max(0, deltaSeconds));
  return clampCameraZoom(current + (clampCameraZoom(target) - current) * weight);
}

/** Canvas-only gestures. Overlay controls are siblings, never pinch candidates.
 * Emits a scale factor; only the scene reads or mutates the actual camera. */
export class CameraZoomInput {
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private readonly disposers: (() => void)[] = [];
  private distance?: number;
  private factor = 1;
  private destroyed = false;

  constructor(private readonly canvas: HTMLCanvasElement, mode: ResolvedInputMode) {
    if (mode === 'desktop') {
      this.listen('wheel', event => {
        event.preventDefault();
        const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
        if (Number.isFinite(pixels)) this.factor *= Math.exp(-Math.max(-100, Math.min(100, pixels)) * 0.0015);
      });
    } else {
      const previous = canvas.style.touchAction;
      canvas.style.touchAction = 'none';
      this.disposers.push(() => { canvas.style.touchAction = previous; });
      this.listen('pointerdown', event => {
        // A control-origin pointer never targets the canvas, even while dragged
        // across it: the control retains its own pointer capture.
        if (event.target !== canvas || event.pointerType !== 'touch' || this.pointers.size >= 2) return;
        event.preventDefault();
        try { canvas.setPointerCapture(event.pointerId); } catch { return; }
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        this.distance = this.currentDistance();
      });
      this.listen('pointermove', event => {
        if (!this.pointers.has(event.pointerId)) return;
        event.preventDefault();
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const distance = this.currentDistance();
        if (distance !== undefined && this.distance !== undefined && distance > 0 && this.distance > 0) {
          this.factor *= distance / this.distance;
        }
        this.distance = distance;
      });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
        this.listen(name, event => { if (this.pointers.has(event.pointerId)) this.reset(); });
      }
    }
    const view = canvas.ownerDocument.defaultView;
    if (view) {
      const reset = () => this.reset();
      view.addEventListener('resize', reset);
      this.disposers.push(() => view.removeEventListener('resize', reset));
    }
  }

  private listen<K extends keyof HTMLElementEventMap>(name: K, listener: (event: HTMLElementEventMap[K]) => void): void {
    this.canvas.addEventListener(name, listener, { passive: false });
    this.disposers.push(() => this.canvas.removeEventListener(name, listener));
  }

  private currentDistance(): number | undefined {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : undefined;
  }

  consumeScaleFactor(): number {
    const factor = this.factor;
    this.factor = 1;
    return factor;
  }

  reset(): void {
    const ids = [...this.pointers.keys()];
    this.pointers.clear();
    this.distance = undefined;
    this.factor = 1;
    for (const id of ids) {
      try { if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id); } catch { /* Browser already cancelled. */ }
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.reset();
    for (const dispose of this.disposers.splice(0)) dispose();
  }
}
