import {
  type AuthContext,
  type Client,
  type CloseCode,
  Room,
  type RoomOptions,
  ServerError,
  type StepContext,
} from "@colyseus/core";
import {
  type ChatBroadcast,
  CoreErrorCode,
  type CoreJoinOptions,
  CoreMessage,
  DEFAULT_MAX_CHAT_LENGTH,
  isCompatibleVersion,
  sanitizeChat,
  sanitizeName,
} from "@core/shared";
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

/** Chat settings for a room. */
export interface ChatOptions {
  /** Max message length in user-perceived characters. */
  maxLength: number;
  /** Sustained messages per second per player. */
  perSecond: number;
  /** Messages a player may send in a quick burst before the rate applies. */
  burst: number;
}

const DEFAULT_CHAT: ChatOptions = { maxLength: DEFAULT_MAX_CHAT_LENGTH, perSecond: 0.5, burst: 4 };

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
 *  - room chat with sanitizing and per-player rate limit (`chat`, `filterChat`)
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

  /** Room chat settings, or false to disable chat in this room. */
  protected chat: ChatOptions | false = { ...DEFAULT_CHAT };

  /** Token bucket per client for chat rate limiting (weak: gone when the client is). */
  private chatBuckets = new WeakMap<Client, { tokens: number; at: number }>();

  constructor() {
    super();
    this.onMessage(CoreMessage.chat, (client: Client, text: unknown) => this.handleChat(client, text));
  }

  /**
   * Last chance to change or drop a chat message (profanity filter, commands...).
   * Return the text to broadcast, or null to drop it. Default: unchanged.
   */
  protected filterChat(text: string, _client: Client): string | null {
    return text;
  }

  private handleChat(client: Client, raw: unknown) {
    const options = this.chat;
    if (!options || typeof raw !== "string") return;

    // Rate limit before any text processing, so a flood costs the server nothing.
    const now = Date.now();
    const bucket = this.chatBuckets.get(client) ?? { tokens: options.burst, at: now };
    bucket.tokens = Math.min(options.burst, bucket.tokens + ((now - bucket.at) / 1000) * options.perSecond);
    bucket.at = now;
    this.chatBuckets.set(client, bucket);
    if (bucket.tokens < 1) {
      metrics.inc("chat_rate_limited_total");
      client.send(CoreMessage.chatRejected, { reason: "rate" });
      return;
    }
    bucket.tokens -= 1;

    const text = sanitizeChat(raw, options.maxLength);
    if (!text) return;
    const filtered = this.filterChat(text, client);
    if (!filtered) return;
    const message: ChatBroadcast = { from: client.sessionId, name: this.identity(client).name, text: filtered };
    this.broadcast(CoreMessage.chat, message);
  }

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
    // Clients kicked for flooding (maxMessagesPerSecond) must not get their seat back.
    // Colyseus closes them like any other error, so check its per-client counter.
    const sent = (client as Client & { _numMessagesLastSecond?: number })._numMessagesLastSecond ?? 0;
    if (sent > this.maxMessagesPerSecond) {
      metrics.inc("flood_kicks_total");
      log.warn("client kicked for flooding", { room: this.roomName, sessionId: client.sessionId });
      return;
    }
    // Not awaited: the framework routes the outcome to onReconnect() or onLeave().
    // The rejection (grace timeout, room disposing) needs no handling here.
    this.allowReconnection(client, this.reconnectGraceSeconds).catch(() => {});
  }
}
