# Library left rail: split network by vendor, server by distro family

Refs #501. Follow-up to PR #611 (`subCategory` data migration). Base branch: develop.

## Summary

PR #611 gave `server` and `network` templates accurate `subCategory` values
(distro family for server, vendor name for network) but the left category
rail in `web/src/components/Library.tsx` never reflected them — it still
shows one flat `サーバ / Linux` entry and one flat `ネットワーク機器` entry,
so the new `subCategory` values only ever surfaced as section headers deep in
the right-hand grid. This spec restructures the rail itself: `server` splits
into 3 top-level entries (共通 / Debian系 / RHEL系) and `network` splits into
14 (13 vendors + 共通), so a user can jump straight to "just Cisco" or "just
RHEL系" from the rail. `dns` / `ai` / `ops` / `facility` are unchanged.

This is a `Library.tsx`-only change. No `TemplateCategory` type change, no
`Template` field change, no `templates.ts` `category` value change, no
Python drift-gate change — `TemplateCategory` is referenced in exactly 3
files (`Library.tsx`, `templates.ts`, `types.ts`) and only the first needs to
change, confirmed by grep before this doc was written.

## Background

- `CATS` in `Library.tsx` is a fixed 7-entry array (`all`, `network`,
  `server`, `dns`, `ai`, `ops`, `facility`) filtered by simple
  `t.category === cat` equality. Rail selection sets `cat: TemplateCategory |
  'all'` state.
- `groupBySubCategory()` already groups the right-hand grid by `(category,
  subCategory)` and needs no change — it's how PR #611's new `subCategory`
  values became visible as section headers in the first place.
- Distro/vendor counts, computed from `templates.ts` directly (not assumed):

  | server (266 total) | count |
  |---|---|
  | 共通 (topic-based, incl. SELinux/AppArmor) | 239 |
  | Debian系 | 22 |
  | RHEL系 | 5 |

  | network (221 total) | count |
  |---|---|
  | 共通 (topic-based: ファイアウォール, IDS・IPS, プロキシ/Web, ...) | 169 |
  | Cisco | 11 |
  | YAMAHA | 9 |
  | Juniper | 4 |
  | Fortinet | 4 |
  | Allied Telesis | 4 |
  | NEC | 4 |
  | Arista | 3 |
  | Dell | 3 |
  | HPE Aruba | 4 (see Aruba/HPE Aruba merge below) |
  | Alaxala | 3 |
  | Palo Alto Networks | 1 |
  | SonicWall | 1 |
  | Ubiquiti | 1 |

- **Aruba / HPE Aruba naming collision.** `templates.ts` has both `"Aruba"`
  (1 template: `aruba-ikev2-vpn`, an ArubaOS branch-gateway IKEv2 VPN
  template) and `"HPE Aruba"` (3 templates: `arubacx-lacp-lag`,
  `arubacx-ospf-neighbor`, `arubacx-bgp-neighbor`, all AOS-CX switch
  templates). Different Aruba product line (branch gateway vs. AOS-CX
  switch) but the same vendor (HPE Aruba Networking). Owner decision: merge
  into one rail entry under the `"HPE Aruba"` label — this is a vendor
  identity grouping, the same principle PR #611 used to fold Ubuntu/Debian
  into `Debian系`. Requires a 1-line `templates.ts` edit
  (`aruba-ikev2-vpn`'s `subCategory: "Aruba"` → `"HPE Aruba"`); no
  `ALLOWED_SUBCATEGORIES` entries need adding since `"HPE Aruba"` is already
  allow-listed.

## Decision

### Rail model: filter predicates + group headings, not raw category equality

Replace the `TemplateCategory | 'all'` equality check with a per-rail-entry
predicate, and add an optional `group` label so entries render under a small
section heading (visual grouping only — every entry is still a flat,
independently clickable rail button; no expand/collapse, no nesting
interaction):

```ts
type RailEntry = {
  id: string;              // rail-local id, NOT necessarily a TemplateCategory value
  label: string;
  icon: string;
  group?: string;           // section heading rendered above this entry when it
                             // differs from the previous entry's group
  filter: (t: Template) => boolean;
};
```

Full rail, in order:

| group | label | filter |
|---|---|---|
| — | すべて | `() => true` |
| ネットワーク機器 | Cisco | `category==='network' && subCategory==='Cisco'` |
| ネットワーク機器 | YAMAHA | `... subCategory==='YAMAHA'` |
| ネットワーク機器 | Juniper | `... subCategory==='Juniper'` |
| ネットワーク機器 | Fortinet | `... subCategory==='Fortinet'` |
| ネットワーク機器 | Allied Telesis | `... subCategory==='Allied Telesis'` |
| ネットワーク機器 | NEC | `... subCategory==='NEC'` |
| ネットワーク機器 | Arista | `... subCategory==='Arista'` |
| ネットワーク機器 | Dell | `... subCategory==='Dell'` |
| ネットワーク機器 | HPE Aruba | `... subCategory==='HPE Aruba'` |
| ネットワーク機器 | Alaxala | `... subCategory==='Alaxala'` |
| ネットワーク機器 | Palo Alto Networks | `... subCategory==='Palo Alto Networks'` |
| ネットワーク機器 | SonicWall | `... subCategory==='SonicWall'` |
| ネットワーク機器 | Ubiquiti | `... subCategory==='Ubiquiti'` |
| ネットワーク機器 | ネットワーク機器 (共通) | `category==='network' && subCategory` not any vendor above |
| サーバ | サーバ (共通) | `category==='server' && subCategory` not in {Debian系, RHEL系} |
| サーバ | サーバ (Debian系) | `category==='server' && subCategory==='Debian系'` |
| サーバ | サーバ (RHEL系) | `category==='server' && subCategory==='RHEL系'` |
| — | DNS | `category==='dns'` |
| — | AIインフラ | `category==='ai'` |
| — | 運用共通 | `category==='ops'` |
| — | 物理設備 | `category==='facility'` |

22 entries total (was 7). The vendor list is a literal array in `Library.tsx`,
not derived by scanning `templates.ts` at runtime — same reasoning as the
existing `ACTS`/`CATS` arrays: an explicit, reviewable list, not implicit
data-driven UI that silently grows when a template is added.

### Side effects of decoupling rail id from `category`

- **Icon lookup.** `TemplateCard` currently resolves an icon via
  `CATS.find(c => c.id === tpl.category)!.icon`. With rail ids no longer
  equal to `TemplateCategory` values (`server` → `server-common` /
  `server-debian` / `server-rhel`, `network` → 14 entries), this breaks.
  Fix: a separate `CATEGORY_ICON: Record<TemplateCategory, string>` map,
  independent of the rail array, used by `TemplateCard`. The rail array keeps
  its own `icon` per entry (all `network` sub-entries reuse the `router`
  icon, all `server` sub-entries reuse `server`, etc.) — visually distinct
  vendors don't need distinct icons, this isn't in scope.
- **Rail `cat` state.** Type changes from `TemplateCategory | 'all'` to
  `string` (rail entry id). `groupBySubCategory`'s `CAT_ORDER` (used only to
  keep same-category sections adjacent in the "すべて" view) stays keyed by
  the real `TemplateCategory`, unaffected.
- **`countByCategory`.** Changes from `id === 'all' ? list.length :
  list.filter(t => t.category === id).length` to applying the matched rail
  entry's `filter` predicate instead of an equality check. Same behavior for
  `dns`/`ai`/`ops`/`facility`/`all` (predicate reduces to the old equality
  check); new behavior only for the split entries.
- **`countByActivity`.** Unaffected — it already filters by `activityOf`,
  independent of the category axis.

### What does not change

- `groupBySubCategory` (right-hand grid section grouping).
- `Template`, `TemplateCategory`, `TemplateActivity` types in `types.ts`.
- `category` values in `templates.ts` (still `"network"` / `"server"`, never
  `"server-debian"` etc. — the split is a rail-presentation concept only).
- `tests/unit/test_template_taxonomy.py` / `ALLOWED_SUBCATEGORIES` — no new
  or renamed sub-category values except the Aruba merge, and `"HPE Aruba"` is
  already allow-listed from PR #611.
- Activity chips (`ACTS`) and the 目的 filter row.

## Data change

`web/src/lib/templates.ts`: `aruba-ikev2-vpn` — `subCategory: "Aruba"` →
`"HPE Aruba"`. One line, one template, no other field touched.

## Testing

- Extend `Library.test.tsx` (added in PR #611): a case per rail predicate
  that asserts it selects exactly the expected `id` set for at least one
  representative template per vendor/family, plus a case that the 14 network
  filters and 3 server filters are mutually exclusive and jointly exhaustive
  over their respective category (no template falls through every predicate,
  no template matches two).
- `countByCategory`/`countByActivity` unit tests updated for the new rail
  entries (already unit-tested per PR #611; extend, don't replace).
- `tsc -b`, `bun run test`, `pytest tests/unit/test_template_taxonomy.py`
  (should be a no-op pass — no allow-list change beyond the pre-existing HPE
  Aruba entry).
- Manual smoke: open Library UI, click through all 22 rail entries, confirm
  counts match the table above and no entry is empty/duplicated; confirm
  group headings render only once per group (not once per entry).

## Issue tracking

New GitHub issue to be opened (this spec's tracking issue), referencing
#501 and this design doc. Separate PR from #611 — #611 stays scoped to the
`subCategory` data migration only, per prior owner decision not to touch
`Library.tsx` UI structure in that PR.
