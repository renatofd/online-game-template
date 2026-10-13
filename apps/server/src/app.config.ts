import { ROOM_ARENA } from "@game/protocol";
import { defineRoom, defineServer, monitor, playground } from "colyseus";
import { env } from "./config/env";
import { ArenaRoom } from "./rooms/ArenaRoom";

const server = defineServer({
  rooms: {
    [ROOM_ARENA]: defineRoom(ArenaRoom),
  },

  express: (app) => {
    // Liveness probe for load balancers / container orchestrators.
    app.get("/health", (_req, res) => {
      res.json({ ok: true });
    });

    if (!env.isProduction) {
      // Dev-only tools. Protect /monitor with a password before exposing it in production:
      // https://docs.colyseus.io/tools/monitoring#password-protection
      app.use("/monitor", monitor());
      app.use("/playground", playground());
    }
  },
});

export default server;
