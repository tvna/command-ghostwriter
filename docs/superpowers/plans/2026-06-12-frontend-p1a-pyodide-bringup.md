# Frontend P1a: Pyodide Worker Bring-up + Render-Parity Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that the tested Python core (`features/`) runs unmodified inside a self-hosted browser Pyodide runtime and produces byte-identical rendered output to CPython, behind a thin `postMessage` worker contract with a minimal React harness.

**Architecture:** Greenfield Vite + React + TypeScript app under `web/`. A Web Worker boots a **self-hosted** Pyodide (vendored from the npm `pyodide` package — the public jsdelivr CDN is blocked by this environment's network policy, confirmed 403), mounts the repo's `features/*.py` into the Pyodide FS via Vite `?raw` glob (single source of truth, no copy/duplication), installs the five third-party deps `features/` actually imports, and exposes a `init`/`generate`/`ready`/`error` contract. The UI thread wraps two editor strings into the worker request and renders the result. The keystone verification — `features/` running in Pyodide and matching CPython render output — runs in **Vitest on Node** (Pyodide runs under Node, so no browser is required for the primary gate); a Playwright e2e proves the same in a real browser build.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Vitest 2, `pyodide` (npm, self-hosted), Playwright (e2e, browser-dependent). Python deps loaded into Pyodide via micropip: `jinja2`, `pyyaml`, `pydantic`, `chardet` (`markupsafe` auto-resolves as a jinja2 dependency).

**Scope boundary (what this plan deliberately defers):** CodeMirror 6 editors, drag-and-drop, settings drawer (旧tab3), samples menu (旧tab4), how-to modal (旧tab5), markdown/config-debug preview modes, client-side download, i18n catalog, and Vercel deployment are all **out of scope for P1a** and belong to later sub-plans (P1b/P1c) written after this bring-up is proven. P1a uses two plain `<textarea>`s and a `<pre>` output purely to exercise the worker end-to-end.

**Verification honesty (standards §1, spec §テスト戦略):**
- Primary gate (Tasks 1–3): Vitest on Node — runnable in this environment now (npm 200, PyPI 200). No browser needed.
- Secondary gate (Task 4): Playwright e2e — requires `npx playwright install chromium` (network-dependent). If chromium cannot be installed/run in the execution environment, mark the e2e **"未検証 (ローカル)"** explicitly and rely on CI to run it; never substitute an indirect signal for the browser proof.

---

## File Structure

All new files live under `web/` (sibling to `features/`). The existing root `package.json` (Electron/stlite) is left untouched; `web/` has its own `package.json`.

| Path | Responsibility |
| --- | --- |
| `web/package.json` | Frontend package manifest, scripts, deps (own npm root, isolated from root Electron package). |
| `web/vite.config.ts` | Vite build config: React plugin, `server.fs.allow` to read `../features`, copy vendored Pyodide assets to `public/pyodide/`, worker format. |
| `web/vitest.config.ts` | Vitest config: Node environment for worker/Pyodide tests, jsdom for component test. |
| `web/tsconfig.json` | TypeScript config. |
| `web/index.html` | Vite entry HTML. |
| `web/src/main.tsx` | React mount point. |
| `web/src/App.tsx` | Minimal harness: two `<textarea>`s + button + `<pre>` output + error banner; debounced worker calls. |
| `web/src/worker/features-sources.ts` | Vite `?raw` glob importing `../../../features/**/*.py` into a `{ relPath: source }` map (single source of truth). |
| `web/src/worker/pyodide-runtime.ts` | Environment-agnostic bootstrap + generate logic (takes a `loadPyodide` fn + indexURL); reusable by both the browser worker and the Node test. |
| `web/src/worker/generate.worker.ts` | Browser Web Worker: wires `pyodide-runtime` to `postMessage` (`init`/`generate`/`ready`/`error`). |
| `web/src/worker/types.ts` | Shared TS types for the worker message contract and settings. |
| `web/src/worker/pyodide-runtime.node.test.ts` | **Keystone** Vitest (Node): boots Pyodide, runs `features/` AppCore on a known CSV+Jinja fixture, asserts byte-identical render parity with CPython. |
| `web/src/worker/contract.test.ts` | Vitest: verifies the `init`/`generate`/`ready`/`error` message-shape handling of `pyodide-runtime` generate wrapper. |
| `web/src/App.test.tsx` | Vitest (jsdom): component test with a mocked worker — debounce, output render, error banner. |
| `web/e2e/render-parity.spec.ts` | Playwright e2e: load built site, type fixture, assert rendered output (browser proof). |
| `web/playwright.config.ts` | Playwright config pointing at `vite preview`. |
| `web/.gitignore` | Ignore `node_modules`, `dist`, `public/pyodide` (vendored at build), Playwright artifacts. |

**Render delivery into Pyodide (decision, no placeholder):** `features/*.py` are imported as raw strings at build time via `import.meta.glob('../../../features/**/*.py', { query: '?raw', eager: true, import: 'default' })` and written into the Pyodide FS under `/features/...` at worker init, then `import features` after `sys.path.insert(0, "/")`. This keeps `features/` as the **single source of truth** — no tarball, no copy step, no duplication. Dev mode requires `server.fs.allow: ['..']` so Vite can read the parent `features/` dir; build inlines the strings.

**Pyodide vendoring (decision):** Pyodide core + its bundled package distribution are self-hosted from `node_modules/pyodide` — the browser worker loads from `/pyodide/` (copied to `public/pyodide/` by a Vite plugin at build), the Node test loads from `node_modules/pyodide` directly. No request ever goes to jsdelivr (blocked). Pure-Python wheels not in the bundled distribution are fetched by micropip from PyPI (reachable, 200).

---

### Task 0: Scaffold `web/` and vendor Pyodide

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/vite.config.ts`, `web/index.html`, `web/src/main.tsx`, `web/src/App.tsx` (stub), `web/.gitignore`

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "command-ghostwriter-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 4173 --strictPort",
    "test": "vitest run",
    "e2e": "playwright test"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.56.1",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "pyodide": "^0.26.4",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src", "e2e"]
}
```

- [ ] **Step 3: Create `web/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { cpSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const pyodideDir = dirname(require.resolve("pyodide"));

// Self-host the vendored Pyodide distribution (jsdelivr CDN is blocked).
function vendorPyodide() {
  return {
    name: "vendor-pyodide",
    buildStart() {
      const dest = resolve(__dirname, "public/pyodide");
      if (!existsSync(dest)) {
        cpSync(pyodideDir, dest, { recursive: true });
      }
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
```

- [ ] **Step 4: Create `web/index.html`**

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Command Ghostwriter</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `web/src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: Create `web/src/App.tsx` (stub, fleshed out in Task 3)**

```tsx
export function App() {
  return <main>Command Ghostwriter</main>;
}
```

- [ ] **Step 7: Create `web/.gitignore`**

```gitignore
node_modules
dist
dist-ssr
public/pyodide
test-results
playwright-report
*.local
```

- [ ] **Step 8: Install deps and verify the scaffold builds**

Run:
```bash
cd web && npm install && npm run build
```
Expected: `npm install` resolves (network 200), `tsc -b` passes, `vite build` emits `dist/` with no errors. The `vendor-pyodide` plugin copies `node_modules/pyodide` into `web/public/pyodide` (so `dist/pyodide/` is present).

- [ ] **Step 9: Commit**

```bash
git add web/package.json web/package-lock.json web/tsconfig.json web/vite.config.ts web/index.html web/src/main.tsx web/src/App.tsx web/.gitignore
git commit -m "feat(web): scaffold Vite+React+TS shell with self-hosted Pyodide (#<ISSUE>)"
```

---

### Task 1: Pyodide runtime bootstrap + keystone render-parity test (Node)

This is the highest-risk, highest-value task: it proves `features/` runs in Pyodide with identical output to CPython, using Vitest on Node (no browser).

**Files:**
- Create: `web/src/worker/types.ts`, `web/src/worker/features-sources.ts`, `web/src/worker/pyodide-runtime.ts`
- Test: `web/src/worker/pyodide-runtime.node.test.ts`
- Create: `web/vitest.config.ts`

- [ ] **Step 1: Create `web/vitest.config.ts`**

```ts
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
```

- [ ] **Step 2: Create `web/src/worker/types.ts`**

```ts
export interface GenerateSettings {
  csvRowsName: string;
  enableAutoTranscoding: boolean;
  enableFillNan: boolean;
  fillNanWith: string;
  formatType: number; // 0..4
  isStrictUndefined: boolean;
}

export interface GenerateRequest {
  configText: string;
  configName: string; // e.g. "config.csv" — extension drives parser selection
  templateText: string;
  templateName: string; // e.g. "template.j2"
  settings: GenerateSettings;
}

export interface GenerateResult {
  output: string | null;
  configError: string | null;
  templateError: string | null;
}

export const DEFAULT_SETTINGS: GenerateSettings = {
  csvRowsName: "csv_rows",
  enableAutoTranscoding: true,
  enableFillNan: true,
  fillNanWith: "#",
  formatType: 0,
  isStrictUndefined: true,
};

// Browser worker message contract.
export type WorkerInbound =
  | { kind: "init" }
  | { kind: "generate"; id: number; request: GenerateRequest };

export type WorkerOutbound =
  | { kind: "ready" }
  | { kind: "result"; id: number; result: GenerateResult }
  | { kind: "error"; id: number | null; message: string };
```

- [ ] **Step 3: Create `web/src/worker/features-sources.ts`**

```ts
// Import every features/*.py as a raw string at build time (single source of truth).
// Keys look like "../../../features/core.py"; we normalize to "features/core.py".
const raw = import.meta.glob("../../../features/**/*.py", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

export const FEATURES_SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(raw).map(([key, source]) => {
    const idx = key.lastIndexOf("features/");
    return [key.slice(idx), source];
  }),
);
```

- [ ] **Step 4: Create `web/src/worker/pyodide-runtime.ts`**

```ts
import type { GenerateRequest, GenerateResult } from "./types";
import { FEATURES_SOURCES } from "./features-sources";

// Minimal structural type for the bits of the Pyodide API we use.
export interface PyodideLike {
  FS: {
    mkdirTree(path: string): void;
    writeFile(path: string, data: string, opts?: { encoding: string }): void;
  };
  loadPackage(names: string[]): Promise<void>;
  pyimport(name: string): { install(reqs: string[]): Promise<void> };
  runPythonAsync(code: string): Promise<unknown>;
  globals: { get(name: string): unknown };
}

export type LoadPyodideFn = (opts: { indexURL: string }) => Promise<PyodideLike>;

// Third-party packages that features/ actually imports.
// markupsafe resolves automatically as a jinja2 dependency.
const PY_DEPS = ["jinja2", "pyyaml", "pydantic", "chardet"];

export async function bootstrapRuntime(
  loadPyodide: LoadPyodideFn,
  indexURL: string,
): Promise<PyodideLike> {
  const pyodide = await loadPyodide({ indexURL });

  // micropip resolves from the bundled Pyodide distribution first, PyPI otherwise.
  await pyodide.loadPackage(["micropip"]);
  const micropip = pyodide.pyimport("micropip");
  await micropip.install(PY_DEPS);

  // Mount features/ into the Pyodide FS (single source of truth, written verbatim).
  for (const [relPath, source] of Object.entries(FEATURES_SOURCES)) {
    const dir = relPath.slice(0, relPath.lastIndexOf("/"));
    pyodide.FS.mkdirTree("/" + dir);
    pyodide.FS.writeFile("/" + relPath, source, { encoding: "utf8" });
  }

  await pyodide.runPythonAsync(`
import sys
if "/" not in sys.path:
    sys.path.insert(0, "/")
import features.core  # fail loudly here if a dep or import is missing
`);

  return pyodide;
}

export async function generate(
  pyodide: PyodideLike,
  request: GenerateRequest,
): Promise<GenerateResult> {
  // Pass the request as a JSON string to avoid proxy lifetime concerns.
  const payload = JSON.stringify(request);
  const code = `
import json
from io import BytesIO
from features.core import AppCore

req = json.loads(${"`"}${"${payload}"}${"`"})
s = req["settings"]

config_file = BytesIO(req["configText"].encode("utf-8"))
config_file.name = req["configName"]
template_file = BytesIO(req["templateText"].encode("utf-8"))
template_file.name = req["templateName"]

core = AppCore("設定定義ファイルの読み込みに失敗", "Jinjaテンプレートの読み込みに失敗")
core.load_config_file(
    config_file,
    s["csvRowsName"],
    s["enableAutoTranscoding"],
    s["enableFillNan"],
    s["fillNanWith"],
).load_template_file(
    template_file,
    s["enableAutoTranscoding"],
).apply(
    s["formatType"],
    s["isStrictUndefined"],
)

json.dumps({
    "output": core.formatted_text,
    "configError": core.config_error_message,
    "templateError": core.template_error_message,
})
`;
  const resultJson = (await pyodide.runPythonAsync(code)) as string;
  return JSON.parse(resultJson) as GenerateResult;
}
```

> NOTE for the implementer: the template-literal interpolation of `payload` above must produce a Python triple-backtick-free string. Use `json.dumps`/`json.loads` round-tripping via a Python raw string assigned from a JS template literal. Concretely, build the Python `req = json.loads(<js-injected JSON string literal>)` by passing the JSON through `JSON.stringify` once more so it becomes a valid Python string literal, e.g. `const pyLiteral = JSON.stringify(payload);` then embed `json.loads(${pyLiteral})`. Replace the fragile inline form with: `` const code = \`...\nreq = json.loads(${JSON.stringify(payload)})\n...\`; ``. This guarantees no quoting/backtick injection.

- [ ] **Step 5: Write the failing keystone test `web/src/worker/pyodide-runtime.node.test.ts`**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { loadPyodide } from "pyodide";
import { bootstrapRuntime, generate, type PyodideLike } from "./pyodide-runtime";
import { DEFAULT_SETTINGS } from "./types";

const require = createRequire(import.meta.url);
const indexURL = dirname(require.resolve("pyodide"));

describe("features/ render parity in Pyodide (Node)", () => {
  let pyodide: PyodideLike;

  beforeAll(async () => {
    pyodide = await bootstrapRuntime(
      loadPyodide as unknown as Parameters<typeof bootstrapRuntime>[0],
      indexURL,
    );
  }, 120_000);

  it("renders a CSV+Jinja fixture byte-identically to the CPython golden", async () => {
    // Mirrors tests/unit/test_config_parser.py::test_csv_render_layer_parity:
    // ints stay ints (1/3/100/300), "N/A" stays the literal string (#396 na-strings),
    // and the rendered output is exactly "1:100\n2:N/A\n3:300\n".
    const result = await generate(pyodide, {
      configText: "id,value\n1,100\n2,N/A\n3,300\n",
      configName: "config.csv",
      templateText: "{% for r in csv_rows %}{{ r.id }}:{{ r.value }}\n{% endfor %}",
      templateName: "template.j2",
      settings: DEFAULT_SETTINGS,
    });

    expect(result.configError).toBeNull();
    expect(result.templateError).toBeNull();
    expect(result.output).toBe("1:100\n2:N/A\n3:300\n");
  });
});
```

- [ ] **Step 6: Run the test to verify it fails first (red)**

Run:
```bash
cd web && npx vitest run src/worker/pyodide-runtime.node.test.ts
```
Expected at this point: FAIL — but it must fail for the *right* reason. Before the implementation of Step 4 is correct, expect either an import error or an assertion mismatch. (If `pyodide-runtime.ts` is already written per Step 4, this step instead confirms the path is exercised; intentionally break the expected string to "WRONG" once to see a red, then restore — documenting the test genuinely discriminates.)

- [ ] **Step 7: Make it pass (green)**

Ensure Step 4's `pyodide-runtime.ts` is correct (especially the `JSON.stringify(payload)` embedding noted above). Re-run:
```bash
cd web && npx vitest run src/worker/pyodide-runtime.node.test.ts
```
Expected: PASS. **This is the keystone gate** — `features/` runs unmodified in Pyodide and matches the CPython render golden. If micropip cannot install a dep (network), STOP and re-plan the vendoring (do not stub it out).

- [ ] **Step 8: Add a second parity case (TOML path) to prove non-CSV formats**

Append to the test file:
```ts
  it("renders a TOML+Jinja fixture", async () => {
    const result = await generate(pyodide, {
      configText: 'name = "world"\ncount = 3\n',
      configName: "config.toml",
      templateText: "Hello {{ name }} x{{ count }}",
      templateName: "template.j2",
      settings: DEFAULT_SETTINGS,
    });
    expect(result.configError).toBeNull();
    expect(result.templateError).toBeNull();
    expect(result.output).toBe("Hello world x3");
  });
```
Run the same command; expected: both tests PASS.

- [ ] **Step 9: Commit**

```bash
git add web/vitest.config.ts web/src/worker/types.ts web/src/worker/features-sources.ts web/src/worker/pyodide-runtime.ts web/src/worker/pyodide-runtime.node.test.ts
git commit -m "feat(web): boot Pyodide and prove features/ render parity in Node (#<ISSUE>)"
```

---

### Task 2: Browser worker message contract

**Files:**
- Create: `web/src/worker/generate.worker.ts`
- Test: `web/src/worker/contract.test.ts`

- [ ] **Step 1: Write the failing contract test `web/src/worker/contract.test.ts`**

This test exercises the generate wrapper's result shape directly (the worker's `postMessage` plumbing is thin and proven indirectly by the e2e in Task 4). It reuses the booted runtime to assert error-path shape.

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { loadPyodide } from "pyodide";
import { bootstrapRuntime, generate, type PyodideLike } from "./pyodide-runtime";
import { DEFAULT_SETTINGS } from "./types";

const require = createRequire(import.meta.url);
const indexURL = dirname(require.resolve("pyodide"));

describe("generate() result contract", () => {
  let pyodide: PyodideLike;
  beforeAll(async () => {
    pyodide = await bootstrapRuntime(
      loadPyodide as unknown as Parameters<typeof bootstrapRuntime>[0],
      indexURL,
    );
  }, 120_000);

  it("surfaces a config parse error in configError (loud, not swallowed)", async () => {
    const result = await generate(pyodide, {
      configText: "id,value\n1,2,3\n", // more fields than header -> loud error (#396)
      configName: "config.csv",
      templateText: "x",
      templateName: "template.j2",
      settings: DEFAULT_SETTINGS,
    });
    expect(result.output).toBeNull();
    expect(result.configError).toContain("Failed to parse CSV");
  });

  it("surfaces a template error in templateError", async () => {
    const result = await generate(pyodide, {
      configText: 'name = "x"\n',
      configName: "config.toml",
      templateText: "{% for %}", // invalid jinja syntax
      templateName: "template.j2",
      settings: DEFAULT_SETTINGS,
    });
    expect(result.output).toBeNull();
    expect(result.templateError).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails/passes appropriately**

Run:
```bash
cd web && npx vitest run src/worker/contract.test.ts
```
Expected: PASS (the generate logic from Task 1 already supports these paths). If `configError`/`templateError` come back null when they should be set, that is a real defect in the Step-4 generate wrapper — fix it, do not relax the assertion.

- [ ] **Step 3: Write `web/src/worker/generate.worker.ts`**

```ts
import { loadPyodide } from "pyodide";
import { bootstrapRuntime, generate, type PyodideLike } from "./pyodide-runtime";
import type { WorkerInbound, WorkerOutbound } from "./types";

let runtime: PyodideLike | null = null;

function post(msg: WorkerOutbound) {
  (self as unknown as Worker).postMessage(msg);
}

self.onmessage = async (event: MessageEvent<WorkerInbound>) => {
  const msg = event.data;
  try {
    if (msg.kind === "init") {
      runtime = await bootstrapRuntime(
        loadPyodide as unknown as Parameters<typeof bootstrapRuntime>[0],
        // Self-hosted distribution copied to /pyodide/ by the vendor-pyodide plugin.
        new URL("/pyodide/", self.location.origin).toString(),
      );
      post({ kind: "ready" });
      return;
    }
    if (msg.kind === "generate") {
      if (runtime === null) {
        post({ kind: "error", id: msg.id, message: "runtime not initialized" });
        return;
      }
      const result = await generate(runtime, msg.request);
      post({ kind: "result", id: msg.id, result });
    }
  } catch (err) {
    const id = msg.kind === "generate" ? msg.id : null;
    post({ kind: "error", id, message: err instanceof Error ? err.message : String(err) });
  }
};
```

- [ ] **Step 4: Typecheck the worker compiles**

Run:
```bash
cd web && npx tsc -b --noEmit
```
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add web/src/worker/generate.worker.ts web/src/worker/contract.test.ts
git commit -m "feat(web): add generate worker with init/generate/ready/error contract (#<ISSUE>)"
```

---

### Task 3: Minimal React harness with debounced worker calls

**Files:**
- Modify: `web/src/App.tsx`
- Test: `web/src/App.test.tsx`

- [ ] **Step 1: Write the failing component test `web/src/App.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "./App";

// Mock the worker module so the component test never boots Pyodide.
const postMessage = vi.fn();
let onmessage: ((e: MessageEvent) => void) | null = null;

vi.mock("./worker/generate.worker?worker", () => ({
  default: class {
    postMessage = postMessage;
    set onmessage(fn: (e: MessageEvent) => void) {
      onmessage = fn;
    }
    terminate() {}
  },
}));

describe("App harness", () => {
  beforeEach(() => {
    postMessage.mockClear();
    onmessage = null;
  });

  it("sends init on mount and shows output from a result message", async () => {
    render(<App />);
    // init dispatched on mount
    await waitFor(() => expect(postMessage).toHaveBeenCalledWith({ kind: "init" }));

    // simulate worker ready, then a result
    onmessage?.({ data: { kind: "ready" } } as MessageEvent);
    onmessage?.({
      data: { kind: "result", id: expect.any(Number), result: { output: "HELLO", configError: null, templateError: null } },
    } as unknown as MessageEvent);

    await waitFor(() => expect(screen.getByText("HELLO")).toBeTruthy());
  });

  it("shows an error banner when result carries configError", async () => {
    render(<App />);
    onmessage?.({ data: { kind: "ready" } } as MessageEvent);
    onmessage?.({
      data: { kind: "result", id: 1, result: { output: null, configError: "bad csv", templateError: null } },
    } as unknown as MessageEvent);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("bad csv"));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run:
```bash
cd web && npx vitest run src/App.test.tsx
```
Expected: FAIL — `App` is still the stub from Task 0.

- [ ] **Step 3: Implement `web/src/App.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import GenerateWorker from "./worker/generate.worker?worker";
import type { WorkerOutbound, GenerateResult } from "./worker/types";
import { DEFAULT_SETTINGS } from "./worker/types";

const DEBOUNCE_MS = 250;

export function App() {
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState("id,value\n1,100\n2,N/A\n3,300\n");
  const [template, setTemplate] = useState(
    "{% for r in csv_rows %}{{ r.id }}:{{ r.value }}\n{% endfor %}",
  );
  const [result, setResult] = useState<GenerateResult | null>(null);

  useEffect(() => {
    const worker = new GenerateWorker();
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<WorkerOutbound>) => {
      const msg = e.data;
      if (msg.kind === "ready") setReady(true);
      else if (msg.kind === "result") setResult(msg.result);
      else if (msg.kind === "error")
        setResult({ output: null, configError: msg.message, templateError: null });
    };
    worker.postMessage({ kind: "init" });
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handle = setTimeout(() => {
      const id = ++idRef.current;
      workerRef.current?.postMessage({
        kind: "generate",
        id,
        request: {
          configText: config,
          configName: "config.csv",
          templateText: template,
          templateName: "template.j2",
          settings: DEFAULT_SETTINGS,
        },
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [config, template, ready]);

  const error = result?.configError ?? result?.templateError ?? null;

  return (
    <main>
      <h1>Command Ghostwriter</h1>
      <p>{ready ? "ready" : "loading Pyodide…"}</p>
      <textarea aria-label="config" value={config} onChange={(e) => setConfig(e.target.value)} />
      <textarea aria-label="template" value={template} onChange={(e) => setTemplate(e.target.value)} />
      {error && <div role="alert">{error}</div>}
      <pre>{result?.output ?? ""}</pre>
    </main>
  );
}
```

- [ ] **Step 4: Run the component test (green)**

Run:
```bash
cd web && npx vitest run src/App.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Run the full Vitest suite and build**

Run:
```bash
cd web && npx vitest run && npm run build
```
Expected: all Vitest files PASS; `npm run build` emits `dist/`.

- [ ] **Step 6: Commit**

```bash
git add web/src/App.tsx web/src/App.test.tsx
git commit -m "feat(web): wire debounced worker calls into minimal React harness (#<ISSUE>)"
```

---

### Task 4: Playwright e2e render-parity smoke (browser proof)

**Files:**
- Create: `web/playwright.config.ts`, `web/e2e/render-parity.spec.ts`

**Verification caveat (standards §1):** This task requires `npx playwright install chromium`, which downloads a browser over the network. If the execution environment cannot install/run chromium, **mark this task "未検証 (ローカル)"** in the task report and rely on CI to run it. Do NOT delete the test or claim it passed without running it.

- [ ] **Step 1: Create `web/playwright.config.ts`**

```ts
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
```

- [ ] **Step 2: Write `web/e2e/render-parity.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("renders the CSV+Jinja fixture in a real browser", async ({ page }) => {
  await page.goto("/");
  // Wait for Pyodide to finish booting in the worker.
  await expect(page.getByText("ready")).toBeVisible({ timeout: 180_000 });
  // App seeds the same fixture as the Node keystone test; assert identical output.
  await expect(page.locator("pre")).toHaveText("1:100\n2:N/A\n3:300\n", { timeout: 60_000 });
});
```

- [ ] **Step 3: Install chromium and run the e2e**

Run:
```bash
cd web && npx playwright install chromium && npx playwright test
```
Expected: PASS (browser proves the same parity as the Node keystone). If chromium install fails due to the network policy, record "未検証 (ローカル) — CIで実行" and proceed.

- [ ] **Step 4: Commit**

```bash
git add web/playwright.config.ts web/e2e/render-parity.spec.ts
git commit -m "test(web): add Playwright render-parity e2e smoke (#<ISSUE>)"
```

---

### Task 5: CI wiring for the `web/` workspace

The repo's CI must run the new Vitest suite (and the e2e where a browser is available) so the keystone gate is enforced on every PR. This task adds a minimal job; the existing Python jobs are untouched.

**Files:**
- Modify: `.github/workflows/` — add a `web` job (exact file determined at execution by reading the existing workflow layout; do not guess the filename).

- [ ] **Step 1: Inspect the existing workflow structure**

Run:
```bash
ls .github/workflows
```
Read the most relevant CI workflow to find where jobs are defined and how Node is set up (if at all). Record the matrix/runner conventions.

- [ ] **Step 2: Add a `web-test` job**

Add a job that: checks out, sets up Node 22, runs `cd web && npm ci && npm run build && npx vitest run`. Gate the Playwright e2e behind `npx playwright install --with-deps chromium` only if the runner supports it; otherwise keep e2e as a separate allow-listed job. Match the existing workflow's style (concurrency, permissions, `runs-on`).

```yaml
  web-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: Install and build web
        run: |
          cd web
          npm ci
          npm run build
      - name: Vitest (Pyodide-in-Node keystone)
        run: |
          cd web
          npx vitest run
```

- [ ] **Step 3: Verify the workflow is valid YAML**

Run:
```bash
npx --yes yaml-lint .github/workflows/<edited-file> 2>/dev/null || python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/<edited-file>'))"
```
Expected: no parse error.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/<edited-file>
git commit -m "ci(web): run web Vitest keystone suite on PRs (#<ISSUE>)"
```

---

## Self-Review

**1. Spec coverage (against `2026-06-12-streamlit-to-vercel-migration-design.md`):**
- Pyodide Web Worker, self-host/CDN非依存 → Tasks 0/1/2 (vendored, jsdelivr never used). ✓
- `features/` reused unmodified, BytesIO+`.name` IF → Task 1 generate wrapper. ✓
- micropip deps (jinja2/pyyaml/pydantic/chardet; markupsafe transitive) → Task 1 `PY_DEPS`. ✓ (python-box/toml correctly excluded — app.py-only, P2.)
- Thin postMessage contract init/generate/ready/error → Task 2. ✓
- 250ms debounce, UI non-blocking → Task 3. ✓
- Inline error banner (config=parse, template) → Task 3 `role="alert"`. ✓
- Render-layer parity as the acceptance criterion (not dict compare) → Tasks 1/4 assert exact rendered strings, matching `test_csv_render_layer_parity`. ✓
- Vitest (component) + Playwright (built static e2e) → Tasks 3/4. ✓
- Verifiability honesty for browser-dependent checks → Task 4 caveat. ✓
- **Deferred (NOT in P1a, by design):** CodeMirror, D&D, settings drawer, samples, how-to modal, markdown/config-debug modes, download, i18n catalog, Vercel deploy + runbook. These are P1b/P1c — flagged in the plan header scope boundary.

**2. Placeholder scan:** The only intentional `<ISSUE>` / `<edited-file>` tokens are resolved at execution (issue number created at handoff; workflow filename read in Task 5 Step 1). All code steps contain complete code. The Step-4 `generate` string-embedding subtlety is called out explicitly with the concrete `JSON.stringify(payload)` fix rather than left vague.

**3. Type consistency:** `GenerateRequest`/`GenerateResult`/`GenerateSettings`/`WorkerInbound`/`WorkerOutbound`/`DEFAULT_SETTINGS` defined once in `types.ts` (Task 1) and consumed identically in Tasks 2–4. `bootstrapRuntime(loadPyodide, indexURL)` and `generate(pyodide, request)` signatures are stable across the Node test, the contract test, and the browser worker. `PyodideLike` is the single structural type used everywhere.

**Open dependency for execution:** A GitHub issue (sub-issue of #395) must be opened before the first commit; its number replaces `<ISSUE>` in every commit message. Commits are authored `noreply@anthropic.com` / `Claude` and re-authored if they land Unverified (per session convention). PRs/merges through P3 are pre-authorized by the owner.
