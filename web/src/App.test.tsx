// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";

const postMessage = vi.fn();
let onmessage: ((e: MessageEvent) => void) | null = null;

vi.mock("./worker/generate.worker?worker", () => ({
  default: class {
    postMessage = postMessage;
    set onmessage(fn: (e: MessageEvent) => void) {
      onmessage = fn;
    }
    terminate() {}
  },
}));

describe("App harness", () => {
  beforeEach(() => {
    postMessage.mockClear();
    onmessage = null;
  });

  it("sends init on mount and shows output from a result message", async () => {
    render(<App />);
    await waitFor(() => expect(postMessage).toHaveBeenCalledWith({ kind: "init" }));

    onmessage?.({ data: { kind: "ready" } } as MessageEvent);
    onmessage?.({
      data: { kind: "result", id: 1, result: { output: "HELLO", configError: null, templateError: null } },
    } as MessageEvent);

    await waitFor(() => expect(screen.getByText("HELLO")).toBeTruthy());
  });

  it("shows an error banner when result carries configError", async () => {
    render(<App />);
    onmessage?.({ data: { kind: "ready" } } as MessageEvent);
    onmessage?.({
      data: { kind: "result", id: 1, result: { output: null, configError: "bad csv", templateError: null } },
    } as MessageEvent);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("bad csv"));
  });
});
