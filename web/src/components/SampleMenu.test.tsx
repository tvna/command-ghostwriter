// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SampleMenu } from "./SampleMenu";

describe("SampleMenu", () => {
  it("clicking a sample loads non-empty config and template", () => {
    const onLoad = vi.fn();
    render(<SampleMenu onLoad={onLoad} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(onLoad).toHaveBeenCalledTimes(1);
    const [config, template] = onLoad.mock.calls[0];
    expect(typeof config).toBe("string");
    expect(config.length).toBeGreaterThan(0);
    expect(template.length).toBeGreaterThan(0);
  });
});
