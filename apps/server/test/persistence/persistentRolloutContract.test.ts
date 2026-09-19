import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validatePersistentPlan, validateProjection, type PersistentPlan } from '../../scripts/persistent-rollout-contract.js';

function fixture() {
  const p = JSON.parse(readFileSync('deploy/external-staging-persistence-plan.example.json', 'utf8')) as PersistentPlan;
  const env = Object.fromEntries(readFileSync('deploy/external-staging-persistence.env.example', 'utf8').split(/\r?\n/u).filter(x => x && !x.startsWith('#')).map(x => [x.slice(0, x.indexOf('=')), x.slice(x.indexOf('=') + 1)]));
  const hard = { cpus: 1, mem_limit: 1024 ** 3, logging: { driver: 'json-file', options: { 'max-size': '10m', 'max-file': '3' } } };
  const serverEnv = Object.fromEntries(Object.entries(env).filter(([k]) => ['NODE_ENV', 'BURNINGSPACE_ALLOWED_ORIGINS', 'BURNINGSPACE_TRUSTED_EDGE_PEERS', 'BURNINGSPACE_WORLD_SLUG', 'BURNINGSPACE_RECONNECT_GRACE_SECONDS', 'BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS', 'BURNINGSPACE_PROFILE_RATE_BURST', 'BURNINGSPACE_PROFILE_RATE_PER_SECOND', 'BURNINGSPACE_INPUT_RATE_BURST', 'BURNINGSPACE_INPUT_RATE_PER_SECOND'].includes(k)));
  const runtime = (image: string, port: number, target: number) => ({ ...structuredClone(hard), image, read_only: true, init: true, tmpfs: ['/tmp'], networks: { burningspace: null }, ports: [{ host_ip: '127.0.0.1', published: String(port), target, protocol: 'tcp' }] });
  const m: any = { name: 'burningspace-staging', services: {
    server: { ...runtime(p.targetServerImage, p.serverBindPort, 2567), networks: { burningspace: null, burningspace_db: null }, environment: { ...serverEnv, PORT: '2567', DATABASE_URL: 'template', BURNINGSPACE_EDGE_ASSERTION_SECRET: 'none' } },
    client: { ...runtime(p.targetClientImage, p.clientBindPort, 8080), cpus: .25, mem_limit: 256 * 1024 ** 2 },
    postgres: { ...hard, image: p.postgresImage, networks: { burningspace_db: null }, environment: { POSTGRES_DB: 'burningspace', POSTGRES_USER: 'burningspace_admin', POSTGRES_PASSWORD: 'template', BURNINGSPACE_MIGRATOR_PASSWORD: 'template', BURNINGSPACE_RUNTIME_PASSWORD: 'template', BURNINGSPACE_BACKUP_PASSWORD: 'template' }, volumes: [ { type: 'volume', source: 'burningspace-db-data', target: '/var/lib/postgresql/data' }, { type: 'bind', source: '/deploy/postgres/init/001-burningspace-roles.sh', target: '/docker-entrypoint-initdb.d/001-burningspace-roles.sh', read_only: true } ] }
  }, networks: { burningspace: { name: 'burningspace-staging_burningspace', driver: 'bridge' }, burningspace_db: { name: 'burningspace-staging_burningspace_db', driver: 'bridge', internal: true } }, volumes: { 'burningspace-db-data': { name: 'burningspace-staging_burningspace-db-data' } } };
  m.services.postgres.volumes[1].source = resolve('deploy/postgres/init/001-burningspace-roles.sh');
  return { p, env, m };
}
describe('persistent rollout contract', () => {
  it('accepts only the documentation template without asserting live authorization', () => { const { p, env, m } = fixture(); expect(validatePersistentPlan(env, p, 'template', m)).toBe(p); expect(() => validatePersistentPlan(env, p, 'phase-b', m)).toThrow(); });
  it.each([
    (f: any) => { f.p.alphaNonPersistent = false; }, (f: any) => { f.p.surprise = true; },
    (f: any) => { f.p.recoveryMode = 'previous-approved-release'; }, (f: any) => { f.p.migrationAuthority.sha256 = '0'.repeat(64); },
    (f: any) => { f.env.BURNINGSPACE_DATABASE_URL = 'private'; },
    (f: any) => { f.m.services.server.environment.BURNINGSPACE_ALLOWED_ORIGINS = 'https://wrong.invalid'; },
    (f: any) => { f.m.services.server.environment.BURNINGSPACE_MIGRATION_DATABASE_URL = 'private'; },
    (f: any) => { f.m.services.server.depends_on = { postgres: {} }; },
    (f: any) => { f.m.services.postgres.ports = [{ target: 5432 }]; },
    (f: any) => { f.m.services.postgres.networks.burningspace = null; },
    (f: any) => { f.m.services.postgres.volumes[0].source = 'other'; },
    (f: any) => { f.m.services.client.volumes = [{ source: '/var/run/docker.sock' }]; },
    (f: any) => { f.m.services.server.build = '.'; }, (f: any) => { f.m.services.server.privileged = true; },
    (f: any) => { f.m.services.server.ports[0].host_ip = '0.0.0.0'; }
  ])('rejects unsafe contract/model mutation %#', mutate => { const f = fixture(); mutate(f); expect(() => validatePersistentPlan(f.env, f.p, 'template', f.m)).toThrow(); });
  it('accepts scoped generated credentials and rejects role, host, query and projection conflicts without reflecting secrets', () => {
    const secret = randomBytes(32).toString('base64url');
    const url = `postgres://burningspace_migrator:${secret}@postgres:5432/burningspace`;
    expect(validateProjection('migrator', { BURNINGSPACE_MIGRATION_DATABASE_URL: url })).toBeTruthy();
    for (const bad of [url.replace('migrator', 'admin'), url.replace('@postgres', '@public'), `${url}?password=${secret}`, url.replace(secret, 'REPLACE_WITH_GENERATED_PASSWORD'), url.replace(secret, 'burningspace_ci_migrator')]) {
      try { validateProjection('migrator', { BURNINGSPACE_MIGRATION_DATABASE_URL: bad }); throw new Error('accepted'); }
      catch (error) { expect(String(error)).toBe('Error: Persistent rollout validation failed.'); expect(String(error)).not.toContain(secret); }
    }
    expect(() => validateProjection('migrator', { BURNINGSPACE_MIGRATION_DATABASE_URL: url, DATABASE_URL: url })).toThrow();
  });
  it('binds real effective credentials and rejects shell overrides, sentinels and reused role passwords', () => {
    const f = fixture();
    f.p.targetCommit = randomBytes(20).toString('hex');
    f.env.BURNINGSPACE_TARGET_COMMIT = f.p.targetCommit;
    f.p.publicClientOrigin = f.env.BURNINGSPACE_PUBLIC_CLIENT_ORIGIN = f.env.BURNINGSPACE_ALLOWED_ORIGINS = 'https://arena.test.invalid.example';
    f.p.allowedOrigins = [f.p.publicClientOrigin];
    f.p.publicServerOrigin = f.env.BURNINGSPACE_PUBLIC_SERVER_ORIGIN = f.env.VITE_BURNINGSPACE_SERVER_URL = 'https://api.test.invalid.example';
    f.p.edgeConfigId = f.env.BURNINGSPACE_EDGE_CONFIG_ID = 'reviewed-edge-1';
    for (const [field, key] of [['targetServerImage', 'BURNINGSPACE_SERVER_IMAGE'], ['targetClientImage', 'BURNINGSPACE_CLIENT_IMAGE'], ['persistenceToolsImage', 'BURNINGSPACE_PERSISTENCE_TOOLS_IMAGE']] as const) f.p[field] = f.env[key] = `ghcr.io/example/${field.toLowerCase()}@sha256:${randomBytes(32).toString('hex')}`;
    f.m.services.server.image = f.p.targetServerImage; f.m.services.client.image = f.p.targetClientImage;
    f.env.BURNINGSPACE_TRUSTED_EDGE_PEERS = '127.0.0.1';
    const server = f.m.services.server.environment;
    server.BURNINGSPACE_ALLOWED_ORIGINS = f.p.publicClientOrigin;
    server.BURNINGSPACE_TRUSTED_EDGE_PEERS = f.env.BURNINGSPACE_TRUSTED_EDGE_PEERS;
    server.BURNINGSPACE_EDGE_ASSERTION_SECRET = randomBytes(32).toString('base64url');
    const pg = f.m.services.postgres.environment;
    for (const key of ['POSTGRES_PASSWORD', 'BURNINGSPACE_MIGRATOR_PASSWORD', 'BURNINGSPACE_RUNTIME_PASSWORD', 'BURNINGSPACE_BACKUP_PASSWORD']) pg[key] = randomBytes(32).toString('hex');
    server.DATABASE_URL = `postgres://burningspace_runtime:${pg.BURNINGSPACE_RUNTIME_PASSWORD}@postgres:5432/burningspace`;
    expect(validatePersistentPlan(f.env, f.p, 'phase-a', f.m)).toBe(f.p);
    for (const mutation of [
      (m: any) => { m.services.server.environment.BURNINGSPACE_EDGE_ASSERTION_SECRET = 'none'; },
      (m: any) => { m.services.postgres.environment.POSTGRES_PASSWORD = pg.BURNINGSPACE_RUNTIME_PASSWORD; },
      (m: any) => { m.services.server.environment.DATABASE_URL += '?sslpassword=hidden'; },
      (m: any) => { m.services.server.environment.BURNINGSPACE_INPUT_RATE_BURST = '90'; }
    ]) { const model = structuredClone(f.m); mutation(model); expect(() => validatePersistentPlan(f.env, f.p, 'phase-a', model)).toThrow(); }
  });
});
