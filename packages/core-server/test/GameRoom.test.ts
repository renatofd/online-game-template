import { schema } from "@colyseus/schema";
import { boot, type ColyseusTestServer } from "@colyseus/testing";
import { CORE_PROTOCOL_VERSION, CoreErrorCode } from "@core/shared";
import { type Client, defineRoom } from "colyseus";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createGameServer } from "../src/createGameServer";
import { GameRoom } from "../src/GameRoom";

const GAME_VERSION = 7;
const EmptyState = schema({});

class TestRoom extends GameRoom<{ state: InstanceType<typeof EmptyState> }> {
  protected readonly protocolVersion = GAME_VERSION;
  override state = new EmptyState();
  joinedName = "";
  override onJoin(client: Client) {
    this.joinedName = this.identity(client).name;
  }
}

const server = createGameServer({ rooms: { test: defineRoom(TestRoom) }, protocolVersion: GAME_VERSION });
const goodVersion = { core: CORE_PROTOCOL_VERSION, game: GAME_VERSION };

describe("GameRoom", () => {
  let colyseus: ColyseusTestServer<typeof server>;

  beforeAll(async () => {
    colyseus = await boot(server);
  });
  afterAll(async () => {
    await colyseus.shutdown();
  });
  beforeEach(async () => {
    await colyseus.cleanup();
  });

  it("accepts a client with matching versions and sanitizes its name", async () => {
    const room = await colyseus.createRoom<object>("test", {});
    await colyseus.connectTo(room, { v: goodVersion, name: "  Ana‮ " });
    expect((room as unknown as TestRoom).joinedName).toBe("Ana");
  });

  it.each([
    ["missing versions", {}],
    ["old game version", { v: { core: CORE_PROTOCOL_VERSION, game: GAME_VERSION - 1 } }],
    ["old core version", { v: { core: CORE_PROTOCOL_VERSION - 1, game: GAME_VERSION } }],
  ])("rejects a client with %s", async (_label, options) => {
    const room = await colyseus.createRoom<object>("test", {});
    await expect(colyseus.connectTo(room, options)).rejects.toMatchObject({ code: CoreErrorCode.VERSION_MISMATCH });
  });
});
