import type { Platform } from "./platform";

/**
 * Process-wide services shared by scenes. Set once in main.ts before the game boots.
 * Kept tiny on purpose; prefer passing data through scene `init()` when possible.
 */
export const services = {} as { platform: Platform };
