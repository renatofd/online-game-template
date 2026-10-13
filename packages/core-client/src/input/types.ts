/** A game action that can be bound to keys, gamepad buttons and an on-screen touch button. */
export interface ActionBinding {
  /** Identifier used by the game, e.g. "dash". */
  id: string;
  /** KeyboardEvent.code values, e.g. ["Space"], ["KeyE"]. */
  keys?: string[];
  /** Standard-mapping gamepad button indices, e.g. [0] for A / Cross. */
  gamepadButtons?: number[];
  /** Label (i18n key or literal) for the touch button. Omit to have no touch button. */
  touchLabel?: string;
}

export interface Vec2 {
  x: number;
  y: number;
}
