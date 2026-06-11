#!/usr/bin/env bash
# Repo-owned SessionStart hook for the superpowers skill collection.
#
# Purpose: inject the "using-superpowers" skill at session start so the agent
# knows, from its first turn, to discover and use the skills under
# .claude/skills/ via the Skill tool. Additionally verify the committed skills
# against their integrity manifest and warn loudly if they are drifted or
# missing, so a stale or partial checkout is never used silently.
#
# Why this exists instead of the upstream superpowers hook: superpowers ships
# as a Claude Code *plugin* whose hook reads "${CLAUDE_PLUGIN_ROOT}/skills/..."
# and relies on CLAUDE_PLUGIN_ROOT being set. Here the skills are deployed by
# APM under .claude/skills/ and CLAUDE_PLUGIN_ROOT is not set, so we read the
# committed skill file directly and emit Claude Code's SessionStart format.
set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
skill="${root}/.claude/skills/using-superpowers/SKILL.md"
manifest_script="${root}/scripts/gen_superpowers_manifest.py"

skills_present=0
check_rc=0
check_out=""
if [ -f "${skill}" ]; then
  skills_present=1
  # Verify committed skills against the integrity manifest. The checker is
  # stdlib-only, so invoke python3 directly (no uv resolution at startup).
  # Never let a checker failure abort the hook: warn, do not block startup.
  if [ -f "${manifest_script}" ]; then
    set +e
    check_out="$(python3 "${manifest_script}" --check 2>&1)"
    check_rc=$?
    set -e
  fi
fi

SP_SKILLS_PRESENT="${skills_present}" \
SP_CHECK_RC="${check_rc}" \
SP_CHECK_OUT="${check_out}" \
python3 - "${skill}" <<'PY'
import json
import os
import sys

present = os.environ.get("SP_SKILLS_PRESENT") == "1"
rc = int(os.environ.get("SP_CHECK_RC") or "0")
out = os.environ.get("SP_CHECK_OUT") or ""

parts = []

if present:
    content = open(sys.argv[1], encoding="utf-8").read()
    parts.append(
        "<EXTREMELY_IMPORTANT>\n"
        "You have superpowers.\n\n"
        "Below is the full content of your 'using-superpowers' skill - your "
        "introduction to using skills. For all other skills, use the Skill "
        "tool:\n\n"
        f"{content}\n"
        "</EXTREMELY_IMPORTANT>"
    )
    if rc == 1:
        parts.append(
            "<EXTREMELY_IMPORTANT>\n"
            "WARNING: the committed superpowers skills under .claude/skills/ have "
            "DRIFTED from their integrity manifest. They may be stale or locally "
            "modified and must not be trusted until reconciled. Run "
            "`uv run python scripts/gen_superpowers_manifest.py --check` to inspect "
            "the drift, and `apm install` to redeploy from the pinned commit.\n\n"
            f"{out}\n"
            "</EXTREMELY_IMPORTANT>"
        )
    elif rc == 3:
        parts.append(
            "<IMPORTANT>\n"
            "NOTE: the superpowers integrity manifest "
            "(.claude/skills/.superpowers-manifest.sha256) is missing, so drift "
            "cannot be verified. Initialize it with "
            "`uv run python scripts/gen_superpowers_manifest.py`.\n"
            "</IMPORTANT>"
        )
    elif rc == 2:
        parts.append(
            "<IMPORTANT>\n"
            "NOTE: could not verify superpowers integrity because apm.lock.yaml is "
            "missing or malformed.\n"
            "</IMPORTANT>"
        )
else:
    parts.append(
        "<EXTREMELY_IMPORTANT>\n"
        "WARNING: the superpowers skills under .claude/skills/ are MISSING from "
        "this checkout, so the using-superpowers skill could not be loaded. This is "
        "an abnormal state for this repository (the skills are committed). Restore "
        "them with `apm install`, or verify the checkout is complete.\n"
        "</EXTREMELY_IMPORTANT>"
    )

print(
    json.dumps(
        {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": "\n\n".join(parts),
            }
        }
    )
)
PY
