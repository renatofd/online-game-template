import type { GameMap } from "@game/maps";
import { type ArenaJoinOptions, ArenaState, MoveInput, Player } from "@game/protocol";
import { MAX_NAME_LENGTH, MAX_PLAYERS_PER_ROOM, stepPlayer, TICK_RATE } from "@game/shared";
import { type Client, type CloseCode, Room, type StepContext } from "colyseus";
import { loadMap } from "../world/maps";

export interface ArenaCreateOptions {
  mapId?: string;
}

/** Seconds a dropped player's seat is held so they can reconnect. */
const RECONNECT_GRACE_SECONDS = 20;

/**
 * One .io match. In a future MMO this same shape becomes one zone of the world.
 *
 * Authoritative: clients only send MoveInput frames; the server runs the shared
 * `stepPlayer` once per received input on a fixed timestep and syncs the result.
 */
export class ArenaRoom extends Room<{ state: ArenaState; input: MoveInput }> {
  override maxClients = MAX_PLAYERS_PER_ROOM;
  override state = new ArenaState();

  /**
   * Per-client input buffer. `sanitize` clamps every field as it is decoded:
   * never trust the wire. ~2s of buffer at 30 Hz absorbs bursts after a stall.
   */
  override inputs = this.defineInput(MoveInput, {
    bufferMaxSize: 64,
    sanitize: { moveX: [-1, 1], moveY: [-1, 1] },
  });

  private map!: GameMap;
  private spawnCursor = 0;

  override messages = {
    // Movement arrives through the input buffer above. Register handlers here
    // only for things that are not per-tick inputs (chat, emotes, ...).
  };

  override onCreate(options: ArenaCreateOptions = {}) {
    const mapId = options.mapId ?? "arena";
    this.map = loadMap(mapId);
    this.state.mapId = mapId;
    this.setFixedTimestep((ctx) => this.step(ctx), TICK_RATE);
  }

  override onJoin(client: Client, options: ArenaJoinOptions = {}) {
    const spawn = this.map.spawns[this.spawnCursor++ % this.map.spawns.length] ?? {
      x: this.map.pixelWidth / 2,
      y: this.map.pixelHeight / 2,
    };
    this.state.players.set(
      client.sessionId,
      new Player({ name: sanitizeName(options.name), x: spawn.x, y: spawn.y, vx: 0, vy: 0 }),
    );
  }

  override onDrop(client: Client, _code: CloseCode) {
    // Not awaited: the framework routes the outcome to onReconnect() or onLeave().
    // The catch only silences the rejection when the room is already disposing.
    this.allowReconnection(client, RECONNECT_GRACE_SECONDS).catch(() => {});
  }

  override onLeave(client: Client, _code: CloseCode) {
    this.state.players.delete(client.sessionId);
  }

  /**
   * One shared `stepPlayer` per received input, so the inputs the client
   * predicted are exactly the inputs the server applied. A client that sends
   * nothing does not move.
   */
  private step(ctx: StepContext) {
    for (const [sessionId, player] of this.state.players) {
      const channel = this.inputs.get(sessionId);
      if (!channel) continue;
      for (const input of channel) stepPlayer(player, input, ctx.dt, this.map.collision);
    }
  }
}

function sanitizeName(name: unknown): string {
  if (typeof name !== "string") return "Player";
  // Strip control characters and trim to a safe display length.
  const clean = name
    .replace(/\p{Cc}/gu, "")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  return clean.length > 0 ? clean : "Player";
}
