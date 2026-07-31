# OPNsense仮想アプライアンスの独立subCategory分離 設計書

Refs #622, #501

## 1. 目的

`network`カテゴリの`subCategory: "ファイアウォール"`バケットに埋没しているOPNsense製品固有テンプレート25件を、Cisco/Fortinet/Palo Alto Networks/SonicWall等と同じ「ベンダー専用subCategory」として独立させる。

## 2. 背景

`"ファイアウォール"`(31件)は、OPNsense(仮想アプライアンスとして導入される完結型ルータ/ファイアウォールOS)固有のテンプレート25件と、Rocky Linux/firewalldの汎用OS機能テンプレート6件(`firewall-rules`, `firewall-block-triage`, `conntrack-full-triage`, `firewall-rule-audit`, `firewalld-zone-design`, `firewalld-port-forward`)を同一ラベルで混在させている。`opnsense-default-deny-wan.j2`・`opnsense-ha-carp-setup.j2`等を確認した結果、いずれも実在のOPNsense GUIパス(`Firewall > Settings > Advanced`等)・REST API・CARP/pfsync/XMLRPC構成など製品固有の内容であり、汎用ファイアウォール内容の誤ラベルではない。

Issue #501(2026-07-30監査)は「既にベンダー名がsubCategoryに付いているエントリ」のみを検証範囲としており、`"ファイアウォール"`というトピックラベルのOPNsenseはそもそも候補集合に入っていなかった(意図的な現状維持ではなく、検討漏れ)。`templates.ts`全カテゴリを検索した結果、他に同様の仮想アプライアンス製品(pfSense/VyOS/Untangle/Sophos/Check Point等)の混在は確認されず、対象はOPNsenseの25件のみ。

## 3. スコープ

PR #611(データ移行)+ PR #613(レール分割)が既存ベンダーに対して行った前例パターンをそのまま適用する。新規タクソノミー機構・新規UIコンポーネントは不要(既存の`subCategory`フラット許可リスト方式 + `NETWORK_VENDORS`配列方式を踏襲)。

### 3.1 対象外

- `"ファイアウォール"`ラベル自体の廃止(残り6件のfirewalld系テンプレートが引き続き使用するため存続)
- OPNsense以外のIDS・IPS(Suricata)/オーバーレイVPN(WireGuard)/ZTNAオーバーレイ(OpenZiti)/トラフィック分析(Zeek)バケットの変更(いずれも単一ツールで既に統一されており、本件の「汎用バケットへの混在」には該当しない)
- `.j2`/データファイル本体の変更(内容は既にOPNsense固有で正確)

## 4. 変更内容

| # | ファイル | 変更 |
|---|---|---|
| 1 | `web/src/lib/templates.ts` | `opnsense-*` 25件の`subCategory`を`"ファイアウォール"` → `"OPNsense"`に変更。`id`/`category`/`format`/`output`/`activity`は変更なし。 |
| 2 | `tests/unit/test_template_taxonomy.py` | `ALLOWED_SUBCATEGORIES["network"]`に`"OPNsense"`を追加(`"ファイアウォール"`は6件が残るため存続)。 |
| 3 | `web/src/components/Library.tsx` | `NETWORK_VENDORS`配列に`{ id: 'opnsense', label: 'OPNsense' }`を追加。既存の`groupBySubCategory`はsubCategory変更のみで正しくグリッド見出しを再構成するため、追加のロジック変更は不要。 |
| 4 | `web/src/components/Library.test.tsx` | `EXPECTED`カウント表: `network-common`を25件減、`network-opnsense`を25件で新規追加。 |

## 5. 検証

- `uv run pytest -k 'not e2e'`(`test_template_taxonomy.py`が新規許可値・移行後のsubCategory値を認識することを確認)
- `python3 scripts/local_render_check.py`(既存794テンプレートへの回帰がないことを確認。subCategory変更のみで.j2/データは無変更のため件数・render結果は不変のはず)
- `cd web && npx tsc -b && npx vitest run`(`Library.test.tsx`のレールカウント・predicate排他性テスト)

## 6. リスク

- 低リスク: 既存の4ベンダー分離作業(#595/#596/#611/#613)と全く同型の変更であり、新規メカニズムを導入しない。`subCategory`は表示ラベルであり、テンプレートの`id`・ファイルパスは不変のため、既存のブックマーク/リンク(id直接参照)には影響しない。
