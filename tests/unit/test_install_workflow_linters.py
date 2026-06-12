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
