import React from 'react';

export interface FileUploaderProps {
  /** Field label shown above the dropzone. */
  label?: string;
  /** Accepted extensions hint, e.g. "TOML, YAML, CSV". */
  accept?: string;
  /** Per-file size limit copy. @default "30MB" */
  maxSize?: string;
  /** When set, renders the uploaded-file row. */
  fileName?: string | null;
  /** Human size for the uploaded file, e.g. "889 B". */
  fileSize?: string;
  onBrowse?: () => void;
  style?: React.CSSProperties;
}

/**
 * Dropzone for config and template files — Streamlit's st.file_uploader.
 *
 * @startingPoint section="Forms" subtitle="File dropzone with uploaded-file state" viewport="700x150"
 */
export function FileUploader(props: FileUploaderProps): JSX.Element;
