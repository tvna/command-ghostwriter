// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HowToModal } from "./HowToModal";

describe("HowToModal", () => {
  it("renders nothing when closed", () => {
    render(<HowToModal open={false} onClose={() => {}} />);
    expect(screen.queryByText("使い方と構文")).toBeNull();
  });

  it("renders content when open", () => {
    render(<HowToModal open={true} onClose={() => {}} />);
    expect(screen.getByText("使い方と構文")).toBeTruthy();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<HowToModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
