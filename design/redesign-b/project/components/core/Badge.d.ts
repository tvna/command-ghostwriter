import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  /** @default "neutral" */
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'info';
  style?: React.CSSProperties;
}

/** Small status pill — file types, counts, states. */
export function Badge(props: BadgeProps): JSX.Element;
