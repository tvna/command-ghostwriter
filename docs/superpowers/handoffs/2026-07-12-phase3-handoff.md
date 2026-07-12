# Handoff: フェーズ3 障害対応/監視/ログシナリオ9本の追加

## Context
- Issue: #546（親issue #541）
- Branch: `claude/phase3-incident-monitoring-templates`（既存・origin/develop 最新から作成済み。新規ブランチは作らない）
- Closes: #546

## Background
親issue #541「未経験者向けインフラ研修シナリオテンプレートの整備」のフェーズ3。フェーズ1（issue #542・PR #543・2026-07-12マージ済み）で確立した6セクション構成とレビュー手法を踏襲し、新規シナリオ9本（disk-usage-triage, systemd-service-recovery, cron-healthcheck, load-spike-triage, logrotate-setup, web-error-log-triage, oom-memory-triage, mail-delivery-triage, alert-first-response）を追加する。シナリオ選定はfableサブエージェントのブレインストーミング結果を統合済みで、当初案にあった `cert-expiry-monitor`（cron定期点検）はフェーズ4の `cert-expiry-watch` に統合済みのためこのフェーズには含まれない。他フェーズ（2, 4〜6）と完全に独立して並列進行できる。

## Files to read before implementing
1. `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-design.md`: 全体設計。「#### フェーズ3」節（71〜87行目）にこのフェーズの対象一覧とカテゴリ/format表がある
2. `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-scenario-details.md`: 87〜160行目「## フェーズ3」節に9シナリオそれぞれの学習目標・用語解説候補・手順概要・動作確認・注意事項が確定済みで記載されている
3. `docs/superpowers/plans/2026-07-12-phase1-brush-up-existing-templates.md`: フェーズ1の実装計画。タスク粒度・検証スクリプト・コミット単位の実例
4. `assets/examples/incident-campus.j2` と `assets/examples/incident-campus.yaml`: 障害対応系（runbook カテゴリ）テンプレートの実例。手順本文がデータファイル駆動（`{{ s.check }}` 等）である点を参照する
5. `web/src/lib/templates.ts`: 新規9エントリを `META` 配列に追加する対象ファイル
6. `tests/unit/test_example_templates_render.py`: 新規9ペアを追加するだけで自動的にカバーされる（変更不要）

## Implementation
以下の9シナリオを追加する。各シナリオは `assets/examples/<id>.<format>` + `assets/examples/<id>.j2` のペアとして実装し、`web/src/lib/templates.ts` の `META` 配列に1エントリずつ追加する。

| id | name | category | subCategory | format |
| --- | --- | --- | --- | --- |
| disk-usage-triage | ディスク使用率100%障害の切り分けと復旧 | runbook | ディスク | yaml |
| systemd-service-recovery | systemdサービス起動失敗の調査と復旧 | runbook | systemd復旧 | yaml |
| cron-healthcheck | cronとシェルスクリプトによる簡易死活監視の構築 | server | 監視 | csv |
| load-spike-triage | サーバ負荷急増時の一次切り分け | runbook | 負荷 | yaml |
| logrotate-setup | logrotateによるログローテーション設定 | server | ログ運用 | csv |
| web-error-log-triage | Webサーバの5xxエラー多発時のログ調査 | runbook | Webログ | yaml |
| oom-memory-triage | メモリ枯渇・OOM Killer発動時の切り分け | runbook | メモリ | yaml |
| mail-delivery-triage | メール送信不能（Postfix）の切り分け | runbook | メール | yaml |
| alert-first-response | アラート一次対応の型（受信から報告まで） | runbook | 一次対応 | yaml |

各シナリオの詳細は scenario-details.md にそのまま使える形で記載済み。特に `cron-healthcheck` は同フェーズ内の重複ではなく **フェーズ5の `cron-scheduling`**（crontab書式そのものの入門）と焦点を分離する設計であることに注意（scenario-details.md の当該「注意事項」欄に明記済み）。`oom-memory-triage` は意図的なメモリ枯渇の再現をさせず既発生の証跡調査型として設計すること。`mail-delivery-triage` は外部宛の実配送を行わずローカル配送前提で設計すること。

進め方は superpowers:writing-plans でこのフェーズ専用の実装計画を作成し、superpowers:subagent-driven-development で1シナリオずつ実装する（実装→仕様準拠レビュー→品質レビューの2段階、指摘は差し戻して修正・再レビュー）。フェーズ1で発見された既知のバグクラス（グロッサリー用語の grounding 両方向、既存Jinja2ロジックの隠れたバグの有無を事前レンダリングで確認）を各テンプレートで必ずチェックする。実装完了後は必ず `/code-review`（高効度）を1回実行し、指摘を修正してからPRを作成する。

## Verification
実装中・完了後に実行する:

    cd /home/user/command-ghostwriter
    uv run pytest -k 'not e2e' -q
    cd web && npx tsc --noEmit && npm test -- --run

Expected: 既存448件＋新規9件のレンダリングテストが全てPASS、tscエラー0件。

    git diff origin/develop...HEAD --stat

Expected: `assets/examples/*` の新規18ファイル（9ペア）と `web/src/lib/templates.ts` の変更のみ。

## PR creation
PR #543 の本文構成（Summary / Test plan / Refs）を踏襲し、ASCIIのみで記述する。Suggested title:

    Phase 3: add 9 incident/monitoring/log training scenarios (Closes #546)

作成後は `subscribe_pr_activity` で監視し、CI失敗・レビューコメントに対応する。

## Acceptance criteria
- [ ] 9シナリオ全てが `assets/examples/` に `<id>.<format>` + `<id>.j2` のペアで存在する
- [ ] `web/src/lib/templates.ts` に9エントリ追加済み
- [ ] `uv run pytest -k 'not e2e'` が全件PASS（既存448件＋新規9件）
- [ ] `cd web && npx tsc --noEmit` がエラー0件
- [ ] `/code-review` を実行し、指摘を修正済み
- [ ] PRのCIが全てgreen
