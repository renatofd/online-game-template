import type { CollisionGrid } from "@game/shared";
import { cleanGid, flattenLayers, getProperty, type TiledMap } from "./tiled";
import { OBJECT_CLASSES, REQUIRED_LAYERS, validateTiledMap } from "./validate";

export interface SpawnPoint {
  x: number;
  y: number;
}

/** Engine-agnostic gameplay data extracted from a Tiled map. */
export interface GameMap {
  /** Width in tiles. */
  width: number;
  /** Height in tiles. */
  height: number;
  tileSize: number;
  /** Size in pixels. */
  pixelWidth: number;
  pixelHeight: number;
  collision: CollisionGrid;
  spawns: SpawnPoint[];
}

/**
 * Builds a GameMap from a Tiled map.
 *
 * Collision rule: a cell is solid when any tile layer has a tile there whose
 * tileset tile has the boolean property `collides = true` (set it in Tiled's
 * tileset editor). Phaser's `setCollisionByProperty({ collides: true })` uses
 * the same rule, so client and server agree.
 */
export function parseTiledMap(map: TiledMap): GameMap {
  const errors = validateTiledMap(map);
  if (errors.length > 0) throw new Error(`Invalid map:\n- ${errors.join("\n- ")}`);

  const collidingGids = new Set<number>();
  for (const ts of map.tilesets) {
    for (const tile of ts.tiles ?? []) {
      if (getProperty<boolean>(tile.properties, "collides") === true) collidingGids.add(ts.firstgid + tile.id);
    }
  }

  const { width, height, tilewidth: tileSize } = map;
  const solid = new Uint8Array(width * height);
  const layers = flattenLayers(map.layers);

  for (const layer of layers) {
    if (layer.type !== "tilelayer" || typeof layer.data === "string") continue;
    layer.data.forEach((rawGid, i) => {
      if (rawGid !== 0 && collidingGids.has(cleanGid(rawGid))) solid[i] = 1;
    });
  }

  const collision: CollisionGrid = {
    width,
    height,
    tileSize,
    // Outside the map counts as solid, so nobody can walk off the edge.
    isSolid: (tx, ty) => tx < 0 || ty < 0 || tx >= width || ty >= height || solid[ty * width + tx] === 1,
  };

  const spawns: SpawnPoint[] = [];
  const objectLayer = layers.find((l) => l.type === "objectgroup" && l.name === REQUIRED_LAYERS.objects);
  if (objectLayer?.type === "objectgroup") {
    for (const obj of objectLayer.objects) {
      if ((obj.type ?? obj.class) !== OBJECT_CLASSES.spawn) continue;
      // Points use their position; rectangles use their centre.
      spawns.push({ x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 });
    }
  }

  return {
    width,
    height,
    tileSize,
    pixelWidth: width * tileSize,
    pixelHeight: height * tileSize,
    collision,
    spawns,
  };
}
