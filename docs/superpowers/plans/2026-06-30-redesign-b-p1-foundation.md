# Redesign B — P1 基盤[デザインシステム取り込み]Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign B のデザインシステム[トークン・`ds/` 原子・Iconとアイコン資産・self-hostフォント]を `web/src` に**追加導入**し、後続フェーズが使える土台を作る。アプリの機能は変えない。

**Architecture:** `design/redesign-b/app/src/` のTSX実装を**逐語移植**し、`web/` の既存ビルド/テスト土台に載せる。トークンCSSはapp版を正[`--cg-*` と意味別エイリアス `--surface-*`/`--text-*` を両方定義]。フォントはGoogle Fonts CDNを廃し、npm管理の `@fontsource/*` でself-host。最後にグローバルCSSを `main.tsx` に配線し「視覚の土台」を着地させる[機能は不変、render-parityとユニットテストは緑のまま]。

**Tech Stack:** Vite 8 + React 18 + TypeScript[strict, react-jsx] + Vitest + @testing-library/react + @fontsource。

---

## 前提と検証環境

- 作業ディレクトリ: リポジトリ直下。フロントは `web/`。コマンドは原則 `web/` で実行。
- 移植元はリモートブランチ `origin/design/redesign-b`。逐語移植は `git show origin/design/redesign-b:<path> > <dest>` で行う[ファイルは既にfetch済み。未取得なら `git fetch origin design/redesign-b`]。
- `web/tsconfig.json` は `strict` + `noUnusedLocals` + `noUnusedParameters` + `jsx: react-jsx`。移植元も同等設定で書かれているため型は通る前提。
- 完了チェックの基本: `npm run build`[= `tsc -b && vite build`]と `npx vitest run` が緑。
- **振る舞い不変の担保**: 既存の `e2e/render-parity.spec.ts`[Playwright]と既存Vitestが緑のままであること。本フェーズはロジックを変更しない。

## File Structure[このフェーズで作る/触るファイル]

- 作成: `web/src/styles/tokens/colors.css`[色トークン。`--cg-*` + 意味別エイリアス]
- 作成: `web/src/styles/tokens/typography.css`[フォントファミリ・タイプスケール・ウェイト]
- 作成: `web/src/styles/tokens/spacing.css`[余白・角丸・影・モーション・レイアウト]
- 作成: `web/src/styles/tokens/base.css`[最小リセット + brand既定]
- 作成: `web/src/styles/tokens/fonts.css`[**fontsource self-host**版に書き換え]
- 作成: `web/src/styles/index.css`[トークンを束ね、空状態の haunting keyframes を持つグローバル入口]
- 作成: `web/src/styles/css.ts`[CSS変数を許すReact style型エイリアス]
- 作成: `web/src/ds/{Button,Badge,Divider,Selectbox,Toggle,TextInput,RadioGroup,FileUploader}.tsx` + `index.ts`[DS原子]
- 作成: `web/src/components/Icon.tsx`[SVGをraw取り込みするIcon]
- 作成: `web/src/assets/icons/*.svg`[14個]、`web/src/assets/brand/logo-mark.svg`
- 作成: `web/src/ds/ds.smoke.test.tsx`[DS + Iconのスモークテスト]
- 変更: `web/package.json`[`@fontsource/source-sans-3`, `@fontsource/source-code-pro` 追加]
- 変更: `web/src/main.tsx`[最終タスクで `./styles/index.css` を取り込み]

---

### Task 1: self-host フォントの導入[fontsource]

**Files:**
- Modify: `web/package.json`[dependencies に2件追加]

- [ ] **Step 1: fontsource パッケージを追加**

Run[`web/` で]:

```bash
cd web && npm install @fontsource/source-sans-3@^5 @fontsource/source-code-pro@^5
```

Expected: `web/package.json` の `dependencies` に2件が入り、`web/package-lock.json` が更新される。`node_modules/@fontsource/source-sans-3/` と `.../source-code-pro/` が生成される。

- [ ] **Step 2: 取得物の確認**

Run:

```bash
ls node_modules/@fontsource/source-sans-3/ | grep -E '^(400|600|700|400-italic)\.css$'
ls node_modules/@fontsource/source-code-pro/ | grep -E '^(400|500|600)\.css$'
```

Expected: それぞれ `400.css 600.css 700.css 400-italic.css` / `400.css 500.css 600.css` が表示される[必要ウェイトが揃っている証拠。families は 'Source Sans 3' / 'Source Code Pro' で `typography.css` の `--font-sans`/`--font-mono` と一致]。

- [ ] **Step 3: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/package.json web/package-lock.json
git commit -m "build(web): add self-hosted Source Sans 3 / Source Code Pro fonts (#441)"
```

---

### Task 2: デザイントークンの移植[colors / typography / spacing / base]

**Files:**
- Create: `web/src/styles/tokens/colors.css`
- Create: `web/src/styles/tokens/typography.css`
- Create: `web/src/styles/tokens/spacing.css`
- Create: `web/src/styles/tokens/base.css`

- [ ] **Step 1: ディレクトリ作成**

Run:

```bash
cd /home/user/command-ghostwriter
mkdir -p web/src/styles/tokens
```

- [ ] **Step 2: 4ファイルを逐語移植**

Run:

```bash
cd /home/user/command-ghostwriter
for f in colors typography spacing base; do
  git show "origin/design/redesign-b:design/redesign-b/app/src/styles/tokens/$f.css" > "web/src/styles/tokens/$f.css"
done
```

Expected: 4ファイルが生成される。

- [ ] **Step 3: 内容検証[トークンの要が入っているか]**

Run:

```bash
cd /home/user/command-ghostwriter
grep -l 'surface-raised' web/src/styles/tokens/colors.css \
  && grep -l 'font-sans' web/src/styles/tokens/typography.css \
  && grep -l 'radius-md' web/src/styles/tokens/spacing.css \
  && grep -l 'box-sizing' web/src/styles/tokens/base.css
```

Expected: 4ファイルすべてのパスが出力される[`ds/` が参照する `--surface-raised`/`--font-sans`/`--radius-md` 等が存在する証拠]。

- [ ] **Step 4: コミット**

```bash
git add web/src/styles/tokens/colors.css web/src/styles/tokens/typography.css web/src/styles/tokens/spacing.css web/src/styles/tokens/base.css
git commit -m "feat(web): port design-system color/typography/spacing/base tokens (#441)"
```

---

### Task 3: フォントトークンを fontsource 版に作成 + index.css / css.ts 移植

**Files:**
- Create: `web/src/styles/tokens/fonts.css`[**新規内容**。CDNではなくfontsourceを取り込む]
- Create: `web/src/styles/index.css`[逐語移植]
- Create: `web/src/styles/css.ts`[逐語移植]

- [ ] **Step 1: `fonts.css` を self-host 版で作成**

Create `web/src/styles/tokens/fonts.css`:

```css
/* Command Ghostwriter — Webfonts (self-hosted via @fontsource, no CDN).
   Streamlit's stack: Source Sans 3 (UI/body) + Source Code Pro (code/CLI).
   Families match typography.css (--font-sans / --font-mono). */

@import '@fontsource/source-sans-3/400.css';
@import '@fontsource/source-sans-3/400-italic.css';
@import '@fontsource/source-sans-3/600.css';
@import '@fontsource/source-sans-3/700.css';
@import '@fontsource/source-code-pro/400.css';
@import '@fontsource/source-code-pro/500.css';
@import '@fontsource/source-code-pro/600.css';
```

- [ ] **Step 2: `index.css` を逐語移植**

Run:

```bash
cd /home/user/command-ghostwriter
git show "origin/design/redesign-b:design/redesign-b/app/src/styles/index.css" > web/src/styles/index.css
```

Expected: グローバルCSS[トークン@import + html/body + haunting keyframes]が生成される。移植元の1行目付近の `@import url('./tokens/fonts.css');` 以下5つのトークン@importはStep 1の新fonts.cssと整合する[相対パスは同じ `./tokens/` のまま]。

- [ ] **Step 3: `css.ts` を逐語移植**

Run:

```bash
cd /home/user/command-ghostwriter
mkdir -p web/src/styles
git show "origin/design/redesign-b:design/redesign-b/app/src/styles/css.ts" > web/src/styles/css.ts
```

Expected: `export type Style = ...` が生成される。

- [ ] **Step 4: コミット**

```bash
git add web/src/styles/tokens/fonts.css web/src/styles/index.css web/src/styles/css.ts
git commit -m "feat(web): add self-hosted font tokens + global stylesheet + css type (#441)"
```

---

### Task 4: DS 原子の移植[8コンポーネント + index.ts]

**Files:**
- Create: `web/src/ds/Button.tsx` `Badge.tsx` `Divider.tsx` `Selectbox.tsx` `Toggle.tsx` `TextInput.tsx` `RadioGroup.tsx` `FileUploader.tsx` `index.ts`

- [ ] **Step 1: ディレクトリ作成**

```bash
cd /home/user/command-ghostwriter
mkdir -p web/src/ds
```

- [ ] **Step 2: 9ファイルを逐語移植**

Run:

```bash
cd /home/user/command-ghostwriter
for f in Button Badge Divider Selectbox Toggle TextInput RadioGroup FileUploader index; do
  ext=tsx; [ "$f" = index ] && ext=ts
  git show "origin/design/redesign-b:design/redesign-b/app/src/ds/$f.$ext" > "web/src/ds/$f.$ext"
done
```

Expected: `web/src/ds/` に9ファイルが生成される。

- [ ] **Step 3: 型チェックで移植健全性を確認**

Run[`web/` で]:

```bash
cd /home/user/command-ghostwriter/web && npx tsc -b
```

Expected: エラーなしで終了[exit 0]。`ds/` の各コンポーネントが `web/tsconfig.json`[strict/noUnusedLocals]で型エラーを出さない証拠。

- [ ] **Step 4: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/src/ds
git commit -m "feat(web): port design-system primitives (Button/Badge/.../FileUploader) (#441)"
```

---

### Task 5: Icon コンポーネントとアイコン資産の移植

**Files:**
- Create: `web/src/components/Icon.tsx`
- Create: `web/src/assets/icons/*.svg`[14個]
- Create: `web/src/assets/brand/logo-mark.svg`

- [ ] **Step 1: ディレクトリ作成**

```bash
cd /home/user/command-ghostwriter
mkdir -p web/src/assets/icons web/src/assets/brand
```

- [ ] **Step 2: Icon.tsx を逐語移植**

```bash
cd /home/user/command-ghostwriter
git show "origin/design/redesign-b:design/redesign-b/app/src/components/Icon.tsx" > web/src/components/Icon.tsx
```

Expected: `Icon` が生成される[`import.meta.glob('../assets/icons/*.svg', { query: '?raw', ... })` でアイコンをraw取り込み。`web/` は `samples.ts` で同じ `?raw` glob を既に使用しており動作実績あり]。

- [ ] **Step 3: 14アイコン + ロゴを移植**

```bash
cd /home/user/command-ghostwriter
for n in config-file copy download ethernet-port generate ghost router server settings switch template-file terminal topology upload-cloud; do
  git show "origin/design/redesign-b:design/redesign-b/app/src/assets/icons/$n.svg" > "web/src/assets/icons/$n.svg"
done
git show "origin/design/redesign-b:design/redesign-b/app/src/assets/brand/logo-mark.svg" > web/src/assets/brand/logo-mark.svg
```

- [ ] **Step 4: 個数確認**

```bash
ls web/src/assets/icons/*.svg | wc -l && ls web/src/assets/brand/logo-mark.svg
```

Expected: `14` と `web/src/assets/brand/logo-mark.svg` が出力される。

- [ ] **Step 5: コミット**

```bash
git add web/src/components/Icon.tsx web/src/assets
git commit -m "feat(web): port Icon component + 14 infra icons + logo mark (#441)"
```

---

### Task 6: DS + Icon のスモークテスト[移植のロック]

**Files:**
- Create: `web/src/ds/ds.smoke.test.tsx`

- [ ] **Step 1: 失敗するテストを書く**

Create `web/src/ds/ds.smoke.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, Badge, Divider, Selectbox, Toggle, TextInput, RadioGroup, FileUploader } from "./index";
import { Icon } from "../components/Icon";

describe("DS primitives smoke", () => {
  it("Button renders its label and fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>実行</Button>);
    const btn = screen.getByRole("button", { name: "実行" });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("TextInput renders value and fires onChange with the new value", () => {
    const onChange = vi.fn();
    render(<TextInput label="名前" value="abc" onChange={onChange} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("abc");
    fireEvent.change(input, { target: { value: "abcd" } });
    expect(onChange).toHaveBeenCalledWith("abcd");
  });

  it("Badge renders its text", () => {
    render(<Badge tone="success">ライブ</Badge>);
    expect(screen.getByText("ライブ")).toBeTruthy();
  });

  it("Toggle renders its label without throwing", () => {
    render(<Toggle checked label="strict" onChange={() => {}} />);
    expect(screen.getByText("strict")).toBeTruthy();
  });

  it("Selectbox renders its label without throwing", () => {
    render(<Selectbox label="形式" value="toml" options={["toml", "yaml", "csv"]} onChange={() => {}} />);
    expect(screen.getByText("形式")).toBeTruthy();
  });

  it("RadioGroup renders its label without throwing", () => {
    render(<RadioGroup label="出力" value="cli" options={["cli", "config"]} onChange={() => {}} />);
    expect(screen.getByText("出力")).toBeTruthy();
  });

  it("FileUploader renders its label without throwing", () => {
    render(<FileUploader label="アップロード" onBrowse={() => {}} />);
    expect(screen.getByText("アップロード")).toBeTruthy();
  });

  it("Divider renders an hr element", () => {
    const { container } = render(<Divider variant="rainbow" />);
    expect(container.querySelector("hr")).toBeTruthy();
  });

  it("Icon renders an inline svg for a known name", () => {
    const { container } = render(<Icon name="server" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
```

- [ ] **Step 2: テストを実行して通ることを確認**

Run[`web/` で]:

```bash
cd /home/user/command-ghostwriter/web && npx vitest run src/ds/ds.smoke.test.tsx
```

Expected: 9テストすべて PASS。もし `Selectbox`/`RadioGroup`/`FileUploader` の label テキスト探索で失敗した場合は、当該コンポーネント実装の `label` 描画方法に合わせて `getByText` の対象を調整[ただしまず実装を読み、テキストが描画される条件を確認すること。安易に `expect` を緩めない]。

- [ ] **Step 3: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/src/ds/ds.smoke.test.tsx
git commit -m "test(web): smoke-test ported DS primitives + Icon (#441)"
```

---

### Task 7: グローバルCSSを配線し、フルビルド/テストで土台着地を確認

**Files:**
- Modify: `web/src/main.tsx`[`./styles/index.css` を取り込む]

- [ ] **Step 1: `main.tsx` にグローバルCSSを取り込む**

`web/src/main.tsx` を以下に変更[`import { App }` の直前に1行追加]:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

> これによりグローバルのトークン・self-hostフォント・暗色背景が現行アプリにも適用される[**視覚の土台の着地**]。現行Appのロジック・DOM契約・出力は不変なので、機能テストは緑のまま[これが「視覚回帰の土台のみ／挙動変更なし」の意味]。

- [ ] **Step 2: フルビルドでCSSチェーンの解決を確認**

Run[`web/` で]:

```bash
cd /home/user/command-ghostwriter/web && npm run build
```

Expected: `tsc -b` と `vite build` がエラーなく完了。`fonts.css` の `@import '@fontsource/...'` がViteで解決され、`dist/` にフォントwoff2が出力される[CDN非依存の証拠]。ビルド失敗時は fontsource のパス[Task 1 Step 2の存在確認]を見直す。

- [ ] **Step 3: 全テストが緑[振る舞い不変の担保]**

Run[`web/` で]:

```bash
cd /home/user/command-ghostwriter/web && npx vitest run
```

Expected: 既存テスト + 新スモークテストがすべて PASS[Pyodide render-parity を含むVitestキーストーンが緑 = `features/` 出力が不変]。

- [ ] **Step 4: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/src/main.tsx
git commit -m "feat(web): wire global design-system stylesheet into the app shell (#441)"
```

- [ ] **Step 5: ブランチをプッシュ**

```bash
git push origin claude/vercel-redesign-migration-k4w31u
```

Expected: プッシュ成功。PRがあればVercelプレビューが走り、暗色のbrandフォント土台が適用された現行アプリが表示される[機能は不変]。

---

## Self-Review[スペック対応の確認]

- **トークン取り込み**[spec: P-Redesign-1 デザイントークン] → Task 2, 3。
- **`ds/` 原子**[spec: P-Redesign-1] → Task 4。
- **SVGアイコン**[spec: P-Redesign-1] → Task 5。
- **self-hostフォント**[spec: フォント分岐 / Tier1なし] → Task 1, 3[fontsource]。
- **バンドル縮小の素地**[spec: Tier1 P-Redesign-1] → 本フェーズはCSS/DSを追加のみ。CodeMirror削除とコード分割は **P-Redesign-2** で実施[Editor置換時]。本フェーズでは新規依存を増やしすぎない。
- **挙動変更なし / render-parity緑**[spec: テストと検証] → Task 6[新規ユニット] + Task 7 Step 3[既存含む全テスト]。
- **未カバーで意図的に後送り**: `Editor`/`EmptyState`/`Library`/`CodeView`/`SettingsModal`、`useGenerate` エンジン境界、templates/data TS化、6テンプレ実ファイル化、エンコードDL/HowTo救済 → すべて **P-Redesign-2**。CF Workers → **P-Redesign-3**。

## 次フェーズへの申し送り

- Task 7 でグローバルCSSが配線済みのため、P-Redesign-2 は `main.tsx` を再度触らず、`App.tsx` の中身だけ差し替えればよい。
- `ds/`・`Icon`・トークンは P-Redesign-2 の各画面[`EmptyState`/`Library`/`Editor`/`SettingsModal`]がそのまま import して使う。
- フォントの families は `typography.css` の `--font-sans`/`--font-mono` と一致済み。
