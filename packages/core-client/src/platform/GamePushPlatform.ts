import type { PlatformAuthPayload } from "@core/shared";
import type { Platform, PlatformAds } from "./Platform";
import { WebPlatform } from "./WebPlatform";

/**
 * The parts of the GamePush SDK (`gp`) this adapter uses. Names checked against
 * the SDK itself; see https://docs.gamepush.com/ for the full API.
 */
export interface GamePushSdk {
  language?: string;
  changeLanguage?(language: string): Promise<void>;
  gameStart?(): Promise<void>;
  gameplayStart?(): Promise<void>;
  gameplayStop?(): Promise<void>;
  on?(event: string, callback: (...args: unknown[]) => void): void;
  platform?: { type?: string; tag?: string };
  player?: {
    ready?: Promise<unknown>;
    id?: number;
    name?: string;
    isLoggedIn?: boolean;
    _authInfo?: unknown;
  };
  ads?: {
    isFullscreenAvailable?: boolean;
    isRewardedAvailable?: boolean;
    showFullscreen?(options?: { showCountdownOverlay?: boolean }): Promise<boolean>;
    showRewardedVideo?(options?: { showRewardedFailedOverlay?: boolean }): Promise<boolean>;
  };
  leaderboard?: { open?(options?: Record<string, unknown>): Promise<void> };
}

declare global {
  interface Window {
    gp?: GamePushSdk;
    onGPInit?: (gp: GamePushSdk) => void;
  }
}

/** Official SDK mirrors, tried in order (same list the GamePush loader snippet uses). */
const SDK_URLS = [
  "https://gamepush.com/sdk/game-score.js",
  "https://s3.gamepush.com/files/gs/sdk/game-score.js",
  "https://s3-eu.gamepush.com/sdk/game-score.js",
  "https://gs.eponesh.com/sdk/game-score.js",
];

/** How long to wait for the SDK (all mirrors) before continuing as plain web. */
const SDK_TIMEOUT_MS = 15_000;

export interface GamePushConfig {
  projectId: string;
  publicToken: string;
}

/** Reads VITE_GAMEPUSH_PROJECT_ID / VITE_GAMEPUSH_PUBLIC_TOKEN. */
export function gamePushConfigFromEnv(): GamePushConfig | undefined {
  const projectId = import.meta.env.VITE_GAMEPUSH_PROJECT_ID as string | undefined;
  const publicToken = import.meta.env.VITE_GAMEPUSH_PUBLIC_TOKEN as string | undefined;
  return projectId && publicToken ? { projectId, publicToken } : undefined;
}

/**
 * GamePush adapter: loads the SDK, waits for the player to sync, and maps
 * language, name, ads, leaderboard, pause/resume and identity proof.
 * When the SDK can't be loaded (no config, offline, blocked), it behaves like WebPlatform.
 */
export class GamePushPlatform implements Platform {
  readonly id = "gamepush";
  readonly ads: PlatformAds;
  private fallback = new WebPlatform();
  private gp: GamePushSdk | undefined;
  private pauseListeners: ((paused: boolean) => void)[] = [];

  constructor(private readonly config = gamePushConfigFromEnv()) {
    this.ads = {
      canShowInterstitial: () => this.gp?.ads?.isFullscreenAvailable === true,
      showInterstitial: async () => (await this.gp?.ads?.showFullscreen?.().catch(() => false)) ?? false,
      canShowRewarded: () => this.gp?.ads?.isRewardedAvailable === true,
      showRewarded: async () => (await this.gp?.ads?.showRewardedVideo?.().catch(() => false)) ?? false,
    };
  }

  async init(): Promise<void> {
    this.gp = await loadGamePushSdk(this.config).catch((err: unknown) => {
      console.warn("[platform] GamePush SDK unavailable; running as plain web.", err);
      return undefined;
    });
    if (!this.gp) return;

    // Player data (name, auth) is only valid after the first sync with GamePush.
    await this.gp.player?.ready;
    this.gp.on?.("pause", () => this.emitPause(true));
    this.gp.on?.("resume", () => this.emitPause(false));
    void this.gp.gameStart?.();
  }

  get sdk(): GamePushSdk | undefined {
    return this.gp;
  }

  getPlayerName(): string | undefined {
    return this.gp?.player?.name?.trim() || this.fallback.getPlayerName();
  }

  getLanguage(): string | undefined {
    return this.gp?.language ?? this.fallback.getLanguage();
  }

  setLanguage(locale: string) {
    if (this.gp && this.gp.language !== locale) this.gp.changeLanguage?.(locale).catch(() => {});
  }

  getAuthPayload(): PlatformAuthPayload | undefined {
    const info = this.gp?.player?._authInfo;
    if (!info) return undefined;
    return {
      provider: "gamepush",
      data: toBase64(JSON.stringify(info)),
      platform: this.gp?.platform?.type,
      platformKey: this.gp?.platform?.tag,
    };
  }

  gameplayStart() {
    void this.gp?.gameplayStart?.();
  }

  gameplayStop() {
    void this.gp?.gameplayStop?.();
  }

  async openLeaderboard(options?: Record<string, unknown>) {
    await this.gp?.leaderboard?.open?.(options);
  }

  onPauseChange(listener: (paused: boolean) => void) {
    this.pauseListeners.push(listener);
  }

  private emitPause(paused: boolean) {
    for (const fn of this.pauseListeners) fn(paused);
  }
}

/**
 * Loads the GamePush SDK script and resolves with `gp` once it calls `onGPInit`.
 * Reuses an SDK already on the page (e.g. added to index.html by hand).
 */
export function loadGamePushSdk(config: GamePushConfig | undefined): Promise<GamePushSdk> {
  if (window.gp) return Promise.resolve(window.gp);
  if (!config) return Promise.reject(new Error("VITE_GAMEPUSH_PROJECT_ID / VITE_GAMEPUSH_PUBLIC_TOKEN not set"));

  return new Promise<GamePushSdk>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("GamePush SDK timed out")), SDK_TIMEOUT_MS);
    window.onGPInit = (gp) => {
      clearTimeout(timer);
      window.gp = gp;
      resolve(gp);
    };

    const query = new URLSearchParams({
      projectId: config.projectId,
      publicToken: config.publicToken,
      callback: "onGPInit",
    });
    const tryMirror = (index: number) => {
      const url = SDK_URLS[index];
      if (!url) {
        clearTimeout(timer);
        reject(new Error("GamePush SDK failed to load from every mirror"));
        return;
      }
      const script = document.createElement("script");
      script.src = `${url}?${query}`;
      script.async = true;
      script.onerror = () => {
        script.remove();
        tryMirror(index + 1);
      };
      document.head.append(script);
    };
    tryMirror(0);
  });
}

function toBase64(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
