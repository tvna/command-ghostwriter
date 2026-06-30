export interface ToggleProps {
  checked?: boolean;
  label?: string;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
  style?: React.CSSProperties;
}

/** Pill switch — Streamlit's st.toggle. Knob slides onto brand red when on. */
export function Toggle(props: ToggleProps): JSX.Element;
