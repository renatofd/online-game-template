// PM2 process file. Colyseus Cloud (and plain PM2 on a VPS) start the server from here.
// Run `pnpm --filter @app/server build` first; it produces build/index.js.
const os = require("node:os");
const path = require("node:path");

// Read apps/server/.env (if present) so REDIS_URL there also decides the instance count.
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch {}

module.exports = {
  apps: [
    {
      name: "game-server",
      script: "build/index.js",
      time: true,
      watch: false,
      // One process per CPU core. More than one requires REDIS_URL so processes share rooms,
      // and PUBLIC_ADDRESS so players reach the process that holds their room.
      // Each instance listens on PORT + its index (2567, 2568, ...).
      instances: process.env.REDIS_URL ? os.cpus().length : 1,
      exec_mode: "fork",
      env_production: { NODE_ENV: "production" },
    },
  ],
};
