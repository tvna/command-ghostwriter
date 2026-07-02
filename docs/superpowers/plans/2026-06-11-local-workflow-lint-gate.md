# ローカル workflow lint ゲートとリリースアーカイブ事前検証 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** flake.nix を SSOT として actionlint/shellcheck をローカル（web 含む）・devcontainer・CI の三者にピン留め供給し、リリースアーカイブ構造の事前検査スクリプトと運用ルールを追加する（Issue #393、レトロ #392 のアクション）。

**Architecture:** flake.nix に fetchurl ピンを追加 → stdlib-only リーダ `flake_pin.py` が非 nix 消費者（web インストーラ・CI）にピンを公開 → SessionStart フックで web 環境に導入、CI guard ジョブは最新版都度取得をピン留め+SHA256 検証に置換。アーカイブ検査は独立スクリプト + CLAUDE.local.md 運用ルール。

**Tech Stack:** bash / Python 3 (stdlib) / pytest (unit マーカー) / nix flake / GitHub Actions

**設計書:** `docs/superpowers/specs/2026-06-11-local-workflow-lint-gate-design.md`

---

## 確定済みピン（実物ダウンロードで検証済み、2026-06-11）

| 項目 | 値 |
|---|---|
| actionlint version | 1.7.12 |
| actionlint x86_64 asset | `actionlint_1.7.12_linux_amd64.tar.gz` |
| actionlint x86_64 sha256 (hex) | `8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8` |
| actionlint x86_64 SRI | `sha256-isqNuW8blHcPGw1ytt3cseu4EjyzcSUwsIzDh7NJo9g=` |
| actionlint aarch64 asset | `actionlint_1.7.12_linux_arm64.tar.gz` |
| actionlint aarch64 sha256 (hex) | `325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6` |
| actionlint aarch64 SRI | `sha256-Ml6XG2upv6UEZy4pvpPCSYHuscB1dtcw6ffIgFr/8MY=` |
| shellcheck version | 0.11.0 |
| shellcheck x86_64 asset | `shellcheck-v0.11.0.linux.x86_64.tar.xz` |
| shellcheck x86_64 sha256 (hex) | `8c3be12b05d5c177a04c29e3c78ce89ac86f1595681cab149b65b97c4e227198` |
| shellcheck x86_64 SRI | `sha256-jDvhKwXVwXegTCnjx4zomshvFZVoHKsUm2W5fE4icZg=` |
| shellcheck aarch64 asset | `shellcheck-v0.11.0.linux.aarch64.tar.xz` |
| shellcheck aarch64 sha256 (hex) | `12b331c1d2db6b9eb13cfca64306b1b157a86eb69db83023e261eaa7e7c14588` |
| shellcheck aarch64 SRI | `sha256-ErMxwdLba56xPPymQwaxsVeobraduDAj4mHqp+fBRYg=` |

検証根拠: actionlint の hex は公式 `actionlint_1.7.12_checksums.txt` と一致確認済み。
shellcheck は公式 checksums 配布が無いため、TLS 直 DL した実物から計算（両 arch）。
**アーカイブ実構造（`tar -t` で観測済み）**: actionlint = 囲いディレクトリ無し
（`actionlint` がトップレベル、docs/ 等が同居）、shellcheck = `shellcheck-v0.11.0/`
に入れ子（`--strip-components=1` が必要）。

**CI 制約（観測済み）**: `reusable-test-and-build.yml` は
`HARDEN_RUNNER_EGRESS_POLICY: block`。GitHub リリース資産の DL は
`release-assets.githubusercontent.com` にリダイレクトされるため、
`EP_GITHUB_OBJECTS` への追記が必須（無いと guard ジョブの DL が egress block で死ぬ）。

**コミット規約**: 全コミット末尾に `(#393)`。

---

### Task 1: flake.nix に actionlint / shellcheck ピンを追加

**Files:**
- Modify: `flake.nix`

- [ ] **Step 1: ピン定義と派生を追加**

`flake.nix` の `apmNative = {...}.${system};`（33行目付近）の直後に追加:

```nix
          actionlintVersion = "1.7.12";
          # NOTE: asset filenames embed the version; flake_pin.py asserts that
          # consistency on every resolve, so a version bump that forgets the
          # asset line fails loud.
          actionlintNative = {
            aarch64-linux = { asset = "actionlint_1.7.12_linux_arm64.tar.gz"; hash = "sha256-Ml6XG2upv6UEZy4pvpPCSYHuscB1dtcw6ffIgFr/8MY="; };
            x86_64-linux = { asset = "actionlint_1.7.12_linux_amd64.tar.gz"; hash = "sha256-isqNuW8blHcPGw1ytt3cseu4EjyzcSUwsIzDh7NJo9g="; };
          }.${system};
          shellcheckVersion = "0.11.0";
          shellcheckNative = {
            aarch64-linux = { asset = "shellcheck-v0.11.0.linux.aarch64.tar.xz"; hash = "sha256-ErMxwdLba56xPPymQwaxsVeobraduDAj4mHqp+fBRYg="; };
            x86_64-linux = { asset = "shellcheck-v0.11.0.linux.x86_64.tar.xz"; hash = "sha256-jDvhKwXVwXegTCnjx4zomshvFZVoHKsUm2W5fE4icZg="; };
          }.${system};
```

`apm-cli = ...` 派生（91-113行目）の直後に追加:

```nix
          actionlint-cli = pkgs.stdenvNoCC.mkDerivation {
            pname = "actionlint";
            version = actionlintVersion;
            src = pkgs.fetchurl {
              url = "https://github.com/rhysd/actionlint/releases/download/v${actionlintVersion}/${actionlintNative.asset}";
              hash = actionlintNative.hash;
            };
            # The tarball is flat (no enclosing directory): the bare
            # `actionlint` binary sits at the top level next to docs/ and man/.
            # Verified with scripts/inspect_release_archive.sh (#392 action 1).
            sourceRoot = ".";
            dontBuild = true;
            dontStrip = true;
            dontPatchELF = true;
            installPhase = ''
              runHook preInstall
              install -Dm755 actionlint $out/bin/actionlint
              runHook postInstall
            '';
          };
          shellcheck-cli = pkgs.stdenvNoCC.mkDerivation {
            pname = "shellcheck-bin";
            version = shellcheckVersion;
            src = pkgs.fetchurl {
              url = "https://github.com/koalaman/shellcheck/releases/download/v${shellcheckVersion}/${shellcheckNative.asset}";
              hash = shellcheckNative.hash;
            };
            # The archive nests everything under shellcheck-v<version>/, which
            # stdenv auto-detects as sourceRoot. Verified with
            # scripts/inspect_release_archive.sh (#392 action 1).
            dontBuild = true;
            dontStrip = true;
            dontPatchELF = true;
            installPhase = ''
              runHook preInstall
              install -Dm755 shellcheck $out/bin/shellcheck
              runHook postInstall
            '';
          };
```

- [ ] **Step 2: パッケージ公開と sharedPackages へ追加**

116行目の `inherit` を変更:

```nix
          inherit claude-cli codex-cli pinned-uv apm-cli actionlint-cli shellcheck-cli;
```

`sharedPackages`（125-128行目）を変更:

```nix
          sharedPackages = with pkgs; [
            bashInteractive cacert coreutils fd gh git jq nodejs_22 python311 ripgrep
            agentPackages.pinned-uv agentPackages.actionlint-cli agentPackages.shellcheck-cli
          ];
```

- [ ] **Step 3: 静的検証**

本環境に nix は無い（設計書 §5 の限界）。構文崩れが無いことを目視確認し、
SRI 値が本計画冒頭の表と一致することを diff で確認する。

- [ ] **Step 4: Commit**

```bash
git add flake.nix
git commit -m "build: pin actionlint and shellcheck in flake.nix (#393)"
```

---

### Task 2: scripts/flake_pin.py（resolve のみの最小リーダ）

**Files:**
- Create: `scripts/flake_pin.py`
- Test: `tests/unit/test_flake_pin.py`

- [ ] **Step 1: 失敗するテストを書く**

`tests/unit/test_flake_pin.py`:

```python
"""Unit tests for scripts/flake_pin.py (resolve-only flake.nix pin reader)."""

from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from types import ModuleType

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "flake_pin.py"

AL_X86_HEX = "8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8"
SC_ARM_HEX = "12b331c1d2db6b9eb13cfca64306b1b157a86eb69db83023e261eaa7e7c14588"

FIXTURE_FLAKE = (
    '          actionlintVersion = "1.7.12";\n'
    "          actionlintNative = {\n"
    '            aarch64-linux = { asset = "actionlint_1.7.12_linux_arm64.tar.gz"; hash = "sha256-Ml6XG2upv6UEZy4pvpPCSYHuscB1dtcw6ffIgFr/8MY="; };\n'
    '            x86_64-linux = { asset = "actionlint_1.7.12_linux_amd64.tar.gz"; hash = "sha256-isqNuW8blHcPGw1ytt3cseu4EjyzcSUwsIzDh7NJo9g="; };\n'
    "          }.${system};\n"
    '          shellcheckVersion = "0.11.0";\n'
    "          shellcheckNative = {\n"
    '            aarch64-linux = { asset = "shellcheck-v0.11.0.linux.aarch64.tar.xz"; hash = "sha256-ErMxwdLba56xPPymQwaxsVeobraduDAj4mHqp+fBRYg="; };\n'
    '            x86_64-linux = { asset = "shellcheck-v0.11.0.linux.x86_64.tar.xz"; hash = "sha256-jDvhKwXVwXegTCnjx4zomshvFZVoHKsUm2W5fE4icZg="; };\n'
    "          }.${system};\n"
)


def _load_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location("flake_pin", SCRIPT)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.unit
def test_resolve_actionlint_x86_64() -> None:
    mod = _load_module()
    assert mod.read_pin(FIXTURE_FLAKE, "actionlint", "x86_64-linux") == (
        "1.7.12",
        "actionlint_1.7.12_linux_amd64.tar.gz",
        AL_X86_HEX,
    )


@pytest.mark.unit
def test_resolve_shellcheck_aarch64() -> None:
    mod = _load_module()
    assert mod.read_pin(FIXTURE_FLAKE, "shellcheck", "aarch64-linux") == (
        "0.11.0",
        "shellcheck-v0.11.0.linux.aarch64.tar.xz",
        SC_ARM_HEX,
    )


@pytest.mark.unit
def test_missing_tool_fails_loud() -> None:
    mod = _load_module()
    with pytest.raises(mod.PinError, match="rtkVersion not found"):
        mod.read_pin(FIXTURE_FLAKE, "rtk", "x86_64-linux")


@pytest.mark.unit
def test_missing_system_fails_loud() -> None:
    mod = _load_module()
    with pytest.raises(mod.PinError, match="no 'riscv64-linux' entry"):
        mod.read_pin(FIXTURE_FLAKE, "actionlint", "riscv64-linux")


@pytest.mark.unit
def test_non_sri_hash_fails_loud() -> None:
    mod = _load_module()
    broken = FIXTURE_FLAKE.replace("sha256-isqNuW8blHcPGw1ytt3cseu4EjyzcSUwsIzDh7NJo9g=", "md5-deadbeef")
    with pytest.raises(mod.PinError, match="not an SRI sha256 hash"):
        mod.read_pin(broken, "actionlint", "x86_64-linux")


@pytest.mark.unit
def test_version_asset_mismatch_fails_loud() -> None:
    mod = _load_module()
    bumped = FIXTURE_FLAKE.replace('actionlintVersion = "1.7.12"', 'actionlintVersion = "1.7.13"')
    with pytest.raises(mod.PinError, match="does not appear in asset"):
        mod.read_pin(bumped, "actionlint", "x86_64-linux")


@pytest.mark.unit
def test_sri_to_hex_roundtrip() -> None:
    mod = _load_module()
    assert mod.sri_to_hex("sha256-isqNuW8blHcPGw1ytt3cseu4EjyzcSUwsIzDh7NJo9g=") == AL_X86_HEX


@pytest.mark.unit
def test_cli_resolves_real_flake() -> None:
    """Deterministic consistency gate between the real flake.nix and the reader."""
    for tool in ("actionlint", "shellcheck"):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "resolve", "--tool", tool, "--system", "x86_64-linux"],
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode == 0, result.stderr
        version, asset, sha_hex = result.stdout.splitlines()
        assert version in asset
        assert len(sha_hex) == 64
        assert all(c in "0123456789abcdef" for c in sha_hex)


@pytest.mark.unit
def test_cli_unknown_tool_rejected() -> None:
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "resolve", "--tool", "rtk", "--system", "x86_64-linux"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
uv run pytest tests/unit/test_flake_pin.py -v
```

Expected: 全テスト FAIL（`scripts/flake_pin.py` が存在しないため `_load_module` で失敗）

- [ ] **Step 3: 実装を書く**

`scripts/flake_pin.py`:

```python
#!/usr/bin/env python3
"""Resolve fetchurl pins (version / asset / sha256) from flake.nix.

flake.nix is the single source of truth for the pinned version and per-system
SHA256 of the fetchurl-provisioned lint binaries (actionlint, shellcheck).
This stdlib-only reader exposes those pins to the non-nix consumers -- the
web-session installer (scripts/install-workflow-linters.sh) and the CI guard
job in reusable-test-and-build.yml -- so exactly one place defines each pin.

Minimal port of tvna/claude-md's flake_pin.py: only the ``resolve``
subcommand; the bump/asset-url update-path tooling is intentionally omitted
(YAGNI). Refs #393 (retro #392).

CLI:
    python3 scripts/flake_pin.py resolve --tool actionlint --system x86_64-linux
        -> three lines on stdout: version, asset filename, sha256 in hex

Failure policy: fails loud (exit != 0) when flake.nix is missing, a field
cannot be parsed, the hash is not SRI sha256, or the pinned version does not
appear in the asset filename (a version bump that forgot the asset line).
Never prints a guessed or partial result.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FLAKE_PATH = REPO_ROOT / "flake.nix"

KNOWN_TOOLS = ("actionlint", "shellcheck")


class PinError(Exception):
    """A pin could not be resolved from flake.nix."""


def sri_to_hex(sri: str) -> str:
    """Convert a nix SRI sha256 hash to lowercase hex for sha256sum -c."""
    if not sri.startswith("sha256-"):
        raise PinError(f"not an SRI sha256 hash: {sri!r}")
    try:
        digest = base64.b64decode(sri[len("sha256-") :], validate=True)
    except (binascii.Error, ValueError) as exc:
        raise PinError(f"invalid base64 in SRI hash {sri!r}: {exc}") from exc
    if len(digest) != 32:
        raise PinError(f"SRI sha256 digest must be 32 bytes, got {len(digest)}: {sri!r}")
    return digest.hex()


def read_pin(flake_text: str, tool: str, system: str) -> tuple[str, str, str]:
    """Return (version, asset, sha256-hex) for tool on system, or raise PinError."""
    version_match = re.search(rf'\b{re.escape(tool)}Version\s*=\s*"([^"]+)"\s*;', flake_text)
    if version_match is None:
        raise PinError(f"{tool}Version not found in flake.nix")
    version = version_match.group(1)

    block_match = re.search(
        rf"\b{re.escape(tool)}Native\s*=\s*\{{(.*?)\}}\.\$\{{system\}}\s*;",
        flake_text,
        re.DOTALL,
    )
    if block_match is None:
        raise PinError(f"{tool}Native block not found in flake.nix")

    entry_match = re.search(
        rf'\b{re.escape(system)}\s*=\s*\{{\s*asset\s*=\s*"([^"]+)"\s*;\s*hash\s*=\s*"([^"]+)"\s*;',
        block_match.group(1),
    )
    if entry_match is None:
        raise PinError(f"{tool}Native has no '{system}' entry with asset/hash")
    asset, sri = entry_match.groups()

    if version not in asset:
        raise PinError(f"{tool} pin is inconsistent: version {version!r} does not appear in asset {asset!r}")
    return version, asset, sri_to_hex(sri)


def main(argv: list[str] | None = None) -> int:
    """CLI entry point; prints version/asset/sha256-hex for the resolve subcommand."""
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    resolve = sub.add_parser("resolve", help="print version/asset/sha256-hex for a pinned tool")
    resolve.add_argument("--tool", required=True, choices=KNOWN_TOOLS)
    resolve.add_argument("--system", required=True)
    args = parser.parse_args(argv)

    if not FLAKE_PATH.is_file():
        print(f"flake_pin: flake.nix not found at {FLAKE_PATH}", file=sys.stderr)
        return 2
    try:
        version, asset, sha_hex = read_pin(FLAKE_PATH.read_text(encoding="utf-8"), args.tool, args.system)
    except PinError as exc:
        print(f"flake_pin: {exc}", file=sys.stderr)
        return 1
    print(version)
    print(asset)
    print(sha_hex)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: テストが通ることを確認**

```bash
uv run pytest tests/unit/test_flake_pin.py -v
```

Expected: 全 PASS（`test_cli_resolves_real_flake` は Task 1 のピンが
実 flake.nix に存在することも検証する）

- [ ] **Step 5: lint と型チェック**

```bash
uv run ruff check scripts/flake_pin.py tests/unit/test_flake_pin.py
uv run ruff format --check scripts/flake_pin.py tests/unit/test_flake_pin.py
uv run mypy scripts/flake_pin.py
```

Expected: エラーなし（ruff format 差分が出たら適用して再実行）

- [ ] **Step 6: Commit**

```bash
git add scripts/flake_pin.py tests/unit/test_flake_pin.py
git commit -m "feat: add stdlib-only flake.nix pin reader (resolve) (#393)"
```

---

### Task 3: scripts/inspect_release_archive.sh（#392 アクション 2）

**Files:**
- Create: `scripts/inspect_release_archive.sh`
- Test: `tests/unit/test_inspect_release_archive.py`

- [ ] **Step 1: 失敗するテストを書く**

`tests/unit/test_inspect_release_archive.py`:

```python
"""Unit tests for scripts/inspect_release_archive.sh (no network: local fixtures)."""

from __future__ import annotations

import hashlib
import shutil
import subprocess
import tarfile
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "inspect_release_archive.sh"
BASH = shutil.which("bash") or "/bin/bash"


def _run(*args: str) -> "subprocess.CompletedProcess[str]":
    return subprocess.run([BASH, str(SCRIPT), *args], capture_output=True, text=True, check=False)


def _make_nested_tgz(tmp_path: Path) -> Path:
    """Mimic the apm archive shape: everything under one top-level directory."""
    root = tmp_path / "apm-linux-x86_64"
    (root / "_internal").mkdir(parents=True)
    (root / "apm").write_text("#!/bin/sh\n", encoding="utf-8")
    (root / "_internal" / "data.txt").write_text("x\n", encoding="utf-8")
    archive = tmp_path / "nested.tar.gz"
    with tarfile.open(archive, "w:gz") as tar:
        tar.add(root, arcname="apm-linux-x86_64")
    return archive


def _make_flat_txz(tmp_path: Path) -> Path:
    """Mimic the actionlint archive shape: bare binary at the top level."""
    binary = tmp_path / "actionlint"
    binary.write_text("#!/bin/sh\n", encoding="utf-8")
    archive = tmp_path / "flat.tar.xz"
    with tarfile.open(archive, "w:xz") as tar:
        tar.add(binary, arcname="actionlint")
    return archive


@pytest.mark.unit
def test_lists_structure_and_top_level_summary(tmp_path: Path) -> None:
    archive = _make_nested_tgz(tmp_path)
    result = _run(str(archive))
    assert result.returncode == 0, result.stderr
    assert "apm-linux-x86_64/apm" in result.stdout
    assert "top-level" in result.stdout


@pytest.mark.unit
def test_flat_tar_xz_supported(tmp_path: Path) -> None:
    archive = _make_flat_txz(tmp_path)
    result = _run(str(archive))
    assert result.returncode == 0, result.stderr
    assert "actionlint" in result.stdout


@pytest.mark.unit
def test_expect_path_present_succeeds(tmp_path: Path) -> None:
    archive = _make_nested_tgz(tmp_path)
    result = _run(str(archive), "--expect-path", "apm-linux-x86_64/apm")
    assert result.returncode == 0, result.stderr


@pytest.mark.unit
def test_expect_path_absent_fails_loud(tmp_path: Path) -> None:
    """The PR #391 bug class: assuming a member path that is not in the archive."""
    archive = _make_nested_tgz(tmp_path)
    result = _run(str(archive), "--expect-path", "apm")
    assert result.returncode != 0
    assert "apm" in result.stderr


@pytest.mark.unit
def test_sha256_match_succeeds(tmp_path: Path) -> None:
    archive = _make_nested_tgz(tmp_path)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    result = _run(str(archive), "--sha256", digest)
    assert result.returncode == 0, result.stderr


@pytest.mark.unit
def test_sha256_mismatch_fails_loud(tmp_path: Path) -> None:
    archive = _make_nested_tgz(tmp_path)
    result = _run(str(archive), "--sha256", "0" * 64)
    assert result.returncode != 0


@pytest.mark.unit
def test_unsupported_extension_fails_loud(tmp_path: Path) -> None:
    bogus = tmp_path / "artifact.rar"
    bogus.write_bytes(b"not an archive")
    result = _run(str(bogus))
    assert result.returncode != 0
    assert "unsupported" in result.stderr.lower()


@pytest.mark.unit
def test_missing_input_fails_loud(tmp_path: Path) -> None:
    result = _run(str(tmp_path / "no-such-file.tar.gz"))
    assert result.returncode != 0


@pytest.mark.unit
def test_no_arguments_prints_usage(tmp_path: Path) -> None:
    result = _run()
    assert result.returncode != 0
    assert "usage" in result.stderr.lower()
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
uv run pytest tests/unit/test_inspect_release_archive.py -v
```

Expected: 全 FAIL（スクリプト不在で bash が exit 127、returncode == 0 の
アサーションが落ちる）

- [ ] **Step 3: 実装を書く**

`scripts/inspect_release_archive.sh`（作成後 `chmod +x`）:

```bash
#!/usr/bin/env bash
# Preflight inspection for release archives. Refs #393 (retro #392 action 2).
#
# Inspect the REAL structure of a (pinned) release archive BEFORE authoring
# any extraction logic. The PR #391 Job B repair (exit 127: the apm binary was
# not at the assumed path because the archive nests everything under
# apm-linux-x86_64/) is the bug class this preflight prevents: run this first,
# read the listing, then encode --strip-components / member paths from the
# observed layout, not from assumption.
#
# Usage:
#   scripts/inspect_release_archive.sh <url-or-path> [--sha256 <hex>] [--expect-path <member>]
#
#   <url-or-path>   release archive; a local file path is used as-is, anything
#                   else is downloaded with curl into a temp dir
#   --sha256 <hex>  verify the archive against this sha256 before inspecting
#   --expect-path   assert this exact member path exists in the archive
#                   (exit non-zero when absent)
#
# Supported formats: .tar.gz / .tgz / .tar.xz / .zip
set -euo pipefail

usage() {
  echo "usage: $0 <url-or-path> [--sha256 <hex>] [--expect-path <member>]" >&2
}

if [ "$#" -lt 1 ]; then
  usage
  exit 2
fi

src="$1"
shift
sha=""
expect=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --sha256)
      sha="${2:?--sha256 requires a hex digest}"
      shift 2
      ;;
    --expect-path)
      expect="${2:?--expect-path requires a member path}"
      shift 2
      ;;
    *)
      usage
      exit 2
      ;;
  esac
done

tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

if [ -f "${src}" ]; then
  archive="${src}"
else
  archive="${tmpdir}/$(basename "${src}")"
  echo "inspect_release_archive: downloading ${src} ..." >&2
  curl -fsSL -o "${archive}" "${src}"
fi

if [ -n "${sha}" ]; then
  echo "${sha}  ${archive}" | sha256sum -c - >&2
fi

case "${archive}" in
  *.tar.gz | *.tgz) listing="$(tar -tzf "${archive}")" ;;
  *.tar.xz) listing="$(tar -tJf "${archive}")" ;;
  *.zip) listing="$(python3 -c 'import sys, zipfile; print("\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))' "${archive}")" ;;
  *)
    echo "inspect_release_archive: unsupported archive extension: ${archive}" >&2
    exit 2
    ;;
esac

echo "== top-level entries =="
printf '%s\n' "${listing}" | cut -d/ -f1 | sort -u
echo
total="$(printf '%s\n' "${listing}" | wc -l)"
echo "== first 40 of ${total} members =="
printf '%s\n' "${listing}" | head -40

if [ -n "${expect}" ]; then
  if printf '%s\n' "${listing}" | grep -Fxq -- "${expect}"; then
    echo "OK: member '${expect}' exists in the archive"
  else
    echo "inspect_release_archive: ERROR: expected member '${expect}' not found in the archive." >&2
    echo "inspect_release_archive: write extraction logic from the listing above, not from assumption." >&2
    exit 1
  fi
fi
```

```bash
chmod +x scripts/inspect_release_archive.sh
```

- [ ] **Step 4: テストが通ることを確認**

```bash
uv run pytest tests/unit/test_inspect_release_archive.py -v
```

Expected: 全 PASS

- [ ] **Step 5: 実物でドッグフーディング（ピン値の最終クロスチェック）**

```bash
bash scripts/inspect_release_archive.sh \
  "https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz" \
  --sha256 8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8 \
  --expect-path actionlint
bash scripts/inspect_release_archive.sh \
  "https://github.com/koalaman/shellcheck/releases/download/v0.11.0/shellcheck-v0.11.0.linux.x86_64.tar.xz" \
  --sha256 8c3be12b05d5c177a04c29e3c78ce89ac86f1595681cab149b65b97c4e227198 \
  --expect-path shellcheck-v0.11.0/shellcheck
```

Expected: 両方とも sha256 OK、`OK: member ... exists`、構造一覧が
計画冒頭の観測（actionlint=フラット / shellcheck=入れ子）と一致

- [ ] **Step 6: Commit**

```bash
git add scripts/inspect_release_archive.sh tests/unit/test_inspect_release_archive.py
git commit -m "feat: add release-archive structure preflight script (#393)"
```

---

### Task 4: web 環境インストーラ（_session_path.sh + install-workflow-linters.sh）

**Files:**
- Create: `scripts/_session_path.sh`
- Create: `scripts/install-workflow-linters.sh`
- Test: `tests/unit/test_install_workflow_linters.py`

- [ ] **Step 1: 失敗するテストを書く**

`tests/unit/test_install_workflow_linters.py`:

```python
"""Unit tests for scripts/install-workflow-linters.sh gate behavior.

Only the no-network paths are tested here (remote-env gate, unsupported
arch). The real download/install path is verified manually in a
CLAUDE_CODE_REMOTE=true session (design doc section 5).
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "install-workflow-linters.sh"
BASH = shutil.which("bash") or "/bin/bash"


@pytest.mark.unit
def test_noop_outside_remote_environments() -> None:
    env = {k: v for k, v in os.environ.items() if k not in ("CLAUDE_CODE_REMOTE", "CODEX_CODE_REMOTE")}
    result = subprocess.run([BASH, str(SCRIPT)], capture_output=True, text=True, check=False, env=env)
    assert result.returncode == 0
    assert result.stdout == ""
    assert result.stderr == ""


@pytest.mark.unit
def test_unsupported_arch_skips_loudly(tmp_path: Path) -> None:
    shim = tmp_path / "uname"
    shim.write_text("#!/bin/sh\necho mips\n", encoding="utf-8")
    shim.chmod(0o755)
    env = dict(os.environ)
    env["CLAUDE_CODE_REMOTE"] = "true"
    env["PATH"] = f"{tmp_path}:{env['PATH']}"
    result = subprocess.run([BASH, str(SCRIPT)], capture_output=True, text=True, check=False, env=env)
    assert result.returncode == 0
    assert "skipping" in result.stderr
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
uv run pytest tests/unit/test_install_workflow_linters.py -v
```

Expected: 全 FAIL（スクリプト不在）

- [ ] **Step 3: _session_path.sh を移植**

`scripts/_session_path.sh`（tvna/claude-md からの移植、実行属性不要）:

```bash
#!/usr/bin/env bash
# Shared helper sourced by SessionStart provisioning scripts
# (install-workflow-linters.sh). Ported from tvna/claude-md. Refs #393.
#
# persist_session_path <dir>
#   Put <dir> on PATH for the current process and persist it for the rest of
#   the session. A no-op when <dir> is already on PATH. Otherwise it appends an
#   `export PATH="<dir>:$PATH"` line to $CLAUDE_ENV_FILE (when the harness set
#   one -- it is sourced before the first agent step) and exports the prefixed
#   PATH into the current process.
#
# This file is meant to be sourced, not executed: it only defines a function
# and has no side effects at source time, so it deliberately does not set shell
# options -- the sourcing script owns `set -euo pipefail`.

persist_session_path() {
  local dir="$1"
  # An empty dir would prepend an empty PATH element (== cwd); refuse loudly
  # rather than silently widening PATH (CLAUDE.md section 4).
  if [ -z "${dir}" ]; then
    echo "persist_session_path: refusing to add an empty directory to PATH" >&2
    return 2
  fi
  case ":${PATH}:" in
    *":${dir}:"*) return 0 ;;
  esac
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export PATH=\"${dir}:\$PATH\"" >> "${CLAUDE_ENV_FILE}"
  fi
  export PATH="${dir}:${PATH}"
}
```

- [ ] **Step 4: インストーラを書く**

`scripts/install-workflow-linters.sh`（作成後 `chmod +x`）:

```bash
#!/usr/bin/env bash
# SessionStart hook: provision the pinned actionlint AND shellcheck binaries
# onto PATH in Claude Code on the Web (CLAUDE_CODE_REMOTE=true) sessions.
# Refs #393 (retro #392 action 1; adapted from tvna/claude-md's
# install-actionlint.sh).
#
# Why both binaries: actionlint silently skips its shellcheck rules (e.g. the
# SC2086 finding that PR #391 only saw in CI) when no shellcheck binary is on
# PATH, so provisioning actionlint alone would NOT close the gap. The
# runner-bundled shellcheck is also unpinned, so we pin both.
#
# flake.nix is the single source of truth for version/asset/SHA256
# (actionlintVersion/actionlintNative, shellcheckVersion/shellcheckNative);
# scripts/flake_pin.py reads them at runtime so there is exactly one place to
# update on a bump. Every download is verified with `sha256sum -c` before
# install (supply-chain guard), and installs are atomic (mktemp + mv on one
# filesystem) so a concurrent reader never sees a half-written binary.
#
# Local dev and the nix devcontainer provision these tools via flake.nix
# (sharedPackages); this hook is a silent no-op there.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ] && [ "${CODEX_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/_session_path.sh
. "${SCRIPT_DIR}/_session_path.sh"

# Map this platform to the nix system double that flake.nix's *Native blocks
# enumerate. An unsupported arch is a non-fatal skip: the binaries are an
# enhancement, not a session prerequisite, so do not abort session startup.
arch="$(uname -m)"
nix_system=""
case "${arch}" in
  x86_64 | amd64) nix_system="x86_64-linux" ;;
  aarch64 | arm64) nix_system="aarch64-linux" ;;
  *)
    echo "install-workflow-linters: no pinned assets for arch '${arch}'; skipping." >&2
    exit 0
    ;;
esac

if ! command -v python3 >/dev/null 2>&1; then
  echo "install-workflow-linters: python3 is required to read the pins; skipping." >&2
  exit 0
fi

install_dir="${HOME}/.local/bin"
mkdir -p "${install_dir}"

# install_pinned <tool> <github-repo> <installed-version-command>
#   Resolve the tool's pin from flake.nix, reuse a matching binary already on
#   PATH, otherwise download + verify + atomically install it.
install_pinned() {
  local tool="$1" repo="$2" version_cmd="$3"
  local pin version asset sha dest url tmpdir tarball staged current

  pin="$(python3 "${SCRIPT_DIR}/flake_pin.py" resolve --tool "${tool}" --system "${nix_system}")"
  version="$(printf '%s\n' "${pin}" | sed -n '1p')"
  asset="$(printf '%s\n' "${pin}" | sed -n '2p')"
  sha="$(printf '%s\n' "${pin}" | sed -n '3p')"
  dest="${install_dir}/${tool}"

  # Idempotent: reuse a binary already on PATH at the pinned version (a prior
  # session-start run, or a nix-provisioned binary).
  if command -v "${tool}" >/dev/null 2>&1; then
    current="$(bash -c "${version_cmd}" 2>/dev/null || true)"
    if [ "${current}" = "${version}" ]; then
      echo "install-workflow-linters: ${tool} ${version} already present ($(command -v "${tool}"))" >&2
      return 0
    fi
  fi

  tmpdir="$(mktemp -d)"
  # shellcheck disable=SC2064 -- expand tmpdir now; it is gone when the trap fires
  trap "rm -rf '${tmpdir}'" RETURN
  tarball="${tmpdir}/${asset}"
  url="https://github.com/${repo}/releases/download/v${version}/${asset}"

  echo "install-workflow-linters: downloading pinned ${asset} v${version} ..." >&2
  curl -fsSL -o "${tarball}" "${url}"
  echo "${sha}  ${tarball}" | sha256sum -c - >&2

  # Archive layouts verified with scripts/inspect_release_archive.sh (#392):
  #   actionlint: flat archive, bare 'actionlint' binary at the top level
  #   shellcheck: nested under shellcheck-v<version>/
  case "${tool}" in
    actionlint) tar -xzf "${tarball}" -C "${tmpdir}" actionlint ;;
    shellcheck) tar -xJf "${tarball}" -C "${tmpdir}" --strip-components=1 "shellcheck-v${version}/shellcheck" ;;
    *)
      echo "install-workflow-linters: ERROR: no extraction rule for '${tool}'." >&2
      return 1
      ;;
  esac
  if [ ! -f "${tmpdir}/${tool}" ]; then
    echo "install-workflow-linters: ERROR: ${asset} did not contain '${tool}'." >&2
    return 1
  fi

  staged="$(mktemp "${install_dir}/.${tool}.XXXXXX")"
  cp "${tmpdir}/${tool}" "${staged}"
  chmod 0755 "${staged}"
  mv -f "${staged}" "${dest}"
  echo "install-workflow-linters: ${tool} v${version} ready at ${dest}" >&2
}

install_pinned actionlint "rhysd/actionlint" "actionlint --version | head -1"
install_pinned shellcheck "koalaman/shellcheck" "shellcheck --version | sed -n 's/^version: //p'"

persist_session_path "${install_dir}"
```

```bash
chmod +x scripts/install-workflow-linters.sh
```

- [ ] **Step 5: テストが通ることを確認**

```bash
uv run pytest tests/unit/test_install_workflow_linters.py -v
```

Expected: 全 PASS

- [ ] **Step 6: 実走検証（この web 環境は CLAUDE_CODE_REMOTE=true）**

```bash
bash scripts/install-workflow-linters.sh
export PATH="${HOME}/.local/bin:${PATH}"
actionlint --version | head -1    # Expected: 1.7.12
shellcheck --version | sed -n 's/^version: //p'    # Expected: 0.11.0
actionlint -color                 # Expected: 既存 workflow 一式が exit 0
bash scripts/install-workflow-linters.sh   # Expected: 2 行の "already present"（冪等）
```

actionlint が既存 workflow で findings を出した場合: それは「ローカルゲートが
無かった期間に入り込んだ実違反」。修正は本タスクに含めず、findings を記録して
Task 5 の前に独立コミットで修正する（CI ピン変更後はどのみち fail するため）。

- [ ] **Step 7: 新スクリプト自身を shellcheck に通す**

```bash
shellcheck scripts/install-workflow-linters.sh scripts/_session_path.sh scripts/inspect_release_archive.sh
```

Expected: findings なし

- [ ] **Step 8: Commit**

```bash
git add scripts/_session_path.sh scripts/install-workflow-linters.sh tests/unit/test_install_workflow_linters.py
git commit -m "feat: provision pinned actionlint/shellcheck in web sessions (#393)"
```

---

### Task 5: SessionStart フック登録（.claude/settings.json）

**Files:**
- Modify: `.claude/settings.json`

- [ ] **Step 1: フックエントリを追加**

`hooks.SessionStart` 配列の末尾（git-identity エントリの後）に追加。
既存の 2-space インデントを維持:

```json
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "bash scripts/install-workflow-linters.sh",
            "async": false
          }
        ]
      }
```

- [ ] **Step 2: JSON 妥当性を検証**

```bash
python3 -m json.tool .claude/settings.json >/dev/null && echo OK
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "feat: install pinned workflow linters at session start (#393)"
```

---

### Task 6: CI guard ジョブのピン留め（reusable-test-and-build.yml）

**Files:**
- Modify: `.github/workflows/reusable-test-and-build.yml:99`（EP_GITHUB_OBJECTS）
- Modify: `.github/workflows/reusable-test-and-build.yml:221-229`（actionlint ステップ）

- [ ] **Step 1: EP_GITHUB_OBJECTS にリリース資産ドメインを追加**

現状（99行目）:

```yaml
  EP_GITHUB_OBJECTS: objects.githubusercontent.com:443
```

変更後:

```yaml
  # release-assets.githubusercontent.com: GitHub release-asset downloads now
  # redirect here (observed 2026-06; egress-policy is block, so an unlisted
  # redirect target kills the download). Refs #393.
  EP_GITHUB_OBJECTS: >-
    objects.githubusercontent.com:443
    release-assets.githubusercontent.com:443
```

- [ ] **Step 2: actionlint ステップをピン留め版に置換**

現状（221-229行目）:

```yaml
      - name: Download and run actionlint
        run: |
          # バイナリのダウンロードとインストール
          curl -sSLo actionlint.bash https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash
          # ダウンロードしたバッシュスクリプトに実行権限を与えて実行
          chmod +x actionlint.bash
          ./actionlint.bash
          # actionlintを実行
          ./actionlint -color
```

変更後:

```yaml
      - name: Install pinned actionlint and shellcheck
        run: |
          set -euo pipefail
          # flake.nix is the single source of truth for both pins (#393).
          # shellcheck is provisioned explicitly and pinned: actionlint
          # silently skips shellcheck rules (e.g. SC2086) when the binary is
          # absent, and the runner-bundled shellcheck is unpinned.
          lint_bin="${RUNNER_TEMP}/lint-bin"
          mkdir -p "${lint_bin}"

          pin="$(python3 scripts/flake_pin.py resolve --tool actionlint --system x86_64-linux)"
          al_version="$(printf '%s\n' "${pin}" | sed -n '1p')"
          al_asset="$(printf '%s\n' "${pin}" | sed -n '2p')"
          al_sha="$(printf '%s\n' "${pin}" | sed -n '3p')"
          curl --fail --location --silent --show-error -o actionlint.tar.gz \
            "https://github.com/rhysd/actionlint/releases/download/v${al_version}/${al_asset}"
          echo "${al_sha}  actionlint.tar.gz" | sha256sum --check --strict
          # Flat archive: the bare 'actionlint' binary sits at the top level
          # (verified with scripts/inspect_release_archive.sh).
          tar -xzf actionlint.tar.gz -C "${lint_bin}" actionlint

          pin="$(python3 scripts/flake_pin.py resolve --tool shellcheck --system x86_64-linux)"
          sc_version="$(printf '%s\n' "${pin}" | sed -n '1p')"
          sc_asset="$(printf '%s\n' "${pin}" | sed -n '2p')"
          sc_sha="$(printf '%s\n' "${pin}" | sed -n '3p')"
          curl --fail --location --silent --show-error -o shellcheck.tar.xz \
            "https://github.com/koalaman/shellcheck/releases/download/v${sc_version}/${sc_asset}"
          echo "${sc_sha}  shellcheck.tar.xz" | sha256sum --check --strict
          # Nested archive: everything sits under shellcheck-v<version>/
          # (verified with scripts/inspect_release_archive.sh).
          tar -xJf shellcheck.tar.xz -C "${lint_bin}" --strip-components=1 "shellcheck-v${sc_version}/shellcheck"

          echo "${lint_bin}" >> "${GITHUB_PATH}"

      - name: Run actionlint
        run: actionlint -color
```

`EP_GITHUB_RAW` は guard ジョブの allowed-endpoints に残したままにする
（旧 download-actionlint.bash 専用だったが、削除は egress 失敗の修復リスクを
伴う最適化であり #393 の必須範囲外。レトロの「修復ゼロ」最優先）。

- [ ] **Step 3: 変更した workflow 自身をローカルゲートで lint（自己適用）**

```bash
export PATH="${HOME}/.local/bin:${PATH}"
actionlint -color
uv run pre-commit run yamllint --files .github/workflows/reusable-test-and-build.yml
uv run pre-commit run check-github-workflows --files .github/workflows/reusable-test-and-build.yml
```

Expected: すべて exit 0（これが #392 の「push 前に actionlint」の実演）

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/reusable-test-and-build.yml
git commit -m "ci: pin actionlint and shellcheck via flake.nix in guard job (#393)"
```

---

### Task 7: CLAUDE.local.md に運用ルールを追記

**Files:**
- Modify: `CLAUDE.local.md`

- [ ] **Step 1: ルールを追記**

ファイル末尾に追加（既存セクションと同じ英語・ASCII）:

```markdown

## Release-archive preflight

- Before authoring any extraction logic for a release artifact (tar.gz, zip,
  etc.), run `scripts/inspect_release_archive.sh <pinned-url> --sha256 <hex>
  [--expect-path <member>]` and encode the observed layout (nesting,
  `--strip-components`, member paths) in the code and its comments. Never
  write extraction paths from assumption; the apm nested-directory failure on
  PR #391 (exit 127) is the bug class this prevents. Refs #392, #393.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.local.md
git commit -m "docs: require release-archive preflight before extraction logic (#393)"
```

---

### Task 8: 全体検証と push

- [ ] **Step 1: 全テスト実行**

```bash
uv run pytest -vv -n auto -m "unit or integration or workflow" --disable-warnings --benchmark-disable
```

Expected: 全 PASS（pre-commit の pytest_without_e2e と同一コマンド）

- [ ] **Step 2: lint 一式**

```bash
uv run ruff check scripts/ tests/
uv run ruff format --check scripts/ tests/
uv run mypy scripts/flake_pin.py
export PATH="${HOME}/.local/bin:${PATH}"
actionlint -color
shellcheck scripts/*.sh .claude/hooks/*.sh
```

Expected: すべて exit 0

- [ ] **Step 3: 計画ドキュメント自身をコミット**

```bash
git add docs/superpowers/plans/2026-06-11-local-workflow-lint-gate.md
git commit -m "docs: add local workflow lint gate implementation plan (#393)"
```

（計画は実装開始前にコミット済みのはず。チェックボックス更新があれば再コミット）

- [ ] **Step 4: push（リトライ規約付き）**

```bash
git push -u origin claude/nice-cerf-8grwwx
```

ネットワークエラー時のみ 2s/4s/8s/16s の指数バックオフで最大 4 回リトライ。

- [ ] **Step 5: PR 作成とフォローアップ**

- PR タイトル/本文は ASCII、`Closes #393` と `Refs #392` を含める
- PR 作成後 `subscribe_pr_activity` で CI/レビューを購読し、terminal state
  （merged/closed）まで運転する
- **マージ後**: この PR は親レトロ #392 から派生したアクション issue #393 を
  閉じるフォローアップなので、CLAUDE.local.md の規約に従い**新しいレトロ issue は
  開かず**、repair-free-merge レビューを #392 にノート（ASCII コメント）として
  記録する

---

## 検証マトリクス（設計書 §5 対応）

| 設計書要件 | 担保するタスク |
|---|---|
| C1 flake.nix ピン | Task 1（静的検証のみ、nix 不在の限界は設計書に明記済み） |
| C2 flake_pin.py | Task 2（fixture テスト + 実 flake 整合テスト） |
| C3 検査スクリプト + 運用ルール | Task 3 + Task 7 |
| C4 インストーラ + フック | Task 4（実走検証含む）+ Task 5 |
| C5 CI ピン留め | Task 6（ローカル自己適用 lint）+ PR の CI 実走 |
| C6 テスト | Task 2/3/4 の各テストファイル、Task 8 で一括実行 |
