import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [".."] } },
  test: {
    globals: true,
    // Only collect unit/component tests under src/. The Playwright e2e specs in e2e/
    // are run by `playwright test`, not Vitest (their `test` import is incompatible).
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Node by default (Pyodide-in-Node keystone test); the component test opts into jsdom per-file.
    environment: "node",
    testTimeout: 120_000, // Pyodide boot + micropip install is slow on first run.
    hookTimeout: 120_000,
  },
});
