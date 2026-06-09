# pytest wall-time 短縮（既定の xdist 並列化 + dist mode 改善）

- Issue: #369
- Branch: `claude/pytest-parallel-markers-5mvkqk`
- Date: 2026-06-09

## 背景と問題

テスト実行の wall-time が長い。原因は2点（いずれも実測ベースの事実）。

1. **ローカルが逐次実行**: `[tool.pytest.ini_options].addopts` に `-n auto` が無く、`pytest` 実行が
   非e2eスイート（404テスト）を逐次で回す。4 CPU で **約15.6s**。
2. **CI が `--dist loadfile`**: `small-unit-test` と `test-coverage` が `-n auto --dist loadfile` を渡す。
   `loadfile` は巨大ファイル `tests/unit/test_document_render.py`（174テスト・約5.76s、内1テストが
   分割不能な5.39sの30MBレンダリング境界テスト）を1ワーカーに固定し、これが全体を律速して **約12.15s**。

補足: pytest のマーカー単体では並列化されない（並列化は `pytest-xdist`）。この小規模スイートを
マーカー別CIジョブに分割すると、ランナー起動オーバーヘッドがスイート時間を上回るため不採用。

## 実測（4 CPU / 非e2e 404テスト）

| mode | wall-time |
| --- | --- |
| 逐次（ローカル現状） | 15.60s |
| `-n auto --dist loadfile`（CI現状） | 12.15s |
| `-n auto --dist loadscope` | 9.07s |
| `-n auto --dist load` | 8.82s（ランダム順3回で 8.69-9.18s） |

スイートは `pytest-randomly`（既定有効）により順序非依存に設計済みのため、テスト単位分散
`--dist load` を安全に採用できる。

## 設計（変更内容）

### 1. `pyproject.toml` の `addopts`
`-n auto` と `--dist load` を追加。benchmark/デバッグ実行時は `-n0` で上書きする旨をコメント明記。

```toml
addopts = [
  "-vv",
  "--maxfail=10",
  "--durations=30",
  "--import-mode=importlib",
  # ローカルも既定で並列実行（pytest-randomly が順序非依存を担保）。
  # benchmark 計測や pdb デバッグ時は `-n0` で並列を無効化すること。
  "-n", "auto",
  "--dist", "load",
]
```

### 2. `.github/workflows/reusable-test-and-build.yml`
`small-unit-test` と `test-coverage` の `--dist loadfile` を `--dist load` に変更。

### 3. 非変更
マーカー定義（unit/integration/e2e/benchmark）、e2e 構成、benchmark ジョブ、ジョブ依存関係は変更しない。

## 副作用（検証済み・安全）

- **benchmark**: pytest-benchmark は xdist 下で自動無効化される。CI の benchmark 実行は明示的に
  `-n 0` を渡して addopts の `-n auto` を上書きするため安全。
- **E2E**: 既に `-n auto`（既定 dist = load）で動作中。`--dist load` 追加で挙動不変。
- **ローカルの benchmark/デバッグ**: グローバル `-n auto` 下では `-n0` 指定が必要（addopts コメントに明記）。

## 検証

1. `uv run pytest -k "not e2e"` が既定で並列実行され、404 passed・ランダム順序で安定すること（実測済み）。
2. `uv run pytest -k "not e2e" -n0 --co` で `-n0` が addopts を上書きできること。
3. push 後に CI がグリーンであること。

## 期待効果

ローカル 約15.6s → 約9s、CI unit/coverage 約12.15s → 約9s。床は分割不能な5.39sの30MB
レンダリング1テスト。
