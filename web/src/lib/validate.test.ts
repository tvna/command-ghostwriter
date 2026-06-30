import { describe, it, expect } from "vitest";
import { extractVars, countConfig, suggestFormat } from "./validate";

describe("extractVars", () => {
  it("collects {{ }} and {% for %} variables, deduped", () => {
    const tpl = "{{ global.hostname }} {{ global.vlans | join(',') }}{% for n, i in interfaces.items() %}{{ i.description }}{% endfor %}";
    expect(extractVars(tpl)).toContain("global.hostname");
    expect(extractVars(tpl)).toContain("interfaces");
    expect(new Set(extractVars(tpl)).size).toBe(extractVars(tpl).length);
  });
});

describe("countConfig", () => {
  it("counts top-level keys and nested object interfaces from debug JSON", () => {
    const json = JSON.stringify({ global: { a: 1 }, interfaces: { "g0/1": {}, "g0/2": {} } });
    const { keys, interfaces } = countConfig(json);
    expect(keys).toBe(2);
    expect(interfaces).toBe(2);
  });
  it("returns zeros for empty/invalid json", () => {
    expect(countConfig("")).toEqual({ keys: 0, interfaces: 0 });
  });
});

describe("suggestFormat", () => {
  it("suggests yaml when the text parses as yaml but the current format is toml", () => {
    expect(suggestFormat("a: 1\nb: 2\n", "toml")).toBe("yaml");
  });
  it("returns null when nothing else parses", () => {
    expect(suggestFormat("???not structured???", "toml")).toBeNull();
  });
});
