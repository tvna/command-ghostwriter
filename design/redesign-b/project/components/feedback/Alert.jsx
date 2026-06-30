import React from 'react';

/**
 * Alert — Streamlit's st.success / st.warning / st.error / st.info.
 * A tinted bar with a leading icon and a left accent stripe.
 */
export function Alert({ children, tone = 'info', icon, style, ...rest }) {
  const tones = {
    success: { color: 'var(--cg-success)', bg: 'var(--cg-success-bg)', border: 'var(--cg-success-border)', icon: '✓' },
    warning: { color: 'var(--cg-warning)', bg: 'var(--cg-warning-bg)', border: 'var(--cg-warning-border)', icon: '⚠' },
    error:   { color: 'var(--cg-error)', bg: 'var(--cg-error-bg)', border: 'var(--cg-error-border)', icon: '⛔' },
    info:    { color: 'var(--cg-info)', bg: 'var(--cg-info-bg)', border: 'var(--cg-info-border)', icon: 'ℹ' },
  };
  const t = tones[tone] || tones.info;
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        color: 'var(--text-body)',
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderLeft: `3px solid ${t.color}`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        ...style,
      }}
      {...rest}
    >
      <span style={{ color: t.color, fontWeight: 700, lineHeight: 'var(--leading-snug)', flexShrink: 0 }}>
        {icon || t.icon}
      </span>
      <span style={{ lineHeight: 'var(--leading-snug)' }}>{children}</span>
    </div>
  );
}
