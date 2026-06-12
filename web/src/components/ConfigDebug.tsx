import { useState } from "react";
import yaml from "js-yaml";
import { stringify as tomlStringify } from "smol-toml";

type ConfigFormat = "json" | "yaml" | "toml";

function serialize(json: string, format: ConfigFormat): string {
  if (json === "") return "";
  if (format === "json") return json;
  const obj = JSON.parse(json);
  return format === "yaml" ? yaml.dump(obj) : tomlStringify(obj);
}

export function ConfigDebug({ json }: { json: string }) {
  const [format, setFormat] = useState<ConfigFormat>("json");
  let text: string;
  try {
    text = serialize(json, format);
  } catch (err) {
    text = `(${format} serialization failed: ${err instanceof Error ? err.message : String(err)})`;
  }
  return (
    <div>
      <div role="group" aria-label="config format">
        {(["json", "yaml", "toml"] as ConfigFormat[]).map((f) => (
          <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(f)}>
            {f}
          </button>
        ))}
      </div>
      <pre data-testid="config-debug">{text}</pre>
    </div>
  );
}
