import { ColyseusSDK, type Room } from "@colyseus/sdk";
import { type ArenaJoinOptions, ArenaState, ROOM_ARENA } from "@game/protocol";

/** Game server URL: VITE_SERVER_URL, or the page's host on port 2567 (local dev / LAN testing). */
export function serverUrl(): string {
  const fromEnv = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (fromEnv) return fromEnv;
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${location.hostname}:2567`;
}

export type ArenaRoom = Room<unknown, ArenaState>;

export async function joinArena(options: ArenaJoinOptions): Promise<ArenaRoom> {
  const client = new ColyseusSDK(serverUrl());
  return client.joinOrCreate<ArenaState>(ROOM_ARENA, options, ArenaState);
}
