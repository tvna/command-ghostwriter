import { useState } from "react";
import { downloadFilename, triggerDownload, type DownloadEncoding } from "../download";
import { t } from "../i18n";

interface DownloadBarProps {
  output: string;
}

export function DownloadBar({ output }: DownloadBarProps) {
  const [name, setName] = useState("command");
  const [ext, setExt] = useState("txt");
  const [appendTimestamp, setAppendTimestamp] = useState(true);
  const [encoding, setEncoding] = useState<DownloadEncoding>("utf-8");

  function handleDownload() {
    triggerDownload(output, downloadFilename(name, ext, appendTimestamp), encoding);
  }

  return (
    <div role="group" aria-label="download">
      <input aria-label="downloadName" type="text" value={name} onChange={(e) => setName(e.target.value)} />
      <select aria-label="downloadExt" value={ext} onChange={(e) => setExt(e.target.value)}>
        <option value="txt">txt</option>
        <option value="md">md</option>
      </select>
      <label>
        <input aria-label="appendTimestamp" type="checkbox" checked={appendTimestamp} onChange={(e) => setAppendTimestamp(e.target.checked)} />
        {t.appendTimestamp}
      </label>
      <select aria-label="downloadEncoding" value={encoding} onChange={(e) => setEncoding(e.target.value as DownloadEncoding)}>
        <option value="utf-8">utf-8</option>
        <option value="Shift_JIS">Shift_JIS</option>
      </select>
      <button type="button" disabled={output.length === 0} onClick={handleDownload}>{t.download}</button>
    </div>
  );
}
