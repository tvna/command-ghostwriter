#!/usr/bin/env bash
# Repo-owned SessionStart hook: ensure commits carry a verified identity.
#
# The remote Claude Code environment clones the repo fresh per session with no
# committer identity configured, so the first commit is flagged Unverified
# (committer email != noreply@anthropic.com). Configure the identity here, at
# session start, before any commit can be made. See retrospective #371 / #373.
#
# Idempotent: sets repo-local git config on every session-start event.
set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# Only act inside a git work tree; do nothing (success) otherwise.
git -C "${root}" rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

git -C "${root}" config user.email "noreply@anthropic.com"
git -C "${root}" config user.name "Claude"

exit 0
