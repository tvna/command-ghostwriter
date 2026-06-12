# CSV stdlib Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `features/config_parser.py` の CSV パスを pandas から stdlib `csv` へ置換し、pandas/numpy への import 依存を当モジュールとその単体テストから除去する。挙動は「Jinja レンダリング結果が変わるか」で確定した破壊面5件に厳密一致させる。

**Architecture:** 既存 `ConfigParser`(pydantic) の公開 IF・`BytesIO` 入力・`{csv_rows_name: [..]}` 出力形は不変。CSV パース本体だけを stdlib `csv.reader` + セル単位型推論(往復チェック付き) + loudness ハードニング(未終端クォート/実カラム無し)に差し替える。pandas は `streamlit` 経由の推移依存なので pyproject は変更しない(完全除去は P3)。

**Tech Stack:** Python 3.11+, stdlib `csv`, pydantic v2, pytest, uv。検証は CPython のみ(ブラウザ不要)で本環境/CI で完全実行可能。

**関連:** spec `docs/superpowers/specs/2026-06-12-streamlit-to-vercel-migration-design.md`、Issue #395。これは移行 P1 の中の「CSV 健全化」サブプラン(フロント実装は別プラン)。

---

## File Structure

| ファイル | 役割 | 変更 |
| --- | --- | --- |
| `features/config_parser.py` | CSV パース本体 | Modify: import 差替、ヘルパ2関数追加、`_parse_csv_data` 全面書換、`_handle_csv_nan_values` 削除、`parse()` の except 節から pd.errors 除去、docstring 整理 |
| `tests/unit/test_config_parser.py` | 単体テスト | Modify: numpy 除去、破壊面の期待値書換、メッセージ更新、前方互換/レンダリング層テスト追加 |

設計判断: 型推論と未終端クォート検出は **モジュールレベルの純関数** として切り出す(`ConfigParser` の状態に依存しない/単体テストしやすい/DRY)。

---

## 破壊面(実測確定・本プランで固定する契約)

| # | フィクスチャ | 旧(pandas) | 新(stdlib) | 対処 |
| --- | --- | --- | --- | --- |
| 1 | `csv_success_multi_nan_fill_empty_string` | `1.0`/`3.0` | `1`/`3` | 期待値を int へ書換 |
| 2 | `csv_success_numeric_nan_fill_na` | `100.0`/`300.0` | `100`/`300` | 期待値を int へ書換 |
| 3 | `csv_success_mismatched_columns` | index昇格行 | loud エラー | expected_dict→None、error メッセージ設定 |
| 4 | `csv_failure_unclosed_quote` | `EOF inside string` | loud エラー(自前検出) | error メッセージ更新 |
| 5 | `csv_failure_whitespace_only` | `No columns to parse` | loud エラー(自前検出) | 同一メッセージ維持(変更不要) |

`null-byte` / `empty_file` / `header_only` はメッセージ同一で維持。残り成功9件はレンダリング不変。

---

## Task 0: 環境セットアップとベースライン確認

**Files:** なし(環境のみ)

- [ ] **Step 1: 依存を同期**

Run: `uv sync`
Expected: 成功。`streamlit` 経由で `pandas`/`numpy` も入る(現行コードが import するため)。

- [ ] **Step 2: 対象テストのベースラインが緑であることを確認**

Run: `uv run pytest tests/unit/test_config_parser.py -q`
Expected: PASS(現行の pandas 実装に対する既存期待値で全通過)。この緑が出発点。

---

## Task 1: 型推論ヘルパと未終端クォート検出ヘルパ(純関数・TDD)

**Files:**
- Modify: `features/config_parser.py`(型エイリアス定義の直後、`class ConfigParser` の前にモジュール関数を追加)
- Test: `tests/unit/test_config_parser.py`(末尾に2つのテスト関数を追加)

- [ ] **Step 1: 失敗するテストを書く**

`tests/unit/test_config_parser.py` の末尾に追記:

```python
@UNIT
@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("1", 1),
        ("3", 3),
        ("100", 100),
        ("0", 0),
        ("-5", -5),
        ("007", "007"),       # 先頭ゼロは保持(float経由で 7.0 に化けない)
        ("1.0", 1.0),
        ("1.50", "1.50"),     # 末尾ゼロ付き小数リテラルは保持
        ("1e3", "1e3"),       # 指数表記文字列は保持
        ("3.14", 3.14),
        ("abc", "abc"),
        (" 1 ", " 1 "),       # 空白付きは文字列
    ],
)
def test_infer_scalar(raw: str, expected: Union[str, int, float]) -> None:
    from features.config_parser import _infer_scalar

    result = _infer_scalar(raw)
    assert result == expected
    assert type(result) is type(expected)


@UNIT
@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ('a,b\n1,2', False),
        ('col1,"col,2"\nval1,"v,al2"', False),   # 正しく閉じたクォート
        ('a,b,c\ncat,foo,bar\ndog,foo,"baz', True),  # 末尾の未終端クォート
        ('col1,col2\nval1"bad,val2', False),     # フィールド途中の " はリテラル(クォート開始ではない)
        ('x\n"a""b"', False),                     # エスケープされた "" を含む正常クォート
        ('x\n"unterminated', True),
    ],
)
def test_has_unterminated_quote(raw: str, expected: bool) -> None:
    from features.config_parser import _has_unterminated_quote

    assert _has_unterminated_quote(raw) is expected
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `uv run pytest tests/unit/test_config_parser.py -k "infer_scalar or unterminated_quote" -v`
Expected: FAIL(`ImportError: cannot import name '_infer_scalar'` / `_has_unterminated_quote`)。

- [ ] **Step 3: ヘルパを実装**

`features/config_parser.py` の型エイリアス群(`CSVData: TypeAlias = List[CSVRow]` の行)の直後に追加:

```python
def _infer_scalar(value: str) -> JSONScalarValue:
    """CSVセル文字列を int/float/str に推論する(往復チェック必須)。

    str(int(v)) == v なら int、次に str(float(v)) == v なら float、それ以外は str。
    float側の往復チェックが要点で、これが無いと "007" が float経由で 7.0 に化ける。
    """
    try:
        if str(int(value)) == value:
            return int(value)
    except ValueError:
        pass
    try:
        if str(float(value)) == value:
            return float(value)
    except ValueError:
        pass
    return value


def _has_unterminated_quote(data: str) -> bool:
    """data がクォート途中で終端しているなら True を返す。

    stdlib csv は未終端クォートを黙って受理するが pandas は拒否していた。loud な
    拒否契約を保つため明示検出する。クォートはフィールド先頭(レコード先頭または
    区切り直後)でのみ開始し、それ以外の位置の " はリテラル文字として扱う。
    """
    in_quotes = False
    at_field_start = True
    i = 0
    n = len(data)
    while i < n:
        ch = data[i]
        if in_quotes:
            if ch == '"':
                if i + 1 < n and data[i + 1] == '"':
                    i += 2
                    continue
                in_quotes = False
                at_field_start = False
        elif ch == '"' and at_field_start:
            in_quotes = True
            at_field_start = False
        elif ch in (",", "\n", "\r"):
            at_field_start = True
        else:
            at_field_start = False
        i += 1
    return in_quotes
```

- [ ] **Step 4: テストが通ることを確認**

Run: `uv run pytest tests/unit/test_config_parser.py -k "infer_scalar or unterminated_quote" -v`
Expected: PASS(全パラメータ)。

- [ ] **Step 5: コミット**

```bash
git add features/config_parser.py tests/unit/test_config_parser.py
git commit -m "feat: add stdlib CSV inference and unterminated-quote helpers

Refs #395"
```

---

## Task 2: CSV パース本体を stdlib へ置換(pandas/numpy 除去・破壊面固定)

**Files:**
- Modify: `features/config_parser.py`(import / `parse()` except 節 / `_parse_csv_data` / `_handle_csv_nan_values` 削除)
- Modify: `tests/unit/test_config_parser.py`(numpy 除去・期待値書換・メッセージ更新)

これは挙動の原子的スワップ。テスト期待値とパーサ実装を同一コミットで緑にする。

- [ ] **Step 1: import を差し替え**

`features/config_parser.py`:

削除: `import pandas as pd`(91行付近)
追加: import 群(`import pprint` の前)に `import csv` を追加。最終的な該当ブロックは:

```python
import csv
import pprint
import sys
import tomllib
from io import BytesIO, StringIO
from typing import ClassVar, Dict, Final, List, Optional, TypeAlias, Union, cast

import yaml
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr

from .validate_uploaded_file import FileSizeConfig, FileValidator
```

- [ ] **Step 2: `parse()` の except 節から pd.errors を除去**

`features/config_parser.py` の `parse()` 内 except タプルを次へ置換(pd.errors 3行を削除):

```python
        except (
            tomllib.TOMLDecodeError,
            yaml.MarkedYAMLError,
            yaml.reader.ReaderError,
            SyntaxError,
            TypeError,
            ValueError,
        ) as e:
            self._error_message = str(e)
            self._parsed_dict = None
            return False
```

- [ ] **Step 3: `_parse_csv_data` を全面書換、`_handle_csv_nan_values` を削除**

`features/config_parser.py` の現 `_parse_csv_data`(null byte チェック〜except 節)と直後の `_handle_csv_nan_values` メソッド全体を、次の単一メソッドで置換:

```python
    def _parse_csv_data(self, config_data: str) -> JSONDict:
        """CSVテキストを stdlib csv で {csv_rows_name: [{col: value}, ...]} にパースする。

        Raises:
            ValueError: NULLバイト/未終端クォート/カラム無し/データ行無し/
                ヘッダより列数が多い行 のいずれかで送出。
        """
        # 明示チェック(loud)。pandas が拒否していた入力を stdlib でも拒否する。
        if "\x00" in config_data:
            raise ValueError("Failed to parse CSV: Null byte detected in input data.")
        if _has_unterminated_quote(config_data):
            raise ValueError("Failed to parse CSV: unterminated quoted field.")

        rows: List[List[str]] = [row for row in csv.reader(StringIO(config_data)) if row]
        if not rows or all(cell.strip() == "" for cell in rows[0]):
            raise ValueError("No columns to parse from file")

        header: Final[List[str]] = rows[0]
        body: Final[List[List[str]]] = rows[1:]
        if not body:
            raise ValueError("CSV file must contain at least one data row.")

        # 補完値: 有効かつ非None のときだけ採用。無効/None のとき空セルは float('nan')。
        fill_value: Final[Optional[str]] = (
            self._fill_nan_with if (self._is_enable_fill_nan and self._fill_nan_with is not None) else None
        )

        mapped_list: CSVData = []
        for index, raw_row in enumerate(body):
            if len(raw_row) > len(header):
                raise ValueError(f"Failed to parse CSV: row {index + 1} has more fields than the header.")
            cells = raw_row + [""] * (len(header) - len(raw_row))
            row_dict: CSVRow = {}
            for column, cell in zip(header, cells):
                if cell == "":
                    row_dict[column] = fill_value if fill_value is not None else float("nan")
                else:
                    row_dict[column] = _infer_scalar(cell)
            mapped_list.append(row_dict)

        return {self.csv_rows_name: cast("JSONValue", mapped_list)}
```

注意: `_handle_csv_nan_values` は完全に削除する(参照は他に無い)。

- [ ] **Step 4: テストの numpy 依存を除去**

`tests/unit/test_config_parser.py`:

(a) 26行 `import numpy as np` を `import math` に置換。

(b) ヘルパ `_assert_csv_values_equal`(100-102行)の `np.isnan` を `math.isnan` に置換(2箇所):

```python
    if isinstance(e_val, float) and math.isnan(e_val):
        assert isinstance(p_val, float), f"CSV row {row_idx}, key '{key}' NaN check: Type mismatch: Got {type(p_val)}, Expected float"
        assert math.isnan(p_val), f"CSV row {row_idx}, key '{key}' NaN check: Value mismatch: Got {p_val}, Expected NaN"
```

(c) `csv_success_nan_no_fill`(839行付近)の `np.nan` を `float("nan")` に置換:

```python
            {"csv_rows": [{"col1": "val1", "col2": float("nan")}, {"col1": "val2", "col2": "val3"}]},
```

- [ ] **Step 5: 破壊面 #1/#2 の期待値を int へ書換**

`tests/unit/test_config_parser.py`:

(a) `csv_success_multi_nan_fill_empty_string`(919/921行)の `float(1.0)`→`1`、`float(3.0)`→`3`:

```python
                    {"col_a": 1, "col_b": "alpha", "col_c": ""},
                    {"col_a": "", "col_b": "beta", "col_c": "gamma"},
                    {"col_a": 3, "col_b": "", "col_c": "delta"},
```

(b) `csv_success_numeric_nan_fill_na`(936/938行)の `100.0`→`100`、`300.0`→`300`:

```python
                    {"id": 1, "value": 100, "category": "A"},
                    {"id": 2, "value": "N/A", "category": "B"},
                    {"id": 3, "value": 300, "category": "C"},
```

- [ ] **Step 6: 破壊面 #3/#4 を loud エラーへ更新**

`tests/unit/test_config_parser.py`:

(a) `csv_success_mismatched_columns`(956-964行の pytest.param)を、受理→loud エラーへ。`id` は `csv_failure_mismatched_columns` に変更し、`expected_dict` を `NO_EXPECTED_DICT`、`expected_parse_error` をメッセージへ:

```python
        pytest.param(
            b"col1,col2\nval1,val2,val3\nval4,val5",  # Row 1 has too many columns -> loud error
            "mismatched_cols.csv",
            DEFAULT_CSV_ROWS_NAME,
            SHOULD_NOT_FILL_NAN,
            DEFAULT_FILL_VALUE,
            NO_EXPECTED_INITIAL_ERROR,
            NO_EXPECTED_DICT,
            "Failed to parse CSV: row 1 has more fields than the header.",
            id="csv_failure_mismatched_columns",
        ),
```

(b) `csv_failure_unclosed_quote`(1040行)の `expected_parse_error` を更新:

```python
            "Failed to parse CSV: unterminated quoted field.",
```

注意: `csv_failure_whitespace_only`(1062行 `"No columns to parse from file"`)、`csv_failure_empty_file`、null-byte 系、`csv_failure_header_only*` はメッセージ同一のため**変更しない**。

- [ ] **Step 7: 対象テスト全体を実行して緑を確認**

Run: `uv run pytest tests/unit/test_config_parser.py -q`
Expected: PASS(全 CSV ケース。`pytest-randomly` のシード差異があっても結果不変)。

- [ ] **Step 8: コミット**

```bash
git add features/config_parser.py tests/unit/test_config_parser.py
git commit -m "refactor: replace pandas CSV path with stdlib csv parser

Drops pandas/numpy import from config_parser and its unit tests. Pins the
measured breaking set: numeric-with-blank columns no longer float-promote
(1.0->1), ragged rows and unterminated quotes now raise loudly.

Refs #395"
```

---

## Task 3: レンダリング層ゴールデン + 前方互換テストの追加

**Files:**
- Modify: `tests/unit/test_config_parser.py`(`test_parse_csv` の parametrize に成功ケース追加 + レンダリング層テスト関数追加)

- [ ] **Step 1: 失敗するテストを書く(前方互換: 推論の end-to-end)**

`tests/unit/test_config_parser.py` の `test_parse_csv` parametrize リスト末尾(`csv_failure_whitespace_only` の後)に追加:

```python
        pytest.param(
            b"a,b\n1,x\n,y",  # int column with a blank must NOT float-promote
            "int_blank.csv",
            DEFAULT_CSV_ROWS_NAME,
            SHOULD_NOT_FILL_NAN,
            DEFAULT_FILL_VALUE,
            NO_EXPECTED_INITIAL_ERROR,
            {"csv_rows": [{"a": 1, "b": "x"}, {"a": float("nan"), "b": "y"}]},
            NO_EXPECTED_RUNTIME_ERROR,
            id="csv_success_int_with_blank_no_promotion",
        ),
        pytest.param(
            b"code\n007",  # leading zeros preserved as string
            "code.csv",
            DEFAULT_CSV_ROWS_NAME,
            SHOULD_NOT_FILL_NAN,
            DEFAULT_FILL_VALUE,
            NO_EXPECTED_INITIAL_ERROR,
            {"csv_rows": [{"code": "007"}]},
            NO_EXPECTED_RUNTIME_ERROR,
            id="csv_success_preserve_leading_zero",
        ),
```

- [ ] **Step 2: 失敗するテストを書く(レンダリング層ゴールデン)**

同ファイル末尾に関数を追加:

```python
@UNIT
def test_csv_render_layer_parity() -> None:
    """数値列に空セルがある CSV の Jinja レンダリング結果が float 昇格を含まないことを固定する。"""
    from jinja2 import Environment

    config_file = BytesIO(b"id,value\n1,100\n2,\n3,300")
    config_file.name = "render.csv"
    parser = ConfigParser(config_file=config_file)
    parser.enable_fill_nan = True
    parser.fill_nan_with = "N/A"
    assert parser.parse() is True

    template = Environment().from_string("{% for r in csv_rows %}{{ r.id }}:{{ r.value }}\n{% endfor %}")
    rendered = template.render(**parser.parsed_dict)

    assert rendered == "1:100\n2:N/A\n3:300\n"  # not "1:100.0" / "3:300.0"
```

- [ ] **Step 3: 失敗を確認**

Run: `uv run pytest tests/unit/test_config_parser.py -k "no_promotion or leading_zero or render_layer_parity" -v`
Expected: 追加直後は実装済み(Task 2)のため **PASS する**。もし FAIL する場合は Task 2 の実装差分を見直す(このテスト群は Task 2 の契約の再確認であり、回帰検出が目的)。

- [ ] **Step 4: 対象テスト全体で緑を確認**

Run: `uv run pytest tests/unit/test_config_parser.py -q`
Expected: PASS。

- [ ] **Step 5: コミット**

```bash
git add tests/unit/test_config_parser.py
git commit -m "test: pin CSV inference and render-layer parity as regression golden

Refs #395"
```

---

## Task 4: docstring 整理と最終検証

**Files:**
- Modify: `features/config_parser.py`(pandas 言及の docstring を実態へ)

- [ ] **Step 1: docstring の pandas 言及を更新**

`features/config_parser.py` 内の以下の記述を stdlib 実態へ書換(機能説明のみ。コードには影響なし):
- モジュール docstring: `- pandas: CSVデータの処理` → `- csv (stdlib): CSVデータの処理`
- `- pandasによるパース` → `- stdlib csv によるパース`
- `- pandas.errors: CSVパースエラー`(2箇所: モジュール/クラス docstring) → `- ValueError: CSVパースエラー`
- クラス docstring `- CSV: pandasによる高度なデータ処理` → `- CSV: stdlib csv によるパースとセル単位型推論`
- `_parse_by_file_type` の Raises から `pd.errors.ParserError` 言及を削除し `ValueError` に集約

- [ ] **Step 2: モジュール/テストに pandas・numpy 参照が残っていないことを確認**

Run: `grep -nE "pandas|numpy|\bnp\.|\bpd\." features/config_parser.py tests/unit/test_config_parser.py`
Expected: 出力なし(exit 1)。残存があれば修正。

- [ ] **Step 3: 対象テストの完全実行**

Run: `uv run pytest tests/unit/test_config_parser.py -q`
Expected: PASS。

- [ ] **Step 4: Lint と型チェック(可能な範囲)**

Run: `uv run ruff check features/config_parser.py tests/unit/test_config_parser.py`
Expected: PASS(エラーなし)。

Run: `uv run mypy features/config_parser.py`
Expected: PASS。型エラーが出る場合のみ修正(`cast`/`Final` の整合)。
注意: mypy/pyre がこの環境で起動不能な場合は「未検証」と明記し、間接シグナルで代替しない(spec 検証方針準拠)。

- [ ] **Step 5: 退行確認(features 全体)**

Run: `uv run pytest tests/unit -q`
Expected: PASS(CSV 変更が他モジュールに退行を与えていないこと。`document_render` 等が `csv_rows` を消費する場合の結合も含む)。失敗時は systematic-debugging で原因を特定してから修正。

- [ ] **Step 6: コミット**

```bash
git add features/config_parser.py
git commit -m "docs: update config_parser docstrings to stdlib csv reality

Refs #395"
```

---

## Self-Review チェック結果

- **Spec coverage**: spec「CSV処理の刷新」の各項目を被覆 — 往復チェック付き推論(Task1/3)、空セル補完/未補完 nan(Task2 #4/#5/#7)、不揃い行 loud(Task2 #6)、明示チェック+loudness ハードニング(Task1/Task2)、レンダリング層ゴールデン(Task3)、numpy 除去(Task2 #4)、破壊面5件固定(Task2/3)。pandas 完全除去(pyproject/streamlit)は spec 通り P3 で別途。
- **Placeholder scan**: TODO/TBD/「適切に」等なし。全コードブロックは実コード。
- **Type consistency**: `_infer_scalar`/`_has_unterminated_quote` の名称・シグネチャは Task1 定義と Task2/3 使用で一致。`CSVRow`/`CSVData`/`JSONScalarValue`/`JSONValue` は既存エイリアスを使用。`fill_value` は `Optional[str]`、空セルは `float("nan")` で一貫。

## 既知の前提と非対象

- pandas/numpy の**依存ツリーからの完全除去**は streamlit 撤去(P3)で行う。本プランは import 除去まで。
- `pandas-stubs`(dev)は本変更で当モジュール的には不要化するが、scope を絞るため本プランでは触らない(P3 で整理)。
- 本プランは CPython 単体で完全検証可能。ブラウザ/Pyodide 検証は対象外(フロント別プラン)。
