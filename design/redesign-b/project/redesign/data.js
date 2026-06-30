/* global window */
// Sample content for the redesigned 2-pane editor (illustrative, grounded in
// the repo's assets/examples). Attached to window for the babel scripts.

window.CG = {
  configToml:
`[global]
hostname = "SAMPLE-ROUTER-001"
vlans = [10, 20, 30, 99]

[global.password]
enable = "P@ssw0rd"

[interfaces."GigabitEthernet0/1"]
mode = "access"
access_vlan = 10
description = "admin office"
cdp_enable = false

[interfaces."GigabitEthernet0/19"]
mode = "trunk"
native_vlan = 99
description = "access point #2"
cdp_enable = true

[interfaces."GigabitEthernet0/24"]
mode = "trunk"
description = "uplink #1"
cdp_enable = true`,

  templateJ2:
`# スイッチポート設定手順 — {{ global.hostname }}

対象スイッチ **{{ global.hostname }}** に VLAN {{ global.vlans | join(', ') }} を構成し、各ポートを設定します。作業は現地またはコンソール接続で実施してください。

## 1. 設定モードへ入る

特権 EXEC モードから設定モードへ移行します。

\`\`\`bash
enable
configure terminal
hostname {{ global.hostname }}
\`\`\`

## 2. VLAN を作成する

利用する VLAN をまとめて定義します。

\`\`\`bash
vlan {{ global.vlans | join(',') }}
\`\`\`

## 3. 各インターフェースを設定する
{% for name, intf in interfaces.items() %}
**{{ name }}** — {{ intf.description }}

\`\`\`bash
interface {{ name }}
 description {{ intf.description }}
{% if intf.mode == "access" %}
 switchport mode access
 switchport access vlan {{ intf.access_vlan }}
{% else %}
 switchport mode trunk
{% endif %}
\`\`\`
{% endfor %}
## 4. 設定を保存する

動作を確認し、問題なければ起動コンフィグへ保存します。

\`\`\`bash
end
write memory
\`\`\``,

  generatedCli:
`hostname SAMPLE-ROUTER-001
vlan 10,20,30,99
!
interface GigabitEthernet0/1
 description admin office
 switchport mode access
 switchport access vlan 10
!
interface GigabitEthernet0/19
 description access point #2
 switchport mode trunk
!
interface GigabitEthernet0/24
 description uplink #1
 switchport mode trunk
!
end`,

  debugJson:
`{
  "global": {
    "hostname": "SAMPLE-ROUTER-001",
    "vlans": [10, 20, 30, 99],
    "password": { "enable": "P@ssw0rd" }
  },
  "interfaces": {
    "GigabitEthernet0/1": {
      "mode": "access",
      "access_vlan": 10,
      "description": "admin office",
      "cdp_enable": false
    },
    "GigabitEthernet0/24": {
      "mode": "trunk",
      "description": "uplink #1",
      "cdp_enable": true
    }
  }
}`,

  // Variables auto-detected from the template
  vars: ['global.hostname', 'global.vlans', 'interfaces', 'intf.description', 'intf.mode', 'intf.access_vlan'],
};
