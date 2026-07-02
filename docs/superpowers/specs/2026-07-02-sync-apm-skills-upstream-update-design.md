# apm スキル依存関係の上流更新自動追従 設計書

**関連:** Issue #480
**参照:** #390（ドリフト検知、実装済み）、#427（CLAUDE.md 同期、実装済み）、
#446（apm 0.12.1→0.23.0 バージョンアップ計画、本設計とは明確に別スコープ）

---

## 1. 背景と問題

`.claude/skills/` 配下のスキルは `apm.yml` に `obra/superpowers#<sha>` /
`tvna/clairvoyance#<sha>` の形でコミット SHA を直接ハードコード pin しており、
`apm.lock.yaml` の `resolved_commit` もそのSHAに追従する。

`.github/workflows/verify-superpowers.yml` の `upstream-drift` ジョブは、この
pin から**意図しないドリフト**（ローカル改変・再デプロイ忘れ）を検知する
（pin 済みコミットからスキルを再デプロイして `git diff` が空であることを
表明する）。しかし、上流リポジトリ（`obra/superpowers` / `tvna/clairvoyance`）
に新しいコミットが出ても、誰も気づかず追従しない設計になっている。

**目的:** 上流の更新を検知し、`apm.yml` の pin 更新 → 再デプロイ →
マニフェスト再生成 → レビュー必須 PR 作成、という一連の流れを自動化する。

## 2. 所有権モデル（アーキテクチャ）

新規ワークフローファイルは作らず、既存 `.github/workflows/sync-claude-md.yml`
を **`sync-agent-instructions.yml` にリネーム** する。理由は、CLAUDE.md 同期
ジョブとスキル自動更新ジョブがどちらも「エージェント指示を上流から追従させる」
という同じ関心事を扱うため、1ワークフローに集約する。

- **`sync-claude-md` ジョブ**（既存 `sync` ジョブのリネームのみ）: 挙動・PR
  文言は無変更。
- **`sync-apm-skills` ジョブ**（新規）: 本設計の対象。

両ジョブは `schedule`（週次 月曜 06:00 UTC, `cron "0 6 * * 1"`）と
`workflow_dispatch` のトリガーを共有し、ジョブ間の実行依存関係は持たない。

## 3. コンポーネント設計

新ジョブ `sync-apm-skills`（`permissions: contents: write` /
`pull-requests: write` をジョブ単位で付与、ワークフロー全体には付与しない）の
ステップ:

1. `step-security/harden-runner`（SHA固定、`egress-policy: audit`）。
2. `actions/checkout`（SHA固定）で本リポジトリを取得。
3. `git ls-remote https://github.com/obra/superpowers HEAD` と
   `git ls-remote https://github.com/tvna/clairvoyance HEAD` を実行し、各
   リポジトリの既定ブランチ最新 SHA を取得する。
4. 取得した SHA を `apm.yml` の現行 pin 行と比較する。
5. 差分があれば `apm.yml` の該当行を新 SHA に書き換える（両依存が同時に
   変わっていてもよい）。
6. `verify-superpowers.yml` の `upstream-drift` ジョブと同じ手順で、pinned
   apm 0.12.1 バイナリをダウンロード・sha256 検証し、`apm install` を実行して
   `apm.lock.yaml` を再生成、`.claude/skills/` を再デプロイする。
7. `python3 scripts/gen_superpowers_manifest.py` でマニフェストを再生成する。
8. `git diff --exit-code` で `apm.yml` / `apm.lock.yaml` / `.claude/skills/**`
   / マニフェストファイルの最終差分を確認する。
9. 差分があれば `peter-evans/create-pull-request`（SHA固定）で
   `chore/sync-apm-skills` ブランチへ1本のPRを作成/更新する
   （`token: GITHUB_TOKEN`, `sign-commits: true`, `base: main`,
   `delete-branch: true`）。差分がなければ何もしない（PRを作らない、
   ジョブは正常終了）。

## 4. データフロー

**入力:** 2つのリモートリポジトリの HEAD SHA（`git ls-remote` 経由）、
`apm.yml` の現行 pin 行。

**変換:**
1. `git ls-remote` の出力（`<sha>\tHEAD` 形式）から `awk '{print $1}'` で
   SHA のみ抽出する。
2. 各 SHA を `apm.yml` 内の対応する pin 行と文字列比較する。
3. 差分がある依存だけ `apm.yml` の該当行を新 SHA に書き換える。
4. pinned apm 0.12.1 バイナリをダウンロード・sha256 検証する
   （`verify-superpowers.yml` の `upstream-drift` ジョブと同じ手順を再利用）。
5. `apm install` 実行 → `apm.lock.yaml` の `resolved_commit` 等が再生成され、
   `.claude/skills/` が新 SHA 分の内容で再デプロイされる。
6. `gen_superpowers_manifest.py` でマニフェスト再生成。
7. `git diff --exit-code` で最終差分を確認する。

**出力:** 差分があれば `chore/sync-apm-skills` ブランチへコミット・PR作成。
差分がなければ何も出力しない。

**外部通信範囲:** `github.com`（ls-remote 対象2リポジトリ + apm リリース
ダウンロード）のみ。これは既存の `verify-superpowers.yml` の
`upstream-drift` ジョブがすでに行っている通信範囲と同一であり、新たな外部
送信先は増えない。

## 5. エラーハンドリング

- **`ls-remote` 失敗**（ネットワーク不調・リポジトリ名変更等）: ステップが
  失敗しジョブ全体が失敗する。`set -euo pipefail` で即座に停止し、PR作成
  ステップまで到達しないため、リポジトリ側に変更は一切残らない。手動
  リトライは実装しない — 次回の週次 cron 実行が自然なリトライとなる
  （既存 `sync-claude-md` ジョブも同じ思想で通知機構を持たない）。
- **`ls-remote` 出力が空/想定外フォーマット**: SHA 抽出後に空文字列でない
  ことを明示的に確認し、空ならエラーメッセージを出して `exit 1` する
  （空 SHA のまま `apm.yml` を書き換えてしまう事故を防ぐ）。
- **`apm install` 失敗**（アップストリームの構造変更・一時的なネットワーク
  障害等）: ジョブが失敗し、それ以降のステップ（diff確認・PR作成）には
  進まない。全ての変更はランナー上の ephemeral な作業ツリーでのみ発生し、
  `peter-evans/create-pull-request` に到達する前に失敗すれば何も push
  されない。
- **両依存が同時に更新されていた場合**: 設計判断通り1本の PR にまとめる
  （データフロー §4 で担保済み）。
- **`chore/sync-apm-skills` ブランチが前回実行分で未マージのまま残っている
  場合**: `peter-evans/create-pull-request` のデフォルト挙動により、既存
  PR を更新する（重複 PR は作成されない）。既存 `sync-claude-md` ジョブの
  `chore/sync-claude-md` と同じ挙動。
- **`git diff --exit-code` で差分なし**: 正常終了、PR作成ステップはスキップ
  （何もしない）。

## 6. スコープ外（YAGNI）

- apm CLI 本体のバージョンアップ（0.12.1→0.23.0、#446 で別途計画）。今回は
  既存の pin 済み apm 0.12.1 をそのまま使う。`flake.nix` や
  `verify-superpowers.yml` のバージョン値には一切触れない。
- 上流の更新検知に失敗した場合の通知（Slack 等）。既存 `sync-claude-md`
  ジョブにも同種の通知機構は無く、本件でも導入しない。
- `apm.yml` の pin 更新以外の依存（例: 将来追加されうる他の apm プラグイン）
  への一般化。現状の2依存（`obra/superpowers` / `tvna/clairvoyance`）のみを
  対象とする。

## 7. 検証計画

このセッション環境では `apm install` 自体を実行できない（issue #446 で
確認済みの組織ポリシー取得ハングのため）。そのため検証は以下の2層に分ける。

**このセッションで検証可能な範囲（部分検証）:**
- `git ls-remote https://github.com/obra/superpowers HEAD` /
  `git ls-remote https://github.com/tvna/clairvoyance HEAD` を実行し、
  取得した SHA を現行 `apm.yml` の pin 行と手動突き合わせて、検知ロジックの
  前提（SHA 比較で差分を正しく判定できるか）を確認する。
- `yamllint .github/workflows/sync-agent-instructions.yml`（利用可能なら）
  で構文検証する。
- リネーム後も既存 `verify-superpowers.yml` が無変更で green であることを、
  push したブランチの CI 結果で確認する（このワークフロー自体は今回の diff
  で一切変更しないため、regression が無いことの直接証拠になる）。

**このセッションでは検証不可能な範囲（実装計画に明記する既知のギャップ）:**
- `apm install` を含む一連の実データフロー（pin 書き換え→再デプロイ→
  マニフェスト再生成→PR作成）は、GitHub Actions 実行環境（このセッションの
  外）でのみ検証可能。マージ後、最初の `workflow_dispatch` 手動実行または
  次回月曜 cron 実行の結果を確認して初めて実証されたと言える。

## 8. 影響ファイル

| ファイル | 変更 |
|---|---|
| `.github/workflows/sync-claude-md.yml` | `sync-agent-instructions.yml` へリネーム、`sync-apm-skills` ジョブを追加 |
| `docs/superpowers/specs/2026-07-02-sync-apm-skills-upstream-update-design.md` | 本設計書（新規） |

`flake.nix`, `.github/workflows/verify-superpowers.yml`,
`.apm/instructions/` は本設計では変更しない。
