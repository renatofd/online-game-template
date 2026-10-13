import { CORE_PROTOCOL_VERSION } from "@core/shared";
import { defineServer, monitor, playground, type RegisteredHandler } from "colyseus";
import type { Application } from "express";
import { env } from "./env";

export interface GameServerOptions<T extends Record<string, RegisteredHandler>> {
  /** Room handlers, e.g. `{ arena: defineRoom(ArenaRoom) }`. */
  rooms: T;
  /** The game's PROTOCOL_VERSION, reported by GET /version. */
  protocolVersion: number;
  /** Extra HTTP routes. */
  express?: (app: Application) => void;
}

/**
 * Colyseus server definition with the template's standard HTTP endpoints:
 *  - GET /health   liveness probe for load balancers and orchestrators
 *  - GET /version  protocol versions and build id
 *  - /monitor, /playground in development only
 */
export function createGameServer<T extends Record<string, RegisteredHandler>>(options: GameServerOptions<T>) {
  return defineServer({
    rooms: options.rooms,
    express: (app: Application) => {
      app.get("/health", (_req, res) => {
        res.json({ ok: true });
      });
      app.get("/version", (_req, res) => {
        res.json({ core: CORE_PROTOCOL_VERSION, game: options.protocolVersion, build: env.buildId });
      });

      if (!env.isProduction) {
        // Protect /monitor with a password before exposing it in production:
        // https://docs.colyseus.io/tools/monitoring#password-protection
        app.use("/monitor", monitor());
        app.use("/playground", playground());
      }

      options.express?.(app);
    },
  });
}
