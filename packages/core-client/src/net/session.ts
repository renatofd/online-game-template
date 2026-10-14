import { ColyseusSDK, type Room } from "@colyseus/sdk";
import { CORE_PROTOCOL_VERSION, CoreErrorCode, type CoreJoinOptions } from "@core/shared";
import type { SchemaClass } from "../GameModule";
import { withTimeout } from "../withTimeout";

/**
 * Game server URL:
 *  - VITE_SERVER_URL when set (production builds point it at the real server);
 *  - in development, the page's own origin + "/__server", which the Vite dev
 *    server proxies to the game server (works on LAN phones and in Codespaces);
 *  - otherwise the page's host on port 2567.
 */
export function serverUrl(): string {
  const fromEnv = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return `${location.origin}/__server`;
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${location.hostname}:2567`;
}

/** Why a join failed, in terms the UI can explain to the player. */
export type JoinFailure = "version-mismatch" | "auth-failed" | "unreachable";

export class JoinError extends Error {
  constructor(
    readonly reason: JoinFailure,
    override readonly cause?: unknown,
  ) {
    super(`join failed: ${reason}`);
  }
}

export interface JoinRequest<State> {
  roomName: string;
  gameProtocolVersion: number;
  /** Schema class of the room state (decoded with types instead of reflection). */
  rootSchema?: SchemaClass<State>;
  options: Omit<CoreJoinOptions, "v"> & Record<string, unknown>;
}

/** How long the matchmaking request + room connection may take. */
const JOIN_TIMEOUT_MS = 15_000;
/** How long to wait for the first full state after joining. */
const FIRST_STATE_TIMEOUT_MS = 10_000;

/**
 * Joins (or creates) a room, attaching protocol versions and normalizing errors.
 * Resolves only after the first full state arrived, so games can read
 * `room.state` from their very first frame.
 */
export async function joinRoom<State>(request: JoinRequest<State>): Promise<Room<unknown, State>> {
  const client = new ColyseusSDK(serverUrl());
  const options = { ...request.options, v: { core: CORE_PROTOCOL_VERSION, game: request.gameProtocolVersion } };
  // biome-ignore lint/suspicious/noExplicitAny: SDK overloads don't accept a generic schema constructor.
  const joining = client.joinOrCreate<State>(request.roomName, options, request.rootSchema as any);
  let room: Room<unknown, State>;
  try {
    room = await withTimeout(joining, JOIN_TIMEOUT_MS, "join timed out");
  } catch (err) {
    // A join that completes after we gave up would hold a seat nobody plays.
    joining.then(
      (late) => late.leave().catch(() => {}),
      () => {},
    );
    const code = (err as { code?: number }).code;
    if (code === CoreErrorCode.VERSION_MISMATCH) throw new JoinError("version-mismatch", err);
    if (code === CoreErrorCode.AUTH_FAILED) throw new JoinError("auth-failed", err);
    throw new JoinError("unreachable", err);
  }

  // Wait for the first state; give up early if the room closes or errors meanwhile.
  const gotState = await new Promise<boolean>((resolve) => {
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      room.onStateChange.remove(onState);
      room.onLeave.remove(onFail);
      room.onError.remove(onFail);
      resolve(ok);
    };
    const onState = () => finish(true);
    const onFail = () => finish(false);
    const timer = setTimeout(onFail, FIRST_STATE_TIMEOUT_MS);
    room.onStateChange(onState);
    room.onLeave(onFail);
    room.onError(onFail);
  });
  if (!gotState) {
    room.leave().catch(() => {});
    throw new JoinError("unreachable");
  }
  return room;
}
