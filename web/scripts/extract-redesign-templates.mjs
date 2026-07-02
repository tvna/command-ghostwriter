// One-off extractor: reads the prototype's data.js + templates.js (via a window
// shim), then writes each template's data -> assets/examples/<id>.<format> and
// template -> assets/examples/<id>.j2. Run once; the real files become the source
// of truth and this script can stay for reproducibility.
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";

const REF = "origin/design/redesign-b";
const BASE = "design/redesign-b/project/redesign";
const read = (p) => execSync(`git show ${REF}:${BASE}/${p}`, { encoding: "utf8" });

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read("data.js"), sandbox);
vm.runInContext(read("templates.js"), sandbox);

const examplesDir = "assets/examples";
mkdirSync(examplesDir, { recursive: true });
for (const t of sandbox.window.CGTemplates) {
  writeFileSync(`${examplesDir}/${t.id}.${t.format}`, t.data.replace(/\s*$/, "") + "\n");
  writeFileSync(`${examplesDir}/${t.id}.j2`, t.template.replace(/\s*$/, "") + "\n");
  console.log(`wrote ${t.id}.${t.format} + ${t.id}.j2`);
}
