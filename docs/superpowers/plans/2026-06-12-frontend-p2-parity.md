# Frontend P2: config-debug, how-to modal, full settings parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Bring the browser-side app to feature parity with the remaining Streamlit tabs: a config-debug view (parsed config as JSON/TOML/YAML, old tab2), a how-to/workflow modal (old tab5), and full settings parity including Shift_JIS download.

**Architecture:** UI-thread work in `web/src/` plus small, additive extensions to the worker `generate`/contract for data the UI needs (the parsed config dict; on-demand encoded download bytes). The proven worker pipeline, render-parity keystone, and the `scripts/ci-parity.sh` pre-push gate are unchanged.

**Tech Stack:** React 18 + TS, existing worker; `js-yaml` + `smol-toml` for client-side re-serialization of the config dict (P2-1b), worker Python `formatted_text.encode(...)` for Shift_JIS (P2-3).

---

## Decomposition into mergeable increments

| Increment | Scope | Replaces |
| --- | --- | --- |
| **P2-1** | Config-debug view: worker returns the parsed config as a formatted JSON string (`configDebug`); a third preview mode ("Config") shows it | old tab2 (JSON) |
| **P2-2** | How-to / workflow modal: a modal showing the workflow diagram SVG (`assets/images/`) + the sidebar usage text | old tab5 |
| **P2-3** | Full settings parity: download **encoding** selector (utf-8 / Shift_JIS) routed through the worker's Python `formatted_text.encode(encoding)`; any remaining tab3 fields | tab3 download encoding |

(YAML/TOML config-debug views are P2-1b, layered on P2-1 with `js-yaml` + `smol-toml`. Vercel deploy is a separate P1 deliverable tracked apart from P2.)

This file fully details **P2-1**; later increments are detailed when reached.

---

## P2-1: Config-debug view (JSON)

**Files:**
- Modify: `web/src/worker/pyodide-runtime.ts` (add `configDebug` to the generate result)
- Modify: `web/src/worker/types.ts` (`GenerateResult.configDebug: string`)
- Modify: `web/src/components/Preview.tsx` (add a `config` mode rendering the debug string in a `<pre>`)
- Modify: `web/src/App.tsx` (third preview-mode option "Config")
- Test: `web/src/worker/pyodide-runtime.node.test.ts` (assert `configDebug` is populated JSON for a known config), `web/src/components/Preview.test.tsx` (config mode renders the string)

### Design (no placeholders)
- The Python `generate` wrapper already has `core.config_dict`. Add a config-debug string built with `json.dumps(core.config_dict, indent=2, ensure_ascii=False, default=str)` (empty string when `config_dict is None`). This is embedded as a STRING value in the existing outer `json.dumps`, so a CSV `NaN` in the dict only appears as display text inside that string -- it never breaks the outer envelope's JSON (the JS side parses `configDebug` as an opaque string).
- `GenerateResult` gains `configDebug: string`.
- The preview gains a third mode `config` that shows `<pre>{configDebug}</pre>` (raw, not markdown). Text stays the default so the render-parity e2e is unaffected.

- [ ] **Step 1: Extend `GenerateResult` in `web/src/worker/types.ts`**

Add `configDebug: string;` to the `GenerateResult` interface (after `templateError`).

- [ ] **Step 2: Extend the Python generate result in `web/src/worker/pyodide-runtime.ts`**

In the `generate` function's Python code array, before the final `json.dumps({...})`, add:
```
"config_debug = json.dumps(core.config_dict, indent=2, ensure_ascii=False, default=str) if core.config_dict is not None else ''",
```
and add `'configDebug': config_debug,` to the final `json.dumps({...})` dict.

- [ ] **Step 3: Add a Node test asserting `configDebug`**

In `web/src/worker/pyodide-runtime.node.test.ts`, inside the existing describe (reusing the booted `pyodide`), add:
```ts
  it("returns the parsed config as a JSON configDebug string", async () => {
    const result = await generate(pyodide, {
      configText: 'name = "world"\ncount = 3\n',
      configName: "config.toml",
      templateText: "x",
      templateName: "template.j2",
      settings: DEFAULT_SETTINGS,
    });
    expect(result.configDebug).toContain('"name": "world"');
    expect(result.configDebug).toContain('"count": 3');
  });
```
Run `cd web && npx vitest run src/worker/pyodide-runtime.node.test.ts` -> PASS (after Step 2).

- [ ] **Step 4: Add a `config` mode to `web/src/components/Preview.tsx`**

Change `PreviewMode` to `"text" | "markdown" | "config"` and add, at the top of the component body (before the markdown branch):
```tsx
  if (mode === "config") {
    return <pre data-testid="config-debug">{output}</pre>;
  }
```
The `App` will pass the `configDebug` string as `output` when mode is `config`.

- [ ] **Step 5: Wire the third mode in `web/src/App.tsx`**

Add a "Config" button to the preview-mode toggle (`onClick={() => setPreviewMode("config")}`, `aria-pressed={previewMode === "config"}`, label `t.previewConfig` -- add that key to `i18n.ts` as `"設定デバッグ"`). When `previewMode === "config"`, render `<Preview output={result?.configDebug ?? ""} mode="config" />`; otherwise pass `viewOutput(result)` as today. Keep Text default.

- [ ] **Step 6: Preview test for config mode**

In `web/src/components/Preview.test.tsx` add:
```tsx
  it("config mode shows the debug string in a pre", () => {
    render(<Preview output={'{"a": 1}'} mode="config" />);
    expect(screen.getByTestId("config-debug").textContent).toBe('{"a": 1}');
  });
```

- [ ] **Step 7: Gate + commit**

Run `bash scripts/ci-parity.sh` (all gates) and `cd web && npm run build`. Then commit (cite the P2-1 issue) and the controller pushes/re-signs.

### Verification (P2-1 acceptance)
- `bash scripts/ci-parity.sh` green incl. the new Node `configDebug` test and the Preview config-mode test.
- Text remains the default preview mode -> render-parity e2e unaffected.

---

## Roadmap for P2-2, P2-3 (detailed when reached)

- **P2-2 (how-to modal):** a `<dialog>`-based modal opened by a button; content = the workflow diagram (copy `assets/images/*.svg` into `web/public/` via a vite plugin or import as URL) + the sidebar usage text from the i18n catalog. Test: opening the modal shows the diagram/usage; closing hides it.
- **P2-3 (Shift_JIS download + parity):** add an `encode` worker op (or extend the result) that returns `formatted_text.encode(encoding)` bytes via the tested Python `AppCore.get_download_content`; the DownloadBar gains an encoding select (utf-8 / Shift_JIS) and downloads the worker-encoded bytes. Test: Python encodes Shift_JIS bytes for a known string.

## Self-Review (P2-1)
- Spec coverage: config-debug JSON view = old tab2 (JSON). YAML/TOML are P2-1b; how-to modal P2-2; settings parity P2-3.
- The worker change is additive (one extra string field); the keystone and Text-default are preserved.
- Execution notes: run `bash scripts/ci-parity.sh` before every push; commits authored noreply@anthropic.com/Claude, re-signed if Unverified; ASCII GitHub posts; issue before first commit.
