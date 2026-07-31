# NGFW/UTMベンダーパリティテンプレート75件 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OPNsenseの25運用課題カタログをFortinet/Palo Alto Networks/SonicWallのネイティブ機構に対応させた75件のテンプレート(`assets/examples/*.j2`+データファイル対、`web/src/lib/templates.ts`への登録)を追加し、7つの問題クラスタ単位でPRを作成する。

**Architecture:** `docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md`の§3.4検証済みマッピング表を一次ソースとして、クラスタ単位で`Workflow`ツールにより並行生成する。各エージェントは「1 slug × 1ベンダー」を担当し、6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)のJinja2テンプレート+サンプルデータ+`templates.ts`用メタデータ(name/desc)を提案する。統合(`templates.ts`追記)・検証(render-check/pytest/tsc/vitest)・コミット・PR化はクラスタごとに決定的な手順として実行する。

**Tech Stack:** Python 3.11 (Jinja2 SandboxedEnvironment, pytest, ruff, mypy), TypeScript/Vite (`web/`, vitest, tsc), `scripts/local_render_check.py`。

---

## 共通事項(全タスク共通)

- 各テンプレートの6セクション構成・Jinja制限・credential取り扱いは設計書§4を厳守する。
- 各テンプレートの本文は、設計書§3.4の該当slug×ベンダー行にある「ネイティブ機構」列と「一次情報」URLを直接の一次ソースとして参照して執筆する。生成時にURLへ再アクセスし、CLI/GUIの細部(パラメータ名等)を確認してから記述する。
- 判定が「適応」の項目は、目的節または用語解説節に「OPNsenseの<元機構>とは異なり、<ベンダー>では<ネイティブ機構>で同じ課題を解決する」旨を一文明記する。
- `remote-access-vpn`は、既存の`<vendor>-ikev2-vpn`(拠点間IPsec)との違い(個人のリモートアクセス用途である旨)を用語解説節で明示する。
- 各テンプレートの`templates.ts`エントリ形式(既存行を参考に、生成エージェントが`name`/`desc`を提案する):
  ```ts
  { id: "<vendor>-<slug>", name: "<日本語名>", desc: "<日本語説明。〜手順書（Markdown）として生成。で終える>", category: "network", subCategory: "<Fortinet|Palo Alto Networks|SonicWall>", format: "<csv|toml|yaml>", output: "markdown", activity: "<該当時のみ>", updated: "2026-07-31", live: true },
  ```
- `templates.ts`への追記位置: 配列を閉じる`];`行の直前(現状754行目付近、クラスタ追加のたびに行番号は増える。挿入前に`grep -n "^\];" web/src/lib/templates.ts`で現在位置を確認すること)。

### Task 1: クラスタ1「ポリシー/NAT基礎」(12件)

**Files:**
- Create: `assets/examples/fortinet-default-deny-wan.j2` + `assets/examples/fortinet-default-deny-wan.csv`
- Create: `assets/examples/paloalto-default-deny-wan.j2` + `assets/examples/paloalto-default-deny-wan.csv`
- Create: `assets/examples/sonicwall-default-deny-wan.j2` + `assets/examples/sonicwall-default-deny-wan.csv`
- Create: `assets/examples/fortinet-address-object-rules.j2` + `assets/examples/fortinet-address-object-rules.csv`
- Create: `assets/examples/paloalto-address-object-rules.j2` + `assets/examples/paloalto-address-object-rules.csv`
- Create: `assets/examples/sonicwall-address-object-rules.j2` + `assets/examples/sonicwall-address-object-rules.csv`
- Create: `assets/examples/fortinet-dmz-port-forward.j2` + `assets/examples/fortinet-dmz-port-forward.toml`
- Create: `assets/examples/paloalto-dmz-port-forward.j2` + `assets/examples/paloalto-dmz-port-forward.toml`
- Create: `assets/examples/sonicwall-dmz-port-forward.j2` + `assets/examples/sonicwall-dmz-port-forward.toml`
- Create: `assets/examples/fortinet-outbound-nat-policy.j2` + `assets/examples/fortinet-outbound-nat-policy.toml`
- Create: `assets/examples/paloalto-outbound-nat-policy.j2` + `assets/examples/paloalto-outbound-nat-policy.toml`
- Create: `assets/examples/sonicwall-outbound-nat-policy.j2` + `assets/examples/sonicwall-outbound-nat-policy.toml`
- Modify: `web/src/lib/templates.ts`(本クラスタの12件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `default-deny-wan`: WAN側を暗黙拒否とし、業務に必要な最小限の許可ルールのみを明示的に登録する
  - `address-object-rules`: ホスト・ネットワーク・ポートをAddress Object/Service Objectとして定義し、ルールを集約管理して変更を1箇所に閉じる
  - `dmz-port-forward`: WANからDMZ内公開サーバへのポートフォワードを最小公開ポートで構成し、到達性を検証する
  - `outbound-nat-policy`: 既定のアウトバウンドNATに加え、特定送信元の固定NAT(送信元アドレス固定)を安全に追加する

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md`の§3.4該当表( `default-deny-wan`, `address-object-rules`, `dmz-port-forward`, `outbound-nat-policy` の各行、Fortinet/Palo Alto Networks/SonicWallの3表)を参照。

  `Workflow`で`pipeline()`を用い、12件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成のJinja2テンプレート本文 + サンプルデータ(csv/toml/yaml、上記Filesの拡張子) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-default-deny-wan paloalto-default-deny-wan sonicwall-default-deny-wan fortinet-address-object-rules paloalto-address-object-rules sonicwall-address-object-rules fortinet-dmz-port-forward paloalto-dmz-port-forward sonicwall-dmz-port-forward fortinet-outbound-nat-policy paloalto-outbound-nat-policy sonicwall-outbound-nat-policy
```
Expected: 全12件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し、その直前に本クラスタ12件分のエントリを追記する(既存行の書式に厳密に合わせる。`updated: "2026-07-31"`, `live: true`固定)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、3.1節)。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-default-deny-wan.j2 assets/examples/fortinet-default-deny-wan.csv assets/examples/paloalto-default-deny-wan.j2 assets/examples/paloalto-default-deny-wan.csv assets/examples/sonicwall-default-deny-wan.j2 assets/examples/sonicwall-default-deny-wan.csv assets/examples/fortinet-address-object-rules.j2 assets/examples/fortinet-address-object-rules.csv assets/examples/paloalto-address-object-rules.j2 assets/examples/paloalto-address-object-rules.csv assets/examples/sonicwall-address-object-rules.j2 assets/examples/sonicwall-address-object-rules.csv assets/examples/fortinet-dmz-port-forward.j2 assets/examples/fortinet-dmz-port-forward.toml assets/examples/paloalto-dmz-port-forward.j2 assets/examples/paloalto-dmz-port-forward.toml assets/examples/sonicwall-dmz-port-forward.j2 assets/examples/sonicwall-dmz-port-forward.toml assets/examples/fortinet-outbound-nat-policy.j2 assets/examples/fortinet-outbound-nat-policy.toml assets/examples/paloalto-outbound-nat-policy.j2 assets/examples/paloalto-outbound-nat-policy.toml assets/examples/sonicwall-outbound-nat-policy.j2 assets/examples/sonicwall-outbound-nat-policy.toml web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster 1 (ポリシー/NAT基礎) NGFW vendor-parity templates

Refs #619

Adds 12 templates (4 problem(s) x Fortinet/Palo Alto
Networks/SonicWall) per docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-equipment-vendor-parity-9sqqqu
```
PRを作成する(タイトル例: `feat: add NGFW vendor-parity templates - cluster 1 (ポリシー/NAT基礎)`、本文で#619を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。

### Task 2: クラスタ2「アクセス制御/堅牢化」(12件)

**Files:**
- Create: `assets/examples/fortinet-lan-segment-isolation.j2` + `assets/examples/fortinet-lan-segment-isolation.csv`
- Create: `assets/examples/paloalto-lan-segment-isolation.j2` + `assets/examples/paloalto-lan-segment-isolation.csv`
- Create: `assets/examples/sonicwall-lan-segment-isolation.j2` + `assets/examples/sonicwall-lan-segment-isolation.csv`
- Create: `assets/examples/fortinet-geoip-country-block.j2` + `assets/examples/fortinet-geoip-country-block.toml`
- Create: `assets/examples/paloalto-geoip-country-block.j2` + `assets/examples/paloalto-geoip-country-block.toml`
- Create: `assets/examples/sonicwall-geoip-country-block.j2` + `assets/examples/sonicwall-geoip-country-block.toml`
- Create: `assets/examples/fortinet-schedule-based-access.j2` + `assets/examples/fortinet-schedule-based-access.csv`
- Create: `assets/examples/paloalto-schedule-based-access.j2` + `assets/examples/paloalto-schedule-based-access.csv`
- Create: `assets/examples/sonicwall-schedule-based-access.j2` + `assets/examples/sonicwall-schedule-based-access.csv`
- Create: `assets/examples/fortinet-mgmt-plane-lockdown.j2` + `assets/examples/fortinet-mgmt-plane-lockdown.yaml`
- Create: `assets/examples/paloalto-mgmt-plane-lockdown.j2` + `assets/examples/paloalto-mgmt-plane-lockdown.yaml`
- Create: `assets/examples/sonicwall-mgmt-plane-lockdown.j2` + `assets/examples/sonicwall-mgmt-plane-lockdown.yaml`
- Modify: `web/src/lib/templates.ts`(本クラスタの12件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `lan-segment-isolation`: 部門VLAN間の通信を既定拒否とし、業務に必要な通信のみを明示的に許可するセグメント分離ルールを設計・適用する
  - `geoip-country-block`: GeoIP機能で特定国からのWAN着信を遮断し、誤遮断がないことを確認する
  - `schedule-based-access`: スケジュール機能で業務時間外の外部アクセスを自動遮断し、切替時刻の挙動を検証する
  - `mgmt-plane-lockdown`: GUI/SSHの管理アクセスを管理セグメントのみに限定し、自己ロックアウトを防ぎながら管理面を要塞化する

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md`の§3.4該当表( `lan-segment-isolation`, `geoip-country-block`, `schedule-based-access`, `mgmt-plane-lockdown` の各行、Fortinet/Palo Alto Networks/SonicWallの3表)を参照。

  `Workflow`で`pipeline()`を用い、12件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成のJinja2テンプレート本文 + サンプルデータ(csv/toml/yaml、上記Filesの拡張子) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-lan-segment-isolation paloalto-lan-segment-isolation sonicwall-lan-segment-isolation fortinet-geoip-country-block paloalto-geoip-country-block sonicwall-geoip-country-block fortinet-schedule-based-access paloalto-schedule-based-access sonicwall-schedule-based-access fortinet-mgmt-plane-lockdown paloalto-mgmt-plane-lockdown sonicwall-mgmt-plane-lockdown
```
Expected: 全12件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し、その直前に本クラスタ12件分のエントリを追記する(既存行の書式に厳密に合わせる。`updated: "2026-07-31"`, `live: true`固定)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、3.1節)。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-lan-segment-isolation.j2 assets/examples/fortinet-lan-segment-isolation.csv assets/examples/paloalto-lan-segment-isolation.j2 assets/examples/paloalto-lan-segment-isolation.csv assets/examples/sonicwall-lan-segment-isolation.j2 assets/examples/sonicwall-lan-segment-isolation.csv assets/examples/fortinet-geoip-country-block.j2 assets/examples/fortinet-geoip-country-block.toml assets/examples/paloalto-geoip-country-block.j2 assets/examples/paloalto-geoip-country-block.toml assets/examples/sonicwall-geoip-country-block.j2 assets/examples/sonicwall-geoip-country-block.toml assets/examples/fortinet-schedule-based-access.j2 assets/examples/fortinet-schedule-based-access.csv assets/examples/paloalto-schedule-based-access.j2 assets/examples/paloalto-schedule-based-access.csv assets/examples/sonicwall-schedule-based-access.j2 assets/examples/sonicwall-schedule-based-access.csv assets/examples/fortinet-mgmt-plane-lockdown.j2 assets/examples/fortinet-mgmt-plane-lockdown.yaml assets/examples/paloalto-mgmt-plane-lockdown.j2 assets/examples/paloalto-mgmt-plane-lockdown.yaml assets/examples/sonicwall-mgmt-plane-lockdown.j2 assets/examples/sonicwall-mgmt-plane-lockdown.yaml web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster 2 (アクセス制御/堅牢化) NGFW vendor-parity templates

Refs #619

Adds 12 templates (4 problem(s) x Fortinet/Palo Alto
Networks/SonicWall) per docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-equipment-vendor-parity-9sqqqu
```
PRを作成する(タイトル例: `feat: add NGFW vendor-parity templates - cluster 2 (アクセス制御/堅牢化)`、本文で#619を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。

### Task 3: クラスタ3「HA/リモートアクセス」(9件)

**Files:**
- Create: `assets/examples/fortinet-ha-active-passive-setup.j2` + `assets/examples/fortinet-ha-active-passive-setup.yaml`
- Create: `assets/examples/paloalto-ha-active-passive-setup.j2` + `assets/examples/paloalto-ha-active-passive-setup.yaml`
- Create: `assets/examples/sonicwall-ha-active-passive-setup.j2` + `assets/examples/sonicwall-ha-active-passive-setup.yaml`
- Create: `assets/examples/fortinet-ha-failover-drill.j2` + `assets/examples/fortinet-ha-failover-drill.yaml`
- Create: `assets/examples/paloalto-ha-failover-drill.j2` + `assets/examples/paloalto-ha-failover-drill.yaml`
- Create: `assets/examples/sonicwall-ha-failover-drill.j2` + `assets/examples/sonicwall-ha-failover-drill.yaml`
- Create: `assets/examples/fortinet-remote-access-vpn.j2` + `assets/examples/fortinet-remote-access-vpn.yaml`
- Create: `assets/examples/paloalto-remote-access-vpn.j2` + `assets/examples/paloalto-remote-access-vpn.yaml`
- Create: `assets/examples/sonicwall-remote-access-vpn.j2` + `assets/examples/sonicwall-remote-access-vpn.yaml`
- Modify: `web/src/lib/templates.ts`(本クラスタの9件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `ha-active-passive-setup`: 二台構成のActive-Passive冗長化(状態同期含む)を構築し、フェイルオーバー動作を検証する
  - `ha-failover-drill`: HA冗長構成の計画切替訓練を実施し、切替時間・セッション維持・復帰動作を測定する
  - `remote-access-vpn`: (再定義: 拠点間ではなく個人リモートアクセス) 社外の個人端末からの暗号化リモートアクセスVPNを、ベンダーネイティブなSSL-VPN/リモートアクセス機構で構成する。既存の*-ikev2-vpnとの重複を避けるための再定義

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md`の§3.4該当表( `ha-active-passive-setup`, `ha-failover-drill`, `remote-access-vpn` の各行、Fortinet/Palo Alto Networks/SonicWallの3表)を参照。

  `Workflow`で`pipeline()`を用い、9件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成のJinja2テンプレート本文 + サンプルデータ(csv/toml/yaml、上記Filesの拡張子) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-ha-active-passive-setup paloalto-ha-active-passive-setup sonicwall-ha-active-passive-setup fortinet-ha-failover-drill paloalto-ha-failover-drill sonicwall-ha-failover-drill fortinet-remote-access-vpn paloalto-remote-access-vpn sonicwall-remote-access-vpn
```
Expected: 全9件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し、その直前に本クラスタ9件分のエントリを追記する(既存行の書式に厳密に合わせる。`updated: "2026-07-31"`, `live: true`固定)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、3.1節)。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-ha-active-passive-setup.j2 assets/examples/fortinet-ha-active-passive-setup.yaml assets/examples/paloalto-ha-active-passive-setup.j2 assets/examples/paloalto-ha-active-passive-setup.yaml assets/examples/sonicwall-ha-active-passive-setup.j2 assets/examples/sonicwall-ha-active-passive-setup.yaml assets/examples/fortinet-ha-failover-drill.j2 assets/examples/fortinet-ha-failover-drill.yaml assets/examples/paloalto-ha-failover-drill.j2 assets/examples/paloalto-ha-failover-drill.yaml assets/examples/sonicwall-ha-failover-drill.j2 assets/examples/sonicwall-ha-failover-drill.yaml assets/examples/fortinet-remote-access-vpn.j2 assets/examples/fortinet-remote-access-vpn.yaml assets/examples/paloalto-remote-access-vpn.j2 assets/examples/paloalto-remote-access-vpn.yaml assets/examples/sonicwall-remote-access-vpn.j2 assets/examples/sonicwall-remote-access-vpn.yaml web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster 3 (HA/リモートアクセス) NGFW vendor-parity templates

Refs #619

Adds 9 templates (3 problem(s) x Fortinet/Palo Alto
Networks/SonicWall) per docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-equipment-vendor-parity-9sqqqu
```
PRを作成する(タイトル例: `feat: add NGFW vendor-parity templates - cluster 3 (HA/リモートアクセス)`、本文で#619を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。

### Task 4: クラスタ4「検知/インシデント対応」(12件)

**Files:**
- Create: `assets/examples/fortinet-ips-inline-enable.j2` + `assets/examples/fortinet-ips-inline-enable.yaml`
- Create: `assets/examples/paloalto-ips-inline-enable.j2` + `assets/examples/paloalto-ips-inline-enable.yaml`
- Create: `assets/examples/sonicwall-ips-inline-enable.j2` + `assets/examples/sonicwall-ips-inline-enable.yaml`
- Create: `assets/examples/fortinet-emergency-ip-block.j2` + `assets/examples/fortinet-emergency-ip-block.csv`
- Create: `assets/examples/paloalto-emergency-ip-block.j2` + `assets/examples/paloalto-emergency-ip-block.csv`
- Create: `assets/examples/sonicwall-emergency-ip-block.j2` + `assets/examples/sonicwall-emergency-ip-block.csv`
- Create: `assets/examples/fortinet-compromised-host-quarantine.j2` + `assets/examples/fortinet-compromised-host-quarantine.yaml`
- Create: `assets/examples/paloalto-compromised-host-quarantine.j2` + `assets/examples/paloalto-compromised-host-quarantine.yaml`
- Create: `assets/examples/sonicwall-compromised-host-quarantine.j2` + `assets/examples/sonicwall-compromised-host-quarantine.yaml`
- Create: `assets/examples/fortinet-staged-rule-change.j2` + `assets/examples/fortinet-staged-rule-change.yaml`
- Create: `assets/examples/paloalto-staged-rule-change.j2` + `assets/examples/paloalto-staged-rule-change.yaml`
- Create: `assets/examples/sonicwall-staged-rule-change.j2` + `assets/examples/sonicwall-staged-rule-change.yaml`
- Modify: `web/src/lib/templates.ts`(本クラスタの12件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `ips-inline-enable`: 侵入防止機能をまず観察(検知のみ)で運用し、誤検知を確認したのちインライン遮断へ段階的に昇格する
  - `emergency-ip-block`: 攻撃検知時に攻撃元IPを即時遮断し、遮断確認と記録・解除基準までを定めた初動対応を行う
  - `compromised-host-quarantine`: 侵害疑いの内部ホストを隔離し、調査用通信のみを許可して封じ込める
  - `staged-rule-change`: ルール変更をログ観察→有効化→事後確認の段階で適用し、切り戻し条件を事前定義して実施する

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md`の§3.4該当表( `ips-inline-enable`, `emergency-ip-block`, `compromised-host-quarantine`, `staged-rule-change` の各行、Fortinet/Palo Alto Networks/SonicWallの3表)を参照。

  `Workflow`で`pipeline()`を用い、12件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成のJinja2テンプレート本文 + サンプルデータ(csv/toml/yaml、上記Filesの拡張子) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-ips-inline-enable paloalto-ips-inline-enable sonicwall-ips-inline-enable fortinet-emergency-ip-block paloalto-emergency-ip-block sonicwall-emergency-ip-block fortinet-compromised-host-quarantine paloalto-compromised-host-quarantine sonicwall-compromised-host-quarantine fortinet-staged-rule-change paloalto-staged-rule-change sonicwall-staged-rule-change
```
Expected: 全12件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し、その直前に本クラスタ12件分のエントリを追記する(既存行の書式に厳密に合わせる。`updated: "2026-07-31"`, `live: true`固定)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、3.1節)。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-ips-inline-enable.j2 assets/examples/fortinet-ips-inline-enable.yaml assets/examples/paloalto-ips-inline-enable.j2 assets/examples/paloalto-ips-inline-enable.yaml assets/examples/sonicwall-ips-inline-enable.j2 assets/examples/sonicwall-ips-inline-enable.yaml assets/examples/fortinet-emergency-ip-block.j2 assets/examples/fortinet-emergency-ip-block.csv assets/examples/paloalto-emergency-ip-block.j2 assets/examples/paloalto-emergency-ip-block.csv assets/examples/sonicwall-emergency-ip-block.j2 assets/examples/sonicwall-emergency-ip-block.csv assets/examples/fortinet-compromised-host-quarantine.j2 assets/examples/fortinet-compromised-host-quarantine.yaml assets/examples/paloalto-compromised-host-quarantine.j2 assets/examples/paloalto-compromised-host-quarantine.yaml assets/examples/sonicwall-compromised-host-quarantine.j2 assets/examples/sonicwall-compromised-host-quarantine.yaml assets/examples/fortinet-staged-rule-change.j2 assets/examples/fortinet-staged-rule-change.yaml assets/examples/paloalto-staged-rule-change.j2 assets/examples/paloalto-staged-rule-change.yaml assets/examples/sonicwall-staged-rule-change.j2 assets/examples/sonicwall-staged-rule-change.yaml web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster 4 (検知/インシデント対応) NGFW vendor-parity templates

Refs #619

Adds 12 templates (4 problem(s) x Fortinet/Palo Alto
Networks/SonicWall) per docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-equipment-vendor-parity-9sqqqu
```
PRを作成する(タイトル例: `feat: add NGFW vendor-parity templates - cluster 4 (検知/インシデント対応)`、本文で#619を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。

### Task 5: クラスタ5「運用」(15件)

**Files:**
- Create: `assets/examples/fortinet-api-automation-basics.j2` + `assets/examples/fortinet-api-automation-basics.yaml`
- Create: `assets/examples/paloalto-api-automation-basics.j2` + `assets/examples/paloalto-api-automation-basics.yaml`
- Create: `assets/examples/sonicwall-api-automation-basics.j2` + `assets/examples/sonicwall-api-automation-basics.yaml`
- Create: `assets/examples/fortinet-config-backup-restore.j2` + `assets/examples/fortinet-config-backup-restore.toml`
- Create: `assets/examples/paloalto-config-backup-restore.j2` + `assets/examples/paloalto-config-backup-restore.toml`
- Create: `assets/examples/sonicwall-config-backup-restore.j2` + `assets/examples/sonicwall-config-backup-restore.toml`
- Create: `assets/examples/fortinet-firmware-update-window.j2` + `assets/examples/fortinet-firmware-update-window.yaml`
- Create: `assets/examples/paloalto-firmware-update-window.j2` + `assets/examples/paloalto-firmware-update-window.yaml`
- Create: `assets/examples/sonicwall-firmware-update-window.j2` + `assets/examples/sonicwall-firmware-update-window.yaml`
- Create: `assets/examples/fortinet-rule-hygiene-audit.j2` + `assets/examples/fortinet-rule-hygiene-audit.csv`
- Create: `assets/examples/paloalto-rule-hygiene-audit.j2` + `assets/examples/paloalto-rule-hygiene-audit.csv`
- Create: `assets/examples/sonicwall-rule-hygiene-audit.j2` + `assets/examples/sonicwall-rule-hygiene-audit.csv`
- Create: `assets/examples/fortinet-log-noise-reduction.j2` + `assets/examples/fortinet-log-noise-reduction.csv`
- Create: `assets/examples/paloalto-log-noise-reduction.j2` + `assets/examples/paloalto-log-noise-reduction.csv`
- Create: `assets/examples/sonicwall-log-noise-reduction.j2` + `assets/examples/sonicwall-log-noise-reduction.csv`
- Modify: `web/src/lib/templates.ts`(本クラスタの15件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `api-automation-basics`: 最小権限のAPI認証情報を発行し、ルール照会・追加・適用を自動化する運用基盤を整備する
  - `config-backup-restore`: 設定バックアップを定期取得し、復元手順と世代管理を含めて定型運用化する
  - `firmware-update-window`: 事前バックアップ・変更告知・更新実施・切り戻し判断までをメンテナンス窓内で行う
  - `rule-hygiene-audit`: 未使用・重複・過剰許可ルールをヒット数やログから洗い出し、廃止候補を段階的に無効化する定期監査を行う
  - `log-noise-reduction`: ブロードキャスト等の定常ノイズをログ抑制し、意味のある遮断ログだけを残す

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md`の§3.4該当表( `api-automation-basics`, `config-backup-restore`, `firmware-update-window`, `rule-hygiene-audit`, `log-noise-reduction` の各行、Fortinet/Palo Alto Networks/SonicWallの3表)を参照。

  `Workflow`で`pipeline()`を用い、15件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成のJinja2テンプレート本文 + サンプルデータ(csv/toml/yaml、上記Filesの拡張子) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-api-automation-basics paloalto-api-automation-basics sonicwall-api-automation-basics fortinet-config-backup-restore paloalto-config-backup-restore sonicwall-config-backup-restore fortinet-firmware-update-window paloalto-firmware-update-window sonicwall-firmware-update-window fortinet-rule-hygiene-audit paloalto-rule-hygiene-audit sonicwall-rule-hygiene-audit fortinet-log-noise-reduction paloalto-log-noise-reduction sonicwall-log-noise-reduction
```
Expected: 全15件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し、その直前に本クラスタ15件分のエントリを追記する(既存行の書式に厳密に合わせる。`updated: "2026-07-31"`, `live: true`固定)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、3.1節)。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-api-automation-basics.j2 assets/examples/fortinet-api-automation-basics.yaml assets/examples/paloalto-api-automation-basics.j2 assets/examples/paloalto-api-automation-basics.yaml assets/examples/sonicwall-api-automation-basics.j2 assets/examples/sonicwall-api-automation-basics.yaml assets/examples/fortinet-config-backup-restore.j2 assets/examples/fortinet-config-backup-restore.toml assets/examples/paloalto-config-backup-restore.j2 assets/examples/paloalto-config-backup-restore.toml assets/examples/sonicwall-config-backup-restore.j2 assets/examples/sonicwall-config-backup-restore.toml assets/examples/fortinet-firmware-update-window.j2 assets/examples/fortinet-firmware-update-window.yaml assets/examples/paloalto-firmware-update-window.j2 assets/examples/paloalto-firmware-update-window.yaml assets/examples/sonicwall-firmware-update-window.j2 assets/examples/sonicwall-firmware-update-window.yaml assets/examples/fortinet-rule-hygiene-audit.j2 assets/examples/fortinet-rule-hygiene-audit.csv assets/examples/paloalto-rule-hygiene-audit.j2 assets/examples/paloalto-rule-hygiene-audit.csv assets/examples/sonicwall-rule-hygiene-audit.j2 assets/examples/sonicwall-rule-hygiene-audit.csv assets/examples/fortinet-log-noise-reduction.j2 assets/examples/fortinet-log-noise-reduction.csv assets/examples/paloalto-log-noise-reduction.j2 assets/examples/paloalto-log-noise-reduction.csv assets/examples/sonicwall-log-noise-reduction.j2 assets/examples/sonicwall-log-noise-reduction.csv web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster 5 (運用) NGFW vendor-parity templates

Refs #619

Adds 15 templates (5 problem(s) x Fortinet/Palo Alto
Networks/SonicWall) per docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-equipment-vendor-parity-9sqqqu
```
PRを作成する(タイトル例: `feat: add NGFW vendor-parity templates - cluster 5 (運用)`、本文で#619を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。

### Task 6: クラスタ6「障害切り分け」(9件)

**Files:**
- Create: `assets/examples/fortinet-blocked-traffic-triage.j2` + `assets/examples/fortinet-blocked-traffic-triage.yaml`
- Create: `assets/examples/paloalto-blocked-traffic-triage.j2` + `assets/examples/paloalto-blocked-traffic-triage.yaml`
- Create: `assets/examples/sonicwall-blocked-traffic-triage.j2` + `assets/examples/sonicwall-blocked-traffic-triage.yaml`
- Create: `assets/examples/fortinet-state-table-exhaustion.j2` + `assets/examples/fortinet-state-table-exhaustion.toml`
- Create: `assets/examples/paloalto-state-table-exhaustion.j2` + `assets/examples/paloalto-state-table-exhaustion.toml`
- Create: `assets/examples/sonicwall-state-table-exhaustion.j2` + `assets/examples/sonicwall-state-table-exhaustion.toml`
- Create: `assets/examples/fortinet-port-forward-triage.j2` + `assets/examples/fortinet-port-forward-triage.toml`
- Create: `assets/examples/paloalto-port-forward-triage.j2` + `assets/examples/paloalto-port-forward-triage.toml`
- Create: `assets/examples/sonicwall-port-forward-triage.j2` + `assets/examples/sonicwall-port-forward-triage.toml`
- Modify: `web/src/lib/templates.ts`(本クラスタの9件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `blocked-traffic-triage`: 通信できない申告に対し、ログ・セッション状態・NATの順で原因ルールを特定する
  - `state-table-exhaustion`: セッション/ステートテーブル使用率急騰時に原因ホストを特定し、上限調整とルール単位の制限で再発を防ぐ
  - `port-forward-triage`: 外部から公開サーバへ届かない事象を、NAT・ルール・戻り経路の順に切り分ける

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md`の§3.4該当表( `blocked-traffic-triage`, `state-table-exhaustion`, `port-forward-triage` の各行、Fortinet/Palo Alto Networks/SonicWallの3表)を参照。

  `Workflow`で`pipeline()`を用い、9件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成のJinja2テンプレート本文 + サンプルデータ(csv/toml/yaml、上記Filesの拡張子) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-blocked-traffic-triage paloalto-blocked-traffic-triage sonicwall-blocked-traffic-triage fortinet-state-table-exhaustion paloalto-state-table-exhaustion sonicwall-state-table-exhaustion fortinet-port-forward-triage paloalto-port-forward-triage sonicwall-port-forward-triage
```
Expected: 全9件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し、その直前に本クラスタ9件分のエントリを追記する(既存行の書式に厳密に合わせる。`updated: "2026-07-31"`, `live: true`固定)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、3.1節)。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-blocked-traffic-triage.j2 assets/examples/fortinet-blocked-traffic-triage.yaml assets/examples/paloalto-blocked-traffic-triage.j2 assets/examples/paloalto-blocked-traffic-triage.yaml assets/examples/sonicwall-blocked-traffic-triage.j2 assets/examples/sonicwall-blocked-traffic-triage.yaml assets/examples/fortinet-state-table-exhaustion.j2 assets/examples/fortinet-state-table-exhaustion.toml assets/examples/paloalto-state-table-exhaustion.j2 assets/examples/paloalto-state-table-exhaustion.toml assets/examples/sonicwall-state-table-exhaustion.j2 assets/examples/sonicwall-state-table-exhaustion.toml assets/examples/fortinet-port-forward-triage.j2 assets/examples/fortinet-port-forward-triage.toml assets/examples/paloalto-port-forward-triage.j2 assets/examples/paloalto-port-forward-triage.toml assets/examples/sonicwall-port-forward-triage.j2 assets/examples/sonicwall-port-forward-triage.toml web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster 6 (障害切り分け) NGFW vendor-parity templates

Refs #619

Adds 9 templates (3 problem(s) x Fortinet/Palo Alto
Networks/SonicWall) per docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-equipment-vendor-parity-9sqqqu
```
PRを作成する(タイトル例: `feat: add NGFW vendor-parity templates - cluster 6 (障害切り分け)`、本文で#619を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。

### Task 7: クラスタ7「DNS/ゲストアクセス」(6件)

**Files:**
- Create: `assets/examples/fortinet-dns-over-tls-forwarding.j2` + `assets/examples/fortinet-dns-over-tls-forwarding.toml`
- Create: `assets/examples/paloalto-dns-over-tls-forwarding.j2` + `assets/examples/paloalto-dns-over-tls-forwarding.toml`
- Create: `assets/examples/sonicwall-dns-over-tls-forwarding.j2` + `assets/examples/sonicwall-dns-over-tls-forwarding.toml`
- Create: `assets/examples/fortinet-captive-portal-guest.j2` + `assets/examples/fortinet-captive-portal-guest.toml`
- Create: `assets/examples/paloalto-captive-portal-guest.j2` + `assets/examples/paloalto-captive-portal-guest.toml`
- Create: `assets/examples/sonicwall-captive-portal-guest.j2` + `assets/examples/sonicwall-captive-portal-guest.toml`
- Modify: `web/src/lib/templates.ts`(本クラスタの6件を配列末尾に追記)

- [ ] **Step 1: Workflowでテンプレート対を生成する**

対象slugと運用課題定義(設計書§3.3):

  - `dns-over-tls-forwarding`: DNS問い合わせをDoT(DNS over TLS)等の暗号化上位転送に切り替え、LANからの平文DNS直抜けを遮断する
  - `captive-portal-guest`: ゲスト用セグメントにキャプティブポータル認証を導入し、社内ネットワークへの到達を遮断した来訪者網を構築する

対象ベンダーと一次情報(設計書§3.4より、本クラスタ該当行):

  設計書`docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md`の§3.4該当表( `dns-over-tls-forwarding`, `captive-portal-guest` の各行、Fortinet/Palo Alto Networks/SonicWallの3表)を参照。

  `Workflow`で`pipeline()`を用い、6件(slug×vendor)を並行生成する。各`agent()`呼び出しのプロンプトは次を満たすこと:
  - 対象id(`<vendor>-<slug>`)、対象slugの運用課題文、設計書§3.4の該当行(ネイティブ機構・判定・一次情報URL)を明示的に渡す。
  - 出力は6セクション構成のJinja2テンプレート本文 + サンプルデータ(csv/toml/yaml、上記Filesの拡張子) + `templates.ts`用`name`/`desc`をJSON schemaで構造化出力させる。
  - 一次情報URLへの再確認(WebFetch)を必須とし、確認できないCLI/GUI細部は記述しないよう指示する(#583のプラウジブル・バット・ロング対策)。
  - 生成後、各エージェント自身に`assets/examples/<id>.j2`と`.{fmt}`を書き込ませる。

- [ ] **Step 2: render-checkで自己検証する**

Run:
```bash
python3 scripts/local_render_check.py fortinet-dns-over-tls-forwarding paloalto-dns-over-tls-forwarding sonicwall-dns-over-tls-forwarding fortinet-captive-portal-guest paloalto-captive-portal-guest sonicwall-captive-portal-guest
```
Expected: 全6件が render OK(no-html-entities / fill-invariance / runtime-security 違反なし)。失敗した項目は該当エージェントにテンプレートを修正させ、本コマンドを再実行する。

- [ ] **Step 3: `templates.ts`へメタデータを追記する**

`grep -n "^\];" web/src/lib/templates.ts`で配列の閉じ括弧行を確認し、その直前に本クラスタ6件分のエントリを追記する(既存行の書式に厳密に合わせる。`updated: "2026-07-31"`, `live: true`固定)。

- [ ] **Step 4: 検証スイートを実行する**

Run:
```bash
uv run pytest -k 'not e2e'
uv run ruff check .
uv run mypy .
cd web && npx tsc -b && npx vitest run && cd ..
```
Expected: 全コマンドが正常終了(exit 0)。`tests/unit/test_template_taxonomy.py`と`tests/unit/test_example_templates_render.py`が新規idを自動検出して合格することを確認する(taxonomy側のサブカテゴリ追加は不要、3.1節)。

- [ ] **Step 5: コミットする**

```bash
git add assets/examples/fortinet-dns-over-tls-forwarding.j2 assets/examples/fortinet-dns-over-tls-forwarding.toml assets/examples/paloalto-dns-over-tls-forwarding.j2 assets/examples/paloalto-dns-over-tls-forwarding.toml assets/examples/sonicwall-dns-over-tls-forwarding.j2 assets/examples/sonicwall-dns-over-tls-forwarding.toml assets/examples/fortinet-captive-portal-guest.j2 assets/examples/fortinet-captive-portal-guest.toml assets/examples/paloalto-captive-portal-guest.j2 assets/examples/paloalto-captive-portal-guest.toml assets/examples/sonicwall-captive-portal-guest.j2 assets/examples/sonicwall-captive-portal-guest.toml web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat: add cluster 7 (DNS/ゲストアクセス) NGFW vendor-parity templates

Refs #619

Adds 6 templates (2 problem(s) x Fortinet/Palo Alto
Networks/SonicWall) per docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-templates-design.md.
EOF
)"
```

- [ ] **Step 6: push・PR作成・監視登録する**

```bash
git push -u origin claude/network-equipment-vendor-parity-9sqqqu
```
PRを作成する(タイトル例: `feat: add NGFW vendor-parity templates - cluster 7 (DNS/ゲストアクセス)`、本文で#619を参照)。作成後、`subscribe_pr_activity`でこのPRを監視登録する。

### Task 8: 全体整合性の最終確認

**Files:** なし(横断チェックのみ)

- [ ] **Step 1: 75件全体の重複・欠落チェック**

```bash
python3 -c "
import re
content = open('web/src/lib/templates.ts').read()
ids = re.findall(r'id: \"([a-z0-9-]+)\"', content)
assert len(ids) == len(set(ids)), 'duplicate id found'
vendors = ['fortinet', 'paloalto', 'sonicwall']
slugs = ['default-deny-wan','lan-segment-isolation','address-object-rules','dmz-port-forward','outbound-nat-policy','geoip-country-block','schedule-based-access','mgmt-plane-lockdown','remote-access-vpn','ha-active-passive-setup','captive-portal-guest','ips-inline-enable','dns-over-tls-forwarding','api-automation-basics','config-backup-restore','firmware-update-window','rule-hygiene-audit','emergency-ip-block','compromised-host-quarantine','staged-rule-change','blocked-traffic-triage','state-table-exhaustion','ha-failover-drill','port-forward-triage','log-noise-reduction']
expected = {f'{v}-{s}' for v in vendors for s in slugs}
missing = expected - set(ids)
assert not missing, f'missing ids: {missing}'
print('OK: 75/75 ids present, no duplicates')
"
```
Expected: `OK: 75/75 ids present, no duplicates`

- [ ] **Step 2: 全PRのCI/レビュー状態を確認し、マージ可能状態まで追従する**

7クラスタ全PRについて、CIが green かつレビューコメントが解消済みであることを確認する。マージ自体はユーザーの承認を待つ(このタスクではマージしない)。
