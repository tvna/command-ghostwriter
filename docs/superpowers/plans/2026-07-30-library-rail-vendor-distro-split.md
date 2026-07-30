# Library Rail Vendor/Distro Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the Library left category rail's flat `ネットワーク機器` and `サーバ / Linux` entries into 14 (13 vendors + common) and 3 (common/Debian系/RHEL系) entries respectively, grouped under section headings, using the `subCategory` data already migrated in PR #611.

**Architecture:** Replace the rail's `CATS: {id: TemplateCategory | 'all', ...}[]` array with `RAIL: RailEntry[]`, where each entry carries a `filter: (t: Template) => boolean` predicate instead of relying on raw `category` equality, plus an optional `group` label for a visual (non-interactive) section heading. `TemplateCard`'s icon lookup, which previously reused `CATS`, is decoupled into its own `CATEGORY_ICON: Record<TemplateCategory, string>` map since rail ids and `TemplateCategory` values diverge once `server`/`network` each become multiple rail entries. `groupBySubCategory`'s category ordering, previously derived from `CATS`, moves to its own `DOMAIN_ORDER: TemplateCategory[]` constant for the same reason. One data fix (`aruba-ikev2-vpn` subCategory rename) merges a vendor-naming duplicate.

**Tech Stack:** React 18 + TypeScript (`web/src/components/Library.tsx`), Vitest (`web/src/components/Library.test.tsx`), Python/pytest drift gate (`tests/unit/test_template_taxonomy.py`).

---

## Reference: full rail spec

Approved design: `docs/superpowers/specs/2026-07-30-library-rail-vendor-distro-split-design.md`.

22 rail entries, in order:

| id | label | group | filter (on `Template`) |
|---|---|---|---|
| `all` | すべて | — | `() => true` |
| `network-cisco` | Cisco | ネットワーク機器 | `category==='network' && subCategory==='Cisco'` |
| `network-yamaha` | YAMAHA | ネットワーク機器 | `... subCategory==='YAMAHA'` |
| `network-juniper` | Juniper | ネットワーク機器 | `... subCategory==='Juniper'` |
| `network-fortinet` | Fortinet | ネットワーク機器 | `... subCategory==='Fortinet'` |
| `network-allied-telesis` | Allied Telesis | ネットワーク機器 | `... subCategory==='Allied Telesis'` |
| `network-nec` | NEC | ネットワーク機器 | `... subCategory==='NEC'` |
| `network-arista` | Arista | ネットワーク機器 | `... subCategory==='Arista'` |
| `network-dell` | Dell | ネットワーク機器 | `... subCategory==='Dell'` |
| `network-hpe-aruba` | HPE Aruba | ネットワーク機器 | `... subCategory==='HPE Aruba'` |
| `network-alaxala` | Alaxala | ネットワーク機器 | `... subCategory==='Alaxala'` |
| `network-palo-alto` | Palo Alto Networks | ネットワーク機器 | `... subCategory==='Palo Alto Networks'` |
| `network-sonicwall` | SonicWall | ネットワーク機器 | `... subCategory==='SonicWall'` |
| `network-ubiquiti` | Ubiquiti | ネットワーク機器 | `... subCategory==='Ubiquiti'` |
| `network-common` | ネットワーク機器 (共通) | ネットワーク機器 | `category==='network' &&` not any vendor label above |
| `server-common` | サーバ (共通) | サーバ | `category==='server' &&` subCategory not in `{Debian系, RHEL系}` |
| `server-debian` | サーバ (Debian系) | サーバ | `category==='server' && subCategory==='Debian系'` |
| `server-rhel` | サーバ (RHEL系) | サーバ | `category==='server' && subCategory==='RHEL系'` |
| `dns` | DNS | — | `category==='dns'` |
| `ai` | AIインフラ | — | `category==='ai'` |
| `ops` | 運用共通 | — | `category==='ops'` |
| `facility` | 物理設備 | — | `category==='facility'` |

Expected counts against current `templates.ts` (719 templates total): Cisco 11, YAMAHA 9, Juniper 4, Fortinet 4, Allied Telesis 4, NEC 4, Arista 3, Dell 3, HPE Aruba 4 (after the Aruba merge in Task 6), Alaxala 3, Palo Alto Networks 1, SonicWall 1, Ubiquiti 1, network-common 169, server-common 239, server-debian 22, server-rhel 5, dns 51, ai 117, ops 44, facility 20, all 719.

---

## Task 1: `RailEntry` type + vendor/distro-family data constants

**Files:**
- Modify: `web/src/components/Library.tsx:12-20` (replace `CATS`)

- [ ] **Step 1: Replace the `CATS` array and its type with vendor/distro data constants and a `RailEntry` type**

Replace lines 12-20 (the current `CATS` array) with:

```ts
export interface RailEntry {
  id: string;
  label: string;
  icon: string;
  group?: string;
  filter: (t: Template) => boolean;
}

// Vendor labels must match `subCategory` values in templates.ts exactly.
// Explicit, reviewable list — not derived by scanning templates.ts at
// runtime, same reasoning as the ACTS array below.
const NETWORK_VENDORS: { id: string; label: string }[] = [
  { id: 'cisco', label: 'Cisco' },
  { id: 'yamaha', label: 'YAMAHA' },
  { id: 'juniper', label: 'Juniper' },
  { id: 'fortinet', label: 'Fortinet' },
  { id: 'allied-telesis', label: 'Allied Telesis' },
  { id: 'nec', label: 'NEC' },
  { id: 'arista', label: 'Arista' },
  { id: 'dell', label: 'Dell' },
  { id: 'hpe-aruba', label: 'HPE Aruba' },
  { id: 'alaxala', label: 'Alaxala' },
  { id: 'palo-alto', label: 'Palo Alto Networks' },
  { id: 'sonicwall', label: 'SonicWall' },
  { id: 'ubiquiti', label: 'Ubiquiti' },
];
const NETWORK_VENDOR_LABELS = new Set(NETWORK_VENDORS.map((v) => v.label));
const SERVER_DISTRO_LABELS = new Set(['Debian系', 'RHEL系']);

export const RAIL: RailEntry[] = [
  { id: 'all', label: 'すべて', icon: 'topology', filter: () => true },
  ...NETWORK_VENDORS.map(
    (v): RailEntry => ({
      id: `network-${v.id}`,
      label: v.label,
      icon: 'router',
      group: 'ネットワーク機器',
      filter: (t) => t.category === 'network' && t.subCategory === v.label,
    }),
  ),
  {
    id: 'network-common',
    label: 'ネットワーク機器 (共通)',
    icon: 'router',
    group: 'ネットワーク機器',
    filter: (t) => t.category === 'network' && !NETWORK_VENDOR_LABELS.has(t.subCategory),
  },
  {
    id: 'server-common',
    label: 'サーバ (共通)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && !SERVER_DISTRO_LABELS.has(t.subCategory),
  },
  {
    id: 'server-debian',
    label: 'サーバ (Debian系)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && t.subCategory === 'Debian系',
  },
  {
    id: 'server-rhel',
    label: 'サーバ (RHEL系)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && t.subCategory === 'RHEL系',
  },
  { id: 'dns', label: 'DNS', icon: 'ethernet-port', filter: (t) => t.category === 'dns' },
  { id: 'ai', label: 'AIインフラ', icon: 'terminal', filter: (t) => t.category === 'ai' },
  { id: 'ops', label: '運用共通', icon: 'config-file', filter: (t) => t.category === 'ops' },
  { id: 'facility', label: '物理設備', icon: 'server', filter: (t) => t.category === 'facility' },
];
```

This intentionally does not compile cleanly yet — `CAT_ORDER` (line ~39) and every other `CATS` reference in the file still exist and will break. That's expected; later steps in this task and Task 2/3/5 fix each site. Do not attempt to run `tsc` until Step 2 of this task is also done.

- [ ] **Step 2: Fix the one `CAT_ORDER` reference this task's removal of `CATS` breaks**

`web/src/components/Library.tsx` line 39 currently reads:

```ts
const CAT_ORDER = CATS.map((c) => c.id);
```

Replace it with a domain-order constant independent of the rail (rail ids are no longer `TemplateCategory` values, so `CAT_ORDER` can no longer be derived from the rail array):

```ts
const DOMAIN_ORDER: TemplateCategory[] = ['network', 'server', 'dns', 'ai', 'ops', 'facility'];
```

Then in `groupBySubCategory` (originally line 46), change:

```ts
const sorted = [...list].sort((a, b) => CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category));
```

to:

```ts
const sorted = [...list].sort((a, b) => DOMAIN_ORDER.indexOf(a.category) - DOMAIN_ORDER.indexOf(b.category));
```

- [ ] **Step 3: Confirm the file still has exactly two remaining `CATS` references**

Run: `grep -n "CATS" web/src/components/Library.tsx`
Expected: two matches — the icon lookup inside `TemplateCard` (`CATS.find(...)`, fixed in Task 2) and the rail render loop inside `Library` (`CATS.map(...)`, fixed in Task 5). If `tsc -b` is run now it will fail on both — that's expected until those tasks land; do not run it yet.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/Library.tsx
git commit -m "refactor(library): add RailEntry type and vendor/distro rail data (refs #612)"
```

---

## Task 2: Decouple `TemplateCard`'s icon lookup from the rail

**Files:**
- Modify: `web/src/components/Library.tsx` (`TemplateCard`, originally line 100)

**Why:** `TemplateCard` currently resolves its icon via `CATS.find((c) => c.id === tpl.category)!.icon` — this works today because every `CATS.id` is a real `TemplateCategory` value. After Task 1, `RAIL` has ids like `network-cisco` that never equal `tpl.category` (`"network"`), so that lookup would throw (`.find(...)` returns `undefined`, `!.icon` crashes at runtime). `TemplateCard` needs an icon keyed by the actual domain, independent of how many rail entries that domain is split into.

- [ ] **Step 1: Add a `CATEGORY_ICON` map**

Add directly above the `TemplateCard` function definition (originally around line 75, after `groupBySubCategory`/`countByCategory`/`countByActivity`):

```ts
const CATEGORY_ICON: Record<TemplateCategory, string> = {
  network: 'router',
  server: 'server',
  dns: 'ethernet-port',
  ai: 'terminal',
  ops: 'config-file',
  facility: 'server',
};
```

- [ ] **Step 2: Use it in `TemplateCard`**

Change:

```tsx
<CatIcon name={CATS.find((c) => c.id === tpl.category)!.icon} size={18} color="var(--cg-red)" />
```

to:

```tsx
<CatIcon name={CATEGORY_ICON[tpl.category]} size={18} color="var(--cg-red)" />
```

- [ ] **Step 3: Confirm only one `CATS` reference remains**

Run: `grep -n "CATS" web/src/components/Library.tsx`
Expected: one match — the rail render loop in `Library`, fixed in Task 5.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/Library.tsx
git commit -m "refactor(library): decouple TemplateCard icon lookup from rail entries (refs #612)"
```

---

## Task 3: `countByCategory` — predicate-based instead of raw `category` equality

**Files:**
- Modify: `web/src/components/Library.tsx:63-65` (`countByCategory`)
- Test: `web/src/components/Library.test.tsx:61-77` (`describe("countByCategory", ...)`)

**Why:** `countByCategory`'s current signature (`id: TemplateCategory | 'all'`) can't express "count templates matching the Cisco rail entry" — `t.category === 'network-cisco'` is never true since `category` is always `'network'`. The rail now needs to count by an arbitrary predicate (each `RailEntry.filter`), so `countByCategory` takes a predicate directly. The `'all'` special case disappears — it's just `() => true`.

- [ ] **Step 1: Write the failing tests (replace the existing `countByCategory` describe block)**

In `web/src/components/Library.test.tsx`, replace the `describe("countByCategory", ...)` block (originally lines 61-77) with:

```ts
describe("countByCategory", () => {
  const list = [
    tpl({ id: "1", category: "server" }),
    tpl({ id: "2", category: "server" }),
    tpl({ id: "3", category: "network" }),
  ];

  it("returns the full list length for an always-true predicate", () => {
    expect(countByCategory(list, () => true)).toBe(3);
  });

  it("counts only templates matching the given predicate", () => {
    expect(countByCategory(list, (t) => t.category === "server")).toBe(2);
    expect(countByCategory(list, (t) => t.category === "network")).toBe(1);
    expect(countByCategory(list, (t) => t.category === "dns")).toBe(0);
  });

  it("supports predicates finer than raw category equality", () => {
    const debianOnly = [
      tpl({ id: "d1", category: "server", subCategory: "Debian系" }),
      tpl({ id: "d2", category: "server", subCategory: "RHEL系" }),
    ];
    expect(countByCategory(debianOnly, (t) => t.category === "server" && t.subCategory === "Debian系")).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && bun run test -- Library.test.tsx`
Expected: FAIL — `countByCategory(list, () => true)` doesn't type-check / doesn't behave correctly against the old `(list, id: TemplateCategory | 'all')` signature (a function value is not assignable to `TemplateCategory | 'all'`).

- [ ] **Step 3: Update `countByCategory`'s implementation**

In `web/src/components/Library.tsx`, change (originally lines 63-65):

```ts
export function countByCategory(list: Template[], id: TemplateCategory | 'all'): number {
  return id === 'all' ? list.length : list.filter((t) => t.category === id).length;
}
```

to:

```ts
export function countByCategory(list: Template[], filter: (t: Template) => boolean): number {
  return list.filter(filter).length;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && bun run test -- Library.test.tsx`
Expected: PASS (this will still show other failures from `countByActivity`'s pre-existing tests being unaffected — fine; and from the `Library` component itself not yet updated in Task 5, which is a separate file/task, not covered by these unit tests, since `Library.test.tsx` only imports the three named exports, not the `Library` component itself).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/Library.tsx web/src/components/Library.test.tsx
git commit -m "refactor(library): countByCategory takes a predicate instead of a category id (refs #612)"
```

---

## Task 4: Aruba / HPE Aruba vendor-identity merge (data fix)

**Files:**
- Modify: `web/src/lib/templates.ts:724`
- Modify: `tests/unit/test_template_taxonomy.py:42` (`ALLOWED_SUBCATEGORIES["network"]`)

**Why:** `templates.ts` has both `"Aruba"` (1 template, `aruba-ikev2-vpn`, an ArubaOS branch-gateway template) and `"HPE Aruba"` (3 templates, AOS-CX switch templates) — same vendor (HPE Aruba Networking), different product line. Per the approved design, these merge into one rail entry under `"HPE Aruba"`. This must land before Task 5/7 so the `network-hpe-aruba` rail entry's expected count (4) and Task 7's exhaustiveness tests are correct.

- [ ] **Step 1: Confirm the current state**

Run: `grep -n 'subCategory: "Aruba"' web/src/lib/templates.ts`
Expected: one match, line 724 (`aruba-ikev2-vpn`).

- [ ] **Step 2: Rename the subCategory**

In `web/src/lib/templates.ts` line 724, change:

```ts
{ id: "aruba-ikev2-vpn", name: "Aruba拠点間IKEv2 IPsec VPN構築", desc: "ArubaOSブランチゲートウェイ2拠点間でIKEv2 IPsecトンネルを構成し、暗号プロファイルと疎通を検証する手順書を生成。", category: "network", subCategory: "Aruba", format: "toml", output: "markdown", updated: "2026-07-30", live: true },
```

to (only the `subCategory` value changes):

```ts
{ id: "aruba-ikev2-vpn", name: "Aruba拠点間IKEv2 IPsec VPN構築", desc: "ArubaOSブランチゲートウェイ2拠点間でIKEv2 IPsecトンネルを構成し、暗号プロファイルと疎通を検証する手順書を生成。", category: "network", subCategory: "HPE Aruba", format: "toml", output: "markdown", updated: "2026-07-30", live: true },
```

- [ ] **Step 3: Remove the now-empty `"Aruba"` entry from the Python allow-list**

Run: `grep -n 'subCategory: "Aruba"' web/src/lib/templates.ts` — expected: no matches (confirms no other template still uses the old label; if this shows a match, stop and investigate before continuing, since it means the rename in Step 2 didn't take or another template also used the bare `"Aruba"` label).

In `tests/unit/test_template_taxonomy.py`, remove line 42 (`"Aruba",`) from `ALLOWED_SUBCATEGORIES["network"]` — same rename-not-prune pattern PR #611 used for `"Ubuntu / Debian"`. `"HPE Aruba"` (line 47) is already present and needs no change.

- [ ] **Step 4: Run the drift gate to verify**

Run: `uv run pytest tests/unit/test_template_taxonomy.py -v`
Expected: PASS — every `(category, subCategory)` pair, including the renamed `aruba-ikev2-vpn` now at `("network", "HPE Aruba")`, is in the allow-list.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/templates.ts tests/unit/test_template_taxonomy.py
git commit -m "fix(templates): merge Aruba into HPE Aruba as one vendor identity (refs #612)"
```

---

## Task 5: Rewire the `Library` component to the new rail

**Files:**
- Modify: `web/src/components/Library.tsx` (`Library` function, originally lines 114-186)

- [ ] **Step 1: Change `cat` state type and derive `byCat` via the active rail entry's predicate**

Change (originally lines 122-126):

```ts
export function Library({ onOpen, onClose }: LibraryProps) {
  const [cat, setCat] = React.useState<TemplateCategory | 'all'>('all');
  const [act, setAct] = React.useState<TemplateActivity | 'all'>('all');
  const all = CGTemplates;
  const byCat = cat === 'all' ? all : all.filter((t) => t.category === cat);
```

to:

```ts
export function Library({ onOpen, onClose }: LibraryProps) {
  const [cat, setCat] = React.useState<string>('all');
  const [act, setAct] = React.useState<TemplateActivity | 'all'>('all');
  const all = CGTemplates;
  const activeRail = RAIL.find((r) => r.id === cat) ?? RAIL[0];
  const byCat = all.filter(activeRail.filter);
```

- [ ] **Step 2: Update the `count` helper to pass a predicate**

Change (originally lines 132-134):

```ts
  const byAct = act === 'all' ? all : all.filter((t) => activityOf(t) === act);
  const count = (id: TemplateCategory | 'all') => countByCategory(byAct, id);
  const actCount = (id: TemplateActivity | 'all') => countByActivity(byCat, id);
```

to:

```ts
  const byAct = act === 'all' ? all : all.filter((t) => activityOf(t) === act);
  const count = (entry: RailEntry) => countByCategory(byAct, entry.filter);
  const actCount = (id: TemplateActivity | 'all') => countByActivity(byCat, id);
```

- [ ] **Step 3: Rewrite the rail render loop with group headings**

Change the `<nav>` block's `CATS.map(...)` (originally lines 156-185):

```tsx
          {CATS.map((c) => {
            const on = c.id === cat;
            return (
              <button
                key={c.id}
                onClick={() => { setCat(c.id); setAct('all'); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  background: on ? 'rgba(255,75,75,.1)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 9px',
                  marginBottom: 2,
                  color: on ? 'var(--cg-red-tint)' : 'var(--cg-text)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: on ? 600 : 400,
                  textAlign: 'left',
                }}
              >
                <CatIcon name={c.icon} size={16} color={on ? 'var(--cg-red)' : 'var(--cg-text-muted)'} />
                <span style={{ flex: 1 }}>{c.label}</span>
                <span style={{ fontSize: 11, color: 'var(--cg-text-faint)', fontFamily: 'var(--font-mono)' }}>{count(c.id)}</span>
              </button>
            );
          })}
```

to:

```tsx
          {RAIL.map((entry, i) => {
            const on = entry.id === cat;
            const showGroupHeading = entry.group !== undefined && entry.group !== RAIL[i - 1]?.group;
            return (
              <React.Fragment key={entry.id}>
                {showGroupHeading && (
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      color: 'var(--cg-text-faint)',
                      fontWeight: 700,
                      padding: '10px 9px 2px',
                    }}
                  >
                    {entry.group}
                  </div>
                )}
                <button
                  onClick={() => { setCat(entry.id); setAct('all'); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    background: on ? 'rgba(255,75,75,.1)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 9px',
                    marginBottom: 2,
                    color: on ? 'var(--cg-red-tint)' : 'var(--cg-text)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: on ? 600 : 400,
                    textAlign: 'left',
                  }}
                >
                  <CatIcon name={entry.icon} size={16} color={on ? 'var(--cg-red)' : 'var(--cg-text-muted)'} />
                  <span style={{ flex: 1 }}>{entry.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--cg-text-faint)', fontFamily: 'var(--font-mono)' }}>{count(entry)}</span>
                </button>
              </React.Fragment>
            );
          })}
```

- [ ] **Step 4: Type-check**

Run: `cd web && bunx tsc -b`
Expected: no errors. This is the first point where the full file is internally consistent again — `RAIL`, `RailEntry`, `CATEGORY_ICON`, `DOMAIN_ORDER`, and the predicate-based `countByCategory` all now agree.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/Library.tsx
git commit -m "feat(library): render the 22-entry vendor/distro rail with group headings (refs #612)"
```

---

## Task 6: Rail predicate exclusivity/exhaustiveness tests + real-data count regression

**Files:**
- Modify: `web/src/components/Library.test.tsx`

**Why:** The rail's correctness depends on two invariants no existing test covers: (1) within each split domain (`network`, `server`), every template matches exactly one rail entry's filter (no template falls through every predicate — which would silently vanish from the rail entirely — and no template matches two, which would double-count); (2) the real `templates.ts` data reconciles with the counts recorded in the design doc, so a future template addition that silently breaks a vendor label is caught here instead of only visually in the UI.

- [ ] **Step 1: Write the failing tests**

Add to `web/src/components/Library.test.tsx` (new imports at the top: add `RAIL` to the existing import from `"./Library"`, and import `CGTemplates` from `"../lib/templates"`):

```ts
import { groupBySubCategory, countByCategory, countByActivity, RAIL } from "./Library";
import { CGTemplates } from "../lib/templates";
```

Then add these new `describe` blocks at the end of the file:

```ts
describe("RAIL predicate exclusivity and exhaustiveness", () => {
  const NETWORK_RAIL = RAIL.filter((r) => r.id.startsWith("network-"));
  const SERVER_RAIL = RAIL.filter((r) => r.id.startsWith("server-"));

  it("has exactly 14 network entries and 3 server entries", () => {
    expect(NETWORK_RAIL).toHaveLength(14);
    expect(SERVER_RAIL).toHaveLength(3);
  });

  it("every network template matches exactly one network rail entry", () => {
    const networkTemplates = CGTemplates.filter((t) => t.category === "network");
    for (const t of networkTemplates) {
      const matches = NETWORK_RAIL.filter((r) => r.filter(t));
      expect(matches, `template ${t.id} (subCategory "${t.subCategory}") matched ${matches.length} network rail entries, want 1`).toHaveLength(1);
    }
  });

  it("every server template matches exactly one server rail entry", () => {
    const serverTemplates = CGTemplates.filter((t) => t.category === "server");
    for (const t of serverTemplates) {
      const matches = SERVER_RAIL.filter((r) => r.filter(t));
      expect(matches, `template ${t.id} (subCategory "${t.subCategory}") matched ${matches.length} server rail entries, want 1`).toHaveLength(1);
    }
  });
});

describe("RAIL counts against real template data", () => {
  const EXPECTED: Record<string, number> = {
    all: 719,
    "network-cisco": 11,
    "network-yamaha": 9,
    "network-juniper": 4,
    "network-fortinet": 4,
    "network-allied-telesis": 4,
    "network-nec": 4,
    "network-arista": 3,
    "network-dell": 3,
    "network-hpe-aruba": 4,
    "network-alaxala": 3,
    "network-palo-alto": 1,
    "network-sonicwall": 1,
    "network-ubiquiti": 1,
    "network-common": 169,
    "server-common": 239,
    "server-debian": 22,
    "server-rhel": 5,
    dns: 51,
    ai: 117,
    ops: 44,
    facility: 20,
  };

  it("each rail entry's count matches the recorded expectation", () => {
    for (const entry of RAIL) {
      const expected = EXPECTED[entry.id];
      expect(expected, `no expected count recorded for rail entry "${entry.id}"`).toBeDefined();
      expect(countByCategory(CGTemplates, entry.filter), `rail entry "${entry.id}"`).toBe(expected);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail (before Task 4/5 land) or pass (if run after)**

Run: `cd web && bun run test -- Library.test.tsx`
Expected: if this task's tests are added before Task 4 (Aruba merge) lands, `network-hpe-aruba` reports 3 (not 4) and `network-common` off by the leftover pre-merge `"Aruba"` label falling into it — FAIL with a clear count mismatch. Since Task 4 already landed earlier in this plan's sequence, expected result here is PASS. If it fails, check task ordering — Task 4 must run before this test is written against real data, or the numbers won't reconcile.

- [ ] **Step 3: If failing, fix — otherwise confirm PASS**

Run: `cd web && bun run test -- Library.test.tsx`
Expected: PASS, all `describe` blocks green.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/Library.test.tsx
git commit -m "test(library): cover rail predicate exclusivity and real-data counts (refs #612)"
```

---

## Task 7: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: TypeScript**

Run: `cd web && bunx tsc -b`
Expected: no errors.

- [ ] **Step 2: Full web test suite**

Run: `cd web && bun run test`
Expected: all tests pass except the pre-existing, unrelated `pyodide-runtime.node.test.ts` failure (documented in PR #611 as needing CI-only wheel vendoring — not caused by this change; confirm it's the *only* failure, if any).

- [ ] **Step 3: Python drift gate and full pytest suite**

Run: `uv run pytest -k 'not e2e' --dist loadfile`
Expected: all pass, including `tests/unit/test_template_taxonomy.py` with the Aruba allow-list change from Task 4.

- [ ] **Step 4: Python lint/type gates (touched `test_template_taxonomy.py`)**

Run: `ruff check tests/unit/test_template_taxonomy.py && mypy tests/unit/test_template_taxonomy.py`
Expected: clean.

- [ ] **Step 5: Manual smoke test**

Start the dev server (`cd web && bun run dev`, or the repo's documented equivalent), open the Library UI, and click through all 22 rail entries. For each, confirm: the displayed grid count matches the `EXPECTED` table in Task 6, no entry shows an empty grid, no entry duplicates another's templates, and the two group headings (`ネットワーク機器`, `サーバ`) render exactly once each, directly above `Cisco` and `サーバ (共通)` respectively. Take a screenshot of at least one vendor view (e.g. `network-cisco`) and one server view (e.g. `server-debian`) as evidence.

- [ ] **Step 6: No commit** (verification only; if any step fails, fix and return to the relevant task's commit step)

---

## Task 8: Push and open the PR

**Files:** none (git/GitHub operations only)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin claude/library-rail-vendor-distro-split-612
```

- [ ] **Step 2: Open the PR**

Base: `develop`. Head: `claude/library-rail-vendor-distro-split-612`. Title: `feat(library): split rail by network vendor and server distro family`. Body must cite `Closes #612` and `Refs #501`, link the design doc (`docs/superpowers/specs/2026-07-30-library-rail-vendor-distro-split-design.md`) at its blob URL on the PR's head branch, and summarize the verification results from Task 7. Check the repo for a PR template before writing the body (`.github/pull_request_template.md` or similar) and mirror its sections if one exists.

- [ ] **Step 3: Subscribe to PR activity**

Subscribe this session to the new PR's activity immediately after creation, per the repository's standing instruction to auto-watch every PR it opens through to a terminal state (merged or closed).

---

## Self-Review Notes

**Spec coverage:** rail model + group headings (Task 1, 5), icon decoupling (Task 2), `countByCategory` predicate change (Task 3), Aruba/HPE Aruba data fix (Task 4), test coverage per the spec's Testing section (Task 6), verification commands (Task 7), commit/push/PR (Task 8) — every section of the design doc has a corresponding task.

**Placeholder scan:** no TBD/TODO; every code step shows complete, copy-pasteable code; test expectations are concrete numbers, not "assert reasonable behavior".

**Type consistency:** `RailEntry` (Task 1) is used identically in Task 2 (`CATEGORY_ICON` keys off `TemplateCategory`, not `RailEntry`, so no overlap), Task 3 (`filter: (t: Template) => boolean` matches `RailEntry.filter`'s type), Task 5 (`RAIL.find`, `count(entry: RailEntry)`), and Task 6 (`RAIL` imported and iterated with the same shape). `countByCategory`'s new signature (`list: Template[], filter: (t: Template) => boolean`) is consistent everywhere it's called after Task 3 (Task 5's `count` helper, Task 6's tests) — no caller still passes a `TemplateCategory | 'all'` value.
