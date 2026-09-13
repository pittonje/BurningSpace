/** Small event/geometry fake for owned overlay resources; no renderer emulation. */
export class FakeElement extends EventTarget {
  children: FakeElement[] = [];
  parent?: FakeElement;
  className = '';
  textContent = '';
  value = '';
  type = '';
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  attributes = new Map<string, string>();
  classes = new Set<string>();
  classList = { toggle: (name: string, active: boolean) => active ? this.classes.add(name) : this.classes.delete(name) };
  captured = new Set<number>();
  captureFails = false;
  listenerCount = 0;
  rect = { left: 0, top: 0, width: 120, height: 120 };
  get offsetWidth() { return this.className === 'touch-controls__knob' ? 44 : this.rect.width; }

  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) { super(); }
  append(...items: (FakeElement | string)[]) {
    for (const item of items) {
      if (typeof item === 'string') { this.textContent += item; continue; }
      item.parent = this; this.children.push(item);
    }
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this);
    this.parent = undefined;
  }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getBoundingClientRect() { return this.rect; }
  setPointerCapture(id: number) { if (this.captureFails) throw Error('capture unavailable'); this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); this.dispatchEvent(pointer('lostpointercapture', id)); }
  override addEventListener(...args: Parameters<EventTarget['addEventListener']>) { this.listenerCount++; super.addEventListener(...args); }
  override removeEventListener(...args: Parameters<EventTarget['removeEventListener']>) { this.listenerCount--; super.removeEventListener(...args); }
}

export class FakeDocument {
  defaultView = new EventTarget();
  body = new FakeElement(this, 'body');
  createElement(tag: string) { return new FakeElement(this, tag); }
}

export function pointer(type: string, pointerId: number, clientX = 60, clientY = 60, button = 0): PointerEvent {
  return Object.assign(new Event(type, { cancelable: true }), { pointerId, clientX, clientY, button, pointerType: 'touch' }) as PointerEvent;
}

export function descendants(root: FakeElement): FakeElement[] {
  return [root, ...root.children.flatMap(descendants)];
}
