import { readFileSync, realpathSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

type Mode = 'template' | 'phase-a' | 'phase-b';
type RollbackMode = 'previous-approved-release' | 'bootstrap-no-previous-release';

interface DeploymentPlan {
  schemaVersion: number;
  environmentId: string;
  environmentClass: string;
  alphaNonPersistent: boolean;
  publicClientOrigin: string;
  publicServerOrigin: string;
  allowedOrigins: string[];
  serverBindHost: string;
  serverBindPort: number;
  clientBindHost: string;
  clientBindPort: number;
  targetServerImage: string;
  targetClientImage: string;
  previousServerImage?: string;
  previousClientImage?: string;
  previousApprovedCommit?: string;
  targetCommit: string;
  edgeConfigId: string;
  rollbackMode: RollbackMode;
  deploymentGoReference: string;
  externalExecutionAuthorized: boolean;
  publicProductionLaunchAuthorized: boolean;
}

interface ValidationOptions {
  mode: Mode;
  checkRepository?: (previous: string | undefined, target: string, mode: Mode) => void;
  composeModel?: unknown;
}

interface GitResult { status: number | null; stdout: string; }
type GitRunner = (args: string[]) => GitResult;

class SafeValidationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'SafeValidationError';
  }
}

const ENV_KEYS = new Set([
  'NODE_ENV',
  'BURNINGSPACE_EXTERNAL_ENVIRONMENT_ID',
  'BURNINGSPACE_PUBLIC_CLIENT_ORIGIN',
  'BURNINGSPACE_PUBLIC_SERVER_ORIGIN',
  'BURNINGSPACE_ALLOWED_ORIGINS',
  'VITE_BURNINGSPACE_SERVER_URL',
  'BURNINGSPACE_SERVER_IMAGE',
  'BURNINGSPACE_CLIENT_IMAGE',
  'BURNINGSPACE_PREVIOUS_SERVER_IMAGE',
  'BURNINGSPACE_PREVIOUS_CLIENT_IMAGE',
  'BURNINGSPACE_SERVER_BIND_PORT',
  'BURNINGSPACE_CLIENT_BIND_PORT',
  'BURNINGSPACE_RECONNECT_GRACE_SECONDS',
  'BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS',
  'BURNINGSPACE_PROFILE_RATE_BURST',
  'BURNINGSPACE_PROFILE_RATE_PER_SECOND',
  'BURNINGSPACE_INPUT_RATE_BURST',
  'BURNINGSPACE_INPUT_RATE_PER_SECOND',
  'BURNINGSPACE_EXTERNAL_SMOKE_HOSTILE_ORIGIN',
  'BURNINGSPACE_PREVIOUS_APPROVED_COMMIT',
  'BURNINGSPACE_TARGET_COMMIT',
  'BURNINGSPACE_EDGE_CONFIG_ID',
  'BURNINGSPACE_DEPLOYMENT_GO_REFERENCE',
  'BURNINGSPACE_EXTERNAL_EXECUTION_AUTHORIZED',
  'BURNINGSPACE_PUBLIC_PRODUCTION_LAUNCH_AUTHORIZED'
]);

const PLAN_KEYS = new Set([
  'schemaVersion', 'environmentId', 'environmentClass', 'alphaNonPersistent',
  'publicClientOrigin', 'publicServerOrigin', 'allowedOrigins', 'serverBindHost',
  'serverBindPort', 'clientBindHost', 'clientBindPort', 'targetServerImage',
  'targetClientImage', 'previousServerImage', 'previousClientImage',
  'previousApprovedCommit', 'targetCommit', 'edgeConfigId', 'rollbackMode', 'deploymentGoReference',
  'externalExecutionAuthorized', 'publicProductionLaunchAuthorized'
]);

const PLACEHOLDER_COMMITS = new Set([
  '0000000000000000000000000000000000000000',
  '1111111111111111111111111111111111111111',
  '2222222222222222222222222222222222222222'
]);

const PLACEHOLDER_IMAGE_DIGESTS = new Set(['1', '2', '3', '4'].map((value) => value.repeat(64)));
const PREVIOUS_PLAN_KEYS = ['previousServerImage', 'previousClientImage', 'previousApprovedCommit'] as const;
const PREVIOUS_ENV_KEYS = [
  'BURNINGSPACE_PREVIOUS_SERVER_IMAGE',
  'BURNINGSPACE_PREVIOUS_CLIENT_IMAGE',
  'BURNINGSPACE_PREVIOUS_APPROVED_COMMIT'
] as const;
const SERVER_CPUS = 1;
const SERVER_MEMORY_BYTES = 1024 ** 3;
const CLIENT_CPUS = 0.25;
const CLIENT_MEMORY_BYTES = 256 * 1024 ** 2;
const LOG_MAX_SIZE = '10m';
const LOG_MAX_FILE = '3';

function fail(code: string, message: string): never {
  throw new SafeValidationError(code, message);
}

function parseEnvFile(contents: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals < 1) fail('ENV_SYNTAX', 'Environment template contains an invalid assignment.');
    const key = line.slice(0, equals).trim();
    if (!/^[A-Z][A-Z0-9_]*$/u.test(key) || Object.hasOwn(parsed, key)) {
      fail('ENV_KEY', 'Environment template contains an invalid or duplicate key.');
    }
    parsed[key] = line.slice(equals + 1).trim();
  }

  return parsed;
}

function requireString(value: unknown, code: string): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 300) {
    fail(code, 'A required bounded text field is missing or invalid.');
  }
  return value.trim();
}

function parseBoolean(value: string | undefined, code: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  fail(code, 'An authorization flag must be exactly true or false.');
}

function parsePort(value: string | number | undefined, code: string): number {
  const port = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    fail(code, 'A bind port must be an integer from 1 through 65535.');
  }
  return port;
}

function parseBoundedNumber(value: string | undefined, minimum: number, maximum: number, code: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    fail(code, 'A required runtime limit is outside its bounded range.');
  }
  return parsed;
}

function normalizeOrigin(value: unknown, code: string): string {
  const candidate = requireString(value, code);
  if (/\s|[\\\u0000-\u001f\u007f]/u.test(candidate) || !/^https?:\/\//iu.test(candidate)) {
    fail(code, 'A public origin is not an exact HTTP or HTTPS origin.');
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    fail(code, 'A public origin is malformed.');
  }

  if (
    url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
    (url.protocol !== 'http:' && url.protocol !== 'https:') || candidate.endsWith('/')
  ) {
    fail(code, 'A public origin contains credentials, a path, query, or fragment.');
  }

  const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]';
  if (!loopback && url.protocol !== 'https:') {
    fail(code, 'A non-loopback public origin must use HTTPS.');
  }
  return url.origin;
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]';
}

function assertSafeInventory(env: Record<string, string>, planObject: Record<string, unknown>): void {
  for (const key of Object.keys(env)) {
    if (!ENV_KEYS.has(key)) fail('UNEXPECTED_ENV_KEY', 'Environment inventory contains an unexpected key.');
  }
  for (const key of Object.keys(planObject)) {
    if (!PLAN_KEYS.has(key)) fail('UNEXPECTED_PLAN_KEY', 'Deployment plan contains an unexpected key.');
  }

  const values: unknown[] = [...Object.values(env), ...Object.values(planObject)];
  for (const value of values.flatMap((entry) => Array.isArray(entry) ? entry : [entry])) {
    if (typeof value !== 'string') continue;
    if (
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/u.test(value) ||
      /\b(?:ghp_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9_-]{8,}\b/u.test(value) ||
      /\bsk-[A-Za-z0-9_-]{12,}\b/u.test(value)
    ) {
      fail('SECRET_VALUE', 'Inventory contains a private-key or credential-shaped value.');
    }
  }
}

function assertCommit(value: unknown, mode: Mode, code: string): string {
  const commit = requireString(value, code);
  if (!/^[0-9a-f]{40}$/u.test(commit)) fail(code, 'Commit binding must be a full lowercase SHA-1.');
  if (mode !== 'template' && PLACEHOLDER_COMMITS.has(commit)) {
    fail(code, 'Real preparation modes reject placeholder commit bindings.');
  }
  return commit;
}

function assertImmutableImage(value: unknown, mode: Mode, code: string): string {
  const image = requireString(value, code);
  const match = /^(?<repository>[a-z0-9][a-z0-9._:/-]*)@sha256:(?<digest>[0-9a-f]{64})$/u.exec(image);
  if (!match?.groups) {
    fail(code, 'Image binding must be an immutable repository@sha256:<64 lowercase hex> reference.');
  }
  const repository = match.groups.repository;
  const digest = match.groups.digest;
  if (!repository || !digest) fail(code, 'Image binding is missing a repository or digest.');
  const imageName = repository.slice(repository.lastIndexOf('/') + 1);
  if (imageName.includes(':')) fail(code, 'Image binding must not include a mutable tag alongside its digest.');
  if (
    mode !== 'template' &&
    (repository.includes('.example.invalid') || PLACEHOLDER_IMAGE_DIGESTS.has(digest))
  ) {
    fail('PLACEHOLDER_IMAGE', 'Real preparation modes reject placeholder image bindings.');
  }
  return image;
}

function requireObject(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(code, 'A required Compose object is missing or invalid.');
  }
  return value as Record<string, unknown>;
}

function serviceNetworks(service: Record<string, unknown>): string[] {
  const networks = service.networks;
  if (Array.isArray(networks)) return networks.map(String);
  if (networks && typeof networks === 'object') return Object.keys(networks as Record<string, unknown>);
  return [];
}

function validateServiceVolumes(service: Record<string, unknown>): void {
  if (service.volumes !== undefined && !Array.isArray(service.volumes)) {
    fail('COMPOSE_VOLUME', 'Service volumes must be a bounded list.');
  }
  if (Array.isArray(service.volumes) && service.volumes.length > 0) {
    fail('COMPOSE_VOLUME', 'Real shared-host staging services must not mount host paths or persistent volumes.');
  }
}

function validateComposeService(
  name: 'server' | 'client',
  service: Record<string, unknown>,
  plan: DeploymentPlan
): void {
  if (Object.hasOwn(service, 'build')) fail('COMPOSE_SOURCE_BUILD', 'Real staging Compose must not contain a source build.');
  if (service.privileged === true) fail('COMPOSE_PRIVILEGED', 'Privileged Compose services are forbidden.');
  if (service.network_mode === 'host') fail('COMPOSE_HOST_NETWORK', 'Host networking is forbidden.');
  if (service.container_name !== undefined) fail('COMPOSE_PROJECT', 'Fixed global container names are forbidden.');
  if (service.read_only !== true) fail('COMPOSE_READ_ONLY', 'Every service must retain a read-only root filesystem.');
  if (!Array.isArray(service.tmpfs) || !service.tmpfs.some((entry) => String(entry).startsWith('/tmp'))) {
    fail('COMPOSE_TMPFS', 'Every service must retain its /tmp tmpfs.');
  }
  validateServiceVolumes(service);

  const expectedImage = name === 'server' ? plan.targetServerImage : plan.targetClientImage;
  if (service.image !== expectedImage) fail('COMPOSE_IMAGE', 'Rendered service image does not match the approved target image.');

  const expectedCpus = name === 'server' ? SERVER_CPUS : CLIENT_CPUS;
  if (Number(service.cpus) !== expectedCpus) fail('COMPOSE_CPU', 'A required service CPU limit is missing or incorrect.');
  const expectedMemory = name === 'server' ? SERVER_MEMORY_BYTES : CLIENT_MEMORY_BYTES;
  if (Number(service.mem_limit) !== expectedMemory) fail('COMPOSE_MEMORY', 'A required service memory limit is missing or incorrect.');

  const logging = requireObject(service.logging, 'COMPOSE_LOGGING');
  const options = requireObject(logging.options, 'COMPOSE_LOGGING');
  if (logging.driver !== 'json-file') fail('COMPOSE_LOG_DRIVER', 'The bounded json-file logging driver is required.');
  if (options['max-size'] !== LOG_MAX_SIZE) fail('COMPOSE_LOG_MAX_SIZE', 'The required Docker log max-size is missing.');
  if (String(options['max-file']) !== LOG_MAX_FILE) fail('COMPOSE_LOG_MAX_FILE', 'The required Docker log max-file is missing.');

  const networks = serviceNetworks(service);
  if (networks.length !== 1 || networks[0] !== 'burningspace') {
    fail('COMPOSE_NETWORK', 'Each service must use only the project-scoped BurningSpace network.');
  }

  const ports = Array.isArray(service.ports) ? service.ports : [];
  if (ports.length !== 1) fail('COMPOSE_PORT', 'Each service must publish exactly one loopback port.');
  const port = requireObject(ports[0], 'COMPOSE_PORT');
  const expectedPublished = name === 'server' ? plan.serverBindPort : plan.clientBindPort;
  const expectedTarget = name === 'server' ? 2567 : 8080;
  if (
    port.host_ip !== '127.0.0.1' || Number(port.published) !== expectedPublished ||
    Number(port.target) !== expectedTarget
  ) {
    fail('COMPOSE_PORT', 'Service publication must match the exact approved loopback binding.');
  }
}

function validateComposeModel(rawModel: unknown, plan: DeploymentPlan): void {
  const model = requireObject(rawModel, 'COMPOSE_MODEL');
  if (model.name !== 'burningspace-staging') fail('COMPOSE_PROJECT', 'Unexpected Compose project name.');
  const services = requireObject(model.services, 'COMPOSE_SERVICES');
  const serviceNames = Object.keys(services).sort();
  if (serviceNames.length !== 2 || serviceNames[0] !== 'client' || serviceNames[1] !== 'server') {
    fail('COMPOSE_SERVICES', 'Exactly the server and client Compose services are required.');
  }
  const networks = requireObject(model.networks, 'COMPOSE_NETWORK');
  if (Object.keys(networks).length !== 1 || !Object.hasOwn(networks, 'burningspace')) {
    fail('COMPOSE_NETWORK', 'Exactly one explicit project-scoped network is required.');
  }
  const network = requireObject(networks.burningspace, 'COMPOSE_NETWORK');
  if (
    network.external === true || network.name !== 'burningspace-staging_burningspace' ||
    (network.driver !== undefined && network.driver !== 'bridge')
  ) {
    fail('COMPOSE_EXTERNAL_NETWORK', 'The staging network must be a non-external bridge network.');
  }
  if (model.volumes && Object.keys(requireObject(model.volumes, 'COMPOSE_VOLUME')).length > 0) {
    fail('COMPOSE_VOLUME', 'Named volumes are forbidden.');
  }
  validateComposeService('server', requireObject(services.server, 'COMPOSE_SERVICES'), plan);
  validateComposeService('client', requireObject(services.client, 'COMPOSE_SERVICES'), plan);
}

function runGit(args: string[]): GitResult {
  const result = spawnSync('git', args, { cwd: resolve('.'), encoding: 'utf8', windowsHide: true });
  return { status: result.status, stdout: result.stdout };
}

function repositoryCheck(previous: string | undefined, target: string, mode: Mode, git: GitRunner = runGit): void {
  const commits = previous === undefined ? [target] : [previous, target];
  for (const commit of commits) {
    const exists = git(['cat-file', '-e', `${commit}^{commit}`]);
    if (exists.status !== 0) fail('COMMIT_NOT_LOCAL', 'A bound commit does not exist in the local repository.');
    const reachable = git(['branch', '--all', '--contains', commit]);
    if (reachable.status !== 0 || reachable.stdout.trim().length === 0) {
      fail('COMMIT_NOT_REACHABLE', 'A bound commit is not reachable from repository history.');
    }
  }

  if (mode === 'phase-b') {
    const checkedOut = git(['rev-parse', 'HEAD']);
    if (checkedOut.status !== 0 || checkedOut.stdout.trim() !== target) {
      fail('TARGET_NOT_CHECKED_OUT', 'Phase B target must equal the exact checked-out commit.');
    }
    for (const commit of commits) {
      if (git(['merge-base', '--is-ancestor', commit, 'origin/main']).status !== 0) {
        fail('TARGET_NOT_APPROVED', 'Phase B commits must be reachable from trusted origin/main history.');
      }
    }
  }
}

function validate(env: Record<string, string>, rawPlan: unknown, options: ValidationOptions): void {
  if (!rawPlan || typeof rawPlan !== 'object' || Array.isArray(rawPlan)) {
    fail('PLAN_SHAPE', 'Deployment plan must be one JSON object.');
  }
  const planObject = rawPlan as Record<string, unknown>;
  assertSafeInventory(env, planObject);
  const rollbackMode = requireString(planObject.rollbackMode, 'ROLLBACK_MODE');
  if (rollbackMode !== 'previous-approved-release' && rollbackMode !== 'bootstrap-no-previous-release') {
    fail('ROLLBACK_MODE', 'Rollback mode is unsupported.');
  }
  for (const key of PLAN_KEYS) {
    if (rollbackMode === 'bootstrap-no-previous-release' && PREVIOUS_PLAN_KEYS.includes(key as typeof PREVIOUS_PLAN_KEYS[number])) {
      continue;
    }
    if (!Object.hasOwn(planObject, key)) fail('PLAN_FIELD', 'Deployment plan is missing a required field.');
  }
  if (rollbackMode === 'bootstrap-no-previous-release') {
    if (PREVIOUS_PLAN_KEYS.some((key) => Object.hasOwn(planObject, key)) ||
        PREVIOUS_ENV_KEYS.some((key) => Object.hasOwn(env, key))) {
      fail('BOOTSTRAP_PREVIOUS_ARTIFACT', 'Bootstrap rollback requires previous release artifacts to be structurally absent.');
    }
  }
  const plan = planObject as unknown as DeploymentPlan;

  if (env.NODE_ENV !== 'production') fail('NODE_ENV', 'NODE_ENV must be production.');
  if (plan.schemaVersion !== 2) fail('SCHEMA_VERSION', 'Unsupported deployment plan schema version.');
  if (plan.environmentClass !== 'shared-existing-vps-with-isolated-compose-staging' || plan.alphaNonPersistent !== true) {
    fail('ENVIRONMENT_CLASS', 'Environment must be the selected shared staging class and alpha/non-persistent.');
  }
  if (
    requireString(plan.environmentId, 'ENVIRONMENT_ID') !== 'burningspace-staging-01' ||
    plan.environmentId !== env.BURNINGSPACE_EXTERNAL_ENVIRONMENT_ID
  ) {
    fail('PLAN_ENV_MISMATCH', 'Plan and environment identifiers do not agree.');
  }

  const clientOrigin = normalizeOrigin(plan.publicClientOrigin, 'CLIENT_ORIGIN');
  const serverOrigin = normalizeOrigin(plan.publicServerOrigin, 'SERVER_ORIGIN');
  if (clientOrigin === serverOrigin) fail('ORIGIN_EQUAL', 'Client and server origins must be distinct.');
  if (clientOrigin !== normalizeOrigin(env.BURNINGSPACE_PUBLIC_CLIENT_ORIGIN, 'CLIENT_ORIGIN') ||
      serverOrigin !== normalizeOrigin(env.BURNINGSPACE_PUBLIC_SERVER_ORIGIN, 'SERVER_ORIGIN') ||
      serverOrigin !== normalizeOrigin(env.VITE_BURNINGSPACE_SERVER_URL, 'CLIENT_BUILD_ORIGIN')) {
    fail('PLAN_ENV_ORIGIN_MISMATCH', 'Plan and environment public origins do not agree.');
  }
  const hostileOrigin = normalizeOrigin(env.BURNINGSPACE_EXTERNAL_SMOKE_HOSTILE_ORIGIN, 'HOSTILE_ORIGIN');
  if (hostileOrigin === clientOrigin) fail('HOSTILE_ORIGIN', 'Hostile smoke Origin must differ from the approved client origin.');
  const edgeConfigId = requireString(plan.edgeConfigId, 'EDGE_CONFIG');
  if (options.mode !== 'template') {
    const identifiers = [plan.environmentId, edgeConfigId];
    const origins = [new URL(clientOrigin), new URL(serverOrigin), new URL(hostileOrigin)];
    if (identifiers.some((value) => value.includes('.example.invalid') || value === 'NOT-AUTHORIZED') ||
        origins.some((url) => url.hostname.endsWith('.example.invalid') || isLoopbackHostname(url.hostname))) {
      fail('PLACEHOLDER_INVENTORY', 'Real preparation modes reject placeholder or loopback external inventory.');
    }
  }

  if (!Array.isArray(plan.allowedOrigins) || plan.allowedOrigins.length === 0) {
    fail('ALLOWLIST', 'Allowed Origins must be a non-empty array.');
  }
  if (plan.allowedOrigins.includes('*')) fail('WILDCARD_ORIGIN', 'Wildcard Origin is forbidden.');
  const allowed = plan.allowedOrigins.map((origin) => normalizeOrigin(origin, 'ALLOWLIST'));
  if (new Set(allowed).size !== allowed.length) fail('DUPLICATE_ORIGIN', 'Duplicate Origins are forbidden.');
  const envAllowedRaw = requireString(env.BURNINGSPACE_ALLOWED_ORIGINS, 'ALLOWLIST').split(',').map((v) => v.trim());
  if (envAllowedRaw.includes('*')) fail('WILDCARD_ORIGIN', 'Wildcard Origin is forbidden.');
  const envAllowed = envAllowedRaw.map((origin) => normalizeOrigin(origin, 'ALLOWLIST'));
  if (new Set(envAllowed).size !== envAllowed.length) fail('DUPLICATE_ORIGIN', 'Duplicate Origins are forbidden.');
  if (allowed.length !== 1 || envAllowed.length !== 1 || allowed[0] !== clientOrigin || envAllowed[0] !== clientOrigin) {
    fail('ALLOWLIST_MISMATCH', 'The exact server allowlist must contain only the approved client origin.');
  }

  if (plan.serverBindHost !== '127.0.0.1' || plan.clientBindHost !== '127.0.0.1') {
    fail('BIND_HOST', 'Server and client bind hosts must be exactly loopback.');
  }
  const serverPort = parsePort(plan.serverBindPort, 'SERVER_PORT');
  const clientPort = parsePort(plan.clientBindPort, 'CLIENT_PORT');
  if (serverPort !== parsePort(env.BURNINGSPACE_SERVER_BIND_PORT, 'SERVER_PORT') ||
      clientPort !== parsePort(env.BURNINGSPACE_CLIENT_BIND_PORT, 'CLIENT_PORT')) {
    fail('PLAN_ENV_PORT_MISMATCH', 'Plan and environment bind ports do not agree.');
  }

  const targetServerImage = assertImmutableImage(plan.targetServerImage, options.mode, 'TARGET_SERVER_IMAGE');
  const targetClientImage = assertImmutableImage(plan.targetClientImage, options.mode, 'TARGET_CLIENT_IMAGE');
  if (
    targetServerImage !== assertImmutableImage(env.BURNINGSPACE_SERVER_IMAGE, options.mode, 'TARGET_SERVER_IMAGE') ||
    targetClientImage !== assertImmutableImage(env.BURNINGSPACE_CLIENT_IMAGE, options.mode, 'TARGET_CLIENT_IMAGE')
  ) {
    fail('PLAN_ENV_IMAGE_MISMATCH', 'Plan and environment image bindings do not agree.');
  }
  if (rollbackMode === 'previous-approved-release') {
    const previousServerImage = assertImmutableImage(plan.previousServerImage, options.mode, 'PREVIOUS_SERVER_IMAGE');
    const previousClientImage = assertImmutableImage(plan.previousClientImage, options.mode, 'PREVIOUS_CLIENT_IMAGE');
    if (
      previousServerImage !== assertImmutableImage(env.BURNINGSPACE_PREVIOUS_SERVER_IMAGE, options.mode, 'PREVIOUS_SERVER_IMAGE') ||
      previousClientImage !== assertImmutableImage(env.BURNINGSPACE_PREVIOUS_CLIENT_IMAGE, options.mode, 'PREVIOUS_CLIENT_IMAGE')
    ) {
      fail('PLAN_ENV_IMAGE_MISMATCH', 'Plan and environment image bindings do not agree.');
    }
    if (targetServerImage === previousServerImage || targetClientImage === previousClientImage) {
      fail('EQUAL_IMAGES', 'Target and previous-approved images must differ for each service.');
    }
  }
  parseBoundedNumber(env.BURNINGSPACE_RECONNECT_GRACE_SECONDS, 1, 60, 'RECONNECT_LIMIT');
  parseBoundedNumber(env.BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS, 1, 60, 'SHUTDOWN_LIMIT');
  parseBoundedNumber(env.BURNINGSPACE_PROFILE_RATE_BURST, 1, Number.MAX_SAFE_INTEGER, 'PROFILE_RATE');
  parseBoundedNumber(env.BURNINGSPACE_PROFILE_RATE_PER_SECOND, Number.MIN_VALUE, Number.MAX_SAFE_INTEGER, 'PROFILE_RATE');
  parseBoundedNumber(env.BURNINGSPACE_INPUT_RATE_BURST, 1, Number.MAX_SAFE_INTEGER, 'INPUT_RATE');
  parseBoundedNumber(env.BURNINGSPACE_INPUT_RATE_PER_SECOND, Number.MIN_VALUE, Number.MAX_SAFE_INTEGER, 'INPUT_RATE');

  if (plan.publicProductionLaunchAuthorized !== false ||
      parseBoolean(env.BURNINGSPACE_PUBLIC_PRODUCTION_LAUNCH_AUTHORIZED, 'PRODUCTION_FLAG')) {
    fail('PRODUCTION_LAUNCH', 'Public production launch authorization must remain false.');
  }
  const executionAuthorized = parseBoolean(env.BURNINGSPACE_EXTERNAL_EXECUTION_AUTHORIZED, 'EXECUTION_FLAG');
  if (plan.externalExecutionAuthorized !== executionAuthorized) {
    fail('EXECUTION_FLAG_MISMATCH', 'Plan and environment execution flags do not agree.');
  }
  if (options.mode === 'phase-a' && executionAuthorized) {
    fail('PHASE_A_EXECUTION', 'Phase A rejects external execution authorization.');
  }
  if (options.mode === 'phase-b' && !executionAuthorized) {
    fail('PHASE_B_EXECUTION', 'Phase B requires explicit external execution authorization.');
  }
  if (options.mode === 'template' && executionAuthorized) {
    fail('TEMPLATE_EXECUTION', 'Committed templates cannot authorize external execution.');
  }

  let previous: string | undefined;
  if (rollbackMode === 'previous-approved-release') {
    previous = assertCommit(plan.previousApprovedCommit, options.mode, 'PREVIOUS_COMMIT');
    if (previous !== env.BURNINGSPACE_PREVIOUS_APPROVED_COMMIT) {
      fail('PLAN_ENV_COMMIT_MISMATCH', 'Plan and environment commit bindings do not agree.');
    }
  }
  const target = assertCommit(plan.targetCommit, options.mode, 'TARGET_COMMIT');
  if (target !== env.BURNINGSPACE_TARGET_COMMIT) {
    fail('PLAN_ENV_COMMIT_MISMATCH', 'Plan and environment commit bindings do not agree.');
  }
  if (previous === target) fail('EQUAL_COMMITS', 'Previous and target commits must differ.');

  const go = requireString(plan.deploymentGoReference, 'GO_REFERENCE');
  if (go !== env.BURNINGSPACE_DEPLOYMENT_GO_REFERENCE) fail('GO_MISMATCH', 'Plan and environment GO references do not agree.');
  if (options.mode === 'phase-b' && (go === 'NOT-AUTHORIZED' || go.endsWith('.example.invalid'))) {
    fail('GO_REQUIRED', 'Phase B requires a non-placeholder deployment GO reference.');
  }
  if (edgeConfigId !== env.BURNINGSPACE_EDGE_CONFIG_ID) fail('EDGE_MISMATCH', 'Plan and environment edge IDs do not agree.');

  if (options.mode !== 'template') (options.checkRepository ?? repositoryCheck)(previous, target, options.mode);
  if (options.composeModel !== undefined) validateComposeModel(options.composeModel, plan);
}

function readInputs(envPath: string, planPath: string): { env: Record<string, string>; plan: unknown } {
  try {
    const root = realpathSync(resolve('.'));
    const safeRead = (inputPath: string): string => {
      const path = realpathSync(resolve(inputPath));
      const fromRoot = relative(root, path);
      if (fromRoot.startsWith('..') || resolve(root, fromRoot) !== path || statSync(path).size > 65_536) {
        fail('INPUT_PATH', 'Preflight inputs must be bounded files inside the repository.');
      }
      return readFileSync(path, 'utf8');
    };
    return {
      env: parseEnvFile(safeRead(envPath)),
      plan: JSON.parse(safeRead(planPath)) as unknown
    };
  } catch (error) {
    if (error instanceof SafeValidationError) throw error;
    fail('INPUT_READ', 'Unable to read or parse the bounded preflight inputs.');
  }
}

function baseFixture(): { env: Record<string, string>; plan: DeploymentPlan } {
  const { env, plan } = readInputs('deploy/external-staging.env.example', 'deploy/external-staging-plan.example.json');
  return { env: { ...env }, plan: structuredClone(plan as DeploymentPlan) };
}

function baseComposeFixture(plan: DeploymentPlan): Record<string, unknown> {
  const service = (
    image: string,
    cpus: number,
    memLimit: number,
    published: number,
    target: number
  ): Record<string, unknown> => ({
    image,
    cpus,
    mem_limit: memLimit,
    logging: { driver: 'json-file', options: { 'max-size': LOG_MAX_SIZE, 'max-file': LOG_MAX_FILE } },
    ports: [{ host_ip: '127.0.0.1', published: String(published), target, protocol: 'tcp' }],
    networks: { burningspace: null },
    privileged: false,
    read_only: true,
    tmpfs: ['/tmp'],
    volumes: []
  });
  return {
    name: 'burningspace-staging',
    services: {
      server: service(plan.targetServerImage, SERVER_CPUS, SERVER_MEMORY_BYTES, plan.serverBindPort, 2567),
      client: service(plan.targetClientImage, CLIENT_CPUS, CLIENT_MEMORY_BYTES, plan.clientBindPort, 8080)
    },
    networks: { burningspace: { name: 'burningspace-staging_burningspace', driver: 'bridge', external: false } }
  };
}

function applyRealInventory(fixture: ReturnType<typeof baseFixture>): void {
  fixture.plan.environmentId = 'burningspace-staging-01';
  fixture.env.BURNINGSPACE_EXTERNAL_ENVIRONMENT_ID = fixture.plan.environmentId;
  fixture.plan.publicClientOrigin = 'https://arena.ops002-review.example.org';
  fixture.env.BURNINGSPACE_PUBLIC_CLIENT_ORIGIN = fixture.plan.publicClientOrigin;
  fixture.plan.publicServerOrigin = 'https://arena-api.ops002-review.example.org';
  fixture.env.BURNINGSPACE_PUBLIC_SERVER_ORIGIN = fixture.plan.publicServerOrigin;
  fixture.env.VITE_BURNINGSPACE_SERVER_URL = fixture.plan.publicServerOrigin;
  fixture.plan.allowedOrigins = [fixture.plan.publicClientOrigin];
  fixture.env.BURNINGSPACE_ALLOWED_ORIGINS = fixture.plan.publicClientOrigin;
  fixture.env.BURNINGSPACE_EXTERNAL_SMOKE_HOSTILE_ORIGIN = 'https://hostile.ops002-review.example.org';
  fixture.plan.edgeConfigId = 'ops002-edge-review-v1';
  fixture.env.BURNINGSPACE_EDGE_CONFIG_ID = fixture.plan.edgeConfigId;
  fixture.plan.targetServerImage = `registry.ops002-review.example.org/burningspace/server@sha256:${'a'.repeat(64)}`;
  fixture.env.BURNINGSPACE_SERVER_IMAGE = fixture.plan.targetServerImage;
  fixture.plan.targetClientImage = `registry.ops002-review.example.org/burningspace/client@sha256:${'b'.repeat(64)}`;
  fixture.env.BURNINGSPACE_CLIENT_IMAGE = fixture.plan.targetClientImage;
  fixture.plan.previousServerImage = `registry.ops002-review.example.org/burningspace/server@sha256:${'c'.repeat(64)}`;
  fixture.env.BURNINGSPACE_PREVIOUS_SERVER_IMAGE = fixture.plan.previousServerImage;
  fixture.plan.previousClientImage = `registry.ops002-review.example.org/burningspace/client@sha256:${'d'.repeat(64)}`;
  fixture.env.BURNINGSPACE_PREVIOUS_CLIENT_IMAGE = fixture.plan.previousClientImage;
}

function applyBootstrapRollback(fixture: ReturnType<typeof baseFixture>): void {
  fixture.plan.rollbackMode = 'bootstrap-no-previous-release';
  delete fixture.plan.previousServerImage;
  delete fixture.plan.previousClientImage;
  delete fixture.plan.previousApprovedCommit;
  delete fixture.env.BURNINGSPACE_PREVIOUS_SERVER_IMAGE;
  delete fixture.env.BURNINGSPACE_PREVIOUS_CLIENT_IMAGE;
  delete fixture.env.BURNINGSPACE_PREVIOUS_APPROVED_COMMIT;
}

function expectFailure(name: string, mutate: (fixture: ReturnType<typeof baseFixture>) => void, mode: Mode, code: string): void {
  const fixture = baseFixture();
  mutate(fixture);
  try {
    validate(fixture.env, fixture.plan, { mode, checkRepository: () => undefined });
  } catch (error) {
    if (error instanceof SafeValidationError && error.code === code) return;
    fail('SELF_TEST', `Self-test ${name} failed with an unexpected safe error.`);
  }
  fail('SELF_TEST', `Self-test ${name} did not fail closed.`);
}

function expectSafeCode(name: string, operation: () => void, code: string): void {
  try {
    operation();
  } catch (error) {
    if (error instanceof SafeValidationError && error.code === code) return;
    fail('SELF_TEST', `Self-test ${name} failed with an unexpected safe error.`);
  }
  fail('SELF_TEST', `Self-test ${name} did not fail closed.`);
}

function expectComposeFailure(
  name: string,
  mutate: (model: Record<string, unknown>) => void,
  code: string
): void {
  const fixture = baseFixture();
  const model = baseComposeFixture(fixture.plan);
  mutate(model);
  try {
    validate(fixture.env, fixture.plan, { mode: 'template', composeModel: model });
  } catch (error) {
    if (error instanceof SafeValidationError && error.code === code) return;
    fail('SELF_TEST', `Compose self-test ${name} failed with an unexpected safe error.`);
  }
  fail('SELF_TEST', `Compose self-test ${name} did not fail closed.`);
}

function runSelfTests(): number {
  let completedTests = 0;
  const expectValidationSuccess = (operation: () => void): void => {
    operation();
    completedTests += 1;
  };
  const expectValidationFailure = (...args: Parameters<typeof expectFailure>): void => {
    expectFailure(...args);
    completedTests += 1;
  };
  const expectSafeFailure = (...args: Parameters<typeof expectSafeCode>): void => {
    expectSafeCode(...args);
    completedTests += 1;
  };
  const expectComposeValidationFailure = (...args: Parameters<typeof expectComposeFailure>): void => {
    expectComposeFailure(...args);
    completedTests += 1;
  };

  const template = baseFixture();
  expectValidationSuccess(() => validate(template.env, template.plan, { mode: 'template' }));
  expectValidationSuccess(() => validate(template.env, template.plan, { mode: 'template', composeModel: baseComposeFixture(template.plan) }));
  expectValidationFailure('wildcard', (f) => { f.plan.allowedOrigins = ['*']; f.env.BURNINGSPACE_ALLOWED_ORIGINS = '*'; }, 'template', 'WILDCARD_ORIGIN');
  expectValidationFailure('http-external', (f) => { f.plan.publicClientOrigin = 'http://arena.example.invalid'; f.env.BURNINGSPACE_PUBLIC_CLIENT_ORIGIN = f.plan.publicClientOrigin; f.plan.allowedOrigins = [f.plan.publicClientOrigin]; f.env.BURNINGSPACE_ALLOWED_ORIGINS = f.plan.publicClientOrigin; }, 'template', 'CLIENT_ORIGIN');
  expectValidationFailure('path', (f) => { f.plan.publicClientOrigin += '/play'; }, 'template', 'CLIENT_ORIGIN');
  expectValidationFailure('query', (f) => { f.plan.publicServerOrigin += '?debug=true'; }, 'template', 'SERVER_ORIGIN');
  expectValidationFailure('credentials', (f) => { f.plan.publicClientOrigin = 'https://user@arena.example.invalid'; }, 'template', 'CLIENT_ORIGIN');
  expectValidationFailure('equal-origins', (f) => { f.plan.publicServerOrigin = f.plan.publicClientOrigin; f.env.BURNINGSPACE_PUBLIC_SERVER_ORIGIN = f.plan.publicClientOrigin; f.env.VITE_BURNINGSPACE_SERVER_URL = f.plan.publicClientOrigin; }, 'template', 'ORIGIN_EQUAL');
  expectValidationFailure('allowlist', (f) => { f.plan.allowedOrigins = ['https://other.example.invalid']; }, 'template', 'ALLOWLIST_MISMATCH');
  expectValidationFailure('bind', (f) => { f.plan.serverBindHost = '0.0.0.0'; }, 'template', 'BIND_HOST');
  expectValidationFailure('port', (f) => { f.plan.clientBindPort = 0; }, 'template', 'CLIENT_PORT');
  expectValidationFailure('missing-target-image', (f) => { f.plan.targetServerImage = ''; f.env.BURNINGSPACE_SERVER_IMAGE = ''; }, 'template', 'TARGET_SERVER_IMAGE');
  expectValidationFailure('mutable-target-image', (f) => { f.plan.targetServerImage = 'registry.example.invalid/burningspace/server:latest'; f.env.BURNINGSPACE_SERVER_IMAGE = f.plan.targetServerImage; }, 'template', 'TARGET_SERVER_IMAGE');
  expectValidationFailure('tagged-target-digest', (f) => { f.plan.targetServerImage = `registry.example.invalid/burningspace/server:latest@sha256:${'a'.repeat(64)}`; f.env.BURNINGSPACE_SERVER_IMAGE = f.plan.targetServerImage; }, 'template', 'TARGET_SERVER_IMAGE');
  expectValidationFailure('malformed-target-digest', (f) => { f.plan.targetClientImage = 'registry.example.invalid/burningspace/client@sha256:abc'; f.env.BURNINGSPACE_CLIENT_IMAGE = f.plan.targetClientImage; }, 'template', 'TARGET_CLIENT_IMAGE');
  expectValidationFailure('missing-rollback-image', (f) => { f.plan.previousServerImage = ''; f.env.BURNINGSPACE_PREVIOUS_SERVER_IMAGE = ''; }, 'template', 'PREVIOUS_SERVER_IMAGE');
  expectValidationFailure('mutable-rollback-image', (f) => { f.plan.previousClientImage = 'registry.example.invalid/burningspace/client:previous'; f.env.BURNINGSPACE_PREVIOUS_CLIENT_IMAGE = f.plan.previousClientImage; }, 'template', 'PREVIOUS_CLIENT_IMAGE');
  expectValidationFailure('plan-env-image-mismatch', (f) => { f.env.BURNINGSPACE_SERVER_IMAGE = `registry.example.invalid/burningspace/server@sha256:${'a'.repeat(64)}`; }, 'template', 'PLAN_ENV_IMAGE_MISMATCH');
  expectValidationFailure('equal-target-rollback-image', (f) => { f.plan.previousClientImage = f.plan.targetClientImage; f.env.BURNINGSPACE_PREVIOUS_CLIENT_IMAGE = f.plan.targetClientImage; }, 'template', 'EQUAL_IMAGES');
  expectValidationFailure('placeholder-image-real', (f) => { applyRealInventory(f); f.plan.targetServerImage = `registry.example.invalid/burningspace/server@sha256:${'1'.repeat(64)}`; f.env.BURNINGSPACE_SERVER_IMAGE = f.plan.targetServerImage; }, 'phase-a', 'PLACEHOLDER_IMAGE');
  expectValidationFailure('placeholder-image-phase-b', (f) => { applyRealInventory(f); f.plan.previousClientImage = `registry.example.invalid/burningspace/client@sha256:${'4'.repeat(64)}`; f.env.BURNINGSPACE_PREVIOUS_CLIENT_IMAGE = f.plan.previousClientImage; }, 'phase-b', 'PLACEHOLDER_IMAGE');
  expectValidationFailure('production', (f) => { f.plan.publicProductionLaunchAuthorized = true; f.env.BURNINGSPACE_PUBLIC_PRODUCTION_LAUNCH_AUTHORIZED = 'true'; }, 'template', 'PRODUCTION_LAUNCH');
  expectValidationFailure('phase-a-execution', (f) => { applyRealInventory(f); f.plan.externalExecutionAuthorized = true; f.env.BURNINGSPACE_EXTERNAL_EXECUTION_AUTHORIZED = 'true'; }, 'phase-a', 'PHASE_A_EXECUTION');
  expectValidationFailure('phase-b-go', (f) => {
    applyRealInventory(f);
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).stdout.trim();
    const parent = spawnSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8', windowsHide: true }).stdout.trim();
    f.plan.externalExecutionAuthorized = true;
    f.env.BURNINGSPACE_EXTERNAL_EXECUTION_AUTHORIZED = 'true';
    f.plan.previousApprovedCommit = parent;
    f.plan.targetCommit = head;
    f.env.BURNINGSPACE_PREVIOUS_APPROVED_COMMIT = parent;
    f.env.BURNINGSPACE_TARGET_COMMIT = head;
  }, 'phase-b', 'GO_REQUIRED');
  expectValidationFailure('placeholder-real', (f) => applyRealInventory(f), 'phase-a', 'PREVIOUS_COMMIT');
  expectValidationFailure('equal-commits', (f) => {
    const previous = f.plan.previousApprovedCommit;
    if (previous === undefined) fail('SELF_TEST', 'Strict rollback fixture is missing its previous commit.');
    f.plan.targetCommit = previous;
    f.env.BURNINGSPACE_TARGET_COMMIT = previous;
  }, 'template', 'EQUAL_COMMITS');
  expectValidationFailure('secret-key', (f) => { f.env.DEPLOY_PASSWORD = 'seeded-fake-secret-never-echo'; }, 'template', 'UNEXPECTED_ENV_KEY');
  expectValidationFailure('private-key', (f) => { f.plan.edgeConfigId = '-----BEGIN PRIVATE KEY-----'; }, 'template', 'SECRET_VALUE');

  const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).stdout.trim();
  const parent = spawnSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8', windowsHide: true }).stdout.trim();
  const bootstrap = baseFixture();
  applyRealInventory(bootstrap);
  applyBootstrapRollback(bootstrap);
  bootstrap.plan.targetCommit = head;
  bootstrap.env.BURNINGSPACE_TARGET_COMMIT = head;
  bootstrap.plan.externalExecutionAuthorized = true;
  bootstrap.env.BURNINGSPACE_EXTERNAL_EXECUTION_AUTHORIZED = 'true';
  bootstrap.plan.deploymentGoReference = 'PA-GO-OPS002-BOOTSTRAP-REVIEW';
  bootstrap.env.BURNINGSPACE_DEPLOYMENT_GO_REFERENCE = bootstrap.plan.deploymentGoReference;
  expectValidationSuccess(() => validate(bootstrap.env, bootstrap.plan, {
    mode: 'phase-b',
    checkRepository: (boundPrevious, boundTarget, mode) => {
      if (boundPrevious !== undefined) fail('SELF_TEST', 'Bootstrap rollback bound a previous approved commit.');
      repositoryCheck(boundPrevious, boundTarget, mode, (args) => {
        if (args[0] === 'rev-parse') return { status: 0, stdout: `${head}\n` };
        return { status: 0, stdout: 'trusted-branch\n' };
      });
    }
  }));
  expectValidationFailure('bootstrap-previous-server-image', (f) => {
    applyBootstrapRollback(f);
    f.plan.previousServerImage = `registry.example.invalid/burningspace/server@sha256:${'c'.repeat(64)}`;
  }, 'template', 'BOOTSTRAP_PREVIOUS_ARTIFACT');
  expectValidationFailure('bootstrap-previous-client-image', (f) => {
    applyBootstrapRollback(f);
    f.plan.previousClientImage = `registry.example.invalid/burningspace/client@sha256:${'d'.repeat(64)}`;
  }, 'template', 'BOOTSTRAP_PREVIOUS_ARTIFACT');
  expectValidationFailure('bootstrap-previous-commit', (f) => {
    applyBootstrapRollback(f);
    f.plan.previousApprovedCommit = parent;
  }, 'template', 'BOOTSTRAP_PREVIOUS_ARTIFACT');
  expectValidationFailure('bootstrap-dummy-previous-digest', (f) => {
    applyBootstrapRollback(f);
    f.env.BURNINGSPACE_PREVIOUS_SERVER_IMAGE = `registry.example.invalid/burningspace/server@sha256:${'3'.repeat(64)}`;
  }, 'template', 'BOOTSTRAP_PREVIOUS_ARTIFACT');
  expectValidationFailure('previous-release-missing-previous-image', (f) => {
    delete f.plan.previousServerImage;
    delete f.env.BURNINGSPACE_PREVIOUS_SERVER_IMAGE;
  }, 'template', 'PLAN_FIELD');
  expectValidationFailure('previous-release-missing-previous-commit', (f) => {
    delete f.plan.previousApprovedCommit;
    delete f.env.BURNINGSPACE_PREVIOUS_APPROVED_COMMIT;
  }, 'template', 'PLAN_FIELD');
  expectValidationFailure('unknown-rollback-mode', (f) => {
    (f.plan as unknown as Record<string, unknown>).rollbackMode = 'unsupported-rollback-mode';
  }, 'template', 'ROLLBACK_MODE');
  expectValidationFailure('strict-mode-does-not-infer-bootstrap', (f) => {
    delete f.plan.previousServerImage;
    delete f.plan.previousClientImage;
    delete f.plan.previousApprovedCommit;
    delete f.env.BURNINGSPACE_PREVIOUS_SERVER_IMAGE;
    delete f.env.BURNINGSPACE_PREVIOUS_CLIENT_IMAGE;
    delete f.env.BURNINGSPACE_PREVIOUS_APPROVED_COMMIT;
  }, 'template', 'PLAN_FIELD');
  const real = baseFixture();
  applyRealInventory(real);
  real.plan.previousApprovedCommit = parent;
  real.plan.targetCommit = head;
  real.env.BURNINGSPACE_PREVIOUS_APPROVED_COMMIT = parent;
  real.env.BURNINGSPACE_TARGET_COMMIT = head;
  expectValidationSuccess(() => validate(real.env, real.plan, { mode: 'phase-a' }));

  expectValidationFailure('placeholder-inventory', (f) => {
    f.plan.previousApprovedCommit = parent;
    f.plan.targetCommit = head;
    f.env.BURNINGSPACE_PREVIOUS_APPROVED_COMMIT = parent;
    f.env.BURNINGSPACE_TARGET_COMMIT = head;
  }, 'phase-a', 'PLACEHOLDER_INVENTORY');
  expectValidationFailure('loopback-real-target', (f) => {
    applyRealInventory(f);
    f.plan.previousApprovedCommit = parent;
    f.plan.targetCommit = head;
    f.env.BURNINGSPACE_PREVIOUS_APPROVED_COMMIT = parent;
    f.env.BURNINGSPACE_TARGET_COMMIT = head;
    f.plan.publicClientOrigin = 'http://127.0.0.1:8080';
    f.env.BURNINGSPACE_PUBLIC_CLIENT_ORIGIN = f.plan.publicClientOrigin;
    f.plan.allowedOrigins = [f.plan.publicClientOrigin];
    f.env.BURNINGSPACE_ALLOWED_ORIGINS = f.plan.publicClientOrigin;
  }, 'phase-a', 'PLACEHOLDER_INVENTORY');

  const previous = '3333333333333333333333333333333333333333';
  const target = '4444444444444444444444444444444444444444';
  expectSafeFailure('unmerged-phase-b-target', () => repositoryCheck(previous, target, 'phase-b', (args) => {
    if (args[0] === 'rev-parse') return { status: 0, stdout: `${target}\n` };
    if (args[0] === 'merge-base' && args[2] === target) return { status: 1, stdout: '' };
    return { status: 0, stdout: 'trusted-branch\n' };
  }), 'TARGET_NOT_APPROVED');

  const phaseB = baseFixture();
  applyRealInventory(phaseB);
  phaseB.plan.previousApprovedCommit = previous;
  phaseB.plan.targetCommit = target;
  phaseB.env.BURNINGSPACE_PREVIOUS_APPROVED_COMMIT = previous;
  phaseB.env.BURNINGSPACE_TARGET_COMMIT = target;
  phaseB.plan.externalExecutionAuthorized = true;
  phaseB.env.BURNINGSPACE_EXTERNAL_EXECUTION_AUTHORIZED = 'true';
  phaseB.plan.deploymentGoReference = 'PA-GO-OPS002-REVIEW';
  phaseB.env.BURNINGSPACE_DEPLOYMENT_GO_REFERENCE = phaseB.plan.deploymentGoReference;
  expectValidationSuccess(() => validate(phaseB.env, phaseB.plan, {
    mode: 'phase-b',
    checkRepository: (boundPrevious, boundTarget, mode) => repositoryCheck(boundPrevious, boundTarget, mode, (args) => {
      if (args[0] === 'rev-parse') return { status: 0, stdout: `${target}\n` };
      return { status: 0, stdout: 'trusted-branch\n' };
    })
  }));

  expectValidationSuccess(() => {
    const seeded = 'seeded-fake-secret-never-echo';
    let safeFailure = '';
    try {
      const secret = baseFixture();
      secret.env.DEPLOY_PASSWORD = seeded;
      validate(secret.env, secret.plan, { mode: 'template' });
    } catch (error) {
      safeFailure = JSON.stringify(toSafeError(error));
    }
    if (safeFailure.includes(seeded)) fail('SELF_TEST', 'Failure output exposed a seeded value.');
    if (safeFailure.length > 800) fail('SELF_TEST', 'Failure output exceeded the bounded limit.');
  });

  expectComposeValidationFailure('missing-cpu', (model) => {
    delete requireObject(requireObject(model.services, 'SELF_TEST').server, 'SELF_TEST').cpus;
  }, 'COMPOSE_CPU');
  expectComposeValidationFailure('missing-memory', (model) => {
    delete requireObject(requireObject(model.services, 'SELF_TEST').client, 'SELF_TEST').mem_limit;
  }, 'COMPOSE_MEMORY');
  expectComposeValidationFailure('missing-log-max-size', (model) => {
    const server = requireObject(requireObject(model.services, 'SELF_TEST').server, 'SELF_TEST');
    delete requireObject(requireObject(server.logging, 'SELF_TEST').options, 'SELF_TEST')['max-size'];
  }, 'COMPOSE_LOG_MAX_SIZE');
  expectComposeValidationFailure('missing-log-max-file', (model) => {
    const client = requireObject(requireObject(model.services, 'SELF_TEST').client, 'SELF_TEST');
    delete requireObject(requireObject(client.logging, 'SELF_TEST').options, 'SELF_TEST')['max-file'];
  }, 'COMPOSE_LOG_MAX_FILE');
  expectComposeValidationFailure('external-network', (model) => {
    requireObject(requireObject(model.networks, 'SELF_TEST').burningspace, 'SELF_TEST').external = true;
  }, 'COMPOSE_EXTERNAL_NETWORK');
  expectComposeValidationFailure('shared-fixed-network', (model) => {
    requireObject(requireObject(model.networks, 'SELF_TEST').burningspace, 'SELF_TEST').name = 'shared-global-network';
  }, 'COMPOSE_EXTERNAL_NETWORK');
  expectComposeValidationFailure('host-network', (model) => {
    requireObject(requireObject(model.services, 'SELF_TEST').server, 'SELF_TEST').network_mode = 'host';
  }, 'COMPOSE_HOST_NETWORK');
  expectComposeValidationFailure('public-bind', (model) => {
    const server = requireObject(requireObject(model.services, 'SELF_TEST').server, 'SELF_TEST');
    const ports = server.ports as unknown[];
    requireObject(ports[0], 'SELF_TEST').host_ip = '0.0.0.0';
  }, 'COMPOSE_PORT');
  expectComposeValidationFailure('source-build', (model) => {
    requireObject(requireObject(model.services, 'SELF_TEST').server, 'SELF_TEST').build = { context: '..' };
  }, 'COMPOSE_SOURCE_BUILD');
  expectComposeValidationFailure('service-image-mismatch', (model) => {
    requireObject(requireObject(model.services, 'SELF_TEST').client, 'SELF_TEST').image = 'burningspace-client:latest';
  }, 'COMPOSE_IMAGE');
  expectComposeValidationFailure('host-root-bind', (model) => {
    requireObject(requireObject(model.services, 'SELF_TEST').server, 'SELF_TEST').volumes = [
      { type: 'bind', source: '/', target: '/host', read_only: false }
    ];
  }, 'COMPOSE_VOLUME');
  expectComposeValidationFailure('persistent-state-bind', (model) => {
    requireObject(requireObject(model.services, 'SELF_TEST').server, 'SELF_TEST').volumes = [
      { type: 'bind', source: '/srv/burningspace-state', target: '/app/state', read_only: false }
    ];
  }, 'COMPOSE_VOLUME');
  expectComposeValidationFailure('docker-socket-bind', (model) => {
    requireObject(requireObject(model.services, 'SELF_TEST').client, 'SELF_TEST').volumes = [
      { type: 'bind', source: '/var/run/docker.sock', target: '/var/run/docker.sock', read_only: false }
    ];
  }, 'COMPOSE_VOLUME');
  return completedTests;
}

function argumentValue(args: string[], name: string): string {
  const index = args.indexOf(name);
  if (index < 0 || index + 1 >= args.length) fail('ARGUMENT', 'Required input path argument is missing.');
  return args[index + 1]!;
}

function readComposeStdin(): unknown {
  try {
    const contents = readFileSync(0, 'utf8');
    if (contents.length === 0 || contents.length > 1_048_576) {
      fail('COMPOSE_INPUT', 'Rendered Compose input is missing or exceeds the bounded size.');
    }
    return JSON.parse(contents) as unknown;
  } catch (error) {
    if (error instanceof SafeValidationError) throw error;
    fail('COMPOSE_INPUT', 'Unable to read or parse rendered Compose JSON from standard input.');
  }
}

function toSafeError(error: unknown): { code: string; message: string } {
  if (error instanceof SafeValidationError) return { code: error.code, message: error.message.slice(0, 300) };
  return { code: 'UNEXPECTED', message: 'Unexpected bounded preflight failure.' };
}

function main(): void {
  const args = process.argv.slice(2);
  const startedAt = Date.now();
  if (args.includes('--self-test')) {
    const tests = runSelfTests();
    console.log(JSON.stringify({ ok: true, event: 'external_staging_preflight_self_tested', tests, durationMs: Date.now() - startedAt }));
    return;
  }
  const selected = (['template', 'phase-a', 'phase-b'] as const).filter((mode) => args.includes(`--${mode}`));
  if (selected.length !== 1) fail('MODE', 'Select exactly one preflight mode.');
  if (!args.includes('--compose-stdin')) fail('COMPOSE_REQUIRED', 'Rendered Compose JSON must be supplied through standard input.');
  const inputs = readInputs(argumentValue(args, '--env'), argumentValue(args, '--plan'));
  const mode = selected[0]!;
  validate(inputs.env, inputs.plan, { mode, composeModel: readComposeStdin() });
  console.log(JSON.stringify({
    ok: true,
    event: 'external_staging_preflight_completed',
    mode,
    composePolicyValidated: true,
    externalExecutionAuthorized: mode === 'phase-b',
    publicProductionLaunchAuthorized: false,
    durationMs: Date.now() - startedAt
  }));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ ok: false, event: 'external_staging_preflight_failed', error: toSafeError(error) }));
  process.exitCode = 1;
}
