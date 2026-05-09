import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("landing loads", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/ToDouss/i);
  });

  test("unknown workspace path does not crash the document", async ({ page }) => {
    const res = await page.goto("/this-workspace-slug-should-not-exist-12345", {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status()).toBeLessThan(500);
  });
});

/**
 * Clerk: hosted sign-in cannot be exercised in CI without a dedicated test instance.
 * When you add `@clerk/testing` or E2E Clerk API keys, extend this file with a signed-in
 * flow against a throwaway workspace (keep tests to a small fixed set to limit flake).
 */
