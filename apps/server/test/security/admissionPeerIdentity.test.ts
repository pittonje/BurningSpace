import { randomBytes } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { describe, expect, it } from 'vitest';
import {
  ADMISSION_EDGE_PEER_HEADER,
  ADMISSION_EDGE_PROOF_HEADER,
  DIRECT_PEER_ONLY_SENTINEL,
  EDGE_ASSERTION_SECRET_LENGTH,
  EDGE_ASSERTION_SECRET_VARIABLE,
  TRUSTED_EDGE_PEERS_VARIABLE,
  canonicalizeAdmissionAddress,
  createAdmissionPeerIdentityResolver,
  describeAdmissionPeerIdentityMode,
  parseAdmissionPeerIdentityConfig,
  resolveAdmissionPeerIdentity,
  type AdmissionPeerIdentityConfig,
  type AdmissionPeerIdentityResult
} from '../../src/security/admissionPeerIdentity.js';

const TRUSTED_PROXY = '127.0.0.1';
const UNTRUSTED_PEER = '203.0.113.50';
const PUBLIC_CLIENT_A = '198.51.100.11';
const PUBLIC_CLIENT_B = '198.51.100.22';

/**
 * PA FIX2: every secret used by these tests is generated at runtime and
 * discarded with the process. No secret is ever written into the repository.
 */
function disposableSecret(): string {
  return randomBytes(32).toString('base64url');
}

const EDGE_SECRET = disposableSecret();
const OTHER_EDGE_SECRET = disposableSecret();

function trustedConfig(...peers: readonly string[]): AdmissionPeerIdentityConfig {
  return peers.length === 0
    ? parseAdmissionPeerIdentityConfig({
        BURNINGSPACE_TRUSTED_EDGE_PEERS: DIRECT_PEER_ONLY_SENTINEL,
        BURNINGSPACE_EDGE_ASSERTION_SECRET: DIRECT_PEER_ONLY_SENTINEL
      })
    : parseAdmissionPeerIdentityConfig({
        BURNINGSPACE_TRUSTED_EDGE_PEERS: peers.join(','),
        BURNINGSPACE_EDGE_ASSERTION_SECRET: EDGE_SECRET
      });
}

function resolve(
  config: AdmissionPeerIdentityConfig,
  directPeerAddress: string | undefined,
  headers: IncomingHttpHeaders = {}
): AdmissionPeerIdentityResult {
  return resolveAdmissionPeerIdentity(config, { headers, directPeerAddress });
}

/**
 * Explicitly send NO proof header at all. Distinct from `undefined`, which
 * would silently fall back to the default valid proof.
 */
const NO_PROOF = null;

/**
 * Headers as the trusted Caddy hop would send them: the peer claim PLUS the
 * operator proof. Tests that deliberately omit or corrupt the proof pass it
 * explicitly -- `NO_PROOF` to omit the header, or any value to corrupt it.
 */
function edgeHeaders(
  value: string | string[] | undefined,
  proof: string | string[] | undefined | typeof NO_PROOF = EDGE_SECRET
): IncomingHttpHeaders {
  return {
    ...(value === undefined ? {} : { [ADMISSION_EDGE_PEER_HEADER]: value }),
    ...(proof === NO_PROOF ? {} : { [ADMISSION_EDGE_PROOF_HEADER]: proof })
  };
}

function expectResolved(result: AdmissionPeerIdentityResult): { peerKey: string; source: string } {
  expect(result.kind).toBe('resolved');
  if (result.kind !== 'resolved') {
    throw new Error('unreachable');
  }
  return { peerKey: result.peerKey, source: result.source };
}

describe('BURNINGSPACE_TRUSTED_EDGE_PEERS parsing', () => {
  it('defaults to direct-peer-only when the variable is absent', () => {
    const config = parseAdmissionPeerIdentityConfig({});

    expect(config.trustedEdgePeers.size).toBe(0);
    expect(config.explicitlyConfigured).toBe(false);
    expect(describeAdmissionPeerIdentityMode(config)).toBe('direct-peer-only-default');
  });

  it('accepts the explicit direct-peer-only sentinel', () => {
    const config = parseAdmissionPeerIdentityConfig({
      BURNINGSPACE_TRUSTED_EDGE_PEERS: DIRECT_PEER_ONLY_SENTINEL
    });

    expect(config.trustedEdgePeers.size).toBe(0);
    expect(config.explicitlyConfigured).toBe(true);
    expect(describeAdmissionPeerIdentityMode(config)).toBe('direct-peer-only-explicit');
  });

  it('accepts one exact IPv4 literal, a comma list, and an IPv6 literal', () => {
    expect([...trustedConfig('172.18.0.1').trustedEdgePeers]).toEqual(['172.18.0.1']);
    expect([...trustedConfig('172.18.0.1', '127.0.0.1').trustedEdgePeers]).toEqual(['172.18.0.1', '127.0.0.1']);

    const ipv6 = trustedConfig('::1');
    expect(ipv6.trustedEdgePeers.size).toBe(1);
    expect(describeAdmissionPeerIdentityMode(ipv6)).toBe('trusted-edge');
  });

  it('normalizes an IPv4-mapped trusted peer to the same identity as its IPv4 form', () => {
    expect([...trustedConfig('::ffff:172.18.0.1').trustedEdgePeers]).toEqual(['172.18.0.1']);
  });

  it.each([
    ['present but empty', ''],
    ['whitespace only', '   '],
    ['empty first element', ',127.0.0.1'],
    ['empty middle element', '127.0.0.1,,172.18.0.1'],
    ['trailing comma', '127.0.0.1,'],
    ['CIDR', '172.18.0.0/16'],
    ['DNS name', 'gateway.internal'],
    ['host:port', '172.18.0.1:2567'],
    ['bracketed IPv6', '[::1]'],
    ['zone identifier', 'fe80::1%eth0'],
    ['IPv4 with leading zeros', '010.0.0.1'],
    ['wildcard', '*'],
    ['sentinel mixed with a peer', 'none,127.0.0.1'],
    ['peer mixed with the sentinel', '127.0.0.1,none']
  ])('rejects %s at startup', (_label, value) => {
    expect(() =>
      parseAdmissionPeerIdentityConfig({
        BURNINGSPACE_TRUSTED_EDGE_PEERS: value,
        BURNINGSPACE_EDGE_ASSERTION_SECRET: EDGE_SECRET
      })
    ).toThrow(new RegExp(TRUSTED_EDGE_PEERS_VARIABLE, 'u'));
  });
});

describe('BURNINGSPACE_EDGE_ASSERTION_SECRET format', () => {
  it('accepts exactly 43 canonical unpadded base64url characters', () => {
    const secret = disposableSecret();

    expect(secret).toHaveLength(EDGE_ASSERTION_SECRET_LENGTH);
    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/u);

    const config = parseAdmissionPeerIdentityConfig({
      BURNINGSPACE_TRUSTED_EDGE_PEERS: TRUSTED_PROXY,
      BURNINGSPACE_EDGE_ASSERTION_SECRET: secret
    });

    expect(describeAdmissionPeerIdentityMode(config)).toBe('trusted-edge');
    expect(config.edgeProofVerifier).toBeInstanceOf(Buffer);
  });

  it('never retains the raw secret, only a 32-byte verifier', () => {
    const secret = disposableSecret();
    const config = parseAdmissionPeerIdentityConfig({
      BURNINGSPACE_TRUSTED_EDGE_PEERS: TRUSTED_PROXY,
      BURNINGSPACE_EDGE_ASSERTION_SECRET: secret
    });

    expect(config.edgeProofVerifier).toHaveLength(32);
    // Neither the secret text nor its raw bytes survive anywhere in the
    // configuration, so no description of it can leak the operator value.
    expect(JSON.stringify(config)).not.toContain(secret);
    expect(config.edgeProofVerifier?.toString('base64url')).not.toBe(secret);
  });

  it.each([
    ['padded base64', `${'A'.repeat(43)}=`],
    ['standard base64 alphabet', `${'A'.repeat(41)}+/`],
    ['too short', 'A'.repeat(42)],
    ['too long', 'A'.repeat(44)],
    ['empty', ''],
    ['leading whitespace', ` ${'A'.repeat(43)}`],
    ['trailing whitespace', `${'A'.repeat(43)} `],
    ['inner whitespace', `${'A'.repeat(21)} ${'A'.repeat(21)}`],
    ['hex spelling', '0'.repeat(64)],
    ['a control character', `${'A'.repeat(42)}\u0000`],
    ['non-canonical trailing bits', `${'A'.repeat(42)}B`]
  ])('rejects %s at startup', (_label, value) => {
    expect(() =>
      parseAdmissionPeerIdentityConfig({
        BURNINGSPACE_TRUSTED_EDGE_PEERS: TRUSTED_PROXY,
        BURNINGSPACE_EDGE_ASSERTION_SECRET: value
      })
    ).toThrow(new RegExp(EDGE_ASSERTION_SECRET_VARIABLE, 'u'));
  });
});

describe('trusted-peer and edge-secret configuration must agree', () => {
  it('accepts both absent as direct-peer-only', () => {
    const config = parseAdmissionPeerIdentityConfig({});

    expect(describeAdmissionPeerIdentityMode(config)).toBe('direct-peer-only-default');
    expect(config.edgeProofVerifier).toBeUndefined();
  });

  it('accepts both explicit sentinels as direct-peer-only', () => {
    const config = parseAdmissionPeerIdentityConfig({
      BURNINGSPACE_TRUSTED_EDGE_PEERS: DIRECT_PEER_ONLY_SENTINEL,
      BURNINGSPACE_EDGE_ASSERTION_SECRET: DIRECT_PEER_ONLY_SENTINEL
    });

    expect(describeAdmissionPeerIdentityMode(config)).toBe('direct-peer-only-explicit');
    expect(config.edgeProofVerifier).toBeUndefined();
  });

  it.each([
    ['an absent secret', undefined],
    ['the explicit none sentinel', DIRECT_PEER_ONLY_SENTINEL]
  ])('fails startup when trusted peers are declared with %s', (_label, secret) => {
    // A trusted socket peer alone is a network-location restriction, NOT
    // proof of the Caddy process, so this pairing must never boot.
    expect(() =>
      parseAdmissionPeerIdentityConfig({
        BURNINGSPACE_TRUSTED_EDGE_PEERS: TRUSTED_PROXY,
        ...(secret === undefined ? {} : { BURNINGSPACE_EDGE_ASSERTION_SECRET: secret })
      })
    ).toThrow(new RegExp(EDGE_ASSERTION_SECRET_VARIABLE, 'u'));
  });

  it.each([
    ['absent trusted peers', undefined],
    ['the explicit none sentinel', DIRECT_PEER_ONLY_SENTINEL]
  ])('fails startup when a real secret is configured with %s', (_label, peers) => {
    // An unused secret must never create a false sense of configured trust.
    expect(() =>
      parseAdmissionPeerIdentityConfig({
        ...(peers === undefined ? {} : { BURNINGSPACE_TRUSTED_EDGE_PEERS: peers }),
        BURNINGSPACE_EDGE_ASSERTION_SECRET: disposableSecret()
      })
    ).toThrow(new RegExp(`${TRUSTED_EDGE_PEERS_VARIABLE}|${EDGE_ASSERTION_SECRET_VARIABLE}`, 'u'));
  });
});

describe('the edge proof is a REQUIRED second factor', () => {
  const config = trustedConfig(TRUSTED_PROXY);

  it('accepts the trusted peer only when the correct proof is supplied', () => {
    expect(expectResolved(resolve(config, TRUSTED_PROXY, edgeHeaders(PUBLIC_CLIENT_A)))).toEqual({
      peerKey: `edge:${PUBLIC_CLIENT_A}`,
      source: 'edge'
    });
  });

  it.each([
    ['no proof header at all', NO_PROOF, 'edge_proof_missing'],
    ['an empty proof', '', 'edge_proof_missing'],
    ['a whitespace-only proof', '   ', 'edge_proof_missing'],
    ['a repeated proof', `${'A'.repeat(43)},${'B'.repeat(43)}`, 'edge_proof_malformed'],
    ['a padded proof', `${'A'.repeat(43)}=`, 'edge_proof_malformed'],
    ['a short proof', 'A'.repeat(42), 'edge_proof_malformed'],
    ['a long proof', 'A'.repeat(44), 'edge_proof_malformed'],
    ['a non-base64url proof', `${'A'.repeat(41)}+/`, 'edge_proof_malformed'],
    ['a control character', `${'A'.repeat(42)}\u000a`, 'edge_proof_malformed'],
    ['a well-formed but wrong proof', 'A'.repeat(43), 'edge_proof_rejected']
  ])('fails closed on %s', (_label, proof, reason) => {
    expect(resolve(config, TRUSTED_PROXY, edgeHeaders(PUBLIC_CLIENT_A, proof as string | null))).toEqual({
      kind: 'rejected',
      reason
    });
  });

  it('fails closed on a different but validly shaped operator secret', () => {
    expect(resolve(config, TRUSTED_PROXY, edgeHeaders(PUBLIC_CLIENT_A, OTHER_EDGE_SECRET))).toEqual({
      kind: 'rejected',
      reason: 'edge_proof_rejected'
    });
  });

  it('authenticates the proof BEFORE it inspects the peer assertion', () => {
    // An unauthenticated caller learns nothing about peer parsing: even a
    // blatantly malformed peer claim reports only the proof failure.
    expect(resolve(config, TRUSTED_PROXY, edgeHeaders('not-an-ip', NO_PROOF))).toEqual({
      kind: 'rejected',
      reason: 'edge_proof_missing'
    });
  });

  it('ignores the proof entirely when the direct socket peer is not trusted', () => {
    // A correct proof from an untrusted peer grants nothing: both factors are
    // required, and the direct peer still keys the budget.
    expect(expectResolved(resolve(config, UNTRUSTED_PEER, edgeHeaders(PUBLIC_CLIENT_A)))).toEqual({
      peerKey: `direct:${UNTRUSTED_PEER}`,
      source: 'direct'
    });
  });

  it('collapses every forged identity from one trusted peer onto no budget at all', () => {
    // The blocker case: a host-local process presenting the trusted Docker
    // NAT peer but no proof cannot mint ANY bucket, forged or otherwise.
    for (const forged of [PUBLIC_CLIENT_A, PUBLIC_CLIENT_B, '203.0.113.9']) {
      expect(resolve(config, TRUSTED_PROXY, edgeHeaders(forged, NO_PROOF)).kind).toBe('rejected');
    }
  });
});

describe('canonical admission address semantics', () => {
  it('keys IPv4 exactly', () => {
    expect(canonicalizeAdmissionAddress('203.0.113.7')).toEqual({ exact: '203.0.113.7', budget: '203.0.113.7' });
  });

  it('normalizes IPv4-mapped IPv6 to the identical IPv4 identity', () => {
    const mapped = canonicalizeAdmissionAddress('::ffff:203.0.113.7');
    const plain = canonicalizeAdmissionAddress('203.0.113.7');

    expect(mapped).toEqual(plain);
    expect(canonicalizeAdmissionAddress('0:0:0:0:0:ffff:cb00:7107')).toEqual(plain);
  });

  it('canonicalizes IPv6 deterministically and aggregates the budget to /64', () => {
    const compressed = canonicalizeAdmissionAddress('2001:db8::1');
    const expanded = canonicalizeAdmissionAddress('2001:0DB8:0000:0000:0000:0000:0000:0001');

    expect(compressed).toEqual(expanded);
    expect(compressed?.exact).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
    expect(compressed?.budget).toBe('2001:db8:0:0::/64');
  });

  it('gives two addresses in one IPv6 /64 the same budget but different exact identities', () => {
    const first = canonicalizeAdmissionAddress('2001:db8:abcd:1::1');
    const second = canonicalizeAdmissionAddress('2001:db8:abcd:1:ffff:ffff:ffff:ffff');

    expect(first?.budget).toBe('2001:db8:abcd:1::/64');
    expect(second?.budget).toBe(first?.budget);
    expect(second?.exact).not.toBe(first?.exact);
  });

  it('gives a different IPv6 /64 a different budget', () => {
    expect(canonicalizeAdmissionAddress('2001:db8:abcd:2::1')?.budget).not.toBe(
      canonicalizeAdmissionAddress('2001:db8:abcd:1::1')?.budget
    );
  });

  it.each([
    ['empty', ''],
    ['DNS name', 'example.invalid'],
    ['IPv4 with port', '203.0.113.7:443'],
    ['IPv6 with port', '[2001:db8::1]:443'],
    ['bracketed IPv6', '[2001:db8::1]'],
    ['zone identifier', 'fe80::1%eth0'],
    ['comma list', '203.0.113.7,203.0.113.8'],
    ['CIDR', '203.0.113.0/24'],
    ['leading zeros', '010.0.113.7'],
    ['surrounding space', ' 203.0.113.7'],
    ['control character', '203.0.113.7\u0000']
  ])('rejects %s', (_label, value) => {
    expect(canonicalizeAdmissionAddress(value)).toBeUndefined();
  });
});

describe('direct-peer-only mode', () => {
  const absent = parseAdmissionPeerIdentityConfig({});
  const explicit = trustedConfig();

  it.each([
    ['absent configuration', absent],
    ['explicit none sentinel', explicit]
  ])('keys the canonical direct peer under %s', (_label, config) => {
    expect(expectResolved(resolve(config, UNTRUSTED_PEER))).toEqual({
      peerKey: `direct:${UNTRUSTED_PEER}`,
      source: 'direct'
    });
  });

  it('ignores a forged internal edge header entirely', () => {
    expect(expectResolved(resolve(absent, TRUSTED_PROXY, edgeHeaders(PUBLIC_CLIENT_A)))).toEqual({
      peerKey: `direct:${TRUSTED_PROXY}`,
      source: 'direct'
    });
  });

  it('never rejects: no admission attempt can fail closed when nothing is trusted', () => {
    for (const headers of [edgeHeaders(undefined), edgeHeaders(''), edgeHeaders('garbage'), edgeHeaders(['a', 'b'])]) {
      expect(resolve(absent, TRUSTED_PROXY, headers).kind).toBe('resolved');
    }
  });
});

describe('forwarded headers are never consulted', () => {
  const config = trustedConfig(TRUSTED_PROXY);

  it.each([
    ['x-forwarded-for', 'x-forwarded-for'],
    ['x-real-ip', 'x-real-ip'],
    ['forwarded', 'forwarded']
  ])('ignores a forged %s even from the trusted edge peer', (_label, header) => {
    const result = resolve(config, TRUSTED_PROXY, {
      [header]: PUBLIC_CLIENT_A,
      [ADMISSION_EDGE_PROOF_HEADER]: EDGE_SECRET,
      [ADMISSION_EDGE_PEER_HEADER]: PUBLIC_CLIENT_B
    });

    // The edge assertion alone decides; the forwarded header contributes nothing.
    expect(expectResolved(result)).toEqual({ peerKey: `edge:${PUBLIC_CLIENT_B}`, source: 'edge' });
  });

  it('ignores forwarded headers from an untrusted peer and does not fail closed on them', () => {
    const result = resolve(config, UNTRUSTED_PEER, {
      'x-forwarded-for': PUBLIC_CLIENT_A,
      'x-real-ip': PUBLIC_CLIENT_A,
      forwarded: `for=${PUBLIC_CLIENT_A}`
    });

    expect(expectResolved(result)).toEqual({ peerKey: `direct:${UNTRUSTED_PEER}`, source: 'direct' });
  });
});

describe('the internal edge header grants no authority from an untrusted socket peer', () => {
  const config = trustedConfig(TRUSTED_PROXY);

  it('ignores a forged X-BurningSpace-Edge-Peer and keys the direct peer instead', () => {
    expect(expectResolved(resolve(config, UNTRUSTED_PEER, edgeHeaders(PUBLIC_CLIENT_A)))).toEqual({
      peerKey: `direct:${UNTRUSTED_PEER}`,
      source: 'direct'
    });
  });

  it('collapses two forged assertions from one untrusted peer onto the same direct bucket', () => {
    const a = expectResolved(resolve(config, UNTRUSTED_PEER, edgeHeaders(PUBLIC_CLIENT_A)));
    const b = expectResolved(resolve(config, UNTRUSTED_PEER, edgeHeaders(PUBLIC_CLIENT_B)));

    expect(a.peerKey).toBe(b.peerKey);
  });

  it('never lets an edge-derived key collide with a direct-peer key space', () => {
    const direct = expectResolved(resolve(config, PUBLIC_CLIENT_A));
    const edge = expectResolved(resolve(config, TRUSTED_PROXY, edgeHeaders(PUBLIC_CLIENT_A)));

    expect(direct.peerKey).toBe(`direct:${PUBLIC_CLIENT_A}`);
    expect(edge.peerKey).toBe(`edge:${PUBLIC_CLIENT_A}`);
    expect(direct.peerKey).not.toBe(edge.peerKey);
  });
});

describe('valid trusted-edge assertions', () => {
  const config = trustedConfig(TRUSTED_PROXY, '172.18.0.1');

  it('keys each distinct public client independently', () => {
    const a = expectResolved(resolve(config, TRUSTED_PROXY, edgeHeaders(PUBLIC_CLIENT_A)));
    const b = expectResolved(resolve(config, TRUSTED_PROXY, edgeHeaders(PUBLIC_CLIENT_B)));

    expect(a).toEqual({ peerKey: `edge:${PUBLIC_CLIENT_A}`, source: 'edge' });
    expect(b).toEqual({ peerKey: `edge:${PUBLIC_CLIENT_B}`, source: 'edge' });
    expect(a.peerKey).not.toBe(b.peerKey);
  });

  it('accepts the assertion from any configured trusted peer', () => {
    expect(expectResolved(resolve(config, '172.18.0.1', edgeHeaders(PUBLIC_CLIENT_A))).source).toBe('edge');
  });

  it('matches an IPv4-mapped direct peer against its IPv4 trusted entry', () => {
    expect(expectResolved(resolve(config, '::ffff:172.18.0.1', edgeHeaders(PUBLIC_CLIENT_A))).source).toBe('edge');
  });

  it('rejects a single-element array header value', () => {
    // PA FIX2 array contract correction: the approved contract is ONE header
    // value set by Caddy. A one-element array is a repeated-header shape that
    // Node surfaced as a list, and it is rejected rather than unwrapped.
    expect(resolve(config, TRUSTED_PROXY, edgeHeaders([PUBLIC_CLIENT_A]))).toEqual({
      kind: 'rejected',
      reason: 'edge_assertion_repeated'
    });
  });

  it('rejects a single-element array edge proof', () => {
    expect(resolve(config, TRUSTED_PROXY, edgeHeaders(PUBLIC_CLIENT_A, [EDGE_SECRET]))).toEqual({
      kind: 'rejected',
      reason: 'edge_proof_malformed'
    });
  });

  it('normalizes an IPv4-mapped assertion to its IPv4 budget', () => {
    expect(expectResolved(resolve(config, TRUSTED_PROXY, edgeHeaders(`::ffff:${PUBLIC_CLIENT_A}`))).peerKey).toBe(
      `edge:${PUBLIC_CLIENT_A}`
    );
  });

  it('aggregates asserted IPv6 clients to their /64 and separates distinct /64s', () => {
    const sameA = expectResolved(resolve(config, TRUSTED_PROXY, edgeHeaders('2001:db8:1:2::5')));
    const sameB = expectResolved(resolve(config, TRUSTED_PROXY, edgeHeaders('2001:db8:1:2:aaaa::9')));
    const other = expectResolved(resolve(config, TRUSTED_PROXY, edgeHeaders('2001:db8:1:3::5')));

    expect(sameA.peerKey).toBe('edge:2001:db8:1:2::/64');
    expect(sameB.peerKey).toBe(sameA.peerKey);
    expect(other.peerKey).not.toBe(sameA.peerKey);
  });

  it('does not extend trust from one trusted IPv6 host to its whole /64', () => {
    const ipv6Config = trustedConfig('2001:db8:1:2::1');

    expect(expectResolved(resolve(ipv6Config, '2001:db8:1:2::1', edgeHeaders(PUBLIC_CLIENT_A))).source).toBe('edge');
    // A neighbour inside the same /64 is NOT the trusted host.
    expect(expectResolved(resolve(ipv6Config, '2001:db8:1:2::2', edgeHeaders(PUBLIC_CLIENT_A))).source).toBe('direct');
  });
});

describe('a trusted peer with a bad assertion fails closed', () => {
  const config = trustedConfig(TRUSTED_PROXY);
  const overlong = `${'9'.repeat(60)}.1.2.3`;

  it.each([
    ['no header at all', undefined, 'edge_assertion_missing'],
    ['an empty value', '', 'edge_assertion_missing'],
    ['a whitespace-only value', '   ', 'edge_assertion_missing'],
    ['a comma list', `${PUBLIC_CLIENT_A},${PUBLIC_CLIENT_B}`, 'edge_assertion_repeated'],
    ['a trailing comma', `${PUBLIC_CLIENT_A},`, 'edge_assertion_repeated'],
    ['a malformed literal', 'not-an-ip', 'edge_assertion_malformed'],
    ['a DNS name', 'client.example.invalid', 'edge_assertion_malformed'],
    ['an IPv4 with a port', `${PUBLIC_CLIENT_A}:51234`, 'edge_assertion_malformed'],
    ['a bracketed IPv6', '[2001:db8::1]', 'edge_assertion_malformed'],
    ['a bracketed IPv6 with a port', '[2001:db8::1]:51234', 'edge_assertion_malformed'],
    ['a zone identifier', 'fe80::1%eth0', 'edge_assertion_malformed'],
    ['a CIDR range', '198.51.100.0/24', 'edge_assertion_malformed'],
    ['leading zeros', '198.051.100.11', 'edge_assertion_malformed'],
    ['a control character', `${PUBLIC_CLIENT_A}\u000a`, 'edge_assertion_malformed'],
    ['an overlong value', overlong, 'edge_assertion_malformed']
  ])('rejects %s', (_label, value, reason) => {
    const result = resolve(config, TRUSTED_PROXY, edgeHeaders(value as string | undefined));

    expect(result).toEqual({ kind: 'rejected', reason });
  });

  it('rejects a repeated header delivered as a multi-value array', () => {
    expect(resolve(config, TRUSTED_PROXY, edgeHeaders([PUBLIC_CLIENT_A, PUBLIC_CLIENT_B]))).toEqual({
      kind: 'rejected',
      reason: 'edge_assertion_repeated'
    });
  });

  it('bounds the raw value before parsing, at 64 bytes', () => {
    expect(overlong.length).toBeGreaterThan(64);
    // A 64-byte value that is still not an IP is malformed, not silently accepted.
    expect(resolve(config, TRUSTED_PROXY, edgeHeaders('a'.repeat(64)))).toEqual({
      kind: 'rejected',
      reason: 'edge_assertion_malformed'
    });
  });

  it('never falls back to a shared trusted-proxy bucket', () => {
    const rejectedResults = [undefined, '', 'bad', `${PUBLIC_CLIENT_A},${PUBLIC_CLIENT_B}`].map((value) =>
      resolve(config, TRUSTED_PROXY, edgeHeaders(value))
    );

    expect(rejectedResults.every((result) => result.kind === 'rejected')).toBe(true);
  });
});

describe('direct peer unavailable', () => {
  const config = trustedConfig(TRUSTED_PROXY);

  it('uses one fixed conservative shared key instead of failing closed', () => {
    const missing = expectResolved(resolve(config, undefined, edgeHeaders(PUBLIC_CLIENT_A)));
    const garbage = expectResolved(resolve(config, 'not-an-address'));

    expect(missing.peerKey).toBe('direct:unavailable');
    expect(garbage.peerKey).toBe(missing.peerKey);
  });
});

describe('a non-canonical spelling of the REAL secret is still rejected', () => {
  /**
   * PA FIX3-B. A 32-byte value in unpadded base64url occupies 43 characters,
   * and its final character carries only the top 4 bits of the last byte --
   * the low 2 bits are unused. Several distinct 43-character texts therefore
   * decode to byte-identical output. This builds exactly such an alternate
   * spelling of the ACTUAL configured secret, not an arbitrary wrong token.
   */
  function alternateSpelling(canonical: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const last = canonical.at(-1)!;
    const index = alphabet.indexOf(last);
    // Flip the lowest unused bit; the four significant high bits are kept.
    return `${canonical.slice(0, -1)}${alphabet[index ^ 0b01]!}`;
  }

  const canonical = EDGE_SECRET;
  const alternate = alternateSpelling(canonical);
  const config = trustedConfig(TRUSTED_PROXY);

  it('builds an alternate text that decodes to exactly the same 32 bytes', () => {
    expect(alternate).not.toBe(canonical);
    expect(alternate).toHaveLength(EDGE_ASSERTION_SECRET_LENGTH);
    expect(alternate).toMatch(/^[A-Za-z0-9_-]{43}$/u);

    const canonicalBytes = Buffer.from(canonical, 'base64url');
    const alternateBytes = Buffer.from(alternate, 'base64url');

    expect(alternateBytes).toHaveLength(32);
    // Byte-identical: a verifier that hashed without the canonical check
    // would accept this spelling.
    expect(alternateBytes.equals(canonicalBytes)).toBe(true);
    // And the alternate text is provably NOT the canonical encoding.
    expect(alternateBytes.toString('base64url')).toBe(canonical);
    expect(alternateBytes.toString('base64url')).not.toBe(alternate);
  });

  it('rejects the non-canonical spelling as edge_proof_malformed', () => {
    expect(resolve(config, TRUSTED_PROXY, edgeHeaders(PUBLIC_CLIENT_A, alternate))).toEqual({
      kind: 'rejected',
      reason: 'edge_proof_malformed'
    });
  });

  it('accepts the canonical spelling of the same bytes', () => {
    expect(expectResolved(resolve(config, TRUSTED_PROXY, edgeHeaders(PUBLIC_CLIENT_A, canonical)))).toEqual({
      peerKey: `edge:${PUBLIC_CLIENT_A}`,
      source: 'edge'
    });
  });

  it('refuses the same non-canonical spelling as startup configuration', () => {
    // The wire contract and the configuration contract agree.
    expect(() =>
      parseAdmissionPeerIdentityConfig({
        BURNINGSPACE_TRUSTED_EDGE_PEERS: TRUSTED_PROXY,
        BURNINGSPACE_EDGE_ASSERTION_SECRET: alternate
      })
    ).toThrow(new RegExp(EDGE_ASSERTION_SECRET_VARIABLE, 'u'));
  });
});

describe('bounded trusted-edge diagnostics', () => {
  it('emits at most one sanitized line per reason per interval and never the raw IP, header or proof', () => {
    let now = 0;
    const lines: { event: string; details?: Record<string, unknown> }[] = [];
    const resolver = createAdmissionPeerIdentityResolver({
      config: trustedConfig(TRUSTED_PROXY),
      monotonicNow: () => now,
      diagnosticIntervalMs: 60_000,
      log: (_level, event, details) => lines.push({ event, details })
    });

    for (let attempt = 0; attempt < 50; attempt += 1) {
      // A valid proof, but no peer assertion at all.
      resolver.resolve({ headers: edgeHeaders(undefined), directPeerAddress: TRUSTED_PROXY });
      // A valid proof, but a malformed peer assertion.
      resolver.resolve({
        headers: edgeHeaders(`${PUBLIC_CLIENT_A}-forged-${attempt}`),
        directPeerAddress: TRUSTED_PROXY
      });
      // No proof at all: the reason must say so, and must still be bounded.
      resolver.resolve({ headers: {}, directPeerAddress: TRUSTED_PROXY });
      // A wrong proof.
      resolver.resolve({
        headers: edgeHeaders(PUBLIC_CLIENT_A, OTHER_EDGE_SECRET),
        directPeerAddress: TRUSTED_PROXY
      });
    }

    expect(lines).toHaveLength(4);
    expect(lines.map((line) => line.details?.reason).sort()).toEqual([
      'edge_assertion_malformed',
      'edge_assertion_missing',
      'edge_proof_missing',
      'edge_proof_rejected'
    ]);

    const serialized = JSON.stringify(lines);
    expect(serialized).not.toContain(TRUSTED_PROXY);
    expect(serialized).not.toContain(PUBLIC_CLIENT_A);
    expect(serialized).not.toContain('x-burningspace-edge-peer');
    // PA FIX2: neither the operator secret nor a supplied proof may ever be
    // reachable from an operational diagnostic.
    expect(serialized).not.toContain('x-burningspace-edge-proof');
    expect(serialized).not.toContain(EDGE_SECRET);
    expect(serialized).not.toContain(OTHER_EDGE_SECRET);

    now += 60_000;
    resolver.resolve({ headers: edgeHeaders(undefined), directPeerAddress: TRUSTED_PROXY });
    expect(lines).toHaveLength(5);
    expect(lines[4]?.details?.reason).toBe('edge_assertion_missing');
    expect(lines[4]?.details?.suppressedSinceLastReport).toBe(49);
  });

  it('emits nothing at all in direct-peer-only mode', () => {
    const lines: string[] = [];
    const resolver = createAdmissionPeerIdentityResolver({
      config: parseAdmissionPeerIdentityConfig({}),
      log: (_level, event) => lines.push(event)
    });

    resolver.resolve({ headers: edgeHeaders('garbage'), directPeerAddress: TRUSTED_PROXY });
    resolver.resolve({ headers: {}, directPeerAddress: TRUSTED_PROXY });

    expect(lines).toEqual([]);
  });

  it('never exposes the edge verifier through the built resolver', () => {
    const resolver = createAdmissionPeerIdentityResolver({ config: trustedConfig(TRUSTED_PROXY) });

    expect(Object.hasOwn(resolver.config, 'edgeProofVerifier')).toBe(false);
    expect(JSON.stringify(resolver.config)).not.toContain(EDGE_SECRET);
  });
});
