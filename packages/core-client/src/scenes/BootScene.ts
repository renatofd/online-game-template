import Phaser from "phaser";

export const BOOT_SCENE_KEY = "core:boot";

export interface BootSceneData {
  preload: (scene: Phaser.Scene) => void;
  onProgress: (progress: number) => void;
  onComplete: () => void;
}

/** Loads the game's assets, reporting progress to the DOM loading screen. */
export class BootScene extends Phaser.Scene {
  private data_!: BootSceneData;

  constructor() {
    super(BOOT_SCENE_KEY);
  }

  init(data: BootSceneData) {
    this.data_ = data;
  }

  preload() {
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => this.data_.onProgress(p));
    this.data_.preload(this);
  }

  create() {
    this.data_.onComplete();
  }
}
