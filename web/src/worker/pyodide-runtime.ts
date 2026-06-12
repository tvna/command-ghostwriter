import type { GenerateRequest, GenerateResult } from "./types";
import { FEATURES_SOURCES } from "./features-sources";

// Minimal structural type for the bits of the Pyodide API we use.
export interface PyodideLike {
  FS: {
    mkdirTree(path: string): void;
    writeFile(path: string, data: string, opts?: { encoding: string }): void;
  };
  loadPackage(names: string[]): Promise<void>;
  runPythonAsync(code: string): Promise<unknown>;
}

export type LoadPyodideFn = (opts: { indexURL: string }) => Promise<PyodideLike>;

// Third-party packages that features/ actually imports. loadPackage resolves
// these and all transitive deps (markupsafe, pydantic_core, typing-extensions,
// annotated-types) from the LOCAL Pyodide distribution at indexURL -- no CDN and
// no PyPI at runtime. The jsdelivr CDN is unreachable in this environment, and
// the WASM wheels (PyYAML, pydantic_core, MarkupSafe) exist only in the Pyodide
// distribution, so the wheels are vendored into the distribution ahead of time
// by scripts/vendor-pyodide-wheels.sh (chardet 5.2.0 is added to the local lock
// there). If a wheel is missing, loadPackage fails loudly -- the truthful signal.
const PY_DEPS = ["jinja2", "pyyaml", "pydantic", "chardet"];

export async function bootstrapRuntime(
  loadPyodide: LoadPyodideFn,
  indexURL: string,
): Promise<PyodideLike> {
  const pyodide = await loadPyodide({ indexURL });

  // Load every features/ dependency from the local distribution (offline).
  await pyodide.loadPackage(PY_DEPS);

  // Mount features/ into the Pyodide FS (single source of truth, written verbatim).
  for (const [relPath, source] of Object.entries(FEATURES_SOURCES)) {
    const dir = relPath.slice(0, relPath.lastIndexOf("/"));
    pyodide.FS.mkdirTree("/" + dir);
    pyodide.FS.writeFile("/" + relPath, source, { encoding: "utf8" });
  }

  await pyodide.runPythonAsync(
    [
      "import sys",
      'if "/" not in sys.path:',
      '    sys.path.insert(0, "/")',
      "import features.core  # fail loudly here if a dep or import is missing",
    ].join("\n"),
  );

  return pyodide;
}

export async function generate(
  pyodide: PyodideLike,
  request: GenerateRequest,
): Promise<GenerateResult> {
  // Double JSON-encode: the inner encodes the request, the outer turns that into a
  // valid Python string literal (JSON and Python share \uXXXX escapes, so non-ASCII
  // and quotes are safe). json.loads() inside Python decodes it -- no code injection.
  const pyPayloadLiteral = JSON.stringify(JSON.stringify(request));
  const code = [
    "import json",
    "from io import BytesIO",
    "from features.core import AppCore",
    `req = json.loads(${pyPayloadLiteral})`,
    "s = req['settings']",
    "config_file = BytesIO(req['configText'].encode('utf-8'))",
    "config_file.name = req['configName']",
    "template_file = BytesIO(req['templateText'].encode('utf-8'))",
    "template_file.name = req['templateName']",
    "core = AppCore('config load failed', 'template load failed')",
    "core.load_config_file(config_file, s['csvRowsName'], s['enableAutoTranscoding'], s['enableFillNan'], s['fillNanWith']).load_template_file(template_file, s['enableAutoTranscoding']).apply(s['formatType'], s['isStrictUndefined'])",
    "config_debug = json.dumps(core.config_dict, indent=2, ensure_ascii=False, default=str) if core.config_dict is not None else ''",
    "json.dumps({'output': core.formatted_text, 'configError': core.config_error_message, 'templateError': core.template_error_message, 'configDebug': config_debug})",
  ].join("\n");
  const resultJson = (await pyodide.runPythonAsync(code)) as string;
  return JSON.parse(resultJson) as GenerateResult;
}
