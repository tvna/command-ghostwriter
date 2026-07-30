# マルチベンダー相互接続テンプレート(LACP/OSPFネイバー/BGPネイバー) 設計書

- 日付: 2026-07-30
- 対象ブランチ: `claude/multivendor-interconnect-template-q4zq5d`
- Issue: #596
- 前提: `assets/examples/` はテンプレート三点セット(`<id>.j2` + `<id>.{csv,yaml,toml}` + `web/src/lib/templates.ts` のMETA行)を持ち、`category`(ドメイン軸)×`activity`(活動軸、省略時はbuild)の二軸タクソノミーが `tests/unit/test_template_taxonomy.py` でドリフトゲートされている。既存 `cisco-etherchannel-lag`(LACP)と `cisco-ospf-single-area`(OSPFネイバー)が、本シリーズの内容・構成規約の参照実装となる。

## 1. 目的

L2スイッチのリンクアグリゲーション(LACP)、OSPFネイバー接続、BGPネイバー接続という3つの相互接続機能について、日本とアメリカで実際に使われている10ベンダー分のCLI手順書テンプレートを整備する。各テンプレートは対向機器の設定と揃える必要がある事項を明記し、単体ベンダーの設定手順として独立に読める形にする(ベンダーAとベンダーBの組み合わせごとの専用テンプレートは作らない――標準プロトコル前提のため、両端が同じ設計書ペアを参照すれば相互接続できる)。

## 2. スコープ

### 2.1 ベンダー構成(10社)

| # | ベンダー | 製品/OS系統 | 国 | 既存 | 新規作成 |
|---|---|---|---|---|---|
| 1 | Cisco | IOS/IOS-XE | US | `cisco-etherchannel-lag`(LACP)/ `cisco-ospf-single-area`(OSPF) | `cisco-bgp-neighbor` のみ |
| 2 | Juniper | Junos OS | US | — | LAG/OSPF/BGP 3本 |
| 3 | Arista | EOS | US | — | 同上 |
| 4 | HPE Aruba | AOS-CX | US | — | 同上 |
| 5 | Dell | OS10 | US | — | 同上 |
| 6 | Fortinet | FortiOS(FortiGate/FortiSwitch) | US | — | 同上 |
| 7 | NEC | IX Series | JP | — | 同上 |
| 8 | Allied Telesis | AlliedWare Plus | JP | — | 同上 |
| 9 | Alaxala | AXシリーズ | JP | — | 同上 |
| 10 | YAMAHA | RTXシリーズ | JP | `yamaha-router` 等(初期構築系、本シリーズと非重複) | 同上 |

新規テンプレート数: **28本**(Cisco BGPネイバー1本 + 他9ベンダー×3本)。既存249件超のテンプレートに対する純増で、既存テンプレートの内容変更は行わない。

### 2.2 新規ID一覧

- `cisco-bgp-neighbor`
- `juniper-lacp-lag` / `juniper-ospf-neighbor` / `juniper-bgp-neighbor`
- `arista-lacp-lag` / `arista-ospf-neighbor` / `arista-bgp-neighbor`
- `arubacx-lacp-lag` / `arubacx-ospf-neighbor` / `arubacx-bgp-neighbor`
- `dellos10-lacp-lag` / `dellos10-ospf-neighbor` / `dellos10-bgp-neighbor`
- `fortinet-lacp-lag` / `fortinet-ospf-neighbor` / `fortinet-bgp-neighbor`
- `nec-ix-lacp-lag` / `nec-ix-ospf-neighbor` / `nec-ix-bgp-neighbor`
- `alliedtelesis-lacp-lag` / `alliedtelesis-ospf-neighbor` / `alliedtelesis-bgp-neighbor`
- `alaxala-lacp-lag` / `alaxala-ospf-neighbor` / `alaxala-bgp-neighbor`
- `yamaha-lacp-lag` / `yamaha-ospf-neighbor` / `yamaha-bgp-neighbor`

いずれも `assets/examples/` 配下の既存IDと衝突しないことを確認済み。

### 2.3 新規サブカテゴリ(`ALLOWED_SUBCATEGORIES["network"]` へ明示追加)

`Juniper`、`Arista`、`HPE Aruba`、`Dell`、`Fortinet`、`NEC`、`Allied Telesis`、`Alaxala` の8件を追加する(`Cisco`・`YAMAHA` は既存流用)。

## 3. 命名・内容規約

- ID: `<vendor-slug>-lacp-lag` / `<vendor-slug>-ospf-neighbor` / `<vendor-slug>-bgp-neighbor` のkebab-case。
- データ形式: `toml`(既存の `cisco-etherchannel-lag.toml` / `cisco-ospf-single-area.toml` と同じ、単一シナリオ設定に適する形式)。
- レジストリ登録: `category: "network"`, `subCategory: "<ベンダー表示名>"`, `output: "markdown"`, `activity` は省略(build)。
- 本文構成: 既存の6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)を踏襲。`cisco-etherchannel-lag.j2` / `cisco-ospf-single-area.j2` を型として使う。
- 内容の深さ: 各ベンダーの実CLI構文(公式コマンドリファレンスに基づく実在するコマンド体系)で、そのまま実機に投入できるレベルを狙う。記憶のみに頼らず、WebSearchで一次情報を確認してから記述する(特に日本ベンダー: NEC IX, Allied Telesis AW+, Alaxala AXは表記揺れが起きやすいため要確認)。
- BGPネイバーテンプレートは、対向ASとの合意が必要な項目(ローカルAS番号・対向IP・対向AS番号・認証キー等)を明示し、`neighbor` の `state`/`Established` 確認手順を含める。OSPFネイバーテンプレートは `router-id`・エリア・`passive-interface`(または相当設定)・ネイバー確認コマンドを含める。LACPテンプレートは `active`/`passive` モードの組合せ条件と、縮退動作の検証手順を含める。
- 認証情報(BGP MD5鍵等)はテンプレート変数として抽象化し、実際の鍵文字列を埋め込まない(プレースホルダ変数名で表現)。
- レンダー安全性: `features/validate_template.py` のサンドボックス制約(`macro`/`include`/`import`/`extends`/`do` 禁止、restricted attributes禁止)と `StrictUndefined`、`autoescape=True` を遵守。CSV不使用(toml)のため、CSV由来のメソッドチェーン制約は非該当。

## 4. 実行アーキテクチャ

Workflowツールは本タスクでは明示的なopt-inがないため使用しない。代わりに、Agentツールによる並列サブエージェント方式(dispatching-parallel-agentsスキルの原則)で進める。

### Phase A: 計画(完了— 本設計書 + writing-plans による実装計画)

### Phase B: ベンダー別ドラフト生成(並列Agent、9ベンダー分を並行実行)

Cisco以外の9ベンダーそれぞれに1エージェントを割り当て、以下を担当させる:

1. 担当ベンダーの実CLI構文をWebSearchで確認(LACP/OSPF/BGPの設定・確認コマンド)。
2. `assets/examples/<id>.toml` と `<id>.j2` を3組(LAG/OSPF/BGP)作成。
3. `python3 scripts/local_render_check.py <id>` で自己検証(レンダー成功・HTML実体化なし・fill非依存・runtime-security)。

Ciscoの `cisco-bgp-neighbor` も同様に1エージェントで作成(既存2本のスタイルに合わせる)。

エージェントは `assets/examples/` への書き込みのみを担当し、`templates.ts` と `test_template_taxonomy.py` への書き込みは行わない(単一ファイルへの並列編集競合を避けるため)。

### Phase C: 統合(単一・逐次)

Phase Bの全成果物を集約し、`web/src/lib/templates.ts` へMETA行28件を追記、`tests/unit/test_template_taxonomy.py` の `ALLOWED_SUBCATEGORIES["network"]` へ新規サブカテゴリ8件を追記。

### Phase D: 検証(逐次)

- `python3 scripts/local_render_check.py <28個のid>` で一括セルフチェック。
- `uv run pytest -k 'not e2e'`(taxonomy drift gate + render gate含む)。
- `cd web && bun run build`(`tsc -b` による型チェック)。
- ruff / yamllint / typos などの既存Lintフックがあれば実行。
- 失敗があれば対象を絞った修正ループ。

### Phase E: 納品

1. Issue #596 を引用してコミット(既にIssue作成済み)。
2. 既存ブランチ `claude/multivendor-interconnect-template-q4zq5d` にコミット。
3. ユーザーの指示に応じてPR作成(本設計フェーズでは作成しない。ユーザーの明示的な依頼を待つ)。
4. PR作成後はCI/レビューを購読し、マージまでフォローする。
5. マージ後、CLAUDE.md所定の振り返りIssueを起票する。

## 5. リスクと既知の制約

- 日本ベンダー(NEC IX、Allied Telesis AW+、Alaxala AX)は公開ドキュメントの網羅性がCisco/Juniper等より低く、WebSearchでも一次情報の裏取りが難しい箇所が出うる。抽象化がどうしても必要な箇所は、その旨を手順書内に明記し、フォローアップIssueへ切り出す方針とする(ブロッキングにしない)。
- 28本という分量は既存の単発テンプレート追加より大きく、レビュー負荷が高い。Phase Bを並列化しても、Phase C(統合)とPhase D(検証)は逐次実行のため一定の時間を要する。
- BGP/OSPF/LACPの構文はベンダー間で用語が異なる(例: Juniper OSPFは`network`文ではなくインターフェース単位でエリアを指定する)。用語解説セクションで各ベンダー固有の概念差異を明示する。

## 6. スコープ外

- 新規トップレベル `category` の追加は行わない(既存5カテゴリを維持)。
- レンダリングエンジン(`features/document_render.py` 等)・Web UI本体のロジック変更は行わない。
- 既存テンプレート(Cisco LAG/OSPF含む)の内容変更は行わない。
- ベンダー間の相互接続シナリオ(例: 「CiscoとJuniperを直結する」専用テンプレート)は作らない。標準プロトコル前提のため、各ベンダー単体テンプレートの組み合わせで相互接続を表現する。
