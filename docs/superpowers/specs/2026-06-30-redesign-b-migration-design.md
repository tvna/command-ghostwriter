# 設計: Vercel Web アプリの Redesign B[2ペイン・エディタ]移行 + Cloudflare Workers ミラー

- Issue: #441
- 親Issue: #395[Streamlit -> Vercel 移行。本設計はそのP1/P2で作ったUIを刷新する]
- ブランチ: claude/vercel-redesign-migration-k4w31u
- デザイン元: `design/redesign-b`[HANDOFF.md, app/, project/redesign/]
- 日付: 2026-06-30

## 背景と目的

現行の `web/`[Vite + React + ブラウザ内Pyodide、Vercelデプロイ済み]は #395 のP1/P2で構築したが、**致命的なUX問題**を抱える:

1. レイアウトが旧Streamlitのタブ構成を縦積みで写経しただけで、オンボーディングが無い。
2. 設定ファイルの**暗黙のフォーマット自動判定が誤爆する**[`config.csv` 等の拡張子推定に依存]。

オーナーはUXをゼロから仕切り直し、**Redesign B[2ペインのライブエディタ]**を `design/redesign-b` ブランチに用意した。Redesign B は「空状態オンボーディング -> 2ペイン編集 -> Library」のフローを持ち、**明示的なTOML/YAML/CSV選択 + 行番号付きエラー + 実際にパースできる形式の提案**で上記バグを解消している[README の "the original implicit-format bug, fixed"]。

**ゴール**: Redesign B を新しい `web/` フロントエンドとして採用し、デザインのモックエンジンではなく**本物のPyodideエンジン**に配線する。加えて **Cloudflare Workers の静的ミラー**配信を追加する。Next.js は使わない。モバイルは対象外[デザインがデスクトップ専用]。

## 確定した分岐[ブレインストーミング]

| 分岐 | 確定 | 根拠 |
| --- | --- | --- |
| 統合方式 | **A: `web/` のUI層だけ差し替え** | 実証済みのビルド/Pyodideワーカー/テスト/Vercel連携を温存し、リスクをUI層に閉じ込める。`web/` 丸ごと置換[B]は手戻り大。モック併用[C]はYAGNIで却下 |
| 機能スコープ | **Bの画面に従いつつ重要機能を救済** | UXのシンプル化を優先しつつ実利を残す |
| 救済対象 | **エンコード選択ダウンロード[UTF-8/Shift_JIS]、HowTo/構文ドキュメント** | 前者は既存 `download.ts` の配線のみ。後者は実務上の価値が高い |
| 非救済[今回] | 設定デバッグの TOML/YAML 可視化[Debugは JSON のみ] | Redesign の Debug ペインは JSON。トーン統一を優先し見送り |
| 対象外 | 旧 Workflow タブ | Bに存在しない |
| Library の正 | **6テンプレートを `assets/examples` に実ファイル化** | サンプル投入と Library を単一ソースに一元化 |
| エディタ | **デザイン版の軽量エディタを採用[CodeMirror依存を削除]** | Bの見た目を優先。バンドル軽量化 |
| 切り替え | **ビッグバン[1PR]切替** | 静的SPAでサーバ状態が無く、Vercelプレビューで本番同等の事前検証が可能。切戻しは前デプロイをPromote |
| CF Workers | **今回スコープに含める[別PR]** | 将来のミラー稼働をプランに含める |
| フォント | **Source Sans 3 / Source Code Pro を self-host[woff2]** | `web/` のCDN非依存方針に合わせる |

## デザイン元の構成と「正」の所在[事実]

`design/redesign-b` の調査結果:

- **コミット済みのTSX実装**: `design/redesign-b/app/src/`
  - `App.tsx`[ハッシュルーター: `#/` 空状態 / `#/library` / `#/new` / `#/t/<id>`]
  - `components/`[`Editor` `EmptyState` `Library` `CodeView` `SettingsModal` `Icon`]
  - `ds/`[デザインシステム原子: `Button` `Badge` `Selectbox` `Toggle` `TextInput` `RadioGroup` `FileUploader` `Divider`]
  - `styles/tokens/`[`colors` `typography` `spacing` `base` `fonts`]、`assets/`[ロゴ + 14 SVGアイコン]
- **未コミット**: `app/src/lib/`[`engine.ts` `templates.ts` `data.ts` `types.ts`]
  - 同等物はプロトタイプ `project/redesign/{engine.js, templates.js, data.js}` に**素のJS・モック実装**として存在
  - => `templates`/`data`/`types` は `project/redesign/{templates,data}.js` から **TSに起こす**。`engine`[モック]は**破棄**し、本物のPyodideワーカーに置換する

## アーキテクチャ[A採用]

```
ブラウザ[Vercel / Cloudflare Workers の静的配信・サーバ状態なし]
└─ UIスレッド [Vite + React + TypeScript]
   ├─ App.tsx        : ハッシュルーター[空状態 / Library / Editor]
   ├─ EmptyState     : 初回オンボーディング[2ファイル概念 + 3つの開始導線]
   ├─ Library        : テンプレートギャラリー[カテゴリレール + カードグリッド]
   ├─ Editor[中核]  : 2ペイン[左=データ定義/Jinjaテンプレ・明示フォーマット選択, 右=手順書(MD)/Raw/Debug(JSON)]
   │   └─ useGenerate(): ★エンジン境界★ 250ms debounce -> Worker postMessage
   ├─ SettingsModal  : 詳細設定[GenerateSettings 各項目 + ダウンロード設定]
   ├─ HowToModal     : 使い方 / 構文ドキュメント[救済]
   └─ ds/ + styles/tokens/ : デザインシステムとトークン[self-hostフォント]
         │
         └─ Web Worker [web/src/worker/ を維持]
              └─ Pyodide -> features/ [本物のPython中核を無改変実行]
```

中核は **A の方針どおり「UIは新品、土台は実証済み」**。`web/` の `vite.config.ts`[Pyodide vendoring プラグイン]、`worker/`、Vitest/Playwright、`index.html`、Vercel連携は維持する。

## エンジン境界[最重要]

デザインの `Editor.tsx` は同期関数 `compute(dataText, format, tplText)` を呼び、戻り値から出力・変数・検証を描画する。本物のエンジンは**非同期**[Worker postMessage、戻り値 `{output, configError, templateError, configDebug}`]。

橋渡しとして `useGenerate` フックを導入する:

- 入力: `dataText`, `format`['toml' | 'yaml' | 'csv']`, `tplText`, `settings`
- 動作: 250ms debounce -> `worker.postMessage({kind:'generate', request})`
- `GenerateRequest.configName` の拡張子で現行ワーカーがパーサを選ぶため、`format` を `config.<ext>` に写像して**明示選択を尊重**[暗黙判定バグの根治]
- 出力: `{output, configError, templateError, configDebug}` を Editor が期待する形へ整形
- **検証の上乗せ**[デザインの価値]: エラー時に
  - 行番号: ワーカーのエラーメッセージから抽出、無ければ薄いTSアダプタで補完
  - フォーマット提案: 入力を toml/yaml/csv で試パースし「実際にパースできた形式」を提示
  これらは Editor の StatusBar / 行ハイライトに供給する薄いTS層[`web/src/lib/validate.ts` 等]に閉じる

`features/`[Python中核]は**無改変**。ワーカー契約[`init`/`generate`/`ready`/`error`/`result`]も維持。

## 機能パリティと救済

| 領域 | 方針 | 再利用/新規 |
| --- | --- | --- |
| 右ペイン 手順書[MD] | Markdownレンダ | 現行 `Preview`[marked + dompurify]を流用 |
| 右ペイン Raw | 生テキスト | 新CodeView[軽量]/既存ロジック流用 |
| 右ペイン Debug[JSON] | 設定の構造可視化 | 現行 `ConfigDebug` のJSON経路を流用[TOML/YAML可視化は今回見送り] |
| 詳細設定 | `GenerateSettings` 各項目 | `csvRowsName`/`enableFillNan`+`fillNanWith`/`isStrictUndefined`/`enableAutoTranscoding`/`formatType`[0-4]をSettingsModalにマップ |
| ダウンロード[救済] | UTF-8/Shift_JIS選択 + ファイル名/TS/拡張子 | 既存 `download.ts`[`DownloadEncoding`対応済]を配線するのみ |
| HowTo/構文[救済] | 使い方モーダル | 現行 `HowToModal` 相当をBトーンで用意 |
| エディタ | 軽量textarea + 独自ハイライト | デザイン版CodeView系を採用、`@uiw/react-codemirror` を依存から削除 |

## Library とテンプレート

- `project/redesign/templates.js` の6シードテンプレート[カテゴリ: network/server/dns/runbook、format: toml/yaml/csv、output: cli/config/markdown]を**実ファイル化**して `assets/examples` に追加する。
- `web/src/samples.ts` 相当のローダを拡張し、Library とサンプル投入が**同一ソース**を参照するよう一元化する。
- **重要**: テンプレートの出力はモックではなく**実Pyodideで生成**できることを検証し、必要なら各テンプレ/データを実エンジンに通る形に修正する[プロトタイプのモック前提で書かれた箇所を是正]。

## Cloudflare Workers ミラー

- 同じ `dist/`[Vite静的出力 + 自己ホストPyodide資産]を **Workers Static Assets**[`wrangler` の `assets` バインディング]で配信。SPAのため `not_found_handling: single-page-application`[index.html フォールバック]。
- Pyodide資産はファイルあたり25MiB上限・総ファイル数2万件上限の範囲内[`pyodide.asm.wasm` 約9MB]。標準Pyodideは単一スレッドのため COOP/COEP 不要。`.wasm` の MIME は Workers が正しく配信。
- デプロイ:
  - **第一候補**: ネイティブGit連携[Cloudflare Workers Builds]でリポジトリ接続。GitHubに長命トークンを保管しない[Vercel方式と同じ思想]。
  - **代替**: GitHub Actions + `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`。採用時は発行経路[Cloudflare Dashboard > My Profile > API Tokens、テンプレート "Edit Cloudflare Workers" を最小スコープに調整]・保管先[GitHub Secrets]・最小権限・失効/ローテ[同画面でRoll/Delete、90日目安]・疎通確認[テストデプロイ]を runbook に明記[CLAUDE.md §3]。
- 成果物: `docs/runbooks/cloudflare-workers-deploy.md`[Vercel runbook と同じ章立て]。

## テストと検証

- 既存 Vitest コンポーネントテストは新コンポーネント[Editor/EmptyState/Library/SettingsModal/CodeView]に合わせて書き直す。
- Playwright `e2e/render-parity.spec.ts` を**回帰ガード**として維持: 既知の入力[config + template]に対し**実Pyodide出力が現行と一致**することを確認[Python-in-browser の健全性証明]。
- **ビッグバンPRのマージ前ゲート**: ① 全テスト緑[Vitest + Playwright + `features/` のCPythonテスト]、② **Vercelプレビューデプロイで実機確認**[空状態 -> サンプル投入 -> 実生成 -> ダウンロード]。本番[main]は無停止、切戻しは前デプロイのPromoteで即時。

## PR分割[Issue #441 のフェーズ]

各作業前にIssue/サブタスクを起票し、番号を全コミット/PRに記載する[CLAUDE.md §3]。

- **P-Redesign-1[基盤]**: デザイントークン・`ds/` 原子・SVGアイコン・self-hostフォントを `web/src` へ取り込む。挙動変更なし[視覚回帰の土台のみ]。
- **P-Redesign-2[ビッグバン切替]**: `App` をハッシュルーティングの 空状態/Library/Editor シェルへ置換、`useGenerate` でPyodideワーカーへ配線、templates/data をTS化、6テンプレを `assets/examples` 実ファイル化、エンコードDL + HowTo を救済、Vitestを書き直し、Playwright回帰を維持。
- **P-Redesign-3[CF Workers ミラー]**: `wrangler` 静的配信設定[同一 `dist/`、SPAフォールバック]、ネイティブGit連携デプロイ[GH Actions + トークンは代替]、Cloudflare deploy runbook 追加。

## 想定する非互換と注意点

- **CodeMirror撤去**: `@uiw/react-codemirror` と関連 `@codemirror/*` を `web/package.json` から削除。バンドル削減の一方、編集体験は軽量版に変わる[ユーザ確定済み]。
- **テンプレのモック前提**: プロトタイプは軽量JSエンジン用に書かれており、実Pyodide/`features/` で同一出力になる保証はない。P-Redesign-2 で各テンプレを実エンジンに通して**出力一致を検証・是正**する。
- **フォント差し替え**: デザインはGoogle Fonts CDN。self-host化で woff2 を `web/` に取り込み、`tokens/fonts.css` を書き換える。
- **デスクトップ専用**: モバイルレイアウトは対象外[デザイン方針]。

## 成果物

1. 本設計仕様[このファイル]。
2. 実装プラン[`docs/superpowers/plans/` 配下、writing-plans で作成]。
3. Cloudflare Workers デプロイ runbook[`docs/runbooks/cloudflare-workers-deploy.md`]。
