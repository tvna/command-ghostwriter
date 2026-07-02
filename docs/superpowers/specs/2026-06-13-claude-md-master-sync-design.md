# CLAUDE.md マスタ追従（定期同期）設計書

**関連:** Issue #427
**参照:** `tvna/claude-md`（APM で `CLAUDE.md` / `AGENTS.md` をコンパイルして配布するマスタリポジトリ）

---

## 1. 背景と問題

本リポジトリの `CLAUDE.md` は現状、ローカル APM（`.apm/instructions/master.instructions.md`
＋ `apm.yml`）から `apm compile` で生成されている。一方、エージェント指示の正本は
別リポジトリ `tvna/claude-md` にあり、README に次のように明記されている（事実）。

> Master repository for personally tuned agent instructions, compiled with
> microsoft/apm into CLAUDE.md and AGENTS.md **for other projects**.
> Each project's local agent instructions **reference this master and only add
> their own delta**.

現状は、このマスタ内容を本リポジトリにローカル二重持ちしており、両者は既に乖離している
（マスタ Build `71055d42b741` / ローカル Build `195704fa05dc`）。手動同期では追従漏れと
ドリフトが避けられない。

**目的:** 本リポジトリの `CLAUDE.md` を `tvna/claude-md` の `CLAUDE.md` から
**定期的に自動追従**させ、ローカル二重持ちを解消する。

### 採用しなかった当初案（submodule + symlink）の却下理由

当初要望は次の方式だった。

```
git submodule add https://github.com/tvna/claude-md .claude-md-master
ln -s .claude-md-master/CLAUDE.md CLAUDE.md
```

これは **Claude Code on the web の fresh clone で破綻する**（根拠の強い推測）。

- 公式ドキュメント: "Cloud sessions start from a fresh clone of your repository.
  **Anything committed to the repo is available.**" / `CLAUDE.md` → "Part of the clone"。
- submodule の中身は親リポジトリにコミットされない（親は gitlink＝コミットポインタのみ）。
  通常の `git clone` は submodule を展開せず、ドキュメントに再帰展開の記載は無い（事実）。
- 結果、web 環境で `.claude-md-master/` が空となり `CLAUDE.md` が**壊れた symlink** に
  なり、プロジェクト指示が**サイレントに読み込まれない**。これは `CLAUDE.local.md` を
  わざわざコミットしている目的（fresh clone でも効かせる）を真っ向から崩す。

したがって **symlink ではなくコミット済み実ファイル**として同期する方式を採る。

## 2. 所有権モデル（アーキテクチャ）

- **同期ワークフローが `CLAUDE.md` の唯一の所有者**となる。`tvna/claude-md` の `main` の
  `CLAUDE.md` をそのまま**コミット済み実ファイル**として複製する。
- ローカル APM（`.apm/instructions/master.instructions.md`）は CLAUDE.md 生成元としては
  **実質引退**する（第4章）。superpowers スキル配備（`.claude/skills/`）の役割は維持。
- fresh clone でも `CLAUDE.md` は実ファイルとして存在するため、web 環境で確実に読み込まれる。

## 3. 同期ワークフロー `.github/workflows/sync-claude-md.yml`

### トリガ
- `schedule`: 週次（月曜 06:00 UTC, cron `0 6 * * 1`）。
- `workflow_dispatch`: 手動実行。

### ジョブ手順
1. `step-security/harden-runner`（SHA 固定, `egress-policy: audit` ＝既存ワークフロー踏襲）。
2. `actions/checkout`（SHA 固定）で本リポジトリを取得。
3. `actions/checkout`（SHA 固定）で `tvna/claude-md` を取得
   （public, `ref: main`, `sparse-checkout: CLAUDE.md`, 別 `path`）。
4. マスタの `CLAUDE.md` を本リポジトリの `CLAUDE.md` へコピー。
5. 差分があれば `peter-evans/create-pull-request`（SHA 固定）で
   **ブランチ＋コミット＋PR** を作成/更新（既存PRがあれば更新、無ければ新規）。

### 権限・シークレット
- `GITHUB_TOKEN`（`permissions: contents: write`, `pull-requests: write`）のみ。**PAT 不要**。
- 理由: `CLAUDE.md` の変更をトリガにする CI は存在しない（`verify-superpowers.yml` の
  path フィルタは `.claude/skills/**`, `apm.yml`, `apm.lock.yaml` 等）。よって
  「GITHUB_TOKEN 製 PR が他ワークフローを起動しない」既知制約は本件に影響しない。

### 前提設定（要ハンドオフ・シークレットではない）
- リポジトリ設定 **Settings → Actions → General → Workflow permissions** で
  「**Allow GitHub Actions to create and approve pull requests**」を有効化する必要がある。
  これはフラグであり秘密値ではない。検証は手動 `workflow_dispatch` 実行で PR が
  作成されることを確認すれば完了。

### レビューゲート
- 更新は**必ず PR 経由**。自動マージはしない。これにより §2「指示ファイルは
  code-owner レビューのマージゲートを通す」を満たす。

## 4. APM 整合（検証制約あり）

- 本環境に `apm` CLI が無く `apm.lock.yaml` を再生成できない（事実）。よって本変更では
  `.apm/instructions/` と `apm.lock.yaml` には**触れない**（生成物の手編集は §3 の
  declarative 管理に反するため回避）。
- `apm compile` を **CLAUDE.md 再生成目的では実行しない**運用を `CLAUDE.local.md` に
  明記する（CLAUDE.md の正本は上流 `tvna/claude-md`、唯一の所有者は同期ワークフロー）。
- 安全網: 仮に誰かが `apm compile` でローカル差分を出しても、次回の同期 PR が上流へ
  戻す差分を提示し、レビューで捕捉される。
- **後続（別 Issue / 別 PR）:** apm 利用可能な環境で `.apm/instructions/master.instructions.md`
  を撤去し `apm.lock.yaml` を再生成する整理を分離して実施する。

## 5. スコープ外（YAGNI）

- `AGENTS.md` の同期（本リポジトリに `AGENTS.md` は存在しないため対象外）。
- submodule / symlink 方式（第1章の理由で不採用）。
- 上流 `ref` の SHA ピン留め（当面は `main` 追従＋ PR レビューを安全制御とする。
  必要になれば後続で SHA ピンに切替）。

## 6. 検証計画

- 本環境で**可能**:
  - ワークフロー YAML の静的検証（`actionlint` があれば）。
  - `workflow_dispatch` による手動実走と、生成 PR の内容目視（マスタの `CLAUDE.md` と一致するか）。
- 本環境で**不可（事実）**: `apm compile` の挙動確認（apm 未導入）。
  → APM 整合は「触らない」方針で回避し、本件の検証対象から除外する。

## 7. 影響ファイル

| ファイル | 変更 |
|---|---|
| `.github/workflows/sync-claude-md.yml` | 新規（同期ワークフロー） |
| `CLAUDE.local.md` | CLAUDE.md が上流由来である旨と `apm compile` 非使用方針を追記 |
| `docs/superpowers/specs/2026-06-13-claude-md-master-sync-design.md` | 本設計書（新規） |

`.apm/instructions/`, `apm.lock.yaml`, `CLAUDE.md` 自体（初回同期PRで更新）は本PRでは
変更しない。
