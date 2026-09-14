import type { Client } from 'pg';

export type Queryable = Pick<Client, 'query'>;

export interface DurablePlayer {
  readonly playerId: string;
  readonly displayName: string | null;
}

interface PlayerRow {
  readonly player_id: string;
  readonly display_name: string | null;
}

/**
 * Creates only global identity metadata: no world membership, faction, or
 * gameplay lease. Those belong to later packets.
 */
export async function createPlayer(client: Queryable): Promise<DurablePlayer> {
  const result = await client.query<PlayerRow>(
    'INSERT INTO players DEFAULT VALUES RETURNING player_id, display_name'
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to create player: no row returned.');
  }

  return { playerId: row.player_id, displayName: row.display_name };
}

/**
 * Locks the exact durable player row for the duration of the caller's
 * transaction. Returns null if the player does not exist. display_name is
 * metadata only -- callers must never treat this as authenticating the
 * caller; the credential lock (credentialsRepository) is what proves
 * ownership.
 */
export async function lockPlayer(client: Queryable, playerId: string): Promise<DurablePlayer | null> {
  const result = await client.query<PlayerRow>(
    'SELECT player_id, display_name FROM players WHERE player_id = $1 FOR UPDATE',
    [playerId]
  );
  const row = result.rows[0];
  return row ? { playerId: row.player_id, displayName: row.display_name } : null;
}

/**
 * Updates display_name metadata only. Never touches world membership,
 * faction, or any gameplay-authority state, and never affects
 * worlds.state_revision.
 */
export async function updatePlayerDisplayName(
  client: Queryable,
  playerId: string,
  displayName: string
): Promise<void> {
  await client.query('UPDATE players SET display_name = $2, updated_at = clock_timestamp() WHERE player_id = $1', [
    playerId,
    displayName
  ]);
}
