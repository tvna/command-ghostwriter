# フェーズ3: 障害対応/監視/ログシナリオ9本 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 障害対応/監視/ログ系の新規シナリオ9本（disk-usage-triage, systemd-service-recovery, cron-healthcheck, load-spike-triage, logrotate-setup, web-error-log-triage, oom-memory-triage, mail-delivery-triage, alert-first-response）を `assets/examples/<id>.<format>` + `<id>.j2` のペアとして追加し、`web/src/lib/templates.ts` に登録する。

**Architecture:** 各シナリオは既存のフェーズ1確立済み6セクション構成（目的/用語解説/シナリオ設定/手順/動作確認/注意事項）に従う。手順本文は `linux-init.j2`（固定コマンド＋数値のみ変数化）または `firewall-rules.j2`（`csv_rows` ループでテーブル駆動）のいずれかのパターンを踏襲し、`incident-campus.j2` のリスト（`steps`）駆動パターンも一部で使う。データファイル（yaml/csv）はシナリオ固有の値のみを持ち、目的/用語解説/注意事項の文章はテンプレートに直接記述する（設計方針どおり変数化しない）。各テンプレートはPythonの実レンダリングエンジンでstrict undefinedモードで検証してからコミットする。

**Tech Stack:** Jinja2 テンプレート（`.j2`）、YAML/CSVデータファイル、Python 3（`features/config_parser.py` / `features/document_render.py`）、TypeScript（`web/src/lib/templates.ts`）、uv、Vitest

**Issue:** #546（親issue #541）

---

## 共通の検証手順（各タスクで使用）

各タスクの「レンダリング確認」ステップでは、以下のPythonスクリプトパターンを使う。`<id>` と `<ext>` をタスクごとに置き換え、`assert` 対象の文字列をそのタスクの固有文言に合わせる。

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

`AssertionError` が出た場合はテンプレートの構文・変数参照を見直す。`tests/unit/test_example_templates_render.py` はファイル追加のみで自動的にこのペアを発見するため、変更不要。

---

### Task 1: disk-usage-triage の追加

**Files:**
- Create: `assets/examples/disk-usage-triage.yaml`
- Create: `assets/examples/disk-usage-triage.j2`

- [ ] **Step 1: データファイルを作成する**

```yaml
title: /var 領域のディスク使用率100%到達
hostname: app-prod-03
filesystem: /dev/mapper/vg-var
mount_point: /var
threshold_percent: 90
suspect_service: rsyslog
escalation: インフラ基盤チーム (内線 1201)
```

- [ ] **Step 2: テンプレートを作成する**

```jinja
# ディスク使用率100%障害の切り分けと復旧 — {{ hostname }}

- **対象ファイルシステム**: {{ filesystem }}（マウントポイント: {{ mount_point }}）
- **回復目標**: 使用率を {{ threshold_percent }}% 未満まで下げる

## 目的

ディスク枯渇の兆候検知から原因特定・安全な領域回復までの標準手順を、df/du/lsofの役割の違いを理解した上で実行できるようになることを目指します。

## 用語解説

- **ファイルシステム**: ディスク上のデータをどう管理・記録するかの仕組み
- **マウントポイント**: ファイルシステムをOSのディレクトリツリーに接続する位置
- **iノード**: ファイルのメタ情報（所有者・権限・場所等）を持つ管理領域。数に上限があり枯渇するとディスク容量が余っていてもファイルを作成できなくなる
- **dfとduの違い**: `df`はファイルシステム全体の使用量、`du`はディレクトリ・ファイル単位の使用量を集計する
- **オープンファイルディスクリプタ**: プロセスが開いているファイルへの参照。削除してもプロセスが握ったままだと領域は解放されない
- **journald**: systemdのログ収集デーモン。ログをバイナリ形式でディスクに蓄積する
- **tmpファイル**: 一時的に使われるファイル。放置されると肥大化することがある
- **空き容量閾値**: 監視でアラートを発報する使用率の基準値

## シナリオ設定

{{ hostname }} の {{ mount_point }}（{{ filesystem }}）の使用率が閾値 {{ threshold_percent }}% を超えるアラートが発報しました。切り分けから復旧まで実施してください。

## 手順

### 1. 使用率とiノード枯渇の有無を特定する

```bash
df -h {{ mount_point }}
df -i {{ mount_point }}
```

### 2. ディレクトリ単位で内訳を掘り下げる

```bash
du -shx --max-depth=1 {{ mount_point }}/* | sort -rh | head -20
```

### 3. 「削除済みだがプロセスに掴まれている」ファイルを確認する

集計が合わない場合、削除済みだがオープンされたままのファイルを疑います。

```bash
lsof +L1 | grep {{ mount_point }}
```

### 4. journalログのサイズを確認し縮小する

```bash
journalctl --disk-usage
journalctl --vacuum-size=200M
```

### 5. 古い一時ファイル・ローテート済みログを一覧化する

```bash
find {{ mount_point }} -type f -mtime +30 \( -name "*.log.*.gz" -o -path "*/tmp/*" \) -exec ls -lh {} \;
```

### 6. 内容確認後に削除し、ファイルを掴んでいるサービスを再起動する

一覧を確認してから個別に削除する。まとめて `rm -rf` しない。

```bash
systemctl restart {{ suspect_service }}
```

## 動作確認

- `df -h {{ mount_point }}` で使用率が {{ threshold_percent }}% 未満に回復していること
- `lsof +L1` の該当エントリが消滅していること
- `{{ suspect_service }}` が `systemctl is-active` で active であること
- `df -i {{ mount_point }}` のiノード使用率も閾値未満であること

## 注意事項

- ファイル削除は必ず一覧を確認してから実行し、まとめて `rm -rf` しない。本番データを誤って削除するリスクがあるため演習環境で実施する。
- 解決しない、または削除対象の判断がつかない場合は {{ escalation }} へエスカレーションする。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "disk-usage-triage"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "df -i" in content
assert "lsof +L1" in content
```
Expected: 全 assert が通り `OK: disk-usage-triage` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/disk-usage-triage.yaml assets/examples/disk-usage-triage.j2
git commit -m "$(cat <<'EOF'
docs(templates): add disk-usage-triage scenario (#546)

Refs #541
EOF
)"
```

---

### Task 2: systemd-service-recovery の追加

**Files:**
- Create: `assets/examples/systemd-service-recovery.yaml`
- Create: `assets/examples/systemd-service-recovery.j2`

- [ ] **Step 1: データファイルを作成する**

```yaml
title: nginx サービスが起動しない
hostname: web-prod-02
service_name: nginx
config_check_command: nginx -t
escalation: インフラ基盤チーム (内線 1201)
```

- [ ] **Step 2: テンプレートを作成する**

```jinja
# systemdサービス起動失敗の調査と復旧 — {{ hostname }}

- **対象サービス**: {{ service_name }}

## 目的

サービスが起動しない時にログから失敗原因を特定し、activeとenabledの違いを理解した上で恒久復旧できるようになることを目指します。

## 用語解説

- **ユニット**: systemdが管理するサービス・タイマー等の単位
- **activeとenabledの違い**: activeは「現在起動しているか」、enabledは「OS起動時に自動起動する設定になっているか」を示す別々の状態
- **デーモン**: バックグラウンドで動作し続けるプロセス
- **journalctl**: systemdのログを閲覧するコマンド
- **終了コード**: プロセスが終了した際に返す数値。0は正常終了、それ以外は異常終了を示すことが多い
- **設定ファイルの構文チェック**: 反映前に設定の構文誤りを検出するコマンド（例: `nginx -t`）
- **依存関係(After/Requires)**: ユニット定義で他のユニットとの起動順序・依存を指定する項目
- **daemon-reload**: ユニットファイルの変更をsystemdに再読み込みさせるコマンド

## シナリオ設定

{{ hostname }} で {{ service_name }} が起動しないとの報告がありました。ログから原因を特定し、恒久復旧してください。

## 手順

### 1. 状態・直近ログ・終了コードを確認する

```bash
systemctl status {{ service_name }}
```

### 2. 失敗時刻前後のログを精読する

```bash
journalctl -u {{ service_name }} -e --no-pager
```

### 3. 設定起因かどうかを構文チェックで切り分ける

```bash
{{ config_check_command }}
```

### 4. 修正後、ユニット変更時のみ daemon-reload してから再起動する

```bash
systemctl daemon-reload
systemctl restart {{ service_name }}
```

### 5. 自動起動設定を確認する

```bash
systemctl is-enabled {{ service_name }}
```

### 6. 障害内容と対処を作業記録に残す

原因・実施した対処・所要時間を記録します。

## 動作確認

- `systemctl is-active {{ service_name }}` が active であること
- `journalctl -u {{ service_name }}` に新規エラーがないこと
- 再起動後もサービス提供が継続していること（curl等での応答確認）
- `systemctl is-enabled {{ service_name }}` が意図通りであること

## 注意事項

- 本番相当のサービスを止めると影響があるため、演習用サービスまたは検証環境で実施する。
- 設定変更後は必ず `daemon-reload` を忘れない。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "systemd-service-recovery"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "daemon-reload" in content
assert "nginx -t" in content
```
Expected: 全 assert が通り `OK: systemd-service-recovery` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/systemd-service-recovery.yaml assets/examples/systemd-service-recovery.j2
git commit -m "$(cat <<'EOF'
docs(templates): add systemd-service-recovery scenario (#546)

Refs #541
EOF
)"
```

---

### Task 3: cron-healthcheck の追加

**Files:**
- Create: `assets/examples/cron-healthcheck.csv`
- Create: `assets/examples/cron-healthcheck.j2`

- [ ] **Step 1: データファイルを作成する**

```csv
service,check_command,tag,note
nginx,systemctl is-active --quiet nginx,healthcheck_nginx,Webサーバ死活監視
sshd,systemctl is-active --quiet sshd,healthcheck_sshd,SSH死活監視
postgresql,pg_isready -q,healthcheck_postgresql,DB接続監視
```

- [ ] **Step 2: テンプレートを作成する**

```jinja
# cronとシェルスクリプトによる簡易死活監視の構築

CSVで定義した {{ csv_rows | length }} 件の監視対象に対し、cron + シェルスクリプト + logger による最小構成の死活監視を構築します。

## 目的

監視ツールがない環境で、cron・シェルスクリプト・loggerを組み合わせた最小の死活監視を自作し、「監視とは定期的な確認と記録の自動化である」ことを体得することを目指します。

## 用語解説

- **死活監視**: 対象サービス・ホストが正常に稼働しているかを定期確認すること
- **cron / crontab**: 決まった時刻・間隔でジョブを自動実行するLinuxの仕組みと、その設定
- **終了コード**: コマンドの成否を表す数値。0は成功を示す
- **logger(syslogへの記録)**: コマンドの出力をsyslog/journalへ記録するコマンド
- **PATH(cron環境変数の罠)**: cronの実行環境はログインシェルよりPATHが最小であり、絶対パス指定が必要になることが多い
- **リダイレクト**: コマンドの出力を別の場所（ファイル等）に転送する仕組み
- **監視間隔**: チェックを実行する頻度

## 1. 監視対象一覧

| service | check_command | tag | note |
| --- | --- | --- | --- |
{% for r in csv_rows %}| {{ r["service"] }} | `{{ r["check_command"] }}` | {{ r["tag"] }} | {{ r["note"] }} |
{% endfor %}

## 2. チェックスクリプトを配置する

```bash
{% for r in csv_rows %}cat > /usr/local/bin/healthcheck_{{ r["service"] }}.sh <<'EOF'
#!/bin/bash
if {{ r["check_command"] }}; then
  logger -t {{ r["tag"] }} "OK: {{ r["service"] }} is healthy"
else
  logger -t {{ r["tag"] }} "NG: {{ r["service"] }} health check failed"
fi
EOF
chmod +x /usr/local/bin/healthcheck_{{ r["service"] }}.sh
{% endfor %}```

## 3. 手動実行して正常時・異常時の挙動を確認する

```bash
{% for r in csv_rows %}/usr/local/bin/healthcheck_{{ r["service"] }}.sh; echo "exit code: $?"
{% endfor %}```

## 4. syslogへの記録を確認する

```bash
{% for r in csv_rows %}journalctl -t {{ r["tag"] }} -n 5 --no-pager
{% endfor %}```

## 5. crontabへ登録する

cronの実行環境はPATHが最小のため、スクリプト内のコマンドは絶対パスで指定済みであることを前提とします。

```bash
crontab -l 2>/dev/null | { cat; {% for r in csv_rows %}echo "*/5 * * * * /usr/local/bin/healthcheck_{{ r["service"] }}.sh"
{% endfor %}} | crontab -
```

## 6. 疑似障害を発生させ異常検知を試験する

```bash
{% for r in csv_rows %}systemctl stop {{ r["service"] }} 2>/dev/null || true
/usr/local/bin/healthcheck_{{ r["service"] }}.sh
systemctl start {{ r["service"] }} 2>/dev/null || true
{% endfor %}```

## 動作確認

- `crontab -l` に登録行が存在すること
- `journalctl -t <tag>` に定期記録があること
- 疑似障害時に異常ログが記録されること
- 復旧後に正常ログへ戻ること

## 注意事項

- `cron-scheduling`（crontab書式そのものの入門）とは目的を分離し、本シナリオではcrontab構文の解説を最小限にとどめる。
- cronジョブのコマンドは絶対パスで記述する。
- 演習終了後は不要なジョブを `crontab -r` 等で削除する。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "cron-healthcheck"`, `DATA_EXT = "csv"` で実行する。加えて:
```python
assert "healthcheck_nginx" in content
assert "logger -t" in content
```
Expected: 全 assert が通り `OK: cron-healthcheck` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/cron-healthcheck.csv assets/examples/cron-healthcheck.j2
git commit -m "$(cat <<'EOF'
docs(templates): add cron-healthcheck scenario (#546)

Refs #541
EOF
)"
```

---

### Task 4: load-spike-triage の追加

**Files:**
- Create: `assets/examples/load-spike-triage.yaml`
- Create: `assets/examples/load-spike-triage.j2`

- [ ] **Step 1: データファイルを作成する**

```yaml
title: Webサーバの負荷急増
hostname: web-prod-01
load_threshold: "4.0"
target_service: nginx
escalation: インフラ基盤チーム (内線 1201)
```

- [ ] **Step 2: テンプレートを作成する**

```jinja
# サーバ負荷急増時の一次切り分け — {{ hostname }}

- **対象サービス**: {{ target_service }}
- **正常時ロードアベレージ目安**: {{ load_threshold }} 未満

## 目的

ロードアベレージ・CPU使用率・I/O待ちの違いを理解し、負荷の種類(CPU起因/I/O起因/プロセス暴走)を手順に沿って特定できるようになることを目指します。

## 用語解説

- **ロードアベレージ**: 実行待ち＋実行中のプロセス数の平均。CPUコア数との比較で負荷の目安になる
- **CPU使用率との違い**: ロードアベレージはI/O待ちのプロセスも含むため、CPU使用率が低くても高くなることがある
- **I/O待ち(iowait)**: CPUがディスク等の応答待ちで遊んでいる時間の割合
- **プロセスとスレッド**: プロセスは独立した実行単位、スレッドはプロセス内の実行単位
- **ゾンビプロセス**: 終了したが親プロセスに回収されていないプロセス
- **nice値**: プロセスのCPUスケジューリング優先度（-20〜19、低いほど高優先）
- **topの見方**: %CPU・%MEM・S（プロセス状態）列で負荷源を判断する
- **ボトルネック**: システム全体の処理速度を制約している箇所

## シナリオ設定

{{ hostname }} でロードアベレージが {{ load_threshold }} を超える警報が発報しました。{{ target_service }} の応答遅延も報告されています。原因を特定し対処してください。

## 手順

### 1. ロードアベレージの傾向を確認する

```bash
uptime
```

1分・5分・15分の値を比較し、悪化傾向か回復傾向かを判断します。

### 2. CPU消費上位プロセスを特定する

```bash
top -bn1 | head -20
ps aux --sort=-%cpu | head -10
```

### 3. iowaitを確認しCPU起因かI/O起因か分岐する

```bash
top -bn1 | grep "%Cpu"
```

`%wa`（iowait）が高い場合はI/O起因を疑います。

### 4. I/O起因の場合は詳細を確認する

```bash
iostat -x 1 3
ps aux | awk '$8 ~ /D/ {print}'
```

### 5. 原因プロセスの正体を確認する

```bash
systemctl status {{ target_service }}
ps -fp <PID>
```

対象プロセスがサービスか暴走ジョブか想定内バッチかを確認します。

### 6. 対処判断基準表に沿って対応する

| 状況 | 対処 |
| --- | --- |
| 想定内の一時的なバッチ処理 | nice/renice で優先度を下げて様子見 |
| 暴走・想定外のプロセス | プロセスを停止（kill）し原因調査 |
| サービス自体の性能限界 | エスカレーションしスケール対応を検討 |

```bash
renice -n 10 -p <PID>
```

### 7. 対処後にロードアベレージが回復したことを確認し記録する

```bash
uptime
```

## 動作確認

- ロードアベレージが {{ load_threshold }} 未満の正常時基準に回復していること
- 原因プロセスが特定・記録済みであること
- {{ target_service }} の応答が正常であること
- 対処内容が判断基準表のどの行に該当したか記録済みであること

## 注意事項

- プロセスの停止・renice操作は対象を誤ると本番影響が出るため、必ず基準表に沿って判断し記録する。
- 判断に迷う場合や基準表に該当しない場合は自己判断で進めず {{ escalation }} へエスカレーションする。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "load-spike-triage"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "iostat" in content
assert "renice" in content
```
Expected: 全 assert が通り `OK: load-spike-triage` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/load-spike-triage.yaml assets/examples/load-spike-triage.j2
git commit -m "$(cat <<'EOF'
docs(templates): add load-spike-triage scenario (#546)

Refs #541
EOF
)"
```

---

### Task 5: logrotate-setup の追加

**Files:**
- Create: `assets/examples/logrotate-setup.csv`
- Create: `assets/examples/logrotate-setup.j2`

- [ ] **Step 1: データファイルを作成する**

```csv
log_path,rotate_count,rotate_interval,compress,mode,postrotate_service
/var/log/app/access.log,14,daily,yes,create,app
/var/log/app/error.log,30,daily,yes,copytruncate,
/var/log/batch/job.log,7,weekly,no,create,
```

- [ ] **Step 2: テンプレートを作成する**

```jinja
# logrotateによるログローテーション設定

CSVで定義した {{ csv_rows | length }} 件のログに対し、logrotate設定を作成し、dry-runで検証してから適用します。

## 目的

ログ肥大によるディスク枯渇を予防するローテーション設定を作成し、dry-runで挙動を検証してから適用できるようになることを目指します。ローテート後にプロセスがログを掴み続ける問題も理解します。

## 用語解説

- **ログローテーション**: 肥大化するログを定期的に切り替え・保存する仕組み
- **世代管理**: 過去何世代分のログを保持するかの設定（rotate数）
- **圧縮(gzip)**: ローテート済みログを圧縮して保存容量を削減する機能
- **copytruncateとcreateの違い**: copytruncateは元ファイルをコピー後に空にする方式、createはファイルをリネームし新規ファイルを作成する方式
- **postrotate**: ローテート後に実行する処理を定義するブロック（サービスへのシグナル送信等）
- **dry-run**: 実際には変更せず、実行結果だけを確認するモード
- **シグナル(HUP)**: プロセスに設定再読み込み等を指示するために送る通知
- **/etc/logrotate.d**: 対象ごとの logrotate 設定を配置するディレクトリ

## 1. 対象ログの現状を確認する

```bash
{% for r in csv_rows %}ls -lh {{ r["log_path"] }}
{% endfor %}```

## 2. logrotate設定を配置する

```bash
{% for r in csv_rows %}cat > /etc/logrotate.d/$(basename {{ r["log_path"] }} .log) <<'EOF'
{{ r["log_path"] }} {
    {{ r["rotate_interval"] }}
    rotate {{ r["rotate_count"] }}
{% if r["compress"] == "yes" %}    compress
    delaycompress
{% endif %}
{% if r["mode"] == "copytruncate" %}    copytruncate
{% else %}    create 0640 root adm
    missingok
    notifempty
{% if r["postrotate_service"] %}    postrotate
        systemctl reload {{ r["postrotate_service"] }} > /dev/null 2>&1 || true
    endscript
{% endif %}
{% endif %}
}
EOF
{% endfor %}```

## 3. dry-runで事前確認する

```bash
{% for r in csv_rows %}logrotate -d /etc/logrotate.d/$(basename {{ r["log_path"] }} .log)
{% endfor %}```

## 4. 強制ローテートし実挙動を確認する

```bash
{% for r in csv_rows %}logrotate -f /etc/logrotate.d/$(basename {{ r["log_path"] }} .log)
ls -lh {{ r["log_path"] }}*
{% endfor %}```

## 5. ローテート後もプロセスが旧ファイルへ書き続けていないか確認する

```bash
{% for r in csv_rows %}lsof {{ r["log_path"] }} 2>/dev/null
{% endfor %}```

## 6. cron.dailyでの自動実行タイミングを確認する

```bash
cat /etc/cron.daily/logrotate 2>/dev/null || systemctl list-timers | grep logrotate
```

## 動作確認

- ローテート済みファイル（`.1` / `.gz`）が生成されていること
- 新ログファイルに追記が継続していること
- dry-run出力と実際のローテート挙動が一致していること
- 世代数（rotate_count）が定義通りであること

## 注意事項

- 本番ログに対して `logrotate -f` を実行する前に必ず `-d`（dry-run）で挙動を確認する。設定ミスでログが失われる可能性がある。
- copytruncate はコピー〜切り詰めの間のログを欠落させるリスクがあるため、postrotateでシグナル送信できるサービスでは create を優先する。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "logrotate-setup"`, `DATA_EXT = "csv"` で実行する。加えて:
```python
assert "copytruncate" in content
assert "logrotate -d" in content
```
Expected: 全 assert が通り `OK: logrotate-setup` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/logrotate-setup.csv assets/examples/logrotate-setup.j2
git commit -m "$(cat <<'EOF'
docs(templates): add logrotate-setup scenario (#546)

Refs #541
EOF
)"
```

---

### Task 6: web-error-log-triage の追加

**Files:**
- Create: `assets/examples/web-error-log-triage.yaml`
- Create: `assets/examples/web-error-log-triage.j2`

- [ ] **Step 1: データファイルを作成する**

```yaml
title: Webサーバの5xxエラー多発
hostname: web-prod-01
access_log: /var/log/nginx/access.log
error_log: /var/log/nginx/error.log
backend_service: app-backend
target_url: https://example.internal/health
escalation: インフラ基盤チーム (内線 1201)
```

- [ ] **Step 2: テンプレートを作成する**

```jinja
# Webサーバの5xxエラー多発時のログ調査 — {{ hostname }}

- **アクセスログ**: {{ access_log }}
- **エラーログ**: {{ error_log }}
- **バックエンドサービス**: {{ backend_service }}

## 目的

アクセスログとエラーログの役割の違いを理解し、grep/awk/sort/uniqでエラーの傾向（時間帯・URL・ステータス）を定量的に絞り込めるようになることを目指します。

## 用語解説

- **アクセスログとエラーログ**: アクセスログは全リクエストの記録、エラーログはWebサーバ自身が検知した異常の記録
- **HTTPステータスコード**: リクエスト結果を表す3桁の数値
- **4xxと5xxの責任分界**: 4xxはクライアント起因、5xxはサーバ側起因を示す
- **502と504の違い**: 502はバックエンドからの不正な応答、504はバックエンドからの応答タイムアウトを示す
- **パイプ**: あるコマンドの出力を次のコマンドの入力に渡す仕組み（`|`）
- **awk**: テキストを列単位で処理・集計するコマンド
- **uniq -c**: 連続する重複行をまとめ、件数を付けて出力するオプション
- **時系列の絞り込み**: 発生時刻を基準にログを絞り込む調査手法

## シナリオ設定

{{ hostname }} で5xxエラーが多発しているとの通報を受けました。{{ access_log }} と {{ error_log }} を調査し、原因を特定してください。

## 手順

### 1. ステータスコード別に件数を集計する

```bash
awk '{print $9}' {{ access_log }} | sort | uniq -c | sort -rn | head -20
```

### 2. 5xxの発生時間帯を絞り込む

```bash
awk '$9 ~ /^5/ {print $4}' {{ access_log }} | cut -d: -f1-2 | sort | uniq -c
```

### 3. 対象時刻のエラーログを精読する

```bash
grep -E "$(date -d '10 minutes ago' '+%Y/%m/%d %H:%M')" {{ error_log }} | tail -50
```

上流（バックエンド）起因かWebサーバ起因かを判別します。

### 4. 502/504の場合はバックエンドサービスの状態を確認する

```bash
systemctl status {{ backend_service }}
ss -tlnp | grep {{ backend_service }}
```

### 5. 仮説を1行で言語化してから対処する

例: 「{{ backend_service }} がハングし応答しないため 504 が発生している」

```bash
systemctl restart {{ backend_service }}
```

### 6. 対処後に同じ集計コマンドを再実行し収束を確認する

```bash
awk '{print $9}' {{ access_log }} | sort | uniq -c | sort -rn | head -20
curl -o /dev/null -s -w "%{http_code}\n" {{ target_url }}
```

## 動作確認

- 5xx件数が対処後ゼロまたは基準値以下であること
- {{ error_log }} に新規エラーが記録されていないこと
- {{ target_url }} へのcurlが200を返すこと

## 注意事項

- ログファイルへの書き込み権限・個人情報を含むログの取り扱いに注意する。集計対象は演習用ログまたはアクセス許可のあるログに限定する。
- 解決しない、または原因が特定できない場合は {{ escalation }} へエスカレーションする。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "web-error-log-triage"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "uniq -c" in content
assert "502" in content and "504" in content
```
Expected: 全 assert が通り `OK: web-error-log-triage` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/web-error-log-triage.yaml assets/examples/web-error-log-triage.j2
git commit -m "$(cat <<'EOF'
docs(templates): add web-error-log-triage scenario (#546)

Refs #541
EOF
)"
```

---

### Task 7: oom-memory-triage の追加

**Files:**
- Create: `assets/examples/oom-memory-triage.yaml`
- Create: `assets/examples/oom-memory-triage.j2`

- [ ] **Step 1: データファイルを作成する**

```yaml
title: サービスプロセスの突然停止（OOM Killer疑い）
hostname: app-prod-04
victim_service: app-worker
escalation: インフラ基盤チーム (内線 1201)
```

- [ ] **Step 2: テンプレートを作成する**

```jinja
# メモリ枯渇・OOM Killer発動時の切り分け — {{ hostname }}

- **報告内容**: {{ victim_service }} が突然停止した

## 目的

freeの見方（availableとfreeの違い）とOOM Killerの仕組みを理解し、「プロセスが突然消えた」障害をカーネルログから裏取りできるようになることを目指します。

## 用語解説

- **OOM Killer**: メモリが枯渇した際、カーネルが強制的にプロセスを終了させて全体停止を防ぐ仕組み
- **freeとavailableの違い**: freeは完全な未使用メモリ、availableはページキャッシュ解放分も含めた実質的に使えるメモリ量
- **ページキャッシュ**: ディスクI/Oを高速化するためカーネルがメモリ上に保持するファイルの内容。必要に応じて解放される
- **スワップ**: 物理メモリが不足した際にディスク上へ退避する領域
- **カーネルログ(dmesg/journalctl -k)**: カーネルが出力するログ。OOM Killerの発動記録が残る
- **常駐メモリ(RSS)**: プロセスが実際に使用している物理メモリ量
- **oom_score**: OOM Killerがどのプロセスを終了させるか判断するスコア

## シナリオ設定

{{ hostname }} で {{ victim_service }} が予兆なく停止したと報告がありました。既に発生した障害の証跡をログから調査し、原因を特定してください（メモリを意図的に枯渇させる再現操作は行いません）。

## 手順

### 1. サービスの終了理由を確認する

```bash
systemctl status {{ victim_service }}
```

signal 9 や oom-kill による終了でないか確認します。

### 2. カーネルログでOOM Killer発動の証跡を確認する

```bash
journalctl -k | grep -i oom
dmesg -T | grep -i "killed process"
```

発動時刻と犠牲プロセス（victim）を特定します。

### 3. 現在のメモリ状況を確認する

```bash
free -h
```

available列を確認し、「free（空き）が少ない＝異常」ではなく、ページキャッシュを含めた available で判断します。

### 4. メモリ消費上位プロセスを確認する

```bash
ps aux --sort=-rss | head -10
```

### 5. スワップの有無・使用状況を確認する

```bash
swapon --show
free -h | grep Swap
```

### 6. サービスを復帰させ、恒久対策の選択肢を記録する

```bash
systemctl start {{ victim_service }}
systemctl is-active {{ victim_service }}
```

恒久対策の例: メモリ上限の見直し、cgroupでのリソース制限、メモリリークの調査、スケールアウト。

## 動作確認

- {{ victim_service }} が active に復帰していること
- `journalctl -k` に新規のOOM発生がないこと
- available メモリが基準値以上であること
- 報告記録に犠牲プロセスと発動時刻が明記されていること

## 注意事項

- 意図的なメモリ枯渇の再現はさせず、既発生の証跡調査型として実施する（本番相当環境でメモリを枯渇させるとシステム全体に影響するため）。
- 恒久対策の判断が難しい場合は {{ escalation }} へエスカレーションする。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "oom-memory-triage"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "journalctl -k" in content
assert "oom_score" in content
```
Expected: 全 assert が通り `OK: oom-memory-triage` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/oom-memory-triage.yaml assets/examples/oom-memory-triage.j2
git commit -m "$(cat <<'EOF'
docs(templates): add oom-memory-triage scenario (#546)

Refs #541
EOF
)"
```

---

### Task 8: mail-delivery-triage の追加

**Files:**
- Create: `assets/examples/mail-delivery-triage.yaml`
- Create: `assets/examples/mail-delivery-triage.j2`

- [ ] **Step 1: データファイルを作成する**

```yaml
title: Postfixからのメール送信不能
hostname: mail-relay-01
domain: example-training.internal
test_recipient: check@example-training.internal
escalation: インフラ基盤チーム (内線 1201)
```

- [ ] **Step 2: テンプレートを作成する**

```jinja
# メール送信不能（Postfix）の切り分け — {{ hostname }}

- **対象ドメイン**: {{ domain }}
- **試験送信先**: {{ test_recipient }}

## 目的

メールが「届かない」障害を、キュー・ログ・DNS(MX)・ポート到達性の4層に分解して切り分けられるようになることを目指します。メールは即時通信ではなくキュー型の非同期配送であることを理解します。

## 用語解説

- **MTA**: メールの転送・配送を担うソフトウェア（Postfix等）
- **メールキュー**: 配送待ち・配送中のメールが一時的に溜まる領域
- **mailq**: 現在のメールキューの内容を表示するコマンド
- **deferred(配送遅延)**: 一時エラーにより再試行待ちとなっているメールの状態
- **MXレコード**: ドメイン宛のメールをどのサーバへ配送するかを示すDNSレコード
- **SMTPポート(25/587)**: メール配送に使われる標準ポート
- **メールログ**: MTAが出力する配送試行・結果の記録
- **バウンスメール**: 配送に失敗したことを送信者へ通知するメール

## シナリオ設定

{{ hostname }} からのメールが宛先に届かないとの報告がありました。ローカル配送前提（外部宛の実配送は行わない）で切り分けてください。

## 手順

### 1. Postfixサービス自体の生死を確認する

```bash
systemctl status postfix
```

### 2. 滞留メールとdeferred理由を確認する

```bash
mailq
postqueue -p
```

### 3. メールログで該当メールの配送試行ログを追う

```bash
grep -i "{{ test_recipient }}" /var/log/mail.log | tail -30
```

### 4. 宛先ドメインのMXレコードを確認する

```bash
dig MX {{ domain }} +short
```

### 5. 宛先SMTPポートへの到達性を確認する

```bash
nc -zv $(dig MX {{ domain }} +short | awk '{print $2}' | sed 's/\.$//' | head -1) 25
```

### 6. 原因解消後にキューを再配送する

```bash
postqueue -f
sleep 5
mailq
```

## 動作確認

- `mailq` が空、またはdeferredが減少していること
- メールログに `status=sent` が記録されていること
- テストメールが {{ test_recipient }} 宛にローカル配送で到達していること（`mail -s test {{ test_recipient }}` 等で確認）

## 注意事項

- 外部宛の実配送はテスト環境のドメイン・ローカル配送に限定し、実在の第三者へメールを送信しない。演習環境依存になるためローカル配送前提で設計する。
- 原因がDNS/上位ネットワークにまたがる場合は {{ escalation }} へエスカレーションする。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "mail-delivery-triage"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "postqueue -f" in content
assert "dig MX" in content
```
Expected: 全 assert が通り `OK: mail-delivery-triage` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/mail-delivery-triage.yaml assets/examples/mail-delivery-triage.j2
git commit -m "$(cat <<'EOF'
docs(templates): add mail-delivery-triage scenario (#546)

Refs #541
EOF
)"
```

---

### Task 9: alert-first-response の追加

**Files:**
- Create: `assets/examples/alert-first-response.yaml`
- Create: `assets/examples/alert-first-response.j2`

- [ ] **Step 1: データファイルを作成する**

```yaml
title: 監視アラート一次対応演習
hostname: web-prod-01
alert_types:
  - type: 死活監視アラート
    check_command: systemctl is-active nginx
  - type: ディスク使用率アラート
    check_command: df -h /var
  - type: 負荷アラート
    check_command: uptime
escalation: インフラ基盤チーム (内線 1201、演習用連絡先)
```

- [ ] **Step 2: テンプレートを作成する**

```jinja
# アラート一次対応の型（受信から報告まで） — {{ hostname }}

## 目的

アラートを受けてから「事実確認→影響範囲把握→暫定対処orエスカレーション→報告」までの一次対応の型を、種別別チェックリストに沿って実行できるようになることを目指します。

## 用語解説

- **アラート**: 監視システムが異常の可能性を検知した際に発する通知
- **一次対応と二次対応**: 一次対応はアラート受信直後の事実確認・暫定対処、二次対応は原因の恒久対応
- **エスカレーション**: 自分で解決できない場合に上位・専門チームへ引き継ぐこと
- **影響範囲**: 障害によって実際に影響を受けているユーザー・システムの範囲
- **暫定対処と恒久対処**: 暫定対処は応急的な回復、恒久対処は根本原因の解消
- **誤検知(false positive)**: 実際には異常がないのにアラートが発報された状態
- **対応記録(タイムライン)**: 発生から解決までの経緯を時系列で残す記録
- **SLA**: サービスが満たすべき稼働率・応答時間等の合意基準

## シナリオ設定

{{ hostname }} から以下いずれかの種別のアラートを受信しました。演習用の連絡先を用いて一次対応の型を実施してください（実際の緊急連絡網は使用しません）。

## 対応手順

### 1. アラート内容を記録する

- 対象ホスト: {{ hostname }}
- 発生時刻: <アラート受信時刻を記入>
- アラート種別: <下表から選択>

### 2. 種別対応表に沿って事実確認を行う
{% for a in alert_types %}
#### {{ a.type }}

```bash
{{ a.check_command }}
```
{% endfor %}

### 3. 誤検知(false positive)かどうかを一次判定する

監視側要因（監視サーバ自体の不調、閾値設定ミス等）の可能性を必ず1回疑ってから対応方針を決めます。

### 4. 影響範囲を確認する

ユーザー影響の有無を確認します（サービス応答確認、他システムからの疎通確認等）。

### 5. エスカレーション基準と照合する

| 状況 | 対応 |
| --- | --- |
| 誤検知と判定できた | 監視設定の見直しを記録しクローズ |
| 暫定対処で復旧した | 復旧内容を記録し恒久対応をチケット化 |
| 自己解決できない・影響が広範 | {{ escalation }} へエスカレーション |

### 6. 時系列の対応記録を残す

| 時刻 | 確認結果 | 判断根拠 |
| --- | --- | --- |
| <記入> | <記入> | <記入> |

## 動作確認

- タイムライン記録に発生時刻・確認結果・判断根拠が揃っていること
- エスカレーション判断が基準表のどの行に該当したか明記されていること
- アラートがクローズまたは引き継ぎ完了していること

## 注意事項

- 実際のインシデント対応ではなく演習であることを明記する。
- エスカレーション基準表の判断が実際の緊急連絡網に影響しないよう、演習用の連絡先（{{ escalation }}）を使用する。
```

- [ ] **Step 3: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "alert-first-response"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "死活監視アラート" in content
assert "false positive" in content
```
Expected: 全 assert が通り `OK: alert-first-response` が出力される。

- [ ] **Step 4: コミット**

```bash
git add assets/examples/alert-first-response.yaml assets/examples/alert-first-response.j2
git commit -m "$(cat <<'EOF'
docs(templates): add alert-first-response scenario (#546)

Refs #541
EOF
)"
```

---

### Task 10: web/src/lib/templates.ts への9エントリ登録

**Files:**
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: META配列に9エントリを追加する**

`web/src/lib/templates.ts` の `META` 配列の最後の要素（`zero-trust-access`）の直後、閉じ括弧 `];` の前に以下を追加する（`updated` は実装コミット日 `2026-07-13` とする）:

```typescript
  { id: "disk-usage-triage", name: "ディスク使用率100%障害の切り分けと復旧", desc: "df/du/lsof/journalctlでディスク枯渇の原因を特定し、安全に領域回復する手順書（Markdown）を生成。", category: "runbook", subCategory: "ディスク", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "systemd-service-recovery", name: "systemdサービス起動失敗の調査と復旧", desc: "systemctl/journalctlでサービス起動失敗の原因を特定し、恒久復旧する手順書（Markdown）を生成。", category: "runbook", subCategory: "systemd復旧", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "cron-healthcheck", name: "cronとシェルスクリプトによる簡易死活監視の構築", desc: "CSVの監視対象一覧から、cron + logger による最小構成の死活監視スクリプトと登録手順書（Markdown）を生成。", category: "server", subCategory: "監視", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
  { id: "load-spike-triage", name: "サーバ負荷急増時の一次切り分け", desc: "uptime/top/iostatでCPU起因・I/O起因・プロセス暴走を切り分け、対処判断基準表に沿って対応する手順書（Markdown）を生成。", category: "runbook", subCategory: "負荷", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "logrotate-setup", name: "logrotateによるログローテーション設定", desc: "CSVのログ定義からlogrotate設定を生成し、dry-run検証から適用までの手順書（Markdown）を生成。", category: "server", subCategory: "ログ運用", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
  { id: "web-error-log-triage", name: "Webサーバの5xxエラー多発時のログ調査", desc: "アクセスログ/エラーログをawk/uniqで集計し、5xxエラーの原因を切り分ける手順書（Markdown）を生成。", category: "runbook", subCategory: "Webログ", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "oom-memory-triage", name: "メモリ枯渇・OOM Killer発動時の切り分け", desc: "free/journalctl -kからOOM Killer発動の証跡を調査し、犠牲プロセスを特定する手順書（Markdown）を生成。", category: "runbook", subCategory: "メモリ", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "mail-delivery-triage", name: "メール送信不能（Postfix）の切り分け", desc: "mailq/メールログ/MXレコード/ポート到達性の4層でメール配送不能の原因を切り分ける手順書（Markdown）を生成。", category: "runbook", subCategory: "メール", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "alert-first-response", name: "アラート一次対応の型（受信から報告まで）", desc: "種別別チェックリストに沿って事実確認・影響範囲把握・エスカレーション判断・報告を行う手順書（Markdown）を生成。", category: "runbook", subCategory: "一次対応", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 2: TypeScript型チェックを実行する**

```bash
cd web && npx tsc --noEmit
```
Expected: 型エラー0件。

- [ ] **Step 3: Webテストを実行する**

```bash
cd web && npm test -- --run
```
Expected: 既存テスト全件PASS（`templates.ts` の glob 読込は9エントリ分自動的にペアを解決する）。

- [ ] **Step 4: コミット**

```bash
git add web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(web): register phase3 incident/monitoring/log scenarios (#546)

Refs #541
EOF
)"
```

---

### Task 11: 全体検証とPR作成

**Files:**
- なし（既存ファイルの検証のみ）

- [ ] **Step 1: Python側の既存テストを実行する**

```bash
uv run pytest -k 'not e2e' -q
```
Expected: 既存448件＋新規9件のレンダリングテストが全てPASS（`tests/unit/test_example_templates_render.py` が9ペアを自動発見する）。

- [ ] **Step 2: TypeScript型チェックとWebテストを再実行する**

```bash
cd web && npx tsc --noEmit && npm test -- --run
```
Expected: 型エラー0件、既存テスト全件PASS。

- [ ] **Step 3: developブランチとの差分を確認する**

```bash
git diff origin/develop...HEAD --stat
```
Expected: `assets/examples/*` の新規18ファイル（9ペア）と `web/src/lib/templates.ts` の変更のみ。

- [ ] **Step 4: `/code-review` を高効度で実行する**

`/code-review` スキルを高効度（high）で実行し、指摘があれば修正して再レビューする。

- [ ] **Step 5: PRを作成する**

PR #543 の本文構成（Summary / Test plan / Refs）を踏襲し、ASCIIのみで記述する。タイトル:

```
Phase 3: add 9 incident/monitoring/log training scenarios (Closes #546)
```

本文には `Refs #541` `Closes #546` を含める。作成後は `subscribe_pr_activity` でCI・レビューを監視し、CI失敗・レビューコメントに対応する。
