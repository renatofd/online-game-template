import type { I18n } from "../i18n";
import { isTouchDevice } from "../input";
import { h, isTextField } from "./dom";

/** A screen is a function so it can be re-rendered when the language changes. */
export type ScreenRender = () => HTMLElement;

/**
 * DOM overlay above the canvas for menus, dialogs and HUD.
 *
 * Why DOM and not Phaser text: real text layout for every script (Arabic
 * shaping and RTL, Devanagari, CJK), crisp at any zoom, native inputs
 * (name field, IME, screen readers) and no font atlases to maintain.
 */
export class Ui {
  readonly root: HTMLDivElement;
  private screenHost: HTMLDivElement;
  readonly hudHost: HTMLDivElement;
  private rotateHint: HTMLDivElement;
  private renderScreen?: ScreenRender;
  private renderHud?: ScreenRender;

  constructor(
    parent: HTMLElement,
    private readonly i18n: I18n,
  ) {
    this.hudHost = h("div", { className: "ui-hud" });
    this.screenHost = h("div", { className: "ui-screen-host" });
    this.rotateHint = h("div", { className: "ui-rotate", hidden: true });
    this.root = h("div", { className: "ui-root" }, this.hudHost, this.screenHost, this.rotateHint);
    parent.append(this.root);
    i18n.onChange(() => this.rerender());
  }

  /** Shows a full-screen panel (menu, dialog...). Replaces the previous one. */
  show(render: ScreenRender) {
    this.renderScreen = render;
    this.screenHost.replaceChildren(render());
    this.screenHost.hidden = false;
    // Move focus into the dialog for keyboard and screen-reader users. Text fields are
    // skipped on touch devices: focusing them pops up the on-screen keyboard.
    const target =
      this.screenHost.querySelector<HTMLElement>("[autofocus]") ??
      this.screenHost.querySelector<HTMLElement>("button, input, select");
    if (target && !(isTouchDevice() && isTextField(target))) target.focus({ preventScroll: true });
  }

  /** True while `render` is the screen being shown. */
  isShowing(render: ScreenRender): boolean {
    return this.renderScreen === render;
  }

  hide() {
    this.renderScreen = undefined;
    this.screenHost.replaceChildren();
    this.screenHost.hidden = true;
  }

  get isScreenOpen(): boolean {
    return this.renderScreen !== undefined;
  }

  showHud(render: ScreenRender) {
    this.renderHud = render;
    this.hudHost.replaceChildren(render());
  }

  hideHud() {
    this.renderHud = undefined;
    this.hudHost.replaceChildren();
  }

  setRotateHint(visible: boolean) {
    this.rotateHint.hidden = !visible;
    this.rotateHint.textContent = this.i18n.t("rotate");
  }

  rerender() {
    if (this.renderScreen) this.screenHost.replaceChildren(this.renderScreen());
    if (this.renderHud) this.hudHost.replaceChildren(this.renderHud());
    if (!this.rotateHint.hidden) this.rotateHint.textContent = this.i18n.t("rotate");
  }
}
