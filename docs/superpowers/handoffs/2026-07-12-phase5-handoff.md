# Handoff: フェーズ5 ネットワーク/サーバ基礎シナリオ8本の追加

## Context
- Issue: #548（親issue #541）
- Branch: `claude/phase5-network-server-templates`（既存・origin/develop 最新から作成済み。新規ブランチは作らない）
- Closes: #548

## Background
親issue #541「未経験者向けインフラ研修シナリオテンプレートの整備」のフェーズ5。フェーズ1（issue #542・PR #543・2026-07-12マージ済み）で確立した6セクション構成とレビュー手法を踏襲し、新規シナリオ8本（file-permissions, connectivity-check, systemd-unit-basics, port-listening-check, cron-scheduling, subnetting-basics, ntp-chrony, disk-mount-basics）を追加する。当初案にあった `name-resolution-client` はフェーズ2の `dns-resolve-troubleshoot` に統合済み、`log-management-basics` は不採用のためこのフェーズには含まれない。他フェーズ（2〜4, 6）と完全に独立して並列進行できる。

## Files to read before implementing
1. `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-design.md`: 全体設計。「#### フェーズ5」節（106〜124行目）にこのフェーズの対象一覧とカテゴリ/format表がある
2. `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-scenario-details.md`: 249〜314行目「## フェーズ5」節に8シナリオそれぞれの学習目標・用語解説候補・手順概要・動作確認・注意事項が確定済みで記載されている
3. `docs/superpowers/plans/2026-07-12-phase1-brush-up-existing-templates.md`: フェーズ1の実装計画。タスク粒度・検証スクリプト・コミット単位の実例
4. `assets/examples/linux-init.j2` と `assets/examples/linux-init.yaml`: server カテゴリの基礎系テンプレートの実例
5. `assets/examples/cisco-switchport.j2`: network カテゴリのテンプレート実例（`connectivity-check`, `port-listening-check`, `subnetting-basics` の3本はこのカテゴリになる）
6. `web/src/lib/templates.ts`: 新規8エントリを `META` 配列に追加する対象ファイル
7. `tests/unit/test_example_templates_render.py`: 新規8ペアを追加するだけで自動的にカバーされる（変更不要）

## Implementation
以下の8シナリオを追加する。各シナリオは `assets/examples/<id>.<format>` + `assets/examples/<id>.j2` のペアとして実装し、`web/src/lib/templates.ts` の `META` 配列に1エントリずつ追加する。

| id | name | category | subCategory | format |
| --- | --- | --- | --- | --- |
| file-permissions | ファイルパーミッションと所有者管理 | server | パーミッション | csv |
| connectivity-check | ping・tracerouteによる疎通確認の型 | network | 疎通確認 | csv |
| systemd-unit-basics | systemdサービスの基本操作とユニット作成 | server | systemd基本 | toml |
| port-listening-check | ssとncによるポート待受・疎通確認 | network | ポート確認 | csv |
| cron-scheduling | cronによる定期実行ジョブの設定 | server | cron | csv |
| subnetting-basics | IPアドレス設計とサブネット分割の基礎 | network | IPアドレス設計 | csv |
| ntp-chrony | chronyによるNTP時刻同期の設定 | server | 時刻同期 | toml |
| disk-mount-basics | ディスクのフォーマットとマウント入門（ループバック演習） | server | ディスク管理 | yaml |

`cron-scheduling` は **フェーズ3の `cron-healthcheck`**（cronを使った監視構築）と焦点を分離する設計であることに注意（scenario-details.md の「注意事項」欄に明記済み。このフェーズはcrontab書式・PATH問題・`-r`事故に集中し、監視スクリプトの構築には踏み込まない）。`systemd-unit-basics`（基礎操作）と既存の `systemd-service-recovery`（フェーズ3、障害復旧）はサブカテゴリ名で区別済みなので、内容も基礎操作に留め復旧手順まで踏み込まない。`disk-mount-basics` は `mkfs` の対象が必ずループバックデバイス（`/dev/loop*`）であることをテンプレート本文で強調し、実デバイスへの誤適用を防ぐ注意書きを含めること。

進め方は superpowers:writing-plans でこのフェーズ専用の実装計画を作成し、superpowers:subagent-driven-development で1シナリオずつ実装する（実装→仕様準拠レビュー→品質レビューの2段階、指摘は差し戻して修正・再レビュー）。フェーズ1で発見された既知のバグクラス（グロッサリー用語の grounding 両方向、既存Jinja2ロジックの隠れたバグの有無を事前レンダリングで確認）を各テンプレートで必ずチェックする。実装完了後は必ず `/code-review`（高効度）を1回実行し、指摘を修正してからPRを作成する。

## Verification
実装中・完了後に実行する:

    cd /home/user/command-ghostwriter
    uv run pytest -k 'not e2e' -q
    cd web && npx tsc --noEmit && npm test -- --run

Expected: 既存448件＋新規8件のレンダリングテストが全てPASS、tscエラー0件。

    git diff origin/develop...HEAD --stat

Expected: `assets/examples/*` の新規16ファイル（8ペア）と `web/src/lib/templates.ts` の変更のみ。

## PR creation
PR #543 の本文構成（Summary / Test plan / Refs）を踏襲し、ASCIIのみで記述する。Suggested title:

    Phase 5: add 8 network/server basics training scenarios (Closes #548)

作成後は `subscribe_pr_activity` で監視し、CI失敗・レビューコメントに対応する。

## Acceptance criteria
- [ ] 8シナリオ全てが `assets/examples/` に `<id>.<format>` + `<id>.j2` のペアで存在する
- [ ] `web/src/lib/templates.ts` に8エントリ追加済み
- [ ] `uv run pytest -k 'not e2e'` が全件PASS（既存448件＋新規8件）
- [ ] `cd web && npx tsc --noEmit` がエラー0件
- [ ] `/code-review` を実行し、指摘を修正済み
- [ ] PRのCIが全てgreen
