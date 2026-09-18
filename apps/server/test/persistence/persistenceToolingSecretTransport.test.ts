import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve as resolvePath } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

/**
 * PERSIST002-SEC-03 regression: pg_dump/pg_restore/psql tool invocations
 * must never place a connection password in host docker CLI argv, the
 * container's own configured command/arguments, or the tool's own argv --
 * only in a private, container-local .pgpass file supplied over stdin. This
 * mock wraps the REAL node:child_process.spawn (never replacing its
 * behavior) purely to record every call's argv and every byte written to
 * the spawned process's stdin, so the assertions below observe genuine
 * spawn/docker/tool behavior, not a simulated one.
 */
vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return {
    ...original,
    spawn: vi.fn((...args: Parameters<typeof original.spawn>) => {
      const child = original.spawn(...(args as Parameters<typeof original.spawn>));
      const stdinChunks: Buffer[] = [];
      const stdin = child.stdin;
      if (stdin) {
        const originalWrite = stdin.write.bind(stdin);
        (stdin as unknown as { write: typeof originalWrite }).write = ((chunk: unknown, ...rest: unknown[]) => {
          stdinChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
          return (originalWrite as (...writeArgs: unknown[]) => boolean)(chunk, ...rest);
        }) as typeof originalWrite;
      }
      Reflect.set(child, '__capturedStdin', stdinChunks);
      return child;
    })
  };
});

import { spawn } from 'node:child_process';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { bootstrapWorld } from '../../src/persistence/repositories/worldsRepository.js';
import { performQuiescedBackup } from '../../scripts/backup-dump.js';
import { restoreAndVerify } from '../../scripts/backup-restore-verify.js';
import { PersistenceToolError, runPsqlFile, toPasswordFreeConnection } from '../../scripts/persistence-tooling.js';
import {
  startRoleSeparatedPostgres,
  withDirectConnection,
  type RoleSeparatedPostgres
} from '../support/testPersistenceDatabase.js';

const REPO_ROOT = resolvePath(process.cwd());
const GRANTS_SQL_PATH = resolvePath(REPO_ROOT, 'deploy/postgres/apply-runtime-grants.sql');
const TEST_TIMEOUT_MS = 120_000;
/** Only persistence-tooling.ts's own three tool functions invoke docker with one of these as a trailing command token. */
const TOOL_MARKERS = ['pg_dump', 'pg_restore', 'psql', 'sh'];

interface SpawnCallRecord {
  readonly command: string;
  readonly args: readonly string[];
  readonly stdin: string;
}

/**
 * Every real `docker run ... pg_dump|pg_restore|psql|sh ...` invocation this
 * test observed, each paired with everything written to that specific
 * child's stdin. Deliberately excludes startRoleSeparatedPostgres()'s own
 * `docker run -d ... postgres:17` container-bootstrap call (which
 * legitimately carries synthetic admin/role passwords via `-e` for Postgres
 * image initialization -- a different, pre-existing test-infrastructure
 * concern, not part of PERSIST002-SEC-03's scope).
 */
function dockerToolInvocations(): SpawnCallRecord[] {
  const mockSpawn = vi.mocked(spawn);
  return mockSpawn.mock.calls
    .map((call, index): SpawnCallRecord => {
      const [command, args] = call as unknown as [string, readonly string[]];
      const child = mockSpawn.mock.results[index]?.value as { __capturedStdin?: Buffer[] } | undefined;
      const stdin = Buffer.concat(child?.__capturedStdin ?? []).toString('utf8');
      return { command, args, stdin };
    })
    .filter(
      (call) => call.command === 'docker' && call.args[0] === 'run' && call.args.some((arg) => TOOL_MARKERS.includes(arg))
    );
}

describe('toPasswordFreeConnection (PERSIST002-SEC-03 unit matrix)', () => {
  test('a plain password is stripped from the URL and placed in a wildcarded pgpass line', () => {
    const result = toPasswordFreeConnection('postgres://myuser:plainpass@127.0.0.1:5432/mydb');
    expect(result.dbUrl).toBe('postgres://myuser@127.0.0.1:5432/mydb');
    expect(result.pgpassFileContent).toBe('*:*:*:*:plainpass\n');
  });

  test('colon and backslash in the (percent-encoded) password are escaped per the libpq .pgpass format', () => {
    // %3A = ':', %5C = '\' -- decodes to the raw password p:a\ss
    const result = toPasswordFreeConnection('postgres://myuser:p%3Aa%5Css@127.0.0.1:5432/mydb');
    expect(result.dbUrl).toBe('postgres://myuser@127.0.0.1:5432/mydb');
    expect(result.pgpassFileContent).toBe('*:*:*:*:p\\:a\\\\ss\n');
  });

  test('percent-encoded special characters are decoded before being written to the pgpass line', () => {
    // %40 = '@', %3A = ':', %5C = '\' -- decodes to the raw password p@ss:w\ord
    const result = toPasswordFreeConnection('postgres://myuser:p%40ss%3Aw%5Cord@127.0.0.1:5432/mydb');
    expect(result.pgpassFileContent).toBe('*:*:*:*:p@ss\\:w\\\\ord\n');
  });

  test('TLS and other non-secret query parameters are preserved unchanged', () => {
    const result = toPasswordFreeConnection('postgres://myuser:secret@127.0.0.1:5432/mydb?sslmode=require');
    expect(result.dbUrl).toBe('postgres://myuser@127.0.0.1:5432/mydb?sslmode=require');
  });

  test('a URL with no password is returned unchanged, with no pgpass content to protect', () => {
    const result = toPasswordFreeConnection('postgres://myuser@127.0.0.1:5432/mydb');
    expect(result.dbUrl).toBe('postgres://myuser@127.0.0.1:5432/mydb');
    expect(result.pgpassFileContent).toBeUndefined();
  });

  test('invalid percent-encoding fails safe instead of injecting a broken pgpass entry', () => {
    expect(() => toPasswordFreeConnection('postgres://myuser:bad%zzpass@127.0.0.1:5432/mydb')).toThrow(
      PersistenceToolError
    );
  });

  test('a percent-encoded embedded newline fails safe instead of injecting a second pgpass line', () => {
    expect(() => toPasswordFreeConnection('postgres://myuser:bad%0Apass@127.0.0.1:5432/mydb')).toThrow(
      PersistenceToolError
    );
  });

  test('a percent-encoded NUL byte fails safe', () => {
    expect(() => toPasswordFreeConnection('postgres://myuser:bad%00pass@127.0.0.1:5432/mydb')).toThrow(
      PersistenceToolError
    );
  });
});

describe('operator tool secret transport (PERSIST002-SEC-03, real Docker, real PostgreSQL)', () => {
  let source: RoleSeparatedPostgres | undefined;
  let target: RoleSeparatedPostgres | undefined;
  let workDir: string | undefined;

  afterEach(async () => {
    vi.mocked(spawn).mockClear();
    await source?.stop().catch(() => undefined);
    await target?.stop().catch(() => undefined);
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
    source = undefined;
    target = undefined;
    workDir = undefined;
  }, TEST_TIMEOUT_MS);

  test(
    'a real backup+restore cycle never places any connection password in docker/tool argv or container command metadata',
    async () => {
      source = await startRoleSeparatedPostgres();
      await runMigrations(source.migratorUrl);
      const bootstrap = await withDirectConnection(source.migratorUrl, (client) => bootstrapWorld(client, 'public-arena'));

      workDir = await mkdtemp(join(tmpdir(), 'bs-sec03-'));
      const grantsSqlWorkPath = join(workDir, 'apply-runtime-grants.sql');
      await writeFile(grantsSqlWorkPath, await readFile(GRANTS_SQL_PATH, 'utf8'), 'utf8');
      await runPsqlFile({ targetUrl: source.migratorUrl, sqlPath: grantsSqlWorkPath });

      const { manifest, dumpPath, manifestPath } = await performQuiescedBackup({
        fenceUrl: source.migratorUrl,
        dumpUrl: source.backupUrl,
        worldSlug: 'public-arena',
        outputDir: workDir,
        dumpFilename: 'backup.dump'
      });
      expect(manifest.world.worldId).toBe(bootstrap.world.worldId);

      target = await startRoleSeparatedPostgres();
      const restoreResult = await restoreAndVerify({
        dumpPath,
        manifestPath,
        targetMigratorUrl: target.migratorUrl,
        grantsSqlPath: grantsSqlWorkPath
      });
      expect(restoreResult.world.worldId).toBe(bootstrap.world.worldId);

      // Every real secret this test ever handed to a tool invocation.
      const secrets = [source.migratorUrl, source.backupUrl, target.migratorUrl]
        .map((url) => decodeURIComponent(new URL(url).password))
        .filter((password) => password.length > 0);
      expect(secrets.length).toBeGreaterThan(0);

      const calls = dockerToolInvocations();
      expect(calls.length).toBeGreaterThan(0);

      for (const call of calls) {
        const argvText = call.args.join(' ');
        for (const secret of secrets) {
          expect(argvText).not.toContain(secret);
          expect(argvText).not.toContain(encodeURIComponent(secret));
        }
      }

      // Positive control: the password DID travel somewhere real -- at
      // least one call actually used the stdin-to-private-container-file
      // channel and carried a matching secret there. Without this, the
      // absence assertions above could pass vacuously (e.g. if the wrapper
      // were silently skipped).
      const stdinCarriedASecret = calls.some((call) => secrets.some((secret) => call.stdin.includes(secret)));
      expect(stdinCarriedASecret).toBe(true);
    },
    TEST_TIMEOUT_MS
  );

  test(
    'a representative tool failure (invalid SQL) fails without leaking the connection password in the thrown error',
    async () => {
      source = await startRoleSeparatedPostgres();
      await runMigrations(source.migratorUrl);
      workDir = await mkdtemp(join(tmpdir(), 'bs-sec03-fail-'));
      const badSqlPath = join(workDir, 'broken.sql');
      await writeFile(badSqlPath, 'THIS IS NOT VALID SQL;\n', 'utf8');

      const secret = decodeURIComponent(new URL(source.migratorUrl).password);

      let caught: unknown;
      try {
        await runPsqlFile({ targetUrl: source.migratorUrl, sqlPath: badSqlPath });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(PersistenceToolError);
      const message = (caught as Error).message;
      expect(message).not.toContain(secret);
      expect(message).not.toContain(encodeURIComponent(secret));
      expect(message.toLowerCase()).toContain('psql script failed');

      const calls = dockerToolInvocations();
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        expect(call.args.join(' ')).not.toContain(secret);
      }
    },
    TEST_TIMEOUT_MS
  );
});
