export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function magnitude(x: number, y: number): number {
  return Math.hypot(x, y);
}

export function normalizeVector(x: number, y: number): Phaser.Math.Vector2 {
  const length = magnitude(x, y);

  if (length === 0) {
    return new Phaser.Math.Vector2(0, 0);
  }

  return new Phaser.Math.Vector2(x / length, y / length);
}

export function approachZero(value: number, amount: number): number {
  if (Math.abs(value) <= amount) {
    return 0;
  }

  return value - Math.sign(value) * amount;
}

export function shortestAngleStep(current: number, target: number, factor: number): number {
  const delta = Phaser.Math.Angle.Wrap(target - current);
  return current + delta * factor;
}

export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString('ru-RU');
}
