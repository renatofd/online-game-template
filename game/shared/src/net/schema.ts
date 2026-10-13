import { type SchemaType, schema, t } from "@colyseus/schema";

/**
 * One input frame, consumed by the server's `defineInput()` buffer.
 * Flat and minimal on purpose: no seq, no dt, no timestamp. The engine's input
 * counter is the sequence and one input advances exactly one fixed step.
 * The int8<-1|0|1> type only narrows TypeScript; the room's `sanitize` clamp
 * is what enforces it against a modified client.
 */
export const MoveInput = schema({
  moveX: t.int8<-1 | 0 | 1>(),
  moveY: t.int8<-1 | 0 | 1>(),
});
export type MoveInput = SchemaType<typeof MoveInput>;

export const Player = schema({
  name: t.string(),
  x: t.number(),
  y: t.number(),
  vx: t.number(),
  vy: t.number(),
});
export type Player = SchemaType<typeof Player>;

export const ArenaState = schema({
  /** Map identifier; the client loads the matching .tmj. */
  mapId: t.string(),
  players: t.map(Player),
});
export type ArenaState = SchemaType<typeof ArenaState>;
