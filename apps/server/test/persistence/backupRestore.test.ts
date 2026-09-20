import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { prepareRehearsal, assertRehearsalDatabase } from '../../scripts/restore-target.js';
import { join, resolve as resolvePath } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ProfileClientMessages,
  ProfileServerMessages,
  type ProfileAcceptedMessage
} from '@burningspace/protocol';
import { startProductionServer, type ProductionServerHandle } from '../../src/index.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { bootstrapWorld } from '../../src/persistence/repositories/worldsRepository.js';
import { revokeCredential } from '../../src/persistence/repositories/credentialsRepository.js';
import { performQuiescedBackup, type BackupManifest } from '../../scripts/backup-dump.js';
import { restoreAndVerify, verifyDumpIntegrity } from '../../scripts/backup-restore-verify.js';
import { PersistenceToolError, runPsqlFile } from '../../scripts/persistence-tooling.js';
import {
  startRoleSeparatedPostgres,
  withDirectConnection,
  type RoleSeparatedPostgres
} from '../support/testPersistenceDatabase.js';
import { createTestGuestIdentity, joinCanonicalBattleRoom } from '../support/testIdentityHelper.js';

const TEST_TIMEOUT_MS = 120_000;
const REPO_ROOT = resolvePath(process.cwd());
const GRANTS_SQL_PATH = resolvePath(REPO_ROOT, 'deploy/postgres/apply-runtime-grants.sql');

async function rehearsal(source: RoleSeparatedPostgres): Promise<RoleSeparatedPostgres> {
  const name = `bs_rehearsal_${randomBytes(12).toString('hex')}`;
  await prepareRehearsal(source.adminUrl, name, 'burningspace');
  const targetUrl = (value: string) => { const url = new URL(value); url.pathname = `/${name}`; return url.toString(); };
  return { ...source, migratorUrl: targetUrl(source.migratorUrl), runtimeUrl: targetUrl(source.runtimeUrl), backupUrl: targetUrl(source.backupUrl), stop: async () => {} };
}

const PM2_TELEMETRY_FILTER_MARKER = Symbol.for(
  'burningspace.test.pm2-telemetry-worker-filter'
);

function isPm2TelemetryMessage(message: unknown): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof message.type === 'string' &&
    message.type.startsWith('axm:')
  );
}

/**
 * Colyseus loads process-global @pm2/io metrics with an unref'd timer that
 * outlives Server.gracefullyShutdown(); a later metrics tick can otherwise
 * reach Vitest's fork IPC and crash the worker. Same filter as
 * startProductionBattleServer.ts (duplicated here since that file is out of
 * this packet's scope and does not export it) -- this test boots
 * startProductionServer directly rather than through that helper.
 */
function installPm2TelemetryFilterForWorkerIpc(): void {
  const workerSend = process.send;

  if (
    !workerSend ||
    Reflect.get(workerSend, PM2_TELEMETRY_FILTER_MARKER) === true
  ) {
    return;
  }

  const filteredSend = ((message: unknown, ...args: unknown[]): boolean => {
    if (isPm2TelemetryMessage(message)) {
      return true;
    }

    return Reflect.apply(workerSend, process, [message, ...args]) as boolean;
  }) as typeof process.send;

  Reflect.defineProperty(filteredSend, PM2_TELEMETRY_FILTER_MARKER, {
    value: true
  });
  process.send = filteredSend;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(condition: () => boolean, label: string, timeoutMs = 10_000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (condition()) {
      return;
    }

    await delay(25);
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}.`);
}

interface LeaseStatusRow {
  readonly status: string;
  readonly lease_id: string;
}

async function queryLeaseStatus(url: string, worldId: string, playerId: string): Promise<LeaseStatusRow | undefined> {
  return withDirectConnection(url, async (client) => {
    const result = await client.query<LeaseStatusRow>(
      'SELECT status, lease_id FROM active_session_leases WHERE world_id = $1 AND player_id = $2',
      [worldId, playerId]
    );
    return result.rows[0];
  });
}

installPm2TelemetryFilterForWorkerIpc();

describe('backup / restore end-to-end (real Docker, real PostgreSQL, real pg_dump/pg_restore)', () => {
  let source: RoleSeparatedPostgres | undefined;
  let target: RoleSeparatedPostgres | undefined;
  let sourceServer: ProductionServerHandle | undefined;
  let targetServer: ProductionServerHandle | undefined;
  let workDir: string | undefined;

  it('refuses correctly named rehearsal cleanup and verification on marker, owner and CONNECT violations', async () => {
    source = await startRoleSeparatedPostgres();
    const name = `bs_rehearsal_${randomBytes(12).toString('hex')}`;
    await prepareRehearsal(source.adminUrl, name, 'burningspace');
    const targetAdmin = new URL(source.adminUrl); targetAdmin.pathname = `/${name}`;
    const verify = () => withDirectConnection(targetAdmin.toString(), client => assertRehearsalDatabase(client, name, 'burningspace', true));
    const sql = (query: string) => withDirectConnection(source!.adminUrl, client => client.query(query));
    const reset = async () => {
      await sql(`ALTER DATABASE "${name}" OWNER TO burningspace_migrator`);
      await sql(`REVOKE ALL ON DATABASE "${name}" FROM PUBLIC, burningspace_runtime, burningspace_backup`);
      await sql(`COMMENT ON DATABASE "${name}" IS 'burningspace:restore-rehearsal:burningspace:${name}'`);
    };
    await expect(verify()).resolves.toBeUndefined();
    for (const mutation of [
      `COMMENT ON DATABASE "${name}" IS NULL`,
      `COMMENT ON DATABASE "${name}" IS 'wrong-marker'`,
      `ALTER DATABASE "${name}" OWNER TO burningspace_admin`,
      `GRANT CONNECT ON DATABASE "${name}" TO burningspace_runtime`,
      `GRANT CONNECT ON DATABASE "${name}" TO PUBLIC`
    ]) {
      await sql(mutation);
      await expect(verify()).rejects.toMatchObject({ code: 'RESTORE_ISOLATION' });
      await expect(prepareRehearsal(source.adminUrl, name, 'burningspace', true)).rejects.toMatchObject({ code: 'RESTORE_ISOLATION' });
      expect((await sql(`SELECT datname FROM pg_database WHERE datname='${name}'`)).rowCount).toBe(1);
      await reset();
      // Name, database, freshness and all other guards pass for this same target.
      await expect(verify()).resolves.toBeUndefined();
    }
    await prepareRehearsal(source.adminUrl, name, 'burningspace', true);
    expect((await sql(`SELECT datname FROM pg_database WHERE datname='${name}'`)).rowCount).toBe(0);
  }, TEST_TIMEOUT_MS);

  afterEach(async () => {
    await targetServer?.shutdown('SIGTERM').catch(() => undefined);
    await sourceServer?.shutdown('SIGTERM').catch(() => undefined);
    await source?.stop().catch(() => undefined);
    await target?.stop().catch(() => undefined);
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
    targetServer = undefined;
    sourceServer = undefined;
    source = undefined;
    target = undefined;
    workDir = undefined;
  }, TEST_TIMEOUT_MS);

  it(
    'creates a quiesced backup, restores it, and recovers durable identity/faction/revocation while stale operational state is not authoritative',
    async () => {
      // 1. Source: role-separated PostgreSQL, migrated, bootstrapped, grants applied.
      source = await startRoleSeparatedPostgres();
      await runMigrations(source.migratorUrl);
      const bootstrap = await withDirectConnection(source.migratorUrl, (client) => bootstrapWorld(client, 'public-arena'));
      workDir = await mkdtemp(join(tmpdir(), 'bs-backup-restore-'));
      const grantsSqlWorkPath = join(workDir, 'apply-runtime-grants.sql');
      await writeFile(grantsSqlWorkPath, await readFile(GRANTS_SQL_PATH, 'utf8'), 'utf8');
      await runPsqlFile({ targetUrl: source.migratorUrl, sqlPath: grantsSqlWorkPath });

      // 2. Actual Packet-6 production server, using the RESTRICTED runtime role.
      sourceServer = await startProductionServer({
        environment: { NODE_ENV: 'test', DATABASE_URL: source.runtimeUrl },
        port: 0,
        hostname: '127.0.0.1',
        registerSignalHandlers: false,
        exitOnAuthorityLoss: false
      });

      // 3. Durable guest #1: retained, active credential, faction assigned,
      // a real gameplay lease acquired -- this becomes the "stale
      // operational lease belonging to an obsolete writer epoch" fixture
      // once the target server claims a NEW epoch after restore.
      const retained = await createTestGuestIdentity(sourceServer.url);
      const room1 = await joinCanonicalBattleRoom(sourceServer.url, retained.credential);
      const accepted1: ProfileAcceptedMessage[] = [];
      room1.onMessage<ProfileAcceptedMessage>(ProfileServerMessages.PROFILE_ACCEPTED, (message) => accepted1.push(message));
      room1.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Retained', mode: 'player', faction: 'red' });
      await waitFor(() => accepted1.length === 1, 'retained guest profile acceptance');

      const staleLeaseBefore = await queryLeaseStatus(source.runtimeUrl, bootstrap.world.worldId, retained.playerId);
      expect(staleLeaseBefore).toBeDefined();
      expect(staleLeaseBefore?.status).not.toBe('released');

      // 4. Durable guest #2: revoked credential fixture.
      const revoked = await createTestGuestIdentity(sourceServer.url);
      const revokedCredentialId = await withDirectConnection(source.runtimeUrl, async (client) => {
        const result = await client.query<{ credential_id: string }>(
          'SELECT credential_id FROM player_credentials WHERE player_id = $1',
          [revoked.playerId]
        );
        return result.rows[0]!.credential_id;
      });
      await withDirectConnection(source.runtimeUrl, (client) => revokeCredential(client, revoked.playerId, revokedCredentialId));

      // 5. Quiesce: stop the application server entirely (releases the
      // writer claim; the gameplay lease above is left exactly as the
      // shutdown sequence found it -- genuine pre-existing operational
      // state, not fabricated).
      await sourceServer.shutdown('SIGTERM');
      sourceServer = undefined;

      // 6. Real quiesced backup: fence via migrator, dump via backup role.
      const { manifest, dumpPath, manifestPath } = await performQuiescedBackup({
        fenceUrl: source.migratorUrl,
        dumpUrl: source.backupUrl,
        worldSlug: 'public-arena',
        outputDir: workDir,
        dumpFilename: 'backup.dump'
      });

      expect(manifest.world.worldId).toBe(bootstrap.world.worldId);
      expect(manifest.backupMode).toBe('quiesced-exported-snapshot');

      // 7. Verify dump SHA-256 explicitly before any restore.
      const verifiedManifest: BackupManifest = await verifyDumpIntegrity(dumpPath, manifestPath);
      expect(verifiedManifest.dumpSha256).toBe(manifest.dumpSha256);

      // 8. Fresh marked non-serving database in the same cluster.
      target = await rehearsal(source);

      // 9. Restore + generic verification (schema/counts/world identity/FKs/constraints).
      const restoreResult = await restoreAndVerify({
        dumpPath,
        manifestPath,
        targetMigratorUrl: target.migratorUrl,
        sourceDatabase: 'burningspace',
        grantsSqlPath: grantsSqlWorkPath
      });
      expect(restoreResult.world.worldId).toBe(bootstrap.world.worldId);
      expect(restoreResult.schemaMigrations.checksumsMatch).toBe(true);
      expect(restoreResult.foreignKeyConsistency).toBe(true);
      expect(restoreResult.expectedConstraintsPresent).toBe(true);

      await expect(restoreAndVerify({ dumpPath, manifestPath, targetMigratorUrl: target.migratorUrl, sourceDatabase: 'burningspace', grantsSqlPath: grantsSqlWorkPath })).rejects.toThrow();
      await expect(restoreAndVerify({ dumpPath, manifestPath, targetMigratorUrl: source.migratorUrl, sourceDatabase: 'burningspace', grantsSqlPath: grantsSqlWorkPath })).rejects.toThrow();
      // Test-only promotion in this disposable cluster to preserve the historical
      // credential recovery integration proof. Real rehearsal never grants this.
      await withDirectConnection(source.adminUrl, c => c.query(`GRANT CONNECT ON DATABASE "${new URL(target!.runtimeUrl).pathname.slice(1)}" TO burningspace_runtime`));

      // 10. Boot an ACTUAL Packet-6 production server against the restored DB.
      targetServer = await startProductionServer({
        environment: { NODE_ENV: 'test', DATABASE_URL: target.runtimeUrl },
        port: 0,
        hostname: '127.0.0.1',
        registerSignalHandlers: false,
        exitOnAuthorityLoss: false
      });

      // New process identity; canonical world UUID unchanged; new,
      // strictly higher writer epoch (a legitimate takeover, not a
      // same-process reconnect).
      expect(targetServer.persistence.worldId).toBe(bootstrap.world.worldId);
      expect(targetServer.persistence.writerEpoch).toBeGreaterThan(1n);

      // 11. Stale old operational lease MUST NOT remain authoritative: the
      // new epoch claim's own cleanup (Packet 3, already proven in Packet
      // 6) must have released it, now connected to REAL restored data.
      const staleLeaseAfter = await queryLeaseStatus(target.runtimeUrl, bootstrap.world.worldId, retained.playerId);
      expect(staleLeaseAfter?.status).toBe('released');

      // 12. Same durable player/world/faction recovered -- verified
      // directly against restored canonical state using the ORIGINAL
      // durable playerId captured before backup.
      const restoredMembership = await withDirectConnection(target.runtimeUrl, async (client) => {
        const result = await client.query<{ faction: string | null }>(
          'SELECT faction FROM world_memberships WHERE world_id = $1 AND player_id = $2',
          [bootstrap.world.worldId, retained.playerId]
        );
        return result.rows[0]?.faction;
      });
      expect(restoredMembership).toBe('red');

      // 13. The retained active credential authenticates fresh, recovers
      // the same faction idempotently, and gets a NEW lease/session.
      const room1Fresh = await joinCanonicalBattleRoom(targetServer.url, retained.credential);
      const acceptedFresh: ProfileAcceptedMessage[] = [];
      room1Fresh.onMessage<ProfileAcceptedMessage>(ProfileServerMessages.PROFILE_ACCEPTED, (message) =>
        acceptedFresh.push(message)
      );
      room1Fresh.send(ProfileClientMessages.SET_PROFILE, { nickname: 'Recovered', mode: 'player', faction: 'red' });
      await waitFor(() => acceptedFresh.length === 1, 'recovered guest profile acceptance');
      expect(acceptedFresh[0]?.faction).toBe('red');

      const freshLease = await queryLeaseStatus(target.runtimeUrl, bootstrap.world.worldId, retained.playerId);
      expect(freshLease?.status).toBe('active');
      expect(freshLease?.lease_id).not.toBe(staleLeaseBefore?.lease_id);

      await room1Fresh.leave(true).catch(() => undefined);

      // 14. The revoked credential is still rejected identically after restore.
      await expect(joinCanonicalBattleRoom(targetServer.url, revoked.credential)).rejects.toThrow('identity_rejected');
    },
    TEST_TIMEOUT_MS
  );

  it(
    'a single corrupted byte in the dump fails SHA-256 verification before any restore is attempted',
    async () => {
      source = await startRoleSeparatedPostgres();
      await runMigrations(source.migratorUrl);
      await withDirectConnection(source.migratorUrl, (client) => bootstrapWorld(client, 'public-arena'));
      workDir = await mkdtemp(join(tmpdir(), 'bs-backup-corrupt-'));
      const grantsSqlWorkPath = join(workDir, 'apply-runtime-grants.sql');
      await writeFile(grantsSqlWorkPath, await readFile(GRANTS_SQL_PATH, 'utf8'), 'utf8');
      await runPsqlFile({ targetUrl: source.migratorUrl, sqlPath: grantsSqlWorkPath });

      const { dumpPath, manifestPath } = await performQuiescedBackup({
        fenceUrl: source.migratorUrl,
        dumpUrl: source.backupUrl,
        worldSlug: 'public-arena',
        outputDir: workDir,
        dumpFilename: 'backup.dump'
      });

      const originalBytes = await readFile(dumpPath);
      const corruptedBytes = Buffer.from(originalBytes);
      corruptedBytes[100] = corruptedBytes[100]! ^ 0xff;
      await writeFile(dumpPath, corruptedBytes);

      target = await startRoleSeparatedPostgres();

      await expect(
        restoreAndVerify({
          dumpPath,
          manifestPath,
          targetMigratorUrl: target.migratorUrl,
          sourceDatabase: 'burningspace',
          grantsSqlPath: grantsSqlWorkPath
        })
      ).rejects.toThrow(PersistenceToolError);

      // The target database must remain untouched by any restore attempt --
      // no schema was ever created because integrity failed first.
      const tableExists = await withDirectConnection(target.migratorUrl, async (client) => {
        const result = await client.query<{ reg: string | null }>("SELECT to_regclass('public.worlds') AS reg");
        return result.rows[0]?.reg !== null;
      });
      expect(tableExists).toBe(false);
    },
    TEST_TIMEOUT_MS
  );

  it('fails closed on altered authority, world state, counts and credential evidence without changing source', async () => {
    source = await startRoleSeparatedPostgres();
    await runMigrations(source.migratorUrl);
    await withDirectConnection(source.migratorUrl, c => bootstrapWorld(c, 'public-arena'));
    workDir = await mkdtemp(join(tmpdir(), 'bs-restore-negative-'));
    const grants = join(workDir, 'grants.sql');
    await writeFile(grants, await readFile(GRANTS_SQL_PATH));
    await runPsqlFile({ targetUrl: source.migratorUrl, sqlPath: grants });
    const backup = await performQuiescedBackup({ fenceUrl: source.migratorUrl, dumpUrl: source.backupUrl, worldSlug: 'public-arena', outputDir: workDir, dumpFilename: 'negative.dump' });
    const mutations = [
      (m: any) => { m.migration.migrations[0].checksumHex = '0'.repeat(64); },
      (m: any) => { m.world.domainVersion = 2; },
      (m: any) => { m.world.worldId = '00000000-0000-4000-8000-000000000000'; },
      (m: any) => { m.world.stateRevision = '99'; },
      (m: any) => { m.counts.players += 1; },
      (m: any) => { m.credentialState.revoked += 1; }
    ];
    for (const mutate of mutations) {
      target = await rehearsal(source);
      const changed = structuredClone(backup.manifest); mutate(changed);
      await writeFile(backup.manifestPath, JSON.stringify(changed));
      await expect(restoreAndVerify({ dumpPath: backup.dumpPath, manifestPath: backup.manifestPath, targetMigratorUrl: target.migratorUrl, sourceDatabase: 'burningspace', grantsSqlPath: grants })).rejects.toThrow();
      await prepareRehearsal(source.adminUrl, new URL(target.migratorUrl).pathname.slice(1), 'burningspace', true);
    }
    expect((await withDirectConnection(source.migratorUrl, c => c.query('SELECT state_revision, domain_version FROM worlds'))).rows).toEqual([{ state_revision: '0', domain_version: 1 }]);
    // A canonical ledger alone is insufficient: a missing constraint must fail.
    await withDirectConnection(source.migratorUrl, c => c.query('ALTER TABLE worlds DROP CONSTRAINT worlds_world_slug_unique'));
    const damaged = await performQuiescedBackup({ fenceUrl: source.migratorUrl, dumpUrl: source.backupUrl, worldSlug: 'public-arena', outputDir: workDir, dumpFilename: 'constraint.dump' });
    target = await rehearsal(source);
    await expect(restoreAndVerify({ dumpPath: damaged.dumpPath, manifestPath: damaged.manifestPath, targetMigratorUrl: target.migratorUrl, sourceDatabase: 'burningspace', grantsSqlPath: grants })).rejects.toThrow('expected constraint');
  }, TEST_TIMEOUT_MS);
});
