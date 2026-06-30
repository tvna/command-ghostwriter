export interface TabItem {
  id: string;
  label: string;
  /** Emoji or node shown before the label. */
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Controlled active id. */
  value?: string;
  /** Uncontrolled initial id. */
  defaultValue?: string;
  onChange?: (id: string) => void;
  style?: React.CSSProperties;
}

/**
 * Emoji-labelled tab strip — Streamlit's st.tabs. Red underline on active.
 *
 * @startingPoint section="Navigation" subtitle="The app's 5-tab header" viewport="700x120"
 */
export function Tabs(props: TabsProps): JSX.Element;
