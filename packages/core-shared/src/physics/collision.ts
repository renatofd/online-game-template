/**
 * Read-only view of a tile collision grid. Implemented by `@core/maps`, but kept
 * structural so tests and other map sources can provide their own.
 */
export interface CollisionGrid {
  /** Width in tiles. */
  readonly width: number;
  /** Height in tiles. */
  readonly height: number;
  /** Tile size in pixels. */
  readonly tileSize: number;
  /** True when the tile at (tx, ty) blocks movement. Out-of-bounds tiles must report true. */
  isSolid(tx: number, ty: number): boolean;
}

/** True when an axis-aligned box centred at (x, y) with half-extent `half` overlaps any solid tile. */
export function boxHitsSolid(grid: CollisionGrid, x: number, y: number, half: number): boolean {
  const ts = grid.tileSize;
  // A tiny epsilon keeps a box resting exactly on a tile edge from counting as overlap.
  const eps = 1e-6;
  const minTx = Math.floor((x - half + eps) / ts);
  const maxTx = Math.floor((x + half - eps) / ts);
  const minTy = Math.floor((y - half + eps) / ts);
  const maxTy = Math.floor((y + half - eps) / ts);

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (grid.isSolid(tx, ty)) return true;
    }
  }
  return false;
}

/**
 * Moves a box along one axis by `delta`, stopping flush against the first solid tile.
 * Returns the resolved coordinate on that axis.
 *
 * Assumes |delta| < tileSize per step (no tunnelling checks). At the default
 * speed and tick rate a step is ~3 px against 16 px tiles.
 */
export function moveAxis(
  grid: CollisionGrid,
  axis: "x" | "y",
  x: number,
  y: number,
  half: number,
  delta: number,
): number {
  const from = axis === "x" ? x : y;
  const to = from + delta;
  const hits = (v: number) => (axis === "x" ? boxHitsSolid(grid, v, y, half) : boxHitsSolid(grid, x, v, half));

  if (delta === 0 || !hits(to)) return to;

  // Snap flush against the blocking tile edge in the direction of travel.
  const ts = grid.tileSize;
  const snapped = delta > 0 ? Math.floor((to + half) / ts) * ts - half : Math.ceil((to - half) / ts) * ts + half;

  // If snapping would move us backwards past where we started (e.g. already overlapping), stay put.
  if ((delta > 0 && snapped < from) || (delta < 0 && snapped > from)) return from;
  return hits(snapped) ? from : snapped;
}
