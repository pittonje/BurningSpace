import { describe, expect, it } from 'vitest';
import {
  createNeutralInput,
  validatePlayerInputMessage
} from '../src/validation/playerInput.js';

function validInput(sequence = 1): Record<string, unknown> {
  return {
    up: true,
    down: false,
    left: false,
    right: true,
    aimAngle: 0,
    shooting: true,
    sequence
  };
}

describe('player input validation', () => {
  it('creates deterministic neutral input with the requested sequence', () => {
    expect(createNeutralInput(7)).toEqual({
      up: false,
      down: false,
      left: false,
      right: false,
      aimAngle: 0,
      shooting: false,
      sequence: 7
    });
  });

  it.each([null, [], 'input'])('rejects a non-object payload: %j', (payload) => {
    expect(validatePlayerInputMessage(payload, 0)).toEqual({
      ok: false,
      reason: 'Input payload must be an object.'
    });
  });

  it('rejects non-boolean movement flags', () => {
    expect(validatePlayerInputMessage({ ...validInput(), up: 1 }, 0)).toEqual({
      ok: false,
      reason: 'Movement flags must be boolean.'
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])('rejects a non-finite aim angle: %s', (aimAngle) => {
    expect(validatePlayerInputMessage({ ...validInput(), aimAngle }, 0)).toEqual({
      ok: false,
      reason: 'aimAngle must be finite.'
    });
  });

  it.each([-1, 1.5])('rejects an invalid input sequence: %s', (sequence) => {
    expect(validatePlayerInputMessage(validInput(sequence), 0)).toEqual({
      ok: false,
      reason: 'sequence must be a non-negative integer.'
    });
  });

  it('rejects stale or repeated input sequences', () => {
    expect(validatePlayerInputMessage(validInput(4), 4)).toEqual({
      ok: false,
      reason: 'sequence is stale.'
    });
  });

  it('accepts a newer sequence and normalizes its aim angle', () => {
    const result = validatePlayerInputMessage(
      { ...validInput(5), aimAngle: Math.PI * 3 },
      4
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.sequence).toBe(5);
      expect(result.input.aimAngle).toBeCloseTo(Math.PI);
      expect(result.input.shooting).toBe(true);
    }
  });
});
