import type { ActionBinding, Vec2 } from "./types";

const UP = ["KeyW", "ArrowUp"];
const DOWN = ["KeyS", "ArrowDown"];
const LEFT = ["KeyA", "ArrowLeft"];
const RIGHT = ["KeyD", "ArrowRight"];
const MOVE_KEYS = new Set([...UP, ...DOWN, ...LEFT, ...RIGHT]);

/** Keyboard state from DOM events (layout-independent `code`s: WASD works on AZERTY too). */
export class KeyboardSource {
  private down = new Set<string>();
  private gameKeys: Set<string>;
  /** When false, keys are not captured (e.g. while the menu has focus). */
  enabled = false;

  constructor(actions: ActionBinding[]) {
    this.gameKeys = new Set([...MOVE_KEYS, ...actions.flatMap((a) => a.keys ?? [])]);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.reset);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled || isTyping(e.target)) return;
    this.down.add(e.code);
    // Stop arrows/space from scrolling the page or the portal around the game iframe.
    if (this.gameKeys.has(e.code)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code);
  };

  reset = () => {
    this.down.clear();
  };

  move(): Vec2 {
    const any = (codes: string[]) => codes.some((c) => this.down.has(c));
    return { x: Number(any(RIGHT)) - Number(any(LEFT)), y: Number(any(DOWN)) - Number(any(UP)) };
  }

  isDown(action: ActionBinding): boolean {
    return (action.keys ?? []).some((c) => this.down.has(c));
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.reset);
  }
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
  );
}
