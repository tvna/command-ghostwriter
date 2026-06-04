# 2026-06-04 Cursor から Claude へのドキュメント移行

- Issue: #337
- ブランチ: claude/keen-galileo-TQCZw

## 背景 [Why]

立ち上げ当初、本プロジェクトのメインエージェントはCursorだった。メインエージェントをClaudeへ置き換えるにあたり、`.cursor/rules/*.mdc` [10ファイル] と `README.md` に蓄積された知識を失わないよう `docs/` 配下へ関心ごとに再編成し、その後 `.cursor` を削除した。

知識の振り分け方針は、出典ファイル単位ではなく関心ごととした。

- プロダクト要求 [Why/What] -> `docs/prd/`
- エンジニアリング規約 [How] -> `docs/standards/`
- オペレーター手順 -> `docs/runbooks/`
- 協議中の事項 -> `docs/proposals/`
- 改変履歴 -> `docs/history/`

## 出典から行先へのトレース

| 出典 | 行先 | 備考 |
|---|---|---|
| README.md | docs/prd/command-ghostwriter.md | 概要/機能要求/入力仕様/制限事項 |
| README.md L264 リンク | README.md [修正] | `assets/docs/commands.md` [不在] -> `docs/runbooks/commands.md` |
| A-001 ディレクトリ構造 | docs/standards/directory-structure.md | `.cursor/rules` 行は除去 |
| A-001 ルール配置原則 | docs/standards/directory-structure.md | MECE/優先度/5W2H/kebab-caseのみ再構成 |
| A-001 用語の定義 | docs/prd/command-ghostwriter.md | |
| A-001 .cursorファイル命名規約 | 破棄 | `.cursor`削除で陳腐化 |
| A-001 言語設定 | 破棄 | CLAUDE.md が規定済み |
| B-002 技術選定/モジュール責務 | docs/prd/command-ghostwriter.md | |
| B-002 パッケージ管理 | docs/standards/package-management.md | |
| C-101 python-architect | docs/standards/python-coding.md | C-199と統合 |
| C-199 python-style | docs/standards/python-coding.md | C-101と統合 |
| C-102 python-test | docs/standards/python-testing.md | |
| C-103 python-security | docs/standards/python-security.md | |
| D-101 localhost | docs/standards/local-development.md | |
| D-201 gh-actions-standard | docs/standards/ci-cd.md | D-202/203と統合 |
| D-202 gh-actions-workflow | docs/standards/ci-cd.md | |
| D-203 gh-actions-composite | docs/standards/ci-cd.md | |
| docs/commands.md | docs/runbooks/commands.md | git mv |

## 破棄した項目とその理由 [Why Not]

- **A-001 の `.cursor/rules` 命名・優先度規約** [`A-[0-9]{2,4}_${RULENAME}.mdc` 等]: `.cursor` 削除によりファイルパス前提が成立しなくなるため破棄した。配置の原則 [MECE/優先度/5W2H明確化/kebab-case] は `docs/standards/directory-structure.md` に Cursor非依存の表現で残した。
- **A-001 の言語設定** [思考=英語/回答=日本語]: `CLAUDE.md` が既に同等の規定を持つため、重複を避けて破棄した。

## 移行時に併せて修正した出典由来の不具合

移行先が唯一の真実源となるため、出典に含まれていた以下の不具合を修正した。

- C-199 の `pyroject.toml` [`pyproject.toml` の誤記] を修正。
- C-103 の全角バッククォート `｀`、D-202 の全角スペース、C-101 の `エラーハンドリングにの一貫性` [冗長な助詞] を半角化/訂正。
- README から引き継いだ全角アンパサンド `＆` を半角 `&` に修正。

## 検証

- ファイル構造: 全 `.cursor` 出典が新ファイルのいずれかにマッピングされていることを本トレース表で確認した。
- 記号規約: `docs/` 配下の散文に全角の丸括弧 [U+FF08/U+FF09] が無いことを grep で確認した。
- 削除確認: `.cursor` 削除後、製品コード/設定ファイルに `.cursor/rules` への参照が残っていないことを grep で確認した [本ファイルと設計ドキュメントには、移行の説明として参照が残る]。
