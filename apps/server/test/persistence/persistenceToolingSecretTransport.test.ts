import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { prepareRehearsal } from '../../scripts/restore-target.js';
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
import {
  PersistenceToolError,
  rejectSecretBearingQueryParameters,
  runPgDumpSnapshot,
  runPgRestore,
  runPsqlFile,
  toPasswordFreeConnection
} from '../../scripts/persistence-tooling.js';
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

/**
 * PERSIST002-SEC-03 residual (SEC-FIX2): a `password`/`sslpassword` QUERY
 * parameter is unsupported outright -- rejected before any docker/tool
 * spawn, never given precedence over or silently dropped in favor of a
 * userinfo password. Every sentinel value below is synthetic, never a
 * retained credential.
 */
describe('rejectSecretBearingQueryParameters (PERSIST002-SEC-03 residual, SEC-FIX2 unit matrix)', () => {
  test('query-only password is rejected', () => {
    expect(() =>
      rejectSecretBearingQueryParameters('postgres://myuser@127.0.0.1:5432/mydb?password=SENTINEL_QP1')
    ).toThrow(PersistenceToolError);
  });

  test('query-only sslpassword is rejected', () => {
    expect(() =>
      rejectSecretBearingQueryParameters('postgres://myuser@127.0.0.1:5432/mydb?sslpassword=SENTINEL_QP2')
    ).toThrow(PersistenceToolError);
  });

  test('a userinfo password plus a query password is still rejected -- no precedence rule', () => {
    expect(() =>
      rejectSecretBearingQueryParameters(
        'postgres://myuser:userinfoSecret@127.0.0.1:5432/mydb?password=SENTINEL_QP3'
      )
    ).toThrow(PersistenceToolError);
  });

  test('a userinfo password plus a query sslpassword is still rejected', () => {
    expect(() =>
      rejectSecretBearingQueryParameters(
        'postgres://myuser:userinfoSecret@127.0.0.1:5432/mydb?sslpassword=SENTINEL_QP4'
      )
    ).toThrow(PersistenceToolError);
  });

  test('both secret query keys present together are rejected', () => {
    expect(() =>
      rejectSecretBearingQueryParameters(
        'postgres://myuser@127.0.0.1:5432/mydb?password=SENTINEL_QP5&sslpassword=SENTINEL_QP6'
      )
    ).toThrow(PersistenceToolError);
  });

  test('a repeated password key is rejected regardless of position among other params', () => {
    expect(() =>
      rejectSecretBearingQueryParameters(
        'postgres://myuser@127.0.0.1:5432/mydb?sslmode=require&password=SENTINEL_QP7&password=SENTINEL_QP8'
      )
    ).toThrow(PersistenceToolError);
  });

  test('an empty password value is still rejected', () => {
    expect(() => rejectSecretBearingQueryParameters('postgres://myuser@127.0.0.1:5432/mydb?password=')).toThrow(
      PersistenceToolError
    );
  });

  test('a bare password key with no "=" at all is still rejected', () => {
    expect(() => rejectSecretBearingQueryParameters('postgres://myuser@127.0.0.1:5432/mydb?password')).toThrow(
      PersistenceToolError
    );
  });

  test('a percent-encoded parameter name is decoded and rejected (%70assword = "password")', () => {
    expect(() =>
      rejectSecretBearingQueryParameters('postgres://myuser@127.0.0.1:5432/mydb?%70assword=SENTINEL_QP9')
    ).toThrow(PersistenceToolError);
  });

  test('mixed-case parameter names are rejected -- conservative case-insensitive matching', () => {
    expect(() =>
      rejectSecretBearingQueryParameters('postgres://myuser@127.0.0.1:5432/mydb?PassWord=SENTINEL_QP10')
    ).toThrow(PersistenceToolError);
    expect(() =>
      rejectSecretBearingQueryParameters('postgres://myuser@127.0.0.1:5432/mydb?SSLPASSWORD=SENTINEL_QP11')
    ).toThrow(PersistenceToolError);
  });

  test('malformed percent-encoding in a parameter name fails safe instead of reaching spawn', () => {
    expect(() => rejectSecretBearingQueryParameters('postgres://myuser@127.0.0.1:5432/mydb?bad%zzname=x')).toThrow(
      PersistenceToolError
    );
  });

  test('a totally malformed connection string fails safe with a fixed message, not a raw parse error', () => {
    expect(() => rejectSecretBearingQueryParameters('not a url at all')).toThrow(PersistenceToolError);
  });

  test('an ordinary value that merely CONTAINS the word "password" is accepted -- only names are inspected', () => {
    expect(() =>
      rejectSecretBearingQueryParameters('postgres://myuser@127.0.0.1:5432/mydb?application_name=password-check')
    ).not.toThrow();
  });

  test('a plain connection string with no query at all is accepted', () => {
    expect(() => rejectSecretBearingQueryParameters('postgres://myuser:secret@127.0.0.1:5432/mydb')).not.toThrow();
  });

  test('ordinary non-secret settings pass through untouched', () => {
    expect(() =>
      rejectSecretBearingQueryParameters(
        'postgres://myuser:secret@127.0.0.1:5432/mydb?sslmode=require&connect_timeout=10&application_name=myapp'
      )
    ).not.toThrow();
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

      const rehearsalName = `bs_rehearsal_${randomBytes(12).toString('hex')}`;
      await prepareRehearsal(source.adminUrl, rehearsalName, 'burningspace');
      const rehearsalUrl = new URL(source.migratorUrl);
      rehearsalUrl.pathname = `/${rehearsalName}`;
      target = { ...source, migratorUrl: rehearsalUrl.toString(), stop: async () => {} };
      const restoreResult = await restoreAndVerify({
        dumpPath,
        manifestPath,
        targetMigratorUrl: target.migratorUrl,
        sourceDatabase: 'burningspace',
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
        expect(call.args.join('\u0000')).not.toContain(secret);
      }
    },
    TEST_TIMEOUT_MS
  );

  test(
    'a real invocation with an ordinary application_name=password-check query value still succeeds -- only parameter NAMES are inspected, never values',
    async () => {
      source = await startRoleSeparatedPostgres();
      await runMigrations(source.migratorUrl);
      workDir = await mkdtemp(join(tmpdir(), 'bs-sec03-appname-'));
      const sqlPath = join(workDir, 'noop.sql');
      await writeFile(sqlPath, 'SELECT 1;\n', 'utf8');

      const url = new URL(source.migratorUrl);
      url.searchParams.set('application_name', 'password-check');

      await expect(runPsqlFile({ targetUrl: url.toString(), sqlPath })).resolves.toBeUndefined();
    },
    TEST_TIMEOUT_MS
  );
});

/**
 * PERSIST002-SEC-03 residual (SEC-FIX2): the three PUBLIC operator
 * functions themselves -- not merely the standalone parser helper -- must
 * reject a secret-bearing query parameter before spawning docker/any
 * PostgreSQL tool at all. Every sentinel value below is synthetic.
 */
describe('operator wrappers enforce query-parameter rejection before any spawn (PERSIST002-SEC-03, SEC-FIX2)', () => {
  afterEach(() => {
    vi.mocked(spawn).mockClear();
  });

  test('runPgDumpSnapshot rejects a query-string password before spawning anything', async () => {
    const spawnCallsBefore = vi.mocked(spawn).mock.calls.length;
    await expect(
      runPgDumpSnapshot({
        sourceUrl: 'postgres://myuser@127.0.0.1:55432/mydb?password=SENTINEL_WRAPPER_1',
        snapshotId: 'irrelevant-snapshot-id',
        outputPath: 'D:/irrelevant/backup.dump'
      })
    ).rejects.toBeInstanceOf(PersistenceToolError);
    expect(vi.mocked(spawn).mock.calls.length).toBe(spawnCallsBefore);
  });

  test('runPgRestore rejects a query-string sslpassword before spawning anything', async () => {
    const spawnCallsBefore = vi.mocked(spawn).mock.calls.length;
    await expect(
      runPgRestore({
        targetUrl: 'postgres://myuser@127.0.0.1:55432/mydb?sslpassword=SENTINEL_WRAPPER_2',
        dumpPath: 'D:/irrelevant/backup.dump'
      })
    ).rejects.toBeInstanceOf(PersistenceToolError);
    expect(vi.mocked(spawn).mock.calls.length).toBe(spawnCallsBefore);
  });

  test('runPsqlFile rejects a query-string password before spawning anything', async () => {
    const spawnCallsBefore = vi.mocked(spawn).mock.calls.length;
    await expect(
      runPsqlFile({
        targetUrl: 'postgres://myuser@127.0.0.1:55432/mydb?password=SENTINEL_WRAPPER_3',
        sqlPath: 'D:/irrelevant/script.sql'
      })
    ).rejects.toBeInstanceOf(PersistenceToolError);
    expect(vi.mocked(spawn).mock.calls.length).toBe(spawnCallsBefore);
  });

  test('runPsqlFile also rejects a userinfo password combined with a query sslpassword before spawning anything', async () => {
    const spawnCallsBefore = vi.mocked(spawn).mock.calls.length;
    await expect(
      runPsqlFile({
        targetUrl: 'postgres://myuser:SENTINEL_USERINFO@127.0.0.1:55432/mydb?sslpassword=SENTINEL_WRAPPER_4',
        sqlPath: 'D:/irrelevant/script.sql'
      })
    ).rejects.toBeInstanceOf(PersistenceToolError);
    expect(vi.mocked(spawn).mock.calls.length).toBe(spawnCallsBefore);
  });

  test('the thrown error, including its own enumerable properties, never contains the rejected sentinel in plain or encoded form', async () => {
    const sentinel = 'SENTINEL_WRAPPER_5_UNIQUE';
    let caught: unknown;
    try {
      await runPsqlFile({
        targetUrl: `postgres://myuser@127.0.0.1:55432/mydb?password=${sentinel}`,
        sqlPath: 'D:/irrelevant/script.sql'
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(PersistenceToolError);
    const error = caught as Error;
    expect(error.message).not.toContain(sentinel);
    expect(error.message).not.toContain(encodeURIComponent(sentinel));
    for (const [key, value] of Object.entries(error)) {
      expect(`${key}=${String(value)}`).not.toContain(sentinel);
    }
    expect(String((error as { cause?: unknown }).cause)).not.toContain(sentinel);
  });
});
