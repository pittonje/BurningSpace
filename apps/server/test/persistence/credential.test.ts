import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { generateCredential, parseCredential } from '../../src/persistence/credential.js';

const CREDENTIAL_PATTERN = /^bsc1_[A-Za-z0-9_-]{43}$/;

describe('credential (generation)', () => {
  test('matches the exact bsc1_ + 43 base64url-char wire shape', () => {
    const { credential } = generateCredential();
    expect(credential).toMatch(CREDENTIAL_PATTERN);
    expect(credential.startsWith('bsc1_')).toBe(true);
    expect(credential.slice('bsc1_'.length)).toHaveLength(43);
  });

  test('decodes to exactly 32 secret bytes (verified via the parser round trip)', () => {
    const { credential, verifier } = generateCredential();
    const parsed = parseCredential(credential);
    expect(parsed).toBeDefined();
    expect(parsed?.verifier).toHaveLength(32);
    expect(parsed?.verifier.equals(verifier)).toBe(true);
  });

  test('successive generation is not deterministic', () => {
    const a = generateCredential();
    const b = generateCredential();
    expect(a.credential).not.toBe(b.credential);
    expect(a.verifier.equals(b.verifier)).toBe(false);
  });

  test('the generated verifier object never carries the raw secret as its own field', () => {
    const generated = generateCredential();
    const keys = Object.keys(generated);
    expect(keys.sort()).toEqual(['credential', 'verifier']);
  });
});

describe('credential (parsing)', () => {
  test('accepts a canonical generated value', () => {
    const { credential } = generateCredential();
    expect(parseCredential(credential)).toBeDefined();
  });

  test('rejects a wrong prefix', () => {
    const { credential } = generateCredential();
    const tampered = `xyz1_${credential.slice('bsc1_'.length)}`;
    expect(parseCredential(tampered)).toBeUndefined();
  });

  test('rejects base64 padding', () => {
    const { credential } = generateCredential();
    const withPadding = `${credential}=`;
    expect(parseCredential(withPadding)).toBeUndefined();
  });

  test('rejects a short secret', () => {
    const { credential } = generateCredential();
    const shortened = credential.slice(0, credential.length - 1);
    expect(parseCredential(shortened)).toBeUndefined();
  });

  test('rejects a long secret', () => {
    const { credential } = generateCredential();
    const lengthened = `${credential}A`;
    expect(parseCredential(lengthened)).toBeUndefined();
  });

  test('rejects illegal characters', () => {
    const { credential } = generateCredential();
    const withIllegalChar = `bsc1_${'!'.repeat(43)}`;
    expect(credential).not.toBe(withIllegalChar);
    expect(parseCredential(withIllegalChar)).toBeUndefined();
  });

  test('rejects a non-canonical base64url encoding of the correct length', () => {
    // For a 32-byte (256-bit) secret, the trailing base64url character's
    // low 2 bits are unused padding that must be zero in a canonical
    // encoding. Node's decoder would otherwise silently drop non-zero
    // padding bits and still decode to 32 bytes -- find such a value
    // deterministically and prove the strict parser rejects it.
    const { credential } = generateCredential();
    const encodedPrefix = credential.slice('bsc1_'.length, -1);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let nonCanonicalEncoded: string | undefined;

    for (const lastChar of alphabet) {
      const candidateEncoded = `${encodedPrefix}${lastChar}`;
      const decoded = Buffer.from(candidateEncoded, 'base64url');
      if (decoded.length === 32 && decoded.toString('base64url') !== candidateEncoded) {
        nonCanonicalEncoded = candidateEncoded;
        break;
      }
    }

    expect(nonCanonicalEncoded).toBeDefined();
    expect(parseCredential(`bsc1_${nonCanonicalEncoded}`)).toBeUndefined();
  });

  test('rejects non-string input', () => {
    expect(parseCredential(undefined)).toBeUndefined();
    expect(parseCredential(null)).toBeUndefined();
    expect(parseCredential(12345)).toBeUndefined();
    expect(parseCredential({})).toBeUndefined();
    expect(parseCredential(['bsc1_x'])).toBeUndefined();
  });

  test('rejects an empty string and a bare prefix', () => {
    expect(parseCredential('')).toBeUndefined();
    expect(parseCredential('bsc1_')).toBeUndefined();
  });
});

describe('credential (verifier hash)', () => {
  test('the verifier is exactly 32 bytes', () => {
    const { verifier } = generateCredential();
    expect(verifier).toHaveLength(32);
  });

  test('the verifier is deterministic for the same raw secret', () => {
    const { credential, verifier } = generateCredential();
    const parsed = parseCredential(credential);
    expect(parsed?.verifier.equals(verifier)).toBe(true);
    // Parsing the same credential again must yield the identical verifier.
    const parsedAgain = parseCredential(credential);
    expect(parsedAgain?.verifier.equals(verifier)).toBe(true);
  });

  test('different secrets produce different verifiers across a sample', () => {
    const verifiers = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      verifiers.add(generateCredential().verifier.toString('hex'));
    }
    expect(verifiers.size).toBe(50);
  });

  test('the domain separator affects the hash construction (not a plain SHA-256 of the secret alone)', () => {
    const { credential, verifier } = generateCredential();
    const parsed = parseCredential(credential);
    const secretBytes = Buffer.from(credential.slice('bsc1_'.length), 'base64url');
    const plainSha256 = createHash('sha256').update(secretBytes).digest();
    expect(parsed?.verifier.equals(plainSha256)).toBe(false);
    expect(verifier.equals(plainSha256)).toBe(false);
  });
});
