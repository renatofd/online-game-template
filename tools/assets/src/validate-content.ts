/**
 * Validates everything in content/: maps, tilesets, sprites and audio.
 * Run with `pnpm content:validate`; CI fails if anything is invalid.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { parseTiledMap, type TiledMap, validateTiledMap } from "@core/maps";
import { TILE_SIZE } from "@game/shared";
import { AUDIO_DIR, CONTENT_DIR, MAPS_DIR, SPRITES_DIR } from "./paths";

let failed = false;
const fail = (file: string, errors: string[]) => {
  failed = true;
  console.error(`✗ ${file}`);
  for (const e of errors) console.error(`    - ${e}`);
};
const warn = (file: string, message: string) => console.warn(`! ${file}: ${message}`);

/** Files the OS or editors drop into folders; never content. */
const IGNORED = new Set(["desktop.ini", "thumbs.db", ".gitkeep"]);
const entries = (dir: string) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith(".") && !IGNORED.has(f.toLowerCase())) : [];
const isDir = (path: string) => statSync(path).isDirectory();
const ext = (file: string) => extname(file).toLowerCase();

function readJson<T>(path: string, label: string): T | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (err) {
    fail(label, [`invalid JSON: ${(err as Error).message}`]);
    return undefined;
  }
}

// ─── Maps ───────────────────────────────────────────────────────────────────
const TILESETS_DIR = resolve(CONTENT_DIR, "tilesets");
const mapFiles = entries(MAPS_DIR).filter((f) => !isDir(join(MAPS_DIR, f)));
for (const file of mapFiles) {
  if ([".tmx", ".json"].includes(ext(file)))
    warn(`maps/${file}`, "ignored: save maps as JSON with the .tmj extension (File → Export As… → .tmj)");
}
const maps = mapFiles.filter((f) => extname(f) === ".tmj");
for (const file of mapFiles.filter((f) => ext(f) === ".tmj" && extname(f) !== ".tmj"))
  fail(`maps/${file}`, ["use a lowercase .tmj extension (the server loads <id>.tmj)"]);
if (maps.length === 0) fail("content/maps", ["no .tmj maps found"]);

for (const file of maps) {
  const label = `maps/${file}`;
  const map = readJson<TiledMap>(join(MAPS_DIR, file), label);
  if (!map) continue;
  const errors = validateTiledMap(map, { tileSize: TILE_SIZE });

  // Tileset images must exist in content/tilesets/; the client finds them there by file name.
  for (const ts of map.tilesets ?? []) {
    if (!ts.image) continue;
    const image = resolve(MAPS_DIR, ts.image);
    if (!existsSync(image)) errors.push(`tileset "${ts.name}" image not found: ${ts.image}`);
    else if (dirname(image) !== TILESETS_DIR || ext(image) !== ".png")
      errors.push(
        `tileset "${ts.name}" image must be a .png directly in content/tilesets/ (got ${relative(CONTENT_DIR, image)})`,
      );
  }
  if (errors.length > 0) {
    fail(label, errors);
    continue;
  }

  const parsed = parseTiledMap(map, { tileSize: TILE_SIZE });
  const badSpawns = parsed.spawns.filter((s) => {
    const tx = Math.floor(s.x / parsed.tileSize);
    const ty = Math.floor(s.y / parsed.tileSize);
    return parsed.collision.isSolid(tx, ty);
  });
  if (badSpawns.length > 0) {
    fail(
      label,
      badSpawns.map(
        (s) => `spawn at (${s.x}, ${s.y}) is outside the map or inside a solid tile; players would be stuck`,
      ),
    );
    continue;
  }
  console.log(`✓ ${label} (${parsed.width}x${parsed.height} tiles, ${parsed.spawns.length} spawns)`);
}

// ─── Sprites (Aseprite json-array export) ───────────────────────────────────
interface AsepriteJson {
  frames?: { filename?: string; duration?: number }[];
  meta?: { frameTags?: { name?: string; from?: number; to?: number }[] };
}
const spriteFiles = entries(SPRITES_DIR).filter((f) => !isDir(join(SPRITES_DIR, f)));
for (const dir of entries(SPRITES_DIR).filter((f) => f !== "src" && isDir(join(SPRITES_DIR, f))))
  warn(`sprites/${dir}/`, "subfolders are not loaded; put <name>.png + <name>.json directly in content/sprites/");
const pngNames = new Set(spriteFiles.filter((f) => ext(f) === ".png").map((f) => basename(f, extname(f))));
for (const file of spriteFiles.filter((f) => ext(f) === ".json")) {
  if (!pngNames.has(basename(file, extname(file))))
    fail(`sprites/${file}`, [`no matching ${basename(file, extname(file))}.png next to it`]);
}
for (const file of spriteFiles.filter((f) => ext(f) === ".png")) {
  const name = basename(file, extname(file));
  const jsonPath = join(SPRITES_DIR, `${name}.json`);
  if (!existsSync(jsonPath)) {
    fail(`sprites/${file}`, [`missing ${name}.json; export it with \`pnpm assets:sprites\` (see content/README.md)`]);
    continue;
  }
  const data = readJson<AsepriteJson>(jsonPath, `sprites/${name}.json`);
  if (!data) continue;
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
const GROUPS = ["music", "sfx"];
for (const f of entries(AUDIO_DIR).filter((f) => !GROUPS.includes(f)))
  warn(`audio/${f}`, "ignored: put music in content/audio/music/ and effects in content/audio/sfx/");
const keysByGroup = new Map<string, Set<string>>();
for (const group of GROUPS) {
  const dir = join(AUDIO_DIR, group);
  const all = entries(dir);
  const subdirs = all.filter((f) => isDir(join(dir, f)));
  const files = all.filter((f) => !subdirs.includes(f) && AUDIO_EXTS.includes(ext(f)));
  const unsupported = all.filter((f) => !subdirs.includes(f) && !AUDIO_EXTS.includes(ext(f)));
  if (subdirs.length > 0) warn(`audio/${group}`, `subfolders are not loaded: ${subdirs.join(", ")}`);
  if (unsupported.length > 0)
    fail(`audio/${group}`, [`unsupported files: ${unsupported.join(", ")} (use ${AUDIO_EXTS.join(", ")})`]);
  keysByGroup.set(group, new Set(files.map((f) => basename(f, extname(f)))));
  if (files.length > 0) console.log(`✓ audio/${group} (${files.length} files)`);
}
const music = keysByGroup.get("music") ?? new Set();
const clashes = [...(keysByGroup.get("sfx") ?? [])].filter((k) => music.has(k));
if (clashes.length > 0)
  fail("audio", [`the same name is used in music/ and sfx/: ${clashes.join(", ")} (sound keys must be unique)`]);

process.exit(failed ? 1 : 0);
