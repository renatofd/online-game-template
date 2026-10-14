/**
 * Bot clients for load testing.
 *
 *   pnpm loadtest                                   # 20 bots against localhost
 *   pnpm --filter @tools/loadtest exec tsx src/bots.ts --endpoint ws://localhost:2567 --numClients 200
 *
 * What each bot does lives in game/client/src/bot.ts, because it sends that game's inputs.
 * The room defaults to the game's BOT_ROOM; pass --room to pick another.
 */
import { cli, type Options } from "@colyseus/loadtest";
import { BOT_ROOM, runBot } from "@game/client/bot";

if (!process.argv.includes("--room")) process.argv.push("--room", BOT_ROOM);

export async function main(options: Options) {
  await runBot({ endpoint: options.endpoint, roomName: options.roomName, name: `Bot${options.clientId}` });
}

cli(main);
