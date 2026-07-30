# マルチベンダー相互接続テンプレート(LACP/OSPFネイバー/BGPネイバー) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `assets/examples/` にマルチベンダー(10社)のLACPリンクアグリゲーション/OSPFネイバー/BGPネイバー確立テンプレートを28本追加し、`web/src/lib/templates.ts` とタクソノミー drift gate に登録する。

**Architecture:** 各テンプレートは `<id>.toml`(シナリオ変数) + `<id>.j2`(Jinja2手順書テンプレート、Markdown出力)のペア。ベンダー固有のCLI構文は記憶に頼れないため、各ベンダーTaskの実装ステップは「担当ベンダーのCLIをWebSearchで一次情報確認 → 本Planが指定するTOMLスキーマ・必須コマンドチェックリストに沿って執筆 → `scripts/local_render_check.py` で自己検証」という順で進める(通常のTDDの「テストを先に書く」の代わりに、この自己検証スクリプトが実装直後のゲートになる)。これは28本ぶんの実CLI構文を本Plan執筆時点で先取りして書き切ると誤情報を固定化するリスクが高いための意図的な適応であり、`docs/superpowers/specs/2026-07-30-multivendor-interconnect-templates-design.md` の Phase B 方針と一致する。Cisco BGPのみ、既存2本(`cisco-etherchannel-lag` / `cisco-ospf-single-area`)と並ぶ3本目として、既知のCisco IOS BGP構文で直接執筆する(Task 1)。

**Tech Stack:** Jinja2(SandboxedEnvironment, StrictUndefined) / TOML / Python 3(pytest) / TypeScript(`web/src/lib/templates.ts`)

---

## 共通規約(全Taskで遵守)

### ファイル配置
- データ: `assets/examples/<id>.toml`
- テンプレート: `assets/examples/<id>.j2`

### 本文構成(既存 `cisco-etherchannel-lag.j2` / `cisco-ospf-single-area.j2` を型とする)
1. `# <タイトル>` + リード文(1〜3文、対向機器との整合が必要な旨を明記)
2. `## 目的`
3. `## 用語解説`(箇条書き、ベンダー固有の用語差異があれば明記)
4. `## シナリオ設定`(TOML変数を`{{ }}`で埋め込んだ文章、対象インターフェース/ネットワークの一覧をfor文で列挙)
5. `## 手順`(`###`番号付きサブセクション、各ステップに ```bash フェンス内のCLIコマンド)
6. `## 動作確認`(箇条書き、`show`/`display`等の確認コマンド結果で判定できる基準)
7. `## 注意事項`(ロックアウト防止・両端整合・誤設定時の影響)

### Jinja2制約(`features/validate_template.py` のサンドボックス)
- 使用禁止タグ: `macro` `include` `import` `extends` `do`
- 使用可: `{% for %}` `{% if %}` `{{ var }}` `| join` `| length` などのフィルタ(既存テンプレートで使用実績あり)
- CSV不使用(toml/yaml前提)なのでCSVの`.split()`等制約は非該当
- 認証情報(BGPのMD5キー等)は明らかにプレースホルダと分かる例示値(例: `"CHANGE-ME-BGP-KEY"`)を使い、実在しそうな値は書かない

### レジストリ登録(`web/src/lib/templates.ts` の `META` 配列)
各エントリは以下の形:
```ts
{ id: "<id>", name: "<日本語名>", desc: "<日本語説明。〜構成を、CLIを含む手順書（Markdown）として生成。>", category: "network", subCategory: "<ベンダー表示名>", format: "toml", output: "markdown", updated: "2026-07-30", live: true },
```

### タクソノミー登録(`tests/unit/test_template_taxonomy.py`)
`ALLOWED_SUBCATEGORIES["network"]` の frozenset に以下8件を追加(アルファベット順の既存の並びに挿入):
`"Alaxala"`, `"Allied Telesis"`, `"Arista"`, `"Dell"`, `"Fortinet"`, `"HPE Aruba"`, `"Juniper"`, `"NEC"`
(`"Cisco"` と `"YAMAHA"` は既存)

### 検証コマンド(全Task共通、各ファイル作成直後に実行)
```bash
python3 scripts/local_render_check.py <id>
```
Expected: `FAIL` 行が出力されず、末尾に `<N>/<N> pairs OK` と表示される。

---

## Task 1: Cisco BGPネイバー(`cisco-bgp-neighbor`)

**Files:**
- Create: `assets/examples/cisco-bgp-neighbor.toml`
- Create: `assets/examples/cisco-bgp-neighbor.j2`
- Modify: `web/src/lib/templates.ts`(META行追加)

- [ ] **Step 1: データファイルを作成する**

`assets/examples/cisco-bgp-neighbor.toml`:
```toml
local_asn = 65001
router_id = "10.10.10.1"
neighbor_ip = "192.0.2.2"
remote_asn = 65002
neighbor_description = "ISP-A-EDGE"
advertised_networks = ["10.10.10.0/24", "10.10.20.0/24"]
bgp_password = "CHANGE-ME-BGP-KEY"
```

- [ ] **Step 2: テンプレートファイルを作成する**

`assets/examples/cisco-bgp-neighbor.j2`:
```jinja
# CiscoルータのeBGPネイバー確立

異なるAS(自律システム)間でeBGPネイバーを確立し、経路広告と受信経路の確認を行います。対向ルータのAS番号・IPアドレス・認証キーは事前に対向管理者と合意しておく必要があります。

## 目的

eBGPネイバーをリモートAS `{{ remote_asn }}` との間で確立し、`network`文による経路広告とネイバー状態`Established`の確認ができるようになることを目指します。

## 用語解説

- **AS(Autonomous System)**: BGPにおける経路制御の管理単位。組織ごとに一意なAS番号を持つ
- **eBGP(External BGP)**: 異なるAS間で経路交換を行うBGPセッション(同一AS内は iBGP と呼ぶ)
- **ネイバー(Neighbor/Peer)**: BGPセッションを確立する対向ルータ。TCP179番ポートでセッションを張る
- **network文**: BGPで広告する自AS内のネットワークをルーティングテーブルから選んで宣言する設定
- **MD5認証**: BGPセッションのTCPパケットにMD5ハッシュを付与し、なりすましを防ぐ任意機能

## シナリオ設定

自AS `{{ local_asn }}`(router-id `{{ router_id }}`)から、対向AS `{{ remote_asn }}`・アドレス `{{ neighbor_ip }}`(`{{ neighbor_description }}`)とeBGPネイバーを確立します。

以下の{{ advertised_networks | length }}個のネットワークを広告します。

{% for n in advertised_networks %}- `{{ n }}`
{% endfor %}
セッションはMD5認証で保護します。

## 手順

### 1. 事前にAS番号とIPの疎通を確認する

```bash
enable
show ip route
ping {{ neighbor_ip }}
```

対向ルータの直接接続インターフェース(またはループバック、iBGPマルチホップ構成の場合)への疎通が取れていることを確認します。

### 2. router bgpとネイバーを設定する

```bash
configure terminal
router bgp {{ local_asn }}
 bgp router-id {{ router_id }}
 neighbor {{ neighbor_ip }} remote-as {{ remote_asn }}
 neighbor {{ neighbor_ip }} description {{ neighbor_description }}
 neighbor {{ neighbor_ip }} password {{ bgp_password }}
```

### 3. network文で経路を広告する

```bash
{% for n in advertised_networks %} network {{ n.split('/')[0] }} mask 255.255.255.0
{% endfor %}end
write memory
```

`network`文はルーティングテーブルに実在する経路のみ広告対象になるため、事前に`show ip route`で該当ネットワークがルーティングテーブルに存在することを確認してください。

### 4. ネイバー状態と受信経路をshow ip bgp summaryで確認する

```bash
show ip bgp summary
show ip bgp neighbors {{ neighbor_ip }}
show ip route bgp
```

`show ip bgp summary`の対向IPの`State/PfxRcd`列が数値(受信プレフィックス数)であれば`Established`、`Idle`や`Active`等の文字列であれば未確立です。

## 動作確認

- `show ip bgp summary`で `{{ neighbor_ip }}` の状態が `Established`(PfxRcd列が数値)であること
- `show ip bgp neighbors {{ neighbor_ip }}`のAS番号が `{{ remote_asn }}` と一致すること
- `show ip route bgp`に対向AS経由のネットワークが `B`(BGP由来)として学習されていること
- 自AS広告分({{ advertised_networks | join(', ') }})が対向ルータ側の`show ip bgp`で確認できること(対向機器での確認が必要)

## 注意事項

- MD5認証キーは両端で完全に一致させる必要があり、不一致だとTCPセッション自体が確立しない(BGPログに認証エラーは出ない場合があるため、疎通確認と合わせて切り分けること)。
- `network`文はルーティングテーブルに厳密一致する経路がないと広告されない。サマライズしたい場合は`network`文のマスクをサマリ用に合わせるか、`aggregate-address`を使う。
- 誤ったAS番号やネイバーIPを設定すると、意図しないASと経路交換してしまうリスクがある。投入前に対向情報を再確認し、可能であれば`neighbor {{ neighbor_ip }} prefix-list`等でフィルタも検討する。
```

- [ ] **Step 3: 自己検証する**

Run: `python3 scripts/local_render_check.py cisco-bgp-neighbor`
Expected: `1/1 pairs OK`

- [ ] **Step 4: `templates.ts` にMETA行を追加する**

`web/src/lib/templates.ts` の Cisco関連行(`cisco-switchport`等)の近くに追加:
```ts
  { id: "cisco-bgp-neighbor", name: "CiscoルータのeBGPネイバー確立", desc: "AS間のeBGPネイバー確立と経路広告・受信経路の確認を、CLIを含む手順書（Markdown）として生成。", category: "network", subCategory: "Cisco", format: "toml", output: "markdown", updated: "2026-07-30", live: true },
```

- [ ] **Step 5: pytestで検証する**

Run: `uv run pytest -k cisco-bgp-neighbor -q`
Expected: `1 passed`

- [ ] **Step 6: コミットする**

```bash
git add assets/examples/cisco-bgp-neighbor.toml assets/examples/cisco-bgp-neighbor.j2 web/src/lib/templates.ts
git commit -m "feat(templates): add cisco-bgp-neighbor

Refs #596"
```

---

## Task 2〜10: 9ベンダー分のLAG/OSPF/BGP(各3テンプレート、計27本)

各Taskは同一構造。**担当ベンダーのCLI構文はこのPlanの時点では未確定であり、実装者はWebSearchで一次情報(公式コマンドリファレンス/コンフィグレーションガイド)を確認してから執筆すること。** 用語・コマンドが確認できない場合は、最も近い実在コマンドで代替し、`## 注意事項`にバージョン依存の可能性を明記する(ブロッキングにしない)。

### 共通TOMLスキーマ(ベンダーごとに実在するCLIモデルに合わせて調整可、値はベンダー実機の命名規則に合わせる)

**`<id>-lacp-lag.toml`:**
```toml
channel_id = 1
member_interfaces = ["<ベンダー実機のインターフェース表記2本>"]
lacp_mode = "active"
trunk_vlans = [10, 20, 30]
load_balance_method = "<ベンダー実機のハッシュ方式名>"
```

**`<id>-ospf-neighbor.toml`:**
```toml
router_id = "10.10.10.1"
area_id = 0
ospf_interfaces = ["<エリアに参加させるインターフェース1〜3本>"]
passive_interfaces = ["<Helloを止めるインターフェース>"]
reference_bandwidth = 10000
```
(対象ベンダーにreference-bandwidth相当の概念がなければこのフィールドは削除し、`## シナリオ設定`もそれに合わせて調整してよい)

**`<id>-bgp-neighbor.toml`:**
```toml
local_asn = 65001
router_id = "10.10.10.1"
neighbor_ip = "192.0.2.2"
remote_asn = 65002
neighbor_description = "PEER-EDGE"
advertised_networks = ["10.10.10.0/24", "10.10.20.0/24"]
bgp_password = "CHANGE-ME-BGP-KEY"
```

### 各Taskで必ず含める内容チェックリスト

- **LAG**: (1) 集約グループ作成コマンド, (2) メンバーインターフェースへの割当, (3) LACPモード(active/passive相当)指定, (4) VLANトランク設定, (5) ロードバランス方式設定, (6) 集約状態を確認する`show`/`display`系コマンド, (7) メンバー1本停止時の縮退動作検証と復旧手順
- **OSPF**: (1) router-id設定, (2) エリアへの参加(network文またはインターフェース単位のarea設定、ベンダー実装に合わせる), (3) passive-interface相当設定, (4) ネイバー確認コマンド(`FULL`/`Established`等の状態確認), (5) 学習経路確認コマンド
- **BGP**: (1) local AS/router-id設定, (2) neighbor(remote-as)設定, (3) 認証設定(対応していれば), (4) 経路広告(network文またはredistribute相当), (5) ネイバー状態確認コマンド(`Established`相当), (6) 受信経路確認コマンド

### Task 2: Juniper(Junos OS) — `juniper-lacp-lag` / `juniper-ospf-neighbor` / `juniper-bgp-neighbor`

**Files:**
- Create: `assets/examples/juniper-lacp-lag.toml`, `assets/examples/juniper-lacp-lag.j2`
- Create: `assets/examples/juniper-ospf-neighbor.toml`, `assets/examples/juniper-ospf-neighbor.j2`
- Create: `assets/examples/juniper-bgp-neighbor.toml`, `assets/examples/juniper-bgp-neighbor.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1:** WebSearchでJunos OSの `ae`(aggregated ethernet)インターフェース設定、`protocols ospf`(エリア単位)、`protocols bgp`(group/neighbor)の実コマンド体系を確認する。参照候補: Juniper公式 `Junos OS Configuration Library`(configuring aggregated ethernet interfaces / OSPF / BGP)。
- [ ] **Step 2:** `juniper-lacp-lag.toml` / `.j2` を、上記チェックリストと本文構成に沿って作成する(Junosは`set`コマンド体系である点、`commit`が必要な点を手順に含める)。
- [ ] **Step 3:** `python3 scripts/local_render_check.py juniper-lacp-lag` を実行し `1/1 pairs OK` を確認する。
- [ ] **Step 4:** `juniper-ospf-neighbor.toml` / `.j2` を同様に作成する(Junosはインターフェース単位で`area`を指定する点に注意)。
- [ ] **Step 5:** `python3 scripts/local_render_check.py juniper-ospf-neighbor` を実行し確認する。
- [ ] **Step 6:** `juniper-bgp-neighbor.toml` / `.j2` を同様に作成する(`group`概念、`export policy`による経路広告がJunos流儀である点に注意)。
- [ ] **Step 7:** `python3 scripts/local_render_check.py juniper-bgp-neighbor` を実行し確認する。
- [ ] **Step 8:** `templates.ts` に3行(`subCategory: "Juniper"`)を追加する。
- [ ] **Step 9:** `uv run pytest -k juniper -q` で `3 passed` を確認する。
- [ ] **Step 10:** コミットする(`git add` 対象6ファイル + `templates.ts`、メッセージ `feat(templates): add juniper lacp/ospf/bgp interconnect templates` + `Refs #596`)。

### Task 3: Arista(EOS) — `arista-lacp-lag` / `arista-ospf-neighbor` / `arista-bgp-neighbor`

Task 2と同一手順。差分:
- [ ] **Step 1:** WebSearchでArista EOSの `Port-Channel`(LACP)、`router ospf`、`router bgp`(EOSはCisco IOSに近いが`no switchport`等の差異がある)の実コマンドを確認する。参照候補: Arista `EOS Configuration Guide`。
- Steps 2〜10はTask 2と同様に3テンプレート分繰り返す。`subCategory: "Arista"`。

### Task 4: HPE Aruba(AOS-CX) — `arubacx-lacp-lag` / `arubacx-ospf-neighbor` / `arubacx-bgp-neighbor`

- [ ] **Step 1:** WebSearchでAOS-CXの `interface lag`、`router ospf`、`router bgp`の実コマンドを確認する。参照候補: Aruba `AOS-CX Switch Software Fundamentals Guide` / `Layer 3 Configuration Guide`。
- Steps 2〜10はTask 2と同様。`subCategory: "HPE Aruba"`。

### Task 5: Dell(OS10) — `dellos10-lacp-lag` / `dellos10-ospf-neighbor` / `dellos10-bgp-neighbor`

- [ ] **Step 1:** WebSearchでDell EMC Networking OS10の `interface port-channel`、`router ospf`、`router bgp`の実コマンドを確認する。参照候補: Dell `SmartFabric OS10 User Guide`。
- Steps 2〜10はTask 2と同様。`subCategory: "Dell"`。

### Task 6: Fortinet(FortiOS) — `fortinet-lacp-lag` / `fortinet-ospf-neighbor` / `fortinet-bgp-neighbor`

- [ ] **Step 1:** WebSearchでFortiOSの `config system interface`(`type aggregate`, `lacp-mode`)、`config router ospf`、`config router bgp`の実コマンド体系(CLIブロック構文が`config`/`edit`/`set`/`next`/`end`である点に注意)を確認する。参照候補: Fortinet `FortiOS CLI Reference` / `FortiGate Administration Guide`。
- Steps 2〜10はTask 2と同様(手順のコードブロックはFortiOSの`config`/`end`構文になる)。`subCategory: "Fortinet"`。

### Task 7: NEC(IX Series) — `nec-ix-lacp-lag` / `nec-ix-ospf-neighbor` / `nec-ix-bgp-neighbor`

- [ ] **Step 1:** WebSearchでNEC UNIVERGE IXシリーズのリンクアグリゲーション(LACP)、OSPF、BGPの実コマンドを確認する。参照候補: NEC公式 `IXシリーズ コマンドリファレンス`。日本語の公式マニュアルが一次情報。
- Steps 2〜10はTask 2と同様。`subCategory: "NEC"`。

### Task 8: Allied Telesis(AlliedWare Plus) — `alliedtelesis-lacp-lag` / `alliedtelesis-ospf-neighbor` / `alliedtelesis-bgp-neighbor`

- [ ] **Step 1:** WebSearchでAlliedWare Plus(AW+)の `static aggregator`/LACP、`router ospf`、`router bgp`の実コマンドを確認する。参照候補: Allied Telesis `AlliedWare Plus Feature Overview and Configuration Guide`(Link Aggregation / OSPF / BGP各章)。
- Steps 2〜10はTask 2と同様。`subCategory: "Allied Telesis"`。

### Task 9: Alaxala(AXシリーズ) — `alaxala-lacp-lag` / `alaxala-ospf-neighbor` / `alaxala-bgp-neighbor`

- [ ] **Step 1:** WebSearchでAlaxala AXシリーズのリンクアグリゲーション、OSPF、BGPの実コマンドを確認する。参照候補: Alaxala公式 `AXシリーズ コンフィグレーションガイド`。日本語の公式マニュアルが一次情報。
- Steps 2〜10はTask 2と同様。`subCategory: "Alaxala"`。

### Task 10: YAMAHA(RTXシリーズ) — `yamaha-lacp-lag` / `yamaha-ospf-neighbor` / `yamaha-bgp-neighbor`

- [ ] **Step 1:** WebSearchでYAMAHA RTXシリーズの `lacp`(リンクアグリゲーション、対応機種のLANマップ設定)、`ospf`、`bgp`の実コマンドを確認する。参照候補: YAMAHA `RTXシリーズ コマンドリファレンス`。既存の `yamaha-router.j2` / `yamaha-ipsec-vpn.j2` と文体・コマンド表記(`#`プロンプト等)を揃える。
- Steps 2〜10はTask 2と同様。`subCategory: "YAMAHA"`。

---

## Task 11: 統合レビューと全体検証

**Files:**
- Modify: `web/src/lib/templates.ts`(Task 1〜10で追記した28行が正しく1ファイルに収まっているか確認)
- Modify: `tests/unit/test_template_taxonomy.py`(`ALLOWED_SUBCATEGORIES["network"]`へ8件追加)

- [ ] **Step 1: タクソノミーへ新規サブカテゴリを追加する**

`tests/unit/test_template_taxonomy.py` の `ALLOWED_SUBCATEGORIES["network"]` frozenset内、既存のアルファベット順の並びに沿って以下を追加(例: `"Cisco"`の次に`"Dell"`ではなく、既存の並び順規約を確認し、混乱があれば単純にアルファベット順で追加する):
```python
                "Alaxala",
                "Allied Telesis",
                "Arista",
                "Cisco",
                "Dell",
                "DHCP",
                "Fortinet",
                "HPE Aruba",
                "IDS・IPS",
                "IPアドレス管理",
                "IPアドレス設計",
                "Juniper",
                "L1/L2リンク",
                "NEC",
                "NIC",
                "VLAN",
                "YAMAHA",
                "ZTNAオーバーレイ",
```
(既存の残り行はそのまま維持する)

- [ ] **Step 2: 全件レンダーチェックを実行する**

Run:
```bash
python3 scripts/local_render_check.py \
  cisco-bgp-neighbor \
  juniper-lacp-lag juniper-ospf-neighbor juniper-bgp-neighbor \
  arista-lacp-lag arista-ospf-neighbor arista-bgp-neighbor \
  arubacx-lacp-lag arubacx-ospf-neighbor arubacx-bgp-neighbor \
  dellos10-lacp-lag dellos10-ospf-neighbor dellos10-bgp-neighbor \
  fortinet-lacp-lag fortinet-ospf-neighbor fortinet-bgp-neighbor \
  nec-ix-lacp-lag nec-ix-ospf-neighbor nec-ix-bgp-neighbor \
  alliedtelesis-lacp-lag alliedtelesis-ospf-neighbor alliedtelesis-bgp-neighbor \
  alaxala-lacp-lag alaxala-ospf-neighbor alaxala-bgp-neighbor \
  yamaha-lacp-lag yamaha-ospf-neighbor yamaha-bgp-neighbor
```
Expected: `28/28 pairs OK`

- [ ] **Step 3: pytest全体(e2e除く)を実行する**

Run: `uv run pytest -k 'not e2e' -q`
Expected: 既存663件 + 新規28件 = `691 passed`(taxonomy drift gate含む)

- [ ] **Step 4: Web側の型チェック/ビルドを実行する**

Run: `cd web && bun run build`
Expected: `tsc -b` がエラーなく完了し、`vite build` が成功する

- [ ] **Step 5: その他Lint(gitleaks/typos等)を実行する**

Run: `uv run pre-commit run --all-files`(pre-commit設定がある場合。無ければ `_typos.toml` に基づき `typos` を実行)
Expected: 新規追加ファイルに機密情報・スペルミスの誤検知がないこと(あれば個別修正)

- [ ] **Step 6: コミットする**

```bash
git add web/src/lib/templates.ts tests/unit/test_template_taxonomy.py
git commit -m "feat(templates): register multivendor interconnect taxonomy

Refs #596"
```

---

## Task 12: PR作成と監視

- [ ] **Step 1:** `git push -u origin claude/multivendor-interconnect-template-q4zq5d` で全コミットをプッシュする。
- [ ] **Step 2:** PRテンプレート(`.github/pull_request_template.md`等)の有無を確認し、あれば構成に沿って本文を作成する。
- [ ] **Step 3:** PRを作成する(Issue #596を引用)。
- [ ] **Step 4:** 作成したPRを`subscribe_pr_activity`で購読する。
- [ ] **Step 5:** CI結果・レビューコメントを監視し、修正が必要なら追加コミットで対応する(マージは実行しない — ユーザーの明示的な承認を待つ)。

---

## Self-Review 結果

- **Spec coverage:** 設計書の2.1(ベンダー構成)・2.2(ID一覧)・2.3(サブカテゴリ)・3(命名/内容規約)・4(実行アーキテクチャ Phase B〜E)・5(リスク)を各Taskでカバー。Phase A(計画)は本Plan自体。
- **Placeholder scan:** Task 2〜10のCLIコマンド本文は「WebSearchで確認してから執筆」という明示的な調査ステップに置き換えている(空白のプレースホルダではなく、確認すべき一次情報源とチェックリストを明示)。Task 1(Cisco BGP)のみ具体コマンドを確定済みで記載。
- **Type consistency:** 全TaskでTOMLフィールド名(`channel_id`/`member_interfaces`/`lacp_mode`/`trunk_vlans`/`load_balance_method`、`router_id`/`area_id`/`ospf_interfaces`/`passive_interfaces`/`reference_bandwidth`、`local_asn`/`router_id`/`neighbor_ip`/`remote_asn`/`neighbor_description`/`advertised_networks`/`bgp_password`)を統一。`templates.ts`のMETA行フォーマットもTask 1と共通テンプレートを踏襲。
