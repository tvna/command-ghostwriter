"""Deterministic render check for every template in the example library.

`assets/examples/` pairs a Jinja2 template (`<id>.j2`) with a same-basename
data file (`<id>.toml` / `<id>.yaml` / `<id>.csv`) -- the exact convention
`web/src/lib/templates.ts` uses to build the template library. This test
discovers every such pair and renders it through the real engine with
strict-undefined mode, the web UI's default (`isStrictUndefined: true` in
`web/src/worker/types.ts`).

This exists to catch invalid Jinja2 references (e.g. `{{ loop_index }}`,
which is not a real variable -- the correct one is `{{ loop.index }}`) that
`features/validate_template.py`'s AST-based validation does not catch, since
it only parses syntax and checks a security blocklist, not variable
definedness. Such a bug ships silently past validation and only surfaces as
a total render failure for an end user in the web UI. Before this test
existed, the only check was a one-off script pasted into a plan document and
run manually once; nothing forced it to run again on the next template edit
or new template addition (see PR #543 review).
"""

from io import BytesIO
from pathlib import Path
from typing import Final

import pytest
from _pytest.mark.structures import MarkDecorator

from features.config_parser import ConfigParser
from features.document_render import DocumentRender

UNIT: MarkDecorator = pytest.mark.unit

EXAMPLES_DIR: Final[Path] = Path(__file__).resolve().parents[2] / "assets" / "examples"
DATA_EXTENSIONS: Final[tuple[str, ...]] = ("toml", "yaml", "csv")


def _discover_template_pairs() -> list[tuple[str, str]]:
    """Find every `<id>.j2` with a same-basename `<id>.{toml,yaml,csv}` sibling."""
    pairs: list[tuple[str, str]] = []
    for j2_file in sorted(EXAMPLES_DIR.glob("*.j2")):
        template_id = j2_file.stem
        for ext in DATA_EXTENSIONS:
            if (EXAMPLES_DIR / f"{template_id}.{ext}").exists():
                pairs.append((template_id, ext))
                break
    return pairs


TEMPLATE_PAIRS: Final[list[tuple[str, str]]] = _discover_template_pairs()


@UNIT
@pytest.mark.parametrize(
    ("template_id", "data_ext"),
    TEMPLATE_PAIRS,
    ids=[pair[0] for pair in TEMPLATE_PAIRS],
)
def test_example_template_renders_under_strict_undefined(template_id: str, data_ext: str) -> None:
    """Every `assets/examples/*.j2` template must render successfully with is_strict_undefined=True.

    This is the exact mode the web UI defaults to; a template that only
    renders in non-strict mode ships broken for every user who hasn't
    disabled strict-undefined in Settings.
    """
    data_path = EXAMPLES_DIR / f"{template_id}.{data_ext}"
    template_path = EXAMPLES_DIR / f"{template_id}.j2"

    with data_path.open("rb") as f:
        config_file = BytesIO(f.read())
    config_file.name = data_path.name
    parser = ConfigParser(config_file=config_file)
    assert parser.parse() is True, f"{template_id}: config parse failed: {parser.error_message}"
    parsed = parser.parsed_dict
    assert parsed is not None

    with template_path.open("rb") as f:
        template_file = BytesIO(f.read())
    template_file.name = template_path.name
    render = DocumentRender(template_file)
    assert render.is_valid_template is True, f"{template_id}: template invalid: {render.error_message}"

    format_type_keep = 0
    ok = render.apply_context(parsed, format_type_keep, True)
    assert ok is True, f"{template_id}: strict-undefined render failed: {render.error_message}"
    assert render.render_content, f"{template_id}: rendered content is empty"
