import Phaser from "phaser";

/** A sprite exported from Aseprite: a PNG sheet plus its JSON (json-array, `--filename-format "{frame}"`). */
export interface SpriteAsset {
  /** Texture key, taken from the file name (e.g. "player" for player.png / player.json). */
  key: string;
  image: string;
  data: string;
}

/** Minimal shape of Aseprite's JSON export. */
export interface AsepriteData {
  frames: { filename: string; duration?: number }[] | Record<string, { duration?: number }>;
  meta: {
    frameTags?: { name: string; from: number; to: number; direction?: string; repeat?: string }[];
  };
}

/** Animation key for a tag of a sprite: animKey("player", "walk") → "player/walk". */
export const animKey = (sprite: string, tag: string) => `${sprite}/${tag}`;

/**
 * Pairs `<name>.png` with `<name>.json` from two Vite glob results
 * (`import.meta.glob("@content/sprites/*.png", { eager: true, query: "?url", import: "default" })`).
 * Files without a partner are reported and skipped.
 */
export function discoverSprites(pngs: Record<string, string>, jsons: Record<string, string>): SpriteAsset[] {
  const base = (path: string) =>
    path
      .split("/")
      .pop()
      ?.replace(/\.(png|json)$/i, "") ?? path;
  const data = new Map(Object.entries(jsons).map(([path, url]) => [base(path), url]));
  const sprites: SpriteAsset[] = [];
  for (const [path, image] of Object.entries(pngs)) {
    const key = base(path);
    const json = data.get(key);
    if (json) sprites.push({ key, image, data: json });
    else console.warn(`[sprites] ${key}.png has no ${key}.json; export it from Aseprite (pnpm assets:sprites).`);
  }
  return sprites;
}

/**
 * Queues every sprite in the scene loader and, once loading completes, creates
 * one animation per Aseprite tag, named "<sprite>/<tag>" (see animKey).
 * Tags keep Aseprite's frame durations and direction (forward, reverse, pingpong);
 * a tag whose "repeat" is set plays that many times, otherwise it loops.
 */
export function loadSprites(scene: Phaser.Scene, sprites: SpriteAsset[]) {
  for (const s of sprites) scene.load.aseprite(s.key, s.image, s.data);
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    for (const s of sprites) createSpriteAnimations(scene, s.key);
  });
}

/** Creates "<key>/<tag>" animations from an already-loaded Aseprite sprite. Returns the created keys. */
export function createSpriteAnimations(scene: Phaser.Scene, key: string): string[] {
  const data = scene.cache.json.get(key) as AsepriteData | undefined;
  if (!data?.meta) return [];
  const frames = Array.isArray(data.frames)
    ? data.frames
    : Object.entries(data.frames).map(([filename, f]) => ({ filename, ...f }));

  const created: string[] = [];
  for (const tag of data.meta.frameTags ?? []) {
    const fullKey = animKey(key, tag.name);
    if (scene.anims.exists(fullKey)) continue;
    let animFrames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = tag.from; i <= tag.to; i++) {
      const f = frames[i];
      if (f) animFrames.push({ key, frame: f.filename, duration: f.duration ?? 100 });
    }
    if (tag.direction === "reverse") animFrames = animFrames.reverse();
    const repeatCount = tag.repeat ? Number(tag.repeat) : 0;
    scene.anims.create({
      key: fullKey,
      frames: animFrames,
      yoyo: tag.direction === "pingpong",
      repeat: repeatCount > 0 ? repeatCount - 1 : -1,
    });
    created.push(fullKey);
  }
  return created;
}
