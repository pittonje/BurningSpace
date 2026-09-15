import type { Client } from 'pg';

export type Queryable = Pick<Client, 'query'>;

export type Faction = 'red' | 'blue';

export interface DurableMembership {
  readonly worldId: string;
  readonly playerId: string;
  readonly faction: Faction | null;
}

interface MembershipRow {
  readonly world_id: string;
  readonly player_id: string;
  readonly faction: Faction | null;
}

function toMembership(row: MembershipRow): DurableMembership {
  return { worldId: row.world_id, playerId: row.player_id, faction: row.faction };
}

/** Locks the exact membership row (if any) for the caller's transaction. */
export async function lockMembership(
  client: Queryable,
  worldId: string,
  playerId: string
): Promise<DurableMembership | null> {
  const result = await client.query<MembershipRow>(
    'SELECT world_id, player_id, faction FROM world_memberships WHERE world_id = $1 AND player_id = $2 FOR UPDATE',
    [worldId, playerId]
  );
  const row = result.rows[0];
  return row ? toMembership(row) : null;
}

/** Non-locking read, for callers that only need to observe current state. */
export async function findMembership(
  client: Queryable,
  worldId: string,
  playerId: string
): Promise<DurableMembership | null> {
  const result = await client.query<MembershipRow>(
    'SELECT world_id, player_id, faction FROM world_memberships WHERE world_id = $1 AND player_id = $2',
    [worldId, playerId]
  );
  const row = result.rows[0];
  return row ? toMembership(row) : null;
}

export type EstablishFactionOutcome = 'created' | 'assigned' | 'idempotent' | 'conflict';

export interface EstablishFactionResult {
  readonly outcome: EstablishFactionOutcome;
  readonly membership: DurableMembership;
}

/**
 * The single semantic player-mode faction operation. Callers must already
 * hold the world/player/credential locks in the accepted lock order; this
 * function locks (or creates) the membership row itself.
 *
 * - no row exists: creates it with the requested faction -- this single
 *   insert establishes BOTH the initial membership AND the immutable
 *   foundation faction -> 'created'
 * - row exists with faction NULL (legacy membership): assigns the
 *   requested faction -> 'assigned'
 * - row exists with the SAME faction already assigned: idempotent retry,
 *   no mutation -> 'idempotent'
 * - row exists with a DIFFERENT faction already assigned: durable conflict,
 *   no mutation -> 'conflict'
 *
 * Race-safe insert-first convergence (mirrors bootstrapWorld's pattern):
 * when a row does not yet exist, two concurrent first-choice transactions
 * (e.g. the same durable player's two tabs) both attempt the INSERT; the
 * loser blocks on the winner's row lock via ON CONFLICT DO NOTHING, then
 * falls through to lock and evaluate the one canonical row exactly as if
 * it had existed from the start -- never a raw unique-constraint error,
 * never two rows, never two foundation factions for one player.
 *
 * Callers must increment worlds.state_revision exactly once for 'created'
 * and 'assigned' outcomes, and never for 'idempotent'/'conflict'.
 */
export async function establishPlayerFaction(
  client: Queryable,
  worldId: string,
  playerId: string,
  requestedFaction: Faction
): Promise<EstablishFactionResult> {
  const insertResult = await client.query<MembershipRow>(
    `INSERT INTO world_memberships (world_id, player_id, faction, faction_assigned_at)
     VALUES ($1, $2, $3, clock_timestamp())
     ON CONFLICT (world_id, player_id) DO NOTHING
     RETURNING world_id, player_id, faction`,
    [worldId, playerId, requestedFaction]
  );
  const insertedRow = insertResult.rows[0];

  if (insertedRow) {
    return { outcome: 'created', membership: toMembership(insertedRow) };
  }

  const existing = await lockMembership(client, worldId, playerId);

  if (!existing) {
    throw new Error('Failed to create or find world membership after an INSERT conflict.');
  }

  if (existing.faction === null) {
    const updateResult = await client.query<MembershipRow>(
      `UPDATE world_memberships
       SET faction = $3, faction_assigned_at = clock_timestamp(), updated_at = clock_timestamp()
       WHERE world_id = $1 AND player_id = $2
       RETURNING world_id, player_id, faction`,
      [worldId, playerId, requestedFaction]
    );
    const row = updateResult.rows[0];

    if (!row) {
      throw new Error('Failed to assign world membership faction: no row returned.');
    }

    return { outcome: 'assigned', membership: toMembership(row) };
  }

  if (existing.faction === requestedFaction) {
    return { outcome: 'idempotent', membership: existing };
  }

  return { outcome: 'conflict', membership: existing };
}
