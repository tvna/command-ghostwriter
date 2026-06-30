// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

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
});
