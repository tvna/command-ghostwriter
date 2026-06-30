# Runbook: Cloudflare Workers ミラーデプロイ [アカウント作成から]

- 関連Issue: #441
- 関連設計: `docs/superpowers/specs/2026-06-30-redesign-b-migration-design.md`
- 対象: Command Ghostwriter の静的フロントエンド[Vite + React、ブラウザ内Pyodide]の **Cloudflare Workers ミラー**
- 連携方式: **Cloudflare Workers Builds[ネイティブGit連携]** を第一候補[GitHubに長命トークンを保管しない]。代替は GitHub Actions + APIトークン。

## 0. 前提と全体像

バックエンドを持たない**完全静的サイト**[計算は全てブラウザ内Pyodide]。Vercel と並行する**ミラー**であり、Vercel を置き換えない。

```
git push (main)     -> Workers Builds が本番デプロイ[ネイティブGit連携時]
Pull Request        -> Workers Builds がプレビューデプロイ
```

## 1. Cloudflare アカウント作成

1. https://dash.cloudflare.com/sign-up を開き、無料アカウントを作成。
2. メール認証を完了する。Workers の無料枠で静的配信が可能[非商用OSS]。

## 2. ネイティブGit連携[第一候補・推奨]

1. ダッシュボード > **Workers & Pages** > **Create** > **Import a repository**。
2. GitHub 連携を承認し、**`tvna/command-ghostwriter` のみ**を許可[最小権限。All repositories は選ばない]。
3. ビルド設定[フロントが `web/` サブディレクトリ]:
   - **Root directory**: `web`
   - **Build command**: `npm run build`[postinstall が Pyodide ホイールをベンダリング]
   - **Deploy command**: `npx wrangler deploy`
   - **wrangler 設定**: `web/wrangler.jsonc` を自動検出。
4. 初回ビルドが走り、`https://command-ghostwriter.<subdomain>.workers.dev` が払い出される。

> この方式では GitHub に秘密値を保管しない。認可は Cloudflare 側の GitHub App インストールで管理する。

## 3. 認可情報の管理 [シークレット取扱標準 / CLAUDE.md 第3節 準拠]

| 項目 | 内容 |
| --- | --- |
| 何の資格情報か | Cloudflare の GitHub App インストール認可[リポ読取 + ビルド/デプロイのステータス] |
| 発行経路 | 手順2のGitHub連携承認 |
| 保管先 | **Cloudflare側に保持**。GitHubリポジトリ/Secretsには保管しない |
| 最小権限 | GitHub App のインストール対象を `tvna/command-ghostwriter` 1リポに限定 |
| 失効/ローテーション | GitHub: Settings > Applications > Installed GitHub Apps > Cloudflare > Configure/Uninstall。Cloudflare: Workers & Pages > 該当プロジェクト > Settings > Builds > Disconnect |
| 疎通確認 | テストPRでプレビューURLが払い出されること[手順5] |

## 4. 代替: GitHub Actions + APIトークン [ネイティブ連携を使わない場合のみ]

GitHub Actions から `wrangler deploy` する場合に限り、以下の秘密値を **GitHub Secrets** に保管する。

| 項目 | 内容 |
| --- | --- |
| 資格情報 | `CLOUDFLARE_API_TOKEN`[Workers 編集権限] と `CLOUDFLARE_ACCOUNT_ID` |
| 発行経路 | Cloudflare Dashboard > My Profile > **API Tokens** > Create Token > テンプレート "Edit Cloudflare Workers" を選び、Account Resources を当該アカウントのみに絞る |
| 最小権限 | Account > **Workers Scripts: Edit** のみ[他の権限は付与しない]。Account ID はダッシュボード右側で確認 |
| 保管先 | GitHub > リポジトリ Settings > Secrets and variables > Actions に `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` を登録 |
| 失効/ローテーション | Cloudflare の同画面で **Roll**[再生成]/**Delete**[失効]。90日目安でローテーション |
| 疎通確認 | Actions のデプロイジョブが緑で、workers.dev URL が更新されること |

> 値そのものをログ・PR・コミットに出力しないこと[CLAUDE.md 第4節 のシークレット非露出]。

## 5. デプロイの疎通確認 [必須]

1. **本番**: workers.dev URL を開き、空状態 -> サンプル投入 -> 実生成が表示されることを確認。
2. **SPA**: `#/library` で**リロード**しても 404 にならないこと[`not_found_handling: single-page-application` の証明]。
3. **Pyodide**: ネットワークタブで `/pyodide/*.wasm` が `application/wasm` で配信され、`/assets/*` は immutable・`/pyodide/*` は revalidate[max-age=86400, must-revalidate]になっていること。
4. **parity**: 既知のテンプレで Vercel と同一出力になること。

## 6. ロールバックとトラブルシュート

- **本番ロールバック**: Workers & Pages > 該当 > **Deployments** > 直前の正常デプロイ > **Rollback**。
- **ビルド失敗**: Build logs を確認。Root directory[`web`]/Build command の設定ミスが典型。
- **404[リロード]**: `wrangler.jsonc` の `not_found_handling` を確認。
- **wasm が大きい/遅い**: `_headers` の `/pyodide/*` 再検証[2回目アクセスで 304]と `/assets/*` immutable が効いているかを確認。
