/**
 * Wire conventions owned by the template core (not by any specific game).
 *
 * Bump CORE_PROTOCOL_VERSION whenever the core changes what goes over the wire
 * (join options, error codes, core messages). Games bump their own
 * `PROTOCOL_VERSION` when their schemas or messages change.
 */
export const CORE_PROTOCOL_VERSION = 1;

/** Protocol versions a client must send when joining. Both must match the server. */
export interface ProtocolVersions {
  core: number;
  game: number;
}

/** Join options every core room understands. Games extend this with their own fields. */
export interface CoreJoinOptions {
  /** Protocol versions of the client build. */
  v: ProtocolVersions;
  /** Requested display name (sanitized server-side). */
  name?: string;
  /** Client UI locale, e.g. "pt" (informational; servers may use it for chat filters, etc.). */
  locale?: string;
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
