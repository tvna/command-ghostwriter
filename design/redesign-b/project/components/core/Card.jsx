import React from 'react';

/**
 * Card — Streamlit's bordered container (st.container(border=True)).
 * A subtly-raised surface with a 1px border and soft radius.
 */
export function Card({ children, padding = 'var(--space-6)', style, ...rest }) {
  return (
    <div
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding,
        color: 'var(--text-body)',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
