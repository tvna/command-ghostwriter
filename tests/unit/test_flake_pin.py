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
    '            aarch64-linux = { asset = "actionlint_1.7.12_linux_arm64.tar.gz"; hash = "sha256-Ml6XG2upv6UEZy4pvpPCSYHuscB1dtcw6ffIgFr/8MY="; };\n'  # noqa: E501
    '            x86_64-linux = { asset = "actionlint_1.7.12_linux_amd64.tar.gz"; hash = "sha256-isqNuW8blHcPGw1ytt3cseu4EjyzcSUwsIzDh7NJo9g="; };\n'  # noqa: E501
    "          }.${system};\n"
    '          shellcheckVersion = "0.11.0";\n'
    "          shellcheckNative = {\n"
    '            aarch64-linux = { asset = "shellcheck-v0.11.0.linux.aarch64.tar.xz"; hash = "sha256-ErMxwdLba56xPPymQwaxsVeobraduDAj4mHqp+fBRYg="; };\n'  # noqa: E501
    '            x86_64-linux = { asset = "shellcheck-v0.11.0.linux.x86_64.tar.xz"; hash = "sha256-jDvhKwXVwXegTCnjx4zomshvFZVoHKsUm2W5fE4icZg="; };\n'  # noqa: E501
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
def test_sri_invalid_base64_fails_loud() -> None:
    mod = _load_module()
    with pytest.raises(mod.PinError, match="invalid base64"):
        mod.sri_to_hex("sha256-!!!notbase64!!!")


@pytest.mark.unit
def test_sri_wrong_digest_length_fails_loud() -> None:
    mod = _load_module()
    with pytest.raises(mod.PinError, match="must be 32 bytes"):
        mod.sri_to_hex("sha256-aGVsbG8=")


@pytest.mark.unit
def test_cli_missing_flake_exits_2(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    mod = _load_module()
    monkeypatch.setattr(mod, "FLAKE_PATH", tmp_path / "no-such-flake.nix")
    assert mod.main(["resolve", "--tool", "actionlint", "--system", "x86_64-linux"]) == 2


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
    assert "invalid choice" in result.stderr
