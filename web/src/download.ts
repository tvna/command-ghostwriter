import Encoding from "encoding-japanese";

export type DownloadEncoding = "utf-8" | "Shift_JIS";

function timestamp(date: Date): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

export function downloadFilename(name: string, ext: string, appendTimestamp: boolean, now: Date = new Date()): string {
  const suffix = appendTimestamp ? `_${timestamp(now)}` : "";
  return `${name}${suffix}.${ext}`;
}

export function encodeText(text: string, encoding: DownloadEncoding): BlobPart {
  if (encoding === "Shift_JIS") {
    const codes = Encoding.stringToCode(text);
    const sjis = Encoding.convert(codes, { to: "SJIS", from: "UNICODE" });
    return new Uint8Array(sjis);
  }
  return text;
}

export function triggerDownload(text: string, filename: string, encoding: DownloadEncoding): void {
  const blob = new Blob([encodeText(text, encoding)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
