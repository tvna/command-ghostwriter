/* global React */
// Tab 5 — ワークフロー. Shows the end-to-end flow: a senior engineer
// templatizes routine work; a junior fills in parameters and generates.
function Step({ n, title, sub }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
        background: 'var(--cg-red)', color: '#fff', display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>{n}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--cg-text)',
                      fontSize: 'var(--text-base)' }}>{title}</div>
        <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--cg-text-muted)',
                      fontSize: 'var(--text-sm)', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function Lane({ title, tone, children }) {
  const tones = {
    orange: { bg: 'rgba(255,135,0,.08)', border: 'rgba(255,135,0,.3)', label: 'var(--cg-warning)' },
    green:  { bg: 'var(--cg-success-bg)', border: 'var(--cg-success-border)', label: 'var(--cg-success)' },
    red:    { bg: 'var(--cg-error-bg)', border: 'var(--cg-error-border)', label: 'var(--cg-red-tint)' },
  };
  const t = tones[tone];
  return (
    <div style={{ flex: 1, background: t.bg, border: `1px solid ${t.border}`,
                  borderRadius: 'var(--radius-md)', padding: 'var(--space-5)' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 'var(--text-sm)',
                    color: t.label, textTransform: 'uppercase', letterSpacing: '.04em',
                    marginBottom: 'var(--space-4)' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>{children}</div>
    </div>
  );
}

function WorkflowTab() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xl)', fontWeight: 700,
                   color: 'var(--cg-text)', margin: '0 0 var(--space-2)' }}>🔀 ワークフローの表示</h2>
      <hr className="cg-rainbow-divider" style={{ margin: '0 0 var(--space-6)' }} />

      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'stretch' }}>
        <Lane title="定型作業のテンプレート化" tone="orange">
          <Step n="1" title="過去のコマンド履歴 / 手順書" sub="既存の運用知識を集める" />
          <Step n="2" title="変数部分の特定と抽出" sub="繰り返される値を切り出す" />
          <Step n="3" title="設定定義ファイル + テンプレート作成" sub="toml/yaml/csv と Jinja を用意" />
        </Lane>
        <div style={{ alignSelf: 'center', color: 'var(--cg-text-faint)', fontSize: 22 }}>→</div>
        <Lane title="シナリオに基づく作業準備" tone="green">
          <Step n="4" title="設定定義ファイルの準備" sub="パラメーターを記入" />
          <Step n="5" title="両ファイルをアップロード" sub="config + template" />
        </Lane>
        <div style={{ alignSelf: 'center', color: 'var(--cg-text-faint)', fontSize: 22 }}>→</div>
        <Lane title="出力" tone="red">
          <Step n="6" title="実行可能な CLIコマンド" sub="コピー & ペーストで実行" />
        </Lane>
      </div>
    </div>
  );
}

window.WorkflowTab = WorkflowTab;
