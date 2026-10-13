import type { Platform } from "./Platform";

/** Plain web (itch.io, own site, local dev). Name comes from ?name= or a random guest name. */
export class WebPlatform implements Platform {
  readonly id = "web";
  private name = "";

  async init(): Promise<void> {
    const fromUrl = new URLSearchParams(location.search).get("name");
    this.name = fromUrl?.trim() || `Guest${Math.floor(1000 + Math.random() * 9000)}`;
  }

  getPlayerName(): string {
    return this.name;
  }
}
