import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetworkTestScene } from '../src/scenes/NetworkTestScene';
import { INPUT_MODE_STORAGE_KEY } from '../src/input/inputMode';
import { descendants, FakeDocument } from './fakeTouchDom';

vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../src/network/networkSession', () => ({ networkClient: { getConnectionState: () => ({ lifecycle: 'idle' }) } }));

afterEach(() => vi.unstubAllGlobals());
describe('lobby local Controls selector', () => {
  it('offers Auto/Desktop/Touch, persists selection and never adds controls to the profile', () => {
    const doc = new FakeDocument(); const data = new Map<string, string>();
    vi.stubGlobal('document', doc);
    vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) });
    const scene = new NetworkTestScene() as unknown as { createUi(): void; getProfile(): object; destroyUi(): void };
    scene.createUi();
    const label = descendants(doc.body).find(e => e.tagName === 'label' && e.children[0]?.textContent === 'Controls')!;
    const select = label.children[1]!;
    expect(select.value).toBe('auto');
    expect(select.children.map(o => [o.value, o.textContent])).toEqual([
      ['auto', 'Auto'], ['desktop', 'Keyboard + Mouse'], ['touch', 'Touch']
    ]);
    select.value = 'touch'; select.dispatchEvent(new Event('change'));
    expect(data.get(INPUT_MODE_STORAGE_KEY)).toBe('touch');
    expect(Object.keys(scene.getProfile()).sort()).toEqual(['faction', 'mode', 'nickname']);
    scene.destroyUi(); expect(doc.body.children).toHaveLength(0);
    scene.createUi();
    const freshLabel = descendants(doc.body).find(e => e.tagName === 'label' && e.children[0]?.textContent === 'Controls')!;
    expect(freshLabel.children[1]!.value).toBe('touch');
    scene.destroyUi();
  });
  it('keeps the selector on Auto when storage cannot save', () => {
    const doc = new FakeDocument(); vi.stubGlobal('document', doc);
    vi.stubGlobal('localStorage', { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
    const scene = new NetworkTestScene() as unknown as { createUi(): void; destroyUi(): void };
    scene.createUi();
    const select = descendants(doc.body).find(e => e.tagName === 'label' && e.children[0]?.textContent === 'Controls')!.children[1]!;
    expect(select.value).toBe('auto'); select.value = 'touch'; select.dispatchEvent(new Event('change'));
    expect(select.value).toBe('auto'); scene.destroyUi();
  });
});
