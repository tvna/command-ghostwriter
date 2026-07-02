"""Unit tests for scripts/inspect_release_archive.sh (no network: local fixtures)."""

from __future__ import annotations

import hashlib
import shutil
import subprocess
import tarfile
import zipfile
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


@pytest.mark.unit
def test_corrupt_archive_exits_3(tmp_path: Path) -> None:
    bogus = tmp_path / "corrupt.tar.gz"
    bogus.write_bytes(b"this is not a gzip stream")
    result = _run(str(bogus))
    assert result.returncode == 3
    assert "failed to read" in result.stderr


@pytest.mark.unit
def test_zip_supported(tmp_path: Path) -> None:
    src = tmp_path / "tool"
    src.write_text("#!/bin/sh\n", encoding="utf-8")
    archive = tmp_path / "release.zip"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.write(src, arcname="tool-v1/tool")
    result = _run(str(archive), "--expect-path", "tool-v1/tool")
    assert result.returncode == 0, result.stderr
    assert "tool-v1/tool" in result.stdout
