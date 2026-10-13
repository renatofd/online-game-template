import { animKey } from "@core/client";
import type Phaser from "phaser";

/** System fonts so names in any script (Arabic, Devanagari, CJK...) render. */
const LABEL_FONT = 'system-ui, "Segoe UI", Roboto, "Noto Sans", sans-serif';
const SELF_TINT = 0x7fe36b;
const OTHER_TINTS = [0xf2a65a, 0x5ab4f2, 0xe35b8f, 0xb98cf2, 0xf2e35a, 0x5af2c8];
/** Below this speed (px per frame) the player counts as standing still. */
const MOVING_EPSILON = 0.05;

/** Visual for one player. Holds no game state: it only draws positions it is given. */
export class PlayerView {
  readonly container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private lastX = Number.NaN;
  private lastY = Number.NaN;

  constructor(
    scene: Phaser.Scene,
    private readonly spriteKey: string,
    name: string,
    sessionId: string,
    isSelf: boolean,
  ) {
    this.sprite = scene.add.sprite(0, 0, spriteKey).setTint(isSelf ? SELF_TINT : tintFor(sessionId));
    this.sprite.play(animKey(spriteKey, "idle"));
    const label = scene.add
      .text(0, -11, name, { fontFamily: LABEL_FONT, fontSize: "10px", color: "#ffffff" })
      .setOrigin(0.5, 1)
      .setStroke("#000000", 2);
    this.container = scene.add.container(0, 0, [this.sprite, label]).setDepth(isSelf ? 11 : 10);
  }

  /** Moves the view and picks the animation from how far it moved since the last frame. */
  setPosition(x: number, y: number) {
    if (!Number.isNaN(this.lastX)) {
      const dx = x - this.lastX;
      const moving = Math.abs(dx) > MOVING_EPSILON || Math.abs(y - this.lastY) > MOVING_EPSILON;
      this.sprite.play(animKey(this.spriteKey, moving ? "walk" : "idle"), true);
      if (Math.abs(dx) > MOVING_EPSILON) this.sprite.setFlipX(dx < 0);
    }
    this.lastX = x;
    this.lastY = y;
    this.container.setPosition(x, y);
  }

  destroy() {
    this.container.destroy();
  }
}

function tintFor(sessionId: string): number {
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) h = (h * 31 + sessionId.charCodeAt(i)) | 0;
  return OTHER_TINTS[Math.abs(h) % OTHER_TINTS.length] ?? 0xffffff;
}
