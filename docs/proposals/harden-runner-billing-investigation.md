# Harden Runner 撤去可否の調査 [上限到達への対応]

- Issue: #355
- ブランチ: claude/harden-runner-network-control-HZEck
- 調査日: 2026-06-05
- ステータス: 協議中 [撤去/存置/縮小の判断は保留]

## 背景 [Why]

当初「GitHub Actions の課金回避のため `step-security/harden-runner` を撤去したい」という提案があった。調査の過程で前提が訂正された。実際に観測されたのは **課金ではなく、StepSecurity Community Tier の上限到達メッセージ** [StepSecurity の画面/ログで確認] であった。本調査は、上限到達の正体と、撤去がその対処として妥当かを検証する。

## Harden Runner のネットワーク制御の仕組み [推測]

ワークフロー設定 [`reusable-test-and-build.yml` 他] から読み取れる事実と、その挙動からの推測は以下のとおり。

事実 [設定上]:

- 全ジョブの先頭で `step-security/harden-runner@ec9f2d5744a09debf3a187a3f4f675c53b671911` [v2.13.0] を起動。
- 制御モードは env `HARDEN_RUNNER_EGRESS_POLICY` で一元管理。`reusable` / `on-push` は `block` [遮断]、`on-pr` / `on-merged` は `audit` [監視のみ]。
- `allowed-endpoints` に `api.github.com:443` / `pypi.org:443` / `registry.npmjs.org:443` などをジョブ単位で最小列挙 [`EP_*` 変数で構成]。
- `disable-sudo: true` [macOS の E2E ジョブのみ false]。
- macOS/Windows を含むマトリクスジョブが存在する [test-multi-platform、E2E、on-merged ビルド]。設定コメントどおり Harden Runner は macOS/Windows では no-op。

推測 [Ubuntu ランナーでの内部動作]:

- ジョブ冒頭で特権エージェントを導入し、`/etc/resolv.conf` をローカル DNS プロキシへ向け替えて名前解決を傍受。`allowed-endpoints` のドメインのみ解決し、解決済み IP を許可リストへ動的追加する。
- iptables/nftables で egress フィルタを構成し、`block` では許可 IP:ポート以外を DROP、`audit` では DROP せず通信先を記録する。
- eBPF でプロセス単位の接続・ファイル書込みを相関監視し、ジョブ後にレポート化する。

## 調査結果 [事実・出典あり]

| 項目 | 確認結果 | 根拠 |
|---|---|---|
| 観測された事象 | 課金ではなく StepSecurity Community Tier の上限到達 | 利用者の確認 [StepSecurity 画面/ログ] |
| リポジトリ可視性 | public [`private=false` / `visibility=public`] | GitHub API |
| Harden Runner Community Tier | public リポジトリは無料 [block/audit と公開 Insights を含む] | StepSecurity pricing/docs |
| Community Tier の上限 | 公式記載は週 10,000 runs。超過後も実行は継続し enforce が無効化される [監視のみ] のみ。課金にもビルド失敗にも転じない | StepSecurity docs |
| 上限の周期 | 利用者は「月間」と認識。公式記載は「週次」。文言/記憶の差があり要確認 | 突合の不一致 |
| GitHub Actions 実行時間 | public リポジトリは標準ランナーで無料 | GitHub Actions 料金 |

## 結論 [What]

- 観測事象は **課金ではない**。StepSecurity Community Tier の上限到達であり、**金銭的コストは発生していない**。
- 上限到達の唯一の影響は **enforcement の自動停止 [監視のみへの降格]** であり、ビルドは失敗しない。
- したがって「課金回避」を根拠とする撤去は **前提が成立しない**。撤去すればサプライチェーン防御・egress 制御の層を失うだけで、金銭面の利点はゼロ。
- 一方で「上限到達中は防御が実際には効いていない」という **防御実効性の低下** は実在の論点。これは撤去ではなく Harden Runner の起動回数を上限内に収めることで解決しうる。

## 選択肢 [Why / Why Not]

1. 存置 [現状維持]
   - Why: 金銭コストはゼロ。Linux ジョブでは上限内なら防御が効く。変更の blast radius なし。
   - Why Not: 上限到達中は監視のみへ降格し、防御が一時的に無効。上限メッセージは残る。
2. フットプリント縮小 [推奨候補]
   - Why: no-op の macOS/Windows ジョブから Harden Runner を外し、起動回数を上限内に抑える。Linux ジョブの防御は維持。防御実効性と上限の両立。
   - Why Not: macOS/Windows での Harden Runner 起動が上限カウントに含まれるか要検証。含まれないなら効果は限定的。
3. 全面撤去
   - Why: 構成が最も単純化。上限メッセージは消える。
   - Why Not: CLAUDE.md の多層防御方針に反し、egress 制御・サプライチェーン防御を全廃。金銭的利点はないため割に合わない。

## 残課題 [判断の確定に必要な確認]

- 上限の正確な周期と文言 [週次/月間] を StepSecurity の画面で確認する。
- macOS/Windows での Harden Runner 起動が Community Tier の run カウントに含まれるかを確認する [選択肢2 の効果を左右]。
- 上限到達の頻度と、その間の防御無効化を許容できるかを判断する。

## 運用 [本提案の昇格・破棄]

- 撤去/存置/縮小が確定したら、決定の経緯を `docs/history/` へ記録し、本ファイルは `docs/proposals/` から削除する。

## 出典 [Sources]

- StepSecurity Pricing: https://www.stepsecurity.io/pricing
- Harden-Runner Docs: https://docs.stepsecurity.io/harden-runner
- Quickstart [Community Tier]: https://docs.stepsecurity.io/getting-started/quickstart-community-tier
- step-security/harden-runner: https://github.com/step-security/harden-runner
