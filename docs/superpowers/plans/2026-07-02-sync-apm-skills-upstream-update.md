# apm スキル上流更新自動追従 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `.github/workflows/sync-claude-md.yml` を `sync-agent-instructions.yml` にリネームし、`obra/superpowers` / `tvna/clairvoyance` の上流コミットを検知して `apm.yml` の pin を自動更新し、再デプロイ・マニフェスト再生成・レビュー必須PR作成までを行う新ジョブ `sync-apm-skills` を追加する。

**Architecture:** 既存 `sync-claude-md.yml` の単一ジョブ (`sync`) を `sync-claude-md` にリネームしてそのまま維持し、同じトリガー (`schedule`/`workflow_dispatch`) を共有する独立ジョブ `sync-apm-skills` を追加する。新ジョブは `git ls-remote` でSHAを検知し、差分がある場合のみ `verify-superpowers.yml` の `upstream-drift` ジョブと同じ手順(pinned apm 0.12.1 ダウンロード・`apm install`・マニフェスト再生成)を実行し、`peter-evans/create-pull-request` で1本のPRを作成する。

**Tech Stack:** GitHub Actions, bash, `git ls-remote`, apm 0.12.1 (pinned binary), Python 3 (`scripts/gen_superpowers_manifest.py`), `peter-evans/create-pull-request`, `step-security/harden-runner`。検証ツール: `actionlint` (既にインストール済み: `/root/.local/bin/actionlint`)、`uv run yamllint`(`pyproject.toml` に `yamllint` 依存済み、`.yamllint.yml` 設定あり)。

**関連 Issue:** #480 (本タスク)。Refs #390, #427, #446。
**参照 spec:** `docs/superpowers/specs/2026-07-02-sync-apm-skills-upstream-update-design.md`

---

## 前提確認 (実装前に一度だけ)

作業ブランチはタスク割当により `claude/attachment-task-rib1uh`(既存、コミット済みの spec doc あり)。新規ブランチは作成しない。

---

### Task 1: `sync-claude-md.yml` を `sync-agent-instructions.yml` にリネームし、共有メタデータを一般化する

**Files:**
- Rename: `.github/workflows/sync-claude-md.yml` -> `.github/workflows/sync-agent-instructions.yml`

このタスクでは **`sync-claude-md` ジョブの中身(ステップ・PRブランチ名・PR文言)は一切変更しない**。変更するのはファイル名、ファイル先頭のヘッダーコメント、ワークフローの `name:`、`concurrency.group`、ジョブキー名(`sync:` -> `sync-claude-md:`)の4点のみ。

- [x] **Step 1: `git mv` でリネームする**

```bash
git mv .github/workflows/sync-claude-md.yml .github/workflows/sync-agent-instructions.yml
```

- [x] **Step 2: ファイル先頭からジョブ `sync-claude-md` の終わりまでを次の内容に置き換える**

`.github/workflows/sync-agent-instructions.yml` の内容を、ファイル末尾(既存の `sync` ジョブの `body: |` ブロック終端、旧90行目)までを以下に置き換える(この時点では `sync-apm-skills` ジョブはまだ追加しない):

```yaml
# ============================================================
# Workflow Information: sync-agent-instructions.yml
# ============================================================
#
# 目的 (Purpose):
# ---------------
# エージェント指示を上流から追従させる2つの独立したジョブを持つ。
#  - sync-claude-md: 正本リポジトリ tvna/claude-md の CLAUDE.md を取得し、
#    本リポジトリの CLAUDE.md (コミット済み実ファイル) へ追従させる。
#  - sync-apm-skills: apm.yml にピン留めした obra/superpowers /
#    tvna/clairvoyance の上流コミットを検知し、pin 更新・再デプロイ・
#    マニフェスト再生成を行う。
# いずれも差分があれば PR を作成/更新する (レビュー必須・自動マージしない)。
#
# 方式の根拠 (Rationale):
# -----------------------
# - submodule + symlink は web 環境の fresh clone で壊れる (submodule は親clone
#   に含まれない) ため、CLAUDE.md はコミット済み実ファイルとして同期する。
# - CLAUDE.md 変更をトリガにする CI は無いため GITHUB_TOKEN のみで足りる (PAT 不要)。
# - リポジトリ設定で "Allow GitHub Actions to create and approve pull requests"
#   を有効化しておくこと。
# - create-pull-request の sign-commits: true により、ローカル git commit ではなく
#   GitHub API 経由でコミットを作成し、GITHUB_TOKEN のままで Verified 署名済みコミット
#   とする (新規 GitHub App / secret は不要)。未設定だと署名必須ブランチ保護で
#   PR が `mergeable_state: blocked` のままマージ不能になる (PR #464 で発生)。
# - sync-apm-skills は上流の既定ブランチ最新コミットを REST API やフル checkout
#   ではなく `git ls-remote <url> HEAD` で取得する (GitHub API のレート制限を回避)。
# - apm.yml の2依存が同時に更新されていても PR は1本にまとめる
#   (依存ごとに別PRを作らない)。
# - apm CLI 本体のバージョン (0.12.1) は verify-superpowers.yml の
#   upstream-drift ジョブと同じ値を使う。apm 本体のバージョンアップは
#   別スコープ (#446)。
#
# 関連 (Reference):
# -----------------
# - Issue #427, #467 (CLAUDE.md 同期), #480 (apm スキル上流追従), #446 (apm バージョンアップ, 別スコープ)
# - 設計書 docs/superpowers/specs/2026-06-13-claude-md-master-sync-design.md
# - 設計書 docs/superpowers/specs/2026-07-02-sync-apm-skills-upstream-update-design.md
# ============================================================
---
name: Sync agent instructions

on:
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: sync-agent-instructions-${{ github.ref }}
  cancel-in-progress: false

jobs:
  sync-claude-md:
    name: Sync CLAUDE.md from tvna/claude-md
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: write
      pull-requests: write
    steps:
      - name: Harden Runner
        uses: step-security/harden-runner@ec9f2d5744a09debf3a187a3f4f675c53b671911 # v2.13.0
        with:
          egress-policy: audit

      - name: Check out this repository
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Check out master CLAUDE.md
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          repository: tvna/claude-md
          ref: main
          sparse-checkout: CLAUDE.md
          sparse-checkout-cone-mode: false
          path: .upstream-claude-md

      - name: Copy master CLAUDE.md into place
        run: |
          cp .upstream-claude-md/CLAUDE.md CLAUDE.md
          rm -rf .upstream-claude-md

      - name: Create or update pull request
        uses: peter-evans/create-pull-request@5f6978faf089d4d20b00c7766989d076bb2fc7f1 # v8.1.1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          sign-commits: true
          base: main
          branch: chore/sync-claude-md
          delete-branch: true
          commit-message: "chore: sync CLAUDE.md from tvna/claude-md (#427)"
          title: "chore: sync CLAUDE.md from tvna/claude-md master"
          body: |
            Automated sync of `CLAUDE.md` from the master repository
            [`tvna/claude-md`](https://github.com/tvna/claude-md) (`main`).

            Source of truth is `tvna/claude-md`. Review required; do not auto-merge.

            Refs #427, #467
```

- [x] **Step 3: 構文検証**

```bash
actionlint .github/workflows/sync-agent-instructions.yml
uv run yamllint .github/workflows/sync-agent-instructions.yml
```

Expected: どちらも出力なし・終了コード0。

- [x] **Step 4: 差分レビュー(挙動が変わっていないことの確認)**

```bash
git diff --staged -- .github/workflows/sync-agent-instructions.yml | grep -E '^\+' | grep -vE '^\+\+\+' | grep -viE 'sync-claude-md|sync-agent-instructions|Sync CLAUDE.md from master|Sync agent instructions|#480|apm-skills|apm スキル|apm.yml|apm 本体|レート制限|依存ごと'
```

Expected: 上記コマンドは、ジョブ本体(harden-runner 以降のステップ・PRブランチ名 `chore/sync-claude-md`・PR文言・cron式)に意図しない変更が無いことの目視確認を助けるためのフィルタ。実際の追加行がヘッダーコメント/ワークフロー名/concurrency グループ名/ジョブキー名のみであることを目で確認する(コマンド自体はgrepの都合上完全な自動判定ではないため、最終判断は目視で行う)。

- [x] **Step 5: コミット**

```bash
git add .github/workflows/sync-agent-instructions.yml
git commit -m "$(cat <<'EOF'
ci(sync): rename sync-claude-md.yml to sync-agent-instructions.yml (#480)

Renames the workflow file and job key ahead of adding the
sync-apm-skills job in the next commit. The sync-claude-md job's
steps, branch name, and PR body are unchanged.

Refs #427, #467, #480
EOF
)"
```

---

### Task 2: `sync-apm-skills` ジョブを追加する

**Files:**
- Modify: `.github/workflows/sync-agent-instructions.yml`(Task 1 で作成したファイルの末尾に新ジョブを追記)

- [x] **Step 1: `sync-claude-md:` ジョブの直後に `sync-apm-skills:` ジョブを追記する**(実装後、コード品質レビューで `grep -oP` の複数マッチ未ガードを指摘され、コミット `2d6a53a` で単一マッチガードを追加済み)

ファイル末尾(Task 1 で置いた `Refs #427, #467` の行)の後ろに、以下をそのまま追記する:

```yaml

  sync-apm-skills:
    name: Sync apm skill dependency pins from upstream
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: write
      pull-requests: write
    env:
      # verify-superpowers.yml の upstream-drift ジョブと同じ値を使う。
      # apm 本体のバージョンアップ (#446) が完了するまでは両ファイルで
      # 手動同期すること。
      APM_VERSION: "0.12.1"
      APM_ARCHIVE: apm-linux-x86_64
      APM_SHA256: a0b896e8cbdd10441125e989aa19d180c62052eda7c8aa850feb367805d1256f
    steps:
      - name: Harden Runner
        uses: step-security/harden-runner@ec9f2d5744a09debf3a187a3f4f675c53b671911 # v2.13.0
        with:
          egress-policy: audit

      - name: Check out this repository
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Detect upstream apm dependency updates
        id: detect
        run: |
          set -euo pipefail

          declare -A repo_urls=(
            ["obra/superpowers"]="https://github.com/obra/superpowers"
            ["tvna/clairvoyance"]="https://github.com/tvna/clairvoyance"
          )

          changed=0
          summary=""

          for pin in "${!repo_urls[@]}"; do
            url="${repo_urls[$pin]}"
            latest="$(git ls-remote "${url}" HEAD | awk '{print $1}')"
            if [ -z "${latest}" ]; then
              echo "::error::git ls-remote returned no HEAD SHA for ${url}"
              exit 1
            fi

            current="$(grep -oP "(?<=${pin}#)[0-9a-f]{40}" apm.yml)"
            if [ -z "${current}" ]; then
              echo "::error::could not find current pin for ${pin} in apm.yml"
              exit 1
            fi

            if [ "${latest}" != "${current}" ]; then
              sed -i "s@${pin}#${current}@${pin}#${latest}@" apm.yml
              summary="${summary}- \`${pin}\`: \`${current}\` -> \`${latest}\`"$'\n'
              changed=1
            fi
          done

          echo "changed=${changed}" >> "${GITHUB_OUTPUT}"
          {
            echo 'summary<<PIN_SUMMARY_EOF'
            printf '%s' "${summary}"
            echo 'PIN_SUMMARY_EOF'
          } >> "${GITHUB_OUTPUT}"

      - name: Download and verify apm release
        if: steps.detect.outputs.changed == '1'
        run: |
          set -euo pipefail
          url="https://github.com/microsoft/apm/releases/download/v${APM_VERSION}/${APM_ARCHIVE}.tar.gz"
          curl --fail --location --silent --show-error -o apm.tar.gz "${url}"
          echo "${APM_SHA256}  apm.tar.gz" | sha256sum --check --strict
          mkdir -p "${RUNNER_TEMP}/apm"
          tar -xzf apm.tar.gz --strip-components=1 -C "${RUNNER_TEMP}/apm"
          echo "${RUNNER_TEMP}/apm" >> "${GITHUB_PATH}"

      - name: Redeploy apm skills with updated pins
        if: steps.detect.outputs.changed == '1'
        run: apm install

      - name: Regenerate the integrity manifest
        if: steps.detect.outputs.changed == '1'
        run: python3 scripts/gen_superpowers_manifest.py

      - name: Create or update pull request
        if: steps.detect.outputs.changed == '1'
        uses: peter-evans/create-pull-request@5f6978faf089d4d20b00c7766989d076bb2fc7f1 # v8.1.1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          sign-commits: true
          base: main
          branch: chore/sync-apm-skills
          delete-branch: true
          commit-message: "chore: sync apm skill dependency pins from upstream (#480)"
          title: "chore: sync apm skill dependency pins from upstream"
          body: |
            Automated detection of new upstream commits on the apm skill
            dependencies pinned in `apm.yml`:

            ${{ steps.detect.outputs.summary }}
            Review required; do not auto-merge.

            Refs #480
```

**設計上の注記(実装者向け):** spec の手順6は「`git diff --exit-code` で差分を確認してからPRを作る」と説明しているが、`peter-evans/create-pull-request` は作業ツリーに差分が無ければ自動的にPRを作らない(そのための専用ツール)。したがって独立した `git diff --exit-code` ステップは追加しない — `steps.detect.outputs.changed` によるジョブ内ゲート(不要な `apm install` 実行を避ける)と、`create-pull-request` 自身の差分検知(実際に push すべき変更が無ければ何もしない)の二段構えで、spec が意図する「差分が無ければ何もしない」という挙動を満たす。

- [x] **Step 2: 構文検証**

```bash
actionlint .github/workflows/sync-agent-instructions.yml
uv run yamllint .github/workflows/sync-agent-instructions.yml
```

Expected: どちらも出力なし・終了コード0。

- [x] **Step 3: 検知ロジックをローカルで部分検証する**(実行結果: このセッションのgit egress proxyは `tvna/command-ghostwriter` のみに制限されており、`obra/superpowers` / `tvna/clairvoyance` への実際の `ls-remote` は本セッションでは403でブロックされ実行不可能と判明。GitHub Actionsランナーはこの制限を受けないため本番動作には影響しない。sedによる書き換えロジック自体はスクラッチコピーで検証済み。)

このセッション環境では `apm install` は実行できない(#446)。しかし SHA 検知とpin書き換えのロジック自体は実データで検証できる(spec §7 で明記済みの検証範囲)。

まず実際の `ls-remote` が動作し、現行 `apm.yml` の pin と比較できることを確認する:

```bash
echo "pinned obra/superpowers:  $(grep -oP '(?<=obra/superpowers#)[0-9a-f]{40}' apm.yml)"
echo "latest obra/superpowers:  $(git ls-remote https://github.com/obra/superpowers HEAD | awk '{print $1}')"
echo "pinned tvna/clairvoyance: $(grep -oP '(?<=tvna/clairvoyance#)[0-9a-f]{40}' apm.yml)"
echo "latest tvna/clairvoyance: $(git ls-remote https://github.com/tvna/clairvoyance HEAD | awk '{print $1}')"
```

Expected: 4行とも40文字の16進数SHAが表示される(pinned側とlatest側が一致していても不一致でもどちらも正常 — これは「現時点で上流が更新されているかどうか」の事実確認であり、ロジックの正しさとは別の話)。

次に、ワークフロー内のsed置換パターンが正しく動作することを、書き込み先を汚さないスクラッチコピーで検証する:

```bash
cp apm.yml /tmp/apm-test.yml
current="$(grep -oP '(?<=obra/superpowers#)[0-9a-f]{40}' /tmp/apm-test.yml)"
fake_new="0000000000000000000000000000000000000000"
sed -i "s@obra/superpowers#${current}@obra/superpowers#${fake_new}@" /tmp/apm-test.yml
grep "obra/superpowers#${fake_new}" /tmp/apm-test.yml
rm /tmp/apm-test.yml
```

Expected: 最後の `grep` が書き換え後の行(`- obra/superpowers#0000000000000000000000000000000000000000`)を1行表示する。これにより、pin文字列に `/` や `#` を含んでいても `@` 区切りのsedパターンが意図通り動作することを確認する。

- [x] **Step 4: コミット**

```bash
git add .github/workflows/sync-agent-instructions.yml
git commit -m "$(cat <<'EOF'
ci(sync): add sync-apm-skills upstream-update job (#480)

Detects new upstream commits on obra/superpowers and
tvna/clairvoyance via git ls-remote, bumps the apm.yml pin,
redeploys skills with the pinned apm 0.12.1 binary, regenerates the
integrity manifest, and opens a single review-required PR when
anything changed.

Refs #390, #446, #480
EOF
)"
```

---

### Task 3: プッシュしてCIを確認する

**Files:** なし(検証のみ)

- [x] **Step 1: プッシュする**

```bash
git push -u origin claude/attachment-task-rib1uh
```

- [x] **Step 2: 既存 `verify-superpowers.yml` が無変更でgreenであることを確認する**

このブランチの差分は `.github/workflows/sync-claude-md.yml`(削除としてリネーム前扱い) / `.github/workflows/sync-agent-instructions.yml`(新規)/ 2つの spec doc / plan doc のみで、`verify-superpowers.yml` の path フィルタ(`.claude/skills/**`, `apm.yml`, `apm.lock.yaml`, `scripts/gen_superpowers_manifest.py`, `.github/workflows/verify-superpowers.yml`)に一致するファイルは変更していない。実際に `mcp__github__actions_list` で確認したところ、このブランチのpushでは `verify-superpowers.yml` はトリガーされていない(pathフィルタ外、正常・regressionの兆候ではない)。

- [x] **Step 3(計画時の想定が誤りと判明・修正): 手動で `workflow_dispatch` を実行し、`sync-agent-instructions.yml` 自体が構文エラー無く起動することを確認する**

**発見した制約:** GitHub Actionsは、`workflow_dispatch` で手動実行できるワークフローを「デフォルトブランチ(`main`)に存在するワークフロー」に限定する。`mcp__github__actions_list`(`list_workflows`)で確認したところ、新しい `sync-agent-instructions.yml` はまだワークフロー一覧に登録されておらず(`main`未マージのため)、旧 `Sync CLAUDE.md from master`(`sync-claude-md.yml`)のみが登録された状態だった。したがって**このステップはマージ前には実行不可能**であり、計画作成時の想定(プッシュ後にすぐ手動実行できる)は誤りだった。実データでの動作確認は、`main` へのマージ後、最初の週次cron実行または手動`workflow_dispatch`実行まで待つ必要がある。

- [x] **Step 4: 未解消の検証ギャップを記録する**

Issue #480 の acceptance criteria のうち、以下はこのセッション外(GitHub Actions実行環境、かつ`main`マージ後)で確認が必要な項目として残す:
- `sync-apm-skills` ジョブの `git ls-remote` を含む全ステップ(このセッションのgit egress proxy制限により、`obra/superpowers`/`tvna/clairvoyance`への実通信は未検証)。
- `apm install` 以降(pin書き換え → 再デプロイ → マニフェスト再生成 → PR作成)の実データでのエンドツーエンド動作。
- マージ後、最初の週次実行または手動実行での実際のPR作成(差分がある場合)。
- マージ後のretrospective issue作成(CLAUDE.local.md方針)。

これらはissue #480のチェックリストに残し、クローズしない。
