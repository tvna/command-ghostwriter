# NGFWベンダーカタログ拡張: 25運用課題カタログを50件/ベンダーへ拡張(item 26-50) 設計書

Refs #619, #630, #631, #501, #634, #635

## 1. 目的

`network`カテゴリのNGFW/ファイアウォール4ベンダー(Fortinet, Palo Alto Networks, SonicWall, OPNsense)について、#619で確立された「25運用課題カタログ」(item 1-25)に続く新規25項目(item 26-50相当)を追加し、各ベンダーのテンプレート数を「50件程度」まで引き上げる。既存25項目と同じ設計原則(共通運用課題をベンダーネイティブな機構で解く、一次情報で検証する)を踏襲する。

## 2. 背景・現状分析

### 2.1 現状のベンダー別テンプレート数(実測、issue #630の規約に基づきコマンドと出力を明記)

以下のコマンドで実測した(`web/src/lib/templates.ts`を直接パースする一行スクリプト):

```
python3 -c "
import re
text = open('web/src/lib/templates.ts').read()
rows = re.findall(r'category: \"(\\w+)\", subCategory: \"([^\"]+)\"', text)
from collections import Counter
net = Counter(sc for cat, sc in rows if cat == 'network')
for k,v in sorted(net.items(), key=lambda x: -x[1]):
    print(f'{v:4d}  {k}')
"
```

出力(network カテゴリ全38サブカテゴリ、上位4件が本設計の対象ベンダー):

```
  29  Fortinet
  26  Palo Alto Networks
  26  SonicWall
  25  OPNsense
  25  IDS・IPS
  20  トラフィック分析
  20  オーバーレイVPN
  20  ZTNAオーバーレイ
  11  Cisco
   9  YAMAHA
   6  ファイアウォール
   4  疎通・経路
   4  IPアドレス設計
   4  Juniper
   4  HPE Aruba
   4  Allied Telesis
   4  NEC
   3  ポート確認
   3  Arista
   3  Dell
   3  Alaxala
   2  疎通確認
   2  DHCP
   2  VLAN
   2  冗長化
   2  ルーティング
   1  IPアドレス管理
   1  L1/L2リンク
   1  iptables
   1  nftables
   1  パケット解析
   1  ブリッジ
   1  遠隔起動
   1  監視
   1  トンネリング
   1  NIC
   1  性能測定
   1  Ubiquiti
```

`Cisco`以下10件(Cisco, YAMAHA, Juniper, HPE Aruba, Allied Telesis, NEC, Arista, Dell, Alaxala, Ubiquiti)はスイッチ/ルータ系ベンダーであり、本設計の対象外(9節)。`IDS・IPS`/`トラフィック分析`/`オーバーレイVPN`/`ZTNAオーバーレイ`等はベンダー非依存のトピック別サブカテゴリであり、本設計の対象ではない(ベンダー名がsubCategoryのものだけが対象)。

内訳: Fortinet 29 = 既存25項目 + `fortinet-lacp-lag`/`fortinet-ospf-neighbor`/`fortinet-bgp-neighbor`/`fortinet-ikev2-vpn`。SonicWall/Palo Alto Networks 26 = 既存25項目 + `*-ikev2-vpn`。OPNsense 25 = 既存25項目のみ(相互接続/IKEv2テンプレートは対象外)。

### 2.2 このセッションでの決定事項(owner承認済み、brainstormingダイアログ経由)

- **対象範囲**: NGFW/ファイアウォール4ベンダーのみ。スイッチ/ルータ系10ベンダー(Cisco, YAMAHA, Juniper, HPE Aruba, Allied Telesis, NEC, Arista, Dell, Alaxala, Ubiquiti)は、50件規模の共通運用課題カタログ自体が未整備であり性質の異なる新規設計を要するため、本設計の対象外としIssue #634 で追跡する(9節参照)。
- **Ubiquiti等の少数ベンダーの扱い**: 将来的に他ベンダーと同様50件まで育てる方針とし、統合・廃止は行わない。
- **新規25項目の内容**: ownerからの具体的な希望はなく、リサーチして候補を提案する方針で合意。30候補をWorkflowで4ベンダー×一次情報検証し、25項目を採用・5項目を不採用とした(3節・4節)。
- **OPNsenseにネイティブ機構がない2項目の扱い**: `remote-access-posture-check`と`ha-config-sync-drift`はOPNsenseのみ一次情報上ネイティブ機構が見当たらなかった。ownerの決定により、この2項目のみOPNsense向けテンプレートを作成しない(無理な代替を捏造しない)。

## 3. スコープ

### 3.1 件数・命名規則

- 25新規項目 × 4ベンダー = 100。うちOPNsenseは2項目除外のため実際は **98テンプレート**。
- id規則: `fortinet-<slug>` / `paloalto-<slug>` / `sonicwall-<slug>` / `opnsense-<slug>`(`<slug>`は3.3節の25種)。`paloalto-`であって`palo-alto-`ではない(#619の既存命名を踏襲)。
- 各テンプレートは`assets/examples/<id>.j2` + `assets/examples/<id>.{format}`のペア。`category: "network"`、`subCategory`は`Fortinet` / `Palo Alto Networks` / `SonicWall` / `OPNsense`(4ベンダーとも`ALLOWED_SUBCATEGORIES["network"]`に既存、新規サブカテゴリ追加は不要)。
- `format`/`activity`は3.3節の表のとおり(design-time提案。実装時に実データ形状に応じて調整可)。

### 3.2 最終件数の見込み(実装完了後)

| ベンダー | 既存 | 新規 | 合計 |
|---|---|---|---|
| Fortinet | 29 | 25 | 54 |
| SonicWall | 26 | 25 | 51 |
| Palo Alto Networks | 26 | 25 | 51 |
| OPNsense | 25 | 23 | 48 |

いずれも「50件程度」の許容範囲内(48〜54)。25項目×4ベンダーの一律カタログ構造を優先し、無理に正確な50件へ切り詰めることはしない(2.2節のOPNsense除外2項目を除く)。

### 3.3 新規25項目カタログ(共通運用課題定義、item 26-50)

各テンプレートの「目的」節は、ベンダーを問わずこの運用課題文をベースに(ベンダーネイティブな機構名を織り込んで)記述する。

| # | slug | 共通運用課題 | format | activity |
|---|---|---|---|---|
| 26 | `ssl-tls-inspection` | 暗号化された通信(SSL/TLS)の中身を検査してマルウェアや情報漏えいを検知したいが、復号・再暗号化により通信内容を可視化しつつ、金融・医療等プライバシー配慮が必要な通信は検査対象から除外したい。 | toml | (build, 既定) |
| 27 | `app-control-policy` | ポート番号だけでは判別できないアプリケーション(SaaS、P2P、迂回通信等)をレイヤ7で識別し、アプリケーション単位で許可/監視/遮断のポリシーを適用したい。 | csv | (build, 既定) |
| 28 | `url-category-filtering` | フィッシングやマルウェア配布サイト等の危険なURLカテゴリを自動遮断しつつ、誤検知(過検知)によって業務に必要な正当なサイトがブロックされた場合に迅速に例外を設定したい。 | csv | (build, 既定) |
| 29 | `user-id-policy` | IPアドレスではなくユーザー/グループ単位でファイアウォールポリシーを適用するために、AD/LDAP等のディレクトリサービスとログオン情報を連携し、ID-IPマッピングを維持したい。 | yaml | (build, 既定) |
| 30 | `qos-bandwidth-shaping` | 回線輻輳時に重要な業務トラフィックを優先し、非重要トラフィックの帯域を制限することで業務影響を最小化したい。 | toml | (build, 既定) |
| 31 | `multi-wan-failover` | 複数のWAN回線を用いて、回線障害時に自動的にフェイルオーバーし業務継続性を確保したい。切替に要する時間や復旧条件も把握したい。 | yaml | (build, 既定) |
| 32 | `threat-intel-feed` | 外部の脅威インテリジェンスフィード(既知の悪性IP/ドメイン/URL等)を継続的に取り込み、ファイアウォールポリシーへ自動反映して遮断したい。 | toml | routine |
| 33 | `dos-protection-profile` | SYNフラッド等のDoS/DDoS攻撃を検知・緩和しつつ、正常な通信への誤検知(過剰遮断)を避けられるよう閾値やモードを調整したい。 | yaml | (build, 既定) |
| 34 | `ipv6-dual-stack-parity` | IPv4環境と同様に、IPv6環境でも明示的に許可されない通信はデフォルトで拒否されるポリシー設計(default-denyパリティ)を担保したい。 | csv | (build, 既定) |
| 35 | `admin-mfa-hardening` | 管理者アカウントへの不正アクセスを防ぐため多要素認証(MFA)を必須化しつつ、MFAデバイス紛失等の緊急時にロックアウトされないフェイルセーフ手順を用意したい。 | yaml | (build, 既定) |
| 36 | `central-management-onboarding` | 複数拠点/多数のファイアウォールを一元管理コンソールに登録し、ポリシー配布・設定変更を集中管理したい。 | yaml | (build, 既定) |
| 37 | `site-to-site-vpn-tunnel-monitoring` | 拠点間VPNトンネルの死活を継続的に監視し、断絶時に自動的に再接続またはフェイルオーバーさせたい。 | toml | routine |
| 38 | `explicit-proxy-mode-switch` | クライアント側にプロキシ設定が必要な明示的プロキシモードと、設定不要な透過型プロキシモードを状況に応じて使い分けたい。 | yaml | change |
| 39 | `botnet-c2-detection` | マルウェアに感染した端末が外部のC2(コマンド&コントロール)サーバーと通信するのを検知・遮断したい。 | toml | (build, 既定) |
| 40 | `compliance-hardening-audit` | CIS Benchmark等の公開されたハードニング基準に基づき設定の準拠状況を監査し、逸脱を是正したい。 | csv | routine |
| 41 | `central-log-siem-forwarding` | ファイアウォールのログを外部SIEMへ確実に転送し、転送遅延・欠落を防ぎたい。 | toml | (build, 既定) |
| 42 | `network-discovery-topology` | ネットワーク上のデバイスを自動検出しL2/L3トポロジを可視化するとともに、未許可デバイスの接続を検知したい。 | yaml | (build, 既定) |
| 43 | `certificate-lifecycle-management` | 管理画面/VPN等で使用するTLS証明書の発行・更新・失効を一元管理し、有効期限切れによるサービス断を防ぎたい。 | toml | routine |
| 44 | `snmp-monitoring-integration` | SNMPを用いて外部監視基盤(Zabbix等)からファイアウォールのヘルスチェック(CPU/メモリ/インターフェース状態等)を行いたい。 | yaml | (build, 既定) |
| 45 | `cloud-vm-form-factor-deployment` | クラウド環境(AWS/Azure等)に仮想アプライアンスとしてファイアウォールを展開し、ライセンス形態(BYOL/PAYG)を選択、需要に応じてスケールアウトしたい。 | toml | (build, 既定) |
| 46 | `config-drift-baseline-compare` | 稼働中の設定と承認済みベースライン(過去バージョン)を定期的に比較し、意図しない変更(コンフィグドリフト)を検知したい。 | yaml | routine |
| 47 | `guest-wifi-bandwidth-cap` | ゲストWiFi利用者の帯域や同時接続数に上限を設け、社内ネットワークのリソースを保護したい。 | csv | (build, 既定) |
| 48 | `vdom-multi-tenant-segmentation` | 1台の物理アプライアンス上で複数のテナント/部門ごとに独立した設定・ポリシー・ログを論理的に分離運用したい。 | yaml | (build, 既定) |
| 49 | `remote-access-posture-check` | リモートアクセスVPN接続時に、エンドポイントの状態(AV稼働、パッチ適用状況等)を検査し、非準拠端末のアクセスを制限・隔離したい。 | yaml | (build, 既定) |
| 50 | `ha-config-sync-drift` | HA(高可用性)クラスタを構成するペア機器間の設定同期状態を定期的に監査し、非同期(ドリフト)を検知・是正したい。 | toml | routine |

### 3.4 ベンダー別: 課題→ネイティブ機構マッピング(一次情報検証済み)

凡例: **確認済み** = ベンダー公式ドキュメントで直接裏付け。**適応** = OPNsenseと同じ機構名ではないが、同じ運用課題をベンダーネイティブな別機構で解決することを一次情報で確認・検証済み。

OPNsenseの表には`remote-access-posture-check`・`ha-config-sync-drift`の行がない(2.2節・3.5節の決定により対象外)。

#### Fortinet (FortiOS)

| slug | id | ネイティブ機構 | 判定 | 一次情報 |
|---|---|---|---|---|
| `ssl-tls-inspection` | `fortinet-ssl-tls-inspection` | SSL/TLS Deep Inspection(SSL/SSHインスペクションプロファイル)。FortiGateがクライアント-サーバー間の中間者として復号・検査し、FortiGate署名証明書で再暗号化して転送する。信頼chainはFortiGateのCA証明書をエンドポイントにルートとしてインストールすることで確立し、除外は「SSL Exemption」機能(Finance and Banking/Health and Wellness/Personal Privacyなど既定除外カテゴリのカスタマイズ、IPアドレス/範囲/サブネット/FQDN/wildcard-FQDN/地域単位の個別除外)で構成する。SSL Inbound Inspection(protecting SSL server)も同ドキュメント体系でサポートされる。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.0/best-practices/598577/ssl-tls-deep-inspection |
| `app-control-policy` | `fortinet-app-control-policy` | Application Control(FortiGuardアプリケーションコントロールシグネチャベース)。IPSプロトコルデコーダで非標準ポート/プロトコル上のアプリケーショントラフィックも識別し、アプリケーションセンサー(プロファイル)単位でカテゴリ/個別アプリごとにallow/monitor/block等のアクションを設定、ファイアウォールポリシーに適用して可視化と制御を行う。FortiGuard Application Controlサブスクリプションが必要。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.5/administration-guide/302748/application-control |
| `url-category-filtering` | `fortinet-url-category-filtering` | Webフィルタ/URLフィルタ機構。FortiGuardカテゴリ(Phishing、Malware、Spywareなど)単位でblock/monitor/allow/exemptを設定できる。誤判定時の例外は静的URLフィルタで「exempt」アクションを使う(allowではFortiGuardのblock判定を上書きできず、exemptのみが上書き可能)。exempt時にどのセキュリティプロファイル処理をスキップするかも個別設定可能。 | 確認済み | https://docs.fortinet.com/document/fortigate/8.0.0/administration-guide/19814/basic-category-filters-and-overrides |
| `user-id-policy` | `fortinet-user-id-policy` | FSSO(Fortinet Single Sign-On)+LDAP/RADIUS連携によるID-basedファイアウォールポリシー。Collector Agent(Standard/Advanced modeでLDAPサーバー指定)やFortiAuthenticator経由でAD等のログオンイベントを監視しユーザー/グループ情報をFortiGateへ通知、RADIUSアカウンティングレコードの監視によるRADIUS認証ユーザーの識別も可能。FSSOユーザーグループはID-basedセキュリティポリシーで選択でき、ID-to-IPマッピングはCollector Agent/FortiAuthenticatorのログオン監視により維持される。 | 確認済み | https://docs.fortinet.com/document/fortigate/8.0.0/administration-guide/576158/configuring-fsso-firewall-authentication |
| `qos-bandwidth-shaping` | `fortinet-qos-bandwidth-shaping` | Traffic Shaping(ポリシーベースのシェーピング+プライオリティキューイング)。物理インターフェースごとに6段階の優先度キュー(queue 0が最優先)を持ち、ToSベースの優先度値とファイアウォールポリシー優先度値を加算してキュー番号を決定。shaping policy/firewall policyでtos/tos-mask(DSCPマッチ)、diffserv-forward/diffserv-reverse(DSCPマーキング)、帯域保証(guaranteed bandwidth)/上限(maximum bandwidth)を設定し、輻輳時に重要トラフィックを優先させる。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.5/administration-guide/297431/traffic-shaping |
| `multi-wan-failover` | `fortinet-multi-wan-failover` | SD-WAN(Performance SLA + SD-WANルール)。各WANリンクへヘルスチェックプローブ(レイテンシ/ジッタ/パケットロス測定)を送信し、SLA未達のリンクはSD-WANロードバランスグループのルートから除外(フェイルオーバー)、SLA復帰でルート再確立。Lowest Cost (SLA)モード等のSD-WANルールでSLAを満たす最安コストリンクを選択するポリシーベースルーティングを実現。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.5/administration-guide/584396/sd-wan-performance-sla |
| `threat-intel-feed` | `fortinet-threat-intel-feed` | External Threat Feed / External Block List(Security Fabric > External Connectors)。HTTPサーバー上のプレーンテキストファイル(IPアドレス/範囲/サブネット、ドメイン名、URL、マルウェアハッシュを1行1エントリ)またはSTIX/TAXIIサーバーから動的にインポートし、変更は即座に反映される。インポートしたリストはファイアウォールポリシー、プロキシポリシー、local-inポリシー、ZTNAルールの送信元/宛先、DNSフィルタプロファイルの外部IPブロックリストとして利用可能。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.2/administration-guide/891236/ip-address-threat-feed |
| `dos-protection-profile` | `fortinet-dos-protection-profile` | DoSポリシー(異常検知/anomalyベースのフラッド対策)。tcp_syn_floodなど事前定義済みアノマリーに閾値を設定し、Continuous mode(閾値超過中は継続ブロック)/Periodical mode(アノマリー検知後は設定パケット数/秒のみ許可)の2モードで誤検知・過検知のバランスを調整できる。NP7/NP6XLiteハードウェアではSYN cookiesメカニズムによるハードウェアオフロードも可能。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.5/administration-guide/771644/dos-policy |
| `ipv6-dual-stack-parity` | `fortinet-ipv6-dual-stack-parity` | IPv6は`config firewall policy6`(または新しいFortiOSではConsolidated/Combined IPv4-IPv6 Policyモードで単一ポリシーテーブル)としてIPv4と同じポリシー評価フレームワーク・実装で構成され、明示的に許可されないトラフィックは同じimplicit deny評価ロジックでドロップされる。Consolidated policyモードではソースインターフェース/宛先インターフェース/サービス/ユーザー/スケジュールをIPv4・IPv6で共有しつつアドレス指定のみ分けられるため、抜け漏れ防止のため両アドレスファミリを一体的に整備できる。 | 確認済み | https://docs.fortinet.com/document/fortigate/6.4.0/new-features/815846/consolidated-ipv4-and-ipv6-policy-configuration |
| `admin-mfa-hardening` | `fortinet-admin-mfa-hardening` | FortiToken/FortiToken Cloud多要素認証。System > Administratorsで対象管理者アカウントにTwo-factor Authenticationを有効化し、Authentication TypeにFortiToken(モバイル)またはFortiToken Cloudを選択、Tokenドロップダウンでシリアル番号を割当てメールアドレスを設定する。公式ドキュメントはフェイルセーフ手順として「MFA有効化前に、メインアカウントで認証できない場合に備えてFortiGateへのアクセスを保証する第二の管理者アカウントを作成しておく」ことを明示的に推奨している。 | 確認済み | https://docs.fortinet.com/document/fortigate/8.0.0/administration-guide/332870/add-fortitoken-multi-factor-authentication |
| `central-management-onboarding` | `fortinet-central-management-onboarding` | FortiManager: 未認証デバイスのDevice Manager登録(ADOM割当)とInstall Wizardによるポリシーパッケージ/デバイス設定の一括インストール。FortiGate側はFGFMトンネル経由でFortiManagerに登録され、rollback-allow-rebootにより導入失敗時は自動ロールバックも可能。 | 確認済み | https://docs.fortinet.com/document/fortimanager/8.0.0/administration-guide/953075/install-policy-package |
| `site-to-site-vpn-tunnel-monitoring` | `fortinet-site-to-site-vpn-tunnel-monitoring` | IPsec Dead Peer Detection(DPD、on-idle/on-demand)によるトンネル死活監視と、SD-WANルール(Performance SLA)またはセカンダリトンネルのset monitor設定によるフェイルオーバー/再接続。DPDでプライマリのダウンを検知後、SD-WANがセカンダリへ切替。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.2.0/secgw-for-mobile-networks-deployment/148767/dead-peer-detection |
| `explicit-proxy-mode-switch` | `fortinet-explicit-proxy-mode-switch` | FortiGateの明示的プロキシ(Explicit Web Proxy)とトランスペアレントプロキシ(Transparent Proxy)。前者はクライアント側にプロキシ設定(PAC等)が必要、後者はデフォルトゲートウェイ経由でクライアント設定不要という違いが公式ドキュメントに明記。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.4.0/administration-guide/609381/explicit-and-transparent-proxies |
| `botnet-c2-detection` | `fortinet-botnet-c2-detection` | IPSプロファイルのBotnet C&C IP blocking(scan-botnet-connection)。Scan Outgoing Connections to Botnet SitesをBlock/Monitorに設定し、ファイアウォールポリシーに適用することで感染ホストのC2向けoutbound通信を遮断・ログ記録。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.0/administration-guide/668865/ips-with-botnet-c-c-ip-blocking |
| `compliance-hardening-audit` | `fortinet-compliance-hardening-audit` | FortiOS Security Rating機能。CIS Benchmark自体はCIS(第三者団体)が発行するものだが、FortiGateのSecurity RatingはCISコンプライアンス基準に対応したチェック項目・スコアリングをネイティブに提供し、逸脱項目の是正(推奨設定への誘導)ができる。 | 適応 | https://docs.fortinet.com/document/fortigate/7.4.0/new-features/794602/support-cis-compliance-standards-within-security-ratings-7-4-1 |
| `central-log-siem-forwarding` | `fortinet-central-log-siem-forwarding` | FortiGateのsyslogサーバー転送設定(config log syslogd setting、最大4台の外部syslogサーバー)。RFC 3195のRAWプロファイルに基づくreliable delivery(TCP、mode legacy-reliable)を有効化することで、転送遅延・欠落を抑止した信頼性の高いSIEM連携が可能。 | 確認済み | https://docs.fortinet.com/document/container-fortios/7.2.1/administration-guide/960806/configuring-logging-to-syslog-servers |
| `network-discovery-topology` | `fortinet-network-discovery-topology` | 単一機能ではなく複数のネイティブ機構の組み合わせで実現する。(1) Security Fabric の Physical Topology / Logical Topology: FortiSwitch/FortiAP等ファブリック対応機器を自動検出し、未承認(Authorize待ち)の新規デバイスをグレー表示する。(2) LLDPレセプション: L2隣接デバイスをベンダー非依存で学習しCLI/REST/SNMPで参照可能。(3) Asset Identity Center: LANインターフェースの Device Detection によりネットワーク上の資産(デバイス/ユーザー/脆弱性)を一覧化。(4) Rogue AP検知: WiFiにおける不正APのオンワイヤ相関検出。 | 適応 | https://docs.fortinet.com/document/fortigate/7.6.6/administration-guide/118429/topology |
| `certificate-lifecycle-management` | `fortinet-certificate-lifecycle-management` | System > Certificates でのACME(RFC 8555)証明書自動発行・更新(Let's Encrypt等)。GUIでImport > Local Certificate > Type: Automated を選択し、FQDN・ACMEインターフェースを設定すると自動更新される。発行済み証明書は管理画面HTTPSサーバ証明書やVPN証明書(vpn certificate local)として直接指定可能。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.4.2/administration-guide/822087/automatically-provision-a-certificate |
| `snmp-monitoring-integration` | `fortinet-snmp-monitoring-integration` | `config system snmp community` / `config system snmp sysinfo` でSNMP v1/v2c(コミュニティ)およびv3ポーリング・トラップ(trap-v1-status, trap-v2c-status, events等)を構成し、Zabbix等の外部NMSへヘルスチェック(CPU/メモリ/HAステータス/インターフェース等のMIB)を連携可能。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.0.3/cli-reference/54620/config-system-snmp-community |
| `cloud-vm-form-factor-deployment` | `fortinet-cloud-vm-form-factor-deployment` | FortiGate-VM のBYOL(Bring Your Own License)/PAYG(従量課金)ライセンス形態と、Azure/AWS向け FortiGate Autoscale(BYOL固定サイズ Scale Set、PAYGの動的スケールアウト/イン)によるクラウド展開・スケールアウト手順が公式ガイドで整備されている。 | 確認済み | https://docs.fortinet.com/document/fortigate-public-cloud/7.6.0/azure-administration-guide/789417/fortigate-autoscale-for-azure-features |
| `config-drift-baseline-compare` | `fortinet-config-drift-baseline-compare` | FortiOS単体には「承認済みベースラインとの定期差分検知」という単一機能は無いが、FortiManagerが同等の運用を提供する。(1) デバイス設定ステータスチェック: 稼働機のランニングコンフィグとFortiManagerデータベース(=事実上のベースライン)の同期状態を in-sync / modified・unknown として常時表示し、Auto-update/Auto-retrieveで定期同期。(2) Configuration Revision History: 過去のリビジョン(承認済みとして指定した版)と現行設定のDiff比較(Show Diff Only等)が可能。加えてFortiGate単体のSecurity Ratingは4時間毎の自動スケジュールでFSBP/PCI/CISのベストプラクティス逸脱を継続監査する。 | 適応 | https://docs.fortinet.com/document/fortimanager/7.4.2/administration-guide/27366/checking-device-configuration-status |
| `guest-wifi-bandwidth-cap` | `fortinet-guest-wifi-bandwidth-cap` | 単一の「ゲストWiFi帯域上限」機能ではなく、既存の汎用機構を組み合わせて実現する。(1) `config wireless-controller vap` の `max-clients` でSSIDごとの同時接続クライアント数を制限。(2) SSIDはFortiGate上で自動的にネットワークインターフェースとして扱われるため、Policy & Objects > Traffic Shaping のInterface-based Traffic Shaping ProfileやShared Traffic ShaperをそのSSIDインターフェースに適用し帯域(最大/保証帯域)を制御。 | 適応 | https://docs.fortinet.com/document/fortigate/6.2.0/cookbook/647914/interface-based-traffic-shaping-profile |
| `vdom-multi-tenant-segmentation` | `fortinet-vdom-multi-tenant-segmentation` | VDOM(Virtual Domain)により、ファイアウォールポリシー・ルーティング・VPNなどの設定をテナント/部門ごとに完全分離できる。グローバル管理者とVDOM単位の管理者ロールを分離可能(MSSPのマルチテナント運用を想定)。ログについても`config log fortianalyzer/syslog override-setting`によりVDOMごとに異なるFortiAnalyzer/Syslogサーバへ振り分け、フィルタも個別設定可能。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.4.3/administration-guide/597696/vdom-overview |
| `remote-access-posture-check` | `fortinet-remote-access-posture-check` | FortiClient EMSのZero Trust Tagging(コンプライアンス/非コンプライアンスルール)とFortiGateのEndpoint Posture Check連携。EMSがエンドポイントにタグ付けしFortiGateへリアルタイム同期、SSL/IPsec VPNポリシーでタグに基づき非準拠端末を拒否・隔離。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.2.0/endpoint-posture-check-reference/345666/endpoint-posture-check |
| `ha-config-sync-drift` | `fortinet-ha-config-sync-drift` | System > HA監視画面/ダッシュボードのHA状態ウィジェットで、クラスタメンバー間のコンフィグ同期状態(チェックサム比較)をリアルタイム表示し、非同期メンバーは赤色でハイライトされる。CLIでは `get sys ha status` の Configuration Status で確認可能。GUIでは不一致のテーブル(オブジェクト種別)まで表示され、原因調査に使える。 | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.6/administration-guide/63913/check-ha-synchronization-status |

#### Palo Alto Networks (PAN-OS)

| slug | id | ネイティブ機構 | 判定 | 一次情報 |
|---|---|---|---|---|
| `ssl-tls-inspection` | `paloalto-ssl-tls-inspection` | SSL Forward Proxy(アウトバウンド復号)およびSSL Inbound Inspection(インバウンド復号)。Forward Proxyでは中間CA証明書をエンドポイントに配布して信頼chainを構成し、Decryption ExclusionリストやSSL Exclude Certificate(証明書ピン留め・非対応暗号スイート等の技術的理由による除外)をDevice > Certificate Management > SSL Decryption Exclusionで管理する。 | 確認済み | https://docs.paloaltonetworks.com/network-security/decryption/administration/enabling-decryption/configure-ssl-forward-proxy ; https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-admin/decryption/decryption-exclusions |
| `app-control-policy` | `paloalto-app-control-policy` | App-ID。トラフィックの内容からアプリケーションを識別し、Security policyルールでポート非依存にアプリ単位で許可/拒否/制御を行う。不審なアプリの可視化はACC(Application Command Center)やApp-ID Cloud Engine(ACE)によるSaaSアプリの細粒度識別で補強できる。 | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-admin/app-id/app-id-overview |
| `url-category-filtering` | `paloalto-url-category-filtering` | URL FilteringプロファイルでURLカテゴリ(phishing、malware等の脅威系カテゴリ含む)ごとにalert/allow/block/continue/overrideのアクションを設定。誤判定時の例外はURL Category Exceptions(カスタムURLカテゴリのURL Listタイプ、またはブロック/許可ルールより上位に置く例外ポリシー)で運用する。 | 確認済み | https://docs.paloaltonetworks.com/pan-os/9-1/pan-os-admin/url-filtering/block-and-allow-lists |
| `user-id-policy` | `paloalto-user-id-policy` | User-ID。LDAP(Active Directory等)サーバプロファイルとGroup Mapping設定でユーザー/グループ情報を取得し、Security policyでユーザー/グループ単位のルールを構成。ID-to-IPマッピングはUser-ID Agent/firewall自身のマッピングテーブルで管理・確認する。RADIUS等の認証のみのソースはグループ情報を持たないため、グループベースポリシーにはLDAP等によるグループマッピングの併用が必要と明記されている。 | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-admin/user-id/map-users-to-groups ; https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-admin/user-id/user-id-concepts/group-mapping |
| `qos-bandwidth-shaping` | `paloalto-qos-bandwidth-shaping` | QoS(Quality of Service)。インターフェースでQoSを有効化し、QoSプロファイルで最大8クラスの優先度・帯域(Egress Max/Guaranteed)を定義し、QoSポリシールールでトラフィックをクラスにマッピングする。輻輳時はクラス優先度とギャランティード帯域により重要トラフィックを保護する設計。 | 確認済み | https://docs.paloaltonetworks.com/pan-os/10-1/pan-os-admin/quality-of-service/configure-qos |
| `multi-wan-failover` | `paloalto-multi-wan-failover` | Policy-Based Forwarding (PBF) のPath Monitoring(ICMPハートビートで到達性を監視し、しきい値を下回るとfail-over/wait-recoverアクションでルートを切替)、およびSD-WANプラグイン/機能のPath Quality Profile(Aggressive/Relaxedモードでのプローブ間隔設定)による自動フェイルオーバー。切替時間はプローブ間隔・しきい値設定に依存し、これらのパラメータで計測・調整する。 | 確認済み | https://docs.paloaltonetworks.com/pan-os/10-1/pan-os-admin/policy/policy-based-forwarding/pbf/path-monitoring-for-pbf ; https://docs.paloaltonetworks.com/sd-wan/administration/enable-sd-wan-without-auto-vpn/manage-sd-wan-link-failovers/define-your-custom-sd-wan-application-thresholds |
| `threat-intel-feed` | `paloalto-threat-intel-feed` | External Dynamic List (EDL)。外部Webサーバでホストされたテキストリスト(IPアドレス/URL/ドメイン)を定期的に取り込み、Security policyやAnti-Spywareプロファイル(ドメインの場合はDNSシンクホール)で自動的に遮断。Threat Preventionライセンスがあれば、Palo Alto Networks提供のビルトインEDL(Tor Exit IPアドレス等、日次更新の脅威インテリジェンス)も利用可能。 | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-admin/policy/use-an-external-dynamic-list-in-policy/external-dynamic-list |
| `dos-protection-profile` | `paloalto-dos-protection-profile` | Zone Protection Profile(ゾーン全体のSYN/ICMP/ICMPv6/UDP/Other IPフラッド対策、Flood Protection設定)およびDoS Protection Profile/Policy(特定デバイス/デバイス群向けの粒度の細かい防御)。SYNフラッドはAlarm/Activate/Maximumの3段階CPSしきい値(デフォルトAlarm 10,000・Activate 10,000・Maximum 40,000cps)とSYN CookieまたはRED(Random Early Detection)のドロップアクションで誤検知/過検知のバランスを調整する。 | 確認済み | https://docs.paloaltonetworks.com/network-security/security-policy/administration/security-profiles/security-profile-dos-protection-profile/configure-a-dos-protection-profile-pm ; https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-admin/zone-protection-and-dos-protection/zone-defense/zone-protection-profiles/flood-protection |
| `ipv6-dual-stack-parity` | `paloalto-ipv6-dual-stack-parity` | Security policy rulebaseはIPv4/IPv6共通の機構であり、Device > Setup > SessionでIPv6 Firewallingを有効化した上で、IPv6アドレス/プレフィックスをaddressオブジェクトとして定義しIPv4同様にルールへ組み込む。App-ID/脅威防御/URLフィルタリング等のセキュリティプロファイルもIPv6フローに適用される。 | 確認済み | https://live.paloaltonetworks.com/t5/general-topics/ipv6-dual-stack-configurations/td-p/434909 |
| `admin-mfa-hardening` | `paloalto-admin-mfa-hardening` | 管理者Web UIログインの多要素認証は、RADIUSまたはSAML経由でMFAベンダー(例: Duo)と連携するAuthentication Profile/MFA Server Profileにより実現する(MFAベンダーAPIの直接統合は管理者認証では非対応)。緊急時のフェイルセーフは、Device > Authentication SequenceでRADIUS/SAMLを一次認証、ローカルデータベース認証をフォールバックとして順序付ける構成で担保する。フォールバックは認証サーバが「到達不能」等のエラー時のみ発動し、認証拒否時には発動しない点に留意。 | 確認済み | https://docs.paloaltonetworks.com/pan-os/10-1/pan-os-admin/authentication/configure-multi-factor-authentication ; https://docs.paloaltonetworks.com/pan-os/10-2/pan-os-admin/firewall-administration/manage-firewall-administrators/administrative-authentication |
| `central-management-onboarding` | `paloalto-central-management-onboarding` | Panoramaの「Managed Devices」機能でファイアウォールを一元管理デバイスとして登録し、Template/Template Stackおよび Device Group を用いてポリシー・ネットワーク設定を集中配布する。初回接続時に Device Group / Template Stack / Log Collector / Collector Group へ自動関連付け(Associate Devices)し、Auto Push on 1st Connect で自動プッシュも可能。 | 確認済み | https://docs.paloaltonetworks.com/panorama/11-1/panorama-admin/panorama-overview/centralized-firewall-configuration-and-update-management/templates-and-template-stacks |
| `site-to-site-vpn-tunnel-monitoring` | `paloalto-site-to-site-vpn-tunnel-monitoring` | IKEv1のDead Peer Detection(DPD)/IKEv2のLiveness Check、およびIPSecの「Tunnel Monitoring Profile」でトンネル内の宛先IPへのICMPプローブにより疎通を監視し、途絶時に Wait Recover または Fail Over(ルーティングから当該トンネルインターフェースを除外し経路を切替)のアクションを実行できる。 | 確認済み | https://docs.paloaltonetworks.com/network-security/ipsec-vpn/administration/set-up-tunnel-monitoring |
| `explicit-proxy-mode-switch` | `paloalto-explicit-proxy-mode-switch` | PAN-OSのWeb Proxy機能は「Explicit Proxy」と「Transparent Proxy」の2モードを備え、Explicit Proxyはクライアント側にプロキシ設定(PACファイル等)が必要、Transparent Proxyはクライアントの設定変更なしにインライン/トラフィックステアリングで透過的にプロキシする。 | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-networking-admin/dns/configure-a-web-proxy |
| `botnet-c2-detection` | `paloalto-botnet-c2-detection` | Anti-Spyware Security Profileのシグネチャ(C2検知)、およびDNS Security サブスクリプションのC2ドメイン/DNSトンネリング/DGA検出により、ボットネットのコマンド&コントロール通信を検知し遮断できる。 | 確認済み | https://docs.paloaltonetworks.com/network-security/security-policy/administration/security-profiles/security-profile-anti-spyware |
| `compliance-hardening-audit` | `paloalto-compliance-hardening-audit` | CIS Benchmark自体はCIS(サードパーティ)が発行するものでPAN-OSのネイティブ機能ではないが、Palo Alto Networks公式の「Best Practice Assessment(BPA)」ツールが200以上の設定チェックを実行し、その結果をCIS Critical Security ControlsやNIST等の業界標準にマッピングしたレポートを提供する。これにより公開ハードニング基準に基づく設定監査・逸脱是正の運用をベンダーネイティブなツールで実施できる。 | 適応 | https://www.paloaltonetworks.com/services/bpa |
| `central-log-siem-forwarding` | `paloalto-central-log-siem-forwarding` | Log Forwarding Profileで各ログ種別(Traffic/Threat/WildFire等)ごとに転送先(Syslog/HTTP(S)/SNMP/Email)を定義し、Syslogは1プロファイルで最大4台への冗長送信、HTTPSはTLSで外部SIEMへ送信できる。転送遅延・欠落検知は、Panoramaの「Log Collector Health Monitoring」機能でLog Collectorのプロセス健全性をニアリアルタイムに監視し、転送・接続の異常を検知できる。 | 確認済み | https://docs.paloaltonetworks.com/ngfw/administration/monitoring/configure-log-forwarding |
| `network-discovery-topology` | `paloalto-network-discovery-topology` | SNMP Network Discovery(既設スイッチ経由でのパッシブ検出)およびDevice Security(旧IoT Security、クラウドサービス連携)によるL2/L3デバイスインベントリ・トポロジ可視化。PAN-OS 11.1以降はMonitor > IoT DevicesでWeb UIから直接閲覧可能。 | 適応 | https://docs.paloaltonetworks.com/iot/getting-started/firewall-deployment-for-device-visibility/use-snmp-network-discovery-to-learn-about-devices-from-switches |
| `certificate-lifecycle-management` | `paloalto-certificate-lifecycle-management` | Device > Certificate Management > Certificatesでの証明書生成・インポート・Renew(更新)・Revoke(失効)、SSL/TLS Service ProfileをGUI管理インターフェースやGlobalProtectポータル/ゲートウェイに割り当てるライフサイクル管理。 | 確認済み | https://docs.paloaltonetworks.com/ngfw/administration/certificate-management |
| `snmp-monitoring-integration` | `paloalto-snmp-monitoring-integration` | Device > Setup > OperationsでのSNMP統計ポーリング設定(SNMPv2c/v3、MIB読み出し)と、Device > Server Profiles > SNMP Trapでの外部SNMPマネージャ(最大4台)へのトラップ転送設定。 | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-admin/monitoring/snmp-monitoring-and-traps/snmp-support |
| `cloud-vm-form-factor-deployment` | `paloalto-cloud-vm-form-factor-deployment` | VM-Seriesファイアウォール(BYOL/PAYGライセンス、ライセンスサーバーへの直接通信)と、AWS/GCP/Azure向けのAuto Scalingテンプレート(managed instance group/auto scaling group)によるスケールアウト展開。Panorama-Based Software Firewall Licenseプラグインでスケールイン/アウト時のライセンス発行・失効を自動化。 | 確認済み | https://docs.paloaltonetworks.com/vm-series/11-1/vm-series-deployment/set-up-the-vm-series-firewall-on-google-cloud-platform/deployment-models-for-vm-series-on-gcp/auto-scale-model |
| `config-drift-baseline-compare` | `paloalto-config-drift-baseline-compare` | Config Audit(Panorama Config Audit / Compare Changes in Panorama Configurations)により、running configと任意の保存済み/コミット済みバージョン(承認済みベースラインとして指定した過去バージョン)を並べて差分比較し、意図しない変更を検知する。 | 確認済み | https://docs.paloaltonetworks.com/panorama/11-1/panorama-admin/administer-panorama/manage-panorama-and-firewall-configuration-backups/perform-a-config-audit |
| `guest-wifi-bandwidth-cap` | `paloalto-guest-wifi-bandwidth-cap` | QoS Policy(ゾーン/ユーザー/アプリケーション単位のEgress Max/Guaranteed帯域制御)と、Zone Protection配下のDoS Protection Profile(送信元ごとの最大同時セッション数上限)を組み合わせ、ゲスト用ゾーン/セグメントに適用して帯域上限・同時接続数を制御する。 | 適応 | https://docs.paloaltonetworks.com/network-security/quality-of-service/administration/configure-qos/configure-qos-pan-os |
| `vdom-multi-tenant-segmentation` | `paloalto-vdom-multi-tenant-segmentation` | Virtual Systems(vsys)により1台の物理ファイアウォールを複数の論理仮想ファイアウォールに分割。テナント/部門ごとに独立したセキュリティポリシー、インターフェース、仮想ルーター、管理者権限、ログを分離管理できる。 | 確認済み | https://docs.paloaltonetworks.com/pan-os/10-1/pan-os-admin/virtual-systems/virtual-systems-overview |
| `remote-access-posture-check` | `paloalto-remote-access-posture-check` | GlobalProtectの「HIP(Host Information Profile)チェック」でエンドポイントの状態(AV/暗号化/パッチ適用状況等)を評価し、HIP ProfileをSecurity Policyやログ転送プロファイルのマッチ条件に用いる。非準拠端末は「Quarantine Device List」への自動追加(HIP Match Log SettingのQuarantineアクション、または自動タグ)により、Security Policyでネットワークアクセスを制限・隔離できる。 | 確認済み | https://docs.paloaltonetworks.com/globalprotect/10-1/globalprotect-admin/host-information-for-globalprotect/host-information-profile-hip-in-security-policy-enforcement/quarantine-devices-using-host-information/identification-and-quarantine-of-compromised-devices-overview |
| `ha-config-sync-drift` | `paloalto-ha-config-sync-drift` | HA1/HA2リンク経由のHA Synchronization(コミット時にrunning configを、保存時にcandidate configをHAピア間で同期)。`show high-availability state`の"Running Configuration: synchronized"欄やDashboardのHigh Availabilityウィジェットで同期状態を定期監視し、非同期を検知できる。 | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-admin/high-availability/reference-ha-synchronization |

#### SonicWall (SonicOS)

| slug | id | ネイティブ機構 | 判定 | 一次情報 |
|---|---|---|---|---|
| `ssl-tls-inspection` | `sonicwall-ssl-tls-inspection` | DPI-SSL(Deep Packet Inspection for SSL)。Client DPI-SSL(アウトバウンド/フォワードプロキシ相当、SonicWallのデフォルトCA証明書または任意のCAで再署名)とServer DPI-SSL(インバウンド、社内サーバー証明書をインポートして復号検査)の2系統で構成する。除外はExcluded Address/Excluded CFS Category等のオブジェクトで設定可能。 | 確認済み | https://www.sonicwall.com/support/knowledge-base/how-to-configure-server-dpi-ssl/170505900099021 |
| `app-control-policy` | `sonicwall-app-control-policy` | App Control(Application Control)/App Rules。SonicWallのアプリケーションシグネチャデータベースに基づきレイヤ7でアプリケーションを識別し、POLICY \| Rules and Policies > App Control でログ・ブロック・帯域制御ポリシーを構成できる。Application Visualization機能で可視化も可能。 | 確認済み | https://www.sonicwall.com/support/knowledge-base/application-control-overview/kA1VN0000000LEJ0A2 |
| `url-category-filtering` | `sonicwall-url-category-filtering` | Content Filtering Service(CFS)。50以上のURLカテゴリ(Phishing/Malwareを含むセキュリティ関連カテゴリはデフォルトでブロック推奨)に対しBlock/Allow等のアクションを設定。誤判定時はExcluded Address(Security Services > Content Filter > Excluded Address)でアドレスオブジェクト単位の例外を設定する運用手順が整備されている。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-content_filtering/Content/cfs-overview.htm |
| `user-id-policy` | `sonicwall-user-id-policy` | Single Sign-On(SSO)+ LDAP/RADIUS連携。SSOエージェント(またはTerminal Services Agent)がAD等からユーザーのログイン情報を取得し、LDAPクエリで返されたグループメンバーシップに基づきFirewall > Access Rules等のポリシーが自動適用される。ID-to-IPマッピングはSSO Agentのキャッシュ/クエリ状態で確認可能。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-users/Content/Settings/settings-userlogin-ssomethod-configure-sso.htm |
| `qos-bandwidth-shaping` | `sonicwall-qos-bandwidth-shaping` | Bandwidth Management(BWM)/QoSマッピング。Egress/Ingressの両方向でトラフィックシェーピングを行い、8段階(0=realtime〜7=最低)の優先度キューにAccess Rule単位でトラフィックを割り当てる。輻輳時は各キューの保証帯域/最大帯域設定で挙動を検証できる。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-objects/Content/Profile_Objects/Bandwidth/introduction.htm |
| `multi-wan-failover` | `sonicwall-multi-wan-failover` | SD-WAN Route Policy(Path Selection Profileによる動的経路選択と自動フェイルオーバー/ロードバランス)、または旧来のMultiple WAN(MWAN)/WAN Failover & Load Balancing機能。複数ISP回線に対しプローブベースの経路選択とアクティブ/パッシブ切替を構成できる。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-0-0-0-sd_wan/Content/Topics/SD-WAN_Route_Policies/sdwan-route-policies-about.htm/ |
| `threat-intel-feed` | `sonicwall-threat-intel-feed` | Botnet Filter の Dynamic Botnet List(外部サーバーのIPアドレス/ディレクトリパス/ファイル名を指定して定期的にリストをダウンロードし、既知の悪性IPを自動遮断)。Custom Botnet Listで誤検知時のオーバーライドも可能。GeoIP Filterと組み合わせて地域単位のブロックも構成できる。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-rules_policies_policy/Content/Settings/settings-botnet-dynamic-botnet-list-server-config.htm |
| `dos-protection-profile` | `sonicwall-dos-protection-profile` | Flood Protection(TCP Layer 3 SYN Flood Protection - SYN Proxy、UDP Flood Protection、ICMP Flood Protection)。Attack Threshold(5〜200,000/秒)を調整し、Watch and Report/Proxy WAN Client Connections When Attack is Suspected/Always Proxyの3モードで誤検知と過検知のバランスを検証できる。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-firewall/Content/Firewall_Flood_Protection/firewall-flood-protection-tcp-layer-3-syn.htm |
| `ipv6-dual-stack-parity` | `sonicwall-ipv6-dual-stack-parity` | IPv6 Access Rules。POLICY \| Rules and Policies > Access Rules でType(IPv4/IPv6)を切り替えて同等のAllow/Deny/Discardルールを作成できる。ステートフルパケットインスペクションによりIPv4と同様WAN/DMZからLAN/WLANへのセッションはデフォルトで拒否されるため、IPv6側でも同等のdefault-denyルールセットを明示的に整備する運用が可能。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-0-0-0-rules_and_policies/Content/access-rules-ipv6-config.htm/ |
| `admin-mfa-hardening` | `sonicwall-admin-mfa-hardening` | TOTPベースの管理者ログイン二要素認証。Device \| Settings \| Administration > Firewall Administrator で One-time Password Method を TOTP に設定し、Google Authenticator等のアプリでQRコード登録する。登録時に発行されるEmergency Scratch Codeを保管しておくことで、モバイル端末紛失時等の緊急時フェイルセーフアクセス手順として利用できる(それでも使えない場合はCLIでTOTPを無効化)。 | 確認済み | https://www.sonicwall.com/support/knowledge-base/how-do-i-configure-two-factor-authentication-for-the-admin-login-with-totp/kA1VN0000000Ma50AE |
| `central-management-onboarding` | `sonicwall-central-management-onboarding` | SonicWall Network Security Manager (NSM/GMS) によるファイアウォールのテナント登録とゼロタッチ・プロビジョニング、および Unified Policy Management による一元ポリシー配信。ファイアウォールはシリアル番号でMySonicWallアカウント配下に登録され、Zero Touch (ZT) 有効化後にNSMへアウトバウンド管理トンネル(TCP 21021/443)を確立し、テナント配下でポリシーを一元管理・配信する。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/nsm-on_prem_admin-4.x/Content/BestPractices/firewalls-onboarding.htm |
| `site-to-site-vpn-tunnel-monitoring` | `sonicwall-site-to-site-vpn-tunnel-monitoring` | SonicOS IPsec VPNの IKE Dead Peer Detection (DPD)。DPD Interval(既定60秒)とFailure Trigger Level(既定3回)を設定し、Phase 1暗号化下のUDPハートビートでピア死活を監視、閾値到達でトンネルをドロップし再ネゴシエーション(再接続)する。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-ipsec_vpn/Content/ipsec-vpn-advanced-config.htm |
| `explicit-proxy-mode-switch` | `sonicwall-explicit-proxy-mode-switch` | SonicOS DPI-SSLの Deployment Scenarios。Transparent Deployment(クライアント側の設定変更不要でアプライアンスが透過的にHTTPS通信をインターセプト)と Proxy Deployment(クライアントブラウザが明示的にプロキシサーバーへ転送するよう設定され、アプライアンスがクライアントとプロキシの間に位置してインスペクションする)の2シナリオが公式に定義されている。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-dpi_ssl/Content/dpi-ssl-deployment-scenarios-proxy-deployment.htm |
| `botnet-c2-detection` | `sonicwall-botnet-c2-detection` | SonicOS Botnet Filter。既知のBotnet C2サーバーのIPデータベース(SonicWall提供、必要ならカスタムリスト追加)と照合し、「Block connections to/from Botnet Command and Control Servers」を有効化することで、感染ホストからのoutboundコールバック通信を含む双方向接続をブロックする。All Connections/Firewall Rule-Basedのフィルタモードを選択可能。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7.3-security_services/Content/Botnet_Filter/botnet-configuring.htm |
| `compliance-hardening-audit` | `sonicwall-compliance-hardening-audit` | NSM Configuration Auditor。単一または複数ファイアウォールに対し読み取り専用の監査テンプレートを適用し、SonicWall(Cysurance連携)のベストプラクティス基準に基づく構成健全性評価レポートを生成、各チェック項目をpass/fail判定しセキュリティポスチャスコアとして提示する。オンデマンド監査とスケジュール監査(継続監視・逸脱検知)の両方に対応。 | 適応 | https://www.sonicwall.com/support/knowledge-base/nsm-4-0-configuration-auditor/kA1VN000001N9Wf0AK |
| `central-log-siem-forwarding` | `sonicwall-central-log-siem-forwarding` | SonicOS Syslogサーバー転送機能(Device \| Log \| Syslog > Syslog Servers)。監査ログ/セキュリティイベントを外部SIEMへUDP/TCP(SonicOS 8ではTLS 1.2/1.3による暗号化Syslog、RFC 5425準拠)で転送する。転送死活は1分間隔のハートビートSyslogで確認でき、GMS/NSM側は既定で3回連続欠落時にユニットをdown判定するほか、パケットキャプチャでUDP514送出を直接検証する手順も公式KBに存在する。 | 確認済み | https://www.sonicwall.com/support/knowledge-base/sonicos-8-encrypted-syslog-faq/kA1VN000001ImK90AK |
| `network-discovery-topology` | `sonicwall-network-discovery-topology` | Dashboard > Topology機能がファイアウォール配下のホスト・APS・SonicWallスイッチ等の物理/論理接続をL2/L3で自動可視化し、IPアドレス・MACアドレス・デバイス種別・トラフィック統計をポップアップ表示する。無許可デバイス検知は無線領域限定で「Rogue Access Point Detection / IDS」(Device > Access Points > IDS)がパッシブ/アクティブスキャンにより未許可APを検出し、MACアドレス(BSSID)ベースの許可リストで管理する。 | 適応 | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-0-0-0-dashboard/Content/Topology/dashboard-topology.htm |
| `certificate-lifecycle-management` | `sonicwall-certificate-lifecycle-management` | Device \| Settings > Certificates画面で、CSR発行(New Signing Request)、証明書インポート(PKCS#7/.p7b、DER/.der・.cer)、管理画面/VPN用途への証明書割当までを一元的なGUIで運用できる。ルート/中間証明書のインポート、期限切れDPI-SSL証明書の再署名手順も公式手順として提供されている。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7.3-device_settings/Content/Certificates/certificates-importing.htm |
| `snmp-monitoring-integration` | `sonicwall-snmp-monitoring-integration` | Device \| Settings > SNMP画面でSNMP v1/v2c/v3を有効化でき、MIB-II(egp/at除く)への応答と、SonicWall独自MIBに基づくTrap通知を設定できる。独自MIBファイルをファームウェア版数別にダウンロードし、Zabbix等サードパーティ監視基盤に取り込んでポーリング/トラップ連携が可能。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-0-0-0-device_settings/Content/Topics/SNMP/about-SNMP.htm/ |
| `cloud-vm-form-factor-deployment` | `sonicwall-cloud-vm-form-factor-deployment` | NSv(仮想NGFW)シリーズがAWS/Azure/VMware ESXi/Hyper-V/KVM/Proxmox上にデプロイ可能で、サブスクリプションベースのライセンス(NSv XSはHA込みで追加ライセンス不要)、単一管理プレーンからのマルチクラウド一貫ポリシー適用、VMリソース(CPU/メモリ)のリサイズによる計画メンテナンス窓を用いたスケールアウト/アップ手順が確立している。 | 確認済み | https://www.sonicwall.com/products/firewalls/nsv-series |
| `config-drift-baseline-compare` | `sonicwall-config-drift-baseline-compare` | 上位管理プラットフォームSonicWall Network Security Manager (NSM)の「Configuration Auditor」機能が稼働中設定をベストプラクティスと自動的に突合し逸脱を検出する。加えてNSMのテンプレートベースポリシー管理では、管理対象機器の設定がテンプレートから逸脱した場合のドリフト検知・アラート、変更履歴・ロールバックが提供される。 | 適応 | https://www.sonicwall.com/products/management-and-reporting/network-security-manager |
| `guest-wifi-bandwidth-cap` | `sonicwall-guest-wifi-bandwidth-cap` | Guest Services (Wireless Guest Services含む)のTraffic Quotaで、ゲストアカウント単位のReceive Limit/Transmit Limit(帯域上限、SonicOS 7.0以降は0MB~999999999MB/Unlimitedで指定)を設定できる。また同時接続ゲスト数の制御は「Maximum Concurrent Guests」フィールドと「Enforce login uniqueness」で行う。 | 確認済み | https://www.sonicwall.com/support/knowledge-base/configuration-of-guest-services-with-traffic-quota-in-sonicos-5-9-above-and-6-2-above/170505742129275/ |
| `vdom-multi-tenant-segmentation` | `sonicwall-vdom-multi-tenant-segmentation` | NSsp 15700等のハイエンドアプライアンス向け「Multi-Instance (MI)」機能が、ハイパーバイザーレベルで分離された複数の独立SonicOSXコンテナインスタンスを1台の物理アプライアンス上に展開し、テナント/部門ごとに個別の設定・ファームウェア版数・ライフサイクル・CPU/メモリ/インタフェース割当・ログを分離する。 | 適応 | https://www.sonicwall.com/support/technical-documentation/docs/sonicosx-7-0-0-0-multi_instance/Content/multi_instance_support.htm/ |
| `remote-access-posture-check` | `sonicwall-remote-access-posture-check` | End Point Control (EPC)。SonicOS SSL VPN(NetExtender/リモートアクセス)接続時にWindows/macOS/Linux端末の状態(AV有無、レジストリ、証明書等)をトンネル確立前に検査し、Allow/Denyプロファイルへの適合度に応じてEPCゾーン(信頼度)へ割り当て、非準拠端末はアクセス制限・隔離・拒否できる。 | 確認済み | http://help.sonicwall.com/help/sw/eng/7634/7/2/0/content/Configuring_SSLVPN.25.12.htm |
| `ha-config-sync-drift` | `sonicwall-ha-config-sync-drift` | HAステータス画面(Device/High Availability > Status)に「Settings Synchronized」「Stateful HA Synchronized」インジケータがあり、PrimaryとSecondary間の設定同期状態を常時監査できる。不一致検知時は「Synchronize Settings」ボタンでPrimary→Secondaryへの強制再同期(是正)が可能で、「Synchronize Firmware」でファームウェア版数の同期も行える。 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-high_availability/Content/Topics/Status_High_Availability/ha-status.htm |

#### OPNsense

| slug | id | ネイティブ機構 | 判定 | 一次情報 |
|---|---|---|---|---|
| `ssl-tls-inspection` | `opnsense-ssl-tls-inspection` | Web Proxy (Squid) の SSL Inspection モード(SSL Bump)。System → Firmware → Plugins で os-squid プラグインを導入後、Services → Web Proxy → Administration → General Forward Settings で 'Enable SSL mode' と検査用CAを設定し、'SSL no bump sites' フィールドで銀行・決済サイト等を検査除外できる。 | 適応 | https://docs.opnsense.org/manual/opnproxy.html |
| `app-control-policy` | `opnsense-app-control-policy` | Zenarmor (旧Sensei) プラグイン。DPIエンジンで700以上のアプリケーション/プロトコルを識別し、Policies → Application Control Rules でアプリ単位の許可/遮断と可視化(リアルタイムダッシュボード)を構成する。 | 適応 | https://docs.opnsense.org/vendor/sunnyvalley/zenarmor.html |
| `url-category-filtering` | `opnsense-url-category-filtering` | Web Proxy (Squid) の Remote Access Control Lists 機能。UT1やShalla's Blacklists等のカテゴリ別ブラックリストを取り込み、フィッシング・マルウェア配布等のカテゴリをSquid ACLへ自動変換して遮断する。カテゴリのチェックを個別に外すことで誤判定時の例外(許可)を運用できる。 | 確認済み | https://docs.opnsense.org/manual/how-tos/proxywebfilter.html |
| `user-id-policy` | `opnsense-user-id-policy` | Captive Portal と Access Servers (LDAP/RADIUS) の連携。System → Access → Servers でLDAP/RADIUS認証サーバーを登録し(LDAPはExtended QueryのmemberOf、RADIUSは応答のCLASS属性でグループを判定)、Captive Portalゾーンに紐づけてユーザー/グループ単位のネットワークアクセスを制御する。 | 適応 | https://docs.opnsense.org/manual/captiveportal.html |
| `qos-bandwidth-shaping` | `opnsense-qos-bandwidth-shaping` | Firewall → Shaper のPipes/Queues(トラフィックシェイパー)。インターフェース・送信元/宛先・方向・ポート単位で帯域制限(Pipe)や重み付け優先(Queue、WF2Q+ポリシー)を設定し、Shaper Statusページでパイプ/キュー/ルールごとの通過量から輻輳時の挙動を確認できる。 | 確認済み | https://docs.opnsense.org/manual/shaping.html |
| `multi-wan-failover` | `opnsense-multi-wan-failover` | Gateway Groups(マルチWAN)。System → Gateways でTier(優先順位階層)を持つGateway Groupを構成し、DPinger(ICMP監視)による死活監視でパケットロス/遅延検知時に自動的に次Tierの回線へフェイルオーバーする。ポリシーベースルーティングと組み合わせて特定トラフィックの経路を制御できる。 | 確認済み | https://docs.opnsense.org/manual/multiwan.html |
| `threat-intel-feed` | `opnsense-threat-intel-feed` | Firewall → Aliases の 'URL Table (IPs)' タイプのエイリアス。外部脅威インテリジェンスフィード(FireHOL、abuse.ch、Spamhaus、DShield等)のURLを登録し、定期更新(スケジュール)で自動取得したIPリストをファイアウォールルールの送信元/宛先として参照して遮断する。Firewall → Diagnostics → pfTableで反映状況を確認できる。 | 確認済み | https://docs.opnsense.org/manual/aliases.html |
| `dos-protection-profile` | `opnsense-dos-protection-profile` | 単一の'DoS Protection Profile'オブジェクトではなく、ルール単位のAdvanced Options(State Type: Synproxy state、Max. established connections per host、Max. new connections per second per host、Max. state entries per host)と、Firewall → Settings → Advanced のグローバル'Enable syncookies'設定を組み合わせてSYN Flood等のしきい値を調整する。 | 適応 | https://docs.opnsense.org/manual/firewall.html |
| `ipv6-dual-stack-parity` | `opnsense-ipv6-dual-stack-parity` | ファイアウォールルールエンジンがTCP/IP VersionとしてIPv4/IPv6/両方をネイティブにサポート。インターフェースでIPv6を無効化した場合は全IPv6トランジットを遮断する暗黙ルールが自動生成されるなど、IPv4のdefault-denyと同等の設計をIPv6側でも明示的ルールとして構成・検証できる。 | 確認済み | https://docs.opnsense.org/manual/ipv6.html |
| `admin-mfa-hardening` | `opnsense-admin-mfa-hardening` | TOTP(RFC 6238)二要素認証。System → Access → Servers でTOTPサーバーを追加し、対象ユーザーにOTP seedを生成、System → Settings → Administrationの認証設定をそのTOTPサーバーに切り替えることでローカル管理者ログインにMFAを必須化する。 | 確認済み | https://docs.opnsense.org/manual/how-tos/two_factor.html |
| `central-management-onboarding` | `opnsense-central-management-onboarding` | OPNsense公式の集中管理ツール「OPNCentral」(Deciso製、Business Edition向け)。中央ホストを鋳型として『クラス』を定義し、Management > Host > Configuration で同期対象設定を構成し、Management > Provisioning でデバイス登録状況の確認とオプションの配布(プッシュ)を行う。HA構成の仕組みをベースに拡張された機能。 | 確認済み | https://docs.opnsense.org/vendor/deciso/opncentral.html |
| `site-to-site-vpn-tunnel-monitoring` | `opnsense-site-to-site-vpn-tunnel-monitoring` | IPsec Dead Peer Detection(RFC 3706準拠、DPD delay/timeout/actionを設定)による死活監視と、CARP仮想IPを結んだHA構成による自動フェイルオーバー/再接続。IKEv2利用時はMOBIKE無効化や strongSwan 詳細チューニングでフェイルオーバー時間を短縮可能。 | 確認済み | https://docs.opnsense.org/manual/vpnet.html |
| `explicit-proxy-mode-switch` | `opnsense-explicit-proxy-mode-switch` | Web Proxy(Squid)の明示的プロキシ(クライアント側にプロキシ設定が必要)とトランスペアレントプロキシ(NATにより自動転送、クライアント設定不要だがHTTPS時はMITM動作になる制約あり)。Services > Web Proxy > Administration > General Forward Settings で切り替え設定。 | 確認済み | https://docs.opnsense.org/manual/how-tos/proxytransparent.html |
| `botnet-c2-detection` | `opnsense-botnet-c2-detection` | Suricataベースの侵入防御システム(IPS)にabuse.chのFeodo Tracker/SSL Blacklist/ThreatFoxフィードをルールセットとして統合。ThreatFoxはOPNsense 21.4で追加されたボットネットC2 IoC検知機能で、IPSモードにすることで感染ホストのコールバック通信を自動遮断できる。 | 確認済み | https://docs.opnsense.org/manual/how-tos/ips-feodo.html |
| `compliance-hardening-audit` | `opnsense-compliance-hardening-audit` | OPNsense自体には自動化されたCIS準拠監査エンジンはないが、CIS(Center for Internet Security)がOPNsense専用のCIS Benchmarkを公式に公開しており、これとOPNsense公式のSecurity/Hardeningドキュメントの推奨設定を突き合わせて手動監査・是正する運用が可能。System > Firmware > Status の『Run an audit』はpkgレベルの既知脆弱性監査であり、設定ハードニング逸脱の監査とは別機能。 | 適応 | https://www.cisecurity.org/benchmark/opnsense |
| `central-log-siem-forwarding` | `opnsense-central-log-siem-forwarding` | Syslog-NGベースのロギング基盤。System > Settings > Logging の Destinations(Remote)タブで複数の転送先をUDP/TCP/TLSトランスポート・アプリケーション/重大度/ファシリティ単位のフィルタ付きで設定可能。TLSトランスポートにより転送遅延・欠落検知や経路保護を組み込める。 | 確認済み | https://docs.opnsense.org/manual/settingsmenu.html |
| `network-discovery-topology` | `opnsense-network-discovery-topology` | OPNsense の Host Discovery service(Neighbors: docs 上は manual/neighbors.html)は ARP/NDP メッセージをパッシブに監視し、IP-MACマッピングのデータベースを構築、マッピング変更(＝未知の新規ホストの出現など)をログする。 | 適応 | https://docs.opnsense.org/manual/neighbors.html |
| `certificate-lifecycle-management` | `opnsense-certificate-lifecycle-management` | System > Trust > Certificates(Certificate Manager)でクライアント/サーバー/CA証明書の発行・インポートに対応し、CRL・OCSPによる失効管理も提供する。さらに公式プラグイン ACME Client(os-acme-client)により Let's Encrypt 等からの自動発行・自動更新(90日証明書の自動更新含む)が可能で、発行された証明書は自動的に Certificate Manager のストレージへ登録・更新される。 | 確認済み | https://docs.opnsense.org/manual/certificates.html |
| `snmp-monitoring-integration` | `opnsense-snmp-monitoring-integration` | Services > NET-SNMP(公式プラグイン os-net-snmp、Net-SNMP実装)でSNMP v1/v2c/v3のポーリングに対応し、コミュニティ/SNMPv3ユーザー設定、リスンIPの指定が可能。Net-SNMPスイート自体はトラップ送信(trap sink/snmptrapd)機能も内包する。 | 確認済み | https://docs.opnsense.org/development/api/plugins/netsnmp.html |
| `cloud-vm-form-factor-deployment` | `opnsense-cloud-vm-form-factor-deployment` | OPNsense は AWS Marketplace / Azure Marketplace 向けにVMイメージが公式提供されており、公式ドキュメント(Virtual & Cloud-Based Installation)がKVM/VMware/Hyper-V/Xen/Bhyve等への導入手順を示す。加えて Business Edition(shop.opnsense.com、年間サブスクリプション)により商用ファームウェアリポジトリ、公式OVAイメージ、GeoIPデータベース等が追加される、正規のライセンス付与経路が存在する。 | 確認済み | https://docs.opnsense.org/manual/virtuals.html |
| `config-drift-baseline-compare` | `opnsense-config-drift-baseline-compare` | System > Configuration > History で、設定変更のたびに保存される config.xml の各バージョンから任意の2世代を選び、unified diff形式で差分を表示できる(選択時は直前バージョンが比較対象として自動選択されるが、任意のバージョンとの比較も可能)。さらに公式プラグイン git-backup(os-git-backup)を使えば、変更イベントごとにGitコミットとして永続的な変更履歴/トレーサビリティを確保できる。 | 確認済み | https://docs.opnsense.org/manual/backups.html |
| `guest-wifi-bandwidth-cap` | `opnsense-guest-wifi-bandwidth-cap` | Firewall > Shaper(Pipes/Queues、ipfw dummynetベース)でインターフェース・送信元/宛先・方向・ポート単位に帯域制限を設定でき、公式ハウツー「Multi Interface shaping for a GuestNet」ではゲストネットワーク向けに下り10Mbps/上り1Mbpsを全接続クライアントで均等共有する設定例が示されている。ユーザーごとの上限は Firewall > Shaper > Pipes の per-user制限機能(公式ハウツー shaper_limit_per_user)でも設定可能。 | 確認済み | https://docs.opnsense.org/manual/how-tos/shaper_guestnet.html |
| `vdom-multi-tenant-segmentation` | `opnsense-vdom-multi-tenant-segmentation` | OPNsense には Fortinet VDOM相当の独立した仮想ファイアウォールインスタンス機構は存在しない。代わりにInterfaces > VLAN(802.1Qタグ)でセグメントを作成し、セグメントごとに個別のDHCP/DNS/サブネット/ファイアウォールルールセットを割り当てることで、顧客・部門単位の論理的なトラフィック分離を実現する。 | 適応 | https://docs.opnsense.org/manual/how-tos/vlan_and_lagg.html |


### 3.5 OPNsense対象外の2項目(owner承認済み決定)

`remote-access-posture-check`(リモートアクセスVPNのエンドポイントポスチャチェック)と`ha-config-sync-drift`(HAペアの設定同期ドリフト定期監査)は、一次情報検証の結果OPNsenseに妥当なネイティブ機構が見当たらなかった(前者はNAC相当機能なし、後者はCARP/XMLRPCのオンデマンド同期のみで定期差分監査機能なし)。

他の3ベンダーはいずれもconfirmed判定であり運用上の重要性が高いため、この2項目は25項目カタログに残す。一方、無理な代替機構を捏造しないという既存の方針(#619の`remote-access-vpn`再定義と同じ精神)に基づき、**この2項目に限りOPNsense向けテンプレートを作成しない**(owner明示決定)。結果、OPNsenseの新規追加は25項目中23項目のみとなる(3.2節)。

## 4. 不採用の5項目

30候補中5項目は、判定基準(unsupportedが2ベンダー以上は原則ドロップ。1ベンダーのみの場合は運用上の重要性を比較して選別)により不採用とした。

| slug | 不採用理由 |
|---|---|
| `change-approval-workflow` | OPNsenseが1ベンダーunsupported(事後の設定履歴/差分確認とロールバックは存在するが、変更適用前に第二管理者の承認を必須化する事前ゲート機構は一次情報上見当たらない)。かつ4ベンダー中confirmedが2件(Fortinet, SonicWall)にとどまりPAN-OSはadapted(排他ロック+コミットレビューでの代替)と支持がやや弱く、同格の他候補(remote-access-posture-check、ha-config-sync-drift、いずれも3ベンダーconfirmed)を優先したため25枠から除外。 |
| `dlp-policy-basics` | OPNsenseが1ベンダーunsupported(ICAP連携はアンチウイルス機能でありクレジットカード番号等の機密情報パターン検知・遮断を行うネイティブDLP機構は確認できなかった)。SonicWallもDLPブランドの機能はなくApp Rulesの正規表現マッチによるadapted止まりで、4ベンダー中confirmedは2件のみ。同格の復活候補と比べ支持強度が低いため除外。 |
| `license-subscription-renewal` | OPNsenseが1ベンダーunsupported(Business Editionライセンスは失効前アラート・自動延長機能がないとコミュニティ情報でも明言されており、代替機構も確認できなかった)。3ベンダーはconfirmedだが、運用課題としての緊急度・セキュリティ影響度が他の復活候補(リモートアクセス検疫、HA構成ドリフト)より相対的に低いと判断し25枠には含めなかった。 |
| `policy-tag-taxonomy` | SonicWallが1ベンダーunsupported(ルール/オブジェクトへの自由記述タグ付け機能が一次情報上確認できず、Rule Grouping等の別機構では代替不十分と判断されている)。他3ベンダーはconfirmedで支持は強いが、本機能はセキュリティ/可用性の根幹ではなく管理UI上の分類・検索利便性機能であるため、優先度の観点で25枠には含めなかった。 |
| `wireless-controller-integration` | Palo Alto NetworksとOPNsenseの2ベンダーがunsupported(自社製の無線APコントローラ製品を持たず、SSID単位のセキュリティポリシー適用を行うネイティブ機構が存在しない)。基準の『unsupportedが2ベンダー以上ある項目は原則ドロップ』に該当するため除外。 |

## 5. 命名・内容規約

#619で確立された規約をそのまま踏襲する。

- 6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)を既存テンプレート(`opnsense-*.j2`、`fortinet-*.j2`等)と同様に踏襲する。
- 手順内のCLI/GUI操作は、そのベンダーの実在する構文・メニュー名をそのまま記載する。プレースホルダーの疑似コマンドは書かない。3.4節の「一次情報」列のURLを生成時の一次ソースとして参照する。
- 「適応」判定の項目は、目的節または用語解説節に「〇〇ベンダーでは△△という別機構で同じ課題を解決する」旨を一文で明記し、暗黙の1:1対応であるかのような誤解を避ける。
- OPNsenseの適応判定には、サードパーティ製プラグイン(Zenarmor等)やBusiness Edition限定機能が含まれる。テンプレートの用語解説節で、無償版の制限やプラグイン提供元がOPNsense公式でない場合はその旨を明記する(8節のリスク参照)。
- 認証情報(APIキー、証明書等)は値をテンプレートに書かず、マスク表記 + 平文保存を避ける旨の注記(既存`*-ikev2-vpn`踏襲)。
- Jinja制限: `{% macro %}` `{% include %}` `{% import %}` `{% extends %}` `{% do %}` タグ禁止。制限属性名(`request`, `config`, `os`, `sys`, `builtins`, `eval`, `exec`, `getattr`, `setattr`, `delattr`, `globals`, `locals`, `__class__`, `__base__`, `__subclasses__`, `__mro__`)を変数名・属性名・サブスクリプトキーとして使わない。
- credential-shaped文字列(`user:pass`等)をコマンド中に書かない。

## 6. 納品構成: 問題クラスタ単位のPR分割

98件を1PRにまとめず、#619の前例(75件を7クラスタに分割)と同じ粒度で、以下6クラスタ単位でPRを分割する。各PRは本設計書の追跡Issue(10節)を参照する。

| クラスタ | 対象slug | 件数 |
|---|---|---|
| クラスタA: 検査・可視化 | `ssl-tls-inspection`, `app-control-policy`, `url-category-filtering`, `user-id-policy` | 4 slug × 4社 = 16 |
| クラスタB: 可用性・回線 | `qos-bandwidth-shaping`, `multi-wan-failover`, `site-to-site-vpn-tunnel-monitoring`, `guest-wifi-bandwidth-cap` | 4 slug × 4社 = 16 |
| クラスタC: 脅威対策 | `threat-intel-feed`, `dos-protection-profile`, `botnet-c2-detection`, `ipv6-dual-stack-parity` | 4 slug × 4社 = 16 |
| クラスタD: 管理者・ガバナンス | `admin-mfa-hardening`, `central-management-onboarding`, `explicit-proxy-mode-switch`, `certificate-lifecycle-management` | 4 slug × 4社 = 16 |
| クラスタE: 監査・監視 | `compliance-hardening-audit`, `central-log-siem-forwarding`, `network-discovery-topology`, `snmp-monitoring-integration` | 4 slug × 4社 = 16 |
| クラスタF: クラウド・分離・検疫 | `cloud-vm-form-factor-deployment`, `config-drift-baseline-compare`, `vdom-multi-tenant-segmentation`, `remote-access-posture-check`(OPNsense除く3社), `ha-config-sync-drift`(OPNsense除く3社) | 3 slug × 4社 + 2 slug × 3社 = 18 |

合計: 16×5 + 18 = **98テンプレート**。

## 7. 実行アーキテクチャ

- **Phase A(計画・完了)**: 本設計書 + `Workflow`による4ベンダー×30候補の一次情報検証(3.4節、済)。
- **Phase B(生成)**: クラスタ単位で`Workflow`の`pipeline()`を実行。各エージェントは「1 slug × 1ベンダー」を1テンプレートとして担当し、3.4節のマッピング表・一次情報URLを踏まえてテンプレートペアを作成、`scripts/local_render_check.py`で自己検証する。`web/src/lib/templates.ts`には触れない(統合はPhase Cで一括)。
- **Phase C(統合)**: クラスタごとに`templates.ts`の`META`配列へ該当分を追記(マーカー文字列が1箇所にしか一致しないことを確認してから挿入)。taxonomy allow-listの変更は不要(3.1節、4ベンダーとも既存)。`Library.tsx`のrail変更も不要(`NETWORK_VENDORS`に4ベンダーは既存)。`Library.test.tsx`の`EXPECTED`カウント表のみ更新する。
- **Phase D(検証)**: クラスタごとに `uv run pytest -k 'not e2e'`, `uv run ruff check .`, `uv run mypy .`, `web/`配下で`npx tsc -b`, `npx vitest run`。
- **Phase E(納品)**: クラスタごとにコミット→push→PR作成(追跡Issue参照)→`subscribe_pr_activity`で自動監視し、マージまで追従する。6クラスタを順次実施する。

## 8. リスクと既知の制約

採用した25項目のうち、compliance-hardening-audit と network-discovery-topology は4ベンダー全てがadapted判定である。前者はCIS Benchmark自体が第三者(CIS)発行の外部基準であり、各ベンダーはそれに対応づけたベンダー独自の監査・スコアリングツール(Security Rating、BPA、NSM Configuration Auditor、CIS公式OPNsenseベンチマーク+手動監査)で代替している点に注意。後者は「L2/L3トポロジ可視化+未許可デバイス検知」という単一機能名を持つベンダーがなく、いずれも複数のネイティブ機構(ファブリック連携、LLDP、SNMP Discovery、ARP/NDPパッシブ監視、Rogue AP検知等)の組み合わせで部分的にカバーしている運用課題である。

OPNsenseは他の3商用ベンダーと比べてadapted判定が多い(ssl-tls-inspection、app-control-policy、user-id-policy、dos-protection-profile、vdom-multi-tenant-segmentation、config-drift-baseline-compare等)。これは大半が「他社の一体型ネイティブ機能」に対し、Squidベースのプロキシ、公式/サードパーティ製プラグイン(Zenarmor)、汎用ルール設定の組み合わせで代替しているためで、特にZenarmorはSunny Valley Cyber Security社が開発する別ベンダー製の商用DPIエンジンであり、無料版はポリシー変更不可・可視化のみに制限される点、OPNCentralやACME Client等の一部機能もBusiness Edition限定または別プラグイン導入が前提である点に留意が必要。vdom-multi-tenant-segmentationについても、OPNsenseのVLANベース分離およびSonicWallのMulti-Instance(上位機種限定)は、FortinetのVDOMやPAN-OSのvsysほど強力な管理面・ライセンス面の分離を提供しない点で本質的にアーキテクチャが異なる代替である。

remote-access-posture-check と ha-config-sync-drift の2項目は、OPNsenseが唯一unsupportedであるにもかかわらず、他3ベンダーが全てconfirmedである強い支持と運用上の重要性(ゼロトラスト型リモートアクセス検疫、HAクラスタの設定ドリフトによる障害予防)を踏まえて例外的に25項目へ復活させた。テンプレート作成時は、OPNsense利用者向けにこれら2機能に相当するネイティブ機構が存在しない旨を明記し、外部ツールや運用手順での補完(監視スクリプトによるHA同期確認、証明書ベースの認証強化など)を代替案として案内する必要がある。

configuration approval/DLP/license通知/tag機構等、1ベンダーのみunsupportedだった項目のうち2つのみを復活させ、残り4項目(change-approval-workflow、dlp-policy-basics、license-subscription-renewal、policy-tag-taxonomy)は同格の代替候補としてdroppedに回した。これらは将来的にOPNsense側の機能追加(または第三者プラグインの登場)があれば再評価の余地がある。

上記に加えて:

- **98件という規模はPRレビュー負荷が高い**: 6節のクラスタ分割で1PRあたり16〜18件程度に抑える(#619の75件/7クラスタ = 平均10.7件よりやや大きいが、既存25項目カタログの拡張という点で新規性が低く、レビュー観点は絞りやすい)。
- **OPNsenseの2項目除外による非対称性**: 6節のクラスタFのみOPNsenseが3社と異なる件数になる。`Library.test.tsx`のEXPECTEDカウント更新時、OPNsenseとその他3ベンダーで加算数が異なる点に注意(OPNsense +23、他 +25)。

## 9. スコープ外

- スイッチ/ルータ系10ベンダー(Cisco, YAMAHA, Juniper, HPE Aruba, Allied Telesis, NEC, Arista, Dell, Alaxala, Ubiquiti)の50件化。50件規模の共通運用課題カタログ(本設計の3.3節相当)が存在せず新規設計が必要なため、Issue #634 として追跡する(10節)。
- 既存106件(4ベンダー×既存25項目カタログ + 相互接続/IKEv2テンプレート)の内容変更・再監査は行わない(#501/#622の既存監査で問題なしと確認済み)。
- 新規トップレベル`category`の追加、`TemplateCategory`型の変更は行わない。
- Issue #631(オーバーサイズラベルの分割、`server-common`/`network-common`/`ai`/`middleware`が対象)とは独立した別プロジェクトである。#631は50件**以上**のcommonバケットを分割する作業であり、本設計は50件**未満**のベンダーバケットを引き上げる作業であるため、対象が重複しない。
- レンダリングエンジン(`features/document_render.py`等)・Web UI本体のロジック変更は行わない。

## 10. Issue追跡

- 本設計を追跡する新規Issue #635 を起票済み(#619/#630/#631/#501/#634を参照)。
- スイッチ/ルータ系10ベンダーの50件化は、本Issueから独立した Issue #634 として起票済み(新規カタログ設計が必要なため、別セッションでのbrainstormingを推奨する旨を明記)。
