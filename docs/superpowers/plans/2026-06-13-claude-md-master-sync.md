# CLAUDE.md Master-Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scheduled GitHub Actions workflow that syncs `CLAUDE.md` from the master repo `tvna/claude-md` and opens a PR on changes.

**Architecture:** A weekly + manually-dispatchable workflow checks out `tvna/claude-md` (sparse: `CLAUDE.md`), copies it over the repo's committed `CLAUDE.md`, and uses `peter-evans/create-pull-request` to open/update a review PR. `CLAUDE.md` stays a committed real file (fresh-clone safe). No submodule, no symlink. APM is left untouched (apm CLI unavailable in this environment).

**Tech Stack:** GitHub Actions, `actions/checkout`, `step-security/harden-runner`, `peter-evans/create-pull-request`, `actionlint`.

**Spec:** `docs/superpowers/specs/2026-06-13-claude-md-master-sync-design.md` — **Issue #427**

---

## File Structure

| File | Responsibility |
|---|---|
| `.github/workflows/sync-claude-md.yml` | The sync workflow (only behavioral change) |
| `CLAUDE.local.md` | Document that `CLAUDE.md` is upstream-owned and `apm compile` must not regenerate it |

Out of scope (do NOT touch): `.apm/instructions/`, `apm.lock.yaml`, `CLAUDE.md` itself
(the first sync PR updates `CLAUDE.md`; this plan does not).

---

### Task 1: Add the sync workflow

**Files:**
- Create: `.github/workflows/sync-claude-md.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/sync-claude-md.yml` with exactly this content:

```yaml
# ============================================================
# Workflow Information: sync-claude-md.yml
# ============================================================
#
# 目的 (Purpose):
# ---------------
# エージェント指示の正本リポジトリ tvna/claude-md の CLAUDE.md を取得し、
# 本リポジトリの CLAUDE.md (コミット済み実ファイル) へ追従させる。
# 差分があれば PR を作成/更新する (レビュー必須・自動マージしない)。
#
# 方式の根拠 (Rationale):
# -----------------------
# - submodule + symlink は web 環境の fresh clone で壊れる (submodule は親clone
#   に含まれない) ため、コミット済み実ファイルとして同期する。
# - CLAUDE.md 変更をトリガにする CI は無いため GITHUB_TOKEN のみで足りる (PAT 不要)。
# - リポジトリ設定で "Allow GitHub Actions to create and approve pull requests"
#   を有効化しておくこと。
#
# 関連 (Reference):
# -----------------
# - Issue #427
# - 設計書 docs/superpowers/specs/2026-06-13-claude-md-master-sync-design.md
# ============================================================
---
name: Sync CLAUDE.md from master

on:
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: sync-claude-md-${{ github.ref }}
  cancel-in-progress: false

jobs:
  sync:
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
          base: main
          branch: chore/sync-claude-md
          delete-branch: true
          commit-message: "chore: sync CLAUDE.md from tvna/claude-md (#427)"
          title: "chore: sync CLAUDE.md from tvna/claude-md master"
          body: |
            Automated sync of `CLAUDE.md` from the master repository
            [`tvna/claude-md`](https://github.com/tvna/claude-md) (`main`).

            Source of truth is `tvna/claude-md`. Review required; do not auto-merge.

            Refs #427
```

- [ ] **Step 2: Lint the workflow**

Run: `actionlint .github/workflows/sync-claude-md.yml`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/sync-claude-md.yml
git commit -m "ci: add CLAUDE.md master-sync workflow (#427)"
```

---

### Task 2: Document the ownership change in CLAUDE.local.md

**Files:**
- Modify: `CLAUDE.local.md`

- [ ] **Step 1: Append a new section**

Append this section to the end of `CLAUDE.local.md`:

```markdown
## CLAUDE.md is sourced from the master repo

- `CLAUDE.md` is synced from the master repository
  [`tvna/claude-md`](https://github.com/tvna/claude-md) by
  `.github/workflows/sync-claude-md.yml` (weekly + manual), landing via a
  review PR. The master is the source of truth.
- Do **not** run `apm compile` to regenerate `CLAUDE.md` locally; the sync
  workflow is its sole owner. The local `.apm/instructions/` source is vestigial
  for `CLAUDE.md` (it still drives superpowers skill deployment). Removing it and
  regenerating `apm.lock.yaml` is deferred to a follow-up in an apm-capable
  environment. Refs #427.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.local.md
git commit -m "docs: note CLAUDE.md is upstream-sourced (#427)"
```

---

### Task 3: Push the branch

- [ ] **Step 1: Push**

```bash
git push -u origin claude/claude-md-submodule-sync-p0hzmp
```

---

## Verification

- **Runnable here (fact):** `actionlint` static check of the workflow (Task 1 Step 2).
- **Runnable after merge:** trigger `workflow_dispatch` on `Sync CLAUDE.md from master`;
  confirm it opens a PR whose `CLAUDE.md` matches `tvna/claude-md` `main`. Requires the
  repo setting "Allow GitHub Actions to create and approve pull requests" to be enabled.
- **Not runnable here (fact):** `apm compile` behavior — apm CLI is not installed. The
  design avoids depending on it by leaving APM untouched.

## Self-Review notes

- Spec coverage: §2 ownership → Task 2; §3 workflow → Task 1; §4 APM untouched → reflected
  by not modifying `.apm/`/`apm.lock.yaml` and documented in Task 2; §6 verification → above.
- No placeholders; all action SHAs pinned to repo-existing versions (checkout v4.2.2,
  harden-runner v2.13.0) plus create-pull-request v8.1.1 (`5f6978f…`).
- The repo-setting prerequisite is a config flag (not a secret) and is the only manual handoff.
