import type { CollisionGrid } from "@core/shared";
import { describe, expect, it } from "vitest";
import { PLAYER_HALF, PLAYER_SPEED, TICK_DT, TILE_SIZE } from "../constants";
import { stepPlayer } from "./movement";

/** Builds a grid from rows of "." (open) and "#" (solid). */
function gridFrom(rows: string[]): CollisionGrid {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  return {
    width,
    height,
    tileSize: TILE_SIZE,
    isSolid: (tx, ty) => tx < 0 || ty < 0 || tx >= width || ty >= height || rows[ty]?.[tx] === "#",
  };
}

const open = gridFrom(["#####", "#...#", "#...#", "#...#", "#####"]);
const centre = TILE_SIZE * 2.5;

describe("stepPlayer", () => {
  it("moves at PLAYER_SPEED in a straight line", () => {
    const p = { x: centre, y: centre, vx: 0, vy: 0 };
    stepPlayer(p, { moveX: 1, moveY: 0 }, TICK_DT, open);
    expect(p.x).toBeCloseTo(centre + PLAYER_SPEED * TICK_DT);
    expect(p.y).toBe(centre);
    expect(p.vx).toBeCloseTo(PLAYER_SPEED);
  });

  it("normalizes diagonal movement", () => {
    const p = { x: centre, y: centre, vx: 0, vy: 0 };
    stepPlayer(p, { moveX: 1, moveY: 1 }, TICK_DT, open);
    const dist = Math.hypot(p.x - centre, p.y - centre);
    expect(dist).toBeCloseTo(PLAYER_SPEED * TICK_DT);
  });

  it("clamps out-of-range input from a modified client", () => {
    const p = { x: centre, y: centre, vx: 0, vy: 0 };
    stepPlayer(p, { moveX: 100, moveY: 0 }, TICK_DT, open);
    expect(p.x).toBeCloseTo(centre + PLAYER_SPEED * TICK_DT);
  });

  it("stops flush against a wall and zeroes velocity into it", () => {
    const p = { x: centre, y: centre, vx: 0, vy: 0 };
    for (let i = 0; i < 120; i++) stepPlayer(p, { moveX: 1, moveY: 0 }, TICK_DT, open);
    // Right wall starts at tile 4.
    expect(p.x).toBeCloseTo(TILE_SIZE * 4 - PLAYER_HALF);
    expect(p.vx).toBe(0);
  });

  it("slides along a wall when moving diagonally into it", () => {
    const p = { x: TILE_SIZE * 4 - PLAYER_HALF, y: centre, vx: 0, vy: 0 };
    stepPlayer(p, { moveX: 1, moveY: 1 }, TICK_DT, open);
    expect(p.x).toBeCloseTo(TILE_SIZE * 4 - PLAYER_HALF);
    expect(p.y).toBeGreaterThan(centre);
  });

  it("is deterministic: same inputs produce the same state", () => {
    const inputs = [
      { moveX: 1, moveY: 0 },
      { moveX: 1, moveY: 1 },
      { moveX: 0, moveY: -1 },
      { moveX: -1, moveY: 0 },
    ];
    const run = () => {
      const p = { x: centre, y: centre, vx: 0, vy: 0 };
      for (let i = 0; i < 200; i++) stepPlayer(p, inputs[i % inputs.length] ?? { moveX: 0, moveY: 0 }, TICK_DT, open);
      return p;
    };
    expect(run()).toEqual(run());
  });
});
