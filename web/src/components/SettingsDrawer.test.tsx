// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsDrawer } from "./SettingsDrawer";
import { DEFAULT_SETTINGS } from "../worker/types";

describe("SettingsDrawer", () => {
  it("changing csvRowsName calls onChange with updated settings", () => {
    const onChange = vi.fn();
    render(<SettingsDrawer settings={DEFAULT_SETTINGS} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("csvRowsName"), { target: { value: "rows2" } });
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, csvRowsName: "rows2" });
  });

  it("toggling enableFillNan flips the boolean", () => {
    const onChange = vi.fn();
    render(<SettingsDrawer settings={DEFAULT_SETTINGS} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("enableFillNan"));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, enableFillNan: !DEFAULT_SETTINGS.enableFillNan });
  });

  it("selecting a formatType updates it as a number", () => {
    const onChange = vi.fn();
    render(<SettingsDrawer settings={DEFAULT_SETTINGS} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("formatType"), { target: { value: "4" } });
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, formatType: 4 });
  });
});
