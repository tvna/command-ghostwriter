import { describe, it, expect } from "vitest";
import { downloadFilename } from "./download";

describe("downloadFilename", () => {
  it("no timestamp -> name.ext", () => {
    expect(downloadFilename("command", "txt", false)).toBe("command.txt");
  });
  it("with timestamp -> dated suffix (YYYY-MM-DD_HHMMSS)", () => {
    const d = new Date(2026, 5, 12, 9, 8, 7); // month is 0-indexed: 5 = June -> 2026-06-12_090807
    expect(downloadFilename("out", "md", true, d)).toBe("out_2026-06-12_090807.md");
  });
});
