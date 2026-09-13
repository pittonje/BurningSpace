import { afterEach, describe, expect, it, vi } from 'vitest';
import { INPUT_MODE_STORAGE_KEY, parseInputPreference, readInputPreference, resolveInputMode, saveInputPreference } from '../src/input/inputMode';

afterEach(() => vi.unstubAllGlobals());
const desktop = { maxTouchPoints: 0, coarsePointer: false, noHover: false };
const touch = { maxTouchPoints: 5, coarsePointer: true, noHover: true };

describe('input mode selection and local preference', () => {
  it.each([
    [desktop, 'desktop'], [touch, 'touch'],
    [{ ...touch, coarsePointer: false }, 'desktop'],
    [{ ...touch, noHover: false }, 'desktop'],
    [{ ...touch, maxTouchPoints: 0 }, 'desktop']
  ] as const)('resolves Auto from primary interaction capabilities (%j)', (capabilities, expected) => {
    expect(resolveInputMode('auto', capabilities)).toBe(expected);
  });
  it('manual overrides win on either device model', () => {
    expect(resolveInputMode('desktop', touch)).toBe('desktop');
    expect(resolveInputMode('touch', desktop)).toBe('touch');
  });
  it.each([null, undefined, '', 'mobile', '{bad json}', 'TOUCH'])('unknown stored value %s becomes Auto', value => {
    expect(parseInputPreference(value)).toBe('auto');
  });
  it('persists valid preference across independent reads', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
    expect(saveInputPreference('touch', storage)).toBe('touch');
    expect(data.get(INPUT_MODE_STORAGE_KEY)).toBe('touch');
    expect(readInputPreference(storage)).toBe('touch');
    expect(saveInputPreference('desktop', storage)).toBe('desktop');
    expect(readInputPreference(storage)).toBe('desktop');
    expect(saveInputPreference('bad', storage)).toBe('auto');
  });
  it('fails to Auto when storage is missing or throws', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readInputPreference()).toBe('auto');
    expect(saveInputPreference('touch')).toBe('auto');
    const storage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } as unknown as Storage;
    expect(readInputPreference(storage)).toBe('auto');
    expect(saveInputPreference('touch', storage)).toBe('auto');
  });
  it('reads only capability queries and tolerates absent browser APIs', () => {
    const queries = vi.fn((q: string) => ({ matches: q === '(pointer: coarse)' || q === '(hover: none)' }));
    vi.stubGlobal('navigator', { maxTouchPoints: 2 }); vi.stubGlobal('matchMedia', queries);
    expect(resolveInputMode('auto')).toBe('touch');
    expect(queries.mock.calls.map(([q]) => q)).toEqual(['(pointer: coarse)', '(hover: none)']);
    vi.stubGlobal('navigator', undefined); vi.stubGlobal('matchMedia', undefined);
    expect(resolveInputMode('auto')).toBe('desktop');
  });
  it('catches storage property access errors, not only getItem/setItem errors', () => {
    vi.stubGlobal('localStorage', undefined);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('security'); } });
    expect(readInputPreference()).toBe('auto'); expect(saveInputPreference('touch')).toBe('auto');
  });
});
