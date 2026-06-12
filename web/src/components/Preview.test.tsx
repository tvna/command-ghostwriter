// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Preview } from "./Preview";

describe("Preview", () => {
  it("text mode shows raw output in a <pre>", () => {
    render(<Preview output={"a\nb"} mode="text" />);
    expect(document.querySelector("pre")?.textContent).toBe("a\nb");
  });

  it("markdown mode renders HTML tags", () => {
    render(<Preview output={"# Title"} mode="markdown" />);
    expect(screen.getByText("Title").tagName).toBe("H1");
  });

  it("markdown mode sanitizes dangerous markup", () => {
    render(<Preview output={"<img src=x onerror=alert(1)>\n\n<script>alert(1)</script>"} mode="markdown" />);
    const container = screen.getByTestId("markdown-preview");
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("onerror");
  });

  it("config mode shows the debug string in a pre", () => {
    render(<Preview output={'{"a": 1}'} mode="config" />);
    expect(screen.getByTestId("config-debug").textContent).toBe('{"a": 1}');
  });
});
