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

  it("FileUploader exposes a native file input and reports selected files", () => {
    const onFile = vi.fn();
    const { container } = render(<FileUploader label="アップロード" accept=".toml,.yaml,.csv" onFile={onFile} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).toBeTruthy();
    expect(input?.getAttribute("accept")).toBe(".toml,.yaml,.csv");

    const file = new File(["hostname = \"router-001\""], "config.toml", { type: "application/toml" });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("FileUploader rejects files over its byte limit before reporting them", () => {
    const onFile = vi.fn();
    const onError = vi.fn();
    const { container } = render(<FileUploader label="アップロード" maxBytes={4} onFile={onFile} onError={onError} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["12345"], "large.toml", { type: "application/toml" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFile).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith("large.toml は30MB以下のファイルを選択してください。");
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
