/**
 * Generates placeholder pixel art and a sample map so the template runs out of
 * the box. Replace the outputs with real art at any time; this script is only
 * needed again if you want to reset them.
 *
 * Outputs:
 *   content/tilesets/terrain.png  4 tiles, 16x16, extruded (margin 1, spacing 2)
 *   content/sprites/player.png    16x16 player (white body so it can be tinted)
 *   content/maps/arena.tmj        sample map with embedded tileset
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { TILE_SIZE } from "@game/shared";
import { PNG } from "pngjs";
import { CONTENT_DIR, MAPS_DIR } from "./paths";

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

// ─── Player sprite ──────────────────────────────────────────────────────────

const PLAYER_ART = [
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
  "....##....##....",
  "................",
  "................",
];

function buildPlayer(): PNG {
  const png = new PNG({ width: TILE_SIZE, height: TILE_SIZE });
  const palette: Record<string, RGBA> = {
    ".": [0, 0, 0, 0],
    "#": hex("#1b1b24"),
    w: hex("#ffffff"),
    s: hex("#c8c8d4"),
  };
  PLAYER_ART.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      setPx(png, x, y, palette[ch] ?? [255, 0, 255, 255]);
    });
  });
  return png;
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

const tileset = buildTileset();
save(tileset, join(CONTENT_DIR, "tilesets/terrain.png"));
save(buildPlayer(), join(CONTENT_DIR, "sprites/player.png"));

const mapPath = join(MAPS_DIR, "arena.tmj");
mkdirSync(MAPS_DIR, { recursive: true });
// Keep tile data arrays on one line, like Tiled does, so diffs stay readable.
const mapJson = JSON.stringify(buildMap(tileset), null, 2).replace(
  /"data": \[([\s\d,]*?)\]/g,
  (_m, body: string) => `"data": [${body.replace(/\s+/g, "")}]`,
);
writeFileSync(mapPath, `${mapJson}\n`);
console.log(`wrote ${mapPath}`);
