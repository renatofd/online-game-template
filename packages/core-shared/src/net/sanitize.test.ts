import { describe, expect, it } from "vitest";
import { sanitizeName } from "./sanitize";

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
});
