import { isIP } from 'node:net';
import { readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, posix, relative, resolve } from 'node:path';

type Mode = 'template' | 'phase-a' | 'phase-b';
type RollbackMode = 'previous-approved-release' | 'bootstrap-no-previous-release';

interface EdgePlan {
  schemaVersion: number;
  environmentId: string;
  edgeImplementation: string;
  caddyValidationVersion: string;
  caddyValidationArtifact: string;
  clientHostname: string;
  serverHostname: string;
  clientUpstreamHost: string;
  clientUpstreamPort: number;
  serverUpstreamHost: string;
  serverUpstreamPort: number;
  adminAddress: string;
  adminTransport: string;
  adminSocketDirectory: string;
  adminSocketDirectoryMode: string;
  adminServiceUmask: string;
  adminTcpListenerAllowed: boolean;
  publicProtocols: string[];
  automaticHttps: boolean;
  originMutationAllowed: boolean;
  webSocketEnabled: boolean;
  streamTimeout: string;
  streamCloseDelay: string;
  accessLogUriPolicy: string;
  accessLogMaxSize: string;
  accessLogMaxFiles: number;
  accessLogRetention: string;
  edgeConfigId: string;
  previousEdgeConfigId?: string;
  rollbackMode: RollbackMode;
  deploymentGoReference: string;
  hostInstallationAuthorized: boolean;
  dnsConfigured: boolean;
  tlsReady: boolean;
  externalExecutionAuthorized: boolean;
  publicProductionLaunchAuthorized: boolean;
}

interface ValidationRelease {
  schemaVersion: number;
  product: string;
  version: string;
  source: string;
  releaseUrl: string;
  artifactType: string;
  artifactName: string;
  artifactUrl: string;
  architecture: string;
  sha256: string;
  sha512: string;
  checksumManifestUrl: string;
  checksumManifestSha256: string;
  thirdPartyModules: unknown[];
  plugins: unknown[];
  hostPackageInstalled: boolean;
}

class EdgeValidationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'EdgeValidationError';
  }
}

const ROOT = realpathSync(resolve('.'));
const DEFAULT_ENV = 'deploy/edge/caddy/edge.env.example';
const DEFAULT_PLAN = 'deploy/edge/caddy/edge-plan.example.json';
const DEFAULT_RELEASE = 'deploy/edge/caddy/caddy-validation-release.json';
const DEFAULT_TEMPLATE = 'deploy/edge/caddy/Caddyfile.template';
const DEFAULT_SYSTEMD_DROPIN = 'deploy/edge/caddy/systemd/caddy.service.d/10-burningspace-edge.conf';
const EXPECTED_VERSION = '2.11.4';
const EXPECTED_ARTIFACT_NAME = 'caddy_2.11.4_linux_amd64.tar.gz';
const EXPECTED_SHA256 = '527fbf917c39189a1e3b31d34fa955601680b2d5c8055d2a87b8b9588dec7bb9';
const EXPECTED_SHA512 = '8220d1f013b6f27510247b2360c9e0ca9f018feebd82515f07635318b34ff9777ccc8fd0b6e6f2486ce3a33fe389fbb7db12d05baa474f4587509fb4f5ebf1c9';
const EXPECTED_ARTIFACT = `${EXPECTED_ARTIFACT_NAME}@sha256:${EXPECTED_SHA256}`;
const ENVIRONMENT_ID = 'burningspace-staging-01';
const CLIENT_PORT = 18_080;
const SERVER_PORT = 2_567;
const ADMIN_ADDRESS = 'unix//run/caddy/burningspace-admin.sock';
const ADMIN_SOCKET_DIRECTORY = '/run/caddy';
const ADMIN_SOCKET_PATH = '/run/caddy/burningspace-admin.sock';
const ADMIN_RELOAD = 'ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force --address unix//run/caddy/burningspace-admin.sock';
const MAX_INPUT_BYTES = 1_048_576;

const ENV_KEYS = [
  'BURNINGSPACE_EDGE_ENVIRONMENT_ID',
  'BURNINGSPACE_PUBLIC_CLIENT_HOSTNAME',
  'BURNINGSPACE_PUBLIC_SERVER_HOSTNAME',
  'BURNINGSPACE_CLIENT_BIND_PORT',
  'BURNINGSPACE_SERVER_BIND_PORT',
  'BURNINGSPACE_CADDY_ADMIN_ADDRESS',
  'BURNINGSPACE_CADDY_STREAM_TIMEOUT',
  'BURNINGSPACE_CADDY_STREAM_CLOSE_DELAY',
  'BURNINGSPACE_CADDY_LOG_DIRECTORY',
  'BURNINGSPACE_CADDY_VERSION_BASELINE',
  'BURNINGSPACE_EDGE_CONFIG_ID',
  'BURNINGSPACE_PREVIOUS_EDGE_CONFIG_ID',
  'BURNINGSPACE_ROLLBACK_MODE',
  'BURNINGSPACE_DEPLOYMENT_GO_REFERENCE'
] as const;

const PLAN_KEYS = [
  'schemaVersion', 'environmentId', 'edgeImplementation', 'caddyValidationVersion',
  'caddyValidationArtifact', 'clientHostname', 'serverHostname', 'clientUpstreamHost',
  'clientUpstreamPort', 'serverUpstreamHost', 'serverUpstreamPort', 'adminAddress',
  'adminTransport', 'adminSocketDirectory', 'adminSocketDirectoryMode',
  'adminServiceUmask', 'adminTcpListenerAllowed',
  'publicProtocols', 'automaticHttps', 'originMutationAllowed', 'webSocketEnabled',
  'streamTimeout', 'streamCloseDelay', 'accessLogUriPolicy', 'accessLogMaxSize',
  'accessLogMaxFiles', 'accessLogRetention', 'edgeConfigId', 'previousEdgeConfigId', 'rollbackMode',
  'deploymentGoReference', 'hostInstallationAuthorized', 'dnsConfigured', 'tlsReady',
  'externalExecutionAuthorized', 'publicProductionLaunchAuthorized'
] as const;

function fail(code: string, message: string): never {
  throw new EdgeValidationError(code, message);
}

function readBounded(path: string): string {
  try {
    const exact = realpathSync(resolve(path));
    const fromRoot = relative(ROOT, exact);
    if (fromRoot.startsWith('..') || resolve(ROOT, fromRoot) !== exact || statSync(exact).size > MAX_INPUT_BYTES) {
      fail('INPUT_PATH', 'Input must be a bounded regular file inside the repository.');
    }
    return readFileSync(exact, 'utf8');
  } catch (error) {
    if (error instanceof EdgeValidationError) throw error;
    fail('INPUT_READ', 'A required bounded repository input could not be read.');
  }
}

function isTemporaryPath(path: string): boolean {
  const roots = [realpathSync(tmpdir())];
  if (process.env.RUNNER_TEMP) {
    try { roots.push(realpathSync(process.env.RUNNER_TEMP)); } catch { /* absent runner path */ }
  }
  return roots.some((root) => {
    const fromRoot = relative(root, path);
    return fromRoot !== '' && !fromRoot.startsWith('..') && !isAbsolute(fromRoot);
  });
}

function parseEnv(contents: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const raw of contents.split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals < 1) fail('ENV_SYNTAX', 'Edge inventory contains an invalid assignment.');
    const key = line.slice(0, equals).trim();
    if (!/^[A-Z][A-Z0-9_]*$/u.test(key) || Object.hasOwn(result, key)) {
      fail('ENV_KEY', 'Edge inventory contains an invalid or duplicate key.');
    }
    result[key] = line.slice(equals + 1).trim();
  }
  return result;
}

function object(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, 'A required object is missing or invalid.');
  return value as Record<string, unknown>;
}

function text(value: unknown, code: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) {
    fail(code, 'A required bounded text field is missing or invalid.');
  }
  return value.trim();
}

function integer(value: unknown, code: string): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 65_535) {
    fail(code, 'A required port is not a bounded integer.');
  }
  return Number(value);
}

function parsePort(value: string | undefined, code: string): number {
  return integer(Number(value), code);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], code: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, 'An inventory contains missing or unexpected fields.');
  }
}

function validateHostname(value: unknown, mode: Mode, code: string): string {
  const hostname = text(value, code);
  if (
    hostname !== hostname.toLowerCase() || hostname.length > 253 || hostname.includes('*') ||
    /[\s/@:?#\\\u0000-\u001f\u007f]/u.test(hostname) || isIP(hostname) !== 0 ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(hostname)
  ) {
    fail(code, 'A public hostname must be one exact lower-case DNS name without wildcard, IP, port, credentials, path, query, or fragment.');
  }
  if (mode !== 'template' && hostname.endsWith('.example.invalid')) {
    fail('PLACEHOLDER_HOSTNAME', 'Real preparation modes reject documentation-only hostnames.');
  }
  return hostname;
}

function duration(value: unknown, code: string): string {
  const candidate = text(value, code);
  if (!/^[1-9][0-9]*(?:s|m|h)$/u.test(candidate)) fail(code, 'A bounded duration is missing or invalid.');
  return candidate;
}

function assertNoSecretShape(values: unknown[]): void {
  for (const value of values.flatMap((entry) => Array.isArray(entry) ? entry : [entry])) {
    if (typeof value !== 'string') continue;
    if (
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/u.test(value) ||
      /\b(?:ghp_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9_-]{8,}\b/u.test(value) ||
      /\bsk-[A-Za-z0-9_-]{12,}\b/u.test(value)
    ) fail('SECRET_VALUE', 'An inventory contains credential-shaped material.');
  }
}

function validateRelease(raw: unknown): ValidationRelease {
  const release = object(raw, 'RELEASE_SHAPE') as unknown as ValidationRelease;
  const expectedKeys: Array<keyof ValidationRelease> = [
    'schemaVersion', 'product', 'version', 'source', 'releaseUrl', 'artifactType', 'artifactName',
    'artifactUrl', 'architecture', 'sha256', 'sha512', 'checksumManifestUrl',
    'checksumManifestSha256', 'thirdPartyModules', 'plugins', 'hostPackageInstalled'
  ];
  exactKeys(release as unknown as Record<string, unknown>, expectedKeys, 'RELEASE_FIELDS');
  if (
    release.schemaVersion !== 1 || release.product !== 'Caddy' || release.version !== EXPECTED_VERSION ||
    release.source !== 'https://github.com/caddyserver/caddy' ||
    release.releaseUrl !== `https://github.com/caddyserver/caddy/releases/tag/v${EXPECTED_VERSION}` ||
    release.artifactType !== 'official-release-archive' || release.artifactName !== EXPECTED_ARTIFACT_NAME ||
    release.artifactUrl !== `https://github.com/caddyserver/caddy/releases/download/v${EXPECTED_VERSION}/${EXPECTED_ARTIFACT_NAME}` ||
    release.architecture !== 'linux/amd64' || release.sha256 !== EXPECTED_SHA256 ||
    release.sha512 !== EXPECTED_SHA512 ||
    release.checksumManifestUrl !== `https://github.com/caddyserver/caddy/releases/download/v${EXPECTED_VERSION}/caddy_${EXPECTED_VERSION}_checksums.txt` ||
    !/^[0-9a-f]{64}$/u.test(release.checksumManifestSha256) || release.hostPackageInstalled !== false ||
    !Array.isArray(release.thirdPartyModules) || release.thirdPartyModules.length !== 0 ||
    !Array.isArray(release.plugins) || release.plugins.length !== 0
  ) fail('RELEASE_BINDING', 'The Caddy validation release is not the exact approved immutable official artifact.');
  if (/\b(?:latest|2|2\.11)\b/u.test(release.artifactName) || !release.artifactUrl.startsWith('https://github.com/caddyserver/caddy/releases/download/v2.11.4/')) {
    fail('MUTABLE_ARTIFACT', 'A mutable or non-upstream Caddy artifact is forbidden.');
  }
  return release;
}

function validateTemplate(template: string): void {
  if (template.length > 65_536) fail('TEMPLATE_SIZE', 'Caddyfile template exceeds the bounded size.');
  for (const key of [
    'BURNINGSPACE_CADDY_ADMIN_ADDRESS', 'BURNINGSPACE_PUBLIC_CLIENT_HOSTNAME',
    'BURNINGSPACE_PUBLIC_SERVER_HOSTNAME', 'BURNINGSPACE_CLIENT_BIND_PORT',
    'BURNINGSPACE_SERVER_BIND_PORT', 'BURNINGSPACE_CADDY_STREAM_TIMEOUT',
    'BURNINGSPACE_CADDY_STREAM_CLOSE_DELAY', 'BURNINGSPACE_CADDY_LOG_DIRECTORY'
  ]) {
    if (!template.includes(`{$${key}}`)) fail('TEMPLATE_PLACEHOLDER', 'Caddyfile is missing a required environment placeholder.');
  }
  const required = [
    'persist_config off', 'protocols h1 h2', 'strict_sni_host on', 'grace_period 30s',
    'versions 1.1', 'dial_timeout 5s', 'response_header_timeout 30s', 'keepalive 2m',
    'roll_size 10MiB', 'roll_keep 3', 'roll_keep_for 72h', 'request>uri delete',
    'request>headers>Authorization delete', 'request>headers>Proxy-Authorization delete',
    'request>headers>Cookie delete'
  ];
  for (const entry of required) if (!template.includes(entry)) fail('TEMPLATE_CONTRACT', 'Caddyfile is missing a required edge directive.');
  for (const field of [
    'request>uri delete', 'request>headers>Authorization delete',
    'request>headers>Proxy-Authorization delete', 'request>headers>Cookie delete'
  ]) {
    if ((template.match(new RegExp(field, 'gu')) ?? []).length !== 3) {
      fail('LOG_URI_POLICY', 'Runtime and both access loggers must delete query-bearing and credential fields.');
    }
  }
  if ((template.match(/roll_size 10MiB/gu) ?? []).length !== 2 || (template.match(/roll_keep 3/gu) ?? []).length !== 2) {
    fail('LOG_ROTATION', 'Both access logs require bounded rolling.');
  }
  if ((template.match(/stream_timeout \{\$BURNINGSPACE_CADDY_STREAM_TIMEOUT\}/gu) ?? []).length !== 2) {
    fail('STREAM_TIMEOUT', 'Both routes require the bounded stream timeout.');
  }
  if ((template.match(/stream_close_delay \{\$BURNINGSPACE_CADDY_STREAM_CLOSE_DELAY\}/gu) ?? []).length !== 2) {
    fail('STREAM_CLOSE_DELAY', 'Both routes require the bounded reload close delay.');
  }
  for (const match of template.matchAll(/\bheader_up\s+([^\s]+)/giu)) {
    if (caddyHeaderPatternTargetsOrigin(match[1]!)) fail('ORIGIN_MUTATION', 'Caddy must not mutate, synthesize, or remove Origin.');
  }
  if (/^\s*(?:rewrite|uri)\s+/imu.test(template)) fail('URI_REWRITE', 'Caddy must not rewrite path or query data.');
  if (/\b(?:tls_insecure_skip_verify|trusted_proxies|tls\s+internal|debug|credentials)\b/iu.test(template)) {
    fail('FORBIDDEN_DIRECTIVE', 'Caddyfile contains a forbidden trust, TLS, debug, or credential directive.');
  }
  if (/\bprotocols\b[^\r\n]*\bh3\b/iu.test(template)) fail('HTTP3', 'HTTP/3 is outside the reviewed initial surface.');
}

function validateSystemdDropIn(dropIn: string): void {
  if (dropIn.length > 16_384) fail('SYSTEMD_DROPIN_SIZE', 'Caddy systemd drop-in exceeds the bounded size.');
  const lines = dropIn.split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const expected = [
    '[Service]',
    'RuntimeDirectory=caddy',
    'RuntimeDirectoryMode=0700',
    'UMask=0077',
    'ExecReload=',
    ADMIN_RELOAD
  ];
  if (lines.length !== expected.length || lines.some((line, index) => line !== expected[index])) {
    fail('SYSTEMD_DROPIN', 'Caddy systemd drop-in must define the exact private runtime directory, umask, and Unix-socket reload override.');
  }
}

function validatePlan(
  env: Record<string, string>,
  rawPlan: unknown,
  mode: Mode,
  release: ValidationRelease,
  template: string,
  systemdDropIn: string
): EdgePlan {
  const planObject = object(rawPlan, 'PLAN_SHAPE');
  const rollbackMode = text(planObject.rollbackMode, 'ROLLBACK_MODE');
  if (rollbackMode !== 'previous-approved-release' && rollbackMode !== 'bootstrap-no-previous-release') {
    fail('ROLLBACK_MODE', 'The edge rollback mode is unsupported.');
  }
  if (env.BURNINGSPACE_ROLLBACK_MODE !== rollbackMode) {
    fail('ROLLBACK_MODE_MISMATCH', 'Plan and environment rollback modes do not match.');
  }
  const expectedEnvKeys = rollbackMode === 'bootstrap-no-previous-release'
    ? ENV_KEYS.filter((key) => key !== 'BURNINGSPACE_PREVIOUS_EDGE_CONFIG_ID')
    : ENV_KEYS;
  const expectedPlanKeys = rollbackMode === 'bootstrap-no-previous-release'
    ? PLAN_KEYS.filter((key) => key !== 'previousEdgeConfigId')
    : PLAN_KEYS;
  exactKeys(env, expectedEnvKeys, 'ENV_FIELDS');
  exactKeys(planObject, expectedPlanKeys, 'PLAN_FIELDS');
  assertNoSecretShape([...Object.values(env), ...Object.values(planObject)]);
  const plan = planObject as unknown as EdgePlan;

  if (plan.schemaVersion !== 2 || plan.environmentId !== ENVIRONMENT_ID || env.BURNINGSPACE_EDGE_ENVIRONMENT_ID !== ENVIRONMENT_ID) {
    fail('ENVIRONMENT_ID', 'The edge inventory must bind the selected staging environment.');
  }
  if (plan.edgeImplementation !== 'caddy-host-systemd') fail('EDGE_IMPLEMENTATION', 'The selected edge is a host-managed Caddy systemd service.');
  if (
    plan.caddyValidationVersion !== EXPECTED_VERSION || env.BURNINGSPACE_CADDY_VERSION_BASELINE !== EXPECTED_VERSION ||
    release.version !== plan.caddyValidationVersion
  ) fail('CADDY_VERSION', 'The edge plan does not match the pinned Caddy baseline.');
  if (plan.caddyValidationArtifact !== EXPECTED_ARTIFACT) fail('CADDY_ARTIFACT', 'The edge plan does not bind the immutable Caddy artifact.');

  const client = validateHostname(plan.clientHostname, mode, 'CLIENT_HOSTNAME');
  const server = validateHostname(plan.serverHostname, mode, 'SERVER_HOSTNAME');
  if (client === server) fail('HOSTNAME_EQUAL', 'Client and server hostnames must be distinct.');
  if (client !== env.BURNINGSPACE_PUBLIC_CLIENT_HOSTNAME || server !== env.BURNINGSPACE_PUBLIC_SERVER_HOSTNAME) {
    fail('HOSTNAME_MISMATCH', 'Plan and environment hostnames do not match.');
  }
  if (plan.clientUpstreamHost !== '127.0.0.1' || plan.serverUpstreamHost !== '127.0.0.1') {
    fail('UPSTREAM_HOST', 'Both upstream hosts must be exact IPv4 loopback.');
  }
  if (
    integer(plan.clientUpstreamPort, 'CLIENT_PORT') !== CLIENT_PORT || parsePort(env.BURNINGSPACE_CLIENT_BIND_PORT, 'CLIENT_PORT') !== CLIENT_PORT
  ) fail('CLIENT_PORT', 'The selected host client upstream port must be 18080.');
  if (
    integer(plan.serverUpstreamPort, 'SERVER_PORT') !== SERVER_PORT || parsePort(env.BURNINGSPACE_SERVER_BIND_PORT, 'SERVER_PORT') !== SERVER_PORT
  ) fail('SERVER_PORT', 'The selected host server upstream port must be 2567.');
  if (plan.adminTransport !== 'unix') fail('ADMIN_TRANSPORT', 'The Caddy admin API transport must be Unix socket only.');
  const adminAddress = text(plan.adminAddress, 'ADMIN_ADDRESS');
  if (!adminAddress.startsWith('unix/')) fail('ADMIN_ADDRESS', 'TCP and non-Unix Caddy admin addresses are forbidden.');
  const socketPath = adminAddress.startsWith('unix/') ? adminAddress.slice('unix/'.length) : '';
  if (!posix.isAbsolute(socketPath) || socketPath.split('/').includes('..')) {
    fail('ADMIN_SOCKET_PATH', 'The Caddy admin socket must be one absolute traversal-free path under /run/caddy.');
  }
  const normalizedSocketPath = posix.normalize(socketPath);
  const fromRuntimeDirectory = posix.relative(ADMIN_SOCKET_DIRECTORY, normalizedSocketPath);
  if (
    plan.adminSocketDirectory !== ADMIN_SOCKET_DIRECTORY || fromRuntimeDirectory.startsWith('..') ||
    posix.isAbsolute(fromRuntimeDirectory) || posix.dirname(normalizedSocketPath) !== ADMIN_SOCKET_DIRECTORY
  ) {
    fail('ADMIN_SOCKET_DIRECTORY', 'The Caddy admin socket directory must be exactly /run/caddy.');
  }
  if (
    normalizedSocketPath !== ADMIN_SOCKET_PATH || adminAddress !== ADMIN_ADDRESS ||
    env.BURNINGSPACE_CADDY_ADMIN_ADDRESS !== ADMIN_ADDRESS
  ) fail('ADMIN_ADDRESS', 'The Caddy admin API must use the exact canonical Unix socket.');
  if (plan.adminSocketDirectoryMode !== '0700') fail('ADMIN_SOCKET_MODE', 'The Caddy runtime directory mode must be exactly 0700.');
  if (plan.adminServiceUmask !== '0077') fail('ADMIN_UMASK', 'The Caddy service umask must be exactly 0077.');
  if (plan.adminTcpListenerAllowed !== false) fail('ADMIN_TCP', 'No TCP Caddy admin listener is allowed.');
  if (!Array.isArray(plan.publicProtocols) || plan.publicProtocols.join(',') !== 'h1,h2') {
    fail('PUBLIC_PROTOCOLS', 'Initial public protocols must be exactly h1 and h2.');
  }
  if (plan.automaticHttps !== true) fail('AUTOMATIC_HTTPS', 'Automatic HTTPS must remain enabled for the future public edge.');
  if (plan.originMutationAllowed !== false) fail('ORIGIN_MUTATION', 'Origin mutation must remain forbidden.');
  if (plan.webSocketEnabled !== true) fail('WEBSOCKET', 'WebSocket proxy support must remain enabled.');
  if (duration(plan.streamTimeout, 'STREAM_TIMEOUT') !== '24h' || env.BURNINGSPACE_CADDY_STREAM_TIMEOUT !== '24h') {
    fail('STREAM_TIMEOUT', 'The initial stream timeout must be exactly 24h.');
  }
  if (duration(plan.streamCloseDelay, 'STREAM_CLOSE_DELAY') !== '5m' || env.BURNINGSPACE_CADDY_STREAM_CLOSE_DELAY !== '5m') {
    fail('STREAM_CLOSE_DELAY', 'The initial stream close delay must be exactly 5m.');
  }
  if (
    plan.accessLogUriPolicy !== 'delete' || plan.accessLogMaxSize !== '10MiB' ||
    plan.accessLogMaxFiles !== 3 || plan.accessLogRetention !== '72h'
  ) fail('LOG_POLICY', 'The edge plan must delete request URIs and retain bounded rolling logs.');
  const logDirectory = text(env.BURNINGSPACE_CADDY_LOG_DIRECTORY, 'LOG_DIRECTORY');
  if (!logDirectory.startsWith('/') || logDirectory.includes('..')) {
    fail('LOG_DIRECTORY', 'The Caddy access-log directory must be one absolute bounded host path.');
  }

  const edgeId = text(plan.edgeConfigId, 'EDGE_CONFIG_ID');
  let previousId: string | undefined;
  if (rollbackMode === 'previous-approved-release') {
    previousId = text(plan.previousEdgeConfigId, 'PREVIOUS_EDGE_CONFIG_ID');
    if (edgeId === previousId) fail('EDGE_CONFIG_EQUAL', 'Current and previous edge configuration IDs must differ.');
    if (previousId !== env.BURNINGSPACE_PREVIOUS_EDGE_CONFIG_ID) {
      fail('EDGE_CONFIG_MISMATCH', 'Plan and environment edge configuration IDs do not match.');
    }
  }
  if (edgeId !== env.BURNINGSPACE_EDGE_CONFIG_ID) fail('EDGE_CONFIG_MISMATCH', 'Plan and environment edge configuration IDs do not match.');
  const go = text(plan.deploymentGoReference, 'GO_REFERENCE');
  if (go !== env.BURNINGSPACE_DEPLOYMENT_GO_REFERENCE) fail('GO_MISMATCH', 'Plan and environment GO references do not match.');
  if (plan.publicProductionLaunchAuthorized !== false) fail('PUBLIC_PRODUCTION', 'Public production launch authorization must remain false.');
  if (mode === 'template' && (
    plan.hostInstallationAuthorized || plan.dnsConfigured || plan.tlsReady || plan.externalExecutionAuthorized
  )) fail('TEMPLATE_AUTHORIZATION', 'Committed templates cannot authorize host installation, DNS, TLS, or execution.');
  if (mode === 'phase-a' && (plan.hostInstallationAuthorized || plan.externalExecutionAuthorized)) {
    fail('PHASE_A_AUTHORIZATION', 'Phase A cannot authorize host installation or external execution.');
  }
  if (mode === 'phase-b') {
    if (!plan.hostInstallationAuthorized || !plan.dnsConfigured || !plan.tlsReady || !plan.externalExecutionAuthorized) {
      fail('PHASE_B_AUTHORIZATION', 'Phase B requires explicit installation, DNS, TLS, and execution authorization.');
    }
    if (go === 'NOT-AUTHORIZED' || go.endsWith('.example.invalid')) fail('GO_REQUIRED', 'Phase B requires an exact non-placeholder deployment GO reference.');
  }
  if (mode !== 'template' && (
    edgeId.endsWith('.example.invalid') || previousId?.endsWith('.example.invalid') || go.endsWith('.example.invalid')
  )) fail('PLACEHOLDER_BINDING', 'Real preparation modes reject documentation-only identifiers.');

  validateTemplate(template);
  validateSystemdDropIn(systemdDropIn);
  return plan;
}

function render(template: string, env: Record<string, string>): string {
  let rendered = template;
  for (const key of ENV_KEYS) rendered = rendered.replaceAll(`{$${key}}`, env[key] ?? '');
  if (/\{\$[A-Z][A-Z0-9_]*\}/u.test(rendered)) fail('RENDER_PLACEHOLDER', 'Rendered Caddyfile retained an unresolved placeholder.');
  return rendered;
}

function walk(value: unknown, visit: (record: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const entry of value) walk(entry, visit);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  visit(record);
  for (const entry of Object.values(record)) walk(entry, visit);
}

function durationNanoseconds(value: unknown, code: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^[0-9]+$/u.test(value)) return Number(value);
  fail(code, 'Adapted configuration contains an invalid duration representation.');
}

function adaptedLogFilterSafe(logger: Record<string, unknown>): boolean {
  const encoder = object(logger.encoder, 'ADAPTED_LOG_ENCODER');
  const fields = object(encoder.fields, 'ADAPTED_LOG_FIELDS');
  const deleted = (name: string): boolean => {
    const filter = object(fields[name], 'ADAPTED_LOG_FIELDS');
    return filter.filter === 'delete';
  };
  return encoder.format === 'filter' && object(encoder.wrap, 'ADAPTED_LOG_ENCODER').format === 'json' &&
    deleted('request>uri') && deleted('request>headers>Authorization') &&
    deleted('request>headers>Proxy-Authorization') && deleted('request>headers>Cookie');
}

function adaptedAccessLogSafe(logger: Record<string, unknown>): boolean {
  const writer = object(logger.writer, 'ADAPTED_LOG_WRITER');
  return writer.output === 'file' && typeof writer.filename === 'string' &&
    writer.roll_size_mb === 10 && writer.roll_keep === 3 && writer.roll_keep_days === 3 &&
    adaptedLogFilterSafe(logger);
}

function caddyHeaderPatternTargetsOrigin(value: string): boolean {
  const header = value.replace(/^[+\-?>]+/u, '').toLowerCase();
  const escaped = header.split('*').map((part) => part.replace(/[\\^$.*+?()[\]{}|]/gu, '\\$&')).join('.*');
  return new RegExp(`^${escaped}$`, 'u').test('origin');
}

function referencesOriginHeader(value: unknown): boolean {
  if (typeof value === 'string') return caddyHeaderPatternTargetsOrigin(value);
  if (Array.isArray(value)) return value.some(referencesOriginHeader);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, entry]) =>
    caddyHeaderPatternTargetsOrigin(key) || referencesOriginHeader(entry)
  );
}

function inspectAdapted(raw: unknown, plan: EdgePlan): void {
  const root = object(raw, 'ADAPTED_SHAPE');
  const admin = object(root.admin, 'ADAPTED_ADMIN');
  exactKeys(admin, ['listen', 'config'], 'ADAPTED_ADMIN_FIELDS');
  if (admin.listen !== plan.adminAddress || object(admin.config, 'ADAPTED_ADMIN').persist !== false) {
    fail('ADAPTED_ADMIN', 'Adapted Caddy admin configuration is not the exact Unix socket with persistence disabled.');
  }
  if (JSON.stringify(admin).includes(':2019') || /^(?:tcp\/|https?:\/\/)/u.test(String(admin.listen))) {
    fail('ADAPTED_ADMIN_TCP', 'Adapted Caddy configuration retained a TCP admin listener.');
  }
  const apps = object(root.apps, 'ADAPTED_APPS');
  const http = object(apps.http, 'ADAPTED_HTTP');
  if (durationNanoseconds(http.grace_period, 'ADAPTED_GRACE') !== 30_000_000_000) {
    fail('ADAPTED_GRACE', 'Adapted Caddy graceful shutdown period is not 30s.');
  }
  const servers = object(http.servers, 'ADAPTED_SERVERS');
  const serverValues = Object.values(servers).map((entry) => object(entry, 'ADAPTED_SERVER'));
  if (serverValues.length !== 1) fail('ADAPTED_SERVERS', 'Adapted configuration must contain one exact public HTTPS server.');
  for (const server of serverValues) {
    if (
      !Array.isArray(server.listen) || server.listen.length !== 1 || server.listen[0] !== ':443' ||
      !Array.isArray(server.protocols) || server.protocols.join(',') !== 'h1,h2' || server.strict_sni_host !== true
    ) {
      fail('ADAPTED_PROTOCOLS', 'Adapted public listener does not enforce h1/h2 and strict SNI.');
    }
    const automatic = server.automatic_https;
    if (automatic && object(automatic, 'ADAPTED_HTTPS').disable === true) {
      fail('ADAPTED_HTTPS', 'Automatic HTTPS is disabled in adapted configuration.');
    }
  }

  const expectedRoutes = new Map([
    [plan.clientHostname, `127.0.0.1:${CLIENT_PORT}`],
    [plan.serverHostname, `127.0.0.1:${SERVER_PORT}`]
  ]);
  for (const server of serverValues) {
    const routes = Array.isArray(server.routes) ? server.routes : [];
    for (const rawRoute of routes) {
      const route = object(rawRoute, 'ADAPTED_ROUTE');
      const matches = Array.isArray(route.match) ? route.match : [];
      const hosts = matches.flatMap((entry) => {
        const host = object(entry, 'ADAPTED_ROUTE').host;
        return Array.isArray(host) ? host.map(String) : [];
      });
      if (hosts.length !== 1 || !expectedRoutes.has(hosts[0]!)) fail('ADAPTED_ROUTE', 'Adapted route does not bind one approved exact hostname.');
      const routeProxies: Record<string, unknown>[] = [];
      walk(route, (record) => { if (record.handler === 'reverse_proxy') routeProxies.push(record); });
      if (routeProxies.length !== 1) fail('ADAPTED_ROUTE', 'Each approved hostname must bind exactly one reverse proxy.');
      const upstreams = Array.isArray(routeProxies[0]!.upstreams) ? routeProxies[0]!.upstreams : [];
      const dial = upstreams.length === 1 ? object(upstreams[0], 'ADAPTED_ROUTE').dial : undefined;
      if (dial !== expectedRoutes.get(hosts[0]!)) fail('ADAPTED_ROUTE', 'An approved hostname maps to the wrong loopback upstream.');
      expectedRoutes.delete(hosts[0]!);
    }
  }
  if (expectedRoutes.size !== 0) fail('ADAPTED_ROUTE', 'An approved hostname route is missing from adapted configuration.');

  const handlers: string[] = [];
  const proxies: Record<string, unknown>[] = [];
  let originMutation = false;
  walk(http, (record) => {
    if (typeof record.handler === 'string') handlers.push(record.handler);
    if (record.handler === 'reverse_proxy') {
      proxies.push(record);
      if (record.headers !== undefined) {
        const headers = object(record.headers, 'ADAPTED_PROXY_HEADERS');
        if (headers.request !== undefined && referencesOriginHeader(headers.request)) originMutation = true;
      }
    }
    if (record.handler === 'rewrite') fail('ADAPTED_REWRITE', 'Adapted configuration contains a URI rewrite handler.');
    if (record.handler === 'headers') {
      const request = record.request;
      if (JSON.stringify(request ?? {}).toLowerCase().includes('origin')) originMutation = true;
    }
  });
  if (originMutation) {
    fail('ADAPTED_ORIGIN', 'Adapted configuration mutates the upstream Origin header.');
  }
  if (handlers.some((handler) => !['subroute', 'reverse_proxy'].includes(handler))) {
    fail('ADAPTED_HANDLER', 'Adapted configuration contains an unexpected request handler.');
  }
  if (proxies.length !== 2) fail('ADAPTED_PROXY', 'Adapted configuration must contain exactly two reverse proxies.');
  const expectedDials = new Set([`127.0.0.1:${CLIENT_PORT}`, `127.0.0.1:${SERVER_PORT}`]);
  for (const proxy of proxies) {
    const upstreams = Array.isArray(proxy.upstreams) ? proxy.upstreams : [];
    if (upstreams.length !== 1) fail('ADAPTED_UPSTREAM', 'Each reverse proxy must have exactly one upstream.');
    const dial = text(object(upstreams[0], 'ADAPTED_UPSTREAM').dial, 'ADAPTED_UPSTREAM');
    if (!expectedDials.delete(dial)) fail('ADAPTED_UPSTREAM', 'An adapted upstream is not an approved exact loopback endpoint.');
    if (durationNanoseconds(proxy.stream_timeout, 'ADAPTED_STREAM') !== 86_400_000_000_000 ||
        durationNanoseconds(proxy.stream_close_delay, 'ADAPTED_STREAM') !== 300_000_000_000) {
      fail('ADAPTED_STREAM', 'Adapted WebSocket stream and reload bounds are incorrect.');
    }
    const transport = object(proxy.transport, 'ADAPTED_TRANSPORT');
    if (
      transport.protocol !== 'http' || !Array.isArray(transport.versions) || transport.versions.join(',') !== '1.1' ||
      durationNanoseconds(transport.dial_timeout, 'ADAPTED_TRANSPORT') !== 5_000_000_000 ||
      durationNanoseconds(transport.response_header_timeout, 'ADAPTED_TRANSPORT') !== 30_000_000_000 ||
      durationNanoseconds(object(transport.keep_alive, 'ADAPTED_TRANSPORT').idle_timeout, 'ADAPTED_TRANSPORT') !== 120_000_000_000
    ) fail('ADAPTED_TRANSPORT', 'Adapted upstream HTTP transport is outside the bounded contract.');
  }
  if (expectedDials.size !== 0) fail('ADAPTED_UPSTREAM', 'An approved loopback upstream is missing.');

  const logging = object(root.logging, 'ADAPTED_LOGGING');
  const logs = object(logging.logs, 'ADAPTED_LOGGING');
  const defaultLogger = object(logs.default, 'ADAPTED_LOGGING');
  if (!adaptedLogFilterSafe(defaultLogger)) {
    fail('ADAPTED_RUNTIME_LOGGING', 'Adapted runtime/error logging can expose query-bearing or credential fields.');
  }
  const loggerValues = Object.values(logs)
    .map((entry) => object(entry, 'ADAPTED_LOGGING'))
    .filter((logger) => object(logger.writer ?? {}, 'ADAPTED_LOGGING').output === 'file');
  if (loggerValues.length !== 2 || !loggerValues.every(adaptedAccessLogSafe)) {
    fail('ADAPTED_LOGGING', 'Adapted access logs are not URI-safe, credential-safe, and bounded.');
  }
  const serialized = JSON.stringify(raw).toLowerCase();
  if (serialized.includes('tls_insecure_skip_verify') || serialized.includes('h3')) {
    fail('ADAPTED_FORBIDDEN', 'Adapted configuration enables an unreviewed TLS bypass or HTTP/3.');
  }
}

function readInputs(
  envPath: string,
  planPath: string,
  releasePath: string,
  templatePath: string,
  systemdDropInPath: string,
  mode: Mode
): { env: Record<string, string>; plan: EdgePlan; release: ValidationRelease; template: string; systemdDropIn: string } {
  let rawPlan: unknown;
  let rawRelease: unknown;
  try {
    rawPlan = JSON.parse(readBounded(planPath)) as unknown;
    rawRelease = JSON.parse(readBounded(releasePath)) as unknown;
  } catch (error) {
    if (error instanceof EdgeValidationError) throw error;
    fail('INPUT_JSON', 'An edge JSON input is malformed.');
  }
  const env = parseEnv(readBounded(envPath));
  const template = readBounded(templatePath);
  const systemdDropIn = readBounded(systemdDropInPath);
  const release = validateRelease(rawRelease);
  const plan = validatePlan(env, rawPlan, mode, release, template, systemdDropIn);
  return { env, plan, release, template, systemdDropIn };
}

function fixture(mode: Mode): { env: Record<string, string>; plan: EdgePlan; release: ValidationRelease; template: string; systemdDropIn: string } {
  const base = readInputs(DEFAULT_ENV, DEFAULT_PLAN, DEFAULT_RELEASE, DEFAULT_TEMPLATE, DEFAULT_SYSTEMD_DROPIN, 'template');
  const result = {
    env: { ...base.env },
    plan: structuredClone(base.plan),
    release: structuredClone(base.release),
    template: base.template,
    systemdDropIn: base.systemdDropIn
  };
  if (mode !== 'template') {
    result.plan.clientHostname = 'arena.ops002-review.test';
    result.env.BURNINGSPACE_PUBLIC_CLIENT_HOSTNAME = result.plan.clientHostname;
    result.plan.serverHostname = 'arena-api.ops002-review.test';
    result.env.BURNINGSPACE_PUBLIC_SERVER_HOSTNAME = result.plan.serverHostname;
    result.plan.edgeConfigId = 'ops002-edge-review-v2';
    result.env.BURNINGSPACE_EDGE_CONFIG_ID = result.plan.edgeConfigId;
    result.plan.previousEdgeConfigId = 'ops002-edge-review-v1';
    result.env.BURNINGSPACE_PREVIOUS_EDGE_CONFIG_ID = result.plan.previousEdgeConfigId;
    result.plan.deploymentGoReference = 'PHASE-A-NOT-AUTHORIZED';
    result.env.BURNINGSPACE_DEPLOYMENT_GO_REFERENCE = result.plan.deploymentGoReference;
  }
  if (mode === 'phase-b') {
    result.plan.hostInstallationAuthorized = true;
    result.plan.dnsConfigured = true;
    result.plan.tlsReady = true;
    result.plan.externalExecutionAuthorized = true;
    result.plan.deploymentGoReference = 'PA-GO-OPS002-EDGE-REVIEW';
    result.env.BURNINGSPACE_DEPLOYMENT_GO_REFERENCE = result.plan.deploymentGoReference;
  }
  return result;
}

function applyBootstrapRollback(value: ReturnType<typeof fixture>): void {
  value.plan.rollbackMode = 'bootstrap-no-previous-release';
  value.env.BURNINGSPACE_ROLLBACK_MODE = value.plan.rollbackMode;
  delete value.plan.previousEdgeConfigId;
  delete value.env.BURNINGSPACE_PREVIOUS_EDGE_CONFIG_ID;
}

function expectFailure(
  name: string,
  code: string,
  mutate: (value: ReturnType<typeof fixture>) => void,
  mode: Mode = 'template'
): void {
  const value = fixture(mode);
  mutate(value);
  try {
    validateRelease(value.release);
    validatePlan(value.env, value.plan, mode, value.release, value.template, value.systemdDropIn);
  } catch (error) {
    if (error instanceof EdgeValidationError && error.code === code) return;
    fail('SELF_TEST', `Self-test ${name} returned an unexpected safe failure.`);
  }
  fail('SELF_TEST', `Self-test ${name} did not fail closed.`);
}

function runSelfTests(): number {
  let tests = 0;
  const pass = (operation: () => void): void => { operation(); tests += 1; };
  const passNamed = (_name: string, operation: () => void): void => pass(operation);
  const reject = (...args: Parameters<typeof expectFailure>): void => { expectFailure(...args); tests += 1; };
  passNamed('valid-unix-admin-fixture', () => { const f = fixture('template'); validatePlan(f.env, f.plan, 'template', f.release, f.template, f.systemdDropIn); });
  pass(() => { const f = fixture('phase-a'); validatePlan(f.env, f.plan, 'phase-a', f.release, f.template, f.systemdDropIn); });
  pass(() => { const f = fixture('phase-b'); validatePlan(f.env, f.plan, 'phase-b', f.release, f.template, f.systemdDropIn); });
  passNamed('valid-bootstrap-without-previous-edge', () => {
    const f = fixture('phase-b');
    applyBootstrapRollback(f);
    validatePlan(f.env, f.plan, 'phase-b', f.release, f.template, f.systemdDropIn);
  });
  reject('bootstrap-previous-edge-plan', 'PLAN_FIELDS', (f) => {
    applyBootstrapRollback(f);
    f.plan.previousEdgeConfigId = 'fictional-previous-edge';
  }, 'phase-b');
  reject('bootstrap-previous-edge-env', 'ENV_FIELDS', (f) => {
    applyBootstrapRollback(f);
    f.env.BURNINGSPACE_PREVIOUS_EDGE_CONFIG_ID = 'fictional-previous-edge';
  }, 'phase-b');
  reject('previous-release-missing-previous-edge', 'PLAN_FIELDS', (f) => {
    delete f.plan.previousEdgeConfigId;
  });
  reject('unknown-rollback-mode', 'ROLLBACK_MODE', (f) => {
    (f.plan as unknown as Record<string, unknown>).rollbackMode = 'unsupported-rollback-mode';
  });
  reject('strict-mode-does-not-infer-edge-bootstrap', 'ENV_FIELDS', (f) => {
    delete f.plan.previousEdgeConfigId;
    delete f.env.BURNINGSPACE_PREVIOUS_EDGE_CONFIG_ID;
  }, 'phase-b');
  reject('same-hostname', 'HOSTNAME_EQUAL', (f) => { f.plan.serverHostname = f.plan.clientHostname; f.env.BURNINGSPACE_PUBLIC_SERVER_HOSTNAME = f.plan.serverHostname; });
  reject('wildcard-hostname', 'CLIENT_HOSTNAME', (f) => { f.plan.clientHostname = '*.example.invalid'; f.env.BURNINGSPACE_PUBLIC_CLIENT_HOSTNAME = f.plan.clientHostname; });
  reject('ip-hostname', 'CLIENT_HOSTNAME', (f) => { f.plan.clientHostname = '192.0.2.1'; f.env.BURNINGSPACE_PUBLIC_CLIENT_HOSTNAME = f.plan.clientHostname; });
  reject('hostname-path', 'CLIENT_HOSTNAME', (f) => { f.plan.clientHostname = 'arena.example.invalid/play'; f.env.BURNINGSPACE_PUBLIC_CLIENT_HOSTNAME = f.plan.clientHostname; });
  reject('hostname-query', 'SERVER_HOSTNAME', (f) => { f.plan.serverHostname += '?debug=1'; f.env.BURNINGSPACE_PUBLIC_SERVER_HOSTNAME = f.plan.serverHostname; });
  reject('client-upstream', 'UPSTREAM_HOST', (f) => { f.plan.clientUpstreamHost = '0.0.0.0'; });
  reject('server-upstream', 'UPSTREAM_HOST', (f) => { f.plan.serverUpstreamHost = 'localhost'; });
  reject('client-port', 'CLIENT_PORT', (f) => { f.plan.clientUpstreamPort = 8080; });
  reject('server-port', 'SERVER_PORT', (f) => { f.plan.serverUpstreamPort = 8080; });
  reject('old-tcp-admin', 'ADMIN_ADDRESS', (f) => { f.plan.adminAddress = '127.0.0.1:2019'; f.env.BURNINGSPACE_CADDY_ADMIN_ADDRESS = f.plan.adminAddress; });
  reject('localhost-tcp-admin', 'ADMIN_ADDRESS', (f) => { f.plan.adminAddress = 'localhost:2019'; f.env.BURNINGSPACE_CADDY_ADMIN_ADDRESS = f.plan.adminAddress; });
  reject('wildcard-tcp-admin', 'ADMIN_ADDRESS', (f) => { f.plan.adminAddress = '0.0.0.0:2019'; f.env.BURNINGSPACE_CADDY_ADMIN_ADDRESS = f.plan.adminAddress; });
  reject('public-tcp-admin', 'ADMIN_ADDRESS', (f) => { f.plan.adminAddress = '192.0.2.10:2019'; f.env.BURNINGSPACE_CADDY_ADMIN_ADDRESS = f.plan.adminAddress; });
  reject('relative-admin-socket', 'ADMIN_SOCKET_PATH', (f) => { f.plan.adminAddress = 'unix/burningspace-admin.sock'; f.env.BURNINGSPACE_CADDY_ADMIN_ADDRESS = f.plan.adminAddress; });
  reject('outside-runtime-admin-socket', 'ADMIN_SOCKET_DIRECTORY', (f) => { f.plan.adminAddress = 'unix//tmp/burningspace-admin.sock'; f.env.BURNINGSPACE_CADDY_ADMIN_ADDRESS = f.plan.adminAddress; });
  reject('traversal-admin-socket', 'ADMIN_SOCKET_PATH', (f) => { f.plan.adminAddress = 'unix//run/caddy/../burningspace-admin.sock'; f.env.BURNINGSPACE_CADDY_ADMIN_ADDRESS = f.plan.adminAddress; });
  reject('missing-admin-socket-path', 'ADMIN_SOCKET_PATH', (f) => { f.plan.adminAddress = 'unix/'; f.env.BURNINGSPACE_CADDY_ADMIN_ADDRESS = f.plan.adminAddress; });
  reject('missing-runtime-directory', 'ADMIN_SOCKET_DIRECTORY', (f) => { f.plan.adminSocketDirectory = ''; });
  reject('runtime-directory-mode-0755', 'ADMIN_SOCKET_MODE', (f) => { f.plan.adminSocketDirectoryMode = '0755'; });
  reject('runtime-directory-mode-0777', 'ADMIN_SOCKET_MODE', (f) => { f.plan.adminSocketDirectoryMode = '0777'; });
  reject('service-umask-0022', 'ADMIN_UMASK', (f) => { f.plan.adminServiceUmask = '0022'; });
  reject('tcp-listener-enabled', 'ADMIN_TCP', (f) => { f.plan.adminTcpListenerAllowed = true; });
  reject('persist-config-enabled', 'TEMPLATE_CONTRACT', (f) => { f.template = f.template.replace('persist_config off', 'persist_config on'); });
  reject('reload-address-mismatch', 'SYSTEMD_DROPIN', (f) => { f.systemdDropIn = f.systemdDropIn.replace(ADMIN_ADDRESS, 'unix//run/caddy/other.sock'); });
  reject('admin-disabled', 'TEMPLATE_PLACEHOLDER', (f) => { f.template = f.template.replace('admin {$BURNINGSPACE_CADDY_ADMIN_ADDRESS}', 'admin off'); });
  passNamed('valid-systemd-drop-in', () => { validateSystemdDropIn(fixture('template').systemdDropIn); });
  reject('malformed-systemd-drop-in', 'SYSTEMD_DROPIN', (f) => { f.systemdDropIn = f.systemdDropIn.replace('RuntimeDirectoryMode=0700', 'RuntimeDirectoryMode=0700x'); });
  passNamed('admin-output-canary', () => {
    const seeded = 'ops002-admin-canary-never-print';
    const f = fixture('template');
    f.plan.adminAddress = `unix//run/caddy/${seeded}.sock`;
    f.env.BURNINGSPACE_CADDY_ADMIN_ADDRESS = f.plan.adminAddress;
    let output = '';
    try { validatePlan(f.env, f.plan, 'template', f.release, f.template, f.systemdDropIn); }
    catch (error) { output = JSON.stringify(safeError(error)); }
    if (!output || output.includes(seeded) || output.length > 800) {
      fail('SELF_TEST', 'Sanitized admin-socket failure exposed seeded material or exceeded its bound.');
    }
  });
  reject('http3', 'PUBLIC_PROTOCOLS', (f) => { f.plan.publicProtocols.push('h3'); });
  reject('automatic-https', 'AUTOMATIC_HTTPS', (f) => { f.plan.automaticHttps = false; });
  reject('origin-rewrite', 'ORIGIN_MUTATION', (f) => { f.template += '\nheader_up Origin https://arena.example.invalid\n'; });
  reject('origin-synthesis', 'ORIGIN_MUTATION', (f) => { f.template += '\nheader_up Origin {http.request.host}\n'; });
  reject('origin-delete', 'ORIGIN_MUTATION', (f) => { f.template += '\nheader_up -Origin\n'; });
  reject('origin-add', 'ORIGIN_MUTATION', (f) => { f.template += '\nheader_up +Origin https://arena.example.invalid\n'; });
  reject('origin-delete-all', 'ORIGIN_MUTATION', (f) => { f.template += '\nheader_up -*\n'; });
  reject('origin-delete-prefix-wildcard', 'ORIGIN_MUTATION', (f) => { f.template += '\nheader_up -Ori*\n'; });
  reject('origin-delete-suffix-wildcard', 'ORIGIN_MUTATION', (f) => { f.template += '\nheader_up -*gin\n'; });
  reject('origin-delete-substring-wildcard', 'ORIGIN_MUTATION', (f) => { f.template += '\nheader_up -*rig*\n'; });
  reject('uri-rewrite', 'URI_REWRITE', (f) => { f.template += '\nrewrite * /rewritten\n'; });
  reject('websocket-disabled', 'WEBSOCKET', (f) => { f.plan.webSocketEnabled = false; });
  reject('missing-stream-timeout', 'TEMPLATE_PLACEHOLDER', (f) => { f.template = f.template.replaceAll('stream_timeout {$BURNINGSPACE_CADDY_STREAM_TIMEOUT}', ''); });
  reject('unbounded-stream-timeout', 'STREAM_TIMEOUT', (f) => { f.plan.streamTimeout = '0s'; });
  reject('missing-close-delay', 'TEMPLATE_PLACEHOLDER', (f) => { f.template = f.template.replaceAll('stream_close_delay {$BURNINGSPACE_CADDY_STREAM_CLOSE_DELAY}', ''); });
  reject('log-uri-exposure', 'TEMPLATE_CONTRACT', (f) => { f.template = f.template.replaceAll('request>uri delete', ''); });
  reject('authorization-log', 'TEMPLATE_CONTRACT', (f) => { f.template = f.template.replaceAll('request>headers>Authorization delete', ''); });
  reject('cookie-log', 'TEMPLATE_CONTRACT', (f) => { f.template = f.template.replaceAll('request>headers>Cookie delete', ''); });
  reject('missing-log-rotation', 'TEMPLATE_CONTRACT', (f) => { f.template = f.template.replaceAll('roll_keep 3', ''); });
  reject('mutable-artifact', 'RELEASE_BINDING', (f) => { f.release.artifactUrl = 'https://example.invalid/caddy:latest'; });
  reject('artifact-plan-mismatch', 'CADDY_ARTIFACT', (f) => { f.plan.caddyValidationArtifact = 'caddy:latest'; });
  reject('version-mismatch', 'RELEASE_BINDING', (f) => { f.release.version = '2.11.3'; });
  reject('phase-a-install', 'PHASE_A_AUTHORIZATION', (f) => { f.plan.hostInstallationAuthorized = true; }, 'phase-a');
  reject('phase-b-go', 'GO_REQUIRED', (f) => { f.plan.deploymentGoReference = 'NOT-AUTHORIZED'; f.env.BURNINGSPACE_DEPLOYMENT_GO_REFERENCE = 'NOT-AUTHORIZED'; }, 'phase-b');
  reject('public-production', 'PUBLIC_PRODUCTION', (f) => { f.plan.publicProductionLaunchAuthorized = true; });
  reject('equal-configs', 'EDGE_CONFIG_EQUAL', (f) => { f.plan.previousEdgeConfigId = f.plan.edgeConfigId; f.env.BURNINGSPACE_PREVIOUS_EDGE_CONFIG_ID = f.plan.edgeConfigId; });
  pass(() => {
    const seeded = 'ops002-seeded-token-never-print';
    const f = fixture('template');
    f.env.UNEXPECTED_TOKEN = seeded;
    let output = '';
    try { validatePlan(f.env, f.plan, 'template', f.release, f.template, f.systemdDropIn); } catch (error) { output = JSON.stringify(safeError(error)); }
    if (output.includes(seeded) || output.length > 800) fail('SELF_TEST', 'Sanitized output exposed seeded material or exceeded its bound.');
  });
  return tests;
}

function argument(args: string[], name: string, fallback?: string): string {
  const index = args.indexOf(name);
  if (index < 0) {
    if (fallback !== undefined) return fallback;
    fail('ARGUMENT', 'A required path argument is missing.');
  }
  if (!args[index + 1]) fail('ARGUMENT', 'A required path argument has no value.');
  return args[index + 1]!;
}

function safeError(error: unknown): { code: string; message: string } {
  if (error instanceof EdgeValidationError) return { code: error.code, message: error.message.slice(0, 300) };
  return { code: 'UNEXPECTED', message: 'Unexpected bounded edge-preflight failure.' };
}

function main(): void {
  const args = process.argv.slice(2);
  const startedAt = Date.now();
  if (args.includes('--self-test')) {
    const tests = runSelfTests();
    console.log(JSON.stringify({ ok: true, event: 'external_staging_edge_preflight_self_tested', tests, outputRedacted: true, durationMs: Date.now() - startedAt }));
    return;
  }
  const selected = (['template', 'phase-a', 'phase-b', 'render', 'inspect-adapted-config'] as const)
    .filter((mode) => args.includes(`--${mode}`));
  if (selected.length !== 1) fail('MODE', 'Select exactly one edge-preflight mode.');
  const operation = selected[0]!;
  const mode: Mode = operation === 'phase-b' ? 'phase-b' : operation === 'phase-a' ? 'phase-a' : 'template';
  const inputs = readInputs(
    argument(args, '--env', DEFAULT_ENV),
    argument(args, '--plan', DEFAULT_PLAN),
    argument(args, '--release', DEFAULT_RELEASE),
    argument(args, '--caddyfile', DEFAULT_TEMPLATE),
    argument(args, '--systemd-drop-in', DEFAULT_SYSTEMD_DROPIN),
    mode
  );
  if (operation === 'render') {
    const output = resolve(argument(args, '--output'));
    const parent = realpathSync(dirname(output));
    if (statSync(parent).isDirectory() === false || !isTemporaryPath(output)) {
      fail('OUTPUT_PATH', 'Rendered output must remain inside an approved temporary directory.');
    }
    const renderEnv = { ...inputs.env };
    if (args.includes('--log-directory')) {
      const logDirectory = realpathSync(resolve(argument(args, '--log-directory')));
      if (!statSync(logDirectory).isDirectory() || !isTemporaryPath(logDirectory)) {
        fail('LOG_DIRECTORY_OVERRIDE', 'Validation log override must be an existing temporary directory.');
      }
      renderEnv.BURNINGSPACE_CADDY_LOG_DIRECTORY = logDirectory.replaceAll('\\', '/');
    }
    writeFileSync(output, render(inputs.template, renderEnv), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  }
  if (operation === 'inspect-adapted-config') {
    let adapted: unknown;
    try {
      const adaptedPath = realpathSync(resolve(argument(args, '--adapted-config')));
      if (!isTemporaryPath(adaptedPath) || statSync(adaptedPath).size > MAX_INPUT_BYTES) fail('ADAPTED_READ', 'Adapted Caddy JSON is not a bounded temporary file.');
      adapted = JSON.parse(readFileSync(adaptedPath, 'utf8')) as unknown;
    }
    catch { fail('ADAPTED_READ', 'Adapted Caddy JSON could not be read or parsed.'); }
    inspectAdapted(adapted, inputs.plan);
  }
  console.log(JSON.stringify({
    ok: true,
    event: 'external_staging_edge_preflight_completed',
    mode: operation,
    environmentId: ENVIRONMENT_ID,
    caddyVersion: EXPECTED_VERSION,
    artifactSha256: EXPECTED_SHA256,
    externalExecutionAuthorized: mode === 'phase-b',
    publicProductionLaunchAuthorized: false,
    renderedConfigPrinted: false,
    durationMs: Date.now() - startedAt
  }));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ ok: false, event: 'external_staging_edge_preflight_failed', error: safeError(error) }));
  process.exitCode = 1;
}
