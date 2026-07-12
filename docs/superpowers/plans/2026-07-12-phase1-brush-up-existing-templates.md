# フェーズ1: 既存9テンプレートのブラッシュアップ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存9テンプレート（`assets/examples/*.j2`）に「目的」「用語解説」「動作確認」「注意事項」の4セクションを追加し、研修教材として使える水準にブラッシュアップする。

**Architecture:** 各 `.j2` ファイルの冒頭（タイトル+導入文の直後）に「目的」「用語解説」を挿入し、末尾に「動作確認」（既存に相当するセクションがなければ新設）「注意事項」を追加する。データファイル（toml/yaml/csv）と `web/src/lib/templates.ts` は変更しない。各テンプレートの変更後、Pythonの本物のレンダリングエンジン（`features.config_parser.ConfigParser` + `features.document_render.DocumentRender`）で実際にレンダリングし、Jinja構文エラーが出ないこと・新セクションが出力に含まれることを確認してからコミットする。

**Tech Stack:** Jinja2 テンプレート（`.j2`）、Python 3（`features/config_parser.py` / `features/document_render.py`）、uv

**Issue:** #542（親issue #541）

---

## 共通の検証手順（各タスクで使用）

各タスクの「レンダリング確認」ステップでは、以下のPythonスクリプトパターンを使う。`<id>` と `<ext>` をタスクごとに置き換え、`assert` 対象の文字列をそのタスクで追加した見出し文言に合わせる。

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

実行コマンド: `uv run python -c "$(cat <<'PYEOF'
<上記スクリプト>
PYEOF
)"`

または一時ファイルに保存して `uv run python /tmp/verify_<id>.py` を実行してもよい。`AssertionError` が出た場合はテンプレートの構文・変数参照を見直す。

---

### Task 1: cisco-switchport.j2 のブラッシュアップ

**Files:**
- Modify: `assets/examples/cisco-switchport.j2`

現状（46行）:
```jinja
# スイッチポート設定手順 — {{ global.hostname }}

対象スイッチ **{{ global.hostname }}** に VLAN {{ global.vlans | join(', ') }} を構成し、各ポートを設定します。作業は現地またはコンソール接続で実施してください。

## 1. 設定モードへ入る
...(既存の手順は変更しない)...
```bash
end
write memory
```
```

- [ ] **Step 1: 冒頭に「目的」「用語解説」を挿入する**

3行目（導入文）の直後、5行目（`## 1. 設定モードへ入る`）の前に、以下を挿入する:

```markdown

## 目的

このシナリオでは、Cisco スイッチのポート設定（VLAN 割当・アクセス/トランクモード）を CLI で実施し、ポートの役割を理解した上で安全に設定変更できるようになることを目指します。

## 用語解説

- **VLAN**: 1 台のスイッチを論理的に複数のネットワークに分割する仕組み
- **アクセスポート**: 単一 VLAN に所属する、PC など末端機器を接続するポート
- **トランクポート**: 複数 VLAN のトラフィックを同時に通す、スイッチ間・AP との接続に使うポート
- **ネイティブ VLAN**: トランクポートでタグなしフレームが所属する VLAN
- **CDP**: Cisco 製機器同士が隣接情報を交換するプロトコル
- **特権 EXEC モード / 設定モード**: 機器の操作権限レベル（`enable` / `configure terminal`）
- **write memory**: 実行中の設定（running-config）を起動時設定（startup-config）へ保存するコマンド
```

- [ ] **Step 2: 末尾に「動作確認」「注意事項」を追加する**

ファイル末尾（`write memory\n\`\`\`\n`）の直後に、以下を追加する:

```markdown

## 動作確認

- `show vlan brief` で作成した VLAN が一覧に表示されること
- `show interfaces status` で各ポートの VLAN 割当・トランク状態が意図通りであること
- `show running-config interface <name>` で description・switchport 設定が反映されていること
- 設定変更後、`show running-config` と `show startup-config` に差分がない（保存済み）こと

## 注意事項

- 設定はコンソール接続で実施することを推奨する。リモート接続（SSH等）の設定を誤ると自分の接続が切断されるおそれがある。
- `write memory` を忘れると、機器再起動時に設定が失われる。
- トランクポートの設定を誤ると、意図しない VLAN 間でトラフィックが混在するリスクがある。事前に変更内容を確認してから適用する。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "cisco-switchport"`, `DATA_EXT = "toml"` で実行する。加えて、次の既存内容が壊れていないことも確認する:
```python
assert "## 1. 設定モードへ入る" in content
assert "switchport mode access" in content
```
Expected: 全 assert が通り `OK: cisco-switchport` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/cisco-switchport.j2
git commit -m "$(cat <<'EOF'
docs(templates): add purpose/glossary/verification/caution to cisco-switchport (#542)

Refs #541
EOF
)"
```

---

### Task 2: yamaha-router.j2 のブラッシュアップ

**Files:**
- Modify: `assets/examples/yamaha-router.j2`

- [ ] **Step 1: 冒頭に「目的」「用語解説」を挿入する**

3行目（導入文）の直後、5行目（`## 1. LAN 側インターフェース`）の前に、以下を挿入する:

```markdown

## 目的

YAMAHA RTX ルータの LAN / PPPoE / IP フィルタ / NAT 設定を CLI で構築し、家庭用ルータとは異なる業務用ルータの設定体系（administrator モード、`pp select`、IP フィルタ番号体系）を理解できるようになることを目指します。

## 用語解説

- **PPPoE**: イーサネット上で PPP 接続を確立し、ISP と認証を行う仕組み
- **IP フィルタ**: パケットの通過可否を番号付きルールで制御する仕組み（YAMAHA 機特有の番号体系）
- **NAT（IP マスカレード）**: 複数の内部端末が 1 つのグローバル IP を共有して外部通信する仕組み
- **MTU / MRU**: 1 回の通信で送受信できるデータの最大サイズ
- **administrator モード**: 設定変更が可能な最上位権限モード
- **デフォルトルート**: 該当するルートがない場合に使われる経路
```

- [ ] **Step 2: 末尾に「動作確認」「注意事項」を追加する**

ファイル末尾（`save\n\`\`\`\n`）の直後に、以下を追加する:

```markdown

## 動作確認

- `show status pp 1` で PPPoE セッションが UP 状態であること
- `show ip route` で設定した経路（デフォルトルート含む）が反映されていること
- `show nat descriptor address` で NAT が有効になっていること
- LAN 内端末からインターネット宛の疎通（ping 等）が成功すること

## 注意事項

- WAN 側の設定変更中にコンソールへの経路が失われないよう、必ず LAN 内から作業しコンソール接続を確保しておく。
- IP フィルタの適用順序を誤ると、意図しない通信が遮断・許可されるおそれがある。適用前に必ずフィルタ一覧を確認する。
- `save` コマンドを忘れると再起動時に設定が失われる。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "yamaha-router"`, `DATA_EXT = "toml"` で実行する。加えて:
```python
assert "pp select 1" in content
```
Expected: 全 assert が通り `OK: yamaha-router` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/yamaha-router.j2
git commit -m "$(cat <<'EOF'
docs(templates): add purpose/glossary/verification/caution to yamaha-router (#542)

Refs #541
EOF
)"
```

---

### Task 3: linux-init.j2 のブラッシュアップ

**Files:**
- Modify: `assets/examples/linux-init.j2`

- [ ] **Step 1: 冒頭に「目的」「用語解説」を挿入する**

3行目（導入文）の直後、5行目（`## 1. ホスト名とタイムゾーン`）の前に、以下を挿入する:

```markdown

## 目的

Linux サーバの初期セットアップ（ホスト名・ユーザー作成・SSH 鍵配置・パッケージ導入・ファイアウォール有効化）を CLI で一巡し、新規サーバを安全に払い出すための標準手順を理解できるようになることを目指します。

## 用語解説

- **ホスト名**: サーバを識別する名前（`hostnamectl` で設定）
- **SSH 公開鍵認証**: 秘密鍵を持つ者だけがログインできる認証方式
- **authorized_keys**: ログインを許可する公開鍵の一覧ファイル
- **sudo**: 一般ユーザーが管理者権限でコマンドを実行する仕組み
- **ufw**: Linux のファイアウォールを簡易に操作するフロントエンド
- **PermitRootLogin / PasswordAuthentication**: `sshd_config` の認証関連設定項目
```

- [ ] **Step 2: 末尾に「動作確認」「注意事項」を追加する**

ファイル末尾（`ufw --force enable\n\`\`\`\n`）の直後に、以下を追加する:

```markdown

## 動作確認

- `hostnamectl` `timedatectl` の表示が設定値と一致すること
- 作成したユーザーで鍵認証による SSH ログインが成功すること
- `sshd -t` が構文エラーなく通り、`systemctl status sshd` が active であること
- `ufw status` で許可したポートのみが開いていること

## 注意事項

- `PasswordAuthentication no` を設定する前に、必ず鍵認証でログインできることを別セッションで確認する（自分をロックアウトするリスクがある）。
- `ufw enable` はデフォルトで許可していないポートへの接続を遮断する。作業に使っているポート（SSH等）を確実に許可してから有効化する。
- 秘密鍵は演習環境外に持ち出さず、共有・送信しない。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "linux-init"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "useradd -m -s /bin/bash" in content
```
Expected: 全 assert が通り `OK: linux-init` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/linux-init.j2
git commit -m "$(cat <<'EOF'
docs(templates): add purpose/glossary/verification/caution to linux-init (#542)

Refs #541
EOF
)"
```

---

### Task 4: dns-zone.j2 のブラッシュアップ

**Files:**
- Modify: `assets/examples/dns-zone.j2`

- [ ] **Step 1: 冒頭に「目的」「用語解説」を挿入する**

3行目（導入文）の直後、5行目（`## 1. ゾーンファイルを作成する`）の前に、以下を挿入する:

```markdown

## 目的

BIND の DNS ゾーンファイルを作成し、SOA / NS / MX / A / TXT（SPF・DKIM・DMARC）を含む権威 DNS の基本構成を理解し、構文チェックから反映・反引き確認までの一連の流れを実施できるようになることを目指します。

## 用語解説

- **ゾーンファイル**: あるドメインの DNS レコードをまとめたファイル
- **SOA レコード**: ゾーンの管理情報（シリアル・再取得間隔等）を持つレコード
- **シリアル番号**: ゾーンの更新を表す番号。更新のたびに増やす必要がある
- **NS / MX / A レコード**: それぞれ権威サーバ・メールサーバ・ホストの IP アドレスを示すレコード
- **SPF / DKIM / DMARC**: メールの送信元を認証するための仕組み（TXT レコードで公開）
- **named-checkzone / named-checkconf**: 反映前に構文を検証するコマンド
```

- [ ] **Step 2: 末尾に「動作確認」「注意事項」を追加する**

ファイル末尾（`dig @{{ soa.primary_ns }} {{ origin }} MX +short\n\`\`\`\n`）の直後に、以下を追加する:

```markdown

## 動作確認

- `named-checkzone` `named-checkconf` がエラーなく通ること
- `dig @<NS> <ドメイン> SOA +short` で設定したシリアルが返ること
- `dig @<NS> <ドメイン> MX +short` で設定したメールサーバが返ること
- `rndc reload` 実行後にエラーが出力されないこと

## 注意事項

- レコードを更新したのに SOA のシリアルを進め忘れると、セカンダリ DNS や外部キャッシュに変更が伝搬しない。
- 反映前に必ず `named-checkzone` / `named-checkconf` で構文を検証し、エラーがある状態で `rndc reload` しない。
- 本番ドメインで演習する場合は実際のメール配送・Web 公開に影響するため、必ずテスト用ドメインまたは検証環境で実施する。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "dns-zone"`, `DATA_EXT = "toml"` で実行する。加えて:
```python
assert "IN SOA" in content
```
Expected: 全 assert が通り `OK: dns-zone` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/dns-zone.j2
git commit -m "$(cat <<'EOF'
docs(templates): add purpose/glossary/verification/caution to dns-zone (#542)

Refs #541
EOF
)"
```

---

### Task 5: incident-campus.j2 のブラッシュアップ

**Files:**
- Modify: `assets/examples/incident-campus.j2`

- [ ] **Step 1: 冒頭に「目的」「用語解説」を挿入する**

4行目（`- **重要度**: {{ severity }}`）の直後、5行目（空行）・6行目（`## 切り分けステップ`）の前に、以下を挿入する:

```markdown

## 目的

「特定棟でネットワーク接続不可」という障害を、物理層→L2→L3/DHCP の順に切り分ける標準的な障害対応の型を身につけることを目指します。

## 用語解説

- **物理層**: ケーブル・リンクランプなど物理的な接続状態
- **L2（データリンク層）**: VLAN・STP等、スイッチ間の論理的な接続
- **L3 / DHCP**: IP アドレスの割当・経路（ゲートウェイ）に関わる層
- **STP**: ループを防ぐためスイッチ間の経路を自動制御するプロトコル
- **DHCP スコープ**: DHCP サーバが払い出せる IP アドレスの範囲
- **エスカレーション**: 自分で解決できない場合に上位・専門チームへ引き継ぐこと
```

- [ ] **Step 2: 末尾に「動作確認」「注意事項」を追加する**

ファイル末尾（`解決しない場合は **{{ escalation }}** へ連絡する。\n`）の直後に、以下を追加する:

```markdown

## 動作確認

- 切り分け手順の各ステップで「正常/異常」の判定結果が記録されていること
- 異常と判定した層への対処実施後、上位層の症状（接続不可）が解消していること
- 解消しない場合、エスカレーション先への連絡記録が残っていること

## 注意事項

- 本シナリオは演習用の疑似障害であり、実際の障害対応時は必ず影響範囲・利用者への周知を先に行う。
- 物理層の作業（SW再起動・ケーブル交換）は他利用者の通信も一時的に切断するため、実施前に影響範囲を確認する。
- 自己判断で解決が難しい場合は、手順に従い早めにエスカレーションする。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "incident-campus"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "## 切り分けステップ" in content
```
Expected: 全 assert が通り `OK: incident-campus` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/incident-campus.j2
git commit -m "$(cat <<'EOF'
docs(templates): add purpose/glossary/verification/caution to incident-campus (#542)

Refs #541
EOF
)"
```

---

### Task 6: incident-proxy.j2 のブラッシュアップ

**Files:**
- Modify: `assets/examples/incident-proxy.j2`

- [ ] **Step 1: 冒頭に「目的」「用語解説」を挿入する**

4行目（`- **除外 (no_proxy)**: ...`）の直後、5行目（空行）・6行目（`## 確認手順`）の前に、以下を挿入する:

```markdown

## 目的

「社内プロキシ経由で特定 SaaS に接続できない」という障害を、環境変数→プロキシ到達性→除外設定→TLS証明書の順に切り分けられるようになることを目指します。

## 用語解説

- **プロキシサーバ**: クライアントの代わりに外部通信を中継するサーバ
- **http_proxy / https_proxy**: プロキシ経由での通信先を指定する環境変数
- **no_proxy**: プロキシを経由せず直接通信する宛先の一覧
- **407 エラー**: プロキシ認証が必要であることを示す HTTP ステータス
- **社内 CA（認証局）**: 組織が発行する TLS 証明書の検証元
```

- [ ] **Step 2: 末尾に「動作確認」「注意事項」を追加する**

ファイル末尾（`{% endfor %}\n`）の直後に、以下を追加する:

```markdown

## 動作確認

- 環境変数 `http_proxy` / `https_proxy` が意図した値に設定されていること
- `curl -x $http_proxy -I <対象URL>` が 200 番台のレスポンスを返すこと
- `no_proxy` に対象ドメインが誤って含まれていないこと
- TLS 証明書検証エラーが解消していること

## 注意事項

- プロキシ認証情報（ID/パスワード）は環境変数やコマンド履歴に平文で残さないよう注意する。
- `no_proxy` の設定を誤ると、社内向け通信が誤ってプロキシ経由になり接続できなくなる場合がある。
- 社内 CA 証明書の追加はシステム全体の TLS 検証に影響するため、検証環境で内容を確認してから適用する。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "incident-proxy"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "## 確認手順" in content
```
Expected: 全 assert が通り `OK: incident-proxy` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/incident-proxy.j2
git commit -m "$(cat <<'EOF'
docs(templates): add purpose/glossary/verification/caution to incident-proxy (#542)

Refs #541
EOF
)"
```

---

### Task 7: firewall-rules.j2 のブラッシュアップ

**Files:**
- Modify: `assets/examples/firewall-rules.j2`

- [ ] **Step 1: 冒頭に「目的」「用語解説」を挿入する**

5行目（`バックエンドを前提に、root 権限で上から順に実行してください。`）の直後、6行目（空行）・7行目（`## 1. 投入するルール一覧`）の前に、以下を挿入する:

```markdown

## 目的

CSV で定義したアクセス制御ルールを firewalld の rich rule として一括投入し、Rocky Linux におけるゾーン・permanent/runtime の概念を理解した上で安全に反映できるようになることを目指します。

## 用語解説

- **firewalld**: Rocky Linux / RHEL 系で標準のファイアウォール管理サービス
- **zone（ゾーン）**: 信頼度に応じて通信ルールをまとめる単位（public/internal/dmz等）
- **rich rule**: 送信元・ポート・プロトコル等を細かく指定できる firewalld のルール記法
- **--permanent**: 再起動後も残る永続設定として登録するオプション（即時反映はされない）
- **reject と drop の違い**: reject は拒否応答を返し、drop は無応答で破棄する
```

- [ ] **Step 2: 末尾に「動作確認」「注意事項」を追加する**

ファイル末尾（`> 意図に応じて使い分けてください。\n`）の直後に、以下を追加する:

```markdown

## 動作確認

- `firewall-cmd --state` が running であること
- `firewall-cmd --list-all-zones` に投入した全ルールが反映されていること
- 許可したはずの通信（例: HTTPS）が成功し、拒否したはずの通信が失敗すること
- `firewall-cmd --reload` 実行後もルールが消えていないこと（--permanent で投入したか確認）

## 注意事項

- `--permanent` のみでは即時反映されない。必ず `firewall-cmd --reload` まで実施してから動作確認する。
- SSH 等、自分の接続に使っているポートを誤って拒否ルールにすると、リモート作業中の場合は接続が切断されるおそれがある。
- 本番環境に適用する前に、CSV の内容を必ず確認し、意図しないポート公開がないか確認する。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "firewall-rules"`, `DATA_EXT = "csv"` で実行する。加えて:
```python
assert "add-rich-rule" in content
```
Expected: 全 assert が通り `OK: firewall-rules` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/firewall-rules.j2
git commit -m "$(cat <<'EOF'
docs(templates): add purpose/glossary/verification/caution to firewall-rules (#542)

Refs #541
EOF
)"
```

---

### Task 8: dgx-spark-ollama.j2 のブラッシュアップ

**Files:**
- Modify: `assets/examples/dgx-spark-ollama.j2`

この テンプレートには既に `## 8. 動作確認` という節が存在する（curl での実確認コマンド）。重複を避けるため、新しい「動作確認」見出しは追加せず、既存の `## 8. 動作確認` をそのまま活用する。追加するのは「目的」「用語解説」（冒頭）と「注意事項」（末尾）のみ。

- [ ] **Step 1: 冒頭に「目的」「用語解説」を挿入する**

3行目（導入文）の直後、5行目（`## 1. ホスト名・タイムゾーン・パッケージ更新`）の前に、以下を挿入する:

```markdown

## 目的

DGX Spark 上に ollama による LLM 推論サーバを構築し、初期設定・SSH 堅牢化・ufw による LAN 内限定公開・モデル取得までを CLI で一貫して実施できるようになることを目指します。

## 用語解説

- **ollama**: ローカルで LLM を動かすための推論サーバソフトウェア
- **systemd オーバーライド**: 既存の systemd ユニットの設定を上書きする仕組み
- **OLLAMA_HOST**: ollama がどのアドレス・ポートで待ち受けるかを指定する環境変数
- **ufw**: Linux のファイアウォールを簡易に操作するフロントエンド
- **LAN 内限定公開**: インターネットには公開せず、社内ネットワークからのみアクセス可能にする構成
```

- [ ] **Step 2: 末尾に「注意事項」を追加する**

ファイル末尾（`> ここまでで API は LAN 内に平文 HTTP で公開されています。商用運用では「ゼロトラストアクセス基盤構築」テンプレートで mTLS 化してください。\n`）の直後に、以下を追加する:

```markdown

## 注意事項

- ここで構築する API は LAN 内に平文 HTTP で公開される。商用運用では「ゼロトラストアクセス基盤構築」テンプレートで別途 mTLS 化すること。
- `PasswordAuthentication no` を設定する前に、必ず鍵での SSH ログインができることを確認する（自分をロックアウトするリスクがある）。
- ufw のルールはクライアント単位で許可するため、許可対象 IP の記載漏れ・誤りがあるとアクセスできない、または意図せず広く公開してしまう。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "dgx-spark-ollama"`, `DATA_EXT = "yaml"` で実行する。ただし `## 動作確認` の assert は既存の `## 8. 動作確認` を対象にするため、以下に読み替える:
```python
assert "## 目的" in content
assert "## 用語解説" in content
assert "## 8. 動作確認" in content
assert "## 注意事項" in content
assert "ollama pull" in content
```
Expected: 全 assert が通り `OK: dgx-spark-ollama` に相当する出力が得られる（print文のtitleは適宜読み替え）。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/dgx-spark-ollama.j2
git commit -m "$(cat <<'EOF'
docs(templates): add purpose/glossary/caution to dgx-spark-ollama (#542)

Reuses the existing "## 8. 動作確認" section instead of adding a
duplicate verification heading.

Refs #541
EOF
)"
```

---

### Task 9: zero-trust-access.j2 のブラッシュアップ

**Files:**
- Modify: `assets/examples/zero-trust-access.j2`

このテンプレートには既に `## 9. 検証` という節が存在する（証明書なし拒否・証明書あり成功・平文経路閉鎖の確認コマンド）。重複を避けるため、新しい「動作確認」見出しは追加せず、既存の `## 9. 検証` をそのまま活用する。追加するのは「目的」「用語解説」（冒頭）と「注意事項」（末尾）のみ。

- [ ] **Step 1: 冒頭に「目的」「用語解説」を挿入する**

3行目（導入文）の直後、4行目（空行）・5行目（`方針:`）の前に、以下を挿入する:

```markdown

## 目的

step-ca + Caddy によるゼロトラストアクセス基盤を構築し、証明書による本人性確認・mTLS 終端・SSH 証明書認証への移行を、ロックアウトを防ぎながら安全な順序で実施できるようになることを目指します。

## 用語解説

- **ゼロトラスト**: ネットワークの場所を信用せず、都度本人性を確認する考え方
- **mTLS（相互TLS）**: サーバだけでなくクライアントも証明書で認証する TLS 方式
- **CA（認証局）**: 証明書を発行・管理するサーバ
- **短命クレデンシャル**: 有効期限を短く設定した証明書・鍵
- **プロビジョナー**: CA が証明書発行者を認証する仕組み
```

- [ ] **Step 2: 末尾に「注意事項」を追加する**

ファイル末尾（`{% for c in clients %}curl https://{{ services[0].fqdn }}/api/version --cacert root_ca.crt --cert {{ c.device }}.crt --key {{ c.device }}.key   # {{ c.user }}: 成功すること\n{% endfor %}\`\`\`\n`）の直後に、以下を追加する:

```markdown

## 注意事項

- SSH 証明書認証への切替は、証明書ログインが確認できるまでパスワード認証・静的鍵を無効化しない（手順の順序を守らないとロックアウトする）。
- `plaintext_allows` は dgx-spark-ollama テンプレートで開けた IP・ポートと必ず一致させる。一致しないと mTLS を迂回する平文経路が残る。
- CA の provisioner パスワードや証明書の秘密鍵は、演習後も安全に管理し、不要になったら失効（`step ca revoke`）する。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "zero-trust-access"`, `DATA_EXT = "yaml"` で実行する。ただし `## 動作確認` の assert は既存の `## 9. 検証` を対象にするため、以下に読み替える:
```python
assert "## 目的" in content
assert "## 用語解説" in content
assert "## 9. 検証" in content
assert "## 注意事項" in content
assert "step ca certificate" in content
```
Expected: 全 assert が通り、出力が得られる。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/zero-trust-access.j2
git commit -m "$(cat <<'EOF'
docs(templates): add purpose/glossary/caution to zero-trust-access (#542)

Reuses the existing "## 9. 検証" section instead of adding a
duplicate verification heading.

Refs #541
EOF
)"
```

---

### Task 10: 全体検証とPR作成

**Files:**
- なし（既存ファイルの検証のみ）

- [ ] **Step 1: TypeScript型チェックとWebテストを実行する**

このフェーズでは `web/src/lib/templates.ts` を変更していないため、テンプレート本文の変更が glob 読込や UI に影響しないことの回帰確認として実行する。

```bash
cd web && npx tsc --noEmit && npm test
```
Expected: 型エラー0件、既存テスト全件PASS（テンプレート内容には依存しないため、既存のPASS件数から変化しないはずである）。

- [ ] **Step 2: Python側の既存テストを実行する**

```bash
uv run pytest -k 'not e2e'
```
Expected: 既存テスト全件PASS（`assets/examples/` の内容に依存する既存テストはない前提だが、念のため確認する）。

- [ ] **Step 3: 9テンプレート全件の一括レンダリング確認**

以下のスクリプトを `uv run python -` で実行し、9テンプレート全てが例外なくレンダリングされることを一括確認する。

```python
import sys
from io import BytesIO

sys.path.insert(0, ".")
from features.config_parser import ConfigParser
from features.document_render import DocumentRender

TARGETS = [
    ("cisco-switchport", "toml"),
    ("yamaha-router", "toml"),
    ("linux-init", "yaml"),
    ("dns-zone", "toml"),
    ("incident-campus", "yaml"),
    ("incident-proxy", "yaml"),
    ("firewall-rules", "csv"),
    ("dgx-spark-ollama", "yaml"),
    ("zero-trust-access", "yaml"),
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
    assert "## 注意事項" in content, template_id
    print(f"OK: {template_id}")

print("ALL OK")
```
Expected: `OK: <id>` が9行出力され、最後に `ALL OK` が表示される。

- [ ] **Step 4: developブランチとの差分を確認する**

```bash
git status
git log --oneline develop..HEAD
```
Expected: `assets/examples/*.j2` の9ファイルの変更のみがコミットされている。データファイル（toml/yaml/csv）と `web/` 配下は変更なし。

- [ ] **Step 5: PRを作成する**

`gh` CLI や GitHub MCP の `create_pull_request` を用いて、`develop` ブランチ向けにPRを作成する。タイトル・本文は実際の変更内容から作成し、`Refs #541` `Closes #542` を含める。作成後は `subscribe_pr_activity` でCI・レビューを監視する。
