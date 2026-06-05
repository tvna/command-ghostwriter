# Harden Runner 撤去可否の調査 [課金回避の妥当性検証]

- Issue: #355
- ブランチ: claude/harden-runner-network-control-HZEck
- 調査日: 2026-06-05
- ステータス: 協議中 [撤去判断は保留]

## 背景 [Why]

「GitHub Actions の課金回避のため `step-security/harden-runner` を撤去したい」という提案があった。撤去に着手する前に、Harden Runner が本当にこのリポジトリの課金源なのかを検証した。

## Harden Runner のネットワーク制御の仕組み [推測]

ワークフロー設定 [`reusable-test-and-build.yml` 他] から読み取れる事実と、その挙動からの推測は以下のとおり。

事実 [設定上]:

- 全ジョブの先頭で `step-security/harden-runner@ec9f2d5744a09debf3a187a3f4f675c53b671911` [v2.13.0] を起動。
- 制御モードは env `HARDEN_RUNNER_EGRESS_POLICY` で一元管理。`reusable` / `on-push` は `block` [遮断]、`on-pr` / `on-merged` は `audit` [監視のみ]。
- `allowed-endpoints` に `api.github.com:443` / `pypi.org:443` / `registry.npmjs.org:443` などをジョブ単位で最小列挙 [`EP_*` 変数で構成]。
- `disable-sudo: true` [macOS の E2E ジョブのみ false]。

推測 [Ubuntu ランナーでの内部動作]:

- ジョブ冒頭で特権エージェントを導入し、`/etc/resolv.conf` をローカル DNS プロキシへ向け替えて名前解決を傍受。`allowed-endpoints` のドメインのみ解決し、解決済み IP を許可リストへ動的追加する。
- iptables/nftables で egress フィルタを構成し、`block` では許可 IP:ポート以外を DROP、`audit` では DROP せず通信先を記録する。
- eBPF でプロセス単位の接続・ファイル書込みを相関監視し、ジョブ後にレポート化する。

## 調査結果 [事実・出典あり]

| 項目 | 確認結果 | 根拠 |
|---|---|---|
| リポジトリ可視性 | public [`private=false` / `visibility=public`] | GitHub API |
| Harden Runner Community Tier | public リポジトリは無料 [block/audit と公開 Insights を含む] | StepSecurity pricing/docs |
| Harden Runner Enterprise Tier | private リポジトリのみ有料。課金は過去90日のコントリビューター数ベース | StepSecurity pricing |
| Community Tier の上限 | 週 約10,000 runs。超過後も実行は継続し enforce が無効化されるのみ。課金には転じない | StepSecurity docs |
| GitHub Actions 実行時間 | public リポジトリは標準ランナーで無料 | GitHub Actions 料金 |

## 結論 [Why Not 撤去]

- 本リポジトリは public であるため、Harden Runner [Community Tier] による StepSecurity 課金は発生しない。
- public リポジトリのため、標準ランナーでの GitHub Actions 実行時間も無料。
- したがって Harden Runner を撤去しても課金は減らず、サプライチェーン防御・egress 制御という防御層のみを失う。コスト面の利点はゼロ。
- 以上より、課金回避を理由とする撤去は妥当性を欠くため保留とする。

## 残課題 [真の課金源の特定]

実際に課金が観測されている場合、Harden Runner 以外の以下が原因である可能性が高い。次のいずれかで切り分ける。

- GitHub の Billing 明細 [Settings -> Billing] の該当項目を確認する。
  - larger runner / self-hosted runner の利用
  - Actions のアーティファクト/キャッシュ ストレージ超過
  - GitHub Packages / LFS の帯域・ストレージ
- 将来 private 化する予定がある場合は、撤去ではなく private 化時点での Enterprise 判断として整理する。

## 運用 [本提案の昇格・破棄]

- 真の課金源が判明し撤去/存置が確定したら、決定の経緯を `docs/history/` へ記録し、本ファイルは `docs/proposals/` から削除する。

## 出典 [Sources]

- StepSecurity Pricing: https://www.stepsecurity.io/pricing
- Harden-Runner Docs: https://docs.stepsecurity.io/harden-runner
- Quickstart [Community Tier]: https://docs.stepsecurity.io/getting-started/quickstart-community-tier
- step-security/harden-runner: https://github.com/step-security/harden-runner
