/**
 * Everything the game needs from the hosting platform (GamePush, itch.io, own site...).
 * Game code depends only on this interface, never on a platform SDK directly.
 */
export interface Platform {
  readonly id: string;
  /** Called once before anything else. Resolve when the platform SDK is ready. */
  init(): Promise<void>;
  /** Suggested display name (account name on the platform), if any. */
  getPlayerName(): string | undefined;
  /** Language the platform reports for the player (e.g. "ru"), if any. Used as a locale hint. */
  getLanguage(): string | undefined;
  /** Called when a match starts / ends. Platforms use it for analytics and ad pacing. */
  gameplayStart(): void;
  gameplayStop(): void;
}
