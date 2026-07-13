import { describe, expect, it } from 'vitest';
import type { Faction } from '@burningspace/shared';
import {
  OUTPOST_ADJACENT_SECTOR_COUNT,
  OUTPOST_RESPAWN_COMBAT_LOCK_MS,
  hasOutpostRespawnTerritorialEligibility,
  isOutpostRespawnEligible,
  type AdjacentSectorControlState
} from '../src/systems/outpostRespawn.js';

function createSectors(
  count = OUTPOST_ADJACENT_SECTOR_COUNT,
  ownerFaction: Faction = 'blue',
  controlPercent = 100
): AdjacentSectorControlState[] {
  return Array.from({ length: count }, () => ({ ownerFaction, controlPercent }));
}

describe('outpost respawn eligibility', () => {
  it('accepts exactly six fully stabilized allied sectors without a combat lock', () => {
    const sectors = createSectors();

    expect(hasOutpostRespawnTerritorialEligibility('blue', sectors)).toBe(true);
    expect(isOutpostRespawnEligible('blue', sectors, null, 1_000)).toBe(true);
  });

  it('rejects five fully stabilized allied sectors', () => {
    expect(hasOutpostRespawnTerritorialEligibility('blue', createSectors(5))).toBe(
      false
    );
  });

  it('rejects seven fully stabilized allied sectors', () => {
    expect(hasOutpostRespawnTerritorialEligibility('blue', createSectors(7))).toBe(
      false
    );
  });

  it('rejects one enemy-owned sector among six fully stabilized sectors', () => {
    const sectors = [
      ...createSectors(5),
      { ownerFaction: 'red' as const, controlPercent: 100 }
    ];

    expect(hasOutpostRespawnTerritorialEligibility('blue', sectors)).toBe(false);
  });

  it('rejects one allied sector at 99 percent control', () => {
    const sectors = createSectors();
    sectors[5] = { ownerFaction: 'blue', controlPercent: 99 };

    expect(hasOutpostRespawnTerritorialEligibility('blue', sectors)).toBe(false);
  });

  it('rejects six allied sectors at 80 percent control', () => {
    expect(hasOutpostRespawnTerritorialEligibility('blue', createSectors(6, 'blue', 80))).toBe(
      false
    );
  });

  it('rejects mixed allied control values between 50 and 99 percent', () => {
    const sectors = [50, 60, 70, 80, 90, 99].map((controlPercent) => ({
      ownerFaction: 'blue' as const,
      controlPercent
    }));

    expect(hasOutpostRespawnTerritorialEligibility('blue', sectors)).toBe(false);
  });

  it('rejects valid territory while the combat lock is active', () => {
    const nowMs = 10_000;

    expect(
      isOutpostRespawnEligible(
        'blue',
        createSectors(),
        nowMs + OUTPOST_RESPAWN_COMBAT_LOCK_MS,
        nowMs
      )
    ).toBe(false);
  });

  it('accepts valid territory at the exact combat lock expiry', () => {
    const combatLockUntilMs = 10_000 + OUTPOST_RESPAWN_COMBAT_LOCK_MS;

    expect(
      isOutpostRespawnEligible('blue', createSectors(), combatLockUntilMs, combatLockUntilMs)
    ).toBe(true);
  });

  it('accepts valid territory when no combat lock exists', () => {
    expect(isOutpostRespawnEligible('blue', createSectors(), null, 10_000)).toBe(true);
  });

  it('re-evaluates a new snapshot immediately without stale state', () => {
    const validSectors = createSectors();
    const changedSectors = validSectors.map((sector, index) =>
      index === 0 ? { ...sector, controlPercent: 99 } : sector
    );

    expect(isOutpostRespawnEligible('blue', validSectors, null, 10_000)).toBe(true);
    expect(isOutpostRespawnEligible('blue', changedSectors, null, 10_000)).toBe(false);
  });

  it('does not treat a separate shield threshold as respawn eligibility', () => {
    const sectorsAtShieldThreshold = createSectors(6, 'blue', 80);

    expect(
      isOutpostRespawnEligible('blue', sectorsAtShieldThreshold, null, 10_000)
    ).toBe(false);
  });

  it('uses a 120-second combat lock duration', () => {
    expect(OUTPOST_RESPAWN_COMBAT_LOCK_MS).toBe(120_000);
  });
});
