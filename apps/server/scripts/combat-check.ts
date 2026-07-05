import {
  NETWORK_PROJECTILE_DAMAGE,
  NETWORK_RESPAWN_DELAY_MS,
  NETWORK_SHIP_MAX_HEALTH,
  NETWORK_SPAWN_INVULNERABILITY_MS
} from '@burningspace/shared';
import {
  applyDamage,
  canDamageShip,
  respawnShip,
  segmentCircleIntersectionT,
  type CombatShipState
} from '../src/systems/combat.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createShip(overrides: Partial<CombatShipState> = {}): CombatShipState {
  return {
    ownerSessionId: 'target',
    faction: 'blue',
    x: 500,
    y: 500,
    rotation: 0,
    velocityX: 0,
    velocityY: 0,
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

const sweptHit = segmentCircleIntersectionT(0, 0, 100, 0, 60, 0, 12);
assert(sweptHit.hit && sweptHit.t > 0 && sweptHit.t < 1, 'Swept segment should hit circle.');

const sweptMiss = segmentCircleIntersectionT(0, 0, 100, 0, 60, 80, 12);
assert(!sweptMiss.hit, 'Swept segment should miss distant circle.');

const target = createShip();
assert(canDamageShip(target, 'attacker', 'red', 1000), 'Enemy alive ship should be damageable.');
assert(!canDamageShip(target, 'target', 'red', 1000), 'Projectile should not damage its owner.');
assert(!canDamageShip(target, 'attacker', 'blue', 1000), 'Projectile should not damage friendly ships.');
assert(!canDamageShip(createShip({ invulnerableUntil: 2000 }), 'attacker', 'red', 1000), 'Invulnerable ship should ignore damage.');
assert(!canDamageShip(createShip({ alive: false, active: false }), 'attacker', 'red', 1000), 'Dead ship should ignore damage.');

const damaged = createShip();
const killedByFirstHit = applyDamage(damaged, NETWORK_PROJECTILE_DAMAGE, 1000);
assert(!killedByFirstHit, 'One projectile should not kill a full-health ship.');
assert(damaged.health === NETWORK_SHIP_MAX_HEALTH - NETWORK_PROJECTILE_DAMAGE, 'Damage should reduce ship health.');

const killed = applyDamage(damaged, NETWORK_SHIP_MAX_HEALTH, 1500);
assert(killed, 'Lethal damage should report a kill.');
assert(!damaged.alive && !damaged.active, 'Killed ship should become inactive.');
assert(damaged.health === 0, 'Killed ship health should clamp to zero.');
assert(damaged.respawnAt === 1500 + NETWORK_RESPAWN_DELAY_MS, 'Killed ship should schedule respawn.');

const respawnAt = damaged.respawnAt;
respawnShip(damaged, respawnAt);
assert(damaged.alive && damaged.active, 'Respawn should reactivate ship.');
assert(damaged.health === NETWORK_SHIP_MAX_HEALTH, 'Respawn should restore full health.');
assert(damaged.invulnerableUntil === respawnAt + NETWORK_SPAWN_INVULNERABILITY_MS, 'Respawn should grant invulnerability.');

console.log(JSON.stringify({ ok: true }, null, 2));
