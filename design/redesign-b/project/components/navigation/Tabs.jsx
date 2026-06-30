import React from 'react';

/**
 * Tabs — Streamlit's st.tabs. A horizontal row of emoji-labelled tabs
 * with a red underline on the active item. Controlled or uncontrolled.
 */
export function Tabs({ tabs = [], value, defaultValue, onChange, style, ...rest }) {
  const [internal, setInternal] = React.useState(defaultValue ?? (tabs[0] && tabs[0].id));
  const active = value !== undefined ? value : internal;
  const select = (id) => {
    if (value === undefined) setInternal(id);
    if (onChange) onChange(id);
  };
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 'var(--space-5)',
        borderBottom: '1px solid var(--border-default)',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
      {...rest}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => select(t.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-base)',
              fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-regular)',
              color: isActive ? 'var(--text-body)' : 'var(--text-secondary)',
              padding: '10px 2px',
              marginBottom: -1,
              borderBottom: `2px solid ${isActive ? 'var(--cg-red)' : 'transparent'}`,
              transition: 'color var(--dur-base)',
              whiteSpace: 'nowrap',
            }}
          >
            {t.icon && <span style={{ fontSize: '1.05em' }}>{t.icon}</span>}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
