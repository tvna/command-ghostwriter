import React from 'react';

/**
 * Divider — a horizontal rule. The signature "rainbow" variant
 * recreates Streamlit's st.subheader(divider="rainbow"); "subtle"
 * is a plain hairline.
 */
export type DividerVariant = 'rainbow' | 'subtle' | 'red';

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  variant?: DividerVariant;
}

export function Divider({ variant = 'rainbow', style, ...rest }: DividerProps) {
  const variants: Record<DividerVariant, React.CSSProperties> = {
    rainbow: { height: 'var(--divider-height)', background: 'var(--cg-rainbow)', borderRadius: 'var(--radius-pill)' },
    subtle:  { height: '1px', background: 'var(--border-default)' },
    red:     { height: 'var(--divider-height)', background: 'var(--cg-red)', borderRadius: 'var(--radius-pill)' },
  };
  return (
    <hr
      style={{
        border: 0,
        margin: 'var(--space-3) 0',
        width: '100%',
        ...(variants[variant] || variants.rainbow),
        ...style,
      }}
      {...rest}
    />
  );
}
