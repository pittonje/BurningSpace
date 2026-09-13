import type { PlayerInputPayload } from '../network/NetworkClient';

export type MovementIntent = Pick<PlayerInputPayload, 'up' | 'down' | 'left' | 'right'>;

export interface PlayerInputContext {
  camera: { getWorldPoint(x: number, y: number): { x: number; y: number } };
  aimOrigin: { x: number; y: number };
  canShoot: boolean;
}

/** Physical input intent only; scheduling, lifecycle and authority stay in the scene. */
export interface GameplayInputSource {
  getMovement(): MovementIntent;
  samplePlayerInput(context: PlayerInputContext): PlayerInputPayload;
  consumeBackRequest(): boolean;
  destroy(): void;
}
