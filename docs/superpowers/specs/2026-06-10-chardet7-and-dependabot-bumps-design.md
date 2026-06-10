# chardet 5 -> 7 migration + consolidated Dependabot pip-group bumps

- Date: 2026-06-10
- Issue: #382
- Supersedes: #364

## Problem

Dependabot PR #364 bumps 31 packages in the pip group. chardet's bump (5.2.0 ->
7.4.3) was held back in that PR because chardet 7 is breaking:

1. `chardet.resultdict` (and its `ResultDict` type) is removed.
2. `chardet.detect()` returns different results for several inputs, causing 11
   failures in `tests/unit/test_transcoder.py`.

The maintainer chose to handle the chardet migration together with all #364
bumps in one issue and one PR, and to close #364 as superseded.

## Investigation (evidence, not speculation)

Detection behavior was probed in isolation (`uv run --no-project --with`) for
both chardet 5.2.0 and 7.4.3, and the full transcoder suite was run against
chardet 7. Exactly 11 tests fail, in three groups:

| Group | Input | chardet 5 | chardet 7 | Notes |
|-------|-------|-----------|-----------|-------|
| Empty (8 cases) | `b""` | None -> fallback -> `ASCII` | `utf-8` (conf 0.1, in KNOWN, short-circuits) | converted output identical (empty) |
| high_ascii | `b"\x80\x81\x82\x83"` | None | `cp862` (conf 0.017) -> echoed by final fallback | 4 garbage bytes |
| large_binary | `b"\xff"*1000` | `ISO-8859-1` | `Windows-1251` -> echoed by final fallback | pure binary noise |
| music_symbol | `"Hello♪World"` utf-8 | wrongly detected `Shift_JIS` (no-op round-trip) | correctly `utf-8`, converts note to `\x81\xf4` | chardet 7 is correct |

`detect_encoding` trusts chardet only when it returns one of
`KNOWN_ENCODES = ["ASCII", "Shift_JIS", "EUC-JP", "ISO-2022-JP", "utf-8"]`
(needed to disambiguate Shift_JIS vs EUC-JP, which a naive decode loop cannot).
Otherwise it runs an ASCII-first decode loop, and as a last resort echoes
chardet's raw guess (`return encoding`).

Production callers (`app.py`, `features/core.py`) use only `convert()`; the
detected-name string is internal. `core.py` relies on deny-fallback returning
`None` to reject files it cannot decode.

## Design (approved)

### A. Dependencies
- Apply all 31 pyproject.toml constraint bumps from #364, including
  `chardet>=7.4.3,<8` (not held). The other 30 (mypy 1->2, ruff 0.15,
  pandas-stubs 3, packaging 26, pytest-playwright 0.8, etc.) were already proven
  green in #364's CI.
- Update the pydantic comment to the 2.13 wording and `pydantic>=2.13.4,<2.14`.
- Regenerate `uv.lock`.

### B. features/transcoder.py
- Remove `from chardet.resultdict import ResultDict` (gone in chardet 7) and the
  `result: ResultDict` annotation; `chardet.detect()` returns a plain mapping.
- Change the final `return encoding` to `return None`: if none of the five
  supported encodings can decode the bytes, the input is not text we handle.
  This makes binary detection version-independent (no longer echoes chardet's
  arbitrary low-confidence guess) and hardens `core.py`'s deny-fallback.

No confidence-threshold knob and no empty-string special-case are added (avoids
a magic number; empty -> utf-8 is acceptable since output is identical).

### C. Test expectations (10 updates, all toward more-correct behavior)
In `tests/unit/test_transcoder.py`:
- 8 empty-string cases: expected encoding `ASCII` -> `utf-8`.
- `binary_detect_large_binary`: `ISO-8859-1` -> `None` (routes through the
  None branch asserting the original bytes are returned).
- `encoding_convert_music_symbol_to_shift_jis`: expected bytes
  `b"Hello\xe2\x99\xaaWorld"` -> `b"Hello\x81\xf4World"`.
- `binary_detect_high_ascii`: unchanged (`None`, now version-independent).

In `tests/unit/test_document_render.py`:
- Two `errors.pydantic.dev/2.11/` -> `2.13/`.

## Verification

- `uv lock --check`
- `uv run ruff check` and `ruff format --check`
- `uv run mypy features/transcoder.py` (and the module's callers) under mypy 2.x
- `uv run pytest tests/unit/test_transcoder.py tests/unit/test_document_render.py`
  locally; full suite incl. e2e in CI.
- Manual re-run of the transcoder suite against chardet 7 must show 0 failures
  after the code + expectation changes.

## Disposition
- Single PR from `claude/pytest-parallel-markers-5mvkqk` (based on develop).
- Close #364 as superseded with a short comment linking this PR/issue.
- Auto-subscribe to the PR and drive to a terminal state; open a retrospective
  after merge.

## Out of scope
- No refactor of the detect/convert structure beyond the single final-return
  change. No new encodings. No changes to npm-group PR #357.
