/**
 * Every asset the client loads, imported from <repo>/content so Vite fingerprints
 * and bundles them. Add new maps/sprites here.
 */
import arenaMapUrl from "@content/maps/arena.tmj?url";
import playerUrl from "@content/sprites/player.png";
import terrainUrl from "@content/tilesets/terrain.png";

/** Tileset images, keyed by the tileset *name* used inside Tiled. */
export const TILESETS: Record<string, string> = {
  terrain: terrainUrl,
};

/** Tiled maps, keyed by map id (matches the server's content/maps/<id>.tmj). */
export const MAPS: Record<string, string> = {
  arena: arenaMapUrl,
};

export const SPRITES = {
  player: playerUrl,
} as const;

export const tilesetKey = (name: string) => `tileset:${name}`;
export const mapKey = (id: string) => `map:${id}`;
