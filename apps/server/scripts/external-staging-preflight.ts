import { readFileSync, realpathSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

type Mode = 'template' | 'phase-a' | 'phase-b';

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
  previousApprovedCommit: string;
  targetCommit: string;
  edgeConfigId: string;
  rollbackMode: string;
  deploymentGoReference: string;
  externalExecutionAuthorized: boolean;
  publicProductionLaunchAuthorized: boolean;
}

interface ValidationOptions {
  mode: Mode;
  checkRepository?: (previous: string, target: string, mode: Mode) => void;
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
  'serverBindPort', 'clientBindHost', 'clientBindPort', 'previousApprovedCommit',
  'targetCommit', 'edgeConfigId', 'rollbackMode', 'deploymentGoReference',
  'externalExecutionAuthorized', 'publicProductionLaunchAuthorized'
]);

const PLACEHOLDER_COMMITS = new Set([
  '0000000000000000000000000000000000000000',
  '1111111111111111111111111111111111111111',
  '2222222222222222222222222222222222222222'
]);

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

function runGit(args: string[]): GitResult {
  const result = spawnSync('git', args, { cwd: resolve('.'), encoding: 'utf8', windowsHide: true });
  return { status: result.status, stdout: result.stdout };
}

function repositoryCheck(previous: string, target: string, mode: Mode, git: GitRunner = runGit): void {
  for (const commit of [previous, target]) {
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
    for (const commit of [previous, target]) {
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
  for (const key of PLAN_KEYS) {
    if (!Object.hasOwn(planObject, key)) fail('PLAN_FIELD', 'Deployment plan is missing a required field.');
  }
  const plan = planObject as unknown as DeploymentPlan;

  if (env.NODE_ENV !== 'production') fail('NODE_ENV', 'NODE_ENV must be production.');
  if (plan.schemaVersion !== 1) fail('SCHEMA_VERSION', 'Unsupported deployment plan schema version.');
  if (plan.environmentClass !== 'external-staging' || plan.alphaNonPersistent !== true) {
    fail('ENVIRONMENT_CLASS', 'Environment must be external-staging and alpha/non-persistent.');
  }
  if (requireString(plan.environmentId, 'ENVIRONMENT_ID') !== env.BURNINGSPACE_EXTERNAL_ENVIRONMENT_ID) {
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

  const previous = assertCommit(plan.previousApprovedCommit, options.mode, 'PREVIOUS_COMMIT');
  const target = assertCommit(plan.targetCommit, options.mode, 'TARGET_COMMIT');
  if (previous !== env.BURNINGSPACE_PREVIOUS_APPROVED_COMMIT || target !== env.BURNINGSPACE_TARGET_COMMIT) {
    fail('PLAN_ENV_COMMIT_MISMATCH', 'Plan and environment commit bindings do not agree.');
  }
  if (previous === target) fail('EQUAL_COMMITS', 'Previous and target commits must differ.');
  requireString(plan.rollbackMode, 'ROLLBACK_MODE');
  if (plan.rollbackMode !== 'previous-approved-release') fail('ROLLBACK_MODE', 'Rollback mode is unsupported.');

  const go = requireString(plan.deploymentGoReference, 'GO_REFERENCE');
  if (go !== env.BURNINGSPACE_DEPLOYMENT_GO_REFERENCE) fail('GO_MISMATCH', 'Plan and environment GO references do not agree.');
  if (options.mode === 'phase-b' && (go === 'NOT-AUTHORIZED' || go.endsWith('.example.invalid'))) {
    fail('GO_REQUIRED', 'Phase B requires a non-placeholder deployment GO reference.');
  }
  if (edgeConfigId !== env.BURNINGSPACE_EDGE_CONFIG_ID) fail('EDGE_MISMATCH', 'Plan and environment edge IDs do not agree.');

  if (options.mode !== 'template') (options.checkRepository ?? repositoryCheck)(previous, target, options.mode);
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

function applyRealInventory(fixture: ReturnType<typeof baseFixture>): void {
  fixture.plan.environmentId = 'ops002-staging-review';
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

function runSelfTests(): number {
  const template = baseFixture();
  validate(template.env, template.plan, { mode: 'template' });
  expectFailure('wildcard', (f) => { f.plan.allowedOrigins = ['*']; f.env.BURNINGSPACE_ALLOWED_ORIGINS = '*'; }, 'template', 'WILDCARD_ORIGIN');
  expectFailure('http-external', (f) => { f.plan.publicClientOrigin = 'http://arena.example.invalid'; f.env.BURNINGSPACE_PUBLIC_CLIENT_ORIGIN = f.plan.publicClientOrigin; f.plan.allowedOrigins = [f.plan.publicClientOrigin]; f.env.BURNINGSPACE_ALLOWED_ORIGINS = f.plan.publicClientOrigin; }, 'template', 'CLIENT_ORIGIN');
  expectFailure('path', (f) => { f.plan.publicClientOrigin += '/play'; }, 'template', 'CLIENT_ORIGIN');
  expectFailure('query', (f) => { f.plan.publicServerOrigin += '?debug=true'; }, 'template', 'SERVER_ORIGIN');
  expectFailure('credentials', (f) => { f.plan.publicClientOrigin = 'https://user@arena.example.invalid'; }, 'template', 'CLIENT_ORIGIN');
  expectFailure('equal-origins', (f) => { f.plan.publicServerOrigin = f.plan.publicClientOrigin; f.env.BURNINGSPACE_PUBLIC_SERVER_ORIGIN = f.plan.publicClientOrigin; f.env.VITE_BURNINGSPACE_SERVER_URL = f.plan.publicClientOrigin; }, 'template', 'ORIGIN_EQUAL');
  expectFailure('allowlist', (f) => { f.plan.allowedOrigins = ['https://other.example.invalid']; }, 'template', 'ALLOWLIST_MISMATCH');
  expectFailure('bind', (f) => { f.plan.serverBindHost = '0.0.0.0'; }, 'template', 'BIND_HOST');
  expectFailure('port', (f) => { f.plan.clientBindPort = 0; }, 'template', 'CLIENT_PORT');
  expectFailure('production', (f) => { f.plan.publicProductionLaunchAuthorized = true; f.env.BURNINGSPACE_PUBLIC_PRODUCTION_LAUNCH_AUTHORIZED = 'true'; }, 'template', 'PRODUCTION_LAUNCH');
  expectFailure('phase-a-execution', (f) => { applyRealInventory(f); f.plan.externalExecutionAuthorized = true; f.env.BURNINGSPACE_EXTERNAL_EXECUTION_AUTHORIZED = 'true'; }, 'phase-a', 'PHASE_A_EXECUTION');
  expectFailure('phase-b-go', (f) => {
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
  expectFailure('placeholder-real', (f) => applyRealInventory(f), 'phase-a', 'PREVIOUS_COMMIT');
  expectFailure('equal-commits', (f) => { f.plan.targetCommit = f.plan.previousApprovedCommit; f.env.BURNINGSPACE_TARGET_COMMIT = f.plan.targetCommit; }, 'template', 'EQUAL_COMMITS');
  expectFailure('secret-key', (f) => { f.env.DEPLOY_PASSWORD = 'seeded-fake-secret-never-echo'; }, 'template', 'UNEXPECTED_ENV_KEY');
  expectFailure('private-key', (f) => { f.plan.edgeConfigId = '-----BEGIN PRIVATE KEY-----'; }, 'template', 'SECRET_VALUE');

  const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).stdout.trim();
  const parent = spawnSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8', windowsHide: true }).stdout.trim();
  const real = baseFixture();
  applyRealInventory(real);
  real.plan.previousApprovedCommit = parent;
  real.plan.targetCommit = head;
  real.env.BURNINGSPACE_PREVIOUS_APPROVED_COMMIT = parent;
  real.env.BURNINGSPACE_TARGET_COMMIT = head;
  validate(real.env, real.plan, { mode: 'phase-a' });

  expectFailure('placeholder-inventory', (f) => {
    f.plan.previousApprovedCommit = parent;
    f.plan.targetCommit = head;
    f.env.BURNINGSPACE_PREVIOUS_APPROVED_COMMIT = parent;
    f.env.BURNINGSPACE_TARGET_COMMIT = head;
  }, 'phase-a', 'PLACEHOLDER_INVENTORY');
  expectFailure('loopback-real-target', (f) => {
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
  expectSafeCode('unmerged-phase-b-target', () => repositoryCheck(previous, target, 'phase-b', (args) => {
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
  validate(phaseB.env, phaseB.plan, {
    mode: 'phase-b',
    checkRepository: (boundPrevious, boundTarget, mode) => repositoryCheck(boundPrevious, boundTarget, mode, (args) => {
      if (args[0] === 'rev-parse') return { status: 0, stdout: `${target}\n` };
      return { status: 0, stdout: 'trusted-branch\n' };
    })
  });

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
  return 24;
}

function argumentValue(args: string[], name: string): string {
  const index = args.indexOf(name);
  if (index < 0 || index + 1 >= args.length) fail('ARGUMENT', 'Required input path argument is missing.');
  return args[index + 1]!;
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
  const inputs = readInputs(argumentValue(args, '--env'), argumentValue(args, '--plan'));
  const mode = selected[0]!;
  validate(inputs.env, inputs.plan, { mode });
  console.log(JSON.stringify({
    ok: true,
    event: 'external_staging_preflight_completed',
    mode,
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
