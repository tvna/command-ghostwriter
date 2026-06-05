# 設計: Cursor -> Claude ドキュメント移行 [PRD + standards]

- Issue: #337
- ブランチ: claude/keen-galileo-TQCZw
- 日付: 2026-06-04

## 背景と目的

立ち上げ当初、本プロジェクトのメインエージェントはCursorだった。メインエージェントをClaudeへ置き換えるにあたり、`.cursor/rules/*.mdc`[10ファイル]と`README.md`に蓄積された知識を失わないよう`docs/`配下へ再編成し、その後`.cursor`を削除する。

ゴール:
1. README + `.cursor`を骨子としてPRDを生成する。
2. `.cursor/rules`の知識を関心ごと[プロダクト要求 vs エンジニアリング規約]で再編成する。
3. `.cursor`フォルダを削除する。

## 方針

出典ファイル単位ではなく、関心ごとで振り分ける。

- プロダクト要求[Why/What] -> `docs/prd/`
- エンジニアリング規約[How] -> `docs/standards/`
- オペレーター手順 -> `docs/runbooks/`
- 協議中事項 -> `docs/proposals/`
- 改変履歴 -> `docs/history/`

## ターゲット構成

```
docs/
├── prd/
│   ├── README.md                      # 索引
│   └── command-ghostwriter.md         # PRD本体
├── standards/
│   ├── README.md                      # 索引
│   ├── directory-structure.md         # <- A-001
│   ├── python-coding.md               # <- C-101 + C-199
│   ├── python-testing.md              # <- C-102
│   ├── python-security.md             # <- C-103
│   ├── ci-cd.md                       # <- D-201 + D-202 + D-203
│   ├── local-development.md           # <- D-101
│   └── package-management.md          # <- B-002 [poetry/npm運用部分]
├── runbooks/
│   ├── README.md                      # 索引
│   └── commands.md                    # <- docs/commands.md を移動
├── proposals/
│   └── README.md                      # 用途説明のみ
└── history/
    ├── README.md                      # 索引
    └── 2026-06-04-cursor-to-claude-migration.md  # 移行記録 + トレース表
```

## PRD本体の章立て [docs/prd/command-ghostwriter.md]

README + A-001/B-002 のプロダクト要求・ドメイン知識を統合する。

1. 背景・課題 [IaC導入困難な運用現場のCLI効率化]
2. ターゲットユーザー [テンプレート作成者 / 利用者]
3. 価値提案・プロダクトゴール
4. 技術選定の背景と制約 [Web+デスクトップ両対応 / 単一言語 / 無料プラットフォーム親和性]
5. 機能要求 [CLIコマンド生成 / Markdown生成 / Visual Debug / TOML・YAML Debug]
6. 入力仕様 [CSV/YAML/TOML, Jinjaテンプレート, フォーマット例]
7. アーキテクチャ要求 [MVVM, features/各モジュールの責務]
8. 非機能要求・ドメイン制約 [30MB上限, エンコーディング, テンプレートインジェクション対策, 禁止タグ/属性, ループ上限100000, メモリバリデーション非実装方針]
9. 制限事項・既知の制約

## 出典マッピング [トレース]

| 出典 | 行先 |
|---|---|
| README.md | docs/prd/command-ghostwriter.md [機能要求/入力仕様/制限事項] |
| A-001 ディレクトリ構造 | docs/standards/directory-structure.md |
| A-001 MECE/優先度/5W2H原則 | docs/standards/directory-structure.md [原則として再構成] |
| A-001 .cursorファイル命名規約 | 破棄[.cursor削除で陳腐化] |
| A-001 言語設定 | 破棄[CLAUDE.md §6が規定済み] |
| B-002 技術選定/モジュール責務 | docs/prd/command-ghostwriter.md |
| B-002 poetry/npm運用 | docs/standards/package-management.md |
| C-101 | docs/standards/python-coding.md |
| C-199 | docs/standards/python-coding.md |
| C-102 | docs/standards/python-testing.md |
| C-103 | docs/standards/python-security.md |
| D-101 | docs/standards/local-development.md |
| D-201/202/203 | docs/standards/ci-cd.md |
| docs/commands.md | docs/runbooks/commands.md [移動] |

## 重要な変換判断 [verbatimコピーではない箇所]

- A-001の`.cursor/rules`命名・優先度規約は`.cursor`削除で陳腐化するため、MECE/優先度/5W2H明確化の原則のみ残し、Cursorファイルパス固有記述は破棄する。
- A-001の言語設定[思考=英語/回答=日本語]はCLAUDE.md §6が既に規定済みのため重複回避で破棄する。
- B-002はドメイン/モジュール責務をPRDへ、poetry/npm運用をstandardsへ1ファイルを2分割する。
- README L264のリンクは現在`assets/docs/commands.md`[空]を指す不整合。`docs/runbooks/commands.md`へ修正する。

## 検証方法

- ファイル構造: 全`.cursor`内容が新ファイルのいずれかにマッピングされていることをトレース表で確認する。
- リンク健全性: README及び各索引のリンク切れがないことをgrepで確認する。
- 削除確認: `.cursor`削除後に他ファイルからの参照が残っていないことをgrepで確認する。

## スコープ外

- `docs/proposals/`の実コンテンツ充填[索引/用途説明のみ作成]。
- アプリ製品コード[app.py, features/等]の変更。
- CLAUDE.md[APM自動生成]の手動編集。
