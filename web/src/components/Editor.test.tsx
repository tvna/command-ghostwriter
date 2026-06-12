// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Editor } from "./Editor";

describe("Editor", () => {
  it("renders with the given aria-label", () => {
    render(<Editor ariaLabel="config" value="id,value" language="yaml" onChange={() => {}} />);
    expect(screen.getByLabelText("config")).toBeTruthy();
  });

  it("calls onChange with dropped file text", async () => {
    const onChange = vi.fn();
    render(<Editor ariaLabel="config" value="" language="yaml" onChange={onChange} />);
    const region = screen.getByLabelText("config");
    const file = new File(["a,b\n1,2\n"], "x.csv", { type: "text/csv" });
    fireEvent.drop(region, { dataTransfer: { files: [file] } });
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith("a,b\n1,2\n"));
  });
});
