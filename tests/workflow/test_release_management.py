import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[2]


def load_workflow() -> dict[Any, Any]:
    with (ROOT / ".github" / "workflows" / "release.yml").open(encoding="utf-8") as workflow_file:
        return yaml.safe_load(workflow_file)


def load_release_config() -> dict[str, Any]:
    with (ROOT / ".releaserc.json").open(encoding="utf-8") as config_file:
        return json.load(config_file)


def run_git(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    git = shutil.which("git")
    assert git is not None
    return subprocess.run(
        [git, *args],
        cwd=repo,
        check=True,
        capture_output=True,
        text=True,
    )


def commit_file(repo: Path, filename: str, content: str, message: str, *extra_message_args: str) -> None:
    target = repo / filename
    target.write_text(content, encoding="utf-8")
    run_git(repo, "add", filename)
    run_git(repo, "commit", "-m", message, *extra_message_args)


def init_release_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir()
    run_git(repo, "init", "-b", "main")
    run_git(repo, "config", "user.email", "release-test@example.com")
    run_git(repo, "config", "user.name", "Release Test")
    run_git(repo, "config", "commit.gpgsign", "false")
    commit_file(repo, "README.md", "baseline\n", "chore: baseline")
    run_git(repo, "tag", "v0.4.4")
    run_git(repo, "checkout", "-b", "develop")
    return repo


def create_merge_commit(repo: Path, branch: str, filename: str, message: str) -> None:
    run_git(repo, "checkout", "-b", branch, "main")
    commit_file(repo, filename, f"{message}\n", message)
    run_git(repo, "checkout", "develop")
    run_git(repo, "merge", "--no-ff", branch, "-m", message)


def create_github_merge_commit(repo: Path, branch: str, filename: str, pr_number: int, title: str) -> None:
    run_git(repo, "checkout", "-b", branch, "main")
    commit_file(repo, filename, f"{title}\n", title)
    run_git(repo, "checkout", "develop")
    run_git(
        repo,
        "merge",
        "--no-ff",
        branch,
        "-m",
        f"Merge pull request #{pr_number} from test/{branch}",
        "-m",
        title,
    )


def test_release_workflow_runs_on_schedule_and_manual_dispatch_only() -> None:
    workflow = load_workflow()

    assert workflow["name"] == "Release"
    assert set(workflow[True]) == {"schedule", "workflow_dispatch"}
    assert workflow[True]["schedule"] == [{"cron": "0 21 * * *"}]
    assert "push" not in workflow[True]
    assert "pull_request" not in workflow[True]


def test_develop_to_main_version_pr_workflow_is_retired() -> None:
    assert not (ROOT / ".github" / "workflows" / "create-pr-to-main.yml").exists()


def test_release_workflow_requires_baseline_tag_and_release_token_fallback() -> None:
    workflow = load_workflow()
    steps = workflow["jobs"]["release"]["steps"]

    checkout = next(step for step in steps if step["name"] == "Checkout")
    assert checkout["with"]["fetch-depth"] == 0
    assert checkout["with"]["token"] == "${{ secrets.RELEASE_TOKEN || github.token }}"

    baseline = next(step for step in steps if step["name"] == "Require a baseline tag")
    assert "git tag --list 'v[0-9]*.[0-9]*.[0-9]*'" in baseline["run"]
    assert "silently releasing 1.0.0" in baseline["run"]


def test_release_workflow_prepares_develop_merge_title_commits() -> None:
    workflow = load_workflow()
    steps = workflow["jobs"]["release"]["steps"]

    prepare = next(step for step in steps if step["name"] == "Prepare release commits from develop")
    assert "git fetch origin develop:refs/remotes/origin/develop --tags" in prepare["run"]
    assert "node scripts/prepare_release_commits.mjs origin/develop" in prepare["run"]

    run_release_index = next(index for index, step in enumerate(steps) if step["name"] == "Run semantic-release")
    prepare_index = steps.index(prepare)
    assert prepare_index < run_release_index


def test_release_workflow_invokes_semantic_release_with_required_plugins() -> None:
    workflow = load_workflow()
    run_step = next(step for step in workflow["jobs"]["release"]["steps"] if step["name"] == "Run semantic-release")
    command = run_step["run"]

    assert run_step["env"]["GITHUB_TOKEN"] == "${{ secrets.RELEASE_TOKEN || github.token }}"
    for package in [
        "semantic-release@^24",
        "@semantic-release/commit-analyzer@^13",
        "@semantic-release/release-notes-generator@^14",
        "@semantic-release/changelog@^6",
        "@semantic-release/exec@^7",
        "@semantic-release/git@^10",
        "@semantic-release/github@^11",
        "conventional-changelog-conventionalcommits@^8",
    ]:
        assert f"-p {package}" in command


def test_release_config_updates_package_manifest_and_changelog() -> None:
    config = load_release_config()

    assert config["branches"] == ["main"]
    assert config["tagFormat"] == "v${version}"
    assert [
        "@semantic-release/exec",
        {"prepareCmd": "node scripts/apply_version.mjs ${nextRelease.version}"},
    ] in config["plugins"]
    assert [
        "@semantic-release/git",
        {
            "assets": ["package.json", "package-lock.json", "CHANGELOG.md", ".release-signals.json"],
            "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
        },
    ] in config["plugins"]


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
    state_path = run_git(repo, "rev-parse", "--git-path", "command-ghostwriter-release-state.json").stdout.strip()
    state = json.loads((repo / state_path).read_text(encoding="utf-8"))
    assert state["baseHead"] == main_head
    assert [source["subject"] for source in state["sources"]] == [
        "feat: add generated command preview",
        "fix: preserve uploaded csv values",
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


def test_prepare_release_commits_accepts_breaking_change_titles(tmp_path: Path) -> None:
    node = shutil.which("node")
    assert node is not None
    repo = init_release_repo(tmp_path)
    create_merge_commit(repo, "breaking-one", "breaking.txt", "refactor!: simplify template API")
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
    assert subjects == ["refactor!: simplify template API"]
    assert "accepted 1 release title(s)" in result.stdout


def test_prepare_release_commits_unwraps_github_merge_commit_body_titles(tmp_path: Path) -> None:
    node = shutil.which("node")
    assert node is not None
    repo = init_release_repo(tmp_path)
    create_github_merge_commit(repo, "wrapped-feature", "wrapped.txt", 123, "feat: add wrapped PR title")
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
    assert subjects == ["feat: add wrapped PR title"]
    assert "accepted 1 release title(s)" in result.stdout


def test_prepare_release_commits_accepts_first_parent_squash_titles(tmp_path: Path) -> None:
    node = shutil.which("node")
    assert node is not None
    repo = init_release_repo(tmp_path)
    commit_file(repo, "squash.txt", "squash\n", "fix: accept squash merge title")
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
    assert subjects == ["fix: accept squash merge title"]
    assert "accepted 1 release title(s)" in result.stdout


def test_prepare_release_commits_preserves_breaking_change_footer(tmp_path: Path) -> None:
    node = shutil.which("node")
    assert node is not None
    repo = init_release_repo(tmp_path)
    commit_file(
        repo,
        "breaking-footer.txt",
        "breaking footer\n",
        "refactor: simplify template API",
        "-m",
        "BREAKING CHANGE: template filters are renamed",
    )
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
    body = run_git(repo, "log", "--format=%b", f"{main_head}..HEAD").stdout
    assert subjects == ["refactor: simplify template API"]
    assert "BREAKING CHANGE: template filters are renamed" in body
    assert "accepted 1 release title(s)" in result.stdout


def test_prepare_release_commits_skips_already_released_develop_commits(tmp_path: Path) -> None:
    node = shutil.which("node")
    assert node is not None
    repo = init_release_repo(tmp_path)
    create_merge_commit(repo, "released-feature", "released.txt", "feat: release once")
    main_head = run_git(repo, "rev-parse", "main").stdout.strip()
    run_git(repo, "checkout", "main")

    first_result = subprocess.run(
        [node, str(ROOT / "scripts" / "prepare_release_commits.mjs"), "develop"],
        check=False,
        cwd=repo,
        capture_output=True,
        text=True,
    )
    assert first_result.returncode == 0, first_result.stderr
    first_subjects = run_git(repo, "log", "--format=%s", f"{main_head}..HEAD").stdout.splitlines()
    assert first_subjects == ["feat: release once"]
    first_body = run_git(repo, "log", "--format=%b", "-1").stdout
    assert "Release-Signal-Source:" in first_body

    run_git(repo, "tag", "v0.4.5")
    released_head = run_git(repo, "rev-parse", "HEAD").stdout.strip()
    second_result = subprocess.run(
        [node, str(ROOT / "scripts" / "prepare_release_commits.mjs"), "develop"],
        check=False,
        cwd=repo,
        capture_output=True,
        text=True,
    )

    assert second_result.returncode == 0, second_result.stderr
    assert run_git(repo, "rev-parse", "HEAD").stdout.strip() == released_head
    assert "accepted 0 release title(s)" in second_result.stdout


def test_prepare_release_commits_skips_sources_recorded_in_release_metadata(tmp_path: Path) -> None:
    node = shutil.which("node")
    assert node is not None
    repo = init_release_repo(tmp_path)
    create_merge_commit(repo, "released-feature", "released.txt", "feat: release once")
    source_sha = run_git(repo, "rev-parse", "develop").stdout.strip()
    run_git(repo, "checkout", "main")
    metadata = {
        "releasedSources": [
            {
                "sourceSha": source_sha,
                "version": "0.4.5",
                "subject": "feat: release once",
            }
        ]
    }
    commit_file(repo, ".release-signals.json", json.dumps(metadata), "chore(release): 0.4.5 [skip ci]")
    run_git(repo, "tag", "v0.4.5")
    released_head = run_git(repo, "rev-parse", "HEAD").stdout.strip()

    result = subprocess.run(
        [node, str(ROOT / "scripts" / "prepare_release_commits.mjs"), "develop"],
        check=False,
        cwd=repo,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert run_git(repo, "rev-parse", "HEAD").stdout.strip() == released_head
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


def test_apply_version_updates_package_json_and_lockfile(tmp_path: Path) -> None:
    node = shutil.which("node")
    assert node is not None

    package_json = tmp_path / "package.json"
    package_lock_json = tmp_path / "package-lock.json"
    package_json.write_text(json.dumps({"name": "command_ghostwriter", "version": "0.3.6"}), encoding="utf-8")
    package_lock_json.write_text(
        json.dumps(
            {
                "name": "command_ghostwriter",
                "version": "0.3.6",
                "packages": {
                    "": {
                        "name": "command_ghostwriter",
                        "version": "0.3.6",
                    },
                    "node_modules/example": {"version": "1.0.0"},
                },
            }
        ),
        encoding="utf-8",
    )

    result = subprocess.run(
        [node, str(ROOT / "scripts" / "apply_version.mjs"), "0.4.0"],
        check=False,
        cwd=tmp_path,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert json.loads(package_json.read_text(encoding="utf-8"))["version"] == "0.4.0"
    lock_data = json.loads(package_lock_json.read_text(encoding="utf-8"))
    assert lock_data["version"] == "0.4.0"
    assert lock_data["packages"][""]["version"] == "0.4.0"
    assert lock_data["packages"]["node_modules/example"]["version"] == "1.0.0"


def test_apply_version_restores_release_base_and_records_sources(tmp_path: Path) -> None:
    node = shutil.which("node")
    assert node is not None
    repo = init_release_repo(tmp_path)
    run_git(repo, "checkout", "main")
    (repo / "package.json").write_text(
        json.dumps({"name": "command_ghostwriter", "version": "0.4.4"}),
        encoding="utf-8",
    )
    (repo / "package-lock.json").write_text(
        json.dumps(
            {
                "name": "command_ghostwriter",
                "version": "0.4.4",
                "packages": {"": {"name": "command_ghostwriter", "version": "0.4.4"}},
            }
        ),
        encoding="utf-8",
    )
    run_git(repo, "add", "package.json", "package-lock.json")
    run_git(repo, "commit", "-m", "chore: add package manifests")
    create_merge_commit(repo, "feature-one", "feature.txt", "feat: add generated command preview")
    main_head = run_git(repo, "rev-parse", "main").stdout.strip()
    source_sha = run_git(repo, "rev-parse", "develop").stdout.strip()
    run_git(repo, "checkout", "main")

    prepare_result = subprocess.run(
        [node, str(ROOT / "scripts" / "prepare_release_commits.mjs"), "develop"],
        check=False,
        cwd=repo,
        capture_output=True,
        text=True,
    )
    assert prepare_result.returncode == 0, prepare_result.stderr
    assert run_git(repo, "rev-parse", "HEAD").stdout.strip() != main_head
    (repo / "CHANGELOG.md").write_text("## 0.5.0\n\n- generated notes\n", encoding="utf-8")

    result = subprocess.run(
        [node, str(ROOT / "scripts" / "apply_version.mjs"), "0.5.0"],
        check=False,
        cwd=repo,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert run_git(repo, "rev-parse", "HEAD").stdout.strip() == main_head
    assert run_git(repo, "log", "--format=%s", f"{main_head}..HEAD").stdout.splitlines() == []
    metadata = json.loads((repo / ".release-signals.json").read_text(encoding="utf-8"))
    assert metadata["releasedSources"] == [
        {
            "sourceSha": source_sha,
            "version": "0.5.0",
            "subject": "feat: add generated command preview",
        }
    ]
