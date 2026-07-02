# 設計: AIインフラ特化テンプレートの追加[DGX Spark + ollama / ゼロトラストアクセス基盤]

- Issue: #494
- ブランチ: claude/ai-infrastructure-templates-9gzvkb
- 日付: 2026-07-02

## 背景と目的

テンプレートライブラリの利用体験向上のため、今後需要が伸びるAIインフラに特化したテンプレート群を追加していく。本設計はその第1弾として次の2テンプレートを追加する。

1. **DGX Spark + ollama を使ったAIマシンの初期セットアップ**
2. **商用で使えるゼロトラストのセキュリティインフラ構築**（AIマシンのAPI/SSHへのアクセス基盤）

いずれも Terraform / Ansible のような IaC が使えない現場を想定し、CLI手作業で完結する Markdown 手順書を生成する。

## 確定した分岐[ブレインストーミング]

AskUserQuestion がインフラエラーで応答不能だったため、以下は推奨案で自律確定した。オーナーレビューで差し戻し可能（テンプレート追加は可逆な変更）。

| 分岐 | 確定 | 根拠 |
| --- | --- | --- |
| カテゴリ | **新カテゴリ `ai`（表示名: AIインフラ）を追加し、両テンプレートを配置** | オーナーは「AIインフラ特化テンプレートを今後も追加していく」と明言。系列の受け皿を先に用意する。ゼロトラストの題材もAIマシン保護に紐づけ、シリーズとして一貫させる |
| ZTスタック | **OSSセルフホスト型: Caddy(Apache-2.0) + Smallstep step-ca(Apache-2.0) + nftables/ufw + fail2ban** | 「商用で使える」= 商用利用可能なライセンスかつベンダーロックインなし、と解釈。SaaS型（Cloudflare ZT等）はアカウント契約前提でIaC不使用現場の想定に反する。Authelia等のSSO統合は設定ファイルが重くCLI手順書の粒度を超えるため見送り（YAGNI） |
| DGXスコープ | **基本セットアップのみ**: OS初期設定 + ollama導入 + モデルpull + LAN内API公開 + systemd常駐化 + 動作確認 | Open WebUI等のフロントは要望にないため見送り（YAGNI）。OS初期設定は linux-init と重複するが、DGX OS（Ubuntuベース）固有の文脈で自己完結させる |
| データ形式 | **両方 YAML → Markdown 出力** | 手順書系の既存テンプレート（linux-init, incident-*）の慣例に従う |

## 変更内容

### 1. テンプレート実体（`assets/examples/`）

既存の慣例（`<id>.<format>` + `<id>.j2` のペア、kebab-case id）に従う。

- `dgx-spark-ollama.yaml` / `dgx-spark-ollama.j2`
  - データ: ホスト名・タイムゾーン・LANサブネット・SSH方針・ollama設定（bind/port/keep_alive・モデル一覧）・接続クライアント
  - 手順書: DGX OS初期設定（ホスト名/TZ/apt更新）→ SSH堅牢化 → ufw（default deny + LAN限定許可）→ ollamaインストール → systemdオーバーライドでLAN公開 → モデルpull → GPU/API動作確認
- `zero-trust-access.yaml` / `zero-trust-access.j2`
  - データ: サイト名・CA情報・保護対象サービス（例: ollama API）・クライアント（人/端末）・SSH証明書ポリシー・許可ポート
  - 手順書: ゼロトラスト方針の宣言（default deny・場所でなく証明書で認証・短命クレデンシャル）→ step-ca 初期化 → Caddy で mTLS 終端しupstreamへ → クライアント証明書発行（端末ごと）→ SSH証明書化（パスワード/静的鍵の無効化）→ fail2ban・監査ログ → 検証（証明書なしアクセスが拒否されること）

### 2. Web UI 登録

- `web/src/lib/types.ts`: `TemplateCategory` に `"ai"` を追加
- `web/src/components/Library.tsx`: `CATS` に `{ id: 'ai', label: 'AIインフラ', icon: 'terminal' }` を追加（既存アイコンを流用、新規SVGは作らない）
- `web/src/lib/templates.ts`: META に2エントリ追加（`category: "ai"`, `format: "yaml"`, `output: "markdown"`, `live: true`, `updated: "2026-07-02"`）

### 3. 変更しないもの

- Pythonコア（`features/`）・レンダリングエンジン: 変更不要（テンプレートはデータとして読み込まれるのみ）
- `web/src/lib/data.ts`（cisco-switchport専用のサンプル読込）: 対象外
- README のユースケース例: テンプレートはライブラリUIから発見可能なため追記しない

## エラーハンドリング

`templates.ts` の `file()` はアセット欠落時に throw する既存ガードがあり、ペア漏れはビルド/テストで即検出される。追加のチェックは設けない。

## 検証

この環境で実行可能な検証（実行できないものはなし）:

1. **本物のレンダリングエンジンでの描画確認**: `uv run python` で `features.config_parser.ConfigParser` + `features.document_render.DocumentRender` に新規2ペアを通し、strict undefined でエラーなく Markdown が生成されることを確認（Visual Debug 相当の検証）
2. **型・単体テスト**: `cd web && npx tsc --noEmit && npm test`（`templates.ts` の glob 読込とUIスモークが通ること）
3. **lint**: 既存のlint構成に従う

E2E（render-parity）はテンプレート内容に依存しないため対象外。
