import { describe, expect, it } from 'vitest';
import {
  NETWORK_RESPAWN_DELAY_MS,
  NETWORK_SHIP_MAX_HEALTH
} from '@burningspace/shared';
import { applyDamage, type CombatShipState } from '../src/systems/combat.js';

function createShip(overrides: Partial<CombatShipState> = {}): CombatShipState {
  return {
    ownerSessionId: 'target',
    faction: 'blue',
    x: 500,
    y: 500,
    rotation: 0,
    velocityX: 30,
    velocityY: -20,
    health: NETWORK_SHIP_MAX_HEALTH,
    maxHealth: NETWORK_SHIP_MAX_HEALTH,
    alive: true,
    active: true,
    respawnAt: 0,
    invulnerableUntil: 0,
    lastDamageAt: 0,
    ...overrides
  };
}

describe('combat damage', () => {
  it('reduces health and records non-lethal damage deterministically', () => {
    const ship = createShip();

    expect(applyDamage(ship, 25, 1_000)).toBe(false);
    expect(ship.health).toBe(NETWORK_SHIP_MAX_HEALTH - 25);
    expect(ship.lastDamageAt).toBe(1_000);
    expect(ship.alive).toBe(true);
    expect(ship.active).toBe(true);
  });

  it('clamps lethal damage and schedules the existing death lifecycle', () => {
    const ship = createShip({ health: 10, invulnerableUntil: 500 });

    expect(applyDamage(ship, 25, 2_000)).toBe(true);
    expect(ship.health).toBe(0);
    expect(ship.alive).toBe(false);
    expect(ship.active).toBe(false);
    expect(ship.velocityX).toBe(0);
    expect(ship.velocityY).toBe(0);
    expect(ship.respawnAt).toBe(2_000 + NETWORK_RESPAWN_DELAY_MS);
    expect(ship.invulnerableUntil).toBe(0);
    expect(ship.lastDamageAt).toBe(2_000);
  });

  it('ignores non-positive damage without mutating the ship', () => {
    const ship = createShip();
    const before = { ...ship };

    expect(applyDamage(ship, 0, 3_000)).toBe(false);
    expect(ship).toEqual(before);
  });

  it('does not damage an already dead ship', () => {
    const ship = createShip({ health: 0, alive: false, active: false, lastDamageAt: 1_000 });

    expect(applyDamage(ship, 25, 3_000)).toBe(false);
    expect(ship.health).toBe(0);
    expect(ship.lastDamageAt).toBe(1_000);
  });
});
