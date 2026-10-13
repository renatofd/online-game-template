/**
 * Wire conventions owned by the template core (not by any specific game).
 *
 * Bump CORE_PROTOCOL_VERSION whenever the core changes what goes over the wire
 * (join options, error codes, core messages). Games bump their own
 * `PROTOCOL_VERSION` when their schemas or messages change.
 */
export const CORE_PROTOCOL_VERSION = 3;

/** Protocol versions a client must send when joining. Both must match the server. */
export interface ProtocolVersions {
  core: number;
  game: number;
}

/**
 * Proof of the player's platform identity, verified by the server
 * (e.g. GamePush: base64 of `gp.player._authInfo`). Absent for guests.
 */
export interface PlatformAuthPayload {
  /** Account provider id, e.g. "gamepush". */
  provider: string;
  /** Opaque provider data (verified server-side, never trusted as-is). */
  data: string;
  /** Platform type the player is on (GamePush: gp.platform.type). */
  platform?: string;
  /** Platform key (GamePush: gp.platform.tag). */
  platformKey?: string;
}

/** Join options every core room understands. Games extend this with their own fields. */
export interface CoreJoinOptions {
  /** Protocol versions of the client build. */
  v: ProtocolVersions;
  /** Requested display name (sanitized server-side). */
  name?: string;
  /** Client UI locale, e.g. "pt" (informational; servers may use it for chat filters, etc.). */
  locale?: string;
  /** Platform identity to verify. Without it the player joins as a guest. */
  auth?: PlatformAuthPayload;
}

/**
 * Application error codes sent by core rooms when rejecting a join.
 * Range 4300-4399 is reserved for the core; games may use 4400-4499.
 */
export const CoreErrorCode = {
  /** Client and server builds are incompatible: the client must reload. */
  VERSION_MISMATCH: 4300,
  /** Join options failed validation. */
  INVALID_JOIN_OPTIONS: 4301,
  /** Authentication failed. */
  AUTH_FAILED: 4302,
} as const;
export type CoreErrorCode = (typeof CoreErrorCode)[keyof typeof CoreErrorCode];

/** Messages handled by the core (games use their own names; avoid the "core:" prefix). */
export const CoreMessage = {
  /** client → server: string. server → clients: ChatBroadcast. */
  chat: "core:chat",
  /** server → client: the last chat message was rejected (rate limit). */
  chatRejected: "core:chat-rejected",
} as const;

/** A chat line as broadcast by the server. Text is already sanitized. */
export interface ChatBroadcast {
  /** Session id of the sender. */
  from: string;
  name: string;
  text: string;
}
