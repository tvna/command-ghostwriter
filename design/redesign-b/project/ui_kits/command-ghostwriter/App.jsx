/* global React, Sidebar, GenerateTab, DebugTab, SettingsTab, SamplesTab, WorkflowTab */
const { Tabs } = window.CommandGhostwriterDesignSystem_0d5f31;

const TABS = [
  { id: 'gen',      icon: '📝', label: 'コマンド生成' },
  { id: 'debug',    icon: '📜', label: '設定デバッグ' },
  { id: 'settings', icon: '⚙️', label: '詳細設定' },
  { id: 'samples',  icon: '💼', label: 'サンプル集' },
  { id: 'flow',     icon: '🔀', label: 'ワークフロー' },
];

function App() {
  const [tab, setTab] = React.useState('gen');
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cg-bg)' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, padding: 'var(--space-8) var(--space-12)' }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-3xl)', fontWeight: 700,
                     color: 'var(--cg-text)', letterSpacing: '-.01em', margin: '0 0 var(--space-6)' }}>
          Command ghostwriter <span style={{ fontSize: '0.9em' }}>👻</span>
        </h1>

        <Tabs value={tab} onChange={setTab} tabs={TABS} style={{ marginBottom: 'var(--space-8)' }} />

        <div style={{ maxWidth: 1040 }}>
          {tab === 'gen' && <GenerateTab />}
          {tab === 'debug' && <DebugTab />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'samples' && <SamplesTab />}
          {tab === 'flow' && <WorkflowTab />}
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
