/* global React */
// Sidebar — mirrors Streamlit's st.sidebar: welcome blurb + an expander
// listing the syntax docs for each input file format.
const { Divider } = window.CommandGhostwriterDesignSystem_0d5f31;

function Sidebar() {
  const [open, setOpen] = React.useState(true);
  const link = (label, href) => (
    <a href={href} target="_blank" rel="noreferrer"
       style={{ display: 'block', color: 'var(--cg-info)', textDecoration: 'none',
                fontSize: 'var(--text-sm)', padding: '3px 0' }}>
      {label}
    </a>
  );
  return (
    <aside style={{
      width: 'var(--sidebar-width)', flexShrink: 0, background: 'var(--cg-bg-secondary)',
      borderRight: '1px solid var(--cg-border)', padding: 'var(--space-6)',
      minHeight: '100%', boxSizing: 'border-box',
    }}>
      <p style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-normal)',
                  color: 'var(--cg-text)', margin: '0 0 var(--space-5)' }}>
        このアプリケーションでは、定型作業のCLIコマンド準備にあたり、設定定義ファイル
        (toml/yaml/csv)とJinjaテンプレートファイルの組み合わせにより、準備を効率化できます。
      </p>
      <p style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-normal)',
                  color: 'var(--cg-text-muted)', margin: '0 0 var(--space-6)' }}>
        各ファイルをアップロードし、「CLIコマンド生成」をクリックして結果を確認してください。
      </p>

      <div style={{ border: '1px solid var(--cg-border)', borderRadius: 'var(--radius-md)',
                    overflow: 'hidden', background: 'var(--cg-bg)' }}>
        <button onClick={() => setOpen((o) => !o)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-3) var(--space-4)',
          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--cg-text)',
        }}>
          各ファイルの構文
          <span style={{ color: 'var(--cg-text-muted)', transform: open ? 'rotate(180deg)' : 'none',
                         transition: 'transform var(--dur-base)' }}>▾</span>
        </button>
        {open && (
          <div style={{ padding: '0 var(--space-4) var(--space-3)' }}>
            {link('toml syntax docs', 'https://toml.io/ja/v1.0.0')}
            {link('yaml syntax docs', 'https://docs.ansible.com/')}
            {link('jinja syntax docs', 'https://jinja.palletsprojects.com/')}
          </div>
        )}
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
