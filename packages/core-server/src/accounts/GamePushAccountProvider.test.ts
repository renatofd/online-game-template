import { describe, expect, it, vi } from "vitest";
import { GAMEPUSH_API_URL, GamePushAccountProvider } from "./GamePushAccountProvider";

function fakeFetch(result: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify({ data: { result } }), { status }));
}

const payload = {
  provider: "gamepush",
  data: btoa(JSON.stringify({ secretCode: "abc" })),
  platform: "YANDEX",
  platformKey: "",
};

describe("GamePushAccountProvider", () => {
  it("verifies the player through the Server API", async () => {
    const fetch = fakeFetch({ __typename: "Player", id: 42, state: { name: "Ana" } });
    const provider = new GamePushAccountProvider({ projectId: "31385", apiSecret: "s3cret", fetch });

    await expect(provider.verify(payload)).resolves.toEqual({ id: "42", name: "Ana" });

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(GAMEPUSH_API_URL);
    const headers = init.headers as Record<string, string>;
    expect(headers["X-API-Secret"]).toBe("s3cret");
    expect(headers["X-Project-ID"]).toBe("31385");
    expect(headers["X-Player-Data"]).toBe(payload.data);
    expect(headers["X-Platform"]).toBe("YANDEX");
    expect(JSON.parse(String(init.body)).query).toContain("GetPlayer");
  });

  it("rejects when GamePush reports a Problem", async () => {
    const provider = new GamePushAccountProvider({
      projectId: "1",
      apiSecret: "s",
      fetch: fakeFetch({ __typename: "Problem", message: "invalid signature" }),
    });
    await expect(provider.verify(payload)).rejects.toThrow("invalid signature");
  });

  it("rejects HTTP errors", async () => {
    const provider = new GamePushAccountProvider({ projectId: "1", apiSecret: "s", fetch: fakeFetch(null, 500) });
    await expect(provider.verify(payload)).rejects.toThrow("HTTP 500");
  });

  it("rejects malformed payloads without calling the API", async () => {
    const fetch = fakeFetch({});
    const provider = new GamePushAccountProvider({ projectId: "1", apiSecret: "s", fetch });
    await expect(provider.verify({ provider: "gamepush", data: "not base64!" })).rejects.toThrow("malformed");
    await expect(provider.verify({ provider: "gamepush", data: "A".repeat(9000) })).rejects.toThrow("malformed");
    expect(fetch).not.toHaveBeenCalled();
  });
});
