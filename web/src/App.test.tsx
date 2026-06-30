// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

    const file = new File(["hostname = \"router-001\""], "router.toml", { type: "application/toml" });
    fireEvent.change(inputs[0], { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("hostname = \"router-001\"")).toBeTruthy();
    });
  });
});
