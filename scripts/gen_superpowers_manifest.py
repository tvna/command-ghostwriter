#!/usr/bin/env python3
"""Generate and verify the integrity manifest for committed superpowers skills.

The superpowers skills under ``.claude/skills/`` are deployed by APM and
committed to the repository (see ``apm.lock.yaml`` ``deployed_files``, pinned to
an ``obra/superpowers`` commit). Because they are committed, a fresh clone always
has them present, but the committed copies can silently drift from the pinned
upstream commit (a local edit, or an apm.lock bump that was not redeployed).

This script renders a deterministic manifest of the skill files so that drift can
be detected by pre-commit, CI, and the SessionStart hook without needing ``apm``
or network access.

Modes:
    (default)   render the manifest and write it to the manifest path.
    --check     re-render and byte-compare against the committed manifest.

Exit codes:
    0   manifest matches (or was written successfully).
    1   --check: committed skills drifted from the manifest (stale).
    2   apm.lock.yaml is missing or malformed.
    3   --check: the manifest file itself is missing (baseline uninitialized).
"""

from __future__ import annotations

import argparse
import hashlib
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = REPO_ROOT / ".claude" / "skills"
MANIFEST_PATH = SKILLS_DIR / ".superpowers-manifest.sha256"
APM_LOCK = REPO_ROOT / "apm.lock.yaml"
MANIFEST_REL = ".claude/skills/.superpowers-manifest.sha256"

_COMMIT_RE = re.compile(r"^\s*resolved_commit:\s*([0-9a-f]{40})\s*$", re.MULTILINE)


class ApmLockError(Exception):
    """Raised when apm.lock.yaml is missing or does not pin a resolved_commit."""


def _resolved_commit() -> str:
    """Return the ``resolved_commit`` pinned in apm.lock.yaml.

    Raises:
        ApmLockError: if apm.lock.yaml is missing or has no resolved_commit.
    """
    try:
        text = APM_LOCK.read_text(encoding="utf-8")
    except OSError as exc:
        raise ApmLockError(f"cannot read {APM_LOCK.name}: {exc}") from exc
    match = _COMMIT_RE.search(text)
    if not match:
        raise ApmLockError(f"no resolved_commit in {APM_LOCK.name}")
    return match.group(1)


def _iter_skill_files() -> list[Path]:
    """Return all files under the skills dir except the manifest, path-sorted."""
    files = [path for path in SKILLS_DIR.rglob("*") if path.is_file() and path != MANIFEST_PATH]
    return sorted(files, key=lambda p: p.relative_to(SKILLS_DIR).as_posix())


def render() -> str:
    """Render the manifest text from the current skill files and apm.lock.

    Raises:
        ApmLockError: if the pinned commit cannot be read from apm.lock.yaml.
    """
    lines = [f"# resolved_commit: {_resolved_commit()}"]
    for path in _iter_skill_files():
        rel = path.relative_to(SKILLS_DIR).as_posix()
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        lines.append(f"{digest}  {rel}")
    return "\n".join(lines) + "\n"


def _entries(text: str) -> dict[str, str]:
    """Parse a manifest body into a {relpath: digest} mapping (skips header)."""
    out: dict[str, str] = {}
    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        digest, _, rel = line.partition("  ")
        out[rel] = digest
    return out


def _print_drift(current: str, rendered: str) -> None:
    """Print a per-file added/removed/changed summary to stdout."""
    cur = _entries(current)
    new = _entries(rendered)
    for rel in sorted(set(cur) | set(new)):
        if rel not in cur:
            print(f"  added:   {rel}")
        elif rel not in new:
            print(f"  removed: {rel}")
        elif cur[rel] != new[rel]:
            print(f"  changed: {rel}")


def write() -> int:
    """Render and write the manifest. Returns 0."""
    MANIFEST_PATH.write_text(render(), encoding="utf-8")
    return 0


def check() -> int:
    """Compare the rendered manifest to the committed one. See module exit codes."""
    rendered = render()
    try:
        current = MANIFEST_PATH.read_text(encoding="utf-8")
    except OSError:
        print(f"::error file={MANIFEST_REL}::missing; run uv run python scripts/gen_superpowers_manifest.py")
        return 3
    if current != rendered:
        print(f"::error file={MANIFEST_REL}::stale; run uv run python scripts/gen_superpowers_manifest.py")
        _print_drift(current, rendered)
        return 1
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if the manifest is missing or stale instead of writing it.",
    )
    args = parser.parse_args(argv)
    try:
        return check() if args.check else write()
    except ApmLockError as exc:
        print(f"::error file=apm.lock.yaml::{exc}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
