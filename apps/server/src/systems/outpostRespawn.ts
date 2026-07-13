import type { Faction } from '@burningspace/shared';

export const OUTPOST_ADJACENT_SECTOR_COUNT = 6;

export const OUTPOST_RESPAWN_COMBAT_LOCK_MS = 120_000;

export interface AdjacentSectorControlState {
  ownerFaction: Faction;
  controlPercent: number;
}

export function hasOutpostRespawnTerritorialEligibility(
  outpostFaction: Faction,
  sectors: readonly AdjacentSectorControlState[]
): boolean {
  return (
    sectors.length === OUTPOST_ADJACENT_SECTOR_COUNT &&
    sectors.every(
      (sector) =>
        sector.ownerFaction === outpostFaction && sector.controlPercent === 100
    )
  );
}

export function isOutpostRespawnEligible(
  outpostFaction: Faction,
  sectors: readonly AdjacentSectorControlState[],
  combatLockUntilMs: number | null,
  nowMs: number
): boolean {
  const combatLockActive = combatLockUntilMs !== null && nowMs < combatLockUntilMs;

  return (
    hasOutpostRespawnTerritorialEligibility(outpostFaction, sectors) &&
    !combatLockActive
  );
}
