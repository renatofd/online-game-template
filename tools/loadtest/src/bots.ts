/**
 * Bot clients for load testing.
 *
 *   pnpm loadtest                                   # 20 bots against localhost
 *   pnpm --filter @game/loadtest exec tsx src/bots.ts --endpoint ws://localhost:2567 --room arena --numClients 200
 *
 * Each bot joins the arena and sends one input per server tick, changing
 * direction every couple of seconds, which is roughly the traffic of a real player.
 */
import { cli, type Options } from "@colyseus/loadtest";
import { ColyseusSDK } from "@colyseus/sdk";
import { ArenaState, type MoveInput, ROOM_ARENA } from "@game/protocol";
import { TICK_RATE } from "@game/shared";

type Axis = -1 | 0 | 1;
const randomAxis = (): Axis => (Math.floor(Math.random() * 3) - 1) as Axis;

export async function main(options: Options) {
  const client = new ColyseusSDK(options.endpoint);
  const room = await client.joinOrCreate<ArenaState>(
    options.roomName || ROOM_ARENA,
    { name: `Bot${options.clientId}` },
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
}

cli(main);
