export interface TextInputProps {
  label?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

/** Single-line text field — Streamlit's st.text_input. Red focus ring. */
export function TextInput(props: TextInputProps): JSX.Element;
