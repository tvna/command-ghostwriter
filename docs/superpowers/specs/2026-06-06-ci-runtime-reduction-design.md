# CI実行時間短縮 設計 (design)

- アンブレラIssue: #360
- 対象ブランチ: `claude/bold-curie-r2EiB`
- 作成日: 2026-06-06

## 1. 目的とスコープ

CI実行時間(壁時間・課金分の両方をバランス)を短縮する。ただしエッジケース/
単体テスト(404件)、カバレッジ計測、セキュリティ多層スキャンは一切落とさない。

対象ワークフロー: `.github/workflows/reusable-test-and-build.yml`
(PR/push/merged の各呼び出し元から共通利用される)。

## 2. 計測(事実)

直近の成功run #354, 全体 約13分。ジョブ別所要時間(長い順, 抜粋):

| ジョブ | 時間 | 種別 |
|---|---|---|
| E2E (windows & chromium) | 560s | E2E |
| ZAP (DAST) | 506s | security |
| E2E (windows & firefox) | 484s | E2E |
| E2E (macos & webkit) | 266s | E2E |
| Build desktop (windows) | 254s | build |
| E2E (macos & firefox) | 221s | E2E |
| E2E (macos & chromium) | 213s | E2E |
| Guard vulnerabilities | 74s | guard |
| Coverage | 42s | coverage |
| Small Unit Tests (各セル x9) | 30-36s | unit |

- 単体/エッジケース 404件はローカル実測 約14秒、CI各セル 30-36秒。既に `-n auto` で並列化済み。
- カバレッジ 42秒。これも `-n auto` 並列実行済み。
- 実際の長尺は E2E(最大560s)と ZAP(506s)。
- 課金軸: GitHub-hosted の係数は macOS=10x / Windows=2x / Linux=1x。
  E2E の macOS 3ブラウザ分(213+221+266=700s)x10 が課金を支配。
- クリティカルパス: guards(約74s) -> unit(約36s) -> E2E windows(560s) -> summary(約14s)
  約684秒 + キュー待ち ≒ 観測 約13分。

### 2.1 構造上の冗長(事実)

- `test-e2e` / `zap_scan` / `build-desktop` / `analysis-code-ccn` は全て
  `needs: small-unit-test`(9セル)に依存し、`small-unit-test` は4ガードに依存。
  結果、下流は guards+unit(約110秒)を待ってから開始する。これらの下流ジョブは
  単体テストの**出力を消費していない**(純粋な順序ゲート=fail-fast 目的のみ)。
- `test-coverage` は非E2E全404件を再実行(10回目)。ubuntu/3.13 の unit セルと重複。

## 3. 不変条件 (invariants) — 全 sub-issue 共通

- エッジケース/単体テスト 404件を削除・スキップしない(collect数で検証)。
- カバレッジ計測を維持: `--cov=app.py --cov=features --cov=i18n.py`,
  Codecov アップロード, codecov.yaml の target 80% / patch 80%。
- セキュリティ多層(Gitleaks/Trivy/Pyre/ZAP)を弱めない(スキャン深度不変)。
- 全アクションの SHA ピン留め, harden-runner egress 制御を維持。
- E2E のフレーク対策 `--reruns 2 --reruns-delay 1` を維持。

## 4. アーキテクチャ: アンブレラ + 3 sub-issue

各 sub-issue は独立PR・独立検証。PR本文に `Closes #<sub-issue番号>` を記載し、
**マージ時のみ**該当 sub-issue を自動クローズ(GitHub標準キーワード, ワークフロー追加不要)。
アンブレラ #360 は全 sub-issue 完了後に手動クローズ。

### sub-1: DAG再編 + カバレッジ冗長実行の排除(低リスク・即効)

**変更:**
1. `zap_scan` / `build-desktop` / `analysis-code-ccn` の `needs: small-unit-test`
   を外し、必要なガード群(または無依存)に変更。下流の開始を約110秒前倒し。
2. カバレッジ冗長の排除。次のいずれか1つを実装時に選択:
   - (a) `small-unit-test` の ubuntu/3.13 セルにカバレッジ計測を統合し、独立
     `test-coverage` ジョブを廃止。
   - (b) 独立 `test-coverage` を残し、`small-unit-test` マトリクスから ubuntu/3.13 を除外。
   - 既定推奨: (a)(ジョブ数とセットアップ往復を1本削減)。

**完了検証:**
- `actionlint` + `yamllint`(ローカル実行可)が通る。
- 実CI run で Codecov ステータス(target 80%)がグリーン。
- 実CI run のジョブ時間比較で下流開始の前倒しを確認。

**トレードオフ:** fail-fast を一部喪失(単体が落ちても E2E/ZAP/build が回る)。
`concurrency cancel-in-progress: true` により後続 push は打ち切られるため影響限定。
緑時の壁時間短縮と引き換えに、赤時の課金がやや増える。

### sub-2: E2Eマトリクス再設計 + シャーディング(計測駆動・最大効果)

**現状:** E2E 5セル(macOS x {chromium,firefox,webkit} + Windows x {chromium,firefox})。
各 `-n auto`。長尺 windows-chromium 560s。課金は macOS(10x)支配。E2E は 14関数 / 33ケース。

**変更(2段階):**
1. マトリクス再設計: chromium/firefox を **ubuntu(1x・高速)** に移設。webkit は
   playwright で ubuntu 実行可なら ubuntu に集約、不可/不安定なら macOS 1セル維持。
   Windows は代表1ブラウザに縮小(またはスモーク限定)。
   - 効果: 壁時間(ubuntu は windows/macos より高速)と課金(10x->1x)を同時削減。
   - 注意: 検証OS構成が変わる。E2E は Streamlit Web アプリのブラウザ検証であり
     OS依存は小さい(デスクトップ stlite ビルドは別途 build-desktop が macOS/Windows を担保)。
     OSカバレッジ変更の妥当性を本 spec で明示し、最終承認を得る。
2. シャーディング(必要時のみ): 固定コスト(playwright install)と可変コスト(33ケース)の
   比をまず実測。シャードが純増益のときに限り、テスト分割で複数 runner に分配。

**完了検証:**
- 新マトリクスでも E2E 全33ケースが実行される(collect数で確認)。
- `--reruns 2` 維持。
- 実CI run の before/after ジョブ時間表(壁時間・課金分)で改善を確認。

**トレードオフ:** OSマトリクス変更は検証プラットフォーム構成の変更(要承認)。
シャーディングは固定コスト多重化リスクがあるため計測前提。

### sub-3: ZAP/build のゲート分離・微調整(任意・低優先)

- sub-1 のゲート分離後、ZAP(506s)/build(254s)の前倒し効果を実CIで確認する。
- スキャン深度(セキュリティカバレッジ)は変更しない。
- 追加余地が小さければ sub-1 に吸収し、本 sub-issue は見送り可とする。

## 5. 検証の限界(事実)

- 本実行環境では「非E2E 404件のローカル pytest 実行」「actionlint/yamllint」は可能。
- Windows/macOS ランナー、実 GitHub Actions の壁時間/課金は**ローカル再現不可**。
- よって壁時間短縮・課金削減の最終証明は、ブランチ push 後の**実CI run のジョブ時間比較**
  でのみ可能。各 sub-issue の完了条件にこの前提を明記する。

## 6. 期待効果(speculation, 実CIで要検証)

- sub-1: クリティカルパス前段の待ち約110秒削減 + 冗長ジョブ1本削減。
- sub-2: クリティカルパスの長尺(E2E windows 560s)を半減狙い + macOS 10x 分の課金大幅減。
- 合計: 緑時の壁時間を 約13分 -> 6-8分 程度に短縮できる見込み(数値は実CIで確定)。

## 7. リスクと対策

- フレーク再発(特に webkit): `--reruns 2` 維持 + マトリクス変更後の連続実行で安定確認。
- カバレッジ低下: codecov.yaml の target を維持し、PRごとに Codecov ステータスで検出。
- セキュリティ低下: スキャン対象/深度を変更しないことを sub-issue のレビュー観点に固定。
- ロールバック容易性: 各 sub-issue は小さな独立PR。問題時は `git revert` で個別に戻す。
