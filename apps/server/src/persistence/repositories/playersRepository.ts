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
