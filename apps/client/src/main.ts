import Phaser from "phaser";
import { computeZoom, createGameConfig } from "./config/gameConfig";
import { createPlatform } from "./platform";
import { services } from "./services";

async function main() {
  services.platform = await createPlatform();

  // Colyseus debug panel (latency/jitter simulator, state inspector) in dev or with ?debug.
  if (import.meta.env.DEV || new URLSearchParams(location.search).has("debug")) {
    await import("@colyseus/sdk/debug");
  }

  const game = new Phaser.Game(createGameConfig());
  window.addEventListener("resize", () => game.scale.setZoom(computeZoom()));
}

main().catch((err) => {
  console.error(err);
  document.body.textContent = "Falha ao iniciar o jogo.";
});
