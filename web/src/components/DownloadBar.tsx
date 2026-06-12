import { useState } from "react";
import { downloadFilename, triggerDownload } from "../download";

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
        タイムスタンプ付与
      </label>
      <button type="button" disabled={output.length === 0} onClick={handleDownload}>ダウンロード</button>
    </div>
  );
}
