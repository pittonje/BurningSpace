import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { dirname, basename } from 'node:path';

/**
 * Shared, dependency-free (node:child_process / node:crypto / node:fs / pg
 * only) helpers for the Packet-7 operator tools (backup-dump.ts,
 * backup-restore-verify.ts, db-privilege-check.ts). Never imported by
 * production runtime code (apps/server/src/**) and never bundled into the
 * production server image.
 */

// Must stay in sync with deploy/docker-compose.test.db.yml's pinned digest
// (both independently re-resolved from the same postgres:17 tag; see
// docs/ops/persist-002-staging-db-integration-plan.md for the observed
// digest history). PostgreSQL 17.11 at Packet-7 authoring time.
export const POSTGRES_17_IMAGE =
  'postgres:17@sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675';

export interface CommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * Runs a command to completion, never throwing on a non-zero exit -- callers
 * decide how to interpret exitCode. stdout/stderr are captured as UTF-8 text
 * (never logged with credentials by callers; connection strings must never
 * be placed in argv where they could be echoed by a caller's own logging).
 */
export function runCommand(
  command: string,
  args: readonly string[],
  options: { readonly input?: string } = {}
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
    child.on('error', (error) => reject(error));
    child.on('close', (exitCode) => {
      resolve({
        exitCode: exitCode ?? -1,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8')
      });
    });

    if (options.input !== undefined) {
      child.stdin.write(options.input);
    }
    child.stdin.end();
  });
}

/**
 * Rewrites a host-reachable Postgres URL (127.0.0.1 / localhost, with a
 * published port) into the form an ephemeral `docker run` container can use
 * to reach that same host port, via Docker's host-gateway alias. Only
 * rewrites the hostname; credentials/path/query are preserved unchanged.
 */
export function toContainerReachableUrl(hostUrl: string): string {
  const url = new URL(hostUrl);
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
    url.hostname = 'host.docker.internal';
  }
  return url.toString();
}

/** Extra args needed on every `docker run` that uses toContainerReachableUrl's alias. */
export const DOCKER_HOST_GATEWAY_ARGS = ['--add-host=host.docker.internal:host-gateway'];

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve());
    stream.on('error', reject);
  });
  return hash.digest('hex');
}

export class PersistenceToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PersistenceToolError';
  }
}

export interface PgDumpSnapshotOptions {
  /** Host-reachable connection string (e.g. 127.0.0.1:<port>) for the SOURCE database, using a read-capable role. */
  readonly sourceUrl: string;
  readonly snapshotId: string;
  /** Absolute host path to write the custom-format dump file to. */
  readonly outputPath: string;
}

/**
 * Runs the pinned official postgres:17 image's pg_dump against an ALREADY
 * exported snapshot. The caller is responsible for keeping the exporting
 * transaction open on a separate connection until this resolves.
 */
export async function runPgDumpSnapshot(options: PgDumpSnapshotOptions): Promise<void> {
  const containerUrl = toContainerReachableUrl(options.sourceUrl);
  const hostDir = dirname(options.outputPath);
  const fileName = basename(options.outputPath);

  const result = await runCommand('docker', [
    'run',
    '--rm',
    ...DOCKER_HOST_GATEWAY_ARGS,
    '-v',
    `${hostDir}:/work`,
    POSTGRES_17_IMAGE,
    'pg_dump',
    '--format=custom',
    '--snapshot',
    options.snapshotId,
    '--file',
    `/work/${fileName}`,
    '--dbname',
    containerUrl
  ]);

  if (result.exitCode !== 0) {
    throw new PersistenceToolError(`pg_dump failed (exit ${result.exitCode}): ${result.stderr.slice(0, 2000)}`);
  }
}

export interface PgRestoreOptions {
  readonly dumpPath: string;
  /** Host-reachable connection string for the TARGET (fresh, isolated) database. */
  readonly targetUrl: string;
}

export async function runPgRestore(options: PgRestoreOptions): Promise<void> {
  const containerUrl = toContainerReachableUrl(options.targetUrl);
  const hostDir = dirname(options.dumpPath);
  const fileName = basename(options.dumpPath);

  const result = await runCommand('docker', [
    'run',
    '--rm',
    ...DOCKER_HOST_GATEWAY_ARGS,
    '-v',
    `${hostDir}:/work`,
    POSTGRES_17_IMAGE,
    'pg_restore',
    '--exit-on-error',
    '--no-owner',
    '--no-privileges',
    '--dbname',
    containerUrl,
    `/work/${fileName}`
  ]);

  if (result.exitCode !== 0) {
    throw new PersistenceToolError(`pg_restore failed (exit ${result.exitCode}): ${result.stderr.slice(0, 2000)}`);
  }
}

export async function runPsqlFile(options: { readonly targetUrl: string; readonly sqlPath: string }): Promise<void> {
  const containerUrl = toContainerReachableUrl(options.targetUrl);
  const hostDir = dirname(options.sqlPath);
  const fileName = basename(options.sqlPath);

  const result = await runCommand('docker', [
    'run',
    '--rm',
    ...DOCKER_HOST_GATEWAY_ARGS,
    '-v',
    `${hostDir}:/work`,
    POSTGRES_17_IMAGE,
    'psql',
    '-v',
    'ON_ERROR_STOP=1',
    '--dbname',
    containerUrl,
    '--file',
    `/work/${fileName}`
  ]);

  if (result.exitCode !== 0) {
    throw new PersistenceToolError(`psql script failed (exit ${result.exitCode}): ${result.stderr.slice(0, 2000)}`);
  }
}

export async function resolvePgToolMajorVersion(tool: 'pg_dump' | 'pg_restore'): Promise<number> {
  const result = await runCommand('docker', ['run', '--rm', POSTGRES_17_IMAGE, tool, '--version']);
  if (result.exitCode !== 0) {
    throw new PersistenceToolError(`Failed to resolve ${tool} version.`);
  }
  const match = /\(PostgreSQL\)\s+(\d+)/u.exec(result.stdout);
  if (!match) {
    throw new PersistenceToolError(`Could not parse ${tool} --version output.`);
  }
  return Number(match[1]);
}
