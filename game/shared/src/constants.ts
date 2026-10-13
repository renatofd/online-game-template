/**
 * Bump whenever schemas, inputs or messages in this game change in a way old
 * clients can't handle. Mismatched clients are told to reload.
 */
export const PROTOCOL_VERSION = 2;

/** Simulation rate in Hz. One input advances exactly one fixed step. */
export const TICK_RATE = 30;

/** Fixed step duration in seconds. */
export const TICK_DT = 1 / TICK_RATE;

/** Size of a map tile in pixels. Every map and tileset uses this. */
export const TILE_SIZE = 16;

/** Player collision box half-extent in pixels (box is 2 * PLAYER_HALF wide). */
export const PLAYER_HALF = 6;

/** Player speed in pixels per second at full input. */
export const PLAYER_SPEED = 96;

/**
 * Area of interest radius in pixels: players farther than this are not sent to a client.
 * A bit more than half the screen diagonal (640x360 → ~367 px), so nobody pops in on screen.
 */
export const INTEREST_RADIUS = 400;

/** Area of interest is recomputed every N ticks (30 Hz / 3 = 10 times per second). */
export const INTEREST_EVERY_TICKS = 3;

/** Maximum players in one arena room. */
export const MAX_PLAYERS_PER_ROOM = 64;
