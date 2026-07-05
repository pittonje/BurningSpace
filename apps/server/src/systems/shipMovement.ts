import {
  NETWORK_SHIP_ACCELERATION,
  NETWORK_SHIP_DECELERATION,
  NETWORK_SHIP_MAX_SPEED,
  NETWORK_SHIP_RADIUS,
  NETWORK_SHIP_TURN_SPEED,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type PlayerInputMessage
} from '@burningspace/shared';

export interface MutableShipMotionState {
  x: number;
  y: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  lastProcessedInput: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function moveToward(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }

  return current + Math.sign(target - current) * maxDelta;
}

export function normalizeAngle(angle: number): number {
  let normalized = angle;

  while (normalized <= -Math.PI) {
    normalized += Math.PI * 2;
  }

  while (normalized > Math.PI) {
    normalized -= Math.PI * 2;
  }

  return normalized;
}

export function rotateToward(current: number, target: number, maxDelta: number): number {
  const delta = normalizeAngle(target - current);

  if (Math.abs(delta) <= maxDelta) {
    return normalizeAngle(target);
  }

  return normalizeAngle(current + Math.sign(delta) * maxDelta);
}

export function clampMagnitude(x: number, y: number, maxMagnitude: number): { x: number; y: number } {
  const magnitude = Math.hypot(x, y);

  if (magnitude <= maxMagnitude || magnitude <= 0) {
    return { x, y };
  }

  const scale = maxMagnitude / magnitude;
  return {
    x: x * scale,
    y: y * scale
  };
}

export function normalizeDirection(x: number, y: number): { x: number; y: number } {
  const magnitude = Math.hypot(x, y);

  if (magnitude <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / magnitude,
    y: y / magnitude
  };
}

export function simulateShipMovement(ship: MutableShipMotionState, input: PlayerInputMessage, deltaSeconds: number): void {
  const dt = clamp(deltaSeconds, 0, 0.1);
  const rawDirectionX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const rawDirectionY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const direction = normalizeDirection(rawDirectionX, rawDirectionY);
  const hasMovementInput = direction.x !== 0 || direction.y !== 0;

  if (hasMovementInput) {
    ship.velocityX += direction.x * NETWORK_SHIP_ACCELERATION * dt;
    ship.velocityY += direction.y * NETWORK_SHIP_ACCELERATION * dt;
  } else {
    ship.velocityX = moveToward(ship.velocityX, 0, NETWORK_SHIP_DECELERATION * dt);
    ship.velocityY = moveToward(ship.velocityY, 0, NETWORK_SHIP_DECELERATION * dt);
  }

  const clampedVelocity = clampMagnitude(ship.velocityX, ship.velocityY, NETWORK_SHIP_MAX_SPEED);
  ship.velocityX = clampedVelocity.x;
  ship.velocityY = clampedVelocity.y;
  ship.rotation = rotateToward(ship.rotation, normalizeAngle(input.aimAngle), NETWORK_SHIP_TURN_SPEED * dt);
  ship.x += ship.velocityX * dt;
  ship.y += ship.velocityY * dt;

  const minX = NETWORK_SHIP_RADIUS;
  const minY = NETWORK_SHIP_RADIUS;
  const maxX = WORLD_WIDTH - NETWORK_SHIP_RADIUS;
  const maxY = WORLD_HEIGHT - NETWORK_SHIP_RADIUS;
  const clampedX = clamp(ship.x, minX, maxX);
  const clampedY = clamp(ship.y, minY, maxY);

  if (clampedX !== ship.x) {
    ship.velocityX = 0;
    ship.x = clampedX;
  }

  if (clampedY !== ship.y) {
    ship.velocityY = 0;
    ship.y = clampedY;
  }

  ship.lastProcessedInput = input.sequence;
}
