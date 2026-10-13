import type { GameMap } from "@core/maps";
import { GameRoom, loadMap } from "@core/server";
import {
  type ArenaJoinOptions,
  ArenaState,
  MAX_PLAYERS_PER_ROOM,
  MoveInput,
  Player,
  PROTOCOL_VERSION,
  stepPlayer,
  TICK_RATE,
  TILE_SIZE,
} from "@game/shared";
import type { Client, CloseCode, StepContext } from "colyseus";

export interface ArenaCreateOptions {
  mapId?: string;
}

/**
 * EXAMPLE GAME: one .io match where players walk around a Tiled map.
 * Replace with your own game. In a future MMO this same shape becomes one zone.
 *
 * Authoritative: clients only send MoveInput frames; the server runs the shared
 * `stepPlayer` once per received input on a fixed timestep and syncs the result.
 * Version checks, auth, reconnection and flood protection come from GameRoom.
 */
export class ArenaRoom extends GameRoom<{ state: ArenaState; input: MoveInput }> {
  protected readonly protocolVersion = PROTOCOL_VERSION;
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
    this.map = loadMap(mapId, { tileSize: TILE_SIZE });
    this.state.mapId = mapId;
    this.setFixedTimestep((ctx) => this.step(ctx), TICK_RATE);
  }

  override onJoin(client: Client, _options: ArenaJoinOptions) {
    const spawn = this.map.spawns[this.spawnCursor++ % this.map.spawns.length] ?? {
      x: this.map.pixelWidth / 2,
      y: this.map.pixelHeight / 2,
    };
    this.state.players.set(
      client.sessionId,
      new Player({ name: this.identity(client).name, x: spawn.x, y: spawn.y, vx: 0, vy: 0 }),
    );
  }

  override onLeave(client: Client, _code: CloseCode) {
    this.state.players.delete(client.sessionId);
  }

  /**
   * One shared `stepPlayer` per received input, so the inputs the client
   * predicted are exactly the inputs the server applied.
   */
  private step(ctx: StepContext) {
    for (const [sessionId, player] of this.state.players) {
      const channel = this.inputs.get(sessionId);
      if (!channel) continue;
      for (const input of channel) stepPlayer(player, input, ctx.dt, this.map.collision);
    }
  }
}
