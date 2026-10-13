import { describe, expect, it } from "vitest";
import { SpatialHash } from "./SpatialHash";

describe("SpatialHash", () => {
  it("finds entries within a radius", () => {
    const grid = new SpatialHash<string>(100);
    grid.set("a", 10, 10);
    grid.set("b", 150, 10);
    grid.set("c", 1000, 1000);
    expect(grid.queryRadius(0, 0, 200).sort()).toEqual(["a", "b"]);
    expect(grid.queryRadius(0, 0, 50)).toEqual(["a"]);
  });

  it("tracks moves across cells and deletions", () => {
    const grid = new SpatialHash<number>(50);
    grid.set(1, 0, 0);
    grid.set(1, 500, 500);
    expect(grid.queryRadius(0, 0, 10)).toEqual([]);
    expect(grid.queryRadius(500, 500, 10)).toEqual([1]);
    grid.delete(1);
    expect(grid.queryRadius(500, 500, 10)).toEqual([]);
    expect(grid.size).toBe(0);
  });

  it("handles negative coordinates", () => {
    const grid = new SpatialHash<string>(32);
    grid.set("n", -100, -100);
    expect(grid.queryRadius(-90, -90, 20)).toEqual(["n"]);
  });

  it("matches a brute-force search", () => {
    const grid = new SpatialHash<number>(64);
    const points: [number, number][] = [];
    let seed = 1;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 500; i++) {
      const p: [number, number] = [rnd() * 2000 - 1000, rnd() * 2000 - 1000];
      points.push(p);
      grid.set(i, p[0], p[1]);
    }
    const expected = points.flatMap(([x, y], i) => (Math.hypot(x - 100, y + 50) <= 300 ? [i] : []));
    expect(grid.queryRadius(100, -50, 300).sort((a, b) => a - b)).toEqual(expected);
  });
});
