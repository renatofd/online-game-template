import type { I18n } from "../i18n";
import { h } from "./dom";

/** One row of a scoreboard / player list. */
export interface ScoreRow {
  id: string;
  name: string;
  score: number;
}

/** Short messages at the top of the screen ("Ana joined", "+10"...). */
export class Toasts {
  readonly el = h("div", { className: "ui-toasts", "aria-live": "polite" });

  show(text: string, durationMs = 2500) {
    const toast = h("div", { className: "ui-toast", dir: "auto" }, text);
    this.el.append(toast);
    // Keep the stack short.
    while (this.el.childElementCount > 4) this.el.firstElementChild?.remove();
    setTimeout(() => toast.classList.add("leaving"), durationMs);
    setTimeout(() => toast.remove(), durationMs + 400);
  }

  clear() {
    this.el.replaceChildren();
  }
}

function sortRows(rows: ScoreRow[]): ScoreRow[] {
  return [...rows].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function rowEl(i18n: I18n, rank: number, row: ScoreRow, selfId?: string) {
  return h(
    "li",
    { className: row.id === selfId ? "ui-score-row self" : "ui-score-row" },
    h("span", { className: "ui-score-rank" }, i18n.formatNumber(rank)),
    h("span", { className: "ui-score-name", dir: "auto" }, row.name),
    h("span", { className: "ui-score-value" }, i18n.formatNumber(row.score)),
  );
}

/** Compact top-N leaderboard in the corner; shows the player's own rank if outside the top. */
export class Scoreboard {
  readonly el = h("section", { className: "ui-scoreboard", hidden: true });
  private rows: ScoreRow[] = [];
  private selfId?: string;

  constructor(
    private readonly i18n: I18n,
    private readonly size = 5,
  ) {
    i18n.onChange(() => this.render());
  }

  update(rows: ScoreRow[], selfId?: string) {
    this.rows = sortRows(rows);
    this.selfId = selfId;
    this.el.hidden = rows.length === 0;
    this.render();
  }

  hide() {
    this.rows = [];
    this.el.hidden = true;
  }

  private render() {
    const top = this.rows.slice(0, this.size);
    const items = top.map((r, i) => rowEl(this.i18n, i + 1, r, this.selfId));
    const selfIndex = this.rows.findIndex((r) => r.id === this.selfId);
    const self = this.rows[selfIndex];
    if (self && selfIndex >= this.size) items.push(rowEl(this.i18n, selfIndex + 1, self, this.selfId));
    this.el.replaceChildren(h("h3", {}, this.i18n.t("scoreboard.title")), h("ol", {}, ...items));
  }
}

/** Full player list overlay (hold Tab, or the HUD button on touch devices). */
export class PlayerList {
  readonly el = h("section", { className: "ui-playerlist", hidden: true, role: "dialog" });
  private rows: ScoreRow[] = [];
  private selfId?: string;

  constructor(private readonly i18n: I18n) {
    i18n.onChange(() => this.render());
  }

  update(rows: ScoreRow[], selfId?: string) {
    this.rows = sortRows(rows);
    this.selfId = selfId;
    if (this.isOpen) this.render();
  }

  setOpen(open: boolean) {
    this.el.hidden = !open;
    if (open) this.render();
  }

  get isOpen(): boolean {
    return this.el.hidden === false;
  }

  toggle() {
    this.setOpen(!this.isOpen);
  }

  private render() {
    this.el.replaceChildren(
      h("h3", {}, `${this.i18n.t("players.title")} (${this.i18n.formatNumber(this.rows.length)})`),
      h("ol", {}, ...this.rows.map((r, i) => rowEl(this.i18n, i + 1, r, this.selfId))),
    );
  }
}

export interface ChatLine {
  name?: string;
  text: string;
  /** System lines (joins, warnings) render differently. */
  system?: boolean;
}

/** How long chat lines stay fully visible while the chat input is closed. */
const CHAT_FADE_MS = 8000;
const CHAT_MAX_LINES = 50;

/**
 * Chat: a log that fades out while you play, and an input that opens with
 * Enter (or the 💬 button on touch). Text is always inserted as text, never
 * HTML, and each line gets dir="auto" so mixed scripts (Arabic + Latin) read correctly.
 */
export class Chat {
  readonly el: HTMLElement;
  private log = h("ol", { className: "ui-chat-log", "aria-live": "polite" });
  private input: HTMLInputElement;
  private form: HTMLFormElement;
  onSend?: (text: string) => void;

  constructor(
    private readonly i18n: I18n,
    maxLength: number,
  ) {
    this.input = h("input", {
      className: "ui-input ui-chat-input",
      type: "text",
      maxLength: maxLength * 2,
      dir: "auto",
      enterKeyHint: "send",
      autocomplete: "off",
      onkeydown: (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          this.close();
        }
      },
    });
    this.form = h(
      "form",
      {
        className: "ui-chat-form",
        hidden: true,
        onsubmit: (e: Event) => {
          e.preventDefault();
          const text = this.input.value.trim();
          if (text) this.onSend?.(text);
          this.input.value = "";
          this.close();
        },
      },
      this.input,
    );
    this.el = h("div", { className: "ui-chat" }, this.log, this.form);
    this.refreshLabels();
    i18n.onChange(() => this.refreshLabels());
  }

  get isOpen(): boolean {
    return !this.form.hidden;
  }

  open() {
    this.form.hidden = false;
    this.el.classList.add("open");
    this.input.focus();
  }

  close() {
    this.form.hidden = true;
    this.el.classList.remove("open");
    this.input.blur();
  }

  add(line: ChatLine) {
    const item = h(
      "li",
      { className: line.system ? "ui-chat-line system" : "ui-chat-line", dir: "auto" },
      line.name ? h("b", { dir: "auto" }, `${line.name}: `) : null,
      line.text,
    );
    this.log.append(item);
    while (this.log.childElementCount > CHAT_MAX_LINES) this.log.firstElementChild?.remove();
    setTimeout(() => item.classList.add("faded"), CHAT_FADE_MS);
  }

  addSystem(text: string) {
    this.add({ text, system: true });
  }

  clear() {
    this.log.replaceChildren();
    this.close();
  }

  private refreshLabels() {
    this.input.placeholder = this.i18n.t("chat.placeholder");
    this.input.setAttribute("aria-label", this.i18n.t("chat.placeholder"));
  }
}
