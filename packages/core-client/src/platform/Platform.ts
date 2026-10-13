import type { PlatformAuthPayload } from "@core/shared";

/** Ad placements every platform adapter exposes (no-ops where ads don't exist). */
export interface PlatformAds {
  /** True when an interstitial (fullscreen) ad can be shown now. */
  canShowInterstitial(): boolean;
  /** Shows an interstitial ad. Resolves true if it was displayed. */
  showInterstitial(): Promise<boolean>;
  /** True when a rewarded ad can be shown now. */
  canShowRewarded(): boolean;
  /** Shows a rewarded ad. Resolves true only if the player earned the reward. */
  showRewarded(): Promise<boolean>;
}

/**
 * Everything the game needs from the hosting platform (GamePush, itch.io, own site...).
 * Game code depends only on this interface, never on a platform SDK directly.
 */
export interface Platform {
  readonly id: string;
  readonly ads: PlatformAds;
  /** Called once before anything else. Resolves when the platform SDK is ready. */
  init(): Promise<void>;
  /** Suggested display name (account name on the platform), if any. */
  getPlayerName(): string | undefined;
  /** Language the platform reports for the player (e.g. "ru"), if any. Used as a locale hint. */
  getLanguage(): string | undefined;
  /** Tells the platform the player picked another language (keeps platform overlays in sync). */
  setLanguage(locale: string): void;
  /** Identity proof sent to the game server on join. Undefined = play as guest. */
  getAuthPayload(): PlatformAuthPayload | undefined;
  /** Called when a match starts / ends. Platforms use it for analytics and ad pacing. */
  gameplayStart(): void;
  gameplayStop(): void;
  /** Opens the platform leaderboard UI, if the platform has one. */
  openLeaderboard?(options?: Record<string, unknown>): Promise<void>;
  /**
   * The platform asks the game to pause (e.g. while an ad plays) or resume.
   * The core mutes audio and releases input; multiplayer simulation keeps running.
   */
  onPauseChange(listener: (paused: boolean) => void): void;
}
