import type {
  IncomingHttpHeaders,
  IncomingMessage,
  OutgoingHttpHeaders
} from 'node:http';
import { performance } from 'node:perf_hooks';
import { matchMaker, type AuthContext } from 'colyseus';
import type { MonotonicClock } from './tokenBucketRateLimiter.js';

export const DEFAULT_PROFILE_RATE_BURST = 8;
export const DEFAULT_PROFILE_RATE_PER_SECOND = 1;
export const DEFAULT_INPUT_RATE_BURST = 80;
export const DEFAULT_INPUT_RATE_PER_SECOND = 40;
export const DEFAULT_RECONNECT_GRACE_SECONDS = 10;

const ORIGIN_REJECTION_REASON = 'Origin is not allowed.';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const MAXIMUM_PRECISION_SAFE_RATE_LIMIT_VALUE = Number.MAX_SAFE_INTEGER;
const MINIMUM_FINITE_RETRY_REFILL_RATE = 1000 / Number.MAX_VALUE;

export interface MessageRateLimitConfig {
  readonly burst: number;
  readonly refillRatePerSecond: number;
}

export interface NetworkBoundaryConfig {
  readonly production: boolean;
  readonly originMode: 'local-development' | 'exact-allowlist';
  readonly allowedOrigins: readonly string[];
  readonly allowMissingOrigin: boolean;
  readonly profileRateLimit: MessageRateLimitConfig;
  readonly inputRateLimit: MessageRateLimitConfig;
  readonly reconnectGraceSeconds: number;
  readonly monotonicNow: MonotonicClock;
}

export interface NetworkBoundaryEnvironment {
  readonly NODE_ENV?: string;
  readonly BURNINGSPACE_ALLOWED_ORIGINS?: string;
  readonly BURNINGSPACE_PROFILE_RATE_BURST?: string;
  readonly BURNINGSPACE_PROFILE_RATE_PER_SECOND?: string;
  readonly BURNINGSPACE_INPUT_RATE_BURST?: string;
  readonly BURNINGSPACE_INPUT_RATE_PER_SECOND?: string;
  readonly BURNINGSPACE_RECONNECT_GRACE_SECONDS?: string;
}

export interface NetworkBoundaryParseOptions {
  readonly monotonicNow?: MonotonicClock;
}

export interface WebSocketVerifyClientInfo {
  readonly origin?: string;
  readonly secure: boolean;
  readonly req: IncomingMessage;
}

export type WebSocketVerifyClient = (
  info: WebSocketVerifyClientInfo,
  callback: (
    accepted: boolean,
    code?: number,
    message?: string,
    headers?: OutgoingHttpHeaders
  ) => void
) => void;

export interface NetworkBoundaryInstallation {
  readonly config: NetworkBoundaryConfig;
  restore(): void;
}

interface InstallationRecord {
  readonly config: NetworkBoundaryConfig;
  active: boolean;
}

interface OriginEvaluation {
  readonly allowed: boolean;
  readonly normalizedOrigin?: string;
}

type CorsHeadersFactory = typeof matchMaker.controller.getCorsHeaders;

const installations: InstallationRecord[] = [];
let previousCorsHeadersFactory: CorsHeadersFactory | undefined;

function parseFinitePositive(
  environmentValue: string | undefined,
  fallback: number,
  variableName: string,
  kind: 'burst' | 'refill'
): number {
  if (environmentValue === undefined) {
    return fallback;
  }

  if (environmentValue.trim().length === 0) {
    throw new Error(`${variableName} must be a finite positive number.`);
  }

  const value = Number(environmentValue);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${variableName} must be a finite positive number.`);
  }

  if (
    value > MAXIMUM_PRECISION_SAFE_RATE_LIMIT_VALUE ||
    (kind === 'burst' && value < 1) ||
    (kind === 'refill' && value < MINIMUM_FINITE_RETRY_REFILL_RATE)
  ) {
    throw new Error(`${variableName} is outside the precision-safe token-bucket range.`);
  }

  return value;
}

function parseReconnectGraceSeconds(environmentValue: string | undefined): number {
  if (environmentValue === undefined) {
    return DEFAULT_RECONNECT_GRACE_SECONDS;
  }

  if (environmentValue.trim().length === 0) {
    throw new Error('BURNINGSPACE_RECONNECT_GRACE_SECONDS must be an integer from 1 to 60.');
  }

  const value = Number(environmentValue);

  if (!Number.isInteger(value) || value < 1 || value > 60) {
    throw new Error('BURNINGSPACE_RECONNECT_GRACE_SECONDS must be an integer from 1 to 60.');
  }

  return value;
}

function normalizeOrigin(value: string, label: string): string {
  const candidate = value.trim();

  if (candidate.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }

  if (candidate === '*' || candidate.includes('*')) {
    throw new Error(`${label} must not contain a wildcard.`);
  }

  if (candidate.toLowerCase() === 'null') {
    throw new Error(`${label} must be an HTTP or HTTPS origin.`);
  }

  if (/\s/u.test(candidate) || /[\u0000-\u001f\u007f]/u.test(candidate)) {
    throw new Error(`${label} must not contain whitespace or control characters.`);
  }

  if (candidate.includes('\\')) {
    throw new Error(`${label} must not contain backslashes.`);
  }

  if (!/^https?:\/\//i.test(candidate)) {
    throw new Error(`${label} must use an absolute HTTP or HTTPS origin.`);
  }

  const authorityStart = candidate.indexOf('://') + 3;
  const authorityEnd = candidate.slice(authorityStart).search(/[/?#]/u);
  const rawAuthority = authorityEnd === -1
    ? candidate.slice(authorityStart)
    : candidate.slice(authorityStart, authorityStart + authorityEnd);

  if (rawAuthority.length === 0 || rawAuthority.includes('@')) {
    throw new Error(`${label} must not contain credentials or empty authority.`);
  }

  if (rawAuthority.startsWith('[')) {
    const closingBracket = rawAuthority.lastIndexOf(']');
    const suffix = closingBracket === -1 ? rawAuthority : rawAuthority.slice(closingBracket + 1);

    if (closingBracket === -1 || (suffix !== '' && !/^:\d+$/u.test(suffix))) {
      throw new Error(`${label} contains an invalid host or port.`);
    }
  } else {
    const firstColon = rawAuthority.indexOf(':');
    const lastColon = rawAuthority.lastIndexOf(':');

    if (
      firstColon !== lastColon ||
      (lastColon !== -1 && !/^\d+$/u.test(rawAuthority.slice(lastColon + 1)))
    ) {
      throw new Error(`${label} contains an invalid host or port.`);
    }
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error(`${label} is not a valid origin.`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${label} must use HTTP or HTTPS.`);
  }

  const pathStart = candidate.indexOf('/', authorityStart);
  const rawPath = pathStart === -1 ? '' : candidate.slice(pathStart);

  if (
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.pathname !== '/' ||
    url.search.length > 0 ||
    url.hash.length > 0 ||
    candidate.includes('?') ||
    candidate.includes('#') ||
    (rawPath !== '' && rawPath !== '/')
  ) {
    throw new Error(`${label} must not contain credentials, path, query, or fragment.`);
  }

  return url.origin;
}

function parseAllowedOrigins(rawValue: string): readonly string[] {
  if (rawValue.trim().length === 0) {
    throw new Error('BURNINGSPACE_ALLOWED_ORIGINS must not be empty.');
  }

  const origins = rawValue.split(',').map((value, index) =>
    normalizeOrigin(value, `BURNINGSPACE_ALLOWED_ORIGINS entry ${index + 1}`)
  );

  return Object.freeze([...new Set(origins)]);
}

function freezeRateLimit(
  burst: number,
  refillRatePerSecond: number
): MessageRateLimitConfig {
  return Object.freeze({ burst, refillRatePerSecond });
}

export function parseNetworkBoundaryConfig(
  environment: NetworkBoundaryEnvironment = process.env,
  options: NetworkBoundaryParseOptions = {}
): NetworkBoundaryConfig {
  const production = environment.NODE_ENV === 'production';
  const rawAllowedOrigins = environment.BURNINGSPACE_ALLOWED_ORIGINS;

  if (production && rawAllowedOrigins === undefined) {
    throw new Error('BURNINGSPACE_ALLOWED_ORIGINS is required in production.');
  }

  const allowedOrigins = rawAllowedOrigins === undefined
    ? Object.freeze([] as string[])
    : parseAllowedOrigins(rawAllowedOrigins);
  const profileRateLimit = freezeRateLimit(
    parseFinitePositive(
      environment.BURNINGSPACE_PROFILE_RATE_BURST,
      DEFAULT_PROFILE_RATE_BURST,
      'BURNINGSPACE_PROFILE_RATE_BURST',
      'burst'
    ),
    parseFinitePositive(
      environment.BURNINGSPACE_PROFILE_RATE_PER_SECOND,
      DEFAULT_PROFILE_RATE_PER_SECOND,
      'BURNINGSPACE_PROFILE_RATE_PER_SECOND',
      'refill'
    )
  );
  const inputRateLimit = freezeRateLimit(
    parseFinitePositive(
      environment.BURNINGSPACE_INPUT_RATE_BURST,
      DEFAULT_INPUT_RATE_BURST,
      'BURNINGSPACE_INPUT_RATE_BURST',
      'burst'
    ),
    parseFinitePositive(
      environment.BURNINGSPACE_INPUT_RATE_PER_SECOND,
      DEFAULT_INPUT_RATE_PER_SECOND,
      'BURNINGSPACE_INPUT_RATE_PER_SECOND',
      'refill'
    )
  );

  return Object.freeze({
    production,
    originMode: rawAllowedOrigins === undefined ? 'local-development' : 'exact-allowlist',
    allowedOrigins,
    allowMissingOrigin: !production,
    profileRateLimit,
    inputRateLimit,
    reconnectGraceSeconds: parseReconnectGraceSeconds(
      environment.BURNINGSPACE_RECONNECT_GRACE_SECONDS
    ),
    monotonicNow: options.monotonicNow ?? performance.now.bind(performance)
  });
}

let fallbackNetworkBoundaryConfig: NetworkBoundaryConfig | undefined;

function evaluateOrigin(
  config: NetworkBoundaryConfig,
  originHeader: string | readonly string[] | undefined
): OriginEvaluation {
  if (originHeader === undefined) {
    return { allowed: config.allowMissingOrigin };
  }

  if (typeof originHeader !== 'string') {
    return { allowed: false };
  }

  let normalizedOrigin: string;

  try {
    normalizedOrigin = normalizeOrigin(originHeader, 'Request Origin');
  } catch {
    return { allowed: false };
  }

  if (config.originMode === 'exact-allowlist') {
    return {
      allowed: config.allowedOrigins.includes(normalizedOrigin),
      normalizedOrigin
    };
  }

  const hostname = new URL(normalizedOrigin).hostname;

  return {
    allowed: LOCAL_HOSTNAMES.has(hostname),
    normalizedOrigin
  };
}

export function isRequestOriginAllowed(
  config: NetworkBoundaryConfig,
  originHeader: string | readonly string[] | undefined
): boolean {
  return evaluateOrigin(config, originHeader).allowed;
}

export function getActiveNetworkBoundaryConfig(): NetworkBoundaryConfig {
  for (let index = installations.length - 1; index >= 0; index -= 1) {
    const installation = installations[index];

    if (installation?.active) {
      return installation.config;
    }
  }

  fallbackNetworkBoundaryConfig ??= parseNetworkBoundaryConfig();
  return fallbackNetworkBoundaryConfig;
}

export function assertRequestOrigin(
  context: Pick<AuthContext, 'headers'>,
  config = getActiveNetworkBoundaryConfig()
): void {
  if (!isRequestOriginAllowed(config, context.headers.origin)) {
    throw new Error(ORIGIN_REJECTION_REASON);
  }
}

function createCorsHeaders(
  config: NetworkBoundaryConfig,
  headers: IncomingHttpHeaders
): Record<string, string> {
  const evaluation = evaluateOrigin(config, headers.origin);
  const reflectedOrigin = evaluation.allowed ? evaluation.normalizedOrigin ?? '' : '';

  return {
    'Access-Control-Allow-Origin': reflectedOrigin,
    Vary: 'Origin'
  };
}

const installedCorsHeadersFactory: CorsHeadersFactory = (request) =>
  createCorsHeaders(getActiveNetworkBoundaryConfig(), request.headers);

function hasActiveInstallation(): boolean {
  return installations.some(({ active }) => active);
}

function compactInactiveInstallations(): void {
  for (let index = installations.length - 1; index >= 0; index -= 1) {
    if (installations[index]?.active) {
      return;
    }

    installations.pop();
  }
}

export function installNetworkBoundary(
  config: NetworkBoundaryConfig
): NetworkBoundaryInstallation {
  if (!hasActiveInstallation()) {
    previousCorsHeadersFactory = matchMaker.controller.getCorsHeaders;
    matchMaker.controller.getCorsHeaders = installedCorsHeadersFactory;
  } else if (matchMaker.controller.getCorsHeaders !== installedCorsHeadersFactory) {
    throw new Error('Network boundary CORS policy ownership was replaced unexpectedly.');
  }

  const record: InstallationRecord = { config, active: true };
  installations.push(record);
  let restored = false;

  return Object.freeze({
    config,
    restore(): void {
      if (restored) {
        return;
      }

      restored = true;
      record.active = false;
      compactInactiveInstallations();

      if (hasActiveInstallation()) {
        return;
      }

      installations.length = 0;

      if (
        previousCorsHeadersFactory &&
        matchMaker.controller.getCorsHeaders === installedCorsHeadersFactory
      ) {
        matchMaker.controller.getCorsHeaders = previousCorsHeadersFactory;
      }

      previousCorsHeadersFactory = undefined;
    }
  });
}

export function createWebSocketVerifyClient(
  config: NetworkBoundaryConfig
): WebSocketVerifyClient {
  return (info, callback) => {
    const allowed = isRequestOriginAllowed(config, info.req.headers.origin);

    if (allowed) {
      callback(true);
      return;
    }

    callback(false, 403, ORIGIN_REJECTION_REASON);
  };
}

export function describeNetworkBoundaryMode(config: NetworkBoundaryConfig): string {
  return config.production
    ? 'production exact-origin mode'
    : 'local-development mode';
}
