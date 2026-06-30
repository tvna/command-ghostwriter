import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  /** CSS padding value. @default "var(--space-6)" */
  padding?: string;
  style?: React.CSSProperties;
}

/** Bordered container surface — Streamlit's st.container(border=True). */
export function Card(props: CardProps): JSX.Element;
