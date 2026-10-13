import type { Room } from "@colyseus/sdk";
import type Phaser from "phaser";
import type { MessageCatalog, Translate } from "./i18n";
import type { ActionBinding, InputManager } from "./input";
import type { Platform } from "./platform";
import type { ResultRow } from "./ui/screens";

/** A Colyseus schema class (e.g. `ArenaState`). */
// biome-ignore lint/suspicious/noExplicitAny: schema constructors take arbitrary init args.
export type SchemaClass<State> = new (...args: any[]) => State;

/**
 * Everything a game plugs into the template core. The core owns the page,
 * boot/loading, menus, connection, reconnection, errors, input devices and
 * i18n; the game owns its assets, scenes and rules.
 */
export interface GameModule<State = unknown> {
  /** Display name on the main menu (not translated). */
  title: string;
  /** Short id used for storage keys, e.g. "arena-demo". */
  id: string;

  /** The game's PROTOCOL_VERSION (from game/shared). */
  protocolVersion: number;
  /** Room type to join when the player presses Play. */
  roomName: string;
  /** Schema class of the room state. */
  rootSchema?: SchemaClass<State>;
  /** Extra join options sent to the server (core adds name, locale and versions). */
  joinOptions?: () => Record<string, unknown>;

  /** Logical render size in pixels. The canvas is scaled up by whole numbers. Default 640x360. */
  resolution?: { width: number; height: number };
  /** Preferred orientation on phones; a "rotate your device" hint shows otherwise. Default "landscape". */
  orientation?: "landscape" | "portrait" | "any";
  /** Canvas background colour. */
  backgroundColor?: string;

  /** Loads every asset. Called once in the boot scene; progress is shown by the core. */
  preload(scene: Phaser.Scene): void;
  /** Phaser scenes of the game. They are registered but not started by Phaser itself. */
  scenes: Phaser.Types.Scenes.SceneType[];
  /** Key of the scene started when a match begins. It receives a GameContext in `init(data)`. */
  gameSceneKey: string;

  /** Actions besides movement, bound to keys, gamepad buttons and touch buttons. */
  actions?: ActionBinding[];
  /** Game strings. English required; other locales fall back to English per key. */
  messages?: MessageCatalog;
  /** Max display name length (grapheme clusters). Default 16. */
  maxNameLength?: number;
}

export interface MatchResult {
  /** Title (already translated). Default: "Match over". */
  title?: string;
  /** Stats rows (already translated). */
  rows?: ResultRow[];
}

/** Handed to the game scene in `init(data)` when a match starts. */
export interface GameContext<State = unknown> {
  room: Room<unknown, State>;
  input: InputManager;
  t: Translate;
  platform: Platform;
  /** Container for the game's own DOM HUD widgets (score, timer...). Cleared between matches. */
  hud: HTMLElement;
  /** Ends the match: leaves the room and shows the result screen. */
  endMatch(result?: MatchResult): void;
  /** Leaves the room and returns to the main menu. */
  exitToMenu(): void;
}
