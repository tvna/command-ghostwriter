import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [".."] } },
  test: {
    globals: true,
    // Node by default (Pyodide-in-Node keystone test); the component test opts into jsdom per-file.
    environment: "node",
    testTimeout: 120_000, // Pyodide boot + micropip install is slow on first run.
    hookTimeout: 120_000,
  },
});
