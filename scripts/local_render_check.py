#!/usr/bin/env python3
"""Offline render-fidelity pre-check for assets/examples template pairs.

The authoritative gate is CI's tests/unit/test_example_templates_render.py,
which cannot run in the network-disabled web session (pydantic/python-box are
not cached). This harness reproduces the real render path closely enough to
catch the failure classes that a strict-undefined render-success check alone
misses, and was validated to agree with the real engine on the existing
library.

It reproduces:
  * ConfigParser CSV coercion -- features/config_parser.py::_infer_scalar /
    _coerce_cell: numeric cells become int/float; an EMPTY cell becomes the
    configured fill value (the web UI default is "#", see
    web/src/worker/types.ts DEFAULT_SETTINGS.fillNanWith) or float('nan') when
    filling is disabled (the pytest default).
  * DocumentRender environment -- features/document_render.py::_create_environment:
    SandboxedEnvironment(autoescape=True, undefined=StrictUndefined,
    extensions=["jinja2.ext.do"]) with the date / safe / html_safe filters,
    where safe/html_safe mirror TemplateSecurityValidator.html_safe_filter
    (unescaped Markup, but rejecting <script>/javascript:/data:/vbscript:/on*=).

On top of a successful strict-undefined render it enforces two invariants the
existing library already satisfies (0 violations across the 46 originals):

  1. no-html-entities: autoescape must not have mangled emitted values into
     HTML entities (&amp; &lt; &gt; &#39; &#34;). A shell command carrying
     `&&`, `<`, `>` or quotes through {{ }} is the trigger; the fix is `| safe`
     on that value (when it clears the security filter) or literal template
     text. Existing templates keep metacharacters as literal text.
  2. fill-invariance: rendered output must NOT change when the empty-cell fill
     value changes. Output that differs means the template emits an empty CSV
     cell (e.g. `{% if r["x"] %}` where x is blank), whose representation is a
     user setting ("#" vs nan) -- fragile. The fix is an explicit sentinel in
     the data (e.g. "-") tested with `{% if r["x"] != "-" %}`.

Usage:
    python3 scripts/local_render_check.py [id ...]   # default: all pairs
"""

from __future__ import annotations

import csv
import math
import re
import sys
import tomllib
from datetime import datetime
from io import StringIO
from pathlib import Path
from typing import Optional

import yaml
from jinja2.runtime import StrictUndefined
from jinja2.sandbox import SandboxedEnvironment
from markupsafe import Markup

EXAMPLES = Path(__file__).resolve().parents[1] / "assets" / "examples"
DATA_EXTS = ("toml", "yaml", "csv")
WEB_DEFAULT_FILL = "#"  # web/src/worker/types.ts DEFAULT_SETTINGS.fillNanWith
ALT_FILL = "\x01ALT\x01"  # any distinct value; used only to detect fill-dependence
ENTITY_RE = re.compile(r"&(amp|lt|gt|quot|#39|#34);")
UNSAFE_HTML = [r"<script", r"javascript:", r"data:", r"vbscript:", r"on\w+\s*="]


def _infer_scalar(value: str):
    """Mirror of features/config_parser.py::_infer_scalar."""
    try:
        if str(int(value)) == value:
            return int(value)
    except ValueError:
        pass
    try:
        pf = float(value)
        if not (math.isnan(pf) or math.isinf(pf)) and str(pf) == value:
            return pf
    except ValueError:
        pass
    return value


def _coerce_cell(cell: str, fill_value: Optional[str]):
    if cell == "":
        return fill_value if fill_value is not None else float("nan")
    return _infer_scalar(cell)


def _date_filter(value: str, format_str: str = "%Y-%m-%d") -> str:
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).strftime(format_str)


def _html_safe_filter(value: object) -> Markup:
    v = "" if value is None else str(value)
    for pat in UNSAFE_HTML:
        if re.search(pat, v, re.IGNORECASE):
            raise ValueError("safe: HTML content contains potentially unsafe elements")
    return Markup(v)


def _make_env() -> SandboxedEnvironment:
    env = SandboxedEnvironment(autoescape=True, undefined=StrictUndefined, extensions=["jinja2.ext.do"])
    env.filters["date"] = _date_filter
    env.filters["safe"] = _html_safe_filter
    env.filters["html_safe"] = _html_safe_filter
    return env


def _load_context(data_path: Path, fill_value: Optional[str]) -> dict:
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
        out = []
        for r in body:
            cells = r + [""] * (len(header) - len(r))
            out.append({h: _coerce_cell(c, fill_value) for h, c in zip(header, cells)})
        return {"csv_rows": out}
    raise ValueError(f"unsupported ext: {ext}")


def _render(env: SandboxedEnvironment, template_path: Path, ctx: dict) -> str:
    return env.from_string(template_path.read_text(encoding="utf-8")).render(**ctx)


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


def _check_one(env: SandboxedEnvironment, tid: str, ext: str) -> Optional[str]:
    data_path = EXAMPLES / f"{tid}.{ext}"
    tpl_path = EXAMPLES / f"{tid}.j2"
    try:
        out_web = _render(env, tpl_path, _load_context(data_path, WEB_DEFAULT_FILL))
    except Exception as e:  # noqa: BLE001
        return f"render failed (fill={WEB_DEFAULT_FILL!r}): {type(e).__name__}: {e}"
    if not out_web.strip():
        return "rendered content is empty"
    ent = sorted(set(m.group() for m in ENTITY_RE.finditer(out_web)))
    if ent:
        return f"autoescape mangled metacharacters into HTML entities {ent} (use | safe or literal text)"
    try:
        out_alt = _render(env, tpl_path, _load_context(data_path, ALT_FILL))
    except Exception as e:  # noqa: BLE001
        return f"render failed (alt fill): {type(e).__name__}: {e}"
    if out_web != out_alt:
        return "output depends on empty-cell fill setting (fragile empty CSV cell; use an explicit sentinel like '-')"
    return None


def main(argv: list[str]) -> int:
    ids = argv[1:]
    pairs = _discover(ids)
    if not pairs:
        print("no template pairs found", file=sys.stderr)
        return 1
    env = _make_env()
    failures = []
    for tid, ext in pairs:
        err = _check_one(env, tid, ext)
        if err:
            failures.append(f"FAIL {tid} ({ext}): {err}")
    for f in failures:
        print(f)
    print(f"\n{len(pairs) - len(failures)}/{len(pairs)} pairs OK")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
