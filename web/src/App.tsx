import { useEffect, useRef, useState } from "react";
import GenerateWorker from "./worker/generate.worker?worker";
import type { WorkerOutbound, GenerateResult } from "./worker/types";
import { DEFAULT_SETTINGS } from "./worker/types";

const DEBOUNCE_MS = 250;

function viewError(result: GenerateResult | null): string | null {
  if (result === null) return null;
  if (result.configError !== null) return result.configError;
  return result.templateError;
}

function viewOutput(result: GenerateResult | null): string {
  if (result === null) return "";
  return result.output ?? "";
}

export function App() {
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState("id,value\n1,100\n2,N/A\n3,300\n");
  const [template, setTemplate] = useState(
    "{% for r in csv_rows %}{{ r.id }}:{{ r.value }}\n{% endfor %}",
  );
  const [result, setResult] = useState<GenerateResult | null>(null);

  useEffect(() => {
    const worker = new GenerateWorker();
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<WorkerOutbound>) => {
      const msg = e.data;
      if (msg.kind === "ready") setReady(true);
      else if (msg.kind === "result") setResult(msg.result);
      else if (msg.kind === "error")
        setResult({ output: null, configError: msg.message, templateError: null });
    };
    worker.postMessage({ kind: "init" });
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handle = setTimeout(() => {
      const id = ++idRef.current;
      workerRef.current?.postMessage({
        kind: "generate",
        id,
        request: {
          configText: config,
          configName: "config.csv",
          templateText: template,
          templateName: "template.j2",
          settings: DEFAULT_SETTINGS,
        },
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [config, template, ready]);

  const error = viewError(result);
  const status = ready ? "ready" : "loading Pyodide...";

  return (
    <main>
      <h1>Command Ghostwriter</h1>
      <p>{status}</p>
      <textarea aria-label="config" value={config} onChange={(e) => setConfig(e.target.value)} />
      <textarea aria-label="template" value={template} onChange={(e) => setTemplate(e.target.value)} />
      {error !== null && <div role="alert">{error}</div>}
      <pre>{viewOutput(result)}</pre>
    </main>
  );
}
