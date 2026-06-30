import React from 'react';

/**
 * Button — Command Ghostwriter's primary action control.
 * Mirrors Streamlit's st.button: full-radius corners, Source Sans label,
 * brand-red primary. Lightens on hover, deepens on press.
 */
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  icon = null,
  type = 'button',
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const sizes = {
    sm: { fontSize: 'var(--text-sm)', padding: '4px 12px', minHeight: 32 },
    md: { fontSize: 'var(--text-base)', padding: '7px 16px', minHeight: 40 },
    lg: { fontSize: 'var(--text-md)', padding: '10px 22px', minHeight: 46 },
  };

  const palettes = {
    primary: {
      base: { background: 'var(--cg-red)', color: '#fff', border: '1px solid var(--cg-red)' },
      hover: { background: 'var(--cg-red-hover)', borderColor: 'var(--cg-red-hover)' },
      active: { background: 'var(--cg-red-active)', borderColor: 'var(--cg-red-active)' },
    },
    secondary: {
      base: { background: 'var(--surface-raised)', color: 'var(--text-body)', border: '1px solid var(--border-default)' },
      hover: { borderColor: 'var(--cg-red)', color: 'var(--cg-red)' },
      active: { background: 'var(--surface-hover)' },
    },
    ghost: {
      base: { background: 'transparent', color: 'var(--text-body)', border: '1px solid transparent' },
      hover: { background: 'var(--surface-raised)' },
      active: { background: 'var(--surface-hover)' },
    },
  };

  const p = palettes[variant] || palettes.secondary;

  const composed = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--weight-semibold)',
    lineHeight: 1,
    borderRadius: 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'background var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard), color var(--dur-base) var(--ease-standard)',
    ...sizes[size],
    ...p.base,
    ...(!disabled && hover ? p.hover : null),
    ...(!disabled && active ? p.active : null),
    ...style,
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={composed}
      {...rest}
    >
      {icon && <span style={{ display: 'inline-flex', fontSize: '1.1em' }}>{icon}</span>}
      {children}
    </button>
  );
}
