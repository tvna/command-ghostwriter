/* global window */
// Template library entries for Command Ghostwriter (redesign). Each entry carries
// metadata for the library cards plus the actual data + template content used to
// seed the editor. Only 'cisco-switchport' runs through the live engine; the rest
// open in the editor with their sample content shown.

window.CGTemplates = [
  {
    id: 'cisco-switchport',
    name: 'Cisco スイッチポート設定',
    desc: 'インターフェースの mode / VLAN / description から、CLI を含む設定手順書（Markdown）を生成。',
    category: 'network',
    format: 'toml',
    output: 'markdown',
    updated: '2026-06-28',
    live: true,
    data: window.CG ? window.CG.configToml : '',
    template: window.CG ? window.CG.templateJ2 : '',
  },
  {
    id: 'yamaha-router',
    name: 'YAMAHA ルータ初期構築',
    desc: 'RTX系ルータの LAN / PPPoE / IPフィルタ / NAT 設定を、CLI を含む手順書（Markdown）として生成。',
    category: 'network',
    format: 'toml',
    output: 'markdown',
    updated: '2026-06-25',
    live: false,
    data: `[lan1]
ip_address = "192.168.100.1/24"

[pp1]
description = "INTERNET (PPPoE)"
auth_account = "user@example.ne.jp"
auth_password = "********"
mtu = 1454

[[static_routes]]
network = "default"
gateway = "pp 1"

[nat]
type = "masquerade"
inner = "192.168.100.0/24"

[[filters]]
id = 200000
action = "pass"
proto = "tcp"
dst_port = "established"

[[filters]]
id = 200099
action = "reject"
proto = "*"`,
    template: `# YAMAHA RTX 初期構築手順

RTX 系ルータに PPPoE 接続・IP フィルタ・NAT を設定します。コンソール接続のうえ administrator モードで実施してください。

## 1. LAN 側インターフェース

内部ネットワークのアドレスを設定します。

\`\`\`bash
ip lan1 address {{ lan1.ip_address }}
\`\`\`

## 2. PPPoE 接続を構成する

プロバイダの認証情報で WAN 側（lan2）の PPPoE セッションを設定します。

\`\`\`bash
pp select 1
 description {{ pp1.description }}
 pppoe use lan2
 pp auth accept pap chap
 pp auth myname {{ pp1.auth_account }} {{ pp1.auth_password }}
 ppp lcp mru on {{ pp1.mtu }}
 ip pp mtu {{ pp1.mtu }}
{% for f in filters %} ip filter {{ f.id }} {{ f.action }} * * {{ f.proto }}
{% endfor %} pp enable 1
\`\`\`

## 3. 経路を設定する

デフォルトルートを PPPoE セッション向けに設定します。

\`\`\`bash
{% for r in static_routes %}ip route {{ r.network }} gateway {{ r.gateway }}
{% endfor %}\`\`\`

## 4. NAT（IPマスカレード）

内部ネットワークを WAN 側へ NAT します。

\`\`\`bash
nat descriptor type 1000 {{ nat.type }}
nat descriptor address inner 1000 {{ nat.inner }}
\`\`\`

## 5. 保存して再起動確認

\`\`\`bash
save
\`\`\``,
  },
  {
    id: 'linux-init',
    name: 'Linux 初期セットアップ',
    desc: 'ホスト名・ユーザー・SSH・タイムゾーン・パッケージ・ufw の初期化を、CLI を含む手順書（Markdown）として生成。',
    category: 'server',
    format: 'yaml',
    output: 'markdown',
    updated: '2026-06-22',
    live: false,
    data: `hostname: web-prod-01
timezone: Asia/Tokyo
users:
  - name: ops
    groups: sudo
    pubkey: "ssh-ed25519 AAAA..."
packages:
  - curl
  - vim
  - fail2ban
sshd:
  permit_root_login: false
  password_auth: false
firewall:
  - 22/tcp
  - 80/tcp
  - 443/tcp`,
    template: `# Linux 初期セットアップ手順 — {{ hostname }}

新規ホスト **{{ hostname }}** の初期化手順です。root 権限（sudo）で上から順に実行してください。

## 1. ホスト名とタイムゾーン

\`\`\`bash
hostnamectl set-hostname {{ hostname }}
timedatectl set-timezone {{ timezone }}
\`\`\`

## 2. 作業ユーザーを作成する

公開鍵認証用に SSH 鍵を配置します。

\`\`\`bash
{% for u in users %}useradd -m -s /bin/bash -G {{ u.groups }} {{ u.name }}
install -d -m 700 /home/{{ u.name }}/.ssh
echo "{{ u.pubkey }}" > /home/{{ u.name }}/.ssh/authorized_keys
{% endfor %}\`\`\`

## 3. パッケージを導入する

\`\`\`bash
apt-get update
apt-get install -y {{ packages | join(' ') }}
\`\`\`

## 4. SSH を堅牢化する

root ログインとパスワード認証を無効化し、設定を反映します。

\`\`\`bash
sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload sshd
\`\`\`

> パスワード認証を切る前に、鍵での SSH ログインができることを必ず確認してください。

## 5. ファイアウォールを有効化する

\`\`\`bash
{% for port in firewall %}ufw allow {{ port }}
{% endfor %}ufw --force enable
\`\`\``,
  },
  {
    id: 'dns-zone',
    name: 'DNS ゾーンファイル初期化',
    desc: '$ORIGIN / $TTL / SOA / NS / MX / A / 各種 TXT を含むゾーンを、登録・反映手順書（Markdown）として生成。',
    category: 'dns',
    format: 'toml',
    output: 'markdown',
    updated: '2026-06-30',
    live: false,
    data: `origin = "example.com."
ttl = 3600
nameservers = ["ns1.example.com.", "ns2.example.com."]

[soa]
primary_ns = "ns1.example.com."
admin = "hostmaster.example.com."
serial = 2026063001
refresh = 7200
retry = 3600
expire = 1209600
minimum = 3600

[[mx]]
priority = 10
host = "mail.example.com."

[[mx]]
priority = 20
host = "mail2.example.com."

[[a]]
name = "@"
ip = "203.0.113.10"

[[a]]
name = "www"
ip = "203.0.113.10"

[[a]]
name = "mail"
ip = "203.0.113.25"

[spf]
includes = ["_spf.google.com", "spf.protection.outlook.com"]
all = "~all"

[dkim]
selector = "default"
public_key = "v=DKIM1; k=rsa; p=MIIBIjANBgkqh..."

[dmarc]
policy = "quarantine"
rua = "mailto:dmarc@example.com"
pct = 100`,
    template: `# DNS ゾーンファイル初期化手順 — {{ origin }}

権威 DNS サーバー（BIND）に **{{ origin }}** のゾーンを初期化します。SOA / NS / MX / A と送信者認証 TXT（SPF・DKIM・DMARC）を含みます。

## 1. ゾーンファイルを作成する

\`/var/named/db.{{ origin }}\` として以下を保存します。レコードを更新したら SOA の serial も必ず進めてください。

\`\`\`dns
$ORIGIN {{ origin }}
$TTL {{ ttl }}
;
; ----- SOA -----
@       IN SOA {{ soa.primary_ns }} {{ soa.admin }} (
                {{ soa.serial }}    ; serial
                {{ soa.refresh }}   ; refresh
                {{ soa.retry }}     ; retry
                {{ soa.expire }}    ; expire
                {{ soa.minimum }} ) ; minimum
;
; ----- NS -----
{% for ns in nameservers %}@       IN NS   {{ ns }}
{% endfor %};
; ----- MX -----
{% for r in mx %}@       IN MX   {{ r.priority }} {{ r.host }}
{% endfor %};
; ----- A -----
{% for r in a %}{{ r.name }}     IN A    {{ r.ip }}
{% endfor %};
; ----- TXT (sender authentication) -----
@       IN TXT  "v=spf1 {% for inc in spf.includes %}include:{{ inc }} {% endfor %}{{ spf.all }}"
{{ dkim.selector }}._domainkey IN TXT "{{ dkim.public_key }}"
_dmarc  IN TXT  "v=DMARC1; p={{ dmarc.policy }}; rua={{ dmarc.rua }}; pct={{ dmarc.pct }}"
\`\`\`

## 2. named.conf にゾーンを登録する

\`\`\`bash
cat >> /etc/named.conf <<'EOF'
zone "{{ origin }}" IN {
    type master;
    file "/var/named/db.{{ origin }}";
};
EOF
\`\`\`

## 3. 構文チェックと反映

ゾーンと設定を検証し、問題がなければ named をリロードします。

\`\`\`bash
named-checkzone {{ origin }} /var/named/db.{{ origin }}
named-checkconf
rndc reload {{ origin }}
\`\`\`

## 4. 反引き確認

\`\`\`bash
dig @{{ soa.primary_ns }} {{ origin }} SOA +short
dig @{{ soa.primary_ns }} {{ origin }} MX +short
\`\`\``,
  },
  {
    id: 'incident-campus',
    name: 'キャンパスネットワーク障害対応',
    desc: '症状・影響範囲・切り分けステップ・エスカレーションから Markdown 手順書を生成。',
    category: 'runbook',
    format: 'yaml',
    output: 'markdown',
    updated: '2026-06-18',
    live: false,
    data: `title: 特定棟でネットワーク接続不可
scope: 工学部3号館 全フロア
severity: high
steps:
  - layer: 物理
    check: 該当棟エッジSWのリンク/電源ランプを確認
    ok: 隣接フロアへ
    ng: SW再起動・ケーブル交換
  - layer: L2
    check: アップリンクのVLAN/STP状態を確認
    ok: L3へ
    ng: トランク設定・ループを是正
  - layer: L3/DHCP
    check: クライアントのIP取得とGW疎通を確認
    ok: 上位/外部へ
    ng: DHCPスコープ枯渇・リレーを確認
escalation: ネットワーク基盤チーム (内線 1234)`,
    template: `# 障害対応手順書: {{ title }}

- **影響範囲**: {{ scope }}
- **重要度**: {{ severity }}

## 切り分けステップ
{% for s in steps %}
### {{ s.layer }} レイヤ
1. **確認**: {{ s.check }}
   - 正常な場合 → {{ s.ok }}
   - 異常な場合 → {{ s.ng }}
{% endfor %}

## エスカレーション
解決しない場合は **{{ escalation }}** へ連絡する。`,
  },
  {
    id: 'incident-proxy',
    name: 'プロキシ環境のWebサービス接続不能',
    desc: 'プロキシ設定・確認コマンド・判断分岐から Markdown 切り分け手順書を生成。',
    category: 'runbook',
    format: 'yaml',
    output: 'markdown',
    updated: '2026-06-15',
    live: false,
    data: `title: 社内プロキシ経由で特定SaaSに接続できない
proxy: "http://proxy.corp.local:8080"
no_proxy: ".corp.local,127.0.0.1"
steps:
  - check: 環境変数 http_proxy/https_proxy が設定されているか
    cmd: "env | grep -i proxy"
    branch: 未設定なら export して再試行
  - check: プロキシまでの到達性
    cmd: "curl -x $http_proxy -I https://example-saas.com"
    branch: 407 ならプロキシ認証情報を確認
  - check: 宛先がプロキシ除外に含まれていないか
    cmd: "echo $no_proxy"
    branch: 除外に含まれる場合は直結経路を確認
  - check: TLS/証明書の検査
    cmd: "openssl s_client -connect example-saas.com:443 -proxy proxy.corp.local:8080"
    branch: 証明書エラーなら社内CAを導入`,
    template: `# 切り分け手順書: {{ title }}

- **プロキシ**: \`{{ proxy }}\`
- **除外 (no_proxy)**: \`{{ no_proxy }}\`

## 確認手順
{% for s in steps %}
{{ loop_index }}. **{{ s.check }}**
   \`\`\`
   {{ s.cmd }}
   \`\`\`
   → {{ s.branch }}
{% endfor %}`,
  },
];
