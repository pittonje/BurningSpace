import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, describe, expect, test } from 'vitest';
import { redactDatabaseUrl } from '../../src/persistence/config.js';
import { generateCredential } from '../../src/persistence/credential.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import {
  findActiveCredentialByHash,
  findCredentialByHash,
  insertCredential,
  revokeCredential,
  rotateCredential
} from '../../src/persistence/repositories/credentialsRepository.js';
import { createPlayer } from '../../src/persistence/repositories/playersRepository.js';

const ADMIN_DATABASE_URL =
  process.env.BURNINGSPACE_TEST_DATABASE_URL ??
  'postgres://burningspace_test_admin:burningspace_test_password@127.0.0.1:55432/burningspace_test';

async function isDatabaseReachable(): Promise<boolean> {
  const client = new Client({ connectionString: ADMIN_DATABASE_URL, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

const databaseAvailable = await isDatabaseReachable();

if (!databaseAvailable) {
  console.warn(
    '[credentialsRepository.test.ts] Skipping real-PostgreSQL tests: ' +
      `no reachable database at ${redactDatabaseUrl(ADMIN_DATABASE_URL)}. ` +
      'Start deploy/docker-compose.test.db.yml to run them.'
  );
}

const disposableDatabaseNames: string[] = [];

async function createMigratedDatabase(): Promise<{ databaseUrl: string; databaseName: string }> {
  const databaseName = `bs_test_${randomUUID().replace(/-/g, '')}`;
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${databaseName}`);
  } finally {
    await admin.end();
  }
  disposableDatabaseNames.push(databaseName);
  const url = new URL(ADMIN_DATABASE_URL);
  url.pathname = `/${databaseName}`;
  const databaseUrl = url.toString();
  await runMigrations(databaseUrl);
  return { databaseUrl, databaseName };
}

async function dropDatabase(databaseName: string): Promise<void> {
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  try {
    await admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [databaseName]
    );
    await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
  } finally {
    await admin.end();
    const index = disposableDatabaseNames.indexOf(databaseName);
    if (index >= 0) {
      disposableDatabaseNames.splice(index, 1);
    }
  }
}

describe.skipIf(!databaseAvailable)('credentialsRepository (real PostgreSQL)', () => {
  afterAll(async () => {
    for (const name of [...disposableDatabaseNames]) {
      await dropDatabase(name).catch(() => undefined);
    }
  });

  test('creates a player and an active credential with the expected metadata shape', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const player = await createPlayer(client);
        const generated = generateCredential();
        const inserted = await insertCredential(client, player.playerId, {
          version: 1,
          algorithm: 'sha256',
          hash: generated.verifier
        });
        expect(inserted.playerId).toBe(player.playerId);

        const row = await client.query<{
          credential_version: number;
          algorithm: string;
          credential_hash: Buffer;
        }>('SELECT credential_version, algorithm, credential_hash FROM player_credentials WHERE credential_id = $1', [
          inserted.credentialId
        ]);
        expect(row.rows[0]?.credential_version).toBe(1);
        expect(row.rows[0]?.algorithm).toBe('sha256');
        expect(row.rows[0]?.credential_hash).toHaveLength(32);
        expect(row.rows[0]?.credential_hash.equals(generated.verifier)).toBe(true);

        const columns = await client.query<{ column_name: string }>(
          "SELECT column_name FROM information_schema.columns WHERE table_name = 'player_credentials'"
        );
        const columnNames = columns.rows.map((r) => r.column_name);
        expect(columnNames).not.toContain('credential');
        expect(columnNames).not.toContain('plaintext_credential');
        expect(columnNames).not.toContain('secret');
        expect(columnNames).not.toContain('password');
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('active lookup by verifier returns the correct player/credential IDs; unknown verifier is missing', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const player = await createPlayer(client);
        const generated = generateCredential();
        const inserted = await insertCredential(client, player.playerId, {
          version: 1,
          algorithm: 'sha256',
          hash: generated.verifier
        });

        const active = await findActiveCredentialByHash(client, generated.verifier);
        expect(active).toEqual({ status: 'active', playerId: player.playerId, credentialId: inserted.credentialId });

        const unknownVerifier = generateCredential().verifier;
        const missing = await findActiveCredentialByHash(client, unknownVerifier);
        expect(missing).toEqual({ status: 'not_active' });
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('revocation sets revoked_at, retains the row, and the active lookup no longer authenticates it; repeat revoke does not un-revoke', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const player = await createPlayer(client);
        const generated = generateCredential();
        const inserted = await insertCredential(client, player.playerId, {
          version: 1,
          algorithm: 'sha256',
          hash: generated.verifier
        });

        const firstRevoke = await revokeCredential(client, player.playerId, inserted.credentialId);
        expect(firstRevoke).toBe('revoked');

        const row = await client.query<{ revoked_at: Date | null }>(
          'SELECT revoked_at FROM player_credentials WHERE credential_id = $1',
          [inserted.credentialId]
        );
        expect(row.rows[0]?.revoked_at).not.toBeNull();
        const revokedAtFirst = row.rows[0]?.revoked_at as Date;

        const lookup = await findActiveCredentialByHash(client, generated.verifier);
        expect(lookup).toEqual({ status: 'not_active' });

        const fullLookup = await findCredentialByHash(client, generated.verifier);
        expect(fullLookup.status).toBe('revoked');

        const secondRevoke = await revokeCredential(client, player.playerId, inserted.credentialId);
        expect(secondRevoke).toBe('already_revoked');

        const rowAfterSecond = await client.query<{ revoked_at: Date }>(
          'SELECT revoked_at FROM player_credentials WHERE credential_id = $1',
          [inserted.credentialId]
        );
        expect(rowAfterSecond.rows[0]?.revoked_at.getTime()).toBe(revokedAtFirst.getTime());
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('rotation revokes the old credential and inserts exactly one new active credential atomically', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const player = await createPlayer(client);
        const originalGenerated = generateCredential();
        const original = await insertCredential(client, player.playerId, {
          version: 1,
          algorithm: 'sha256',
          hash: originalGenerated.verifier
        });

        const replacementGenerated = generateCredential();
        const result = await rotateCredential(client, player.playerId, original.credentialId, {
          version: 1,
          algorithm: 'sha256',
          hash: replacementGenerated.verifier
        });
        expect(result.status).toBe('rotated');
        const newCredentialId = result.status === 'rotated' ? result.newCredentialId : undefined;
        expect(newCredentialId).toBeDefined();
        expect(newCredentialId).not.toBe(original.credentialId);

        const oldRow = await client.query<{ revoked_at: Date | null }>(
          'SELECT revoked_at FROM player_credentials WHERE credential_id = $1',
          [original.credentialId]
        );
        expect(oldRow.rows[0]?.revoked_at).not.toBeNull();

        const activeRows = await client.query(
          'SELECT credential_id FROM player_credentials WHERE player_id = $1 AND revoked_at IS NULL',
          [player.playerId]
        );
        expect(activeRows.rowCount).toBe(1);
        expect(activeRows.rows[0]?.credential_id).toBe(newCredentialId);

        const newLookup = await findActiveCredentialByHash(client, replacementGenerated.verifier);
        expect(newLookup.status).toBe('active');
        const oldLookup = await findActiveCredentialByHash(client, originalGenerated.verifier);
        expect(oldLookup.status).toBe('not_active');
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('a failed replacement insert rolls back the old revocation, leaving the player with its previously active credential', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const player = await createPlayer(client);
        const originalGenerated = generateCredential();
        const original = await insertCredential(client, player.playerId, {
          version: 1,
          algorithm: 'sha256',
          hash: originalGenerated.verifier
        });

        // Force the replacement INSERT to fail on a real constraint: reuse
        // an existing credential_hash (globally unique) as the "new" one.
        const anotherPlayer = await createPlayer(client);
        const anotherGenerated = generateCredential();
        await insertCredential(client, anotherPlayer.playerId, {
          version: 1,
          algorithm: 'sha256',
          hash: anotherGenerated.verifier
        });

        await expect(
          rotateCredential(client, player.playerId, original.credentialId, {
            version: 1,
            algorithm: 'sha256',
            hash: anotherGenerated.verifier
          })
        ).rejects.toThrow();

        const row = await client.query<{ revoked_at: Date | null }>(
          'SELECT revoked_at FROM player_credentials WHERE credential_id = $1',
          [original.credentialId]
        );
        expect(row.rows[0]?.revoked_at).toBeNull();

        const stillActive = await findActiveCredentialByHash(client, originalGenerated.verifier);
        expect(stillActive.status).toBe('active');
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });

  test('the partial unique index prevents two simultaneously active credentials for one player', async () => {
    const { databaseUrl, databaseName } = await createMigratedDatabase();
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        const player = await createPlayer(client);
        const first = generateCredential();
        await insertCredential(client, player.playerId, { version: 1, algorithm: 'sha256', hash: first.verifier });

        const second = generateCredential();
        await expect(
          insertCredential(client, player.playerId, { version: 1, algorithm: 'sha256', hash: second.verifier })
        ).rejects.toThrow();

        const activeRows = await client.query(
          'SELECT credential_id FROM player_credentials WHERE player_id = $1 AND revoked_at IS NULL',
          [player.playerId]
        );
        expect(activeRows.rowCount).toBe(1);
      } finally {
        await client.end();
      }
    } finally {
      await dropDatabase(databaseName);
    }
  });
});
