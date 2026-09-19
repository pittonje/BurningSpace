import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, basename } from 'node:path';

let nativeTools = false;
/** Only the immutable operator dispatcher selects native execution. Local legacy tests retain Docker. */
export function useNativePgTools(): void { nativeTools = true; }

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
  options: { readonly input?: string; readonly env?: NodeJS.ProcessEnv } = {}
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env: options.env, windowsHide: true });
    const deadline = setTimeout(() => child.kill('SIGKILL'), 180_000);
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    let bytes = 0;
    const collect = (chunks: Buffer[], chunk: Buffer) => { bytes += chunk.length; if (bytes > 65_536) child.kill('SIGKILL'); else chunks.push(chunk); };
    child.stdout.on('data', (chunk: Buffer) => collect(stdoutChunks, chunk));
    child.stderr.on('data', (chunk: Buffer) => collect(stderrChunks, chunk));
    child.on('error', () => { clearTimeout(deadline); reject(new PersistenceToolError('Tool process could not start.')); });
    child.on('close', (exitCode) => {
      clearTimeout(deadline);
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
 *
 * Only correct on Docker Desktop (Windows/Mac): there, `host.docker.internal`
 * is resolved by Docker Desktop's own network proxy and reaches ports bound
 * to the host's loopback interface. On native Linux Docker,
 * `--add-host=host.docker.internal:host-gateway` instead resolves to the
 * docker0 bridge gateway address, which can reach ports published on
 * 0.0.0.0 but NOT ports published loopback-only (`-p 127.0.0.1::PORT`) --
 * see resolveContainerDatabaseAccess, which is what callers should use.
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

export interface ContainerDatabaseAccess {
  /** The connection string the docker-run tool process should actually use. */
  readonly dbUrl: string;
  /** Extra `docker run` args needed for that connection string to be reachable. */
  readonly dockerArgs: readonly string[];
}

/**
 * Resolves how an ephemeral `docker run` tool container (pg_dump/pg_restore/
 * psql) should reach a host-reachable Postgres URL, in a way that is
 * reliable on both native Linux Docker (as used by GitHub Actions runners)
 * and Docker Desktop (Windows/Mac, used by local developers).
 *
 * On Linux, `--network host` shares the host's network namespace directly
 * with the short-lived, `--rm` tool container: a loopback-only-published
 * port (e.g. `-p 127.0.0.1::5432`) is reached exactly as it would be from
 * the host itself, with no hostname rewriting needed and no widening of the
 * database's own published bind address. This also works unchanged for a
 * real remote DATABASE_URL in operator usage, since host networking simply
 * gives the container the host's own routing/DNS.
 *
 * On non-Linux platforms, `--network host` is not properly supported by
 * Docker Desktop, so this falls back to the existing, already-working
 * host-gateway rewrite (toContainerReachableUrl + DOCKER_HOST_GATEWAY_ARGS).
 */
export function resolveContainerDatabaseAccess(hostUrl: string): ContainerDatabaseAccess {
  if (process.platform === 'linux') {
    return { dbUrl: hostUrl, dockerArgs: ['--network', 'host'] };
  }

  return { dbUrl: toContainerReachableUrl(hostUrl), dockerArgs: DOCKER_HOST_GATEWAY_ARGS };
}

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

const PGPASS_CONTROL_CHARACTER_PATTERN = /[\x00-\x1f\x7f]/u;

function escapePgpassField(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
}

interface PasswordFreeConnection {
  /** Same connection URL, with any password stripped from the userinfo component. */
  readonly dbUrl: string;
  /** A single-line libpq .pgpass entry, or undefined when the URL carried no password to protect. */
  readonly pgpassFileContent: string | undefined;
}

/**
 * Strips the password out of a Postgres connection URL (PERSIST002-SEC-03)
 * so it can never appear in host docker CLI argv, the container's own
 * configured command/arguments, or pg_dump/pg_restore/psql's own argv.
 * Host/port/database/username are wildcarded in the returned .pgpass entry
 * ('*'): every call site here is a single-shot invocation against exactly
 * one connection, so there is no ambiguity to resolve, and this keeps the
 * escaping surface limited to the password field alone. TLS and other
 * non-secret query parameters are preserved unchanged. Returns
 * pgpassFileContent === undefined when the URL has no password at all --
 * callers must then run the tool without the wrapper, unchanged.
 */
export function toPasswordFreeConnection(hostUrl: string): PasswordFreeConnection {
  const url = new URL(hostUrl);
  if (url.password === '') {
    return { dbUrl: hostUrl, pgpassFileContent: undefined };
  }

  let rawPassword: string;
  try {
    rawPassword = decodeURIComponent(url.password);
  } catch {
    throw new PersistenceToolError('Connection string password is not validly percent-encoded.');
  }

  if (PGPASS_CONTROL_CHARACTER_PATTERN.test(rawPassword)) {
    throw new PersistenceToolError('Connection string password contains a disallowed control character.');
  }

  url.password = '';
  return { dbUrl: url.toString(), pgpassFileContent: `*:*:*:*:${escapePgpassField(rawPassword)}\n` };
}

const FORBIDDEN_QUERY_PARAMETER_NAMES = new Set(['password', 'sslpassword']);

/**
 * PERSIST002-SEC-03 residual (SEC-FIX2): the accepted secret channel above
 * only ever strips a USERINFO password. A `password` or `sslpassword`
 * QUERY parameter would instead ride straight through inside `dbUrl` to
 * docker/tool argv, unprotected. This wrapper deliberately does not
 * support secret-bearing query parameters at all -- there is no
 * password-precedence rule and no silent discard here, only outright
 * rejection, conservatively by parameter NAME (case-insensitive), before
 * anything else in runPgTool: before resolveContainerDatabaseAccess's own
 * platform-specific URL parsing/transformation could throw an unguarded,
 * unsafe raw parse error, and before toPasswordFreeConnection's
 * empty-userinfo-password early return could let a query-string secret
 * pass through untouched. sslpassword (a TLS private-key passphrase) is
 * intentionally out of scope for the .pgpass/stdin channel above -- that
 * channel exists only for the ordinary database login password; adding
 * encrypted-key or service-file support is a separate, larger change, not
 * part of this correction.
 *
 * Parses the raw, still-percent-encoded query string by hand (never
 * URLSearchParams, whose own percent-decoding is lenient) so a malformed
 * or ambiguous percent-encoded parameter NAME fails safe -- rejected --
 * rather than being leniently decoded into something that might dodge the
 * name comparison. Only parameter NAMES are inspected and decoded; no
 * parameter VALUE is ever read, and the connection string itself is never
 * mutated or reserialized, so every other accepted setting (sslmode,
 * connect_timeout, application_name, etc.) keeps its exact existing
 * semantics untouched. A repeated key, an empty value, or a
 * percent-encoded name (e.g. `%70assword`) are all still just one more
 * `name[=value]` pair in this loop, and each is checked independently, so
 * every one of them is caught the same way.
 */
export function rejectSecretBearingQueryParameters(hostUrl: string): void {
  let url: URL;
  try {
    url = new URL(hostUrl);
  } catch {
    throw new PersistenceToolError('Connection string could not be parsed.');
  }

  const rawQuery = url.search.startsWith('?') ? url.search.slice(1) : url.search;
  if (rawQuery === '') {
    return;
  }

  for (const pair of rawQuery.split('&')) {
    if (pair === '') {
      continue;
    }
    const separatorIndex = pair.indexOf('=');
    const rawName = separatorIndex === -1 ? pair : pair.slice(0, separatorIndex);

    let decodedName: string;
    try {
      // '+' means literal space in this query encoding; decode it the
      // same way before comparing names, without ever touching a value.
      decodedName = decodeURIComponent(rawName.replace(/\+/g, ' '));
    } catch {
      throw new PersistenceToolError('Connection string query parameters could not be parsed.');
    }

    if (FORBIDDEN_QUERY_PARAMETER_NAMES.has(decodedName.toLowerCase())) {
      throw new PersistenceToolError(
        'Connection string contains an unsupported secret-bearing query parameter ' +
          '(password or sslpassword); pass the database login password via the ' +
          'connection URI userinfo only.'
      );
    }
  }
}

/**
 * Fixed, static shell wrapper text -- never interpolated with any secret or
 * caller-supplied data. Reads the .pgpass entry from its own stdin into a
 * file created (via mktemp) inside the ephemeral tool container's OWN
 * filesystem -- never a host bind mount, so chmod 600 always takes effect
 * exactly as libpq requires, on both native Linux Docker and Docker
 * Desktop, without depending on Windows bind-mount permission translation.
 * PGPASSFILE (a path, never a secret) is exported for the real tool
 * command, passed as ordinary argv after this script text. The container
 * always runs with --rm, so the file is destroyed with the container even
 * if the EXIT trap somehow could not run (e.g. the container is killed
 * before graceful exit) -- though an abrupt kill or host power loss may
 * still leave residue in Docker's own layer/storage until that removal
 * completes, and neither this script nor --rm promise protection from a
 * privileged host administrator inspecting Docker's storage directly.
 */
const PGPASSFILE_WRAPPER_SCRIPT = `set -eu
umask 077
PGPASSFILE="$(mktemp)"
trap 'rm -f "$PGPASSFILE"' EXIT
cat > "$PGPASSFILE"
chmod 600 "$PGPASSFILE"
export PGPASSFILE
"$@"
`;

/**
 * Runs one Postgres tool (pg_dump/pg_restore/psql) inside the pinned
 * postgres:17 image against hostUrl, never placing hostUrl's password in
 * any docker/tool argv or container command/arguments metadata
 * (PERSIST002-SEC-03). buildToolArgs receives the already password-free
 * connection URL to place wherever the caller's own --dbname/--file/etc.
 * flags need it.
 */
async function runPgTool(
  hostUrl: string,
  extraDockerArgs: readonly string[],
  buildToolArgs: (dbUrl: string) => readonly string[]
): Promise<CommandResult> {
  rejectSecretBearingQueryParameters(hostUrl);
  if (nativeTools) {
    const { dbUrl, pgpassFileContent } = toPasswordFreeConnection(hostUrl);
    const dir = await mkdtemp(`${tmpdir()}/bs-pgpass-`);
    try {
      const file = `${dir}/password`;
      await writeFile(file, pgpassFileContent ?? '', { flag: 'wx', mode: 0o600 });
      const [command, ...args] = buildToolArgs(dbUrl);
      if (!command || !['pg_dump', 'pg_restore', 'psql'].includes(command)) throw new PersistenceToolError('Unsupported native tool.');
      // Do not pass operator credentials through inherited process environment.
      return await runCommand(command, args, { env: { PATH: process.env.PATH, LANG: 'C', PGPASSFILE: file, PGCONNECT_TIMEOUT: '5' } });
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
  const access = resolveContainerDatabaseAccess(hostUrl);
  const { dbUrl, pgpassFileContent } = toPasswordFreeConnection(access.dbUrl);

  if (pgpassFileContent === undefined) {
    return runCommand('docker', [
      'run',
      '--rm',
      ...access.dockerArgs,
      ...extraDockerArgs,
      POSTGRES_17_IMAGE,
      ...buildToolArgs(dbUrl)
    ]);
  }

  return runCommand(
    'docker',
    [
      'run',
      '--rm',
      '-i',
      ...access.dockerArgs,
      ...extraDockerArgs,
      POSTGRES_17_IMAGE,
      'sh',
      '-c',
      PGPASSFILE_WRAPPER_SCRIPT,
      'sh',
      ...buildToolArgs(dbUrl)
    ],
    { input: pgpassFileContent }
  );
}

/**
 * On native Linux, a file the postgres:17 tool image writes into a
 * bind-mounted host directory (pg_dump's output) is otherwise created
 * container-root-owned: the invoking host user (e.g. the GitHub Actions
 * runner user) can read it back but cannot overwrite it, which surfaces
 * later as EACCES on a host-side write to that same path. Docker Desktop
 * (Windows/Mac) does not exhibit this -- its bind-mount layer already
 * reconciles ownership to the host user -- and `process.getuid`/`getgid`
 * do not exist there, so this only ever applies on Linux. Only needed
 * where the container actually WRITES a host-bind-mounted artifact
 * (pg_dump); pg_restore and psql only read host-mounted files.
 */
function resolveLinuxBindMountWriterArgs(): readonly string[] {
  if (process.platform !== 'linux' || typeof process.getuid !== 'function' || typeof process.getgid !== 'function') {
    return [];
  }

  return ['--user', `${process.getuid()}:${process.getgid()}`];
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
  const hostDir = dirname(options.outputPath);
  const fileName = basename(options.outputPath);

  const result = await runPgTool(
    options.sourceUrl,
    [...resolveLinuxBindMountWriterArgs(), '-v', `${hostDir}:/work`],
    (dbUrl) => [
      'pg_dump',
      '--format=custom',
      '--snapshot',
      options.snapshotId,
      '--file',
      nativeTools ? options.outputPath : `/work/${fileName}`,
      '--dbname',
      dbUrl
    ]
  );

  if (result.exitCode !== 0) {
    throw new PersistenceToolError('pg_dump failed.');
  }
}

export interface PgRestoreOptions {
  readonly dumpPath: string;
  /** Host-reachable connection string for the TARGET (fresh, isolated) database. */
  readonly targetUrl: string;
}

export async function runPgRestore(options: PgRestoreOptions): Promise<void> {
  const hostDir = dirname(options.dumpPath);
  const fileName = basename(options.dumpPath);

  const result = await runPgTool(options.targetUrl, ['-v', `${hostDir}:/work`], (dbUrl) => [
    'pg_restore',
    '--exit-on-error',
    '--no-owner',
    '--no-privileges',
    '--dbname',
    dbUrl,
    nativeTools ? options.dumpPath : `/work/${fileName}`
  ]);

  if (result.exitCode !== 0) {
    throw new PersistenceToolError('pg_restore failed.');
  }
}

export async function runPsqlFile(options: { readonly targetUrl: string; readonly sqlPath: string }): Promise<void> {
  const hostDir = dirname(options.sqlPath);
  const fileName = basename(options.sqlPath);

  const result = await runPgTool(options.targetUrl, ['-v', `${hostDir}:/work`], (dbUrl) => [
    'psql',
    '-v',
    'ON_ERROR_STOP=1',
    '--dbname',
    dbUrl,
    '--file',
    nativeTools ? options.sqlPath : `/work/${fileName}`
  ]);

  if (result.exitCode !== 0) {
    throw new PersistenceToolError('psql script failed.');
  }
}

export async function resolvePgToolMajorVersion(tool: 'pg_dump' | 'pg_restore'): Promise<number> {
  const result = nativeTools ? await runCommand(tool, ['--version']) : await runCommand('docker', ['run', '--rm', POSTGRES_17_IMAGE, tool, '--version']);
  if (result.exitCode !== 0) {
    throw new PersistenceToolError(`Failed to resolve ${tool} version.`);
  }
  const match = /\(PostgreSQL\)\s+(\d+)/u.exec(result.stdout);
  if (!match) {
    throw new PersistenceToolError(`Could not parse ${tool} --version output.`);
  }
  return Number(match[1]);
}
