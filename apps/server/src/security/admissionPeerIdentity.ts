import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { isIP } from 'node:net';
import { performance } from 'node:perf_hooks';
import type { MonotonicClock } from './tokenBucketRateLimiter.js';

/**
 * PERSIST002-NET-02 -- the ONE canonical admission-peer identity resolver.
 *
 * Both admission budgets (POST /identity/guest and fresh BattleRoom.onAuth)
 * key their PeerRateLimiter buckets through this module. There is
 * deliberately no second copy of peer-key logic anywhere in the server.
 *
 * Why an internal edge header at all
 * ----------------------------------
 * The real public topology is
 *
 *   public client -> Caddy -> host loopback published Docker port
 *                 -> Docker bridge/NAT -> Node container
 *
 * so every public client collapses onto ONE effective Node socket peer (the
 * Docker bridge gateway). Keying admission budgets from the direct transport
 * peer therefore gives all public clients a single shared bucket.
 *
 * Caddy's current `reverse_proxy` defaults already IGNORE incoming
 * `X-Forwarded-*` values for spoof-resistance -- BurningSpace is not working
 * around a Caddy trust bug. A dedicated internal header is chosen instead
 * because it is explicitly owned by this edge contract, Caddy SET-overwrites
 * it (`header_up` without `+`), Node reads it only from an explicitly trusted
 * direct socket peer, no proxy-chain parsing is needed, and a future change
 * to generic forwarded-header policy cannot silently alter BurningSpace
 * admission semantics.
 *
 * `X-Forwarded-For`, `X-Real-IP` and `Forwarded` remain completely unused by
 * BurningSpace admission logic.
 *
 * Why the trusted peer is NOT sufficient on its own (PA FIX2)
 * ----------------------------------------------------------
 * In the real staging topology the Node container observes the Docker
 * bridge / NAT gateway as the direct socket peer for everything arriving
 * through the host-published loopback port. That address identifies the
 * host-side Docker NAT path -- it does NOT identify the Caddy process. Any
 * other local process on the VPS can reach
 *
 *   127.0.0.1:${BURNINGSPACE_SERVER_BIND_PORT} -> Docker NAT -> Node
 *
 * and arrive with exactly the same direct socket peer as Caddy. A peer
 * allowlist alone would therefore let a host-local process bypass Caddy and
 * forge an admission identity.
 *
 * So the peer allowlist is only ONE factor: a network-location restriction.
 * The SECOND factor is a cryptographic proof of the Caddy/operator hop,
 * carried in `X-BurningSpace-Edge-Proof` and issued from the
 * operator-controlled Caddy hop, which receives it as a systemd credential
 * rather than as service environment. Node honors
 * `X-BurningSpace-Edge-Peer` only when BOTH hold:
 *
 *   1. the canonical direct socket peer is in `trustedEdgePeers`; and
 *   2. the supplied proof authenticates against the configured edge secret.
 *
 * The secret itself is never retained in any public or loggable
 * configuration description: only a SHA-256 verifier is kept, the supplied
 * proof is hashed before comparison, and the final fixed-length comparison
 * uses `crypto.timingSafeEqual`. Neither the secret, the verifier, the
 * supplied proof nor the raw internal header value is ever logged.
 *
 * Known, accepted limitation
 * --------------------------
 * An IP-based limiter does not identify a human or a device. Clients sharing
 * one public IPv4 address (carrier NAT, a school, an office) or one IPv6 /64
 * share an admission budget. This is a rate-limit fairness trade-off, not an
 * identity mechanism, and it prevents no Sybil attack.
 */

/** The one internal edge assertion header. Never X-Forwarded-For/X-Real-IP/Forwarded. */
export const ADMISSION_EDGE_PEER_HEADER = 'x-burningspace-edge-peer';

/** The internal cryptographic proof that the hop really is the operator's Caddy. */
export const ADMISSION_EDGE_PROOF_HEADER = 'x-burningspace-edge-proof';

export const TRUSTED_EDGE_PEERS_VARIABLE = 'BURNINGSPACE_TRUSTED_EDGE_PEERS';

export const EDGE_ASSERTION_SECRET_VARIABLE = 'BURNINGSPACE_EDGE_ASSERTION_SECRET';

/**
 * The one explicit "there is no trusted edge in this topology" spelling.
 * Operators must state direct-peer-only mode deliberately rather than
 * leaving a required deployment variable blank. A public persistence
 * rollout MUST replace it with the exact peer measured inside the target
 * container -- `none` is never rollout acceptance.
 */
export const DIRECT_PEER_ONLY_SENTINEL = 'none';

/** Hard bound applied to the raw internal header BEFORE any parsing. */
const MAX_EDGE_HEADER_BYTES = 64;

/**
 * The edge secret is exactly 32 random bytes in canonical unpadded base64url:
 * exactly 43 characters over [A-Za-z0-9_-], no padding, no whitespace and no
 * alternative encoding. The supplied proof header must be byte-identical in
 * shape, so it is bounded and shape-checked before any decoding is attempted.
 */
export const EDGE_ASSERTION_SECRET_BYTES = 32;
export const EDGE_ASSERTION_SECRET_LENGTH = 43;
const EDGE_SECRET_SHAPE = /^[A-Za-z0-9_-]{43}$/u;

/** One bounded diagnostic per distinct reason per window; the reason set is fixed. */
const DEFAULT_DIAGNOSTIC_INTERVAL_MS = 60_000;

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;
const EMBEDDED_IPV4_TAIL = /:((?:\d{1,3}\.){3}\d{1,3})$/u;
const IPV6_HEXTET = /^[0-9a-f]{1,4}$/iu;

/**
 * Fixed allowlist of operationally reportable trusted-edge failures. No raw
 * IP address and no raw header value is ever part of a diagnostic.
 */
export type AdmissionEdgeRejectionReason =
  | 'edge_assertion_missing'
  | 'edge_assertion_repeated'
  | 'edge_assertion_malformed'
  | 'edge_proof_missing'
  | 'edge_proof_malformed'
  | 'edge_proof_rejected';

export type AdmissionPeerIdentitySource = 'direct' | 'edge';

export interface AdmissionPeerIdentityResolved {
  readonly kind: 'resolved';
  /** Namespaced bucket key: `direct:<canonical>` or `edge:<canonical>`. */
  readonly peerKey: string;
  readonly source: AdmissionPeerIdentitySource;
}

export interface AdmissionPeerIdentityRejected {
  readonly kind: 'rejected';
  readonly reason: AdmissionEdgeRejectionReason;
}

export type AdmissionPeerIdentityResult = AdmissionPeerIdentityResolved | AdmissionPeerIdentityRejected;

export interface AdmissionPeerIdentityConfig {
  /**
   * Exact canonical addresses of direct socket peers permitted to assert an
   * edge peer. Empty means direct-peer-only: the internal headers are ignored
   * unconditionally and no request can ever be rejected by this module.
   *
   * This is a network-location restriction only. On its own it is NOT proof
   * of the Caddy process, which is why a non-empty set always requires an
   * edge verifier as well (enforced at parse time).
   */
  readonly trustedEdgePeers: ReadonlySet<string>;
  /** True when the deployment stated the variable (including the explicit sentinel). */
  readonly explicitlyConfigured: boolean;
  /**
   * SHA-256 of the configured 32-byte edge secret, or undefined in
   * direct-peer-only mode. The raw secret is deliberately NOT retained: a
   * verifier is sufficient because the supplied proof is hashed before the
   * fixed-length timing-safe comparison, and a verifier cannot be replayed
   * upstream if this configuration object is ever described or serialized.
   */
  readonly edgeProofVerifier?: Buffer;
}

export interface AdmissionPeerIdentityEnvironment {
  readonly BURNINGSPACE_TRUSTED_EDGE_PEERS?: string;
  readonly BURNINGSPACE_EDGE_ASSERTION_SECRET?: string;
}

export interface AdmissionPeerIdentityLog {
  (level: 'info' | 'error', event: string, details?: Record<string, unknown>): void;
}

export interface AdmissionPeerIdentityResolverOptions {
  readonly config: AdmissionPeerIdentityConfig;
  readonly log?: AdmissionPeerIdentityLog;
  readonly monotonicNow?: MonotonicClock;
  readonly diagnosticIntervalMs?: number;
}

export interface ResolveAdmissionPeerIdentityInput {
  readonly headers: IncomingHttpHeaders | undefined;
  readonly directPeerAddress: string | undefined;
}

/**
 * What the built resolver exposes about its own configuration. The edge
 * verifier is structurally absent here, so no caller -- and no operational
 * description built from a resolver -- can reach it even by accident.
 */
export type AdmissionPeerIdentityPublicConfig = Omit<AdmissionPeerIdentityConfig, 'edgeProofVerifier'>;

export interface AdmissionPeerIdentityResolver {
  readonly config: AdmissionPeerIdentityPublicConfig;
  resolve(input: ResolveAdmissionPeerIdentityInput): AdmissionPeerIdentityResult;
}

interface CanonicalAddress {
  /**
   * Exact canonical address identity, used ONLY for trusted-peer set
   * membership. Never aggregated: trusting one host must never trust a
   * whole IPv6 /64.
   */
  readonly exact: string;
  /**
   * Rate-limit budget identity. IPv4 (including IPv4-mapped IPv6) keys the
   * exact address; IPv6 aggregates to its /64.
   */
  readonly budget: string;
}

/**
 * The single conservative shared key used when the direct transport peer is
 * genuinely unavailable or is not an IP literal at all. This preserves the
 * pre-NET-02 conservative fallback (`unknown-peer` / `matchmaking-peer`)
 * rather than failing admission closed on a transport quirk. It can never
 * collide with a canonical key, and it is NOT an edge-degraded bucket: it is
 * only ever reached when there is no direct peer address to key from.
 */
const UNAVAILABLE_DIRECT_PEER = 'unavailable';

/** Expands a `node:net`-validated IPv6 literal into its exact eight hextets. */
function expandIpv6(value: string): readonly number[] | undefined {
  let text = value;
  const embedded = EMBEDDED_IPV4_TAIL.exec(text);

  if (embedded) {
    const octets = embedded[1]!.split('.').map((part) => Number(part));

    if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
      return undefined;
    }

    const high = ((octets[0]! << 8) | octets[1]!).toString(16);
    const low = ((octets[2]! << 8) | octets[3]!).toString(16);
    text = `${text.slice(0, embedded.index)}:${high}:${low}`;
  }

  const compression = text.indexOf('::');
  let groups: string[];

  if (compression >= 0) {
    if (text.indexOf('::', compression + 1) >= 0) {
      return undefined;
    }

    const left = text.slice(0, compression).split(':').filter((part) => part.length > 0);
    const right = text.slice(compression + 2).split(':').filter((part) => part.length > 0);
    const missing = 8 - left.length - right.length;

    if (missing < 1) {
      return undefined;
    }

    groups = [...left, ...Array.from({ length: missing }, () => '0'), ...right];
  } else {
    groups = text.split(':');
  }

  if (groups.length !== 8) {
    return undefined;
  }

  const hextets = groups.map((group) => (IPV6_HEXTET.test(group) ? Number.parseInt(group, 16) : Number.NaN));
  return hextets.some((hextet) => Number.isNaN(hextet)) ? undefined : hextets;
}

/**
 * Canonicalizes one IP literal with `node:net` validation. Returns undefined
 * for anything that is not a bare IP address: DNS names, `host:port`,
 * `[IPv6]` wrappers, zone identifiers, and any value carrying a comma or a
 * control character.
 *
 * `::ffff:a.b.c.d` normalizes to exactly the same identity as `a.b.c.d`.
 * Ordinary IPv6 aggregates to its /64 for budget purposes, which stops one
 * ordinary /64 from cheaply manufacturing enough syntactic peer identities
 * to exhaust the bounded 10,000-bucket limiter map.
 */
export function canonicalizeAdmissionAddress(raw: string): CanonicalAddress | undefined {
  if (raw.length === 0 || raw.includes('%') || raw.includes(',') || CONTROL_CHARACTERS.test(raw)) {
    return undefined;
  }

  const family = isIP(raw);

  if (family === 4) {
    return Object.freeze({ exact: raw, budget: raw });
  }

  if (family !== 6) {
    return undefined;
  }

  const hextets = expandIpv6(raw.toLowerCase());

  if (!hextets) {
    return undefined;
  }

  const isIpv4Mapped =
    hextets[0] === 0 && hextets[1] === 0 && hextets[2] === 0 &&
    hextets[3] === 0 && hextets[4] === 0 && hextets[5] === 0xffff;

  if (isIpv4Mapped) {
    const mapped = [
      (hextets[6]! >> 8) & 0xff,
      hextets[6]! & 0xff,
      (hextets[7]! >> 8) & 0xff,
      hextets[7]! & 0xff
    ].join('.');
    return Object.freeze({ exact: mapped, budget: mapped });
  }

  const exact = hextets.map((hextet) => hextet.toString(16).padStart(4, '0')).join(':');
  const budget = `${hextets.slice(0, 4).map((hextet) => hextet.toString(16)).join(':')}::/64`;
  return Object.freeze({ exact, budget });
}

/**
 * Parses BURNINGSPACE_EDGE_ASSERTION_SECRET into a SHA-256 verifier.
 *
 * - absent or `none` -> undefined (no edge secret configured);
 * - exactly 43 canonical unpadded base64url characters decoding to exactly
 *   32 bytes -> its verifier;
 * - anything else -> throws at startup.
 *
 * The raw secret never leaves this function: only its verifier is returned,
 * so no caller can retain, describe, serialize or log the secret itself.
 */
function parseEdgeAssertionVerifier(raw: string | undefined): Buffer | undefined {
  if (raw === undefined) {
    return undefined;
  }

  // Deliberately NOT trimmed: the accepted format forbids whitespace
  // outright, so surrounding whitespace is a malformed secret, not a
  // tolerated one. The explicit sentinel is the only non-secret spelling.
  if (raw === DIRECT_PEER_ONLY_SENTINEL) {
    return undefined;
  }

  if (!EDGE_SECRET_SHAPE.test(raw)) {
    throw new Error(
      `${EDGE_ASSERTION_SECRET_VARIABLE} must be exactly ${String(EDGE_ASSERTION_SECRET_LENGTH)} canonical ` +
        'base64url characters [A-Za-z0-9_-] with no padding and no whitespace, ' +
        `or the literal "${DIRECT_PEER_ONLY_SENTINEL}".`
    );
  }

  const decoded = Buffer.from(raw, 'base64url');

  if (decoded.length !== EDGE_ASSERTION_SECRET_BYTES) {
    throw new Error(
      `${EDGE_ASSERTION_SECRET_VARIABLE} must decode to exactly ${String(EDGE_ASSERTION_SECRET_BYTES)} bytes.`
    );
  }

  // Canonical-encoding check: a 32-byte base64url value has 2 unused low bits
  // in its final character, so a non-canonical spelling would decode to the
  // same bytes under a different text. Re-encoding pins exactly one spelling.
  if (decoded.toString('base64url') !== raw) {
    throw new Error(`${EDGE_ASSERTION_SECRET_VARIABLE} must be the canonical base64url encoding of its bytes.`);
  }

  return createHash('sha256').update(decoded).digest();
}

/**
 * Parses BURNINGSPACE_TRUSTED_EDGE_PEERS together with
 * BURNINGSPACE_EDGE_ASSERTION_SECRET, because neither is meaningful alone.
 *
 * Peers:
 * - absent          -> direct-peer-only (empty trusted set), not explicit;
 * - `none`          -> direct-peer-only, explicitly configured;
 * - comma-separated exact IP literals -> that trusted set;
 * - present but empty, or malformed in any element -> throws at startup.
 *
 * No CIDR, DNS name, `host:port`, `[IPv6]` wrapper, zone identifier or empty
 * element is accepted.
 *
 * Combinations (PA FIX2), all enforced at startup:
 * - peers absent/none + secret absent/none -> direct-peer-only;
 * - peers non-empty   + valid 256-bit secret -> trusted-edge;
 * - peers non-empty   + missing/none/malformed secret -> STARTUP FAILURE,
 *   because a peer allowlist alone does not prove the Caddy hop;
 * - peers absent/none + a real secret -> STARTUP FAILURE, so an unused
 *   secret can never create a false sense of configured trust.
 */
export function parseAdmissionPeerIdentityConfig(
  environment: AdmissionPeerIdentityEnvironment
): AdmissionPeerIdentityConfig {
  const raw = environment.BURNINGSPACE_TRUSTED_EDGE_PEERS;
  const edgeProofVerifier = parseEdgeAssertionVerifier(environment.BURNINGSPACE_EDGE_ASSERTION_SECRET);

  const directPeerOnly = (explicitlyConfigured: boolean): AdmissionPeerIdentityConfig => {
    if (edgeProofVerifier) {
      throw new Error(
        `${EDGE_ASSERTION_SECRET_VARIABLE} is configured but ${TRUSTED_EDGE_PEERS_VARIABLE} declares no trusted ` +
          `edge peer. Set both for trusted-edge mode, or set both to "${DIRECT_PEER_ONLY_SENTINEL}".`
      );
    }

    return Object.freeze({
      trustedEdgePeers: Object.freeze(new Set<string>()),
      explicitlyConfigured
    });
  };

  if (raw === undefined) {
    return directPeerOnly(false);
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    throw new Error(
      `${TRUSTED_EDGE_PEERS_VARIABLE} is present but empty. ` +
        `Use "${DIRECT_PEER_ONLY_SENTINEL}" for direct-peer-only mode, or comma-separated exact IP literals.`
    );
  }

  if (trimmed === DIRECT_PEER_ONLY_SENTINEL) {
    return directPeerOnly(true);
  }

  const trusted = new Set<string>();

  for (const element of trimmed.split(',')) {
    const candidate = element.trim();

    if (candidate.length === 0) {
      throw new Error(`${TRUSTED_EDGE_PEERS_VARIABLE} must not contain an empty element.`);
    }

    if (candidate === DIRECT_PEER_ONLY_SENTINEL) {
      throw new Error(
        `${TRUSTED_EDGE_PEERS_VARIABLE} must not mix "${DIRECT_PEER_ONLY_SENTINEL}" with trusted peer addresses.`
      );
    }

    const canonical = canonicalizeAdmissionAddress(candidate);

    if (!canonical) {
      throw new Error(
        `${TRUSTED_EDGE_PEERS_VARIABLE} must contain only exact IP literals ` +
          '(no CIDR, DNS name, host:port, [IPv6] wrapper or zone identifier).'
      );
    }

    trusted.add(canonical.exact);
  }

  if (!edgeProofVerifier) {
    throw new Error(
      `${TRUSTED_EDGE_PEERS_VARIABLE} declares trusted edge peers, so ${EDGE_ASSERTION_SECRET_VARIABLE} must ` +
        'carry the operator edge secret. A trusted socket peer is a network-location restriction and is not ' +
        'proof of the Caddy process.'
    );
  }

  return Object.freeze({ trustedEdgePeers: Object.freeze(trusted), explicitlyConfigured: true, edgeProofVerifier });
}

export function describeAdmissionPeerIdentityMode(config: AdmissionPeerIdentityConfig): string {
  if (config.trustedEdgePeers.size === 0) {
    return config.explicitlyConfigured ? 'direct-peer-only-explicit' : 'direct-peer-only-default';
  }

  return 'trusted-edge';
}

type InternalHeaderRead = { readonly ok: true; readonly value: string } | AdmissionPeerIdentityRejected;

interface InternalHeaderReasons {
  readonly missing: AdmissionEdgeRejectionReason;
  readonly repeated: AdmissionEdgeRejectionReason;
  readonly malformed: AdmissionEdgeRejectionReason;
}

const EDGE_PEER_REASONS: InternalHeaderReasons = Object.freeze({
  missing: 'edge_assertion_missing',
  repeated: 'edge_assertion_repeated',
  malformed: 'edge_assertion_malformed'
});

/**
 * The fixed proof reason set is deliberately narrower than the peer one: a
 * repeated proof is reported as malformed rather than getting its own code,
 * so an attacker learns nothing from the difference.
 */
const EDGE_PROOF_REASONS: InternalHeaderReasons = Object.freeze({
  missing: 'edge_proof_missing',
  repeated: 'edge_proof_malformed',
  malformed: 'edge_proof_malformed'
});

function rejected(reason: AdmissionEdgeRejectionReason): AdmissionPeerIdentityRejected {
  return Object.freeze({ kind: 'rejected' as const, reason });
}

/**
 * Reads one single-valued internal header.
 *
 * PA FIX2 array contract: an array form is ALWAYS rejected, including a
 * one-element array. The approved contract is a single header value set by
 * Caddy; a one-element array is a repeated-header shape that Node happened
 * to surface as a list, and quietly unwrapping it accepted a form the
 * contract forbids. There is deliberately no recursive single-element path.
 */
function readSingleInternalHeader(
  headers: IncomingHttpHeaders | undefined,
  name: string,
  reasons: InternalHeaderReasons
): InternalHeaderRead {
  const raw = headers?.[name];

  if (raw === undefined) {
    return rejected(reasons.missing);
  }

  if (Array.isArray(raw)) {
    return rejected(reasons.repeated);
  }

  if (typeof raw !== 'string') {
    return rejected(reasons.malformed);
  }

  // Bound BEFORE any parsing, on the raw bytes.
  if (Buffer.byteLength(raw, 'utf8') > MAX_EDGE_HEADER_BYTES) {
    return rejected(reasons.malformed);
  }

  if (CONTROL_CHARACTERS.test(raw)) {
    return rejected(reasons.malformed);
  }

  // Node collapses a repeated non-Set-Cookie header into one comma-joined
  // value, so a comma is the observable signature of a repeated or list form.
  if (raw.includes(',')) {
    return rejected(reasons.repeated);
  }

  const value = raw.trim();

  if (value.length === 0) {
    return rejected(reasons.missing);
  }

  return Object.freeze({ ok: true as const, value });
}

/**
 * Authenticates the supplied edge proof against the configured verifier.
 *
 * The proof is shape-checked before decoding, hashed, and compared with
 * `crypto.timingSafeEqual` over two fixed 32-byte digests. Neither the
 * supplied proof nor the verifier is returned, described or logged.
 */
function verifyEdgeProof(verifier: Buffer, headers: IncomingHttpHeaders | undefined): AdmissionPeerIdentityRejected | undefined {
  const supplied = readSingleInternalHeader(headers, ADMISSION_EDGE_PROOF_HEADER, EDGE_PROOF_REASONS);

  if (!('ok' in supplied)) {
    return supplied;
  }

  if (!EDGE_SECRET_SHAPE.test(supplied.value)) {
    return rejected('edge_proof_malformed');
  }

  const decoded = Buffer.from(supplied.value, 'base64url');

  if (decoded.length !== EDGE_ASSERTION_SECRET_BYTES) {
    return rejected('edge_proof_malformed');
  }

  // PA FIX3-B: the SAME canonical round-trip the startup secret parser
  // applies. A 32-byte base64url value leaves 2 unused low bits in its final
  // character, so several distinct 43-character texts decode to identical
  // bytes. Without this check the resolver would accept a non-canonical
  // spelling of the operator secret as a valid proof. Exactly one spelling
  // is authoritative on the wire, as it is in the configuration.
  if (decoded.toString('base64url') !== supplied.value) {
    return rejected('edge_proof_malformed');
  }

  // Hashing first makes the comparison operands fixed-length by construction,
  // so timingSafeEqual can never throw on a length mismatch.
  const candidate = createHash('sha256').update(decoded).digest();

  return timingSafeEqual(candidate, verifier) ? undefined : rejected('edge_proof_rejected');
}

/**
 * Resolves the admission identity for one request.
 *
 * - direct peer NOT trusted: both internal headers are ignored completely
 *   and the canonical direct peer keys the budget. A forged header grants no
 *   authority whatsoever.
 * - direct peer IS trusted: the cryptographic edge proof is authenticated
 *   FIRST, then a single valid internal peer assertion is REQUIRED. A
 *   trusted socket peer alone is never sufficient, so a host-local process
 *   that reaches Node through the same Docker NAT path as Caddy -- and
 *   therefore presents the same trusted direct peer -- still cannot assert
 *   another admission identity.
 *
 * Missing, empty, repeated, array-shaped, comma-listed, overlong,
 * control-bearing, ported, bracketed, zoned or otherwise malformed values,
 * and any proof that fails authentication, FAIL CLOSED for that admission
 * attempt. There is deliberately no shared trusted-proxy fallback bucket and
 * no token is consumed for a rejected request.
 */
export function resolveAdmissionPeerIdentity(
  config: AdmissionPeerIdentityConfig,
  input: ResolveAdmissionPeerIdentityInput
): AdmissionPeerIdentityResult {
  const rawDirect = input.directPeerAddress;
  const direct = rawDirect === undefined ? undefined : canonicalizeAdmissionAddress(rawDirect);

  if (!direct) {
    return Object.freeze({
      kind: 'resolved' as const,
      peerKey: `direct:${UNAVAILABLE_DIRECT_PEER}`,
      source: 'direct' as const
    });
  }

  if (!config.trustedEdgePeers.has(direct.exact)) {
    return Object.freeze({ kind: 'resolved' as const, peerKey: `direct:${direct.budget}`, source: 'direct' as const });
  }

  const verifier = config.edgeProofVerifier;

  if (!verifier) {
    // Unreachable through parseAdmissionPeerIdentityConfig, which refuses to
    // produce trusted peers without a verifier. Kept as a fail-closed guard
    // so a hand-built configuration can never silently downgrade to
    // peer-only trust.
    return rejected('edge_proof_missing');
  }

  const proofRejection = verifyEdgeProof(verifier, input.headers);

  if (proofRejection) {
    return proofRejection;
  }

  const assertion = readSingleInternalHeader(input.headers, ADMISSION_EDGE_PEER_HEADER, EDGE_PEER_REASONS);

  if (!('ok' in assertion)) {
    return assertion;
  }

  const canonical = canonicalizeAdmissionAddress(assertion.value);

  if (!canonical) {
    return rejected('edge_assertion_malformed');
  }

  return Object.freeze({ kind: 'resolved' as const, peerKey: `edge:${canonical.budget}`, source: 'edge' as const });
}

/**
 * Builds the per-process resolver. Owns a bounded, sampled operational
 * diagnostic for trusted-edge assertion failures: at most one line per
 * distinct fixed reason per interval, carrying no raw IP and no raw header,
 * so a hostile edge peer cannot manufacture log spam.
 */
export function createAdmissionPeerIdentityResolver(
  options: AdmissionPeerIdentityResolverOptions
): AdmissionPeerIdentityResolver {
  const now = options.monotonicNow ?? performance.now.bind(performance);
  const intervalMs = options.diagnosticIntervalMs ?? DEFAULT_DIAGNOSTIC_INTERVAL_MS;
  // Bounded by construction: keys are drawn from the fixed reason allowlist.
  const lastReportedAt = new Map<AdmissionEdgeRejectionReason, number>();
  const suppressedSinceLastReport = new Map<AdmissionEdgeRejectionReason, number>();

  const report = (reason: AdmissionEdgeRejectionReason): void => {
    const log = options.log;

    if (!log) {
      return;
    }

    const at = now();
    const previous = lastReportedAt.get(reason);

    if (previous !== undefined && at - previous < intervalMs) {
      suppressedSinceLastReport.set(reason, (suppressedSinceLastReport.get(reason) ?? 0) + 1);
      return;
    }

    lastReportedAt.set(reason, at);
    const suppressed = suppressedSinceLastReport.get(reason) ?? 0;
    suppressedSinceLastReport.set(reason, 0);
    log('error', 'admission_trusted_edge_assertion_rejected', { reason, suppressedSinceLastReport: suppressed });
  };

  // The secret itself is parsed away at startup and only its verifier is
  // held, privately, inside this closure. The exposed description carries
  // the mode-relevant fields and nothing else.
  const publicConfig: AdmissionPeerIdentityPublicConfig = Object.freeze({
    trustedEdgePeers: options.config.trustedEdgePeers,
    explicitlyConfigured: options.config.explicitlyConfigured
  });

  return Object.freeze({
    config: publicConfig,
    resolve(input: ResolveAdmissionPeerIdentityInput): AdmissionPeerIdentityResult {
      const result = resolveAdmissionPeerIdentity(options.config, input);

      if (result.kind === 'rejected') {
        report(result.reason);
      }

      return result;
    }
  });
}
