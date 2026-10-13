/**
 * Bump whenever schemas, inputs or messages in this game change in a way old
 * clients can't handle. Mismatched clients are told to reload.
 */
export const PROTOCOL_VERSION = 1;

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

/** Maximum players in one arena room. */
export const MAX_PLAYERS_PER_ROOM = 64;
