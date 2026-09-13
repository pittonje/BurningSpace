import type { Client } from 'pg';

export type Queryable = Pick<Client, 'query'>;

export interface InsertCredentialParams {
  readonly version: number;
  readonly algorithm: string;
  readonly hash: Buffer;
}

export interface InsertedCredential {
  readonly credentialId: string;
  readonly playerId: string;
}

/**
 * Inserts the (only) active credential row for a freshly created player.
 * Callers must never pass the raw secret here -- only its verifier hash.
 */
export async function insertCredential(
  client: Queryable,
  playerId: string,
  params: InsertCredentialParams
): Promise<InsertedCredential> {
  const result = await client.query<{ credential_id: string }>(
    `INSERT INTO player_credentials (player_id, credential_version, algorithm, credential_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING credential_id`,
    [playerId, params.version, params.algorithm, params.hash]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to insert credential: no row returned.');
  }

  return { credentialId: row.credential_id, playerId };
}

export type CredentialLookupStatus = 'active' | 'revoked' | 'missing';

export interface CredentialLookupResult {
  readonly status: CredentialLookupStatus;
  readonly playerId?: string;
  readonly credentialId?: string;
}

/**
 * Full internal lookup: distinguishes active/revoked/missing. Intended for
 * repository-internal and administrative use (rotation, tests) -- NOT for
 * external authentication, which must not reveal whether a credential ever
 * existed.
 */
export async function findCredentialByHash(client: Queryable, hash: Buffer): Promise<CredentialLookupResult> {
  const result = await client.query<{ credential_id: string; player_id: string; revoked_at: Date | null }>(
    'SELECT credential_id, player_id, revoked_at FROM player_credentials WHERE credential_hash = $1',
    [hash]
  );
  const row = result.rows[0];

  if (!row) {
    return { status: 'missing' };
  }

  return {
    status: row.revoked_at === null ? 'active' : 'revoked',
    playerId: row.player_id,
    credentialId: row.credential_id
  };
}

export type ActiveCredentialLookupStatus = 'active' | 'not_active';

export interface ActiveCredentialLookupResult {
  readonly status: ActiveCredentialLookupStatus;
  readonly playerId?: string;
  readonly credentialId?: string;
}

/**
 * Authentication-safe lookup: collapses "revoked" and "missing" into the
 * same indistinguishable 'not_active' result so external callers (room
 * auth, HTTP endpoints) can never learn whether a credential ever existed.
 */
export async function findActiveCredentialByHash(
  client: Queryable,
  hash: Buffer
): Promise<ActiveCredentialLookupResult> {
  const result = await client.query<{ credential_id: string; player_id: string }>(
    'SELECT credential_id, player_id FROM player_credentials WHERE credential_hash = $1 AND revoked_at IS NULL',
    [hash]
  );
  const row = result.rows[0];

  return row
    ? { status: 'active', playerId: row.player_id, credentialId: row.credential_id }
    : { status: 'not_active' };
}

export type RevokeCredentialResult = 'revoked' | 'already_revoked' | 'not_found';

/**
 * Revocation never deletes the row and never clears a revoked_at that is
 * already set. Manages its own transaction and row lock.
 */
export async function revokeCredential(
  client: Queryable,
  playerId: string,
  credentialId: string
): Promise<RevokeCredentialResult> {
  await client.query('BEGIN');
  try {
    const selectResult = await client.query<{ revoked_at: Date | null }>(
      'SELECT revoked_at FROM player_credentials WHERE player_id = $1 AND credential_id = $2 FOR UPDATE',
      [playerId, credentialId]
    );
    const row = selectResult.rows[0];

    if (!row) {
      await client.query('ROLLBACK');
      return 'not_found';
    }

    if (row.revoked_at !== null) {
      await client.query('ROLLBACK');
      return 'already_revoked';
    }

    await client.query(
      'UPDATE player_credentials SET revoked_at = clock_timestamp() WHERE player_id = $1 AND credential_id = $2',
      [playerId, credentialId]
    );
    await client.query('COMMIT');
    return 'revoked';
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}

export interface RotateCredentialVerifier {
  readonly version: number;
  readonly algorithm: string;
  readonly hash: Buffer;
}

export type RotateCredentialResult =
  | { readonly status: 'rotated'; readonly newCredentialId: string }
  | { readonly status: 'not_found' }
  | { readonly status: 'mismatched_player' }
  | { readonly status: 'already_revoked' };

/**
 * Atomic rotation: lock the current credential, verify ownership and
 * liveness, revoke it, then insert the replacement -- all in one
 * transaction so no COMMIT can ever be observed with two active
 * credentials for the same player (migration 001's partial unique index
 * would reject that anyway). A failed insert rolls back the revocation
 * too, so a failed rotation never leaves the player without its previously
 * active credential. The caller generates the replacement raw secret via
 * credential.ts and discards it if this returns anything but 'rotated'.
 */
export async function rotateCredential(
  client: Queryable,
  playerId: string,
  currentCredentialId: string,
  newCredentialVerifier: RotateCredentialVerifier
): Promise<RotateCredentialResult> {
  await client.query('BEGIN');
  try {
    const selectResult = await client.query<{ player_id: string; revoked_at: Date | null }>(
      'SELECT player_id, revoked_at FROM player_credentials WHERE credential_id = $1 FOR UPDATE',
      [currentCredentialId]
    );
    const row = selectResult.rows[0];

    if (!row) {
      await client.query('ROLLBACK');
      return { status: 'not_found' };
    }

    if (row.player_id !== playerId) {
      await client.query('ROLLBACK');
      return { status: 'mismatched_player' };
    }

    if (row.revoked_at !== null) {
      await client.query('ROLLBACK');
      return { status: 'already_revoked' };
    }

    await client.query('UPDATE player_credentials SET revoked_at = clock_timestamp() WHERE credential_id = $1', [
      currentCredentialId
    ]);

    const insertResult = await client.query<{ credential_id: string }>(
      `INSERT INTO player_credentials (player_id, credential_version, algorithm, credential_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING credential_id`,
      [playerId, newCredentialVerifier.version, newCredentialVerifier.algorithm, newCredentialVerifier.hash]
    );
    const newRow = insertResult.rows[0];

    if (!newRow) {
      throw new Error('Failed to insert replacement credential: no row returned.');
    }

    await client.query('COMMIT');
    return { status: 'rotated', newCredentialId: newRow.credential_id };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}
