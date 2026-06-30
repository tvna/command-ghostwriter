# リポジトリ uv 化 実装計画 (PR1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** command-ghostwriter の Python 依存管理を poetry から uv へ全面移行し、CI・pre-commit・ドキュメントを uv ベースに更新する。

**Architecture:** `pyproject.toml` を PEP 621 `[project]` + `[dependency-groups]` + `[tool.uv]` へ書き換え、`uv.lock` を生成。`poetry.lock`/`poetry.toml` を削除。GitHub Actions の composite action と reusable workflow、pre-commit、README を uv コマンドへ置換する。

**Tech Stack:** uv 0.8.17, Python 3.11, ruff, mypy, pytest, GitHub Actions

**関連:** Issue #335 / 設計書 `docs/superpowers/specs/2026-06-04-devcontainer-rework-design.md`

**前提:** 作業ブランチ `claude/adoring-fermat-pMNKe`。本環境には uv 0.8.17 と pypi 到達性あり（実検証可能）。

**コミット規約:** 各コミット末尾に `(#335)` を含める。author は `Claude <noreply@anthropic.com>`。

---

## ファイル構成（変更対象）

- Modify: `pyproject.toml`（poetry → PEP621/uv）
- Create: `uv.lock`（`uv lock` で生成）
- Delete: `poetry.lock`, `poetry.toml`
- Modify: `.github/actions/setup-python/action.yml`（poetry → uv）
- Modify: `.github/actions/test-python-playwright/action.yml`（poetry → uv）
- Modify: `.github/workflows/reusable-test-and-build.yml`（poetry run → uv run, export, allowlist）
- Modify: `.github/workflows/test-and-build-on-merged.yml`（allowlist host のみ確認）
- Modify: `.pre-commit-config.yaml`（`poetry run lizard` → `uv run lizard`）
- Modify: `README.md`（インストール/起動手順）
- Modify: `command-ghostwriter.code-workspace` / `docs/commands.md`（poetry 参照）

---

## Task 1: pyproject.toml を uv 形式へ移行

**Files:**
- Modify: `pyproject.toml:1-54`（`[build-system]`〜`[tool.poetry.group.dev.dependencies]` を置換。`[tool.ruff]` 以降は不変）

- [ ] **Step 1: `[build-system]`〜dev依存ブロックを以下で置換**

`pyproject.toml` の 1〜54 行目（`[build-system]` から `[tool.poetry.group.dev.dependencies]` の最終行 `types-requests = ...` まで）を、次の内容に丸ごと置き換える。`[tool.ruff]`（旧56行目以降）はそのまま残す。

```toml
[project]
name = "command-ghostwriter"
version = "0.0.0"
requires-python = ">=3.11,<4.0"
dependencies = [
  "streamlit>=1.45.0,<2",
  "jinja2>=3.1.6,<4",
  "pyyaml>=6.0.1,<7",
  "chardet>=5.2.0,<6",
  "python-box>=7.2.0,<8",
  "pydantic>=2.11.4,<3",
  "toml>=0.10.2,<0.11",
  "markupsafe>=3.0.2,<4",
]

[dependency-groups]
dev = [
  "mypy>=1.10.0,<2",
  "pytest>=8.3.1,<9",
  "pytest-cov>=6.1.1,<7",
  "types-toml>=0.10.8.20240310,<0.11",
  "pre-commit>=4.2.0,<5",
  "lizard>=1.17.28,<2",
  "types-pyyaml>=6.0.12.20250402,<7",
  "pydeps>=3.0.1,<4",
  "pytest-playwright>=0.7.0,<0.8",
  "ruff>=0.11.8,<0.12",
  "pandas-stubs>=2.2.2.240603,<3",
  "mock>=5.2.0,<6",
  "gitpython>=3.1.44,<4",
  "packaging>=24.2,<25",
  "pytest-xdist>=3.6.1,<4",
  "pytest-mock>=3.14.0,<4",
  "psutil>=7.0.0,<8",
  "pytest-randomly>=3.16.0,<4",
  "pytest-benchmark==5.1.0",
  "pytest-clarity>=1.0.1,<2",
  "pygal>=3.0.5,<4",
  "pytest-timeout>=2.3.1,<3",
  "pyre-check>=0.9.23,<0.10",
  "pytest-item-dict>=1.1.2,<2",
  "pytest-xml>=0.1.1,<0.2",
  "data-to-xml>=1.0.9,<2",
  "vulture>=2.14,<3",
  "yamllint>=1.37.1,<2",
  "types-psutil>=7.0.0.20250401,<8",
  "types-requests>=2.32.0.20250328,<3",
]
# devcontainer 専用の対話デバッガ。CI では同期しない（uv sync --group local で追加）。
local = [
  "pudb>=2024.1.3,<2025",
]

[tool.uv]
package = false
# flake.nix がこの値を読む。実装時点の本環境 uv 0.8.17 を初期 pin とする。
required-version = "==0.8.17"
```

備考:
- 旧dev依存にあった `poetry-types`（poetry専用ツール）は uv 化で不要のため削除。
- 旧 `pudb` は dev から `local` グループへ移動（対話デバッグは devcontainer 限定で十分。CI 不使用）。
- caret `^` は uv 互換の `>=,<` 範囲へ機械的に変換済み。`pytest-benchmark` は完全固定 `==5.1.0` を維持。

- [ ] **Step 2: TOML 構文の妥当性を確認**

Run: `python3 -c "import tomllib,sys; tomllib.load(open('pyproject.toml','rb')); print('ok')"`
Expected: `ok`

- [ ] **Step 3: コミット（lock 生成は次タスク）**

```bash
git add pyproject.toml
git commit -m "build: migrate pyproject.toml from poetry to uv (#335)"
```

---

## Task 2: uv.lock 生成と poetry ファイル削除

**Files:**
- Create: `uv.lock`
- Delete: `poetry.lock`, `poetry.toml`

- [ ] **Step 1: ロックを生成**

Run: `uv lock`
Expected: `uv.lock` が生成され、解決が成功する（`Resolved N packages`）。失敗時はエラーの依存を Task 1 の範囲指定で調整して再実行。

- [ ] **Step 2: 依存を同期（dev グループ込み）**

Run: `uv sync --locked`
Expected: `.venv` が作成され dev 依存がインストールされる。

- [ ] **Step 3: poetry 専用ファイルを削除**

```bash
git rm poetry.lock poetry.toml
```

- [ ] **Step 4: コミット**

```bash
git add uv.lock
git commit -m "build: add uv.lock and remove poetry lock/config (#335)"
```

---

## Task 3: uv 環境での回帰検証（挙動の証明）

**Files:** なし（検証のみ）

- [ ] **Step 1: lint（ruff）**

Run: `uv run ruff check .`
Expected: 既存と同じ結果（PASS、もしくは移行前と同一の既知の指摘のみ）。

- [ ] **Step 2: 型チェック（mypy）**

Run: `uv run mypy . -v`
Expected: 移行前と同一の結果。

- [ ] **Step 3: ユニット/インテグレーションテスト**

Run: `uv run pytest -n auto -m "unit or integration or workflow" --disable-warnings --benchmark-disable`
Expected: 移行前と同じく PASS。失敗時は依存解決差が原因か切り分け（`systematic-debugging` スキル）。

- [ ] **Step 4: 検証結果を記録**

このタスクはコミット不要。3つの実行ログ（PASS/FAIL と件数）を実行エージェントの報告に残す。型/lint はコード形状の検証、pytest が挙動の証明であることを明記する。

---

## Task 4: setup-python composite action を uv 化

**Files:**
- Modify: `.github/actions/setup-python/action.yml`（全面書き換え）

- [ ] **Step 1: action.yml を以下に置換**

```yaml
---
name: "Setup Python Environment"
description: "Setup Python and install dependencies with uv"
inputs:
  python-version:
    description: "Python version to use"
    required: true

runs:
  using: "composite"
  steps:
    - name: Install uv
      uses: astral-sh/setup-uv@v6
      with:
        enable-cache: true
        cache-dependency-glob: "uv.lock"

    - name: Set up Python ${{ inputs.python-version }}
      run: uv python install ${{ inputs.python-version }}
      shell: bash

    - name: Install dependencies
      run: uv sync --locked
      shell: bash
```

備考: 旧アクションの `pip install pyre-check` は `pyre-check` が dev グループにあるため不要。`actions/cache` の poetry キャッシュは setup-uv の内蔵キャッシュへ置換。

- [ ] **Step 2: YAML 構文確認**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/actions/setup-python/action.yml')); print('ok')"`
Expected: `ok`

- [ ] **Step 3: コミット**

```bash
git add .github/actions/setup-python/action.yml
git commit -m "ci: convert setup-python action to uv (#335)"
```

---

## Task 5: playwright action を uv 化

**Files:**
- Modify: `.github/actions/test-python-playwright/action.yml`

- [ ] **Step 1: poetry 呼び出しを uv へ置換**

このファイル内の以下を機械的に置換する:
- `poetry run playwright install --with-deps ${{ inputs.browser }}` → `uv run playwright install --with-deps ${{ inputs.browser }}`
- `poetry run pytest ...`（全箇所） → `uv run pytest ...`（引数は不変）
- キャッシュキー `hashFiles('**/poetry.lock')` → `hashFiles('**/uv.lock')`
- 冒頭コメントの "Poetry" 言及 → "uv"

- [ ] **Step 2: YAML 構文確認**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/actions/test-python-playwright/action.yml')); print('ok')"`
Expected: `ok`

- [ ] **Step 3: コミット**

```bash
git add .github/actions/test-python-playwright/action.yml
git commit -m "ci: convert playwright action to uv (#335)"
```

---

## Task 6: reusable-test-and-build.yml を uv 化

**Files:**
- Modify: `.github/workflows/reusable-test-and-build.yml`

- [ ] **Step 1: `poetry run` を `uv run` へ置換**

以下の各行を置換（引数は不変）:
- L309 `poetry run mypy . -v` → `uv run mypy . -v`
- L313 `poetry run ruff check . -v` → `uv run ruff check . -v`
- L317 `poetry run vulture` → `uv run vulture`
- L470 `poetry run pytest -n auto ...` → `uv run pytest -n auto ...`
- L520 `poetry run pytest ...` → `uv run pytest ...`
- L699 `poetry run streamlit run app.py &` → `uv run streamlit run app.py &`
- L761 `poetry run lizard` → `uv run lizard`

- [ ] **Step 2: requirements.txt エクスポートを uv へ置換**

L324-325 と L625-626 の2箇所:
```yaml
          pipx inject poetry poetry-plugin-export
          poetry export -f requirements.txt --only=main --output requirements.txt
```
を次へ置換:
```yaml
          uv export --no-hashes --no-dev --format requirements-txt --output-file requirements.txt
```
また L627 `pip install pyre-check pyre-extensions` は維持（pyre 実行に pyre-extensions が必要なため。`uv run` 経由に統一する場合は `uv run pyre` を使うが、本タスクでは最小変更とし既存の pip 行は残す）。

- [ ] **Step 3: egress allowlist のホストを更新**

`install.python-poetry.org:443` を含む行（L134, L297, L372 等）を `astral.sh:443` へ置換（setup-uv のインストール元）。pypi/pythonhosted は既存のまま。

- [ ] **Step 4: YAML 構文確認**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/reusable-test-and-build.yml')); print('ok')"`
Expected: `ok`

- [ ] **Step 5: コミット**

```bash
git add .github/workflows/reusable-test-and-build.yml
git commit -m "ci: convert reusable test/build workflow to uv (#335)"
```

---

## Task 7: 残りの workflow / allowlist ホスト確認

**Files:**
- Modify: `.github/workflows/test-and-build-on-merged.yml`

- [ ] **Step 1: allowlist ホストを確認**

`install.python-poetry.org` 参照があれば `astral.sh` へ置換。`pypi.org` / `files.pythonhosted.org` は維持（L186-187 はそのまま）。poetry 参照が他に無いことを確認:

Run: `git grep -n -i poetry .github/`
Expected: 出力なし（全置換完了）。残っていれば該当箇所を uv へ置換。

- [ ] **Step 2: コミット（変更がある場合）**

```bash
git add .github/workflows/test-and-build-on-merged.yml
git commit -m "ci: drop poetry host from allowlist (#335)"
```

---

## Task 8: pre-commit の poetry 参照を uv 化

**Files:**
- Modify: `.pre-commit-config.yaml:169-176`

- [ ] **Step 1: lizard フックを uv 化**

L171-173 の `entry`:
```yaml
        entry: |
          poetry run lizard -l python -x "./node_modules/*" -x "./.venv/*" -x "./build/*"  -x "./dist/*"  --CCN "10"
```
を次へ置換:
```yaml
        entry: |
          uv run lizard -l python -x "./node_modules/*" -x "./.venv/*" -x "./build/*"  -x "./dist/*"  --CCN "10"
```

備考: `pytest_without_e2e` フック（L164）は `entry: pytest ...`（`poetry run` 無し、system の pytest 直呼び）。uv 環境では `uv run pytest` が望ましいため `entry: uv run pytest -vv -n auto -m "unit or integration or workflow" --disable-warnings --benchmark-disable` へ置換する。

- [ ] **Step 2: pre-commit 構文確認**

Run: `python3 -c "import yaml; yaml.safe_load(open('.pre-commit-config.yaml')); print('ok')"`
Expected: `ok`

- [ ] **Step 3: ローカルでフック実行（任意・可能なら）**

Run: `uv run pre-commit run lizard_combined --all-files`
Expected: PASS（lizard が uv 経由で起動）。

- [ ] **Step 4: コミット**

```bash
git add .pre-commit-config.yaml
git commit -m "ci: run pre-commit local hooks via uv (#335)"
```

---

## Task 9: ドキュメント類の poetry 参照を更新

**Files:**
- Modify: `README.md:43-55`
- Modify: `command-ghostwriter.code-workspace`, `docs/commands.md`（poetry 参照箇所）

- [ ] **Step 1: README のインストール/起動手順を uv へ置換**

L45 の poetry インストール手順（`install.python-poetry.org` の PowerShell ワンライナー）を uv のインストール手順へ:
```
# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```
L49 `poetry install` → `uv sync`
L55 `poetry run streamlit app.py` → `uv run streamlit run app.py`

- [ ] **Step 2: 残りの poetry 参照を置換**

Run: `git grep -n -i poetry -- ':!poetry.lock' ':!docs/superpowers/'`
Expected: `command-ghostwriter.code-workspace` と `docs/commands.md` の参照のみ。各々の poetry コマンドを対応する uv コマンド（`poetry run X` → `uv run X`、`poetry install` → `uv sync`）へ置換。`.devcontainer/Dockerfile` の poetry は PR2 で置換するため本PRでは触れない。

- [ ] **Step 3: 最終 grep で残存確認**

Run: `git grep -n -i poetry -- ':!docs/superpowers/' ':!.devcontainer/Dockerfile'`
Expected: 出力なし。

- [ ] **Step 4: コミット**

```bash
git add README.md command-ghostwriter.code-workspace docs/commands.md
git commit -m "docs: update poetry references to uv (#335)"
```

---

## Task 10: 最終検証とプッシュ

**Files:** なし

- [ ] **Step 1: クリーン環境で再現確認**

```bash
rm -rf .venv
uv sync --locked
uv run pytest -n auto -m "unit or integration or workflow" --disable-warnings --benchmark-disable
```
Expected: lock からの再現同期が成功し、テスト PASS。

- [ ] **Step 2: pyproject-fmt 整形の追従（pre-commit）**

Run: `uv run pre-commit run pyproject-fmt --all-files` （差分が出たら `git add -A` で取り込み再コミット）
Expected: PASS もしくは整形差分のみ。

- [ ] **Step 3: プッシュ**

```bash
git push -u origin claude/adoring-fermat-pMNKe
```
ネットワークエラー時のみ 2s/4s/8s/16s で最大4回リトライ。

- [ ] **Step 4: 完了報告**

PR1 の検証結果（uv sync 成功、pytest PASS 件数、lint/mypy 結果）を `verification-before-completion` スキルに従い証跡付きで報告する。
