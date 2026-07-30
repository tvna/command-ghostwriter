# facility カテゴリ拡張（フェーズ7）10シナリオ追加 設計書

- 日付: 2026-07-30
- 対象ブランチ: `claude/template-creation-2m-tokens-764e8x`
- 前提: `web/src/lib/templates.ts` は709件のテンプレート三点セット(`<id>.j2` + `<id>.{csv,yaml}` + META行)を持つ。`category`(ドメイン軸) x `activity`(活動軸、省略時はbuild)の二軸タクソノミーが `tests/unit/test_template_taxonomy.py` でドリフトゲートされている。

## 1. 背景・目的

`facility`カテゴリは issue #541（親）/ #549（フェーズ6子issue、PR #603でマージ済み）で新設され、10シナリオが実装済みである。しかし#541は物理設備工事系として「ラック設計・電源設計・ケーブリング・環境監視/設計・ラッキング」の6サブカテゴリのみをカバーしており、他カテゴリ（server 266件・network 221件・ai 117件）と比べて`facility`は10件と最小である。かつ#541のフェーズ6計画（`docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-scenario-details.md`）で検討された12候補は既に10件採用・2件統合済みで、未実装の積み残しは無い。

本設計書は、#541とは独立した新規の取り組みとして、facilityカテゴリが未カバーの領域（非常用電源、物理セキュリティ、消防設備、資産管理、廃棄）を追加し、既存6サブカテゴリの手薄な部分（ケーブリング・ラック設計・電源設計）も補強する10シナリオを追加する。対象読者は既存facilityシナリオと同じく「入門レベルの業界未経験者」とし、実機がなくても表の四則演算・照合・模擬CLI出力の読解で完結する設計とする（感電・機器落下等の実害を伴う手順は含めない）。

## 2. スコープ（10シナリオ）

| # | id | シナリオ名 | subCategory | 新規? | activity | format |
|---|---|---|---|---|---|---|
| 1 | hvac-cooling-capacity-plan | HVAC冷却能力計画（総発熱量とCRAC/CRAH容量の適合判定） | 環境設計 | 既存 | build | yaml |
| 2 | generator-ats-failover-drill | 発電機・ATS切替訓練（自動切替時間とUPSブリッジ時間の整合確認） | 非常用電源 | 新規 | drill | yaml |
| 3 | physical-access-control-audit | 入退室ログ監査（アクセス権限棚卸しと異常打刻の検出） | 物理セキュリティ | 新規 | security-response | csv |
| 4 | fire-suppression-inspection | 消火設備点検（点検記録の期限・圧力範囲チェック） | 消防設備 | 新規 | routine | csv |
| 5 | dcim-asset-reconciliation | DCIM資産棚卸し（台帳と実地棚卸しの差分検出） | 資産管理 | 既存(serverと同名、facility初) | routine | csv |
| 6 | cable-tray-pathway-plan | ケーブルトレイ・配線経路計画（許容重量と最大充填率の検算） | ケーブリング | 既存 | build | csv |
| 7 | server-decommission-procedure | サーバ機器廃棄・データ消去手順（証跡付き廃棄チェックリスト） | 廃棄 | 新規 | change | yaml |
| 8 | raised-floor-load-check | フリーアクセスフロア床荷重確認（点荷重・分布荷重の耐荷重照合） | ラック設計 | 既存 | build | csv |
| 9 | electrical-panel-labeling-audit | 分電盤ラベリングと系統図照合（回路表と現地ラベルの整合性確認） | 電源設計 | 既存 | routine | csv |
| 10 | power-restoration-sequence | 停電復旧後の起動順序計画（依存関係順の起動シーケンス設計） | 非常用電源 | 既存(#2で新設) | change | yaml |

既存9本との重複回避を確認済み: #1はrack-airflow-design(気流方向)と異なり熱負荷とCRAC容量の適合判定、#6はstructured-cabling-plan(配線表とLLDP照合)/lan-cable-category(カテゴリ選定)と異なりトレイの許容重量、#8はrack-mount-layout(ラック内配置)と異なりフロア自体の耐荷重を扱う。

### 2.1 新規サブカテゴリ（`ALLOWED_SUBCATEGORIES["facility"]`へ追加）

`非常用電源`、`物理セキュリティ`、`消防設備`、`廃棄`、`資産管理`（`資産管理`は`server`カテゴリに既存のラベルを再利用。概念が異なる—facility側は物理機器のDCIM棚卸し—ため近義語の新設ではなく同名ラベルの別カテゴリでの再利用として扱う）。

## 3. 命名・内容規約（既存フェーズ6の規約を踏襲）

- ID: kebab-case、既存709件のIDと衝突しないことを実装前にgrepで確認する。
- 構成: 目的 / 用語解説 / 手順本文(番号付き節) / 動作確認 / 注意事項 の5セクション構成（フェーズ6と同一）。
- グラウンディング: 用語解説に列挙した語は本文中に必ず登場させ、本文で使う専門用語は用語解説に含める（双方向チェック）。
- 実在する具体的な商用製品名・型番を挙げる場合は、その製品固有の仕様（動作方式・定格等）を断定しない。フェーズ6で実際に発生した「APC Smart-UPSの給電方式誤り」の再発防止として、本フェーズは特定製品の型番・固有仕様を主張せず、一般的な業界慣行・規格レベルの記述に留める。
- CSV数値列の算術には`| int`フィルタを必須とする（`config_parser.py`の型推論はテキスト混在列を文字列のまま保持するため）。
- `{% set 変数 = 式 %}`のRHSに`Concat`(`~`)や`Getitem`を含む式を束縛しない（`features/validate_template.py`の静的評価器がNameEconst/List/Dict/Call/Getattr以外を評価できないため）。文字列連結が要る箇所は使用時点でインライン展開する。
- レンダー安全性: macro/include/import/extends/do禁止、restricted attributes(request/config/os/sys/builtins/eval/exec/getattr/setattr/delattr/globals/locals/__class__/__base__/__subclasses__/__mro__)禁止、StrictUndefined、autoescape=Trueを遵守。
- 実機操作を要する手順（電気工事・消火設備の実起動等）は必ず有資格者監督下での実施を注意事項に明記し、本文中の操作は計算・照合・模擬出力の読解に限定する。

## 4. 実装方式

10件と小規模なため、フェーズ6のような並列サブエージェント分割は行わず、1件ずつ順に実装し、各テンプレートについて実際のPythonレンダリングエンジン(`features.config_parser.ConfigParser` + `features.document_render.DocumentRender`)でstrict-undefinedレンダリングを検証してからコミットする。検証スクリプトのパターンは`docs/superpowers/plans/2026-07-30-phase6-facility-templates.md`の「共通の検証手順」節と同一のものを流用する。

## 5. 検証

各テンプレート実装後に個別レンダリング確認を行い、全10件完了後に以下を一括実行する:

- `uv run pytest`（taxonomy drift gate: `test_template_taxonomy.py`、render gate: `test_example_templates_render.py`を含む）
- `uv run ruff check .`
- `uv run mypy .`
- `web/`配下: `npx tsc -b`、`npx vitest run`

## 6. Issue

本設計書に対応するIssueをGitHub上に新規作成し、コミット・PRで参照する（既存の#541/#549とは独立した新規の取り組みのため、新規Issueとする）。
