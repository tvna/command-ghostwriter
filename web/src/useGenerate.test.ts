import { describe, it, expect } from "vitest";
import { shapeResult } from "./useGenerate";

describe("shapeResult", () => {
  it("maps a successful worker result", () => {
    const r = shapeResult({ output: "ok\n", configError: null, templateError: null, configDebug: '{"global":{"a":1},"interfaces":{"x":{}}}' }, "a=1", "toml", "{{ global.a }}");
    expect(r.ok).toBe(true);
    expect(r.output).toBe("ok\n");
    expect(r.keys).toBe(2);
    expect(r.interfaces).toBe(1);
    expect(r.vars).toContain("global.a");
  });
  it("maps a config error to the data pane and suggests a parsable format", () => {
    const r = shapeResult({ output: "", configError: "parse failed line 2", templateError: null, configDebug: "" }, "a: 1\nb: 2\n", "toml", "");
    expect(r.ok).toBe(false);
    expect(r.error?.pane).toBe("data");
    expect(r.error?.line).toBe(2);
    expect(r.suggest).toBe("yaml");
  });
  it("maps a template error to the tpl pane", () => {
    const r = shapeResult({ output: "", configError: null, templateError: "undefined variable", configDebug: "" }, "a=1", "toml", "{{ x }}");
    expect(r.error?.pane).toBe("tpl");
  });
});
