import { PLAYER_HALF, PLAYER_SPEED } from "../constants";
import { type CollisionGrid, moveAxis } from "../physics/collision";

/**
 * Structural types on purpose: the same step runs on the server's Schema
 * instance and on the client reconciler's plain predicted copy.
 */
export interface MovableState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface MoveInputLike {
  moveX: number;
  moveY: number;
}

const clampAxis = (v: number): -1 | 0 | 1 => (v > 0 ? 1 : v < 0 ? -1 : 0);

/**
 * The single movement step, run identically by the server (once per received
 * input) and by the client (prediction and replay after a correction).
 *
 * Contract: pure function of (state, input, dt, grid). No clocks, no randomness,
 * no reads outside its arguments. Breaking this makes prediction drift.
 */
export function stepPlayer(state: MovableState, input: MoveInputLike, dt: number, grid: CollisionGrid): void {
  let dirX: number = clampAxis(input.moveX);
  let dirY: number = clampAxis(input.moveY);

  // Diagonal movement must not be faster than straight movement.
  if (dirX !== 0 && dirY !== 0) {
    dirX *= Math.SQRT1_2;
    dirY *= Math.SQRT1_2;
  }

  const dx = dirX * PLAYER_SPEED * dt;
  const dy = dirY * PLAYER_SPEED * dt;

  // Resolve each axis separately so players slide along walls.
  const nextX = moveAxis(grid, "x", state.x, state.y, PLAYER_HALF, dx);
  const nextY = moveAxis(grid, "y", nextX, state.y, PLAYER_HALF, dy);

  state.vx = dt > 0 ? (nextX - state.x) / dt : 0;
  state.vy = dt > 0 ? (nextY - state.y) / dt : 0;
  state.x = nextX;
  state.y = nextY;
}
