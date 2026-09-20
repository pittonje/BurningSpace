import { Client } from 'pg';
import { requireRollout } from './persistent-rollout-contract.js';

export function assertRehearsalName(target: string, source: string): void {
  requireRollout(/^bs_rehearsal_[a-f0-9]{24}$/u.test(target) && /^[a-z][a-z0-9_]{0,62}$/u.test(source) && target !== source, 'RESTORE_TARGET');
}
const marker = (target: string, source: string) => `burningspace:restore-rehearsal:${source}:${target}`;
export async function assertRehearsalDatabase(client: Client, target: string, source: string, fresh: boolean): Promise<void> {
  assertRehearsalName(target, source);
  const result = await client.query<{ name: string; owner: string; marker: string; runtime: boolean; public_connect: boolean }>(
    `SELECT d.datname AS name, pg_get_userbyid(d.datdba) AS owner,
      shobj_description(d.oid, 'pg_database') AS marker,
      has_database_privilege('burningspace_runtime', d.oid, 'CONNECT') AS runtime,
      EXISTS (SELECT 1 FROM aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a WHERE a.grantee=0 AND a.privilege_type='CONNECT') AS public_connect
     FROM pg_database d WHERE d.datname=$1`, [target]);
  const row = result.rows[0];
  requireRollout(row?.name === target && row.owner === 'burningspace_migrator' && row.marker === marker(target, source) && !row.runtime && !row.public_connect, 'RESTORE_ISOLATION');
  if (fresh) {
    const state = await client.query<{ database: string; empty: boolean }>(`SELECT current_database() AS database,
      NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema')
      AND NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT IN ('public','information_schema')) AS empty`);
    requireRollout(state.rows[0]?.database === target && state.rows[0]?.empty, 'RESTORE_NOT_FRESH');
  }
}
export async function prepareRehearsal(adminUrl: string, target: string, source: string, cleanup = false): Promise<void> {
  assertRehearsalName(target, source);
  const client = new Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000, statement_timeout: 10_000 });
  await client.connect();
  try {
    requireRollout((await client.query('SELECT current_database() AS name')).rows[0]?.name === source, 'RESTORE_SOURCE');
    if (cleanup) {
      await assertRehearsalDatabase(client, target, source, false);
      // No FORCE: an in-use target is never silently disconnected.
      await client.query(`DROP DATABASE "${target}"`);
    } else {
      // CREATE refuses existing names. No IF NOT EXISTS, no reinitialization.
      await client.query(`CREATE DATABASE "${target}" OWNER burningspace_migrator TEMPLATE template0`);
      await client.query(`REVOKE ALL ON DATABASE "${target}" FROM PUBLIC, burningspace_runtime, burningspace_backup`);
      await client.query(`COMMENT ON DATABASE "${target}" IS '${marker(target, source)}'`);
    }
  } finally { await client.end(); }
}
