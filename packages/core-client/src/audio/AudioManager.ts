import type Phaser from "phaser";
import type { Storage } from "../storage";

export interface AudioSettings {
  /** 0..1 */
  music: number;
  /** 0..1 */
  sfx: number;
  muted: boolean;
}

const DEFAULTS: AudioSettings = { music: 0.6, sfx: 0.8, muted: false };
const STORAGE_KEY = "audio";

export interface MusicOptions {
  /** Fade-in/cross-fade duration in ms. Default 600. */
  fadeMs?: number;
  /** Default true. */
  loop?: boolean;
}

export interface SfxOptions {
  /** Relative volume 0..1 (multiplied by the sfx channel volume). */
  volume?: number;
  /** Playback rate; small random variations make repeated sounds less monotonous. */
  rate?: number;
  /** Detune in cents. */
  detune?: number;
}

/**
 * Music + sound effects with per-channel volume and mute, saved per player.
 * Games use it through `ctx.audio`:
 *
 *   ctx.audio.playMusic("theme");
 *   ctx.audio.playSfx("join", { rate: 0.95 + Math.random() * 0.1 });
 *
 * Sounds come from content/audio/music and content/audio/sfx (auto-loaded).
 * Browsers only allow audio after the first user gesture; music requested
 * before that starts as soon as audio unlocks.
 */
export class AudioManager {
  private settings: AudioSettings;
  private music?: Phaser.Sound.BaseSound;
  private musicKey?: string;
  /** Music requested while audio is locked; only the latest request plays once unlocked. */
  private pendingMusic?: { key: string; options: MusicOptions };
  /** Running volume fades by track, so a newer fade (or destroy) cancels the older one. */
  private fades = new Map<Phaser.Sound.BaseSound, number>();
  private platformPaused = false;
  private listeners = new Set<(s: AudioSettings) => void>();

  constructor(
    private readonly sound: Phaser.Sound.BaseSoundManager,
    private readonly storage: Storage,
  ) {
    this.settings = { ...DEFAULTS, ...parse(storage.get(STORAGE_KEY)) };
    this.applyMute();
    this.sound.on("unlocked", () => {
      const pending = this.pendingMusic;
      this.pendingMusic = undefined;
      if (pending) this.playMusic(pending.key, pending.options);
    });
  }

  get current(): Readonly<AudioSettings> {
    return this.settings;
  }

  /** Changes and saves settings. */
  update(change: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...change };
    this.settings.music = clamp01(this.settings.music);
    this.settings.sfx = clamp01(this.settings.sfx);
    this.storage.set(STORAGE_KEY, JSON.stringify(this.settings));
    this.applyMute();
    if (this.music && "setVolume" in this.music) {
      // An explicit volume change wins over a fade-in still running.
      this.cancelFade(this.music);
      (this.music as Phaser.Sound.WebAudioSound).setVolume(this.settings.music);
    }
    for (const fn of this.listeners) fn(this.settings);
  }

  onChange(fn: (s: AudioSettings) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Plays a sound effect if it exists. Returns false when the key is unknown. */
  playSfx(key: string, options: SfxOptions = {}): boolean {
    if (!this.sound.game.cache.audio.exists(key)) return false;
    return this.sound.play(key, {
      volume: (options.volume ?? 1) * this.settings.sfx,
      rate: options.rate ?? 1,
      detune: options.detune ?? 0,
    });
  }

  /** Starts (or cross-fades to) a music track. Playing the current track again is a no-op. */
  playMusic(key: string, options: MusicOptions = {}) {
    if (this.musicKey === key && this.music?.isPlaying) return;
    if (!this.sound.game.cache.audio.exists(key)) return;
    if (this.sound.locked) {
      this.pendingMusic = { key, options };
      return;
    }
    this.stopMusic(options.fadeMs);
    const track = this.sound.add(key, { loop: options.loop ?? true, volume: 0 });
    this.music = track;
    this.musicKey = key;
    track.play();
    this.fade(track, 0, this.settings.music, options.fadeMs ?? 600);
  }

  stopMusic(fadeMs = 400) {
    this.pendingMusic = undefined;
    const track = this.music;
    this.music = undefined;
    this.musicKey = undefined;
    if (!track) return;
    const from = (track as Phaser.Sound.WebAudioSound).volume ?? this.settings.music;
    this.fade(track, from, 0, fadeMs, () => track.destroy());
  }

  /** Platform pause (ads): silence everything until resumed. */
  setPlatformPaused(paused: boolean) {
    this.platformPaused = paused;
    this.applyMute();
  }

  private applyMute() {
    this.sound.mute = this.settings.muted || this.platformPaused;
  }

  private fade(track: Phaser.Sound.BaseSound, from: number, to: number, ms: number, done?: () => void) {
    const t = track as Phaser.Sound.WebAudioSound;
    this.cancelFade(track);
    if (ms <= 0) {
      t.setVolume?.(to);
      done?.();
      return;
    }
    const startTime = performance.now();
    const step = () => {
      // Stop quietly if the track was destroyed elsewhere (e.g. the sound manager shut down).
      if (track.pendingRemove || !track.manager) {
        this.fades.delete(track);
        return;
      }
      const k = Math.min(1, (performance.now() - startTime) / ms);
      t.setVolume?.(from + (to - from) * k);
      if (k < 1) this.fades.set(track, requestAnimationFrame(step));
      else {
        this.fades.delete(track);
        done?.();
      }
    };
    this.fades.set(track, requestAnimationFrame(step));
  }

  private cancelFade(track: Phaser.Sound.BaseSound) {
    const frame = this.fades.get(track);
    if (frame !== undefined) cancelAnimationFrame(frame);
    this.fades.delete(track);
  }
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

function parse(raw: string | null): Partial<AudioSettings> {
  try {
    const v = JSON.parse(raw ?? "{}") as Partial<AudioSettings>;
    return {
      ...(typeof v.music === "number" ? { music: v.music } : {}),
      ...(typeof v.sfx === "number" ? { sfx: v.sfx } : {}),
      ...(typeof v.muted === "boolean" ? { muted: v.muted } : {}),
    };
  } catch {
    return {};
  }
}
