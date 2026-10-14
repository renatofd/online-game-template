/**
 * Bot behaviour for tools/loadtest. Kept with the game because it sends this
 * game's inputs. Node-safe: must not import Phaser or the DOM.
 */
import { ColyseusSDK } from "@colyseus/sdk";
import { CORE_PROTOCOL_VERSION } from "@core/shared";
import { ArenaState, type MoveInput, PROTOCOL_VERSION, ROOM_ARENA, TICK_RATE } from "@game/shared";

type Axis = -1 | 0 | 1;
const randomAxis = (): Axis => (Math.floor(Math.random() * 3) - 1) as Axis;

/** Room the load test joins by default (tools/loadtest). */
export const BOT_ROOM = ROOM_ARENA;

export interface BotOptions {
  endpoint: string;
  roomName?: string;
  name: string;
}

/** Joins and wanders, sending one input per server tick like a real player. Returns a stop function. */
export async function runBot(options: BotOptions): Promise<() => void> {
  const client = new ColyseusSDK(options.endpoint);
  const room = await client.joinOrCreate<ArenaState>(
    options.roomName || BOT_ROOM,
    { name: options.name, v: { core: CORE_PROTOCOL_VERSION, game: PROTOCOL_VERSION } },
    ArenaState,
  );

  const input = room.input<MoveInput>({ mode: "reliable" });
  let ticksUntilTurn = 0;
  const timer = setInterval(() => {
    if (ticksUntilTurn-- <= 0) {
      input.data.moveX = randomAxis();
      input.data.moveY = randomAxis();
      ticksUntilTurn = TICK_RATE * (1 + Math.random() * 2);
    }
    input.send();
  }, 1000 / TICK_RATE);

  room.onLeave(() => clearInterval(timer));
  return () => {
    clearInterval(timer);
    void room.leave();
  };
}
