import React from 'react';

/**
 * TextInput — Streamlit's st.text_input. Label above a filled field
 * that gains a red ring on focus.
 */
export function TextInput({ label, value, placeholder = '', disabled = false, onChange, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-sans)', ...style }}>
      {label && (
        <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-body)', marginBottom: 'var(--space-2)' }}>
          {label}
        </span>
      )}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-base)',
          color: 'var(--text-body)',
          background: 'var(--surface-raised)',
          border: `1px solid ${focus ? 'var(--cg-red)' : 'var(--cg-border-input)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          outline: 'none',
          boxShadow: focus ? 'var(--shadow-focus)' : 'none',
          transition: 'border-color var(--dur-base), box-shadow var(--dur-base)',
        }}
        {...rest}
      />
    </label>
  );
}
