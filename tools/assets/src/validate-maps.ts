/**
 * Validates every map in content/maps against the project's conventions.
 * Run with `pnpm maps:validate`; CI fails if any map is invalid.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTiledMap, type TiledMap, validateTiledMap } from "@core/maps";
import { TILE_SIZE } from "@game/shared";
import { MAPS_DIR } from "./paths";

const files = readdirSync(MAPS_DIR).filter((f) => f.endsWith(".tmj"));
let failed = false;

for (const file of files) {
  const map = JSON.parse(readFileSync(join(MAPS_DIR, file), "utf8")) as TiledMap;
  const errors = validateTiledMap(map, { tileSize: TILE_SIZE });
  if (errors.length > 0) {
    failed = true;
    console.error(`✗ ${file}`);
    for (const e of errors) console.error(`    - ${e}`);
    continue;
  }
  const parsed = parseTiledMap(map, { tileSize: TILE_SIZE });
  console.log(`✓ ${file} (${parsed.width}x${parsed.height} tiles, ${parsed.spawns.length} spawns)`);
}

if (files.length === 0) {
  console.error(`No .tmj maps found in ${MAPS_DIR}`);
  failed = true;
}

process.exit(failed ? 1 : 0);
