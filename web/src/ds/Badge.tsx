import React from 'react';

/**
 * Badge — small status pill. Defaults to a neutral chip; semantic
 * tones reuse the Streamlit alert palette.
 */
export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ children, tone = 'neutral', style, ...rest }: BadgeProps) {
  const tones: Record<BadgeTone, React.CSSProperties> = {
    neutral: { background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' },
    brand:   { background: 'rgba(255,75,75,.14)', color: 'var(--cg-red-tint)', border: '1px solid var(--cg-error-border)' },
    success: { background: 'var(--cg-success-bg)', color: 'var(--cg-success)', border: '1px solid var(--cg-success-border)' },
    warning: { background: 'var(--cg-warning-bg)', color: 'var(--cg-warning)', border: '1px solid var(--cg-warning-border)' },
    error:   { background: 'var(--cg-error-bg)', color: 'var(--cg-error)', border: '1px solid var(--cg-error-border)' },
    info:    { background: 'var(--cg-info-bg)', color: 'var(--cg-info)', border: '1px solid var(--cg-info-border)' },
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-semibold)' as unknown as number,
        lineHeight: 1,
        padding: '4px 10px',
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
        ...(tones[tone] || tones.neutral),
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
