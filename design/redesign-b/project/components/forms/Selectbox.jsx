import React from 'react';

/**
 * Selectbox — Streamlit's st.selectbox. A button-like field showing the
 * current value with a chevron. Click toggles a simple option list.
 */
export function Selectbox({ label, value, options = [], disabled = false, onChange, style, ...rest }) {
  const [open, setOpen] = React.useState(false);
  return (
    <label style={{ display: 'block', position: 'relative', fontFamily: 'var(--font-sans)', ...style }} {...rest}>
      {label && (
        <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-body)', marginBottom: 'var(--space-2)' }}>
          {label}
        </span>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-base)',
          color: 'var(--text-body)',
          background: 'var(--surface-raised)',
          border: `1px solid ${open ? 'var(--cg-red)' : 'var(--cg-border-input)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <span style={{ color: 'var(--text-secondary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-base)' }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            padding: 'var(--space-1)',
          }}
        >
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <div
                key={opt}
                onClick={() => { onChange && onChange(opt); setOpen(false); }}
                style={{
                  fontSize: 'var(--text-sm)',
                  color: selected ? 'var(--cg-red)' : 'var(--text-body)',
                  background: selected ? 'rgba(255,75,75,.10)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  padding: '7px 10px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--surface-hover)'; }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </label>
  );
}
