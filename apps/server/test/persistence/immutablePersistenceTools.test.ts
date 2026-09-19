import { randomBytes } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { runCommand, POSTGRES_17_IMAGE } from '../../scripts/persistence-tooling.js';

const image = process.env.BURNINGSPACE_TEST_TOOLS_IMAGE;
it.skipIf(!image)('runs immutable native operations, same-cluster isolated restore, safe cleanup and secret canaries', async () => {
  const id = `bs-rollout-${randomBytes(6).toString('hex')}`;
  const dir = await mkdtemp(join(tmpdir(), `${id}-`));
  const secrets = Object.fromEntries(['admin', 'migrator', 'runtime', 'backup'].map(k => [k, randomBytes(32).toString('hex')]));
  const url = (role: string, db = 'burningspace') => `postgres://burningspace_${role}:${secrets[role]}@postgres:5432/${db}`;
  const invoke = async (args: string[], input?: string) => {
    const result = await runCommand('docker', args, { input });
    for (const secret of Object.values(secrets)) expect(result.stdout + result.stderr).not.toContain(secret);
    return result;
  };
  const checked = async (args: string[], input?: string) => { const r = await invoke(args, input); expect(r.exitCode, r.stderr + r.stdout).toBe(0); return r; };
  const target = `bs_rehearsal_${randomBytes(12).toString('hex')}`;
  const wrapper = `import {writeFile} from 'node:fs/promises';
    import {runOperation} from '/app/ops/apps/server/scripts/persistence-operator.js';
    let text=''; for await (const chunk of process.stdin) text+=chunk;
    const {operation,target,files}=JSON.parse(text);
    for(const [name,value] of Object.entries(files)) await writeFile('/run/private/'+name+'.env',value,{flag:'wx',mode:0o600});
    try { console.log(JSON.stringify({ok:true,...await runOperation(operation,target)})); }
    catch { console.log(JSON.stringify({ok:false,code:'OPERATION_REJECTED'})); process.exitCode=1; }`;
  const op = (operation: string, files: Record<string, string>, name?: string) => invoke(['run', '--rm', '-i', '--network', id, '--read-only', '--tmpfs', '/tmp', '--tmpfs', '/run/private:uid=1000,gid=1000,mode=0700', '-v', `${id}:/work`, '--entrypoint', 'node', image!, '--input-type=module', '-e', wrapper], JSON.stringify({ operation, target: name, files }));
  const migrator = { migrator: `BURNINGSPACE_MIGRATION_DATABASE_URL=${url('migrator')}` };
  const admin = { admin: `BURNINGSPACE_ADMIN_DATABASE_URL=${url('admin')}` };
  const backup = { backup: `BURNINGSPACE_BACKUP_DATABASE_URL=${url('backup')}` };
  try {
    await checked(['network', 'create', '--internal', id]);
    await checked(['volume', 'create', id]);
    await writeFile(join(dir, 'bootstrap.env'), `POSTGRES_DB=burningspace\nPOSTGRES_USER=burningspace_admin\nPOSTGRES_PASSWORD=${secrets.admin}\nBURNINGSPACE_MIGRATOR_PASSWORD=${secrets.migrator}\nBURNINGSPACE_RUNTIME_PASSWORD=${secrets.runtime}\nBURNINGSPACE_BACKUP_PASSWORD=${secrets.backup}\n`, { mode: 0o600 });
    await checked(['run', '-d', '--name', id, '--network', id, '--network-alias', 'postgres', '--tmpfs', '/var/lib/postgresql/data', '--env-file', join(dir, 'bootstrap.env'), '-v', `${resolve('deploy/postgres/init/001-burningspace-roles.sh')}:/docker-entrypoint-initdb.d/001-burningspace-roles.sh:ro`, POSTGRES_17_IMAGE]);
    let ready = false;
    for (let i = 0; i < 30; i++) { const r = await invoke(['exec', id, 'pg_isready', '-U', 'burningspace_admin', '-d', 'burningspace']); if (!r.exitCode) { ready = true; break; } await new Promise(r => setTimeout(r, 500)); }
    expect(ready).toBe(true);
    await checked(['run', '--rm', '--user', '0', '-v', `${id}:/work`, '--entrypoint', 'chown', image!, '1000:1000', '/work']);
    for (const operation of ['migrate', 'status', 'grants', 'bootstrap', 'check-migrator']) expect((await op(operation, migrator)).exitCode, operation).toBe(0);
    expect((await op('check-runtime', { 'runtime-db': `BURNINGSPACE_DATABASE_URL=${url('runtime')}` })).exitCode).toBe(0);
    expect((await op('check-backup', backup)).exitCode).toBe(0);
    expect((await op('status', { ...migrator, ...admin })).exitCode).toBe(1);
    expect((await op('backup', { ...migrator, ...backup })).exitCode).toBe(0);
    expect((await op('restore-prepare', admin, target)).exitCode).toBe(0);
    const restore = { migrator: `BURNINGSPACE_MIGRATION_DATABASE_URL=${url('migrator', target)}` };
    const result = await op('restore-verify', restore, target);
    expect(result.exitCode, result.stdout + result.stderr).toBe(0);
    expect((await op('restore-verify', restore, target)).exitCode).toBe(1);
    expect((await op('restore-cleanup', admin, 'burningspace')).exitCode).toBe(1);
    expect((await op('restore-cleanup', admin, target)).exitCode).toBe(0);
    expect((await op('status', migrator)).exitCode).toBe(0);
  } finally {
    await invoke(['rm', '-f', id]); await invoke(['volume', 'rm', id]); await invoke(['network', 'rm', id]);
    await rm(dir, { recursive: true, force: true });
  }
}, 240_000);
