import Phaser from "phaser";
import { MAPS, mapKey, SPRITES, TILESETS, tilesetKey } from "../assets/manifest";

/** Loads every asset, then starts the game. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2 - 100, height / 2, 0, 6, 0x7fe36b).setOrigin(0, 0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => bar.setSize(200 * p, 6));

    for (const [name, url] of Object.entries(TILESETS)) this.load.image(tilesetKey(name), url);
    for (const [id, url] of Object.entries(MAPS)) this.load.tilemapTiledJSON(mapKey(id), url);
    this.load.image("player", SPRITES.player);
  }

  create() {
    this.scene.start("game");
  }
}
