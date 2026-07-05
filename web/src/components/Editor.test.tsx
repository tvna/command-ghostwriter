// @vitest-environment jsdom
// NOTE: These tests replaced the old textarea-based Editor tests (stale after P2 redesign port).
// The new Editor is the full two-pane Pyodide-backed editor; smoke-test that it mounts.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// jsdom has no real Worker; mock the worker module so useGenerate's mount doesn't crash.
// The mock records each constructed instance so a test can drive its onmessage handler
// (simulating the worker posting `ready` / `result`).
const workerInstances: Array<{ onmessage: ((e: MessageEvent) => void) | null }> = [];
vi.mock("../worker/generate.worker?worker", () => ({
  default: class {
    onmessage: ((e: MessageEvent) => void) | null = null;
    constructor() {
      workerInstances.push(this);
    }
    postMessage() {}
    terminate() {}
  },
}));

import { Editor } from "./Editor";
import { DEFAULT_SETTINGS } from "../worker/types";

const defaultDownload = { enc: "UTF-8" as const, fname: "output", ts: false, ext: "txt" };

function renderEditor() {
  return render(
    <Editor
      settings={DEFAULT_SETTINGS}
      onSettings={() => {}}
      download={defaultDownload}
      onDownload={() => {}}
    />,
  );
}

afterEach(() => {
  workerInstances.length = 0;
  vi.useRealTimers();
});

describe("Editor (redesign-b)", () => {
  it("renders the app bar title", () => {
    renderEditor();
    expect(screen.getByText("Command ghostwriter")).toBeTruthy();
  });

  it("renders the 詳細設定 button", () => {
    renderEditor();
    expect(screen.getByText("詳細設定")).toBeTruthy();
  });

  it("keeps the initializing state until the first worker result arrives", () => {
    vi.useFakeTimers();
    renderEditor();

    // Before bootstrap: the output pane shows the initializing state.
    expect(screen.getByText("実行環境を初期化しています…")).toBeTruthy();
    expect((screen.getByRole("button", { name: "コピー" }) as HTMLButtonElement).disabled).toBe(true);

    const worker = workerInstances[0];
    expect(worker?.onmessage).toBeTypeOf("function");

    // Worker reports `ready`, but no generate result has come back yet.
    // Regression guard: the pane must NOT flip to an empty result with enabled
    // copy/save during this window (the debounced first generate is still pending).
    act(() => {
      worker.onmessage!({ data: { kind: "ready" } } as MessageEvent);
    });
    expect(screen.getByText("実行環境を初期化しています…")).toBeTruthy();
    expect((screen.getByRole("button", { name: "コピー" }) as HTMLButtonElement).disabled).toBe(true);

    // Let the debounced dispatch fire, then deliver the first result.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      worker.onmessage!({
        data: { kind: "result", id: 1, result: { output: "HELLO WORLD\n", configError: null, templateError: null, configDebug: "{}" } },
      } as MessageEvent);
    });

    // Now the real output is available: initializing gone, copy enabled.
    expect(screen.queryByText("実行環境を初期化しています…")).toBeNull();
    expect(screen.getByText("HELLO WORLD")).toBeTruthy();
    expect((screen.getByRole("button", { name: "コピー" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
