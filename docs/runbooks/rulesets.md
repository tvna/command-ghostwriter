# Runbook: main保護ruleset [PAT発行からapply/verifyまで]

- 関連Issue: #503
- 対象: `.github/rulesets/*.json`（正本） + `.github/workflows/apply-rulesets.yml`（適用ワークフロー）+ `scripts/rulesets_apply.py`（適用スクリプト）
- 上流参照: `tvna/claude-md`の同名システムの簡略版。3PAT分割・週次ドリフト自動issue化・PR時同期gateは実装しない（YAGNI、[T6実行plan]参照）。

## 0. 前提と全体像

`.github/rulesets/*.json`がSoT（正本）。GitHubには自動適用されない——`apply-rulesets.yml`を`workflow_dispatch`で手動起動して初めてGitHub Repository Rulesets API (`GET/POST/PUT /repos/{repo}/rulesets`) へ反映される。

```
.github/rulesets/*.json を編集・コミット
  -> Actions > Apply rulesets > Run workflow (dry_run=true) でplan確認
  -> 意図通りならdry_run=falseで再dispatch -> 実際にGitHub側のrulesetを作成/更新
```

| ファイル | 対象 | 内容 |
|---|---|---|
| `.github/rulesets/all-branches.json` | デフォルトブランチ・`dependabot/*`・`chore/sync-*`を除く全ブランチ | force-push禁止（`non_fast_forward`）のみ。`tvna/claude-md`から`sync-agent-instructions.yml`の`sync-rulesets`ジョブで自動追従（PR経由、自動マージなし）。 |
| `.github/rulesets/main.json` | デフォルトブランチ（`main`） | PR必須・force-push禁止・線形履歴・署名必須・必須ステータスチェック1件。**command-ghostwriter固有の`required_status_checks`を含むため上流と同期しないローカル正本。** |

### `refs/heads/chore/sync-*`除外について（ローカル追加、上流との差分）

`all-branches.json`の`exclude`には、上流`tvna/claude-md`には存在しない`refs/heads/chore/sync-*`が含まれる。理由: `sync-agent-instructions.yml`の`sync-claude-md`・`sync-apm-skills`・`sync-rulesets`各ジョブは`peter-evans/create-pull-request@v8.1.1`（`sign-commits: true`）を使ってPRブランチを作成・更新するが、既存PRが未マージのまま次回スケジュール実行を迎えると、同ブランチへの更新は必ずforce-push相当の操作（signed commitsの場合はGitHub APIの`updateRef(..., force: true)`）を行う。`non_fast_forward`ルールが適用された状態でこれが起きると、週次sync PRの更新が失敗する（Codexレビュー指摘、PR #504で発覚）。

この除外は`sync-rulesets`ジョブが上流ファイルをコピーした**直後に、Pythonで決定的に再付与**する（レビュアーが手動で気付いて足し直す運用には頼らない）。ジョブが生成するPR本文にも「除外パターンが差分に含まれているはず」という自己点検の一文が入っている。万一再付与ロジックにバグがあり除外が消えた状態でPRが来たら、そのままマージしないこと。

## 1. 必須シークレット: `RULESETS_PAT`

| 項目 | 値 |
|---|---|
| 種別 | Fine-grained personal access token |
| Resource owner | `tvna` |
| リポジトリアクセス | `tvna/command-ghostwriter`のみ |
| リポジトリ権限 | **Administration: Read and write**（`/repos/{owner}/{repo}/rulesets`のGET/POST/PUTに必要）、**Metadata: Read-only**（fine-grained PATの必須付随権限） |
| 有効期限 | 90日以内。ローテーション予定日をカレンダー等に記録すること。 |
| 保存先 | `tvna/command-ghostwriter`リポジトリの`ruleset-apply` GitHub Environment secret |

### 発行手順

1. GitHubの自分のアカウント設定 > **Developer settings** を開く。
2. **Personal access tokens** > **Fine-grained tokens** を開く。
3. **Generate new token** を選ぶ。
4. トークン名を`RULESETS_PAT`にする。
5. 有効期限を90日以内に設定し、ローテーション予定日を控える。
6. **Resource owner**で`tvna`を選ぶ。
7. **Repository access**で**Only select repositories**を選び、`tvna/command-ghostwriter`のみを指定する。
8. **Repository permissions**で以下を設定する:
   - **Administration**: Read and write
   - **Metadata**: Read-only
9. トークンを生成し、一度だけ表示される値をコピーする。issue・PR・commit・ターミナル出力・このrunbookなど、いかなる場所にも値を貼り付けないこと。
10. `tvna/command-ghostwriter` > **Settings** > **Environments** を開く。
11. `ruleset-apply` Environmentを新規作成（無ければ）。
12. Environment secretとして`RULESETS_PAT`に上記トークン値を登録する。
13. `apply-rulesets.yml`を`dry_run=true`でdispatchし、guardステップが通り、実際の変更を伴わずplanがジョブサマリに出力されることを確認する（下記「疎通確認」参照）。

### ローテーション

有効期限が近づいたら、新しいPATを発行 → `ruleset-apply` Environmentの`RULESETS_PAT`を更新 → `dry_run=true`でdispatchしguardが通ることを確認 → 旧トークンを失効、の順で行う。ワークフロー側のコード変更は不要（`${{ secrets.RULESETS_PAT }}`を都度参照するため）。

## 2. Apply（ワークフロー経由・唯一の適用経路）

1. **Actions → Apply rulesets → Run workflow** を開く。
2. `dry_run`を`true`（既定値）のまま実行する。
3. ジョブサマリで各ファイルの action（`POST`=新規作成 / `PUT`=更新 / `ambiguous`=同名重複で中断）と、`PUT`の場合はlive側との差分（unified diff）を確認する。
4. 差分が意図通りであれば、`dry_run=false`で再dispatchする。
5. ジョブサマリの"Result id"列に返却されたruleset idを確認する（次回のPUTや手動ロールバックで必要）。

`apply-rulesets.yml`は`main`または`develop`ブランチにdispatchされた場合のみ実行を許可する（`Guard dispatch ref`ステップ）。それ以外のブランチからのdispatchは`::error::`で拒否される。

## 3. Verify

適用後、GitHub UI上で以下を確認する:

1. **Settings → Rules → Rulesets** で`main-protection`と`all-branches-no-force-push`が`enforcement: Active`で表示されること。
2. `main`へ直接pushしようとすると拒否されること（PR経由のみ許可）。
3. 任意のブランチへ`git push --force`すると拒否されること。
4. `test-and-build / Workflow summary [Test & Build (on pull request)]`が失敗しているPRはマージボタンが無効化されること。
5. docsのみを変更するPR（`test-and-build-on-pr.yml`の`paths-ignore`に該当）は、対になる`test-and-build-on-pr-skip.yml`が同名チェックを成功報告するため、正常にマージ可能なままであること（このペアリングが壊れると、docsのみのPRが永久にマージ不能になる——変更する際は要注意）。

## 4. ロールバック

ruleset削除はGitHub UIの**Settings → Rules → Rulesets**から対象rulesetを選び削除する（本リポジトリでは`enable_auto_delete`相当の自動削除機能は実装していない）。削除してもJSON正本はgitに残るため、`apply-rulesets.yml`を再dispatchすればPOST経路で同一内容を復元できる。

緊急に一時的な保護解除が必要な場合（誤マージの取り消し等）は、`bypass_actors`を追加するのではなく、対象rulesetの`enforcement`を`"active"`から`"disabled"`へ変更するPRを作り、`apply-rulesets.yml`で適用し、対応後に`"active"`へ戻すPRを再度適用する手順を推奨する（監査ログに明示的な変更履歴を残すため）。

## 5. スコープ外（将来の拡張候補）

- 週次でlive rulesetとSoT JSONの差分を検知し自動でissueを起票するドリフト検出（上流`ruleset-drift`相当）。
- PRオープン時にSoTの`required_status_checks`が実際のrulesetに反映済みか検証するgate（上流`verify-ruleset-sync`相当）。
- apply用・verify用・dependabot用PATの3分割。

これらはcommand-ghostwriterの規模（単一人間コントリビュータ、低頻度のruleset変更）に対して現時点では過剰と判断し、実装しない（[T6実行plan]参照）。将来コントリビュータが増える、またはruleset変更頻度が上がった場合に再検討する。
