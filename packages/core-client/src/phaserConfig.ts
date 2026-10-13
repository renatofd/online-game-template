import Phaser from "phaser";

export interface Resolution {
  width: number;
  height: number;
}

/**
 * Largest whole-number zoom that fits the window, so every art pixel becomes an
 * exact NxN block of screen pixels. Falls back to a fractional zoom only when
 * the window is smaller than the logical resolution.
 */
export function computeZoom(res: Resolution): number {
  const scale = Math.min(window.innerWidth / res.width, window.innerHeight / res.height);
  return scale >= 1 ? Math.floor(scale) : scale;
}

export function createPhaserConfig(
  res: Resolution,
  scenes: Phaser.Types.Scenes.SceneType[],
  backgroundColor = "#101018",
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: "game",
    width: res.width,
    height: res.height,
    backgroundColor,
    // Crisp nearest-neighbour pixels; also turns antialias off and roundPixels on.
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      zoom: computeZoom(res),
    },
    input: { keyboard: false },
    disableContextMenu: true,
    scene: scenes,
  };
}
