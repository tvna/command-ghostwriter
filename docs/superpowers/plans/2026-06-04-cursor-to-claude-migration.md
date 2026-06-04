# Cursor -> Claude ドキュメント移行 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `.cursor/rules`[10ファイル]とREADMEの知識を`docs/`配下へ関心ごとに再編成し、`.cursor`を削除する。

**Architecture:** 出典ファイル単位ではなく、プロダクト要求[Why/What] -> `docs/prd/`、エンジニアリング規約[How] -> `docs/standards/`、手順 -> `docs/runbooks/`、履歴 -> `docs/history/`、協議中 -> `docs/proposals/` に振り分ける。製品コードには一切触れない。

**Tech Stack:** Markdown のみ。検証は grep とリンク目視確認[テストフレームワーク不要]。

**前提・規約:**
- Issue: #337。全コミットメッセージに `(#337)` を付与する。
- コミット規約: conventional commits[commitlint config-conventional]。`docs:` タイプを使う。
- 日本語ドキュメント内の記号規約[C-199 RUF003対応]: 全角括弧 `（）` は使わず半角ブラケット `[]` を使う。全角記号は半角へ置換する。この規約は移植後の全`.md`に適用する。
- git identity: `user.email=noreply@anthropic.com`, `user.name=Claude`[設定済み]。
- ブランチ: `claude/keen-galileo-TQCZw`。
- 各タスク末尾でコミットする。push は最終タスクでまとめて行う。

**出典の所在[実装者向け]:** 移植元は作業ツリーの `.cursor/rules/*.mdc` と `README.md` に現存する。各タスクは該当ファイルを読み、指定の変換を適用して新ファイルへ再構成する。

---

### Task 1: docs/ ディレクトリ構造と索引READMEの作成

**Files:**
- Create: `docs/prd/README.md`
- Create: `docs/standards/README.md`
- Create: `docs/runbooks/README.md`
- Create: `docs/proposals/README.md`
- Create: `docs/history/README.md`

- [ ] **Step 1: 5つの索引READMEを作成**

各READMEはそのフォルダの用途を1-3文で説明し、配下ファイルへのリンク一覧[相対リンク]を持つ。現時点で存在しないファイルへのリンクは後続タスクで追記するため、Task 1時点では「用途説明」のみ記述し、リンク一覧は空または "[作成予定]" としない[空セクション可]。

- `docs/prd/README.md`: 「プロダクト要求仕様[PRD]の置き場」。本体 `command-ghostwriter.md` へのリンクはTask 2で追記。
- `docs/standards/README.md`: 「標準化された開発規約の置き場。コーディング/テスト/セキュリティ/CI-CD/ディレクトリ規約等」。リンク一覧はTask 3で追記。
- `docs/runbooks/README.md`: 「オペレーターによる作業手順をサービス単位で格納」。リンクはTask 4で追記。
- `docs/proposals/README.md`: 「協議中の事項[Why/Why Not検討中]の置き場」。Task 6で確定。
- `docs/history/README.md`: 「他ドキュメントが背景[Why/Why Not]を持つのに対し、改変の歴史をここへ集約する」。リンクはTask 5で追記。

- [ ] **Step 2: 構造を確認**

Run: `find docs -type d | sort`
Expected: `docs`, `docs/history`, `docs/prd`, `docs/proposals`, `docs/runbooks`, `docs/standards`, `docs/superpowers/...` が表示される。

- [ ] **Step 3: コミット**

```bash
git add docs/prd/README.md docs/standards/README.md docs/runbooks/README.md docs/proposals/README.md docs/history/README.md
git commit -m "docs: scaffold docs/ structure with index READMEs (#337)"
```

---

### Task 2: PRD本体の作成

**Files:**
- Create: `docs/prd/command-ghostwriter.md`
- Modify: `docs/prd/README.md`[本体へのリンク追記]

**出典:** `README.md`[全体]、`.cursor/rules/A-001_enuma-elish.mdc`[用語定義]、`.cursor/rules/B-002_domain.mdc`[技術選定の背景 / フロントエンド・バックエンド構成 / features各モジュール責務]。

- [ ] **Step 1: PRD本体を作成**

以下の章立てで作成する。各章の内容は出典から抽出・再構成する[verbatimコピーではなくPRD文体へ整える]。

1. 概要・背景・課題 <- README L11-13[IaC導入困難な運用現場でCLI形式作業を効率化。設定定義ファイル+Jinjaテンプレートの2分割]
2. ターゲットユーザーと利用フロー <- README「使い方の流れ」sequence図[テンプレート作成者 / ファイルサーバ / 利用者 / Command ghostwriter]
3. 価値提案・プロダクトゴール <- README概要 + B-002技術選定の背景
4. 技術選定の制約[非機能・プラットフォーム要求] <- B-002「技術選定の背景」[Webアプリ必須 / オフライン用デスクトップ化 / 単一言語で両構成 / 無料プラットフォーム親和性]、「フロントエンド技術選定」[streamlit / 独自JS最小化 / i18n.py集約]
5. 機能要求 <- README「機能モード」「デバッグ機能」[CLIコマンド生成モード / Markdown生成モード / Visual Debug / TOML・YAML Debug]
6. 入力仕様 <- README「入力ファイルのフォーマット」[CSV/YAML/TOML例、Jinjaテンプレート例、テンプレート化手順]
7. アーキテクチャ要求 <- B-002「バックエンド構成」[MVVM、features/はクラス化徹底、パース後メモリバリデーション非実装方針] + 各モジュール責務[core.py=ViewModel/ビジネスロジック中核, transcoder.py=デコード/エンコード, config_parser.py=TOML/YAML/CSV->辞書, document_render.py=Jinjaレンダリング, validate_template.py=テンプレ検査, validate_uploaded_file.py=サイズ検査]
8. ドメイン制約・セキュリティ要求 <- B-002 validate_template.py[禁止タグ macro/include/import/extends、禁止属性 __class__等、ループ上限100000、テンプレートインジェクション対策はランタイム検査] + validate_uploaded_file.py[30MB上限] + README制限事項[エンコーディングUTF-8/Shift_JIS/EUC-JP、改行LF/CRLF、特殊文字エスケープ、ネストループ非推奨]
9. 用語の定義 <- A-001「用語の定義」[製品コード / 実装 / 期待値]
10. 制限事項・既知の制約 <- README「制限事項と注意点」

記号規約[全角->半角ブラケット]を適用する。

- [ ] **Step 2: prd索引にリンク追記**

`docs/prd/README.md` に `- [Command ghostwriter PRD](command-ghostwriter.md)` を追記する。

- [ ] **Step 3: リンク確認**

Run: `ls docs/prd/command-ghostwriter.md && grep -c "command-ghostwriter.md" docs/prd/README.md`
Expected: ファイルが存在し、リンクが1件以上。

- [ ] **Step 4: コミット**

```bash
git add docs/prd/
git commit -m "docs: add PRD body from README and cursor domain rules (#337)"
```

---

### Task 3: standards 7ファイルの作成

**Files:**
- Create: `docs/standards/directory-structure.md`
- Create: `docs/standards/python-coding.md`
- Create: `docs/standards/python-testing.md`
- Create: `docs/standards/python-security.md`
- Create: `docs/standards/ci-cd.md`
- Create: `docs/standards/local-development.md`
- Create: `docs/standards/package-management.md`
- Modify: `docs/standards/README.md`[索引にリンク追記]

各ファイルは対応する`.cursor/rules`の規約本文を移植する。`description/globs/alwaysApply`のCursor固有frontmatterは破棄し、代わりに各ファイル冒頭へ「適用範囲」を1行で記す[例: 適用範囲: `*.py`]。記号規約[全角->半角]を適用する。

- [ ] **Step 1: directory-structure.md を作成**

出典 `A-001_enuma-elish.mdc`。移植する: 「ディレクトリとファイルの配置規則」[ディレクトリツリー全体]、「AIエージェントのルール配置」のうち **MECE / 優先度 / 5W2H不明時は質問 / kebab-case命名の原則**。
破棄する: `.cursor/rules/A-[0-9]{2,4}_*.mdc` 等のCursorファイルパス命名規約[.cursor削除で陳腐化]、「言語設定」[CLAUDE.md §6が規定済み]、ディレクトリツリー内の `.cursor/rules` 行。
原則は「ドキュメント/ルールの配置原則」として再構成する[Cursor非依存の表現にする]。

- [ ] **Step 2: python-coding.md を作成**

出典 `C-101_python-architect.mdc` + `C-199_python-style.mdc` を統合。型ヒント強制 / 命名規則 / 関数設計 / pydantic V2バリデーション / 制御フロー / エラー処理 / 既存コード変更時の前後処理[C-101]、フォーマット[ruff] / 不要コード削除 / docstring[Google Style] / コメント目的 / コメントのクリーンアップ[RUF003: 全角括弧->半角ブラケット][C-199]。

- [ ] **Step 3: python-testing.md を作成**

出典 `C-102_python-test.mdc`。pytest前提 / クラスメソッド単位配置 / AAAパターン / パラメータ化[parametrize, pytest.param, id命名規則] / モック[MockerFixture] / エッジケース / 並列実行 / セキュリティテスト追加ルール。全文移植。

- [ ] **Step 4: python-security.md を作成**

出典 `C-103_python-security.mdc`。単体テスト100%成功前提 / 脆弱性単位の変更 / CWEチェック / 危険関数[eval, exec, os.system等]警告 / CVEチェック / 無料診断ツール / バリデーション専用メソッドはprivate。全文移植。

- [ ] **Step 5: ci-cd.md を作成**

出典 `D-201_gh-actions-standard.mdc` + `D-202_gh-actions-workflow.mdc` + `D-203-gh-actions-composite.mdc` を統合。見出しで3つの出自[標準ルール / ワークフロー / composite action]を区別する。GitHub script / Secrets / CI-CDフロー / ガード節 / テストピラミッド / タイムアウト / キャッシュ / composite action化 / ブランチ保護 / コマンドインジェクション対策 / トップレベルキー検査 / reusable workflow分離 を移植。

- [ ] **Step 6: local-development.md を作成**

出典 `D-101_localhost.mdc`。git導入 / gitignore / pre-commit[main直コミット禁止] / commitlint[config-conventional]。全文移植。

- [ ] **Step 7: package-management.md を作成**

出典 `B-002_domain.mdc` の「パッケージ管理」節[poetry利用 / poetry add / poetry add -G dev / パッケージモード禁止 / npm利用 / package.jsonエイリアス定義]。この節のみ抽出[B-002の他節はTask 2でPRDへ移植済み]。

- [ ] **Step 8: standards索引にリンク追記**

`docs/standards/README.md` に7ファイルへのリンク一覧[各1行、ファイルの責務を併記]を追記する。

- [ ] **Step 9: 確認**

Run: `ls docs/standards/*.md | wc -l`
Expected: 8[7規約ファイル + README.md]。

- [ ] **Step 10: コミット**

```bash
git add docs/standards/
git commit -m "docs: add engineering standards from cursor rules (#337)"
```

---

### Task 4: runbooks への commands.md 移動と README リンク修正

**Files:**
- Rename: `docs/commands.md` -> `docs/runbooks/commands.md`
- Modify: `docs/runbooks/README.md`[リンク追記]
- Modify: `README.md:264`[リンク先修正]

- [ ] **Step 1: commands.md を git mv で移動**

```bash
git mv docs/commands.md docs/runbooks/commands.md
```

- [ ] **Step 2: runbooks索引にリンク追記**

`docs/runbooks/README.md` に `- [開発者向けコマンド集](commands.md)` を追記する。

- [ ] **Step 3: README.md の壊れたリンクを修正**

`README.md:264` の `[こちら](assets/docs/commands.md)` を `[こちら](docs/runbooks/commands.md)` に変更する。

注: 現リンクは存在しない `assets/docs/commands.md` を指す既存の不整合。実体[旧 `docs/commands.md`]の新パスへ修正する。

- [ ] **Step 4: 確認**

Run: `ls docs/runbooks/commands.md && grep -n "docs/runbooks/commands.md" README.md && ! ls docs/commands.md 2>/dev/null && echo OK`
Expected: 新ファイルが存在、READMEに新リンク、旧ファイルが存在しない、`OK`表示。

- [ ] **Step 5: コミット**

```bash
git add docs/runbooks/ README.md docs/commands.md
git commit -m "docs: move commands.md to runbooks and fix README link (#337)"
```

---

### Task 5: history への移行記録[トレース表]作成

**Files:**
- Create: `docs/history/2026-06-04-cursor-to-claude-migration.md`
- Modify: `docs/history/README.md`[リンク追記]

- [ ] **Step 1: 移行記録を作成**

内容:
- 背景[Why]: メインエージェントをCursorからClaudeへ置換。`.cursor/rules`知識を失わず`docs/`へ再編成し`.cursor`を削除。Issue #337。
- 出典 -> 行先 トレース表[全10 `.cursor`ファイル + README + docs/commands.md を網羅]:

| 出典 | 行先 | 備考 |
|---|---|---|
| README.md | docs/prd/command-ghostwriter.md | 機能/入力仕様/制限事項 |
| A-001 ディレクトリ構造 | docs/standards/directory-structure.md | |
| A-001 ルール配置原則 | docs/standards/directory-structure.md | MECE/優先度/5W2H/kebab-caseのみ |
| A-001 用語の定義 | docs/prd/command-ghostwriter.md | |
| A-001 .cursorファイル命名規約 | 破棄 | .cursor削除で陳腐化 |
| A-001 言語設定 | 破棄 | CLAUDE.md §6が規定済み |
| B-002 技術選定/モジュール責務 | docs/prd/command-ghostwriter.md | |
| B-002 パッケージ管理 | docs/standards/package-management.md | |
| C-101 | docs/standards/python-coding.md | |
| C-199 | docs/standards/python-coding.md | |
| C-102 | docs/standards/python-testing.md | |
| C-103 | docs/standards/python-security.md | |
| D-101 | docs/standards/local-development.md | |
| D-201/202/203 | docs/standards/ci-cd.md | |
| docs/commands.md | docs/runbooks/commands.md | git mv |

- 破棄項目とその理由[Why Not]を明記。
- 記号規約適用。

- [ ] **Step 2: history索引にリンク追記**

`docs/history/README.md` に `- [2026-06-04 Cursor -> Claude 移行](2026-06-04-cursor-to-claude-migration.md)` を追記する。

- [ ] **Step 3: コミット**

```bash
git add docs/history/
git commit -m "docs: record cursor-to-claude migration history with trace table (#337)"
```

---

### Task 6: proposals プレースホルダの確定

**Files:**
- Modify: `docs/proposals/README.md`[Task 1で作成済みの用途説明を確定]

- [ ] **Step 1: proposals README を確定**

協議中事項の置き場であること、確定後は該当する `prd/standards/runbooks` へ昇格し、決定の経緯は `history/` へ記録する運用を1段落で記述する。現時点で協議中の項目は無い旨を明記する[空ファイルではなく運用説明を持たせる]。

- [ ] **Step 2: コミット[Task 1から変更がある場合のみ]**

```bash
git add docs/proposals/README.md
git commit -m "docs: clarify proposals folder usage (#337)"
```

変更が無ければスキップする。

---

### Task 7: .cursor 削除と整合性検証

**Files:**
- Delete: `.cursor/`[ディレクトリごと]

- [ ] **Step 1: .cursor を削除**

```bash
git rm -r .cursor
```

- [ ] **Step 2: 残存参照の検証**

Run:
```bash
grep -rn "\.cursor/rules" . --include="*.md" --include="*.py" --include="*.yml" --include="*.yaml" 2>/dev/null | grep -v "^\./\.git/"
```
Expected: マッチは `docs/superpowers/specs/...` と `docs/history/...`[移行を説明する文書なので参照が残るのは正当] のみ。製品コードや設定ファイルにマッチが無いこと。

- [ ] **Step 3: リンク健全性の検証**

Run:
```bash
ls docs/prd/command-ghostwriter.md docs/runbooks/commands.md docs/standards/*.md docs/history/2026-06-04-cursor-to-claude-migration.md
grep -rn "assets/docs/commands.md" README.md || echo "old link removed OK"
```
Expected: 全新ファイルが存在。READMEに旧 `assets/docs/commands.md` リンクが残っていない[`old link removed OK`表示]。

- [ ] **Step 4: トレース網羅の検証**

Run: `ls docs/standards/*.md docs/prd/*.md docs/runbooks/*.md`
全`.cursor`出典[A-001, B-002, C-101/102/103/199, D-101/201/202/203]がトレース表[Task 5]の行先ファイルとして存在することを目視確認する。

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "docs: remove .cursor now that knowledge is migrated to docs/ (#337)"
```

---

### Task 8: 最終確認とpush

- [ ] **Step 1: 全コミットのauthor/署名を確認**

Run: `git log --format='%an %ae %G?' origin/claude/keen-galileo-TQCZw..HEAD`
Expected: 全コミットが `Claude noreply@anthropic.com`。署名が必要な場合は `git rebase --exec "git commit --amend --no-edit --reset-author" origin/claude/keen-galileo-TQCZw`。

- [ ] **Step 2: push[失敗時は指数バックオフで最大4回リトライ]**

```bash
git push -u origin claude/keen-galileo-TQCZw
```

- [ ] **Step 3: 完了報告**

Issue #337 を参照し、移行サマリ[作成ファイル一覧 + 削除 + 検証結果]を日本語でユーザーへ報告する。

---

## 自己レビュー結果

- **Spec coverage:** 設計specの全行先[prd/standards 7ファイル/runbooks/proposals/history]にTaskが対応。4つの変換判断[A-001命名規約破棄/言語設定破棄/B-002分割/READMEリンク修正]はTask 3 Step1, Task 2/3, Task 4にそれぞれ反映。
- **Placeholder scan:** 各Taskは出典ファイルと変換内容を具体指定。"TODO/後で"等の曖昧表現なし。ドキュメント移行のため最終prose全文はインライン化せず[DRY/出典が現存]、出典+変換指示で代替。
- **Consistency:** ファイルパス・コミットメッセージ・トレース表の出典名がTask間で一致。
