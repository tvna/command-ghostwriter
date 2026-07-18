# ゼロトラストOSSセキュリティテンプレート 315件 計画(Phase A 成果物)

- 日付: 2026-07-17
- 対象設計書: `docs/superpowers/specs/2026-07-17-zero-trust-oss-templates-design.md`
- 成果物: `docs/superpowers/plans/2026-07-17-zero-trust-oss-templates-plan.json`(315オブジェクトのJSON配列)
- 検証結果: JSONパース成功 / 総数315 / 内部ID重複なし / 既存246 IDとの衝突なし / (category, subCategory) 不正ペアなし / 全フィールド enum 適合

## ツール別 実績件数(設計書テーブルと一致)

| # | ツール | category / subCategory | 計画件数 | 実績 | 一致 |
|---|---|---|---|---|---|
| 1 | OPNsense | network / ファイアウォール | 25 | 25 | OK |
| 2 | Suricata | network / IDS・IPS | 25 | 25 | OK |
| 3 | Zeek | network / トラフィック分析 | 20 | 20 | OK |
| 4 | WireGuard | network / オーバーレイVPN | 20 | 20 | OK |
| 5 | OpenZiti | network / ZTNAオーバーレイ | 20 | 20 | OK |
| 6 | Squid | network / プロキシ / Web | 20 | 20 | OK |
| 7 | Unbound | dns / Unbound | 20 | 20 | OK |
| 8 | Wazuh | server / SIEM・HIDS | 25 | 25 | OK |
| 9 | Keycloak | server / IAM・SSO | 25 | 25 | OK |
| 10 | HashiCorp Vault | server / シークレット管理 | 20 | 20 | OK |
| 11 | Fail2ban / CrowdSec | server / 侵入対策 | 15 | 15 | OK |
| 12 | Osquery | server / 資産・状態管理 | 15 | 15 | OK |
| 13 | Lynis | server / 適合性監査 | 15 | 15 | OK |
| 14 | Velociraptor | server / EDR・フォレンジック | 15 | 15 | OK |
| 15 | Grafana Loki + Promtail | ops / ログ集約 | 20 | 20 | OK |
| 16 | Open Policy Agent | ops / ポリシー統制 | 15 | 15 | OK |
| | 合計 | | 315 | 315 | OK |

## カテゴリ別 合計

| category | 件数 |
|---|---|
| network | 130 |
| server | 130 |
| dns | 20 |
| ops | 35 |

設計書の内訳(network 130 / dns 20 / server 130 / ops 35)と一致。新規トップレベルcategoryの追加なし。

## activity 分布(全体)

| activity | 件数 | 備考 |
|---|---|---|
| build | 167 | キー省略(設計の economy に従い build は activity キーを書かない) |
| troubleshoot | 40 | 診断・切り分け型 |
| security-response | 24 | インシデント初動型 |
| change | 19 | 変更管理型 |
| routine | 48 | 定期運用型 |
| drill | 17 | 訓練・復元演習型 |

build(省略)が過半(167/315)。残り148件を troubleshoot/security-response/change/routine/drill に分散し、既存ライブラリの運用色を踏襲。

## ツール別 activity 分布

| ツール | build | troubleshoot | security-response | change | routine | drill |
|---|---|---|---|---|---|---|
| OPNsense | 14 | 3 | 2 | 2 | 3 | 1 |
| Suricata | 16 | 3 | 2 | 1 | 2 | 1 |
| Zeek | 11 | 4 | 1 | 0 | 3 | 1 |
| WireGuard | 10 | 3 | 1 | 1 | 4 | 1 |
| OpenZiti | 12 | 2 | 1 | 1 | 3 | 1 |
| Squid | 11 | 2 | 2 | 1 | 3 | 1 |
| Unbound | 9 | 1 | 2 | 2 | 5 | 1 |
| Wazuh | 16 | 3 | 2 | 1 | 2 | 1 |
| Keycloak | 15 | 2 | 1 | 3 | 3 | 1 |
| HashiCorp Vault | 13 | 1 | 1 | 1 | 3 | 1 |
| Fail2ban / CrowdSec | 9 | 3 | 1 | 0 | 2 | 0 |
| Osquery | 5 | 4 | 1 | 0 | 4 | 1 |
| Lynis | 4 | 1 | 2 | 3 | 3 | 2 |
| Velociraptor | 2 | 3 | 4 | 1 | 2 | 3 |
| Grafana Loki + Promtail | 11 | 3 | 1 | 1 | 4 | 0 |
| Open Policy Agent | 9 | 2 | 0 | 1 | 2 | 1 |

## 新規サブカテゴリ(`ALLOWED_SUBCATEGORIES` へ Phase C で追記予定・12件)

- network: `IDS・IPS` / `トラフィック分析` / `オーバーレイVPN` / `ZTNAオーバーレイ`
- server: `SIEM・HIDS` / `IAM・SSO` / `シークレット管理` / `資産・状態管理` / `適合性監査` / `EDR・フォレンジック`
- ops: `ログ集約` / `ポリシー統制`

いずれも設計書の綴りと厳密一致(タクソノミーテストのドリフトゲート対応)。dns は既存 `Unbound` を流用し新規なし。

## format 分布(参考)

| format | 件数 |
|---|---|
| toml | 90 |
| yaml | 126 |
| csv | 99 |

`output` は全315件 `markdown`(既存ライブラリの手順書=runbook 規約を踏襲)。

## 設計書からの逸脱

- なし。ツール別件数・カテゴリ内訳・サブカテゴリ綴り・命名規約(`<tool-slug>-<topic>` kebab-case)・内容深度方針(実コマンド/実ルール構文/ロックアウト防止順序を `contentBrief` に明記)を設計書どおりに満たした。
- 認証・FW・ACL・SSH・DNS転送等の変更を伴うテンプレートには、`contentBrief` 内でロックアウト防止順序(新設定の検証 → 旧設定の無効化)を明示。
- レンダー安全性(サンドボックス制約・StrictUndefined・CSV値への直接メソッドチェーン禁止)に抵触しやすい要素(YARA/Rego/XML/VQL 等のコード)は、Jinja2変数展開ではなくコードブロック内テキストとして提示する旨を `contentBrief` で指示済み。

