# Redesign B — P3 Cloudflare Workers ミラー[静的配信]Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** P2でビッグバン移行した `web/` の同一 `dist/` を Cloudflare Workers Static Assets でミラー配信する。完全静的・SPAフォールバック・Pyodide自己ホストはそのまま。Next.js は使わない。長命トークンをGitHubに保管しないネイティブGit連携[Workers Builds]を第一候補、GitHub Actions + APIトークンを代替とし、いずれもシークレット取扱標準に従って runbook 化する。

**Architecture:** バックエンドを持たないため、Worker スクリプトは置かず **assets-only** 構成[`wrangler` の `assets` バインディングのみ]。`dist/` をそのまま配信し、`not_found_handling: single-page-application` でハッシュルーティングのリロードに対応。`web/public/_headers` で Vite ハッシュ付き資産と Pyodide 資産に `immutable` キャッシュを付与[Tier1性能・振る舞い不変]。

**Tech Stack:** Cloudflare Workers Static Assets + wrangler + 既存 Vite 静的出力[`web/dist`]。

---

## 前提

- **P-Redesign-2 が完了し**、`web/` が新UXで `npm run build` 緑[`web/dist` が生成される]。
- Cloudflare アカウントが必要[無料 Workers プランで可。非商用OSS]。
- Vercel 配信は**継続**[本フェーズは並行ミラーの追加であり、Vercel を置き換えない]。
- 秘密値の新規保管はネイティブGit連携では発生しない[Workers Builds は Cloudflare 側で認可]。GH Actions 代替を選ぶ場合のみ `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` を GitHub Secrets に保管する。

## File Structure

- 作成: `web/wrangler.jsonc`[assets-only 配信設定]
- 作成: `web/public/_headers`[immutable キャッシュ]
- 変更: `web/package.json`[`wrangler` devDep + `deploy:cf` スクリプト]
- 作成: `docs/runbooks/cloudflare-workers-deploy.md`[アカウント作成からのランブック]
- [代替時のみ]作成: `.github/workflows/cloudflare-deploy.yml`[GH Actions デプロイ]

---

### Task 1: wrangler 設定[assets-only]

**Files:**
- Create: `web/wrangler.jsonc`
- Modify: `web/package.json`

- [ ] **Step 1: wrangler を devDependency に追加**

Run: `cd /home/user/command-ghostwriter/web && npm install -D wrangler@^4`
Expected: `web/package.json` の devDependencies に `wrangler` が入る。

- [ ] **Step 2: `wrangler.jsonc` を作成**

Create `web/wrangler.jsonc`:

```jsonc
{
  // Assets-only Worker: no server code, just serve web/dist as a static SPA.
  // Mirror of the Vercel deployment; same dist/, same self-hosted Pyodide.
  "name": "command-ghostwriter",
  "compatibility_date": "2026-06-01",
  "assets": {
    "directory": "./dist",
    // Hash-routed SPA: unknown paths fall back to index.html so reload/back work.
    "not_found_handling": "single-page-application"
  }
}
```

- [ ] **Step 3: デプロイ用 npm スクリプトを追加**

`web/package.json` の `scripts` に追加:

```json
    "deploy:cf": "npm run build && wrangler deploy"
```

- [ ] **Step 4: 設定の静的検証**

Run: `cd /home/user/command-ghostwriter/web && npx wrangler deploy --dry-run --outdir /tmp/cf-dryrun`
Expected: 認証なしで設定の妥当性チェックが通る[`Total Upload` 等の dry-run 出力。`dist` 未生成なら先に `npm run build`]。エラー時は `assets.directory` を見直す。

- [ ] **Step 5: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/wrangler.jsonc web/package.json web/package-lock.json
git commit -m "build(web): add Cloudflare Workers assets-only wrangler config (#441)"
```

---

### Task 2: immutable キャッシュヘッダ[Tier1性能]

**Files:**
- Create: `web/public/_headers`

- [ ] **Step 1: `_headers` を作成**

Create `web/public/_headers`[Vite が `public/` を `dist/` 直下へコピーする。Workers Static Assets は `_headers` を解釈する]:

```
# Vite emits content-hashed filenames under /assets/* -> safe to cache forever.
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Self-hosted Pyodide distribution is versioned by the pinned package -> immutable.
/pyodide/*
  Cache-Control: public, max-age=31536000, immutable

# The HTML entry must always revalidate so new deploys are picked up.
/index.html
  Cache-Control: public, max-age=0, must-revalidate
```

> `public/pyodide` は gitignore 済み[postinstall でベンダリング]だが、`_headers` 自体は `public/` 直下なのでコミット対象になる。Cloudflare は `.wasm` を `application/wasm` で配信し、Brotli/gzip 圧縮を自動適用するため、追加設定は不要。

- [ ] **Step 2: ビルドで dist へ反映されるか確認**

Run: `cd /home/user/command-ghostwriter/web && npm run build && test -f dist/_headers && echo OK`
Expected: `OK`[`dist/_headers` が出力されている]。

- [ ] **Step 3: コミット**

```bash
cd /home/user/command-ghostwriter
git add web/public/_headers
git commit -m "perf(web): immutable caching for hashed assets + Pyodide on the CF mirror (#441)"
```

---

### Task 3: デプロイ運用ランブック[アカウント作成から / シークレット標準]

**Files:**
- Create: `docs/runbooks/cloudflare-workers-deploy.md`

- [ ] **Step 1: ランブックを作成**

Create `docs/runbooks/cloudflare-workers-deploy.md`:

```markdown
# Runbook: Cloudflare Workers ミラーデプロイ [アカウント作成から]

- 関連Issue: #441
- 関連設計: `docs/superpowers/specs/2026-06-30-redesign-b-migration-design.md`
- 対象: Command Ghostwriter の静的フロントエンド[Vite + React、ブラウザ内Pyodide]の **Cloudflare Workers ミラー**
- 連携方式: **Cloudflare Workers Builds[ネイティブGit連携]** を第一候補[GitHubに長命トークンを保管しない]。代替は GitHub Actions + APIトークン。

## 0. 前提と全体像

バックエンドを持たない**完全静的サイト**[計算は全てブラウザ内Pyodide]。Vercel と並行する**ミラー**であり、Vercel を置き換えない。

\`\`\`
git push (main)     -> Workers Builds が本番デプロイ[ネイティブGit連携時]
Pull Request        -> Workers Builds がプレビューデプロイ
\`\`\`

## 1. Cloudflare アカウント作成

1. https://dash.cloudflare.com/sign-up を開き、無料アカウントを作成。
2. メール認証を完了する。Workers の無料枠で静的配信が可能[非商用OSS]。

## 2. ネイティブGit連携[第一候補・推奨]

1. ダッシュボード > **Workers & Pages** > **Create** > **Import a repository**。
2. GitHub 連携を承認し、**`tvna/command-ghostwriter` のみ**を許可[最小権限。All repositories は選ばない]。
3. ビルド設定[フロントが `web/` サブディレクトリ]:
   - **Root directory**: \`web\`
   - **Build command**: \`npm run build\`[postinstall が Pyodide ホイールをベンダリング]
   - **Deploy command**: \`npx wrangler deploy\`
   - **wrangler 設定**: \`web/wrangler.jsonc\` を自動検出。
4. 初回ビルドが走り、\`https://command-ghostwriter.<subdomain>.workers.dev\` が払い出される。

> この方式では GitHub に秘密値を保管しない。認可は Cloudflare 側の GitHub App インストールで管理する。

## 3. 認可情報の管理 [シークレット取扱標準 / CLAUDE.md §3 準拠]

| 項目 | 内容 |
| --- | --- |
| 何の資格情報か | Cloudflare の GitHub App インストール認可[リポ読取 + ビルド/デプロイのステータス] |
| 発行経路 | 手順2のGitHub連携承認 |
| 保管先 | **Cloudflare側に保持**。GitHubリポジトリ/Secretsには保管しない |
| 最小権限 | GitHub App のインストール対象を \`tvna/command-ghostwriter\` 1リポに限定 |
| 失効/ローテーション | GitHub: Settings > Applications > Installed GitHub Apps > Cloudflare > Configure/Uninstall。Cloudflare: Workers & Pages > 該当プロジェクト > Settings > Builds > Disconnect |
| 疎通確認 | テストPRでプレビューURLが払い出されること[手順5] |

## 4. 代替: GitHub Actions + APIトークン [ネイティブ連携を使わない場合のみ]

GitHub Actions から \`wrangler deploy\` する場合に限り、以下の秘密値を **GitHub Secrets** に保管する。

| 項目 | 内容 |
| --- | --- |
| 資格情報 | \`CLOUDFLARE_API_TOKEN\`[Workers 編集権限] と \`CLOUDFLARE_ACCOUNT_ID\` |
| 発行経路 | Cloudflare Dashboard > My Profile > **API Tokens** > Create Token > テンプレート **"Edit Cloudflare Workers"** を選び、Account Resources を当該アカウントのみに絞る |
| 最小権限 | Account > **Workers Scripts: Edit** のみ[他の権限は付与しない]。Account ID はダッシュボード右側で確認 |
| 保管先 | GitHub > リポジトリ Settings > Secrets and variables > Actions に \`CLOUDFLARE_API_TOKEN\`/\`CLOUDFLARE_ACCOUNT_ID\` を登録 |
| 失効/ローテーション | Cloudflare の同画面で **Roll**[再生成]/**Delete**[失効]。90日目安でローテーション |
| 疎通確認 | Actions のデプロイジョブが緑で、workers.dev URL が更新されること |

> 値そのものをログ・PR・コミットに出力しないこと[CLAUDE.md §4 のシークレット非露出]。

## 5. デプロイの疎通確認 [必須]

1. **本番**: workers.dev URL を開き、空状態→サンプル投入→実生成が表示されることを確認。
2. **SPA**: \`#/library\` で**リロード**しても 404 にならないこと[\`not_found_handling: single-page-application\` の証明]。
3. **Pyodide**: ネットワークタブで \`/pyodide/*.wasm\` が \`application/wasm\` かつ \`immutable\` で配信されること。
4. **parity**: 既知のテンプレで Vercel と同一出力になること。

## 6. ロールバックとトラブルシュート

- **本番ロールバック**: Workers & Pages > 該当 > **Deployments** > 直前の正常デプロイ > **Rollback**。
- **ビルド失敗**: Build logs を確認。Root directory[\`web\`]/Build command の設定ミスが典型。
- **404[リロード]**: \`wrangler.jsonc\` の \`not_found_handling\` を確認。
- **wasm が大きい/遅い**: \`_headers\` の immutable キャッシュが効いているか[2回目アクセスで304/メモリキャッシュ]を確認。
```

- [ ] **Step 2: ASCII / 体裁の簡易確認**

Run: `cd /home/user/command-ghostwriter && test -f docs/runbooks/cloudflare-workers-deploy.md && echo OK`
Expected: `OK`。

- [ ] **Step 3: コミット**

```bash
cd /home/user/command-ghostwriter
git add docs/runbooks/cloudflare-workers-deploy.md
git commit -m "docs: add Cloudflare Workers mirror deploy runbook (#441)"
```

---

### Task 4: [代替経路を採る場合のみ] GitHub Actions デプロイワークフロー

> ネイティブGit連携[Task 3 手順2]を採用するなら**本タスクはスキップ**。GH Actions 経路を選ぶ場合のみ実施する。

**Files:**
- Create: `.github/workflows/cloudflare-deploy.yml`

- [ ] **Step 1: ワークフローを作成**

Create `.github/workflows/cloudflare-deploy.yml`:

```yaml
name: Cloudflare Workers Deploy

on:
  push:
    branches: [main]
    paths: ["web/**", "features/**", ".github/workflows/cloudflare-deploy.yml"]

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: step-security/harden-runner@ec9f2d5744a09debf3a187a3f4f675c53b671911 # v2.13.0
        with:
          egress-policy: audit
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@b39b52d1213e96004bfcb1c61a8a6fa8ab84f3e8 # v4.0.1
        with:
          node-version: "22"
          cache: npm
          cache-dependency-path: web/package-lock.json
      - name: Install and build
        working-directory: web
        run: |
          npm ci
          npm run build
      - name: Deploy to Cloudflare Workers
        working-directory: web
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 2: ワークフロー lint**

Run: `cd /home/user/command-ghostwriter && bash scripts/ci-parity.sh 2>/dev/null || true; git add .github/workflows/cloudflare-deploy.yml`
Expected: 既存のワークフローリンタ[`scripts/install-workflow-linters.sh` 系]がある場合は緑。無ければ手動で YAML 構文を確認。

- [ ] **Step 3: コミット**

```bash
cd /home/user/command-ghostwriter
git commit -m "ci: add Cloudflare Workers deploy workflow (token path) (#441)"
```

---

### Task 5: 最終検証 & プッシュ

- [ ] **Step 1: ビルド + dist 構成確認**

Run: `cd /home/user/command-ghostwriter/web && npm run build && test -f dist/index.html && test -f dist/_headers && ls dist/pyodide/pyodide.asm.wasm`
Expected: 3つすべて存在[index.html / _headers / pyodide wasm]。

- [ ] **Step 2: プッシュ**

```bash
cd /home/user/command-ghostwriter
git push origin claude/vercel-redesign-migration-k4w31u
```

- [ ] **Step 3: 実デプロイ疎通**

ランブック手順5に従い、ネイティブGit連携[または GH Actions]でデプロイし、workers.dev URL で空状態→実生成→`#/library` リロード→`.wasm` immutable を確認する。Vercel と同一出力[parity]を確認する。

Expected: 全項目OK。

---

## Self-Review[スペック対応]

- **同一 dist の Workers Static Assets 配信**[spec CF節] → Task 1。
- **SPAフォールバック** → Task 1[`not_found_handling`] + Task 3 手順5-2。
- **Brotli + immutable キャッシュ[Tier1]** → Task 2[`_headers`] + Cloudflare 自動圧縮。
- **ネイティブGit連携を第一候補 / GH Actions 代替 / シークレット標準** → Task 3[runbook] + Task 4[代替ワークフロー]。
- **Pyodide 資産[25MiB/ファイル上限内・wasm MIME]** → Task 5 で存在確認。標準Pyodideは単一スレッドで COOP/COEP 不要[spec]。
- **Vercel 継続[置換しない]** → 本フェーズは追加のみ。

## 完了後

- 3フェーズ完了で Issue #441 をクローズ可能。マージ後、CLAUDE.md §3 に従い**レトロスペクティブIssue**を自動起票[#441 が #395 の follow-up でない独立移行のため、CLAUDE.local.md の例外には該当せず新規レトロを立てる]。Tier2 性能[#442]は別途。
```

