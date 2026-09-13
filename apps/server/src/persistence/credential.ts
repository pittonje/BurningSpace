import { createHash, randomBytes } from 'node:crypto';

const CREDENTIAL_PREFIX = 'bsc1_';
const SECRET_BYTE_LENGTH = 32;
const ENCODED_SECRET_LENGTH = 43;
const CREDENTIAL_PATTERN = new RegExp(`^${CREDENTIAL_PREFIX}[A-Za-z0-9_-]{${ENCODED_SECRET_LENGTH}}$`);
const BASE64URL_CHARSET_PATTERN = /^[A-Za-z0-9_-]+$/;

// Domain-separated so this verifier can never collide with a hash computed
// for an unrelated purpose over the same raw bytes.
const VERIFIER_DOMAIN_SEPARATOR = Buffer.from('burningspace:guest-credential:v1\0', 'utf8');

export const CREDENTIAL_VERSION = 1;
export const CREDENTIAL_ALGORITHM = 'sha256';
export const CREDENTIAL_VERIFIER_LENGTH_BYTES = 32;

export interface GeneratedCredential {
  /** Wire format: bsc1_<43 base64url chars>. Exists only for the single caller that must return it once. */
  readonly credential: string;
  /** SHA-256 verifier over the domain separator + raw secret. Safe to persist/compare, never to log. */
  readonly verifier: Buffer;
}

export interface ParsedCredential {
  readonly verifier: Buffer;
}

function hashSecret(secret: Buffer): Buffer {
  const hash = createHash(CREDENTIAL_ALGORITHM);
  hash.update(VERIFIER_DOMAIN_SEPARATOR);
  hash.update(secret);
  return hash.digest();
}

/**
 * Strict base64url decode: rejects any input whose canonical re-encoding
 * would differ from the input (e.g. non-zero low bits in the final
 * sextet) even though Node's own decoder would silently truncate them.
 */
function decodeBase64UrlStrict(value: string): Buffer | undefined {
  if (!BASE64URL_CHARSET_PATTERN.test(value)) {
    return undefined;
  }

  const decoded = Buffer.from(value, 'base64url');

  if (decoded.toString('base64url') !== value) {
    return undefined;
  }

  return decoded;
}

export function generateCredential(): GeneratedCredential {
  const secret = randomBytes(SECRET_BYTE_LENGTH);
  const encoded = secret.toString('base64url');
  return {
    credential: `${CREDENTIAL_PREFIX}${encoded}`,
    verifier: hashSecret(secret)
  };
}

/**
 * Parses and validates the wire credential shape BEFORE any DB lookup.
 * Returns only the verifier -- the decoded secret never leaves this module.
 */
export function parseCredential(raw: unknown): ParsedCredential | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }

  if (!CREDENTIAL_PATTERN.test(raw)) {
    return undefined;
  }

  const encoded = raw.slice(CREDENTIAL_PREFIX.length);
  const secret = decodeBase64UrlStrict(encoded);

  if (!secret || secret.length !== SECRET_BYTE_LENGTH) {
    return undefined;
  }

  return { verifier: hashSecret(secret) };
}
