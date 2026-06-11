"""Unit tests for scripts/gen_superpowers_manifest.py and the SessionStart hook.

The manifest module uses REPO_ROOT-relative module constants; tests point those
constants at a temporary fake repo so no real repo files are touched. The hook
integration test runs the real bash hook against the fake repo via subprocess.
"""

from __future__ import annotations

import importlib.util
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from types import ModuleType

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "gen_superpowers_manifest.py"
HOOK = REPO_ROOT / ".claude" / "hooks" / "superpowers-session-start.sh"
BASH = shutil.which("bash") or "/bin/bash"

PINNED = "f2cbfbefebbfef77321e4c9abc9e949826bea9d7"
APM_LOCK_BODY = (
    f"lockfile_version: '1'\ndependencies:\n- repo_url: obra/superpowers\n  resolved_commit: {PINNED}\n  package_type: marketplace_plugin\n"
)


def _load_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location("gen_superpowers_manifest", SCRIPT)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _make_fake_repo(root: Path) -> Path:
    """Create a minimal fake repo with one skill and an apm.lock; return skills dir."""
    skills = root / ".claude" / "skills"
    (skills / "using-superpowers").mkdir(parents=True)
    (skills / "using-superpowers" / "SKILL.md").write_text("---\nname: using-superpowers\n---\nbody\n", encoding="utf-8")
    (skills / "brainstorming").mkdir(parents=True)
    (skills / "brainstorming" / "SKILL.md").write_text("brainstorm\n", encoding="utf-8")
    (root / "apm.lock.yaml").write_text(APM_LOCK_BODY, encoding="utf-8")
    return skills


@pytest.fixture()
def mod(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> ModuleType:
    """Load the module with its path constants pointed at a fake repo."""
    skills = _make_fake_repo(tmp_path)
    module = _load_module()
    monkeypatch.setattr(module, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(module, "SKILLS_DIR", skills)
    monkeypatch.setattr(module, "MANIFEST_PATH", skills / ".superpowers-manifest.sha256")
    monkeypatch.setattr(module, "APM_LOCK", tmp_path / "apm.lock.yaml")
    return module


@pytest.mark.unit
def test_write_then_check_roundtrip(mod: ModuleType) -> None:
    assert mod.write() == 0
    assert mod.MANIFEST_PATH.exists()
    assert mod.MANIFEST_PATH.read_text(encoding="utf-8").startswith(f"# resolved_commit: {PINNED}")
    assert mod.check() == 0


@pytest.mark.unit
def test_check_detects_mutation(mod: ModuleType, capsys: pytest.CaptureFixture[str]) -> None:
    mod.write()
    (mod.SKILLS_DIR / "brainstorming" / "SKILL.md").write_text("TAMPERED\n", encoding="utf-8")
    assert mod.check() == 1
    out = capsys.readouterr().out
    assert "::error" in out
    assert "stale" in out
    assert "changed: brainstorming/SKILL.md" in out


@pytest.mark.unit
def test_check_detects_added_file(mod: ModuleType, capsys: pytest.CaptureFixture[str]) -> None:
    mod.write()
    (mod.SKILLS_DIR / "new-skill").mkdir()
    (mod.SKILLS_DIR / "new-skill" / "SKILL.md").write_text("new\n", encoding="utf-8")
    assert mod.check() == 1
    assert "added:   new-skill/SKILL.md" in capsys.readouterr().out


@pytest.mark.unit
def test_check_missing_manifest_returns_3(mod: ModuleType) -> None:
    assert mod.check() == 3


@pytest.mark.unit
def test_malformed_apm_lock_returns_2(mod: ModuleType) -> None:
    mod.APM_LOCK.write_text("dependencies: []\n", encoding="utf-8")
    assert mod.main(["--check"]) == 2


@pytest.mark.unit
def test_missing_apm_lock_returns_2(mod: ModuleType) -> None:
    mod.APM_LOCK.unlink()
    assert mod.main(["--check"]) == 2


@pytest.mark.unit
def test_manifest_excludes_itself(mod: ModuleType) -> None:
    mod.write()
    body = mod.MANIFEST_PATH.read_text(encoding="utf-8")
    assert ".superpowers-manifest.sha256" not in body
    # Regenerating after the manifest exists is idempotent.
    assert mod.check() == 0


def _run_hook(project_dir: Path) -> dict:
    result = subprocess.run(
        [BASH, str(HOOK)],
        env={"CLAUDE_PROJECT_DIR": str(project_dir), "PATH": os.environ.get("PATH", "")},
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


@pytest.mark.unit
def test_hook_clean_has_no_drift_warning(tmp_path: Path) -> None:
    _make_fake_repo(tmp_path)
    _link_script(tmp_path)
    subprocess.run(
        [sys.executable, str(tmp_path / "scripts" / "gen_superpowers_manifest.py")],
        check=True,
    )
    ctx = _run_hook(tmp_path)["hookSpecificOutput"]["additionalContext"]
    assert "You have superpowers" in ctx
    assert "DRIFTED" not in ctx
    assert "MISSING" not in ctx


@pytest.mark.unit
def test_hook_warns_on_drift(tmp_path: Path) -> None:
    skills = _make_fake_repo(tmp_path)
    _link_script(tmp_path)
    subprocess.run(
        [sys.executable, str(tmp_path / "scripts" / "gen_superpowers_manifest.py")],
        check=True,
    )
    (skills / "brainstorming" / "SKILL.md").write_text("TAMPERED\n", encoding="utf-8")
    ctx = _run_hook(tmp_path)["hookSpecificOutput"]["additionalContext"]
    assert "You have superpowers" in ctx
    assert "DRIFTED" in ctx
    assert "changed: brainstorming/SKILL.md" in ctx


@pytest.mark.unit
def test_hook_warns_on_missing_skills(tmp_path: Path) -> None:
    (tmp_path / ".claude" / "skills").mkdir(parents=True)
    _link_script(tmp_path)
    ctx = _run_hook(tmp_path)["hookSpecificOutput"]["additionalContext"]
    assert "MISSING" in ctx


def _link_script(root: Path) -> None:
    """Copy the real manifest script into the fake repo at the expected path."""
    scripts = root / "scripts"
    scripts.mkdir(exist_ok=True)
    (scripts / "gen_superpowers_manifest.py").write_text(SCRIPT.read_text(encoding="utf-8"), encoding="utf-8")
