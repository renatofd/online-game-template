import { describe, expect, it } from "vitest";
import { sanitizeChat, sanitizeName } from "./sanitize";

describe("sanitizeName", () => {
  it("trims and collapses whitespace", () => {
    expect(sanitizeName("  Ana   Maria ")).toBe("Ana Maria");
  });

  it("removes control and bidi-override characters", () => {
    expect(sanitizeName("Ana\u0007‮")).toBe("Ana");
  });

  it("keeps zero-width joiners needed by Indic scripts", () => {
    expect(sanitizeName("क्‍ष")).toBe("क्‍ष");
  });

  it("keeps non-Latin scripts", () => {
    expect(sanitizeName("محمد")).toBe("محمد");
    expect(sanitizeName("さくら")).toBe("さくら");
    expect(sanitizeName("अर्जुन")).toBe("अर्जुन");
  });

  it("limits length without splitting emoji", () => {
    expect(sanitizeName("👨‍👩‍👧‍👦👨‍👩‍👧‍👦👨‍👩‍👧‍👦", "P", 2)).toBe("👨‍👩‍👧‍👦👨‍👩‍👧‍👦");
  });

  it("falls back for empty or non-string input", () => {
    expect(sanitizeName("   ")).toBe("Player");
    expect(sanitizeName(42, "Guest")).toBe("Guest");
  });

  it("treats invisible-only names as empty", () => {
    expect(sanitizeName("\u3164\u3164")).toBe("Player");
    expect(sanitizeName("\u2800")).toBe("Player");
    expect(sanitizeName("\u200D")).toBe("Player");
  });

  it("bounds huge input and stacked combining marks", () => {
    const zalgo = `a${"\u0301".repeat(5000)}`;
    expect(sanitizeName(zalgo).length).toBeLessThanOrEqual(16 * 16);
    expect(sanitizeName("x".repeat(1_000_000))).toBe("x".repeat(16));
  });
});

describe("sanitizeChat", () => {
  it("keeps normal text and trims to the limit", () => {
    expect(sanitizeChat("  olá   mundo  ")).toBe("olá mundo");
    expect(sanitizeChat("x".repeat(500), 10)).toBe("x".repeat(10));
  });
  it("returns empty for garbage", () => {
    expect(sanitizeChat({ evil: true })).toBe("");
    expect(sanitizeChat("\u202E\u0000")).toBe("");
  });
});
