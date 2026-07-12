# 設計: 未経験者向けインフラ研修シナリオテンプレートの整備

- Issue: #541
- ブランチ: claude/infra-training-simulation-templates-2lpdjb
- 日付: 2026-07-12

## 背景と目的

日本のIT業界で業界未経験のインフラエンジニアを育成するため、command-ghostwriterのテンプレートライブラリを研修教材として使える水準に整備する。

1. 既存9テンプレートに「目的（学習目標）」「用語解説」「動作確認」を追加し、研修教材として通用する構成にブラッシュアップする
2. 教育効果の高い新規シナリオを47本追加する
3. 物理設備工事系（ラックマウント設計・電源設計・ケーブリング）を扱う新カテゴリ `facility` を新設する

新規シナリオは、DNS/クラウド/仮想化・障害対応/監視/ログ・セキュリティ/バックアップ・ネットワーク/サーバ基礎・物理設備工事系の5クラスタそれぞれについて、fableサブエージェントに12候補のブレインストーミングと教育効果評価（Bloom型の一貫性・実務との近さ・誤解矯正力・安全性/CLI完結性の4軸）を依頼し、上位10件を選定した後、クラスタ間の重複を統合した結果である。対象者は全員「入門」レベルの業界未経験者とし、難易度の段階分けは行わない。

## 確定した分岐[ブレインストーミング]

| 分岐 | 確定 | 根拠 |
| --- | --- | --- |
| 既存テンプレートの扱い | **既存9テンプレート全部をブラッシュアップ**（目的/用語解説/動作確認を追加） | オーナーが明示的に選択。手順書系だけでなく機器設定系（cisco-switchport等）も含め、ライブラリ全体を研修教材として使える水準に揃える |
| 新規シナリオの配置 | **既存カテゴリ（network/server/dns/runbook）に分散配置**し、物理設備工事系のみ新カテゴリ `facility` を新設 | オーナーが選択。ライブラリの「1本=1カード」という表示形式は維持しつつ、内容に最も近いカテゴリへ配置する。物理設備工事系は既存5カテゴリのいずれにも収まらないため新設が必要 |
| 難易度 | **入門のみで統一** | オーナーが選択。全シナリオを業界未経験者が単体で完走できるレベルに揃える。段階分け（difficulty フィールド）は導入しない |
| シナリオ数 | 下限30本 → **最終47本**（上振れ歓迎とオーナーが明言） | 各クラスタの候補を精査した結果、教育効果の高いシナリオが想定より多く見つかったため |
| 実装単位 | **6フェーズに分割し、フェーズごとに子issue・個別PR** | オーナーが選択。一括1PRは差分が56テンプレート分(推定150+ファイル変更)に達し、CLAUDE.md 5節（変更サーフェスをnarrowに保つ）とレビュー可能性に反する |
| facilityカテゴリのアイコン | **新規SVGを作らず既存の `server` アイコンを流用** | `ai` カテゴリ新設時（2026-07-02設計）の前例に倣う。物理設備・ハードウェア一般を象徴する既存アイコンとして違和感がない |

## ドキュメント構造（共通仕様）

既存9本・新規47本のすべてで、生成されるMarkdownを以下の6セクション構成に統一する。既存テンプレートは1・2・5・6を追加し、3・4（シナリオ設定・手順）は現状の内容を維持する。

1. **目的** — このシナリオで何ができるようになるか（学習目標を1〜2文）
2. **用語解説** — シナリオに登場する専門用語5〜8語を初学者向けに解説する固定テキスト（Jinjaテンプレート内に直接記述。データファイルの変数化は不要）
3. **シナリオ設定** — 実務を模した状況説明（既存構造踏襲）
4. **手順** — CLIコマンドを含む具体的な作業手順（既存構造踏襲。物理設備系は作業チェックリスト＋可能な範囲でのCLI確認コマンドを併用）
5. **動作確認** — 手順が正しく完了したことを確認するチェック項目
6. **注意事項** — 末尾に追加する、安全警告と前提条件を含む包括的な注意書き。破壊的操作の影響範囲・本番環境での実施前に検証環境で確認すべき点・ロールバック手段・課金や実害が発生し得るリスク（安全警告側面）に加え、必要な権限・演習環境の前提・実機がない場合の代替手順（前提条件側面）を箇条書きでまとめる

「目的」「用語解説」「注意事項」はシナリオ固有の固定文章であり、設定定義ファイル（yaml/toml/csv）の変数追加は不要。既存の `Meta` 型・`file()` 読み込み機構は変更しない。

## 変更内容

### 1. 既存9テンプレートのブラッシュアップ（フェーズ1）

対象: `cisco-switchport` / `yamaha-router` / `linux-init` / `dns-zone` / `incident-campus` / `incident-proxy` / `firewall-rules` / `dgx-spark-ollama` / `zero-trust-access`

各 `.j2` の冒頭に「目的」「用語解説」を、末尾に「動作確認」を追加する。データファイル（toml/yaml/csv）・`templates.ts` のメタ情報は変更しない。用語解説の語彙は各テンプレートの技術領域に応じて個別に選定する（例: cisco-switchportなら VLAN・トランクポート・アクセスポート等、dns-zoneなら SOA・TTL・MXレコード等）。

### 2. 新規シナリオ47本（フェーズ2〜6）

各シナリオは `assets/examples/<id>.<format>` + `assets/examples/<id>.j2` のペアとして実装し、`web/src/lib/templates.ts` の `META` 配列に1エントリずつ追加する（既存の慣例に従う）。

#### フェーズ2: DNS/クラウド/仮想化（10本）

| id | name | category | subCategory | format |
| --- | --- | --- | --- | --- |
| docker-basic-ops | Dockerコンテナ基本操作 | server | Docker | yaml |
| dns-resolve-troubleshoot | 名前解決トラブルの切り分け | runbook | DNS切り分け | yaml |
| kvm-snapshot-restore | 変更作業前のVMスナップショット取得と復元 | runbook | KVMスナップショット | yaml |
| aws-ec2-basic-ops | AWS CLIでEC2インスタンスを作成・停止・削除する | server | AWS CLI | yaml |
| dns-record-migration | サーバ移転に伴うDNSレコード切替（TTL事前調整） | dns | DNS切替 | csv |
| virsh-vm-lifecycle | virshでLinux VMを作成して起動・停止する | server | KVM/libvirt | toml |
| aws-s3-backup-basics | AWS CLIでS3バケットを作りバックアップを保管する | server | AWS CLI | yaml |
| dnsmasq-office-dns | dnsmasqで小規模オフィスの内部DNSを立てる | dns | dnsmasq | toml |
| dns-secondary-transfer | セカンダリDNSを追加してゾーン転送で冗長化する | dns | BIND冗長化 | toml |
| podman-rootless-service | Podmanでrootlessコンテナを常時起動サービス化する | server | Podman | yaml |

- `dns-resolve-troubleshoot` は当初案から拡張し、`getent hosts` と `dig` の結果差分を観察するステップ（/etc/hostsテストエントリ追加→解決経路の違いを体感→掃除）を組み込む。これは統合元の候補（クライアント側名前解決）の核心技法を吸収したもの。
- 各テンプレートの学習目標・用語解説候補・手順概要・動作確認項目は、付随資料 `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-scenario-details.md` に47本すべて記載済み。実装フェーズでは各担当エージェントがこの資料を直接参照する。

#### フェーズ3: 障害対応/監視/ログ（9本）

| id | name | category | subCategory | format |
| --- | --- | --- | --- | --- |
| disk-usage-triage | ディスク使用率100%障害の切り分けと復旧 | runbook | ディスク | yaml |
| systemd-service-recovery | systemdサービス起動失敗の調査と復旧 | runbook | systemd復旧 | yaml |
| cron-healthcheck | cronとシェルスクリプトによる簡易死活監視の構築 | server | 監視 | csv |
| load-spike-triage | サーバ負荷急増時の一次切り分け | runbook | 負荷 | yaml |
| logrotate-setup | logrotateによるログローテーション設定 | server | ログ運用 | csv |
| web-error-log-triage | Webサーバの5xxエラー多発時のログ調査 | runbook | Webログ | yaml |
| oom-memory-triage | メモリ枯渇・OOM Killer発動時の切り分け | runbook | メモリ | yaml |
| mail-delivery-triage | メール送信不能（Postfix）の切り分け | runbook | メール | yaml |
| alert-first-response | アラート一次対応の型（受信から報告まで） | runbook | 一次対応 | yaml |

- 当初候補にあった `cert-expiry-monitor`（cron定期点検）は、フェーズ4の `cert-expiry-watch` に統合済み（下記参照）。
- `journalctl-log-basics`（ツール単体チュートリアル）は不採用。journalctl操作は disk-usage-triage / systemd-service-recovery / oom-memory-triage の手順内で文脈つきで習得させる。

#### フェーズ4: セキュリティ/バックアップ（10本）

| id | name | category | subCategory | format |
| --- | --- | --- | --- | --- |
| ssh-key-hygiene | SSH鍵管理のベストプラクティス | server | SSH | toml |
| rsync-daily-backup | rsyncによる日次バックアップ取得 | server | バックアップ | yaml |
| restore-drill | バックアップからのリストア訓練 | runbook | リストア | yaml |
| sudo-least-privilege | sudo権限の最小化 | server | sudo | yaml |
| password-policy-basics | パスワードポリシーの設定 | server | 認証 | toml |
| log-integrity-hash | ログ改ざん検知の基礎（ハッシュ検証） | server | ログ保全 | toml |
| account-audit | 不要アカウントの棚卸しとロック | runbook | 棚卸し | csv |
| cert-expiry-watch | TLS証明書の期限確認と更新運用 | runbook | 証明書 | csv |
| fail2ban-ssh-guard | fail2banによるSSHブルートフォース対策 | server | 侵入対策 | toml |
| vuln-patch-triage | 脆弱性スキャン結果への一次対応 | runbook | 脆弱性対応 | csv |

- `cert-expiry-watch` はフェーズ3案（cron定期点検・監視化）とフェーズ4原案（openssl確認＋`certbot renew --dry-run`）を統合し、「定期点検（cron+openssl）→ 更新（dry-run→実更新）」まで一気通貫で扱う一本のシナリオとする。
- `zero-trust-access`（既存、CA構築側）とはレイヤが異なる（本シナリオは証明書の消費・運用側）ため重複しない。

#### フェーズ5: ネットワーク/サーバ基礎（8本）

| id | name | category | subCategory | format |
| --- | --- | --- | --- | --- |
| file-permissions | ファイルパーミッションと所有者管理 | server | パーミッション | csv |
| connectivity-check | ping・tracerouteによる疎通確認の型 | network | 疎通確認 | csv |
| systemd-unit-basics | systemdサービスの基本操作とユニット作成 | server | systemd基本 | toml |
| port-listening-check | ssとncによるポート待受・疎通確認 | network | ポート確認 | csv |
| cron-scheduling | cronによる定期実行ジョブの設定 | server | cron | csv |
| subnetting-basics | IPアドレス設計とサブネット分割の基礎 | network | IPアドレス設計 | csv |
| ntp-chrony | chronyによるNTP時刻同期の設定 | server | 時刻同期 | toml |
| disk-mount-basics | ディスクのフォーマットとマウント入門（ループバック演習） | server | ディスク管理 | yaml |

- 当初候補の `name-resolution-client`（getent/dig差分の実演）はフェーズ2の `dns-resolve-troubleshoot` に統合済み。
- 当初候補の `log-management-basics`（journalctl+logrotate）はフェーズ3の `logrotate-setup` と内容が重複するため不採用。
- `package-management-basics` と `static-ip-nmcli` は選外（前者はBloom一貫性が単一環境で崩れる、後者はSSH経由演習でのロックアウトリスクが「1本で安全に完結」の原則に反する）。
- `cron-scheduling`（cron機構そのものの入門）と `cron-healthcheck`（cronを使った監視の構築）は目的が異なるため両方を採用する。`cron-scheduling` はcrontab書式・PATH問題・`-r`事故に集中し、`cron-healthcheck` は監視スクリプトの設計に集中させることで内容の重複を避ける。
- `systemd-unit-basics`（基本操作: start/stop/enable/daemon-reload）と `systemd-service-recovery`（障害復旧: ログから原因特定）はサブカテゴリ名を分けて区別し、基礎→応用の学習順を形成する。

#### フェーズ6: 物理設備工事系（新カテゴリ `facility`、10本）

| id | name | subCategory | format |
| --- | --- | --- | --- |
| rack-power-budget | ラック電源容量設計（ブレーカーマージン計算） | 電源設計 | csv |
| rack-mount-layout | ラックマウント搭載位置設計 | ラック設計 | csv |
| dual-power-redundancy | 二重電源冗長化チェック（PDU系統分散） | 電源設計 | csv |
| structured-cabling-plan | 構造化配線・配線表作成 | ケーブリング | csv |
| lan-cable-category | LANケーブルカテゴリ選定と敷設確認 | ケーブリング | csv |
| ups-capacity-plan | UPS容量計算とバックアップ時間設計 | 電源設計 | yaml |
| cable-labeling-standard | ケーブルラベリング規約適用 | ケーブリング | csv |
| server-racking-procedure | サーバラッキング作業手順（レール・搭載・接地） | ラッキング | yaml |
| rack-airflow-design | エアフロー設計とブランクパネル計画 | 環境設計 | yaml |
| env-monitoring-setup | 温湿度モニタリング設置と閾値設計 | 環境監視 | yaml |

全て `category: "facility"`。実機がなくても「表の四則演算＋合否判定」または「ipmitool/lldpctl/ethtool等の模擬出力の読解」で完結させ、感電・機器落下等の実害を伴う手順は含めない。選外とした `grounding-esd-check`（接地・ESD対策）は `server-racking-procedure` の接地確認ステップに統合し、`dc-entry-work-request`（入館・作業申請）は技術概念が薄く教材接続が弱いため不採用とする。

### 3. Web UI登録変更

- `web/src/lib/types.ts`: `TemplateCategory` に `"facility"` を追加
- `web/src/components/Library.tsx`: `CATS` に `{ id: 'facility', label: '物理設備', icon: 'server' }` を追加（新規SVGは作らず既存の `server` アイコンを流用）
- `web/src/lib/templates.ts`: `META` 配列に新規47エントリを追加（`format`/`output: "markdown"`/`live: true`/`updated: "<実装日>"` を各フェーズの実装コミット時点の日付で設定）

### 4. 変更しないもの

- Pythonコア（`features/`）・レンダリングエンジン: 変更不要（テンプレートはデータとして読み込まれるのみ）
- `web/src/lib/types.ts` の `Meta`/`Template` インターフェース構造（`difficulty` 等のフィールド追加は行わない — 難易度は入門のみで統一するため不要）
- `web/src/lib/data.ts`（cisco-switchport専用のサンプル読込）: 対象外
- README のユースケース例: テンプレートはライブラリUIから発見可能なため追記しない

## エラーハンドリング

`templates.ts` の `file()` はアセット欠落時に throw する既存ガードがあり、ペア漏れはビルド/テストで即検出される。追加のチェックは設けない。

## 実装フェーズと管理

親issue #541 の配下に、フェーズごとの子issueを立てて個別にPR化する。

| フェーズ | 内容 | 本数 |
| --- | --- | --- |
| 1 | 既存9テンプレートのブラッシュアップ | 9 |
| 2 | DNS/クラウド/仮想化 | 10 |
| 3 | 障害対応/監視/ログ | 9 |
| 4 | セキュリティ/バックアップ | 10 |
| 5 | ネットワーク/サーバ基礎 | 8 |
| 6 | 物理設備工事系（新カテゴリ facility） | 10 |

各フェーズは前フェーズの完了（PRマージ）を待たずに着手可能（`templates.ts` へのエントリ追加は基本的に競合しない独立行のため）。ただしフェーズ6のみ `types.ts`/`Library.tsx` のカテゴリ追加を伴うため、他フェーズと同時に着手する場合はマージ順序の調整が必要。

## 検証

この環境で実行可能な検証（実行できないものはなし）:

1. **本物のレンダリングエンジンでの描画確認**: `uv run python` で `features.config_parser.ConfigParser` + `features.document_render.DocumentRender` に新規ペアを通し、strict undefined でエラーなく Markdown が生成されることを確認（Visual Debug 相当の検証）
2. **型・単体テスト**: `cd web && npx tsc --noEmit && npm test`（`templates.ts` の glob 読込とUIスモークが通ること）
3. **lint**: 既存のlint構成に従う

E2E（render-parity）はテンプレート内容に依存しないため対象外。
