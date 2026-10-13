import { CoreErrorCode, type CoreJoinOptions, isCompatibleVersion, sanitizeName } from "@core/shared";
import { type AuthContext, type Client, type CloseCode, Room, type RoomOptions, ServerError } from "colyseus";

/** Who a connected client is. Returned by `authenticate()` and available via `identity(client)`. */
export interface PlayerIdentity {
  /** Stable player id (guest: the session id; with an account provider: the account id). */
  id: string;
  /** Sanitized display name. */
  name: string;
  /** Where the identity came from, e.g. "guest" or "gamepush". */
  provider: string;
}

/**
 * Base class for every game room. Handles what all rooms need so games don't:
 *
 *  - rejects clients whose protocol version differs from the server (they get
 *    CoreErrorCode.VERSION_MISMATCH and the client UI asks them to reload)
 *  - authentication hook (`authenticate`), guest identity by default
 *  - holds a dropped player's seat for `reconnectGraceSeconds`
 *  - disconnects clients that flood messages (`maxMessagesPerSecond`)
 *
 * Subclasses implement the game: state, inputs, onCreate/onJoin/onLeave and the simulation.
 * If you override onAuth or onDrop, call `super`.
 */
export abstract class GameRoom<T extends RoomOptions = RoomOptions> extends Room<T> {
  /** The game's PROTOCOL_VERSION. Clients built with another version are rejected. */
  protected abstract readonly protocolVersion: number;

  /** Seconds a dropped player's seat is held so they can reconnect. 0 disables. */
  protected reconnectGraceSeconds = 20;

  /** Inputs at the tick rate + occasional messages, with headroom for bursts after a stall. */
  override maxMessagesPerSecond = 120;

  override async onAuth(client: Client, options: CoreJoinOptions, context: AuthContext): Promise<PlayerIdentity> {
    if (!isCompatibleVersion(options?.v, this.protocolVersion)) {
      throw new ServerError(CoreErrorCode.VERSION_MISMATCH, "Client version is incompatible with the server. Reload.");
    }
    return this.authenticate(client, options, context);
  }

  /**
   * Resolves the player's identity. Override to plug an account provider
   * (e.g. verify a GamePush player server-side). Throw a ServerError with
   * CoreErrorCode.AUTH_FAILED to reject.
   */
  protected async authenticate(
    client: Client,
    options: CoreJoinOptions,
    _context: AuthContext,
  ): Promise<PlayerIdentity> {
    return { id: client.sessionId, name: sanitizeName(options?.name), provider: "guest" };
  }

  /** Identity resolved during onAuth for this client. */
  protected identity(client: Client): PlayerIdentity {
    return client.auth as PlayerIdentity;
  }

  override onDrop(client: Client, _code?: CloseCode) {
    if (this.reconnectGraceSeconds <= 0) return;
    // Not awaited: the framework routes the outcome to onReconnect() or onLeave().
    // The catch only silences the rejection when the room is already disposing.
    this.allowReconnection(client, this.reconnectGraceSeconds).catch(() => {});
  }
}
