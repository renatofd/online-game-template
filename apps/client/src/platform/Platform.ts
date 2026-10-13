/**
 * Everything the game needs from the hosting platform (GamePush, itch.io, own site...).
 * Game code depends only on this interface, never on a platform SDK directly.
 */
export interface Platform {
  readonly id: string;
  /** Called once before the game starts. */
  init(): Promise<void>;
  /** Display name to use in-game. */
  getPlayerName(): string;
}
