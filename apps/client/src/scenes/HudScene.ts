import Phaser from "phaser";
import type { ArenaRoom } from "../net/connection";

/** Overlay with connection stats. Runs as a separate scene so it ignores the game camera. */
export class HudScene extends Phaser.Scene {
  private room?: ArenaRoom;
  private label?: Phaser.GameObjects.Text;

  constructor() {
    super("hud");
  }

  init(data: { room: ArenaRoom }) {
    this.room = data.room;
  }

  create() {
    this.label = this.add
      .text(4, this.scale.height - 4, "", { fontFamily: "monospace", fontSize: "8px", color: "#ffffff" })
      .setOrigin(0, 1)
      .setStroke("#000000", 2);
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.refresh() });
  }

  private refresh() {
    const room = this.room;
    if (!room || !this.label) return;
    const ping = Math.round(room.clock.smoothedRtt());
    const fps = Math.round(this.game.loop.actualFps);
    this.label.setText(`ping ${ping}ms  players ${room.state.players.size}  fps ${fps}`);
  }
}
