#!/usr/bin/env bash
# Repo-owned SessionStart hook for the Clairvoyance skill collection.
#
# Purpose: inject the "using-clairvoyance" bootstrap skill at session start so
# the agent knows, from its first turn, to route an agent-to-human handoff
# through the single matching Clairvoyance skill under .claude/skills/ via the
# Skill tool. It also resolves the project owner's native language and injects
# it as authoritative for Clairvoyance handoffs (aligns with CLAUDE.md section
# 6: operator-facing output in the owner's native language).
#
# Why this exists instead of the upstream Clairvoyance plugin hook: Clairvoyance
# ships as a Claude Code *plugin* whose hook reads
# "${CLAUDE_PLUGIN_ROOT}/skills/using-clairvoyance/SKILL.md" and relies on
# CLAUDE_PLUGIN_ROOT being set. Here the skills are deployed by APM under
# .claude/skills/ and CLAUDE_PLUGIN_ROOT is not set, so we read the committed
# skill file directly and emit Claude Code's SessionStart format. This mirrors
# superpowers-session-start.sh.
#
# Scope: this is the injection + owner-language variant. The upstream hook also
# counts the session toward the adaptive-coaching store (record-session) and a
# companion hook apt-get installs sqlite3 for that store; both are intentionally
# NOT included here, so this hook stays read-only -- it installs no packages and
# writes no local database. adaptive-coaching therefore does not auto-record
# sessions; add the store wiring later if that capability is wanted.
#
# Never let this hook abort startup: a missing skill file exits success quietly.
set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
skill="${root}/.claude/skills/using-clairvoyance/SKILL.md"
language_file="${root}/.clairvoyance/owner-language.txt"

# Nothing to inject if the bootstrap skill is missing: exit success, stay quiet.
[ -f "${skill}" ] || exit 0

# Resolve the owner's language: explicit env wins, else the first non-blank line
# of the committed language file, else empty (the injection then asks the human).
owner_language="${CLAIRVOYANCE_OWNER_LANGUAGE:-}"
if [ -z "${owner_language}" ] && [ -f "${language_file}" ]; then
  owner_language="$(sed -n '/[^[:space:]]/{s/^[[:space:]]*//;s/[[:space:]]*$//;p;q;}' "${language_file}")"
fi

# Build the injected context with python3 for a complete, correct JSON encode of
# the skill body (handles every control character a hand-rolled escaper misses).
# python3 is already required by the sibling superpowers hook in this repo.
CLV_SKILL_PATH="${skill}" \
CLV_OWNER_LANGUAGE="${owner_language}" \
CLV_LANGUAGE_FILE="${language_file}" \
python3 - <<'PY'
import json
import os

skill = open(os.environ["CLV_SKILL_PATH"], encoding="utf-8").read()
owner_language = os.environ.get("CLV_OWNER_LANGUAGE") or ""
language_file = os.environ.get("CLV_LANGUAGE_FILE") or ""

if owner_language:
    language_context = (
        f"Owner native language metadata is set to '{owner_language}'. This "
        "SessionStart injection is authoritative for Clairvoyance handoffs. Write "
        "operator-facing Clairvoyance output in this language unless a repository "
        "rule requires another language for outward-facing artifacts."
    )
else:
    language_context = (
        "Owner native language metadata is missing. Before any Clairvoyance "
        "handoff, use AskUserQuestion to ask the human for the primary project "
        "owner's native language (one focused, non-leading question with 2-3 "
        f"choices when obvious). After the human answers, write '{language_file}' "
        "with the language code or name, then write operator-facing Clairvoyance "
        "output in that language."
    )

context = (
    "<EXTREMELY_IMPORTANT>\n"
    "You have Clairvoyance.\n\n"
    f"{language_context}\n\n"
    "Below is the full content of your 'using-clairvoyance' bootstrap skill. For "
    "an agent-to-human handoff, use the Skill tool to load the single matching "
    "Clairvoyance skill named by the bootstrap skill before responding.\n\n"
    f"{skill}\n"
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
