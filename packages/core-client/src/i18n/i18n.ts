import { CORE_MESSAGES, type CoreMessageKey } from "./coreMessages";
import { FALLBACK_LOCALE, LOCALE_INFO, LOCALES, type Locale, matchLocale } from "./locales";

/** A message with plural forms, chosen with Intl.PluralRules from `params.count`. */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export type Message = string | PluralMessage;
export type Messages = Record<string, Message>;

/**
 * Game strings per locale. English is required and is the fallback; other
 * locales may be partial (missing keys fall back to English).
 */
export type MessageCatalog = { en: Messages } & Partial<Record<Locale, Messages>>;

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: CoreMessageKey | (string & {}), params?: TranslateParams) => string;

/**
 * Minimal i18n: lookups with English fallback, `{param}` interpolation and plurals.
 *
 *   t("menu.play")                       → "Jogar"
 *   t("game.score", { score: 10 })       → "Pontos: 10"   ("Pontos: {score}")
 *   t("game.kills", { count: 1 })        → "1 abate"      ({ one: "{count} abate", other: "{count} abates" })
 */
export class I18n {
  private current: Locale = FALLBACK_LOCALE;
  private listeners = new Set<(locale: Locale) => void>();
  private pluralRules = new Map<Locale, Intl.PluralRules>();

  constructor(private readonly game: MessageCatalog = { en: {} }) {}

  get locale(): Locale {
    return this.current;
  }

  get dir(): "ltr" | "rtl" {
    return LOCALE_INFO[this.current].dir;
  }

  readonly t: Translate = (key, params) => {
    const message =
      this.game[this.current]?.[key] ??
      (CORE_MESSAGES[this.current] as Messages)[key] ??
      this.game.en[key] ??
      (CORE_MESSAGES.en as Messages)[key];
    if (message === undefined) return key;
    return interpolate(this.select(message, params), params);
  };

  setLocale(locale: Locale) {
    this.current = locale;
    if (typeof document !== "undefined") {
      document.documentElement.lang = LOCALE_INFO[locale].tag;
      document.documentElement.dir = LOCALE_INFO[locale].dir;
    }
    for (const fn of this.listeners) fn(locale);
  }

  /** Subscribes to locale changes. Returns an unsubscribe function. */
  onChange(fn: (locale: Locale) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Locale-aware number formatting (digits, separators). */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(LOCALE_INFO[this.current].tag, options).format(value);
  }

  private select(message: Message, params?: TranslateParams): string {
    if (typeof message === "string") return message;
    const count = Number(params?.count ?? 0);
    let rules = this.pluralRules.get(this.current);
    if (!rules) {
      rules = new Intl.PluralRules(LOCALE_INFO[this.current].tag);
      this.pluralRules.set(this.current, rules);
    }
    return message[rules.select(count)] ?? message.other;
  }
}

function interpolate(text: string, params?: TranslateParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/**
 * Picks the starting locale: saved choice → platform language → browser languages → English.
 */
export function detectLocale(options: {
  saved?: string | null;
  platform?: string | null;
  browser?: readonly string[];
}): Locale {
  for (const candidate of [options.saved, options.platform, ...(options.browser ?? [])]) {
    const match = matchLocale(candidate);
    if (match) return match;
  }
  return FALLBACK_LOCALE;
}

/** Keys present in English but missing in other locales. Use in a game test to track translation gaps. */
export function findMissingTranslations(catalog: MessageCatalog): Partial<Record<Locale, string[]>> {
  const result: Partial<Record<Locale, string[]>> = {};
  const keys = Object.keys(catalog.en);
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    const missing = keys.filter((k) => catalog[locale]?.[k] === undefined);
    if (missing.length > 0) result[locale] = missing;
  }
  return result;
}
