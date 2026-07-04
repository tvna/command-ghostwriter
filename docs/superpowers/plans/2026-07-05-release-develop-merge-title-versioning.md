# Release Develop Merge Title Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the scheduled Release workflow run at 06:00 JST and derive semantic-release version bumps from release-worthy merge titles on `develop` while publishing from `main`.

**Architecture:** Keep semantic-release as the release engine on `main`. Add a focused Node script that inspects `origin/develop`, skips source commits already recorded in the latest tagged release history, creates local synthetic Conventional Commit inputs on top of the checked-out `main`, and lets the existing semantic-release plugins compute and publish the release.

**Tech Stack:** GitHub Actions YAML, Node.js ESM scripts using `node:child_process`, Python pytest workflow tests, existing semantic-release configuration.

---

## File Map

- Create: `scripts/prepare_release_commits.mjs`
  - Finds the latest release tag, extracts eligible `develop` titles, skips already released source SHAs, and creates local synthetic release-signal commits.
- Modify: `tests/workflow/test_release_management.py`
  - Adds workflow assertions and temporary git repository tests for the script.
- Modify: `.github/workflows/release.yml`
  - Changes the schedule to 06:00 JST and invokes the preparation script before semantic-release.
- Modify: `docs/versioning.md`
  - Documents the new source of release signals.

## Task 1: Workflow Contract Tests

**Files:**

- Modify: `tests/workflow/test_release_management.py`

- [ ] **Step 1: Write the failing workflow test updates**

Update `test_release_workflow_runs_on_schedule_and_manual_dispatch_only`:

```python
def test_release_workflow_runs_on_schedule_and_manual_dispatch_only() -> None:
    workflow = load_workflow()

    assert workflow["name"] == "Release"
    assert set(workflow[True]) == {"schedule", "workflow_dispatch"}
    assert workflow[True]["schedule"] == [{"cron": "0 21 * * *"}]
    assert "push" not in workflow[True]
    assert "pull_request" not in workflow[True]
```

Add a new test after the baseline-tag test:

```python
def test_release_workflow_prepares_develop_merge_title_commits() -> None:
    workflow = load_workflow()
    steps = workflow["jobs"]["release"]["steps"]

    prepare = next(step for step in steps if step["name"] == "Prepare release commits from develop")
    assert "git fetch origin develop:refs/remotes/origin/develop --tags" in prepare["run"]
    assert "node scripts/prepare_release_commits.mjs origin/develop" in prepare["run"]

    run_release_index = next(index for index, step in enumerate(steps) if step["name"] == "Run semantic-release")
    prepare_index = steps.index(prepare)
    assert prepare_index < run_release_index
```

- [ ] **Step 2: Run the workflow tests to verify they fail**

Run:

```bash
uv run pytest tests/workflow/test_release_management.py::test_release_workflow_runs_on_schedule_and_manual_dispatch_only tests/workflow/test_release_management.py::test_release_workflow_prepares_develop_merge_title_commits -v
```

Expected: FAIL. The cron is still `17 1 * * 1`, and the preparation step does not exist.

- [ ] **Step 3: Commit is deferred**

Do not commit yet. Task 1 is red-only and should be made green by Task 3.

## Task 2: Release Preparation Script Tests

**Files:**

- Modify: `tests/workflow/test_release_management.py`
- Create: `scripts/prepare_release_commits.mjs`

- [ ] **Step 1: Add test helpers**

Add these imports near the top:

```python
import os
```

Add helper functions after `load_release_config`:

```python
def run_git(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=repo,
        check=True,
        capture_output=True,
        text=True,
    )


def commit_file(repo: Path, filename: str, content: str, message: str) -> None:
    target = repo / filename
    target.write_text(content, encoding="utf-8")
    run_git(repo, "add", filename)
    run_git(repo, "commit", "-m", message)


def init_release_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir()
    run_git(repo, "init", "-b", "main")
    run_git(repo, "config", "user.email", "release-test@example.com")
    run_git(repo, "config", "user.name", "Release Test")
    commit_file(repo, "README.md", "baseline\n", "chore: baseline")
    run_git(repo, "tag", "v0.4.4")
    run_git(repo, "checkout", "-b", "develop")
    return repo


def create_merge_commit(repo: Path, branch: str, filename: str, message: str) -> None:
    run_git(repo, "checkout", "-b", branch, "main")
    commit_file(repo, filename, f"{message}\n", message)
    run_git(repo, "checkout", "develop")
    run_git(repo, "merge", "--no-ff", branch, "-m", message)
```

- [ ] **Step 2: Add script behavior tests**

Add these tests before `test_apply_version_updates_package_json_and_lockfile`:

```python
def test_prepare_release_commits_creates_conventional_inputs_from_develop_merges(tmp_path: Path) -> None:
    node = shutil.which("node")
    assert node is not None
    repo = init_release_repo(tmp_path)
    create_merge_commit(repo, "feature-one", "feature.txt", "feat: add generated command preview")
    create_merge_commit(repo, "bugfix-one", "bugfix.txt", "fix: preserve uploaded csv values")
    main_head = run_git(repo, "rev-parse", "main").stdout.strip()
    run_git(repo, "checkout", "main")

    result = subprocess.run(
        [node, str(ROOT / "scripts" / "prepare_release_commits.mjs"), "develop"],
        check=False,
        cwd=repo,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    subjects = run_git(repo, "log", "--format=%s", f"{main_head}..HEAD").stdout.splitlines()
    assert subjects == [
        "fix: preserve uploaded csv values",
        "feat: add generated command preview",
    ]
    assert "accepted 2 release title(s)" in result.stdout


def test_prepare_release_commits_ignores_non_release_titles(tmp_path: Path) -> None:
    node = shutil.which("node")
    assert node is not None
    repo = init_release_repo(tmp_path)
    create_merge_commit(repo, "docs-only", "docs.txt", "docs: clarify release setup")
    main_head = run_git(repo, "rev-parse", "main").stdout.strip()
    run_git(repo, "checkout", "main")

    result = subprocess.run(
        [node, str(ROOT / "scripts" / "prepare_release_commits.mjs"), "develop"],
        check=False,
        cwd=repo,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert run_git(repo, "rev-parse", "HEAD").stdout.strip() == main_head
    assert "accepted 0 release title(s)" in result.stdout


def test_prepare_release_commits_fails_when_develop_ref_is_missing(tmp_path: Path) -> None:
    node = shutil.which("node")
    assert node is not None
    repo = init_release_repo(tmp_path)
    run_git(repo, "checkout", "main")

    result = subprocess.run(
        [node, str(ROOT / "scripts" / "prepare_release_commits.mjs"), "origin/develop"],
        check=False,
        cwd=repo,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 1
    assert "develop ref not found: origin/develop" in result.stderr
```

- [ ] **Step 3: Run the script tests to verify they fail**

Run:

```bash
uv run pytest tests/workflow/test_release_management.py::test_prepare_release_commits_creates_conventional_inputs_from_develop_merges tests/workflow/test_release_management.py::test_prepare_release_commits_ignores_non_release_titles tests/workflow/test_release_management.py::test_prepare_release_commits_fails_when_develop_ref_is_missing -v
```

Expected: FAIL because `scripts/prepare_release_commits.mjs` does not exist.

- [ ] **Step 4: Commit is deferred**

Do not commit yet. Task 2 is red-only and should be made green by Task 3.

## Task 3: Implement Release Preparation

**Files:**

- Create: `scripts/prepare_release_commits.mjs`
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Create the Node script**

Create `scripts/prepare_release_commits.mjs`:

```javascript
import { execFileSync } from "node:child_process";

const developRef = process.argv[2] ?? "origin/develop";

function git(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", options.stderr ?? "pipe"],
  }).trim();
}

function gitQuiet(args) {
  try {
    git(args);
    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ensureRef(ref) {
  if (!gitQuiet(["rev-parse", "--verify", `${ref}^{commit}`])) {
    fail(`develop ref not found: ${ref}`);
  }
}

function latestReleaseTag() {
  try {
    return git([
      "describe",
      "--tags",
      "--match",
      "v[0-9]*.[0-9]*.[0-9]*",
      "--abbrev=0",
    ]);
  } catch {
    fail(
      "No v-prefixed semver tag found. Seed the release baseline before preparing release commits.",
    );
  }
}

function normalizeTitle(title) {
  const trimmed = title.trim();
  if (/^(feat|fix)(?:\([^)]+\))?!?: .+/.test(trimmed)) {
    return trimmed;
  }
  if (/^.+!:.+/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function mergeTitlesSince(tag, ref) {
  const output = git(["log", "--merges", "--format=%s", `${tag}..${ref}`]);
  if (!output) {
    return [];
  }
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function createSyntheticCommit(subject) {
  const tree = git(["write-tree"]);
  const parent = git(["rev-parse", "HEAD"]);
  const commit = execFileSync(
    "git",
    ["commit-tree", tree, "-p", parent, "-m", subject],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
  git(["reset", "--soft", commit]);
}

ensureRef(developRef);
const tag = latestReleaseTag();
const titles = mergeTitlesSince(tag, developRef);
const releaseTitles = titles
  .map(normalizeTitle)
  .filter((title) => title !== null)
  .reverse();

for (const title of releaseTitles) {
  createSyntheticCommit(title);
}

console.log(
  `prepare-release-commits: accepted ${releaseTitles.length} release title(s), ignored ${
    titles.length - releaseTitles.length
  } title(s) from ${developRef} since ${tag}`,
);
```

- [ ] **Step 2: Update the workflow**

Modify `.github/workflows/release.yml`:

```yaml
on:
  schedule:
    # Daily at 21:00 UTC (06:00 JST). Off-hour to avoid the top-of-hour surge.
    - cron: "0 21 * * *"
  workflow_dispatch:
```

Add this step after `Require a baseline tag` and before `Run semantic-release`:

```yaml
- name: Prepare release commits from develop
  run: |
    git fetch origin develop:refs/remotes/origin/develop --tags
    node scripts/prepare_release_commits.mjs origin/develop
```

- [ ] **Step 3: Run the focused workflow and script tests**

Run:

```bash
uv run pytest tests/workflow/test_release_management.py -v
```

Expected: PASS.

- [ ] **Step 4: Commit the implementation**

Run:

```bash
git add .github/workflows/release.yml scripts/prepare_release_commits.mjs tests/workflow/test_release_management.py
git commit -m "ci: derive release commits from develop merge titles (#521)"
```

Expected: commit succeeds.

## Task 4: Documentation

**Files:**

- Modify: `docs/versioning.md`

- [ ] **Step 1: Update release policy documentation**

Replace the "Automated Releases" section with:

```markdown
## Automated Releases

`.github/workflows/release.yml` runs semantic-release every day at 06:00 JST and
via `workflow_dispatch`. Plain pushes to `main` do not publish releases.

Release artifacts remain on `main`, but the release signal comes from
first-parent titles that landed on `develop`. Before semantic-release runs,
`scripts/prepare_release_commits.mjs` reads the `develop` history, unwraps
common GitHub merge commit bodies when needed, and creates local synthetic
Conventional Commit inputs on top of the checked-out `main` branch.

Each synthetic input records the source `develop` commit SHA with a
`Release-Signal-Source:` marker. Later scheduled runs read those markers from
the latest release tag and skip already released `develop` commits, so old
titles do not trigger a new release every morning.

The release uses Conventional Commits in merge titles:

- `fix:` creates a patch release.
- `feat:` creates a minor release.
- Breaking changes create a minor release while the project remains below
  `1.0.0`.
- Non-release titles such as `docs:` or `chore:` are ignored for version bump
  purposes.

When the project is ready for `1.0.0`, remove the breaking-change override from
`.releaserc.json` so semantic-release can return to the default
breaking-change-to-major behavior.
```

- [ ] **Step 2: Run the workflow tests again**

Run:

```bash
uv run pytest tests/workflow/test_release_management.py -v
```

Expected: PASS.

- [ ] **Step 3: Commit the docs**

Run:

```bash
git add docs/versioning.md
git commit -m "docs: explain develop merge title release signals (#521)"
```

Expected: commit succeeds.

## Task 5: Final Verification

**Files:**

- Read only unless failures require fixes.

- [ ] **Step 1: Run the full workflow release-management test file**

Run:

```bash
uv run pytest tests/workflow/test_release_management.py -v
```

Expected: PASS.

- [ ] **Step 2: Run relevant lint if available**

Run:

```bash
npx --yes prettier --check .github/workflows/release.yml scripts/prepare_release_commits.mjs package.json
```

Expected: PASS or report formatting that should be corrected before finalizing.

- [ ] **Step 3: Inspect git status**

Run:

```bash
git status --short
```

Expected: only unrelated pre-existing untracked files remain, such as `.worktrees/`.

- [ ] **Step 4: Summarize completion**

Report the commit hashes, tests run, and any residual risk. Do not claim full release behavior was exercised unless semantic-release was actually run against a test repository.

## Plan Drift Notes

During Task 3 review, the implementation plan's initial `tag..develop` boundary
was found to be insufficient because release tags are created on `main`, not on
`develop`. The implemented script records each accepted source commit SHA in the
synthetic commit body as `Release-Signal-Source: <sha>` and skips source SHAs
already present in the latest tagged release history. The tests now cover this
repeat-run case along with GitHub merge body unwrapping, squash/rebase-style
subjects, and `BREAKING CHANGE` footers.
