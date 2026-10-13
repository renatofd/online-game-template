/**
 * Validates everything in content/: maps, sprites and audio.
 * Run with `pnpm content:validate`; CI fails if anything is invalid.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { parseTiledMap, type TiledMap, validateTiledMap } from "@core/maps";
import { TILE_SIZE } from "@game/shared";
import { AUDIO_DIR, MAPS_DIR, SPRITES_DIR } from "./paths";

let failed = false;
const fail = (file: string, errors: string[]) => {
  failed = true;
  console.error(`✗ ${file}`);
  for (const e of errors) console.error(`    - ${e}`);
};
const list = (dir: string, exts: string[]) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => exts.includes(extname(f).toLowerCase())) : [];

// ─── Maps ───────────────────────────────────────────────────────────────────
const maps = list(MAPS_DIR, [".tmj"]);
if (maps.length === 0) fail("content/maps", ["no .tmj maps found"]);
for (const file of maps) {
  const map = JSON.parse(readFileSync(join(MAPS_DIR, file), "utf8")) as TiledMap;
  const errors = validateTiledMap(map, { tileSize: TILE_SIZE });
  if (errors.length > 0) {
    fail(`maps/${file}`, errors);
    continue;
  }
  const parsed = parseTiledMap(map, { tileSize: TILE_SIZE });
  console.log(`✓ maps/${file} (${parsed.width}x${parsed.height} tiles, ${parsed.spawns.length} spawns)`);
}

// ─── Sprites (Aseprite json-array export) ───────────────────────────────────
interface AsepriteJson {
  frames?: { filename?: string; duration?: number }[];
  meta?: { frameTags?: { name?: string; from?: number; to?: number }[] };
}
for (const file of list(SPRITES_DIR, [".png"])) {
  const name = file.replace(/\.png$/i, "");
  const jsonPath = join(SPRITES_DIR, `${name}.json`);
  if (!existsSync(jsonPath)) {
    fail(`sprites/${file}`, [`missing ${name}.json; export it with \`pnpm assets:sprites\` (see content/README.md)`]);
    continue;
  }
  const data = JSON.parse(readFileSync(jsonPath, "utf8")) as AsepriteJson;
  const errors: string[] = [];
  if (!Array.isArray(data.frames)) errors.push('frames must be an array (export with "--format json-array")');
  const frames = Array.isArray(data.frames) ? data.frames : [];
  frames.forEach((f, i) => {
    if (f.filename !== String(i))
      errors.push(`frame ${i} is named "${f.filename}"; export with --filename-format "{frame}"`);
  });
  const tags = data.meta?.frameTags ?? [];
  const seen = new Set<string>();
  for (const t of tags) {
    if (!t.name) errors.push("a tag has no name");
    else if (seen.has(t.name)) errors.push(`duplicate tag "${t.name}"`);
    else seen.add(t.name);
    if (t.from === undefined || t.to === undefined || t.from < 0 || t.to >= frames.length || t.from > t.to) {
      errors.push(`tag "${t.name}" has an invalid frame range ${t.from}-${t.to}`);
    }
  }
  if (errors.length > 0) fail(`sprites/${name}`, errors);
  else console.log(`✓ sprites/${name} (${frames.length} frames, tags: ${[...seen].join(", ") || "none"})`);
}

// ─── Audio ──────────────────────────────────────────────────────────────────
const AUDIO_EXTS = [".ogg", ".mp3", ".m4a", ".wav"];
for (const group of ["music", "sfx"]) {
  const dir = join(AUDIO_DIR, group);
  const files = list(dir, AUDIO_EXTS);
  const unsupported = existsSync(dir)
    ? readdirSync(dir).filter((f) => !AUDIO_EXTS.includes(extname(f).toLowerCase()))
    : [];
  if (unsupported.length > 0)
    fail(`audio/${group}`, [`unsupported files: ${unsupported.join(", ")} (use ${AUDIO_EXTS.join(", ")})`]);
  if (files.length > 0) console.log(`✓ audio/${group} (${files.length} files)`);
}

process.exit(failed ? 1 : 0);
