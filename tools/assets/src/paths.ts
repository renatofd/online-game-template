import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const CONTENT_DIR = resolve(REPO_ROOT, "content");
export const MAPS_DIR = resolve(CONTENT_DIR, "maps");
