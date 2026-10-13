import type { GameModule } from "@core/client";
import { ArenaState, PROTOCOL_VERSION, ROOM_ARENA } from "@game/shared";
import { MUSIC_THEME, preloadAssets, SFX_UI } from "./assets";
import { messages } from "./messages";
import { GAME_SCENE_KEY, GameScene } from "./scenes/GameScene";
import "./styles.css";

/** EXAMPLE GAME: everything the template core needs to run this game. */
export const game: GameModule<ArenaState> = {
  title: "Arena Demo",
  id: "arena-demo",
  protocolVersion: PROTOCOL_VERSION,
  roomName: ROOM_ARENA,
  rootSchema: ArenaState,
  resolution: { width: 640, height: 360 },
  orientation: "landscape",
  preload: preloadAssets,
  scenes: [GameScene],
  gameSceneKey: GAME_SCENE_KEY,
  // Example action (unused by the demo rules): shows how keys, gamepad and touch buttons are bound.
  actions: [],
  messages,
  menuMusic: MUSIC_THEME,
  uiSound: SFX_UI,
};
