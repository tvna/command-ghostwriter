/* global React */
// Tab 4 — サンプル集. Read-only gallery of the bundled example files.
const { CodeBlock, Badge } = window.CommandGhostwriterDesignSystem_0d5f31;

const SAMPLES = [
  { name: 'cisco_config.toml', lang: 'toml', body:
`[global]
hostname = "SAMPLE-ROUTER-001"
vlans = [10, 20, 30, 99]

[interfaces."GigabitEthernet0/1"]
mode = "access"
access_vlan = 10
description = "admin office"
cdp_enable = false` },
  { name: 'dns_dig_config.csv', lang: 'csv', body:
`resolver,fqdn,type
1.1.1.1,www.yahoo.co.jp,a
1.1.1.1,yahoo.co.jp,mx
8.8.8.8,gmail.com,txt
8.8.8.8,_dmarc.gmail.com,txt` },
  { name: 'success_config.yaml', lang: 'yaml', body:
`url: "https://example.com/samplefile.txt"
date: 2024-04-01
users:
  test:
    first_name: "太郎"
    last_name: "テスト"` },
];

function SamplesTab() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xl)', fontWeight: 700,
                   color: 'var(--cg-text)', margin: '0 0 var(--space-2)' }}>💼 サンプル集の表示</h2>
      <hr className="cg-rainbow-divider" style={{ margin: '0 0 var(--space-6)' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {SAMPLES.map((s) => (
          <div key={s.name}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                          marginBottom: 'var(--space-2)' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)',
                             fontWeight: 600, color: 'var(--cg-text)' }}>{s.name}</span>
              <Badge tone="brand">{s.lang.toUpperCase()}</Badge>
            </div>
            <CodeBlock language={s.lang}>{s.body}</CodeBlock>
          </div>
        ))}
      </div>
    </div>
  );
}

window.SamplesTab = SamplesTab;
