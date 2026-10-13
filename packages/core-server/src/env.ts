import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface ServerEnv {
  isProduction: boolean;
  /** Directory with the Tiled .tmj maps. */
  mapsDir: string;
  /** Build identifier reported by /version and logs (e.g. the git SHA). */
  buildId: string;
  /** Page origins allowed to connect (exact match, e.g. "https://my.game"). Empty = any origin. */
  allowedOrigins: string[];
  /** Enables /monitor in production behind HTTP basic auth (user "admin"). */
  monitorPassword?: string;
  /** Redis connection URL. When set, rooms/presence are shared across processes. */
  redisUrl?: string;
  /** GamePush Server API credentials. When set, GamePush players are verified server-side. */
  gamepush?: { projectId: string; apiSecret: string };
  /** Minimum log level. */
  logLevel: "debug" | "info" | "warn" | "error";
  /** Max WebSocket message size in bytes. */
  maxPayloadBytes: number;
}

const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

/**
 * Reads and validates the server environment. Throws one error listing every
 * problem, so a misconfigured deploy fails at boot instead of at the first player.
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const errors: string[] = [];
  const isProduction = source.NODE_ENV === "production";

  const logLevel = (source.LOG_LEVEL ?? (isProduction ? "info" : "debug")) as ServerEnv["logLevel"];
  if (!LOG_LEVELS.includes(logLevel)) errors.push(`LOG_LEVEL must be one of ${LOG_LEVELS.join(", ")}`);

  const allowedOrigins = (source.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  for (const origin of allowedOrigins) {
    if (!/^https?:\/\/[^/]+$/.test(origin))
      errors.push(`ALLOWED_ORIGINS entry "${origin}" must look like https://host`);
  }

  const redisUrl = source.REDIS_URL || undefined;
  if (redisUrl && !/^rediss?:\/\//.test(redisUrl)) errors.push("REDIS_URL must start with redis:// or rediss://");

  let gamepush: ServerEnv["gamepush"];
  const gpProject = source.GAMEPUSH_PROJECT_ID;
  const gpSecret = source.GAMEPUSH_API_SECRET;
  if (gpProject && gpSecret) gamepush = { projectId: gpProject, apiSecret: gpSecret };
  else if (gpProject || gpSecret) errors.push("GAMEPUSH_PROJECT_ID and GAMEPUSH_API_SECRET must be set together");

  const maxPayloadBytes = Number(source.MAX_PAYLOAD_BYTES ?? 16 * 1024);
  if (!Number.isInteger(maxPayloadBytes) || maxPayloadBytes < 1024)
    errors.push("MAX_PAYLOAD_BYTES must be an integer >= 1024");

  if (errors.length > 0) throw new Error(`Invalid server environment:\n- ${errors.join("\n- ")}`);

  return {
    isProduction,
    mapsDir: source.MAPS_DIR ?? defaultMapsDir(),
    buildId: source.BUILD_ID ?? "dev",
    allowedOrigins,
    monitorPassword: source.MONITOR_PASSWORD || undefined,
    redisUrl,
    gamepush,
    logLevel,
    maxPayloadBytes,
  };
}

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

/** The validated environment of this process. */
export const env: ServerEnv = parseEnv();
