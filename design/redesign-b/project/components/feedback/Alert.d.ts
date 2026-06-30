import React from 'react';

export interface AlertProps {
  children: React.ReactNode;
  /** @default "info" */
  tone?: 'success' | 'warning' | 'error' | 'info';
  /** Override the default leading glyph. */
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Inline status message — Streamlit's st.success/warning/error/info.
 *
 * @startingPoint section="Feedback" subtitle="The four alert tones" viewport="700x150"
 */
export function Alert(props: AlertProps): JSX.Element;
