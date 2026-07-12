# 参考資料: 新規47シナリオの詳細（fableサブエージェント検討結果の集約）

本設計 `2026-07-12-infra-training-scenario-templates-design.md` の付随資料。各フェーズの実装時に、テンプレート本文（`.j2`）とデータファイル（yaml/toml/csv）を作成する際の素材として用いる。学習目標・用語解説・手順・動作確認は、fableサブエージェントによる教育効果評価（Bloom型一貫性・実務近接性・誤解矯正力・安全性/CLI完結性）を経て選定されたものである。実装時はコマンド構文やオプションの正確性を実装担当者が改めて検証すること（fable検討時点のものは一般的なツール仕様に基づく推定を含む）。

## フェーズ2: DNS/クラウド/仮想化

### docker-basic-ops — Dockerコンテナ基本操作（Webサーバを動かす）
- category/subCategory/format: server / Docker / yaml
- 学習目標: コンテナとイメージの関係を理解し、pull→run→確認→破棄というコンテナのライフサイクル全体をCLIで一巡できる。
- 用語解説候補: コンテナ / イメージ / レジストリ(Docker Hub) / タグ / ポート公開(-p) / ボリューム / デタッチ実行(-d) / docker logs
- 手順概要: `docker version`/`info`確認 → `docker pull nginx:1.27` → `docker run -d --name web -p 8080:80` → `curl localhost:8080` → `docker logs web` → ボリュームマウントで内容差し替え・再起動 → `stop`/`rm`/`rmi`で完全に掃除
- 動作確認: `docker ps`のSTATUSがUp / curlが200 / logsにアクセス行 / 掃除後`docker ps -a`と`docker images`に残骸なし

### dns-resolve-troubleshoot — 名前解決トラブルの切り分け
- category/subCategory/format: runbook / DNS切り分け / yaml
- 学習目標: 「名前が引けない」障害を、hostsファイル→スタブリゾルバ→キャッシュDNS→権威DNSの層に分解して切り分けられる。
- 用語解説候補: リゾルバ / /etc/resolv.conf / systemd-resolved / キャッシュDNSと権威DNSの違い / dig / getent / NXDOMAIN / hostsファイル
- 手順概要: 事象の再現確認 → `getent hosts <名前>`でOS解決経路を確認 → `dig <名前>`で応答コード確認 → `dig @8.8.8.8 <名前>`と比較して層を特定 → `resolvectl status`/`/etc/resolv.conf`確認 → **`/etc/hosts`にテスト用エントリを追加し、`getent`は返すが`dig`は返さないという経路差を実演で観察（クライアント側候補から統合）** → 原因層を判定し報告フォーマットに記入 → テストエントリを掃除
- 動作確認: digのstatusがNOERROR / getentとdigの結果が一致 / 参照DNSが意図した値 / テストエントリの掃除確認

### kvm-snapshot-restore — 変更作業前のVMスナップショット取得と復元
- category/subCategory/format: runbook / KVMスナップショット / yaml
- 学習目標: 変更作業の前にスナップショットで戻り道を確保し、失敗時にロールバックする実務プロセスを身につける。
- 用語解説候補: スナップショット / qcow2 / ロールバック / スナップショットとバックアップの違い / libvirt / ドメイン(VM) / 命名規則
- 手順概要: `virsh list --all`確認 → `virsh snapshot-create-as <vm> <日付_チケット番号>` → `snapshot-list`確認 → VM内で変更作業(例: パッケージ更新) → 失敗を想定し`snapshot-revert` → 変更が巻き戻ったことを確認 → `snapshot-delete`で後片付け
- 動作確認: snapshot-listに命名規則どおり表示 / revert後にVM内変更が消えている / delete後に一覧から消えqcow2が肥大していない

### aws-ec2-basic-ops — AWS CLIでEC2インスタンスを作成・停止・削除する
- category/subCategory/format: server / AWS CLI / yaml
- 学習目標: AWS CLIの認証設定からEC2のライフサイクル（起動→接続→停止→削除→残骸確認）までを一人で完結できる。
- 用語解説候補: リージョン/AZ / AMI / インスタンスタイプ / セキュリティグループ / キーペア / EBS / stopとterminateの違い / タグ
- 手順概要: `aws configure --profile training` → キーペア作成・権限600 → セキュリティグループ作成(SSHは自分のIPのみ) → `run-instances`(t3.micro、Nameタグ) → `describe-instances`でIP取得しSSH接続 → `stop-instances`→状態遷移確認→`terminate-instances` → SG・キーペア・EBS残骸の削除確認
- 動作確認: 状態がrunning→stopped→terminatedと遷移 / SSHログイン成功 / `describe-volumes`に残存EBSなし / 継続課金項目なし
- 実装上の注意: 課金という実害があるため、掃除手順を必須ステップとして明示し、動作確認の最終項目を「残骸なし」に固定する。

### dns-record-migration — サーバ移転に伴うDNSレコード切替（TTL事前調整つき）
- category/subCategory/format: dns / DNS切替 / csv
- 学習目標: TTLを使ってDNS切替を「計画的に制御できる作業」として実施し、digで新旧の反映状態を検証できる。
- 用語解説候補: Aレコード / CNAME / TTL / DNSキャッシュ / 権威サーバ / SOAシリアル / 「DNS浸透」という俗説
- 手順概要: 切替対象をCSV(name,type,旧値,新値,旧TTL)に棚卸し → 切替前日にTTLを300秒へ短縮 → `dig +short`で切替前の値を記録 → レコード値を新IPへ変更しSOAシリアル更新 → `dig @権威サーバ`で即時反映確認 → キャッシュリゾルバ経由でTTL満了後の反映確認 → 安定後にTTLを元に戻す
- 動作確認: 権威サーバへの直接digが新IPを返す / 公開リゾルバでもTTL満了後に新IP / 旧サーバへのアクセスが収束

### virsh-vm-lifecycle — virshでLinux VMを作成して起動・停止する
- category/subCategory/format: server / KVM/libvirt / toml
- 学習目標: ハイパーバイザー上にVMをCLIだけで作成し、起動・停止・自動起動の管理をvirshで行える。
- 用語解説候補: ハイパーバイザー(KVM/QEMU) / libvirt / ドメイン / qcow2仮想ディスク / defaultネットワーク(NAT) / virt-install / shutdownとdestroyの違い
- 手順概要: `/proc/cpuinfo`と`virsh version`で仮想化支援確認 → `virsh net-list`確認 → `qemu-img create`で仮想ディスク作成 → クラウドイメージで`virt-install` → `virsh console`でログイン確認 → `shutdown`→`start`→`autostart`
- 動作確認: `virsh list`でrunning / consoleからログイン可能 / `virsh net-dhcp-leases`にIP / shutdown後にshut offへ遷移

### aws-s3-backup-basics — AWS CLIでS3バケットを作りバックアップを保管する
- category/subCategory/format: server / AWS CLI / yaml
- 学習目標: オブジェクトストレージの概念を理解し、S3へのバックアップ保管と取り出し検証、公開設定の安全確認までを行える。
- 用語解説候補: オブジェクトストレージ / バケット / キーとプレフィックス / cpとsyncの違い / パブリックアクセスブロック / バージョニング / ストレージクラス
- 手順概要: profile確認と`aws s3 mb`でバケット作成 → `get-public-access-block`で非公開確認 → バージョニング有効化 → tarアーカイブを`aws s3 cp`でアップロード → `aws s3 sync`でディレクトリ同期 → 別ディレクトリへ`cp`で取り出しsha256比較 → `rm --recursive`→`rb`で掃除
- 動作確認: `aws s3 ls`にオブジェクト存在 / 取り出したファイルのsha256が一致 / パブリックアクセスブロック4項目すべて有効

### dnsmasq-office-dns — dnsmasqで小規模オフィスの内部DNSを立てる
- category/subCategory/format: dns / dnsmasq / toml
- 学習目標: 内部DNSと上流フォワードの役割分担を理解し、dnsmasqで社内名の解決とキャッシュを提供できる。
- 用語解説候補: 内部DNS / フォワーダ / 上流DNS / /etc/hosts連携 / DNSキャッシュ / ドメインサフィックス / UDP/TCP 53番ポート
- 手順概要: dnsmasqインストール → listen-address・domain・上流server=設定 → `/etc/hosts`に社内ホスト追記 → `dnsmasq --test`で構文チェック → `systemctl enable --now dnsmasq` → クライアントの参照DNSを向け替えdigで検証
- 動作確認: `dig @サーバ 社内名`がAレコードを返す / 外部名も上流フォワードで解決 / `dnsmasq --test`がOK / 2回目のdigで応答時間短縮(キャッシュ効果)

### dns-secondary-transfer — セカンダリDNSを追加してゾーン転送で冗長化する
- category/subCategory/format: dns / BIND冗長化 / toml
- 学習目標: DNSの冗長化構成を理解し、プライマリ/セカンダリ間のゾーン転送と更新伝搬を設定・検証できる。
- 用語解説候補: プライマリ/セカンダリ / ゾーン転送(AXFR/IXFR) / NOTIFY / SOAシリアル / リフレッシュ間隔 / allow-transfer / NSレコード
- 手順概要: プライマリに`allow-transfer`/`also-notify`設定 → セカンダリに転送受信のゾーン定義追加 → `named-checkconf`で両系構文チェック → 再読込しセカンダリ上にゾーンファイル生成確認 → プライマリでレコード追加・シリアル+1 → NOTIFYでセカンダリへ即時伝搬確認
- 動作確認: 両系への`dig SOA`でシリアル一致 / セカンダリからのAXFRのみ成功(第三者は拒否) / NSレコードに両系が載る

### podman-rootless-service — Podmanでrootlessコンテナを常時起動サービス化する
- category/subCategory/format: server / Podman / yaml
- 学習目標: root権限なしでコンテナを実行する意味を理解し、systemdユーザーサービスとして再起動後も自動起動する構成を作れる。
- 用語解説候補: rootlessコンテナ / Podman / デーモンレス / systemdユーザーサービス / Quadlet / 非特権ポート(1024未満は使えない) / linger
- 手順概要: `podman info`でrootless動作確認 → 一般ユーザーでnginxを8080ポートにrun → curlで応答確認 → Quadlet定義(またはユニット生成)配置 → `systemctl --user enable --now` → `loginctl enable-linger`設定し再起動テスト
- 動作確認: 非rootの`podman ps`に表示 / curlが200 / OS再起動後も`systemctl --user status`がactive

## フェーズ3: 障害対応/監視/ログ

### disk-usage-triage — ディスク使用率100%障害の切り分けと復旧
- category/subCategory/format: runbook / ディスク / yaml
- 学習目標: ディスク枯渇の兆候検知から原因特定・安全な領域回復までの標準手順を、df/du/lsofの役割の違いを理解した上で実行できる。
- 用語解説候補: ファイルシステム / マウントポイント / iノード / dfとduの違い / オープンファイルディスクリプタ / journald / tmpファイル / 空き容量閾値
- 手順概要: `df -h`/`df -i`でどのファイルシステムが枯渇しているか特定 → `du -shx --max-depth=1`でディレクトリ単位に掘り下げ → 集計が合わない場合`lsof +L1`で「削除済みだがプロセスが掴んでいるファイル」確認 → `journalctl --disk-usage`→`journalctl --vacuum-size=`でジャーナル縮小 → 古い一時ファイル・ローテート済みログを一覧提示してから削除 → ファイルを掴んでいるサービスの再起動で領域解放
- 動作確認: `df -h`で使用率が閾値未満に回復 / `lsof +L1`の該当エントリ消滅 / 対象サービスが`systemctl is-active`でactive / iノード使用率も閾値未満

### systemd-service-recovery — systemdサービス起動失敗の調査と復旧
- category/subCategory/format: runbook / systemd復旧 / yaml
- 学習目標: サービスが起動しない時にログから失敗原因を特定し、enabled/activeの違いを理解した上で恒久復旧できる。
- 用語解説候補: ユニット / activeとenabledの違い / デーモン / journalctl / 終了コード / 設定ファイルの構文チェック / 依存関係(After/Requires) / daemon-reload
- 手順概要: `systemctl status <svc>`で状態・直近ログ・終了コード確認 → `journalctl -u <svc> -e --no-pager`で失敗時刻前後を精読 → 設定構文チェック(例: `nginx -t`/`sshd -t`)で設定起因か切り分け → 修正→`daemon-reload`(ユニット変更時)→`restart` → `systemctl is-enabled`で自動起動設定確認 → 障害内容と対処を作業記録に残す
- 動作確認: `systemctl is-active`がactive / `journalctl -u`に新規エラーなし / 再起動後もサービス提供が継続(curl等) / `is-enabled`が意図通り

### cron-healthcheck — cronとシェルスクリプトによる簡易死活監視の構築
- category/subCategory/format: server / 監視 / csv
- 学習目標: 監視ツールがない環境で、cron・シェルスクリプト・loggerを組み合わせた最小の死活監視を自作し、「監視とは定期的な確認と記録の自動化である」ことを体得する。
- 用語解説候補: 死活監視 / cron / crontab / 終了コード / logger(syslogへの記録) / PATH(cron環境変数の罠) / リダイレクト / 監視間隔
- 手順概要: 監視対象一覧(CSV)から生成されたチェックスクリプトを配置 → スクリプト単体を手動実行し正常時・異常時の終了コードと出力を確認 → `logger`で結果をsyslogに記録する動きを確認 → crontabへ登録 → cron実行環境はPATHが最小である点を確認しスクリプト内の絶対パス指定を検証 → 対象サービスを意図的に停止し異常検知が記録されることを試験
- 動作確認: `crontab -l`に登録行が存在 / `journalctl -t <tag>`に定期記録 / 疑似障害時に異常ログが記録される / 復旧後に正常ログへ戻る
- 実装上の注意: `cron-scheduling`（フェーズ5, crontab書式そのものの入門）とは目的を分離する。本シナリオではcrontab構文自体の解説は最小限にとどめ、監視スクリプトの設計・PATH問題・logger連携に集中する。

### load-spike-triage — サーバ負荷急増時の一次切り分け
- category/subCategory/format: runbook / 負荷 / yaml
- 学習目標: ロードアベレージ・CPU使用率・I/O待ちの違いを理解し、負荷の種類(CPU起因/I-O起因/プロセス暴走)を手順に沿って特定できる。
- 用語解説候補: ロードアベレージ / CPU使用率との違い / I/O待ち(iowait) / プロセスとスレッド / ゾンビプロセス / nice値 / topの見方 / ボトルネック
- 手順概要: `uptime`でロードアベレージの1/5/15分値を読み悪化/回復傾向を判断 → `top`/`ps aux --sort=-%cpu`でCPU消費上位プロセス特定 → `%wa`(iowait)確認しCPU起因かI/O起因か分岐 → I/O起因なら`iostat`/Dステート確認 → 原因プロセスの正体確認(サービスか暴走ジョブか想定内バッチか) → 対処判断(renice/停止/エスカレーション)を基準表に沿って選択し記録
- 動作確認: ロードアベレージが正常時基準に回復 / 原因プロセスが特定・記録済み / 対象サービスの応答が正常 / 対処内容が判断基準表のどれに該当したか記録済み

### logrotate-setup — logrotateによるログローテーション設定
- category/subCategory/format: server / ログ運用 / csv
- 学習目標: ログ肥大によるディスク枯渇を予防するローテーション設定を作成し、dry-runで挙動を検証してから適用できる。ローテート後にプロセスがログを掴み続ける問題を理解する。
- 用語解説候補: ログローテーション / 世代管理 / 圧縮(gzip) / copytruncateとcreateの違い / postrotate / dry-run / シグナル(HUP) / /etc/logrotate.d
- 手順概要: 対象ログの現状サイズ・増加ペースを`ls -lh`/`du`で把握 → CSV定義から生成したlogrotate設定を`/etc/logrotate.d/`に配置 → `logrotate -d`(dry-run)で事前確認 → `logrotate -f`で強制ローテートし実挙動確認 → ローテート後も旧ファイルに書き続けていないか`lsof`で確認 → cron.dailyによる自動実行タイミング確認
- 動作確認: ローテート済みファイル(.1/.gz)が生成 / 新ログファイルに追記が継続 / dry-run出力と実挙動が一致 / 世代数が定義通り

### web-error-log-triage — Webサーバの5xxエラー多発時のログ調査
- category/subCategory/format: runbook / Webログ / yaml
- 学習目標: アクセスログとエラーログの役割の違いを理解し、grep/awk/sort/uniqでエラーの傾向(時間帯・URL・ステータス)を定量的に絞り込める。
- 用語解説候補: アクセスログとエラーログ / HTTPステータスコード / 4xxと5xxの責任分界 / 502と504の違い / パイプ / awk / uniq -c / 時系列の絞り込み
- 手順概要: アクセスログからステータスコード別件数を集計(`awk`+`sort | uniq -c`) → 5xxの発生時間帯を絞り込み開始時刻を特定 → 対象時刻のエラーログを精読し上流起因かWebサーバ起因か判別 → 502/504ならバックエンドサービスの状態を`systemctl`/`ss -tlnp`で確認 → 仮説を1行で言語化してから対処 → 対処後に同じ集計コマンドを再実行し収束を確認
- 動作確認: 5xx件数が対処後ゼロまたは基準値以下 / エラーログに新規エラーなし / 該当URLへのcurlが200を返す

### oom-memory-triage — メモリ枯渇・OOM Killer発動時の切り分け
- category/subCategory/format: runbook / メモリ / yaml
- 学習目標: freeの見方(availableとfreeの違い)とOOM Killerの仕組みを理解し、「プロセスが突然消えた」障害をカーネルログから裏取りできる。
- 用語解説候補: OOM Killer / freeとavailableの違い / ページキャッシュ / スワップ / カーネルログ(dmesg/journalctl -k) / 常駐メモリ(RSS) / oom_score
- 手順概要: 「サービスが勝手に落ちた」報告を受け`systemctl status`で終了理由(signal 9/oom-kill)確認 → `journalctl -k | grep -i oom`でOOM Killer発動の証跡と犠牲プロセス特定 → `free -h`を読みavailable列で「freeが少ない＝異常ではない」ことを確認 → `ps aux --sort=-rss`でメモリ消費上位特定 → スワップの有無・使用状況確認し暫定対処 → 恒久対策の選択肢を記録して報告
- 動作確認: 対象サービスがactiveに復帰 / `journalctl -k`に新規OOMなし / availableメモリが基準値以上 / 報告記録に犠牲プロセスと発動時刻が明記
- 実装上の注意: 意図的なメモリ枯渇の再現はさせず、既発生の証跡調査型として設計する（安全性のため）。

### mail-delivery-triage — メール送信不能（Postfix）の切り分け
- category/subCategory/format: runbook / メール / yaml
- 学習目標: メールが「届かない」障害を、キュー・ログ・DNS(MX)・ポート到達性の4層に分解して切り分けられる。メールは即時通信ではなくキュー型であることを理解する。
- 用語解説候補: MTA / メールキュー / mailq / deferred(配送遅延) / MXレコード / SMTPポート(25/587) / メールログ / バウンスメール
- 手順概要: `systemctl status postfix`でサービス自体の生死確認 → `mailq`(postqueue -p)で滞留メールとdeferred理由を読む → メールログで該当メールの配送試行ログを追う → `dig MX <宛先ドメイン>`で宛先解決確認 → 宛先SMTPポートへの到達性確認 → 原因解消後`postqueue -f`で再配送しキューの掃けを確認
- 動作確認: `mailq`が空(またはdeferred減少) / メールログにstatus=sentが記録 / テストメールが宛先に到達
- 実装上の注意: 外部宛の実配送は演習環境依存になるため、ローカル配送前提で設計する。

### alert-first-response — アラート一次対応の型（受信から報告まで）
- category/subCategory/format: runbook / 一次対応 / yaml
- 学習目標: アラートを受けてから「事実確認→影響範囲把握→暫定対処orエスカレーション→報告」までの一次対応の型を、種別別チェックリストに沿って実行できる。
- 用語解説候補: アラート / 一次対応と二次対応 / エスカレーション / 影響範囲 / 暫定対処と恒久対処 / 誤検知(false positive) / 対応記録(タイムライン) / SLA
- 手順概要: アラート内容から対象ホスト・種別・発生時刻を書き出す(記録開始) → 種別対応表に沿った事実確認コマンドを実行(死活/ディスク/負荷など) → 誤検知かどうかを一次判定(監視側要因の可能性を必ず1回疑う) → 影響範囲(ユーザー影響の有無)を確認 → エスカレーション基準表と照合し自己対処か引き継ぎかを決定 → 時系列の対応記録を所定フォーマットで残す
- 動作確認: タイムライン記録に発生時刻・確認結果・判断根拠が揃っている / エスカレーション判断が基準表のどの行に該当したか明記 / アラートがクローズまたは引き継ぎ完了

## フェーズ4: セキュリティ/バックアップ

### ssh-key-hygiene — SSH鍵管理のベストプラクティス
- category/subCategory/format: server / SSH / toml
- 学習目標: 公開鍵認証の仕組み(秘密鍵は絶対に外に出ない)を理解し、鍵ペアの生成から配置・権限設定・パスワード認証の無効化までを安全に実施できる。
- 用語解説候補: 公開鍵認証 / 秘密鍵と公開鍵 / パスフレーズ / ed25519 / authorized_keys / パーミッション(600と700) / known_hosts / エージェント転送
- 手順概要: `ssh-keygen -t ed25519`でパスフレーズ付き鍵ペア生成 → 生成物の確認(どちらが秘密鍵か識別) → `ssh-copy-id`で公開鍵を対象サーバへ配置 → `~/.ssh`と`authorized_keys`の権限を700/600に是正 → 鍵認証でのログイン試験(パスワード認証と並行運用のまま) → sshd_configで`PasswordAuthentication no`設定し`sshd -t`で構文検証 → 別セッションを維持したままsshdをreload(ロックアウト防止手順を明示)
- 動作確認: `ssh -i`指定で鍵ログインが成功 / パスワード認証での接続が拒否される / `sshd -t`がエラーなしで通る

### rsync-daily-backup — rsyncによる日次バックアップ取得
- category/subCategory/format: server / バックアップ / yaml
- 学習目標: 「コピー」と「バックアップ」の違い(世代・差分・除外)を理解し、rsyncとcronで日次バックアップを構成・検証できる。
- 用語解説候補: フルバックアップと差分 / rsyncのアーカイブモード(-a) / --dry-run / --deleteの危険性 / 除外パターン / cron / 3-2-1ルール / ハードリンク世代管理(--link-dest)
- 手順概要: バックアップ対象と除外(キャッシュ・一時ファイル)を確認 → `rsync -avn`(dry-run)で転送予定リストを必ず先に確認 → 本実行しログをファイル保存 → `--link-dest`で日付ディレクトリの世代作成 → cronに日次ジョブ登録 → 世代ディレクトリの削除ポリシー(保持日数)確認
- 動作確認: dry-runと本実行の転送件数が一致 / `diff -r`で元と複製の内容一致 / 2世代目がハードリンクでディスクをほぼ消費していない(`du -sh`比較) / cronのジョブがログに実行痕跡

### restore-drill — バックアップからのリストア訓練
- category/subCategory/format: runbook / リストア / yaml
- 学習目標: 「リストアできて初めてバックアップ」という原則を理解し、誤削除を想定した復元作業を、本番を汚さない検証手順つきで実施できる。
- 用語解説候補: リストア / RPO・RTO / 世代選択 / 復元先の分離(本番直戻し禁止) / チェックサム / リストア訓練(DRドリル) / 上書き事故
- 手順概要: 演習用データの「誤削除」を訓練専用ディレクトリで再現 → 障害時刻から復元すべき世代を特定 → まず一時ディレクトリへ復元(本番パスへ直接戻さない) → `sha256sum`/`diff -r`で復元データの完全性を検証 → 検証後に本来のパスへ移動し所有者・権限を復旧 → 所要時間を記録しRTOの実測値として報告書式にまとめる
- 動作確認: 復元ファイルのチェックサムが事前記録と一致 / 所有者・パーミッションが元の状態と一致(`stat`で確認) / 復元作業の所要時間が記録されている
- 依存関係: `rsync-daily-backup`と対で運用する想定（取得したバックアップから復元する）。

### sudo-least-privilege — sudo権限の最小化
- category/subCategory/format: server / sudo / yaml
- 学習目標: 「全部sudo可」の危険性を理解し、visudoによる構文検証を挟みながら、必要なコマンドだけを許可する最小権限のsudoers設定を実施できる。
- 用語解説候補: 最小権限の原則 / sudoers / visudo(構文チェックの意味) / sudoers.dドロップイン / NOPASSWDの是非 / コマンドエイリアス / 監査ログ(/var/log/secure) / root直ログイン禁止
- 手順概要: `sudo -l`で現状の権限確認 → 対象ユーザーに必要な操作を定義ファイルから確認 → `/etc/sudoers.d/`に限定ルールのファイルを作成(本体は編集しない) → `visudo -cf`で構文検証(検証前に反映しない手順を強調) → 別セッションでrootシェルを保持したまま適用(ロックアウト防止) → 許可コマンドと禁止コマンドの両方を試験
- 動作確認: `sudo -l -U 対象ユーザー`に許可コマンドのみが列挙 / 許可コマンドが成功し未許可コマンドが拒否 / sudo実行が監査ログに記録

### password-policy-basics — パスワードポリシーの設定
- category/subCategory/format: server / 認証 / toml
- 学習目標: 現代的なパスワード指針(長さ優先・不要な定期変更の廃止)を理解し、pwqualityとlogin.defsでポリシーを設定・検証できる。
- 用語解説候補: pam_pwquality / login.defs / 最小長(minlen) / パスワード履歴 / 有効期限(chage) / アカウントロック(faillock) / 辞書攻撃 / NIST SP 800-63Bの要点
- 手順概要: 現行ポリシー確認(`/etc/security/pwquality.conf`、`chage -l`) → 定義ファイルの値(最小長14・辞書チェック有効等)をpwquality.confに反映 → login.defsのPASS_MAX_DAYS等を設定 → 「既存ユーザーには自動遡及しない」ことを`chage -l`で確認(重要な学習ポイント) → 既存ユーザーへ`chage`で個別適用 → テストユーザーで弱いパスワードが拒否されることを試験
- 動作確認: 短い/辞書語のパスワード設定が拒否される / `chage -l`の表示が定義ファイルの値と一致 / 新規作成ユーザーにポリシーが自動適用

### log-integrity-hash — ログ改ざん検知の基礎（ハッシュ検証）
- category/subCategory/format: server / ログ保全 / toml
- 学習目標: 「ログは改ざんされ得る」前提を理解し、sha256sumによるハッシュ台帳の作成・照合と、ローテート済みログの保全手順を実施できる。
- 用語解説候補: ハッシュ関数 / sha256sum / 改ざん検知と改ざん防止の違い / logrotate / append-only属性(chattr +a) / 証跡(エビデンス)保全 / journaldの永続化
- 手順概要: 保全対象ログを定義ファイルから確認 → ローテート済みログのハッシュ台帳を作成(`sha256sum > 台帳`) → 台帳を別ディレクトリへ退避 → `sha256sum -c`で照合しOKを確認 → 演習として1バイト改変し照合がFAILEDになることを観察 → `chattr +a`で追記専用化し上書きが拒否されることを確認
- 動作確認: 未改変ログの照合が全件OK / 改変ログの照合がFAILEDを報告 / `lsattr`でappend-only属性が確認できる

### account-audit — 不要アカウントの棚卸しとロック
- category/subCategory/format: runbook / 棚卸し / csv
- 学習目標: アカウント棚卸しの目的(退職者・共有アカウントの排除)を理解し、調査コマンドで現状を可視化して、削除ではなくロックで安全に処置できる。
- 用語解説候補: アカウントライフサイクル / lastlog / /etc/passwdと/etc/shadow / アカウントロック(usermod -L)と削除の違い / nologinシェル / 共有アカウントの問題 / UID 0の重複チェック
- 手順概要: `/etc/passwd`からログイン可能ユーザーを抽出 → `lastlog`で最終ログイン日時を確認しCSV台帳と突合 → 台帳上「退職済み」のアカウントを特定 → `usermod -L`＋`usermod -s /sbin/nologin`でロック(削除しない理由を学ぶ) → UID 0の重複や空パスワードの有無を点検 → 処置結果を台帳に記録して報告
- 動作確認: ロック対象ユーザーでのログインが拒否される / `passwd -S`で状態がLockedと表示 / 台帳と実サーバのアカウント一覧が一致

### cert-expiry-watch — TLS証明書の期限確認と更新運用
- category/subCategory/format: runbook / 証明書 / csv
- 学習目標: 証明書の有効期限切れが引き起こす障害を理解し、opensslコマンドで期限・チェーンを点検して定期監視化し、更新作業を dry-run で事前確認してから実施できる。
- 用語解説候補: TLS/SSL証明書 / 有効期限(notAfter) / 証明書チェーンと中間証明書 / CNとSAN / 自己署名証明書 / certbotとACME / dry-run更新
- 手順概要（フェーズ3案とフェーズ4案を統合）:
  1. 監視対象一覧(CSV: ドメイン,ポート,警告日数閾値)を確認
  2. `openssl s_client -connect`+`openssl x509 -noout -enddate -subject`で稼働中サービスの証明書の期限とSANを取得
  3. 残日数を計算し閾値と比較する点検スクリプトを作り、cronで日次点検化(閾値割れはloggerで記録)
  4. 閾値割れが検出された対象について`certbot renew --dry-run`で更新可否を事前検証
  5. dry-run成功後に実更新し、証明書再読み込み(reload)が必要な理由を確認
  6. 更新後`openssl s_client`で新しいnotAfterを確認
- 動作確認: 全対象ホストの残日数一覧が作成できている / `crontab -l`に日次登録あり / dry-runが成功する / 更新後`s_client`で新しいnotAfterが確認できる
- 既存`zero-trust-access`（CA構築側）とはレイヤが異なる（本シナリオは証明書の消費・運用側）ため重複しない。

### fail2ban-ssh-guard — fail2banによるSSHブルートフォース対策
- category/subCategory/format: server / 侵入対策 / toml
- 学習目標: 認証ログから攻撃の実態を観察し、fail2banで自動遮断を構成できる。自分自身を締め出さないためのignoreip設計の重要性を理解する。
- 用語解説候補: ブルートフォース攻撃 / /var/log/secure(auth.log) / jail / bantime・findtime・maxretry / ignoreip(除外リスト) / ban解除(unban) / 誤遮断(自己ロックアウト)
- 手順概要: 認証ログから失敗ログイン記録を観察(攻撃の実在確認) → fail2banをインストールしjail.localを作成(jail.conf直編集禁止) → 定義ファイルの値でsshd jailを設定、**必ずignoreipに管理端末を登録** → サービス起動と`fail2ban-client status sshd`で状態確認 → テスト端末からわざと認証失敗を繰り返しbanされることを観察 → `fail2ban-client unban`で解除手順も訓練
- 動作確認: statusに監視中のjailとban数が表示 / しきい値超過でテストIPが遮断される(iptables/nftablesにルール出現) / unban後に再接続できる / 管理端末のIPは失敗を繰り返してもbanされない

### vuln-patch-triage — 脆弱性スキャン結果への一次対応
- category/subCategory/format: runbook / 脆弱性対応 / csv
- 学習目標: 脆弱性情報(CVE・重要度)の読み方を理解し、スキャン結果一覧から影響確認→優先度判定→パッチ適用可否の一次判断を報告できる。
- 用語解説候補: CVE / CVSSと重要度(Critical〜Low) / セキュリティアドバイザリ / dnf updateinfo / パッチ適用とサービス再起動の関係 / 恒久対策と暫定対策(回避策) / 一次対応(トリアージ)
- 手順概要: スキャン結果CSV(定義ファイル)を確認し重要度順に整理 → `rpm -q`/`dnf list installed`で該当パッケージの実在とバージョン確認 → `dnf updateinfo list --security`で配布済み修正の有無確認 → 該当サービスが実際に稼働・公開されているか確認(`systemctl`、`ss -tlnp`) → Criticalかつ公開中のものを最優先とする判定表を作成 → `dnf update --security`の適用(再起動要否の確認を含む)と結果記録
- 動作確認: 対象パッケージのバージョンが修正版以上になっている / `dnf updateinfo`で該当アドバイザリが「適用済み」扱い / 判定表に全CVEの処置(適用/回避/リスク受容)が記録

## フェーズ5: ネットワーク/サーバ基礎

### file-permissions — ファイルパーミッションと所有者管理
- category/subCategory/format: server / パーミッション / csv
- 学習目標: rwxと8進表記の対応、ファイルとディレクトリで権限の意味が異なることを理解し、chmod/chownで部門共有ディレクトリを設計できる。
- 用語解説候補: パーミッション / 所有者とグループ / 8進表記 / 実行ビット / setgid / umask / `ls -l`の読み方
- 手順概要: 演習用ディレクトリツリーとテストユーザー/グループを作成 → `ls -l`の10文字を分解して読む → `chmod`をシンボリック・8進の両方式で実施 → `chown`/`chgrp`で所有者を定義通りに変更 → 共有ディレクトリにsetgidを付与しグループ継承を体験 → `umask`の値と新規作成ファイルの権限の関係を確認 → `sudo -u`で別ユーザー視点のアクセス可否テスト
- 動作確認: `stat -c '%a %U %G'`が定義と一致 / 別ユーザーでの読み書き可否が期待通り / 共有ディレクトリ内の新規ファイルがグループ継承

### connectivity-check — ping・tracerouteによる疎通確認の型
- category/subCategory/format: network / 疎通確認 / csv
- 学習目標: 「自分→GW→外部IP→FQDN」のレイヤ順に疎通を切り分ける型を身につけ、結果(ロス・RTT・`*`表示)を正しく解釈できる。
- 用語解説候補: ICMP / RTT / TTL / デフォルトゲートウェイ / パケットロス / ホップ / 名前解決
- 手順概要: `ip a`/`ip route`で自ホストのアドレスとGWを確認 → ループバック→自IP→GWの順に`ping` → 外部の既知IPへ`ping`(DNS非依存の確認) → FQDN宛`ping`で名前解決込みの疎通確認 → `traceroute`で経路を取得し各ホップを読む → 結果を定義ファイル由来のチェック表に記録
- 動作確認: 各段階の成否が表として揃う / ロス率0%・RTTが妥当 / tracerouteの1ホップ目がGWと一致

### systemd-unit-basics — systemdサービスの基本操作とユニット作成
- category/subCategory/format: server / systemd基本 / toml
- 学習目標: start/stop/restart/enable/disableの違いを理解し、自作スクリプトをサービスユニットとして登録・自動起動設定できる。
- 用語解説候補: systemd / ユニット / デーモン / enable(自動起動)とstart(今起動)の違い / daemon-reload / journal / target
- 手順概要: `systemctl status`の出力(Loaded/Active行)の読み方 → 既存サービスでstart/stop/restartを練習 → 常駐する簡単なスクリプトを作成 → `/etc/systemd/system/`にunitファイルを配置 → `daemon-reload`→`start` → `enable`して`is-enabled`で確認 → `journalctl -u`でサービスログ確認
- 動作確認: `systemctl is-active`=active / `is-enabled`=enabled / `journalctl -u`に起動ログ / unit編集→reload忘れの警告を実際に観察

### port-listening-check — ssとncによるポート待受・疎通確認
- category/subCategory/format: network / ポート確認 / csv
- 学習目標: 「サービスが待ち受けている」とはどういう状態かを理解し、`ss`でLISTEN確認、`nc`でL4疎通テストができる。
- 用語解説候補: ポート番号 / LISTEN / TCPとUDP / ソケット / 127.0.0.1と0.0.0.0の違い / ウェルノウンポート / nc(netcat)
- 手順概要: `ss -tlnp`の出力(State/Local Address:Port/Process)の読み方 → `nc -l 8080`で仮のサーバを起動 → 別ターミナルから`nc`で接続し文字列を往復 → 127.0.0.1バインドと0.0.0.0バインドの差を実験 → `curl`でHTTPレベルの確認も一段追加 → 定義ファイル由来のポート一覧を順に点検して記録
- 動作確認: `ss`にLISTEN行が表示 / nc同士で文字列往復 / 127.0.0.1バインド時に外部インターフェースから接続不可

### cron-scheduling — cronによる定期実行ジョブの設定
- category/subCategory/format: server / cron / csv
- 学習目標: crontabの5フィールド書式を理解し、ログ出力付きの定期ジョブを登録して実行結果を自分で検証できる。
- 用語解説候補: cron / crontab / スケジュール式(5フィールド) / 標準出力と標準エラー / リダイレクト / 環境変数PATH / 絶対パス
- 手順概要: `date`と`timedatectl`で現在時刻確認 → 日時をログに追記するテストスクリプト作成 → `crontab -l`で現状確認(`-r`との違いを明示) → 毎分実行のジョブを`crontab -e`で登録 → 数分待ってログファイル確認 → 本番想定のスケジュール(毎日3時など)に書き換えコマンドを絶対パス化
- 動作確認: `crontab -l`に定義通りの行 / ログに実行時刻が毎分追記 / `journalctl`または`/var/log/cron`にCRONエントリ
- 実装上の注意: `cron-healthcheck`（フェーズ3）とは焦点を分離する。本シナリオはcrontab書式・PATH問題・`-r`事故に集中し、監視スクリプトの構築には踏み込まない。

### subnetting-basics — IPアドレス設計とサブネット分割の基礎
- category/subCategory/format: network / IPアドレス設計 / csv
- 学習目標: CIDR表記とサブネットマスクの対応を理解し、拠点要件からサブネット分割を設計して`ipcalc`で計算結果を検証できる。
- 用語解説候補: IPアドレス / サブネットマスク / CIDR / ネットワークアドレス / ブロードキャストアドレス / ホスト部とネットワーク部 / プライベートIPアドレス
- 手順概要: `ipcalc`の導入確認と基本出力の読み方 → 割当済みの/24を`ipcalc`で分解し各フィールド確認 → 拠点ごとの必要ホスト数から必要ビット数を手計算 → 分割案(例: /26×4)を`ipcalc`で一括計算 → 各サブネットのネットワーク/ブロードキャスト/利用可能範囲を表に記録 → サブネット間の重複がないことを確認
- 動作確認: 手計算と`ipcalc`出力の一致 / 利用可能ホスト数が要件以上 / 隣接サブネットの範囲重複なし

### ntp-chrony — chronyによるNTP時刻同期の設定
- category/subCategory/format: server / 時刻同期 / toml
- 学習目標: 時刻ずれが認証・ログ突合・証明書に与える影響を理解し、chronyで同期設定と同期状態の検証ができる。
- 用語解説候補: NTP / stratum / UTCとタイムゾーン / slewとstep / ドリフト / chrony / timedatectl
- 手順概要: `timedatectl`で現状(同期有無・TZ)を確認 → chronyを導入し`/etc/chrony.conf`に定義ファイル由来のサーバを設定 → サービス再起動 → `chronyc sources`で参照先と`^*`を確認 → `chronyc tracking`でオフセットを確認 → タイムゾーンを設定し「TZ変更は時刻同期と別物」を確認
- 動作確認: `chronyc sources`に`^*`行 / `timedatectl`で"synchronized: yes" / trackingのoffsetが十分小さい

### disk-mount-basics — ディスクのフォーマットとマウント入門（ループバック演習）
- category/subCategory/format: server / ディスク管理 / yaml
- 学習目標: ブロックデバイス→ファイルシステム→マウントという階層構造を、実ディスクに触れずループバックデバイスで安全に体験する。
- 用語解説候補: ブロックデバイス / ファイルシステム / mkfs / マウントとマウントポイント / UUID / fstab / lsblkとdf
- 手順概要: `dd`でディスクイメージファイルを作成 → `losetup`でループバックデバイス化 → `mkfs.ext4`でフォーマット(**実デバイス指定の危険を明記**) → マウントポイント作成と`mount` → `lsblk`/`df -h`/`blkid`で状態確認 → ファイル書き込み→`umount`→再マウントで永続性を体験
- 動作確認: `lsblk`にloopデバイスとFSが表示 / `df -h`にマウント行 / umount中は書き込んだファイルが見えず再マウントで復活
- 実装上の注意: mkfsコマンドの対象がループバックデバイスであることをテンプレート本文で強調し、実デバイスへの誤適用を防ぐ注意書きを含める。

## フェーズ6: 物理設備工事系（新カテゴリ facility）

### rack-power-budget — ラック電源容量設計（ブレーカーマージン計算）
- subCategory/format: 電源設計 / csv
- 学習目標: ラック内機器の消費電力を積算し、ブレーカー定格に対する80%ルールでマージンを検算できる。定格値と実測値の違いを説明できる。
- 用語解説候補: 定格電力/実効消費電力 / ブレーカー(配線用遮断器) / 80%ルール(連続負荷) / 突入電流 / PDU / 回路(系統) / 力率
- 手順概要: CSVの機器一覧(機器名,定格W,実効W,電源系統)から系統ごとの合計Wを積算 → ブレーカー定格(例: 100V 30A=3000W)に対する使用率を計算 → 80%ルールで合否判定 → NG系統があれば機器の系統振り替え案を記入 → (実機があれば)`ipmitool dcmi power reading`で実測値を確認し定格との差を記録 → 判定結果をチェックリストに転記
- 動作確認: 全系統の使用率が80%以下 / 振り替え後も冗長構成が崩れていない / 実測値≦定格値であることの確認記録

### rack-mount-layout — ラックマウント搭載位置設計
- subCategory/format: ラック設計 / csv
- 学習目標: 荷重・エアフロー・保守性を考慮して42Uラックの搭載位置を設計し、U番号表として文書化できる。
- 用語解説候補: U(ユニット) / 42Uラック / 耐荷重 / 重心 / 前面吸気・背面排気 / ブランクパネル / マウントレール / 保守スペース
- 手順概要: CSVから機器一覧(機器名,U数,重量kg,吸排気方向,搭載希望位置)を確認し重量順に並べる → 重量物(UPS・ストレージ)を下段に割り当てる原則を適用 → 吸排気方向が揃っているか確認し逆向き機器を洗い出す → 空きUにブランクパネル設置位置を指定 → 完成したU番号表(1〜42U)をレイアウト表と突き合わせ → (実機があれば)`dmidecode -t chassis`/`ipmitool fru print`で機器の実体情報と台帳の一致を確認
- 動作確認: 重量物が下段1/3に集中 / 総重量が耐荷重以下 / 全空きUにブランクパネルが指定されている

### dual-power-redundancy — 二重電源冗長化チェック（PDU系統分散）
- subCategory/format: 電源設計 / csv
- 学習目標: 冗長電源機器の各PSUを別系統PDUへ分散接続する原則を理解し、接続表から単一障害点を検出できる。
- 用語解説候補: PSU(電源ユニット) / 冗長電源(1+1) / PDU A系・B系 / 単一障害点(SPOF) / 片系運転 / フェイルオーバー / 活性挿抜
- 手順概要: 接続表CSV(機器名,PSU数,PSU1接続先PDU,PSU2接続先PDU)を読み各機器のPSU接続先を確認 → 同一PDUに両PSUが刺さっている機器(NG)を洗い出す → A系・B系それぞれの片系運転時負荷を計算 → NG機器の是正接続案を記入 → (実機があれば)`ipmitool sensor | grep -i PS`でPSUステータスが両系Presence/OKであることを確認 → `ipmitool sel list`で電源系イベントログに異常がないことを確認
- 動作確認: 全冗長機器が異系統PDUに分散 / 片系運転時も各PDUが定格80%以下 / PSUセンサーが全数OK

### structured-cabling-plan — 構造化配線・配線表作成
- subCategory/format: ケーブリング / csv
- 学習目標: 配線表(ケーブルスケジュール)を正として施工・検証する構造化配線の考え方を理解し、LLDPで物理接続を照合できる。
- 用語解説候補: 構造化配線 / パッチパネル / 配線表(ケーブルスケジュール) / 水平配線・幹線配線 / LLDP / ポート番号規約 / 余長処理
- 手順概要: 配線表CSV(ケーブルID,From機器/ポート,To機器/ポート,種別,長さ)を読みFrom/Toの命名規約を確認 → 配線経路を紙上でトレース → 敷設チェックリスト(両端接続・余長・結束)を消化 → `lldpctl`で対向機器名・ポート名を取得 → LLDPの結果と配線表を1行ずつ照合し不一致を記録 → `ip link`/`ethtool <if>`でリンクアップとリンク速度を確認
- 動作確認: LLDP近隣情報が配線表と全行一致 / 全ポートがリンクアップ / 不一致ゼロまたは是正記録がある

### lan-cable-category — LANケーブルカテゴリ選定と敷設確認
- subCategory/format: ケーブリング / csv
- 学習目標: 距離・速度・PoE要件からCat5e/6/6A/光を根拠を持って選定でき、選定結果をリンク速度で検証できる。
- 用語解説候補: カテゴリ(Cat5e/6/6A) / UTP・STP / 10GBASE-T / リンク速度とネゴシエーション / PoE(給電) / 伝送距離100m規則 / 光ファイバ(SM/MM)
- 手順概要: 区間一覧CSV(区間名,距離m,要求速度,PoE要否,選定カテゴリ)の要件を確認 → 選定フローチャート(例: 10GbEかつ55m超ならCat6A以上)に沿って各区間を判定 → CSV記載の選定カテゴリと自分の判定を照合し差異を記録 → 敷設時チェック項目(曲げ半径、成端、テスター確認)を消化 → `ethtool <if>`でSpeed/Duplexが設計値どおりか確認 → (対応NICなら)`ethtool --cable-test <if>`で結線診断
- 動作確認: 全区間の選定根拠が要件表から説明できる / ethtoolのSpeedが設計速度と一致 / ネゴシエーション失敗(100Mb/s落ち等)がない

### ups-capacity-plan — UPS容量計算とバックアップ時間設計
- subCategory/format: 電源設計 / yaml
- 学習目標: WとVAの違い・力率を理解し、負荷率からUPSの容量適合とバックアップ時間を見積もれる。
- 用語解説候補: VAとW / 力率 / 負荷率 / バックアップ時間(ランタイム曲線) / ラインインタラクティブ・常時インバータ / シャットダウン連携 / バッテリー劣化
- 手順概要: YAMLのUPS仕様(VA/W定格)と接続機器リストを確認 → 接続負荷の合計WとVAを別々に計算 → 負荷率(W/W定格、VA/VA定格の大きい方)を算出し推奨負荷率(例: 70%以下)で判定 → ランタイム表から負荷率に対応するバックアップ時間を読み取る → 「安全なシャットダウンに必要な時間」との比較で合否判定 → (実機があれば)`apcaccess status`または`upsc <ups>`でLOADPCT/TIMELEFTを確認
- 動作確認: WとVA両方で負荷率が閾値以下 / TIMELEFTがシャットダウン所要時間を上回る / 計算値と実測LOADPCTの乖離が説明できる

### cable-labeling-standard — ケーブルラベリング規約適用
- subCategory/format: ケーブリング / csv
- 学習目標: 命名規約からラベル文字列を機械的に導出できるようになり、両端ラベリングと台帳一致の重要性を体得する。
- 用語解説候補: ラベリング規約 / 両端ラベル / ケーブルID採番 / 台帳(インベントリ) / 面付け表記(例: RackA-U20-P1) / セルフラミネートラベル
- 手順概要: 規約定義(採番ルール・書式)を読み例題2本のラベルを手で導出 → CSV全行(ケーブルID,From,To,ラベル文字列)に対し規約どおりのラベル文字列を検算 → 規約違反行(桁欠け・片端のみ等)を検出して記録 → 貼付チェックリスト(両端・視認位置・脱落防止)を消化 → `lldpctl`の対向情報とラベル記載のTo情報を照合
- 動作確認: 全行のラベルが規約から再導出可能 / 違反行が全件検出・是正されている / ラベルとLLDP実配線の一致確認

### server-racking-procedure — サーバラッキング作業手順（レール・搭載・接地）
- subCategory/format: ラッキング / yaml
- 学習目標: レール取付から搭載・接地・初回電源投入までの標準手順を、安全確認ポイントつきで説明できる。
- 用語解説候補: スライドレール / インナーレール・アウターレール / ケージナット / アース(接地)端子 / 2人作業ルール / リフター / 初回電源投入(PoST)
- 手順概要: YAMLの機器仕様(重量・U位置)を確認し2人作業要否を判定 → ケージナット位置とレール取付のチェック項目を消化 → 搭載・固定・**アース線接続**の確認項目を消化 → 電源ケーブル接続(二重電源は別系統)を確認 → 電源投入後`ipmitool chassis status`で電源状態を確認 → `dmidecode -s system-serial-number`でシリアルを台帳と照合
- 動作確認: 全安全チェック(固定・接地・2人作業記録)が完了 / chassis statusがPower ONかつ異常なし / シリアルと台帳の一致
- 統合事項: 選外候補「接地・静電気対策チェックリスト」の接地確認ステップをここに統合済み。

### rack-airflow-design — エアフロー設計とブランクパネル計画
- subCategory/format: 環境設計 / yaml
- 学習目標: ホットアイル/コールドアイル分離と再循環防止の原理を理解し、吸気温度基準で冷却の健全性を判定できる。
- 用語解説候補: ホットアイル・コールドアイル / 吸気温度 / 再循環 / ブランクパネル / CRAC・CRAH / ASHRAE推奨温度範囲 / 床下空調(フリーアクセス)
- 手順概要: YAMLのラック列構成を読み通路の冷気・熱気の流れを図に書き起こす → 吸排気が逆向きの機器(熱気を吸う配置)を検出 → 空きUのブランクパネル設置計画を立てる → 「室温でなく吸気温度で判定する」基準(例: 18〜27℃)を確認 → `ipmitool sdr type Temperature`でInlet Tempを読み取り基準と比較
- 動作確認: 再循環経路が図上で全て塞がれている / Inlet Tempが推奨範囲内 / 逆向き機器への対策(ダクト等)が記載されている

### env-monitoring-setup — 温湿度モニタリング設置と閾値設計
- subCategory/format: 環境監視 / yaml
- 学習目標: 温湿度センサーの設置位置(ラック前面上中下)と警告閾値の設計根拠を理解し、監視値をCLIで取得・判定できる。
- 用語解説候補: 温湿度センサー / 閾値(Warning/Critical) / 相対湿度と結露 / 静電気と低湿度 / SNMP / OID / ポーリング間隔
- 手順概要: YAMLの設置計画(各ラック前面の上・中・下段)と根拠を確認 → 閾値表(例: 温度Warning 27℃/Critical 32℃、湿度20〜80%)を検算 → 設置チェックリスト(センサー位置・ケーブル・電源)を消化 → `snmpwalk`で温湿度OIDを取得(模擬出力の読解でも可) → `ipmitool sdr type Temperature`のサーバ側温度とセンサー値を突き合わせ → 閾値超過時の一次対応(通知確認→現地確認)フローを確認
- 動作確認: 全設置点で値が取得できる / 取得値が閾値表の正常範囲内 / サーバInlet Tempとセンサー値の乖離が説明範囲内

補足（事実と推測の区別）: 各シナリオのコマンド体系・専門用語の説明は標準的なツール仕様に基づく事実ベースだが、「初学者がどこで誤解しやすいか」という評価軸は研修設計上の経験則に基づく推定であり、実装時・実施後のフィードバックで検証・調整することを推奨する。
