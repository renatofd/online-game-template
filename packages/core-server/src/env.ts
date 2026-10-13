import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Walks up from the working directory to find <repo>/content/maps. */
function defaultMapsDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = resolve(dir, "content/maps");
    if (existsSync(candidate)) return candidate;
    dir = resolve(dir, "..");
  }
  return resolve(process.cwd(), "content/maps");
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  /** Directory with the Tiled .tmj maps. */
  mapsDir: process.env.MAPS_DIR ?? defaultMapsDir(),
  /** Build identifier reported by /version (set by CI/deploy, e.g. the git SHA). */
  buildId: process.env.BUILD_ID ?? "dev",
};
