import type { GameplayInputSource, PlayerInputContext } from './GameplayInputSource';
import { TouchInputState } from './TouchInputState';

export class TouchInputSource implements GameplayInputSource {
  private readonly state = new TouchInputState();
  private readonly root: HTMLDivElement;
  private readonly disposers: (() => void)[] = [];
  private readonly captures = new Map<number, HTMLElement>();
  private readonly renderers: (() => void)[] = [];
  private destroyed = false;

  constructor(parent: HTMLElement = document.body) {
    const doc = parent.ownerDocument;
    this.root = doc.createElement('div');
    this.root.className = 'touch-controls';
    this.root.setAttribute('aria-label', 'Touch gameplay controls');
    for (const [control, label] of [
      ['movement', 'MOVE'], ['aim', 'AIM / FIRE'], ['back', 'LOBBY']
    ] as const) {
      const element = doc.createElement('button');
      element.type = 'button';
      element.className = `touch-controls__control touch-controls__${control}`;
      element.dataset.control = control;
      element.setAttribute('aria-label', label);
      const caption = doc.createElement('span');
      caption.className = 'touch-controls__label';
      caption.textContent = label;
      element.append(caption);
      const knob = control === 'movement' || control === 'aim' ? doc.createElement('span') : undefined;
      if (knob) { knob.className = 'touch-controls__knob'; element.append(knob); }
      this.root.append(element);
      const radius = () => Math.max(1, (element.getBoundingClientRect().width - (knob?.offsetWidth ?? 0)) / 2);
      const render = () => {
        if (knob && (control === 'movement' || control === 'aim')) {
          const vector = this.state.getVector(control);
          knob.style.transform = `translate(${vector.x * radius()}px, ${vector.y * radius()}px)`;
        }
        element.classList.toggle('is-held', [...this.captures.values()].includes(element));
      };
      this.renderers.push(render);
      const move = (event: PointerEvent) => {
        if (!this.state.owns(control, event.pointerId)) return;
        const rect = element.getBoundingClientRect();
        this.state.move(control, event.pointerId, event.clientX - rect.left - rect.width / 2,
          event.clientY - rect.top - rect.height / 2, radius());
        render();
      };
      this.listen(element, 'pointerdown', (event: PointerEvent) => {
        event.preventDefault();
        if (this.destroyed || event.button !== 0 || !this.state.begin(control, event.pointerId)) return;
        try { element.setPointerCapture(event.pointerId); } catch {
          this.state.end(control, event.pointerId);
          if (control === 'back') this.state.consumeBackRequest();
          return;
        }
        this.captures.set(event.pointerId, element);
        move(event);
      });
      this.listen(element, 'pointermove', (event: PointerEvent) => { event.preventDefault(); move(event); });
      const release = (event: PointerEvent) => {
        if (!this.state.owns(control, event.pointerId)) return;
        this.state.end(control, event.pointerId);
        this.captures.delete(event.pointerId);
        this.releaseCapture(element, event.pointerId);
        render();
      };
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
        this.listen(element, name, release);
      }
      this.listen(element, 'contextmenu', event => event.preventDefault());
    }
    // A resize invalidates stick centers. Release pointers, but never replace the source.
    const view = doc.defaultView;
    if (view) {
      const reset = () => this.reset();
      view.addEventListener('resize', reset);
      this.disposers.push(() => view.removeEventListener('resize', reset));
    }
    parent.append(this.root);
  }

  private listen<K extends keyof HTMLElementEventMap>(
    element: HTMLElement, name: K, listener: (event: HTMLElementEventMap[K]) => void
  ): void {
    element.addEventListener(name, listener, { passive: false });
    this.disposers.push(() => element.removeEventListener(name, listener));
  }

  private releaseCapture(element: HTMLElement, id: number): void {
    try { if (element.hasPointerCapture(id)) element.releasePointerCapture(id); } catch { /* Already cancelled by the browser. */ }
  }

  getMovement() { return this.state.getMovement(); }
  samplePlayerInput(context: PlayerInputContext) { return this.state.samplePlayerInput(context); }
  consumeBackRequest() { return this.state.consumeBackRequest(); }

  reset(): void {
    this.state.reset();
    const captures = [...this.captures];
    this.captures.clear();
    for (const [id, element] of captures) this.releaseCapture(element, id);
    for (const render of this.renderers) render();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.reset();
    for (const dispose of this.disposers.splice(0)) dispose();
    this.root.remove();
  }
}
