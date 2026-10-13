/**
 * Bot clients for load testing.
 *
 *   pnpm loadtest                                   # 20 bots against localhost
 *   pnpm --filter @tools/loadtest exec tsx src/bots.ts --endpoint ws://localhost:2567 --room arena --numClients 200
 *
 * What each bot does lives in game/client/src/bot.ts, because it sends that game's inputs.
 */
import { cli, type Options } from "@colyseus/loadtest";
import { runBot } from "@game/client/bot";

export async function main(options: Options) {
  await runBot({ endpoint: options.endpoint, roomName: options.roomName, name: `Bot${options.clientId}` });
}

cli(main);
