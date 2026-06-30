// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, Badge, Divider, Selectbox, Toggle, TextInput, RadioGroup, FileUploader } from "./index";
import { Icon } from "../components/Icon";

describe("DS primitives smoke", () => {
  it("Button renders its label and fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>実行</Button>);
    const btn = screen.getByRole("button", { name: "実行" });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("TextInput renders value and fires onChange with the new value", () => {
    const onChange = vi.fn();
    render(<TextInput label="名前" value="abc" onChange={onChange} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("abc");
    fireEvent.change(input, { target: { value: "abcd" } });
    expect(onChange).toHaveBeenCalledWith("abcd");
  });

  it("Badge renders its text", () => {
    render(<Badge tone="success">ライブ</Badge>);
    expect(screen.getByText("ライブ")).toBeTruthy();
  });

  it("Toggle renders its label without throwing", () => {
    render(<Toggle checked label="strict" onChange={() => {}} />);
    expect(screen.getByText("strict")).toBeTruthy();
  });

  it("Selectbox renders its label without throwing", () => {
    render(<Selectbox label="形式" value="toml" options={["toml", "yaml", "csv"]} onChange={() => {}} />);
    expect(screen.getByText("形式")).toBeTruthy();
  });

  it("RadioGroup renders its label without throwing", () => {
    render(<RadioGroup label="出力" value="cli" options={["cli", "config"]} onChange={() => {}} />);
    expect(screen.getByText("出力")).toBeTruthy();
  });

  it("FileUploader renders its label without throwing", () => {
    render(<FileUploader label="アップロード" onBrowse={() => {}} />);
    expect(screen.getByText("アップロード")).toBeTruthy();
  });

  it("Divider renders an hr element", () => {
    const { container } = render(<Divider variant="rainbow" />);
    expect(container.querySelector("hr")).toBeTruthy();
  });

  it("Icon renders an inline svg for a known name", () => {
    const { container } = render(<Icon name="server" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
