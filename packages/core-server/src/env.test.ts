import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("has safe development defaults", () => {
    const env = parseEnv({});
    expect(env.isProduction).toBe(false);
    expect(env.allowedOrigins).toEqual([]);
    expect(env.gamepush).toBeUndefined();
    expect(env.logLevel).toBe("debug");
  });

  it("parses production settings", () => {
    const env = parseEnv({
      NODE_ENV: "production",
      ALLOWED_ORIGINS: "https://a.game/, https://b.game",
      REDIS_URL: "redis://redis:6379",
      GAMEPUSH_PROJECT_ID: "31385",
      GAMEPUSH_API_SECRET: "secret",
    });
    expect(env.allowedOrigins).toEqual(["https://a.game", "https://b.game"]);
    expect(env.redisUrl).toBe("redis://redis:6379");
    expect(env.gamepush).toEqual({ projectId: "31385", apiSecret: "secret" });
    expect(env.logLevel).toBe("info");
  });

  it("fills the process port into PUBLIC_ADDRESS", () => {
    expect(parseEnv({ PUBLIC_ADDRESS: "my.game/{port}", NODE_APP_INSTANCE: "2" }).publicAddress).toBe("my.game/2569");
    expect(() => parseEnv({ PUBLIC_ADDRESS: "wss://my.game" })).toThrow(/PUBLIC_ADDRESS/);
  });

  it("reports every problem at once", () => {
    expect(() =>
      parseEnv({ ALLOWED_ORIGINS: "not-a-url", REDIS_URL: "localhost", GAMEPUSH_PROJECT_ID: "1", LOG_LEVEL: "loud" }),
    ).toThrow(/ALLOWED_ORIGINS[\s\S]*REDIS_URL[\s\S]*GAMEPUSH[\s\S]*/);
  });
});
