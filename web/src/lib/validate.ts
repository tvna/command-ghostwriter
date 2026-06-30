import { load as yamlLoad } from "js-yaml";
import { parse as tomlParse } from "smol-toml";
import type { Format } from "./format";

// Template variables, for the "検出した変数" chips. Display-only — does not affect
// the authoritative render (that is the Python engine's job).
// {{ expr }} references keep their full dotted path (e.g. global.hostname);
// {% for a in ITER %} contributes the root of ITER (e.g. interfaces).
export function extractVars(tpl: string): string[] {
  const out: string[] = [];
  const push = (name: string) => {
    const v = name.trim();
    if (v && !out.includes(v)) out.push(v);
  };
  const expr = /\{\{\s*([^}|]+?)\s*(?:\||\}\})/g;
  let m: RegExpExecArray | null;
  while ((m = expr.exec(tpl))) push(m[1]);
  const forIn = /\{%\s*for\s+[\w,\s]+?\s+in\s+([^\s%]+)/g;
  while ((m = forIn.exec(tpl))) push(m[1].split(/[.\[(]/)[0]);
  return out;
}

// Counts for the chips: total top-level config keys, and the number of entries
// under the top-level "interfaces" object specifically (the network-interface count).
export function countConfig(debugJson: string): { keys: number; interfaces: number } {
  if (!debugJson) return { keys: 0, interfaces: 0 };
  try {
    const obj = JSON.parse(debugJson) as Record<string, unknown>;
    const keys = Object.keys(obj).length;
    const iface = obj["interfaces"];
    const interfaces =
      iface && typeof iface === "object" && !Array.isArray(iface)
        ? Object.keys(iface as object).length
        : 0;
    return { keys, interfaces };
  } catch {
    return { keys: 0, interfaces: 0 };
  }
}

function parses(text: string, format: Format): boolean {
  try {
    if (format === "toml") tomlParse(text);
    else if (format === "yaml") {
      const v = yamlLoad(text);
      if (v === null || typeof v !== "object") return false;
    } else {
      const first = text.split(/\r?\n/, 1)[0] ?? "";
      return first.includes(",");
    }
    return true;
  } catch {
    return false;
  }
}

// When the current format fails, suggest the first OTHER format that parses.
export function suggestFormat(text: string, current: Format): Format | null {
  const order: Format[] = ["toml", "yaml", "csv"];
  for (const f of order) {
    if (f !== current && parses(text, f)) return f;
  }
  return null;
}
