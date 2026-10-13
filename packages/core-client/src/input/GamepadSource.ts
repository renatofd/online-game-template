import type { ActionBinding, Vec2 } from "./types";

const DEADZONE = 0.2;
// Standard mapping d-pad buttons.
const DPAD_UP = 12;
const DPAD_DOWN = 13;
const DPAD_LEFT = 14;
const DPAD_RIGHT = 15;

/** Polls the first connected gamepad (standard mapping). */
export class GamepadSource {
  private pad: Gamepad | null = null;

  /** Call once per frame. */
  poll() {
    this.pad = null;
    if (typeof navigator.getGamepads !== "function") return;
    for (const pad of navigator.getGamepads()) {
      if (pad?.connected) {
        this.pad = pad;
        return;
      }
    }
  }

  get connected(): boolean {
    return this.pad !== null;
  }

  move(): Vec2 {
    const pad = this.pad;
    if (!pad) return { x: 0, y: 0 };
    const pressed = (i: number) => pad.buttons[i]?.pressed === true;
    let x = Number(pressed(DPAD_RIGHT)) - Number(pressed(DPAD_LEFT));
    let y = Number(pressed(DPAD_DOWN)) - Number(pressed(DPAD_UP));
    if (x === 0 && y === 0) {
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      if (Math.hypot(ax, ay) > DEADZONE) {
        x = ax;
        y = ay;
      }
    }
    return { x, y };
  }

  isDown(action: ActionBinding): boolean {
    const pad = this.pad;
    return !!pad && (action.gamepadButtons ?? []).some((i) => pad.buttons[i]?.pressed === true);
  }
}
