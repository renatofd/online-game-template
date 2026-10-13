import { env } from "./env";

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Structured logger: one JSON object per line in production (easy to ship to
 * any log service), readable text in development.
 *
 *   log.info("player joined", { roomId, playerId });
 */
function write(level: Level, message: string, fields?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[env.logLevel]) return;
  const out = level === "error" || level === "warn" ? console.error : console.log;
  if (env.isProduction) {
    out(JSON.stringify({ time: new Date().toISOString(), level, message, build: env.buildId, ...fields }));
  } else {
    out(`[${level}] ${message}${fields ? ` ${JSON.stringify(fields)}` : ""}`);
  }
}

export const log = {
  debug: (message: string, fields?: Record<string, unknown>) => write("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => write("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => write("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => write("error", message, fields),
};
