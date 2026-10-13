import type { Platform } from "./Platform";
import { WebPlatform } from "./WebPlatform";

/** Minimal shape of the GamePush SDK object we use. Extend as features are added. */
interface GamePushSdk {
  language?: string;
  player?: { name?: string };
  gameStart?: () => void;
  gameplayStart?: () => void;
  gameplayStop?: () => void;
}

declare global {
  interface Window {
    gp?: GamePushSdk;
  }
}

/** How long to wait for the GamePush SDK before continuing without it. */
const SDK_TIMEOUT_MS = 8000;

/**
 * GamePush adapter. GamePush injects its SDK (or you add the script tag from
 * their docs to index.html), which exposes `window.gp`. When the SDK is not
 * present (local dev), it behaves like WebPlatform.
 *
 * Docs: https://docs.gamepush.com/docs/get-start/
 * TODO(P2): leaderboards, ads, purchases, server-side player verification.
 */
export class GamePushPlatform implements Platform {
  readonly id = "gamepush";
  private fallback = new WebPlatform();
  private gp: GamePushSdk | undefined;

  async init(): Promise<void> {
    this.gp = await waitFor(() => window.gp, SDK_TIMEOUT_MS);
    if (!this.gp) console.warn("[platform] GamePush SDK not found; running as plain web.");
    this.gp?.gameStart?.();
  }

  getPlayerName(): string | undefined {
    return this.gp?.player?.name?.trim() || this.fallback.getPlayerName();
  }

  getLanguage(): string | undefined {
    return this.gp?.language ?? this.fallback.getLanguage();
  }

  gameplayStart() {
    this.gp?.gameplayStart?.();
  }

  gameplayStop() {
    this.gp?.gameplayStop?.();
  }
}

async function waitFor<T>(get: () => T | undefined, timeoutMs: number): Promise<T | undefined> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    const value = get();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 50));
  }
  return get();
}
