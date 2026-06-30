import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000, // Pyodide boot in-browser is slow.
  use: {
    baseURL: "http://localhost:4173",
    // Fall back to the pre-installed Chromium when the version bundled with
    // this Playwright package is not available in PLAYWRIGHT_BROWSERS_PATH.
    ...(process.env.PLAYWRIGHT_BROWSERS_PATH
      ? {
          launchOptions: {
            executablePath: `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium-1194/chrome-linux/chrome`,
          },
        }
      : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4173",
    timeout: 240_000,
    reuseExistingServer: false,
  },
});
