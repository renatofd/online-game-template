import { describe, expect, it } from "vitest";
import { parseTiledMap } from "./parse";
import type { TiledMap } from "./tiled";
import { validateTiledMap } from "./validate";

function makeMap(overrides: Partial<TiledMap> = {}): TiledMap {
  // 3x3 map: centre walkable, a wall at (2,1).
  return {
    type: "map",
    orientation: "orthogonal",
    infinite: false,
    width: 3,
    height: 3,
    tilewidth: 16,
    tileheight: 16,
    tilesets: [
      {
        firstgid: 1,
        name: "terrain",
        image: "terrain.png",
        tilewidth: 16,
        tileheight: 16,
        tiles: [{ id: 2, properties: [{ name: "collides", type: "bool", value: true }] }],
      },
    ],
    layers: [
      { type: "tilelayer", name: "ground", width: 3, height: 3, visible: true, data: [1, 1, 1, 1, 1, 1, 1, 1, 1] },
      { type: "tilelayer", name: "walls", width: 3, height: 3, visible: true, data: [0, 0, 0, 0, 0, 3, 0, 0, 0] },
      {
        type: "objectgroup",
        name: "objects",
        visible: true,
        objects: [{ id: 1, name: "", type: "spawn", x: 24, y: 24, width: 0, height: 0, point: true }],
      },
    ],
    ...overrides,
  };
}

describe("parseTiledMap", () => {
  it("builds the collision grid from tiles with collides=true", () => {
    const map = parseTiledMap(makeMap());
    expect(map.collision.isSolid(2, 1)).toBe(true);
    expect(map.collision.isSolid(1, 1)).toBe(false);
  });

  it("treats out-of-bounds as solid", () => {
    const { collision } = parseTiledMap(makeMap());
    expect(collision.isSolid(-1, 0)).toBe(true);
    expect(collision.isSolid(3, 0)).toBe(true);
  });

  it("ignores flip flags in gids", () => {
    const flippedWall = 3 | 0x80000000;
    const base = makeMap();
    const layers = base.layers.map((l) =>
      l.name === "walls" ? { ...l, data: [0, 0, 0, 0, 0, flippedWall, 0, 0, 0] } : l,
    ) as TiledMap["layers"];
    const { collision } = parseTiledMap({ ...base, layers });
    expect(collision.isSolid(2, 1)).toBe(true);
  });

  it("reads spawn points", () => {
    expect(parseTiledMap(makeMap()).spawns).toEqual([{ x: 24, y: 24 }]);
  });
});

describe("validateTiledMap", () => {
  it("accepts a valid map", () => {
    expect(validateTiledMap(makeMap())).toEqual([]);
  });

  it("rejects external tilesets", () => {
    const errors = validateTiledMap(makeMap({ tilesets: [{ firstgid: 1, source: "terrain.tsx" }] }));
    expect(errors.join()).toContain("external");
  });

  it("rejects the wrong tile size", () => {
    expect(validateTiledMap(makeMap({ tilewidth: 32, tileheight: 32 })).join()).toContain("tile size");
  });

  it("requires at least one spawn", () => {
    const base = makeMap();
    const layers = base.layers.map((l) => (l.type === "objectgroup" ? { ...l, objects: [] } : l));
    expect(validateTiledMap({ ...base, layers }).join()).toContain("spawn");
  });
});
