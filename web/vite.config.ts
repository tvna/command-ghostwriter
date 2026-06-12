import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { cpSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const pyodideDir = dirname(require.resolve("pyodide"));

// Self-host the vendored Pyodide distribution (jsdelivr CDN is blocked).
function vendorPyodide() {
  return {
    name: "vendor-pyodide",
    buildStart() {
      const dest = resolve(__dirname, "public/pyodide");
      // Always refresh from the (postinstall-vendored, wheel-populated) node_modules/pyodide
      // so the browser can loadPackage offline. A stale dest would silently lack wheels.
      rmSync(dest, { recursive: true, force: true });
      cpSync(pyodideDir, dest, { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), vendorPyodide()],
  server: {
    // Allow Vite to read ../features (single source of truth for the Python core).
    fs: { allow: [".."] },
  },
  worker: { format: "es" },
});
