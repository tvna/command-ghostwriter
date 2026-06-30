/* global React */
// Tab 1 — コマンド生成. Upload a config + a Jinja template, then generate
// CLI commands or Markdown. This is the heart of the app.
const { Card, FileUploader, Button, Alert, TextArea } =
  window.CommandGhostwriterDesignSystem_0d5f31;

const GENERATED_CLI = `! ==== SAMPLE-ROUTER-001 ====
hostname SAMPLE-ROUTER-001
vlan 10,20,30,99
!
interface GigabitEthernet0/1
 description admin office
 switchport mode access
 switchport access vlan 10
 no cdp enable
!
interface GigabitEthernet0/2
 description accounting office
 switchport mode access
 switchport access vlan 20
 no cdp enable
!
interface GigabitEthernet0/19
 description access point #2
 switchport mode trunk
 switchport trunk native vlan 99
!
interface GigabitEthernet0/24
 description uplink #1
 switchport mode trunk
!
end`;

function GenerateTab() {
  const [config, setConfig] = React.useState(true);   // demo starts pre-loaded
  const [template, setTemplate] = React.useState(true);
  const [result, setResult] = React.useState(null);   // null | "text" | "md"

  const ready = config && template;
  const generate = (mode) => { if (ready) setResult(mode); };

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xl)', fontWeight: 700,
                   color: 'var(--cg-text)', margin: '0 0 var(--space-2)' }}>
        📝 ファイルの組み合わせによるコマンド生成
      </h2>
      <hr className="cg-rainbow-divider" style={{ margin: '0 0 var(--space-6)' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)',
                    marginBottom: 'var(--space-4)' }}>
        <Card>
          <FileUploader label="設定定義ファイルをアップロード" accept="TOML, YAML, CSV"
            fileName={config ? 'cisco_config.toml' : null} fileSize="889 B"
            onBrowse={() => setConfig(true)} />
        </Card>
        <Card>
          <FileUploader label="Jinjaテンプレートファイルをアップロード" accept="J2, JINJA2"
            fileName={template ? 'cisco_switchport.j2' : null} fileSize="412 B"
            onBrowse={() => setTemplate(true)} />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)' }}>
        <Button variant="primary" fullWidth icon="📝" onClick={() => generate('text')}>
          CLIコマンド生成
        </Button>
        <Button variant="secondary" fullWidth onClick={() => generate('md')}>
          Markdown生成
        </Button>
        <Button variant="secondary" fullWidth icon="⬇" disabled={!result}>
          ダウンロード
        </Button>
      </div>

      {!ready && (
        <Alert tone="warning">必要な全ファイルが揃っていません</Alert>
      )}

      {ready && result === 'text' && (
        <div>
          <Alert tone="success" style={{ marginBottom: 'var(--space-3)' }}>CLIコマンド生成に成功</Alert>
          <Card padding="var(--space-3)">
            <TextArea label="CLIコマンド生成の出力結果" value={GENERATED_CLI} rows={16} readOnly />
          </Card>
        </div>
      )}

      {ready && result === 'md' && (
        <div>
          <Alert tone="success" style={{ marginBottom: 'var(--space-3)' }}>Markdown生成に成功</Alert>
          <Card>
            <h3 style={{ marginTop: 0, color: 'var(--cg-text)', fontFamily: 'var(--font-sans)' }}>
              サーバー監視手順書
            </h3>
            <p style={{ color: 'var(--cg-text-muted)', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-3)' }}>
              SAMPLE-ROUTER-001 — 8 interfaces configured across VLAN 10/20/30/99.
            </p>
            <TextArea value={GENERATED_CLI} rows={10} readOnly />
          </Card>
        </div>
      )}
    </div>
  );
}

window.GenerateTab = GenerateTab;
