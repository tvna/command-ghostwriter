#!/usr/bin/env bash
# CI-parity local gate. Refs #403 (recurring action from retrospectives #397, #401).
#
# Runs the CI BLOCKING checks that have actually caused PR repair churn, so the
# "local verification did not mirror CI" failure class cannot recur. It mirrors,
# in particular, two gates whose LOCAL form diverged from CI and let repairs through:
#   - lizard CCN: CI scans ALL languages (incl. web TypeScript); the existing
#     pre-commit `lizard_combined` hook is `-l python` only, so a TS CCN>10
#     (App.tsx, PR #399) was invisible locally. This runs CI's all-language command.
#   - web Vitest: there was NO local web gate at all; CI's whole-project
#     `npx vitest run` collected the Playwright e2e spec and failed (PR #399).
#
# Deliberately NOT run here (kept to CI): the full `pytest -n auto` suite and the
# desktop `npm run build`. They are slow / memory-heavy, are already enforced in CI
# (and pytest is already a pre-commit hook), and have not caused a repair. This keeps
# the gate fast and reliably runnable locally.
#
# Run manually: `bash scripts/ci-parity.sh`
# Runs automatically on `git push` once installed: `pre-commit install --hook-type pre-push`
set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

fail=0
run() {
  local label="$1"
  shift
  echo ""
  echo "=== ci-parity: ${label} ==="
  if "$@"; then
    echo "PASS: ${label}"
  else
    echo "FAIL: ${label}" >&2
    fail=1
  fi
}

if ! command -v uv >/dev/null 2>&1; then
  echo "ci-parity: required tool 'uv' not found (https://docs.astral.sh/uv/)" >&2
  exit 2
fi

# --- Python gates (mirror CI 'Guard Python code quality' + 'Code Complexity') ---
run "ruff check" uv run ruff check .
run "mypy (whole project)" uv run mypy .
# All-language lizard, matching CI (NO -l python). Extra excludes cover web build /
# vendored Pyodide dirs that exist locally but not in CI's lizard job, so the local
# scope matches CI's effective scope (production source only).
run "lizard CCN<=10 (all languages)" uv run lizard \
  -x './node_modules/*' -x './.venv/*' -x './build/*' -x './dist/*' \
  -x './htmlcov/*' -x './tests/*' \
  -x './web/node_modules/*' -x './web/dist/*' -x './web/public/*' \
  --CCN 10

# --- Web gates (mirror the web-ci Pyodide keystone job) ---
if [ -d web/node_modules ]; then
  run "web tsc" bash -c 'cd web && npx tsc -b --noEmit'
  run "web vitest (whole project)" bash -c 'cd web && npx vitest run'
else
  echo "" >&2
  echo "FAIL: web gates -- web/node_modules is missing. Run 'cd web && npm ci' first." >&2
  fail=1
fi

echo ""
if [ "${fail}" -ne 0 ]; then
  echo "ci-parity: FAILED -- fix the above before pushing (CI gates on these)." >&2
  exit 1
fi
echo "ci-parity: all gates passed."
