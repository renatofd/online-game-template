import type { Client } from "@colyseus/core";
import { StateView } from "@colyseus/schema";
import { SpatialHash } from "@core/shared";

/** Anything with a position that can be added to a StateView (a Schema instance). */
export interface PositionedEntity {
  x: number;
  y: number;
}

export interface InterestOptions {
  /** Entities within this distance (pixels) of a viewer become visible to it. */
  radius: number;
  /**
   * Extra distance before a visible entity is hidden again, so entities on the
   * edge don't flicker in and out. Default 20% of the radius.
   */
  hysteresis?: number;
}

/**
 * Area of interest: each client only receives the entities near it.
 *
 * Without AoI, every client gets every entity, so traffic grows with the
 * square of the players in a room. With it, cost per client depends on how
 * crowded its surroundings are, which is what lets rooms (and later MMO zones)
 * hold many players.
 *
 * How to use (see game/server ArenaRoom):
 *  1. Tag the synced collection with `.view()` in the schema, e.g. `players: t.map(Player).view()`.
 *     Items of a `.view()` collection are only sent to clients whose StateView contains them.
 *  2. `interest.addViewer(client)` in onJoin, `interest.removeViewer(client)` in onLeave.
 *  3. Call `interest.update(entities, viewerPosition)` periodically (e.g. every 3rd tick).
 */
export class InterestManager<E extends object & PositionedEntity> {
  private grid: SpatialHash<string>;
  /** Per viewer: the entity instance shown under each id (instances, so a replaced entity is re-sent). */
  private visible = new Map<string, { client: Client; shown: Map<string, E> }>();
  private readonly hideRadius: number;
  private scratch: string[] = [];
  private known = new Set<string>();

  constructor(private readonly options: InterestOptions) {
    this.grid = new SpatialHash(options.radius);
    this.hideRadius = options.radius + (options.hysteresis ?? options.radius * 0.2);
  }

  /** Gives the client its StateView. Call in onJoin (before the first patch). */
  addViewer(client: Client) {
    client.view = new StateView();
    this.visible.set(client.sessionId, { client, shown: new Map() });
  }

  /** Call in onLeave (not onDrop: a reconnecting client keeps its view). */
  removeViewer(client: Client) {
    this.visible.delete(client.sessionId);
    client.view?.dispose();
  }

  /**
   * Recomputes what each viewer sees.
   * @param entities all entities of the `.view()` collection, by id
   * @param viewerPosition where a viewer is (usually its own entity); undefined = sees only `alwaysVisible`
   * @param alwaysVisible ids a viewer always sees regardless of distance (usually its own entity)
   */
  update(
    entities: Iterable<[string, E]>,
    viewerPosition: (sessionId: string) => PositionedEntity | undefined,
    alwaysVisible: (sessionId: string) => string | undefined = (sessionId) => sessionId,
  ) {
    const byId = new Map<string, E>();
    for (const [id, entity] of entities) {
      byId.set(id, entity);
      this.grid.set(id, entity.x, entity.y);
    }
    for (const id of this.known) if (!byId.has(id)) this.grid.delete(id);
    this.known = new Set(byId.keys());

    for (const [sessionId, viewer] of this.visible) {
      const view = viewer.client.view;
      if (!view) continue;
      const pos = viewerPosition(sessionId);
      const own = alwaysVisible(sessionId);
      const next = new Set<string>();
      if (own && byId.has(own)) next.add(own);

      if (pos) {
        this.scratch.length = 0;
        for (const id of this.grid.queryRadius(pos.x, pos.y, this.options.radius, this.scratch)) next.add(id);
        // Keep entities already visible until they pass the (larger) hide radius.
        for (const id of viewer.shown.keys()) {
          const e = byId.get(id);
          if (e && (e.x - pos.x) ** 2 + (e.y - pos.y) ** 2 <= this.hideRadius ** 2) next.add(id);
        }
      }

      // An entity removed from the collection (or replaced under the same id) is
      // detached, so only still-present instances need an explicit remove.
      for (const [id, shown] of viewer.shown) {
        if (!next.has(id) && byId.get(id) === shown) view.remove(asRef(shown));
      }
      const shown = new Map<string, E>();
      for (const id of next) {
        const e = byId.get(id);
        if (!e) continue;
        if (viewer.shown.get(id) !== e) view.add(asRef(e));
        shown.set(id, e);
      }
      viewer.shown = shown;
    }
  }

  /** Ids currently visible to a client (for tests and debugging). */
  visibleTo(sessionId: string): ReadonlySet<string> {
    return new Set(this.visible.get(sessionId)?.shown.keys());
  }
}

/** Entities are Schema instances at runtime; the structural type above keeps games decoupled from it. */
const asRef = (entity: object) => entity as unknown as Parameters<StateView["add"]>[0];
