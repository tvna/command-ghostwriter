# Runbook: Vercel デプロイ [アカウント作成から]

- 関連Issue: #395
- 関連設計: `docs/superpowers/specs/2026-06-12-streamlit-to-vercel-migration-design.md`
- 対象: Command Ghostwriter の静的フロントエンド[Vite + React、ブラウザ内Pyodide]
- 連携方式: **Vercel 純正 Git 連携**[GitHubにデプロイトークンを保管しない]

## 0. 前提と全体像

本アプリはバックエンドを持たない**完全静的サイト**[計算は全てブラウザ内Pyodideで完結]。
Vercel純正Git連携を使うと、ビルドとデプロイはVercel側で自動実行され、GitHubには長命トークンを保管しない。

```
git push (main)         -> Vercel が自動で本番デプロイ
Pull Request を作成     -> Vercel が自動でプレビューデプロイ + PRにURLをコメント
```

> 商用利用は不可[Vercel Hobbyプランは非商用]。本プロジェクトはOSSのため適合。

## 1. Vercelアカウント作成

1. https://vercel.com/signup を開く。
2. **"Continue with GitHub"** を選ぶ[GitHubアカウントでサインアップ]。
   - 既存のGitHubログインを使うため、Vercel専用のパスワードは発行されない。
3. GitHubのOAuth同意画面で許可する。
4. プラン選択は **Hobby[無料]** を選ぶ。

## 2. GitHub App[Vercel]の権限付与 [最小権限]

1. Vercelダッシュボード初回フローで GitHub との接続を求められる。
2. **"Only select repositories"** を選び、**`tvna/command-ghostwriter` のみ**を許可する。
   - 全リポジトリ許可[All repositories]は選ばない[最小権限]。
3. これでVercelの "Vercel" GitHub App が当該リポにのみインストールされる。

## 3. プロジェクトのインポートと設定

1. ダッシュボード > **Add New... > Project**。
2. `tvna/command-ghostwriter` を **Import**。
3. ビルド設定[フロントが `web/` サブディレクトリに入る前提]:
   - **Root Directory**: `web`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`[= `vite build`]
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`[lockfile固定]
4. **Environment Variables**: 本アプリはブラウザ内完結のため**不要**[サーバ秘密を持たない]。
   - 将来サーバ機能を足さない限り、ここに秘密値を追加しないこと。
5. **Deploy** を押す。初回ビルドが走り、本番URL[例: `command-ghostwriter.vercel.app`]が払い出される。

> Pyodide資産は `web/public/` に self-host し、`vite build` が `dist/` 直下へコピーする[CDN非依存]。`.wasm` のMIMEはVercelが正しく配信する。標準Pyodideはスレッド不使用のため COOP/COEP 等の特別ヘッダは不要。

## 4. デプロイの疎通確認 [必須]

1. **本番**: 払い出されたURLを開き、エディタにサンプルを投入して生成結果が表示されることを確認。
2. **プレビュー**: 任意の小さな変更でPRを作成し、Vercelが
   - チェックを追加し、
   - PRにプレビューURLをコメントし、
   - そのURLで動作することを確認。
3. これが通れば連携[認可]が正しく機能している証拠[疎通確認完了]。

## 5. 認可情報の管理 [シークレット取扱標準 / CLAUDE.md §3 準拠]

本方式では**GitHub Secretsに新しい秘密値を追加しない**。管理対象は「VercelとGitHubの認可[GitHub App + OAuth]」のみ。

| 項目 | 内容 |
| --- | --- |
| 何の資格情報か | Vercel "Vercel" GitHub App のインストール認可[リポ読取 + チェック/デプロイのステータス書込]と、サインアップ時のGitHub OAuth |
| 発行経路 | Vercelサインアップ時のGitHub OAuth同意 [手順1-2] |
| 保管先 | **Vercel側に保持**。GitHubリポジトリ/Secretsには保管しない |
| 最小権限 | GitHub Appのインストール対象を `tvna/command-ghostwriter` 1リポに限定 [手順2] |
| 失効/ローテーション | GitHub: Settings > Applications > Installed GitHub Apps > **Vercel** > Configure[対象変更] / Suspend / **Uninstall**[失効]。Vercel: Project Settings > **Git** > Disconnect[接続解除] |
| 疎通確認 | テストPRでプレビューURLが払い出されること [手順4] |

> 将来 GitHub Actions 経由のトークン方式に切り替える場合は、`VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` をGitHub Secretsに保管し、発行経路[Vercel: Account Settings > Tokens]・最小スコープ・失効[同画面でRevoke]・90日程度のローテーション・テストデプロイでの疎通確認を本表に追記すること。今回は純正Git連携のため不要。

## 6. ロールバックとトラブルシュート

- **本番ロールバック**: Vercel > プロジェクト > **Deployments** > 直前の正常デプロイ > **... > Promote to Production**[即時切戻し]。
- **ビルド失敗**: 該当デプロイの **Build Logs** を確認。Root Directory / Build Command / Output Directory の設定ミスが典型。
- **プレビューが出ない**: GitHub App のインストール対象に当該リポが含まれているか[手順2]を再確認。
- **404[ルーティング]**: SPAのためVercelの静的配信で基本不要だが、必要時は `web/vercel.json` で rewrites を設定[本リリースのMVPでは単一ページのため未設定]。

## 7. 無料枠の目安 [Hobby]

- 非商用OSS向け。帯域・ビルド時間に上限あり[小規模静的サイトでは通常問題にならない]。
- 上限に近づいた場合はVercelダッシュボードの **Usage** で確認する。
