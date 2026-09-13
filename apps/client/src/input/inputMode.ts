export type InputModePreference = 'auto' | 'desktop' | 'touch';
export type ResolvedInputMode = Exclude<InputModePreference, 'auto'>;
export const INPUT_MODE_STORAGE_KEY = 'burningspace.controls.mode.v1';

export function parseInputPreference(value: unknown): InputModePreference {
  return value === 'desktop' || value === 'touch' ? value : 'auto';
}

function browserStorage(): Storage | undefined {
  try { return globalThis.localStorage; } catch { return undefined; }
}

export function readInputPreference(storage: Pick<Storage, 'getItem'> | undefined = browserStorage()): InputModePreference {
  try { return parseInputPreference(storage?.getItem(INPUT_MODE_STORAGE_KEY)); } catch { return 'auto'; }
}

export function saveInputPreference(value: unknown, storage: Pick<Storage, 'setItem'> | undefined = browserStorage()): InputModePreference {
  const preference = parseInputPreference(value);
  try {
    if (!storage) return 'auto';
    storage.setItem(INPUT_MODE_STORAGE_KEY, preference);
    return preference;
  } catch { return 'auto'; }
}

interface InputCapabilities {
  maxTouchPoints: number;
  coarsePointer: boolean;
  noHover: boolean;
}

function browserCapabilities(): InputCapabilities {
  try {
    return {
      maxTouchPoints: globalThis.navigator?.maxTouchPoints ?? 0,
      coarsePointer: globalThis.matchMedia?.('(pointer: coarse)').matches ?? false,
      noHover: globalThis.matchMedia?.('(hover: none)').matches ?? false
    };
  } catch { return { maxTouchPoints: 0, coarsePointer: false, noHover: false }; }
}

export function resolveInputMode(
  preference: InputModePreference,
  capabilities = browserCapabilities()
): ResolvedInputMode {
  if (preference !== 'auto') return preference;
  return capabilities.maxTouchPoints > 0 && capabilities.coarsePointer && capabilities.noHover
    ? 'touch' : 'desktop';
}
