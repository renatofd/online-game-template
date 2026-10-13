import { Callbacks, type InputHandle } from "@colyseus/sdk";
import { Predict } from "@colyseus/sdk/predict";
import { type GameMap, parseTiledMap, type TiledMap } from "@game/maps";
import type { MoveInput, Player } from "@game/protocol";
import { stepPlayer } from "@game/shared";
import Phaser from "phaser";
import { mapKey, tilesetKey } from "../assets/manifest";
import { MoveInputReader } from "../input/MoveInputReader";
import { type ArenaRoom, joinArena } from "../net/connection";
import { PlayerView } from "../render/PlayerView";
import { services } from "../services";

/**
 * Main gameplay scene.
 *
 * Netcode (provided by @colyseus/sdk/predict):
 *  - own player: client-side prediction with the shared `stepPlayer`, reconciled against the server
 *  - other players: interpolated between server snapshots
 * Rendering only reads `predict.value(...)`; it never owns game state.
 */
export class GameScene extends Phaser.Scene {
  private room?: ArenaRoom;
  private predict?: Predict;
  private input$?: InputHandle<MoveInput>;
  private inputReader?: MoveInputReader;
  private views = new Map<string, PlayerView>();
  private status?: Phaser.GameObjects.Text;

  constructor() {
    super("game");
  }

  create() {
    this.status = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "Conectando...", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    this.inputReader = new MoveInputReader(this);
    this.connect().catch((err: unknown) => {
      console.error(err);
      this.status?.setText("Não foi possível conectar ao servidor.").setVisible(true);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.room?.leave();
    });
  }

  private async connect() {
    const room = await joinArena({ name: services.platform.getPlayerName() });
    this.room = room;

    // The first patch carries the whole state, including our own Player.
    await new Promise<void>((resolve) => room.onStateChange.once(() => resolve()));

    const gameMap = this.buildMap(room.state.mapId);
    const predict = Predict.get(room);
    this.predict = predict;

    // Other players: interpolate toward the latest snapshot. smoothMs trades a
    // little display lag for continuous motion on a rough connection.
    predict.attachAll("players", { mode: "lerp", fields: ["x", "y"], smoothMs: 65 });

    const input = room.input<MoveInput>({ mode: "reliable" });
    this.input$ = input;

    const self = room.state.players.get(room.sessionId);
    if (!self) throw new Error("own player missing from state");
    predict.reconciler(self, {
      input,
      fields: ["x", "y", "vx", "vy"],
      // The exact function the server runs; determinism is the whole contract.
      step: (ctx, predicted, command) => stepPlayer(predicted, command, ctx.dt, gameMap.collision),
    });

    const callbacks = Callbacks.get(room);
    callbacks.onAdd("players", (player: Player, sessionId: string) => this.addPlayer(player, sessionId));
    callbacks.onRemove("players", (_player: Player, sessionId: string) => this.removePlayer(sessionId));

    room.onLeave(() => {
      this.status?.setText("Desconectado.").setVisible(true);
      for (const view of this.views.values()) view.destroy();
      this.views.clear();
    });

    this.status?.setVisible(false);
    this.scene.launch("hud", { room });
  }

  /** Renders the Tiled map and returns the parsed collision data used for prediction. */
  private buildMap(mapId: string): GameMap {
    const key = mapKey(mapId);
    const map = this.make.tilemap({ key });
    const tilesets = map.tilesets.map((ts) => map.addTilesetImage(ts.name, tilesetKey(ts.name)));
    const usable = tilesets.filter((t): t is Phaser.Tilemaps.Tileset => t !== null);

    for (const layer of map.layers) {
      map.createLayer(layer.name, usable);
    }

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setRoundPixels(true);

    // Same .tmj the server parsed, so client-side collision matches exactly.
    const raw = this.cache.tilemap.get(key)?.data as TiledMap;
    return parseTiledMap(raw);
  }

  private addPlayer(player: Player, sessionId: string) {
    const room = this.room;
    if (!room || this.views.has(sessionId)) return;
    const isSelf = sessionId === room.sessionId;
    const view = new PlayerView(this, "player", player.name, sessionId, isSelf);
    view.setPosition(player.x, player.y);
    this.views.set(sessionId, view);
    if (isSelf) this.cameras.main.startFollow(view.container, true);
  }

  private removePlayer(sessionId: string) {
    this.views.get(sessionId)?.destroy();
    this.views.delete(sessionId);
  }

  override update(time: number) {
    const { room, predict, input$, inputReader } = this;
    if (!room || !predict || !input$ || !inputReader) return;

    // Drives prediction, interpolation and reconciliation, and returns how many
    // fixed steps came due, so we send exactly one input per simulation step.
    const steps = predict.tick(time);
    for (let i = 0; i < steps; i++) {
      const { moveX, moveY } = inputReader.read();
      input$.data.moveX = moveX;
      input$.data.moveY = moveY;
      input$.send();
    }

    for (const [sessionId, player] of room.state.players) {
      this.views.get(sessionId)?.setPosition(predict.value(player, "x"), predict.value(player, "y"));
    }
  }
}
