/** Room type names registered on the server and joined by the client. */
export const ROOM_ARENA = "arena";

/** Options a client sends when joining an arena. Validate everything server-side. */
export interface ArenaJoinOptions {
  name?: string;
}
