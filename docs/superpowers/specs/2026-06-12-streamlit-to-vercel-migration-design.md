# 設計: Streamlit -> Vercel ブラウザ内Python(Pyodide) 移行 [UI刷新]

- Issue: #395
- ブランチ: claude/japanese-greeting-v1mf05
- 日付: 2026-06-12

## 背景と目的

現行UIはStreamlitアプリ[`app.py`]。これをライブプレビュー型のモダンUIに刷新し、無料でホスティングする。オーナーと合意した優先順位は **UX最優先・無料次点**。

方針: テスト済みのPython中核[`features/`]を**ブラウザ内[Pyodide]でそのまま再利用**し、**完全静的サイト**として作り直す。バックエンドもサーバレス関数も持たない。これにより関数呼び出し上限のない真の無料・瞬時プレビューが得られる。

ゴール:
1. 主要フロー[コマンド生成]をライブプレビュー型の体験に刷新する。
2. テスト済みPython中核[`features/`]を可能な限り無改変で再利用する。
3. Vercelに無料[Hobby]で静的デプロイする。
4. アカウント作成からのデプロイ・ランブックを成果物に含める。

## 検討の経緯と確定した分岐

ブレインストーミングで以下を順に確定した[各分岐の根拠を併記]。

| 分岐 | 確定 | 根拠 |
| --- | --- | --- |
| ホスティング方式 | ブラウザ内実行[Pyodide/完全静的] | 無料で上限なし・瞬時プレビュー・Python中核再利用 |
| pandas | **撤去 -> stdlib健全化** | セキュリティ/依存削減・コード純度/クセ排除・UXスタール排除・ランタイム可搬性の4動機を唯一全て満たす |
| フロントスタック | Vite + React + TypeScript + CodeMirror 6 | 計算は全てPyodide側でSSR不要。エディタ系エコシステムが成熟。Vite静的出力はVercel無料枠に直載り |
| 入力方式 | インライン・エディタ型 | ライブプレビューのUX効果が最大 |
| デプロイ連携 | Vercel純正Git連携 | GitHubにトークン非保管でシークレット面最小。静的なのでCI再ビルドの必然性が薄い |

## アーキテクチャ

```
ブラウザ[Vercel静的ホスティング・無料・関数上限なし]
├─ UIスレッド [Vite + React + TypeScript]
│   ├─ 2エディタ [CodeMirror 6]: 設定[toml/yaml/csv] / テンプレ[jinja2]・D&D対応
│   ├─ ライブプレビュー: [テキスト][Markdown][設定デバッグ] 切替 [旧tab1+tab2統合]
│   ├─ 設定ドロワー [旧tab3 全項目]
│   ├─ サンプル投入メニュー [旧tab4 / assets/examples を静的配信]
│   ├─ 使い方モーダル [旧tab5 ワークフローSVG]
│   ├─ ダウンロード [クライアント側 Blob]
│   └─ i18n: UIラベルは TSカタログ [日本語既定]
└─ Pyodide Web Worker [self-host・CDN非依存]
    ├─ features/ をそのまま読込 [core / document_render / transcoder / validate_*]
    ├─ micropip: jinja2, pyyaml, pydantic, python-box, toml, chardet, markupsafe
    └─ pandas / numpy: 不採用 [CSVはstdlib化]
```

### モジュール境界

- `features/` は **config_parserのCSVパス以外は無改変**。`AppCore`は`BytesIO`[`.name`付き]を受ける既存IFを維持し、Worker側でエディタ文字列を`BytesIO`にラップして渡す。
- Worker <-> UI は薄い`postMessage`契約[`init` / `generate` / `ready` / `error`]。UIはPythonを、WorkerはReactを知らない。

### データフロー[ライブプレビュー]

編集 -> **250msデバウンス** -> Worker送信 -> `AppCore.load_config_file -> load_template_file -> apply` -> 結果/エラー返信 -> プレビュー更新。重処理はWorker内でUI非ブロッキング。

### エラー処理

`AppCore`のエラーメッセージ[`config_error_message` / `template_error_message`]をプレビュー上部の**インラインバナー**[赤=パース失敗 / 黄=ファイル不足]で表示。失敗時も入力を保持する。

## CSV処理の刷新 [pandas撤去・健全化]

`features/config_parser.py` の `_parse_csv_data` / `_handle_csv_nan_values` を stdlib `csv` ベースに書き換え、pandas[および推移的なnumpy]を撤去する。

### 新CSV仕様[予測可能・loud]

- **パース**: stdlib `csv`。クォート内カンマ・改行は標準処理。ヘッダ/データの空白は保持[既存テスト `csv_success_whitespace_in_header_data` 準拠]。
- **セル単位型推論**: `str(int(v)) == v` が成立する時のみint、次にfloat、それ以外は文字列。`007` や `1.0` の情報損失を防ぐ。
  - 既存テストの比較ヘルパ `_assert_csv_values_equal` がint/float差を許容するため、数値列の期待値[行911/928]はセル単位推論でも通る見込み。
- **空セル**: 補完ON -> 補完文字[既定`#`] / 補完OFF -> `float('nan')`[既存の未補完NaN意味論を維持。テスト `csv_success_nan_no_fill` 準拠]。
- **不揃い行**: 短い行 -> NaN/補完でパッド。**ヘッダより列が多い行 -> 明示的なパースエラー**[loud]。pandasの「先頭列をindexに昇格」クセ[テスト `csv_success_mismatched_columns` が固定化していた挙動]を廃止する。
- **明示チェック維持**: NULLバイト検出・ヘッダのみ[データ行なし]・空ファイルは既存どおりエラー化。pandas例外型[`pd.errors.ParserError` / `EmptyDataError`]はローカル例外[または`ValueError`]に置換し、`parse()` の except 節も更新する。
- **文字コード堅牢性**: `chardet` / `TextTranscoder` で維持[pandas非依存]。現実のCSVで最も怖い文字コード問題はpandasの担当ではなかったため、堅牢性の主要部分は失われない。

### 破壊的変更の扱い

CSVの不揃い行・dtypeの細部が変わるため**破壊的変更**。README/CHANGELOGに明記する[v0.0.0のpre-1.0なので許容]。pandas固有挙動を固定していたテストケース[特に `csv_success_mismatched_columns` のerror化]は期待値を新仕様へ書き換え、テスト側の`numpy`依存も除去する。

### 行数バランス [standards: 純度を伴う規模]

pandas固有コード[`_handle_csv_nan_values` のobject変換・例外ラップ等 約40行]を削除し、stdlibパーサ[約50行]を追加。純増は最小限に抑え、増分が出る場合はコミット前に明示的に正当化する。

## テスト戦略

- **`features/` ユニットテスト**: CPythonでCI継続。CSVケースは期待値書換・`numpy`依存除去。
- **新規フロント**: Vitest[コンポーネント] + Playwright[ビルド済み静的サイトへのe2e、旧Streamlit e2eを置換]。
- **統合スモーク**: 既知 config + template -> 期待出力 を Playwright で検証し、Python-in-browser の動作を保証する。
- **検証可否の明記[standards準拠]**: ブラウザ実行を要するe2e/スモークはローカル/CIでブラウザを起動できる前提。起動不能な環境では「未検証」と明記し、間接シグナルで代替しない。

## 段階移行

| Phase | 内容 |
| --- | --- |
| **P1[最初の実装プラン]** | 静的シェル + Pyodide worker + 2エディタ + ライブ出力[テキスト/MD] + 設定ドロワー + サンプル + DL + CSV健全化。Vercelデプロイ。主要UX置換 |
| P2 | 設定デバッグ表示[JSON/TOML/YAML] + 使い方モーダル + 設定パリティ + 仕上げ |
| P3 | テスト移行完了 + **Streamlit撤去**[`app.py` / `streamlit`依存 / `.streamlit/`] + README/devcontainer/CIデプロイ更新 |

Streamlitは新UIがパリティ到達のP3まで残置し、`main`を壊さない移行とする。

## リスクと対応

1. ~~pydantic x Pyodide~~ -> **対応確認済み**[PEP 783 emscriptenホイール]。当初「最大リスク」は解消。
2. 初回Pyodideロード重量 -> Web Worker + ローディングUI + pandas不採用で軽量化。
3. CSV破壊的変更 -> README/CHANGELOG明記、テストで新仕様を固定。
4. 自前CSVパーサの堅牢性 -> 文字コードは`chardet`が担当、入力は小さな設定CSV[30MB上限・150MBメモリガード]で、未知の汚いデータ処理は非対象。

## 成果物

1. 本設計spec[本ファイル]。
2. Vercelデプロイ・ランブック[アカウント作成から]: `docs/runbooks/vercel-deploy.md`。シークレット取扱標準[発行経路・保管先・最小権限・失効/ローテーション・疎通確認]に準拠。
3. 実装プラン: `docs/superpowers/plans/` 配下[writing-plansで作成]。
