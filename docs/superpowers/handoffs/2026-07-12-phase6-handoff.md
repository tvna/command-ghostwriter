# Handoff: フェーズ6 物理設備工事系シナリオ10本の追加（新カテゴリ facility）

## Context
- Issue: #549（親issue #541）
- Branch: `claude/phase6-facility-templates`（既存・origin/develop 最新から作成済み。新規ブランチは作らない）
- Closes: #549

## Background
親issue #541「未経験者向けインフラ研修シナリオテンプレートの整備」のフェーズ6、最終フェーズ。フェーズ1（issue #542・PR #543・2026-07-12マージ済み）で確立した6セクション構成とレビュー手法を踏襲し、新規シナリオ10本（rack-power-budget, rack-mount-layout, dual-power-redundancy, structured-cabling-plan, lan-cable-category, ups-capacity-plan, cable-labeling-standard, server-racking-procedure, rack-airflow-design, env-monitoring-setup）を追加する。**このフェーズだけが新カテゴリ `facility`（物理設備）を新設する**ため、`web/src/lib/types.ts` と `web/src/components/Library.tsx` にも変更が必要（他フェーズ2〜5は既存カテゴリのみを使うためこの2ファイルは触らない）。物理設備工事系は実機を伴わなくても「表の四則演算＋合否判定」または「ipmitool/lldpctl/ethtool等の模擬出力の読解」で完結する設計であることが既に確定している。他フェーズと独立して並列進行できるが、`web/src/lib/templates.ts` への追記部分は他フェーズのPRとマージ順序によって軽微なコンフリクトが起こり得る（追記のみなので解決は容易）。

## Files to read before implementing
1. `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-design.md`: 全体設計。「#### フェーズ6」節（125〜141行目）と「### 3. Web UI登録変更」節にこのフェーズのカテゴリ新設内容が記載されている
2. `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-scenario-details.md`: 315行目以降「## フェーズ6」節に10シナリオそれぞれの学習目標・用語解説候補・手順概要・動作確認・注意事項が確定済みで記載されている
3. `docs/superpowers/specs/2026-07-02-ai-infra-templates-design.md`: 「ai」カテゴリを新設した際の前例（新規アイコンを作らず既存アイコンを流用する方針、`types.ts`/`Library.tsx`の変更箇所の実例）
4. `docs/superpowers/plans/2026-07-12-phase1-brush-up-existing-templates.md`: フェーズ1の実装計画。タスク粒度・検証スクリプト・コミット単位の実例
5. `web/src/lib/types.ts`: `TemplateCategory` に `"facility"` を追加する対象ファイル
6. `web/src/components/Library.tsx`: `CATS` 配列に `{ id: 'facility', label: '物理設備', icon: 'server' }` を追加する対象ファイル（新規SVGは作らず既存の `server` アイコンを流用する）
7. `web/src/lib/templates.ts`: 新規10エントリを `META` 配列に追加する対象ファイル
8. `tests/unit/test_example_templates_render.py`: 新規10ペアを追加するだけで自動的にカバーされる（変更不要）

## Implementation
まず `web/src/lib/types.ts` の `TemplateCategory` に `"facility"` を追加し、`web/src/components/Library.tsx` の `CATS` 配列に `{ id: 'facility', label: '物理設備', icon: 'server' }` を追加する（このステップだけ最初に1コミットで済ませる）。

続いて以下の10シナリオを追加する。全て `category: "facility"`。各シナリオは `assets/examples/<id>.<format>` + `assets/examples/<id>.j2` のペアとして実装し、`web/src/lib/templates.ts` の `META` 配列に1エントリずつ追加する。

| id | name | subCategory | format |
| --- | --- | --- | --- |
| rack-power-budget | ラック電源容量設計（ブレーカーマージン計算） | 電源設計 | csv |
| rack-mount-layout | ラックマウント搭載位置設計 | ラック設計 | csv |
| dual-power-redundancy | 二重電源冗長化チェック（PDU系統分散） | 電源設計 | csv |
| structured-cabling-plan | 構造化配線・配線表作成 | ケーブリング | csv |
| lan-cable-category | LANケーブルカテゴリ選定と敷設確認 | ケーブリング | csv |
| ups-capacity-plan | UPS容量計算とバックアップ時間設計 | 電源設計 | yaml |
| cable-labeling-standard | ケーブルラベリング規約適用 | ケーブリング | csv |
| server-racking-procedure | サーバラッキング作業手順（レール・搭載・接地） | ラッキング | yaml |
| rack-airflow-design | エアフロー設計とブランクパネル計画 | 環境設計 | yaml |
| env-monitoring-setup | 温湿度モニタリング設置と閾値設計 | 環境監視 | yaml |

実機がなくても実施可能な設計であること（表の四則演算＋合否判定、または ipmitool/lldpctl/ethtool 等の模擬出力の読解）を各テンプレートの手順で徹底する。感電・機器落下等の実害を伴う手順は含めない。`server-racking-procedure` は選外候補「接地・静電気対策チェックリスト」の接地確認ステップを統合済みの設計とすること（scenario-details.md 参照）。

進め方は superpowers:writing-plans でこのフェーズ専用の実装計画を作成し、superpowers:subagent-driven-development で1シナリオずつ実装する（実装→仕様準拠レビュー→品質レビューの2段階、指摘は差し戻して修正・再レビュー）。フェーズ1で発見された既知のバグクラス（グロッサリー用語の grounding 両方向）を各テンプレートで必ずチェックする。実装完了後は必ず `/code-review`（高効度）を1回実行し、指摘を修正してからPRを作成する。

## Verification
実装中・完了後に実行する:

    cd /home/user/command-ghostwriter
    uv run pytest -k 'not e2e' -q
    cd web && npx tsc --noEmit && npm test -- --run

Expected: 既存448件＋新規10件のレンダリングテストが全てPASS、tscエラー0件。`facility` カテゴリ追加によるTypeScriptの型エラーがないこと。

    git diff origin/develop...HEAD --stat

Expected: `assets/examples/*` の新規20ファイル（10ペア）、`web/src/lib/types.ts`、`web/src/components/Library.tsx`、`web/src/lib/templates.ts` の変更。

## PR creation
PR #543 の本文構成（Summary / Test plan / Refs）を踏襲し、ASCIIのみで記述する。Suggested title:

    Phase 6: add facility category and 10 physical-infrastructure training scenarios (Closes #549)

作成後は `subscribe_pr_activity` で監視し、CI失敗・レビューコメントに対応する。他フェーズのPRが先にマージされている場合は `web/src/lib/templates.ts` の追記部分でコンフリクトが起きる可能性があるため、マージ前に develop の最新を取り込んでrebaseすること。

## Acceptance criteria
- [ ] `web/src/lib/types.ts` の `TemplateCategory` に `"facility"` が追加されている
- [ ] `web/src/components/Library.tsx` の `CATS` に facility カテゴリ（アイコンは既存の `server` を流用）が追加されている
- [ ] 10シナリオ全てが `assets/examples/` に `<id>.<format>` + `<id>.j2` のペアで存在する
- [ ] `web/src/lib/templates.ts` に10エントリ追加済み
- [ ] `uv run pytest -k 'not e2e'` が全件PASS（既存448件＋新規10件）
- [ ] `cd web && npx tsc --noEmit` がエラー0件
- [ ] `/code-review` を実行し、指摘を修正済み
- [ ] PRのCIが全てgreen
