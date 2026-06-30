/* global React */
// Tab 2 — 設定デバッグ. Upload a config file and inspect the parsed result
// as visual JSON, TOML, or YAML.
const { Card, FileUploader, Button, Alert, CodeBlock, Badge } =
  window.CommandGhostwriterDesignSystem_0d5f31;

const PARSED_JSON = `{
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
    "GigabitEthernet0/19": {
      "mode": "trunk",
      "native_vlan": 99,
      "description": "access point #2",
      "cdp_enable": true
    }
  }
}`;

const PARSED_YAML = `global:
  hostname: SAMPLE-ROUTER-001
  vlans: [10, 20, 30, 99]
  password:
    enable: P@ssw0rd
interfaces:
  GigabitEthernet0/1:
    mode: access
    access_vlan: 10
    description: admin office
    cdp_enable: false`;

function DebugTab() {
  const [view, setView] = React.useState(null); // null | visual | toml | yaml

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xl)', fontWeight: 700,
                   color: 'var(--cg-text)', margin: '0 0 var(--space-2)' }}>
        📜 構文解析による設定デバッグ
      </h2>
      <hr className="cg-rainbow-divider" style={{ margin: '0 0 var(--space-6)' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)',
                    marginBottom: 'var(--space-4)' }}>
        <Card>
          <FileUploader label="設定定義ファイルをアップロード" accept="TOML, YAML, CSV"
            fileName="cisco_config.toml" fileSize="889 B" />
        </Card>
        <div />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)' }}>
        <Button variant="primary" fullWidth onClick={() => setView('visual')}>解析結果の表示 (visual)</Button>
        <Button variant="secondary" fullWidth onClick={() => setView('toml')}>解析結果の表示 (toml)</Button>
        <Button variant="secondary" fullWidth onClick={() => setView('yaml')}>解析結果の表示 (yaml)</Button>
      </div>

      {view && (
        <Alert tone="success" style={{ marginBottom: 'var(--space-3)' }}>設定定義ファイル解析に成功</Alert>
      )}

      {view === 'visual' && (
        <Card padding="var(--space-3)">
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <Badge tone="brand">2 keys</Badge>
            <Badge tone="info">8 interfaces</Badge>
          </div>
          <CodeBlock title="parsed config" language="json">{PARSED_JSON}</CodeBlock>
        </Card>
      )}
      {view === 'toml' && <CodeBlock title="設定定義ファイルの解析結果" language="toml">{PARSED_YAML.replace(/:/g, ' =')}</CodeBlock>}
      {view === 'yaml' && <CodeBlock title="設定定義ファイルの解析結果" language="yaml">{PARSED_YAML}</CodeBlock>}

      {!view && (
        <Alert tone="info">設定定義ファイルをアップロードし、表示形式を選択してください</Alert>
      )}
    </div>
  );
}

window.DebugTab = DebugTab;
