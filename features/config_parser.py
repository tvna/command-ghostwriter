"""アップロードされた設定ファイルのパースを行うモジュール。

このモジュールは、設定ファイルのパース機能を提供します。
主な機能:
- 設定ファイルの検証とパース
- メモリ使用量の制限
- CSVデータの特殊処理

クラス階層:
- ConfigParser: メインのパースクラス (Pydanticモデル)
  - FileValidator: ファイルサイズの検証
  - csv (stdlib): CSVデータの処理

検証プロセス:
1. 入力検証
   - Pydanticモデルによるバリデーション
   - ファイルサイズの制限チェック
   - サポートされているファイル形式の確認

2. ファイル処理
   - エンコーディングの検証 (UTF-8)
   - ファイル拡張子の抽出
   - ファイル内容の読み込み

3. パース処理
   - ファイル形式に応じたパース (TOML/YAML/CSV)
   - CSVデータの特殊処理 (NaN値の処理)
   - パース結果の辞書変換

4. メモリ管理
   - パース結果のメモリ使用量チェック
   - 文字列変換時のメモリ制限
   - エラー時のメモリ解放

対応ファイル形式:
- TOML (.toml)
  - tomllibによるパース
  - 厳密な構文チェック
- YAML (.yaml, .yml)
  - PyYAMLによる安全なパース
  - 辞書形式の検証
- CSV (.csv)
  - stdlib csv によるパース
  - NaN値の柔軟な処理
  - カスタム行名の設定

エラー処理:
- ValidationError: Pydanticによる検証エラー
- ValueError: ファイルサイズ、形式、構文エラー
- UnicodeError: エンコーディングエラー
- MemoryError: メモリ制限超過
- YAMLError: YAML構文エラー
- TOMLDecodeError: TOML構文エラー
- ValueError: CSVパースエラー

メモリ管理:
- ファイルサイズ制限: 30MB
- メモリ使用量制限: 150MB
- 大きなファイルの安全な処理
- メモリリークの防止

典型的な使用方法:
```python
with open('config.toml', 'rb') as f:
    config_file = BytesIO(f.read())
    parser = ConfigParser(config_file)
    if parser.parse():
        config_dict = parser.parsed_dict
        config_str = parser.parsed_str
```

CSVファイルの特殊処理:
```python
with open('data.csv', 'rb') as f:
    config_file = BytesIO(f.read())
    parser = ConfigParser(config_file)
    parser.csv_rows_name = 'items'      # カスタム行名の設定
    parser.enable_fill_nan = True       # NaN値の処理を有効化
    parser.fill_nan_with = ''          # NaN値を空文字列で置換
    if parser.parse():
        csv_data = parser.parsed_dict
```
"""

import csv
import math
import pprint
import sys
import tomllib
from io import BytesIO, StringIO
from typing import ClassVar, Dict, Final, List, Optional, TypeAlias, Union, cast

import yaml
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr

from .validate_uploaded_file import FileSizeConfig, FileValidator

# Type aliases for complex types
JSONScalarValue: TypeAlias = Union[str, int, float, bool, None]
# Revert to recursive definition without Any
JSONValue: TypeAlias = Union[JSONScalarValue, List["JSONValue"], Dict[str, "JSONValue"]]
JSONDict: TypeAlias = Dict[str, JSONValue]
CSVRow: TypeAlias = Dict[str, JSONScalarValue]
# Keep CSVData specific as List[CSVRow]
CSVData: TypeAlias = List[CSVRow]


def _infer_scalar(value: str) -> JSONScalarValue:
    """CSVセル文字列を int/float/str に推論する(往復チェック必須)。

    str(int(v)) == v なら int、次に str(float(v)) == v なら float、それ以外は str。
    float側の往復チェックが要点で、これが無いと "007" が float経由で 7.0 に化ける。
    IEEE特殊値("nan"/"inf"/"-inf")は文字列のまま保持する(空セル番兵 float('nan') と
    衝突させない / JSON非互換を避ける)。
    """
    try:
        if str(int(value)) == value:
            return int(value)
    except ValueError:
        pass
    try:
        parsed_float = float(value)
        if not (math.isnan(parsed_float) or math.isinf(parsed_float)) and str(parsed_float) == value:
            return parsed_float
    except ValueError:
        pass
    return value


def _has_unterminated_quote(data: str) -> bool:
    """data がクォート途中で終端しているなら True を返す。

    stdlib csv は未終端クォートを黙って受理するが、loud な
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


def _coerce_cell(cell: str, fill_value: Optional[str]) -> JSONScalarValue:
    """空セルは補完値[無ければ float('nan')]、それ以外はセル単位推論を適用する。"""
    if cell == "":
        return fill_value if fill_value is not None else float("nan")
    return _infer_scalar(cell)


def _build_csv_row(header: List[str], raw_row: List[str], index: int, fill_value: Optional[str]) -> CSVRow:
    """1データ行を {列名: 値} に変換する。短い行はパッド、列超過は loud エラー。"""
    if len(raw_row) > len(header):
        raise ValueError(f"Failed to parse CSV: row {index + 1} has more fields than the header.")
    cells = raw_row + [""] * (len(header) - len(raw_row))
    return {column: _coerce_cell(cell, fill_value) for column, cell in zip(header, cells, strict=True)}


def _read_csv_table(config_data: str) -> tuple[List[str], List[List[str]]]:
    """CSVテキストを (ヘッダ, データ行群) に分解する。pandasが拒否していた入力をloud化する。

    Raises:
        ValueError: NULLバイト/未終端クォート/カラム無し[空・空白のみ]/データ行無し。
    """
    if "\x00" in config_data:
        raise ValueError("Failed to parse CSV: Null byte detected in input data.")
    if _has_unterminated_quote(config_data):
        raise ValueError("Failed to parse CSV: unterminated quoted field.")

    rows: List[List[str]] = [row for row in csv.reader(StringIO(config_data)) if row]
    if not rows or all(cell.strip() == "" for cell in rows[0]):
        raise ValueError("No columns to parse from file")
    if len(rows) < 2:
        raise ValueError("CSV file must contain at least one data row.")
    return rows[0], rows[1:]


class ConfigParser(BaseModel):
    """設定ファイルのパースを行うクラス。

    設定ファイルの検証、パース、メモリ管理を一貫して処理します。
    Pydanticモデルによる厳密な入力検証とメモリ使用量の制限を提供します。

    主な機能:
    1. ファイル処理
       - サポートされている形式の検証
       - ファイルサイズの制限
       - UTF-8エンコーディングの確認

    2. パース処理
       - TOML: tomllibによる厳密なパース
       - YAML: safe_loadによる安全なパース
       - CSV: stdlib csv によるパースとセル単位型推論
         - NaN値の柔軟な処理
         - カスタム行名の設定
         - 型変換の自動処理

    3. メモリ管理
       - ファイルサイズの制限
       - パース結果のメモリ監視
       - 文字列変換時の制限

    Attributes:
        MAX_FILE_SIZE_BYTES: ファイルサイズの上限 [バイト]
            デフォルト: 30MB
        MAX_MEMORY_SIZE_BYTES: メモリ使用量の上限 [バイト]
            デフォルト: 150MB
        SUPPORTED_EXTENSIONS: サポートされているファイル拡張子
            [toml, yaml, yml, csv]

    Properties:
        parsed_dict: パース結果の辞書 (エラー時はNone)
        parsed_str: パース結果の文字列表現 (エラー時は"None")
        error_message: エラーメッセージ (エラーがない場合はNone)
        csv_rows_name: CSV行のキー名 (デフォルト: "csv_rows")
        enable_fill_nan: NaN値を置換するかどうか
        fill_nan_with: NaN値の置換値

    エラー処理:
    - ValidationError: 入力値の検証エラー
    - ValueError: ファイルサイズ、形式、構文エラー
    - UnicodeError: エンコーディングエラー
    - MemoryError: メモリ制限超過
    - YAMLError: YAML構文エラー
    - TOMLDecodeError: TOML構文エラー
    - ValueError: CSVパースエラー
    """

    # Constants for size limits as class variables
    MAX_FILE_SIZE_BYTES: ClassVar[int] = 30 * 1024 * 1024  # 30MB
    MAX_MEMORY_SIZE_BYTES: ClassVar[int] = 150 * 1024 * 1024  # 150MB
    SUPPORTED_EXTENSIONS: ClassVar[List[str]] = ["toml", "yaml", "yml", "csv"]

    # Public fields for validation
    config_file: BytesIO = Field(..., description="設定ファイルのバイナリデータ")
    csv_rows_name: str = Field("csv_rows", min_length=1, description="CSV行のキー名")

    # Private attributes
    _file_extension: str = PrivateAttr()
    _config_data: Optional[str] = PrivateAttr(default=None)
    _parsed_dict: Optional[JSONDict] = PrivateAttr(default=None)
    _error_message: Optional[str] = PrivateAttr(default=None)
    _is_enable_fill_nan: bool = PrivateAttr(default=False)
    _fill_nan_with: Optional[str] = PrivateAttr(default=None)

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(self, config_file: BytesIO) -> None:
        """ConfigParserの初期化メソッド。

        Args:
            config_file: 設定ファイルのバイナリデータ
        """

        # Pydanticモデルの初期化
        super().__init__(config_file=config_file)

        # ファイルサイズの検証
        file_validator = FileValidator(size_config=FileSizeConfig(max_size_bytes=self.MAX_FILE_SIZE_BYTES))
        if not file_validator.validate_size(config_file):
            self._error_message = file_validator.error_message
            return

        # ファイル拡張子の抽出
        self._file_extension = self.config_file.name.split(".")[-1]
        if self._file_extension not in self.SUPPORTED_EXTENSIONS:
            self._error_message = "Unsupported file type"
            return

        try:
            self._config_data = self.config_file.read().decode("utf-8")
        except UnicodeDecodeError as e:
            self._error_message = str(e)

    def parse(self) -> bool:
        """設定ファイルをパースして辞書に変換します。

        Returns:
            成功した場合はTrue、失敗した場合はFalse
        """
        if self._config_data is None:
            return False

        try:
            self._parsed_dict = self._parse_by_file_type(self._config_data)
            return True
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

    def _parse_by_file_type(self, config_data: str) -> JSONDict:
        """ファイルタイプに応じたパース処理を行います。

        Returns:
            パースされた辞書

        Raises:
            SyntaxError: YAMLファイルが辞書形式でない場合
            ValueError: CSV行名が1文字未満の場合または設定データがNoneの場合
        """

        match self._file_extension:
            case "toml":
                # tomllib.loads is assumed to return a structure compatible with JSONDict
                return tomllib.loads(config_data)
            case "yaml" | "yml":
                try:
                    parsed_data: Final[JSONValue] = yaml.safe_load(config_data)
                    if not isinstance(parsed_data, dict):
                        raise SyntaxError("Invalid YAML file loaded.")
                    # Type checker knows it's a dict here, no cast needed.
                    return parsed_data
                except yaml.MarkedYAMLError as e:
                    # Re-raise the original exception to preserve marks for tests
                    raise e from e
            case "csv":
                return self._parse_csv_data(config_data)

        return {}

    def _parse_csv_data(self, config_data: str) -> JSONDict:
        """CSVテキストを stdlib csv で {csv_rows_name: [{col: value}, ...]} にパースする。

        Raises:
            ValueError: NULLバイト/未終端クォート/カラム無し/データ行無し/
                ヘッダより列数が多い行 のいずれかで送出。
        """
        header, body = _read_csv_table(config_data)

        # 補完値: 有効かつ非None のときだけ採用。無効/None のとき空セルは float('nan')。
        fill_value: Final[Optional[str]] = (
            self._fill_nan_with if (self._is_enable_fill_nan and self._fill_nan_with is not None) else None
        )

        mapped_list: CSVData = [_build_csv_row(header, raw_row, index, fill_value) for index, raw_row in enumerate(body)]
        return {self.csv_rows_name: cast("JSONValue", mapped_list)}

    def _validate_memory_size(self, obj: Union[JSONDict, str]) -> bool:
        """メモリサイズのバリデーションを行います。

        Args:
            obj: 検証するオブジェクト

        Returns:
            メモリサイズが上限以内の場合はTrue、超える場合はFalse
        """
        try:
            memory_size: Final[int] = sys.getsizeof(obj)
            if memory_size > self.MAX_MEMORY_SIZE_BYTES:
                self._error_message = f"Memory consumption exceeds the maximum limit of 150MB (actual: {memory_size / (1024 * 1024):.2f}MB)"
                return False
            return True
        except (MemoryError, OverflowError) as e:
            self._error_message = f"Memory error while checking size: {e!s}"
            return False

    @property
    def parsed_dict(self) -> Optional[JSONDict]:
        """パースされた辞書を返します。エラーが発生した場合やメモリ消費量が上限を超える場合はNoneを返します。

        Returns:
            パースされた辞書
        """
        if self._parsed_dict is None:
            return None

        # メモリサイズのバリデーション
        if not self._validate_memory_size(self._parsed_dict):
            return None

        return self._parsed_dict

    @property
    def parsed_str(self) -> str:
        """パースされた辞書を文字列として返します。エラーが発生した場合は"None"を返します。
        メモリ消費量が上限を超える場合はエラーメッセージを設定し、"None"を返します。

        Returns:
            パースされた辞書の文字列表現
        """
        if self._parsed_dict is None:
            return "None"

        try:
            # Format the dictionary to string
            formatted_str = pprint.pformat(self._parsed_dict)

            # Validate memory size
            if not self._validate_memory_size(formatted_str):
                return "None"

            return formatted_str
        except (MemoryError, OverflowError) as e:
            self._error_message = f"Memory error while formatting dictionary: {e!s}"
            return "None"

    @property
    def error_message(self) -> Optional[str]:
        """エラーメッセージを返します。

        Returns:
            エラーメッセージ
        """
        return self._error_message

    @property
    def enable_fill_nan(self) -> bool:
        """NaNを埋めるオプションが有効かどうかを取得します。

        Returns:
            NaNを埋めるオプションが有効であればTrue、そうでなければFalse
        """
        return self._is_enable_fill_nan

    @enable_fill_nan.setter
    def enable_fill_nan(self, is_fillna: bool) -> None:
        """NaNを埋めるオプションを設定します。

        Args:
            is_fillna: NaNを埋めるオプションを有効にするかどうか
        """
        self._is_enable_fill_nan = is_fillna

    @property
    def fill_nan_with(self) -> Optional[str]:
        """NaNを埋める際の値を取得します。

        Returns:
            NaNを埋める際の値
        """
        return self._fill_nan_with

    @fill_nan_with.setter
    def fill_nan_with(self, fillna_value: str) -> None:
        """NaNを埋める際の値を設定します。

        Args:
            fillna_value: NaNを埋める際の値
        """
        self._fill_nan_with = fillna_value
