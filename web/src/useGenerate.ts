import { useEffect, useMemo, useRef, useState } from "react";
import GenerateWorker from "./worker/generate.worker?worker";
import type { WorkerOutbound, GenerateSettings } from "./worker/types";
import { configFileName, type Format } from "./lib/format";
import { extractVars, countConfig, suggestFormat } from "./lib/validate";

const DEBOUNCE_MS = 250;

export interface GenError {
  pane: "data" | "tpl";
  line?: number;
  title: string;
  detail: string;
  varName?: string;
}

export interface GenResult {
  ok: boolean;
  error: GenError | null;
  suggest: Format | null;
  vars: string[];
  output: string;
  json: string;
  interfaces: number;
  keys: number;
}

const EMPTY: GenResult = {
  ok: true, error: null, suggest: null, vars: [], output: "", json: "", interfaces: 0, keys: 0,
};

// Split a raw engine error message into a title + detail, extracting a 1-based
// line number if the message carries one (e.g. "... line 12 ...").
function splitError(pane: "data" | "tpl", message: string): GenError {
  const lineMatch = message.match(/(?:line|行目|行)\s*[:：]?\s*(\d+)/i);
  const line = lineMatch ? Number(lineMatch[1]) : undefined;
  const [title, ...rest] = message.split(/[\n:：]/);
  return { pane, line, title: title.trim() || "解析エラー", detail: rest.join(": ").trim() || message };
}

export function useGenerate(
  dataText: string,
  format: Format,
  tplText: string,
  settings: GenerateSettings,
): GenResult {
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [raw, setRaw] = useState<{ output: string | null; configError: string | null; templateError: string | null; configDebug: string } | null>(null);

  // Warm the worker as early as this hook mounts (overlaps onboarding).
  useEffect(() => {
    const worker = new GenerateWorker();
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<WorkerOutbound>) => {
      const msg = e.data;
      if (msg.kind === "ready") setReady(true);
      else if (msg.kind === "result") setRaw(msg.result);
      else if (msg.kind === "error")
        setRaw({ output: "", configError: msg.message, templateError: null, configDebug: "" });
    };
    worker.postMessage({ kind: "init" });
    return () => worker.terminate();
  }, []);

  // Debounced dispatch. Input memoization: only re-post when inputs actually change.
  const memoKey = JSON.stringify({ dataText, format, tplText, settings });
  const lastKey = useRef<string>("");
  useEffect(() => {
    if (!ready) return;
    if (lastKey.current === memoKey) return;
    const handle = setTimeout(() => {
      lastKey.current = memoKey;
      const id = ++idRef.current;
      workerRef.current?.postMessage({
        kind: "generate",
        id,
        request: {
          configText: dataText,
          configName: configFileName(format),
          templateText: tplText,
          templateName: "template.j2",
          settings,
        },
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [ready, memoKey, dataText, format, tplText, settings]);

  // Shape the worker result into what the Editor consumes.
  return useMemo<GenResult>(() => {
    if (raw === null) return EMPTY;
    const vars = extractVars(tplText);
    if (raw.configError) {
      return { ...EMPTY, ok: false, vars, error: splitError("data", raw.configError), suggest: suggestFormat(dataText, format) };
    }
    if (raw.templateError) {
      return { ...EMPTY, ok: false, vars, error: splitError("tpl", raw.templateError) };
    }
    const { keys, interfaces } = countConfig(raw.configDebug);
    return { ok: true, error: null, suggest: null, vars, output: raw.output ?? "", json: raw.configDebug, interfaces, keys };
  }, [raw, tplText, dataText, format]);
}
