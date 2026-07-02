import {
  NETWORK_SHIP_MAX_SPEED,
  NETWORK_SHIP_RADIUS,
  WORLD_WIDTH,
  type PlayerInputMessage
} from '@burningspace/shared';
import {
  normalizeDirection,
  rotateToward,
  simulateShipMovement,
  type MutableShipMotionState
} from '../src/systems/shipMovement.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createShip(overrides: Partial<MutableShipMotionState> = {}): MutableShipMotionState {
  return {
    x: 1000,
    y: 1000,
    rotation: 0,
    velocityX: 0,
    velocityY: 0,
    lastProcessedInput: 0,
    ...overrides
  };
}

const diagonal = normalizeDirection(1, 1);
assert(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 0.0001, 'Diagonal input should normalize to length 1.');

const fastShip = createShip({ velocityX: NETWORK_SHIP_MAX_SPEED * 3 });
simulateShipMovement(fastShip, neutralInput(1), 0.05);
assert(Math.hypot(fastShip.velocityX, fastShip.velocityY) <= NETWORK_SHIP_MAX_SPEED, 'Speed should not exceed max speed.');

const boundaryShip = createShip({ x: WORLD_WIDTH - 4, velocityX: NETWORK_SHIP_MAX_SPEED });
simulateShipMovement(boundaryShip, neutralInput(1), 0.1);
assert(boundaryShip.x <= WORLD_WIDTH - NETWORK_SHIP_RADIUS, 'Ship should stay inside world bounds.');

const decelShip = createShip({ velocityX: 100 });
for (let index = 1; index <= 4; index += 1) {
  simulateShipMovement(decelShip, neutralInput(index), 0.05);
}
assert(Math.abs(decelShip.velocityX) < 0.0001, 'Deceleration should bring velocity toward zero.');

const rotated = rotateToward(Math.PI - 0.1, -Math.PI + 0.1, 0.05);
assert(rotated > Math.PI - 0.11 || rotated < -Math.PI + 0.2, 'rotateToward should use shortest angle path.');

console.log(JSON.stringify({ ok: true }, null, 2));

function neutralInput(sequence: number): PlayerInputMessage {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    aimAngle: 0,
    shooting: false,
    sequence
  };
}
