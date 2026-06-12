function timestamp(date: Date): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

export function downloadFilename(name: string, ext: string, appendTimestamp: boolean, now: Date = new Date()): string {
  const suffix = appendTimestamp ? `_${timestamp(now)}` : "";
  return `${name}${suffix}.${ext}`;
}

export function triggerDownload(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
