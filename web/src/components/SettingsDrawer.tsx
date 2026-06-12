import type { GenerateSettings } from "../worker/types";

const FORMAT_TYPE_LABELS: Record<number, string> = {
  0: "フォーマット指定無し",
  1: "半角スペースを一部削除",
  2: "余分な改行を一部削除",
  3: "半角スペースと余分な改行を一部削除",
  4: "半角スペースの一部と余分な改行を全て削除",
};

interface SettingsDrawerProps {
  settings: GenerateSettings;
  onChange: (settings: GenerateSettings) => void;
}

export function SettingsDrawer({ settings, onChange }: SettingsDrawerProps) {
  function set<K extends keyof GenerateSettings>(key: K, value: GenerateSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <details>
      <summary>詳細設定</summary>
      <label>
        CSV行の変数名
        <input aria-label="csvRowsName" type="text" value={settings.csvRowsName} onChange={(e) => set("csvRowsName", e.target.value)} />
      </label>
      <label>
        <input aria-label="enableFillNan" type="checkbox" checked={settings.enableFillNan} onChange={(e) => set("enableFillNan", e.target.checked)} />
        CSVの欠損値を指定文字で埋める
      </label>
      <label>
        欠損値の変換文字
        <input aria-label="fillNanWith" type="text" value={settings.fillNanWith} onChange={(e) => set("fillNanWith", e.target.value)} />
      </label>
      <label>
        出力フォーマット
        <select aria-label="formatType" value={settings.formatType} onChange={(e) => set("formatType", Number(e.target.value))}>
          {[0, 1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>{FORMAT_TYPE_LABELS[n]}</option>
          ))}
        </select>
      </label>
      <label>
        <input aria-label="isStrictUndefined" type="checkbox" checked={settings.isStrictUndefined} onChange={(e) => set("isStrictUndefined", e.target.checked)} />
        テンプレートの変数チェック厳格化
      </label>
      <label>
        <input aria-label="enableAutoTranscoding" type="checkbox" checked={settings.enableAutoTranscoding} onChange={(e) => set("enableAutoTranscoding", e.target.checked)} />
        UTF-8以外の文字コードを自動判定
      </label>
    </details>
  );
}
