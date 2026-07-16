#!/usr/bin/env python3
"""Offline strict-undefined render pre-check for assets/examples template pairs.

This mirrors the essential behavior of the authoritative CI gate
(tests/unit/test_example_templates_render.py), which cannot run in the
network-disabled web session because pydantic/python-box are not cached.

It reproduces the real engine's Jinja2 configuration
(features/document_render.py::_create_environment):

    SandboxedEnvironment(autoescape=True, undefined=StrictUndefined,
                         extensions=["jinja2.ext.do"])
    + filters: date, safe, html_safe

and the parser's variable exposure (features/config_parser.py):

    toml/yaml -> loaded dict is the context
    csv       -> {"csv_rows": [ {header: cell, ...}, ... ]}

It intentionally catches the failure classes the CI test targets: undefined
variables (StrictUndefined), Jinja2 syntax errors, and missing data keys.
The CI pytest run remains authoritative for byte-level render parity.

Usage:
    python3 scripts/local_render_check.py [id ...]   # default: all pairs
"""

from __future__ import annotations

import csv
import sys
import tomllib
from datetime import datetime
from io import StringIO
from pathlib import Path

import yaml
from jinja2.runtime import StrictUndefined
from jinja2.sandbox import SandboxedEnvironment

EXAMPLES = Path(__file__).resolve().parents[1] / "assets" / "examples"
DATA_EXTS = ("toml", "yaml", "csv")


def _date_filter(value: str, format_str: str = "%Y-%m-%d") -> str:
    dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return dt.strftime(format_str)


def _identity_safe(value: object) -> str:
    return "" if value is None else str(value)


def _make_env() -> SandboxedEnvironment:
    env = SandboxedEnvironment(
        autoescape=True,
        undefined=StrictUndefined,
        extensions=["jinja2.ext.do"],
    )
    env.filters["date"] = _date_filter
    env.filters["safe"] = _identity_safe
    env.filters["html_safe"] = _identity_safe
    return env


def _load_context(data_path: Path) -> dict:
    ext = data_path.suffix.lstrip(".")
    text = data_path.read_text(encoding="utf-8")
    if ext == "toml":
        return tomllib.loads(text)
    if ext in ("yaml", "yml"):
        loaded = yaml.safe_load(text)
        if not isinstance(loaded, dict):
            raise ValueError(f"yaml top-level is not a mapping: {type(loaded)}")
        return loaded
    if ext == "csv":
        rows = [r for r in csv.reader(StringIO(text)) if r]
        if not rows:
            return {"csv_rows": []}
        header, *body = rows
        return {"csv_rows": [dict(zip(header, r)) for r in body]}
    raise ValueError(f"unsupported ext: {ext}")


def _discover(ids: list[str]) -> list[tuple[str, str]]:
    pairs = []
    for j2 in sorted(EXAMPLES.glob("*.j2")):
        tid = j2.stem
        if ids and tid not in ids:
            continue
        for ext in DATA_EXTS:
            if (EXAMPLES / f"{tid}.{ext}").exists():
                pairs.append((tid, ext))
                break
    return pairs


def main(argv: list[str]) -> int:
    ids = argv[1:]
    pairs = _discover(ids)
    if not pairs:
        print("no template pairs found", file=sys.stderr)
        return 1
    env = _make_env()
    failures: list[str] = []
    for tid, ext in pairs:
        try:
            context = _load_context(EXAMPLES / f"{tid}.{ext}")
            tpl_src = (EXAMPLES / f"{tid}.j2").read_text(encoding="utf-8")
            out = env.from_string(tpl_src).render(**context)
            if not out.strip():
                raise ValueError("rendered content is empty")
        except Exception as e:  # noqa: BLE001 - report every failure loudly
            failures.append(f"FAIL {tid} ({ext}): {type(e).__name__}: {e}")
    for f in failures:
        print(f)
    print(f"\n{len(pairs) - len(failures)}/{len(pairs)} pairs rendered OK")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
