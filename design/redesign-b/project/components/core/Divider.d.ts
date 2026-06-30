export interface DividerProps {
  /** @default "rainbow" */
  variant?: 'rainbow' | 'subtle' | 'red';
  style?: React.CSSProperties;
}

/** Horizontal rule. The rainbow variant is Streamlit's signature subheader divider. */
export function Divider(props: DividerProps): JSX.Element;
