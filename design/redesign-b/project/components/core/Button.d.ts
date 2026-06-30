import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  /** Visual emphasis. primary = brand red CTA. @default "secondary" */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Stretch to fill its container (Streamlit use_container_width). @default false */
  fullWidth?: boolean;
  disabled?: boolean;
  /** Optional leading icon — an emoji or SVG node. */
  icon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

/**
 * Primary action control. Brand-red primary, bordered secondary, transparent ghost.
 *
 * @startingPoint section="Core" subtitle="Buttons in every variant and size" viewport="700x150"
 */
export function Button(props: ButtonProps): JSX.Element;
