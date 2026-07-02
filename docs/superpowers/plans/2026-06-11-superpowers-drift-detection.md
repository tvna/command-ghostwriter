# superpowers スキル陳腐化検知 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** committed superpowers スキル（`.claude/skills/`）の apm.lock ピン留めからの陳腐化を、生成+`--check` マニフェスト・pre-commit・CI・SessionStart 警告の二層で検知する。

**Architecture:** stdlib のみの `scripts/gen_superpowers_manifest.py` が `.claude/skills/.superpowers-manifest.sha256` を生成/検証。pre-commit と CI(`verify-superpowers.yml`) が `--check` を実行、CI Job B は `nix build .#apm-cli`→`apm install`→`git diff` で upstream ドリフトを検証。SessionStart フックが drift/missing を loud 警告。

**Tech Stack:** Python 3.11 (stdlib), pytest, pre-commit, GitHub Actions, nix flake (apm-cli), uv

**関連:** Issue #390 / 設計書 `docs/superpowers/specs/2026-06-11-superpowers-drift-detection-design.md`

**コミット規約:** 各コミット末尾に `(#390)`。

**検証の限界:** 本作業環境に nix/apm は無いため CI Job B の実起動は本環境で検証不可。C1/C2/C5（スクリプト・フック・テスト）は python3/uv で本環境検証可能。CI yaml は静的検証に留める。

---

## ファイル構成

- Create: `scripts/gen_superpowers_manifest.py` — マニフェスト生成/検証（stdlib のみ）
- Create: `.claude/skills/.superpowers-manifest.sha256` — 生成物（コミット）
- Create: `.github/workflows/verify-superpowers.yml` — CI 2ジョブ
- Create: `tests/unit/test_gen_superpowers_manifest.py` — 単体・フック結合テスト
- Modify: `.claude/hooks/superpowers-session-start.sh` — drift/missing 警告追加
- Modify: `.pre-commit-config.yaml` — `superpowers-manifest-drift` 追記

**exit code 規約（C1）:** 0=一致, 1=drift/stale, 2=apm.lock 不正/欠落, 3=マニフェスト未生成。

---

### Task 1: マニフェスト生成/検証スクリプト（C1）

**Files:** Create `scripts/gen_superpowers_manifest.py`

- [ ] **Step 1: 失敗するテストを書く**（Task 4 と一体。先に Task 4 Step 1-2 を実施）
- [ ] **Step 2: 実装**

`render()` は apm.lock の `resolved_commit`(40 hex) を provenance ヘッダにし、`.claude/skills/` 配下全ファイル（マニフェスト自身除く）の `sha256␣␣relpath` をソートして連結。`check()` はバイト比較し exit 0/1/3、`_resolved_commit` の失敗は main() で exit 2 にマップ。drift 時は `::error file=...::stale; run uv run python scripts/gen_superpowers_manifest.py` と added/removed/changed を列挙。モジュール定数 `SKILLS_DIR/MANIFEST_PATH/APM_LOCK/MANIFEST_REL` は REPO_ROOT 相対でテスト時に monkeypatch 可能にする。

- [ ] **Step 3: マニフェスト生成** `uv run python scripts/gen_superpowers_manifest.py` → `.claude/skills/.superpowers-manifest.sha256` 生成
- [ ] **Step 4: 自己検証** `uv run python scripts/gen_superpowers_manifest.py --check` Expected: exit 0
- [ ] **Step 5: Commit** `feat: add superpowers manifest generator/checker (#390)`

### Task 2: SessionStart フック改修（C2）

**Files:** Modify `.claude/hooks/superpowers-session-start.sh`

- [ ] **Step 1**: スキル present 判定後に `python3 scripts/gen_superpowers_manifest.py --check` を実行（rc/out 捕捉）。
- [ ] **Step 2**: present かつ rc==1→loud DRIFT 警告(差分付)、rc==3→軽い「manifest 未初期化」、rc==2→軽い「apm.lock 不正」、present でない→loud MISSING 警告。常に exit 0。
- [ ] **Step 3: 検証** 後述 Task 4 のフック結合テストで確認。
- [ ] **Step 4: Commit** `feat: warn on drifted/missing superpowers skills at session start (#390)`

### Task 3: pre-commit + CI（C3/C4）

**Files:** Modify `.pre-commit-config.yaml`, Create `.github/workflows/verify-superpowers.yml`

- [ ] **Step 1**: `.pre-commit-config.yaml` の `repo: local` に追記:
```yaml
- id: superpowers-manifest-drift
  name: superpowers manifest drift
  language: system
  entry: uv run python scripts/gen_superpowers_manifest.py --check
  files: ^\.claude/skills/.*|^apm\.lock\.yaml$
  pass_filenames: false
```
- [ ] **Step 2**: `verify-superpowers.yml` 作成。Job A = setup-python(複合アクション)→`uv run python scripts/gen_superpowers_manifest.py --check`。Job B = DeterminateSystems/nix-installer→`nix build .#apm-cli`→`./result/bin/apm install`→`uv run python scripts/gen_superpowers_manifest.py`→`git diff --exit-code -- .claude/skills/`。harden-runner/checkout は既存 workflow と同じ SHA ピン。
- [ ] **Step 3: 静的検証** `uv run python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/verify-superpowers.yml'))"`（actionlint があれば併用）
- [ ] **Step 4: Commit** `ci: enforce superpowers manifest drift gate (pre-commit + CI) (#390)`

### Task 4: テスト（C5）

**Files:** Create `tests/unit/test_gen_superpowers_manifest.py`

- [ ] **Step 1: 失敗するテストを書く**: ファイルパスからモジュール読込(`importlib.util`)、tmp_path に fake skills + apm.lock を作り module 定数を monkeypatch。test: write→check==0 / 改変→check==1 & "changed" / 新規追加→"added" / マニフェスト削除→check==3 / apm.lock 不正→main(["--check"])==2 / フック結合(subprocess で bash hook 実行、CLAUDE_PROJECT_DIR=tmp、改変後に additionalContext へ DRIFT 警告)。
- [ ] **Step 2: 失敗確認** `uv run pytest tests/unit/test_gen_superpowers_manifest.py -n0 -q` Expected: FAIL（モジュール未実装）
- [ ] **Step 3**: Task 1/2 実装で green に。
- [ ] **Step 4: パス確認** `uv run pytest tests/unit/test_gen_superpowers_manifest.py -n0 -q` Expected: PASS
- [ ] **Step 5: Commit** `test: cover superpowers manifest checker and hook warning (#390)`

---

## Self-Review

- **Spec coverage**: C1=Task1, C2=Task2, C3/C4=Task3, C5=Task4。全カバー。
- **Placeholder**: なし（exit code・正規表現・pre-commit ブロックは実値）。
- **Type 整合**: exit code 規約（0/1/2/3）を C1 と C2 とテストで一貫使用。`render/check/write/main` の関数名一貫。
