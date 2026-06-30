# 設計: Streamlit実装の撤去 (Issue #395 Phase P3)

- Issue: #450 (親: #395 / P3)
- ブランチ: claude/retire-streamlit-impl-ird4cm
- 日付: 2026-06-30

## 背景と目的

Streamlit -> Vercel/Pyodide 移行の最終フェーズ [#395 P3]。React + Pyodide の新UIへの
完全カットオーバーは #448 でマージ済みで、Streamlit はもはやライブ経路ではない。本タスクは
**Streamlit に完全依存する全実装を撤去**し、`main` の CI / 型 / Lint / テストを緑のまま
維持する。

## ハード境界 [絶対に触れない]

`features/**` [Python中核] と `assets/examples`・`assets/icons` は **Web アプリと共有**。
web 側がビルド時に import している:

- `web/src/worker/features-sources.ts` -> `features/**/*.py` を raw import
- `web/src/lib/templates.ts` / `web/src/lib/data.ts` -> `assets/examples/*` を import
- `web/src/components/Icon.tsx` -> `web/src/assets/icons/*`[これは web 配下で別物]

撤去はこれらに一切触れない。retro #449 item 5[`assets/examples` 共有起因の `main` CI赤]
の再発防止が直接の根拠。

## スコープ [オーナー承認済]

撤去対象と保持対象を事実ベースで分類する。

### App
- 撤去: `app.py`, `i18n.py`, `.streamlit/config.toml` [および `.streamlit/` ディレクトリ]
- 保持: `features/**`, `assets/**`
- `i18n.py` の import 元は `app.py` / `tests/unit/test_i18n.py` / `tests/e2e/helpers.py`
  の3箇所のみ[全文grepで確認済]。全て同時撤去するため波及なし。web は `web/src/i18n.ts`
  に独自実装済み。

### Desktop [stlite + Electron / オーナー承認済]
Streamlit アプリ[entrypoint=`app.py`]を丸ごと同梱したデスクトップ配布。`app.py` 撤去で
ビルド不能になるため同時撤去。

- 撤去: root `package.json` の `stlite` ブロック、`build` ブロック[electron-builder]、
  electron系 scripts[`dump` / `serve` / `pack` / `dist` / `postinstall` / `zap`]、
  devDeps[`@stlite/desktop` / `electron` / `electron-builder` / `cross-env` / `rimraf`]、
  `.github/actions/build-stlite/`
- 保持: root `package.json` の commitlint / husky / lint-staged / prettier 系と、
  Python ツールを叩く scripts[`lint` / `test` / `scan` / `commit` / `ccn`]。
  `e2e` script[`pytest -k e2e`]は撤去[旧Streamlit e2e専用]。
- 配布: 今後は Vercel / Cloudflare Workers のみに一本化[runbook 既存]。

### Security [Streamlit専用計装 / オーナー承認済]
いずれも Streamlit の source/sink[`st.file_uploader` 等]と 8501 で起動した Streamlit
サーバを対象にしており、対象が消えると死蔵になる。

- 撤去: `taint/streamlit_app.pysa`, `taint/taint.config`[= `taint/` 全体]、
  `.zap/rules.tsv`[= `.zap/` 全体]、`.pyre_configuration` の `taint_models_path` 行
- 保持: Pyre 型チェック本体。`source_directories` は `[".", "features"]` のまま[`app.py` /
  `i18n.py` はファイル消滅で自然に対象外になる]。`taint_models_path` のみ除去。

### Tests
- 撤去: `tests/unit/test_app.py`, `tests/test_app_integration.py`,
  `tests/unit/test_i18n.py`, `tests/e2e/**`[`test_e2e.py` / `helpers.py` / `conftest.py`
  / `__init__.py` = 旧Streamlit e2e一式]
- 保持: features 系ユニット[`test_core` / `test_config_parser` / `test_document_render` /
  `test_transcoder` / その他スクリプト系テスト]、`tests/conftest.py`
- 新しい web e2e は `web/e2e`[Node Playwright]に存在し、本撤去とは独立。

### Deps
- 撤去: `pyproject.toml` の `streamlit`[runtime]、`pytest-playwright`[dev / 旧Streamlit
  e2e専用]、`[tool.vulture]` paths の `app.py` エントリ
- `uv.lock` を `uv lock` で再生成
- スコープ外: `pandas-stubs`[pandas由来でありStreamlit固有でない]は触れない

### CI
- `.github/workflows/reusable-test-and-build.yml`:
  - 撤去ジョブ: `test-e2e`[旧Streamlit e2e]、`zap_scan`[Streamlitサーバ起動+ZAP]、
    `build-desktop`[stlite]
  - 撤去ステップ: `Show AST (app.py)`、coverage の `--cov=app.py` / `--cov=i18n.py`
  - 最終集約ジョブの `needs` 配列から撤去ジョブ名を除去[緑判定が消えたジョブを参照したまま
    残さない]
- `.github/workflows/test-and-build-on-merged.yml`:
  - 撤去: `test-e2e-benchmark` ジョブ[`test-python-playwright` アクション利用]、
    desktop-app-*.zip のダウンロード + gh-release 配布ステップ
- `.github/actions/test-python-playwright/`: 撤去[旧Streamlit e2e専用]
- 保持: `web-ci.yml`、Pyre / lint / 小ユニット / coverage[features]ジョブ

### Docs
- `README.md`: Streamlit バッジ[`streamlit-img` / `streamlit-cloud-img`]、clone URL、
  `uv run streamlit run app.py` 手順、ポート8501/8502 注記を新UI[Vercel/Pyodide]向けに
  書換。デスクトップ配布の記述があれば除去。
- 保持: 既存 `docs/specs` / `docs/runbooks` / `docs/prd`

## アーキテクチャ影響

1. **共有境界の保護**: 上記ハード境界の通り、`features/` と `assets/` への参照を一切変更しない。
2. **CI依存グラフの整合**: ジョブ削除後、`needs` を更新し、存在しないジョブへの参照を残さない。
   削除前後で workflow YAML が `yamllint` を通ることを確認する。

## 実装の段階 [コミット分割・各段階で緑を確認]

各コミットは #450 を引用する。

1. **App撤去**: `app.py` / `i18n.py` / `.streamlit/` + Streamlit系テスト
   [`test_app` / `test_app_integration` / `test_i18n` / `tests/e2e/**`] +
   `[tool.vulture]` paths と coverage の app/i18n 参照
2. **Deps撤去**: `pyproject.toml` から `streamlit` / `pytest-playwright` を除去 + `uv lock` 再生成
3. **Security撤去**: `taint/` / `.zap/` 削除 + `.pyre_configuration` の `taint_models_path` 除去
4. **Desktop撤去**: root `package.json`[stlite/build/electron] + `.github/actions/build-stlite/`
5. **CI撤去**: `reusable-test-and-build.yml` / `test-and-build-on-merged.yml` のジョブ・ステップ +
   `.github/actions/test-python-playwright/`
6. **README更新**

順序は依存方向[コードが先、設定/CIが後]に沿う。1->2 でテスト撤去後に依存を抜くことで、
各段階の `pytest -k 'not e2e'` を緑に保つ。

## 検証計画 [standards準拠 / 検証可否を明示]

### ローカル実行可 [証拠で確認する]
- `uv run pytest -k 'not e2e'`: features 系テストが緑 = Python中核が無傷[最重要シグナル]
- `uv run ruff check .`: app.py/i18n.py 撤去後の dangling import / 未使用ゼロ
- `uv run mypy .`: 型解決に残存参照なし
- `uv run vulture`: paths 更新後に成立
- `yamllint`: workflow YAML 構文
- 各撤去後の全文 grep[`streamlit` / `app\.py` / `i18n` / `stlite` / `electron` / `zap`]で
  残参照ゼロを確認[`features/` / `assets/` / `web/` の正当な共有参照は除外]

### ローカル実行不可 [未検証と明記する]
- GitHub Actions の実ジョブ実行[`act` 非導入]。CI 変更は YAML 静的検証[`yamllint`]までとし、
  実行結果は PR の CI で確認する。間接シグナルを実行証明に代用しない。

### 影響なし
- `web/` 配下は本撤去で**一切変更しない**。

## リスクと対応

1. **削除漏れ -> 残存参照で CI 赤**: 各段階で全文 grep を実施[上記検証計画]。
2. **`i18n.py` 削除の波及**: import 元 3箇所[`app.py` / `test_i18n.py` / `e2e/helpers.py`]を
   同時撤去[確認済]。
3. **CI `needs` 不整合**: 削除ジョブを参照する `needs` を更新し、`yamllint` で構文確認。
4. **共有資産の誤削除**: `features/` / `assets/examples` / `assets/icons` を撤去対象から明示除外
   [ハード境界]。retro #449 item 5 の教訓。

## Issue/PR運用 [CLAUDE.md §3]

- 専用 Issue #450[#395 のサブIssueとしてP3に対応]を全コミット/PRで引用。
- PR はオーナーの明示要求があるまで作成しない。
