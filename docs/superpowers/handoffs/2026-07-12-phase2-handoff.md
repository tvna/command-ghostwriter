# Handoff: フェーズ2 DNS/クラウド/仮想化シナリオ10本の追加

## Context
- Issue: #545（親issue #541）
- Branch: `claude/phase2-dns-cloud-templates`（既存・origin/develop 最新から作成済み。新規ブランチは作らない）
- Closes: #545

## Background
親issue #541「未経験者向けインフラ研修シナリオテンプレートの整備」のフェーズ2。フェーズ1（既存9テンプレートのブラッシュアップ、issue #542・PR #543・2026-07-12マージ済み）で確立した「目的/用語解説/シナリオ設定/手順/動作確認/注意事項」の6セクション構成とレビュー手法を踏襲し、新規シナリオ10本（docker-basic-ops, dns-resolve-troubleshoot, kvm-snapshot-restore, aws-ec2-basic-ops, dns-record-migration, virsh-vm-lifecycle, aws-s3-backup-basics, dnsmasq-office-dns, dns-secondary-transfer, podman-rootless-service）を追加する。シナリオ選定・教育効果評価はfableサブエージェントによるブレインストーミングで既に完了しており、設計・詳細は committed 済みのspecドキュメントに全て記載されている。このフェーズは他フェーズ（3〜6）と完全に独立して並列進行できる（新規ファイルの追加が中心で、共有ファイルへの変更は `web/src/lib/templates.ts` への追記のみ）。

## Files to read before implementing
1. `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-design.md`: 全体設計。特に「ドキュメント構造（共通仕様）」節と「#### フェーズ2」節（71行目まで）にこのフェーズの対象一覧とカテゴリ/format表がある
2. `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-scenario-details.md`: 5〜86行目「## フェーズ2」節に10シナリオそれぞれの学習目標・用語解説候補・手順概要・動作確認・注意事項が確定済みで記載されている。これが実装のそのままの素材になる
3. `docs/superpowers/plans/2026-07-12-phase1-brush-up-existing-templates.md`: フェーズ1の実装計画。タスクの粒度・レンダリング確認スクリプトの書き方・コミット単位の実例として参照する（このフェーズはブラッシュアップでなく新規作成だが、検証手順とレビュー観点の型は同じ）
4. `assets/examples/dns-zone.j2` と `assets/examples/dns-zone.toml`: 既存テンプレートの `.j2`+データファイルペアの実例（6セクション構成が既に反映済み）
5. `web/src/lib/templates.ts`: 新規10エントリを `META` 配列に追加する対象ファイル
6. `web/src/lib/types.ts`: `TemplateCategory`（`"network" | "server" | "dns" | "runbook" | "ai"`）。フェーズ2は既存カテゴリのみ使うため変更不要、値の確認用
7. `tests/unit/test_example_templates_render.py`: `assets/examples/*.j2` を basename一致で自動検出してstrict-undefinedでレンダリング検証する既存テスト。新規10ペアを追加するだけで自動的にカバーされる（変更不要）

## Implementation
以下の10シナリオを追加する。各シナリオは `assets/examples/<id>.<format>` + `assets/examples/<id>.j2` のペアとして実装し、`web/src/lib/templates.ts` の `META` 配列に1エントリずつ追加する（既存の慣例に従う。`updated` は実装日）。

| id | name | category | subCategory | format |
| --- | --- | --- | --- | --- |
| docker-basic-ops | Dockerコンテナ基本操作 | server | Docker | yaml |
| dns-resolve-troubleshoot | 名前解決トラブルの切り分け | runbook | DNS切り分け | yaml |
| kvm-snapshot-restore | 変更作業前のVMスナップショット取得と復元 | runbook | KVMスナップショット | yaml |
| aws-ec2-basic-ops | AWS CLIでEC2インスタンスを作成・停止・削除する | server | AWS CLI | yaml |
| dns-record-migration | サーバ移転に伴うDNSレコード切替（TTL事前調整） | dns | DNS切替 | csv |
| virsh-vm-lifecycle | virshでLinux VMを作成して起動・停止する | server | KVM/libvirt | toml |
| aws-s3-backup-basics | AWS CLIでS3バケットを作りバックアップを保管する | server | AWS CLI | yaml |
| dnsmasq-office-dns | dnsmasqで小規模オフィスの内部DNSを立てる | dns | dnsmasq | toml |
| dns-secondary-transfer | セカンダリDNSを追加してゾーン転送で冗長化する | dns | BIND冗長化 | toml |
| podman-rootless-service | Podmanでrootlessコンテナを常時起動サービス化する | server | Podman | yaml |

各シナリオの学習目標・用語解説候補・手順概要・動作確認項目・注意事項は scenario-details.md の該当セクションにそのまま使える形で記載済み。それを元に `.j2` テンプレート本文（Jinjaループ・変数を使った実際の手順）と対応するデータファイルを作成する。dns-resolve-troubleshoot は scenario-details.md の注記どおり `/etc/hosts` と `dig` の差分を実演するステップを含めること。cert-expiry関連の統合注記はフェーズ2には無関係（フェーズ4の話）なので無視してよい。

進め方は superpowers:writing-plans でこのフェーズ専用の実装計画を `docs/superpowers/plans/` に作成し、superpowers:subagent-driven-development で1シナリオずつ実装（実装→仕様準拠レビュー→品質レビューの2段階、指摘は同一実装エージェントに差し戻して修正・再レビュー）する。フェーズ1で発見された既知のバグクラス（グロッサリー用語が実際のレンダリング結果に登場しない／逆に本文で使われている用語が未解説）を各テンプレートで必ずチェックすること。実装完了後は必ず `/code-review`（高効度）を1回実行し、指摘を修正してからPRを作成する。

Option A（推奨）: フェーズ1と同じ粒度（1シナリオ=1タスク、各タスクに実装+レンダリング確認+コミットのステップ）で計画する。Option B: 10シナリオをまとめて先に全データファイル作成→全テンプレート作成→一括レンダリング確認、の2段階にする。Option Aを推奨する理由はフェーズ1で実証済みで、レビューの粒度が細かく保てるため。

## Verification
実装中・完了後に実行する:

    cd /home/user/command-ghostwriter
    uv run pytest -k 'not e2e' -q
    cd web && npx tsc --noEmit && npm test -- --run

Expected: 既存448件＋新規10件のレンダリングテストが全てPASS、tscエラー0件、Webテストは既存のPyodide render-parityスイート以外が全てPASS（このスイートはネットワーク制限のある実行環境では実行できないことがあるが、テンプレート内容には依存しないため回帰の判断材料にはならない）。

    git diff origin/develop...HEAD --stat

Expected: `assets/examples/*` の新規20ファイル（10ペア）と `web/src/lib/templates.ts` の変更のみ。`web/src/lib/types.ts` や `Library.tsx` は変更しない。

## PR creation
`.github/pull_request_template.md` は存在しないため、PR #543 の本文構成（Summary / Test plan / Refs）を踏襲する。ASCII のみで記述すること（コミットメッセージ・PRタイトル・PR本文とも）。Suggested title:

    Phase 2: add 10 DNS/cloud/virtualization training scenarios (Closes #545)

作成後は `subscribe_pr_activity` で監視し、CI失敗・レビューコメントに対応する。

## Acceptance criteria
- [ ] 10シナリオ全てが `assets/examples/` に `<id>.<format>` + `<id>.j2` のペアで存在する
- [ ] `web/src/lib/templates.ts` に10エントリ追加済み
- [ ] `uv run pytest -k 'not e2e'` が全件PASS（既存448件＋新規10件）
- [ ] `cd web && npx tsc --noEmit` がエラー0件
- [ ] `/code-review` を実行し、指摘を修正済み
- [ ] PRのCIが全てgreen
