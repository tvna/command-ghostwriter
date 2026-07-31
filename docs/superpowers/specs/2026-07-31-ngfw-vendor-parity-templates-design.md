# NGFW/UTMベンダーパリティ: OPNsense相当運用テンプレート75件追加 設計書

Refs #619

## 1. 目的

`network`カテゴリのファイアウォール/NGFW領域で、OPNsense(25件)とFortinet/Palo Alto Networks/SonicWall(各1〜4件)の間に生じているテンプレート件数・カバー範囲の著しい不均衡を是正する。OPNsenseの25運用課題を基準カタログとし、各課題をFortinet/PAN-OS/SonicWallのネイティブ機構で解く手順書テンプレートを追加し(25課題×3ベンダー=75件)、「同一の運用課題が、どのNGFWベンダーでも手順書として解決できる」状態を作る。

## 2. 背景・現状分析

| ベンダー | 製品分類 | 現状テンプレート数 | 内訳 |
|---|---|---|---|
| OPNsense | OSSファイアウォール | 25 | default-deny, VLAN分離, NAT, GeoIP, HA/CARP, API自動化, インシデント対応, 障害切り分け等(`ファイアウォール`サブカテゴリ) |
| Fortinet | 商用NGFW | 4 | LACP/OSPFネイバー/BGPネイバー/IKEv2 VPN(拠点間接続系のみ) |
| Palo Alto Networks | 商用NGFW | 1 | IKEv2 VPN のみ |
| SonicWall | 商用NGFW/UTM | 1 | IKEv2 VPN のみ |

OPNsenseと商用3社は同一の製品カテゴリ(ファイアウォール/NGFW)で競合するにもかかわらず、商用3社にはファイアウォール製品として本来解決すべき運用課題(ポリシー設計、HA、監査、インシデント対応、障害切り分け)のテンプレートがほぼ存在しない。これが本リポジトリで観測される最大のベンダーパリティ・ギャップである(詳細は#619参照)。

## 3. スコープ

### 3.1 件数・命名規則

- 25課題 × 3ベンダー(Fortinet / Palo Alto Networks / SonicWall) = **75テンプレート**(新規サブカテゴリ追加は不要、3社とも`ALLOWED_SUBCATEGORIES["network"]`に既存)。
- id規則: `fortinet-<slug>` / `paloalto-<slug>` / `sonicwall-<slug>`(`<slug>`は下表の25種)。
- 各テンプレートは`assets/examples/<id>.j2` + `assets/examples/<id>.{csv|toml|yaml}`のペア。format/output/activityはOPNsense元テンプレートの値を踏襲する(下表)。`category: "network"`。
- `subCategory`は`Fortinet` / `Palo Alto Networks` / `SonicWall`(既存の`*-ikev2-vpn`等と同一の値をそのまま使う)。

### 3.2 重要な設計判断: `remote-access-vpn`への再定義

OPNsenseの`opnsense-wireguard-instance`は「拠点接続用の暗号化トンネル」という課題をWireGuardで解く。しかし一次情報での検証の結果、Fortinet/PAN-OS/SonicWallの3社とも自社NGFW製品ラインでWireGuardをネイティブサポートしないことを確認した(SonicWallはSMA100という別製品でのみ対応、FortiOS/PAN-OSは非対応)。単純に代替として「IPsecサイト間トンネル」を当てると、3社とも既存の`*-ikev2-vpn`(拠点間IPsec VPN、#595で追加済み)と内容が重複する。

そのため本設計では、この項目を「拠点間」ではなく「**個人のリモートアクセスVPN**」(社外の個人端末からの暗号化アクセス。FortiClient SSL-VPN / GlobalProtect / SonicWall NetExtender等、各社ネイティブなリモートアクセス機構)という、現状どのベンダーもテンプレートを持たない別の実課題に再定義する。id/slugは`remote-access-vpn`とする。

### 3.3 課題カタログ(25件、全ベンダー共通の運用課題定義)

各テンプレートの「目的」節は、ベンダーを問わずこの運用課題文をベースに(ベンダーネイティブな機構名を織り込んで)記述する。

| # | slug | 由来(OPNsense id) | 共通運用課題 | format | activity |
|---|---|---|---|---|---|
| 1 | `default-deny-wan` | `opnsense-default-deny-wan` | WAN側を暗黙拒否とし、業務に必要な最小限の許可ルールのみを明示的に登録する | csv | (build, 既定) |
| 2 | `lan-segment-isolation` | `opnsense-lan-segment-isolation` | 部門VLAN間の通信を既定拒否とし、業務に必要な通信のみを明示的に許可するセグメント分離ルールを設計・適用する | csv | (build, 既定) |
| 3 | `address-object-rules` | `opnsense-alias-driven-rules` | ホスト・ネットワーク・ポートをAddress Object/Service Objectとして定義し、ルールを集約管理して変更を1箇所に閉じる | csv | (build, 既定) |
| 4 | `dmz-port-forward` | `opnsense-nat-port-forward-dmz` | WANからDMZ内公開サーバへのポートフォワードを最小公開ポートで構成し、到達性を検証する | toml | (build, 既定) |
| 5 | `outbound-nat-policy` | `opnsense-outbound-nat-policy` | 既定のアウトバウンドNATに加え、特定送信元の固定NAT(送信元アドレス固定)を安全に追加する | toml | (build, 既定) |
| 6 | `geoip-country-block` | `opnsense-geoip-country-block` | GeoIP機能で特定国からのWAN着信を遮断し、誤遮断がないことを確認する | toml | (build, 既定) |
| 7 | `schedule-based-access` | `opnsense-schedule-based-access` | スケジュール機能で業務時間外の外部アクセスを自動遮断し、切替時刻の挙動を検証する | csv | (build, 既定) |
| 8 | `mgmt-plane-lockdown` | `opnsense-mgmt-plane-lockdown` | GUI/SSHの管理アクセスを管理セグメントのみに限定し、自己ロックアウトを防ぎながら管理面を要塞化する | yaml | (build, 既定) |
| 9 | `remote-access-vpn` | `opnsense-wireguard-instance` | (再定義: 拠点間ではなく個人リモートアクセス) 社外の個人端末からの暗号化リモートアクセスVPNを、ベンダーネイティブなSSL-VPN/リモートアクセス機構で構成する。既存の*-ikev2-vpn(拠点間IPsec)との重複を避けるための再定義 | yaml | (build, 既定) |
| 10 | `ha-active-passive-setup` | `opnsense-ha-carp-setup` | 二台構成のActive-Passive冗長化(状態同期含む)を構築し、フェイルオーバー動作を検証する | yaml | (build, 既定) |
| 11 | `captive-portal-guest` | `opnsense-captive-portal-guest` | ゲスト用セグメントにキャプティブポータル認証を導入し、社内ネットワークへの到達を遮断した来訪者網を構築する | toml | (build, 既定) |
| 12 | `ips-inline-enable` | `opnsense-ips-inline-enable` | 侵入防止機能をまず観察(検知のみ)で運用し、誤検知を確認したのちインライン遮断へ段階的に昇格する | yaml | (build, 既定) |
| 13 | `dns-over-tls-forwarding` | `opnsense-unbound-dot-forwarding` | DNS問い合わせをDoT(DNS over TLS)等の暗号化上位転送に切り替え、LANからの平文DNS直抜けを遮断する | toml | (build, 既定) |
| 14 | `api-automation-basics` | `opnsense-api-automation-basics` | 最小権限のAPI認証情報を発行し、ルール照会・追加・適用を自動化する運用基盤を整備する | yaml | (build, 既定) |
| 15 | `config-backup-restore` | `opnsense-config-backup-restore` | 設定バックアップを定期取得し、復元手順と世代管理を含めて定型運用化する | toml | routine |
| 16 | `firmware-update-window` | `opnsense-firmware-update-window` | 事前バックアップ・変更告知・更新実施・切り戻し判断までをメンテナンス窓内で行う | yaml | change |
| 17 | `rule-hygiene-audit` | `opnsense-rule-hygiene-audit` | 未使用・重複・過剰許可ルールをヒット数やログから洗い出し、廃止候補を段階的に無効化する定期監査を行う | csv | routine |
| 18 | `emergency-ip-block` | `opnsense-emergency-ip-block` | 攻撃検知時に攻撃元IPを即時遮断し、遮断確認と記録・解除基準までを定めた初動対応を行う | csv | security-response |
| 19 | `compromised-host-quarantine` | `opnsense-compromised-host-quarantine` | 侵害疑いの内部ホストを隔離し、調査用通信のみを許可して封じ込める | yaml | security-response |
| 20 | `staged-rule-change` | `opnsense-staged-rule-change` | ルール変更をログ観察→有効化→事後確認の段階で適用し、切り戻し条件を事前定義して実施する | yaml | change |
| 21 | `blocked-traffic-triage` | `opnsense-blocked-traffic-triage` | 通信できない申告に対し、ログ・セッション状態・NATの順で原因ルールを特定する | yaml | troubleshoot |
| 22 | `state-table-exhaustion` | `opnsense-state-table-exhaustion` | セッション/ステートテーブル使用率急騰時に原因ホストを特定し、上限調整とルール単位の制限で再発を防ぐ | toml | troubleshoot |
| 23 | `ha-failover-drill` | `opnsense-carp-failover-drill` | HA冗長構成の計画切替訓練を実施し、切替時間・セッション維持・復帰動作を測定する | yaml | drill |
| 24 | `port-forward-triage` | `opnsense-port-forward-triage` | 外部から公開サーバへ届かない事象を、NAT・ルール・戻り経路の順に切り分ける | toml | troubleshoot |
| 25 | `log-noise-reduction` | `opnsense-log-noise-reduction` | ブロードキャスト等の定常ノイズをログ抑制し、意味のある遮断ログだけを残す | csv | routine |

### 3.4 ベンダー別: 課題→ネイティブ機構マッピング(一次情報検証済み)

凡例: **確認済み** = ベンダー公式ドキュメントで直接裏付け。**適応** = OPNsenseと同じ機構名ではないが、同じ運用課題をベンダーネイティブな別機構で解決することを一次情報で確認・検証済み。

#### Fortinet (FortiOS)

| slug | ネイティブ機構 | 判定 | 一次情報 |
|---|---|---|---|
| `default-deny-wan` | Firewall Policy with implicit deny (bottom-of-list default deny) plus explicit allow policies | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.5/administration-guide/656084/firewall-policy |
| `lan-segment-isolation` | Firewall Policy between VLAN/zone interface pairs (implicit deny by default) | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.5/administration-guide/656084/firewall-policy |
| `address-object-rules` | Firewall Address objects/groups and Service objects/groups | 確認済み | https://docs.fortinet.com/document/fortigate/8.0.0/administration-guide/214805/address-objects |
| `dmz-port-forward` | Virtual IP (VIP) with port forwarding, referenced as destination in a firewall policy | 確認済み | https://docs.fortinet.com/document/fortigate/8.0.0/administration-guide/155333/virtual-ips-with-port-forwarding |
| `outbound-nat-policy` | Central SNAT policy (central-snat-map) combined with IP Pools for fixed/static source NAT | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.6/administration-guide/421028/central-snat |
| `geoip-country-block` | Geography-based firewall address (GeoIP database) used in a deny policy | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.6/administration-guide/286826/geography-based-addresses |
| `schedule-based-access` | Firewall Schedule (recurring or one-time) attached to a firewall policy | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.6/cli-reference/161573977/config-firewall-schedule-recurring |
| `mgmt-plane-lockdown` | Administrator Trusted Hosts restriction combined with a dedicated management interface/local-in policy | 確認済み | https://docs.fortinet.com/document/fortigate/6.4.0/hardening-your-fortigate/582009/system-administrator-best-practices |
| `remote-access-vpn` | SSL VPN full-tunnel remote access(SSL VPNポータル+トンネルモード、個人リモートユーザー向け)— 既存の拠点間IKEv2 IPsec VPNテンプレートとは別物。WireGuardはネイティブ非対応 | 適応 | https://docs.fortinet.com/document/fortigate/7.6.5/administration-guide/559546/ssl-vpn-full-tunnel-for-remote-user |
| `ha-active-passive-setup` | FGCP (FortiGate Clustering Protocol) Active-Passive HA with virtual MAC and heartbeat-based session sync | 適応 | https://docs.fortinet.com/document/fortigate/7.6.6/administration-guide/900885/ha-active-passive-cluster-setup |
| `captive-portal-guest` | Captive Portal authentication (interface-based or policy-based) restricting guest segment access | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.6/administration-guide/934626/captive-portals |
| `ips-inline-enable` | IPS profile per-signature action (monitor vs block); one-arm sniffer deployment for pure IDS observation before promoting to inline | 確認済み | https://docs.fortinet.com/document/fortigate/8.0.0/administration-guide/648831/one-arm-sniffer |
| `dns-over-tls-forwarding` | DNS over TLS (DoT) for FortiGuard/upstream DNS servers, combined with a policy blocking direct outbound plaintext DNS | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.5/administration-guide/42181/dns-over-tls-and-https |
| `api-automation-basics` | REST API Administrator with API token authentication and a least-privilege custom Admin Profile | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.6/administration-guide/399023/rest-api-administrator |
| `config-backup-restore` | Scheduled Automation Stitch with 'Backup Config' system action, plus native Configuration Revision history for restore | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.4/administration-guide/453129/schedule-trigger |
| `firmware-update-window` | Firmware upgrade procedure with automatic pre-upgrade configuration backup, release-notes review, and change management | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.0/best-practices/338667/firmware-change-management |
| `rule-hygiene-audit` | Firewall Policy Hit Count (7-day rolling counter) to identify unused/rarely-hit policies for periodic audit | 確認済み | https://docs.fortinet.com/document/fortigate/7.4.0/administration-guide/290923/seven-day-rolling-counter-for-policy-hit-counters |
| `emergency-ip-block` | IP Ban (manual via FortiView 'Ban IP' / Quarantine Monitor, or automatic via IPS/security-profile quarantine action) | 確認済み | https://docs.fortinet.com/document/fortigate/8.0.0/administration-guide/49251/ip-ban-using-security-profiles |
| `compromised-host-quarantine` | Security Fabric default automation stitch 'Compromised Host Quarantine' — quarantines a host at the access layer via FortiSwitch/FortiAP or FortiClient EMS | 適応 | https://docs.fortinet.com/document/fortigate/7.2.0/administration-guide/881990/default-automation-stitches |
| `staged-rule-change` | Configuration Revisions (per-change generation with diff compare and revert) combined with policy enable/disable status toggle | 適応 | https://community.fortinet.com/t5/FortiGate/Technical-Tip-Using-the-Revision-option-to-revert-to-a-previous/ta-p/194312 |
| `blocked-traffic-triage` | FortiView (Sessions/Forward Traffic, live) plus 'diagnose sys session list' (state) and VIP/Central SNAT policy check | 確認済み | https://docs.fortinet.com/document/fortigate/8.0.0/administration-guide/863511/fortiview-sessions |
| `state-table-exhaustion` | 'diagnose sys session stat/full-stat' (and FortiView Sessions sorted by count) to identify the top session-consuming host | 確認済み | https://docs.fortinet.com/document/fortigate/8.0.0/administration-guide/885253/per-ip-traffic-shaper |
| `ha-failover-drill` | 'Force HA failover for testing and demonstrations' (manual FGCP failover trigger) to measure failover time and session persistence | 適応 | https://docs.fortinet.com/document/fortigate/7.6.6/administration-guide/684039/force-ha-failover-for-testing-and-demonstrations |
| `port-forward-triage` | Packet-flow debugging (diagnose debug flow) combined with VIP/NAT configuration check, firewall policy match check | 確認済み | https://docs.fortinet.com/document/fortigate/8.0.0/administration-guide/54688/debugging-the-packet-flow |
| `log-noise-reduction` | Local-in policy / log setting controls to suppress broadcast and other routine local-in deny noise while keeping meaningful denies | 確認済み | https://docs.fortinet.com/document/fortigate/7.6.0/new-features/231789/logging-local-traffic-per-local-in-policy |

#### Palo Alto Networks (PAN-OS)

| slug | ネイティブ機構 | 判定 | 一次情報 |
|---|---|---|---|
| `default-deny-wan` | Default Security Policy Rules (interzone-default deny) + explicit allow rulebase | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-admin/policy/security-policy |
| `lan-segment-isolation` | Zone-based Security Policy rules between VLAN security zones (interzone-default deny + explicit allow) | 確認済み | https://docs.paloaltonetworks.com/pan-os/10-1/pan-os-web-interface-help/network/network-zones/security-zone-overview |
| `address-object-rules` | Address Objects / Address Groups, Service Objects / Service Groups, Tags | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-admin/policy/use-address-object-to-represent-ip-addresses/address-objects |
| `dmz-port-forward` | Destination NAT policy rule (one-to-one mapping) | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-networking-admin/nat/nat-configuration-examples/destination-nat-exampleone-to-one-mapping |
| `outbound-nat-policy` | Source NAT policy rules — Dynamic IP and Port (DIPP) for general egress, Static IP for fixed-source hosts | 確認済み | https://docs.paloaltonetworks.com/ngfw/networking/nat/source-nat |
| `geoip-country-block` | Region objects used as Source in Security Policy deny rules | 確認済み | https://docs.paloaltonetworks.com/network-security/security-policy/administration/objects/regions |
| `schedule-based-access` | Schedule objects applied to Security Policy rules | 確認済み | https://docs.paloaltonetworks.com/network-security/security-policy/administration/objects/schedules |
| `mgmt-plane-lockdown` | Permitted IP Addresses on the Management interface + Interface Management Profiles on data-plane interfaces | 確認済み | https://docs.paloaltonetworks.com/pan-os/10-1/pan-os-networking-admin/configure-interfaces/use-interface-management-profiles-to-restrict-access |
| `remote-access-vpn` | GlobalProtect リモートアクセスVPN(Gateway + Portal、認証プロファイルベース、個人リモートユーザー向け)— 既存の拠点間IPsec VPNテンプレートとは別物。WireGuardはネイティブ非対応 | 適応 | https://docs.paloaltonetworks.com/globalprotect/administration/globalprotect-quick-configs/remote-access-vpn-authentication-profile |
| `ha-active-passive-setup` | HA Active/Passive (or Active/Active) with HA1/HA2 links, configuration+session synchronization, and failover | 適応 | https://docs.paloaltonetworks.com/pan-os/10-2/pan-os-admin/high-availability/set-up-activepassive-ha/configure-activepassive-ha |
| `captive-portal-guest` | Authentication Portal (旧称Captive Portal) + Authentication Policy、社内網ゾーンへのSecurity Policy既定拒否と組み合わせ | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-admin/user-id/user-id-concepts/user-mapping/authentication-policy-and-captive-portal |
| `ips-inline-enable` | Threat Prevention(Vulnerability Protection / Anti-Spyware)プロファイルのシグネチャアクションを、公式ベストプラクティスに沿ってAlert(検知のみ)からDrop/Reset-Both(遮断)へ段階移行する運用 | 適応 | https://docs.paloaltonetworks.com/best-practices/internet-gateway-best-practices/best-practice-internet-gateway-security-policy/transition-safely-to-best-practice-security-profiles/transition-vulnerability-protection-profiles-safely-to-best-practices |
| `dns-over-tls-forwarding` | DNS Proxy object with Encrypted DNS forwarding (DoT) | 確認済み | https://docs.paloaltonetworks.com/pan-os/10-2/pan-os-networking-admin/dns/configure-a-dns-proxy-object |
| `api-automation-basics` | PAN-OS XML API / REST API with API key (keygen) と最小権限のRole-Based Administrator | 確認済み | https://docs.paloaltonetworks.com/ngfw/api/api-authentication-and-security/pan-os-api-authentication |
| `config-backup-restore` | Save/Export Firewall Configurations(ファイアウォール単体の名前付きスナップショット+コミット履歴)、定期自動バックアップはPanoramaのScheduled Config Export | 適応 | https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-admin/firewall-administration/manage-configuration-backups/save-and-export-firewall-configurations |
| `firmware-update-window` | PAN-OS Software upgrade workflow(アップグレード前設定バックアップ+HA考慮のメンテナンス手順) | 確認済み | https://docs.paloaltonetworks.com/pan-os/10-2/pan-os-upgrade/upgrade-pan-os/pan-os-upgrade-checklist |
| `rule-hygiene-audit` | Policy Optimizer(未使用ルール・未使用アプリケーション・過剰許可"any"ルールの検出) | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-admin/app-id/security-policy-rule-optimization/policy-optimizer-concepts |
| `emergency-ip-block` | Dynamic IP-Tag registration(XML API/CLI)によるDynamic Address Groupへの即時登録+それを参照する最優先Security Policy拒否ルール | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-admin/policy/register-ip-addresses-and-tags-dynamically |
| `compromised-host-quarantine` | Quarantine Device Lists(Auto-Tag Actions → Dynamic Address Group)による調査用通信限定の隔離 | 確認済み | https://docs.paloaltonetworks.com/network-security/security-policy/administration/objects/quarantine-device-lists |
| `staged-rule-change` | Candidate configuration + Commit/Validate/Preview Changesワークフロー、ルールDisableトグル、Policy Optimizer Rule Usageによる事後確認 | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-admin/firewall-administration/use-the-web-interface/commit-validate-and-preview-firewall-configuration-changes |
| `blocked-traffic-triage` | Traffic log(自動更新)→ Session Browser → Device > TroubleshootingのNAT/Security Policy Matchツール、の順で原因ルールを特定 | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-web-interface-help/monitor/monitor-session-browser |
| `state-table-exhaustion` | show session infoでの使用率確認 → Session Browser/ACCで原因ホスト特定 → Classified DoS Protection Profileの送信元別最大同時セッション数上限で再発防止 | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-admin/zone-protection-and-dos-protection/zone-defense/dos-protection-profiles-and-policy-rules/dos-protection-profiles |
| `ha-failover-drill` | HA計画的フェイルオーバー(Suspend local device / Make local device functional操作コマンド)によるドリルとVerify Failover手順での測定 | 確認済み | https://docs.paloaltonetworks.com/ngfw/administration/high-availability/set-up-activepassive-ha/verify-failover/verify-failover-pan-os |
| `port-forward-triage` | Device > TroubleshootingのNAT Policy Matchツール → Security Policy Matchツール → Traffic log/戻り経路確認、の順で切り分け | 確認済み | https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-web-interface-help/device/device-troubleshooting/nat-policy-match |
| `log-noise-reduction` | ルール単位のログ出力制御(Log at Session Start/Endのオフ)によるノイズ源トラフィックの明示的抑制+Log Forwarding Profileフィルタでの転送時除外 | 適応 | https://docs.paloaltonetworks.com/network-security/security-policy/administration/security-rules/session-logging-considerations |

#### SonicWall (SonicOS)

| slug | ネイティブ機構 | 判定 | 一次情報 |
|---|---|---|---|
| `default-deny-wan` | Access Rules default-deny from WAN/DMZ zones | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-rules_policies_global/Content/Access_Rules/access-rules-stateful-packet-inspection.htm |
| `lan-segment-isolation` | Zones + inter-zone Access Rules(VLANごとにZoneを分離) | 確認済み | https://www.sonicwall.com/support/knowledge-base/how-do-zones-work-in-sonicos/170503731702241/ |
| `address-object-rules` | Address Objects/Address Groups と Service Objects/Service Groups | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-objects/Content/Match_Objects/Addresses/adding-address-object.htm |
| `dmz-port-forward` | NAT Policy(Inbound port forward)+ 対応するAccess Rule | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-rules_policies_policy/Content/NAT_Rules/nat-rules-nat-policies-create-examples-inbound-traffic.htm |
| `outbound-nat-policy` | 既定の自動生成Many-to-One NAT PolicyへのカスタムNAT Policy追加(特定送信元の固定変換) | 適応 | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-rules_policies_policy/Content/NAT_Rules/nat-rules-nat-policies-create-examples-many2one-nat-policy.htm |
| `geoip-country-block` | Geo-IP Filter | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-security_services/Content/Geo_IP_Filter/geo_ip.htm |
| `schedule-based-access` | Schedule Objects を適用した Access Rule | 確認済み | https://www.sonicwall.com/support/knowledge-base/configuring-schedules-in-gen7-sonicos/220630034438303 |
| `mgmt-plane-lockdown` | 管理インターフェースのTrusted Hosts限定(Address Objectで送信元を絞ったAccess Rule)+ WAN管理サービスの無効化 | 確認済み | https://www.sonicwall.com/support/knowledge-base/how-can-i-restrict-sonicwall-management-access-for-specific-ip-address-es-only/kA1VN0000000JM30AM |
| `remote-access-vpn` | SSL VPN(NetExtenderクライアント)またはGlobal VPN Client(IPsecクライアント)によるリモートアクセスVPN、個人リモートユーザー向け — 既存の拠点間IPsec VPNテンプレートとは別物。WireGuardはSMA100(別製品)のみ対応でSonicOS本体は非対応 | 適応 | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-ssl_vpn/Content/ssl-vpn-about.htm |
| `ha-active-passive-setup` | Active/Standby High Availability(仮想IP相当のLAN/WAN共有IP + Stateful Synchronization) | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-high_availability/Content/Topics/High_Availability/About_Stateful_Synchronization/working.htm |
| `captive-portal-guest` | Guest Services(ゾーンのGuest Access設定、キャプティブポータル相当) | 確認済み | https://www.sonicwall.com/support/knowledge-base/configuring-guest-services-on-the-lan-dmz-zone/170505669285912/ |
| `ips-inline-enable` | Intrusion Prevention Service(IPS)のシグネチャグループをDetect AllからPrevent Allへ昇格 | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-security_services/Content/Intrusion_Prevention/intrusion-protection-enabling.htm |
| `dns-over-tls-forwarding` | DNS Proxy強制(Enforce DNS Proxy for All DNS Requests)+ 外部DNS(53番ポート)へのAccess Rule遮断 + DNS Security(Neustar連携のカテゴリ/脅威フィルタ) | 適応 | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-0-0-0-dns/Content/DNS_Proxy/dns-proxy-configuring-settings.htm |
| `api-automation-basics` | SonicOS RESTful API(ただしフル管理者権限が必須で、OPNsenseのような最小権限専用APIキーは非対応) | 適応 | https://www.sonicwall.com/support/knowledge-base/introduction-to-sonicos-api/kA1VN0000000FGr0AM |
| `config-backup-restore` | Firmware & Backups の設定バックアップ(Local/Cloud Backup)とImport/Export Configuration、スケジュールされたCloud Backup | 確認済み | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-1-device_settings/Content/Storage/storage-configuration-backup.htm |
| `firmware-update-window` | Firmware & Backups でのバックアップ取得後のファームウェアアップロード・現行設定を保持したブート | 確認済み | https://www.sonicwall.com/support/knowledge-base/how-can-i-upgrade-sonicos-firmware/kA1VN0000000IwY0AU |
| `rule-hygiene-audit` | Access Rules のトラフィック統計(Rx/Tx ヒットカウント)を用いた手動監査、および(Gen7限定)Used/Unused Rulesフィルタ | 適応 | https://www.sonicwall.com/support/technical-documentation/docs/sonicos-7-0-0-0-rules_and_policies/Content/access-rules-display-traffic-statistics.htm/ |
| `emergency-ip-block` | 攻撃元IP用Address Objectを作成し最優先のDeny Access Ruleを追加(恒常的な脅威にはBotnet Filterも併用) | 確認済み | https://www.sonicwall.com/support/knowledge-base/how-can-i-block-an-ip-address-using-access-rules/170505635390198/ |
| `compromised-host-quarantine` | Isolated Zone(専用ゾーンへの移動+Access Ruleで調査用通信のみ許可)。エンドポイント側の自動隔離はCapture Client Network Quarantine(別製品/ライセンス) | 適応 | https://www.sonicwall.com/support/knowledge-base/how-can-i-configure-isolated-zone/221027150119323/ |
| `staged-rule-change` | Access RuleのEnable/Disableトグル + per-rule Logging(Enable Logging/Enable Packet Monitor)+ Investigate Logsでの事後確認 | 適応 | https://www.sonicwall.com/support/knowledge-base/sonicos-7-3-3-faq/kA1VN000001S1DV0A0 |
| `blocked-traffic-triage` | Packet Monitor / Event Logs(ライブログ相当)→ Connections Monitor(ステート相当)→ NAT Policy診断、の順で原因切り分け | 確認済み | https://www.sonicwall.com/support/knowledge-base/how-can-i-setup-and-utilize-the-packet-monitor-feature-for-troubleshooting/170513143911627 |
| `state-table-exhaustion` | Connections Monitorで送信元別コネクション数を特定 + Connection Limiting(v2)/Flood Protection(SYN Flood等)のしきい値調整 | 確認済み | https://www.sonicwall.com/support/knowledge-base/connection-limiting-v2-feature-using-access-rules-in-sonicos-enhanced/170505655289381/ |
| `ha-failover-drill` | Active/Standby HAの計画的フェイルオーバーテスト(Force Active/Standby Failover) | 確認済み | https://www.sonicwall.com/support/knowledge-base/configuring-advanced-high-availability-settings-on-sonicos-x-7/220202130234173/ |
| `port-forward-triage` | NAT Policy診断(変換確認)→ Access Rules(許可確認)→ Packet Monitor/Connections(戻り経路確認)の順の切り分け | 確認済み | https://www.sonicwall.com/support/knowledge-base/common-mistakes-with-port-forwarding/kA1VN0000000GD40AM |
| `log-noise-reduction` | Log Redundancy Filter(同一イベントの集約)+ Log Settingsのカテゴリ選択(Base Setup)による対象イベントの絞り込み | 確認済み | https://www.sonicwall.com/support/knowledge-base/how-to-change-global-logging-redundancy-level/210617231916960/ |

適応判定となった項目の詳細な検証根拠(検証コメント全文、修正履歴を含む)は`docs/superpowers/specs/2026-07-31-ngfw-vendor-parity-research-notes.json`に一次データとして保存する(本設計書には要約のみ掲載。`remote-access-vpn`の3行のみ、上記3.2節の再定義判断に基づき本設計書側で研究結果から差し替えている)。

## 4. 命名・内容規約

- 6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)を既存テンプレート(`cisco-etherchannel-lag.j2`、`opnsense-*.j2`等)と同様に踏襲する。
- 手順内のCLI/GUI操作は、そのベンダーの実在する構文・メニュー名をそのまま記載する。プレースホルダーの疑似コマンドは書かない。3.4節の「一次情報」列のURLを生成時の一次ソースとして参照する。
- 「適応」判定の項目は、目的節または用語解説節に「OPNsenseの<元機構>とは異なり、<ベンダー>では<ネイティブ機構>で同じ課題を解決する」旨を一文で明記し、暗黙の1:1対応であるかのような誤解を避ける。
- 認証情報(PSK、APIキー等)は値をテンプレートに書かず、マスク表記 + 平文保存を避ける旨の注記(既存`*-ikev2-vpn`踏襲)。
- Jinja制限: `{% macro %}` `{% include %}` `{% import %}` `{% extends %}` `{% do %}` タグ禁止。制限属性名(`request`, `config`, `os`, `sys`, `builtins`, `eval`, `exec`, `getattr`, `setattr`, `delattr`, `globals`, `locals`, `__class__`, `__base__`, `__subclasses__`, `__mro__`)を変数名・属性名・サブスクリプトキーとして使わない。
- credential-shaped文字列(`user:pass`等)をコマンド中に書かない。

## 5. 納品構成: 問題クラスタ単位のPR分割

75件を1PRにまとめず、既存の類似バッチ(#597: 3機能×9ベンダー, #601: 1機能×10ベンダー)の粒度に揃え、以下7クラスタ単位でPRを分割する。各PRは#619を参照する。

| クラスタ | 対象slug | 件数(slug×3社) |
|---|---|---|
| クラスタ1: ポリシー/NAT基礎 | `default-deny-wan`, `address-object-rules`, `dmz-port-forward`, `outbound-nat-policy` | 4 slug × 3 = 12 |
| クラスタ2: アクセス制御/堅牢化 | `lan-segment-isolation`, `geoip-country-block`, `schedule-based-access`, `mgmt-plane-lockdown` | 4 slug × 3 = 12 |
| クラスタ3: HA/リモートアクセス | `ha-active-passive-setup`, `ha-failover-drill`, `remote-access-vpn` | 3 slug × 3 = 9 |
| クラスタ4: 検知/インシデント対応 | `ips-inline-enable`, `emergency-ip-block`, `compromised-host-quarantine`, `staged-rule-change` | 4 slug × 3 = 12 |
| クラスタ5: 運用 | `api-automation-basics`, `config-backup-restore`, `firmware-update-window`, `rule-hygiene-audit`, `log-noise-reduction` | 5 slug × 3 = 15 |
| クラスタ6: 障害切り分け | `blocked-traffic-triage`, `state-table-exhaustion`, `port-forward-triage` | 3 slug × 3 = 9 |
| クラスタ7: DNS/ゲストアクセス | `dns-over-tls-forwarding`, `captive-portal-guest` | 2 slug × 3 = 6 |

合計: 25 slug × 3ベンダー = **75テンプレート**。

## 6. 実行アーキテクチャ

- **Phase A(計画・完了)**: 本設計書 + `Workflow`によるベンダー機構の一次情報検証(3.4節、済)。
- **Phase B(生成)**: クラスタ単位で`Workflow`の`pipeline()`を実行。各エージェントは「1 slug × 1ベンダー」を1テンプレートとして担当し、3.4節のマッピング表・一次情報URLを踏まえてテンプレートペアを作成、`scripts/local_render_check.py`で自己検証する。`web/src/lib/templates.ts`には触れない(統合はPhase Cで一括)。
- **Phase C(統合)**: クラスタごとに`templates.ts`の`META`配列へ該当分を追記(マーカー文字列が1箇所にしか一致しないことを確認してから挿入)。taxonomy allow-listの変更は不要(3.1節)。
- **Phase D(検証)**: クラスタごとに `uv run pytest -k 'not e2e'`, `uv run ruff check .`, `uv run mypy .`, `web/`配下で`npx tsc -b`, `npx vitest run`。
- **Phase E(納品)**: クラスタごとにコミット→push→PR作成(#619参照)→`subscribe_pr_activity`で自動監視し、マージまで追従する。7クラスタを順次実施する。

## 7. リスクと既知の制約

- **ベンダー実機構文の誤り(プラウジブル・バット・ロング)**: 3.4節の一次情報検証(研究+検証の2段階、#583で指摘されたリスクへの対策)で軽減済み。ただし生成フェーズでも同じURLを参照し直し、CLI構文レベルの細部(パラメータ名等)は生成時に改めて一次情報で確認する。
- **`remote-access-vpn`の範囲**: SSL-VPN/GlobalProtect/NetExtenderはIPsecサイト間VPNとは異なる認証・クライアント要件を持つ。既存`*-ikev2-vpn`との違いを用語解説節で明確にしないと、利用者が両テンプレートの使い分けを誤る可能性がある(4節で対策済み)。
- **「適応」判定17件は単一機能ではなく複数機能の組み合わせ運用になる場合がある**(例: 段階的ルール変更、侵害ホスト検疫)。手順書としての実行可能性を損なわないよう、各手順に対応する実機能を明示する。
- **75件という規模はPRレビュー負荷が高い**: 5節のクラスタ分割で1PRあたり6〜15件程度に抑える。

## 8. スコープ外

- OPNsense自体のテンプレート変更・統合は行わない。
- 3.4節で「適応」と判定された機構の実機検証(実機がないため、公式ドキュメントとの整合性確認に限定)。
- 25課題カタログ自体の見直し(将来的に他のNGFWベンダー、例えばCheck Point等を追加する場合は別Issue)。
