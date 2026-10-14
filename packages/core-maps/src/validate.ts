import { flattenLayers, type TiledMap } from "./tiled";

/** Layer names every gameplay map must contain. */
export const REQUIRED_LAYERS = {
  objects: "objects",
} as const;

/** Default tile size in pixels. Games can require a different one via ValidateOptions. */
export const DEFAULT_TILE_SIZE = 16;

export interface ValidateOptions {
  /** Required tile width/height in pixels. */
  tileSize?: number;
}

/** Object classes the core understands. Keep in sync with content/maps/game.tiled-project. */
export const OBJECT_CLASSES = {
  spawn: "spawn",
} as const;

/**
 * Checks a parsed .tmj against the project's conventions.
 * Returns a list of human-readable problems; empty means valid.
 */
export function validateTiledMap(map: TiledMap, options: ValidateOptions = {}): string[] {
  const tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
  const errors: string[] = [];

  if (map.type !== "map") errors.push(`not a Tiled map (type="${map.type}")`);
  if (map.orientation !== "orthogonal") errors.push(`orientation must be "orthogonal", got "${map.orientation}"`);
  if (map.infinite) errors.push("infinite maps are not supported; disable 'Infinite' in Map Properties");
  if (map.tilewidth !== tileSize || map.tileheight !== tileSize) {
    errors.push(`tile size must be ${tileSize}x${tileSize}, got ${map.tilewidth}x${map.tileheight}`);
  }

  for (const ts of map.tilesets) {
    if (ts.source) {
      errors.push(`tileset "${ts.source}" is external; embed it in the map (Phaser cannot load external tilesets)`);
      continue;
    }
    if (ts.tilewidth !== tileSize || ts.tileheight !== tileSize) {
      errors.push(`tileset "${ts.name}" must use ${tileSize}x${tileSize} tiles`);
    }
    if (!ts.image) errors.push(`tileset "${ts.name}" must be a single image (image collections are not supported)`);
    for (const tile of ts.tiles ?? []) {
      const collides = tile.properties?.find((p) => p.name === "collides");
      if (collides && collides.type !== "bool") {
        errors.push(
          `tileset "${ts.name}" tile ${tile.id}: property "collides" must be of type bool, got ${collides.type}`,
        );
      }
    }
  }

  const layers = flattenLayers(map.layers);
  for (const layer of layers) {
    if (layer.type !== "tilelayer") continue;
    if (typeof layer.data === "string") {
      errors.push(`layer "${layer.name}" uses encoding "${layer.encoding}"; set Tile Layer Format to CSV`);
    } else if (layer.data.length !== map.width * map.height) {
      errors.push(`layer "${layer.name}" has ${layer.data.length} tiles, expected ${map.width * map.height}`);
    }
  }

  const objects = layers.find((l) => l.type === "objectgroup" && l.name === REQUIRED_LAYERS.objects);
  if (!objects) {
    errors.push(`missing object layer "${REQUIRED_LAYERS.objects}"`);
  } else if (objects.type === "objectgroup") {
    const spawns = objects.objects.filter((o) => (o.type ?? o.class) === OBJECT_CLASSES.spawn);
    if (spawns.length === 0) {
      const named = objects.objects.some((o) => o.name === OBJECT_CLASSES.spawn);
      errors.push(
        `object layer "${REQUIRED_LAYERS.objects}" needs at least one "spawn" object` +
          (named ? ' (an object is *named* "spawn": set its Class to "spawn" instead)' : ""),
      );
    }
  }

  return errors;
}
