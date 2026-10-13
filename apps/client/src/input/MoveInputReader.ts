import Phaser from "phaser";

type Axis = -1 | 0 | 1;

/** Reads WASD / arrow keys into the -1|0|1 axes the server expects. */
export class MoveInputReader {
  private keys: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error("keyboard input is not available");
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.UP,
      down: K.DOWN,
      left: K.LEFT,
      right: K.RIGHT,
      w: K.W,
      a: K.A,
      s: K.S,
      d: K.D,
    }) as MoveInputReader["keys"];
  }

  read(): { moveX: Axis; moveY: Axis } {
    const k = this.keys;
    return {
      moveX: axis(k.left.isDown || k.a.isDown, k.right.isDown || k.d.isDown),
      moveY: axis(k.up.isDown || k.w.isDown, k.down.isDown || k.s.isDown),
    };
  }
}

/** Opposite keys cancel out, so an axis is always exactly -1, 0 or 1. */
function axis(negative: boolean, positive: boolean): Axis {
  if (negative === positive) return 0;
  return negative ? -1 : 1;
}
