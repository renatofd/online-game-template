import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

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
  },
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
});
