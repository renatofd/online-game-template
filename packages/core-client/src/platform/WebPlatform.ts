import type { Platform } from "./Platform";

/** Plain web (itch.io, own site, local dev). `?name=` in the URL pre-fills the name. */
export class WebPlatform implements Platform {
  readonly id = "web";

  async init(): Promise<void> {}

  getPlayerName(): string | undefined {
    return new URLSearchParams(location.search).get("name")?.trim() || undefined;
  }

  getLanguage(): string | undefined {
    return new URLSearchParams(location.search).get("lang") ?? undefined;
  }

  gameplayStart() {}
  gameplayStop() {}
}
