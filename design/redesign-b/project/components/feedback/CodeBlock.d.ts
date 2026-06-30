import React from 'react';

export interface CodeBlockProps {
  children: React.ReactNode;
  /** Optional header label, e.g. a filename. */
  title?: string;
  /** Language tag shown at top-right, e.g. "jinja", "toml". */
  language?: string;
  style?: React.CSSProperties;
}

/** Sunken monospace well for CLI output, config files, and Jinja templates. */
export function CodeBlock(props: CodeBlockProps): JSX.Element;
