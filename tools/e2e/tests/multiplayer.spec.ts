import { expect, test } from "@playwright/test";
import { joinMatch, sessionId } from "./helpers";

test("two players join the same match", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const errors: string[] = [];
  for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));

  await joinMatch(a, "Alice");
  await joinMatch(b, "Bob");

  // Both are in the same room (the server reports two clients).
  const metrics = await (await fetch("http://localhost:2567/metrics")).text();
  expect(metrics).toMatch(/game_clients [2-9]/);
  expect(await sessionId(a)).not.toBe(await sessionId(b));
  expect(errors).toEqual([]);
});

test("pause menu leaves the match and returns to the main menu", async ({ page }) => {
  await joinMatch(page, "Carol");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Leave match" }).click();
  await expect(page.locator(".ui-menu")).toBeVisible();
  await expect(page.locator(".ui-input")).toHaveValue("Carol");
});

test("Arabic switches the interface to right-to-left", async ({ page }) => {
  await page.goto("/?lang=ar");
  await page.locator(".ui-menu").waitFor();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("button[type=submit]")).toHaveText("العب");
});
