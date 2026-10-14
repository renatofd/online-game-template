/**
 * Client entrypoint: boots the template core with this repository's game.
 * Usually no need to edit; the game lives in game/client.
 */
import { startClient } from "@core/client";
import { game } from "@game/client";

// On failure startClient already shows a translated error screen; just log the cause.
startClient(game).catch((err) => console.error(err));
