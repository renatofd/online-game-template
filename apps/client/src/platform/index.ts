import { GamePushPlatform } from "./GamePushPlatform";
import type { Platform } from "./Platform";
import { WebPlatform } from "./WebPlatform";

export type { Platform } from "./Platform";

/** Picks the platform adapter from VITE_PLATFORM ("web" | "gamepush"). */
export async function createPlatform(): Promise<Platform> {
  const platform: Platform = import.meta.env.VITE_PLATFORM === "gamepush" ? new GamePushPlatform() : new WebPlatform();
  await platform.init();
  return platform;
}
