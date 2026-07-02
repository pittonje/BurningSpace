import type { PlayerInputMessage } from '@burningspace/shared';
import { normalizeAngle } from '../systems/shipMovement.js';

export type PlayerInputValidationResult =
  | { ok: true; input: PlayerInputMessage }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createNeutralInput(sequence = 0): PlayerInputMessage {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    aimAngle: 0,
    sequence
  };
}

export function validatePlayerInputMessage(value: unknown, previousSequence: number): PlayerInputValidationResult {
  if (!isRecord(value)) {
    return { ok: false, reason: 'Input payload must be an object.' };
  }

  if (
    typeof value.up !== 'boolean' ||
    typeof value.down !== 'boolean' ||
    typeof value.left !== 'boolean' ||
    typeof value.right !== 'boolean'
  ) {
    return { ok: false, reason: 'Movement flags must be boolean.' };
  }

  if (typeof value.aimAngle !== 'number' || !Number.isFinite(value.aimAngle)) {
    return { ok: false, reason: 'aimAngle must be finite.' };
  }

  if (
    typeof value.sequence !== 'number' ||
    !Number.isFinite(value.sequence) ||
    !Number.isInteger(value.sequence) ||
    value.sequence < 0
  ) {
    return { ok: false, reason: 'sequence must be a non-negative integer.' };
  }

  if (value.sequence <= previousSequence) {
    return { ok: false, reason: 'sequence is stale.' };
  }

  return {
    ok: true,
    input: {
      up: value.up,
      down: value.down,
      left: value.left,
      right: value.right,
      aimAngle: normalizeAngle(value.aimAngle),
      sequence: value.sequence
    }
  };
}
