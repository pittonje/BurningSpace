export const IDENTITY_STORAGE_KEY = 'burningspace.identity.v1';
const IDENTITY_STORAGE_VERSION = 1;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CREDENTIAL_PATTERN = /^bsc1_[A-Za-z0-9_-]{43}$/;

export interface DurableIdentity {
  readonly version: 1;
  readonly playerId: string;
  readonly credential: string;
}

export type IdentityReadResult =
  | { readonly status: 'missing' }
  | { readonly status: 'available'; readonly identity: DurableIdentity }
  | { readonly status: 'unavailable' }
  | { readonly status: 'malformed' };

export type IdentityWriteResult = 'saved' | 'unavailable';
export type IdentityClearResult = 'cleared' | 'unavailable';

function isDurableIdentityShape(value: unknown): value is DurableIdentity {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    record.version === IDENTITY_STORAGE_VERSION &&
    typeof record.playerId === 'string' &&
    UUID_PATTERN.test(record.playerId) &&
    typeof record.credential === 'string' &&
    CREDENTIAL_PATTERN.test(record.credential)
  );
}

/**
 * Result-based read: never throws. A malformed or unavailable value is
 * reported distinctly from "missing" so callers never silently treat
 * storage corruption or access failure as "no identity yet".
 */
export function readIdentity(): IdentityReadResult {
  let raw: string | null;

  try {
    raw = localStorage.getItem(IDENTITY_STORAGE_KEY);
  } catch {
    return { status: 'unavailable' };
  }

  if (raw === null) {
    return { status: 'missing' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'malformed' };
  }

  if (!isDurableIdentityShape(parsed)) {
    return { status: 'malformed' };
  }

  return { status: 'available', identity: parsed };
}

export function saveIdentity(identity: DurableIdentity): IdentityWriteResult {
  try {
    localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity));
    return 'saved';
  } catch {
    return 'unavailable';
  }
}

export function clearIdentity(): IdentityClearResult {
  try {
    localStorage.removeItem(IDENTITY_STORAGE_KEY);
    return 'cleared';
  } catch {
    return 'unavailable';
  }
}
