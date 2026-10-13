import type { PlatformAuthPayload } from "@core/shared";
import type { AccountProvider, VerifiedAccount } from "./AccountProvider";

export const GAMEPUSH_API_URL = "https://api.gamepush.com/gs/api/graphql";

/** Upper bound for the auth payload, to reject garbage before calling the API. */
const MAX_PAYLOAD_LENGTH = 8192;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const REQUEST_TIMEOUT_MS = 5000;

const GET_PLAYER = `query ($input: GetPlayerInput!) {
  result: GetPlayer(input: $input) {
    __typename
    ... on Player { id state }
    ... on Problem { message }
  }
}`;

export interface GamePushApiOptions {
  projectId: string;
  /** Server API key from the GamePush panel. Server-side only: never ship it to clients. */
  apiSecret: string;
  /** Injectable for tests. */
  fetch?: typeof fetch;
}

/** Whose data a Server API call acts on. */
export type GamePushPlayerRef =
  | { playerId: string | number }
  | { playerData: string; platform?: string; platformKey?: string };

/**
 * Minimal client for the GamePush Server API (GraphQL).
 * Methods and types: https://docs.gamepush.com/docs/api/ (full schema via introspection).
 */
export class GamePushServerApi {
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: GamePushApiOptions) {
    this.fetchFn = options.fetch ?? fetch;
  }

  /** Runs a GraphQL operation and returns `data.result`, throwing on `Problem` or HTTP errors. */
  async request<T = Record<string, unknown>>(
    query: string,
    variables: Record<string, unknown>,
    player?: GamePushPlayerRef,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Secret": this.options.apiSecret,
      "X-Project-ID": this.options.projectId,
    };
    if (player && "playerId" in player) headers["X-Player-ID"] = String(player.playerId);
    if (player && "playerData" in player) {
      headers["X-Player-Data"] = player.playerData;
      if (player.platform) headers["X-Platform"] = player.platform;
      if (player.platformKey) headers["X-Platform-Key"] = player.platformKey;
    }

    const res = await this.fetchFn(GAMEPUSH_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`GamePush API HTTP ${res.status}`);
    const body = (await res.json()) as {
      data?: { result?: { __typename?: string; message?: string } };
      errors?: unknown;
    };
    const result = body.data?.result;
    if (!result) throw new Error(`GamePush API returned no result: ${JSON.stringify(body.errors ?? body)}`);
    if (result.__typename === "Problem") throw new Error(`GamePush API problem: ${result.message}`);
    return result as T;
  }

  /** Fetches the player identified by `player` (id + state fields). */
  getPlayer(player: GamePushPlayerRef) {
    return this.request<{ id: number | string; state?: Record<string, unknown> }>(GET_PLAYER, { input: {} }, player);
  }
}

/**
 * Verifies GamePush players server-side: the client sends `gp.player._authInfo`
 * (base64), and GamePush itself confirms which player it belongs to.
 */
export class GamePushAccountProvider implements AccountProvider {
  readonly id = "gamepush";
  readonly api: GamePushServerApi;

  constructor(options: GamePushApiOptions) {
    this.api = new GamePushServerApi(options);
  }

  async verify(payload: PlatformAuthPayload): Promise<VerifiedAccount> {
    const data = payload.data;
    if (typeof data !== "string" || data.length === 0 || data.length > MAX_PAYLOAD_LENGTH || !BASE64.test(data)) {
      throw new Error("malformed GamePush auth payload");
    }
    const player = await this.api.getPlayer({
      playerData: data,
      platform: typeof payload.platform === "string" ? payload.platform : undefined,
      platformKey: typeof payload.platformKey === "string" ? payload.platformKey : undefined,
    });
    if (player.id === undefined || player.id === null) throw new Error("GamePush returned a player without id");
    const name = typeof player.state?.name === "string" ? player.state.name : undefined;
    return { id: String(player.id), name };
  }
}
