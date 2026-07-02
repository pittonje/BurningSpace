import {
  NETWORK_RESPAWN_DELAY_MS,
  NETWORK_SHIP_MAX_HEALTH,
  NETWORK_SPAWN_INVULNERABILITY_MS,
  type Faction
} from '@burningspace/shared';
import { getFactionSpawnPosition } from './spawn.js';

export interface CombatShipState {
  ownerSessionId: string;
  faction: string;
  x: number;
  y: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  health: number;
  maxHealth: number;
  alive: boolean;
  active: boolean;
  respawnAt: number;
  invulnerableUntil: number;
  lastDamageAt: number;
}

export interface SegmentCircleHit {
  hit: boolean;
  t: number;
}

export function segmentCircleIntersectionT(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  circleX: number,
  circleY: number,
  radius: number
): SegmentCircleHit {
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const toCircleX = startX - circleX;
  const toCircleY = startY - circleY;
  const a = segmentX * segmentX + segmentY * segmentY;

  if (a <= 0) {
    const inside = toCircleX * toCircleX + toCircleY * toCircleY <= radius * radius;
    return { hit: inside, t: 0 };
  }

  const b = 2 * (toCircleX * segmentX + toCircleY * segmentY);
  const c = toCircleX * toCircleX + toCircleY * toCircleY - radius * radius;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return { hit: false, t: Infinity };
  }

  const sqrt = Math.sqrt(discriminant);
  const first = (-b - sqrt) / (2 * a);
  const second = (-b + sqrt) / (2 * a);

  if (first >= 0 && first <= 1) {
    return { hit: true, t: first };
  }

  if (second >= 0 && second <= 1) {
    return { hit: true, t: second };
  }

  return { hit: false, t: Infinity };
}

export function canDamageShip(
  ship: CombatShipState,
  ownerSessionId: string,
  projectileFaction: string,
  now: number
): boolean {
  return (
    ship.alive &&
    ship.active &&
    ship.ownerSessionId !== ownerSessionId &&
    ship.faction !== projectileFaction &&
    now >= ship.invulnerableUntil
  );
}

export function applyDamage(ship: CombatShipState, amount: number, now: number): boolean {
  if (!ship.alive || amount <= 0) {
    return false;
  }

  ship.health = Math.max(0, ship.health - amount);
  ship.lastDamageAt = now;

  if (ship.health <= 0) {
    killShip(ship, now);
    return true;
  }

  return false;
}

export function killShip(ship: CombatShipState, now: number): void {
  ship.alive = false;
  ship.active = false;
  ship.health = 0;
  ship.velocityX = 0;
  ship.velocityY = 0;
  ship.respawnAt = now + NETWORK_RESPAWN_DELAY_MS;
  ship.invulnerableUntil = 0;
}

export function respawnShip(ship: CombatShipState, now: number): void {
  const spawn = getFactionSpawnPosition(ship.faction as Faction, ship.ownerSessionId);
  ship.x = spawn.x;
  ship.y = spawn.y;
  ship.rotation = spawn.rotation;
  ship.velocityX = 0;
  ship.velocityY = 0;
  ship.maxHealth = NETWORK_SHIP_MAX_HEALTH;
  ship.health = NETWORK_SHIP_MAX_HEALTH;
  ship.alive = true;
  ship.active = true;
  ship.respawnAt = 0;
  ship.invulnerableUntil = now + NETWORK_SPAWN_INVULNERABILITY_MS;
}
