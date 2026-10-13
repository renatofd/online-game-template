import { describe, expect, it } from "vitest";
import { boxHitsSolid, type CollisionGrid, moveAxis } from "./collision";

const TS = 16;
/** "." open, "#" solid. Outside the grid is solid. */
function gridFrom(rows: string[]): CollisionGrid {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  return {
    width,
    height,
    tileSize: TS,
    isSolid: (tx, ty) => tx < 0 || ty < 0 || tx >= width || ty >= height || rows[ty]?.[tx] === "#",
  };
}

const grid = gridFrom(["###", "#.#", "###"]);

describe("boxHitsSolid", () => {
  it("is false for a box inside an open tile", () => {
    expect(boxHitsSolid(grid, 24, 24, 6)).toBe(false);
  });
  it("is false when resting exactly on a tile edge", () => {
    expect(boxHitsSolid(grid, 32 - 6, 24, 6)).toBe(false);
  });
  it("is true when overlapping a wall", () => {
    expect(boxHitsSolid(grid, 30, 24, 6)).toBe(true);
  });
});

describe("moveAxis", () => {
  it("moves freely in open space", () => {
    expect(moveAxis(grid, "x", 24, 24, 6, 1)).toBe(25);
  });
  it("stops flush against a wall", () => {
    expect(moveAxis(grid, "x", 24, 24, 6, 5)).toBe(26);
    expect(moveAxis(grid, "y", 24, 24, 6, -5)).toBe(22);
  });
});
