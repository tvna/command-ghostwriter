# Retire Streamlit Implementation - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every implementation that depends solely on Streamlit (the `app.py` UI, the stlite+Electron desktop build, Streamlit-only security tooling, the old Streamlit e2e suite, the `streamlit`/`pytest-playwright` deps, and the related CI jobs), and rewrite the README for the Vercel/Pyodide UI - while keeping `main` green.

**Architecture:** This is a deletion/refactor task, not feature work. There are no new failing tests to write; each task's verification is (a) the surviving Python suite `uv run pytest -k 'not e2e'` stays green, (b) `ruff`/`mypy`/`vulture`/`yamllint` stay green, and (c) a full-text grep proves zero residual references to the removed surface. `features/**` and `assets/{examples,icons}` are SHARED with the web app (imported at build time by `web/src/worker/features-sources.ts`, `web/src/lib/{templates,data}.ts`) and MUST NOT be touched. `web/**` is not touched at all.

**Tech Stack:** Python 3.11+ (uv-managed), pytest, ruff, mypy, vulture, Pyre; GitHub Actions YAML; npm/package.json.

**Issue:** #450 (sub-issue of #395, Phase P3). Cite `#450` in every commit.

**Spec:** `docs/superpowers/specs/2026-06-30-retire-streamlit-impl-design.md`

---

## File Structure

Files to DELETE:
- `app.py`, `i18n.py`, `.streamlit/config.toml` (and the now-empty `.streamlit/` dir)
- `tests/unit/test_app.py`, `tests/test_app_integration.py`, `tests/unit/test_i18n.py`
- `tests/e2e/test_e2e.py`, `tests/e2e/helpers.py`, `tests/e2e/conftest.py`, `tests/e2e/__init__.py` (whole `tests/e2e/`)
- `taint/streamlit_app.pysa`, `taint/taint.config` (whole `taint/`)
- `.zap/rules.tsv` (whole `.zap/`)
- `.github/actions/build-stlite/action.yml` (whole dir)
- `.github/actions/test-python-playwright/action.yml` (whole dir)

Files to MODIFY:
- `pyproject.toml` (remove `streamlit`, `pytest-playwright`, vulture `app.py` path)
- `uv.lock` (regenerated)
- `.pyre_configuration` (remove `taint_models_path`)
- `package.json` (remove stlite/electron/build, prune scripts + devDeps)
- `.github/workflows/reusable-test-and-build.yml` (remove `test-e2e`, `zap_scan`, `build-desktop` jobs; remove `Show AST (app.py)` step; remove `--cov=app.py`/`--cov=i18n.py`; fix `workflow-summary` `needs`)
- `.github/workflows/test-and-build-on-merged.yml` (remove `test-e2e-benchmark` job; strip desktop-zip download + attachment from `create-tag-and-release`)
- `README.md` (rewrite Streamlit-specific badges/clone/run/port notes for the Vercel/Pyodide UI)

DO NOT TOUCH: `features/**`, `assets/**`, `web/**`, `tests/conftest.py`, `tests/unit/test_core.py`, `tests/unit/test_config_parser.py`, `tests/unit/test_document_render.py`, `tests/unit/test_transcoder.py`, and other non-Streamlit tests.

---

## Task 1: Remove the Streamlit app and its tests

**Files:**
- Delete: `app.py`, `i18n.py`, `.streamlit/config.toml`
- Delete: `tests/unit/test_app.py`, `tests/test_app_integration.py`, `tests/unit/test_i18n.py`
- Delete: `tests/e2e/test_e2e.py`, `tests/e2e/helpers.py`, `tests/e2e/conftest.py`, `tests/e2e/__init__.py`
- Modify: `pyproject.toml` (`[tool.vulture]` paths; `[tool.ruff]` per-file-ignores for `tests/e2e/conftest.py`)

- [ ] **Step 1: Delete the app, i18n, Streamlit config, and Streamlit tests**

```bash
cd /home/user/command-ghostwriter
git rm app.py i18n.py .streamlit/config.toml
git rm tests/unit/test_app.py tests/test_app_integration.py tests/unit/test_i18n.py
git rm -r tests/e2e
rmdir .streamlit 2>/dev/null || true
```

Expected: git stages the deletions; `.streamlit/` and `tests/e2e/` directories disappear.

- [ ] **Step 2: Remove the `app.py` entry from `[tool.vulture]` paths in `pyproject.toml`**

In `pyproject.toml`, the `[tool.vulture]` block currently reads:

```toml
[tool.vulture]
paths = [
  "app.py",
  "features",
  "tests",
  "tests/e2e",
  "tests/unit",
]
```

Replace it with (drop `"app.py"` and the now-deleted `"tests/e2e"` path):

```toml
[tool.vulture]
paths = [
  "features",
  "tests",
  "tests/unit",
]
```

- [ ] **Step 3: Remove the dangling `tests/e2e/conftest.py` ruff per-file-ignore in `pyproject.toml`**

In `pyproject.toml` delete these three lines (the file no longer exists):

```toml
lint.per-file-ignores."tests/e2e/conftest.py" = [
  "S404",
]
```

- [ ] **Step 4: Verify the surviving Python suite is green**

Run: `uv run pytest -k 'not e2e'`
Expected: PASS, with no errors about missing `app`/`i18n` imports. (The features unit tests and script tests run; no Streamlit collection.)

- [ ] **Step 5: Verify lint, types, vulture**

Run: `uv run ruff check . && uv run mypy . && uv run vulture`
Expected: all PASS. No "unable to import 'app'/'i18n'" and no vulture path error for the removed entries.

- [ ] **Step 6: Verify no residual references to the deleted Python modules**

Run:
```bash
grep -rn --include='*.py' -E '\b(import app|from app|import i18n|from i18n)\b' . | grep -v node_modules || echo "CLEAN"
```
Expected: `CLEAN` (no Python still imports `app` or `i18n`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove Streamlit app, i18n, and Streamlit tests (#450)"
```

---

## Task 2: Drop the `streamlit` and `pytest-playwright` dependencies

**Files:**
- Modify: `pyproject.toml`
- Modify: `uv.lock` (regenerated by `uv lock`)

- [ ] **Step 1: Remove `streamlit` from `[project].dependencies` in `pyproject.toml`**

Delete this line from the `dependencies` array:

```toml
  "streamlit>=1.47,<2",
```

- [ ] **Step 2: Remove `pytest-playwright` from `[dependency-groups].dev` in `pyproject.toml`**

Delete this line from the `dev` array (it existed only for the old Streamlit e2e suite, now deleted):

```toml
  "pytest-playwright>=0.7,<0.8",
```

- [ ] **Step 3: Regenerate the lockfile**

Run: `uv lock`
Expected: `uv.lock` updates; `streamlit`, `pytest-playwright`, and their now-orphaned transitive deps (e.g. `altair`, `pydeck`, `playwright`) are removed.

- [ ] **Step 4: Sync and re-verify the suite**

Run: `uv sync && uv run pytest -k 'not e2e'`
Expected: PASS. (No test imported `streamlit` or `pytest-playwright` after Task 1.)

- [ ] **Step 5: Verify no residual `streamlit` references in Python/config**

Run:
```bash
grep -rn -E 'streamlit|pytest-playwright|pytest_playwright' pyproject.toml features tests scripts 2>/dev/null || echo "CLEAN"
```
Expected: `CLEAN`.

- [ ] **Step 6: Commit**

```bash
git add pyproject.toml uv.lock
git commit -m "build: drop streamlit and pytest-playwright deps (#450)"
```

---

## Task 3: Remove Streamlit-only security tooling

**Files:**
- Delete: `taint/streamlit_app.pysa`, `taint/taint.config` (whole `taint/`)
- Delete: `.zap/rules.tsv` (whole `.zap/`)
- Modify: `.pyre_configuration`

- [ ] **Step 1: Delete the Pysa taint models and ZAP rules**

```bash
git rm -r taint .zap
```

Expected: both directories removed (their only contents target Streamlit `st.*` sources/sinks and the 8501 Streamlit server).

- [ ] **Step 2: Remove `taint_models_path` from `.pyre_configuration`**

In `.pyre_configuration` delete this line (the `taint/` dir it points at is gone; keep Pyre type-checking otherwise intact):

```json
  "taint_models_path": "taint",
```

Leave `source_directories` as `[".", "features"]` - `app.py`/`i18n.py` are already gone, so `.` no longer pulls them in.

- [ ] **Step 3: Verify `.pyre_configuration` is valid JSON**

Run: `python -c "import json; json.load(open('.pyre_configuration')); print('OK')"`
Expected: `OK`.

- [ ] **Step 4: Verify no residual taint/zap references**

Run:
```bash
grep -rn -E 'taint_models_path|streamlit_app\.pysa|\.zap/|taint/taint\.config' . --include='*.json' --include='*.yml' --include='*.yaml' --include='*.toml' | grep -v node_modules || echo "CLEAN"
```
Expected: `CLEAN` except possibly the workflow `zap_scan` job, which is removed in Task 5. (If a workflow line matches here, it is handled in Task 5 - do not edit workflows in this task.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove Streamlit-only Pysa taint models and ZAP rules (#450)"
```

---

## Task 4: Remove the stlite + Electron desktop build

**Files:**
- Delete: `.github/actions/build-stlite/action.yml` (whole dir)
- Modify: `package.json`

- [ ] **Step 1: Delete the build-stlite composite action**

```bash
git rm -r .github/actions/build-stlite
```

- [ ] **Step 2: Rewrite `package.json` without the stlite/electron/desktop surface**

Replace the entire `package.json` with the following. This drops the `main` electron entry, the `build` (electron-builder) block, the `stlite` block, the electron/stlite scripts (`dump`, `serve`, `pack`, `dist`, `postinstall`, `zap`) and the now-dead `e2e` script (old Streamlit pytest e2e), and the electron/stlite devDeps (`@stlite/desktop`, `cross-env`, `electron`, `electron-builder`, `rimraf`). It KEEPS the repo-wide commit/lint tooling and the Python wrapper scripts:

```json
{
    "name": "command_ghostwriter",
    "version": "0.4.4",
    "description": "This application is designed for infrastratcture engineers who want to automatically generate commands in template to configure servers, routers, and switches",
    "license": "MIT",
    "author": {
        "name": "Nagano, Tsubasa",
        "email": "tsubasa.nagano@icloud.com"
    },
    "scripts": {
        "lint": "uv run ruff check . --fix && uv run mypy .",
        "test": "uv run pytest -vv -n auto --cov=. --cov-report=html --cov-report=xml --cov-report=term --dist loadfile --durations=10 -k 'not e2e' --benchmark-disable",
        "ccn": "uv run lizard -l python --CCN '10'",
        "scan": "pre-commit run --all-files",
        "commit": "pre-commit run"
    },
    "devDependencies": {
        "@commitlint/cli": "^19.8.1",
        "@commitlint/config-conventional": "^19.8.1",
        "husky": "^9.1.7",
        "lint-staged": "^16.1.2",
        "prettier": "^3.6.2",
        "prettier-plugin-sort-json": "^4.1.1"
    },
    "hooks": {
        "pre-commit": "lint-staged"
    },
    "overrides": {
        "tmp": "^0.2.6"
    }
}
```

- [ ] **Step 3: Verify `package.json` is valid JSON**

Run: `python -c "import json; json.load(open('package.json')); print('OK')"`
Expected: `OK`.

- [ ] **Step 4: Check for a lint-staged config that references removed files**

Run:
```bash
grep -rn -E 'app\.py|stlite|electron' package.json .lintstagedrc* .husky 2>/dev/null || echo "CLEAN"
```
Expected: `CLEAN`. (If a `.lintstagedrc` or husky hook references `app.py`, remove that reference; the project's lint-staged config lives in `package.json` here, already handled.)

- [ ] **Step 5: Verify no residual stlite/electron references**

Run:
```bash
grep -rn -E 'stlite|electron|build-stlite|dump-stlite' . --include='*.json' --include='*.yml' --include='*.yaml' | grep -vE 'node_modules|package-lock\.json' || echo "CLEAN"
```
Expected: only matches inside the CI workflows (handled in Task 5) or `CLEAN`. Do not edit workflows here.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "build: remove stlite + Electron desktop packaging (#450)"
```

---

## Task 5: Remove the Streamlit/desktop CI jobs

**Files:**
- Delete: `.github/actions/test-python-playwright/action.yml` (whole dir)
- Modify: `.github/workflows/reusable-test-and-build.yml`
- Modify: `.github/workflows/test-and-build-on-merged.yml`

Anchor by job/step `name:` (line numbers are from the current tip and may drift after edits).

- [ ] **Step 1: Delete the test-python-playwright composite action (old Streamlit e2e)**

```bash
git rm -r .github/actions/test-python-playwright
```

- [ ] **Step 2: In `reusable-test-and-build.yml`, remove the `--cov=app.py` and `--cov=i18n.py` lines**

In the `Run pytest (coverage without e2e)` step the `cmd_array` currently contains:

```yaml
            --cov=app.py
            --cov=features
            --cov=i18n.py
```

Delete the `--cov=app.py` and `--cov=i18n.py` lines, leaving:

```yaml
            --cov=features
```

- [ ] **Step 3: In `reusable-test-and-build.yml`, delete the `Show AST (app.py)` step**

Delete this whole step (keep the adjacent `Show AST (features/*.py)` step):

```yaml
      - name: Show AST (app.py)
        run: |
          python <<EOF
          import ast
          print(ast.dump(ast.parse(open("app.py").read()), indent=2))
          EOF
```

- [ ] **Step 4: In `reusable-test-and-build.yml`, delete the entire `test-e2e:` job**

Delete the job that starts at `  test-e2e:` / `name: E2E Tests (...)` through the end of its `Run E2E Tests (Playwright)` step (it `uses: ./.github/actions/test-python-playwright`), up to the next job key `  zap_scan:`.

- [ ] **Step 5: In `reusable-test-and-build.yml`, delete the entire `zap_scan:` job**

Delete the job `  zap_scan:` / `name: Scan HTTP by ZAP (DAST Tool)` (it runs `uv run streamlit run app.py &`, targets `http://localhost:8501`, and uses `.zap/rules.tsv`) through its last step, up to the next job key.

- [ ] **Step 6: In `reusable-test-and-build.yml`, delete the entire `build-desktop:` job**

Delete the job `  build-desktop:` / `name: Build desktop app (...)` (it `uses: ./.github/actions/build-stlite`) through its last step, up to the `# WORKFLOW SUMMARY` comment / `  workflow-summary:` job.

- [ ] **Step 7: In `reusable-test-and-build.yml`, fix the `workflow-summary` `needs` list**

The `workflow-summary` job currently has:

```yaml
    needs:
      - build-desktop
      - test-coverage
      - test-e2e
      - analysis-code-ccn
      - zap_scan
```

Replace with (drop the three removed jobs):

```yaml
    needs:
      - test-coverage
      - analysis-code-ccn
```

Then scan the rest of the `workflow-summary` job body for any `needs.build-desktop`, `needs.test-e2e`, or `needs.zap_scan` references (e.g. in a result-aggregation `if:`/script step) and remove those branches so the summary does not gate on jobs that no longer exist.

- [ ] **Step 8: In `test-and-build-on-merged.yml`, delete the entire `test-e2e-benchmark:` job**

Delete the job `  test-e2e-benchmark:` / `name: E2E Benchmark (...)` (it `uses: ./.github/actions/test-python-playwright`) through its last step, up to the next job key `  scorecards:`.

- [ ] **Step 9: In `test-and-build-on-merged.yml`, strip the desktop artifacts from `create-tag-and-release`**

In the `create-tag-and-release` job delete these three steps:

```yaml
      - name: Download macOS build artifact
        uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: desktop-app-macOS.zip

      - name: Download Windows build artifact
        uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
        with:
          name: desktop-app-Windows.zip

      - name: List downloaded files # For debugging
        run: ls -R
```

(The exact `download-artifact` steps include trailing comment lines like `# path: artifacts/macos`; delete those comment lines too.)

Then in the `Create Release with Artifacts` step, remove the desktop-zip attachment so the release becomes a tag release with generated notes. Change:

```yaml
        with:
          tag_name: ${{ steps.set_tag_output.outputs.tag_name }}
          generate_release_notes: true
          target_commitish: ${{ steps.get_commit_sha.outputs.sha }}
          files: |
            desktop-app-macOS.zip
            desktop-app-Windows.zip
          draft: false
          prerelease: false
          fail_on_unmatched_files: true # Ensure artifacts were downloaded
```

to:

```yaml
        with:
          tag_name: ${{ steps.set_tag_output.outputs.tag_name }}
          generate_release_notes: true
          target_commitish: ${{ steps.get_commit_sha.outputs.sha }}
          draft: false
          prerelease: false
```

(Removing `files:` and `fail_on_unmatched_files:` - with no artifacts, `fail_on_unmatched_files: true` would fail the release. Optionally rename the step `Create Release with Artifacts` -> `Create Release`.)

- [ ] **Step 10: Validate workflow YAML syntax**

Run:
```bash
uv run yamllint .github/workflows/reusable-test-and-build.yml .github/workflows/test-and-build-on-merged.yml
```
Expected: no errors (warnings per the repo's `.yamllint.yml` are acceptable if they pre-existed).

- [ ] **Step 11: Verify no residual references to removed jobs/actions/targets**

Run:
```bash
grep -rn -E 'build-stlite|test-python-playwright|build-desktop|zap_scan|test-e2e\b|streamlit run|localhost:8501|app\.py|i18n\.py|desktop-app-' .github/ || echo "CLEAN"
```
Expected: `CLEAN`. (`test-e2e-benchmark` is gone; `test-e2e` references gone; no action `uses:` points at the deleted composite actions.)

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "ci: remove Streamlit e2e, ZAP, and desktop build jobs (#450)"
```

---

## Task 6: Rewrite the README for the Vercel/Pyodide UI

**Files:**
- Modify: `README.md`

Current Streamlit-specific lines (anchors): `[![streamlit][streamlit-img]](...)` badge (line ~3), `git clone https://github.com/tvna/streamlit-command-ghostwriter.git` (line ~42), `cd $env:PROGRAMDATA\streamlit-command-ghostwriter` + `uv run streamlit run app.py` (lines ~54-55), the devcontainer note "Streamlit アプリは自動起動しません... ポート 8502" (line ~272), and the badge link definitions (lines ~274-281).

- [ ] **Step 1: Read the full README to see every Streamlit reference in context**

Run: `grep -n -iE 'streamlit|app\.py|8501|8502|desktop|stlite|electron|dmg' README.md`
Then read those regions.

- [ ] **Step 2: Replace the run/quick-start instructions**

Replace any `uv run streamlit run app.py` quick-start (and the Windows `cd $env:PROGRAMDATA\streamlit-command-ghostwriter` block) with the new browser-app reality. The live app is a static Vercel site (`https://command-ghostwriter.vercel.app/`), and local dev for the UI is:

```bash
cd web
npm install
npm run dev   # Vite dev server
```

Keep the Python-core dev instructions (`uv sync`, `uv run pytest -k 'not e2e'`) for `features/`.

- [ ] **Step 3: Replace the Streamlit badges and the broken clone URL**

- Remove the `[![streamlit][streamlit-img]](https://streamlit.io/)` badge and its `streamlit-cloud` badge/link if present.
- Fix the clone URL `https://github.com/tvna/streamlit-command-ghostwriter.git` -> `https://github.com/tvna/command-ghostwriter.git` (the repo is `command-ghostwriter`).
- Remove the now-dead link reference definitions at the bottom: `[streamlit-img]: ...`, `[streamlit-cloud-img]: ...`, `[streamlit-cloud-link]: ...`, and fix `[license-link]: https://github.com/tvna/streamlit-command-ghostwriter/blob/main/LICENSE` -> `.../tvna/command-ghostwriter/blob/main/LICENSE`.

- [ ] **Step 4: Replace the devcontainer Streamlit note**

Replace the note "Streamlit アプリは自動起動しません。コンテナ内で `uv run streamlit run app.py` を実行し、フォワードされたポート 8502 で確認してください。" with a note pointing at the web dev server (`cd web && npm run dev`, default Vite port 5173) instead of Streamlit/8502.

- [ ] **Step 5: Verify no Streamlit/desktop references remain in the README**

Run:
```bash
grep -n -iE 'streamlit|app\.py|8501|8502|stlite|electron| dmg|streamlit-command-ghostwriter' README.md || echo "CLEAN"
```
Expected: `CLEAN`.

- [ ] **Step 6: Verify README links are not obviously broken (manual scan)**

Re-read the changed sections; confirm every `[...]: url` reference used in the body still has a definition, and no definition points at the old `streamlit-command-ghostwriter` slug.

- [ ] **Step 7: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for the Vercel/Pyodide UI (#450)"
```

---

## Final verification (after all tasks)

- [ ] **Step 1: Full surviving Python suite**

Run: `uv run pytest -k 'not e2e'`
Expected: PASS.

- [ ] **Step 2: Lint / types / dead-code / YAML**

Run: `uv run ruff check . && uv run mypy . && uv run vulture && uv run yamllint .github/workflows/`
Expected: all PASS.

- [ ] **Step 3: Global residual-reference sweep (excluding legitimate shared surfaces)**

Run:
```bash
grep -rn -iE 'streamlit|stlite|\bapp\.py\b|\bi18n\.py\b' . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=web \
  --exclude-dir=docs --exclude='package-lock.json' --exclude='uv.lock' || echo "CLEAN"
```
Expected: `CLEAN`. (Matches under `docs/` are historical specs/plans/retros that intentionally record the migration narrative and are out of scope; `web/` has its own `i18n.ts`. If anything else matches, it is a missed reference - fix it.)

- [ ] **Step 4: Confirm shared surfaces are untouched**

Run: `git diff --name-only origin/main...HEAD | grep -E '^(features/|assets/|web/)' || echo "SHARED UNTOUCHED"`
Expected: `SHARED UNTOUCHED` (the diff touches none of `features/`, `assets/`, `web/`).

- [ ] **Step 5: Push**

Run: `git push -u origin claude/retire-streamlit-impl-ird4cm`
Expected: branch pushed. (Do NOT open a PR unless the owner explicitly asks.)

---

## Verification caveats (standards: state what cannot be verified)

- **Runnable locally (evidence):** `pytest -k 'not e2e'`, `ruff`, `mypy`, `vulture`, `yamllint`, grep sweeps.
- **NOT runnable locally (mark unverified):** real GitHub Actions job execution (`act` is not installed). CI changes are static-validated with `yamllint` only; their runtime correctness is proven by this branch's CI run, not locally. Do not substitute indirect signals for execution proof.
- **No impact:** `web/**` is not modified by any task.
