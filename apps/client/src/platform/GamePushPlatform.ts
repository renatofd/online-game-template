import type { Platform } from "./Platform";
import { WebPlatform } from "./WebPlatform";

/** Minimal shape of the GamePush SDK object we use. Extend as features are added. */
interface GamePushSdk {
  player?: { name?: string };
}

declare global {
  interface Window {
    gp?: GamePushSdk;
  }
}

/**
 * GamePush adapter. The SDK script is injected by GamePush (or added to index.html
 * following their docs) and exposes `window.gp`. Falls back to WebPlatform
 * behaviour when the SDK is not present, so local dev keeps working.
 *
 * TODO when publishing on GamePush: wait for the SDK ready callback described in
 * https://docs.gamepush.com/docs/get-start/ and wire leaderboards/ads/payments here.
 */
export class GamePushPlatform implements Platform {
  readonly id = "gamepush";
  private fallback = new WebPlatform();

  async init(): Promise<void> {
    await this.fallback.init();
  }

  getPlayerName(): string {
    const name = window.gp?.player?.name?.trim();
    return name || this.fallback.getPlayerName();
  }
}
