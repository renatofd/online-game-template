import type Phaser from "phaser";

export type AudioGroup = "music" | "sfx";

/** One sound, possibly in several formats (the browser picks the first it supports). */
export interface AudioAsset {
  /** Sound key, from the file name: content/audio/sfx/join.ogg → "join". */
  key: string;
  group: AudioGroup;
  urls: string[];
}

const FORMAT_PREFERENCE = [".ogg", ".m4a", ".mp3", ".wav"];

/**
 * Turns a Vite glob of content/audio/{music,sfx}/* into assets. Files sharing a
 * name (join.ogg + join.mp3) become one sound with fallbacks.
 */
export function discoverAudio(files: Record<string, string>): AudioAsset[] {
  const byKey = new Map<string, AudioAsset>();
  for (const [path, url] of Object.entries(files)) {
    const parts = path.split("/");
    const file = parts.pop() ?? "";
    const group = parts.pop();
    if (group !== "music" && group !== "sfx") continue;
    const key = file.replace(/\.[^.]+$/, "");
    const asset = byKey.get(key) ?? { key, group, urls: [] };
    asset.urls.push(url);
    byKey.set(key, asset);
  }
  const rank = (url: string) => {
    const i = FORMAT_PREFERENCE.findIndex((ext) => url.toLowerCase().split("?")[0]?.endsWith(ext));
    return i < 0 ? FORMAT_PREFERENCE.length : i;
  };
  for (const a of byKey.values()) a.urls.sort((x, y) => rank(x) - rank(y));
  return [...byKey.values()];
}

export function loadAudio(scene: Phaser.Scene, assets: AudioAsset[]) {
  for (const a of assets) scene.load.audio(a.key, a.urls);
}
