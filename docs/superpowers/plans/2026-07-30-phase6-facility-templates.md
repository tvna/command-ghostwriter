# フェーズ6: 物理設備工事系シナリオ10本 追加（新カテゴリ facility）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-design.md` のフェーズ6対象10シナリオ（rack-power-budget, rack-mount-layout, dual-power-redundancy, structured-cabling-plan, lan-cable-category, ups-capacity-plan, cable-labeling-standard, server-racking-procedure, rack-airflow-design, env-monitoring-setup）を、新カテゴリ `facility`（物理設備）として `assets/examples/` に追加し、`web/src/lib/types.ts` / `web/src/components/Library.tsx` / `web/src/lib/templates.ts` に登録する。

**Architecture:** まず `types.ts` に `"facility"` カテゴリを追加し、`Library.tsx` にカテゴリタブ（アイコンは既存の `server` を流用）を追加する（Task 1、他タスクの前提）。続いて各シナリオを `assets/examples/<id>.<format>`（データファイル）+ `assets/examples/<id>.j2`（テンプレート）のペアとして独立に追加し、`web/src/lib/templates.ts` の `META` 配列に1エントリずつ追加する（Task 2〜11）。全シナリオは実機がなくても「表の四則演算＋合否判定」または「ipmitool/lldpctl/ethtool等の模擬出力の読解」で完結する設計とし、感電・機器落下等の実害を伴う手順は含めない。各テンプレート追加後、Pythonの本物のレンダリングエンジン（`features.config_parser.ConfigParser` + `features.document_render.DocumentRender`）で strict-undefined レンダリングを実行し、Jinja構文エラーが出ないこと・想定した計算結果や判定文言が出力に含まれることを確認してからコミットする。最後にTask 12で全体検証とPR作成を行う。

**Tech Stack:** Jinja2 テンプレート（`.j2`、`namespace()` による累積計算を使用）、CSV/YAML データファイル、Python 3（`features/config_parser.py` / `features/document_render.py`）、TypeScript（`web/src/lib/types.ts` / `web/src/components/Library.tsx` / `web/src/lib/templates.ts`）、uv、Vitest/tsc

**Issue:** #549（親issue #541、フェーズ1は #542、フェーズ2〜5は #545〜#548でいずれもクローズ済み）

参照:
- `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-design.md`（フェーズ6節、Web UI登録変更節）
- `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-scenario-details.md`（フェーズ6: 物理設備工事系節、各シナリオの学習目標・用語解説候補・動作確認・注意事項の確定済みソース）
- `docs/superpowers/plans/2026-07-13-phase4-security-backup-scenarios.md`（新規シナリオ追加タスクの粒度・検証手順の実例）

---

## 共通の検証手順（各タスクで使用）

各タスクの「レンダリング確認」ステップでは、以下の Python スクリプトパターンを使う。`<id>` / `<ext>` と `assert` 対象の文字列をタスクごとに置き換える。

```python
import sys
from io import BytesIO

sys.path.insert(0, ".")
from features.config_parser import ConfigParser
from features.document_render import DocumentRender

TEMPLATE_ID = "<id>"
DATA_EXT = "<ext>"

with open(f"assets/examples/{TEMPLATE_ID}.{DATA_EXT}", "rb") as f:
    config_file = BytesIO(f.read())
config_file.name = f"{TEMPLATE_ID}.{DATA_EXT}"
parser = ConfigParser(config_file=config_file)
assert parser.parse() is True, parser.error_message
parsed = parser.parsed_dict
assert parsed is not None

with open(f"assets/examples/{TEMPLATE_ID}.j2", "rb") as f:
    template_file = BytesIO(f.read())
template_file.name = f"{TEMPLATE_ID}.j2"
render = DocumentRender(template_file)
assert render.is_valid_template is True, render.error_message

FORMAT_TYPE_KEEP = 0
ok = render.apply_context(parsed, FORMAT_TYPE_KEEP, True)
assert ok is True, render.error_message

content = render.render_content
assert "## 目的" in content
assert "## 用語解説" in content
assert "## 動作確認" in content
assert "## 注意事項" in content
print("OK:", TEMPLATE_ID)
print(content)
```

`AssertionError` が出た場合はテンプレートの構文・変数参照を見直す。用語解説に列挙した語は本文中に必ず登場させ（グラウンディング）、逆に本文で使う専門用語は用語解説に含める（双方向チェック）。これはフェーズ1〜5で確立した既知バグクラス（用語解説と本文の不一致、存在しないJinja変数）を防ぐための確認である。CSV/YAMLの数値列は文字列として渡されるため、テンプレート内の算術には必ず `| int` フィルタを適用する。

---

### Task 1: `facility` カテゴリの新設（types.ts / Library.tsx）

**Files:**
- Modify: `web/src/lib/types.ts:4`
- Modify: `web/src/components/Library.tsx:12-18`

- [ ] **Step 1: `TemplateCategory` に `"facility"` を追加する**

`web/src/lib/types.ts:4` の現状:
```typescript
export type TemplateCategory = "network" | "server" | "dns" | "ai" | "ops";
```
を、次のように変更する:
```typescript
export type TemplateCategory = "network" | "server" | "dns" | "ai" | "ops" | "facility";
```

- [ ] **Step 2: `Library.tsx` の `CATS` に facility カテゴリを追加する**

`web/src/components/Library.tsx:12-18` の現状:
```typescript
const CATS: { id: TemplateCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all',     label: 'すべて',          icon: 'topology' },
  { id: 'network', label: 'ネットワーク機器', icon: 'router' },
  { id: 'server',  label: 'サーバ / Linux',  icon: 'server' },
  { id: 'dns',     label: 'DNS',            icon: 'ethernet-port' },
  { id: 'ai',      label: 'AIインフラ',       icon: 'terminal' },
  { id: 'ops',     label: '運用共通',         icon: 'config-file' },
];
```
を、次のように変更する（末尾に facility を追加、新規SVGは作らず既存の `server` アイコンを流用）:
```typescript
const CATS: { id: TemplateCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all',      label: 'すべて',          icon: 'topology' },
  { id: 'network',  label: 'ネットワーク機器', icon: 'router' },
  { id: 'server',   label: 'サーバ / Linux',  icon: 'server' },
  { id: 'dns',      label: 'DNS',            icon: 'ethernet-port' },
  { id: 'ai',       label: 'AIインフラ',       icon: 'terminal' },
  { id: 'ops',      label: '運用共通',         icon: 'config-file' },
  { id: 'facility', label: '物理設備',        icon: 'server' },
];
```

- [ ] **Step 3: 型チェックを実行する**

Run: `cd web && npx tsc --noEmit`
Expected: エラー0件（この時点では `templates.ts` に facility カテゴリのエントリがまだ無いため、`facility` は型としてのみ存在する）。

- [ ] **Step 4: コミット**

```bash
git add web/src/lib/types.ts web/src/components/Library.tsx
git commit -m "$(cat <<'EOF'
feat(web): add facility category to TemplateCategory and Library UI (#549)

Refs #541
EOF
)"
```

---

### Task 2: rack-power-budget（ラック電源容量設計）

**Files:**
- Create: `assets/examples/rack-power-budget.csv`
- Create: `assets/examples/rack-power-budget.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```csv
device_name,circuit,rated_w,actual_w
Server-DB,A系,600,520
Server-App,A系,600,510
Switch-Core,A系,200,150
Server-Web1,B系,500,430
Server-Web2,B系,500,430
Storage,B系,700,600
NAS,B系,300,260
UPS-mgmt,B系,100,80
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# ラック電源容量設計（ブレーカーマージン計算）

CSVの機器一覧から電源系統ごとの消費電力を積算し、ブレーカー定格に対する80%ルールでマージンを検算します。実際のブレーカー操作は行わず、計算による設計検証に限定します。

## 目的

ラック内機器の消費電力を電源系統ごとに積算し、ブレーカー定格に対する80%ルール（連続負荷の許容値）でマージンを検算できるようになることを目指します。あわせて、定格電力（カタログ値）と実効消費電力（実測相当値）の違いを理解します。

## 用語解説

- **定格電力/実効消費電力**: 定格電力は機器カタログ上の最大値、実効消費電力は実運用時の消費電力に近い値
- **ブレーカー(配線用遮断器)**: 回路に流れる電流が定格を超えると自動的に遮断する保護機器
- **80%ルール(連続負荷)**: 3時間以上継続する連続負荷はブレーカー定格の80%以下に収める必要があるという設計原則
- **突入電流**: 機器起動時に瞬間的に流れる、定常時より大きい電流
- **PDU**: ラック内の複数機器へ電力を分配するユニット
- **回路(系統)**: 同じブレーカー配下でまとめられる電源の単位
- **力率**: 皮相電力(VA)に対する有効電力(W)の比率

## 1. 機器一覧と電源系統を確認する

このラックはブレーカー定格 **100V 20A（2000W）** の系統を2系統（A系・B系）持ちます。

| device_name | circuit | rated_w | actual_w |
|---|---|---|---|
{% for r in csv_rows %}| {{ r["device_name"] }} | {{ r["circuit"] }} | {{ r["rated_w"] }} | {{ r["actual_w"] }} |
{% endfor %}

## 2. 系統ごとの実効消費電力を積算する

```bash
echo "系統別の実効消費電力(W)を積算します"
```

{% set ns = namespace(a_actual=0, b_actual=0, a_rated=0, b_rated=0) %}
{% for r in csv_rows %}{% if r["circuit"] == "A系" %}{% set ns.a_actual = ns.a_actual + (r["actual_w"] | int) %}{% set ns.a_rated = ns.a_rated + (r["rated_w"] | int) %}{% else %}{% set ns.b_actual = ns.b_actual + (r["actual_w"] | int) %}{% set ns.b_rated = ns.b_rated + (r["rated_w"] | int) %}{% endif %}{% endfor %}
- A系: 定格合計 {{ ns.a_rated }}W / 実効合計 {{ ns.a_actual }}W（ブレーカー2000Wに対する使用率: {{ (ns.a_actual * 100 / 2000) | round(1) }}%）
- B系: 定格合計 {{ ns.b_rated }}W / 実効合計 {{ ns.b_actual }}W（ブレーカー2000Wに対する使用率: {{ (ns.b_actual * 100 / 2000) | round(1) }}%）

## 3. 80%ルールで合否判定する

80%ルールの閾値は 2000W × 0.8 = **1600W** です。

{% if ns.a_actual > 1600 %}- A系: {{ ns.a_actual }}W > 1600W のため **NG**{% else %}- A系: {{ ns.a_actual }}W ≤ 1600W のため OK{% endif %}
{% if ns.b_actual > 1600 %}- B系: {{ ns.b_actual }}W > 1600W のため **NG**{% else %}- B系: {{ ns.b_actual }}W ≤ 1600W のため OK{% endif %}

## 4. NG系統の是正案を検討する

B系がNGの場合、実効消費電力が最も小さい機器をA系へ振り替えることでマージンを確保できないか検討します。

```bash
echo "是正案: NAS (実効260W) をB系からA系へ振り替え"
echo "振り替え後のA系実効: $(( {{ ns.a_actual }} + 260 ))W"
echo "振り替え後のB系実効: $(( {{ ns.b_actual }} - 260 ))W"
```

## 5. (実機があれば)実測値を確認する

```bash
ipmitool dcmi power reading
```

実測値(Instantaneous power reading)が定格を超えていないか、Step 2 の積算値と大きく乖離していないかを確認します。

## 動作確認

- 全系統の使用率が80%（1600W）以下であること
- NG系統がある場合、振り替え後の両系統が80%以下に収まっていること
- 実測値が定格値以下であることの確認記録がある

## 注意事項

- 実際のブレーカー操作（遮断・投入）は行わず、計算による設計検証に限定してください。
- 実機での電力測定を行う場合は、必ず電気工事士等の有資格者の監督下で実施してください。
- 突入電流は瞬間的なものであり、80%ルールの連続負荷判定には含めません。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

`web/src/lib/templates.ts` の `META` 配列の末尾（最後の要素の直後）に、以下を追加する:
```typescript
  { id: "rack-power-budget", name: "ラック電源容量設計（ブレーカーマージン計算）", desc: "電源系統ごとの消費電力を積算し、ブレーカー定格に対する80%ルールでマージンを検算する手順書を生成。", category: "facility", subCategory: "電源設計", format: "csv", output: "markdown", updated: "2026-07-30", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "rack-power-budget"`, `DATA_EXT = "csv"` で実行する。加えて:
```python
assert "1600W" in content
assert "NG" in content
```
Expected: 全 assert が通り `OK: rack-power-budget` が出力される。B系が1800W(90%)でNG、A系が1180W(59%)でOKと判定されること。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/rack-power-budget.csv assets/examples/rack-power-budget.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add rack-power-budget facility scenario (#549)

Refs #541
EOF
)"
```

---

### Task 3: rack-mount-layout（ラックマウント搭載位置設計）

**Files:**
- Create: `assets/examples/rack-mount-layout.csv`
- Create: `assets/examples/rack-mount-layout.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```csv
device_name,u_size,weight_kg,airflow,desired_u
UPS,3,45,front-to-back,U1
Storage-Array,4,38,front-to-back,U4
Server-DB,2,22,front-to-back,U8
Server-App1,1,12,front-to-back,U10
Server-App2,1,12,front-to-back,U11
Core-Switch,1,8,back-to-front,U12
Access-Switch,1,6,front-to-back,U13
Patch-Panel,1,3,na,U14
```

`desired_u` は各機器の開始U番号です（例: `Storage-Array` は U4〜U7 の4Uを占有）。8機器の合計U数は14Uのため、U1〜U14が連続して埋まり、U15〜U42（28U）が空きUとなります。

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# ラックマウント搭載位置設計

CSVの機器一覧から、荷重・エアフロー・保守性を考慮した42Uラックの搭載位置を設計し、U番号表として文書化します。本ラックはU1を最下段とします。

## 目的

荷重・エアフロー・保守性を考慮してラックの搭載位置を設計し、U番号表として文書化できるようになることを目指します。

## 用語解説

- **U(ユニット)**: ラックの高さの単位。1U = 44.45mm
- **42Uラック**: 42段分の搭載スペースを持つ標準的なラック筐体
- **耐荷重**: ラックが安全に支えられる総重量の上限
- **重心**: 搭載機器全体の重量バランスの中心。低いほど転倒・沈み込みのリスクが小さい
- **前面吸気・背面排気**: 多くのラック機器が採用する標準的な空気の流れの向き
- **ブランクパネル**: 空きUを塞ぎ、排気が前面へ回り込む「再循環」を防ぐ板
- **マウントレール**: 機器をラックに固定するためのレール
- **保守スペース**: ケーブル抜き差し・引き出し作業に必要な余裕空間

## 1. 機器一覧を確認する（重量が重い順に記載済み）

このラックは42U、耐荷重600kgです。

| device_name | u_size | weight_kg | airflow | desired_u |
|---|---|---|---|---|
{% for r in csv_rows %}| {{ r["device_name"] }} | {{ r["u_size"] }}U | {{ r["weight_kg"] }}kg | {{ r["airflow"] }} | {{ r["desired_u"] }} |
{% endfor %}

## 2. 総重量を耐荷重と照合する

{% set ns = namespace(total=0) %}{% for r in csv_rows %}{% set ns.total = ns.total + (r["weight_kg"] | int) %}{% endfor %}
- 総重量: {{ ns.total }}kg / 耐荷重: 600kg（使用率 {{ (ns.total * 100 / 600) | round(1) }}%）

## 3. 重量物が下段（低いU番号）に集中しているか確認する

```bash
echo "重量上位3機器の搭載希望位置(desired_u)を確認します"
```

{% for r in csv_rows %}{% if loop.index <= 3 %}- {{ r["device_name"] }}（{{ r["weight_kg"] }}kg）: {{ r["desired_u"] }}
{% endif %}{% endfor %}

## 4. 吸排気方向が揃っているか確認する

```bash
echo "airflowがback-to-frontの機器（逆向き）を洗い出します"
```

{% for r in csv_rows %}{% if r["airflow"] == "back-to-front" %}- **{{ r["device_name"] }}**（{{ r["desired_u"] }}）: 逆向き。前面へ排熱するため、周辺機器の吸気温度に影響しないか要確認
{% endif %}{% endfor %}

## 5. 空きUへのブランクパネル設置位置を指定する

{% set ns2 = namespace(used=0) %}{% for r in csv_rows %}{% set ns2.used = ns2.used + (r["u_size"] | int) %}{% endfor %}
搭載機器のU数合計は {{ ns2.used }}U のため、残り {{ 42 - ns2.used }}U（U{{ ns2.used + 1 }}〜U42）にブランクパネルを設置します。

## 6. (実機があれば)機器の実体情報と台帳を照合する

```bash
dmidecode -t chassis
ipmitool fru print
```

## 動作確認

- 重量上位3機器が下段（低いU番号）に集中していること
- 総重量が耐荷重（600kg）以下であること
- 逆向き機器が特定され、対応方針が記載されていること
- 全空きUにブランクパネル設置位置が指定されていること

## 注意事項

- 実機の搭載作業を伴う場合、重量物の取り扱いには2人作業やリフター使用等の安全手順に従ってください。
- 逆向き機器は排熱がコールドアイル側に向かうため、他機器の吸気温度に影響しないか設置後に必ず確認してください。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

```typescript
  { id: "rack-mount-layout", name: "ラックマウント搭載位置設計", desc: "荷重・エアフロー・保守性を考慮して42Uラックの搭載位置を設計し、U番号表として文書化する手順書を生成。", category: "facility", subCategory: "ラック設計", format: "csv", output: "markdown", updated: "2026-07-30", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "rack-mount-layout"`, `DATA_EXT = "csv"` で実行する。加えて:
```python
assert "Core-Switch" in content
assert "耐荷重" in content
```
Expected: 全 assert が通り `OK: rack-mount-layout` が出力される。総重量146kg、使用率24.3%と算出され、Core-Switchが逆向きとして検出されること。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/rack-mount-layout.csv assets/examples/rack-mount-layout.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add rack-mount-layout facility scenario (#549)

Refs #541
EOF
)"
```

---

### Task 4: dual-power-redundancy（二重電源冗長化チェック）

> **Post-plan correction:** `features/config_parser.py` の `_infer_scalar` は、CSVセルが往復チェックを通る純粋な数値文字列(例: `"2"`)であれば `int`/`float` に自動推論する（`"007"`のような非往復ケースのみ文字列のまま）。このため、以下のテンプレート案の `r["psu_count"] == "2"` / `== "1"`（文字列比較）は実装時に **常に false** となり、Step2・Step3が空になる不具合があった（実装エージェントが検出・修正済み）。実装の正としては、`(r["psu_count"] | int) == 2` / `== 1`（`rack-mount-layout.j2`の`| int`と同じ慣例）を参照すること。CSVの他のテキスト系フィールド（`circuit`, `airflow`, `psu1_pdu`等）は非数値文字列のため往復チェックで文字列のまま保持され、この問題の対象外。

**Files:**
- Create: `assets/examples/dual-power-redundancy.csv`
- Create: `assets/examples/dual-power-redundancy.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```csv
device_name,psu_count,psu1_pdu,psu2_pdu
Server-DB,2,PDU-A1,PDU-B1
Server-App,2,PDU-A1,PDU-A2
Storage-Array,2,PDU-A2,PDU-B2
Core-Switch,2,PDU-B1,PDU-B2
Access-Switch,1,PDU-A1,none
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# 二重電源冗長化チェック（PDU系統分散）

CSVの接続表から、各機器のPSU(電源ユニット)がPDU A系・B系へ適切に分散接続されているかを確認し、単一障害点(SPOF)を検出します。

## 目的

冗長電源機器の各PSUを別系統PDUへ分散接続する原則を理解し、接続表から単一障害点を検出できるようになることを目指します。

## 用語解説

- **PSU(電源ユニット)**: 機器に電力を供給するユニット。冗長機器は2基以上搭載する
- **冗長電源(1+1)**: PSUが1基故障しても稼働継続できる構成
- **PDU A系・B系**: 異なる商用電源系統に接続された、別々のPDU(電源分配ユニット)
- **単一障害点(SPOF)**: そこが1つ故障するとシステム全体が止まる箇所
- **片系運転**: PDU片方が停止した状態で運転を継続すること
- **フェイルオーバー**: 障害発生時に予備系へ自動的に切り替わること
- **活性挿抜**: 電源を止めずに機器の抜き差しを行うこと

## 1. 接続表を確認する

| device_name | psu_count | psu1_pdu | psu2_pdu |
|---|---|---|---|
{% for r in csv_rows %}| {{ r["device_name"] }} | {{ r["psu_count"] }} | {{ r["psu1_pdu"] }} | {{ r["psu2_pdu"] }} |
{% endfor %}

## 2. 同一PDU系統に両PSUが接続されている機器を洗い出す

PDU名の5文字目（例: `PDU-A1` の `A`）が系統を表します。両PSUが同じ系統に接続されている冗長機器はSPOFです。

```bash
echo "冗長機器(psu_count=2)のPDU系統を突合します"
```

{% for r in csv_rows %}{% if r["psu_count"] == "2" %}{% if r["psu1_pdu"][4] == r["psu2_pdu"][4] %}- **{{ r["device_name"] }}**: {{ r["psu1_pdu"] }} / {{ r["psu2_pdu"] }} → 同一系統（{{ r["psu1_pdu"][4] }}系）に接続 **NG（SPOF）**
{% else %}- {{ r["device_name"] }}: {{ r["psu1_pdu"] }} / {{ r["psu2_pdu"] }} → 異系統に分散 OK
{% endif %}{% endif %}{% endfor %}

## 3. 単一PSU機器を確認する

```bash
echo "psu_count=1の機器は冗長構成の対象外です"
```

{% for r in csv_rows %}{% if r["psu_count"] == "1" %}- {{ r["device_name"] }}: PSU 1基のみ（{{ r["psu1_pdu"] }}）。冗長化の対象外だが、単一障害点であることに留意する
{% endif %}{% endfor %}

## 4. NG機器の是正接続案を記入する

NGと判定された機器は、片方のPSUをもう一方の系統のPDUへ接続し直します（例: `Server-App` の2本目を `PDU-A2` から `PDU-B2` へ変更、`Core-Switch` の1本目を `PDU-B1` から `PDU-A1` へ変更）。

## 5. (実機があれば)PSUステータスを確認する

```bash
ipmitool sensor | grep -i PS
ipmitool sel list
```

各PSUセンサーが Presence/OK であること、電源系イベントログに異常がないことを確認します。

## 動作確認

- 全冗長機器(psu_count=2)が異系統PDUに分散接続されていること
- NGと判定された機器（Server-App, Core-Switch）に是正接続案が記入されていること
- PSUセンサーが全数OKであること

## 注意事項

- 実機のPDU配線を変更する場合、活性挿抜による瞬断リスクがあるため、必ず片系ずつ作業し、稼働中サービスへの影響を確認してから行ってください。
- 単一PSU機器（psu_count=1）はそもそも冗長化できないため、業務影響度に応じて二重電源化を検討してください。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

```typescript
  { id: "dual-power-redundancy", name: "二重電源冗長化チェック（PDU系統分散）", desc: "冗長機器の各PSUがPDU A系・B系へ分散接続されているかを接続表から確認し、単一障害点を検出する手順書を生成。", category: "facility", subCategory: "電源設計", format: "csv", output: "markdown", updated: "2026-07-30", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "dual-power-redundancy"`, `DATA_EXT = "csv"` で実行する。加えて:
```python
assert "SPOF" in content
assert "Server-App" in content
```
Expected: 全 assert が通り `OK: dual-power-redundancy` が出力される。Server-AppとCore-SwitchがNG(SPOF)、Server-DBとStorage-ArrayがOKと判定されること。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/dual-power-redundancy.csv assets/examples/dual-power-redundancy.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add dual-power-redundancy facility scenario (#549)

Refs #541
EOF
)"
```

---

### Task 5: structured-cabling-plan（構造化配線・配線表作成）

**Files:**
- Create: `assets/examples/structured-cabling-plan.csv`
- Create: `assets/examples/structured-cabling-plan.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```csv
cable_id,from_port,to_port,cable_type,length_m
CBL-001,RackA-U10-P1,RackA-U40-P1,Cat6A,3
CBL-002,RackA-U15-P1,RackA-U40-P2,Cat6A,3
CBL-003,RackB-U05-P1,RackA-U40-P3,fiber-MM,15
CBL-004,RackA-U20-P1,RackA-U40-P4,Cat6,20
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# 構造化配線・配線表作成

CSVの配線表(ケーブルスケジュール)をもとに敷設し、LLDPで実際の物理接続を照合する構造化配線の手順です。

## 目的

配線表(ケーブルスケジュール)を正として施工・検証する構造化配線の考え方を理解し、LLDPで物理接続を照合できるようになることを目指します。

## 用語解説

- **構造化配線**: 配線経路・命名規約を体系化し、変更に強くする配線設計手法
- **パッチパネル**: 配線の端点をまとめ、機器側と柔軟に接続し直せるようにする盤
- **配線表(ケーブルスケジュール)**: どのポートとどのポートを接続するかを一覧化した台帳
- **水平配線・幹線配線**: フロア内の配線と、フロア間・室間を結ぶ配線
- **LLDP**: 隣接機器同士が自機の情報(機器名・ポート名)を交換するプロトコル
- **ポート番号規約**: `RackA-U40-P1` のようにラック・U番号・ポート番号を機械的に表す命名規則
- **余長処理**: ケーブルの余った長さを整理し、たるみや断線を防ぐ処置

## 1. 配線表を確認する

これらの配線は、パッチパネルを介して機器とラック間を接続する水平配線（フロア内配線）に該当します。

| cable_id | from_port | to_port | cable_type | length_m |
|---|---|---|---|---|
{% for r in csv_rows %}| {{ r["cable_id"] }} | {{ r["from_port"] }} | {{ r["to_port"] }} | {{ r["cable_type"] }} | {{ r["length_m"] }} |
{% endfor %}

## 2. 配線経路をトレースし、敷設チェックリストを消化する

```bash
echo "以下のケーブルを配線表どおりに敷設します"
```

{% for r in csv_rows %}- [ ] {{ r["cable_id"] }}: {{ r["from_port"] }} → {{ r["to_port"] }}（{{ r["cable_type"] }}, {{ r["length_m"] }}m） 両端接続・余長処理・結束を確認
{% endfor %}

## 3. LLDPで対向機器のポート情報を取得する

```bash
lldpctl
```

模擬出力（`RackA-U40` 側スイッチでの取得例）:

```text
-------------------------------------------------------------------------------
LLDP neighbors:
-------------------------------------------------------------------------------
Interface:    Gi1/0/1, via: LLDP, RID: 1, Time: 0 day, 00:05:12
  Chassis:
    SysName:      RackA-U10-Server-DB
  Port:
    PortDescr:    RackA-U40-P1
-------------------------------------------------------------------------------
Interface:    Gi1/0/2, via: LLDP, RID: 2, Time: 0 day, 00:05:12
  Chassis:
    SysName:      RackA-U15-Server-App1
  Port:
    PortDescr:    RackA-U40-P5
-------------------------------------------------------------------------------
```

## 4. 配線表とLLDPの結果を1行ずつ照合する

CBL-002は配線表上 `{{ csv_rows[1]["to_port"] }}` ですが、LLDPの模擬出力では対向ポートが `RackA-U40-P5` と表示されており、**不一致**です（配線表の誤記、または実際の敷設ミスの可能性）。

```bash
echo "不一致: CBL-002 配線表={{ csv_rows[1]["to_port"] }} / LLDP実測=RackA-U40-P5"
```

他の3本（CBL-001, CBL-003, CBL-004）はLLDPの模擬出力に対向情報が含まれないため、リンクアップ状態の目視・`ip link`での確認に代替します。

## 5. リンクアップとリンク速度を確認する

```bash
ip link show
ethtool eth0
```

## 動作確認

- 敷設チェックリスト（両端接続・余長・結束）が全行完了していること
- LLDP近隣情報と配線表の不一致（CBL-002）が記録され、是正または配線表修正が行われていること
- 全ポートがリンクアップしていること

## 注意事項

- 実機での配線変更は、現在稼働中のリンクを誤って抜かないよう、配線表とラベルを必ず事前に照合してから作業してください。
- LLDPは対向機器がLLDP対応・有効化されている場合のみ有効です。非対応機器の区間は目視・リンク状態で代替確認してください。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

```typescript
  { id: "structured-cabling-plan", name: "構造化配線・配線表作成", desc: "配線表(ケーブルスケジュール)を正として敷設し、LLDPで実際の物理接続を照合する手順書を生成。", category: "facility", subCategory: "ケーブリング", format: "csv", output: "markdown", updated: "2026-07-30", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "structured-cabling-plan"`, `DATA_EXT = "csv"` で実行する。加えて:
```python
assert "不一致" in content
assert "CBL-002" in content
```
Expected: 全 assert が通り `OK: structured-cabling-plan` が出力される。CBL-002の不一致が本文中に明記されること。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/structured-cabling-plan.csv assets/examples/structured-cabling-plan.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add structured-cabling-plan facility scenario (#549)

Refs #541
EOF
)"
```

---

### Task 6: lan-cable-category（LANケーブルカテゴリ選定と敷設確認）

**Files:**
- Create: `assets/examples/lan-cable-category.csv`
- Create: `assets/examples/lan-cable-category.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```csv
segment_name,distance_m,required_speed,poe_required,selected_category
ServerRoom-Core-to-DB,3,10GbE,no,Cat6A
ServerRoom-Core-to-Storage,60,10GbE,no,Cat6
Office-Core-to-AP1,55,1GbE,yes,Cat6
Warehouse-Core-to-Camera,120,1GbE,yes,fiber-MM
MeetingRoom-Core-to-AP2,90,1GbE,yes,Cat5e
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# LANケーブルカテゴリ選定と敷設確認

CSVの区間要件から、距離・速度・PoE要件に基づき妥当なLANケーブルカテゴリを選定し、選定結果をリンク速度で検証します。

## 目的

距離・速度・PoE要件からCat5e/6/6A/光を根拠を持って選定でき、選定結果をリンク速度で検証できるようになることを目指します。

## 用語解説

- **カテゴリ(Cat5e/6/6A)**: より対線(UTP/STP)の伝送性能等級
- **10GBASE-T**: Cat6で最大55m、Cat6Aで最大100mまで10Gbpsを伝送できる規格
- **1000BASE-T**: Cat5e/6/6Aいずれでも最大100mまで1Gbpsを伝送できる規格
- **リンク速度とネゴシエーション**: 接続時に双方の機器が自動的に通信速度を取り決める仕組み
- **PoE(給電)**: LANケーブル経由で電力を供給する仕組み。高出力なPoE+/PoE++は発熱対策として上位カテゴリが推奨される
- **伝送距離100m規則**: 銅線LANケーブルの多くの規格に共通する上限距離
- **光ファイバ(SM/MM)**: 距離制限を超える区間で使うシングルモード/マルチモードの光ケーブル

## 1. 区間一覧と選定結果を確認する

| segment_name | distance_m | required_speed | poe_required | selected_category |
|---|---|---|---|---|
{% for r in csv_rows %}| {{ r["segment_name"] }} | {{ r["distance_m"] }} | {{ r["required_speed"] }} | {{ r["poe_required"] }} | {{ r["selected_category"] }} |
{% endfor %}

## 2. 選定フローチャートに沿って各区間を判定する

判定基準:
- 距離が100mを超える → 光ファイバが必須
- 10GbEかつ55m超 → Cat6A以上が必須（Cat6は10GBASE-Tで55mまで）
- 10GbEかつ55m以下 → Cat6以上で可
- 1GbEかつ100m以下 → Cat5e/6/6Aいずれでも可（PoE+/PoE++が必要な場合はCat6以上を推奨。必須ではなくガイドライン）

```bash
echo "各区間をフローチャートで判定します"
```

{% for r in csv_rows %}
### {{ r["segment_name"] }}

距離{{ r["distance_m"] }}m、要求速度{{ r["required_speed"] }}、選定カテゴリ{{ r["selected_category"] }}
{% if (r["distance_m"] | int) > 100 %}判定: 100m超のため光ファイバ必須 → {% if "fiber" in r["selected_category"] %}選定は妥当（マルチモード(MM)光ファイバ。100m超でもSM/MMいずれかの光ファイバであれば距離制限を回避できる）{% else %}選定は**不適合（光ファイバへ変更が必要）**{% endif %}
{% elif r["required_speed"] == "10GbE" and (r["distance_m"] | int) > 55 and r["selected_category"] == "Cat6" %}判定: 10GbEかつ55m超のためCat6A以上が必要 → 選定Cat6は**不適合（要是正）**
{% elif r["required_speed"] == "1GbE" and r["poe_required"] == "yes" and r["selected_category"] == "Cat5e" and (r["distance_m"] | int) >= 90 %}判定: 距離・速度要件は満たすが、長距離・PoE併用のためCat6以上を推奨（**要検討**、必須ではない）
{% else %}判定: 選定は要件を満たす（適合）
{% endif %}
{% endfor %}

## 3. ethtoolでリンク速度を確認する

```bash
ethtool eth0
```

`Speed:` が要求速度と一致し、`100Mb/s` 等への意図しないネゴシエーション低下がないことを確認します。ケーブルテスターに対応するNICであれば、結線診断も実施します。

```bash
ethtool --cable-test eth0
```

## 動作確認

- 全区間の選定根拠が判定基準から説明できること
- 「不適合」と判定された区間（ServerRoom-Core-to-Storage）が是正されていること
- `ethtool`のSpeedが設計速度と一致し、ネゴシエーション失敗がないこと

## 注意事項

- 実際の敷設・成端作業を伴う場合は、かしめ工具・テスターの安全な取り扱いに従ってください。
- 距離制限(100m)を超える設計は、必ず光ファイバ等の代替を検討してください。
- PoEに関するカテゴリ推奨は一般的なガイドラインであり、必須要件ではありません。発熱が懸念される高密度配線では上位カテゴリの採用を検討してください。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

```typescript
  { id: "lan-cable-category", name: "LANケーブルカテゴリ選定と敷設確認", desc: "距離・速度・PoE要件からCat5e/6/6A/光を根拠を持って選定し、ethtoolのリンク速度で検証する手順書を生成。", category: "facility", subCategory: "ケーブリング", format: "csv", output: "markdown", updated: "2026-07-30", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "lan-cable-category"`, `DATA_EXT = "csv"` で実行する。加えて:
```python
assert "不適合" in content
assert "ServerRoom-Core-to-Storage" in content
```
Expected: 全 assert が通り `OK: lan-cable-category` が出力される。ServerRoom-Core-to-Storage行が「不適合」と判定されること。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/lan-cable-category.csv assets/examples/lan-cable-category.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add lan-cable-category facility scenario (#549)

Refs #541
EOF
)"
```

---

### Task 7: ups-capacity-plan（UPS容量計算とバックアップ時間設計）

**Files:**
- Create: `assets/examples/ups-capacity-plan.yaml`
- Create: `assets/examples/ups-capacity-plan.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```yaml
ups_spec:
  model: "APC Smart-UPS SRT 3000VA"
  va_rating: 3000
  w_rating: 2700
  recommended_load_pct: 70
connected_loads:
  - name: Server-DB
    w: 400
  - name: Server-App
    w: 350
  - name: Storage
    w: 500
  - name: Switch
    w: 150
runtime_table:
  - load_pct: 30
    minutes: 45
  - load_pct: 50
    minutes: 22
  - load_pct: 70
    minutes: 12
  - load_pct: 100
    minutes: 6
shutdown_required_minutes: 8
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# UPS容量計算とバックアップ時間設計

YAMLのUPS仕様と接続機器リストから負荷率を計算し、ランタイム表からバックアップ時間を見積もります。

## 目的

WとVAの違い・力率を理解し、負荷率からUPSの容量適合とバックアップ時間を見積もれるようになることを目指します。

## 用語解説

- **VAとW**: VA(皮相電力)は電圧×電流の単純な積、W(有効電力)は実際に消費される電力。W = VA × 力率
- **力率**: 有効電力(W)と皮相電力(VA)の比率。UPSの評価では両方の定格を意識する必要がある
- **負荷率**: UPS定格に対する接続負荷の割合
- **バックアップ時間(ランタイム曲線)**: 負荷率に応じて変化する、UPSがバッテリーだけで給電し続けられる時間
- **ラインインタラクティブ・常時インバータ**: UPSの方式の違い。常時インバータの方が高品質だが高価
- **シャットダウン連携**: UPSがサーバへ停電を通知し、自動でシャットダウンさせる仕組み
- **バッテリー劣化**: 経年でランタイムが公称値より短くなる現象

## 1. UPS仕様と接続負荷を確認する

UPS: {{ ups_spec.model }}（VA定格: {{ ups_spec.va_rating }}VA、W定格: {{ ups_spec.w_rating }}W、推奨負荷率: {{ ups_spec.recommended_load_pct }}%）。本機はラインインタラクティブ方式です（常時インバータ方式より安価だが、停電検知から出力切替までに数msの瞬断があります）。

| name | w |
|---|---|
{% for l in connected_loads %}| {{ l.name }} | {{ l.w }} |
{% endfor %}

## 2. 接続負荷の合計Wを計算する

{% set ns = namespace(total_w=0) %}{% for l in connected_loads %}{% set ns.total_w = ns.total_w + l.w %}{% endfor %}
合計消費電力: {{ ns.total_w }}W

## 3. W定格に対する負荷率を算出する

```bash
echo "負荷率(W基準) = 合計W / W定格 x 100"
```

負荷率(W基準): {{ (ns.total_w * 100 / ups_spec.w_rating) | round(1) }}%（推奨{{ ups_spec.recommended_load_pct }}%に対する判定: {% if (ns.total_w * 100 / ups_spec.w_rating) > ups_spec.recommended_load_pct %}**超過**{% else %}OK{% endif %}）

VA側の負荷率は、力率が不明な場合はW基準の値を上回らないことが一般的なため、W基準の判定が厳しい側（安全側）の見積もりになります。

## 4. ランタイム表から負荷率に対応するバックアップ時間を読み取る

| load_pct | minutes |
|---|---|
{% for r in runtime_table %}| {{ r.load_pct }}% | {{ r.minutes }}分 |
{% endfor %}

負荷率は約{{ (ns.total_w * 100 / ups_spec.w_rating) | round | int }}%のため、直近下位の区分「{{ runtime_table[1].load_pct }}%」帯（{{ runtime_table[1].minutes }}分）を採用します。

## 5. 安全なシャットダウンに必要な時間と比較する

- シャットダウンに必要な時間: {{ shutdown_required_minutes }}分
- ランタイム見積もり: {{ runtime_table[1].minutes }}分 → {% if runtime_table[1].minutes >= shutdown_required_minutes %}OK（シャットダウン所要時間を上回っている）{% else %}NG（シャットダウンが間に合わない可能性）{% endif %}

## 6. (実機があれば)実測のLOADPCT・TIMELEFTを確認する

```bash
apcaccess status
```

`LOADPCT`（実測負荷率）と`TIMELEFT`（実測ランタイム推定）を、Step 3・Step 4の計算値と比較します。あわせて、UPSとサーバ間のシャットダウン連携（NUT等のエージェント経由で、停電通知を受けたサーバが自動シャットダウンする仕組み）が設定・動作していることを確認します。

## 動作確認

- WとVA両方の観点で負荷率が閾値以下であること
- TIMELEFT（または見積もりランタイム）がシャットダウン所要時間を上回ること
- 計算値と実測LOADPCTの乖離が説明できること

## 注意事項

- 実機のUPS動作試験（バッテリー運転試験）は不意の停電と同じ影響があるため、必ず影響範囲と実施時間帯を関係者に事前周知してから行ってください。
- バッテリーは経年劣化するため、公称のランタイム表より実際の値が短くなる場合があります。定期的な実測確認を推奨します。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

```typescript
  { id: "ups-capacity-plan", name: "UPS容量計算とバックアップ時間設計", desc: "WとVAの違い・力率を踏まえて負荷率を計算し、ランタイム表からバックアップ時間を見積もる手順書を生成。", category: "facility", subCategory: "電源設計", format: "yaml", output: "markdown", updated: "2026-07-30", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "ups-capacity-plan"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "1400W" in content
assert "OK" in content
```
Expected: 全 assert が通り `OK: ups-capacity-plan` が出力される。負荷率約51.9%（OK判定）、ランタイム見積もり22分、シャットダウン所要8分でOKと判定されること。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/ups-capacity-plan.yaml assets/examples/ups-capacity-plan.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add ups-capacity-plan facility scenario (#549)

Refs #541
EOF
)"
```

---

### Task 8: cable-labeling-standard（ケーブルラベリング規約適用）

**Files:**
- Create: `assets/examples/cable-labeling-standard.csv`
- Create: `assets/examples/cable-labeling-standard.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```csv
cable_id,from_port,to_port,expected_label
CBL-101,RackA-U10-P1,RackA-U40-P1,RackA-U10-P1_RackA-U40-P1
CBL-102,RackA-U15-P1,RackA-U40-P2,RackA-U15-P1_RackA-U40-P3
CBL-103,RackB-U05-P1,RackA-U40-P5,RackB-U05-P1_RackA-U40-P5
CBL-104,RackA-U20-P2,RackA-U41-P1,RackA-U41-P1
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# ケーブルラベリング規約適用

命名規約からラベル文字列を機械的に導出し、CSVに記載された規約適用結果と照合します。

## 目的

命名規約からラベル文字列を機械的に導出できるようになり、両端ラベリングと台帳一致の重要性を体得することを目指します。

## 用語解説

- **ラベリング規約**: ケーブルの両端に貼るラベル文字列の生成ルール
- **両端ラベル**: ケーブルの両端それぞれに、自分側と対向側の情報を記したラベルを貼ること
- **ケーブルID採番**: ケーブル1本ごとに一意なIDを割り振ること
- **台帳(インベントリ)**: ケーブルの接続情報を管理する一覧
- **面付け表記(例: RackA-U20-P1)**: ラック名・U番号・ポート番号を機械的に表す表記法
- **セルフラミネートラベル**: 巻き付けて自己接着するタイプの、耐久性の高いケーブルラベル

## 規約定義

ラベル文字列 = `<from_port>_<to_port>`（自分側ポート表記の後にアンダースコアで対向側ポート表記を続ける）。`from_port`/`to_port` は `RackA-U20-P1`（ラック名・U番号・ポート番号）のような面付け表記で、ケーブルID採番（`cable_id`列）とあわせて台帳(インベントリ)であるCSVに記録されています。

## 1. 例題でラベルを手で導出する

例: `from_port=RackA-U10-P1`, `to_port=RackA-U40-P1` の場合、ラベルは `RackA-U10-P1_RackA-U40-P1` となります。

## 2. CSV全行についてラベルを検算する

| cable_id | from_port | to_port | expected_label | 検算結果 |
|---|---|---|---|---|
{% for r in csv_rows %}{% set derived = r["from_port"] ~ "_" ~ r["to_port"] %}| {{ r["cable_id"] }} | {{ r["from_port"] }} | {{ r["to_port"] }} | {{ r["expected_label"] }} | {% if derived == r["expected_label"] %}一致{% else %}**不一致**（検算値: `{{ derived }}`）{% endif %} |
{% endfor %}

## 3. 規約違反行を記録する

```bash
echo "検算結果が「不一致」の行を規約違反として記録します"
```

{% for r in csv_rows %}{% set derived = r["from_port"] ~ "_" ~ r["to_port"] %}{% if derived != r["expected_label"] %}- **{{ r["cable_id"] }}**: 記載ラベル `{{ r["expected_label"] }}` / 規約からの検算値 `{{ derived }}` → 違反（{% if "_" not in r["expected_label"] %}片端のみの表記（桁欠け）{% else %}対向ポート番号の誤記{% endif %}）
{% endif %}{% endfor %}

## 4. 貼付チェックリストを消化する

セルフラミネートラベル（巻き付けて自己接着するタイプ）を使い、両端ラベルとして貼付します。

{% for r in csv_rows %}- [ ] {{ r["cable_id"] }}: 両端にセルフラミネートラベルで規約どおりのラベルを貼付・視認位置を確認・脱落防止処置
{% endfor %}

## 5. LLDPの対向情報とラベル記載のTo情報を照合する

```bash
lldpctl
```

取得したLLDP近隣情報の`PortDescr`と、ラベルの対向側表記(`to_port`)が一致することを確認します。

## 動作確認

- 全行のラベルが規約から再導出可能であること
- 違反行（CBL-102, CBL-104）が全件検出され、是正されていること
- ラベルとLLDP実配線の一致確認が記録されていること

## 注意事項

- ラベル貼付作業自体に高いリスクはありませんが、稼働中ケーブルを誤って一時的に外さないよう、作業前に必ず対象ケーブルを識別してください。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

```typescript
  { id: "cable-labeling-standard", name: "ケーブルラベリング規約適用", desc: "命名規約からラベル文字列を機械的に導出し、台帳記載のラベルと照合して違反行を検出する手順書を生成。", category: "facility", subCategory: "ケーブリング", format: "csv", output: "markdown", updated: "2026-07-30", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "cable-labeling-standard"`, `DATA_EXT = "csv"` で実行する。加えて:
```python
assert "CBL-102" in content
assert "違反" in content
```
Expected: 全 assert が通り `OK: cable-labeling-standard` が出力される。CBL-102(対向ポート番号の誤記)とCBL-104(片端のみの表記)が違反として検出されること。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/cable-labeling-standard.csv assets/examples/cable-labeling-standard.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add cable-labeling-standard facility scenario (#549)

Refs #541
EOF
)"
```

---

### Task 9: server-racking-procedure（サーバラッキング作業手順）

**Files:**
- Create: `assets/examples/server-racking-procedure.yaml`
- Create: `assets/examples/server-racking-procedure.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```yaml
device:
  name: Server-DB-02
  weight_kg: 22
  u_position: "U12"
  psu_count: 2
two_person_threshold_kg: 18
cage_nut_positions:
  - "U12 front-left-top"
  - "U12 front-left-bottom"
  - "U12 front-right-top"
  - "U12 front-right-bottom"
power_connections:
  - psu: 1
    pdu: "PDU-A1"
  - psu: 2
    pdu: "PDU-B1"
expected_serial: "SN-DB02-2026"
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# サーバラッキング作業手順（レール・搭載・接地）

YAMLの機器仕様に基づき、レール取付から搭載・接地・初回電源投入までの標準手順を、安全確認ポイントつきで実施します。

## 目的

レール取付から搭載・接地・初回電源投入までの標準手順を、安全確認ポイントつきで説明できるようになることを目指します。

## 用語解説

- **スライドレール**: 機器を引き出せるようにラックへ取り付けるレール
- **インナーレール・アウターレール**: 機器側に付けるレールと、ラック側に固定するレール
- **ケージナット**: ラックの角穴に取り付ける、ネジ止め用のナット
- **アース(接地)端子**: 感電・機器保護のため大地電位に接続する端子
- **2人作業ルール**: 重量物の搭載・引き出しを1人で行わないという安全原則
- **リフター**: 重量機器を持ち上げてラックへ挿入するための補助器具
- **初回電源投入(PoST)**: 電源投入直後に機器が行う自己診断(Power-On Self Test)

## 1. 機器仕様を確認し、作業体制を判定する

- 機器: {{ device.name }}（{{ device.weight_kg }}kg、搭載位置 {{ device.u_position }}）
- 2人作業の目安重量: {{ two_person_threshold_kg }}kg

{% if device.weight_kg > two_person_threshold_kg %}判定: {{ device.weight_kg }}kg > {{ two_person_threshold_kg }}kg のため **2人作業が必要**{% else %}判定: {{ two_person_threshold_kg }}kg以下のため1人作業可{% endif %}

## 2. ケージナットを取り付ける

```bash
echo "以下の位置にケージナットを取り付けます"
```

{% for pos in cage_nut_positions %}- [ ] {{ pos }}
{% endfor %}

## 3. スライドレールを取り付け、機器を搭載する

```bash
echo "スライドレール（インナーレールを {{ device.name }} に、アウターレールを {{ device.u_position }} に）を取り付けます"
```

- [ ] インナーレールを機器側面に固定する
- [ ] アウターレールをラック側（{{ device.u_position }}）に固定する
{% if device.weight_kg > two_person_threshold_kg %}- [ ] 2人作業（またはリフター）で機器を挿入する
{% else %}- [ ] 機器を挿入する
{% endif %}
- [ ] 機器をラックへネジで固定する

## 4. アース(接地)線を接続する

**電源投入前に必ず完了させてください。**

```bash
echo "{{ device.name }} のアース端子とラックのアースバーを接続します"
```

- [ ] アース線を接続し、導通を確認する

## 5. 電源ケーブルを接続する（二重電源は別系統へ）

| psu | pdu |
|---|---|
{% for c in power_connections %}| PSU{{ c.psu }} | {{ c.pdu }} |
{% endfor %}

## 6. 電源投入後の状態を確認する

```bash
ipmitool chassis status
dmidecode -s system-serial-number
```

- `chassis status` が `Power ON` かつ異常表示がないこと（初回電源投入時の自己診断(PoST)がエラーなく完了していること）
- シリアル番号が台帳の期待値 `{{ expected_serial }}` と一致すること

## 動作確認

- 固定・接地・（該当時は）2人作業の記録が全て完了していること
- `chassis status` が Power ON かつ異常なしであること
- シリアル番号が台帳(`{{ expected_serial }}`)と一致すること

## 注意事項

- 重量機器の搭載は落下・挟み込みの危険を伴うため、必ず2人作業ルールに従い、判定に基づき単独作業を避けてください。
- アース接続は必ず電源投入前に完了させてください。
- 選外候補「接地・静電気対策チェックリスト」の接地確認ステップはこの手順に統合済みです。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

```typescript
  { id: "server-racking-procedure", name: "サーバラッキング作業手順（レール・搭載・接地）", desc: "レール取付から搭載・接地・初回電源投入までを、2人作業判定と安全確認ポイントつきで実施する手順書を生成。", category: "facility", subCategory: "ラッキング", format: "yaml", output: "markdown", updated: "2026-07-30", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "server-racking-procedure"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "2人作業が必要" in content
assert "SN-DB02-2026" in content
```
Expected: 全 assert が通り `OK: server-racking-procedure` が出力される。22kg > 18kgのため2人作業必要と判定されること。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/server-racking-procedure.yaml assets/examples/server-racking-procedure.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add server-racking-procedure facility scenario (#549)

Refs #541
EOF
)"
```

---

### Task 10: rack-airflow-design（エアフロー設計とブランクパネル計画）

**Files:**
- Create: `assets/examples/rack-airflow-design.yaml`
- Create: `assets/examples/rack-airflow-design.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```yaml
row_layout:
  - rack: RackA
    orientation: front-to-back
  - rack: RackB
    orientation: front-to-back
  - rack: RackC
    orientation: back-to-front
empty_u_slots:
  - rack: RackA
    range: "U38-U42"
  - rack: RackB
    range: "U35-U42"
  - rack: RackC
    range: "U38-U42"
ashrae_recommended_range_c:
  min: 18
  max: 27
measured_inlet_temps:
  - rack: RackA
    temp_c: 22
  - rack: RackB
    temp_c: 24
  - rack: RackC
    temp_c: 29
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# エアフロー設計とブランクパネル計画

YAMLのラック列構成から再循環リスクを確認し、ASHRAE推奨吸気温度範囲で冷却の健全性を判定します。本データセンターはCRAC（冷媒直膨式空調機）による床下空調(フリーアクセスフロア)方式で、床下から供給された冷気がラック前面（コールドアイル）から吸気され、背面（ホットアイル）へ排気されます。

## 目的

ホットアイル/コールドアイル分離と再循環防止の原理を理解し、吸気温度基準で冷却の健全性を判定できるようになることを目指します。

## 用語解説

- **ホットアイル・コールドアイル**: 排気(熱気)側の通路と吸気(冷気)側の通路を分離するデータセンター設計
- **吸気温度**: 機器が実際に吸い込む空気の温度。室温そのものではなくこの値で冷却状態を判定する
- **再循環**: 排気(熱気)が吸気側へ回り込んで吸気温度を上昇させる現象
- **ブランクパネル**: 空きUを塞ぎ、排気の回り込みを防ぐ板
- **CRAC・CRAH**: データセンター向け空調機（冷媒直膨式・冷水式）
- **ASHRAE推奨温度範囲**: 機器吸気温度として推奨される温度帯(本シナリオでは18〜27℃)
- **床下空調(フリーアクセス)**: 床下から冷気を供給する空調方式

## 1. ラック列構成と吸排気方向を確認する

| rack | orientation |
|---|---|
{% for r in row_layout %}| {{ r.rack }} | {{ r.orientation }} |
{% endfor %}

## 2. 吸排気が逆向きのラックを検出する

```bash
echo "orientationがback-to-frontのラックは、通路の冷気/熱気の流れが乱れる可能性があります"
```

{% for r in row_layout %}{% if r.orientation == "back-to-front" %}- **{{ r.rack }}**: 逆向き（コールドアイル側に排熱するため再循環リスクあり）
{% endif %}{% endfor %}

## 3. 空きUのブランクパネル設置計画を確認する

| rack | range |
|---|---|
{% for e in empty_u_slots %}| {{ e.rack }} | {{ e.range }} |
{% endfor %}

## 4. 吸気温度で冷却の健全性を判定する（室温ではなく吸気温度で判定する）

ASHRAE推奨範囲: {{ ashrae_recommended_range_c.min }}〜{{ ashrae_recommended_range_c.max }}℃

```bash
ipmitool sdr type Temperature
```

{% for m in measured_inlet_temps %}- {{ m.rack }}: 吸気温度 {{ m.temp_c }}℃ → {% if m.temp_c > ashrae_recommended_range_c.max or m.temp_c < ashrae_recommended_range_c.min %}**推奨範囲外（NG）**{% else %}推奨範囲内（OK）{% endif %}
{% endfor %}

## 5. 逆向き機器への対策を記載する

吸排気が逆向きのラック（RackC）は、推奨範囲を超える吸気温度が観測されています。ダクトによる排熱の直接排出、または当該ラックの機器入れ替え（正しい向きの機器への統一）を対策として検討します。

## 動作確認

- 再循環経路（逆向きラック）が一覧で全て特定されていること
- 全ラックの吸気温度が推奨範囲内、または範囲外ラックに対策が記載されていること
- 逆向き機器（ラック）への対策（ダクト等）が記載されていること

## 注意事項

- 実機のブランクパネル設置・配置変更を稼働中に行う場合は、瞬間的な気流変化が周辺機器の温度に影響しないよう、順番に作業してください。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

```typescript
  { id: "rack-airflow-design", name: "エアフロー設計とブランクパネル計画", desc: "ホットアイル/コールドアイル分離と再循環リスクを確認し、吸気温度基準で冷却の健全性を判定する手順書を生成。", category: "facility", subCategory: "環境設計", format: "yaml", output: "markdown", updated: "2026-07-30", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "rack-airflow-design"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "RackC" in content
assert "NG" in content
```
Expected: 全 assert が通り `OK: rack-airflow-design` が出力される。RackCが逆向きかつ吸気温度29℃で範囲外(NG)と判定されること。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/rack-airflow-design.yaml assets/examples/rack-airflow-design.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add rack-airflow-design facility scenario (#549)

Refs #541
EOF
)"
```

---

### Task 11: env-monitoring-setup（温湿度モニタリング設置と閾値設計）

**Files:**
- Create: `assets/examples/env-monitoring-setup.yaml`
- Create: `assets/examples/env-monitoring-setup.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```yaml
sensor_plan:
  - rack: RackA
    position: top
  - rack: RackA
    position: middle
  - rack: RackA
    position: bottom
thresholds:
  temp_warning_c: 27
  temp_critical_c: 32
  humidity_min_pct: 20
  humidity_max_pct: 80
measured_values:
  - position: top
    temp_c: 26
    humidity_pct: 45
  - position: middle
    temp_c: 24
    humidity_pct: 48
  - position: bottom
    temp_c: 23
    humidity_pct: 50
server_inlet_temp_c: 25
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# 温湿度モニタリング設置と閾値設計

YAMLの設置計画と閾値表に基づき、温湿度センサーを設置し、CLIで監視値を取得・判定します。

## 目的

温湿度センサーの設置位置(ラック前面上中下)と警告閾値の設計根拠を理解し、監視値をCLIで取得・判定できるようになることを目指します。

## 用語解説

- **温湿度センサー**: ラック内の温度・湿度を計測する機器
- **閾値(Warning/Critical)**: 段階的に警告レベルを分ける監視の基準値
- **相対湿度と結露**: 湿度が高すぎると結露、低すぎると静電気のリスクが高まる
- **静電気と低湿度**: 湿度が低い環境では静電気放電(ESD)による機器故障リスクが高まる
- **SNMP**: ネットワーク経由で機器の状態を取得するプロトコル
- **OID**: SNMPで参照する情報の識別子(Object Identifier)
- **ポーリング間隔**: 監視値を取得する周期

## 1. 設置計画を確認する

{{ sensor_plan[0].rack }}ラックの前面 上段・中段・下段の3箇所にセンサーを設置します（上段は熱気がこもりやすく、下段は床からの冷気の影響を受けやすいため、代表点として3点測定します）。

| rack | position |
|---|---|
{% for s in sensor_plan %}| {{ s.rack }} | {{ s.position }} |
{% endfor %}

## 2. 閾値表を確認する

| 項目 | Warning | Critical |
|---|---|---|
| 温度 | {{ thresholds.temp_warning_c }}℃ | {{ thresholds.temp_critical_c }}℃ |

湿度の正常範囲: {{ thresholds.humidity_min_pct }}〜{{ thresholds.humidity_max_pct }}%（相対湿度が上限を超えると結露、下限を下回ると静電気放電(ESD)のリスクが高まるため、この範囲に収めます）

## 3. 設置チェックリストを消化する

{% for s in sensor_plan %}- [ ] {{ s.rack }} {{ s.position }}: センサー位置・ケーブル・電源を確認
{% endfor %}

## 4. 監視値を取得する

ポーリング間隔5分でSNMP監視します。

```bash
snmpwalk -v2c -c public <センサーIP> 1.3.6.1.4.1.<ベンダーOID>
```

模擬取得値（実機がない場合はこの値を使って判定演習を行う）:

| position | temp_c | humidity_pct |
|---|---|---|
{% for m in measured_values %}| {{ m.position }} | {{ m.temp_c }}℃ | {{ m.humidity_pct }}% |
{% endfor %}

## 5. 閾値と照合し、判定する

{% for m in measured_values %}- {{ m.position }}: 温度{{ m.temp_c }}℃ → {% if m.temp_c >= thresholds.temp_critical_c %}**Critical**{% elif m.temp_c >= thresholds.temp_warning_c %}**Warning**{% else %}正常{% endif %} / 湿度{{ m.humidity_pct }}% → {% if m.humidity_pct < thresholds.humidity_min_pct or m.humidity_pct > thresholds.humidity_max_pct %}**範囲外**{% else %}正常{% endif %}
{% endfor %}

## 6. サーバ側温度センサーとの乖離を確認する

```bash
ipmitool sdr type Temperature
```

サーバ吸気温度実測: {{ server_inlet_temp_c }}℃。中段センサー値（{{ sensor_plan[1].position }}: {{ measured_values[1].temp_c }}℃）との差は{{ (server_inlet_temp_c - measured_values[1].temp_c) | abs }}℃で、許容範囲内の乖離です。

## 7. 閾値超過時の一次対応フローを確認する

Warning/Critical超過を検知した場合、まず通知内容を確認し、現地確認（センサー故障か実際の温湿度異常かの切り分け）を行った上でエスカレーションします。

## 動作確認

- 全設置点で温湿度の値が取得できていること
- 取得値が閾値表の正常範囲内であること（範囲外の場合は一次対応フローに従っていること）
- サーバ吸気温度とセンサー値の乖離が説明範囲内であること

## 注意事項

- センサー設置は電源・配線作業を伴う場合があるため、活線作業を避け、可能であれば無停電のタイミングで実施してください。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

```typescript
  { id: "env-monitoring-setup", name: "温湿度モニタリング設置と閾値設計", desc: "ラック前面上中下段への温湿度センサー設置と警告閾値を設計し、CLIで監視値を取得・判定する手順書を生成。", category: "facility", subCategory: "環境監視", format: "yaml", output: "markdown", updated: "2026-07-30", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "env-monitoring-setup"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "正常" in content
assert "1" in content
```
Expected: 全 assert が通り `OK: env-monitoring-setup` が出力される。全設置点が正常判定、サーバ実測とセンサー値の差が1℃と算出されること。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/env-monitoring-setup.yaml assets/examples/env-monitoring-setup.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add env-monitoring-setup facility scenario (#549)

Refs #541
EOF
)"
```

---

### Task 12: 全体検証とPR作成

**Files:**
- なし（既存ファイルの検証のみ）

- [ ] **Step 1: TypeScript型チェックとWebテストを実行する**

```bash
cd web && npx tsc --noEmit && npm test -- --run
```
Expected: 型エラー0件、既存テスト全件PASS（`facility` カテゴリ追加によるTypeScriptの型エラーがないこと）。

- [ ] **Step 2: Python側の既存テストを実行する**

```bash
uv run pytest -k 'not e2e'
```
Expected: 既存テスト全件PASS（既存件数＋新規10件のレンダリングテストが `tests/unit/test_example_templates_render.py` により自動追加でカバーされ、全てPASSすること）。

- [ ] **Step 3: `tests/unit/test_template_taxonomy.py` にfacilityの許可サブカテゴリを追加する**

`tests/unit/test_template_taxonomy.py` の `CATEGORIES` に `"facility"` を追加し、`ALLOWED_SUBCATEGORIES` に以下のエントリを追加する:

```python
    "facility": frozenset(
        {
            "電源設計",
            "ラック設計",
            "ケーブリング",
            "ラッキング",
            "環境設計",
            "環境監視",
        }
    ),
```

Run: `uv run pytest tests/unit/test_template_taxonomy.py -v`
Expected: 全件PASS。

- [ ] **Step 4: 10テンプレート全件の一括レンダリング確認**

以下のスクリプトを `uv run python -` で実行し、10テンプレート全てが例外なくレンダリングされることを一括確認する。

```python
import sys
from io import BytesIO

sys.path.insert(0, ".")
from features.config_parser import ConfigParser
from features.document_render import DocumentRender

TARGETS = [
    ("rack-power-budget", "csv"),
    ("rack-mount-layout", "csv"),
    ("dual-power-redundancy", "csv"),
    ("structured-cabling-plan", "csv"),
    ("lan-cable-category", "csv"),
    ("ups-capacity-plan", "yaml"),
    ("cable-labeling-standard", "csv"),
    ("server-racking-procedure", "yaml"),
    ("rack-airflow-design", "yaml"),
    ("env-monitoring-setup", "yaml"),
]

FORMAT_TYPE_KEEP = 0

for template_id, ext in TARGETS:
    with open(f"assets/examples/{template_id}.{ext}", "rb") as f:
        config_file = BytesIO(f.read())
    config_file.name = f"{template_id}.{ext}"
    parser = ConfigParser(config_file=config_file)
    assert parser.parse() is True, f"{template_id}: {parser.error_message}"
    parsed = parser.parsed_dict
    assert parsed is not None

    with open(f"assets/examples/{template_id}.j2", "rb") as f:
        template_file = BytesIO(f.read())
    template_file.name = f"{template_id}.j2"
    render = DocumentRender(template_file)
    assert render.is_valid_template is True, f"{template_id}: {render.error_message}"

    ok = render.apply_context(parsed, FORMAT_TYPE_KEEP, True)
    assert ok is True, f"{template_id}: {render.error_message}"

    content = render.render_content
    assert "## 目的" in content, template_id
    assert "## 用語解説" in content, template_id
    assert "## 動作確認" in content, template_id
    assert "## 注意事項" in content, template_id
    print(f"OK: {template_id}")

print("ALL OK")
```
Expected: `OK: <id>` が10行出力され、最後に `ALL OK` が表示される。

- [ ] **Step 5: developブランチとの差分を確認する**

```bash
git status
git log --oneline origin/develop..HEAD
```
Expected: `assets/examples/*` の新規20ファイル(10ペア)、`web/src/lib/types.ts`、`web/src/components/Library.tsx`、`web/src/lib/templates.ts`、`tests/unit/test_template_taxonomy.py` の変更のみがコミットされている。

- [ ] **Step 6: `/code-review` を実行する**

高効度で `/code-review` を実行し、指摘があれば修正して再コミットする。特に、各テンプレートの用語解説と本文のグラウンディング（双方向）、算術判定の正しさ（80%ルール・負荷率・カテゴリ選定基準）を重点確認する。

- [ ] **Step 7: PRを作成する**

`develop` ブランチ向けにPRを作成する。タイトル例:

```
Phase 6: add facility category and 10 physical-infrastructure training scenarios (Closes #549)
```

本文はSummary / Test plan / Refsの構成（PR #543以降の前例踏襲）とし、ASCIIのみで記述する。`Closes #549` `Refs #541` を含める。作成後は `subscribe_pr_activity` でCI・レビューを監視し、CI失敗・レビューコメントに対応してマージまで追従する。マージ後は、親issue #541自体もこれで全フェーズ完了となるため、issueをクローズする（または完了報告コメントを残す）。
