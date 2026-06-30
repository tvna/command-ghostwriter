export interface SelectboxProps {
  label?: string;
  value: string;
  options: string[];
  disabled?: boolean;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

/** Dropdown select — Streamlit's st.selectbox. Click to open an option list. */
export function Selectbox(props: SelectboxProps): JSX.Element;
