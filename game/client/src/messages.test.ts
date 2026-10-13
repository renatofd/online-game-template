import { findMissingTranslations } from "@core/client/i18n";
import { describe, expect, it } from "vitest";
import { messages } from "./messages";

describe("game messages", () => {
  it("are translated for every supported locale", () => {
    expect(findMissingTranslations(messages)).toEqual({});
  });
});
