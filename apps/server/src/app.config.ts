/**
 * Server composition: the template core's standard server + this game's rooms.
 * Usually no need to edit this file; add rooms in game/server instead.
 */
import { createGameServer } from "@core/server";
import { rooms } from "@game/server";
import { PROTOCOL_VERSION } from "@game/shared";

export default createGameServer({ rooms, protocolVersion: PROTOCOL_VERSION });
