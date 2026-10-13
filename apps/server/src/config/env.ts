import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Finds <repo>/content/maps from either src/config (tsx) or build/ (bundled). */
function defaultMapsDir(): string {
  const candidates = [resolve(here, "../../../../content/maps"), resolve(here, "../../../content/maps")];
  return candidates.find((p) => existsSync(p)) ?? resolve(process.cwd(), "content/maps");
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  mapsDir: process.env.MAPS_DIR ?? defaultMapsDir(),
};
