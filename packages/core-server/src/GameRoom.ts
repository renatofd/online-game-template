import {
  type AuthContext,
  type Client,
  type CloseCode,
  Room,
  type RoomOptions,
  ServerError,
  type StepContext,
} from "@colyseus/core";
import { CoreErrorCode, type CoreJoinOptions, isCompatibleVersion, sanitizeName } from "@core/shared";
import { getAccountProvider } from "./accounts/AccountProvider";
import { log } from "./log";
import { metrics } from "./metrics";

/** Who a connected client is. Returned by `authenticate()` and available via `identity(client)`. */
export interface PlayerIdentity {
  /** Stable player id: "<provider>:<account id>" for verified accounts, the session id for guests. */
  id: string;
  /** Sanitized display name. */
  name: string;
  /** Where the identity came from, e.g. "guest" or "gamepush". */
  provider: string;
  /** True when an account provider verified the identity. */
  verified: boolean;
}

/**
 * Base class for every game room. Handles what all rooms need so games don't:
 *
 *  - rejects clients whose protocol version differs from the server (they get
 *    CoreErrorCode.VERSION_MISMATCH and the client UI asks them to reload)
 *  - verifies platform accounts (e.g. GamePush) when a provider is registered,
 *    otherwise lets players in as guests (`allowGuests`)
 *  - holds a dropped player's seat for `reconnectGraceSeconds`
 *  - disconnects clients that flood messages (`maxMessagesPerSecond`)
 *  - measures tick duration for /metrics (`startSimulation`)
 *
 * Subclasses implement the game: state, inputs, onCreate/onJoin/onLeave and the simulation.
 * If you override onAuth or onDrop, call `super`.
 */
export abstract class GameRoom<T extends RoomOptions = RoomOptions> extends Room<T> {
  /** The game's PROTOCOL_VERSION. Clients built with another version are rejected. */
  protected abstract readonly protocolVersion: number;

  /** Seconds a dropped player's seat is held so they can reconnect. 0 disables. */
  protected reconnectGraceSeconds = 20;

  /** When false, players without a verified account are rejected. */
  protected allowGuests = true;

  /** Inputs at the tick rate + occasional messages, with headroom for bursts after a stall. */
  override maxMessagesPerSecond = 120;

  override async onAuth(client: Client, options: CoreJoinOptions, context: AuthContext): Promise<PlayerIdentity> {
    if (!isCompatibleVersion(options?.v, this.protocolVersion)) {
      throw new ServerError(CoreErrorCode.VERSION_MISMATCH, "Client version is incompatible with the server. Reload.");
    }
    return this.authenticate(client, options, context);
  }

  /**
   * Resolves the player's identity. With `options.auth` and a registered
   * provider, the account is verified (failure rejects the join); otherwise
   * the player is a guest. Override for custom rules.
   */
  protected async authenticate(
    client: Client,
    options: CoreJoinOptions,
    _context: AuthContext,
  ): Promise<PlayerIdentity> {
    const auth = options?.auth;
    const provider = typeof auth?.provider === "string" ? getAccountProvider(auth.provider) : undefined;
    if (auth && provider) {
      try {
        const account = await provider.verify(auth);
        return {
          id: `${provider.id}:${account.id}`,
          name: sanitizeName(options.name ?? account.name),
          provider: provider.id,
          verified: true,
        };
      } catch (err) {
        metrics.inc("auth_failures_total");
        log.warn("account verification failed", { provider: provider.id, room: this.roomName, error: String(err) });
        throw new ServerError(CoreErrorCode.AUTH_FAILED, "Could not verify the player account.");
      }
    }
    if (!this.allowGuests) throw new ServerError(CoreErrorCode.AUTH_FAILED, "An account is required.");
    return { id: client.sessionId, name: sanitizeName(options?.name), provider: "guest", verified: false };
  }

  /** Identity resolved during onAuth for this client. */
  protected identity(client: Client): PlayerIdentity {
    return client.auth as PlayerIdentity;
  }

  /**
   * Runs `step` on a fixed timestep (Colyseus `setFixedTimestep`) and records
   * each tick's duration in /metrics. Use this instead of calling setFixedTimestep directly.
   */
  protected startSimulation(step: (ctx: StepContext) => void, tickRate: number) {
    this.setFixedTimestep((ctx) => {
      const start = performance.now();
      step(ctx);
      metrics.observeTick(this.roomName, performance.now() - start);
    }, tickRate);
  }

  override onDrop(client: Client, _code?: CloseCode) {
    if (this.reconnectGraceSeconds <= 0) return;
    // Not awaited: the framework routes the outcome to onReconnect() or onLeave().
    // The catch only silences the rejection when the room is already disposing.
    this.allowReconnection(client, this.reconnectGraceSeconds).catch(() => {});
  }
}
