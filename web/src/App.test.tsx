// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Encoding from "encoding-japanese";

// jsdom has no real Worker; mock the worker module so mount doesn't crash.
vi.mock("./worker/generate.worker?worker", () => ({
  default: class {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage() {}
    terminate() {}
  },
}));

import { App } from "./App";

function textBuffer(text: string): ArrayBuffer {
  return Uint8Array.from(Array.from(text, (char) => char.charCodeAt(0))).buffer;
}

describe("App shell", () => {
  beforeEach(() => { location.hash = ""; });
  it("renders the empty state at #/", () => {
    render(<App />);
    expect(screen.getAllByText(/サンプルで試す/).length).toBeGreaterThan(0);
  });
  it("renders the editor at #/new", () => {
    location.hash = "#/new";
    render(<App />);
    expect(screen.getByText("Command ghostwriter")).toBeTruthy();
  });
  it("waits for both uploaded files before opening the editor", async () => {
    const { container } = render(<App />);
    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    expect(inputs[0].getAttribute("accept")).toBe(".toml,.yaml,.yml,.csv");
    expect(inputs[1].getAttribute("accept")).toBe(".j2,.jinja2");

    const config = new File(["hostname = \"router-001\""], "router.toml", { type: "application/toml" });
    fireEvent.change(inputs[0], { target: { files: [config] } });

    await waitFor(() => {
      expect(screen.getByText("router.toml")).toBeTruthy();
    });
    expect(screen.queryByDisplayValue("hostname = \"router-001\"")).toBeNull();

    const template = new File(["hostname {{ hostname }}"], "command.j2", { type: "text/plain" });
    fireEvent.change(inputs[1], { target: { files: [template] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("hostname = \"router-001\"")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "テンプレート" }));
    expect(screen.getByDisplayValue("hostname {{ hostname }}")).toBeTruthy();
  });
  it("decodes uploaded Shift_JIS config files before opening the editor", async () => {
    const { container } = render(<App />);
    const inputs = container.querySelectorAll('input[type="file"]');
    const codes = Encoding.stringToCode("hostname = \"東京\"");
    const sjis = new Uint8Array(Encoding.convert(codes, { to: "SJIS", from: "UNICODE" }));
    const file = new File([sjis], "router.toml", { type: "application/toml" });

    const template = new File(["hostname {{ hostname }}"], "command.j2", { type: "text/plain" });

    fireEvent.change(inputs[0], { target: { files: [file] } });
    fireEvent.change(inputs[1], { target: { files: [template] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("hostname = \"東京\"")).toBeTruthy();
    });
  });
  it("waits on the empty state when only a Jinja template has been uploaded", async () => {
    const { container } = render(<App />);
    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    expect(inputs[1].getAttribute("accept")).toBe(".j2,.jinja2");

    const file = new File(["interface {{ name }}"], "interface.j2", { type: "text/plain" });
    fireEvent.change(inputs[1], { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("interface.j2")).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: "テンプレート" })).toBeNull();
  });
  it("ignores stale reads when a newer file is selected for the same upload slot", async () => {
    const { container } = render(<App />);
    const inputs = container.querySelectorAll('input[type="file"]');
    let resolveOldConfig: ((buffer: ArrayBuffer) => void) | undefined;
    const oldConfig = new File([""], "old.toml", { type: "application/toml" });
    Object.defineProperty(oldConfig, "arrayBuffer", {
      value: () => new Promise<ArrayBuffer>((resolve) => { resolveOldConfig = resolve; }),
    });
    const newConfig = new File(["hostname = \"new\""], "new.toml", { type: "application/toml" });

    fireEvent.change(inputs[0], { target: { files: [oldConfig] } });
    fireEvent.change(inputs[0], { target: { files: [newConfig] } });

    await waitFor(() => {
      expect(screen.getByText("new.toml")).toBeTruthy();
    });

    resolveOldConfig?.(textBuffer("hostname = \"old\""));
    const template = new File(["hostname {{ hostname }}"], "command.j2", { type: "text/plain" });
    fireEvent.change(inputs[1], { target: { files: [template] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("hostname = \"new\"")).toBeTruthy();
    });
    expect(screen.queryByDisplayValue("hostname = \"old\"")).toBeNull();
  });
  it("shows an inline error when an upload cannot be read", async () => {
    const { container } = render(<App />);
    const inputs = container.querySelectorAll('input[type="file"]');
    const file = new File([""], "broken.toml", { type: "application/toml" });
    Object.defineProperty(file, "arrayBuffer", { value: () => Promise.reject(new Error("read failed")) });

    fireEvent.change(inputs[0], { target: { files: [file] } });

    expect((await screen.findByRole("alert")).textContent).toBe("broken.toml を読み込めませんでした。別のファイルを選択してください。");
  });
  it("preserves one upload slot's error when the other slot succeeds later", async () => {
    const { container } = render(<App />);
    const inputs = container.querySelectorAll('input[type="file"]');
    let rejectConfig: ((error: Error) => void) | undefined;
    const config = new File([""], "broken.toml", { type: "application/toml" });
    Object.defineProperty(config, "arrayBuffer", {
      value: () => new Promise<ArrayBuffer>((_, reject) => { rejectConfig = reject; }),
    });
    const template = new File(["hostname {{ hostname }}"], "command.j2", { type: "text/plain" });

    fireEvent.change(inputs[0], { target: { files: [config] } });
    fireEvent.change(inputs[1], { target: { files: [template] } });
    rejectConfig?.(new Error("read failed"));

    expect((await screen.findByRole("alert")).textContent).toBe("broken.toml を読み込めませんでした。別のファイルを選択してください。");
    await waitFor(() => {
      expect(screen.getByText("command.j2")).toBeTruthy();
    });
    expect(screen.getByRole("alert").textContent).toBe("broken.toml を読み込めませんでした。別のファイルを選択してください。");
  });
});
