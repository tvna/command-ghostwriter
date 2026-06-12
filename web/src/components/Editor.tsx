import CodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { json } from "@codemirror/lang-json";
import type { Extension } from "@codemirror/state";

export type EditorLanguage = "yaml" | "json" | "plain";

function languageExtensions(language: EditorLanguage): Extension[] {
  if (language === "yaml") return [yaml()];
  if (language === "json") return [json()];
  return [];
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

interface EditorProps {
  ariaLabel: string;
  value: string;
  language: EditorLanguage;
  onChange: (value: string) => void;
}

export function Editor({ ariaLabel, value, language, onChange }: EditorProps) {
  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onChange(await readFileText(file));
  }

  return (
    <div aria-label={ariaLabel} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <CodeMirror value={value} extensions={languageExtensions(language)} onChange={onChange} basicSetup={{ lineNumbers: true }} />
    </div>
  );
}
