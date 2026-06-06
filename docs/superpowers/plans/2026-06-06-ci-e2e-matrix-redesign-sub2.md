# CI E2E マトリクス再設計 (sub-2) 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** E2E を ubuntu(1x・高速)でのフルブラウザ実行に集約し、Windows は固有回帰用のスモーク部分集合のみに縮小して、CI の壁時間と課金を削減する(エッジケース/カバレッジ/セキュリティは不変)。

**Architecture:** `tests/e2e` に `smoke` マーカーを導入し、Windows 固有回帰に効く少数テストへ付与。`test-python-playwright` アクションへ `test-marker` 入力を追加し、`reusable-test-and-build.yml` の `test-e2e` マトリクスを「ubuntu×{chromium,firefox,webkit}(フル e2e)+ windows×{chromium}(e2e and smoke)」へ再設計する。ubuntu では harden-runner egress が実効化するため、audit で必要エンドポイントを実測 -> block で固定する(harden-runner 公式の audit→block 手順)。

**Tech Stack:** GitHub Actions, pytest, pytest-xdist, pytest-playwright, step-security/harden-runner。

**親Issue:** アンブレラ #360。本計画は spec `docs/superpowers/specs/2026-06-06-ci-runtime-reduction-design.md` の sub-2 を実装する。

**不変条件(全タスクで厳守):**
- E2E 全33ケースを削除しない。フル e2e は ubuntu(全3ブラウザ)で実行され続ける。
- E2E は `small-unit-test` ゲートを維持(本計画ではゲートを動かさない)。
- カバレッジ計測(`test-coverage` ジョブ)・セキュリティ多層は変更しない。
- 全アクションの SHA ピン留めを維持。harden-runner egress は最終的に block へ戻す。
- フレーク対策 `--reruns 2 --reruns-delay 1` を維持。

**検証の限界(spec §5):** ubuntu E2E の実時間、webkit-on-ubuntu の安定性、harden-runner egress の必要エンドポイントは**ローカル再現不可**で、ブランチ push 後の実CI runでのみ確定する。ローカルで検証できるのは `pytest --collect-only` のマーカー選択と `actionlint`/`yamllint` のみ。

---

## File Structure

- `pyproject.toml` — `[tool.pytest.ini_options].markers` に `smoke` を追加(1か所)。
- `tests/e2e/test_e2e.py` — Windows 固有回帰に効く少数テストへ `@pytest.mark.smoke` を付与。
- `.github/actions/test-python-playwright/action.yml` — `test-marker` 入力を追加し pytest `-m` に反映。
- `.github/workflows/reusable-test-and-build.yml` — `test-e2e` の `strategy.matrix` を `include` 形式へ再設計し、`matrix.marker` をアクションへ渡す。ubuntu の egress を audit(spike)→ block(確定)へ。

---

## Task 1: sub-2 用 sub-issue を #360 配下に作成

**Files:** なし(GitHub操作のみ)。

- [ ] **Step 1: sub-issue を作成**

`mcp__github__issue_write`(method=create, owner=tvna, repo=command-ghostwriter)で以下を作成する。本文は ASCII 安全な日本語、絵文字なし。

```
title: sub-2: E2Eマトリクス再設計(ubuntu集約 + windowsスモーク) (#360)
body:
## 目的
spec docs/superpowers/specs/2026-06-06-ci-runtime-reduction-design.md の sub-2 を実装する。
E2E を ubuntu の全ブラウザ実行へ集約し、Windows は固有回帰用スモーク部分集合へ縮小する。

## 不変条件
- E2E 全33ケースを削除しない(フルは ubuntu で実行)。
- E2E の small-unit-test ゲートは維持。
- カバレッジ・セキュリティ多層は不変。

## 完了条件
- ubuntu で chromium/firefox/webkit のフル e2e が緑。
- windows-chromium の e2e and smoke が緑。
- harden-runner egress を block で固定(必要エンドポイント追加済み)。
- PR本文に before/after のジョブ時間・課金概算表を添付。

親Issue: #360
```

- [ ] **Step 2: #360 とリンク**

`mcp__github__sub_issue_write`(method=add, issue_number=360, sub_issue_id=<作成された sub-issue の id>)で親子リンクを張る。以降、本計画のコミットは `(#<sub-2番号>)` を引用する。

---

## Task 2: `smoke` マーカーの定義と付与

**Files:**
- Modify: `pyproject.toml`(markers 配列)
- Modify: `tests/e2e/test_e2e.py`

選定したスモーク部分集合(Windows 固有回帰=描画 / ファイルパス / アップロード / エンコーディング・ファイル出力):
1. `test_ui_app_title` — 基本描画スモーク。
2. `test_file_upload_in_tab1` — Windows のファイルパス/アップロード。
3. `test_command_generation_parametrized_in_tab1` の `e2e_command_gen_with_cisco_config_to_file` パラメータ — TOML設定→ファイル出力の全パイプライン(エンコーディング/ファイルI/O)。

- [ ] **Step 1: テスト失敗の確認(マーカー未定義時の選択が空であること)**

Run: `uv run pytest --collect-only -q -m "e2e and smoke" 2>&1 | tail -3`
Expected: `0 ... selected`(まだ smoke 付与なし。`PytestUnknownMarkWarning` が出るか、選択0件)。

- [ ] **Step 2: `pyproject.toml` に marker を追加**

`[tool.pytest.ini_options]` の `markers` 配列へ次の1行を追加する(既存4マーカーの末尾):

```toml
  "smoke: mark a minimal subset run on Windows for OS-specific regression",
```

- [ ] **Step 3: `tests/e2e/test_e2e.py` に `@pytest.mark.smoke` を付与**

(a) `test_ui_app_title` のデコレータを変更:

```python
@E2E
@pytest.mark.smoke
def test_ui_app_title(page: Page, benchmark: BenchmarkFixture) -> None:
```

(b) `test_file_upload_in_tab1` のデコレータを変更:

```python
@E2E
@pytest.mark.smoke
def test_file_upload_in_tab1(page: Page, benchmark: BenchmarkFixture) -> None:
```

(c) `test_command_generation_parametrized_in_tab1` の cisco→file パラメータへ `marks` を追加。該当 `pytest.param` を次へ置換:

```python
        pytest.param(
            "cisco_config.toml",
            "cisco_template.jinja2",
            texts.tab1.generate_text_button,
            id="e2e_command_gen_with_cisco_config_to_file",
            marks=pytest.mark.smoke,
        ),
```

- [ ] **Step 4: スモーク選択を検証**

Run: `uv run pytest --collect-only -q -m "e2e and smoke"`
Expected: ちょうど 3 件選択(`test_ui_app_title`, `test_file_upload_in_tab1`, `test_command_generation_parametrized_in_tab1[e2e_command_gen_with_cisco_config_to_file]`)。

Run: `uv run pytest --collect-only -q -m "e2e"`
Expected: 従来どおり全 e2e(33件)が選択される(フルは不変)。

- [ ] **Step 5: マーカー警告がないことを確認**

Run: `uv run pytest --collect-only -q -m "e2e" 2>&1 | grep -i "PytestUnknownMark" || echo "no unknown-mark warning"`
Expected: `no unknown-mark warning`。

- [ ] **Step 6: コミット**

```bash
git add pyproject.toml tests/e2e/test_e2e.py
git commit -m "test(e2e): add smoke marker for windows regression subset (#<sub-2番号>)"
```

---

## Task 3: `test-python-playwright` アクションへ `test-marker` 入力を追加

**Files:**
- Modify: `.github/actions/test-python-playwright/action.yml`

- [ ] **Step 1: `inputs` に `test-marker` を追加**

`inputs:` ブロックの末尾(`is-benchmark` の後)へ追加:

```yaml
  test-marker:
    description: "pytest marker expression for E2E selection"
    required: false
    default: "e2e"
```

- [ ] **Step 2: 非Windows の実行ステップで marker を使用**

`id: e2e-tests-non-windows` の run 内、`-m "e2e"` を `-m "${{ inputs.test-marker }}"` に置換:

```bash
        uv run pytest -n auto -vv --browser ${{ inputs.browser }} -m "${{ inputs.test-marker }}" --reruns 2 --reruns-delay 1 --benchmark-disable
```

- [ ] **Step 3: Windows の実行ステップで marker を使用**

`id: e2e-tests-windows` の run 内、同様に置換:

```bash
        uv run pytest -n auto -vv --browser ${{ inputs.browser }} -m "${{ inputs.test-marker }}" --reruns 2 --reruns-delay 1 --benchmark-disable
```

(ベンチマーク2ステップは `-m "e2e"` のまま据え置き。スモーク分割の対象外。)

- [ ] **Step 4: アクション構文を検証**

Run: `curl -sSLo /tmp/actionlint.bash https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash && bash /tmp/actionlint.bash >/dev/null 2>&1; ./actionlint -color .github/actions/test-python-playwright/action.yml || ./actionlint -color`
Expected: エラーなし(composite action はワークフロー検証の対象外の場合あり。最低限 yamllint で検証)。

Run: `uv run yamllint -d "{extends: default, rules: {document-start: disable, line-length: {max: 250}, truthy: {allowed-values: ['true','false','on']}}}" .github/actions/test-python-playwright/action.yml`
Expected: エラーなし。

- [ ] **Step 5: コミット**

```bash
git add .github/actions/test-python-playwright/action.yml
git commit -m "ci(e2e): add test-marker input to playwright action (#<sub-2番号>)"
```

---

## Task 4: `test-e2e` マトリクスを案3へ再設計(ubuntu egress は spike として audit)

**Files:**
- Modify: `.github/workflows/reusable-test-and-build.yml`(`test-e2e` ジョブ)

- [ ] **Step 1: matrix を `include` 形式へ置換**

`test-e2e` の `strategy:` ブロック全体を次へ置換する:

```yaml
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: ubuntu-latest
            browser: chromium
            marker: "e2e"
          - os: ubuntu-latest
            browser: firefox
            marker: "e2e"
          - os: ubuntu-latest
            browser: webkit
            marker: "e2e"
          - os: windows-latest
            browser: chromium
            marker: "e2e and smoke"
      max-parallel: 10
```

- [ ] **Step 2: harden-runner egress を spike 用に audit へ(ブランチ限定・マージ前に戻す)**

`test-e2e` の Harden Runner ステップの `egress-policy:` を次へ変更し、apt ミラー候補を追記する(ubuntu の `playwright install --with-deps` が apt を使うため)。`disable-sudo: false` は維持:

```yaml
        with:
          egress-policy: audit
          disable-sudo: false
          allowed-endpoints: >
            ${{ env.EP_GITHUB_CORE }}
            ${{ env.EP_PYTHON }}
            ${{ env.EP_NODE }}
            ${{ env.EP_PLAYWRIGHT }}
            azure.archive.ubuntu.com:80
            archive.ubuntu.com:80
            security.ubuntu.com:80
            esm.ubuntu.com:443
```

> 注: audit はこのブランチでの実測専用。Task 6 で block へ戻す。マージ前に必ず block にする(不変条件)。

- [ ] **Step 3: 実行ステップへ `test-marker` を渡す**

`test-e2e` の最終ステップ `Run E2E Tests (Playwright)` の `with:` へ `test-marker` を追加:

```yaml
      - name: Run E2E Tests (Playwright)
        uses: ./.github/actions/test-python-playwright
        with:
          browser: ${{ matrix.browser }}
          test-marker: ${{ matrix.marker }}
```

- [ ] **Step 4: ジョブ名の matrix 参照を確認**

`name: E2E Tests (${{ matrix.os }} & ${{ matrix.browser }})` は `include` 形式でも `matrix.os`/`matrix.browser` を参照可能。変更不要であることを目視確認。

- [ ] **Step 5: ワークフロー構文を検証**

Run: `./actionlint -color .github/workflows/reusable-test-and-build.yml`
Expected: エラーなし。

Run: `uv run yamllint -d "{extends: default, rules: {document-start: disable, line-length: {max: 250}, truthy: {allowed-values: ['true','false','on']}, braces: {max-spaces-inside: 1}, comments: {min-spaces-from-content: 1}}}" .github/workflows/reusable-test-and-build.yml`
Expected: エラーなし。

- [ ] **Step 6: コミット**

```bash
git add .github/workflows/reusable-test-and-build.yml
git commit -m "ci(e2e): redesign matrix to ubuntu full + windows smoke (#<sub-2番号>)"
```

---

## Task 5: PR を作成し、実CIで挙動・時間・egress を実測

**Files:** なし(GitHub操作 + CI観測)。

- [ ] **Step 1: ブランチを push**

```bash
git push -u origin claude/bold-curie-r2EiB
```
(失敗時は 2s,4s,8s,16s のバックオフで最大4回再試行。)

- [ ] **Step 2: PR を作成(`Closes #<sub-2番号>` を本文に記載)**

`mcp__github__create_pull_request` で base=develop(リポジトリ既定の開発ブランチ。実際の base はリポジトリ運用に合わせる), head=claude/bold-curie-r2EiB。本文末尾に `Closes #<sub-2番号>` を記載(マージ時に sub-2 を自動クローズ)。

- [ ] **Step 3: CI を観測(イベント購読)**

`subscribe_pr_activity` で当該 PR を購読し、CI 完了イベントを待つ(Bash sleep でのポーリングは禁止)。

- [ ] **Step 4: 実測値を収集**

CI 完了後、`mcp__github__actions_list`(list_workflow_jobs)で `test-e2e` 各セルの所要時間を取得し、次を確認:
  - ubuntu chromium/firefox/webkit が全て成功(webkit-on-ubuntu の安定性)。
  - windows-chromium(e2e and smoke)が成功し、スモーク3件のみ実行されている(ログで確認)。
  - harden-runner の egress insights(audit)で、ubuntu E2E が実際に到達したエンドポイント一覧を記録。

Expected: 全セル緑。ubuntu の壁時間が現行 macOS(213-266s)以下。windows が現行(484-560s)より大幅短縮。

> いずれかが赤の場合: systematic-debugging に従い、ログを根拠に原因特定(webkit 依存不足 / egress block / flake)してから修正する。flake は `--reruns 2` で吸収されるはずだが、再現する場合は helper の待機条件を見直す。

---

## Task 6: harden-runner egress を block で固定(マージ前必須)

**Files:**
- Modify: `.github/workflows/reusable-test-and-build.yml`(`test-e2e` の Harden Runner)

- [ ] **Step 1: egress insights から確定エンドポイントを反映**

Task 5 Step 4 で記録した「ubuntu E2E が実際に到達したエンドポイント」を `allowed-endpoints` に反映し、`egress-policy` を `audit` → `${{ env.HARDEN_RUNNER_EGRESS_POLICY }}`(=block)へ戻す。Task 4 Step 2 で仮置きした apt エンドポイントのうち、実測で不要なものは削除し、不足分は追加する(最小権限)。

```yaml
        with:
          egress-policy: ${{ env.HARDEN_RUNNER_EGRESS_POLICY }}
          disable-sudo: false
          allowed-endpoints: >
            ${{ env.EP_GITHUB_CORE }}
            ${{ env.EP_PYTHON }}
            ${{ env.EP_NODE }}
            ${{ env.EP_PLAYWRIGHT }}
            # 以下、Task 5 の audit insights で確定した ubuntu apt 等のエンドポイントのみ
```

- [ ] **Step 2: 構文検証**

Run: `./actionlint -color .github/workflows/reusable-test-and-build.yml`
Expected: エラーなし。

- [ ] **Step 3: コミット & push**

```bash
git add .github/workflows/reusable-test-and-build.yml
git commit -m "ci(e2e): lock harden-runner egress to block with verified endpoints (#<sub-2番号>)"
git push origin claude/bold-curie-r2EiB
```

- [ ] **Step 4: 再観測して block でも緑を確認**

購読イベントで CI 完了を待ち、`test-e2e` 全セルが block ポリシー下でも緑であることを確認する。赤なら不足エンドポイントを追加して再試行(CI を緑へ駆動するループ)。

---

## Task 7: 効果の可視化と不変条件の確認

**Files:** なし(PR本文の更新)。

- [ ] **Step 1: before/after 表を PR 本文へ追記**

現行 #354 の E2E ジョブ時間(macOS 213/221/266, windows 560/484)と、新構成のジョブ時間を並べ、壁時間(最長セル)と重み付き課金(macOS×10 / windows×2 / ubuntu×1)概算の before/after を表で示す(人が読まずに異常検知できる可視化, CLAUDE.md §6)。

- [ ] **Step 2: 不変条件の充足を確認**

- フル e2e(33件)が ubuntu の全3ブラウザで実行された(ログ件数で確認)。
- `test-coverage` ジョブと Codecov ステータスが従来どおり緑(カバレッジ不変)。
- セキュリティ多層(Gitleaks/Trivy/Pyre/ZAP)ジョブが従来どおり実行・緑。
- harden-runner egress が block に戻っている(Task 6)。

Expected: 全て充足。未充足があれば該当 Task へ戻る。

- [ ] **Step 3: レビュー依頼**

requesting-code-review スキルに従い、変更がカバレッジ/セキュリティ/E2E網羅を落としていないことのレビューを依頼する。

---

## Self-Review(計画作成者によるチェック)

1. **Spec coverage:** spec sub-2 の「マトリクス再設計(ubuntu集約・webkit/windows扱い)」=Task 4、「シャーディング(計測駆動)」=本案3では Windows 縮小により長尺解消するためシャーディングは不要と判断(固定コスト多重化を避ける spec の条件に合致)。「全33ケース実行維持」=Task 2 Step 4 / Task 7 Step 2。egress 維持(不変条件)=Task 6。
2. **Placeholder scan:** `#<sub-2番号>` は Task 1 で確定する実値のプレースホルダ(意図的)。それ以外に TBD/TODO なし。各コードステップは実コードを記載済み。
3. **Type/名称整合:** marker 名 `smoke`、アクション入力 `test-marker`、matrix キー `marker` を全タスクで一貫使用。`-m "${{ inputs.test-marker }}"` と `test-marker: ${{ matrix.marker }}` が連結する。

> シャーディングは spec で「純増益のときのみ」とされ、案3で Windows を縮小すると長尺(560s)が解消するため本計画では採用しない。将来 ubuntu 単体が長尺化した場合の追加施策として保留。
