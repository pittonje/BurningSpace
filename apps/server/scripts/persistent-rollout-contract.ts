import { isIP } from 'node:net';
import { resolve } from 'node:path';

export const MIGRATION_AUTHORITY = { version: 1, filename: '001_persistent_identity_foundation.sql', sha256: '66bfea878d6113f4f27f4d20e7430de4dd07c97f97408ebbfe25868a46a4f72b' } as const;
export const POSTGRES_IMAGE = 'postgres:17@sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675';
export interface PersistentPlan {
  schemaVersion: 3; deploymentProfile: 'persistent-public-arena';
  environmentId: string; environmentClass: 'staging';
  publicClientOrigin: string; publicServerOrigin: string; allowedOrigins: string[];
  serverBindHost: string; serverBindPort: number; clientBindHost: string; clientBindPort: number;
  targetCommit: string; targetServerImage: string; targetClientImage: string;
  persistenceToolsImage: string; postgresImage: string; worldSlug: 'public-arena';
  expectedSchemaVersion: 1; expectedDomainVersion: 1; migrationAuthority: typeof MIGRATION_AUTHORITY;
  edgeConfigId: string; deploymentGoReference: string; externalExecutionAuthorized: boolean;
  publicProductionLaunchAuthorized: false; recoveryMode: 'stop-and-preserve';
}
export class RolloutError extends Error {
  constructor(readonly code: string) { super('Persistent rollout validation failed.'); }
}
export function requireRollout(condition: unknown, code: string): asserts condition {
  if (!condition) throw new RolloutError(code);
}
type Obj = Record<string, any>;
function object(value: unknown): Obj {
  requireRollout(value && typeof value === 'object' && !Array.isArray(value), 'OBJECT');
  return value as Obj;
}
function keys(value: Obj, expected: string[]): void {
  requireRollout(Object.keys(value).sort().join('|') === expected.sort().join('|'), 'FIELDS');
}
export function validateSecret(value: unknown): asserts value is string {
  requireRollout(typeof value === 'string' && value.length >= 24 && value.length <= 512 &&
    !/\s|[\x00-\x1f\x7f]/u.test(value) &&
    !/REPLACE_WITH_GENERATED_|example|fixture|canary|test|ci[_-]|^none$/iu.test(value) &&
    new Set(value).size >= 8, 'PRIVATE_SECRET');
}
export function validateConnection(value: unknown, role: string, database: string): URL {
  let url: URL;
  try { url = new URL(String(value)); } catch { throw new RolloutError('PRIVATE_CONNECTION'); }
  requireRollout(['postgres:', 'postgresql:'].includes(url.protocol) && url.hostname === 'postgres' &&
    (url.port === '' || url.port === '5432') && decodeURIComponent(url.username) === role &&
    url.pathname === `/${database}` && !url.hash && !url.search, 'PRIVATE_CONNECTION');
  let password: string;
  try { password = decodeURIComponent(url.password); } catch { throw new RolloutError('PRIVATE_CONNECTION'); }
  validateSecret(password);
  return url;
}
export type Projection = 'bootstrap' | 'migrator' | 'runtime' | 'backup' | 'admin' | 'runtime-db';
export function validateProjection(kind: Projection, raw: unknown, database = 'burningspace'): Record<string, string> {
  const env = object(raw);
  const fields: Record<Projection, string[]> = {
    bootstrap: ['BURNINGSPACE_DB_ADMIN_PASSWORD', 'BURNINGSPACE_DB_MIGRATOR_PASSWORD', 'BURNINGSPACE_DB_RUNTIME_PASSWORD', 'BURNINGSPACE_DB_BACKUP_PASSWORD'],
    migrator: ['BURNINGSPACE_MIGRATION_DATABASE_URL'], runtime: ['BURNINGSPACE_DATABASE_URL', 'BURNINGSPACE_EDGE_ASSERTION_SECRET'],
    backup: ['BURNINGSPACE_BACKUP_DATABASE_URL'], admin: ['BURNINGSPACE_ADMIN_DATABASE_URL'], 'runtime-db': ['BURNINGSPACE_DATABASE_URL']
  };
  keys(env, fields[kind]);
  for (const field of fields[kind]) {
    if (field.endsWith('_URL')) validateConnection(env[field], `burningspace_${kind === 'runtime-db' ? 'runtime' : kind}`, database);
    else validateSecret(env[field]);
  }
  if (kind === 'runtime') requireRollout(/^[A-Za-z0-9_-]{43}$/u.test(env.BURNINGSPACE_EDGE_ASSERTION_SECRET) &&
    Buffer.from(env.BURNINGSPACE_EDGE_ASSERTION_SECRET, 'base64url').toString('base64url') === env.BURNINGSPACE_EDGE_ASSERTION_SECRET, 'PRIVATE_EDGE_SECRET');
  if (kind === 'bootstrap') requireRollout(new Set(Object.values(env)).size === 4, 'PRIVATE_CONFLICT');
  return env;
}

const bindings: Record<string, keyof PersistentPlan> = {
  BURNINGSPACE_EXTERNAL_ENVIRONMENT_ID: 'environmentId', BURNINGSPACE_PUBLIC_CLIENT_ORIGIN: 'publicClientOrigin',
  BURNINGSPACE_PUBLIC_SERVER_ORIGIN: 'publicServerOrigin', BURNINGSPACE_SERVER_BIND_PORT: 'serverBindPort',
  BURNINGSPACE_CLIENT_BIND_PORT: 'clientBindPort', BURNINGSPACE_TARGET_COMMIT: 'targetCommit',
  BURNINGSPACE_SERVER_IMAGE: 'targetServerImage', BURNINGSPACE_CLIENT_IMAGE: 'targetClientImage',
  BURNINGSPACE_PERSISTENCE_TOOLS_IMAGE: 'persistenceToolsImage', BURNINGSPACE_POSTGRES_IMAGE: 'postgresImage',
  BURNINGSPACE_WORLD_SLUG: 'worldSlug', BURNINGSPACE_EDGE_CONFIG_ID: 'edgeConfigId',
  BURNINGSPACE_DEPLOYMENT_GO_REFERENCE: 'deploymentGoReference', BURNINGSPACE_EXTERNAL_EXECUTION_AUTHORIZED: 'externalExecutionAuthorized',
  BURNINGSPACE_PUBLIC_PRODUCTION_LAUNCH_AUTHORIZED: 'publicProductionLaunchAuthorized'
};
const runtimeDefaults = {
  BURNINGSPACE_RECONNECT_GRACE_SECONDS: '10', BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS: '15',
  BURNINGSPACE_PROFILE_RATE_BURST: '8', BURNINGSPACE_PROFILE_RATE_PER_SECOND: '1',
  BURNINGSPACE_INPUT_RATE_BURST: '80', BURNINGSPACE_INPUT_RATE_PER_SECOND: '40'
};
export function validatePersistentPlan(env: Record<string, string>, raw: unknown, mode: 'template' | 'phase-a' | 'phase-b', model: unknown, deploymentRoot = resolve('deploy')): PersistentPlan {
  const p = object(raw) as unknown as PersistentPlan;
  keys(object(p), ['schemaVersion', 'deploymentProfile', 'environmentId', 'environmentClass', 'publicClientOrigin', 'publicServerOrigin', 'allowedOrigins', 'serverBindHost', 'serverBindPort', 'clientBindHost', 'clientBindPort', 'targetCommit', 'targetServerImage', 'targetClientImage', 'persistenceToolsImage', 'postgresImage', 'worldSlug', 'expectedSchemaVersion', 'expectedDomainVersion', 'migrationAuthority', 'edgeConfigId', 'deploymentGoReference', 'externalExecutionAuthorized', 'publicProductionLaunchAuthorized', 'recoveryMode']);
  keys(env, [...Object.keys(bindings), ...Object.keys(runtimeDefaults), 'NODE_ENV', 'BURNINGSPACE_ALLOWED_ORIGINS', 'VITE_BURNINGSPACE_SERVER_URL', 'BURNINGSPACE_TRUSTED_EDGE_PEERS', 'BURNINGSPACE_DB_NAME', 'BURNINGSPACE_DB_ADMIN_USER']);
  requireRollout(p.schemaVersion === 3 && p.deploymentProfile === 'persistent-public-arena' && p.environmentClass === 'staging' &&
    p.worldSlug === 'public-arena' && p.expectedSchemaVersion === 1 && p.expectedDomainVersion === 1 &&
    p.recoveryMode === 'stop-and-preserve' && p.publicProductionLaunchAuthorized === false, 'PROFILE');
  keys(object(p.migrationAuthority), Object.keys(MIGRATION_AUTHORITY));
  requireRollout(Object.entries(MIGRATION_AUTHORITY).every(([k, v]) => object(p.migrationAuthority)[k] === v), 'MIGRATION_AUTHORITY');
  for (const [key, field] of Object.entries(bindings)) requireRollout(env[key] === String(p[field]), 'ENV_BINDING');
  for (const [key, value] of Object.entries(runtimeDefaults)) requireRollout(env[key] === value, 'RUNTIME_LIMIT');
  requireRollout(env.NODE_ENV === 'production' && env.BURNINGSPACE_DB_NAME === 'burningspace' && env.BURNINGSPACE_DB_ADMIN_USER === 'burningspace_admin', 'ENV_CONSTANT');
  for (const origin of [p.publicClientOrigin, p.publicServerOrigin]) {
    let url: URL; try { url = new URL(origin); } catch { throw new RolloutError('ORIGIN'); }
    requireRollout(url.origin === origin && url.protocol === 'https:' && !url.username && !url.password &&
      (mode === 'template' || !url.hostname.endsWith('.invalid')), 'ORIGIN');
  }
  requireRollout(p.publicClientOrigin !== p.publicServerOrigin && Array.isArray(p.allowedOrigins) && p.allowedOrigins.length === 1 &&
    p.allowedOrigins[0] === p.publicClientOrigin && env.BURNINGSPACE_ALLOWED_ORIGINS === p.publicClientOrigin && env.VITE_BURNINGSPACE_SERVER_URL === p.publicServerOrigin, 'ALLOWLIST');
  requireRollout(p.serverBindHost === '127.0.0.1' && p.clientBindHost === '127.0.0.1' && p.serverBindPort !== p.clientBindPort &&
    [p.serverBindPort, p.clientBindPort].every(n => Number.isInteger(n) && n > 0 && n <= 65535), 'BIND');
  requireRollout(/^[a-z0-9][a-z0-9-]{2,63}$/u.test(p.environmentId) && /^[a-f0-9]{40}$/u.test(p.targetCommit), 'IDENTITY');
  for (const image of [p.targetServerImage, p.targetClientImage, p.persistenceToolsImage]) {
    requireRollout(typeof image === 'string' && /^[a-z0-9./_-]+@sha256:[a-f0-9]{64}$/u.test(image) &&
      (mode === 'template' || (!image.includes('.invalid/') && !/([a-f0-9])\1{63}$/u.test(image))), 'IMAGE');
  }
  requireRollout(p.postgresImage === POSTGRES_IMAGE, 'POSTGRES_IMAGE');
  requireRollout(typeof p.edgeConfigId === 'string' && /^[a-zA-Z0-9._/-]{3,160}$/u.test(p.edgeConfigId) &&
    typeof p.deploymentGoReference === 'string' && /^[a-zA-Z0-9._:/-]{3,200}$/u.test(p.deploymentGoReference), 'REFERENCE');
  requireRollout(p.externalExecutionAuthorized === (mode === 'phase-b'), 'AUTHORIZATION');
  if (mode !== 'template') {
    requireRollout(!/^([a-f0-9])\1{39}$/u.test(p.targetCommit) && !p.edgeConfigId.endsWith('.invalid'), 'PLACEHOLDER');
    const peers = env.BURNINGSPACE_TRUSTED_EDGE_PEERS!.split(',');
    requireRollout(peers.length >= 1 && peers.length <= 4 && peers.every(x => isIP(x) !== 0) && new Set(peers).size === peers.length, 'TRUSTED_PEER');
  }
  if (mode === 'phase-b') requireRollout(p.deploymentGoReference !== 'NOT-AUTHORIZED' && !p.deploymentGoReference.endsWith('.invalid'), 'GO_REQUIRED');
  validatePersistentCompose(model, p, env, mode === 'template', deploymentRoot);
  return p;
}

function networks(s: Obj): string { return Object.keys(object(s.networks)).sort().join(','); }
function hardening(s: Obj, cpu: number, mem: number, readonly: boolean): void {
  const allowed = ['image', 'cpus', 'mem_limit', 'logging', 'environment', 'ports', 'networks', 'init', 'read_only', 'tmpfs', 'restart', 'stop_grace_period', 'healthcheck', 'volumes', 'privileged', 'entrypoint', 'command'];
  requireRollout(Object.keys(s).every(k => allowed.includes(k)), 'COMPOSE_FIELD');
  for (const forbidden of ['build', 'privileged', 'network_mode', 'pid', 'ipc', 'devices', 'cap_add', 'container_name', 'volumes_from', 'entrypoint', 'command', 'env_file', 'secrets', 'configs']) {
    requireRollout(s[forbidden] === undefined || (['entrypoint', 'command'].includes(forbidden) && s[forbidden] === null) || (forbidden === 'privileged' && s[forbidden] === false), 'COMPOSE_ESCAPE');
  }
  requireRollout(Number(s.cpus) === cpu && Number(s.mem_limit) === mem && s.logging?.driver === 'json-file' &&
    s.logging.options?.['max-size'] === '10m' && String(s.logging.options?.['max-file']) === '3', 'COMPOSE_LIMITS');
  if (readonly) requireRollout(s.read_only === true && s.init === true && JSON.stringify(s.tmpfs) === '["/tmp"]', 'COMPOSE_HARDENING');
}
export function validatePersistentCompose(raw: unknown, p: PersistentPlan, inventory: Record<string, string>, template: boolean, deploymentRoot = resolve('deploy')): void {
  const m = object(raw); const services = object(m.services); const nets = object(m.networks);
  requireRollout(m.name === 'burningspace-staging', 'COMPOSE_PROJECT');
  if (services['persistence-tools']) validateToolsCompose(object(services['persistence-tools']), p);
  keys(services, services['persistence-tools'] ? ['client', 'server', 'postgres', 'persistence-tools'] : ['client', 'server', 'postgres']); keys(nets, ['burningspace', 'burningspace_db']);
  for (const n of Object.keys(nets)) requireRollout(nets[n].name === `burningspace-staging_${n}` && nets[n].driver === 'bridge' && nets[n].external !== true && (n !== 'burningspace_db' || nets[n].internal === true), 'COMPOSE_NETWORK');
  const volume = object(m.volumes); keys(volume, ['burningspace-db-data']);
  requireRollout(volume['burningspace-db-data'].name === 'burningspace-staging_burningspace-db-data' && !volume['burningspace-db-data'].external && !volume['burningspace-db-data'].driver_opts, 'COMPOSE_VOLUME');
  for (const name of ['server', 'client'] as const) {
    const s = object(services[name]); hardening(s, name === 'server' ? 1 : .25, name === 'server' ? 1024 ** 3 : 256 * 1024 ** 2, true);
    requireRollout(s.image === (name === 'server' ? p.targetServerImage : p.targetClientImage) && !s.depends_on && (!s.volumes || s.volumes.length === 0) &&
      networks(s) === (name === 'server' ? 'burningspace,burningspace_db' : 'burningspace'), 'COMPOSE_RUNTIME');
    requireRollout(s.ports?.length === 1 && s.ports[0].host_ip === '127.0.0.1' && Number(s.ports[0].published) === (name === 'server' ? p.serverBindPort : p.clientBindPort) &&
      s.ports[0].target === (name === 'server' ? 2567 : 8080) && s.ports[0].protocol === 'tcp', 'COMPOSE_PORT');
  }
  requireRollout(!services.client.environment || Object.keys(services.client.environment).length === 0, 'CLIENT_ENV');
  const server = object(services.server.environment);
  keys(server, ['NODE_ENV', 'PORT', 'BURNINGSPACE_ALLOWED_ORIGINS', 'BURNINGSPACE_TRUSTED_EDGE_PEERS', 'BURNINGSPACE_EDGE_ASSERTION_SECRET', 'DATABASE_URL', 'BURNINGSPACE_WORLD_SLUG', ...Object.keys(runtimeDefaults)]);
  for (const k of ['NODE_ENV', 'BURNINGSPACE_ALLOWED_ORIGINS', 'BURNINGSPACE_TRUSTED_EDGE_PEERS', 'BURNINGSPACE_WORLD_SLUG', ...Object.keys(runtimeDefaults)]) requireRollout(server[k] === inventory[k], 'EFFECTIVE_ENV');
  requireRollout(server.PORT === '2567', 'EFFECTIVE_ENV');
  const pg = object(services.postgres); hardening(pg, 1, 1024 ** 3, false);
  requireRollout(pg.image === p.postgresImage && networks(pg) === 'burningspace_db' && (!pg.ports || pg.ports.length === 0) && !pg.depends_on, 'COMPOSE_DB');
  requireRollout(pg.volumes?.length === 2 && pg.volumes.some((v: Obj) => v.type === 'volume' && v.source === 'burningspace-db-data' && v.target === '/var/lib/postgresql/data' && !v.read_only) &&
    pg.volumes.some((v: Obj) => v.type === 'bind' && resolve(v.source) === resolve(deploymentRoot, 'postgres/init/001-burningspace-roles.sh') && v.target === '/docker-entrypoint-initdb.d/001-burningspace-roles.sh' && v.read_only === true), 'COMPOSE_DB_MOUNT');
  const e = object(pg.environment); keys(e, ['POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'BURNINGSPACE_MIGRATOR_PASSWORD', 'BURNINGSPACE_RUNTIME_PASSWORD', 'BURNINGSPACE_BACKUP_PASSWORD']);
  requireRollout(e.POSTGRES_DB === inventory.BURNINGSPACE_DB_NAME && e.POSTGRES_USER === inventory.BURNINGSPACE_DB_ADMIN_USER, 'EFFECTIVE_DB');
  if (!template) {
    validateProjection('bootstrap', { BURNINGSPACE_DB_ADMIN_PASSWORD: e.POSTGRES_PASSWORD, BURNINGSPACE_DB_MIGRATOR_PASSWORD: e.BURNINGSPACE_MIGRATOR_PASSWORD, BURNINGSPACE_DB_RUNTIME_PASSWORD: e.BURNINGSPACE_RUNTIME_PASSWORD, BURNINGSPACE_DB_BACKUP_PASSWORD: e.BURNINGSPACE_BACKUP_PASSWORD });
    validateProjection('runtime', { BURNINGSPACE_DATABASE_URL: server.DATABASE_URL, BURNINGSPACE_EDGE_ASSERTION_SECRET: server.BURNINGSPACE_EDGE_ASSERTION_SECRET });
    requireRollout(decodeURIComponent(new URL(server.DATABASE_URL).password) === e.BURNINGSPACE_RUNTIME_PASSWORD, 'PRIVATE_CONFLICT');
  }
}

function validateToolsCompose(s: Obj, p: PersistentPlan): void {
  const allowed = ['image', 'profiles', 'networks', 'user', 'init', 'read_only', 'tmpfs', 'cap_drop', 'security_opt', 'cpus', 'mem_limit', 'pids_limit', 'restart', 'logging', 'volumes', 'command', 'entrypoint'];
  requireRollout(Object.keys(s).every(k => allowed.includes(k)) && s.image === p.persistenceToolsImage && networks(s) === 'burningspace_db' &&
    s.user === '1000:1000' && s.init === true && s.read_only === true && JSON.stringify(s.tmpfs) === '["/tmp"]' &&
    JSON.stringify(s.cap_drop) === '["ALL"]' && JSON.stringify(s.security_opt) === '["no-new-privileges:true"]' &&
    s.command == null && s.entrypoint == null && Number(s.cpus) === 1 && Number(s.mem_limit) === 512 * 1024 ** 2 && s.pids_limit === 64 && s.restart === 'no' &&
    s.logging?.driver === 'json-file' && s.logging.options?.['max-size'] === '10m' && String(s.logging.options?.['max-file']) === '3', 'TOOLS_MODEL');
  requireRollout(s.volumes?.length === 2, 'TOOLS_MOUNT');
  for (const target of ['/run/private', '/work']) {
    const mount = s.volumes.find((v: Obj) => v.target === target);
    requireRollout(mount?.type === 'bind' && typeof mount.source === 'string' && mount.source.length > 5 &&
      !/(docker\.sock|\.git)(\/|$)/u.test(mount.source) && resolve(mount.source) !== resolve('.') &&
      mount.bind?.create_host_path !== true && (target !== '/run/private' || mount.read_only === true), 'TOOLS_MOUNT');
  }
}
