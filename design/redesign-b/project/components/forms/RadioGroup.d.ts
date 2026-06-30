export interface RadioGroupProps {
  label?: string;
  value: string;
  options: string[];
  /** Lay options in a row. @default false */
  horizontal?: boolean;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

/** Single-choice radio set — Streamlit's st.radio. Red dot when selected. */
export function RadioGroup(props: RadioGroupProps): JSX.Element;
