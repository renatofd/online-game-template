import { expect, test } from "@playwright/test";
import { joinMatch } from "./helpers";

test("touch devices get the virtual joystick", async ({ page }) => {
  await joinMatch(page, "Dani", "lang=pt");
  await expect(page.locator(".touch-controls")).toBeVisible();
  await expect(page.locator(".touch-stick-zone")).toBeVisible();
});
