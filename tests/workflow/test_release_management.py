import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[2]


def load_workflow() -> dict[str, Any]:
    with (ROOT / ".github" / "workflows" / "release.yml").open(encoding="utf-8") as workflow_file:
        return yaml.safe_load(workflow_file)


def load_release_config() -> dict[str, Any]:
    with (ROOT / ".releaserc.json").open(encoding="utf-8") as config_file:
        return json.load(config_file)


def test_release_workflow_runs_on_schedule_and_manual_dispatch_only() -> None:
    workflow = load_workflow()

    assert workflow["name"] == "Release"
    assert set(workflow[True]) == {"schedule", "workflow_dispatch"}
    assert workflow[True]["schedule"] == [{"cron": "17 1 * * 1"}]
    assert "push" not in workflow[True]
    assert "pull_request" not in workflow[True]


def test_release_workflow_requires_baseline_tag_and_release_token_fallback() -> None:
    workflow = load_workflow()
    steps = workflow["jobs"]["release"]["steps"]

    checkout = next(step for step in steps if step["name"] == "Checkout")
    assert checkout["with"]["fetch-depth"] == 0
    assert checkout["with"]["token"] == "${{ secrets.RELEASE_TOKEN || github.token }}"

    baseline = next(step for step in steps if step["name"] == "Require a baseline tag")
    assert "git tag --list 'v[0-9]*.[0-9]*.[0-9]*'" in baseline["run"]
    assert "silently releasing 1.0.0" in baseline["run"]


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
            "assets": ["package.json", "package-lock.json", "CHANGELOG.md"],
            "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
        },
    ] in config["plugins"]


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
