import {
  BLUE_BASE_X,
  BLUE_BASE_Y,
  NETWORK_SHIP_RADIUS,
  RED_BASE_X,
  RED_BASE_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type Faction
} from '@burningspace/shared';

export interface SpawnPosition {
  x: number;
  y: number;
  rotation: number;
}

function hashSessionId(sessionId: string): number {
  let hash = 0;

  for (let index = 0; index < sessionId.length; index += 1) {
    hash = (hash * 31 + sessionId.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getFactionSpawnPosition(faction: Faction, sessionId: string): SpawnPosition {
  const hash = hashSessionId(sessionId);
  const angle = ((hash % 360) / 180) * Math.PI;
  const distance = 150 + (hash % 120);
  const offsetX = Math.cos(angle) * distance;
  const offsetY = Math.sin(angle) * distance;
  const baseX = faction === 'red' ? RED_BASE_X : BLUE_BASE_X;
  const baseY = faction === 'red' ? RED_BASE_Y : BLUE_BASE_Y;
  const margin = NETWORK_SHIP_RADIUS;

  return {
    x: clamp(baseX + offsetX, margin, WORLD_WIDTH - margin),
    y: clamp(baseY + offsetY, margin, WORLD_HEIGHT - margin),
    rotation: faction === 'red' ? Math.PI / 4 : -3 * Math.PI / 4
  };
}
