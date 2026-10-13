import type { Room } from "@colyseus/sdk";
import { DEFAULT_MAX_NAME_LENGTH, sanitizeName } from "@core/shared";
import Phaser from "phaser";
import type { GameContext, GameModule, MatchResult } from "./GameModule";
import { detectLocale, I18n } from "./i18n";
import { InputManager, isTouchDevice } from "./input";
import { JoinError, joinRoom } from "./net/session";
import { computeZoom, createPhaserConfig } from "./phaserConfig";
import { createPlatform, type Platform } from "./platform";
import { BOOT_SCENE_KEY, BootScene, type BootSceneData } from "./scenes/BootScene";
import { Storage } from "./storage";
import { h } from "./ui/dom";
import { formatStats, hudView, loadingScreen, menuScreen, messageScreen, resultScreen } from "./ui/screens";
import { Ui } from "./ui/Ui";
import "./ui/ui.css";

const DEFAULT_RESOLUTION = { width: 640, height: 360 };

/**
 * Boots a game on top of the template core. Call once from the app entrypoint:
 *
 *   startClient(arenaGame);
 */
export async function startClient<State>(game: GameModule<State>): Promise<void> {
  const app = new ClientApp(game);
  await app.start();
}

class ClientApp<State> {
  private storage: Storage;
  private i18n: I18n;
  private platform!: Platform;
  private ui!: Ui;
  private input!: InputManager;
  private phaser!: Phaser.Game;
  private resolution: { width: number; height: number };

  private room?: Room<unknown, State>;
  /** True while we are leaving on purpose, so onLeave doesn't show "disconnected". */
  private leaving = false;
  private playerName = "";
  private gameHud = h("div", { className: "ui-game-hud" });
  private statsEl = h("div", { className: "ui-hud-stats", "aria-hidden": "true" });
  private statsTimer?: number;

  constructor(private readonly game: GameModule<State>) {
    this.storage = new Storage(`${game.id}:`);
    this.i18n = new I18n(game.messages);
    this.resolution = game.resolution ?? DEFAULT_RESOLUTION;
  }

  async start() {
    this.platform = await createPlatform();
    this.i18n.setLocale(
      detectLocale({
        saved: this.storage.get("locale"),
        platform: this.platform.getLanguage(),
        browser: navigator.languages,
      }),
    );

    // Colyseus debug panel (latency/jitter simulator, state inspector) with ?debug in the URL.
    if (new URLSearchParams(location.search).has("debug")) {
      await import("@colyseus/sdk/debug");
    }

    this.ui = new Ui(document.body, this.i18n);
    this.input = new InputManager(this.ui.root, this.game.actions ?? [], this.i18n.t);
    this.i18n.onChange((locale) => {
      this.input.refreshLabels();
      this.platform.setLanguage(locale);
    });
    this.platform.onPauseChange((paused) => this.onPlatformPause(paused));
    this.playerName = this.storage.get("name") ?? this.platform.getPlayerName() ?? "";

    this.ui.show(() => loadingScreen(this.i18n, 0));
    this.phaser = new Phaser.Game(createPhaserConfig(this.resolution, [], this.game.backgroundColor));
    this.phaser.events.on(Phaser.Core.Events.PRE_STEP, () => this.input.update());

    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onGlobalKey);
    this.onResize();

    await new Promise<void>((resolve) => this.phaser.events.once(Phaser.Core.Events.READY, () => resolve()));
    for (const scene of this.game.scenes) this.phaser.scene.add("", scene, false);
    this.phaser.scene.add(BOOT_SCENE_KEY, BootScene, false);

    const boot: BootSceneData = {
      preload: (scene) => this.game.preload(scene),
      onProgress: (p) => this.ui.show(() => loadingScreen(this.i18n, p)),
      onComplete: () => this.showMenu(),
    };
    this.phaser.scene.start(BOOT_SCENE_KEY, boot);
  }

  // ─── Screens ──────────────────────────────────────────────────────────────

  private showMenu() {
    this.ui.hideHud();
    this.ui.show(() =>
      menuScreen(this.i18n, {
        title: this.game.title,
        name: this.playerName,
        maxNameLength: this.game.maxNameLength ?? DEFAULT_MAX_NAME_LENGTH,
        canFullscreen: canFullscreen(),
        onNameInput: (name) => {
          this.playerName = name;
        },
        onPlay: () => void this.play(),
        onLocale: (locale) => {
          this.storage.set("locale", locale);
          this.i18n.setLocale(locale);
        },
        onFullscreen: toggleFullscreen,
        footer: `build ${import.meta.env.VITE_BUILD_ID ?? "dev"}`,
      }),
    );
  }

  private showError(title: string, body: string, retry = true) {
    this.ui.show(() =>
      messageScreen({
        title,
        body,
        actions: [
          ...(retry ? [{ label: this.i18n.t("action.retry"), onClick: () => void this.play(), primary: true }] : []),
          { label: this.i18n.t("action.backToMenu"), onClick: () => this.showMenu() },
        ],
      }),
    );
  }

  private showPauseMenu() {
    this.input.setActive(false);
    this.ui.show(() =>
      messageScreen({
        title: this.i18n.t("pause.title"),
        body: this.game.title,
        actions: [
          { label: this.i18n.t("action.resume"), onClick: () => this.resume(), primary: true },
          { label: this.i18n.t("action.leave"), onClick: () => this.exitToMenu() },
        ],
      }),
    );
  }

  /** Platform pause (e.g. an ad is playing): mute and release input; the match itself keeps running. */
  private onPlatformPause(paused: boolean) {
    this.phaser.sound.mute = paused;
    if (paused) this.input.setActive(false);
    else if (this.room && !this.ui.isScreenOpen) this.input.setActive(true);
  }

  private resume() {
    this.ui.hide();
    this.input.setActive(true);
  }

  // ─── Match lifecycle ──────────────────────────────────────────────────────

  private async play() {
    const maxLength = this.game.maxNameLength ?? DEFAULT_MAX_NAME_LENGTH;
    this.playerName = sanitizeName(this.playerName, "", maxLength);
    if (this.playerName) this.storage.set("name", this.playerName);
    const name = this.playerName || `Guest${Math.floor(1000 + Math.random() * 9000)}`;

    this.ui.show(() => messageScreen({ body: this.i18n.t("connecting"), busy: true }));
    try {
      this.room = await joinRoom<State>({
        roomName: this.game.roomName,
        gameProtocolVersion: this.game.protocolVersion,
        rootSchema: this.game.rootSchema,
        options: { ...this.game.joinOptions?.(), name, locale: this.i18n.locale, auth: this.platform.getAuthPayload() },
      });
    } catch (err) {
      console.error(err);
      const reason = err instanceof JoinError ? err.reason : "unreachable";
      if (reason === "version-mismatch") {
        this.ui.show(() =>
          messageScreen({
            title: this.i18n.t("error.versionTitle"),
            body: this.i18n.t("error.versionBody"),
            actions: [{ label: this.i18n.t("action.reload"), onClick: () => location.reload(), primary: true }],
          }),
        );
      } else if (reason === "auth-failed") {
        this.showError(this.i18n.t("error.title"), this.i18n.t("error.authFailed"));
      } else {
        this.showError(this.i18n.t("error.title"), this.i18n.t("error.unreachable"));
      }
      return;
    }

    this.startMatch(this.room);
  }

  private startMatch(room: Room<unknown, State>) {
    this.leaving = false;
    // The SDK only auto-reconnects rooms that have been up this long (default 5s), to avoid
    // reconnect loops. 1s still prevents loops and covers drops right after joining.
    room.reconnection.minUptime = 1000;

    room.onDrop(() => {
      this.input.setActive(false);
      this.ui.show(() => messageScreen({ body: this.i18n.t("reconnecting"), busy: true }));
    });
    room.onReconnect(() => this.resume());
    room.onLeave(() => {
      if (this.leaving) return;
      this.stopMatch();
      this.showError(this.i18n.t("error.title"), this.i18n.t("error.disconnected"));
    });

    this.gameHud.replaceChildren();
    this.ui.showHud(() =>
      hudView(
        this.i18n,
        {
          onMenu: () => this.showPauseMenu(),
          canFullscreen: canFullscreen() && isTouchDevice(),
          onFullscreen: toggleFullscreen,
          gameHud: this.gameHud,
        },
        this.statsEl,
      ),
    );
    this.statsTimer = window.setInterval(() => {
      this.statsEl.textContent = formatStats(this.i18n, {
        ping: Math.round(room.clock.smoothedRtt()),
        fps: Math.round(this.phaser.loop.actualFps),
      });
    }, 500);

    const ctx: GameContext<State> = {
      room,
      input: this.input,
      t: this.i18n.t,
      platform: this.platform,
      hud: this.gameHud,
      endMatch: (result) => this.endMatch(result),
      exitToMenu: () => this.exitToMenu(),
    };

    // Dev-only hook for end-to-end tests and console debugging (stripped from production builds).
    if (import.meta.env.DEV) (window as unknown as { __game?: unknown }).__game = { room, locale: this.i18n.locale };

    this.ui.hide();
    this.input.setActive(true);
    this.platform.gameplayStart();
    this.phaser.scene.start(this.game.gameSceneKey, ctx);
  }

  /** Leaves the room (if any) and tears down the running match. */
  private stopMatch() {
    this.leaving = true;
    this.input.setActive(false);
    window.clearInterval(this.statsTimer);
    this.ui.hideHud();
    this.platform.gameplayStop();
    if (this.phaser.scene.isActive(this.game.gameSceneKey)) this.phaser.scene.stop(this.game.gameSceneKey);
    const room = this.room;
    this.room = undefined;
    room?.leave().catch(() => {});
  }

  private endMatch(result: MatchResult = {}) {
    this.stopMatch();
    this.ui.show(() =>
      resultScreen(this.i18n, result.title, result.rows ?? [], [
        { label: this.i18n.t("action.playAgain"), onClick: () => void this.play(), primary: true },
        { label: this.i18n.t("action.backToMenu"), onClick: () => this.showMenu() },
      ]),
    );
  }

  private exitToMenu() {
    this.stopMatch();
    this.showMenu();
  }

  // ─── Window events ────────────────────────────────────────────────────────

  private onResize = () => {
    this.phaser?.scale.setZoom(computeZoom(this.resolution));
    const wanted = this.game.orientation ?? "landscape";
    const portrait = window.innerHeight > window.innerWidth;
    const wrong = wanted !== "any" && isTouchDevice() && (wanted === "landscape" ? portrait : !portrait);
    this.ui?.setRotateHint(wrong);
  };

  private onGlobalKey = (e: KeyboardEvent) => {
    if (e.code !== "Escape" || !this.room) return;
    if (this.ui.isScreenOpen) this.resume();
    else this.showPauseMenu();
  };
}

function canFullscreen(): boolean {
  return document.fullscreenEnabled === true && typeof document.documentElement.requestFullscreen === "function";
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen().catch(() => {});
}
