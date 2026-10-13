import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { GameScene } from "../scenes/GameScene";
import { HudScene } from "../scenes/HudScene";

/** Internal (logical) resolution. Everything is drawn at this size, then scaled up. */
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

/**
 * Largest whole-number zoom that fits the window, so every art pixel becomes an
 * exact NxN block of screen pixels. Falls back to a fractional zoom only when
 * the window is smaller than the internal resolution.
 */
export function computeZoom(): number {
  const scale = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
  return scale >= 1 ? Math.floor(scale) : scale;
}

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: "game",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#101018",
    // Crisp nearest-neighbour pixels; also turns antialias off and roundPixels on.
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      zoom: computeZoom(),
    },
    scene: [BootScene, GameScene, HudScene],
  };
}
