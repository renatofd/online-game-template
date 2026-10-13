/**
 * Assets of this game. Sprites (and audio, see audio.ts) are discovered
 * automatically from <repo>/content; maps and tilesets are listed here because
 * the map id and the Tiled tileset name are part of their key.
 */

import arenaMapUrl from "@content/maps/arena.tmj?url";
import terrainUrl from "@content/tilesets/terrain.png";
import { discoverAudio, discoverSprites, loadAudio, loadSprites } from "@core/client";
import type Phaser from "phaser";

/** Tileset images, keyed by the tileset *name* used inside Tiled. */
const TILESETS: Record<string, string> = {
  terrain: terrainUrl,
};

/** Tiled maps, keyed by map id (matches the server's content/maps/<id>.tmj). */
const MAPS: Record<string, string> = {
  arena: arenaMapUrl,
};

/**
 * Every content/sprites/<name>.png + <name>.json (Aseprite export). Drop a new
 * pair in that folder and it is loaded as texture "<name>", with one animation
 * per Aseprite tag named "<name>/<tag>".
 */
const SPRITES = discoverSprites(
  import.meta.glob<string>("@content/sprites/*.png", { eager: true, query: "?url", import: "default" }),
  import.meta.glob<string>("@content/sprites/*.json", { eager: true, query: "?url", import: "default" }),
);

/**
 * Every content/audio/music/* and content/audio/sfx/* file, keyed by file name
 * ("theme", "join"...). Several formats of the same name (theme.ogg + theme.mp3)
 * become one sound; the browser plays the first it supports.
 */
const AUDIO = discoverAudio(
  import.meta.glob<string>("@content/audio/*/*.{ogg,mp3,m4a,wav}", { eager: true, query: "?url", import: "default" }),
);

export const MUSIC_THEME = "theme";
export const SFX_JOIN = "join";
export const SFX_UI = "ui";

export const tilesetKey = (name: string) => `tileset:${name}`;
export const mapKey = (id: string) => `map:${id}`;
export const SPRITE_PLAYER = "player";

export function preloadAssets(scene: Phaser.Scene) {
  for (const [name, url] of Object.entries(TILESETS)) scene.load.image(tilesetKey(name), url);
  for (const [id, url] of Object.entries(MAPS)) scene.load.tilemapTiledJSON(mapKey(id), url);
  loadSprites(scene, SPRITES);
  loadAudio(scene, AUDIO);
}
