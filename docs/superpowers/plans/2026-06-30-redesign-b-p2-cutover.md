# Redesign B — P2 ビッグバン切替[2ペイン・エディタ + 実エンジン配線]Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 現行 `web/` のUIを Redesign B[空状態→Library→2ペイン・エディタ]へ一括置換し、デザインのモックエンジンを**本物のPyodideワーカー**に配線する。明示フォーマット選択・行番号付きエラー・形式提案で「暗黙判定バグ」を根治し、エンコード選択ダウンロードとHowToを救済する。`features/` の出力は不変[render-parityで担保]。

**Architecture:** P1で入れた `ds/`・トークン・Iconを土台に、`design/redesign-b/app/src/components` の `EmptyState`/`Library`/`CodeView`/`SettingsModal`/`Editor` を移植する。デザインの同期 `compute()` を、ワーカーをdebounce呼び出しする非同期フック `useGenerate` に置換し、ワーカー結果 `{output, configError, templateError, configDebug}` を Editor が消費する `r` 形[`{ok,error,suggest,vars,output,json,interfaces,keys}`]へ整形する。形式提案・変数抽出・件数は薄いTSアダプタ `lib/validate.ts` に閉じる。デザイン自前の `MarkdownView`[Reactノード生成・XSS安全]と `CodeView` を使うため、`marked`/`dompurify`/`@uiw/react-codemirror`/`@codemirror/*` を削除する。

**Tech Stack:** Vite 8 + React 18 + TypeScript + 既存Pyodide Worker[`web/src/worker/`] + Vitest + Playwright。

---

## 前提

- **P-Redesign-1 が完了している**こと[`web/src/ds/`・`web/src/styles/`・`web/src/components/Icon.tsx`・`web/src/assets/` が存在]。
- 移植元: `origin/design/redesign-b`。逐語移植は `git show origin/design/redesign-b:<path> > <dest>`。
- ワーカー契約は不変[`init`/`generate`/`ready`/`result`/`error`、`GenerateRequest`/`GenerateResult` は `web/src/worker/types.ts`]。
- **振る舞い不変の担保**: `web/e2e/render-parity.spec.ts`[Playwright]が緑のまま。これは「既知の config+template → `features/` 出力一致」のキーストーン。

## File Structure

- 作成: `web/src/lib/types.ts`[`Template` 等のドメイン型]
- 作成: `web/src/lib/format.ts`[`Format` 型 + `configFileName(format)` 写像]
- 作成: `web/src/lib/validate.ts`[形式提案 / 変数抽出 / 件数 — TSアダプタ]
- 作成: `web/src/lib/data.ts`[サンプル定数 `CG` — `project/redesign/data.js` 由来]
- 作成: `web/src/lib/templates.ts`[`CGTemplates` メタ + `assets/examples` からのraw取り込み]
- 作成: `web/src/useGenerate.ts`[★エンジン境界★ debounce + memo + ワーカー結果整形]
- 作成: `web/scripts/extract-redesign-templates.mjs`[6テンプレを `assets/examples` に実ファイル化する一度きりの抽出器]
- 作成: `assets/examples/<id>.{toml,yaml}` と `assets/examples/<id>.j2`[6テンプレ × 2]
- 作成: `web/src/components/{EmptyState,Library,CodeView,SettingsModal,Editor,HowToModal}.tsx`
- 変更: `web/src/App.tsx`[ハッシュルーター + ワーカー保有 + 設定状態]
- 変更: `web/src/worker/pyodide-runtime.ts`[Tier1: 生成関数の事前コンパイル常駐]
- 変更: `web/package.json`[`marked`/`dompurify`/`@uiw/react-codemirror`/`@codemirror/*` 削除]
- 削除: 旧UI `web/src/components/{Editor,Preview,ConfigDebug,SettingsDrawer,SampleMenu,DownloadBar,HowToModal}.tsx` と各 `*.test.tsx`、`web/src/App.test.tsx`[新規に置換]

---

### Task 1: ドメイン型と Format 写像

**Files:**
- Create: `web/src/lib/types.ts`
- Create: `web/src/lib/format.ts`

- [ ] **Step 1: `types.ts` を作成**

Create `web/src/lib/types.ts`:

```ts
import type { Format } from "./format";

export type TemplateCategory = "network" | "server" | "dns" | "runbook";
export type TemplateOutput = "cli" | "config" | "markdown";

export interface Template {
  id: string;
  name: string;
  desc: string;
  category: TemplateCategory;
  format: Format;
  output: TemplateOutput;
  updated: string;
  live: boolean;
  data: string;
  template: string;
}
```

- [ ] **Step 2: `format.ts` を作成[暗黙判定バグの根治点]**

Create `web/src/lib/format.ts`:

```ts
// Explicit config format. The user picks this; we never re-detect it implicitly.
export type Format = "toml" | "yaml" | "csv";

// The worker's parser is chosen by the config file's extension (configName).
// Mapping the explicit Format to a fixed filename is the root-cause fix for the
// old implicit-format-detection bug.
export function configFileName(format: Format): string {
  return `config.${format}`;
}
```

- [ ] **Step 3: 型チェック**

Run: `cd /home/user/command-ghostwriter/web && npx tsc -b`
Expected: exit 0。

- [ ] **Step 4: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/src/lib/types.ts web/src/lib/format.ts
git commit -m "feat(web): add Template domain types and explicit Format mapping (#441)"
```

---

### Task 2: 検証アダプタ `validate.ts`[形式提案・変数抽出・件数]

**Files:**
- Create: `web/src/lib/validate.ts`
- Test: `web/src/lib/validate.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

Create `web/src/lib/validate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extractVars, countConfig, suggestFormat } from "./validate";

describe("extractVars", () => {
  it("collects {{ }} and {% for %} variables, deduped", () => {
    const tpl = "{{ global.hostname }} {{ global.vlans | join(',') }}{% for n, i in interfaces.items() %}{{ i.description }}{% endfor %}";
    expect(extractVars(tpl)).toContain("global.hostname");
    expect(extractVars(tpl)).toContain("interfaces");
    // deduped
    expect(new Set(extractVars(tpl)).size).toBe(extractVars(tpl).length);
  });
});

describe("countConfig", () => {
  it("counts top-level keys and nested object interfaces from debug JSON", () => {
    const json = JSON.stringify({ global: { a: 1 }, interfaces: { "g0/1": {}, "g0/2": {} } });
    const { keys, interfaces } = countConfig(json);
    expect(keys).toBe(2);
    expect(interfaces).toBe(2);
  });
  it("returns zeros for empty/invalid json", () => {
    expect(countConfig("")).toEqual({ keys: 0, interfaces: 0 });
  });
});

describe("suggestFormat", () => {
  it("suggests yaml when the text parses as yaml but the current format is toml", () => {
    expect(suggestFormat("a: 1\nb: 2\n", "toml")).toBe("yaml");
  });
  it("returns null when nothing else parses", () => {
    expect(suggestFormat("???not structured???", "toml")).toBeNull();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd /home/user/command-ghostwriter/web && npx vitest run src/lib/validate.test.ts`
Expected: FAIL[`validate` モジュール未作成]。

- [ ] **Step 3: `validate.ts` を実装**

Create `web/src/lib/validate.ts`:

```ts
import { load as yamlLoad } from "js-yaml";
import { parse as tomlParse } from "smol-toml";
import type { Format } from "./format";

// Template variables, for the "検出した変数" chips. Display-only — does not affect
// the authoritative render (that is the Python engine's job).
export function extractVars(tpl: string): string[] {
  const out: string[] = [];
  const push = (name: string) => {
    const root = name.trim().split(/[.\[|(\s]/)[0];
    if (root && !out.includes(root)) out.push(root);
  };
  const expr = /\{\{\s*([^}|]+?)\s*(?:\||\}\})/g;
  let m: RegExpExecArray | null;
  while ((m = expr.exec(tpl))) push(m[1]);
  const forIn = /\{%\s*for\s+[\w,\s]+?\s+in\s+([^\s%]+)/g;
  while ((m = forIn.exec(tpl))) push(m[1]);
  return out;
}

export function countConfig(debugJson: string): { keys: number; interfaces: number } {
  if (!debugJson) return { keys: 0, interfaces: 0 };
  try {
    const obj = JSON.parse(debugJson) as Record<string, unknown>;
    const keys = Object.keys(obj).length;
    let interfaces = 0;
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        interfaces += Object.keys(v as object).length;
      }
    }
    return { keys, interfaces };
  } catch {
    return { keys: 0, interfaces: 0 };
  }
}

function parses(text: string, format: Format): boolean {
  try {
    if (format === "toml") tomlParse(text);
    else if (format === "yaml") {
      const v = yamlLoad(text);
      if (v === null || typeof v !== "object") return false;
    } else {
      // csv: at least one comma-delimited header row
      const first = text.split(/\r?\n/, 1)[0] ?? "";
      return first.includes(",");
    }
    return true;
  } catch {
    return false;
  }
}

// When the current format fails, suggest the first OTHER format that parses.
export function suggestFormat(text: string, current: Format): Format | null {
  const order: Format[] = ["toml", "yaml", "csv"];
  for (const f of order) {
    if (f !== current && parses(text, f)) return f;
  }
  return null;
}
```

> `js-yaml` と `smol-toml` は `web/package.json` に既存[現行 ConfigDebug 経路で使用]。削除しないこと。

- [ ] **Step 4: テストが通ることを確認**

Run: `cd /home/user/command-ghostwriter/web && npx vitest run src/lib/validate.test.ts`
Expected: PASS[全テスト]。

- [ ] **Step 5: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/src/lib/validate.ts web/src/lib/validate.test.ts
git commit -m "feat(web): add TS validation adapter (vars/counts/format suggestion) (#441)"
```

---

### Task 3: ワーカーの生成関数を事前コンパイル常駐[Tier1性能・振る舞い不変]

**Files:**
- Modify: `web/src/worker/pyodide-runtime.ts`

- [ ] **Step 1: bootstrap で生成関数を一度だけ def する**

`web/src/worker/pyodide-runtime.ts` の `bootstrapRuntime` 末尾[`import features.core` の後]に、再利用するPython関数を定義する。`runPythonAsync` のブロックを次に**差し替え**る:

```ts
  await pyodide.runPythonAsync(
    [
      "import sys, json",
      'if "/" not in sys.path:',
      '    sys.path.insert(0, "/")',
      "from io import BytesIO",
      "from features.core import AppCore  # fail loudly here if a dep or import is missing",
      "",
      "def _cg_generate(payload):",
      "    req = json.loads(payload)",
      "    s = req['settings']",
      "    config_file = BytesIO(req['configText'].encode('utf-8'))",
      "    config_file.name = req['configName']",
      "    template_file = BytesIO(req['templateText'].encode('utf-8'))",
      "    template_file.name = req['templateName']",
      "    core = AppCore('config load failed', 'template load failed')",
      "    core.load_config_file(config_file, s['csvRowsName'], s['enableAutoTranscoding'], s['enableFillNan'], s['fillNanWith']).load_template_file(template_file, s['enableAutoTranscoding']).apply(s['formatType'], s['isStrictUndefined'])",
      "    config_debug = json.dumps(core.config_dict, indent=2, ensure_ascii=False, default=str) if core.config_dict is not None else ''",
      "    return json.dumps({'output': core.formatted_text, 'configError': core.config_error_message, 'templateError': core.template_error_message, 'configDebug': config_debug})",
    ].join("\n"),
  );
```

- [ ] **Step 2: `generate()` を「常駐関数の呼び出しのみ」に簡素化**

`web/src/worker/pyodide-runtime.ts` の `generate` 関数を次に差し替える[毎回のコード再コンパイルを廃止。出力は同一]:

```ts
export async function generate(
  pyodide: PyodideLike,
  request: GenerateRequest,
): Promise<GenerateResult> {
  // Double JSON-encode: inner encodes the request, outer makes it a Python string
  // literal. Calls the resident _cg_generate(payload) compiled once at bootstrap.
  const pyPayloadLiteral = JSON.stringify(JSON.stringify(request));
  const resultJson = (await pyodide.runPythonAsync(
    `_cg_generate(${pyPayloadLiteral})`,
  )) as string;
  return JSON.parse(resultJson) as GenerateResult;
}
```

- [ ] **Step 3: ワーカーのキーストーンテストで振る舞い不変を確認**

Run: `cd /home/user/command-ghostwriter/web && npx vitest run`
Expected: 既存の Pyodide render-parity テストが PASS[同一入力で同一出力 = 事前コンパイル化で挙動が変わっていない証拠]。

- [ ] **Step 4: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/src/worker/pyodide-runtime.ts
git commit -m "perf(web): compile the generate fn once at bootstrap, not per keystroke (#441)"
```

---

### Task 4: エンジン境界フック `useGenerate`

**Files:**
- Create: `web/src/useGenerate.ts`

- [ ] **Step 1: フックを実装**

Create `web/src/useGenerate.ts`:

```ts
import { useEffect, useMemo, useRef, useState } from "react";
import GenerateWorker from "./worker/generate.worker?worker";
import type { WorkerOutbound, GenerateSettings } from "./worker/types";
import { configFileName, type Format } from "./lib/format";
import { extractVars, countConfig, suggestFormat } from "./lib/validate";

const DEBOUNCE_MS = 250;

export interface GenError {
  pane: "data" | "tpl";
  line?: number;
  title: string;
  detail: string;
  varName?: string;
}

export interface GenResult {
  ok: boolean;
  error: GenError | null;
  suggest: Format | null;
  vars: string[];
  output: string;
  json: string;
  interfaces: number;
  keys: number;
}

const EMPTY: GenResult = {
  ok: true, error: null, suggest: null, vars: [], output: "", json: "", interfaces: 0, keys: 0,
};

// Split a raw engine error message into a title + detail, extracting a 1-based
// line number if the message carries one (e.g. "... line 12 ...").
function splitError(pane: "data" | "tpl", message: string): GenError {
  const lineMatch = message.match(/(?:line|行目|行)\s*[:：]?\s*(\d+)/i);
  const line = lineMatch ? Number(lineMatch[1]) : undefined;
  const [title, ...rest] = message.split(/[\n:：]/);
  return { pane, line, title: title.trim() || "解析エラー", detail: rest.join(": ").trim() || message };
}

export function useGenerate(
  dataText: string,
  format: Format,
  tplText: string,
  settings: GenerateSettings,
): GenResult {
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [raw, setRaw] = useState<{ output: string; configError: string | null; templateError: string | null; configDebug: string } | null>(null);

  // Warm the worker as early as this hook mounts (overlaps onboarding).
  useEffect(() => {
    const worker = new GenerateWorker();
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<WorkerOutbound>) => {
      const msg = e.data;
      if (msg.kind === "ready") setReady(true);
      else if (msg.kind === "result") setRaw(msg.result);
      else if (msg.kind === "error")
        setRaw({ output: "", configError: msg.message, templateError: null, configDebug: "" });
    };
    worker.postMessage({ kind: "init" });
    return () => worker.terminate();
  }, []);

  // Debounced dispatch. Input memoization: only re-post when inputs actually change.
  const memoKey = JSON.stringify({ dataText, format, tplText, settings });
  const lastKey = useRef<string>("");
  useEffect(() => {
    if (!ready) return;
    if (lastKey.current === memoKey) return;
    const handle = setTimeout(() => {
      lastKey.current = memoKey;
      const id = ++idRef.current;
      workerRef.current?.postMessage({
        kind: "generate",
        id,
        request: {
          configText: dataText,
          configName: configFileName(format),
          templateText: tplText,
          templateName: "template.j2",
          settings,
        },
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [ready, memoKey, dataText, format, tplText, settings]);

  // Shape the worker result into what the Editor consumes.
  return useMemo<GenResult>(() => {
    if (raw === null) return EMPTY;
    const vars = extractVars(tplText);
    if (raw.configError) {
      return { ...EMPTY, ok: false, vars, error: splitError("data", raw.configError), suggest: suggestFormat(dataText, format) };
    }
    if (raw.templateError) {
      return { ...EMPTY, ok: false, vars, error: splitError("tpl", raw.templateError) };
    }
    const { keys, interfaces } = countConfig(raw.configDebug);
    return { ok: true, error: null, suggest: null, vars, output: raw.output ?? "", json: raw.configDebug, interfaces, keys };
  }, [raw, tplText, dataText, format]);
}
```

> 設計の `Editor` が消費する `r` の形[`ok/error/suggest/vars/output/json/interfaces/keys`]を完全に満たす。`error.pane`/`line`/`title`/`detail`/`varName` も同一。`varName` は現時点では未使用[必要になれば templateError から抽出]。

- [ ] **Step 2: 型チェック**

Run: `cd /home/user/command-ghostwriter/web && npx tsc -b`
Expected: exit 0。

- [ ] **Step 3: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/src/useGenerate.ts
git commit -m "feat(web): add useGenerate hook bridging the editor to the Pyodide worker (#441)"
```

---

### Task 5: 6テンプレを `assets/examples` に実ファイル化

**Files:**
- Create: `web/scripts/extract-redesign-templates.mjs`
- Create: `assets/examples/{cisco-switchport,yamaha-router,linux-init,dns-zone,incident-campus,incident-proxy}.{toml,yaml}` + `.j2`

- [ ] **Step 1: 抽出スクリプトを作成**

Create `web/scripts/extract-redesign-templates.mjs`:

```js
// One-off extractor: reads the prototype's data.js + templates.js (via a window
// shim), then writes each template's data -> assets/examples/<id>.<format> and
// template -> assets/examples/<id>.j2. Run once; the real files become the source
// of truth and this script can stay for reproducibility.
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";

const REF = "origin/design/redesign-b";
const BASE = "design/redesign-b/project/redesign";
const read = (p) => execSync(`git show ${REF}:${BASE}/${p}`, { encoding: "utf8" });

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read("data.js"), sandbox);
vm.runInContext(read("templates.js"), sandbox);

const examplesDir = "assets/examples";
mkdirSync(examplesDir, { recursive: true });
for (const t of sandbox.window.CGTemplates) {
  writeFileSync(`${examplesDir}/${t.id}.${t.format}`, t.data.replace(/\s*$/, "") + "\n");
  writeFileSync(`${examplesDir}/${t.id}.j2`, t.template.replace(/\s*$/, "") + "\n");
  console.log(`wrote ${t.id}.${t.format} + ${t.id}.j2`);
}
```

- [ ] **Step 2: スクリプトを実行**

Run[リポジトリ直下で]:

```bash
cd /home/user/command-ghostwriter && node web/scripts/extract-redesign-templates.mjs
```

Expected: 6行[`wrote cisco-switchport.toml + cisco-switchport.j2` …]。`assets/examples/` に12ファイルが追加される。

- [ ] **Step 3: 個数確認**

```bash
ls assets/examples/{cisco-switchport,yamaha-router,linux-init,dns-zone,incident-campus,incident-proxy}.j2 | wc -l
```

Expected: `6`。

- [ ] **Step 4: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/scripts/extract-redesign-templates.mjs assets/examples
git commit -m "feat(web): materialize the 6 redesign library templates under assets/examples (#441)"
```

---

### Task 6: データ・テンプレートの TS モジュール

**Files:**
- Create: `web/src/lib/data.ts`
- Create: `web/src/lib/templates.ts`

- [ ] **Step 1: `data.ts` を作成[エディタ初期サンプル]**

Create `web/src/lib/data.ts`[`cisco-switchport` の実ファイルを既定サンプルに使う]:

```ts
const raw = import.meta.glob("../../../assets/examples/cisco-switchport.{toml,j2}", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

function byExt(ext: string): string {
  const hit = Object.entries(raw).find(([k]) => k.endsWith("." + ext));
  if (!hit) throw new Error(`cisco-switchport.${ext} not found`);
  return hit[1];
}

export const CG = {
  configToml: byExt("toml"),
  templateJ2: byExt("j2"),
};
```

> 相対パスはリポジトリ構成 `web/src/lib/` → `assets/examples/` で `../../../`。`web/vite.config.ts` の `server.fs.allow: [".."]` により `../features` 同様 `../../../assets` も読める[必要なら allow を `["..",  "../.."]` 相当に広げる。現状 `[".."]` は `web/` の親=リポジトリ直下までを許可済]。

- [ ] **Step 2: `templates.ts` を作成[Libraryメタ + 実ファイル取り込み]**

Create `web/src/lib/templates.ts`:

```ts
import type { Template, TemplateCategory, TemplateOutput } from "./types";
import type { Format } from "./format";

const raw = import.meta.glob("../../../assets/examples/*.{toml,yaml,j2}", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

function file(id: string, ext: string): string {
  const hit = Object.entries(raw).find(([k]) => k.endsWith(`/${id}.${ext}`));
  if (!hit) throw new Error(`example not found: ${id}.${ext}`);
  return hit[1];
}

interface Meta {
  id: string;
  name: string;
  desc: string;
  category: TemplateCategory;
  format: Format;
  output: TemplateOutput;
  updated: string;
  live: boolean;
}

const META: Meta[] = [
  { id: "cisco-switchport", name: "Cisco スイッチポート設定", desc: "インターフェースの mode / VLAN / description から、CLI を含む設定手順書（Markdown）を生成。", category: "network", format: "toml", output: "markdown", updated: "2026-06-28", live: true },
  { id: "yamaha-router", name: "YAMAHA ルータ初期構築", desc: "RTX系ルータの LAN / PPPoE / IPフィルタ / NAT 設定を、CLI を含む手順書（Markdown）として生成。", category: "network", format: "toml", output: "markdown", updated: "2026-06-25", live: true },
  { id: "linux-init", name: "Linux 初期セットアップ", desc: "ホスト名・ユーザ・sysctl・パッケージ定義から、サーバ初期構築の手順書を生成。", category: "server", format: "yaml", output: "markdown", updated: "2026-06-22", live: true },
  { id: "dns-zone", name: "DNS ゾーンファイル初期化", desc: "ゾーン定義から BIND ゾーンファイルと設定手順を生成。", category: "dns", format: "toml", output: "markdown", updated: "2026-06-30", live: true },
  { id: "incident-campus", name: "キャンパスネットワーク障害対応", desc: "障害事象・切り分け手順から、対応ランブックを生成。", category: "runbook", format: "yaml", output: "markdown", updated: "2026-06-18", live: true },
  { id: "incident-proxy", name: "プロキシ環境のWebサービス接続不能", desc: "プロキシ起因の接続不能に対する切り分けランブックを生成。", category: "runbook", format: "yaml", output: "markdown", updated: "2026-06-15", live: true },
];

export const CGTemplates: Template[] = META.map((m) => ({
  ...m,
  data: file(m.id, m.format),
  template: file(m.id, "j2"),
}));
```

> プロトタイプの `desc` はファイル化対象外のメタなので、`templates.js` の各 `desc` を上に転記している[linux/dns/incident の desc は `git show origin/design/redesign-b:design/redesign-b/project/redesign/templates.js` の該当行で確認し、正確に合わせること]。`live` は全件 true[実エンジンで生成する]。

- [ ] **Step 3: 型チェック + ビルド**

Run: `cd /home/user/command-ghostwriter/web && npx tsc -b && npm run build`
Expected: exit 0。glob が実ファイルを取り込み、ビルドが通る。

- [ ] **Step 4: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/src/lib/data.ts web/src/lib/templates.ts
git commit -m "feat(web): load sample + library templates from assets/examples (#441)"
```

---

### Task 7: 表示系コンポーネントの移植[CodeView / SettingsModal(controlled) / EmptyState / Library / HowToModal]

**Files:**
- Create: `web/src/components/CodeView.tsx`[逐語]
- Create: `web/src/components/Library.tsx`[逐語 + import 修正]
- Create: `web/src/components/EmptyState.tsx`[逐語]
- Create: `web/src/components/SettingsModal.tsx`[逐語 + controlled化]
- Create: `web/src/components/HowToModal.tsx`[新規・救済]

- [ ] **Step 1: CodeView / Library / EmptyState を逐語移植**

```bash
cd /home/user/command-ghostwriter
for f in CodeView Library EmptyState; do
  git show "origin/design/redesign-b:design/redesign-b/app/src/components/$f.tsx" > "web/src/components/$f.tsx"
done
```

- [ ] **Step 2: Library の import を実モジュールへ修正**

`web/src/components/Library.tsx` の先頭付近、`import type { Format } from '../lib/engine';` を次に変更[engineは存在しないため format.ts へ]:

```ts
import type { Format } from '../lib/format';
```

> `import { CGTemplates } from '../lib/templates';` と `import type { Template, TemplateCategory, TemplateOutput } from '../lib/types';` は Task 1/6 で実体があるためそのまま通る。

- [ ] **Step 3: SettingsModal を controlled 化して移植**

`web/src/components/SettingsModal.tsx` を移植後、内部 `useState` を**廃止**し、props で受け取る。先頭の props と関数シグネチャを次に差し替え、本文の各コントロールの値/ハンドラを props 経由にする:

```tsx
import type { GenerateSettings } from '../worker/types';

export interface DownloadOptions {
  enc: 'UTF-8' | 'Shift_JIS';
  fname: string;
  ts: boolean;
  ext: string;
}

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: GenerateSettings;
  onSettings: (next: GenerateSettings) => void;
  download: DownloadOptions;
  onDownload: (next: DownloadOptions) => void;
}

export function SettingsModal({ open, onClose, settings, onSettings, download, onDownload }: SettingsModalProps) {
  if (!open) return null;
  const setS = (patch: Partial<GenerateSettings>) => onSettings({ ...settings, ...patch });
  const setD = (patch: Partial<DownloadOptions>) => onDownload({ ...download, ...patch });
  // ... 本文: 旧 nan/strict/auto/rows → settings.enableFillNan/isStrictUndefined/
  //     enableAutoTranscoding/csvRowsName、nanWith → settings.fillNanWith、
  //     fmt(FMT_OPTIONS index) → settings.formatType、enc/fname/ts/ext → download.*
  //     に置換。各 onChange は setS(...) / setD(...) を呼ぶ。
```

> 旧 `FMT_OPTIONS` は表示ラベル配列。`settings.formatType`[0-4]との対応は `FMT_OPTIONS` の各先頭数字。`value` は `FMT_OPTIONS.find(o => o.startsWith(String(settings.formatType)))`、`onChange` は選択ラベルの先頭数字を `Number(label[0])` で `formatType` に戻す。「適用」「閉じる」は `onClose` のまま[状態は即時反映済み]。

- [ ] **Step 4: HowToModal[救済]を作成**

Create `web/src/components/HowToModal.tsx`:

```tsx
import { Button, Divider } from "../ds";
import { Icon } from "./Icon";

export interface HowToModalProps {
  open: boolean;
  onClose: () => void;
}

export function HowToModal({ open, onClose }: HowToModalProps) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.55)", backdropFilter: "blur(2px)", display: "grid", placeItems: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 620, maxHeight: "86vh", overflow: "auto", background: "var(--cg-bg)", border: "1px solid var(--cg-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", fontFamily: "var(--font-sans)", color: "var(--cg-text)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--cg-border)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-lg)", fontWeight: 700 }}>
            <Icon name="template-file" size={18} />使い方と構文
          </span>
          <span onClick={onClose} style={{ cursor: "pointer", color: "var(--cg-text-muted)", fontSize: 22, lineHeight: 1 }}>×</span>
        </div>
        <div style={{ padding: "var(--space-6)", fontSize: "var(--text-sm)", lineHeight: 1.8 }}>
          <p><b>2つのファイル</b>でコマンドや手順書を生成します。</p>
          <ol style={{ paddingLeft: 22 }}>
            <li><b>データ定義</b>（TOML / YAML / CSV）— 変数の値。</li>
            <li><b>Jinjaテンプレート</b> — <code>{"{{ 変数 }}"}</code> や <code>{"{% for x in items %}"}</code> で展開。</li>
          </ol>
          <Divider variant="subtle" />
          <p style={{ color: "var(--cg-text-muted)" }}>左ペインで形式を明示選択します。解析に失敗すると、行番号と「実際にパースできる形式」を提示します。右ペインの <b>手順書 / Raw / Visual Debug</b> は編集ごとに再生成されます。</p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid var(--cg-border)" }}>
          <Button variant="primary" onClick={onClose}>閉じる</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 型チェック**

Run: `cd /home/user/command-ghostwriter/web && npx tsc -b`
Expected: exit 0[Editor未移植のためCodeView/SettingsModal等が未使用でも、`noUnusedLocals` はモジュール単位では発火しない。発火する場合は Task 8 と本タスクを連続実行してから型チェックする]。

- [ ] **Step 6: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/src/components/CodeView.tsx web/src/components/Library.tsx web/src/components/EmptyState.tsx web/src/components/SettingsModal.tsx web/src/components/HowToModal.tsx
git commit -m "feat(web): port CodeView/Library/EmptyState + controlled SettingsModal + HowTo (#441)"
```

---

### Task 8: Editor 移植 + 実エンジン/ダウンロード/HowTo 配線

**Files:**
- Create: `web/src/components/Editor.tsx`[逐語移植 + 配線差し替え]

- [ ] **Step 1: Editor を逐語移植**

```bash
cd /home/user/command-ghostwriter
git show "origin/design/redesign-b:design/redesign-b/app/src/components/Editor.tsx" > web/src/components/Editor.tsx
```

- [ ] **Step 2: import とエンジン呼び出しを差し替え**

`web/src/components/Editor.tsx` の先頭 import 群のうち、engine/data/types 関連を次に変更:

```ts
import { useGenerate } from '../useGenerate';
import { configFileName, type Format } from '../lib/format';
import type { GenerateSettings } from '../worker/types';
import type { DownloadOptions } from './SettingsModal';
import { HowToModal } from './HowToModal';
import { triggerDownload, downloadFilename, type DownloadEncoding } from '../download';
import { CG } from '../lib/data';
import type { Template } from '../lib/types';
```

[削除: `import { compute } from '../lib/engine';` と `import type { ComputeError, Format } from '../lib/engine';`。`Format` は `lib/format` から取得。`ComputeError` は `useGenerate` の `GenError` に置換。`BlockedOutput` の引数型 `ComputeError` を `GenError` に変更。]

- [ ] **Step 3: 同期 compute を useGenerate に差し替え + 設定/ダウンロード状態を受け取る**

`EditorProps` と本体冒頭を次に変更[settings/download を props で受け、`compute` の useMemo を `useGenerate` に置換]:

```tsx
export interface EditorProps {
  initial?: Template | null;
  onBack?: () => void;
  settings: GenerateSettings;
  onSettings: (s: GenerateSettings) => void;
  download: DownloadOptions;
  onDownload: (d: DownloadOptions) => void;
}

export function Editor({ initial, onBack, settings, onSettings, download, onDownload }: EditorProps) {
  const tpl = initial || null;
  const [leftTab, setLeftTab] = React.useState<'data' | 'tpl'>('data');
  const [format, setFormat] = React.useState<Format>((tpl && tpl.format) || 'toml');
  const [rightMode, setRightMode] = React.useState<'md' | 'raw' | 'debug'>('md');
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [howto, setHowto] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [dataText, setDataText] = React.useState((tpl && tpl.data) || CG.configToml);
  const [tplText, setTplText] = React.useState((tpl && tpl.template) || CG.templateJ2);

  const r = useGenerate(dataText, format, tplText, settings);
  const blocked = !r.ok;
  const dataErrLine = r.error && r.error.pane !== 'tpl' ? r.error.line || 0 : 0;
  const enc = download.enc;
```

[旧 `const [enc, setEnc] = useState('UTF-8')` と `const r = useMemo(() => compute(...))` を削除。`setSettings(true)`→`setSettingsOpen(true)`、`<SettingsModal open={settings} .../>`→ 下記Step 4 へ。右ペインの `Selectbox value={enc} onChange={setEnc}` は `onChange={(v) => onDownload({ ...download, enc: v as DownloadOptions['enc'] })}` に変更。]

- [ ] **Step 4: コピー/保存ボタンを実ダウンロードに配線**

右ペインの「コピー」「保存」ボタンの `onClick` を実処理へ:

```tsx
// コピー:
onClick={() => { void navigator.clipboard.writeText(r.output); fire('コピーしました'); }}
// 保存:
onClick={() => {
  const e: DownloadEncoding = enc === 'Shift_JIS' ? 'Shift_JIS' : 'utf-8';
  triggerDownload(r.output, downloadFilename(download.fname, download.ext, download.ts), e);
  fire('ダウンロードを開始');
}}
```

末尾のモーダル設置を次に差し替え:

```tsx
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onSettings={onSettings} download={download} onDownload={onDownload} />
      <HowToModal open={howto} onClose={() => setHowto(false)} />
```

App bar の「詳細設定」ボタンの隣に HowTo ボタンを追加[救済の導線]:

```tsx
        <Button variant="ghost" size="sm" icon={<Icon name="template-file" size={15} />} onClick={() => setHowto(true)}>使い方</Button>
```

- [ ] **Step 5: 型チェック**

Run: `cd /home/user/command-ghostwriter/web && npx tsc -b`
Expected: exit 0。

- [ ] **Step 6: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/src/components/Editor.tsx
git commit -m "feat(web): wire Editor to the Pyodide engine + real download + HowTo (#441)"
```

---

### Task 9: App シェルをハッシュルーターへ置換 + 設定状態の保有

**Files:**
- Modify: `web/src/App.tsx`[全面置換]

- [ ] **Step 1: App を置換**

`web/src/App.tsx` を全面的に次へ:

```tsx
import React from "react";
import { EmptyState } from "./components/EmptyState";
import { Library } from "./components/Library";
import { Editor } from "./components/Editor";
import { CGTemplates } from "./lib/templates";
import type { Template } from "./lib/types";
import type { DownloadOptions } from "./components/SettingsModal";
import { DEFAULT_SETTINGS, type GenerateSettings } from "./worker/types";

type Route = { view: "empty" | "library" | "editor"; initial: Template | null };

function routeFromHash(): Route {
  const h = (location.hash || "").replace(/^#\/?/, "");
  if (h === "library") return { view: "library", initial: null };
  if (h === "new") return { view: "editor", initial: null };
  const m = h.match(/^t\/(.+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const tpl = CGTemplates.find((t) => t.id === id) || null;
    return { view: "editor", initial: tpl };
  }
  return { view: "empty", initial: null };
}

const DEFAULT_DOWNLOAD: DownloadOptions = { enc: "UTF-8", fname: "command", ts: true, ext: "txt" };

export function App() {
  const [route, setRoute] = React.useState<Route>(routeFromHash);
  const [settings, setSettings] = React.useState<GenerateSettings>(DEFAULT_SETTINGS);
  const [download, setDownload] = React.useState<DownloadOptions>(DEFAULT_DOWNLOAD);

  React.useEffect(() => {
    const on = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go = (hash: string) => { location.hash = hash; };
  const back = () => history.back();
  const openEditor = (tpl: Template | null) => go(tpl ? "#/t/" + encodeURIComponent(tpl.id) : "#/new");

  if (route.view === "editor")
    return (
      <Editor
        key={route.initial ? route.initial.id : "blank"}
        initial={route.initial}
        onBack={back}
        settings={settings}
        onSettings={setSettings}
        download={download}
        onDownload={setDownload}
      />
    );
  if (route.view === "library") return <Library onOpen={openEditor} onClose={back} />;
  return <EmptyState onStart={() => openEditor(null)} onLibrary={() => go("#/library")} />;
}
```

> 設定・ダウンロード状態を App が保有し、Editor → SettingsModal に流す。`EmptyState` の `onStart('upload')` は当面ブランクエディタを開く[実ファイルアップロード配線は後続の小タスク。デザインも同等のフィデリティ]。

- [ ] **Step 2: 型チェック + ビルド**

Run: `cd /home/user/command-ghostwriter/web && npm run build`
Expected: exit 0。

- [ ] **Step 3: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/src/App.tsx
git commit -m "feat(web): replace app shell with the hash-routed Redesign B flow (#441)"
```

---

### Task 10: 旧UIの削除 + 不要依存の撤去[CodeMirror / marked / dompurify]

**Files:**
- Delete: `web/src/components/{Editor,Preview,ConfigDebug,SettingsDrawer,SampleMenu,DownloadBar,HowToModal}` の**旧版**と各テスト、`web/src/App.test.tsx`、`web/src/samples.ts`
- Modify: `web/package.json`

> 注意: Task 7/8 で `web/src/components/` に新 `CodeView/Library/EmptyState/SettingsModal/HowToModal/Editor` を作成済み。**旧版で同名なのは `Editor` と `HowToModal` のみ**で、これらは Task 7/8 の `git show > 同パス` で既に上書き済み。よって削除対象は新設計に存在しない旧専用ファイルのみ。

- [ ] **Step 1: 旧専用コンポーネントとテストを削除**

```bash
cd /home/user/command-ghostwriter
git rm web/src/components/Preview.tsx web/src/components/Preview.test.tsx \
       web/src/components/ConfigDebug.tsx web/src/components/ConfigDebug.test.tsx \
       web/src/components/SettingsDrawer.tsx web/src/components/SettingsDrawer.test.tsx \
       web/src/components/SampleMenu.tsx web/src/components/SampleMenu.test.tsx \
       web/src/components/DownloadBar.tsx \
       web/src/components/Editor.test.tsx \
       web/src/components/HowToModal.test.tsx \
       web/src/App.test.tsx \
       web/src/samples.ts
```

> `Editor.tsx`/`HowToModal.tsx` 本体は新版で上書き済みのため `git rm` しない。旧 `samples.ts` は `lib/templates.ts` に統合済み[Libraryと一元化]。

- [ ] **Step 2: 不要依存を撤去**

```bash
cd /home/user/command-ghostwriter/web
npm remove @uiw/react-codemirror @codemirror/lang-json @codemirror/lang-yaml marked dompurify @types/dompurify
```

> `js-yaml`/`smol-toml`/`encoding-japanese` は `validate.ts`/`download.ts` で使用継続のため残す。

- [ ] **Step 3: 取りこぼし参照がないか確認**

```bash
cd /home/user/command-ghostwriter/web
! grep -rnE "react-codemirror|@codemirror|from \"marked\"|from 'marked'|dompurify|\\./samples|/Preview|/ConfigDebug|/SettingsDrawer|/SampleMenu|/DownloadBar" src
```

Expected: 何も出力されず exit 0[旧依存・旧モジュールへの参照ゼロ]。残っていれば該当箇所を新実装へ修正。

- [ ] **Step 4: ビルドで健全性確認**

Run: `cd /home/user/command-ghostwriter/web && npm run build`
Expected: exit 0。

- [ ] **Step 5: コミット**

```bash
cd /home/user/command-ghostwriter
git add -A web/src web/package.json web/package-lock.json
git commit -m "refactor(web): remove legacy UI + CodeMirror/marked/dompurify deps (#441)"
```

---

### Task 11: テストの作り直し[新コンポーネント Vitest + render-parity 維持]

**Files:**
- Create: `web/src/App.test.tsx`[新シェルのスモーク]
- Create: `web/src/components/Editor.test.tsx`[エンジン配線のユニット]
- Create: `web/src/useGenerate.test.ts`[整形ロジックのユニット — ワーカーをモック]

- [ ] **Step 1: useGenerate の整形ロジックを純関数化してテスト可能にする**

`web/src/useGenerate.ts` から、ワーカー結果→`GenResult` の整形を純関数 `shapeResult(raw, dataText, format, tplText)` として **export** し、フック内 `useMemo` はそれを呼ぶだけにリファクタ[挙動同一]。テスト:

Create `web/src/useGenerate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shapeResult } from "./useGenerate";

describe("shapeResult", () => {
  it("maps a successful worker result", () => {
    const r = shapeResult({ output: "ok\n", configError: null, templateError: null, configDebug: '{"global":{"a":1},"interfaces":{"x":{}}}' }, "a=1", "toml", "{{ global.a }}");
    expect(r.ok).toBe(true);
    expect(r.output).toBe("ok\n");
    expect(r.keys).toBe(2);
    expect(r.interfaces).toBe(1);
    expect(r.vars).toContain("global.a");
  });
  it("maps a config error to the data pane and suggests a parsable format", () => {
    const r = shapeResult({ output: "", configError: "parse failed line 2", templateError: null, configDebug: "" }, "a: 1\nb: 2\n", "toml", "");
    expect(r.ok).toBe(false);
    expect(r.error?.pane).toBe("data");
    expect(r.error?.line).toBe(2);
    expect(r.suggest).toBe("yaml");
  });
  it("maps a template error to the tpl pane", () => {
    const r = shapeResult({ output: "", configError: null, templateError: "undefined variable", configDebug: "" }, "a=1", "toml", "{{ x }}");
    expect(r.error?.pane).toBe("tpl");
  });
});
```

- [ ] **Step 2: テストが失敗→実装→通る**

Run: `cd /home/user/command-ghostwriter/web && npx vitest run src/useGenerate.test.ts`
Expected: 最初 FAIL[`shapeResult` 未export] → Step1のリファクタ後 PASS。

- [ ] **Step 3: App / Editor のスモークテスト[ワーカーをモック]**

Create `web/src/App.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

// jsdom has no real Worker; mock the worker module so mount doesn't crash.
vi.mock("./worker/generate.worker?worker", () => ({
  default: class {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage() {}
    terminate() {}
  },
}));

describe("App shell", () => {
  beforeEach(() => { location.hash = ""; });
  it("renders the empty state at #/", () => {
    render(<App />);
    expect(screen.getByText(/サンプルで試す/)).toBeTruthy();
  });
  it("renders the editor at #/new", () => {
    location.hash = "#/new";
    render(<App />);
    expect(screen.getByText("Command ghostwriter")).toBeTruthy();
  });
});
```

> Editor 単体テストは App 経由のスモークで足りる範囲に留める[エンジン整形は useGenerate.test.ts、DSは P1 のスモークで担保済み]。重複は作らない[DRY]。

- [ ] **Step 4: 全 Vitest が緑[render-parity 含む]**

Run: `cd /home/user/command-ghostwriter/web && npx vitest run`
Expected: 全 PASS。Pyodide キーストーン[render-parity]が緑 = `features/` 出力不変。

- [ ] **Step 5: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/src/useGenerate.ts web/src/useGenerate.test.ts web/src/App.test.tsx
git commit -m "test(web): cover useGenerate shaping + app shell; keep render-parity green (#441)"
```

---

### Task 12: Tier1 性能仕上げ[preload] + e2e + プレビュー検証

**Files:**
- Modify: `web/index.html`[Pyodide preload ヒント]
- Modify: `web/e2e/render-parity.spec.ts`[新UIのセレクタに追従。必要時のみ]

- [ ] **Step 1: Pyodide の preload ヒントを追加**

`web/index.html` の `<head>` に追加[初回ロード短縮・振る舞い不変]:

```html
    <link rel="preload" href="/pyodide/pyodide.asm.wasm" as="fetch" type="application/wasm" crossorigin />
```

- [ ] **Step 2: e2e を新UIに追従**

`web/e2e/render-parity.spec.ts` を開き、旧UIのセレクタ[旧エディタ等]を新UIのフロー[`#/new` を開く → 左ペインにデータ入力 → 右ペイン出力を検証]に更新する。**既知の config+template → 期待出力**の本質的アサーションは維持する[これが parity の核]。具体セレクタは新 `Editor`/`CodeView` の `textarea` と右ペイン描画に合わせる。

Run: `cd /home/user/command-ghostwriter/web && npm run build && npx playwright install --with-deps chromium && npx playwright test`
Expected: render-parity が PASS[ブラウザ実機で `features/` 出力一致]。CIでは `web-e2e` は非ブロッキングだが、ローカルで緑を確認する。

- [ ] **Step 3: 全テスト最終確認**

Run: `cd /home/user/command-ghostwriter/web && npm run build && npx vitest run`
Expected: 全 PASS。

- [ ] **Step 4: コミット & プッシュ**

```bash
cd /home/user/command-ghostwriter
git add web/index.html web/e2e/render-parity.spec.ts
git commit -m "perf(web): preload Pyodide wasm; update e2e to the new editor flow (#441)"
git push origin claude/vercel-redesign-migration-k4w31u
```

- [ ] **Step 5: Vercel プレビューで実機検証[ビッグバンのマージ前ゲート]**

PRのVercelプレビューURLを開き、次を確認:
1. `#/` 空状態が表示され「サンプルで試す」でエディタへ。
2. エディタ初期表示で右ペインに手順書が生成される[Pyodide初回ロード後]。
3. データを壊すと行番号付きエラー + 形式提案が出る[明示フォーマットの根治確認]。
4. 形式を YAML/CSV に切り替えても暗黙判定で誤爆しない。
5. 「保存」でファイルがダウンロードされ、Shift_JIS 選択で文字化けしない。
6. Library[`#/library`]から各テンプレを開き、実生成される。

Expected: 全項目OK。NGがあれば原因を切り分け、該当タスクに戻って修正[STOP & re-plan]。

---

## Self-Review[スペック対応]

- **App ハッシュルーター / 3画面**[spec アーキテクチャ] → Task 9。
- **エンジン境界 `useGenerate` + `config.<ext>` 写像**[spec 最重要] → Task 4, 3。
- **検証の上乗せ[行番号・形式提案・変数]**[spec] → Task 2, 4。
- **右ペイン md/raw/debug** → Editor 内蔵 `MarkdownView`/`CodeView`[Task 8]。**spec の「Preview(marked) 流用」はデザインの自前レンダラに置換**[XSS安全・バンドル減]。`marked`/`dompurify` は撤去[Task 10]。
- **詳細設定[GenerateSettings 各項目]** → Task 7 Step 3[controlled SettingsModal] + Task 9[状態保有]。
- **エンコード選択ダウンロード救済** → Task 8 Step 4[`download.ts` 配線]。
- **HowTo 救済** → Task 7 Step 4 + Task 8。
- **Library 6テンプレを assets 実ファイル化** → Task 5, 6。
- **CodeMirror 撤去** → Task 10。
- **Tier1 性能[温め/常駐/メモ化/preload/バンドル減]** → Task 3[常駐]、Task 4[温め=フックmount時 init / 入力メモ化]、Task 12[preload]、Task 10[バンドル減]。
- **振る舞い不変[render-parity]** → Task 3/11/12 で緑を確認。
- **デスクトップ専用** → Editor は `minWidth: 1024`[デザイン踏襲]。モバイル対応はしない。

## 申し送り[P3へ]

- 配信は Vercel 継続。**P-Redesign-3** で同一 `dist/` を Cloudflare Workers Static Assets にミラーし、Brotli/immutable キャッシュ[Tier1]を両面で設定する。
- `EmptyState` の実ファイルアップロード配線は未実装[ブランクエディタを開く]。必要なら P3 もしくは別小タスクで `<input type=file>` → テキスト読込 → エディタ投入を追加する。
