# 開発コンテナ環境 再整備 設計書

- 日付: 2026-06-04
- 関連 Issue: #335 (本体), #336 (egress allowlist / 別管理)
- 参考: `tvna/claude-md` の `.devcontainer`（マルチエージェント・nix固定・egress allowlist）

## 1. 目的

現行の素朴な単一 Python/Streamlit devcontainer を、リファレンス `tvna/claude-md` の
マルチエージェント構成を踏襲して再整備する。ただし本リポジトリの実情に合わせて
**実用的に適応**する（1:1コピーはしない）。

## 2. 確定した方針（ブレインストーミングで合意）

| 論点 | 決定 |
|------|------|
| 踏襲範囲 | リファレンスの実用的適応 |
| Python ツールチェーン | リポジトリ全体を **poetry → uv** へ移行 |
| 対応エージェント | **Claude / Codex 両方** |
| ツール固定 | **nix flake**（リファレンス忠実）で uv/gh/claude-cli/codex-cli/apm/python を固定 |
| イメージ戦略 | **ghcr事前ビルドは不採用**。base image + nix feature + agent-user feature で **build-on-open** |
| Streamlit | エージェントコンテナでの **postAttach 自動起動は廃止**。開発拡張とポート8502フォワードのみ残し、起動は手動 `uv run streamlit run app.py` |
| egress allowlist | **別Issue (#336) で管理**。本再整備には含めない |

## 3. 現状と差分

### 現状 (command-ghostwriter)
- Python は **poetry**（`pyproject.toml` の `[tool.poetry]`, `poetry.lock`, `poetry.toml`）
- `.devcontainer/` は `Dockerfile` + `devcontainer.json` の単一構成
  - base: `mcr.microsoft.com/devcontainers/python:3.13-bullseye`
  - `postAttachCommand` で streamlit 自動起動、`updateContentCommand` で pip インストール

### リファレンス (claude-md)
- Python は **uv**（PEP 621 `[project]` + `[dependency-groups]` + `[tool.uv]`, `uv.lock`）
- `flake.nix` で全ツールをハッシュ固定
- `.devcontainer/{claude,codex}` は ghcr 事前ビルドイメージを pull、`images/{claude,codex}` が
  ビルド定義、`images/features/agent-user` がカスタム feature
- `network/*.allowlist` + `scripts/apply-egress-allowlist.sh` で iptables egress 制限

## 4. アーキテクチャ（再整備後）

### 4.1 リポジトリ uv 化（工程A・PR1の前提）

`pyproject.toml` を以下へ移行する。

- `[tool.poetry.dependencies]` → `[project].dependencies`（PEP 621, `requires-python = ">=3.11,<4.0"`）
- `[tool.poetry.group.dev.dependencies]` → `[dependency-groups].dev`
- devcontainer の `uv sync --locked --group local` 用に `[dependency-groups].local` を新設
  （並列テスト等の最小構成。初期は `pytest-xdist` 程度）
- `[tool.uv]` に `package = false` と `required-version = "==0.8.17"` を追加
  （flake.nix がこの値を読む。pin は実装時点で本環境にある uv 0.8.17 を初期値とし、以後は別途更新）
- `[build-system]` は `package-mode=false` 相当のため uv 管理へ整理
- `uv.lock` を生成し、`poetry.lock` / `poetry.toml` を削除
- 既存の `[tool.ruff]` / `[tool.mypy]` / `[tool.pytest.ini_options]` 等の設定は維持
- `.pre-commit-config.yaml` / GitHub Actions / README の poetry 参照を uv に更新

**検証（本環境で実行可能）:** `uv lock` → `uv sync` → `uv run pytest` / `ruff check` / `mypy`。
ネットワーク（pypi）と uv が本環境で利用可能なことを確認済み。

### 4.2 nix flake（工程B）

`flake.nix` / `flake.lock` を新規作成。リファレンス構造を踏襲。

- inputs: `nixpkgs`（リファレンス同様の安定チャネル）
- packages:
  - `claude-cli`（npm tarball を fetchurl + ハッシュ固定）
  - `codex-cli`（同上）
  - `pinned-uv`（astral リリースをハッシュ固定。`pyproject.toml` の `required-version` を参照）
  - `apm-cli`（`apm.yml` があるため維持）
  - `gh-cli` = `pkgs.gh`, `python-runtime` = `pkgs.python311`
- devShells: `default` / `claude` / `codex` / `network`
  （`network` は #336 で iptables 等を提供する受け皿。本PRでは最小 or 後続で拡張）
- **YAGNI 調整:** `waza-cli` は本リポジトリ未使用のため除外

**検証（本環境では不可）:** nix 未導入のため `nix flake check` / 実ビルドは実行できない。
構文・構成レビューに留め、実ビルド確認は実 devcontainer ホストに委ねる（本書 §6 に明記）。

### 4.3 .devcontainer 再構成（工程C・build-on-open）

```
.devcontainer/
├── claude/devcontainer.json        # base ubuntu + nix feature + agent-user feature でビルド
├── codex/devcontainer.json
├── images/
│   └── features/agent-user/        # リファレンスのカスタム feature を踏襲
│       ├── devcontainer-feature.json
│       └── install.sh
├── config/
│   ├── claude/settings.json
│   ├── codex/config.toml
│   └── profile.d/                  # PATH / プロンプト用スクリプト
└── scripts/
    ├── check-gh-config-permissions.sh
    ├── prepare-agent-workspace.sh
    ├── install-agent-cli.sh
    └── configure-agent-runtime.sh
```

- `claude/codex` の `devcontainer.json` は、リファレンスの `images/` 側（base+nix feature+
  agent-user feature でビルド）をベースにする。`image:`（ghcr pull）方式は使わない。
- `postCreateCommand`: `prepare-agent-workspace.sh` → `nix develop .#<agent> --command uv sync
  --locked --group local` → `install-agent-cli.sh` → `configure-agent-runtime.sh`
- `customizations.vscode.extensions`: nix-ide, python, ruff に加え、本リポジトリの
  Python/Streamlit 開発に必要な拡張（pylance, mypy, ruff 等）を妥当な範囲で維持
- ポート 8502 のフォワード設定は維持（Streamlit 手動起動用）。**自動起動はしない**

**採用しないスクリプト（理由）:**
- `ensure-agent-image.sh` / `check-stale-agent-container.sh`: ghcr 事前ビルドイメージの
  pull・stale 検出が前提のため、build-on-open では不要
- `apply-egress-allowlist.sh`: egress allowlist と共に #336 で扱う

### 4.4 config / profile.d

- `config/claude/settings.json`: 本リポジトリの権限方針に合わせた Claude 設定
- `config/codex/config.toml`: Codex 用ローカル既定（workspace パスを本リポジトリ用に調整）
- `config/profile.d/*.sh`: PATH 補正・エージェントプロンプト（リファレンス踏襲、命名は調整）

## 5. 実装の分割（複数PR）

1. **PR1（工程A）**: リポジトリ uv 化。本環境で実検証可能。
2. **PR2（工程B・C・D）**: flake + .devcontainer 再構成。nix 実ビルドは環境制約で未検証。
3. **Issue #336（工程E）**: egress allowlist（後続）。

各コミット・PR は対応 Issue 番号（#335）を引用する。

## 6. 検証戦略と限界（環境の正直な明示）

| 対象 | 本環境での検証可否 | 方法 |
|------|------------------|------|
| uv 化 (pyproject/uv.lock) | **可能** | `uv lock` / `uv sync` / `uv run pytest` / ruff / mypy |
| pre-commit / CI 更新 | 一部可能 | ローカルで `pre-commit run`、CI は push 後に確認 |
| flake.nix | **不可** | nix 未導入。構成レビューのみ |
| devcontainer 実ビルド | **不可** | 実 devcontainer ホストでの起動確認に委ねる |

型チェック・linter はコード形状の検証であって挙動の証明ではない。nix/devcontainer の
実ビルドが本環境で不可能であることを前提に、PR2 は「構成レビュー済み・実ビルド未検証」と
明記して扱う。

## 7. リスクと留意点

- **poetry→uv 移行の波及**: pre-commit / CI / README / 開発者手順に影響。依存解決結果の
  差異（poetry と uv のバージョン解決差）に注意し、`uv.lock` 生成後にテストで回帰確認する。
- **flake のハッシュ固定**: claude-cli / codex-cli / apm のバージョンとハッシュは作成時点の
  ものを固定。更新は別途。
- **build-on-open の起動時間**: nix によるツール導入で初回起動が長くなる可能性。許容範囲とする。
- **egress 非搭載**: 本再整備時点ではネットワーク制限なし。#336 で対応するまでの既知事項。
