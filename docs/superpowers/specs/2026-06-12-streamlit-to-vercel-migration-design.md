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
- **セル単位型推論[往復チェック必須]**: 次の順で判定する。
  - `str(int(v)) == v` -> `int`
  - `str(float(v)) == v` -> `float`
  - それ以外 -> 文字列
  - float側にも往復チェックを課すのが要点。これが無いと `007` が float経由で `7.0` に化ける[実測で確認した初期ルールの欠陥]。本ルールなら `007`->`007`、`1.0`->`1.0`、`1.50`->`1.50`、`1e3`->`1e3` を保持する。
  - 合否は dict比較ヘルパ `_assert_csv_values_equal` ではなく、後述の**レンダリング層ゴールデン**で判定する。
- **空セル**: 補完ON -> 補完文字[既定`#`] / 補完OFF -> `float('nan')`[既存の未補完NaN意味論を維持。テスト `csv_success_nan_no_fill` 準拠]。
- **不揃い行**: 短い行 -> NaN/補完でパッド。**ヘッダより列が多い行 -> 明示的なパースエラー**[loud]。pandasの「先頭列をindexに昇格」クセ[テスト `csv_success_mismatched_columns` が固定化していた挙動]を廃止する。
- **明示チェック維持＋loudnessハードニング**: NULLバイト検出・ヘッダのみ[データ行なし]・空ファイルは既存どおりエラー化。加えて、stdlib `csv` はpandasより寛容なため[実測で判明]、以下を**明示的にloudエラー化**して既存のpandas拒否挙動とパリティを保つ:
  - **未終端クォート**[例 `dog,foo,"baz`]: pandasは `EOF inside string` で拒否。stdlib既定は黙って受理するため、未終端クォート検出を自前で行いエラー化する。
  - **空白のみ／実カラム無し**[例 `" \t \n \n \t\t "`]: pandasは `No columns to parse` で拒否。stdlib既定は奇妙な単一列として受理するため、実カラム不在を検出しエラー化する。
  - pandas例外型[`pd.errors.ParserError` / `EmptyDataError`]はローカル例外[または`ValueError`]に置換し、`parse()` の except 節も更新する。
- **文字コード堅牢性**: `chardet` / `TextTranscoder` で維持[pandas非依存]。現実のCSVで最も怖い文字コード問題はpandasの担当ではなかったため、堅牢性の主要部分は失われない。

### 破壊的変更の扱い[判定基準＝Jinjaレンダリング結果の差分]

破壊的変更か否かは「**同じCSV + 同じテンプレートで最終レンダリング出力が変わるか**」の一点で判定する[中間dict/dtypeは出力が同一なら無関係]。既存12成功フィクスチャを正準テンプレートに通して**実測**した結果、破壊面は以下5件に確定した[残り成功9件はレンダリング完全一致、失敗系のnull-byte/empty/header-onlyはパリティ維持]。

| # | フィクスチャ | 現行pandas出力 | 新stdlib出力 | 種別 |
| --- | --- | --- | --- | --- |
| 1 | `csv_success_multi_nan_fill_empty_string` | `1.0` / `3.0` | `1` / `3` | 値変化[float昇格の廃止・改善方向] |
| 2 | `csv_success_numeric_nan_fill_na` | `100.0` / `300.0` | `100` / `300` | 値変化[同上] |
| 3 | `csv_success_mismatched_columns` | index昇格した歪な行 | loudパースエラー | 受理->拒否[loud化・意図通り] |
| 4 | `csv_failure_unclosed_quote` | `EOF inside string`で拒否 | 黙って受理 | 拒否->受理[要ハードニング/上記] |
| 5 | `csv_failure_whitespace_only` | `No columns to parse`で拒否 | 黙って受理 | 拒否->受理[要ハードニング/上記] |

#1・#2は数値列に空セルを含むときpandasが列ごとfloatへ昇格する挙動が消える差分で、`1.0`->`1`[ポート番号・件数・ID等で望ましい]。pre-1.0[v0.0.0]のため破壊的変更を許容し、README/CHANGELOGに上表を明記する。#1・#2は期待値書換[`numpy`依存除去]、#3はerror化、#4・#5はパーサのloudnessハードニングで対処する。

### 行数バランス [standards: 純度を伴う規模]

pandas固有コード[`_handle_csv_nan_values` のobject変換・例外ラップ等 約40行]を削除し、stdlibパーサ[約50行]を追加。純増は最小限に抑え、増分が出る場合はコミット前に明示的に正当化する。

## テスト戦略

- **CSV破壊面の確定手段[レンダリング層ゴールデン]**: 各CSVフィクスチャを正準テンプレート[全行・全列を出力]に通し、現行pandasの出力をゴールデンとして採取->新stdlib出力と比較。一致=非破壊[記録不要]、差分=破壊面[CHANGELOG明記＋ゴールデン更新]。dict比較ではなく**最終出力の等価性**を合否基準とする。上掲の破壊5件はこの手段で実測済み。
- **`features/` ユニットテスト**: CPythonでCI継続。CSVケースは期待値書換[#1・#2の `1.0`->`1`]・`numpy`依存除去・#3のerror化・#4/#5のloud拒否テスト追加。`007`/`1.50`/`1e3` 保持の前方互換テストも新設。
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
3. CSV破壊的変更 -> 実測で破壊面5件に確定[上掲表]。README/CHANGELOG明記、レンダリング層ゴールデンで固定。
4. 自前CSVパーサの堅牢性 -> 文字コードは`chardet`が担当、入力は小さな設定CSV[30MB上限・150MBメモリガード]で、未知の汚いデータ処理は非対象。stdlibの寛容さ[未終端クォート・空白のみを黙認]は実測で検出済みのため、loudnessハードニング[#4・#5]で明示拒否する。

## 成果物

1. 本設計spec[本ファイル]。
2. Vercelデプロイ・ランブック[アカウント作成から]: `docs/runbooks/vercel-deploy.md`。シークレット取扱標準[発行経路・保管先・最小権限・失効/ローテーション・疎通確認]に準拠。
3. 実装プラン: `docs/superpowers/plans/` 配下[writing-plansで作成]。
