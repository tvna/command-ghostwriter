# フェーズ5: ネットワーク/サーバ基礎シナリオ8本の追加 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `assets/examples/` に新規シナリオ8本（file-permissions, connectivity-check, systemd-unit-basics, port-listening-check, cron-scheduling, subnetting-basics, ntp-chrony, disk-mount-basics）を `<id>.<format>` + `<id>.j2` のペアとして追加し、`web/src/lib/templates.ts` の `META` 配列に登録する。

**Architecture:** 各シナリオは独立した1ファイルペア（データファイル + Jinja2テンプレート）で、既存9本・フェーズ1ブラッシュアップ後の6セクション構成（目的/用語解説/シナリオ設定/手順/動作確認/注意事項）に従う。`templates.ts` の変更は各シナリオにつき `META` 配列へ1行追加するのみで、既存エントリには触れない。データファイル・`Meta`型・レンダリングエンジン（`features/`）は変更しない。各タスクの末尾で本物のレンダリングエンジンでの描画確認を行い、strict-undefinedでエラーなくMarkdownが生成されることを確認してからコミットする。

**Tech Stack:** Jinja2 テンプレート（`.j2`）、TOML/YAML/CSV データファイル、TypeScript（`web/src/lib/templates.ts`）、Python 3（`features/config_parser.py` / `features/document_render.py`）、uv、Vite/Vitest

**Issue:** #548（親issue #541、フェーズ1: #542 / PR #543 が参考実装）

---

## 共通の検証手順（各タスクで使用）

各タスクの「レンダリング確認」ステップでは、以下のPythonスクリプトパターンを使う。`<id>` と `<ext>` をタスクごとに置き換え、`assert` 対象の見出し文言はどのタスクも共通（6セクション構成）。

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
<上記スクリプトを<id>/<ext>を置き換えて貼り付け>
PYEOF
)"`

`AssertionError` が出た場合はテンプレートの構文・変数参照（`data.field` のtypo、`csv_rows` の列名相違等）を見直す。CSVの列は `csv_rows` の各要素が辞書（`row["列名"]`）としてアクセスできる（`firewall-rules.j2` を参照）。

---

### Task 1: file-permissions シナリオの追加

**Files:**
- Create: `assets/examples/file-permissions.csv`
- Create: `assets/examples/file-permissions.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

`assets/examples/file-permissions.csv`:
```csv
path,type,owner,group,perm,description
/srv/shared,dir,root,dev-team,2775,部門共有ディレクトリ(setgidでグループ継承)
/srv/shared/reports,dir,root,dev-team,2770,レポート格納(グループのみアクセス)
/srv/shared/reports/monthly.csv,file,ops,dev-team,0660,月次レポート(グループ読み書き)
/srv/shared/public,dir,root,dev-team,0755,公開用ディレクトリ(全員読み取り可)
/srv/shared/public/notice.txt,file,ops,dev-team,0644,お知らせファイル
```

- [ ] **Step 2: テンプレートを作成する**

`assets/examples/file-permissions.j2`:
```jinja
# ファイルパーミッションと所有者管理演習

演習用の部門共有ディレクトリツリーを作成し、パーミッション・所有者・グループを CSV の定義通りに設定します。root 権限（sudo）で実施してください。

## 目的

rwx と 8進表記の対応、ファイルとディレクトリで権限の意味が異なることを理解し、`chmod`/`chown` で部門共有ディレクトリを設計できるようになることを目指します。

## 用語解説

- **パーミッション**: ファイル・ディレクトリへの読み取り(r)・書き込み(w)・実行(x)の許可設定
- **所有者とグループ**: 各ファイルには所有者(1名)と所有グループ(1つ)が紐づき、それぞれに独立した権限を設定できる
- **8進表記**: rwx を2進数(4+2+1)とみなし、所有者・グループ・その他の3桁で権限を表す方式(例: `0775`)
- **実行ビット**: ディレクトリでは「中に入れる(cd できる)」ことを意味し、ファイルの実行権限とは意味が異なる
- **setgid**: ディレクトリに設定すると、その中に新規作成されたファイル・ディレクトリの所有グループが自動的に親ディレクトリのグループを継承する(8進表記の先頭に `2` を付与)
- **umask**: 新規作成時のデフォルト権限から差し引かれるマスク値
- **`ls -l` の読み方**: 先頭10文字のうち1文字目がファイル種別(`d`=ディレクトリ)、残り9文字が所有者/グループ/その他それぞれの rwx

## シナリオ設定

部門共有ディレクトリ `/srv/shared` 配下に、CSV で定義した権限構成を適用します。対象は {{ csv_rows | length }} 件です。

| path | type | owner | group | perm | description |
|------|------|-------|-------|------|------|
{% for r in csv_rows %}| {{ r["path"] }} | {{ r["type"] }} | {{ r["owner"] }} | {{ r["group"] }} | {{ r["perm"] }} | {{ r["description"] }} |
{% endfor %}

## 手順

### 1. 演習用グループとユーザーを作成する

```bash
groupadd -f dev-team
id ops >/dev/null 2>&1 || useradd -m -G dev-team ops
id trainee >/dev/null 2>&1 || useradd -m -G dev-team trainee
```

### 2. `ls -l` の読み方を確認する

```bash
touch /tmp/sample.txt
ls -l /tmp/sample.txt
# 例: -rw-r--r-- 1 root root 0 Jul 13 10:00 /tmp/sample.txt
# 1文字目: ファイル種別(-=通常ファイル, d=ディレクトリ)
# 2-4文字目: 所有者の rwx / 5-7文字目: グループの rwx / 8-10文字目: その他の rwx
```

### 3. ディレクトリ・ファイルを作成する

```bash
{% for r in csv_rows %}{% if r["type"] == "dir" %}mkdir -p {{ r["path"] }}
{% else %}touch {{ r["path"] }}
{% endif %}{% endfor %}```

### 4. 8進表記とシンボリック表記の両方で `chmod` する

CSV定義の8進表記(先頭が `2` のものは setgid 付き)を適用します。

```bash
{% for r in csv_rows %}chmod {{ r["perm"] }} {{ r["path"] }}
{% endfor %}```

参考: シンボリック表記でも同じ結果を得られます(例: `chmod u=rwx,g=rwx,o=rx {{ csv_rows[0]["path"] }}`)。

### 5. 所有者・グループを変更する

```bash
{% for r in csv_rows %}chown {{ r["owner"] }}:{{ r["group"] }} {{ r["path"] }}
{% endfor %}```

### 6. umask を確認する

```bash
umask
sudo -u ops bash -c 'umask; touch /srv/shared/public/umask-test.txt; ls -l /srv/shared/public/umask-test.txt'
```

### 7. setgid によるグループ継承を確認する

```bash
sudo -u ops bash -c 'touch /srv/shared/inherited.txt; ls -l /srv/shared/inherited.txt'
# グループが dev-team になっていれば setgid によるグループ継承が機能している
```

### 8. 別ユーザー視点でアクセス可否をテストする

```bash
sudo -u trainee bash -c 'cat /srv/shared/reports/monthly.csv && echo "read: OK"'
sudo -u trainee bash -c 'echo test >> /srv/shared/public/notice.txt && echo "write: OK" || echo "write: DENIED"'
```

## 動作確認

- `stat -c '%a %U %G' <path>` の出力がCSV定義の `perm`/`owner`/`group` と一致すること
- 別ユーザー(`ops`/`trainee`)での読み書き可否がパーミッション定義通りであること
- `/srv/shared` 配下に作成した新規ファイルの所有グループが `dev-team` に継承されること(setgid)

## 注意事項

- 権限変更は対象パスを誤ると意図しないファイルへのアクセスを許可・拒否してしまうため、演習用ディレクトリ(`/srv/shared` 配下)に限定して実施する。
- 本番の共有ディレクトリで同様の変更を行う場合は、既存ファイルへの影響範囲を事前に洗い出し、業務時間外など影響の小さいタイミングで実施する。
- 演習後は `rm -rf /srv/shared` および作成した演習用ユーザー(`userdel -r trainee` 等)で環境を元に戻す。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

`web/src/lib/templates.ts` の `META` 配列の最後のエントリ(`zero-trust-access`)の直後に追加する:

```typescript
  { id: "file-permissions", name: "ファイルパーミッションと所有者管理", desc: "rwxと8進表記、setgidによるグループ継承を、chmod/chownを使った部門共有ディレクトリ設計の手順書（Markdown）として生成。", category: "server", subCategory: "パーミッション", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

Run:
```bash
uv run python -c "$(cat <<'PYEOF'
import sys
from io import BytesIO

sys.path.insert(0, ".")
from features.config_parser import ConfigParser
from features.document_render import DocumentRender

TEMPLATE_ID = "file-permissions"
DATA_EXT = "csv"

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
PYEOF
)"
```
Expected: `OK: file-permissions` printed, no `AssertionError`.

- [ ] **Step 5: Commit**

```bash
git add assets/examples/file-permissions.csv assets/examples/file-permissions.j2 web/src/lib/templates.ts
git commit -m "feat: add file-permissions training scenario (#548)"
```

---

### Task 2: connectivity-check シナリオの追加

**Files:**
- Create: `assets/examples/connectivity-check.csv`
- Create: `assets/examples/connectivity-check.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

`assets/examples/connectivity-check.csv`:
```csv
stage,target,method,note
loopback,127.0.0.1,ping,自ホストのループバックアドレス
self,192.168.1.10,ping,自ホストのIPアドレス
gateway,192.168.1.1,ping,デフォルトゲートウェイ
external,8.8.8.8,ping,外部の既知IP(DNS非依存の確認)
fqdn,www.example.com,ping,FQDN宛(名前解決込みの疎通確認)
trace,8.8.8.8,traceroute,経路上の各ホップを確認
```

- [ ] **Step 2: テンプレートを作成する**

`assets/examples/connectivity-check.j2`:
```jinja
# ping・traceroute による疎通確認演習

「自分 → GW → 外部IP → FQDN」の順にレイヤごとの疎通を切り分ける型を、CSV で定義したチェック表に沿って実施します。

## 目的

「自分→GW→外部IP→FQDN」のレイヤ順に疎通を切り分ける型を身につけ、結果(ロス・RTT・`*`表示)を正しく解釈できるようになることを目指します。

## 用語解説

- **ICMP**: `ping`/`traceroute` が使う、到達性確認のためのプロトコル
- **RTT (Round Trip Time)**: パケットが往復するのにかかった時間
- **TTL (Time To Live)**: パケットが経由できる最大ホップ数。0になると破棄され、送信元に通知が返る
- **デフォルトゲートウェイ**: 自分のネットワークの外へ出る際に最初に経由するルータ
- **パケットロス**: 送信したパケットのうち応答が返ってこなかった割合
- **ホップ**: 経路上を中継するルータ1台分の区間
- **名前解決**: FQDN(ホスト名)をIPアドレスに変換する処理。`ping <FQDN>` は名前解決も含めて確認できる

## シナリオ設定

以下のチェック表に沿って、自ホスト → ゲートウェイ → 外部 → FQDN の順に疎通を確認します。対象は {{ csv_rows | length }} 件です。

| stage | target | method | note |
|-------|--------|--------|------|
{% for r in csv_rows %}| {{ r["stage"] }} | {{ r["target"] }} | {{ r["method"] }} | {{ r["note"] }} |
{% endfor %}

## 手順

### 1. 自ホストのアドレスと経路情報を確認する

```bash
ip a
ip route
```

### 2. チェック表の各段階を順に確認する

```bash
{% for r in csv_rows %}{% if r["method"] == "ping" %}ping -c 4 {{ r["target"] }}   # {{ r["stage"] }}: {{ r["note"] }}
{% elif r["method"] == "traceroute" %}traceroute {{ r["target"] }}   # {{ r["stage"] }}: {{ r["note"] }}
{% endif %}{% endfor %}```

### 3. 結果を記録する

各段階の成否(ロス率・RTT・`*`表示の有無)を控えておきます。

```bash
{% for r in csv_rows %}echo "{{ r['stage'] }}: <ここに結果を記入>"
{% endfor %}```

## 動作確認

- 各段階の成否が表として揃うこと
- loopback / self / gateway でロス率0%・RTTが妥当な範囲であること
- traceroute の1ホップ目がデフォルトゲートウェイのアドレスと一致すること
- fqdn 段階で名前解決が成功し、external 段階と近いRTTが得られること

## 注意事項

- ICMPがファイアウォールで遮断される環境では `*` 表示や `ping` 無応答が正常な場合もあるため、結果だけで即断せず経路上のポリシー(ICMP遮断設定の有無)も確認する。
- 外部の宛先(`8.8.8.8` 等)へは演習中に短時間・少数回のみ実施し、継続的な負荷をかけない。
- 演習環境が実機のネットワークと異なる場合、`target` のIPアドレス・FQDNは自分の環境の値に読み替える。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

`file-permissions` の直後に追加する:

```typescript
  { id: "connectivity-check", name: "ping・tracerouteによる疎通確認", desc: "自分→GW→外部IP→FQDNの順に疎通を切り分ける、pingとtracerouteによる標準チェック手順書（Markdown）を生成。", category: "network", subCategory: "疎通確認", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

Run（`TEMPLATE_ID = "connectivity-check"`, `DATA_EXT = "csv"` に置き換えて共通スクリプトを実行、Task 1と同じ手順）。
Expected: `OK: connectivity-check` printed, no `AssertionError`.

- [ ] **Step 5: Commit**

```bash
git add assets/examples/connectivity-check.csv assets/examples/connectivity-check.j2 web/src/lib/templates.ts
git commit -m "feat: add connectivity-check training scenario (#548)"
```

---

### Task 3: systemd-unit-basics シナリオの追加

**Files:**
- Create: `assets/examples/systemd-unit-basics.toml`
- Create: `assets/examples/systemd-unit-basics.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

`assets/examples/systemd-unit-basics.toml`:
```toml
[practice]
existing_service = "sshd"

[unit]
name = "training-heartbeat"
description = "Training heartbeat logger (education)"
exec_start = "/usr/local/bin/heartbeat.sh"
working_directory = "/opt/training"
user = "trainee"
restart = "on-failure"
restart_sec = 5

[script]
path = "/usr/local/bin/heartbeat.sh"
log_path = "/var/log/training-heartbeat.log"
interval_seconds = 10
```

- [ ] **Step 2: テンプレートを作成する**

`assets/examples/systemd-unit-basics.j2`:
```jinja
# systemd サービスの基本操作とユニット作成演習

既存サービスの start/stop/restart を練習した後、自作スクリプトを systemd サービスとして登録し、自動起動まで設定します。root 権限（sudo）で実施してください。

## 目的

start/stop/restart/enable/disable の違いを理解し、自作スクリプトをサービスユニットとして登録・自動起動設定できるようになることを目指します。

## 用語解説

- **systemd**: Linux の初期化・サービス管理システム。デーモンの起動順序や依存関係を管理する
- **ユニット**: systemd が管理する対象(サービス・タイマー等)の設定単位。`.service` ファイルで定義する
- **デーモン**: バックグラウンドで常駐して動作するプロセス
- **enable と start の違い**: `enable` は次回起動時から自動起動する設定、`start` は今すぐ起動すること。両者は独立している
- **daemon-reload**: unit ファイルを編集した後、systemd に変更を再読み込みさせるコマンド。忘れると変更が反映されない
- **journal**: systemd がサービスのログを一元管理する仕組み。`journalctl` で参照する
- **target**: 複数のユニットをまとめて起動するグループ(例: `multi-user.target`)

## シナリオ設定

既存サービス **{{ practice.existing_service }}** で start/stop/restart を練習した後、`{{ unit.name }}` という名前の自作サービスユニットを作成します。

## 手順

### 1. `systemctl status` の読み方を確認する

```bash
systemctl status {{ practice.existing_service }}
# Loaded 行: unit ファイルの読み込み状態とパス
# Active 行: 現在の稼働状態(active (running) / inactive (dead) 等)
```

### 2. 既存サービスで start/stop/restart を練習する

```bash
systemctl stop {{ practice.existing_service }}
systemctl status {{ practice.existing_service }}
systemctl start {{ practice.existing_service }}
systemctl restart {{ practice.existing_service }}
```

### 3. 常駐する簡単なスクリプトを作成する

```bash
mkdir -p {{ unit.working_directory }}
cat > {{ script.path }} <<'EOF'
#!/bin/bash
while true; do
  echo "$(date '+%Y-%m-%d %H:%M:%S') heartbeat" >> {{ script.log_path }}
  sleep {{ script.interval_seconds }}
done
EOF
chmod +x {{ script.path }}
```

### 4. unit ファイルを配置する

```bash
cat > /etc/systemd/system/{{ unit.name }}.service <<'EOF'
[Unit]
Description={{ unit.description }}
After=network.target

[Service]
Type=simple
ExecStart={{ unit.exec_start }}
WorkingDirectory={{ unit.working_directory }}
User={{ unit.user }}
Restart={{ unit.restart }}
RestartSec={{ unit.restart_sec }}

[Install]
WantedBy=multi-user.target
EOF
```

### 5. daemon-reload してから起動する

```bash
systemctl daemon-reload
systemctl start {{ unit.name }}
systemctl status {{ unit.name }}
```

### 6. daemon-reload 忘れの挙動を観察する

```bash
sed -i 's/RestartSec={{ unit.restart_sec }}/RestartSec=10/' /etc/systemd/system/{{ unit.name }}.service
systemctl show {{ unit.name }} -p RestartSec   # daemon-reload 前は古い値のまま
systemctl daemon-reload
systemctl show {{ unit.name }} -p RestartSec   # daemon-reload 後に新しい値が反映される
```

### 7. 自動起動を有効化する

```bash
systemctl enable {{ unit.name }}
systemctl is-enabled {{ unit.name }}
```

### 8. ログを確認する

```bash
journalctl -u {{ unit.name }} -n 20
```

## 動作確認

- `systemctl is-active {{ unit.name }}` が `active` であること
- `systemctl is-enabled {{ unit.name }}` が `enabled` であること
- `journalctl -u {{ unit.name }}` に起動ログが記録されていること
- unit ファイル編集後、`daemon-reload` を実行するまで変更が反映されないことを実際に観察できたこと

## 注意事項

- 本番相当のユニット名と衝突しないよう、演習用のユニット名(`{{ unit.name }}`)を使用する。
- ユニットファイル編集後は `daemon-reload` を忘れると変更が反映されない。反映されていない疑いがあるときは `systemctl daemon-reload` を再実行する。
- 演習後は `systemctl disable --now {{ unit.name }}` で停止・無効化し、`/etc/systemd/system/{{ unit.name }}.service` と `{{ script.path }}` を削除して環境を元に戻す。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

`connectivity-check` の直後に追加する:

```typescript
  { id: "systemd-unit-basics", name: "systemdサービスの基本操作とユニット作成", desc: "start/stop/enableの違いとdaemon-reloadの意味を、自作スクリプトのサービス化を通じて学ぶ手順書（Markdown）を生成。", category: "server", subCategory: "systemd基本", format: "toml", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

Run（`TEMPLATE_ID = "systemd-unit-basics"`, `DATA_EXT = "toml"` に置き換えて共通スクリプトを実行）。
Expected: `OK: systemd-unit-basics` printed, no `AssertionError`.

- [ ] **Step 5: Commit**

```bash
git add assets/examples/systemd-unit-basics.toml assets/examples/systemd-unit-basics.j2 web/src/lib/templates.ts
git commit -m "feat: add systemd-unit-basics training scenario (#548)"
```

---

### Task 4: port-listening-check シナリオの追加

**Files:**
- Create: `assets/examples/port-listening-check.csv`
- Create: `assets/examples/port-listening-check.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

`assets/examples/port-listening-check.csv`:
```csv
port,protocol,bind_address,service_name,description
8080,tcp,0.0.0.0,training-echo,全インターフェースで待受(外部から到達可能)
9090,tcp,127.0.0.1,training-local,ローカルのみ待受(外部から到達不可)
8000,tcp,0.0.0.0,training-http,curlでHTTPレベルまで確認する対象
```

- [ ] **Step 2: テンプレートを作成する**

`assets/examples/port-listening-check.j2`:
```jinja
# ss と nc によるポート待受・疎通確認演習

CSV で定義した {{ csv_rows | length }} 件のポートについて、`ss` で待受状態を確認し、`nc` でL4疎通テストを行います。

## 目的

「サービスが待ち受けている」とはどういう状態かを理解し、`ss` でLISTEN確認、`nc` でL4疎通テストができるようになることを目指します。

## 用語解説

- **ポート番号**: 1台のホスト上で複数のサービスを区別するための番号(0-65535)
- **LISTEN**: プロセスが指定ポートで接続を受け付け可能な状態であることを示す `ss` の表示
- **TCPとUDP**: TCPは接続を確立してからデータをやり取り(信頼性重視)、UDPは接続確立なしで送りっぱなし(速度重視)
- **ソケット**: IPアドレスとポート番号の組み合わせで識別される通信の端点
- **127.0.0.1 と 0.0.0.0 の違い**: `127.0.0.1` はローカルホストからのみ、`0.0.0.0` は全ネットワークインターフェースから接続を受け付ける
- **ウェルノウンポート**: 0-1023番の、慣習的に特定サービスに割り当てられたポート(例: 22=SSH, 80=HTTP)
- **nc (netcat)**: TCP/UDPで簡易的な送受信ができる汎用ツール。疎通確認やポート開放確認に使う

## シナリオ設定

以下のポート一覧を、待受確認 → 疎通テストの順に点検します。

| port | protocol | bind_address | service_name | description |
|------|----------|---------------|--------------|------|
{% for r in csv_rows %}| {{ r["port"] }} | {{ r["protocol"] }} | {{ r["bind_address"] }} | {{ r["service_name"] }} | {{ r["description"] }} |
{% endfor %}

## 手順

### 1. `ss -tlnp` の読み方を確認する

```bash
ss -tlnp
# State: LISTEN であれば待受中
# Local Address:Port: バインドしているアドレスとポート(0.0.0.0=全て、127.0.0.1=ローカルのみ)
# Process: 待受しているプロセス名とPID
```

### 2. 各ポートで仮のリスナーを起動する

```bash
{% for r in csv_rows %}nc -l {{ r["bind_address"] }} {{ r["port"] }} &   # {{ r["service_name"] }}: {{ r["description"] }}
{% endfor %}```

### 3. `ss` で待受状態を確認する

```bash
{% for r in csv_rows %}ss -tlnp | grep ':{{ r["port"] }} '
{% endfor %}```

### 4. 別ターミナルから `nc` で接続し文字列を往復させる

```bash
{% for r in csv_rows %}echo "hello {{ r["service_name"] }}" | nc -w 2 {{ r["bind_address"] }} {{ r["port"] }}
{% endfor %}```

### 5. 127.0.0.1 バインドと 0.0.0.0 バインドの差を確認する

```bash
# 127.0.0.1 バインドのポートは、自ホスト以外のインターフェースアドレスから接続できないことを確認する
ip a   # 自ホストの非ループバックアドレスを控える
nc -w 2 -z <自ホストの非ループバックアドレス> 9090; echo "exit=$?"   # 接続不可であることを確認
```

### 6. `curl` でHTTPレベルの確認を追加する

```bash
python3 -m http.server 8000 &
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/
```

### 7. 演習で開いたリスナーを終了する

```bash
jobs -l
kill %1 %2 %3 2>/dev/null
```

## 動作確認

- 各ポートで `ss -tlnp` にLISTEN行が表示されること
- `nc` 同士で送った文字列が正しく届くこと
- 127.0.0.1バインド時に非ループバックインターフェースから接続できないこと
- `curl` がHTTPステータスコード(`200`)を返すこと

## 注意事項

- 演習で開いたポートは検証後に必ず閉じる(`nc`/`http.server` のリスナープロセスを `kill` で終了する)。開けたままにするとポートスキャンや不正接続の対象になり得る。
- ファイアウォール(firewalld/ufw等)の設定次第で外部からの到達性が変わる点に注意する。演習環境のファイアウォール設定を事前に確認する。
- 本番サービスで使用中のポート番号と重複しないよう、演習用ポート(このシナリオでは 8080/9090/8000)を使用する。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

`systemd-unit-basics` の直後に追加する:

```typescript
  { id: "port-listening-check", name: "ssとncによるポート待受・疎通確認", desc: "LISTEN状態の読み方とL4疎通テストを、ssとnc/curlを使った点検手順書（Markdown）として生成。", category: "network", subCategory: "ポート確認", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

Run（`TEMPLATE_ID = "port-listening-check"`, `DATA_EXT = "csv"` に置き換えて共通スクリプトを実行）。
Expected: `OK: port-listening-check` printed, no `AssertionError`.

- [ ] **Step 5: Commit**

```bash
git add assets/examples/port-listening-check.csv assets/examples/port-listening-check.j2 web/src/lib/templates.ts
git commit -m "feat: add port-listening-check training scenario (#548)"
```

---

### Task 5: cron-scheduling シナリオの追加

**Files:**
- Create: `assets/examples/cron-scheduling.csv`
- Create: `assets/examples/cron-scheduling.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

`assets/examples/cron-scheduling.csv`:
```csv
minute,hour,day_of_month,month,day_of_week,command,description
*,*,*,*,*,/usr/local/bin/training-heartbeat-log.sh,演習用: 毎分実行してログ追記を確認する
0,3,*,*,*,/usr/local/bin/nightly-backup.sh,本番想定: 毎日3時に実行するバックアップジョブ
```

- [ ] **Step 2: テンプレートを作成する**

`assets/examples/cron-scheduling.j2`:
```jinja
# cron による定期実行ジョブ設定演習

crontab の5フィールド書式を確認しながら、ログ出力付きの定期ジョブを登録し、実行結果を自分で検証します。

## 目的

crontabの5フィールド書式を理解し、ログ出力付きの定期ジョブを登録して実行結果を自分で検証できるようになることを目指します。

## 用語解説

- **cron**: 指定したスケジュールでコマンドを定期実行するLinuxのデーモン
- **crontab**: cronのジョブ定義ファイル。ユーザーごとに `crontab -e` で編集する
- **スケジュール式(5フィールド)**: 分・時・日・月・曜日の順で、`*` はワイルドカード(毎回)を意味する
- **標準出力と標準エラー**: cronはジョブの出力をメールしようとするため、ログファイルへのリダイレクトが実務では必須
- **リダイレクト**: `>` (上書き)・`>>` (追記)・`2>&1` (標準エラーを標準出力に合流)でコマンドの出力先を制御する記法
- **環境変数PATH**: cronの実行環境は対話シェルよりPATHが狭いため、コマンドを絶対パスで書くのが安全
- **絶対パス**: `/usr/local/bin/xxx.sh` のように、実行時のディレクトリに依存しないフルパス表記

## シナリオ設定

以下 {{ csv_rows | length }} 件のジョブを登録します。

| minute | hour | day_of_month | month | day_of_week | command | description |
|--------|------|--------------|-------|-------------|---------|------|
{% for r in csv_rows %}| {{ r["minute"] }} | {{ r["hour"] }} | {{ r["day_of_month"] }} | {{ r["month"] }} | {{ r["day_of_week"] }} | `{{ r["command"] }}` | {{ r["description"] }} |
{% endfor %}

## 手順

### 1. 現在時刻を確認する

```bash
date
timedatectl
```

### 2. 日時をログに追記するテストスクリプトを作成する

```bash
cat > /usr/local/bin/training-heartbeat-log.sh <<'EOF'
#!/bin/bash
echo "$(date '+%Y-%m-%d %H:%M:%S') cron heartbeat" >> /var/log/training-cron-heartbeat.log
EOF
chmod +x /usr/local/bin/training-heartbeat-log.sh
```

### 3. 現状の crontab を確認する

```bash
crontab -l
```

> `crontab -r` は確認なしで現在のユーザーの全ジョブを削除するコマンドで、`-l`(一覧表示)や `-e`(編集)と1文字違いのため誤入力事故が起きやすい。まず `-l`/`-e` の違いを体に覚えさせてから扱うこと。

### 4. ジョブを登録する

```bash
{% for r in csv_rows %}(crontab -l 2>/dev/null; echo "{{ r['minute'] }} {{ r['hour'] }} {{ r['day_of_month'] }} {{ r['month'] }} {{ r['day_of_week'] }} {{ r['command'] }} >> /var/log/training-cron-job.log 2>&1") | crontab -
{% endfor %}crontab -l
```

### 5. 数分待ってログファイルを確認する

```bash
sleep 120
cat /var/log/training-cron-heartbeat.log
```

### 6. 実行履歴を journal / cron ログで確認する

```bash
journalctl -u cron -n 20 2>/dev/null || tail -n 20 /var/log/cron
```

## 動作確認

- `crontab -l` にCSV定義通りのジョブが表示されること
- `/var/log/training-cron-heartbeat.log` に実行時刻が毎分追記されていること
- `journalctl -u cron` または `/var/log/cron` にCRON実行のエントリが記録されていること

## 注意事項

- `cron-healthcheck`（フェーズ3）とは焦点を分離しており、本シナリオはcrontab書式・PATH問題・`-r`事故に集中する。監視スクリプトの設計自体は扱わない。
- `crontab -r` は確認なしで全ジョブを削除するため、`-e`(編集)や `-l`(一覧)との違いを必ず理解してから使う。誤って `-r` した場合、直前にバックアップ(`crontab -l > backup.txt`)していなければ復元できない。
- 演習用ジョブは検証後に必ず削除する(`crontab -e` で該当行を削除、またはバックアップから復元)。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

`port-listening-check` の直後に追加する:

```typescript
  { id: "cron-scheduling", name: "cronによる定期実行ジョブの設定", desc: "crontabの5フィールド書式とPATH問題、-r事故の防止を、ログ出力付きジョブの登録・検証手順書（Markdown）として生成。", category: "server", subCategory: "cron", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

Run（`TEMPLATE_ID = "cron-scheduling"`, `DATA_EXT = "csv"` に置き換えて共通スクリプトを実行）。
Expected: `OK: cron-scheduling` printed, no `AssertionError`.

- [ ] **Step 5: Commit**

```bash
git add assets/examples/cron-scheduling.csv assets/examples/cron-scheduling.j2 web/src/lib/templates.ts
git commit -m "feat: add cron-scheduling training scenario (#548)"
```

---

### Task 6: subnetting-basics シナリオの追加

**Files:**
- Create: `assets/examples/subnetting-basics.csv`
- Create: `assets/examples/subnetting-basics.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

`assets/examples/subnetting-basics.csv`:
```csv
site,required_hosts,assigned_cidr
tokyo,50,192.168.10.0/26
osaka,20,192.168.10.64/26
nagoya,10,192.168.10.128/26
fukuoka,5,192.168.10.192/26
```

- [ ] **Step 2: テンプレートを作成する**

`assets/examples/subnetting-basics.j2`:
```jinja
# IPアドレス設計とサブネット分割の基礎演習

拠点ごとの必要ホスト数から、割当済みの `/24` を CSV で定義した4拠点に分割する設計を検証します。

## 目的

CIDR表記とサブネットマスクの対応を理解し、拠点要件からサブネット分割を設計して `ipcalc` で計算結果を検証できるようになることを目指します。

## 用語解説

- **IPアドレス**: ネットワーク上の機器を一意に識別する番号(IPv4は32ビット)
- **サブネットマスク**: IPアドレスのうちネットワーク部とホスト部の境界を示す値
- **CIDR**: `192.168.10.0/26` のように、サブネットマスクのビット数を `/` に続けて表す表記法
- **ネットワークアドレス**: サブネット内で最初のアドレス。ホストには割り当てられない(そのネットワーク自体を指す)
- **ブロードキャストアドレス**: サブネット内で最後のアドレス。ホストには割り当てられない(サブネット全体への一斉送信用)
- **ホスト部とネットワーク部**: IPアドレスのうち、サブネットを識別する部分(ネットワーク部)と、その中の機器を識別する部分(ホスト部)
- **プライベートIPアドレス**: `192.168.0.0/16` 等、インターネット上でルーティングされない、組織内利用専用のアドレス範囲

## シナリオ設定

割当済みの `192.168.10.0/24` を、以下 {{ csv_rows | length }} 拠点の必要ホスト数に応じて `/26`(拠点あたり最大62ホスト)単位に分割します。

| site | required_hosts | assigned_cidr |
|------|-----------------|----------------|
{% for r in csv_rows %}| {{ r["site"] }} | {{ r["required_hosts"] }} | {{ r["assigned_cidr"] }} |
{% endfor %}

## 手順

### 1. `ipcalc` の導入と基本出力を確認する

```bash
which ipcalc || dnf install -y ipcalc
ipcalc 192.168.10.0/24
```

### 2. 割当済みの `/24` を分解して各フィールドを確認する

```bash
ipcalc -b 192.168.10.0/24
# Address / Netmask / Network / HostMin / HostMax / Broadcast の各行を確認する
```

### 3. 拠点ごとの必要ホスト数から必要ビット数を手計算する

必要ホスト数 + 2(ネットワーク・ブロードキャスト分) を超える最小の `2^n` を求め、ホスト部ビット数 `n` を決定する。

```bash
{% for r in csv_rows %}echo "{{ r['site'] }}: 必要ホスト数={{ r['required_hosts'] }} -> ホスト部ビット数を手計算して控える"
{% endfor %}```

### 4. 分割案を `ipcalc` で一括計算する

```bash
{% for r in csv_rows %}ipcalc -b {{ r["assigned_cidr"] }}   # {{ r["site"] }} (必要ホスト数: {{ r["required_hosts"] }})
{% endfor %}```

### 5. 各サブネットの範囲を表に記録する

```bash
{% for r in csv_rows %}echo "{{ r['site'] }},{{ r['assigned_cidr'] }},$(ipcalc -b {{ r['assigned_cidr'] }} | grep HostMin),$(ipcalc -b {{ r['assigned_cidr'] }} | grep HostMax)"
{% endfor %}```

### 6. サブネット間の重複がないことを確認する

```bash
{% for r in csv_rows %}ipcalc -n {{ r["assigned_cidr"] }}
{% endfor %}# Network アドレスが全て異なり、かつ各範囲が重ならないことを目視確認する
```

## 動作確認

- 手計算で求めたホスト部ビット数と `ipcalc` の出力(Netmaskのビット数)が一致すること
- 各拠点の利用可能ホスト数(`ipcalc` のHostMin〜HostMaxの範囲)が `required_hosts` 以上であること
- 隣接するサブネット同士でアドレス範囲の重複がないこと

## 注意事項

- 本演習は表の計算と `ipcalc` による検証のみで完結し、実際のネットワーク機器の設定変更は伴わない。
- 計算結果を本番環境に適用する場合は、既存の割当(他拠点・他システムのサブネット)と重複がないか、IPAM台帳等で必ず再確認する。
- `ipcalc` のオプション(`-b`/`-n`)はディストリビューションによって出力形式が異なる場合があるため、演習環境のマニュアル(`man ipcalc`)も併せて確認する。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

`cron-scheduling` の直後に追加する:

```typescript
  { id: "subnetting-basics", name: "IPアドレス設計とサブネット分割の基礎", desc: "CIDR表記とサブネットマスクの対応を、拠点要件からのサブネット分割設計とipcalcでの検証手順書（Markdown）として生成。", category: "network", subCategory: "IPアドレス設計", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

Run（`TEMPLATE_ID = "subnetting-basics"`, `DATA_EXT = "csv"` に置き換えて共通スクリプトを実行）。
Expected: `OK: subnetting-basics` printed, no `AssertionError`.

- [ ] **Step 5: Commit**

```bash
git add assets/examples/subnetting-basics.csv assets/examples/subnetting-basics.j2 web/src/lib/templates.ts
git commit -m "feat: add subnetting-basics training scenario (#548)"
```

---

### Task 7: ntp-chrony シナリオの追加

**Files:**
- Create: `assets/examples/ntp-chrony.toml`
- Create: `assets/examples/ntp-chrony.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

`assets/examples/ntp-chrony.toml`:
```toml
timezone = "Asia/Tokyo"
ntp_servers = ["ntp.nict.jp", "ntp.jst.mfeed.ad.jp"]
```

- [ ] **Step 2: テンプレートを作成する**

`assets/examples/ntp-chrony.j2`:
```jinja
# chrony による NTP 時刻同期の設定演習

時刻ずれが認証・ログ突合・証明書検証に与える影響を理解した上で、chronyを導入し時刻同期の設定と検証を行います。root 権限（sudo）で実施してください。

## 目的

時刻ずれが認証・ログ突合・証明書に与える影響を理解し、chronyで同期設定と同期状態の検証ができるようになることを目指します。

## 用語解説

- **NTP (Network Time Protocol)**: ネットワーク経由でホストの時刻をNTPサーバに同期させるプロトコル
- **stratum**: NTP階層構造での序列。stratum 1は原子時計等に直結したサーバ、そこから同期を受けるたびに数値が1つ増える
- **UTCとタイムゾーン**: UTCは世界共通の協定時刻、タイムゾーンはそこからのオフセット(日本は `Asia/Tokyo`, UTC+9)を適用した表示上の時刻
- **slewとstep**: slewは時刻を少しずつ調整する方式(サービスへの影響が小さい)、stepは瞬時に時刻を変更する方式(ログの逆行等が起きうる)
- **ドリフト**: ハードウェアクロックの精度誤差により、時間経過とともに実時刻からずれていく現象
- **chrony**: NTPクライアント/サーバの実装の1つ。断続的なネットワーク接続や仮想環境でも高精度に同期できる
- **timedatectl**: システムの時刻・タイムゾーン・同期状態を確認・設定するコマンド

## シナリオ設定

タイムゾーンを **{{ timezone }}** に設定し、以下のNTPサーバに同期します。

- {% for s in ntp_servers %}{{ s }}{% if not loop.last %}, {% endif %}{% endfor %}

## 手順

### 1. 現状を確認する

```bash
timedatectl
```

`System clock synchronized` と `NTP service` の行で、現在同期しているかどうかを確認します。

### 2. chrony を導入する

```bash
dnf install -y chrony    # Rocky/RHEL系の場合
systemctl enable --now chronyd
```

### 3. `/etc/chrony.conf` にサーバを設定する

```bash
cp /etc/chrony.conf /etc/chrony.conf.bak
{% for s in ntp_servers %}sed -i '/^pool /d; /^server /d' /etc/chrony.conf
{% endfor %}cat >> /etc/chrony.conf <<'EOF'
{% for s in ntp_servers %}server {{ s }} iburst
{% endfor %}EOF
```

### 4. サービスを再起動する

```bash
systemctl restart chronyd
```

### 5. 参照先の同期状態を確認する

```bash
chronyc sources
```

先頭が `^*` の行が現在の参照サーバ(同期先として選ばれているサーバ)です。`^+` は同期候補、`^-` は除外されたサーバを示します。

### 6. オフセットを確認する

```bash
chronyc tracking
```

`System time` 行のオフセットが十分小さい(通常はミリ秒〜数十ミリ秒程度)ことを確認します。

### 7. タイムゾーンを設定する

```bash
timedatectl set-timezone {{ timezone }}
timedatectl
```

> タイムゾーンの変更は表示上のオフセットを変えるだけで、時刻同期(NTP)とは独立した設定です。タイムゾーンを変えても同期状態は変わりません。

## 動作確認

- `chronyc sources` に `^*` の付いた参照サーバの行が表示されること
- `timedatectl` の `System clock synchronized` が `yes` であること
- `chronyc tracking` の `System time` オフセットが十分小さい値であること
- `timedatectl` のタイムゾーン表示が `{{ timezone }}` になっていること

## 注意事項

- 時刻の急激な変更(step)はログのタイムスタンプの逆行やTLS証明書検証(有効期限判定)に影響するため、本番稼働中のサーバで大幅な時刻ずれを修正する場合は、影響時間帯やメンテナンスウィンドウを考慮する。
- `/etc/chrony.conf` を変更する前に必ずバックアップ(`/etc/chrony.conf.bak`)を取得し、演習後に元の設定に戻せるようにする。
- 社内NTPサーバがある環境では、外部NTPサーバの代わりに社内サーバを指定する運用が一般的。演習環境に合わせて `ntp_servers` の値を読み替える。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

`subnetting-basics` の直後に追加する:

```typescript
  { id: "ntp-chrony", name: "chronyによるNTP時刻同期の設定", desc: "stratumやslew/stepの概念を踏まえ、chronyの導入・サーバ設定・同期状態検証までの手順書（Markdown）を生成。", category: "server", subCategory: "時刻同期", format: "toml", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

Run（`TEMPLATE_ID = "ntp-chrony"`, `DATA_EXT = "toml"` に置き換えて共通スクリプトを実行）。
Expected: `OK: ntp-chrony` printed, no `AssertionError`.

- [ ] **Step 5: Commit**

```bash
git add assets/examples/ntp-chrony.toml assets/examples/ntp-chrony.j2 web/src/lib/templates.ts
git commit -m "feat: add ntp-chrony training scenario (#548)"
```

---

### Task 8: disk-mount-basics シナリオの追加

**Files:**
- Create: `assets/examples/disk-mount-basics.yaml`
- Create: `assets/examples/disk-mount-basics.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

`assets/examples/disk-mount-basics.yaml`:
```yaml
image_path: /opt/training/disk-mount-basics/loopback.img
image_size_mb: 512
filesystem: ext4
mount_point: /mnt/training-loop
label: TRAINDISK
```

- [ ] **Step 2: テンプレートを作成する**

`assets/examples/disk-mount-basics.j2`:
```jinja
# ディスクのフォーマットとマウント入門（ループバック演習）

実ディスクに触れず、イメージファイルをループバックデバイス化してフォーマット・マウントの流れを体験します。root 権限（sudo）で実施してください。

## 目的

ブロックデバイス → ファイルシステム → マウントという階層構造を、実ディスクに触れずループバックデバイスで安全に体験できるようになることを目指します。

## 用語解説

- **ブロックデバイス**: OSがディスクとして扱う単位(`/dev/sda` 等)。データを固定長ブロック単位で読み書きする
- **ファイルシステム**: ブロックデバイス上にファイル・ディレクトリの構造を構築する仕組み(ext4, xfs等)
- **mkfs**: ブロックデバイスにファイルシステムを作成(フォーマット)するコマンド。対象のデータは全て消去される
- **マウントとマウントポイント**: ファイルシステムをディレクトリツリーの特定の場所(マウントポイント)に接続し、アクセス可能にすること
- **UUID**: ファイルシステムごとに割り当てられる一意な識別子。デバイス名(`/dev/sdb1`等)は環境によって変わり得るため、`fstab` ではUUID指定が推奨される
- **fstab**: 起動時に自動マウントするファイルシステムの一覧を定義する設定ファイル(`/etc/fstab`)
- **lsblkとdf**: `lsblk` はブロックデバイスの階層構造、`df` はマウント済みファイルシステムの使用量を表示する

## シナリオ設定

`{{ image_path }}` に {{ image_size_mb }}MB のイメージファイルを作成し、ループバックデバイス化して `{{ filesystem }}` でフォーマット、`{{ mount_point }}` にマウントします。

## 手順

### 1. ディスクイメージファイルを作成する

```bash
mkdir -p $(dirname {{ image_path }})
dd if=/dev/zero of={{ image_path }} bs=1M count={{ image_size_mb }}
```

### 2. ループバックデバイス化する

```bash
LOOP_DEV=$(losetup --find --show {{ image_path }})
echo "割り当てられたループバックデバイス: $LOOP_DEV"
losetup -l
```

### 3. フォーマットする

> `mkfs` は対象デバイスのデータを消去する破壊的操作です。**必ず `$LOOP_DEV` の値が `/dev/loop` から始まることを確認してから実行してください。実ディスクのデバイス名（`/dev/sda` 等）を誤って指定しないこと。**

```bash
echo "$LOOP_DEV" | grep -qE '^/dev/loop[0-9]+$' && echo "OK: ループバックデバイスです" || { echo "中止: ループバックデバイスではありません"; exit 1; }
mkfs.{{ filesystem }} -L {{ label }} "$LOOP_DEV"
```

### 4. マウントポイントを作成してマウントする

```bash
mkdir -p {{ mount_point }}
mount "$LOOP_DEV" {{ mount_point }}
```

### 5. 状態を確認する

```bash
lsblk
df -h {{ mount_point }}
blkid "$LOOP_DEV"
```

### 6. ファイルを書き込んで永続性を確認する

```bash
echo "hello from loopback disk" > {{ mount_point }}/test.txt
cat {{ mount_point }}/test.txt
umount {{ mount_point }}
ls {{ mount_point }}   # umount中はファイルが見えないことを確認
mount "$LOOP_DEV" {{ mount_point }}
cat {{ mount_point }}/test.txt   # 再マウントで内容が復活することを確認
```

## 動作確認

- `lsblk` に `$LOOP_DEV` のループデバイスとファイルシステムが表示されること
- `df -h` に `{{ mount_point }}` のマウント行が表示され、使用量が確認できること
- `umount` 中は書き込んだファイルが見えず、再マウント後に内容が復活すること

## 注意事項

- `mkfs` は対象デバイスのデータを消去する破壊的操作である。必ずループバックデバイス(`/dev/loop*`)であることを確認してから実行し、実ディスクのデバイス名を誤って指定しない。
- 演習後は `umount {{ mount_point }}` の上、`losetup -d "$LOOP_DEV"` でループバックデバイスを解除し、`{{ image_path }}` を削除して環境を元に戻す。
- ループバックデバイスの数には上限があるため、演習後に解除を忘れると次回演習でデバイスが確保できなくなることがある(`losetup -a` で残留を確認できる)。
```

- [ ] **Step 3: `templates.ts` にエントリを追加する**

`ntp-chrony` の直後に追加する:

```typescript
  { id: "disk-mount-basics", name: "ディスクのフォーマットとマウント入門", desc: "ブロックデバイス→ファイルシステム→マウントの階層構造を、ループバックデバイスで安全に体験する手順書（Markdown）を生成。", category: "server", subCategory: "ディスク管理", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

Run（`TEMPLATE_ID = "disk-mount-basics"`, `DATA_EXT = "yaml"` に置き換えて共通スクリプトを実行）。
Expected: `OK: disk-mount-basics` printed, no `AssertionError`.

- [ ] **Step 5: Commit**

```bash
git add assets/examples/disk-mount-basics.yaml assets/examples/disk-mount-basics.j2 web/src/lib/templates.ts
git commit -m "feat: add disk-mount-basics training scenario (#548)"
```

---

### Task 9: 全体検証と code-review

**Files:** なし（検証のみ）

- [ ] **Step 1: Python側のフルテストを実行する**

```bash
cd /home/user/command-ghostwriter
uv run pytest -k 'not e2e' -q
```
Expected: 既存448件＋新規8件（`test_example_templates_render.py` が自動discoverする）が全てPASS。

- [ ] **Step 2: TypeScript側の型チェックとテストを実行する**

```bash
cd /home/user/command-ghostwriter/web
npx tsc --noEmit
npm test -- --run
```
Expected: tscエラー0件、テスト全てPASS。

- [ ] **Step 3: 差分の範囲を確認する**

```bash
cd /home/user/command-ghostwriter
git diff origin/develop...HEAD --stat
```
Expected: `assets/examples/*` の新規16ファイル（8ペア）と `web/src/lib/templates.ts` の変更のみ（`docs/superpowers/plans/2026-07-13-phase5-network-server-basics-templates.md` の追加も含む）。

- [ ] **Step 4: `/code-review` を高効度で実行し、指摘を修正する**

`/code-review` スキルを実行し、指摘があれば修正して再度Step 1〜3を実行する。

- [ ] **Step 5: Commit（Step 4で修正が入った場合のみ）**

```bash
git add -A
git commit -m "fix: address code-review findings on phase5 templates (#548)"
```

---

### Task 10: PR作成と監視

**Files:** なし（GitHub操作のみ）

- [ ] **Step 1: ブランチをpushする**

```bash
git push -u origin claude/phase5-network-server-templates-ra999u
```

- [ ] **Step 2: PRを作成する**

PR #543 の本文構成（Summary / Test plan / Refs）を踏襲し、ASCIIのみで記述する。

Title: `Phase 5: add 8 network/server basics training scenarios (Closes #548)`

- [ ] **Step 3: PR活動を購読する**

`subscribe_pr_activity` を呼び出し、CI失敗・レビューコメントに対応する。
