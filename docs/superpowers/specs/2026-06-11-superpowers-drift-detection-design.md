# superpowers スキル陳腐化検知 設計書

**関連:** Issue #390
**参照:** `tvna/claude-md`（`gen_agent_hooks.py` の generate+`--check` 規約、pre-commit + CI 二層強制）

---

## 1. 背景と問題

`.claude/skills/` 配下の superpowers スキルは APM がデプロイし、リポジトリに
**コミット済み**（`apm.lock.yaml` の `deployed_files`、`obra/superpowers` の
コミット `f2cbfbe` にピン留め）。コミット済みのため、fresh clone（Claude Code
on the web を含む）では常に配置されている。

そのうえで2つの欠落がある。

1. **upstream ピン留めからの陳腐化が無言**: 誰かがスキルファイルを編集する、
   または apm.lock 更新後に再デプロイし忘れると、committed コピーが APM ピン留め
   コミットからずれる。古いコピーが黙って使われる。
2. **欠落時が無言**: SessionStart フック `superpowers-session-start.sh` は
   スキルが無いと何も注入せず exit 0（`# inject nothing`）。異常な欠落／部分
   checkout も無言。

「committed スキル == APM がピン留めコミットでデプロイした内容」を保証する決定的
ゲートも、両者が乖離したときの実行時シグナルも存在しない。

## 2. 目標と非目標

**目標:** committed superpowers スキルの陳腐化／整合性検知を、`tvna/claude-md`
の generate+`--check` 規約に倣って追加する。CI ゲートと SessionStart フックの
二層（defense-in-depth）で構成する。

**非目標:** SessionStart でのスキル自動インストール／再デプロイ。web セッションに
apm は存在せず、コミット済み設計が既に配置を保証しているため。本件は
**検知であってインストールではない**。

## 3. 設計判断の根拠

- apm の `content_hash` は単純な連結／ソートハッシュでは再現できない（候補5通り
  すべて不一致）。git tree やソース側メタを含む非自明なアルゴリズムであり、正確な
  リバースエンジニアリングはバージョン依存・誤検知リスクが高い。よって apm.lock の
  `content_hash` 流用は不採用とし、**自前マニフェスト**をベースラインにする。
- 陳腐化を実際に「予防」できるのは stale な commit が merge される前に止める層
  （CI ゲート／pre-commit）。SessionStart は clone 後に走るため実行時「警告」のみ。
  両者を組み合わせて全カバレッジにする。
- 参照リポジトリの規約（`gen_X.py --check`、`::error` アノテーション、pre-commit
  local system hook + CI `verify-*.yml`、stdlib のみ・REPO_ROOT 相対）を踏襲する。

## 4. アーキテクチャ（コンポーネント）

### C1. `scripts/gen_superpowers_manifest.py`（新規・stdlib のみ）

`tvna/claude-md` の `gen_agent_hooks.py` を踏襲する。

- **source-of-truth**: `.claude/skills/` 配下のファイル群＋ `apm.lock.yaml` の
  `resolved_commit`（provenance ヘッダに記録）。
- **既定モード（生成）**: `.claude/skills/` 配下の全ファイル（マニフェスト自身を
  除く）について `sha256␣relpath` 行をソートし、`.claude/skills/.superpowers-manifest.sha256`
  へ書き出す。先頭に `# resolved_commit: <sha>` の provenance 行を置く。
- **`--check` モード**: 再レンダして committed マニフェストとバイト比較。
  - 一致 → exit 0
  - stale / missing → exit 1、`::error file=.claude/skills/.superpowers-manifest.sha256::stale; run uv run python scripts/gen_superpowers_manifest.py`
  - apm.lock が読めない／不正 → exit 2
- 役割: 「committed スキル ↔ committed マニフェスト」の整合保証、および apm 非依存・
  ネットワーク非依存の**実行時ベースライン**の提供。

provenance ヘッダの `resolved_commit` は apm.lock の同名値と照合し、ずれていれば
（apm.lock を更新したがマニフェスト未再生成）`--check` で stale 扱いとする。

### C2. SessionStart フック改修（`superpowers-session-start.sh`）

- 既存の using-superpowers 注入は維持。
- 続けて `python3 scripts/gen_superpowers_manifest.py --check` を実行（stdlib のみ
  のため `uv run` を介さず `python3` 直叩きで起動遅延を回避）。
- 結果に応じて追加の loud 警告を additionalContext に注入する。

  | 状態 | 注入内容 |
  |---|---|
  | スキルあり・一致（exit 0） | using-superpowers のみ（現状の正常系） |
  | スキルあり・drift（exit 1, 差分あり） | using-superpowers + loud DRIFT 警告（変更ファイル列挙） |
  | スキル丸ごと欠落 | loud MISSING 警告（元クレーム「無言 exit 0」を解消） |
  | マニフェスト未生成 / スクリプト異常（exit 2 等） | 軽い「ベースライン未初期化」警告 |

- **常に exit 0**（起動はブロックしない＝警告するが止めない）。スクリプト異常時も
  警告を出して exit 0。ただし**黙らせない**（fail loudly、空 catch にしない）。

### C3. pre-commit（既存 `.pre-commit-config.yaml` の `repo: local` に追記）

`gen-agent-hooks` 同型のローカル system hook を追加する。

```yaml
- id: superpowers-manifest-drift
  name: superpowers manifest drift
  language: system
  entry: uv run python scripts/gen_superpowers_manifest.py --check
  files: ^\.claude/skills/.*|^apm\.lock\.yaml$
  pass_filenames: false
```

commit 時点でドリフトを止める決定的ゲート。

### C4. CI `verify-superpowers.yml`（新規・参照の `verify-*.yml` 踏襲）

2ジョブ構成。

- **Job A（安価・apm 不要）**: `uv run python scripts/gen_superpowers_manifest.py --check`。
  マニフェスト整合を PR/push で検証。
- **Job B（upstream ドリフトゲート）**:
  1. `nix build .#apm-cli` で apm を取得（flake にピン留め済み）
  2. `apm install`（apm.lock のピン留めコミットからスキルを再デプロイ）
  3. `uv run python scripts/gen_superpowers_manifest.py`（マニフェスト再生成）
  4. `git diff --exit-code -- .claude/skills/`（差分が出たら fail）

  「committed スキル ↔ upstream ピン留めコミット」を保証し、マニフェスト再生成で
  偽装した改変も捕捉する。

  > **未確定点（プラン段階で確定）**: スキルを再デプロイする正確な apm コマンド
  > （`apm install` 想定。`apm compile` は CLAUDE.md 生成）。実装プランの検証ステップで
  > 実コマンドを確定する。本作業環境に apm は無いため、Job B の実起動検証は nix/apm
  > 対応の CI ランナー上でのみ可能（本環境では静的検証に留める）。

### C5. テスト（`tests/unit/`、参照の「全スクリプトにテスト」思想）

- `gen_superpowers_manifest.py` 単体:
  - write→`--check` 往復で exit 0
  - スキルファイル改変で exit 1、該当 relpath が出力に含まれる
  - マニフェスト削除で exit 1（missing 扱い）
  - apm.lock 不正／欠落で exit 2
- フック結合: スキル改変後に `superpowers-session-start.sh` を実行し、出力 JSON の
  `additionalContext` に DRIFT 警告文が含まれることを確認。

## 5. ドリフトカバレッジ

| ドリフト種別 | 捕捉層 |
|---|---|
| ローカル改変 / 部分 checkout / マニフェスト更新忘れ | C1+C3（pre-commit）、C2（実行時警告）、C4 Job A |
| upstream ピン留めからの逸脱（マニフェスト再生成で偽装含む） | C4 Job B（apm 再デプロイ diff） |
| スキル丸ごと欠落 | C2 MISSING 警告、C4 |

## 6. 新規／変更成果物

- 新規: `scripts/gen_superpowers_manifest.py`
- 新規: `.claude/skills/.superpowers-manifest.sha256`（生成物・コミット）
- 新規: `.github/workflows/verify-superpowers.yml`
- 新規: `tests/unit/test_gen_superpowers_manifest.py`
- 変更: `.claude/hooks/superpowers-session-start.sh`（drift/missing 警告の追加）
- 変更: `.pre-commit-config.yaml`（`superpowers-manifest-drift` 追記）

## 7. コミット規約

各コミット末尾に `(#390)`。
