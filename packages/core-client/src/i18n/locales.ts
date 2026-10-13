/** Every locale the template supports. The first one is the fallback. */
export const LOCALES = ["en", "pt", "es", "fr", "de", "it", "tr", "ru", "ar", "hi", "id", "ja", "zh", "ko"] as const;
export type Locale = (typeof LOCALES)[number];

export const FALLBACK_LOCALE: Locale = "en";

export interface LocaleInfo {
  /** Name of the language in itself, for the language picker. */
  nativeName: string;
  /** Text direction. */
  dir: "ltr" | "rtl";
  /** BCP 47 tag for Intl APIs and the html `lang` attribute. */
  tag: string;
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  en: { nativeName: "English", dir: "ltr", tag: "en" },
  pt: { nativeName: "Português", dir: "ltr", tag: "pt-BR" },
  es: { nativeName: "Español", dir: "ltr", tag: "es" },
  fr: { nativeName: "Français", dir: "ltr", tag: "fr" },
  de: { nativeName: "Deutsch", dir: "ltr", tag: "de" },
  it: { nativeName: "Italiano", dir: "ltr", tag: "it" },
  tr: { nativeName: "Türkçe", dir: "ltr", tag: "tr" },
  ru: { nativeName: "Русский", dir: "ltr", tag: "ru" },
  ar: { nativeName: "العربية", dir: "rtl", tag: "ar" },
  hi: { nativeName: "हिन्दी", dir: "ltr", tag: "hi" },
  id: { nativeName: "Bahasa Indonesia", dir: "ltr", tag: "id" },
  ja: { nativeName: "日本語", dir: "ltr", tag: "ja" },
  zh: { nativeName: "简体中文", dir: "ltr", tag: "zh-CN" },
  ko: { nativeName: "한국어", dir: "ltr", tag: "ko" },
};

/** Maps any language tag ("pt-BR", "zh_Hans", "AR") to a supported locale, or undefined. */
export function matchLocale(tag: string | undefined | null): Locale | undefined {
  if (!tag) return undefined;
  const base = tag.toLowerCase().split(/[-_]/)[0];
  return (LOCALES as readonly string[]).includes(base ?? "") ? (base as Locale) : undefined;
}
