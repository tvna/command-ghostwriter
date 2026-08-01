# NGFWベンダーカタログ拡張(item 26-50、98件) 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md`で確定した新規25運用課題(item 26-50)をFortinet/Palo Alto Networks/SonicWall/OPNsenseのネイティブ機構に対応させた98件のテンプレート(`assets/examples/*.j2`+データファイル対、`web/src/lib/templates.ts`への登録)を追加し、6つの問題クラスタ単位でPRを作成する。全PRをマージ可能状態まで持っていくが、実際のマージはユーザーの承認を待つ。

**Architecture:** 設計書§3.4の検証済みマッピング表を一次ソースとして、クラスタ単位で`Workflow`ツールにより並行生成する(#619の実装で確立した手法を踏襲)。各エージェントは「1 slug × 1ベンダー」を担当し、6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)のJinja2テンプレート+サンプルデータ+`templates.ts`用メタデータ(name/desc)を提案する。統合(`templates.ts`追記)・検証(render-check/pytest/tsc/vitest)・コミット・PR化はクラスタごとに決定的な手順として実行する。全6クラスタのマージ後、`Library.test.tsx`のEXPECTEDカウントを一括更新する(#619実装時に漏れて後日別コミットで修正された反省を踏まえ、本計画では独立タスクとして明示)。

**Tech Stack:** Python 3.11 (Jinja2 SandboxedEnvironment, pytest, ruff, mypy), TypeScript/Vite (`web/`, vitest, tsc), `scripts/local_render_check.py`。

---

## 共通事項(全タスク共通)

- 各テンプレートの6セクション構成・Jinja制限・credential取り扱いは設計書§5を厳守する。
- 各テンプレートの本文は、設計書§3.4の該当slug×ベンダー行にある「ネイティブ機構」列と「一次情報」URLを直接の一次ソースとして参照して執筆する。生成時にURLへ再アクセスし、CLI/GUIの細部(パラメータ名等)を確認してから記述する。
- 判定が「適応」の項目は、目的節または用語解説節に元機構との違いを一文明記する(設計書§5)。特にOPNsenseの適応判定でサードパーティ製プラグイン(Zenarmor等)やBusiness Edition限定機能を使う場合は、その旨を用語解説節に明記する(設計書§8のリスク参照)。
- `remote-access-posture-check`と`ha-config-sync-drift`はOPNsense向けテンプレートを作成しない(設計書§3.5、owner決定)。クラスタFのタスクでのみ該当する。
- 各テンプレートの`templates.ts`エントリ形式(既存行を参考に、生成エージェントが`name`/`desc`を提案する):
  ```ts
  { id: "<vendor>-<slug>", name: "<日本語名>", desc: "<日本語説明。〜手順書（Markdown）として生成。で終える>", category: "network", subCategory: "<Fortinet|Palo Alto Networks|SonicWall|OPNsense>", format: "<csv|toml|yaml>", output: "markdown", activity: "<該当時のみ>", updated: "2026-08-01", live: true },
  ```
- `templates.ts`への追記位置: 配列を閉じる`];`行の直前(本計画作成時点で824行目。クラスタ追加のたびに行番号は増えるため、挿入前に必ず`grep -n "^\];" web/src/lib/templates.ts`で現在位置を確認すること)。
- vendor id接頭辞: `fortinet-` / `paloalto-`(`palo-alto-`ではない) / `sonicwall-` / `opnsense-`。`subCategory`はそれぞれ`Fortinet` / `Palo Alto Networks` / `SonicWall` / `OPNsense`(4ベンダーとも`ALLOWED_SUBCATEGORIES["network"]`に既存、`tests/unit/test_template_taxonomy.py`の変更は不要)。
- `Library.tsx`の`NETWORK_VENDORS`配列にも4ベンダーは既存のため変更不要。`Library.test.tsx`のEXPECTEDカウント更新はTask 7でまとめて行う。

### Task 1: クラスタA「検査・可視化」(16件)

**Files:**
- Create: `assets/examples/fortinet-ssl-tls-inspection.j2` + `assets/examples/fortinet-ssl-tls-inspection.toml`
- Create: `assets/examples/paloalto-ssl-tls-inspection.j2` + `assets/examples/paloalto-ssl-tls-inspection.toml`
- Create: `assets/examples/sonicwall-ssl-tls-inspection.j2` + `assets/examples/sonicwall-ssl-tls-inspection.toml`
- Create: `assets/examples/opnsense-ssl-tls-inspection.j2` + `assets/examples/opnsense-ssl-tls-inspection.toml`
- Create: `assets/examples/fortinet-app-control-policy.j2` + `assets/examples/fortinet-app-control-policy.csv`
- Create: `assets/examples/paloalto-app-control-policy.j2` + `assets/examples/paloalto-app-control-policy.csv`
- Create: `assets/examples/sonicwall-app-control-policy.j2` + `assets/examples/sonicwall-app-control-policy.csv`
- Create: `assets/examples/opnsense-app-control-policy.j2` + `assets/examples/opnsense-app-control-policy.csv`
- Create: `assets/examples/fortinet-url-category-filtering.j2` + `assets/examples/fortinet-url-category-filtering.csv`
- Create: `assets/examples/paloalto-url-category-filtering.j2` + `assets/examples/paloalto-url-category-filtering.csv`
- Create: `assets/examples/sonicwall-url-category-filtering.j2` + `assets/examples/sonicwall-url-category-filtering.csv`
- Create: `assets/examples/opnsense-url-category-filtering.j2` + `assets/examples/opnsense-url-category-filtering.csv`
- Create: `assets/examples/fortinet-user-id-policy.j2` + `assets/examples/fortinet-user-id-policy.yaml`
- Create: `assets/examples/paloalto-user-id-policy.j2` + `assets/examples/paloalto-user-id-policy.yaml`
- Create: `assets/examples/sonicwall-user-id-policy.j2` + `assets/examples/sonicwall-user-id-policy.yaml`
- Create: `assets/examples/opnsense-user-id-policy.j2` + `assets/examples/opnsense-user-id-policy.yaml`
- Modify: `web/src/lib/templates.ts`(本クラスタの16件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `ssl-tls-inspection`: 暗号化された通信(SSL/TLS)の中身を検査してマルウェアや情報漏えいを検知したいが、復号・再暗号化により通信内容を可視化しつつ、金融・医療等プライバシー配慮が必要な通信は検査対象から除外したい。
  - `app-control-policy`: ポート番号だけでは判別できないアプリケーション(SaaS、P2P、迂回通信等)をレイヤ7で識別し、アプリケーション単位で許可/監視/遮断のポリシーを適用したい。
  - `url-category-filtering`: フィッシングやマルウェア配布サイト等の危険なURLカテゴリを自動遮断しつつ、誤検知(過検知)によって業務に必要な正当なサイトがブロックされた場合に迅速に例外を設定したい。
  - `user-id-policy`: IPアドレスではなくユーザー/グループ単位でファイアウォールポリシーを適用するために、AD/LDAP等のディレクトリサービスとログオン情報を連携し、ID-IPマッピングを維持したい。

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md`の§3.4該当表(`ssl-tls-inspection`, `app-control-policy`, `url-category-filtering`, `user-id-policy`の各行、Fortinet/Palo Alto Networks/SonicWall/OPNsenseの4表。OPNsenseで対象外の項目は§3.5を参照)を参照。

  `Workflow`で`pipeline()`を用い、16件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)のJinja2テンプレート本文 + サンプルデータ(拡張子は上記Filesのとおり) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 「適応」判定の項目は目的節または用語解説節に元機構との違いを一文明記させる(design doc §5)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。`templates.ts`と`test_template_taxonomy.py`への書き込みはさせない(単一ファイルへの並列編集競合を避けるため、統合はStep 3で単一実行する)。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-ssl-tls-inspection paloalto-ssl-tls-inspection sonicwall-ssl-tls-inspection opnsense-ssl-tls-inspection fortinet-app-control-policy paloalto-app-control-policy sonicwall-app-control-policy opnsense-app-control-policy fortinet-url-category-filtering paloalto-url-category-filtering sonicwall-url-category-filtering opnsense-url-category-filtering fortinet-user-id-policy paloalto-user-id-policy sonicwall-user-id-policy opnsense-user-id-policy
```
Expected: 全16件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し(挿入のたびに行番号が変わるため必ず再確認)、その直前に本クラスタ16件分のエントリを追記する。エントリ形式(既存行踏襲):
```ts
{ id: "<vendor>-<slug>", name: "<日本語名>", desc: "<日本語説明。〜手順書（Markdown）として生成。で終える>", category: "network", subCategory: "<Fortinet|Palo Alto Networks|SonicWall|OPNsense>", format: "<csv|toml|yaml>", output: "markdown", activity: "<該当時のみ>", updated: "2026-08-01", live: true },
```
本クラスタは全slugが既定activity(build、省略)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、design doc §3.1)。`Library.test.tsx`の`RAIL counts against real template data`は本クラスタの時点ではまだ失敗する(EXPECTEDカウント未更新、Task 7で一括更新するため)。失敗内容がその1点(カウント不一致)のみであることを確認して次へ進む。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-ssl-tls-inspection.j2 assets/examples/fortinet-ssl-tls-inspection.toml assets/examples/paloalto-ssl-tls-inspection.j2 assets/examples/paloalto-ssl-tls-inspection.toml assets/examples/sonicwall-ssl-tls-inspection.j2 assets/examples/sonicwall-ssl-tls-inspection.toml assets/examples/opnsense-ssl-tls-inspection.j2 assets/examples/opnsense-ssl-tls-inspection.toml assets/examples/fortinet-app-control-policy.j2 assets/examples/fortinet-app-control-policy.csv assets/examples/paloalto-app-control-policy.j2 assets/examples/paloalto-app-control-policy.csv assets/examples/sonicwall-app-control-policy.j2 assets/examples/sonicwall-app-control-policy.csv assets/examples/opnsense-app-control-policy.j2 assets/examples/opnsense-app-control-policy.csv assets/examples/fortinet-url-category-filtering.j2 assets/examples/fortinet-url-category-filtering.csv assets/examples/paloalto-url-category-filtering.j2 assets/examples/paloalto-url-category-filtering.csv assets/examples/sonicwall-url-category-filtering.j2 assets/examples/sonicwall-url-category-filtering.csv assets/examples/opnsense-url-category-filtering.j2 assets/examples/opnsense-url-category-filtering.csv assets/examples/fortinet-user-id-policy.j2 assets/examples/fortinet-user-id-policy.yaml assets/examples/paloalto-user-id-policy.j2 assets/examples/paloalto-user-id-policy.yaml assets/examples/sonicwall-user-id-policy.j2 assets/examples/sonicwall-user-id-policy.yaml assets/examples/opnsense-user-id-policy.j2 assets/examples/opnsense-user-id-policy.yaml web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster A (検査・可視化) NGFW catalog-extension templates

Refs #635

Adds 16 templates (4 problem(s) x Fortinet/Palo Alto Networks/SonicWall/OPNsense) per
docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-vendor-category-templates-bzuo62
```
PRを作成する(タイトル例: `feat: add NGFW catalog-extension templates - cluster A (検査・可視化)`、本文で#635を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。マージはユーザーの明示的な承認を待つ(このタスクではマージしない)。

### Task 2: クラスタB「可用性・回線」(16件)

**Files:**
- Create: `assets/examples/fortinet-qos-bandwidth-shaping.j2` + `assets/examples/fortinet-qos-bandwidth-shaping.toml`
- Create: `assets/examples/paloalto-qos-bandwidth-shaping.j2` + `assets/examples/paloalto-qos-bandwidth-shaping.toml`
- Create: `assets/examples/sonicwall-qos-bandwidth-shaping.j2` + `assets/examples/sonicwall-qos-bandwidth-shaping.toml`
- Create: `assets/examples/opnsense-qos-bandwidth-shaping.j2` + `assets/examples/opnsense-qos-bandwidth-shaping.toml`
- Create: `assets/examples/fortinet-multi-wan-failover.j2` + `assets/examples/fortinet-multi-wan-failover.yaml`
- Create: `assets/examples/paloalto-multi-wan-failover.j2` + `assets/examples/paloalto-multi-wan-failover.yaml`
- Create: `assets/examples/sonicwall-multi-wan-failover.j2` + `assets/examples/sonicwall-multi-wan-failover.yaml`
- Create: `assets/examples/opnsense-multi-wan-failover.j2` + `assets/examples/opnsense-multi-wan-failover.yaml`
- Create: `assets/examples/fortinet-site-to-site-vpn-tunnel-monitoring.j2` + `assets/examples/fortinet-site-to-site-vpn-tunnel-monitoring.toml`
- Create: `assets/examples/paloalto-site-to-site-vpn-tunnel-monitoring.j2` + `assets/examples/paloalto-site-to-site-vpn-tunnel-monitoring.toml`
- Create: `assets/examples/sonicwall-site-to-site-vpn-tunnel-monitoring.j2` + `assets/examples/sonicwall-site-to-site-vpn-tunnel-monitoring.toml`
- Create: `assets/examples/opnsense-site-to-site-vpn-tunnel-monitoring.j2` + `assets/examples/opnsense-site-to-site-vpn-tunnel-monitoring.toml`
- Create: `assets/examples/fortinet-guest-wifi-bandwidth-cap.j2` + `assets/examples/fortinet-guest-wifi-bandwidth-cap.csv`
- Create: `assets/examples/paloalto-guest-wifi-bandwidth-cap.j2` + `assets/examples/paloalto-guest-wifi-bandwidth-cap.csv`
- Create: `assets/examples/sonicwall-guest-wifi-bandwidth-cap.j2` + `assets/examples/sonicwall-guest-wifi-bandwidth-cap.csv`
- Create: `assets/examples/opnsense-guest-wifi-bandwidth-cap.j2` + `assets/examples/opnsense-guest-wifi-bandwidth-cap.csv`
- Modify: `web/src/lib/templates.ts`(本クラスタの16件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `qos-bandwidth-shaping`: 回線輻輳時に重要な業務トラフィックを優先し、非重要トラフィックの帯域を制限することで業務影響を最小化したい。
  - `multi-wan-failover`: 複数のWAN回線を用いて、回線障害時に自動的にフェイルオーバーし業務継続性を確保したい。切替に要する時間や復旧条件も把握したい。
  - `site-to-site-vpn-tunnel-monitoring`: 拠点間VPNトンネルの死活を継続的に監視し、断絶時に自動的に再接続またはフェイルオーバーさせたい。
  - `guest-wifi-bandwidth-cap`: ゲストWiFi利用者の帯域や同時接続数に上限を設け、社内ネットワークのリソースを保護したい。

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md`の§3.4該当表(`qos-bandwidth-shaping`, `multi-wan-failover`, `site-to-site-vpn-tunnel-monitoring`, `guest-wifi-bandwidth-cap`の各行、Fortinet/Palo Alto Networks/SonicWall/OPNsenseの4表。OPNsenseで対象外の項目は§3.5を参照)を参照。

  `Workflow`で`pipeline()`を用い、16件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)のJinja2テンプレート本文 + サンプルデータ(拡張子は上記Filesのとおり) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 「適応」判定の項目は目的節または用語解説節に元機構との違いを一文明記させる(design doc §5)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。`templates.ts`と`test_template_taxonomy.py`への書き込みはさせない(単一ファイルへの並列編集競合を避けるため、統合はStep 3で単一実行する)。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-qos-bandwidth-shaping paloalto-qos-bandwidth-shaping sonicwall-qos-bandwidth-shaping opnsense-qos-bandwidth-shaping fortinet-multi-wan-failover paloalto-multi-wan-failover sonicwall-multi-wan-failover opnsense-multi-wan-failover fortinet-site-to-site-vpn-tunnel-monitoring paloalto-site-to-site-vpn-tunnel-monitoring sonicwall-site-to-site-vpn-tunnel-monitoring opnsense-site-to-site-vpn-tunnel-monitoring fortinet-guest-wifi-bandwidth-cap paloalto-guest-wifi-bandwidth-cap sonicwall-guest-wifi-bandwidth-cap opnsense-guest-wifi-bandwidth-cap
```
Expected: 全16件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し(挿入のたびに行番号が変わるため必ず再確認)、その直前に本クラスタ16件分のエントリを追記する。エントリ形式(既存行踏襲):
```ts
{ id: "<vendor>-<slug>", name: "<日本語名>", desc: "<日本語説明。〜手順書（Markdown）として生成。で終える>", category: "network", subCategory: "<Fortinet|Palo Alto Networks|SonicWall|OPNsense>", format: "<csv|toml|yaml>", output: "markdown", activity: "<該当時のみ>", updated: "2026-08-01", live: true },
```
本クラスタで`activity`を明示指定するslug: `site-to-site-vpn-tunnel-monitoring`: activity: "routine"。他は省略(既定build)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、design doc §3.1)。`Library.test.tsx`の`RAIL counts against real template data`は本クラスタの時点ではまだ失敗する(EXPECTEDカウント未更新、Task 7で一括更新するため)。失敗内容がその1点(カウント不一致)のみであることを確認して次へ進む。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-qos-bandwidth-shaping.j2 assets/examples/fortinet-qos-bandwidth-shaping.toml assets/examples/paloalto-qos-bandwidth-shaping.j2 assets/examples/paloalto-qos-bandwidth-shaping.toml assets/examples/sonicwall-qos-bandwidth-shaping.j2 assets/examples/sonicwall-qos-bandwidth-shaping.toml assets/examples/opnsense-qos-bandwidth-shaping.j2 assets/examples/opnsense-qos-bandwidth-shaping.toml assets/examples/fortinet-multi-wan-failover.j2 assets/examples/fortinet-multi-wan-failover.yaml assets/examples/paloalto-multi-wan-failover.j2 assets/examples/paloalto-multi-wan-failover.yaml assets/examples/sonicwall-multi-wan-failover.j2 assets/examples/sonicwall-multi-wan-failover.yaml assets/examples/opnsense-multi-wan-failover.j2 assets/examples/opnsense-multi-wan-failover.yaml assets/examples/fortinet-site-to-site-vpn-tunnel-monitoring.j2 assets/examples/fortinet-site-to-site-vpn-tunnel-monitoring.toml assets/examples/paloalto-site-to-site-vpn-tunnel-monitoring.j2 assets/examples/paloalto-site-to-site-vpn-tunnel-monitoring.toml assets/examples/sonicwall-site-to-site-vpn-tunnel-monitoring.j2 assets/examples/sonicwall-site-to-site-vpn-tunnel-monitoring.toml assets/examples/opnsense-site-to-site-vpn-tunnel-monitoring.j2 assets/examples/opnsense-site-to-site-vpn-tunnel-monitoring.toml assets/examples/fortinet-guest-wifi-bandwidth-cap.j2 assets/examples/fortinet-guest-wifi-bandwidth-cap.csv assets/examples/paloalto-guest-wifi-bandwidth-cap.j2 assets/examples/paloalto-guest-wifi-bandwidth-cap.csv assets/examples/sonicwall-guest-wifi-bandwidth-cap.j2 assets/examples/sonicwall-guest-wifi-bandwidth-cap.csv assets/examples/opnsense-guest-wifi-bandwidth-cap.j2 assets/examples/opnsense-guest-wifi-bandwidth-cap.csv web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster B (可用性・回線) NGFW catalog-extension templates

Refs #635

Adds 16 templates (4 problem(s) x Fortinet/Palo Alto Networks/SonicWall/OPNsense) per
docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-vendor-category-templates-bzuo62
```
PRを作成する(タイトル例: `feat: add NGFW catalog-extension templates - cluster B (可用性・回線)`、本文で#635を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。マージはユーザーの明示的な承認を待つ(このタスクではマージしない)。

### Task 3: クラスタC「脅威対策」(16件)

**Files:**
- Create: `assets/examples/fortinet-threat-intel-feed.j2` + `assets/examples/fortinet-threat-intel-feed.toml`
- Create: `assets/examples/paloalto-threat-intel-feed.j2` + `assets/examples/paloalto-threat-intel-feed.toml`
- Create: `assets/examples/sonicwall-threat-intel-feed.j2` + `assets/examples/sonicwall-threat-intel-feed.toml`
- Create: `assets/examples/opnsense-threat-intel-feed.j2` + `assets/examples/opnsense-threat-intel-feed.toml`
- Create: `assets/examples/fortinet-dos-protection-profile.j2` + `assets/examples/fortinet-dos-protection-profile.yaml`
- Create: `assets/examples/paloalto-dos-protection-profile.j2` + `assets/examples/paloalto-dos-protection-profile.yaml`
- Create: `assets/examples/sonicwall-dos-protection-profile.j2` + `assets/examples/sonicwall-dos-protection-profile.yaml`
- Create: `assets/examples/opnsense-dos-protection-profile.j2` + `assets/examples/opnsense-dos-protection-profile.yaml`
- Create: `assets/examples/fortinet-botnet-c2-detection.j2` + `assets/examples/fortinet-botnet-c2-detection.toml`
- Create: `assets/examples/paloalto-botnet-c2-detection.j2` + `assets/examples/paloalto-botnet-c2-detection.toml`
- Create: `assets/examples/sonicwall-botnet-c2-detection.j2` + `assets/examples/sonicwall-botnet-c2-detection.toml`
- Create: `assets/examples/opnsense-botnet-c2-detection.j2` + `assets/examples/opnsense-botnet-c2-detection.toml`
- Create: `assets/examples/fortinet-ipv6-dual-stack-parity.j2` + `assets/examples/fortinet-ipv6-dual-stack-parity.csv`
- Create: `assets/examples/paloalto-ipv6-dual-stack-parity.j2` + `assets/examples/paloalto-ipv6-dual-stack-parity.csv`
- Create: `assets/examples/sonicwall-ipv6-dual-stack-parity.j2` + `assets/examples/sonicwall-ipv6-dual-stack-parity.csv`
- Create: `assets/examples/opnsense-ipv6-dual-stack-parity.j2` + `assets/examples/opnsense-ipv6-dual-stack-parity.csv`
- Modify: `web/src/lib/templates.ts`(本クラスタの16件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `threat-intel-feed`: 外部の脅威インテリジェンスフィード(既知の悪性IP/ドメイン/URL等)を継続的に取り込み、ファイアウォールポリシーへ自動反映して遮断したい。
  - `dos-protection-profile`: SYNフラッド等のDoS/DDoS攻撃を検知・緩和しつつ、正常な通信への誤検知(過剰遮断)を避けられるよう閾値やモードを調整したい。
  - `botnet-c2-detection`: マルウェアに感染した端末が外部のC2(コマンド&コントロール)サーバーと通信するのを検知・遮断したい。
  - `ipv6-dual-stack-parity`: IPv4環境と同様に、IPv6環境でも明示的に許可されない通信はデフォルトで拒否されるポリシー設計(default-denyパリティ)を担保したい。

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md`の§3.4該当表(`threat-intel-feed`, `dos-protection-profile`, `botnet-c2-detection`, `ipv6-dual-stack-parity`の各行、Fortinet/Palo Alto Networks/SonicWall/OPNsenseの4表。OPNsenseで対象外の項目は§3.5を参照)を参照。

  `Workflow`で`pipeline()`を用い、16件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)のJinja2テンプレート本文 + サンプルデータ(拡張子は上記Filesのとおり) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 「適応」判定の項目は目的節または用語解説節に元機構との違いを一文明記させる(design doc §5)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。`templates.ts`と`test_template_taxonomy.py`への書き込みはさせない(単一ファイルへの並列編集競合を避けるため、統合はStep 3で単一実行する)。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-threat-intel-feed paloalto-threat-intel-feed sonicwall-threat-intel-feed opnsense-threat-intel-feed fortinet-dos-protection-profile paloalto-dos-protection-profile sonicwall-dos-protection-profile opnsense-dos-protection-profile fortinet-botnet-c2-detection paloalto-botnet-c2-detection sonicwall-botnet-c2-detection opnsense-botnet-c2-detection fortinet-ipv6-dual-stack-parity paloalto-ipv6-dual-stack-parity sonicwall-ipv6-dual-stack-parity opnsense-ipv6-dual-stack-parity
```
Expected: 全16件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し(挿入のたびに行番号が変わるため必ず再確認)、その直前に本クラスタ16件分のエントリを追記する。エントリ形式(既存行踏襲):
```ts
{ id: "<vendor>-<slug>", name: "<日本語名>", desc: "<日本語説明。〜手順書（Markdown）として生成。で終える>", category: "network", subCategory: "<Fortinet|Palo Alto Networks|SonicWall|OPNsense>", format: "<csv|toml|yaml>", output: "markdown", activity: "<該当時のみ>", updated: "2026-08-01", live: true },
```
本クラスタで`activity`を明示指定するslug: `threat-intel-feed`: activity: "routine"。他は省略(既定build)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、design doc §3.1)。`Library.test.tsx`の`RAIL counts against real template data`は本クラスタの時点ではまだ失敗する(EXPECTEDカウント未更新、Task 7で一括更新するため)。失敗内容がその1点(カウント不一致)のみであることを確認して次へ進む。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-threat-intel-feed.j2 assets/examples/fortinet-threat-intel-feed.toml assets/examples/paloalto-threat-intel-feed.j2 assets/examples/paloalto-threat-intel-feed.toml assets/examples/sonicwall-threat-intel-feed.j2 assets/examples/sonicwall-threat-intel-feed.toml assets/examples/opnsense-threat-intel-feed.j2 assets/examples/opnsense-threat-intel-feed.toml assets/examples/fortinet-dos-protection-profile.j2 assets/examples/fortinet-dos-protection-profile.yaml assets/examples/paloalto-dos-protection-profile.j2 assets/examples/paloalto-dos-protection-profile.yaml assets/examples/sonicwall-dos-protection-profile.j2 assets/examples/sonicwall-dos-protection-profile.yaml assets/examples/opnsense-dos-protection-profile.j2 assets/examples/opnsense-dos-protection-profile.yaml assets/examples/fortinet-botnet-c2-detection.j2 assets/examples/fortinet-botnet-c2-detection.toml assets/examples/paloalto-botnet-c2-detection.j2 assets/examples/paloalto-botnet-c2-detection.toml assets/examples/sonicwall-botnet-c2-detection.j2 assets/examples/sonicwall-botnet-c2-detection.toml assets/examples/opnsense-botnet-c2-detection.j2 assets/examples/opnsense-botnet-c2-detection.toml assets/examples/fortinet-ipv6-dual-stack-parity.j2 assets/examples/fortinet-ipv6-dual-stack-parity.csv assets/examples/paloalto-ipv6-dual-stack-parity.j2 assets/examples/paloalto-ipv6-dual-stack-parity.csv assets/examples/sonicwall-ipv6-dual-stack-parity.j2 assets/examples/sonicwall-ipv6-dual-stack-parity.csv assets/examples/opnsense-ipv6-dual-stack-parity.j2 assets/examples/opnsense-ipv6-dual-stack-parity.csv web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster C (脅威対策) NGFW catalog-extension templates

Refs #635

Adds 16 templates (4 problem(s) x Fortinet/Palo Alto Networks/SonicWall/OPNsense) per
docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-vendor-category-templates-bzuo62
```
PRを作成する(タイトル例: `feat: add NGFW catalog-extension templates - cluster C (脅威対策)`、本文で#635を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。マージはユーザーの明示的な承認を待つ(このタスクではマージしない)。

### Task 4: クラスタD「管理者・ガバナンス」(16件)

**Files:**
- Create: `assets/examples/fortinet-admin-mfa-hardening.j2` + `assets/examples/fortinet-admin-mfa-hardening.yaml`
- Create: `assets/examples/paloalto-admin-mfa-hardening.j2` + `assets/examples/paloalto-admin-mfa-hardening.yaml`
- Create: `assets/examples/sonicwall-admin-mfa-hardening.j2` + `assets/examples/sonicwall-admin-mfa-hardening.yaml`
- Create: `assets/examples/opnsense-admin-mfa-hardening.j2` + `assets/examples/opnsense-admin-mfa-hardening.yaml`
- Create: `assets/examples/fortinet-central-management-onboarding.j2` + `assets/examples/fortinet-central-management-onboarding.yaml`
- Create: `assets/examples/paloalto-central-management-onboarding.j2` + `assets/examples/paloalto-central-management-onboarding.yaml`
- Create: `assets/examples/sonicwall-central-management-onboarding.j2` + `assets/examples/sonicwall-central-management-onboarding.yaml`
- Create: `assets/examples/opnsense-central-management-onboarding.j2` + `assets/examples/opnsense-central-management-onboarding.yaml`
- Create: `assets/examples/fortinet-explicit-proxy-mode-switch.j2` + `assets/examples/fortinet-explicit-proxy-mode-switch.yaml`
- Create: `assets/examples/paloalto-explicit-proxy-mode-switch.j2` + `assets/examples/paloalto-explicit-proxy-mode-switch.yaml`
- Create: `assets/examples/sonicwall-explicit-proxy-mode-switch.j2` + `assets/examples/sonicwall-explicit-proxy-mode-switch.yaml`
- Create: `assets/examples/opnsense-explicit-proxy-mode-switch.j2` + `assets/examples/opnsense-explicit-proxy-mode-switch.yaml`
- Create: `assets/examples/fortinet-certificate-lifecycle-management.j2` + `assets/examples/fortinet-certificate-lifecycle-management.toml`
- Create: `assets/examples/paloalto-certificate-lifecycle-management.j2` + `assets/examples/paloalto-certificate-lifecycle-management.toml`
- Create: `assets/examples/sonicwall-certificate-lifecycle-management.j2` + `assets/examples/sonicwall-certificate-lifecycle-management.toml`
- Create: `assets/examples/opnsense-certificate-lifecycle-management.j2` + `assets/examples/opnsense-certificate-lifecycle-management.toml`
- Modify: `web/src/lib/templates.ts`(本クラスタの16件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `admin-mfa-hardening`: 管理者アカウントへの不正アクセスを防ぐため多要素認証(MFA)を必須化しつつ、MFAデバイス紛失等の緊急時にロックアウトされないフェイルセーフ手順を用意したい。
  - `central-management-onboarding`: 複数拠点/多数のファイアウォールを一元管理コンソールに登録し、ポリシー配布・設定変更を集中管理したい。
  - `explicit-proxy-mode-switch`: クライアント側にプロキシ設定が必要な明示的プロキシモードと、設定不要な透過型プロキシモードを状況に応じて使い分けたい。
  - `certificate-lifecycle-management`: 管理画面/VPN等で使用するTLS証明書の発行・更新・失効を一元管理し、有効期限切れによるサービス断を防ぎたい。

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md`の§3.4該当表(`admin-mfa-hardening`, `central-management-onboarding`, `explicit-proxy-mode-switch`, `certificate-lifecycle-management`の各行、Fortinet/Palo Alto Networks/SonicWall/OPNsenseの4表。OPNsenseで対象外の項目は§3.5を参照)を参照。

  `Workflow`で`pipeline()`を用い、16件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)のJinja2テンプレート本文 + サンプルデータ(拡張子は上記Filesのとおり) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 「適応」判定の項目は目的節または用語解説節に元機構との違いを一文明記させる(design doc §5)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。`templates.ts`と`test_template_taxonomy.py`への書き込みはさせない(単一ファイルへの並列編集競合を避けるため、統合はStep 3で単一実行する)。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-admin-mfa-hardening paloalto-admin-mfa-hardening sonicwall-admin-mfa-hardening opnsense-admin-mfa-hardening fortinet-central-management-onboarding paloalto-central-management-onboarding sonicwall-central-management-onboarding opnsense-central-management-onboarding fortinet-explicit-proxy-mode-switch paloalto-explicit-proxy-mode-switch sonicwall-explicit-proxy-mode-switch opnsense-explicit-proxy-mode-switch fortinet-certificate-lifecycle-management paloalto-certificate-lifecycle-management sonicwall-certificate-lifecycle-management opnsense-certificate-lifecycle-management
```
Expected: 全16件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し(挿入のたびに行番号が変わるため必ず再確認)、その直前に本クラスタ16件分のエントリを追記する。エントリ形式(既存行踏襲):
```ts
{ id: "<vendor>-<slug>", name: "<日本語名>", desc: "<日本語説明。〜手順書（Markdown）として生成。で終える>", category: "network", subCategory: "<Fortinet|Palo Alto Networks|SonicWall|OPNsense>", format: "<csv|toml|yaml>", output: "markdown", activity: "<該当時のみ>", updated: "2026-08-01", live: true },
```
本クラスタで`activity`を明示指定するslug: `explicit-proxy-mode-switch`: activity: "change"、`certificate-lifecycle-management`: activity: "routine"。他は省略(既定build)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、design doc §3.1)。`Library.test.tsx`の`RAIL counts against real template data`は本クラスタの時点ではまだ失敗する(EXPECTEDカウント未更新、Task 7で一括更新するため)。失敗内容がその1点(カウント不一致)のみであることを確認して次へ進む。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-admin-mfa-hardening.j2 assets/examples/fortinet-admin-mfa-hardening.yaml assets/examples/paloalto-admin-mfa-hardening.j2 assets/examples/paloalto-admin-mfa-hardening.yaml assets/examples/sonicwall-admin-mfa-hardening.j2 assets/examples/sonicwall-admin-mfa-hardening.yaml assets/examples/opnsense-admin-mfa-hardening.j2 assets/examples/opnsense-admin-mfa-hardening.yaml assets/examples/fortinet-central-management-onboarding.j2 assets/examples/fortinet-central-management-onboarding.yaml assets/examples/paloalto-central-management-onboarding.j2 assets/examples/paloalto-central-management-onboarding.yaml assets/examples/sonicwall-central-management-onboarding.j2 assets/examples/sonicwall-central-management-onboarding.yaml assets/examples/opnsense-central-management-onboarding.j2 assets/examples/opnsense-central-management-onboarding.yaml assets/examples/fortinet-explicit-proxy-mode-switch.j2 assets/examples/fortinet-explicit-proxy-mode-switch.yaml assets/examples/paloalto-explicit-proxy-mode-switch.j2 assets/examples/paloalto-explicit-proxy-mode-switch.yaml assets/examples/sonicwall-explicit-proxy-mode-switch.j2 assets/examples/sonicwall-explicit-proxy-mode-switch.yaml assets/examples/opnsense-explicit-proxy-mode-switch.j2 assets/examples/opnsense-explicit-proxy-mode-switch.yaml assets/examples/fortinet-certificate-lifecycle-management.j2 assets/examples/fortinet-certificate-lifecycle-management.toml assets/examples/paloalto-certificate-lifecycle-management.j2 assets/examples/paloalto-certificate-lifecycle-management.toml assets/examples/sonicwall-certificate-lifecycle-management.j2 assets/examples/sonicwall-certificate-lifecycle-management.toml assets/examples/opnsense-certificate-lifecycle-management.j2 assets/examples/opnsense-certificate-lifecycle-management.toml web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster D (管理者・ガバナンス) NGFW catalog-extension templates

Refs #635

Adds 16 templates (4 problem(s) x Fortinet/Palo Alto Networks/SonicWall/OPNsense) per
docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-vendor-category-templates-bzuo62
```
PRを作成する(タイトル例: `feat: add NGFW catalog-extension templates - cluster D (管理者・ガバナンス)`、本文で#635を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。マージはユーザーの明示的な承認を待つ(このタスクではマージしない)。

### Task 5: クラスタE「監査・監視」(16件)

**Files:**
- Create: `assets/examples/fortinet-compliance-hardening-audit.j2` + `assets/examples/fortinet-compliance-hardening-audit.csv`
- Create: `assets/examples/paloalto-compliance-hardening-audit.j2` + `assets/examples/paloalto-compliance-hardening-audit.csv`
- Create: `assets/examples/sonicwall-compliance-hardening-audit.j2` + `assets/examples/sonicwall-compliance-hardening-audit.csv`
- Create: `assets/examples/opnsense-compliance-hardening-audit.j2` + `assets/examples/opnsense-compliance-hardening-audit.csv`
- Create: `assets/examples/fortinet-central-log-siem-forwarding.j2` + `assets/examples/fortinet-central-log-siem-forwarding.toml`
- Create: `assets/examples/paloalto-central-log-siem-forwarding.j2` + `assets/examples/paloalto-central-log-siem-forwarding.toml`
- Create: `assets/examples/sonicwall-central-log-siem-forwarding.j2` + `assets/examples/sonicwall-central-log-siem-forwarding.toml`
- Create: `assets/examples/opnsense-central-log-siem-forwarding.j2` + `assets/examples/opnsense-central-log-siem-forwarding.toml`
- Create: `assets/examples/fortinet-network-discovery-topology.j2` + `assets/examples/fortinet-network-discovery-topology.yaml`
- Create: `assets/examples/paloalto-network-discovery-topology.j2` + `assets/examples/paloalto-network-discovery-topology.yaml`
- Create: `assets/examples/sonicwall-network-discovery-topology.j2` + `assets/examples/sonicwall-network-discovery-topology.yaml`
- Create: `assets/examples/opnsense-network-discovery-topology.j2` + `assets/examples/opnsense-network-discovery-topology.yaml`
- Create: `assets/examples/fortinet-snmp-monitoring-integration.j2` + `assets/examples/fortinet-snmp-monitoring-integration.yaml`
- Create: `assets/examples/paloalto-snmp-monitoring-integration.j2` + `assets/examples/paloalto-snmp-monitoring-integration.yaml`
- Create: `assets/examples/sonicwall-snmp-monitoring-integration.j2` + `assets/examples/sonicwall-snmp-monitoring-integration.yaml`
- Create: `assets/examples/opnsense-snmp-monitoring-integration.j2` + `assets/examples/opnsense-snmp-monitoring-integration.yaml`
- Modify: `web/src/lib/templates.ts`(本クラスタの16件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `compliance-hardening-audit`: CIS Benchmark等の公開されたハードニング基準に基づき設定の準拠状況を監査し、逸脱を是正したい。
  - `central-log-siem-forwarding`: ファイアウォールのログを外部SIEMへ確実に転送し、転送遅延・欠落を防ぎたい。
  - `network-discovery-topology`: ネットワーク上のデバイスを自動検出しL2/L3トポロジを可視化するとともに、未許可デバイスの接続を検知したい。
  - `snmp-monitoring-integration`: SNMPを用いて外部監視基盤(Zabbix等)からファイアウォールのヘルスチェック(CPU/メモリ/インターフェース状態等)を行いたい。

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md`の§3.4該当表(`compliance-hardening-audit`, `central-log-siem-forwarding`, `network-discovery-topology`, `snmp-monitoring-integration`の各行、Fortinet/Palo Alto Networks/SonicWall/OPNsenseの4表。OPNsenseで対象外の項目は§3.5を参照)を参照。

  `Workflow`で`pipeline()`を用い、16件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)のJinja2テンプレート本文 + サンプルデータ(拡張子は上記Filesのとおり) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 「適応」判定の項目は目的節または用語解説節に元機構との違いを一文明記させる(design doc §5)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。`templates.ts`と`test_template_taxonomy.py`への書き込みはさせない(単一ファイルへの並列編集競合を避けるため、統合はStep 3で単一実行する)。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-compliance-hardening-audit paloalto-compliance-hardening-audit sonicwall-compliance-hardening-audit opnsense-compliance-hardening-audit fortinet-central-log-siem-forwarding paloalto-central-log-siem-forwarding sonicwall-central-log-siem-forwarding opnsense-central-log-siem-forwarding fortinet-network-discovery-topology paloalto-network-discovery-topology sonicwall-network-discovery-topology opnsense-network-discovery-topology fortinet-snmp-monitoring-integration paloalto-snmp-monitoring-integration sonicwall-snmp-monitoring-integration opnsense-snmp-monitoring-integration
```
Expected: 全16件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し(挿入のたびに行番号が変わるため必ず再確認)、その直前に本クラスタ16件分のエントリを追記する。エントリ形式(既存行踏襲):
```ts
{ id: "<vendor>-<slug>", name: "<日本語名>", desc: "<日本語説明。〜手順書（Markdown）として生成。で終える>", category: "network", subCategory: "<Fortinet|Palo Alto Networks|SonicWall|OPNsense>", format: "<csv|toml|yaml>", output: "markdown", activity: "<該当時のみ>", updated: "2026-08-01", live: true },
```
本クラスタで`activity`を明示指定するslug: `compliance-hardening-audit`: activity: "routine"。他は省略(既定build)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、design doc §3.1)。`Library.test.tsx`の`RAIL counts against real template data`は本クラスタの時点ではまだ失敗する(EXPECTEDカウント未更新、Task 7で一括更新するため)。失敗内容がその1点(カウント不一致)のみであることを確認して次へ進む。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-compliance-hardening-audit.j2 assets/examples/fortinet-compliance-hardening-audit.csv assets/examples/paloalto-compliance-hardening-audit.j2 assets/examples/paloalto-compliance-hardening-audit.csv assets/examples/sonicwall-compliance-hardening-audit.j2 assets/examples/sonicwall-compliance-hardening-audit.csv assets/examples/opnsense-compliance-hardening-audit.j2 assets/examples/opnsense-compliance-hardening-audit.csv assets/examples/fortinet-central-log-siem-forwarding.j2 assets/examples/fortinet-central-log-siem-forwarding.toml assets/examples/paloalto-central-log-siem-forwarding.j2 assets/examples/paloalto-central-log-siem-forwarding.toml assets/examples/sonicwall-central-log-siem-forwarding.j2 assets/examples/sonicwall-central-log-siem-forwarding.toml assets/examples/opnsense-central-log-siem-forwarding.j2 assets/examples/opnsense-central-log-siem-forwarding.toml assets/examples/fortinet-network-discovery-topology.j2 assets/examples/fortinet-network-discovery-topology.yaml assets/examples/paloalto-network-discovery-topology.j2 assets/examples/paloalto-network-discovery-topology.yaml assets/examples/sonicwall-network-discovery-topology.j2 assets/examples/sonicwall-network-discovery-topology.yaml assets/examples/opnsense-network-discovery-topology.j2 assets/examples/opnsense-network-discovery-topology.yaml assets/examples/fortinet-snmp-monitoring-integration.j2 assets/examples/fortinet-snmp-monitoring-integration.yaml assets/examples/paloalto-snmp-monitoring-integration.j2 assets/examples/paloalto-snmp-monitoring-integration.yaml assets/examples/sonicwall-snmp-monitoring-integration.j2 assets/examples/sonicwall-snmp-monitoring-integration.yaml assets/examples/opnsense-snmp-monitoring-integration.j2 assets/examples/opnsense-snmp-monitoring-integration.yaml web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster E (監査・監視) NGFW catalog-extension templates

Refs #635

Adds 16 templates (4 problem(s) x Fortinet/Palo Alto Networks/SonicWall/OPNsense) per
docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-vendor-category-templates-bzuo62
```
PRを作成する(タイトル例: `feat: add NGFW catalog-extension templates - cluster E (監査・監視)`、本文で#635を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。マージはユーザーの明示的な承認を待つ(このタスクではマージしない)。

### Task 6: クラスタF「クラウド・分離・検疫」(18件)

**Files:**
- Create: `assets/examples/fortinet-cloud-vm-form-factor-deployment.j2` + `assets/examples/fortinet-cloud-vm-form-factor-deployment.toml`
- Create: `assets/examples/paloalto-cloud-vm-form-factor-deployment.j2` + `assets/examples/paloalto-cloud-vm-form-factor-deployment.toml`
- Create: `assets/examples/sonicwall-cloud-vm-form-factor-deployment.j2` + `assets/examples/sonicwall-cloud-vm-form-factor-deployment.toml`
- Create: `assets/examples/opnsense-cloud-vm-form-factor-deployment.j2` + `assets/examples/opnsense-cloud-vm-form-factor-deployment.toml`
- Create: `assets/examples/fortinet-config-drift-baseline-compare.j2` + `assets/examples/fortinet-config-drift-baseline-compare.yaml`
- Create: `assets/examples/paloalto-config-drift-baseline-compare.j2` + `assets/examples/paloalto-config-drift-baseline-compare.yaml`
- Create: `assets/examples/sonicwall-config-drift-baseline-compare.j2` + `assets/examples/sonicwall-config-drift-baseline-compare.yaml`
- Create: `assets/examples/opnsense-config-drift-baseline-compare.j2` + `assets/examples/opnsense-config-drift-baseline-compare.yaml`
- Create: `assets/examples/fortinet-vdom-multi-tenant-segmentation.j2` + `assets/examples/fortinet-vdom-multi-tenant-segmentation.yaml`
- Create: `assets/examples/paloalto-vdom-multi-tenant-segmentation.j2` + `assets/examples/paloalto-vdom-multi-tenant-segmentation.yaml`
- Create: `assets/examples/sonicwall-vdom-multi-tenant-segmentation.j2` + `assets/examples/sonicwall-vdom-multi-tenant-segmentation.yaml`
- Create: `assets/examples/opnsense-vdom-multi-tenant-segmentation.j2` + `assets/examples/opnsense-vdom-multi-tenant-segmentation.yaml`
- Create: `assets/examples/fortinet-remote-access-posture-check.j2` + `assets/examples/fortinet-remote-access-posture-check.yaml`
- Create: `assets/examples/paloalto-remote-access-posture-check.j2` + `assets/examples/paloalto-remote-access-posture-check.yaml`
- Create: `assets/examples/sonicwall-remote-access-posture-check.j2` + `assets/examples/sonicwall-remote-access-posture-check.yaml`
- Create: `assets/examples/fortinet-ha-config-sync-drift.j2` + `assets/examples/fortinet-ha-config-sync-drift.toml`
- Create: `assets/examples/paloalto-ha-config-sync-drift.j2` + `assets/examples/paloalto-ha-config-sync-drift.toml`
- Create: `assets/examples/sonicwall-ha-config-sync-drift.j2` + `assets/examples/sonicwall-ha-config-sync-drift.toml`
- Modify: `web/src/lib/templates.ts`(本クラスタの18件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `cloud-vm-form-factor-deployment`: クラウド環境(AWS/Azure等)に仮想アプライアンスとしてファイアウォールを展開し、ライセンス形態(BYOL/PAYG)を選択、需要に応じてスケールアウトしたい。
  - `config-drift-baseline-compare`: 稼働中の設定と承認済みベースライン(過去バージョン)を定期的に比較し、意図しない変更(コンフィグドリフト)を検知したい。
  - `vdom-multi-tenant-segmentation`: 1台の物理アプライアンス上で複数のテナント/部門ごとに独立した設定・ポリシー・ログを論理的に分離運用したい。
  - `remote-access-posture-check`: リモートアクセスVPN接続時に、エンドポイントの状態(AV稼働、パッチ適用状況等)を検査し、非準拠端末のアクセスを制限・隔離したい。
  - `ha-config-sync-drift`: HA(高可用性)クラスタを構成するペア機器間の設定同期状態を定期的に監査し、非同期(ドリフト)を検知・是正したい。

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md`の§3.4該当表(`cloud-vm-form-factor-deployment`, `config-drift-baseline-compare`, `vdom-multi-tenant-segmentation`, `remote-access-posture-check`, `ha-config-sync-drift`の各行、Fortinet/Palo Alto Networks/SonicWall/OPNsenseの4表。OPNsenseで対象外の項目は§3.5を参照)を参照。

  `Workflow`で`pipeline()`を用い、18件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)のJinja2テンプレート本文 + サンプルデータ(拡張子は上記Filesのとおり) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 「適応」判定の項目は目的節または用語解説節に元機構との違いを一文明記させる(design doc §5)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。`templates.ts`と`test_template_taxonomy.py`への書き込みはさせない(単一ファイルへの並列編集競合を避けるため、統合はStep 3で単一実行する)。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-cloud-vm-form-factor-deployment paloalto-cloud-vm-form-factor-deployment sonicwall-cloud-vm-form-factor-deployment opnsense-cloud-vm-form-factor-deployment fortinet-config-drift-baseline-compare paloalto-config-drift-baseline-compare sonicwall-config-drift-baseline-compare opnsense-config-drift-baseline-compare fortinet-vdom-multi-tenant-segmentation paloalto-vdom-multi-tenant-segmentation sonicwall-vdom-multi-tenant-segmentation opnsense-vdom-multi-tenant-segmentation fortinet-remote-access-posture-check paloalto-remote-access-posture-check sonicwall-remote-access-posture-check fortinet-ha-config-sync-drift paloalto-ha-config-sync-drift sonicwall-ha-config-sync-drift
```
Expected: 全18件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し(挿入のたびに行番号が変わるため必ず再確認)、その直前に本クラスタ18件分のエントリを追記する。エントリ形式(既存行踏襲):
```ts
{ id: "<vendor>-<slug>", name: "<日本語名>", desc: "<日本語説明。〜手順書（Markdown）として生成。で終える>", category: "network", subCategory: "<Fortinet|Palo Alto Networks|SonicWall|OPNsense>", format: "<csv|toml|yaml>", output: "markdown", activity: "<該当時のみ>", updated: "2026-08-01", live: true },
```
本クラスタで`activity`を明示指定するslug: `config-drift-baseline-compare`: activity: "routine"、`ha-config-sync-drift`: activity: "routine"。他は省略(既定build)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、design doc §3.1)。`Library.test.tsx`の`RAIL counts against real template data`は本クラスタの時点ではまだ失敗する(EXPECTEDカウント未更新、Task 7で一括更新するため)。失敗内容がその1点(カウント不一致)のみであることを確認して次へ進む。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-cloud-vm-form-factor-deployment.j2 assets/examples/fortinet-cloud-vm-form-factor-deployment.toml assets/examples/paloalto-cloud-vm-form-factor-deployment.j2 assets/examples/paloalto-cloud-vm-form-factor-deployment.toml assets/examples/sonicwall-cloud-vm-form-factor-deployment.j2 assets/examples/sonicwall-cloud-vm-form-factor-deployment.toml assets/examples/opnsense-cloud-vm-form-factor-deployment.j2 assets/examples/opnsense-cloud-vm-form-factor-deployment.toml assets/examples/fortinet-config-drift-baseline-compare.j2 assets/examples/fortinet-config-drift-baseline-compare.yaml assets/examples/paloalto-config-drift-baseline-compare.j2 assets/examples/paloalto-config-drift-baseline-compare.yaml assets/examples/sonicwall-config-drift-baseline-compare.j2 assets/examples/sonicwall-config-drift-baseline-compare.yaml assets/examples/opnsense-config-drift-baseline-compare.j2 assets/examples/opnsense-config-drift-baseline-compare.yaml assets/examples/fortinet-vdom-multi-tenant-segmentation.j2 assets/examples/fortinet-vdom-multi-tenant-segmentation.yaml assets/examples/paloalto-vdom-multi-tenant-segmentation.j2 assets/examples/paloalto-vdom-multi-tenant-segmentation.yaml assets/examples/sonicwall-vdom-multi-tenant-segmentation.j2 assets/examples/sonicwall-vdom-multi-tenant-segmentation.yaml assets/examples/opnsense-vdom-multi-tenant-segmentation.j2 assets/examples/opnsense-vdom-multi-tenant-segmentation.yaml assets/examples/fortinet-remote-access-posture-check.j2 assets/examples/fortinet-remote-access-posture-check.yaml assets/examples/paloalto-remote-access-posture-check.j2 assets/examples/paloalto-remote-access-posture-check.yaml assets/examples/sonicwall-remote-access-posture-check.j2 assets/examples/sonicwall-remote-access-posture-check.yaml assets/examples/fortinet-ha-config-sync-drift.j2 assets/examples/fortinet-ha-config-sync-drift.toml assets/examples/paloalto-ha-config-sync-drift.j2 assets/examples/paloalto-ha-config-sync-drift.toml assets/examples/sonicwall-ha-config-sync-drift.j2 assets/examples/sonicwall-ha-config-sync-drift.toml web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster F (クラウド・分離・検疫) NGFW catalog-extension templates

Refs #635

Adds 18 templates (5 problem(s) x Fortinet/Palo Alto Networks/SonicWall/OPNsense) per
docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-vendor-category-templates-bzuo62
```
PRを作成する(タイトル例: `feat: add NGFW catalog-extension templates - cluster F (クラウド・分離・検疫)`、本文で#635を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。マージはユーザーの明示的な承認を待つ(このタスクではマージしない)。

### Task 7: `Library.test.tsx` の EXPECTED カウント更新

**Files:**
- Modify: `web/src/components/Library.test.tsx:136-161`(`EXPECTED` レコード)

- [ ] **Step 1: 現在の値を確認する**

Run:
```bash
grep -n '"network-fortinet"\|"network-opnsense"\|"network-palo-alto"\|"network-sonicwall"\|all:' web/src/components/Library.test.tsx
```
Expected出力(変更前):
```
137:    all: 794,
141:    "network-fortinet": 29,
148:    "network-opnsense": 25,
149:    "network-palo-alto": 26,
150:    "network-sonicwall": 26,
```

- [ ] **Step 2: 4件を更新する**

`web/src/components/Library.test.tsx` の `EXPECTED` オブジェクトを編集し、以下のとおり変更する(他のキーは変更しない):

```ts
    all: 892,
    "network-fortinet": 54,
    "network-opnsense": 48,
    "network-palo-alto": 51,
    "network-sonicwall": 51,
```

(内訳: `all` は 794 + 98 = 892。`network-fortinet`/`network-palo-alto`/`network-sonicwall` は既存 + 25。`network-opnsense` は既存 + 23。)

- [ ] **Step 3: テストを実行して確認する**

Run:
```bash
cd web && npx vitest run Library.test.tsx && cd ..
```
Expected: `RAIL counts against real template data` を含む全テストが PASS。

- [ ] **Step 4: コミットする**

```bash
git add web/src/components/Library.test.tsx
git commit -m "$(cat <<'EOF'
test: update Library rail counts for NGFW catalog-extension templates

Refs #635

Updates the four NGFW vendor rail counts (Fortinet/Palo Alto
Networks/SonicWall +25, OPNsense +23) and the `all` total (+98) in
docs/superpowers/specs/2026-08-01-ngfw-vendor-catalog-extension-design.md's
EXPECTED count table, now that all 6 clusters are merged.
EOF
)"
```

- [ ] **Step 5: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-vendor-category-templates-bzuo62
```
PRを作成する(タイトル例: `test: update Library rail counts for NGFW catalog-extension templates`、本文で#635を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。マージはユーザーの明示的な承認を待つ(このタスクではマージしない)。

**注記**: この更新は全6クラスタのマージ後に実施すること(クラスタごとのPRがまだ未マージの間はカウントが揃わないため、Step 3のテストが失敗する)。#619の実装時にはこのタスクが計画に含まれておらず、マージ後に別途修正コミット(`5b5ee13`)が必要になった。同じ抜け漏れを繰り返さないよう、本計画では独立タスクとして明示する。

### Task 8: 全体整合性の最終確認

**Files:** なし(横断チェックのみ)

- [ ] **Step 1: 98件全体の重複・欠落チェック**

```bash
python3 -c "
import re
content = open('web/src/lib/templates.ts').read()
ids = re.findall(r'id: \"([a-z0-9-]+)\"', content)
assert len(ids) == len(set(ids)), 'duplicate id found'
vendors = ['fortinet', 'paloalto', 'sonicwall', 'opnsense']
slugs = ['ssl-tls-inspection','app-control-policy','url-category-filtering','user-id-policy','qos-bandwidth-shaping','multi-wan-failover','site-to-site-vpn-tunnel-monitoring','guest-wifi-bandwidth-cap','threat-intel-feed','dos-protection-profile','botnet-c2-detection','ipv6-dual-stack-parity','admin-mfa-hardening','central-management-onboarding','explicit-proxy-mode-switch','certificate-lifecycle-management','compliance-hardening-audit','central-log-siem-forwarding','network-discovery-topology','snmp-monitoring-integration','cloud-vm-form-factor-deployment','config-drift-baseline-compare','vdom-multi-tenant-segmentation']
opnsense_only_3vendor_slugs = ['remote-access-posture-check', 'ha-config-sync-drift']
expected = {f'{v}-{s}' for v in vendors for s in slugs}
expected |= {f'{v}-{s}' for v in ('fortinet','paloalto','sonicwall') for s in opnsense_only_3vendor_slugs}
assert len(expected) == 98, f'expected set size {len(expected)}, want 98'
missing = expected - set(ids)
assert not missing, f'missing ids: {missing}'
extra_opnsense = {f'opnsense-{s}' for s in opnsense_only_3vendor_slugs} & set(ids)
assert not extra_opnsense, f'OPNsense should NOT have these ids (design doc section 3.5): {extra_opnsense}'
print('OK: 98/98 ids present, no duplicates, OPNsense exclusions respected')
"
```
Expected: `OK: 98/98 ids present, no duplicates, OPNsense exclusions respected`

- [ ] **Step 2: 4ベンダーの最終カウントを確認する**

```bash
python3 -c "
import re
text = open('web/src/lib/templates.ts').read()
rows = re.findall(r'category: \"(\w+)\", subCategory: \"([^\"]+)\"', text)
from collections import Counter
net = Counter(sc for cat, sc in rows if cat == 'network')
for v in ('Fortinet', 'SonicWall', 'Palo Alto Networks', 'OPNsense'):
    print(v, net[v])
"
```
Expected:
```
Fortinet 54
SonicWall 51
Palo Alto Networks 51
OPNsense 48
```

- [ ] **Step 3: 全6クラスタ + Task 7 のPRのCI/レビュー状態を確認し、マージ可能状態まで追従する**

7件のPR(クラスタA〜F + Library.test.tsxカウント更新)について、CIが green かつレビューコメントが解消済み(`mergeable_state` が `clean`)であることを確認する。レビューコメントには#635/#634/#619/#630/#631/#501の文脈を踏まえて対応する。**マージ自体はユーザーの明示的な承認を待つ(このタスクではマージしない)。**

- [ ] **Step 4: マージ準備完了をユーザーに報告する**

全PRがマージ可能状態になったら、各PRのURL・CI状態・レビュー状態の一覧をユーザーに提示し、マージの可否判断を仰ぐ。
