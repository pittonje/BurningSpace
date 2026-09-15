import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * db/migrations sits alongside src (and dist) under apps/server, so this
 * resolves the same way whether this module runs from source via tsx
 * (apps/server/src/persistence) or from a future compiled build
 * (apps/server/dist/persistence) — both are two levels below apps/server.
 */
export const MIGRATIONS_DIR = path.resolve(MODULE_DIR, '..', '..', 'db', 'migrations');

const MIGRATION_FILENAME_PATTERN = /^(\d+)_[a-z0-9_]+\.sql$/;

export class MigrationDiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationDiscoveryError';
  }
}

export interface DiscoveredMigration {
  readonly version: number;
  readonly filename: string;
  readonly filePath: string;
  readonly checksum: Buffer;
}

export async function discoverMigrations(directory: string = MIGRATIONS_DIR): Promise<DiscoveredMigration[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const sqlFilenames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name);

  const parsed: Array<{ version: number; filename: string }> = [];
  for (const filename of sqlFilenames) {
    const match = MIGRATION_FILENAME_PATTERN.exec(filename);
    const versionGroup = match?.[1];
    if (!match || versionGroup === undefined) {
      throw new MigrationDiscoveryError(`Malformed migration filename: ${filename}`);
    }
    parsed.push({ version: Number.parseInt(versionGroup, 10), filename });
  }

  parsed.sort((a, b) => a.version - b.version);

  const seenVersions = new Set<number>();
  for (const item of parsed) {
    if (seenVersions.has(item.version)) {
      throw new MigrationDiscoveryError(`Duplicate migration version detected on disk: ${item.version}`);
    }
    seenVersions.add(item.version);
  }

  const discovered: DiscoveredMigration[] = [];
  for (const item of parsed) {
    const filePath = path.join(directory, item.filename);
    const contents = await readFile(filePath);
    const checksum = createHash('sha256').update(contents).digest();
    discovered.push({ version: item.version, filename: item.filename, filePath, checksum });
  }

  return discovered;
}

export async function readMigrationSql(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}
