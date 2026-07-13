# フェーズ4: セキュリティ/バックアップシナリオ10本 追加 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-design.md` のフェーズ4対象10シナリオ（ssh-key-hygiene, rsync-daily-backup, restore-drill, sudo-least-privilege, password-policy-basics, log-integrity-hash, account-audit, cert-expiry-watch, fail2ban-ssh-guard, vuln-patch-triage）を、既存9テンプレートと同じ6セクション構成（目的/用語解説/シナリオ設定/手順/動作確認/注意事項）で `assets/examples/` に追加し、`web/src/lib/templates.ts` に登録する。

**Architecture:** 各シナリオは `assets/examples/<id>.<format>`（データファイル）+ `assets/examples/<id>.j2`（テンプレート）のペアとして独立に追加する。`web/src/lib/templates.ts` の `META` 配列に1エントリずつ追加する（`category`/`subCategory`は既存の型に収まるため `web/src/lib/types.ts` の変更は不要）。データ変数化はせず、目的・用語解説・注意事項はテンプレート内に固定文章として直接記述する（既存9本のブラッシュアップと同じ方針）。各テンプレートの追加後、Pythonの本物のレンダリングエンジン（`features.config_parser.ConfigParser` + `features.document_render.DocumentRender`）で strict-undefined レンダリングを実行し、Jinja構文エラーが出ないこと・想定した本文（見出し・固有コマンド）が出力に含まれることを確認してからコミットする。`tests/unit/test_example_templates_render.py` はファイルペアを動的検出するため、テストコード自体の変更は不要（ペア追加だけで自動的にテスト対象になる）。

**Tech Stack:** Jinja2 テンプレート（`.j2`）、TOML/YAML/CSV データファイル、Python 3（`features/config_parser.py` / `features/document_render.py`）、TypeScript（`web/src/lib/templates.ts`）、uv、Vitest/tsc

**Issue:** #547（親issue #541、フェーズ1は issue #542 / PR #543）

> **Post-plan corrections:** レビュー（内部/外部双方）により、以下5シナリオの埋め込みコードは実装後に修正されており、この計画書内の該当スニペットは古いままです。実装の正としては本計画書ではなく `assets/examples/*.j2` を参照してください。
> - restore-drill: チェックサム照合から `--ignore-missing` を削除（不完全な復元を検知できるように）
> - sudo-least-privilege: 一時ファイルで `visudo -cf` 検証してから `{{ sudoers_file }}` へアトミックに反映する方式に変更
> - rsync-daily-backup: Step 4（世代ディレクトリ作成）とcronスクリプトの両方に `--exclude` を追加
> - fail2ban-ssh-guard: Step 4-5 を「localhostでの検知確認（127.0.0.1はignoreipのため遮断されない）」と「`test.attacker_ip` への手動ban/unban確認」の2段階に再構成
> - vuln-patch-triage: `dnf update --advisory=` を `--cve=` に修正（CVE IDはadvisory IDではないため）

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

実行コマンド: `uv run python -c "$(cat <<'PYEOF'\n<上記スクリプト、assert追加分込み>\nPYEOF\n)"`

`AssertionError` が出た場合はテンプレートの構文・変数参照を見直す。用語解説に列挙した語は本文中に必ず登場させ（グラウンディング）、逆に本文で使う専門用語は用語解説に含める（双方向チェック）。これはフェーズ1で発見された既知バグクラス（用語解説と本文の不一致、`{{ loop_index }}` のような存在しないJinja変数）を防ぐための確認である。

---

### Task 1: ssh-key-hygiene（SSH鍵管理のベストプラクティス）

**Files:**
- Create: `assets/examples/ssh-key-hygiene.toml`
- Create: `assets/examples/ssh-key-hygiene.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```toml
[server]
host = "app-01"
admin_user = "ops"

[key]
type = "ed25519"
comment = "ops@app-01"
label = "id_ed25519_app01"

[paths]
sshd_dropin = "/etc/ssh/sshd_config.d/60-disable-password.conf"
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# SSH鍵管理のベストプラクティス — {{ server.host }}

対象サーバ **{{ server.host }}** に鍵ペアを配置し、パスワード認証を無効化するまでの手順です。ロックアウトを防ぐため、別セッションでの確認を挟みながら進めてください。

## 目的

公開鍵認証の仕組み（秘密鍵は絶対に外へ出さない）を理解し、鍵ペアの生成から配置・権限設定・パスワード認証の無効化までを安全に実施できるようになることを目指します。

## 用語解説

- **公開鍵認証**: 秘密鍵を持つ者だけがログインできる認証方式
- **秘密鍵と公開鍵**: 秘密鍵は本人だけが保持し、公開鍵はログイン先サーバに配置するペアの鍵
- **パスフレーズ**: 秘密鍵自体を保護するための追加のパスワード
- **ed25519**: 現在推奨される鍵アルゴリズムの1つ
- **authorized_keys**: ログインを許可する公開鍵の一覧ファイル
- **パーミッション(600/700)**: `.ssh` ディレクトリとその中のファイルに必要な厳格な権限
- **known_hosts**: 接続先サーバの公開鍵を記録し、なりすましを検知するファイル

## 1. 鍵ペアを生成する

パスフレーズ付きで鍵ペアを生成します。

```bash
ssh-keygen -t {{ key.type }} -C "{{ key.comment }}" -f ~/.ssh/{{ key.label }}
```

生成された2つのファイルのうち、`{{ key.label }}`（拡張子なし）が **秘密鍵**、`{{ key.label }}.pub` が **公開鍵** です。秘密鍵は他者に送信・共有しないでください。

## 2. 公開鍵を対象サーバへ配置する

初回接続時は `known_hosts` に接続先サーバの公開鍵（フィンガープリント）が登録され、以後のなりすまし検知に使われます。

```bash
ssh-copy-id -i ~/.ssh/{{ key.label }}.pub {{ server.admin_user }}@{{ server.host }}
```

## 3. パーミッション（権限）を是正する

```bash
ssh {{ server.admin_user }}@{{ server.host }} "chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

## 4. 鍵認証でログインできることを確認する

パスワード認証と並行運用のまま、鍵でログインできることを確認します。

```bash
ssh -i ~/.ssh/{{ key.label }} {{ server.admin_user }}@{{ server.host }} hostname
```

## 5. パスワード認証を無効化する

構文チェックを挟んでから反映します。**この確認が取れるまで次のコマンドは実行しないでください。**

```bash
ssh {{ server.admin_user }}@{{ server.host }} 'echo "PasswordAuthentication no" | sudo tee {{ paths.sshd_dropin }}'
ssh {{ server.admin_user }}@{{ server.host }} "sudo sshd -t"
```

`sshd -t` がエラーなく終了したことを確認したら、**現在のセッションを切断せずに別セッションを開いた状態で** reload します。

```bash
ssh {{ server.admin_user }}@{{ server.host }} "sudo systemctl reload sshd"
```

## 動作確認

- `ssh -i ~/.ssh/{{ key.label }} {{ server.admin_user }}@{{ server.host }}` で鍵ログインが成功すること
- パスワードのみでの接続が拒否されること
- `sudo sshd -t` がエラーなく通ること

## 注意事項

- `PasswordAuthentication no` を設定する前に、必ず鍵認証でログインできることを別セッションで確認する（自分をロックアウトするリスクがある）。
- 秘密鍵は絶対に他者に送信・共有せず、演習環境外に持ち出さない。
- `authorized_keys` の権限が緩い（グループ/その他に書き込み可）場合、sshd が鍵認証を拒否することがある。
```

- [ ] **Step 3: `web/src/lib/templates.ts` の `META` 配列に追加する**

`dgx-spark-ollama` エントリの直前（`firewall-rules` の次）に以下を挿入する:

```ts
  { id: "ssh-key-hygiene", name: "SSH鍵管理のベストプラクティス", desc: "鍵ペアの生成から配置・権限是正・パスワード認証無効化までを、ロックアウト防止手順つきで生成。", category: "server", subCategory: "SSH", format: "toml", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "ssh-key-hygiene"`, `DATA_EXT = "toml"` で実行する。加えて:
```python
assert "ssh-keygen -t ed25519" in content
assert "PasswordAuthentication no" in content
```
Expected: 全 assert が通り `OK: ssh-key-hygiene` が出力される。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/ssh-key-hygiene.toml assets/examples/ssh-key-hygiene.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add ssh-key-hygiene security scenario (#547)

Refs #541
EOF
)"
```

---

### Task 2: rsync-daily-backup（rsyncによる日次バックアップ取得）

**Files:**
- Create: `assets/examples/rsync-daily-backup.yaml`
- Create: `assets/examples/rsync-daily-backup.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```yaml
source_dirs:
  - /srv/app/data
  - /srv/app/config
exclude_patterns:
  - "*.tmp"
  - "cache/"
backup_root: /backup/app
retention_days: 14
cron:
  schedule: "0 2 * * *"
  script_path: /usr/local/bin/backup-app.sh
  log_path: /var/log/backup-app.log
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# rsyncによる日次バックアップ取得 — {{ backup_root }}

対象ディレクトリを rsync で `{{ backup_root }}` 配下へ日次バックアップします。世代管理にはハードリンク（`--link-dest`）を使い、ディスク消費を抑えます。

## 目的

「コピー」と「バックアップ」の違い（世代・差分・除外）を理解し、rsync と cron で日次バックアップを構成・検証できるようになることを目指します。

## 用語解説

- **フルバックアップと差分**: 毎回全体を複製するか、変化分だけを扱うかの違い
- **rsyncのアーカイブモード(-a)**: パーミッション・タイムスタンプ・シンボリックリンクを保ったまま複製するオプション
- **--dry-run**: 実際には転送せず、転送予定のみを表示するオプション
- **--deleteの危険性**: 宛先にしかないファイルを削除する破壊的オプション
- **除外パターン**: バックアップ対象から外すファイル・ディレクトリの指定
- **3-2-1ルール**: データを3部、2種類の媒体に、うち1部を別の場所に保管する原則
- **ハードリンク世代管理(--link-dest)**: 変化のないファイルを複製せずリンクで共有し、世代ごとの容量増加を防ぐ仕組み

## 1. バックアップ対象と除外を確認する

```bash
{% for d in source_dirs %}echo "対象: {{ d }}"
{% endfor %}{% for p in exclude_patterns %}echo "除外: {{ p }}"
{% endfor %}```

## 2. dry-runで転送予定を確認する

本実行の前に、必ず `--dry-run`（`-n`）で転送対象を確認します。

```bash
mkdir -p {{ backup_root }}
{% for d in source_dirs %}rsync -avn {% for p in exclude_patterns %}--exclude='{{ p }}' {% endfor %}{{ d }}/ {{ backup_root }}/latest{{ d }}/
{% endfor %}```

## 3. 本実行し、ログを保存する

```bash
{% for d in source_dirs %}rsync -av {% for p in exclude_patterns %}--exclude='{{ p }}' {% endfor %}{{ d }}/ {{ backup_root }}/latest{{ d }}/ | tee -a {{ cron.log_path }}
{% endfor %}```

## 4. ハードリンクで世代ディレクトリを作成する

`latest` を基準に、日付ディレクトリへ `--link-dest` でハードリンク世代を作ります。

```bash
DATE=$(date +%Y-%m-%d)
{% for d in source_dirs %}rsync -av --link-dest={{ backup_root }}/latest{{ d }} {{ d }}/ {{ backup_root }}/${DATE}{{ d }}/
{% endfor %}```

## 5. cronに日次ジョブを登録する

```bash
sudo tee {{ cron.script_path }} <<'EOF'
#!/bin/bash
set -euo pipefail
{% for d in source_dirs %}rsync -av --link-dest={{ backup_root }}/latest{{ d }} {{ d }}/ {{ backup_root }}/$(date +%Y-%m-%d){{ d }}/
{% endfor %}EOF
sudo chmod +x {{ cron.script_path }}
(crontab -l 2>/dev/null; echo "{{ cron.schedule }} {{ cron.script_path }} >> {{ cron.log_path }} 2>&1") | crontab -
```

## 6. 保持ポリシーを確認する

保持日数は `{{ retention_days }}` 日です。古い世代ディレクトリは保持日数を超えたものから削除します（`find {{ backup_root }} -maxdepth 1 -mtime +{{ retention_days }} -type d`）。

## 動作確認

- dry-run（Step 2）と本実行（Step 3）の転送件数が一致すること
- `diff -r` で元と複製の内容が一致すること
- 2世代目のディレクトリが `du -sh` でディスクをほぼ消費していないこと（ハードリンクの効果）
- `crontab -l` に登録したジョブが表示され、`{{ cron.log_path }}` に実行痕跡があること

## 注意事項

- `--delete` オプションは宛先にしかないファイルを削除する破壊的操作のため、本計画では使用せず、必要な場合も必ず `--dry-run` で対象を確認してから追加する。
- `--link-dest` の基準ディレクトリ（`latest`）を誤ると、世代間のハードリンクが効かずディスクを浪費する。
- 保持日数（`{{ retention_days }}` 日）を超えた世代ディレクトリの削除は、削除前に一覧を確認してから実行する。
- このバックアップは同一拠点内の複製にとどまる。3-2-1ルール（データを3部、2種類の媒体に、うち1部を別拠点に）に沿うには、`{{ backup_root }}` の複製をさらに別拠点・別媒体へ複製することを検討する。
```

- [ ] **Step 3: `web/src/lib/templates.ts` の `META` 配列に追加する**

Task 1 のエントリの直後に以下を挿入する:

```ts
  { id: "rsync-daily-backup", name: "rsyncによる日次バックアップ取得", desc: "rsyncとcronでハードリンク世代管理つきの日次バックアップを構成し、dry-runと保持ポリシーを検証。", category: "server", subCategory: "バックアップ", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "rsync-daily-backup"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "rsync -avn" in content
assert "--link-dest" in content
```
Expected: 全 assert が通り `OK: rsync-daily-backup` が出力される。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/rsync-daily-backup.yaml assets/examples/rsync-daily-backup.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add rsync-daily-backup security scenario (#547)

Refs #541
EOF
)"
```

---

### Task 3: restore-drill（バックアップからのリストア訓練）

**Files:**
- Create: `assets/examples/restore-drill.yaml`
- Create: `assets/examples/restore-drill.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```yaml
backup_root: /backup/app
restore_tmp_dir: /restore/tmp
production_path: /srv/app/data
incident:
  date: "2026-07-10"
  description: "設定ファイルを誤って削除した"
generation: "2026-07-09"
checksum_manifest: /backup/app/checksums/2026-07-09.sha256
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# バックアップからのリストア訓練 — {{ production_path }}

「{{ incident.description }}」（{{ incident.date }} 発生想定）を演習用ディレクトリで再現し、`{{ backup_root }}` の世代からリストアする訓練です。`rsync-daily-backup` シナリオで取得したバックアップから復元する想定で、必ずそちらを先に実施してから本シナリオへ進んでください。

## 目的

「リストアできて初めてバックアップ」という原則を理解し、誤削除を想定した復元作業を、本番を汚さない検証手順つきで実施できるようになることを目指します。

## 用語解説

- **リストア**: バックアップからデータを復元する作業
- **RPO・RTO**: RPOは「どの時点まで戻せるか」、RTOは「復旧にかかる時間」の目標値
- **世代選択**: 複数のバックアップ世代から、復元すべき正しい時点を選ぶこと
- **復元先の分離**: 復元データをまず一時ディレクトリへ戻し、本番パスへ直接上書きしないこと
- **チェックサム**: ハッシュ値を比較してファイルの完全性を検証する手法
- **リストア訓練(DRドリル)**: 実際に復元操作を行い、手順とRTOを検証する演習

## 1. 誤削除を演習用ディレクトリで再現する

```bash
mkdir -p {{ restore_tmp_dir }}/incident-repro
cp -a {{ production_path }}/. {{ restore_tmp_dir }}/incident-repro/
rm -f {{ restore_tmp_dir }}/incident-repro/*.conf
echo "再現完了: $(date)"
```

## 2. 復元すべき世代を特定する

障害発生時刻（{{ incident.date }}）から、直前の世代 `{{ generation }}` を復元対象と判断します。

```bash
ls -1 {{ backup_root }} | sort
```

## 3. 一時ディレクトリへ復元する

本番パスへ直接戻さず、まず一時ディレクトリへ復元します。

```bash
START=$(date +%s)
mkdir -p {{ restore_tmp_dir }}/restored
rsync -a {{ backup_root }}/{{ generation }}{{ production_path }}/ {{ restore_tmp_dir }}/restored/
```

## 4. チェックサムで完全性を検証する

```bash
sha256sum -c {{ checksum_manifest }} --ignore-missing
```

## 5. 本来のパスへ移動し、所有者・権限を復旧する

検証が通ったら、本番パスへ反映します。

```bash
sudo rsync -a --owner --group --perms {{ restore_tmp_dir }}/restored/ {{ production_path }}/
stat -c '%U %G %a' {{ production_path }}
```

## 6. 所要時間を記録する

RTO（復旧にかかった時間）を実測します。今回選んだ世代（`{{ generation }}`）と障害発生日（{{ incident.date }}）の差が、実質的な RPO（許容したデータロス範囲）です。

```bash
END=$(date +%s)
echo "RTO実測値: $((END - START)) 秒"
echo "RPO目安: {{ incident.date }} 時点の障害に対し {{ generation }} 世代（前日分）まで復元"
```

## 動作確認

- 復元ファイルのチェックサムが `{{ checksum_manifest }}` の記録と一致すること
- `stat` で確認した所有者・パーミッションが元の状態と一致すること
- 復元作業の所要時間（RTO実測値）が記録されていること

## 注意事項

- 復元は必ず `{{ restore_tmp_dir }}` に対して行い、本番パス（`{{ production_path }}`）へ直接上書きしない。
- 誤ったバックアップ世代を選択すると、古いデータで本番を上書きするリスクがある。世代の日付を必ず確認する。
- 本シナリオは `rsync-daily-backup` と対で運用する（先にバックアップを取得済みであることが前提）。
```

- [ ] **Step 3: `web/src/lib/templates.ts` の `META` 配列に追加する**

Task 2 のエントリの直後に以下を挿入する:

```ts
  { id: "restore-drill", name: "バックアップからのリストア訓練", desc: "誤削除を演習用ディレクトリで再現し、世代選択・一時領域への復元・チェックサム検証・RTO計測までを実施。", category: "runbook", subCategory: "リストア", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "restore-drill"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "sha256sum -c" in content
assert "RTO実測値" in content
```
Expected: 全 assert が通り `OK: restore-drill` が出力される。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/restore-drill.yaml assets/examples/restore-drill.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add restore-drill security scenario (#547)

Refs #541
EOF
)"
```

---

### Task 4: sudo-least-privilege（sudo権限の最小化）

**Files:**
- Create: `assets/examples/sudo-least-privilege.yaml`
- Create: `assets/examples/sudo-least-privilege.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```yaml
target_user: appdeploy
sudoers_file: /etc/sudoers.d/appdeploy
allowed_commands:
  - /usr/bin/systemctl restart app.service
  - /usr/bin/systemctl status app.service
  - /usr/bin/journalctl -u app.service
forbidden_test_command: /usr/sbin/useradd testuser
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# sudo権限の最小化 — {{ target_user }}

ユーザー **{{ target_user }}** に「全部sudo可」を許さず、必要なコマンドだけを許可する最小権限の sudoers 設定を行います。設定は必ず `visudo` 系のコマンドで構文検証してから反映してください。

## 目的

「全部sudo可」の危険性を理解し、visudoによる構文検証を挟みながら、必要なコマンドだけを許可する最小権限のsudoers設定を実施できるようになることを目指します。

## 用語解説

- **最小権限の原則**: 必要な操作だけを許可し、それ以外は許可しない設計原則
- **sudoers**: sudo の許可ルールを定義するファイル
- **visudo(構文チェックの意味)**: 構文エラーのある設定を反映してしまい、sudoが一切使えなくなる事故を防ぐための専用エディタ/検証コマンド
- **sudoers.dドロップイン**: `/etc/sudoers` 本体を直接編集せず、`/etc/sudoers.d/` に個別ファイルとして追加する方式
- **コマンドエイリアス**: 複数のコマンドをまとめて名前を付けて扱う sudoers の機能
- **監査ログ**: sudo の実行記録が残るログ（`/var/log/secure` 等）

## 1. 現状の権限を確認する

```bash
sudo -l -U {{ target_user }}
```

## 2. sudoers.d に限定ルールのファイルを作成する

`/etc/sudoers` 本体は編集せず、`{{ sudoers_file }}` にドロップインとして作成します。

```bash
sudo tee {{ sudoers_file }} <<'EOF'
{% for c in allowed_commands %}{{ target_user }} ALL=(root) NOPASSWD: {{ c }}
{% endfor %}EOF
sudo chmod 440 {{ sudoers_file }}
```

## 3. 反映前に構文検証する

**構文検証をパスするまで、次のステップには進まないでください。**

```bash
sudo visudo -cf {{ sudoers_file }}
```

## 4. 別セッションでrootシェルを保持したまま試験する

万一設定を誤っても復旧できるよう、別セッションで `sudo -i` 等のrootシェルを開いたまま試験します。

```bash
sudo -l -U {{ target_user }}
{% for c in allowed_commands %}sudo -u {{ target_user }} sudo -l | grep -F "{{ c }}" && echo "許可確認OK: {{ c }}"
{% endfor %}sudo -u {{ target_user }} sudo {{ forbidden_test_command }} 2>&1 | grep -i "not allowed" && echo "拒否確認OK: {{ forbidden_test_command }}"
```

## 動作確認

- `sudo -l -U {{ target_user }}` に許可コマンドのみが列挙されること
- `allowed_commands` の各コマンドが成功し、`forbidden_test_command` が拒否されること
- sudo実行が監査ログ（`/var/log/secure` 等）に記録されること

## 注意事項

- `visudo -cf` で構文検証せずに反映すると、sudoが一切使えなくなり自分をロックアウトする危険がある。
- 別セッションでrootシェルを保持したまま作業し、設定ミスに気付いた場合すぐに復旧できるようにする。
- `NOPASSWD` を安易に付与すると、パスワード確認なしで許可コマンドが実行できてしまうため、対象コマンドを必要最小限に絞る。
- 許可コマンドが増える場合はコマンドエイリアス（`Cmnd_Alias`）で一括管理する方法もあるが、本シナリオでは対象が少ないため個別指定とした。
```

- [ ] **Step 3: `web/src/lib/templates.ts` の `META` 配列に追加する**

Task 3 のエントリの直後に以下を挿入する:

```ts
  { id: "sudo-least-privilege", name: "sudo権限の最小化", desc: "sudoers.dドロップインとvisudo構文検証で、必要なコマンドだけを許可する最小権限設定を安全に反映。", category: "server", subCategory: "sudo", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "sudo-least-privilege"`, `DATA_EXT = "yaml"` で実行する。加えて:
```python
assert "visudo -cf" in content
assert "NOPASSWD" in content
```
Expected: 全 assert が通り `OK: sudo-least-privilege` が出力される。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/sudo-least-privilege.yaml assets/examples/sudo-least-privilege.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add sudo-least-privilege security scenario (#547)

Refs #541
EOF
)"
```

---

### Task 5: password-policy-basics（パスワードポリシーの設定）

**Files:**
- Create: `assets/examples/password-policy-basics.toml`
- Create: `assets/examples/password-policy-basics.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```toml
[pwquality]
minlen = 14
dcredit = -1
ucredit = -1
lcredit = -1
ocredit = -1
dictcheck = 1
retry = 3

[login_defs]
pass_max_days = 90
pass_min_days = 1
pass_warn_age = 7

[[existing_users]]
name = "sato"

[[existing_users]]
name = "suzuki"

[test]
weak_password = "password123"
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# パスワードポリシーの設定

pam_pwquality と login.defs で、長さ優先・辞書チェックを重視した現代的なパスワードポリシーを設定し、既存ユーザーには自動遡及しないことを確認します。

## 目的

NIST SP 800-63Bの要点（長さ優先・不要な定期変更の廃止という現代的なパスワード指針）を理解し、pwqualityとlogin.defsでポリシーを設定・検証できるようになることを目指します。

## 用語解説

- **pam_pwquality**: パスワードの強度をチェックするPAMモジュール
- **login.defs**: パスワードの有効期限などアカウント全体のデフォルト値を定義するファイル
- **最小長(minlen)**: パスワードに必要な最小文字数
- **有効期限(chage)**: パスワードの有効期限をユーザー単位で確認・設定するコマンド
- **アカウントロック(faillock)**: 認証失敗が続いた場合にアカウントを一時的にロックする仕組み
- **辞書攻撃**: 辞書に載っている単語を総当たりで試すパスワード攻撃手法
- **NIST SP 800-63Bの要点**: 長さを重視し、定期的な強制変更は求めないという現代的な指針

## 1. 現行ポリシーを確認する

```bash
cat /etc/security/pwquality.conf
{% for u in existing_users %}sudo chage -l {{ u.name }}
{% endfor %}```

## 2. pwquality.conf にポリシーを反映する

```bash
sudo tee -a /etc/security/pwquality.conf <<'EOF'
minlen = {{ pwquality.minlen }}
dcredit = {{ pwquality.dcredit }}
ucredit = {{ pwquality.ucredit }}
lcredit = {{ pwquality.lcredit }}
ocredit = {{ pwquality.ocredit }}
dictcheck = {{ pwquality.dictcheck }}
retry = {{ pwquality.retry }}
EOF
```

`dictcheck = 1` は、辞書攻撃（辞書に載っている単語を総当たりで試す攻撃）で破られやすい単語ベースのパスワードを拒否する設定です。

## 3. login.defs に有効期限のデフォルト値を設定する

```bash
sudo sed -i "s/^PASS_MAX_DAYS.*/PASS_MAX_DAYS   {{ login_defs.pass_max_days }}/" /etc/login.defs
sudo sed -i "s/^PASS_MIN_DAYS.*/PASS_MIN_DAYS   {{ login_defs.pass_min_days }}/" /etc/login.defs
sudo sed -i "s/^PASS_WARN_AGE.*/PASS_WARN_AGE   {{ login_defs.pass_warn_age }}/" /etc/login.defs
```

## 4. 既存ユーザーに自動遡及しないことを確認する

login.defs の変更は新規作成ユーザーにのみ適用され、既存ユーザーには反映されません。これが重要な学習ポイントです。

```bash
{% for u in existing_users %}sudo chage -l {{ u.name }}
{% endfor %}```

## 5. 既存ユーザーへ個別適用する

必要な場合は `chage` で個別に反映します。

```bash
{% for u in existing_users %}sudo chage -M {{ login_defs.pass_max_days }} -m {{ login_defs.pass_min_days }} -W {{ login_defs.pass_warn_age }} {{ u.name }}
{% endfor %}```

## 6. テストユーザーで弱いパスワードが拒否されることを試験する

```bash
echo "{{ test.weak_password }}" | sudo passwd --stdin testuser 2>&1 | grep -i "BAD PASSWORD" && echo "拒否確認OK"
```

## 動作確認

- 短い/辞書語のパスワード設定が `{{ test.weak_password }}` で拒否されること
- `chage -l` の表示が Step 5 適用後、定義ファイルの値と一致すること
- 新規作成ユーザーには pwquality.conf / login.defs のポリシーが自動適用されること

## 注意事項

- ポリシー変更は既存ユーザーに自動遡及しないため、必要な場合は `chage` で個別適用する。
- 演習アカウントで試験し、本番アカウント（`{{ existing_users[0].name }}` 等）を誤ってロックしないよう注意する。
- 定期的な強制変更は現代の指針では推奨されないため、`PASS_MAX_DAYS` を過度に短くしない。
- 認証失敗が続いた場合のアカウントロックは `pam_faillock` が別途担当する範囲であり、本シナリオのパスワード強度設定とは役割が異なる。
```

- [ ] **Step 3: `web/src/lib/templates.ts` の `META` 配列に追加する**

Task 4 のエントリの直後に以下を挿入する:

```ts
  { id: "password-policy-basics", name: "パスワードポリシーの設定", desc: "pwqualityとlogin.defsで長さ優先のパスワードポリシーを設定し、既存ユーザーに自動遡及しないことを確認。", category: "server", subCategory: "認証", format: "toml", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "password-policy-basics"`, `DATA_EXT = "toml"` で実行する。加えて:
```python
assert "minlen = 14" in content
assert "PASS_MAX_DAYS" in content
```
Expected: 全 assert が通り `OK: password-policy-basics` が出力される。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/password-policy-basics.toml assets/examples/password-policy-basics.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add password-policy-basics security scenario (#547)

Refs #541
EOF
)"
```

---

### Task 6: log-integrity-hash（ログ改ざん検知の基礎）

**Files:**
- Create: `assets/examples/log-integrity-hash.toml`
- Create: `assets/examples/log-integrity-hash.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```toml
[targets]
logs = ["/var/log/app/access.log.1", "/var/log/app/error.log.1"]

[ledger]
dir = "/var/backups/log-ledger"
filename = "2026-07-13.sha256"

[protect]
chattr_target = "/var/log/app/access.log.1"
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# ログ改ざん検知の基礎（ハッシュ検証）

「ログは改ざんされ得る」前提のもと、sha256sum によるハッシュ台帳の作成・照合と、ローテート済みログの追記専用化（append-only）を行います。

## 目的

「ログは改ざんされ得る」前提を理解し、sha256sumによるハッシュ台帳の作成・照合と、ローテート済みログの保全手順を実施できるようになることを目指します。

## 用語解説

- **ハッシュ関数**: データから固定長の値（ハッシュ値）を生成し、内容が変化すると値も変わる関数
- **sha256sum**: SHA-256アルゴリズムでファイルのハッシュ値を計算するコマンド
- **改ざん検知と改ざん防止の違い**: 検知は変更を「気付ける」仕組み、防止は変更自体を「できなくする」仕組み
- **append-only属性(chattr +a)**: ファイルへの追記のみを許可し、上書き・削除を拒否する属性
- **証跡(エビデンス)保全**: 障害調査・監査のためにログの完全性を保つこと

## 1. 保全対象ログを確認する

```bash
{% for log in targets.logs %}ls -l {{ log }}
{% endfor %}```

## 2. ハッシュ台帳を作成する

```bash
sudo mkdir -p {{ ledger.dir }}
{% for log in targets.logs %}sha256sum {{ log }} | sudo tee -a {{ ledger.dir }}/{{ ledger.filename }}
{% endfor %}```

台帳は保全対象ログと同じ場所には置かず、`{{ ledger.dir }}` へ退避します（改ざん時に台帳も一緒に書き換えられるのを防ぐため）。

## 3. 台帳と照合する

```bash
cd / && sudo sha256sum -c {{ ledger.dir }}/{{ ledger.filename }}
```

## 4. 改変を演習し、照合がFAILEDになることを観察する

```bash
echo "TAMPERED" | sudo tee -a {{ protect.chattr_target }}
cd / && sudo sha256sum -c {{ ledger.dir }}/{{ ledger.filename }}
```

FAILED と表示されることを確認したら、演習用の改変を元に戻し（バックアップから復元するか再取得）、次のステップへ進みます。

## 5. 追記専用属性を設定する

```bash
sudo chattr +a {{ protect.chattr_target }}
sudo lsattr {{ protect.chattr_target }}
```

上書き・削除が拒否されることを確認します。

```bash
sudo truncate -s 0 {{ protect.chattr_target }} 2>&1 | grep -i "Operation not permitted" && echo "上書き拒否を確認"
```

## 動作確認

- 未改変ログの照合（Step 3）が全件 `OK` を報告すること
- 改変後の照合（Step 4）が `FAILED` を報告すること
- `lsattr {{ protect.chattr_target }}` で `a` 属性が確認できること

## 注意事項

- ハッシュ台帳（`{{ ledger.dir }}`）は保全対象ログと同じ場所に置かない（改ざん時に台帳も一緒に書き換えられるため）。
- `chattr +a` は root 権限で解除可能な点を理解しておく（`chattr -a` で改ざん防止が完全ではないことを認識する）。
- 改ざん演習（Step 4）はテスト用ログに対してのみ行い、本番ログには適用しない。
- ハッシュ台帳と `lsattr` の出力は、障害調査・監査時の証跡として別途保管しておく。
```

- [ ] **Step 3: `web/src/lib/templates.ts` の `META` 配列に追加する**

Task 5 のエントリの直後に以下を挿入する:

```ts
  { id: "log-integrity-hash", name: "ログ改ざん検知の基礎（ハッシュ検証）", desc: "sha256sumのハッシュ台帳作成・照合と、chattr +aによるログの追記専用化で改ざん検知の基礎を体験。", category: "server", subCategory: "ログ保全", format: "toml", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "log-integrity-hash"`, `DATA_EXT = "toml"` で実行する。加えて:
```python
assert "sha256sum -c" in content
assert "chattr +a" in content
```
Expected: 全 assert が通り `OK: log-integrity-hash` が出力される。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/log-integrity-hash.toml assets/examples/log-integrity-hash.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add log-integrity-hash security scenario (#547)

Refs #541
EOF
)"
```

---

### Task 7: account-audit（不要アカウントの棚卸しとロック）

**Files:**
- Create: `assets/examples/account-audit.csv`
- Create: `assets/examples/account-audit.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```csv
username,department,status,last_login_expected
tanaka,営業部,現役,2026-07-01
kobayashi,開発部,退職済み,2025-01-15
shared-svc,共通,共有アカウント,2024-06-01
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# 不要アカウントの棚卸しとロック

台帳（CSV）に基づき、退職者・共有アカウントを削除ではなく **ロック** で安全に処置します。

## 目的

アカウントライフサイクル（作成から利用・休止・削除までの一生）の中で、退職者・共有アカウントを棚卸しして排除する目的を理解し、調査コマンドで現状を可視化して、削除ではなくロックで安全に処置できるようになることを目指します。

## 用語解説

- **アカウントライフサイクル**: 作成から利用・休止・削除までのアカウントの一生
- **lastlog**: 各ユーザーの最終ログイン日時を確認するコマンド
- **/etc/passwdと/etc/shadow**: ユーザー情報とパスワードハッシュをそれぞれ保持するファイル
- **アカウントロック(usermod -L)と削除の違い**: ロックはログインのみを禁止し、ファイル所有権や監査証跡は残る
- **nologinシェル**: ログインシェルとして割り当てると対話的ログインができなくなる特殊シェル
- **UID 0の重複チェック**: root権限を持つアカウントが複数存在しないかの確認

## 1. 台帳を確認する

| username | department | status | last_login_expected |
|---|---|---|---|
{% for r in csv_rows %}| {{ r["username"] }} | {{ r["department"] }} | {{ r["status"] }} | {{ r["last_login_expected"] }} |
{% endfor %}

## 2. ログイン可能ユーザーを抽出し、最終ログインを確認する

```bash
awk -F: '$7 !~ /nologin|false/ {print $1}' /etc/passwd
{% for r in csv_rows %}lastlog -u {{ r["username"] }}
{% endfor %}```

## 3. 退職済み・共有アカウントを特定する

台帳の `status` が「退職済み」または「共有アカウント」の行が処置対象です。

```bash
{% for r in csv_rows %}{% if r["status"] != "現役" %}echo "処置対象: {{ r["username"] }} ({{ r["status"] }})"
{% endif %}{% endfor %}```

## 4. 削除せずロックする

```bash
{% for r in csv_rows %}{% if r["status"] != "現役" %}sudo usermod -L -s /sbin/nologin {{ r["username"] }}
{% endif %}{% endfor %}```

## 5. UID 0の重複・空パスワードを点検する

```bash
awk -F: '$3==0{print $1}' /etc/passwd
sudo awk -F: '($2==""){print $1}' /etc/shadow
```

## 6. 処置結果を台帳に記録して報告する

```bash
{% for r in csv_rows %}{% if r["status"] != "現役" %}sudo passwd -S {{ r["username"] }}
{% endif %}{% endfor %}```

## 動作確認

- ロック対象ユーザーでのログインが拒否されること
- `passwd -S` で状態が `L`（Locked）と表示されること
- 台帳（Step 1 の表）と実サーバのアカウント一覧（Step 2）が一致すること

## 注意事項

- アカウントは削除せずロックする（ファイル所有権や監査証跡が失われるため）。
- 誤って稼働中の必要なアカウント（`status` が「現役」の行）をロックしないよう、台帳との突合を必ず行う。
- UID 0 の重複や空パスワードが見つかった場合は、棚卸しの範囲を超えるためエスカレーションする。
```

- [ ] **Step 3: `web/src/lib/templates.ts` の `META` 配列に追加する**

Task 6 のエントリの直後に以下を挿入する:

```ts
  { id: "account-audit", name: "不要アカウントの棚卸しとロック", desc: "台帳CSVとlastlogを突合し、退職者・共有アカウントを削除ではなくロックで安全に処置する棚卸し手順。", category: "runbook", subCategory: "棚卸し", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "account-audit"`, `DATA_EXT = "csv"` で実行する。加えて:
```python
assert "usermod -L" in content
assert "kobayashi" in content
```
Expected: 全 assert が通り `OK: account-audit` が出力される。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/account-audit.csv assets/examples/account-audit.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add account-audit security scenario (#547)

Refs #541
EOF
)"
```

---

### Task 8: cert-expiry-watch（TLS証明書の期限確認と更新運用）

**Files:**
- Create: `assets/examples/cert-expiry-watch.csv`
- Create: `assets/examples/cert-expiry-watch.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```csv
domain,port,warn_days
shop.example.internal,443,14
api.example.internal,443,14
mail.example.internal,465,30
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# TLS証明書の期限確認と更新運用

CSVで定義した監視対象について、openssl で期限を点検する日次監視を構築し、期限切れが迫った証明書を `certbot renew --dry-run` で事前検証してから実更新します（定期点検と更新運用を一気通貫で扱います）。

## 目的

証明書の有効期限切れが引き起こす障害を理解し、opensslコマンドで期限・チェーンを点検して定期監視化し、更新作業をdry-runで事前確認してから実施できるようになることを目指します。

## 用語解説

- **TLS/SSL証明書**: 通信の暗号化と相手の身元を保証する電子証明書
- **有効期限(notAfter)**: 証明書が失効する日時
- **証明書チェーンと中間証明書**: ルートCAとサーバ証明書の間を橋渡しする証明書群
- **CNとSAN**: 証明書が保証するドメイン名を示す項目
- **certbotとACME**: Let's Encrypt等の証明書を自動発行・更新する仕組みとそのクライアント
- **dry-run更新**: 実際には証明書を書き換えず、更新できるかどうかだけを確認する動作

## 1. 監視対象を確認する

| domain | port | warn_days |
|---|---|---|
{% for r in csv_rows %}| {{ r["domain"] }} | {{ r["port"] }} | {{ r["warn_days"] }} |
{% endfor %}

## 2. 稼働中サービスの証明書の期限を取得する

```bash
{% for r in csv_rows %}echo | openssl s_client -connect {{ r["domain"] }}:{{ r["port"] }} -servername {{ r["domain"] }} 2>/dev/null | openssl x509 -noout -enddate -subject
{% endfor %}```

`-subject` の出力に含まれる CN（コモンネーム）と SAN（Subject Alternative Name）が、証明書がどのドメイン名を保証しているかを示します。証明書チェーン（サーバ証明書と中間証明書のつながり）を確認する場合は `-showcerts` オプションを追加してください。

## 3. 点検スクリプトを作り、cronで日次点検化する

閾値割れを検出したら `logger` で記録します。

```bash
sudo tee /usr/local/bin/cert-expiry-check.sh <<'EOF'
#!/bin/bash
set -euo pipefail
{% for r in csv_rows %}ENDDATE=$(echo | openssl s_client -connect {{ r["domain"] }}:{{ r["port"] }} -servername {{ r["domain"] }} 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
REMAIN=$(( ($(date -d "$ENDDATE" +%s) - $(date +%s)) / 86400 ))
if [ "$REMAIN" -lt {{ r["warn_days"] }} ]; then
  logger -t cert-expiry "WARN: {{ r["domain"] }} expires in ${REMAIN} days (threshold {{ r["warn_days"] }})"
fi
{% endfor %}EOF
sudo chmod +x /usr/local/bin/cert-expiry-check.sh
(crontab -l 2>/dev/null; echo "0 6 * * * /usr/local/bin/cert-expiry-check.sh") | crontab -
```

## 4. 閾値割れが検出された対象をdry-runで事前検証する

```bash
sudo certbot renew --cert-name shop.example.internal --dry-run
```

## 5. dry-run成功後に実更新する

```bash
sudo certbot renew --cert-name shop.example.internal
sudo systemctl reload nginx
```

サービスの reload を忘れると、証明書ファイルは更新されてもプロセスは古い証明書を使い続けます。

## 6. 更新後の期限を確認する

```bash
echo | openssl s_client -connect shop.example.internal:443 -servername shop.example.internal 2>/dev/null | openssl x509 -noout -enddate
```

## 動作確認

- 全対象ホストの残日数一覧（Step 2）が作成できていること
- `crontab -l` に日次登録があること
- `certbot renew --dry-run`（Step 4）が成功すること
- 更新後 `openssl s_client`（Step 6）で新しい notAfter が確認できること

## 注意事項

- `certbot renew` の本実行前に必ず `--dry-run` で確認する。certbot は ACME プロトコルで CA と自動的にやり取りし、証明書の発行・更新を行う。
- 更新後はサービスの reload を忘れると新しい証明書が反映されない。
- 既存の `zero-trust-access`（CA構築側）とはレイヤが異なる（本シナリオは証明書の消費・運用側）ため重複しない。
```

- [ ] **Step 3: `web/src/lib/templates.ts` の `META` 配列に追加する**

Task 7 のエントリの直後に以下を挿入する:

```ts
  { id: "cert-expiry-watch", name: "TLS証明書の期限確認と更新運用", desc: "opensslによる期限点検の日次監視化から、certbot renew --dry-runでの事前検証・実更新・確認までを一気通貫で実施。", category: "runbook", subCategory: "証明書", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "cert-expiry-watch"`, `DATA_EXT = "csv"` で実行する。加えて:
```python
assert "certbot renew --dry-run" in content
assert "openssl x509 -noout -enddate" in content
```
Expected: 全 assert が通り `OK: cert-expiry-watch` が出力される。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/cert-expiry-watch.csv assets/examples/cert-expiry-watch.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add cert-expiry-watch security scenario (#547)

Refs #541
EOF
)"
```

---

### Task 9: fail2ban-ssh-guard（fail2banによるSSHブルートフォース対策）

**Files:**
- Create: `assets/examples/fail2ban-ssh-guard.toml`
- Create: `assets/examples/fail2ban-ssh-guard.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```toml
[jail]
name = "sshd"
bantime = "1h"
findtime = "10m"
maxretry = 5
port = "ssh"
logpath = "/var/log/auth.log"

[[ignoreip]]
address = "192.168.10.5"
label = "管理端末A"

[[ignoreip]]
address = "192.168.10.6"
label = "管理端末B"

[test]
attacker_ip = "203.0.113.50"
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# fail2banによるSSHブルートフォース対策

認証ログから攻撃の実態を観察したうえで、fail2ban で自動遮断を構成します。**`ignoreip` に管理端末を登録してから** jail を有効化し、自己ロックアウトを防ぎます。

## 目的

認証ログから攻撃の実態を観察し、fail2banで自動遮断を構成できるようになることを目指します。自分自身を締め出さないためのignoreip設計の重要性を理解します。

## 用語解説

- **ブルートフォース攻撃**: パスワードやログインを総当たりで試行する攻撃
- **jail**: fail2banが監視・遮断するサービス単位の設定
- **bantime・findtime・maxretry**: それぞれ「遮断時間」「集計時間枠」「許容失敗回数」を表す設定値
- **ignoreip(除外リスト)**: 遮断対象から常に除外するIPアドレスの一覧
- **ban解除(unban)**: 遮断を手動で解除する操作
- **誤遮断(自己ロックアウト)**: 管理者自身のIPを誤って遮断してしまうこと

## 1. 認証ログから攻撃の実在を確認する

```bash
sudo grep "Failed password" {{ jail.logpath }} | tail -n 20
```

## 2. fail2banを導入し、jail.localを作成する

`jail.conf` は直接編集せず、`jail.local` に上書き設定を書きます。

```bash
sudo apt-get install -y fail2ban
sudo tee /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
ignoreip = 127.0.0.1/8{% for ip in ignoreip %} {{ ip.address }}{% endfor %}

[{{ jail.name }}]
enabled = true
port = {{ jail.port }}
logpath = {{ jail.logpath }}
bantime = {{ jail.bantime }}
findtime = {{ jail.findtime }}
maxretry = {{ jail.maxretry }}
EOF
```

**`ignoreip` に管理端末（{% for ip in ignoreip %}{{ ip.address }} ({{ ip.label }}){% if not loop.last %}, {% endif %}{% endfor %}）を必ず登録してから**、次のステップで有効化します。

## 3. サービスを起動し、状態を確認する

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status {{ jail.name }}
```

## 4. テスト端末からの攻撃を模擬し、遮断を観察する

```bash
for i in $(seq 1 {{ jail.maxretry }}); do
  ssh -o StrictHostKeyChecking=no invaliduser@localhost -p 22 2>/dev/null
done
sudo fail2ban-client status {{ jail.name }}
sudo iptables -L -n | grep {{ test.attacker_ip }}
```

## 5. unban手順を訓練する

```bash
sudo fail2ban-client set {{ jail.name }} unbanip {{ test.attacker_ip }}
sudo fail2ban-client status {{ jail.name }}
```

## 6. 管理端末が失敗を繰り返してもbanされないことを確認する

```bash
{% for ip in ignoreip %}sudo fail2ban-client status {{ jail.name }} | grep -q "{{ ip.address }}" && echo "誤検知あり: {{ ip.address }}" || echo "OK: {{ ip.address }} ({{ ip.label }}) は遮断対象外"
{% endfor %}```

## 動作確認

- `fail2ban-client status {{ jail.name }}` に監視中のjailとban数が表示されること
- しきい値超過でテストIP（{{ test.attacker_ip }}）が遮断され、`iptables -L` にルールが出現すること
- `unban` 後に再接続できること
- 管理端末（{% for ip in ignoreip %}{{ ip.address }}{% if not loop.last %}, {% endif %}{% endfor %}）は失敗を繰り返してもbanされないこと

## 注意事項

- `ignoreip` に管理端末のIPを必ず登録してから有効化する（登録漏れは自己ロックアウトに直結する）。
- 誤banした場合の `unban` 手順（Step 5）も事前に確認しておく。
- `jail.conf` を直接編集せず、`jail.local` への上書きで運用する（パッケージ更新で `jail.conf` が上書きされても設定が失われない）。
```

- [ ] **Step 3: `web/src/lib/templates.ts` の `META` 配列に追加する**

Task 8 のエントリの直後に以下を挿入する:

```ts
  { id: "fail2ban-ssh-guard", name: "fail2banによるSSHブルートフォース対策", desc: "認証ログの観察からjail.local作成・ignoreip設計・遮断/解除の動作確認までを、自己ロックアウト防止手順つきで実施。", category: "server", subCategory: "侵入対策", format: "toml", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "fail2ban-ssh-guard"`, `DATA_EXT = "toml"` で実行する。加えて:
```python
assert "ignoreip = 127.0.0.1/8 192.168.10.5 192.168.10.6" in content
assert "fail2ban-client status sshd" in content
```
Expected: 全 assert が通り `OK: fail2ban-ssh-guard` が出力される。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/fail2ban-ssh-guard.toml assets/examples/fail2ban-ssh-guard.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add fail2ban-ssh-guard security scenario (#547)

Refs #541
EOF
)"
```

---

### Task 10: vuln-patch-triage（脆弱性スキャン結果への一次対応）

**Files:**
- Create: `assets/examples/vuln-patch-triage.csv`
- Create: `assets/examples/vuln-patch-triage.j2`
- Modify: `web/src/lib/templates.ts`

- [ ] **Step 1: データファイルを作成する**

```csv
cve_id,severity,package,installed_version,fixed_version,service_active
CVE-2026-1111,Critical,openssl,3.0.7-1,3.0.9-1,true
CVE-2026-2222,High,bash,5.1-6,5.1-6,false
CVE-2026-3333,Medium,curl,7.81.0-1,7.88.0-1,true
```

- [ ] **Step 2: テンプレートファイルを作成する**

```jinja
# 脆弱性スキャン結果への一次対応

脆弱性スキャン結果（CSV）を重要度順に整理し、影響確認 → 優先度判定 → パッチ適用可否の一次判断までを行います。

## 目的

脆弱性情報（CVE・重要度）の読み方を理解し、スキャン結果一覧から影響確認→優先度判定→パッチ適用可否の一次判断を報告できるようになることを目指します。

## 用語解説

- **CVE**: 個々の脆弱性を一意に識別する番号
- **CVSSと重要度(Critical〜Low)**: 脆弱性の深刻度を数値・段階で表す指標
- **セキュリティアドバイザリ**: ベンダーが公開する脆弱性と修正版の告知
- **dnf updateinfo**: 配布済みのセキュリティ修正情報を確認するコマンド
- **パッチ適用とサービス再起動の関係**: パッケージ更新後、稼働中プロセスに反映するには再起動が必要な場合がある
- **一次対応(トリアージ)**: 全件を精査する前に、影響度に応じて優先順位を判定する初動対応

## 1. スキャン結果を重要度（CVSSベースの Critical〜Low）順に整理する

| cve_id | severity | package | installed_version | fixed_version | service_active |
|---|---|---|---|---|---|
{% for r in csv_rows %}| {{ r["cve_id"] }} | {{ r["severity"] }} | {{ r["package"] }} | {{ r["installed_version"] }} | {{ r["fixed_version"] }} | {{ r["service_active"] }} |
{% endfor %}

## 2. 該当パッケージの実在とバージョンを確認する

```bash
{% for r in csv_rows %}rpm -q {{ r["package"] }}
{% endfor %}```

## 3. 配布済み修正の有無を確認する

```bash
sudo dnf updateinfo list --security | grep -E "{% for r in csv_rows %}{{ r["cve_id"] }}{% if not loop.last %}|{% endif %}{% endfor %}"
```

## 4. サービスが実際に稼働・公開されているか確認する

```bash
{% for r in csv_rows %}{% if r["service_active"] == "true" %}systemctl is-active {{ r["package"] }}
ss -tlnp | grep {{ r["package"] }}
{% endif %}{% endfor %}```

## 5. 優先度判定表を作成する

Critical かつ公開中（`service_active = true`）のものを最優先とします。

```bash
{% for r in csv_rows %}{% if r["severity"] == "Critical" and r["service_active"] == "true" %}echo "最優先: {{ r["cve_id"] }} ({{ r["package"] }})"
{% elif r["service_active"] == "true" %}echo "要対応: {{ r["cve_id"] }} ({{ r["package"] }})"
{% else %}echo "経過観察: {{ r["cve_id"] }} ({{ r["package"] }})"
{% endif %}{% endfor %}```

## 6. セキュリティ更新を適用し、結果を記録する

```bash
{% for r in csv_rows %}{% if r["installed_version"] != r["fixed_version"] %}sudo dnf update --security --advisory={{ r["cve_id"] }} -y
{% endif %}{% endfor %}rpm -q openssl
```

## 動作確認

- 対象パッケージのバージョンが修正版（`fixed_version`）以上になっていること
- `dnf updateinfo` で該当アドバイザリが「適用済み」扱いになっていること
- 優先度判定表（Step 5）に全CVEの処置（適用/回避/リスク受容）が記録されていること

## 注意事項

- `dnf update --security` の適用は再起動が必要な場合があるため、事前にメンテナンスウィンドウを確認する。
- 本番適用前に検証環境での動作確認を推奨する。
- `service_active` が `false` の対象（例: CVE-2026-2222）は稼働・公開されていないため最優先度から外れるが、経過観察として記録は残す。
```

- [ ] **Step 3: `web/src/lib/templates.ts` の `META` 配列に追加する**

Task 9 のエントリの直後（`dgx-spark-ollama` の直前）に以下を挿入する:

```ts
  { id: "vuln-patch-triage", name: "脆弱性スキャン結果への一次対応", desc: "CVE一覧を重要度・公開状況で優先度判定し、dnf updateinfoでの確認からセキュリティ更新適用までの一次対応を実施。", category: "runbook", subCategory: "脆弱性対応", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
```

- [ ] **Step 4: レンダリング確認**

共通の検証スクリプトを `TEMPLATE_ID = "vuln-patch-triage"`, `DATA_EXT = "csv"` で実行する。加えて:
```python
assert "dnf updateinfo list --security" in content
assert "CVE-2026-1111" in content
```
Expected: 全 assert が通り `OK: vuln-patch-triage` が出力される。

- [ ] **Step 5: コミット**

```bash
git add assets/examples/vuln-patch-triage.csv assets/examples/vuln-patch-triage.j2 web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): add vuln-patch-triage security scenario (#547)

Refs #541
EOF
)"
```

---

### Task 11: 全体検証とPR作成

**Files:**
- なし（既存ファイルの検証のみ）

- [ ] **Step 1: TypeScript型チェックとWebテストを実行する**

```bash
cd web && npx tsc --noEmit && npm test -- --run
```
Expected: 型エラー0件、既存テスト全件PASSに加え新規10ペア分がテンプレートライブラリのglob読込に反映されていること。

- [ ] **Step 2: Python側の既存テストを実行する（新規10ペアの自動レンダリングテスト込み）**

```bash
uv run pytest -k 'not e2e' -q
```
Expected: 既存448件＋新規10件（`tests/unit/test_example_templates_render.py` が動的検出）が全てPASS。

- [ ] **Step 3: 10シナリオ全件の一括レンダリング確認**

```python
import sys
from io import BytesIO

sys.path.insert(0, ".")
from features.config_parser import ConfigParser
from features.document_render import DocumentRender

TARGETS = [
    ("ssh-key-hygiene", "toml"),
    ("rsync-daily-backup", "yaml"),
    ("restore-drill", "yaml"),
    ("sudo-least-privilege", "yaml"),
    ("password-policy-basics", "toml"),
    ("log-integrity-hash", "toml"),
    ("account-audit", "csv"),
    ("cert-expiry-watch", "csv"),
    ("fail2ban-ssh-guard", "toml"),
    ("vuln-patch-triage", "csv"),
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

- [ ] **Step 4: developブランチとの差分を確認する**

```bash
git status
git diff origin/develop...HEAD --stat
```
Expected: `assets/examples/*` の新規20ファイル（10ペア）と `web/src/lib/templates.ts` の変更のみ。

- [ ] **Step 5: `/code-review`（高効度）を実行し、指摘を修正する**

`/code-review` を高効度で1回実行し、指摘があれば修正して再レビューする。修正後は Step 1〜3 を再実行してから次へ進む。

- [ ] **Step 6: PRを作成する**

PR #543 の本文構成（Summary / Test plan / Refs）を踏襲し、ASCIIのみで記述する。タイトル: `Phase 4: add 10 security/backup training scenarios (Closes #547)`。GitHub MCP の `create_pull_request` を用いて `develop` ブランチ向けに作成する。作成後は `subscribe_pr_activity` でCI・レビューを監視する。
