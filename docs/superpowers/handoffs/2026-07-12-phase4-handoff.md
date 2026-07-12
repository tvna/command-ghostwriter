# Handoff: フェーズ4 セキュリティ/バックアップシナリオ10本の追加

## Context
- Issue: #547（親issue #541）
- Branch: `claude/phase4-security-backup-templates`（既存・origin/develop 最新から作成済み。新規ブランチは作らない）
- Closes: #547

## Background
親issue #541「未経験者向けインフラ研修シナリオテンプレートの整備」のフェーズ4。フェーズ1（issue #542・PR #543・2026-07-12マージ済み）で確立した6セクション構成とレビュー手法を踏襲し、新規シナリオ10本（ssh-key-hygiene, rsync-daily-backup, restore-drill, sudo-least-privilege, password-policy-basics, log-integrity-hash, account-audit, cert-expiry-watch, fail2ban-ssh-guard, vuln-patch-triage）を追加する。他フェーズ（2, 3, 5, 6）と完全に独立して並列進行できる。

## Files to read before implementing
1. `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-design.md`: 全体設計。「#### フェーズ4」節（88〜105行目）にこのフェーズの対象一覧とカテゴリ/format表がある
2. `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-scenario-details.md`: 161〜248行目「## フェーズ4」節に10シナリオそれぞれの学習目標・用語解説候補・手順概要・動作確認・注意事項が確定済みで記載されている
3. `docs/superpowers/plans/2026-07-12-phase1-brush-up-existing-templates.md`: フェーズ1の実装計画。タスク粒度・検証スクリプト・コミット単位の実例
4. `assets/examples/zero-trust-access.j2` と `assets/examples/zero-trust-access.yaml`: セキュリティ系テンプレートの実例（証明書・鍵の扱い、ロックアウト防止の手順順序の書き方の参考になる）
5. `web/src/lib/templates.ts`: 新規10エントリを `META` 配列に追加する対象ファイル
6. `tests/unit/test_example_templates_render.py`: 新規10ペアを追加するだけで自動的にカバーされる（変更不要）

## Implementation
以下の10シナリオを追加する。各シナリオは `assets/examples/<id>.<format>` + `assets/examples/<id>.j2` のペアとして実装し、`web/src/lib/templates.ts` の `META` 配列に1エントリずつ追加する。

| id | name | category | subCategory | format |
| --- | --- | --- | --- | --- |
| ssh-key-hygiene | SSH鍵管理のベストプラクティス | server | SSH | toml |
| rsync-daily-backup | rsyncによる日次バックアップ取得 | server | バックアップ | yaml |
| restore-drill | バックアップからのリストア訓練 | runbook | リストア | yaml |
| sudo-least-privilege | sudo権限の最小化 | server | sudo | yaml |
| password-policy-basics | パスワードポリシーの設定 | server | 認証 | toml |
| log-integrity-hash | ログ改ざん検知の基礎（ハッシュ検証） | server | ログ保全 | toml |
| account-audit | 不要アカウントの棚卸しとロック | runbook | 棚卸し | csv |
| cert-expiry-watch | TLS証明書の期限確認と更新運用 | runbook | 証明書 | csv |
| fail2ban-ssh-guard | fail2banによるSSHブルートフォース対策 | server | 侵入対策 | toml |
| vuln-patch-triage | 脆弱性スキャン結果への一次対応 | runbook | 脆弱性対応 | csv |

`cert-expiry-watch` は scenario-details.md の記載どおり、フェーズ3案（cron定期点検）とフェーズ4原案（dry-run更新）を統合した「定期点検（cron+openssl）→更新（dry-run→実更新）」まで一気通貫のシナリオとして実装すること（フェーズ3の `logrotate-setup` 等とは無関係、統合はこのフェーズ内で完結する）。`restore-drill` は `rsync-daily-backup` と対で運用する想定（学習順を意識した記述にする）。`fail2ban-ssh-guard` は `ignoreip` に管理端末を必ず登録する手順を含めること（自己ロックアウト防止）。

進め方は superpowers:writing-plans でこのフェーズ専用の実装計画を作成し、superpowers:subagent-driven-development で1シナリオずつ実装する（実装→仕様準拠レビュー→品質レビューの2段階、指摘は差し戻して修正・再レビュー）。フェーズ1で発見された既知のバグクラス（グロッサリー用語の grounding 両方向、既存Jinja2ロジックの隠れたバグの有無を事前レンダリングで確認）を各テンプレートで必ずチェックする。実装完了後は必ず `/code-review`（高効度）を1回実行し、指摘を修正してからPRを作成する。

## Verification
実装中・完了後に実行する:

    cd /home/user/command-ghostwriter
    uv run pytest -k 'not e2e' -q
    cd web && npx tsc --noEmit && npm test -- --run

Expected: 既存448件＋新規10件のレンダリングテストが全てPASS、tscエラー0件。

    git diff origin/develop...HEAD --stat

Expected: `assets/examples/*` の新規20ファイル（10ペア）と `web/src/lib/templates.ts` の変更のみ。

## PR creation
PR #543 の本文構成（Summary / Test plan / Refs）を踏襲し、ASCIIのみで記述する。Suggested title:

    Phase 4: add 10 security/backup training scenarios (Closes #547)

作成後は `subscribe_pr_activity` で監視し、CI失敗・レビューコメントに対応する。

## Acceptance criteria
- [ ] 10シナリオ全てが `assets/examples/` に `<id>.<format>` + `<id>.j2` のペアで存在する
- [ ] `web/src/lib/templates.ts` に10エントリ追加済み
- [ ] `uv run pytest -k 'not e2e'` が全件PASS（既存448件＋新規10件）
- [ ] `cd web && npx tsc --noEmit` がエラー0件
- [ ] `/code-review` を実行し、指摘を修正済み
- [ ] PRのCIが全てgreen
