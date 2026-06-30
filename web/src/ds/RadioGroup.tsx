import React from 'react';

/**
 * RadioGroup — Streamlit's st.radio. Horizontal or vertical set of
 * single-choice options with a red filled dot when selected.
 */
export interface RadioGroupProps {
  label?: React.ReactNode;
  value: string;
  options?: string[];
  horizontal?: boolean;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

export function RadioGroup({ label, value, options = [], horizontal = false, onChange, style }: RadioGroupProps) {
  return (
    <div style={{ fontFamily: 'var(--font-sans)', ...style }}>
      {label && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', marginBottom: 'var(--space-2)' }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', gap: horizontal ? 'var(--space-5)' : 'var(--space-2)' }}>
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <label
              key={opt}
              onClick={() => onChange && onChange(opt)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  flexShrink: 0,
                  border: `2px solid ${selected ? 'var(--cg-red)' : 'var(--cg-border-strong)'}`,
                  display: 'grid',
                  placeItems: 'center',
                  transition: 'border-color var(--dur-base)',
                }}
              >
                {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cg-red)' }} />}
              </span>
              {opt}
            </label>
          );
        })}
      </div>
    </div>
  );
}
