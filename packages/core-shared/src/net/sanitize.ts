/** Default maximum length for player display names. */
export const DEFAULT_MAX_NAME_LENGTH = 16;

/**
 * Normalizes a player-supplied display name: strips control and invisible
 * formatting characters, collapses whitespace and limits the length (by
 * user-perceived characters, so emoji and combining marks are not cut in half).
 * Works for every script (Latin, Arabic, Devanagari, CJK...).
 */
export function sanitizeName(raw: unknown, fallback = "Player", maxLength = DEFAULT_MAX_NAME_LENGTH): string {
  if (typeof raw !== "string") return fallback;
  const cleaned = raw
    .normalize("NFC")
    // Control chars (Cc) and format chars (Cf: bidi overrides, invisible marks...) can be used to
    // spoof names. ZWNJ/ZWJ (U+200C/U+200D) are kept: emoji sequences and Indic/Arabic text need them.
    .replace(/(?![\u200C\u200D])[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(cleaned)].map(
    (s) => s.segment,
  );
  const limited = graphemes.slice(0, maxLength).join("").trim();
  return limited.length > 0 ? limited : fallback;
}

/** Default maximum chat message length (grapheme clusters). */
export const DEFAULT_MAX_CHAT_LENGTH = 140;

/**
 * Normalizes a chat message: same character rules as names (no control or
 * bidi-override characters, collapsed whitespace), limited to `maxLength`
 * user-perceived characters. Returns "" for empty or invalid input.
 */
export function sanitizeChat(raw: unknown, maxLength = DEFAULT_MAX_CHAT_LENGTH): string {
  return sanitizeName(raw, "", maxLength);
}
