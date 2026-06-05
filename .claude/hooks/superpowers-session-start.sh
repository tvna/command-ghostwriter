#!/usr/bin/env bash
# Repo-owned SessionStart hook for the superpowers skill collection.
#
# Purpose: inject the "using-superpowers" skill at session start so the agent
# knows, from its first turn, to discover and use the skills under
# .claude/skills/ via the Skill tool.
#
# Why this exists instead of the upstream superpowers hook: superpowers ships
# as a Claude Code *plugin* whose hook reads "${CLAUDE_PLUGIN_ROOT}/skills/..."
# and relies on CLAUDE_PLUGIN_ROOT being set. Here the skills are deployed by
# APM under .claude/skills/ and CLAUDE_PLUGIN_ROOT is not set, so we read the
# committed skill file directly and emit Claude Code's SessionStart format.
set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
skill="${root}/.claude/skills/using-superpowers/SKILL.md"

# If the skill is absent (superpowers not installed), inject nothing.
[ -f "${skill}" ] || exit 0

python3 - "${skill}" <<'PY'
import json
import sys

content = open(sys.argv[1], encoding="utf-8").read()
context = (
    "<EXTREMELY_IMPORTANT>\n"
    "You have superpowers.\n\n"
    "Below is the full content of your 'using-superpowers' skill - your "
    "introduction to using skills. For all other skills, use the Skill "
    "tool:\n\n"
    f"{content}\n"
    "</EXTREMELY_IMPORTANT>"
)
print(
    json.dumps(
        {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": context,
            }
        }
    )
)
PY
