"""Unit tests for scripts/rulesets_apply.py (repository ruleset plan/apply)."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pytest

if TYPE_CHECKING:
    from types import ModuleType
    from urllib.request import Request

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "rulesets_apply.py"


def _load_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location("rulesets_apply", SCRIPT)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeResponse:
    def __init__(self, status: int, body: bytes) -> None:
        self.status = status
        self.code = status
        self._body = body

    def getcode(self) -> int:
        return self.status

    def read(self) -> bytes:
        return self._body

    def close(self) -> None:
        pass


class FakeOpener:
    """Records requests and returns pre-scripted (status, body) pairs in order."""

    def __init__(self, responses: list[tuple[int, dict[str, Any] | list[Any]]]) -> None:
        self._responses = list(responses)
        self.requests: list[Request] = []

    def __call__(self, request: Request) -> FakeResponse:
        self.requests.append(request)
        status, payload = self._responses.pop(0)
        return FakeResponse(status, json.dumps(payload).encode("utf-8"))


@pytest.mark.unit
def test_decide_action_no_match_returns_post() -> None:
    mod = _load_module()
    assert mod.decide_action("main-protection", []) == {"action": "POST", "live_id": None, "match_count": 0}


@pytest.mark.unit
def test_decide_action_one_match_returns_put() -> None:
    mod = _load_module()
    live = [{"name": "main-protection", "id": 42}]
    assert mod.decide_action("main-protection", live) == {"action": "PUT", "live_id": 42, "match_count": 1}


@pytest.mark.unit
def test_decide_action_multiple_matches_returns_ambiguous() -> None:
    mod = _load_module()
    live = [{"name": "main-protection", "id": 1}, {"name": "main-protection", "id": 2}]
    result = mod.decide_action("main-protection", live)
    assert result["action"] == "ambiguous"
    assert result["match_count"] == 2


@pytest.mark.unit
def test_canonical_projection_extracts_only_governed_keys() -> None:
    mod = _load_module()
    ruleset = {"id": 99, "name": "main-protection", "target": "branch", "created_at": "2026-01-01", "rules": [{"type": "deletion"}]}
    projection = mod.canonical_projection(ruleset)
    assert projection == {
        "name": "main-protection",
        "target": "branch",
        "enforcement": None,
        "conditions": None,
        "bypass_actors": None,
        "rules": [{"type": "deletion"}],
    }


@pytest.mark.unit
def test_render_summary_row_formats_table_row() -> None:
    mod = _load_module()
    row = mod.render_summary_row("main.json", "main-protection", 1, "PUT applied", 42)
    assert row == "| main.json | main-protection | 1 | PUT applied | 42 |"
    empty_row = mod.render_summary_row("main.json", "main-protection", 0, "plan-only (POST)", None)
    assert empty_row == "| main.json | main-protection | 0 | plan-only (POST) | n/a |"


@pytest.mark.unit
def test_plan_rulesets_posts_nothing_and_reports_post_for_new_ruleset(tmp_path: Path) -> None:
    mod = _load_module()
    sot_dir = REPO_ROOT / ".github" / "rulesets"
    summary_file = tmp_path / "summary.md"

    # Only one GET (list live rulesets) is expected for a pure plan; no live match.
    opener = FakeOpener([(200, [])])

    mod.plan_rulesets(repo="tvna/command-ghostwriter", sot_dir=sot_dir, summary_file=summary_file, token="fake-token", opener=opener)  # noqa: S106

    assert len(opener.requests) == 1
    assert opener.requests[0].get_method() == "GET"
    summary = summary_file.read_text(encoding="utf-8")
    assert "plan-only (POST)" in summary
    assert "all-branches-no-force-push" in summary
    assert "main-protection" in summary


@pytest.mark.unit
def test_apply_rulesets_creates_new_ruleset_via_post(tmp_path: Path) -> None:
    mod = _load_module()
    sot_dir = REPO_ROOT / ".github" / "rulesets"
    summary_file = tmp_path / "summary.md"

    # GET (list) once, then one POST per SoT file (all-branches.json, main.json).
    opener = FakeOpener(
        [
            (200, []),
            (201, {"id": 1001, "name": "all-branches-no-force-push"}),
            (201, {"id": 1002, "name": "main-protection"}),
        ]
    )

    mod.apply_rulesets(repo="tvna/command-ghostwriter", sot_dir=sot_dir, summary_file=summary_file, token="fake-token", opener=opener)  # noqa: S106

    methods = [req.get_method() for req in opener.requests]
    assert methods == ["GET", "POST", "POST"]
    summary = summary_file.read_text(encoding="utf-8")
    assert "POST applied" in summary


@pytest.mark.unit
def test_apply_rulesets_updates_existing_ruleset_via_put(tmp_path: Path) -> None:
    mod = _load_module()
    sot_dir = REPO_ROOT / ".github" / "rulesets"
    summary_file = tmp_path / "summary.md"

    live_main = {
        "id": 2002,
        "name": "main-protection",
        "target": "branch",
        "enforcement": "active",
        "conditions": {},
        "bypass_actors": [],
        "rules": [],
    }
    live_all_branches = {
        "id": 2001,
        "name": "all-branches-no-force-push",
        "target": "branch",
        "enforcement": "active",
        "conditions": {},
        "bypass_actors": [],
        "rules": [],
    }
    # GET (list, both already exist) -> GET (detail of all-branches for diff) -> PUT
    # -> GET (detail of main for diff) -> PUT.
    opener = FakeOpener(
        [
            (200, [{"id": 2001, "name": "all-branches-no-force-push"}, {"id": 2002, "name": "main-protection"}]),
            (200, live_all_branches),
            (200, {"id": 2001, "name": "all-branches-no-force-push"}),
            (200, live_main),
            (200, {"id": 2002, "name": "main-protection"}),
        ]
    )

    mod.apply_rulesets(repo="tvna/command-ghostwriter", sot_dir=sot_dir, summary_file=summary_file, token="fake-token", opener=opener)  # noqa: S106

    methods = [req.get_method() for req in opener.requests]
    assert methods == ["GET", "GET", "PUT", "GET", "PUT"]
    assert opener.requests[2].full_url.endswith("/rulesets/2001")
    assert opener.requests[4].full_url.endswith("/rulesets/2002")
