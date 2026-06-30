// @vitest-environment jsdom
// NOTE: These tests replaced the old textarea-based Editor tests (stale after P2 redesign port).
// The new Editor is the full two-pane Pyodide-backed editor; smoke-test that it mounts.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Editor } from "./Editor";
import { DEFAULT_SETTINGS } from "../worker/types";

const defaultDownload = { enc: "UTF-8" as const, fname: "output", ts: false, ext: "txt" };

describe("Editor (redesign-b)", () => {
  it("renders the app bar title", () => {
    render(
      <Editor
        settings={DEFAULT_SETTINGS}
        onSettings={() => {}}
        download={defaultDownload}
        onDownload={() => {}}
      />,
    );
    expect(screen.getByText("Command ghostwriter")).toBeTruthy();
  });

  it("renders the 詳細設定 button", () => {
    render(
      <Editor
        settings={DEFAULT_SETTINGS}
        onSettings={() => {}}
        download={defaultDownload}
        onDownload={() => {}}
      />,
    );
    expect(screen.getByText("詳細設定")).toBeTruthy();
  });
});
