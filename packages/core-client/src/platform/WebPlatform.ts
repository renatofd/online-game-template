import type { PlatformAuthPayload } from "@core/shared";
import type { Platform, PlatformAds } from "./Platform";

const NO_ADS: PlatformAds = {
  canShowInterstitial: () => false,
  showInterstitial: async () => false,
  canShowRewarded: () => false,
  showRewarded: async () => false,
};

/** Plain web (itch.io, own site, local dev). `?name=` and `?lang=` in the URL act as hints. */
export class WebPlatform implements Platform {
  readonly id: string = "web";
  readonly ads: PlatformAds = NO_ADS;

  async init(): Promise<void> {}

  getPlayerName(): string | undefined {
    return new URLSearchParams(location.search).get("name")?.trim() || undefined;
  }

  getLanguage(): string | undefined {
    return new URLSearchParams(location.search).get("lang") ?? undefined;
  }

  setLanguage(_locale: string) {}

  getAuthPayload(): PlatformAuthPayload | undefined {
    return undefined;
  }

  gameplayStart() {}
  gameplayStop() {}
  onPauseChange(_listener: (paused: boolean) => void) {}
}
