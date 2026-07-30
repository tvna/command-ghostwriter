# Template Category Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the `server` template category by Linux distro family (`Debian系`/`RHEL系`, locked templates only) and add missing unit test coverage for `Library.tsx`'s grouping/count logic, closing out #501 and #572.

**Architecture:** Pure data + test-vocabulary migration (no new type, field, or UI axis) plus a small, behavior-preserving refactor of two inline closures in `Library.tsx` into exported pure functions so they become unit-testable. Full rationale and the audited migration mapping: `docs/superpowers/specs/2026-07-30-template-category-reorganization-design.md`.

**Tech Stack:** TypeScript (React, Vite, Vitest, `@testing-library/react`), Python (pytest) for the taxonomy drift gate.

---

## Task 1: Confirm baseline is green

**Files:** none (verification only)

- [ ] **Step 1: Run the taxonomy drift gate**

Run: `cd /home/user/command-ghostwriter && uv run pytest tests/unit/test_template_taxonomy.py -v`
Expected: 2 passed (`test_registry_parses`, `test_taxonomy_invariants`)

- [ ] **Step 2: Run the web unit test suite**

Run: `cd /home/user/command-ghostwriter/web && bun run test`
Expected: all existing suites pass (baseline, before any change)

---

## Task 2: Migrate the 27 server template subCategory values

**Files:**
- Modify: `web/src/lib/templates.ts`

This is a mechanical, id-anchored data migration. Use a script rather than manual edits so every substitution is verified against its expected *old* value before being applied (fails loudly on any drift instead of silently overwriting the wrong line) — do not hand-edit the 27 lines individually.

- [ ] **Step 1: Run the migration script**

Run this from the repo root:

```bash
cd /home/user/command-ghostwriter
python3 - <<'PYEOF'
import re
from pathlib import Path

PATH = Path("web/src/lib/templates.ts")

# id -> (expected current subCategory, new subCategory)
MIGRATIONS = {
    "apache-vhost-setup": ("Webサーバ", "Debian系"),
    "apt-repo-pinning": ("パッケージ管理", "Debian系"),
    "cloud-init-first-boot": ("Ubuntu / Debian", "Debian系"),
    "crowdsec-agent-bouncer-setup": ("侵入対策", "Debian系"),
    "haproxy-load-balancer": ("負荷分散", "Debian系"),
    "linux-init": ("Ubuntu / Debian", "Debian系"),
    "logwatch-daily-report": ("ログ運用", "Debian系"),
    "lynis-baseline-drift-triage": ("適合性監査", "Debian系"),
    "lynis-container-image-audit": ("適合性監査", "Debian系"),
    "lynis-pre-audit-drill": ("適合性監査", "Debian系"),
    "node-exporter-setup": ("監視", "Debian系"),
    "openvpn-server-setup": ("VPN", "Debian系"),
    "osquery-differential-logging": ("資産・状態管理", "Debian系"),
    "postfix-send-only": ("メール", "Debian系"),
    "samba-file-server": ("ファイル共有", "Debian系"),
    "squid-forward-proxy": ("プロキシ", "Debian系"),
    "sysstat-sar-recording": ("監視", "Debian系"),
    "trivy-image-scan": ("Docker", "Debian系"),
    "unattended-upgrades-setup": ("Ubuntu / Debian", "Debian系"),
    "wazuh-rule-update-routine": ("SIEM・HIDS", "Debian系"),
    "wireguard-vpn-server": ("VPN", "Debian系"),
    "zabbix-agent-install": ("監視", "Debian系"),
    "dnf-automatic-updates": ("パッケージ管理", "RHEL系"),
    "lynis-hardening-remediation": ("適合性監査", "RHEL系"),
    "ntp-chrony": ("時刻同期", "RHEL系"),
    "ssh-lockout-recovery": ("SSH", "RHEL系"),
    "vuln-patch-triage": ("パッチ・脆弱性", "RHEL系"),
}

lines = PATH.read_text(encoding="utf-8").split("\n")
changed = 0
for i, line in enumerate(lines):
    m = re.search(r'\{ id: "([^"]+)"', line)
    if not m or m.group(1) not in MIGRATIONS:
        continue
    tid = m.group(1)
    old, new = MIGRATIONS[tid]
    needle = f'subCategory: "{old}"'
    if needle not in line:
        raise SystemExit(f"ABORT: {tid}: expected subCategory {old!r} not found on its line -- data drifted since the design doc was written, re-audit before proceeding")
    lines[i] = line.replace(needle, f'subCategory: "{new}"', 1)
    changed += 1

if changed != len(MIGRATIONS):
    raise SystemExit(f"ABORT: expected {len(MIGRATIONS)} lines changed, got {changed}")

PATH.write_text("\n".join(lines), encoding="utf-8")
print(f"OK: applied {changed} subCategory migrations")
PYEOF
```

Expected output: `OK: applied 27 subCategory migrations`

- [ ] **Step 2: Verify exactly 27 lines changed**

Run: `git diff --stat web/src/lib/templates.ts`
Expected: `1 file changed, 27 insertions(+), 27 deletions(-)`

- [ ] **Step 3: Confirm the drift gate now fails (red)**

Run: `uv run pytest tests/unit/test_template_taxonomy.py -v`
Expected: FAIL — `test_taxonomy_invariants` reports `subCategory 'Debian系' not in the allow-list for category 'server'` (and same for `'RHEL系'`). This confirms the drift gate actually catches an unlisted sub-category, which is the whole point of the gate.

---

## Task 3: Extend the taxonomy allow-list

**Files:**
- Modify: `tests/unit/test_template_taxonomy.py:80-130` (the `"server"` entry in `ALLOWED_SUBCATEGORIES`)

- [ ] **Step 1: Edit the server allow-list**

In `tests/unit/test_template_taxonomy.py`, within `ALLOWED_SUBCATEGORIES["server"]`, remove `"Ubuntu / Debian"` and add `"Debian系"` and `"RHEL系"`:

```python
    "server": frozenset(
        {
            "AWS CLI",
            "AppArmor",
            "Debian系",
            "Docker",
            "EDR・フォレンジック",
            "IAM・SSO",
            "KVM/libvirt",
            "Podman",
            "RHEL系",
            "SELinux",
            "SIEM・HIDS",
            "SSH",
            "VPN",
            "Webサーバ",
            "cron",
            "sudo",
            "systemd",
            "カーネル",
            "コンテナ",
            "シークレット管理",
            "ディスク管理",
            "データベース",
            "ネットワーク設定",
            "バックアップ",
            "パッケージ管理",
            "パッチ・脆弱性",
            "パーミッション",
            "ファイル共有",
            "ブート・起動",
            "プロキシ",
            "メール",
            "ユーザー管理",
            "リリース・デプロイ",
            "ログ保全",
            "ログ運用",
            "侵入対策",
            "名前解決",
            "時刻同期",
            "構成管理",
            "監視",
            "証明書",
            "認証",
            "負荷・性能",
            "負荷分散",
            "資産・状態管理",
            "資産管理",
            "運用ツール",
            "適合性監査",
        }
    ),
```

(This is the full replacement block — `"Ubuntu / Debian"` is gone, `"Debian系"` and `"RHEL系"` are added, everything else is unchanged and re-alphabetized around the two insertions.)

- [ ] **Step 2: Confirm the drift gate passes again (green)**

Run: `uv run pytest tests/unit/test_template_taxonomy.py -v`
Expected: 2 passed

- [ ] **Step 3: Commit the taxonomy migration**

```bash
cd /home/user/command-ghostwriter
git add web/src/lib/templates.ts tests/unit/test_template_taxonomy.py
git commit -m "$(cat <<'EOF'
refactor(templates): split server subCategory by Linux distro family

Reclassify 27 of 266 server templates to Debian系/RHEL系 based on a
full-content audit (core commands genuinely locked to one package-manager
family, not just an incidental mention). SELinux/AppArmor stay as-is.
Renames the existing "Ubuntu / Debian" sub-category (3 templates) into
Debian系 rather than keeping both as near-duplicate labels.

network (52 vendor-tagged entries) and dns/ai/ops/facility were audited
for the same kind of mislabeling; zero issues found, no changes needed.

Refs #501
EOF
)"
```

---

## Task 4: Extract testable pure functions from Library.tsx

**Files:**
- Modify: `web/src/components/Library.tsx`

The grouping function (`groupBySubCategory`) already exists as a module-level pure function but isn't exported. The two rail/chip count functions (`count`, `actCount`) are inline closures inside the `Library` component, capturing `byAct`/`byCat` from render scope, so they can't be unit-tested in isolation. Extract them into exported pure functions with the same logic, then call them from the component. This closes #572's "missing test coverage" follow-up.

- [ ] **Step 1: Export `groupBySubCategory`**

In `web/src/components/Library.tsx`, change:

```ts
function groupBySubCategory(list: Template[]): { key: string; label: string; items: Template[] }[] {
```

to:

```ts
export function groupBySubCategory(list: Template[]): { key: string; label: string; items: Template[] }[] {
```

- [ ] **Step 2: Add exported `countByCategory` / `countByActivity` functions**

Immediately after the `groupBySubCategory` function (after its closing `}`), add:

```ts

export function countByCategory(list: Template[], id: TemplateCategory | 'all'): number {
  return id === 'all' ? list.length : list.filter((t) => t.category === id).length;
}

export function countByActivity(list: Template[], id: TemplateActivity | 'all'): number {
  return id === 'all' ? list.length : list.filter((t) => activityOf(t) === id).length;
}
```

- [ ] **Step 3: Use the extracted functions in the `Library` component**

Find this block inside `export function Library(...)`:

```ts
  const byAct = act === 'all' ? all : all.filter((t) => activityOf(t) === act);
  const count = (id: TemplateCategory | 'all') => (id === 'all' ? byAct.length : byAct.filter((t) => t.category === id).length);
  const actCount = (id: TemplateActivity | 'all') => (id === 'all' ? byCat.length : byCat.filter((t) => activityOf(t) === id).length);
```

Replace it with:

```ts
  const byAct = act === 'all' ? all : all.filter((t) => activityOf(t) === act);
  const count = (id: TemplateCategory | 'all') => countByCategory(byAct, id);
  const actCount = (id: TemplateActivity | 'all') => countByActivity(byCat, id);
```

- [ ] **Step 4: Typecheck**

Run: `cd /home/user/command-ghostwriter/web && bunx tsc -b`
Expected: no errors (this is a pure extraction; behavior and types are unchanged)

---

## Task 5: Add Library.tsx unit test coverage

**Files:**
- Create: `web/src/components/Library.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { groupBySubCategory, countByCategory, countByActivity } from "./Library";
import type { Template } from "../lib/types";

function tpl(overrides: Partial<Template>): Template {
  return {
    id: "t",
    name: "name",
    desc: "desc",
    category: "server",
    subCategory: "監視",
    format: "toml",
    output: "markdown",
    updated: "2026-07-30",
    live: true,
    data: "",
    template: "",
    ...overrides,
  };
}

describe("groupBySubCategory", () => {
  it("keeps the same sub-category name separate across different domains", () => {
    // Regression: #572 found sections were once keyed by subCategory text
    // alone, so "監視" under server and network collapsed into one section.
    const list = [
      tpl({ id: "s1", category: "server", subCategory: "監視" }),
      tpl({ id: "n1", category: "network", subCategory: "監視" }),
    ];
    const groups = groupBySubCategory(list);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.key).sort()).toEqual(["network/監視", "server/監視"]);
  });

  it("orders groups by category order, then by first appearance within a category", () => {
    const list = [
      tpl({ id: "n1", category: "network", subCategory: "VLAN" }),
      tpl({ id: "s1", category: "server", subCategory: "SSH" }),
      tpl({ id: "s2", category: "server", subCategory: "sudo" }),
      tpl({ id: "n2", category: "network", subCategory: "DHCP" }),
    ];
    const groups = groupBySubCategory(list);
    // network sorts before server (CATS order), and within each category,
    // groups appear in first-seen order (VLAN before DHCP; SSH before sudo).
    expect(groups.map((g) => g.key)).toEqual(["network/VLAN", "network/DHCP", "server/SSH", "server/sudo"]);
  });

  it("preserves template order within a group and groups all matching items together", () => {
    const list = [
      tpl({ id: "a", category: "server", subCategory: "SSH" }),
      tpl({ id: "b", category: "server", subCategory: "sudo" }),
      tpl({ id: "c", category: "server", subCategory: "SSH" }),
    ];
    const groups = groupBySubCategory(list);
    const ssh = groups.find((g) => g.key === "server/SSH")!;
    expect(ssh.items.map((t) => t.id)).toEqual(["a", "c"]);
  });
});

describe("countByCategory", () => {
  const list = [
    tpl({ id: "1", category: "server" }),
    tpl({ id: "2", category: "server" }),
    tpl({ id: "3", category: "network" }),
  ];

  it("returns the full list length for 'all'", () => {
    expect(countByCategory(list, "all")).toBe(3);
  });

  it("counts only templates matching the given category", () => {
    expect(countByCategory(list, "server")).toBe(2);
    expect(countByCategory(list, "network")).toBe(1);
    expect(countByCategory(list, "dns")).toBe(0);
  });
});

describe("countByActivity", () => {
  const list = [
    tpl({ id: "1", activity: "build" }),
    tpl({ id: "2" }), // no activity field -- must count as "build" (the documented default)
    tpl({ id: "3", activity: "troubleshoot" }),
  ];

  it("returns the full list length for 'all'", () => {
    expect(countByActivity(list, "all")).toBe(3);
  });

  it("treats a missing activity field as 'build'", () => {
    expect(countByActivity(list, "build")).toBe(2);
  });

  it("counts only templates matching the given activity", () => {
    expect(countByActivity(list, "troubleshoot")).toBe(1);
    expect(countByActivity(list, "drill")).toBe(0);
  });
});
```

- [ ] **Step 2: Run the new test file**

Run: `cd /home/user/command-ghostwriter/web && bunx vitest run src/components/Library.test.tsx`
Expected: all tests pass (7 tests across the 3 describe blocks)

- [ ] **Step 3: Commit**

```bash
cd /home/user/command-ghostwriter
git add web/src/components/Library.tsx web/src/components/Library.test.tsx
git commit -m "$(cat <<'EOF'
test(library): cover groupBySubCategory and rail count logic

Extracts count/actCount from inline Library() closures into exported pure
functions (countByCategory/countByActivity) so they -- and the existing
groupBySubCategory -- can be unit tested directly. No behavior change.

Closes #572
EOF
)"
```

---

## Task 6: Full verification suite

**Files:** none (verification only)

- [ ] **Step 1: Run the full Python test suite**

Run: `cd /home/user/command-ghostwriter && uv run pytest -k 'not e2e' --dist loadfile`
Expected: all pass, no new failures

- [ ] **Step 2: Run the full web test suite**

Run: `cd /home/user/command-ghostwriter/web && bun run test`
Expected: all pass, no new failures

- [ ] **Step 3: Typecheck and build**

Run: `cd /home/user/command-ghostwriter/web && bunx tsc -b`
Expected: no errors

- [ ] **Step 4: Offline render-fidelity check on the 27 changed templates**

Run: `cd /home/user/command-ghostwriter && python3 scripts/local_render_check.py apache-vhost-setup apt-repo-pinning cloud-init-first-boot crowdsec-agent-bouncer-setup haproxy-load-balancer linux-init logwatch-daily-report lynis-baseline-drift-triage lynis-container-image-audit lynis-pre-audit-drill node-exporter-setup openvpn-server-setup osquery-differential-logging postfix-send-only samba-file-server squid-forward-proxy sysstat-sar-recording trivy-image-scan unattended-upgrades-setup wazuh-rule-update-routine wireguard-vpn-server zabbix-agent-install dnf-automatic-updates lynis-hardening-remediation ntp-chrony ssh-lockout-recovery vuln-patch-triage`
Expected: all 27 pass (subCategory is metadata only; template bodies and sample data are untouched, so this is a safety check, not an expected-fix)

- [ ] **Step 5: Repo-standard lint/format gates**

Run: `cd /home/user/command-ghostwriter && uv run ruff check . && uv run mypy .`
Expected: no errors (no Python source changed besides the test file's data dict, which is already covered by the taxonomy test)

- [ ] **Step 6: Manual smoke check of the Library UI**

Run: `cd /home/user/command-ghostwriter/web && bun run dev` (or `vite preview` against a build), open the app, navigate to the template Library, select the "サーバ / Linux" category, and confirm:
- A "Debian系" section and an "RHEL系" section both appear alongside the existing topic sections (SIEM・HIDS, systemd, etc.)
- No empty section headers, no duplicate section headers
- The rail's per-category count next to "サーバ / Linux" still equals 266

Stop the dev server after checking (Ctrl-C).

---

## Task 7: Push and open the PR

**Files:** none (git/GitHub operations only)

- [ ] **Step 1: Push the branch**

Run: `git push -u origin claude/template-category-reorganization-lbd25z`

- [ ] **Step 2: Open the PR**

Use the `mcp__github__create_pull_request` tool (base: `develop`, head: `claude/template-category-reorganization-lbd25z`). Check for a PR template first (`.github/pull_request_template.md` or similar) and follow its section structure if one exists. Body must state:
- Summary of the server distro split (27/266 templates, audit-based, Debian系/RHEL系, SELinux/AppArmor excluded) and the network vendor audit (zero mismatches).
- Reference to the design doc path.
- `Refs #501` and `Closes #572`.
- The verification commands run and their results (from Task 6).

- [ ] **Step 3: Subscribe to PR activity**

Call `subscribe_pr_activity` for the newly opened PR immediately after creation, per this repo's standing instruction to auto-watch every PR it opens. Do not merge — the operator asked to proceed only up to the point right before merge.

---

## Self-review notes (for whoever executes this plan)

- Every server template subCategory change traces to a row in the design
  doc's migration mapping table — if `git diff` after Task 2 doesn't match
  that table exactly, stop and re-check the design doc before continuing.
- Task 2's migration script is intentionally not committed as a permanent
  repo script — it is a one-time id-anchored data migration, not a reusable
  tool.
- If Task 2 Step 1 aborts (`ABORT: ... expected subCategory ... not found`),
  the live `templates.ts` has drifted from what the design doc's audit
  observed (e.g. another PR touched the same template in the meantime). Do
  not force the change — re-read the current line, re-verify against the
  design doc's classification rule, and update the migration table before
  retrying.
