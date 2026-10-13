import { boot, type ColyseusTestServer } from "@colyseus/testing";
import { createGameServer } from "@core/server";
import { CORE_PROTOCOL_VERSION } from "@core/shared";
import { type ArenaState, type MoveInput, PLAYER_SPEED, PROTOCOL_VERSION, ROOM_ARENA, TICK_DT } from "@game/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { rooms } from "../src";

const appConfig = createGameServer({ rooms, protocolVersion: PROTOCOL_VERSION });
const v = { core: CORE_PROTOCOL_VERSION, game: PROTOCOL_VERSION };

describe("ArenaRoom", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  beforeAll(async () => {
    colyseus = await boot(appConfig);
  });
  afterAll(async () => {
    await colyseus.shutdown();
  });
  beforeEach(async () => {
    await colyseus.cleanup();
  });

  it("spawns a player at a map spawn point with a sanitized name", async () => {
    const room = await colyseus.createRoom<ArenaState>(ROOM_ARENA, {});
    const client = await colyseus.connectTo(room, { v, name: "  Ana\u0007  " });

    const player = room.state.players.get(client.sessionId);
    expect(player).toBeDefined();
    expect(player?.name).toBe("Ana");
    expect(room.state.mapId).toBe("arena");
  });

  it("advances a player one fixed step per input", async () => {
    const room = await colyseus.createRoom<ArenaState>(ROOM_ARENA, {});
    const client = await colyseus.connectTo(room, { v });
    const player = room.state.players.get(client.sessionId);
    if (!player) throw new Error("player not created");
    const startX = player.x;

    const input = client.input<MoveInput>({ mode: "reliable" });
    input.data.moveX = 1;
    input.data.moveY = 0;
    input.send();

    await room.waitForNextMessage();
    await room.waitForNextTimestep();

    expect(player.x).toBeCloseTo(startX + PLAYER_SPEED * TICK_DT);
  });

  it("clamps out-of-range input from a modified client", async () => {
    const room = await colyseus.createRoom<ArenaState>(ROOM_ARENA, {});
    const client = await colyseus.connectTo(room, { v });
    const player = room.state.players.get(client.sessionId);
    if (!player) throw new Error("player not created");
    const startX = player.x;

    const input = client.input<MoveInput>({ mode: "reliable" });
    input.data.moveX = 100 as unknown as 1;
    input.send();

    await room.waitForNextMessage();
    await room.waitForNextTimestep();

    expect(player.x).toBeCloseTo(startX + PLAYER_SPEED * TICK_DT);
  });

  it("only sends players inside the area of interest", async () => {
    const room = await colyseus.createRoom<ArenaState>(ROOM_ARENA, {});
    // The first two spawns of the arena map are ~590 px apart: beyond INTEREST_RADIUS.
    const a = await colyseus.connectTo(room, { v, name: "A" });
    const b = await colyseus.connectTo(room, { v, name: "B" });
    await room.waitForNextPatch();
    await vi.waitFor(() => expect(a.state.players.has(a.sessionId)).toBe(true));
    expect(a.state.players.has(b.sessionId)).toBe(false);
    expect(b.state.players.has(a.sessionId)).toBe(false);

    // Move B next to A (server-side teleport, as a game rule would).
    const pa = room.state.players.get(a.sessionId);
    const pb = room.state.players.get(b.sessionId);
    if (!pa || !pb) throw new Error("players missing");
    pb.x = pa.x + 32;
    pb.y = pa.y;
    await vi.waitFor(() => expect(a.state.players.has(b.sessionId)).toBe(true), { timeout: 2000 });
    expect(b.state.players.get(a.sessionId)?.name).toBe("A");
  });

  it("removes the player on leave", async () => {
    const room = await colyseus.createRoom<ArenaState>(ROOM_ARENA, {});
    await colyseus.connectTo(room, { v });
    const leaving = await colyseus.connectTo(room, { v });
    expect(room.state.players.size).toBe(2);

    await leaving.leave();
    await vi.waitFor(() => expect(room.state.players.has(leaving.sessionId)).toBe(false));
    expect(room.state.players.size).toBe(1);
  });
});
