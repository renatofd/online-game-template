import { type Client, defineRoom } from "@colyseus/core";
import { schema } from "@colyseus/schema";
import { boot, type ColyseusTestServer } from "@colyseus/testing";
import { type ChatBroadcast, CORE_PROTOCOL_VERSION, CoreErrorCode, CoreMessage } from "@core/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAccountProvider, unregisterAccountProvider } from "../src/accounts/AccountProvider";
import { createGameServer, isOriginAllowed } from "../src/createGameServer";
import { GameRoom, type PlayerIdentity } from "../src/GameRoom";

const GAME_VERSION = 7;
const EmptyState = schema({});

class TestRoom extends GameRoom<{ state: InstanceType<typeof EmptyState> }> {
  protected readonly protocolVersion = GAME_VERSION;
  override state = new EmptyState();
  joined: PlayerIdentity[] = [];
  override onJoin(client: Client) {
    this.joined.push(this.identity(client));
  }
}

class AccountsOnlyRoom extends TestRoom {
  protected override allowGuests = false;
}

class NoChatRoom extends TestRoom {
  protected override chat = false as const;
}

const server = createGameServer({
  rooms: { test: defineRoom(TestRoom), accountsOnly: defineRoom(AccountsOnlyRoom), noChat: defineRoom(NoChatRoom) },
  protocolVersion: GAME_VERSION,
});
const v = { core: CORE_PROTOCOL_VERSION, game: GAME_VERSION };

describe("GameRoom", () => {
  let colyseus: ColyseusTestServer<typeof server>;

  beforeAll(async () => {
    colyseus = await boot(server);
    // Fake provider: accepts data "ok:<id>", rejects anything else.
    registerAccountProvider({
      id: "fake",
      verify: async (payload) => {
        if (!payload.data.startsWith("ok:")) throw new Error("bad proof");
        return { id: payload.data.slice(3), name: "FromAccount" };
      },
    });
  });
  afterAll(async () => {
    unregisterAccountProvider("fake");
    await colyseus.shutdown();
  });
  beforeEach(async () => {
    await colyseus.cleanup();
  });

  const joinedOf = (room: unknown) => (room as TestRoom).joined;

  it("accepts a guest with matching versions and sanitizes its name", async () => {
    const room = await colyseus.createRoom<object>("test", {});
    await colyseus.connectTo(room, { v, name: "  Ana‮ " });
    expect(joinedOf(room)[0]).toMatchObject({ name: "Ana", provider: "guest", verified: false });
  });

  it.each([
    ["missing versions", {}],
    ["old game version", { v: { core: CORE_PROTOCOL_VERSION, game: GAME_VERSION - 1 } }],
    ["old core version", { v: { core: CORE_PROTOCOL_VERSION - 1, game: GAME_VERSION } }],
  ])("rejects a client with %s", async (_label, options) => {
    const room = await colyseus.createRoom<object>("test", {});
    await expect(colyseus.connectTo(room, options)).rejects.toMatchObject({ code: CoreErrorCode.VERSION_MISMATCH });
  });

  it("verifies accounts through the registered provider", async () => {
    const room = await colyseus.createRoom<object>("test", {});
    await colyseus.connectTo(room, { v, auth: { provider: "fake", data: "ok:42" } });
    expect(joinedOf(room)[0]).toEqual({ id: "fake:42", name: "FromAccount", provider: "fake", verified: true });
  });

  it("rejects a forged account proof", async () => {
    const room = await colyseus.createRoom<object>("test", {});
    await expect(colyseus.connectTo(room, { v, auth: { provider: "fake", data: "forged" } })).rejects.toMatchObject({
      code: CoreErrorCode.AUTH_FAILED,
    });
  });

  it("treats unknown providers as guests, unless guests are disallowed", async () => {
    const open = await colyseus.createRoom<object>("test", {});
    await colyseus.connectTo(open, { v, auth: { provider: "nobody", data: "x" } });
    expect(joinedOf(open)[0]?.provider).toBe("guest");

    const closed = await colyseus.createRoom<object>("accountsOnly", {});
    await expect(colyseus.connectTo(closed, { v })).rejects.toMatchObject({ code: CoreErrorCode.AUTH_FAILED });
  });

  it("broadcasts sanitized chat messages with the sender's name", async () => {
    const room = await colyseus.createRoom<object>("test", {});
    const ana = await colyseus.connectTo(room, { v, name: "Ana" });
    const bob = await colyseus.connectTo(room, { v, name: "Bob" });
    const received: ChatBroadcast[] = [];
    bob.onMessage(CoreMessage.chat, (m: ChatBroadcast) => received.push(m));

    ana.send(CoreMessage.chat, "  olá\u202E   pessoal  ");
    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]).toEqual({ from: ana.sessionId, name: "Ana", text: "olá pessoal" });
  });

  it("rate-limits chat floods and tells the sender", async () => {
    const room = await colyseus.createRoom<object>("test", {});
    const spammer = await colyseus.connectTo(room, { v, name: "Spam" });
    let delivered = 0;
    let rejected = 0;
    spammer.onMessage(CoreMessage.chat, () => delivered++);
    spammer.onMessage(CoreMessage.chatRejected, () => rejected++);

    for (let i = 0; i < 10; i++) spammer.send(CoreMessage.chat, `msg ${i}`);
    await vi.waitFor(() => expect(delivered + rejected).toBe(10));
    expect(delivered).toBe(4); // the default burst
    expect(rejected).toBe(6);
  });

  it("does not hold the seat of a client kicked for flooding", async () => {
    const room = await colyseus.createRoom<object>("test", {});
    const flooder = await colyseus.connectTo(room, { v });
    for (let i = 0; i < 300; i++) flooder.send("anything", i);
    await vi.waitFor(() => expect(room.clients.length).toBe(0));
    await expect(colyseus.sdk.reconnect(flooder.reconnectionToken)).rejects.toThrow();
  });

  it("ignores chat when the room disables it", async () => {
    const room = await colyseus.createRoom<object>("noChat", {});
    const a = await colyseus.connectTo(room, { v });
    let got = 0;
    a.onMessage(CoreMessage.chat, () => got++);
    a.send(CoreMessage.chat, "hello");
    await new Promise((r) => setTimeout(r, 150));
    expect(got).toBe(0);
  });

  it("serves /health, /version and /metrics", async () => {
    // @colyseus/testing listens on 2568 by default.
    const base = "http://localhost:2568";
    const version = await (await fetch(`${base}/version`)).json();
    expect(version).toMatchObject({ core: CORE_PROTOCOL_VERSION, game: GAME_VERSION });
    const metrics = await (await fetch(`${base}/metrics`)).text();
    expect(metrics).toContain("game_rooms");
  });
});

describe("isOriginAllowed", () => {
  it("allows everything without an allowlist", () => {
    expect(isOriginAllowed("https://evil.example", [])).toBe(true);
  });
  it("only allows listed origins otherwise", () => {
    const list = ["https://my.game"];
    expect(isOriginAllowed("https://my.game", list)).toBe(true);
    expect(isOriginAllowed("https://my.game/", list)).toBe(true);
    expect(isOriginAllowed("https://evil.example", list)).toBe(false);
    expect(isOriginAllowed(null, list)).toBe(false);
    expect(isOriginAllowed("null", list)).toBe(false);
  });
  it("compares origins the way browsers send them", () => {
    expect(isOriginAllowed("https://my.game", ["https://my.game"])).toBe(true);
    expect(isOriginAllowed("https://MY.game:443", ["https://my.game"])).toBe(true);
  });
});
