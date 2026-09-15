import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearIdentity,
  IDENTITY_STORAGE_KEY,
  readIdentity,
  saveIdentity,
  type DurableIdentity
} from '../src/network/identityStorage';

const VALID_IDENTITY: DurableIdentity = {
  version: 1,
  playerId: '11111111-2222-4333-8444-555555555555',
  credential: `bsc1_${'A'.repeat(43)}`
};

function stubStorage(initial: Record<string, string> = {}): Map<string, string> {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key)
  });
  return store;
}

afterEach(() => vi.unstubAllGlobals());

describe('identityStorage', () => {
  it('reports missing when nothing is stored', () => {
    stubStorage();
    expect(readIdentity()).toEqual({ status: 'missing' });
  });

  it('reports available for a valid stored identity', () => {
    stubStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify(VALID_IDENTITY) });
    expect(readIdentity()).toEqual({ status: 'available', identity: VALID_IDENTITY });
  });

  it('reports malformed for invalid JSON', () => {
    stubStorage({ [IDENTITY_STORAGE_KEY]: 'not json{{{' });
    expect(readIdentity()).toEqual({ status: 'malformed' });
  });

  it('reports malformed for the wrong version', () => {
    stubStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify({ ...VALID_IDENTITY, version: 2 }) });
    expect(readIdentity()).toEqual({ status: 'malformed' });
  });

  it('reports malformed for a syntactically invalid UUID', () => {
    stubStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify({ ...VALID_IDENTITY, playerId: 'not-a-uuid' }) });
    expect(readIdentity()).toEqual({ status: 'malformed' });
  });

  it('reports malformed for a syntactically invalid credential', () => {
    stubStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify({ ...VALID_IDENTITY, credential: 'bsc1_short' }) });
    expect(readIdentity()).toEqual({ status: 'malformed' });

    stubStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify({ ...VALID_IDENTITY, credential: `wrong_${'A'.repeat(43)}` }) });
    expect(readIdentity()).toEqual({ status: 'malformed' });
  });

  it('reports unavailable when localStorage.getItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: vi.fn(),
      removeItem: vi.fn()
    });
    expect(readIdentity()).toEqual({ status: 'unavailable' });
  });

  it('reports unavailable when localStorage.setItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: vi.fn()
    });
    expect(saveIdentity(VALID_IDENTITY)).toBe('unavailable');
  });

  it('reports unavailable when localStorage.removeItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: () => {
        throw new Error('blocked');
      }
    });
    expect(clearIdentity()).toBe('unavailable');
  });

  it('round-trips a successful save and read', () => {
    const store = stubStorage();
    expect(saveIdentity(VALID_IDENTITY)).toBe('saved');
    expect(store.get(IDENTITY_STORAGE_KEY)).toBe(JSON.stringify(VALID_IDENTITY));
    expect(readIdentity()).toEqual({ status: 'available', identity: VALID_IDENTITY });
  });

  it('explicit clear removes the stored identity', () => {
    const store = stubStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify(VALID_IDENTITY) });
    expect(clearIdentity()).toBe('cleared');
    expect(store.has(IDENTITY_STORAGE_KEY)).toBe(false);
    expect(readIdentity()).toEqual({ status: 'missing' });
  });

  it('malformed/unavailable storage is never automatically cleared by a read', () => {
    const store = stubStorage({ [IDENTITY_STORAGE_KEY]: 'not json{{{' });
    readIdentity();
    expect(store.get(IDENTITY_STORAGE_KEY)).toBe('not json{{{');
  });

  it('never prints the raw credential when logging read results', () => {
    stubStorage({ [IDENTITY_STORAGE_KEY]: JSON.stringify(VALID_IDENTITY) });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const result = readIdentity();
    void result;
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
