import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { runMigrations, readMigrationStatus } from '../src/persistence/migrationRunner.js';
import { bootstrapWorld } from '../src/persistence/repositories/worldsRepository.js';
import { acquireAdvisorySharedLock, releaseAdvisorySharedLock, SCHEMA_MAINTENANCE_LOCK_KEY } from '../src/persistence/advisoryLocks.js';
import { validateProjection, validateConnection, requireRollout, type Projection } from './persistent-rollout-contract.js';
import { useNativePgTools, runPsqlFile, resolvePgToolMajorVersion } from './persistence-tooling.js';
import { checkRuntime, checkMigrator, checkBackup } from './db-privilege-check.js';
import { performQuiescedBackup } from './backup-dump.js';
import { restoreAndVerify } from './backup-restore-verify.js';
import { prepareRehearsal, assertRehearsalName } from './restore-target.js';
import { assertPrivateDirectory, readPrivateProjection } from './private-operator-input.js';

export const OPERATION_PROJECTIONS: Record<string, readonly Projection[]> = {
  migrate: ['migrator'], status: ['migrator'], grants: ['migrator'], bootstrap: ['migrator'],
  'check-runtime': ['runtime-db'], 'check-migrator': ['migrator'], 'check-backup': ['backup'],
  backup: ['migrator', 'backup'], 'restore-prepare': ['admin'], 'restore-verify': ['migrator'], 'restore-cleanup': ['admin']
};

export async function runOperation(operation: string, target?: string): Promise<Record<string, unknown>> {
  requireRollout(Object.hasOwn(OPERATION_PROJECTIONS, operation), 'OPERATION');
  const required = OPERATION_PROJECTIONS[operation];
  requireRollout(required && (!operation.startsWith('restore-') || target), 'OPERATION');
  requireRollout(operation.startsWith('restore-') || target === undefined, 'OPERATION_ARGUMENT');
  const source = 'burningspace';
  if (target) assertRehearsalName(target, source);
  await assertPrivateDirectory('/run/private');
  await assertPrivateDirectory('/work', operation === 'backup');
  requireRollout((await readdir('/run/private')).sort().join(',') === [...required].sort().map(x => `${x}.env`).join(','), 'OPERATION_PROJECTIONS');
  const inputs: Partial<Record<Projection, Record<string, string>>> = {};
  for (const role of required) inputs[role] = validateProjection(role, await readPrivateProjection(`/run/private/${role}.env`), operation === 'restore-verify' ? target : source);
  const migrator = inputs.migrator?.BURNINGSPACE_MIGRATION_DATABASE_URL;
  const backup = inputs.backup?.BURNINGSPACE_BACKUP_DATABASE_URL;
  const runtime = inputs['runtime-db']?.BURNINGSPACE_DATABASE_URL;
  const admin = inputs.admin?.BURNINGSPACE_ADMIN_DATABASE_URL;
  useNativePgTools();
  requireRollout(await resolvePgToolMajorVersion('pg_dump') === 17 && await resolvePgToolMajorVersion('pg_restore') === 17, 'PG_CLIENT_VERSION');
  const grants = '/app/deploy/postgres/apply-runtime-grants.sql';
  switch (operation) {
    case 'migrate': { const result = await runMigrations(migrator!); return { currentVersion: result.currentVersion }; }
    case 'status': { const result = await readMigrationStatus(migrator!); requireRollout(result.status === 'up_to_date' && result.appliedVersion === 1, 'SCHEMA_STATUS'); return { schemaVersion: 1 }; }
    case 'grants': await runPsqlFile({ targetUrl: migrator!, sqlPath: grants }); break;
    case 'bootstrap': {
      const client = new Client({ connectionString: migrator, connectionTimeoutMillis: 5000, statement_timeout: 10_000 });
      await client.connect();
      try {
        await acquireAdvisorySharedLock(client, SCHEMA_MAINTENANCE_LOCK_KEY);
        const status = await readMigrationStatus(migrator!);
        requireRollout(status.status === 'up_to_date' && status.appliedVersion === 1, 'SCHEMA_STATUS');
        const result = await bootstrapWorld(client, 'public-arena');
        return { worldId: result.world.worldId, domainVersion: result.world.domainVersion };
      } finally { await releaseAdvisorySharedLock(client, SCHEMA_MAINTENANCE_LOCK_KEY).catch(() => undefined); await client.end(); }
    }
    case 'check-runtime': case 'check-migrator': case 'check-backup': {
      const results = operation === 'check-runtime' ? await checkRuntime(runtime!) : operation === 'check-migrator' ? await checkMigrator(migrator!) : await checkBackup(backup!);
      requireRollout(results.every(x => x.ok), 'PRIVILEGE_CHECK'); return { probes: results.length };
    }
    case 'backup': {
      validateConnection(backup, 'burningspace_backup', source);
      const commit = process.env.BURNINGSPACE_TOOLS_COMMIT;
      requireRollout(commit && /^[a-f0-9]{40}$/u.test(commit), 'IMAGE_REVISION');
      const result = await performQuiescedBackup({ fenceUrl: migrator!, dumpUrl: backup!, worldSlug: 'public-arena', outputDir: '/work', dumpFilename: 'rehearsal.dump', applicationCommit: commit });
      return { dumpSha256: result.manifest.dumpSha256, applicationCommit: commit, schemaVersion: 1 };
    }
    case 'restore-prepare': await prepareRehearsal(admin!, target!, source); break;
    case 'restore-cleanup': await prepareRehearsal(admin!, target!, source, true); break;
    case 'restore-verify': {
      const result = await restoreAndVerify({ dumpPath: '/work/rehearsal.dump', manifestPath: '/work/rehearsal.dump.manifest.json', targetMigratorUrl: migrator!, sourceDatabase: source, grantsSqlPath: grants });
      return { schemaVersion: 1, domainVersion: result.world.domainVersion, worldId: result.world.worldId, counts: result.counts, constraints: true, foreignKeys: true };
    }
  }
  return {};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // The process cap also bounds DB waits; killed operations leave source recovery explicit.
  const deadline = setTimeout(() => { console.error(JSON.stringify({ ok: false, event: 'persistence_operation_failed', code: 'DEADLINE' })); process.exit(1); }, 240_000);
  const args = process.argv.slice(2);
  Promise.resolve().then(() => { requireRollout(args.length >= 1 && args.length <= 2, 'ARGUMENTS'); return runOperation(args[0]!, args[1]); })
    .then(evidence => console.log(JSON.stringify({ ok: true, event: 'persistence_operation_completed', operation: args[0], ...evidence })))
    .catch(() => { console.error(JSON.stringify({ ok: false, event: 'persistence_operation_failed', code: 'OPERATION_REJECTED' })); process.exitCode = 1; })
    .finally(() => clearTimeout(deadline));
}
