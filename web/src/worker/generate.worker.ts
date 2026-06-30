import { loadPyodide } from "pyodide";
import { bootstrapRuntime, generate, type PyodideLike } from "./pyodide-runtime";
import type { WorkerInbound, WorkerOutbound } from "./types";

let runtime: PyodideLike | null = null;

function post(msg: WorkerOutbound) {
  (self as unknown as Worker).postMessage(msg);
}

self.onmessage = async (event: MessageEvent<WorkerInbound>) => {
  const msg = event.data;
  try {
    if (msg.kind === "init") {
      runtime = await bootstrapRuntime(
        loadPyodide as unknown as Parameters<typeof bootstrapRuntime>[0],
        // Self-hosted distribution copied to /pyodide/ by the vendor-pyodide plugin.
        new URL("/pyodide/", self.location.origin).toString(),
      );
      post({ kind: "ready" });
      return;
    }
    if (msg.kind === "generate") {
      if (runtime === null) {
        post({ kind: "error", id: msg.id, message: "runtime not initialized" });
        return;
      }
      const result = await generate(runtime, msg.request);
      post({ kind: "result", id: msg.id, result });
    }
  } catch (err) {
    const id = msg.kind === "generate" ? msg.id : null;
    post({ kind: "error", id, message: err instanceof Error ? err.message : String(err) });
  }
};
