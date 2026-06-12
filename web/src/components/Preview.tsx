import { marked } from "marked";
import DOMPurify from "dompurify";

export type PreviewMode = "text" | "markdown" | "config";

interface PreviewProps {
  output: string;
  mode: PreviewMode;
}

export function Preview({ output, mode }: PreviewProps) {
  if (mode === "config") {
    return <pre data-testid="config-debug">{output}</pre>;
  }
  if (mode === "markdown") {
    const html = DOMPurify.sanitize(marked.parse(output, { async: false }) as string);
    return <div data-testid="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <pre>{output}</pre>;
}
