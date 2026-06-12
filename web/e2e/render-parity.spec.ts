import { test, expect } from "@playwright/test";

test("renders the CSV+Jinja fixture in a real browser", async ({ page }) => {
  await page.goto("/");
  // Wait for Pyodide to finish booting in the worker.
  await expect(page.getByText("準備完了")).toBeVisible({ timeout: 180_000 });
  // App seeds the same fixture as the Node keystone test; assert byte-identical output
  // (textContent, not toHaveText, to preserve the exact newlines).
  await expect
    .poll(async () => await page.locator("pre").textContent(), { timeout: 60_000 })
    .toBe("1:100\n2:N/A\n3:300\n");
});
