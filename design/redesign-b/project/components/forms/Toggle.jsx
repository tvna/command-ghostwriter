import React from 'react';

/**
 * Toggle — Streamlit's st.toggle. A pill switch with the knob sliding
 * onto brand red when on. Optional label sits to the right.
 */
export function Toggle({ checked = false, label, disabled = false, onChange, style, ...rest }) {
  const toggle = () => { if (!disabled && onChange) onChange(!checked); };
  return (
    <label
      onClick={toggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        color: 'var(--text-body)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          position: 'relative',
          width: 40,
          height: 22,
          flexShrink: 0,
          borderRadius: 'var(--radius-pill)',
          background: checked ? 'var(--cg-red)' : 'var(--cg-border-strong)',
          transition: 'background var(--dur-base) var(--ease-standard)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 20 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: 'var(--shadow-sm)',
            transition: 'left var(--dur-base) var(--ease-standard)',
          }}
        />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
