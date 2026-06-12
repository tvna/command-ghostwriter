import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000, // Pyodide boot in-browser is slow.
  use: { baseURL: "http://localhost:4173" },
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4173",
    timeout: 240_000,
    reuseExistingServer: false,
  },
});
