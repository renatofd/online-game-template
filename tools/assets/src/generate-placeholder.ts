/**
 * Generates placeholder pixel art and a sample map so the template runs out of
 * the box. Replace the outputs with real art at any time; this script is only
 * needed again if you want to reset them, and then it must be run with --force
 * because it overwrites them:
 *
 *   pnpm assets:placeholder --force
 *
 * Outputs:
 *   content/tilesets/terrain.png  4 tiles, 16x16, extruded (margin 1, spacing 2)
 *   content/sprites/player.png    player sheet, 6 frames (idle, walk), white body so it can be tinted
 *   content/sprites/player.json   Aseprite-format data with the animation tags
 *   content/maps/arena.tmj        sample map with embedded tileset
 *   content/audio/sfx/join.wav    "player joined" blip
 *   content/audio/sfx/ui.wav      UI tick (settings slider feedback)
 *   content/audio/music/theme.wav short chiptune loop
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { TILE_SIZE } from "@game/shared";
import { PNG } from "pngjs";
import { CONTENT_DIR, MAPS_DIR } from "./paths";

const OUTPUTS = [
  "tilesets/terrain.png",
  "sprites/player.png",
  "sprites/player.json",
  "maps/arena.tmj",
  "audio/sfx/join.wav",
  "audio/sfx/ui.wav",
  "audio/music/theme.wav",
];
const existing = OUTPUTS.filter((f) => existsSync(join(CONTENT_DIR, f)));
if (existing.length > 0 && !process.argv.includes("--force")) {
  console.error(
    `These files already exist and would be overwritten:\n  content/${existing.join("\n  content/")}\n` +
      "Run `pnpm assets:placeholder --force` to replace them with the placeholders.",
  );
  process.exit(1);
}

type RGBA = [number, number, number, number];

const hex = (h: string, a = 255): RGBA => [
  Number.parseInt(h.slice(1, 3), 16),
  Number.parseInt(h.slice(3, 5), 16),
  Number.parseInt(h.slice(5, 7), 16),
  a,
];

/** Small deterministic PRNG (mulberry32) so outputs are stable between runs. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setPx(png: PNG, x: number, y: number, c: RGBA) {
  const i = (png.width * y + x) << 2;
  png.data[i] = c[0];
  png.data[i + 1] = c[1];
  png.data[i + 2] = c[2];
  png.data[i + 3] = c[3];
}

function getPx(png: PNG, x: number, y: number): RGBA {
  const i = (png.width * y + x) << 2;
  return [png.data[i] ?? 0, png.data[i + 1] ?? 0, png.data[i + 2] ?? 0, png.data[i + 3] ?? 0];
}

function save(png: PNG, path: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
  console.log(`wrote ${path}`);
}

// ─── Tileset ────────────────────────────────────────────────────────────────

type TileDrawer = (x: number, y: number, r: () => number) => RGBA;

const grass: TileDrawer = (_x, _y, r) => {
  const v = r();
  return v < 0.12 ? hex("#4fa44a") : v < 0.2 ? hex("#2f7a2e") : hex("#3f8f3a");
};

const flowers: TileDrawer = (x, y, r) => {
  const flowerSpots = [
    [3, 4],
    [11, 6],
    [6, 12],
    [13, 13],
  ];
  if (flowerSpots.some(([fx, fy]) => fx === x && fy === y)) return hex("#f2d14b");
  if (flowerSpots.some(([fx, fy]) => Math.abs((fx ?? 0) - x) + Math.abs((fy ?? 0) - y) === 1)) return hex("#e8e8f0");
  return grass(x, y, r);
};

const wall: TileDrawer = (x, y) => {
  // Brick pattern: 2 rows of 8px bricks, offset every other row.
  const row = Math.floor(y / 4);
  const offset = row % 2 === 0 ? 0 : 4;
  const mortar = y % 4 === 3 || (x + offset) % 8 === 7;
  if (y === 0) return hex("#9a9aab");
  if (mortar) return hex("#45454f");
  return y % 4 === 0 ? hex("#7d7d8c") : hex("#6b6b7a");
};

const dirt: TileDrawer = (_x, _y, r) => {
  const v = r();
  return v < 0.1 ? hex("#a07d52") : v < 0.18 ? hex("#6f5233") : hex("#8b6a42");
};

const TILES: TileDrawer[] = [grass, flowers, wall, dirt];
const TILE = { grass: 0, flowers: 1, wall: 2, dirt: 3 } as const;

const MARGIN = 1;
const SPACING = 2;

function buildTileset(): PNG {
  const cols = TILES.length;
  const width = MARGIN * 2 + cols * TILE_SIZE + (cols - 1) * SPACING;
  const height = MARGIN * 2 + TILE_SIZE;
  const png = new PNG({ width, height });

  TILES.forEach((draw, i) => {
    const ox = MARGIN + i * (TILE_SIZE + SPACING);
    const oy = MARGIN;
    const r = rng(1000 + i);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) setPx(png, ox + x, oy + y, draw(x, y, r));
    }
    // Extrude: copy each edge pixel 1px outward. Prevents seams between tiles
    // when the camera lands on sub-pixel positions.
    for (let k = 0; k < TILE_SIZE; k++) {
      setPx(png, ox + k, oy - 1, getPx(png, ox + k, oy));
      setPx(png, ox + k, oy + TILE_SIZE, getPx(png, ox + k, oy + TILE_SIZE - 1));
      setPx(png, ox - 1, oy + k, getPx(png, ox, oy + k));
      setPx(png, ox + TILE_SIZE, oy + k, getPx(png, ox + TILE_SIZE - 1, oy + k));
    }
    setPx(png, ox - 1, oy - 1, getPx(png, ox, oy));
    setPx(png, ox + TILE_SIZE, oy - 1, getPx(png, ox + TILE_SIZE - 1, oy));
    setPx(png, ox - 1, oy + TILE_SIZE, getPx(png, ox, oy + TILE_SIZE - 1));
    setPx(png, ox + TILE_SIZE, oy + TILE_SIZE, getPx(png, ox + TILE_SIZE - 1, oy + TILE_SIZE - 1));
  });

  return png;
}

// ─── Player sprite (animated, Aseprite JSON format) ─────────────────────────

/** Body shared by every frame; rows 13-15 (feet) differ per frame. */
const PLAYER_BODY = [
  "................",
  "................",
  ".....######.....",
  "....#wwwwww#....",
  "...#wwwwwwww#...",
  "...#wwwwwwww#...",
  "...#ww#ww#ww#...",
  "...#ww#ww#ww#...",
  "...#wwwwwwww#...",
  "...#wwwwwwww#...",
  "...#wwssssww#...",
  "....#wwwwww#....",
  ".....######.....",
];
const FEET = {
  stand: ["....##....##....", "................", "................"],
  left: ["...##......##...", "............##..", "................"],
  right: ["...##......##...", "..##............", "................"],
};
/** Blink frame: eyes closed. */
const BLINK_ROWS: Record<number, string> = { 6: "...#wwwwwwww#...", 7: "...#w##ww##w#..." };

interface PlayerFrame {
  feet: keyof typeof FEET;
  blink?: boolean;
  bob?: number;
  duration: number;
}

/** idle: 0-1, walk: 2-5. Mirrors what an artist would tag in Aseprite. */
const PLAYER_FRAMES: PlayerFrame[] = [
  { feet: "stand", duration: 900 },
  { feet: "stand", blink: true, duration: 150 },
  { feet: "left", duration: 120 },
  { feet: "stand", bob: -1, duration: 120 },
  { feet: "right", duration: 120 },
  { feet: "stand", bob: -1, duration: 120 },
];
const PLAYER_TAGS = [
  { name: "idle", from: 0, to: 1, direction: "forward", color: "#000000ff" },
  { name: "walk", from: 2, to: 5, direction: "forward", color: "#000000ff" },
];

function buildPlayer(): { png: PNG; json: unknown } {
  const png = new PNG({ width: TILE_SIZE * PLAYER_FRAMES.length, height: TILE_SIZE });
  const palette: Record<string, RGBA> = {
    ".": [0, 0, 0, 0],
    "#": hex("#1b1b24"),
    w: hex("#ffffff"),
    s: hex("#c8c8d4"),
  };
  PLAYER_FRAMES.forEach((frame, i) => {
    const rows = [...PLAYER_BODY.map((r, y) => (frame.blink && BLINK_ROWS[y]) || r), ...FEET[frame.feet]];
    const bob = frame.bob ?? 0;
    rows.forEach((row, y) => {
      const ty = y + (y < PLAYER_BODY.length ? bob : 0);
      if (ty < 0 || ty >= TILE_SIZE) return;
      [...row].forEach((ch, x) => {
        if (ch !== ".") setPx(png, i * TILE_SIZE + x, ty, palette[ch] ?? [255, 0, 255, 255]);
      });
    });
  });

  // Same structure Aseprite writes with: --format json-array --filename-format "{frame}" --list-tags
  const json = {
    frames: PLAYER_FRAMES.map((f, i) => ({
      filename: String(i),
      frame: { x: i * TILE_SIZE, y: 0, w: TILE_SIZE, h: TILE_SIZE },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: TILE_SIZE, h: TILE_SIZE },
      sourceSize: { w: TILE_SIZE, h: TILE_SIZE },
      duration: f.duration,
    })),
    meta: {
      app: "https://www.aseprite.org/",
      version: "placeholder",
      image: "player.png",
      format: "RGBA8888",
      size: { w: png.width, h: png.height },
      scale: "1",
      frameTags: PLAYER_TAGS,
      layers: [],
      slices: [],
    },
  };
  return { png, json };
}

// ─── Sample map ─────────────────────────────────────────────────────────────

function buildMap(tileset: PNG) {
  const W = 48;
  const H = 32;
  const r = rng(42);
  const gid = (tile: number) => tile + 1;

  const ground: number[] = [];
  const walls: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const onPath = Math.abs(y - H / 2) < 1.5 || Math.abs(x - W / 2) < 1.5;
      ground.push(gid(onPath ? TILE.dirt : r() < 0.08 ? TILE.flowers : TILE.grass));

      const border = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      // A few rectangular pillars, kept away from the paths and spawns.
      const pillar =
        (x >= 8 && x <= 10 && y >= 6 && y <= 8) ||
        (x >= 37 && x <= 39 && y >= 6 && y <= 8) ||
        (x >= 8 && x <= 10 && y >= 23 && y <= 25) ||
        (x >= 37 && x <= 39 && y >= 23 && y <= 25) ||
        (x >= 18 && x <= 20 && y >= 11 && y <= 12) ||
        (x >= 27 && x <= 29 && y >= 19 && y <= 20);
      walls.push(border || pillar ? gid(TILE.wall) : 0);
    }
  }

  const spawnTiles = [
    [5, 4],
    [42, 4],
    [5, 27],
    [42, 27],
    [16, 16],
    [31, 16],
    [24, 6],
    [24, 26],
  ];
  const objects = spawnTiles.map(([tx = 0, ty = 0], i) => ({
    id: i + 1,
    name: `spawn-${i + 1}`,
    type: "spawn",
    x: tx * TILE_SIZE + TILE_SIZE / 2,
    y: ty * TILE_SIZE + TILE_SIZE / 2,
    width: 0,
    height: 0,
    rotation: 0,
    point: true,
    visible: true,
  }));

  const layer = (id: number, name: string, data: number[]) => ({
    id,
    name,
    type: "tilelayer",
    x: 0,
    y: 0,
    width: W,
    height: H,
    opacity: 1,
    visible: true,
    data,
  });

  return {
    type: "map",
    version: "1.10",
    tiledversion: "1.11.2",
    orientation: "orthogonal",
    renderorder: "right-down",
    infinite: false,
    width: W,
    height: H,
    tilewidth: TILE_SIZE,
    tileheight: TILE_SIZE,
    nextlayerid: 4,
    nextobjectid: objects.length + 1,
    compressionlevel: -1,
    layers: [
      layer(1, "ground", ground),
      layer(2, "walls", walls),
      {
        id: 3,
        name: "objects",
        type: "objectgroup",
        draworder: "topdown",
        opacity: 1,
        visible: true,
        x: 0,
        y: 0,
        objects,
      },
    ],
    tilesets: [
      {
        firstgid: 1,
        name: "terrain",
        image: "../tilesets/terrain.png",
        imagewidth: tileset.width,
        imageheight: tileset.height,
        tilewidth: TILE_SIZE,
        tileheight: TILE_SIZE,
        margin: MARGIN,
        spacing: SPACING,
        tilecount: TILES.length,
        columns: TILES.length,
        tiles: [{ id: TILE.wall, properties: [{ name: "collides", type: "bool", value: true }] }],
      },
    ],
  };
}

// ─── Audio (tiny synth, 16-bit mono WAV) ────────────────────────────────────

const SAMPLE_RATE = 22050;

function wav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2);
  });
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const noteHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const square = (phase: number) => (phase % 1 < 0.5 ? 1 : -1);
const triangle = (phase: number) => 1 - 4 * Math.abs((phase % 1) - 0.5);

/** Adds a note into `out` starting at `start` seconds (simple attack/decay envelope). */
function note(out: Float32Array, start: number, dur: number, midi: number, wave: (p: number) => number, vol: number) {
  const hz = noteHz(midi);
  const s0 = Math.floor(start * SAMPLE_RATE);
  const n = Math.floor(dur * SAMPLE_RATE);
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t / 0.005) * Math.max(0, 1 - t / dur) ** 1.5;
    out[s0 + i] = (out[s0 + i] ?? 0) + wave(hz * t) * vol * env;
  }
}

function buildJoinSfx(): Buffer {
  const out = new Float32Array(Math.floor(SAMPLE_RATE * 0.25));
  note(out, 0, 0.1, 76, square, 0.25);
  note(out, 0.08, 0.16, 83, square, 0.25);
  return wav(out);
}

function buildUiSfx(): Buffer {
  const out = new Float32Array(Math.floor(SAMPLE_RATE * 0.06));
  note(out, 0, 0.05, 88, square, 0.2);
  return wav(out);
}

/** 4 bars at 120 bpm in A minor: bass on triangle, arpeggio on square. Loops seamlessly. */
function buildTheme(): Buffer {
  const beat = 0.5;
  const bars = [
    [57, 60, 64],
    [53, 57, 60],
    [55, 59, 62],
    [52, 56, 59],
  ];
  const out = new Float32Array(Math.floor(SAMPLE_RATE * beat * 4 * bars.length));
  bars.forEach((chord, bar) => {
    const t0 = bar * beat * 4;
    for (let b = 0; b < 4; b++) note(out, t0 + b * beat, beat * 0.9, (chord[0] ?? 57) - 12, triangle, 0.35);
    for (let i = 0; i < 16; i++) {
      const pitch = (chord[i % 3] ?? 60) + (i % 6 >= 3 ? 12 : 0);
      note(out, t0 + i * (beat / 4), beat / 4, pitch, square, 0.08);
    }
  });
  return wav(out);
}

const tileset = buildTileset();
save(tileset, join(CONTENT_DIR, "tilesets/terrain.png"));
const player = buildPlayer();
save(player.png, join(CONTENT_DIR, "sprites/player.png"));
writeFileSync(join(CONTENT_DIR, "sprites/player.json"), `${JSON.stringify(player.json, null, 2)}\n`);
console.log(`wrote ${join(CONTENT_DIR, "sprites/player.json")}`);

const mapPath = join(MAPS_DIR, "arena.tmj");
mkdirSync(MAPS_DIR, { recursive: true });
// Keep tile data arrays on one line, like Tiled does, so diffs stay readable.
const mapJson = JSON.stringify(buildMap(tileset), null, 2).replace(
  /"data": \[([\s\d,]*?)\]/g,
  (_m, body: string) => `"data": [${body.replace(/\s+/g, "")}]`,
);
writeFileSync(mapPath, `${mapJson}\n`);
console.log(`wrote ${mapPath}`);

const writeAudio = (rel: string, data: Buffer) => {
  const path = join(CONTENT_DIR, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log(`wrote ${path}`);
};
writeAudio("audio/sfx/join.wav", buildJoinSfx());
writeAudio("audio/sfx/ui.wav", buildUiSfx());
writeAudio("audio/music/theme.wav", buildTheme());
