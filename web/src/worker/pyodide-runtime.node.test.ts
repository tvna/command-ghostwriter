import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { loadPyodide } from "pyodide";
import { bootstrapRuntime, generate, type PyodideLike } from "./pyodide-runtime";
import { DEFAULT_SETTINGS } from "./types";

const require = createRequire(import.meta.url);
const indexURL = dirname(require.resolve("pyodide"));

describe("features/ render parity in Pyodide (Node)", () => {
  let pyodide: PyodideLike;

  beforeAll(async () => {
    pyodide = await bootstrapRuntime(
      loadPyodide as unknown as Parameters<typeof bootstrapRuntime>[0],
      indexURL,
    );
  }, 120_000);

  it("renders a CSV+Jinja fixture byte-identically to the CPython golden", async () => {
    const result = await generate(pyodide, {
      configText: "id,value\n1,100\n2,N/A\n3,300\n",
      configName: "config.csv",
      templateText: "{% for r in csv_rows %}{{ r.id }}:{{ r.value }}\n{% endfor %}",
      templateName: "template.j2",
      settings: DEFAULT_SETTINGS,
    });

    expect(result.configError).toBeNull();
    expect(result.templateError).toBeNull();
    expect(result.output).toBe("1:100\n2:N/A\n3:300\n");
  });

  it("renders a TOML+Jinja fixture", async () => {
    const result = await generate(pyodide, {
      configText: 'name = "world"\ncount = 3\n',
      configName: "config.toml",
      templateText: "Hello {{ name }} x{{ count }}",
      templateName: "template.j2",
      settings: DEFAULT_SETTINGS,
    });
    expect(result.configError).toBeNull();
    expect(result.templateError).toBeNull();
    expect(result.output).toBe("Hello world x3");
  });

  it("surfaces a config parse error in configError, not output", async () => {
    const result = await generate(pyodide, {
      configText: "id,value\n1,2,3\n", // a data row with more fields than the header -> loud CSV error
      configName: "config.csv",
      templateText: "{% for r in csv_rows %}{{ r.id }}\n{% endfor %}",
      templateName: "template.j2",
      settings: DEFAULT_SETTINGS,
    });
    expect(result.output).toBeNull();
    expect(result.configError).toContain("Failed to parse CSV");
  });

  it("surfaces a template error in templateError, not output", async () => {
    const result = await generate(pyodide, {
      configText: 'name = "x"\n',
      configName: "config.toml",
      templateText: "{% for %}", // invalid jinja syntax
      templateName: "template.j2",
      settings: DEFAULT_SETTINGS,
    });
    expect(result.output).toBeNull();
    expect(result.templateError).not.toBeNull();
  });
});
