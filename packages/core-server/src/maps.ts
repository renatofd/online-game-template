import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type GameMap, parseTiledMap, type TiledMap, type ValidateOptions } from "@core/maps";
import { env } from "./env";

const cache = new Map<string, GameMap>();

/**
 * Loads and parses <mapsDir>/<mapId>.tmj once per process.
 * The client renders the very same file, so collision always matches the visuals.
 */
export function loadMap(mapId: string, options: ValidateOptions = {}): GameMap {
  if (typeof mapId !== "string" || !/^[a-z0-9_-]+$/i.test(mapId)) throw new Error(`invalid map id "${mapId}"`);
  let map = cache.get(mapId);
  if (!map) {
    const raw = JSON.parse(readFileSync(join(env.mapsDir, `${mapId}.tmj`), "utf8")) as TiledMap;
    map = parseTiledMap(raw, options);
    cache.set(mapId, map);
  }
  return map;
}
