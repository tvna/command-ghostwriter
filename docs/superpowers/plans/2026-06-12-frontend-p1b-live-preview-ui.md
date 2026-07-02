# Frontend P1b: Live-Preview UI on the Pyodide Bring-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the P1a bring-up harness (two `<textarea>`s + `<pre>`) with the real live-preview UX from the migration spec: CodeMirror 6 editors, drag-and-drop, a Text/Markdown preview, a settings drawer with full parity to the old Streamlit tab3, one-click sample injection, client-side download, and a Japanese i18n catalog -- all on top of the proven `features/`-in-Pyodide worker.

**Architecture:** The worker contract (`init`/`generate`/`ready`/`error`), `pyodide-runtime.ts`, `generate.worker.ts`, and `GenerateSettings` from P1a are unchanged. P1b is purely UI-thread work in `web/src/`: swap the editors, add a preview switch, a settings drawer that drives `GenerateSettings` + download options, a samples loader (static `assets/examples`), Blob download, and a TS label catalog. The 250ms-debounce -> worker -> preview data flow stays.

**Tech Stack:** React 18 + TypeScript, CodeMirror 6 via `@uiw/react-codemirror` (+ `@codemirror/lang-yaml`, `@codemirror/lang-json`), `marked` + `dompurify` for Markdown preview. No new Python/worker deps.

**Stack note (post-#402):** the web devDeps were bumped to vite 8 / vitest 4 / @vitejs/plugin-react 6; new editor deps must resolve against those.

---

## Decomposition into mergeable increments

Each increment is its own issue + PR, independently mergeable, never regressing the green keystone. Drive them to merge in order.

| Increment | Scope | Replaces (old Streamlit) |
| --- | --- | --- |
| **P1b-1** | CodeMirror 6 editors (syntax highlight per file type) + drag-and-drop file load, keeping worker/debounce/error/output | tab1 upload -> inline editors |
| **P1b-2** | Live preview switch: Text vs rendered Markdown (marked + DOMPurify) | tab1 text/markdown buttons |
| **P1b-3** | Settings drawer: full parity with tab3 (csv_rows_name, fill-NaN, format_type, strict_undefined, auto_transcoding, download filename/ext/encoding/timestamp) wired into `GenerateSettings` | tab3 |
| **P1b-4** | Sample injection menu (static `assets/examples`), client-side Blob download, TS i18n catalog (Japanese default) replacing hardcoded labels | tab4 + download + i18n |

(Config-debug JSON/TOML/YAML view and the how-to/workflow modal are spec phase P2, not P1b.)

This file fully details **P1b-1**; P1b-2..4 are detailed when reached (re-run writing-plans per increment).

---

## P1b-1: CodeMirror 6 editors + drag-and-drop

**Files:**
- Modify: `web/package.json` (add editor deps)
- Create: `web/src/components/Editor.tsx` (CodeMirror wrapper with language + drag-and-drop)
- Modify: `web/src/App.tsx` (use `<Editor>` instead of `<textarea>`)
- Test: `web/src/components/Editor.test.tsx`
- Modify: `web/src/App.test.tsx` (adapt selectors if needed)

### Design decisions (no placeholders)
- Use `@uiw/react-codemirror` (maintained React wrapper for CM6) to avoid hand-wiring EditorView lifecycle. Language extensions: `@codemirror/lang-yaml` for the config editor (covers yaml; acceptable highlighting for toml/csv too in bring-up), `@codemirror/lang-json` available; the template editor uses no language extension (plain text + line numbers) since there is no official Jinja mode -- documented, not a gap.
- Drag-and-drop: a thin `onDrop` on the editor container reads the dropped file's text (`file.text()`) and calls `onChange` with the contents; `onDragOver` preventDefault to allow drop. This replaces the old file-upload widgets.
- The `Editor` is controlled (`value`/`onChange`), so the existing 250ms debounce + worker flow in `App.tsx` is untouched. `aria-label` is preserved so existing tests/e2e keep working.

- [ ] **Step 1: Add editor dependencies**

Edit `web/package.json` devDependencies (or dependencies) to add, then `cd web && npm install`:
```json
    "@uiw/react-codemirror": "^4.23.7",
    "@codemirror/lang-yaml": "^6.1.2",
    "@codemirror/lang-json": "^6.0.1"
```
Run: `cd web && npm install && npm run build`
Expected: resolves against vite 8 / React 18; build emits `dist/`.

- [ ] **Step 2: Write the failing `Editor` test `web/src/components/Editor.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Editor } from "./Editor";

describe("Editor", () => {
  it("renders with the given aria-label and shows the value", () => {
    render(<Editor ariaLabel="config" value="id,value" language="yaml" onChange={() => {}} />);
    expect(screen.getByLabelText("config")).toBeTruthy();
    expect(screen.getByText(/id,value/)).toBeTruthy();
  });

  it("calls onChange with dropped file text", async () => {
    const onChange = vi.fn();
    render(<Editor ariaLabel="config" value="" language="yaml" onChange={onChange} />);
    const region = screen.getByLabelText("config");
    const file = new File(["a,b\n1,2\n"], "x.csv", { type: "text/csv" });
    // jsdom File.text() resolves to the content
    fireEvent.drop(region, { dataTransfer: { files: [file] } });
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith("a,b\n1,2\n"));
  });
});
```

- [ ] **Step 3: Run it; confirm FAIL**

Run: `cd web && npx vitest run src/components/Editor.test.tsx`
Expected: FAIL (Editor does not exist).

- [ ] **Step 4: Implement `web/src/components/Editor.tsx`**

```tsx
import CodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { json } from "@codemirror/lang-json";
import type { Extension } from "@codemirror/state";

export type EditorLanguage = "yaml" | "json" | "plain";

function languageExtensions(language: EditorLanguage): Extension[] {
  if (language === "yaml") return [yaml()];
  if (language === "json") return [json()];
  return [];
}

interface EditorProps {
  ariaLabel: string;
  value: string;
  language: EditorLanguage;
  onChange: (value: string) => void;
}

export function Editor({ ariaLabel, value, language, onChange }: EditorProps) {
  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onChange(await file.text());
  }

  return (
    <div
      aria-label={ariaLabel}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <CodeMirror
        value={value}
        extensions={languageExtensions(language)}
        onChange={onChange}
        basicSetup={{ lineNumbers: true }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run the Editor test; confirm PASS**

Run: `cd web && npx vitest run src/components/Editor.test.tsx`
Expected: PASS. If CodeMirror's jsdom rendering does not expose the value via `getByText`, adjust the assertion to query the contenteditable text content -- but keep the drop-to-onChange assertion intact (that is the behavioral guarantee).

- [ ] **Step 6: Use `<Editor>` in `web/src/App.tsx`**

Replace the two `<textarea ... />` lines with:
```tsx
import { Editor } from "./components/Editor";
// ...
      <Editor ariaLabel="config" value={config} language="yaml" onChange={setConfig} />
      <Editor ariaLabel="template" value={template} language="plain" onChange={setTemplate} />
```
Keep everything else (state, debounce effect, worker wiring, error banner, `<pre>`) unchanged.

- [ ] **Step 7: Ensure `App.test.tsx` still passes**

The component test mocks the worker and asserts on output/alert; the `aria-label`s are preserved. Run `cd web && npx vitest run src/App.test.tsx`. If a selector relied on `<textarea>` specifically, update it to `getByLabelText`. Expected: PASS.

- [ ] **Step 8: Full local gate + build**

Run: `bash scripts/ci-parity.sh` (the gate added in #404: ruff, mypy, all-language lizard, web tsc, whole-project vitest) and `cd web && npm run build`.
Expected: all gates pass; build OK. Watch lizard CCN on the new `Editor.tsx` (keep functions <= 10). This is the local CI-parity proof before push.

- [ ] **Step 9: Commit**

```bash
git add web/package.json web/package-lock.json web/src/components/Editor.tsx web/src/components/Editor.test.tsx web/src/App.tsx web/src/App.test.tsx
git commit -m "feat(web): replace textareas with CodeMirror 6 editors + drag-and-drop (#<ISSUE>)"
```

### Verification (P1b-1 acceptance)
- `bash scripts/ci-parity.sh` green (incl. whole-project vitest with the new Editor test).
- `npm run build` emits `dist/`.
- The Playwright `render-parity` e2e still passes (the seeded fixture renders `1:100\n2:N/A\n3:300\n`) -- editors are drop-in for the textareas, so the keystone is preserved. (Browser e2e runs in CI.)

---

## Roadmap for P1b-2..4 (detailed when reached)

- **P1b-2 (Text/Markdown preview):** add a preview-mode toggle in `App.tsx`; render `formatted_text` as raw text (`<pre>`) or as Markdown via `marked` -> `DOMPurify.sanitize` -> `dangerouslySetInnerHTML`. Test: given Markdown output, the rendered HTML contains the expected tags and is sanitized.
- **P1b-3 (Settings drawer):** a drawer component exposing every tab3 field, bound to a `GenerateSettings` + download-options state object passed into the worker request and the download helper. Defaults match i18n.py / app.py (`csv_rows`, fill-NaN on, `#`, format 0, strict on, auto-transcoding on, filename `command`, ext txt/md, encoding Shift_JIS/utf-8, timestamp on). Test: changing a control updates the generate request payload.
- **P1b-4 (Samples + download + i18n):** copy `assets/examples` into `web/public/examples` at build (vite plugin like the pyodide one) and a menu to load a sample pair into the editors; a download button that Blobs `formatted_text` with the chosen filename/ext/encoding; a `web/src/i18n.ts` Japanese label catalog replacing hardcoded strings (source the labels from the repo `i18n.py`). Tests: sample load populates editors; download builds a Blob with the right name; labels render in Japanese.

## Self-Review (P1b-1)
- Spec coverage: inline CodeMirror editors + drag-and-drop = spec "inline editors with syntax highlighting" + "drag-and-drop". MD preview / drawer / samples / download / i18n are explicitly the later increments. No scope bleed.
- Placeholder scan: `<ISSUE>` resolved at execution. All code steps are complete.
- Type consistency: `Editor`/`EditorLanguage`/`EditorProps` defined once; `App.tsx` consumes them; worker contract untouched.
- Open execution notes: commits authored noreply@anthropic.com/Claude, re-signed if Unverified; ASCII GitHub posts; issue opened before first commit; run `bash scripts/ci-parity.sh` before every push (the new gate).
