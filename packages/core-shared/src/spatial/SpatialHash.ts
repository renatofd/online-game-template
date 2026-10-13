/**
 * Uniform grid for fast "what is near (x, y)?" queries, used for area of
 * interest and proximity checks. Insert/update/remove are O(1); a radius query
 * only visits the cells the circle overlaps.
 *
 * Pick `cellSize` close to the typical query radius (e.g. the view radius).
 */
export class SpatialHash<Id> {
  private cells = new Map<number, Set<Id>>();
  private positions = new Map<Id, { x: number; y: number; cell: number }>();

  constructor(private readonly cellSize: number) {
    if (!(cellSize > 0)) throw new Error("cellSize must be > 0");
  }

  get size(): number {
    return this.positions.size;
  }

  /** Inserts or moves an entry. */
  set(id: Id, x: number, y: number) {
    const cell = this.cellKey(Math.floor(x / this.cellSize), Math.floor(y / this.cellSize));
    const prev = this.positions.get(id);
    if (prev && prev.cell !== cell) this.cells.get(prev.cell)?.delete(id);
    if (!prev || prev.cell !== cell) {
      let bucket = this.cells.get(cell);
      if (!bucket) {
        bucket = new Set();
        this.cells.set(cell, bucket);
      }
      bucket.add(id);
    }
    this.positions.set(id, { x, y, cell });
  }

  delete(id: Id) {
    const prev = this.positions.get(id);
    if (!prev) return;
    this.cells.get(prev.cell)?.delete(id);
    this.positions.delete(id);
  }

  /** Every id within `radius` of (x, y), inclusive. */
  queryRadius(x: number, y: number, radius: number, out: Id[] = []): Id[] {
    const r2 = radius * radius;
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = this.cells.get(this.cellKey(cx, cy));
        if (!bucket) continue;
        for (const id of bucket) {
          const p = this.positions.get(id);
          if (p && (p.x - x) ** 2 + (p.y - y) ** 2 <= r2) out.push(id);
        }
      }
    }
    return out;
  }

  /** Position last set for `id`. */
  position(id: Id): { x: number; y: number } | undefined {
    return this.positions.get(id);
  }

  clear() {
    this.cells.clear();
    this.positions.clear();
  }

  /** Packs two cell coordinates into one number key (supports ±1M cells per axis). */
  private cellKey(cx: number, cy: number): number {
    return (cx + 0x100000) * 0x200000 + (cy + 0x100000);
  }
}
