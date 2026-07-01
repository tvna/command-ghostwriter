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
  it("loads a selected config file from the empty state into the editor", async () => {
    const { container } = render(<App />);
    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    expect(inputs[0].getAttribute("accept")).toBe(".toml,.yaml,.yml,.csv");

    const file = new File(["hostname = \"router-001\""], "router.toml", { type: "application/toml" });
    fireEvent.change(inputs[0], { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("hostname = \"router-001\"")).toBeTruthy();
    });
  });
  it("decodes uploaded Shift_JIS config files before opening the editor", async () => {
    const { container } = render(<App />);
    const inputs = container.querySelectorAll('input[type="file"]');
    const codes = Encoding.stringToCode("hostname = \"東京\"");
    const sjis = new Uint8Array(Encoding.convert(codes, { to: "SJIS", from: "UNICODE" }));
    const file = new File([sjis], "router.toml", { type: "application/toml" });

    fireEvent.change(inputs[0], { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("hostname = \"東京\"")).toBeTruthy();
    });
  });
  it("loads a selected Jinja template file from the empty state into the editor", async () => {
    const { container } = render(<App />);
    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    expect(inputs[1].getAttribute("accept")).toBe(".j2,.jinja2");

    const file = new File(["interface {{ name }}"], "interface.j2", { type: "text/plain" });
    fireEvent.change(inputs[1], { target: { files: [file] } });

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: "テンプレート" }));
      expect(screen.getByDisplayValue("interface {{ name }}")).toBeTruthy();
    });
  });
  it("shows an inline error when an upload cannot be read", async () => {
    const { container } = render(<App />);
    const inputs = container.querySelectorAll('input[type="file"]');
    const file = new File([""], "broken.toml", { type: "application/toml" });
    Object.defineProperty(file, "arrayBuffer", { value: () => Promise.reject(new Error("read failed")) });

    fireEvent.change(inputs[0], { target: { files: [file] } });

    expect((await screen.findByRole("alert")).textContent).toBe("broken.toml を読み込めませんでした。別のファイルを選択してください。");
  });
});
