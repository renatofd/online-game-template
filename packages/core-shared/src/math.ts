export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

/** Rounds to -1, 0 or 1 by sign. Useful to enforce digital axes from untrusted input. */
export const signAxis = (v: number): -1 | 0 | 1 => (v > 0 ? 1 : v < 0 ? -1 : 0);
