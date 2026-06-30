import React from 'react';

/**
 * CodeBlock — a sunken monospace well for CLI output, config, or Jinja
 * templates. Optional title bar with a copy affordance and language tag.
 */
export function CodeBlock({ children, title, language, style, ...rest }) {
  return (
    <div
      style={{
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
        ...style,
      }}
      {...rest}
    >
      {(title || language) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 12px',
            borderBottom: '1px solid var(--border-default)',
            background: 'var(--surface-raised)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            {title}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {language && (
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)' }}>
                {language}
              </span>
            )}
            <span title="Copy" style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}>⧉</span>
          </span>
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: 'var(--space-4)',
          fontSize: '13px',
          lineHeight: 'var(--leading-code)',
          color: 'var(--text-body)',
          overflowX: 'auto',
          whiteSpace: 'pre',
        }}
      >
        {children}
      </pre>
    </div>
  );
}
