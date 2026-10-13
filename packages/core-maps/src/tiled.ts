/**
 * Minimal typings for the parts of the Tiled JSON map format (.tmj) we use.
 * Reference: https://doc.mapeditor.org/en/stable/reference/json-map-format/
 */

export interface TiledProperty {
  name: string;
  type: string;
  value: unknown;
}

export interface TiledTile {
  id: number;
  type?: string;
  properties?: TiledProperty[];
}

export interface TiledTileset {
  firstgid: number;
  name?: string;
  /** Present only on external tilesets, which this project does not support. */
  source?: string;
  image?: string;
  tilewidth?: number;
  tileheight?: number;
  margin?: number;
  spacing?: number;
  tilecount?: number;
  columns?: number;
  tiles?: TiledTile[];
}

export interface TiledObject {
  id: number;
  name: string;
  /** Tiled >= 1.9 uses `type` in JSON for the object's class. */
  type?: string;
  class?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  point?: boolean;
  properties?: TiledProperty[];
}

export interface TiledTileLayer {
  type: "tilelayer";
  name: string;
  width: number;
  height: number;
  data: number[] | string;
  encoding?: string;
  visible: boolean;
  properties?: TiledProperty[];
}

export interface TiledObjectLayer {
  type: "objectgroup";
  name: string;
  objects: TiledObject[];
  visible: boolean;
  properties?: TiledProperty[];
}

export interface TiledGroupLayer {
  type: "group";
  name: string;
  layers: TiledLayer[];
}

export type TiledLayer = TiledTileLayer | TiledObjectLayer | TiledGroupLayer | { type: "imagelayer"; name: string };

export interface TiledMap {
  type: "map";
  orientation: string;
  infinite: boolean;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
  properties?: TiledProperty[];
}

/** Tiled stores flip/rotation flags in the top bits of each gid. */
const GID_MASK = 0x0fffffff;

export function cleanGid(gid: number): number {
  return gid & GID_MASK;
}

export function getProperty<T = unknown>(props: TiledProperty[] | undefined, name: string): T | undefined {
  return props?.find((p) => p.name === name)?.value as T | undefined;
}

/** Flattens group layers, prefixing names the same way Phaser does ("Group/Layer"). */
export function flattenLayers(layers: TiledLayer[], prefix = ""): TiledLayer[] {
  const out: TiledLayer[] = [];
  for (const layer of layers) {
    if (layer.type === "group") {
      out.push(...flattenLayers(layer.layers, `${prefix}${layer.name}/`));
    } else {
      out.push({ ...layer, name: `${prefix}${layer.name}` } as TiledLayer);
    }
  }
  return out;
}
