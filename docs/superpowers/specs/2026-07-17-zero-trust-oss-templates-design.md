# ゼロトラストOSSセキュリティテンプレート 315件 追加 設計書

- 日付: 2026-07-17
- 対象ブランチ: `claude/zero-trust-security-templates-r55cae`
- 前提: `assets/examples/` は既に249件のテンプレート三点セット(`<id>.j2` + `<id>.{csv,yaml,toml}` + `web/src/lib/templates.ts` のMETA行)を持ち、`category`(ドメイン軸: network/server/dns/ai/ops)× `activity`(活動軸: build/troubleshoot/security-response/change/routine/drill、省略時はbuild)の二軸タクソノミーが `tests/unit/test_template_taxonomy.py` でドリフトゲートされている。

## 1. 目的

ゼロトラストアーキテクチャ(NIST SP 800-207準拠の柱: 識別・デバイス信頼・ネットワーク分割・アプリケーション層・可視化/分析・自動化/ポリシー)を、商用利用可能なOSSで実現するテンプレートを315件追加する。ユーザー指定の8ツール(OPNsense/Unbound/Squid/Suricata/Zeek/Wazuh/Grafana Loki/Keycloak)に加え、ゼロトラストの柱を補完する8ツール(WireGuard/OpenZiti/HashiCorp Vault/Fail2ban・CrowdSec/Osquery/Lynis/Open Policy Agent/Velociraptor)を追加提案として採用する。

## 2. スコープ

### 2.1 ツール構成と件数(16ツール・315件)

既存の削減は行わない。追加分は純増。

| # | ツール | category / subCategory | 件数 | サブカテゴリ新規? |
|---|---|---|---|---|
| 1 | OPNsense | network / ファイアウォール | 25 | 既存 |
| 2 | Suricata | network / IDS・IPS | 25 | 新規 |
| 3 | Zeek | network / トラフィック分析 | 20 | 新規 |
| 4 | WireGuard | network / オーバーレイVPN | 20 | 新規 |
| 5 | OpenZiti | network / ZTNAオーバーレイ | 20 | 新規 |
| 6 | Squid | network / プロキシ / Web | 20 | 既存 |
| 7 | Unbound | dns / Unbound | 20 | 既存 |
| 8 | Wazuh | server / SIEM・HIDS | 25 | 新規 |
| 9 | Keycloak | server / IAM・SSO | 25 | 新規 |
| 10 | HashiCorp Vault | server / シークレット管理 | 20 | 新規 |
| 11 | Fail2ban / CrowdSec | server / 侵入対策 | 15 | 既存(`fail2ban-ssh-guard`に追加) |
| 12 | Osquery | server / 資産・状態管理 | 15 | 新規 |
| 13 | Lynis | server / 適合性監査 | 15 | 新規 |
| 14 | Velociraptor | server / EDR・フォレンジック | 15 | 新規 |
| 15 | Grafana Loki + Promtail | ops / ログ集約 | 20 | 新規 |
| 16 | Open Policy Agent | ops / ポリシー統制 | 15 | 新規 |

合計315件。カテゴリ別内訳: network 130 / dns 20 / server 130 / ops 35(既存の5カテゴリ内に収め、新カテゴリは追加しない)。

いずれもApache-2.0/MIT/BSD系ライセンスで商用利用可・ベンダーロックインなし。EDR(Velociraptor)はデバイス信頼の柱を、Vault/OPAはデータ・自動化の柱を補完する。

### 2.2 新規サブカテゴリ(`ALLOWED_SUBCATEGORIES` へ明示追加)

- network: `IDS・IPS`、`トラフィック分析`、`オーバーレイVPN`、`ZTNAオーバーレイ`
- server: `SIEM・HIDS`、`IAM・SSO`、`シークレット管理`、`資産・状態管理`、`適合性監査`、`EDR・フォレンジック`
- ops: `ログ集約`、`ポリシー統制`

(dns は既存の `Unbound` サブカテゴリをそのまま使うため追加なし)

## 3. 命名・内容規約

- ID: `<tool>-<topic>` のkebab-case。既存ID(`squid-forward-proxy`, `unbound-cache-resolver`, `fail2ban-ssh-guard` 等)と衝突しないことをPhase A(計画)で保証する。
- 内容の深さ: **実運用でそのまま使えるレベル**を狙う(例: Suricataの実ルール構文(sid/rev/classtype付き)、Wazuhの実decoder/rule XML、Keycloakの実kcadm.sh/REST APIペイロード、OPNsenseのconfig.xmlスニペットまたはAPI経由CLI)。抽象的にならざるを得なかった箇所はブロッキングにせず、個別に列挙してフォローアップIssueへ切り出す。
- 構成: 既存の6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)を踏襲。認証・FW・ACL変更を伴うテンプレートは、ロックアウト防止順序(新設定の検証 → 旧設定の無効化)を必須とする。
- レンダー安全性: `features/validate_template.py` のサンドボックス制約(macro/include/import/extends/do禁止、restricted attributes禁止)と `StrictUndefined`、autoescape=Trueを遵守。CSV値への直接メソッドチェーン(`r["x"].split(",")`)は禁止(事前にCSV列を分けるか、シェル側で処理)。

## 4. 実行アーキテクチャ

ユーザー指定どおり、fableサブエージェントによる計画立案 → sonnetによる動的ワークフロー(Workflowツール)での並行実装、の二段構成とする。

### Phase A: 計画(fable, 前景実行)

入力: 本設計書のツール表・サブカテゴリ表・命名/内容規約・既存249件のID一覧(衝突回避用)。
出力: 315件分の具体案をJSON配列で生成(`{id, tool, category, subCategory, activity?, format, output, name, desc, contentBrief}`)。`contentBrief` は実際に含めるべき実コマンド/ルール/設定の要点を1〜2文で指定し、Phase Bの生成品質を担保する。

### Phase B: 生成(sonnet Workflow, pipelineで315件を並行処理)

1テンプレート = 1エージェント。各エージェントは:
1. `assets/examples/<id>.<format>` と `<id>.j2` のみを書き込む(パスが一意なため並列書き込みでも衝突しない)。
2. 直後に `python3 scripts/local_render_check.py <id>` で自己検証(レンダー成功・no-html-entities・fill-invariance・runtime-security)。
3. META行案(`{ id, name, desc, category, subCategory, format, output, activity?, updated, live: true, data, template }`)を構造化出力として返す。

**`web/src/lib/templates.ts` と `tests/unit/test_template_taxonomy.py` への書き込みは並列エージェントにさせない**(同一ファイルへの並列Editは競合するため)。

### Phase C: 統合(単一・逐次)

Phase Bの全結果を集約し、`templates.ts` へMETA行を一括追記、`test_template_taxonomy.py` の `ALLOWED_SUBCATEGORIES` へ新規サブカテゴリを一括追記。

### Phase D: 検証(逐次)

`uv run pytest -k 'not e2e'`(taxonomy drift gate + render gate含む)、ruff、pyre、yamllint、gitleaks/typosを実行。失敗があれば修正ループ(対象を絞った再生成またはパッチ)。

### Phase E: 納品

1. GitHub Issueを起票(315件追加の親issue、Refsで引用)。
2. 既存ブランチ `claude/zero-trust-security-templates-r55cae` にコミット(issue番号を引用)。
3. 単一PRを作成(ユーザー指定の「一括納品」)。
4. PR作成後、CI/レビューを購読してマージまでフォロー。
5. マージ後、CLAUDE.md所定の振り返りIssueを起票。

## 5. リスクと既知の制約

- 315件・実運用レベルの内容生成は分量が大きく、Workflow実行に時間を要する。
- 実ルール構文(Suricata/Wazuh/OPNsense等)は生成AIの知識だけでは完全性を保証できないため、レビューで追加調整が入る可能性がある。抽象化が残った箇所はフォローアップIssueへ切り出す方針で対応する(ブロッキングにしない)。
- 単一PRのため差分が非常に大きい(既存249件がほぼ倍増)。レビュー負荷は高いが、ユーザー指示により一括で進める。
- 新規サブカテゴリ12件は `ALLOWED_SUBCATEGORIES` への「意図的な拡張」として明示コミットする(タクソノミーテストのドリフト防止方針に合致)。

## 6. スコープ外

- 新規トップレベル `category` の追加は行わない(既存5カテゴリのドメイン軸原則を維持)。
- レンダリングエンジン(`features/document_render.py` 等)・Web UI本体のロジック変更は行わない(`web/src/lib/templates.ts` へのMETA追記と `types.ts` のコメント・型に影響しない範囲の変更のみ)。
- 既存249件テンプレートの内容変更は行わない(範囲外)。
