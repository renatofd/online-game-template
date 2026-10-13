import { ROOM_ARENA } from "@game/shared";
import { defineRoom } from "colyseus";
import { ArenaRoom } from "./rooms/ArenaRoom";

export { ArenaRoom } from "./rooms/ArenaRoom";

/** Every room this game exposes. apps/server registers exactly these. */
export const rooms = {
  [ROOM_ARENA]: defineRoom(ArenaRoom),
};
