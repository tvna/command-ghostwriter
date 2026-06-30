export interface TextAreaProps {
  label?: string;
  value?: string;
  rows?: number;
  /** Render in monospace (for CLI output / config). @default true */
  mono?: boolean;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

/** Multi-line field & generated-output well — Streamlit's st.text_area. */
export function TextArea(props: TextAreaProps): JSX.Element;
