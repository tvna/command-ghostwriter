import React from 'react';

/**
 * TextArea — Streamlit's st.text_area, also used to render generated
 * CLI output. Monospace by default since it usually holds commands.
 */
export function TextArea({ label, value, rows = 8, mono = true, readOnly = false, onChange, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-sans)', ...style }}>
      {label && (
        <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-body)', marginBottom: 'var(--space-2)' }}>
          {label}
        </span>
      )}
      <textarea
        value={value}
        rows={rows}
        readOnly={readOnly}
        onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
          fontSize: mono ? '13px' : 'var(--text-base)',
          lineHeight: 'var(--leading-code)',
          color: 'var(--text-body)',
          background: 'var(--surface-sunken)',
          border: `1px solid ${focus ? 'var(--cg-red)' : 'var(--cg-border-input)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          outline: 'none',
          boxShadow: focus ? 'var(--shadow-focus)' : 'none',
          transition: 'border-color var(--dur-base), box-shadow var(--dur-base)',
        }}
        {...rest}
      />
    </label>
  );
}
