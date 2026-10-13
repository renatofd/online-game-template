import type Phaser from "phaser";

/** System fonts so names in any script (Arabic, Devanagari, CJK...) render. */
const LABEL_FONT = 'system-ui, "Segoe UI", Roboto, "Noto Sans", sans-serif';
const SELF_TINT = 0x7fe36b;
const OTHER_TINTS = [0xf2a65a, 0x5ab4f2, 0xe35b8f, 0xb98cf2, 0xf2e35a, 0x5af2c8];

/** Visual for one player. Holds no game state: it only draws positions it is given. */
export class PlayerView {
  readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, textureKey: string, name: string, sessionId: string, isSelf: boolean) {
    const sprite = scene.add.image(0, 0, textureKey).setTint(isSelf ? SELF_TINT : tintFor(sessionId));
    const label = scene.add
      .text(0, -11, name, { fontFamily: LABEL_FONT, fontSize: "10px", color: "#ffffff" })
      .setOrigin(0.5, 1)
      .setStroke("#000000", 2);
    this.container = scene.add.container(0, 0, [sprite, label]).setDepth(isSelf ? 11 : 10);
  }

  setPosition(x: number, y: number) {
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
