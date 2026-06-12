import { useState } from "react";
import { downloadFilename, triggerDownload } from "../download";
import { t } from "../i18n";

interface DownloadBarProps {
  output: string;
}

export function DownloadBar({ output }: DownloadBarProps) {
  const [name, setName] = useState("command");
  const [ext, setExt] = useState("txt");
  const [appendTimestamp, setAppendTimestamp] = useState(true);

  function handleDownload() {
    triggerDownload(output, downloadFilename(name, ext, appendTimestamp));
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
      <button type="button" disabled={output.length === 0} onClick={handleDownload}>{t.download}</button>
    </div>
  );
}
