import { describe, expect, it } from "vitest";
import { CORE_MESSAGES } from "./coreMessages";
import { detectLocale, findMissingTranslations, I18n } from "./i18n";
import { LOCALES, matchLocale } from "./locales";

describe("I18n", () => {
  const i18n = new I18n({
    en: { "game.score": "Score: {score}", "game.kills": { one: "{count} kill", other: "{count} kills" }, only: "EN" },
    pt: { "game.score": "Pontos: {score}", "game.kills": { one: "{count} abate", other: "{count} abates" } },
    ru: {
      "game.kills": { one: "{count} убийство", few: "{count} убийства", many: "{count} убийств", other: "{count}" },
    },
  });

  it("translates core and game strings", () => {
    i18n.setLocale("pt");
    expect(i18n.t("menu.play")).toBe("Jogar");
    expect(i18n.t("game.score", { score: 10 })).toBe("Pontos: 10");
  });

  it("falls back to English, then to the key", () => {
    i18n.setLocale("pt");
    expect(i18n.t("only")).toBe("EN");
    expect(i18n.t("does.not.exist")).toBe("does.not.exist");
  });

  it("selects plural forms per language", () => {
    i18n.setLocale("pt");
    expect(i18n.t("game.kills", { count: 1 })).toBe("1 abate");
    expect(i18n.t("game.kills", { count: 3 })).toBe("3 abates");
    i18n.setLocale("ru");
    expect(i18n.t("game.kills", { count: 3 })).toBe("3 убийства");
    expect(i18n.t("game.kills", { count: 5 })).toBe("5 убийств");
  });

  it("reports right-to-left locales", () => {
    i18n.setLocale("ar");
    expect(i18n.dir).toBe("rtl");
    i18n.setLocale("ja");
    expect(i18n.dir).toBe("ltr");
  });
});

describe("locale detection", () => {
  it("normalizes language tags", () => {
    expect(matchLocale("pt-BR")).toBe("pt");
    expect(matchLocale("zh_Hans")).toBe("zh");
    expect(matchLocale("xx")).toBeUndefined();
  });

  it("prefers saved, then platform, then browser", () => {
    expect(detectLocale({ saved: "de", platform: "ru", browser: ["fr"] })).toBe("de");
    expect(detectLocale({ platform: "ru", browser: ["fr"] })).toBe("ru");
    expect(detectLocale({ browser: ["xx", "ko-KR"] })).toBe("ko");
    expect(detectLocale({})).toBe("en");
  });
});

describe("core messages", () => {
  it("are fully translated for every supported locale", () => {
    expect(findMissingTranslations(CORE_MESSAGES)).toEqual({});
    expect(Object.keys(CORE_MESSAGES).sort()).toEqual([...LOCALES].sort());
  });
});
