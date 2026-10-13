import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type GameMap, parseTiledMap, type TiledMap } from "@game/maps";
import { env } from "../config/env";

const cache = new Map<string, GameMap>();

/**
 * Loads and parses content/maps/<mapId>.tmj once per process.
 * The client renders the very same file, so collision always matches the visuals.
 */
export function loadMap(mapId: string): GameMap {
  if (!/^[a-z0-9_-]+$/i.test(mapId)) throw new Error(`invalid map id "${mapId}"`);
  let map = cache.get(mapId);
  if (!map) {
    const raw = JSON.parse(readFileSync(join(env.mapsDir, `${mapId}.tmj`), "utf8")) as TiledMap;
    map = parseTiledMap(raw);
    cache.set(mapId, map);
  }
  return map;
}
