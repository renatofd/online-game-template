/**
 * Every asset this game loads, imported from <repo>/content so Vite fingerprints
 * and bundles them. Add new maps/sprites here.
 */
import arenaMapUrl from "@content/maps/arena.tmj?url";
import playerUrl from "@content/sprites/player.png";
import terrainUrl from "@content/tilesets/terrain.png";
import type Phaser from "phaser";

/** Tileset images, keyed by the tileset *name* used inside Tiled. */
const TILESETS: Record<string, string> = {
  terrain: terrainUrl,
};

/** Tiled maps, keyed by map id (matches the server's content/maps/<id>.tmj). */
const MAPS: Record<string, string> = {
  arena: arenaMapUrl,
};

export const tilesetKey = (name: string) => `tileset:${name}`;
export const mapKey = (id: string) => `map:${id}`;
export const SPRITE_PLAYER = "player";

export function preloadAssets(scene: Phaser.Scene) {
  for (const [name, url] of Object.entries(TILESETS)) scene.load.image(tilesetKey(name), url);
  for (const [id, url] of Object.entries(MAPS)) scene.load.tilemapTiledJSON(mapKey(id), url);
  scene.load.image(SPRITE_PLAYER, playerUrl);
}
