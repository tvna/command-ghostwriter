// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("opens the how-to guide when the header link is clicked", () => {
    render(<EmptyState onStart={() => {}} onLibrary={() => {}} />);
    // guide is closed initially
    expect(screen.queryByText("使い方と構文")).toBeNull();
    // the header "使い方" link must open it (regression: it used to be a dead link)
    fireEvent.click(screen.getByText("使い方"));
    expect(screen.getByText("使い方と構文")).toBeTruthy();
  });

  it("closes the how-to guide via the 閉じる button", () => {
    render(<EmptyState onStart={() => {}} onLibrary={() => {}} />);
    fireEvent.click(screen.getByText("使い方"));
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.queryByText("使い方と構文")).toBeNull();
  });
});
