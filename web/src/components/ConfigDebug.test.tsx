// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfigDebug } from "./ConfigDebug";

describe("ConfigDebug", () => {
  it("shows JSON by default and re-serializes to YAML and TOML", () => {
    render(<ConfigDebug json={'{"a": 1}'} />);
    expect(screen.getByTestId("config-debug").textContent).toBe('{"a": 1}');
    fireEvent.click(screen.getByRole("button", { name: "yaml" }));
    expect(screen.getByTestId("config-debug").textContent).toContain("a: 1");
    fireEvent.click(screen.getByRole("button", { name: "toml" }));
    expect(screen.getByTestId("config-debug").textContent).toContain("a = 1");
  });

  it("shows a loud error instead of crashing on non-JSON input", () => {
    render(<ConfigDebug json={"{not json"} />);
    fireEvent.click(screen.getByRole("button", { name: "yaml" }));
    expect(screen.getByTestId("config-debug").textContent).toContain("failed");
  });
});
