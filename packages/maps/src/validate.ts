import { TILE_SIZE } from "@game/shared";
import { flattenLayers, type TiledMap } from "./tiled";

/** Layer names every gameplay map must contain. */
export const REQUIRED_LAYERS = {
  objects: "objects",
} as const;

/** Object classes the game understands. Keep in sync with content/maps/game.tiled-project. */
export const OBJECT_CLASSES = {
  spawn: "spawn",
} as const;

/**
 * Checks a parsed .tmj against the project's conventions.
 * Returns a list of human-readable problems; empty means valid.
 */
export function validateTiledMap(map: TiledMap): string[] {
  const errors: string[] = [];

  if (map.type !== "map") errors.push(`not a Tiled map (type="${map.type}")`);
  if (map.orientation !== "orthogonal") errors.push(`orientation must be "orthogonal", got "${map.orientation}"`);
  if (map.infinite) errors.push("infinite maps are not supported; disable 'Infinite' in Map Properties");
  if (map.tilewidth !== TILE_SIZE || map.tileheight !== TILE_SIZE) {
    errors.push(`tile size must be ${TILE_SIZE}x${TILE_SIZE}, got ${map.tilewidth}x${map.tileheight}`);
  }

  for (const ts of map.tilesets) {
    if (ts.source) {
      errors.push(`tileset "${ts.source}" is external; embed it in the map (Phaser cannot load external tilesets)`);
      continue;
    }
    if (ts.tilewidth !== TILE_SIZE || ts.tileheight !== TILE_SIZE) {
      errors.push(`tileset "${ts.name}" must use ${TILE_SIZE}x${TILE_SIZE} tiles`);
    }
    if (!ts.image) errors.push(`tileset "${ts.name}" must be a single image (image collections are not supported)`);
  }

  const layers = flattenLayers(map.layers);
  for (const layer of layers) {
    if (layer.type === "tilelayer" && typeof layer.data === "string") {
      errors.push(`layer "${layer.name}" uses encoding "${layer.encoding}"; set Tile Layer Format to CSV`);
    }
  }

  const objects = layers.find((l) => l.type === "objectgroup" && l.name === REQUIRED_LAYERS.objects);
  if (!objects) {
    errors.push(`missing object layer "${REQUIRED_LAYERS.objects}"`);
  } else if (objects.type === "objectgroup") {
    const spawns = objects.objects.filter((o) => (o.type ?? o.class) === OBJECT_CLASSES.spawn);
    if (spawns.length === 0) errors.push(`object layer "${REQUIRED_LAYERS.objects}" needs at least one "spawn" object`);
  }

  return errors;
}
