import { timingSafeEqual } from "node:crypto";
import { defineServer, matchMaker, type RegisteredHandler } from "@colyseus/core";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import { RedisDriver } from "@colyseus/redis-driver";
import { RedisPresence } from "@colyseus/redis-presence";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { CORE_PROTOCOL_VERSION } from "@core/shared";
import type { Application, RequestHandler } from "express";
import { registerAccountProvider } from "./accounts/AccountProvider";
import { GamePushAccountProvider } from "./accounts/GamePushAccountProvider";
import { env, normalizeOrigin, type ServerEnv } from "./env";
import { log } from "./log";
import { metrics } from "./metrics";

export interface GameServerOptions<T extends Record<string, RegisteredHandler>> {
  /** Room handlers, e.g. `{ arena: defineRoom(ArenaRoom) }`. */
  rooms: T;
  /** The game's PROTOCOL_VERSION, reported by GET /version. */
  protocolVersion: number;
  /** Extra HTTP routes. */
  express?: (app: Application) => void;
  /** Override the environment (tests). */
  env?: ServerEnv;
}

/**
 * Colyseus server definition with the template's production setup:
 *
 *  - GET /health, GET /version, GET /metrics (Prometheus text)
 *  - /monitor in development, or in production when MONITOR_PASSWORD is set (basic auth, user "admin")
 *  - /playground in development only
 *  - ALLOWED_ORIGINS: only pages from these origins may connect (WebSocket + matchmaking CORS)
 *  - MAX_PAYLOAD_BYTES: larger WebSocket messages are rejected
 *  - REDIS_URL + PUBLIC_ADDRESS: share rooms and presence across processes/machines (horizontal scaling)
 *  - GAMEPUSH_PROJECT_ID + GAMEPUSH_API_SECRET: verify GamePush players on join
 */
export function createGameServer<T extends Record<string, RegisteredHandler>>(options: GameServerOptions<T>) {
  const config = options.env ?? env;

  if (config.gamepush) {
    registerAccountProvider(new GamePushAccountProvider(config.gamepush));
    log.info("GamePush account verification enabled", { projectId: config.gamepush.projectId });
  }

  if (config.allowedOrigins.length > 0) restrictMatchmakingCors(config.allowedOrigins);

  return defineServer({
    rooms: options.rooms,
    transport: new WebSocketTransport({
      maxPayload: config.maxPayloadBytes,
      beforeUpgrade: (request) => {
        if (!isOriginAllowed(request.headers.get("origin"), config.allowedOrigins)) {
          metrics.inc("rejected_origin_total");
          return new Response(null, { status: 403 });
        }
      },
    }),
    // Without REDIS_URL, Colyseus picks its defaults, which already configure Redis
    // and public addresses on Colyseus Cloud.
    ...(config.redisUrl
      ? { presence: new RedisPresence(config.redisUrl), driver: new RedisDriver(config.redisUrl) }
      : {}),
    ...(config.publicAddress ? { publicAddress: config.publicAddress } : {}),
    express: (app: Application) => {
      app.get("/health", (_req, res) => {
        res.json({ ok: true });
      });
      app.get("/version", (_req, res) => {
        res.json({ core: CORE_PROTOCOL_VERSION, game: options.protocolVersion, build: config.buildId });
      });
      app.get("/metrics", (_req, res) => {
        res.type("text/plain; version=0.0.4").send(
          metrics.render({
            game_rooms: matchMaker.stats.local.roomCount,
            game_clients: matchMaker.stats.local.ccu,
            process_resident_memory_bytes: process.memoryUsage().rss,
          }),
        );
      });

      if (!config.isProduction) {
        app.use("/monitor", monitor());
        app.use("/playground", playground());
      } else if (config.monitorPassword) {
        app.use("/monitor", requirePassword(config.monitorPassword), monitor());
      }

      options.express?.(app);
    },
  });
}

/** True when the page origin may connect. No allowlist = allow all (development). */
export function isOriginAllowed(origin: string | null | undefined, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  return !!origin && allowed.includes(normalizeOrigin(origin));
}

function restrictMatchmakingCors(allowed: string[]) {
  const defaults = matchMaker.controller.getCorsHeaders.bind(matchMaker.controller);
  matchMaker.controller.getCorsHeaders = (headers: Headers) => {
    const origin = headers.get("origin");
    // Colyseus falls back to "*" when the header is missing, so a disallowed page
    // gets another (allowed) origin instead, which its browser rejects.
    const allowOrigin = origin && isOriginAllowed(origin, allowed) ? origin : (allowed[0] ?? "");
    return { ...defaults(headers), "Access-Control-Allow-Origin": allowOrigin, Vary: "Origin" };
  };
}

/** HTTP basic auth (user "admin") for admin tools in production. */
function requirePassword(password: string): RequestHandler {
  const expected = Buffer.from(`admin:${password}`);
  return (req, res, next) => {
    const header = req.headers.authorization ?? "";
    const given = Buffer.from(header.startsWith("Basic ") ? Buffer.from(header.slice(6), "base64").toString() : "");
    if (given.length === expected.length && timingSafeEqual(given, expected)) return next();
    res.set("WWW-Authenticate", 'Basic realm="monitor"').status(401).end();
  };
}
