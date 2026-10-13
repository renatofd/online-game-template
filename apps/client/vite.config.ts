import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

/** Where the dev server forwards game traffic (see `serverUrl()` in @core/client). */
const GAME_SERVER = process.env.GAME_SERVER_ORIGIN ?? "http://localhost:2567";

export default defineConfig({
  // Relative asset URLs so the build works from any sub-path (itch.io, GamePush, CDN folders).
  base: "./",
  resolve: {
    // `@content/...` points at <repo>/content: maps and art are imported from their source location.
    alias: { "@content": `${repoRoot}content` },
  },
  server: {
    port: 3000,
    host: true,
    // Maps and art are imported straight from <repo>/content (single source of truth).
    fs: { allow: [repoRoot] },
    // GitHub Codespaces serves the dev server from *.app.github.dev.
    allowedHosts: [".app.github.dev"],
    // In Codespaces the page is reached through HTTPS on port 443, not 3000.
    hmr: process.env.CODESPACES === "true" ? { clientPort: 443 } : undefined,
    // In development the game talks to the server through this same origin
    // (matchmaking over HTTP and the room over WebSocket), so only port 3000
    // needs to be reachable: phones on the LAN, Codespaces, tunnels...
    proxy: {
      "/__server": {
        target: GAME_SERVER,
        ws: true,
        rewrite: (path) => path.replace(/^\/__server/, ""),
      },
    },
  },
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
});
