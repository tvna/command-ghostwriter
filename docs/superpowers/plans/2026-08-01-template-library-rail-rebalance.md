# Template Library Rail Label Rebalance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 4 template-library left-rail labels that are >= 50 items (`server-common` 216, `network-common` 123, `ai` 114, `middleware` 88) into 13 smaller sub-labels, all under 50, without touching template data.

**Architecture:** Pure `web/src/components/Library.tsx` presentation change. Each new rail entry is a `RailEntry.filter` predicate combining `t.category === '<domain>'` with `Set`-membership (or, for one bucket per bucket, negation) checks against the existing `t.subCategory` string — the same mechanism `NETWORK_VENDORS`/`SERVER_SPLIT_LABELS` already use. `templates.ts`, `types.ts`, and `tests/unit/test_template_taxonomy.py` are not modified.

**Tech Stack:** React + TypeScript (Vite), Vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-08-01-template-library-rail-rebalance-design.md`
**Issue:** #631 (refs #501)

---

## File Structure

- Modify: `web/src/components/Library.tsx` — add cluster `Set` constants, replace 4 flat `RailEntry` objects with 13 grouped ones, add 2 new rail `group` headings (`AIインフラ`, `ミドルウェア`).
- Modify: `web/src/components/Library.test.tsx` — update `EXPECTED` count table, extend "RAIL predicate exclusivity and exhaustiveness" coverage to `middleware`/`ai`.

No other file changes. Confirmed by grep: no other source file under `web/src` or `web/e2e` references the rail ids/labels being changed.

---

### Task 1: Split `network-common` (123) into 3 labels

**Files:**
- Modify: `web/src/components/Library.tsx:39-40` (add constants), `:53-59` (replace one entry with three)
- Test: `web/src/components/Library.test.tsx:109-133` (exclusivity/exhaustiveness), `:135-170` (EXPECTED counts)

- [x] **Step 1: Update the failing test — network rail count and EXPECTED table**

In `web/src/components/Library.test.tsx`, inside `describe("RAIL predicate exclusivity and exhaustiveness", ...)`, replace the combined length assertion with one `it` per category (this also prepares slots for Task 2-4 without touching them yet):

```ts
  it("has exactly 17 network entries", () => {
    expect(NETWORK_RAIL).toHaveLength(17);
  });

  it("has exactly 4 server entries", () => {
    expect(SERVER_RAIL).toHaveLength(4);
  });
```

This replaces the existing:

```ts
  it("has exactly 15 network entries and 4 server entries", () => {
    expect(NETWORK_RAIL).toHaveLength(15);
    expect(SERVER_RAIL).toHaveLength(4);
  });
```

Then, in the `EXPECTED` object inside `describe("RAIL counts against real template data", ...)`, replace:

```ts
    "network-common": 123,
```

with:

```ts
    "network-common-security": 47,
    "network-common-vpn": 41,
    "network-common-other": 35,
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd web && bun run test -- Library.test.tsx`
Expected: FAIL — `NETWORK_RAIL` has length 15 (not 17); `no expected count recorded for rail entry "network-common"` (the old id no longer has a matching `EXPECTED` key once Library.tsx changes, but right now Library.tsx is unchanged, so instead the failure is `countByCategory(...)` for the now-undefined `EXPECTED["network-common"]` — confirm the actual reported failure mentions `network-common-security`/`network-common-vpn`/`network-common-other` not being defined, or the length-17 assertion failing with actual 15.

- [x] **Step 3: Implement — add cluster constants and split the rail entry**

In `web/src/components/Library.tsx`, after line 40 (`const SERVER_SPLIT_LABELS = new Set(['Debian系', 'RHEL系', 'コンテナ']);`), add:

```ts
// network-common sub-clusters (each < 50 templates; see
// docs/superpowers/specs/2026-08-01-template-library-rail-rebalance-design.md).
// Disjoint by construction; ネットワーク機器 (基盤・その他) is the residual
// catch-all for every non-vendor subCategory not in the two sets below.
const NETWORK_SECURITY = new Set(['IDS・IPS', 'トラフィック分析', 'パケット解析', '監視']);
const NETWORK_VPN = new Set(['オーバーレイVPN', 'ZTNAオーバーレイ', 'トンネリング']);
```

Then replace this entry (lines 53-59):

```ts
  {
    id: 'network-common',
    label: 'ネットワーク機器 (共通)',
    icon: 'router',
    group: 'ネットワーク機器',
    filter: (t) => t.category === 'network' && !NETWORK_VENDOR_LABELS.has(t.subCategory),
  },
```

with:

```ts
  {
    id: 'network-common-security',
    label: 'ネットワーク機器 (セキュリティ監視)',
    icon: 'router',
    group: 'ネットワーク機器',
    filter: (t) => t.category === 'network' && NETWORK_SECURITY.has(t.subCategory),
  },
  {
    id: 'network-common-vpn',
    label: 'ネットワーク機器 (VPN・オーバーレイ)',
    icon: 'router',
    group: 'ネットワーク機器',
    filter: (t) => t.category === 'network' && NETWORK_VPN.has(t.subCategory),
  },
  {
    id: 'network-common-other',
    label: 'ネットワーク機器 (基盤・その他)',
    icon: 'router',
    group: 'ネットワーク機器',
    filter: (t) =>
      t.category === 'network' &&
      !NETWORK_VENDOR_LABELS.has(t.subCategory) &&
      !NETWORK_SECURITY.has(t.subCategory) &&
      !NETWORK_VPN.has(t.subCategory),
  },
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd web && bun run test -- Library.test.tsx`
Expected: PASS (all tests in the file, including the still-unmodified server/middleware/ai assertions, which are untouched by this task).

- [x] **Step 5: Type-check**

Run: `cd web && bunx tsc -b`
Expected: exit 0, no errors.

- [x] **Step 6: Commit**

```bash
git add web/src/components/Library.tsx web/src/components/Library.test.tsx
git commit -m "$(cat <<'EOF'
refactor(library): split network-common rail label into 3 sub-50 labels

Refs #631
EOF
)"
```

---

### Task 2: Split `server-common` (216) into 5 labels

**Files:**
- Modify: `web/src/components/Library.tsx` (add constants after the Task 1 constants; replace the `server-common` entry)
- Test: `web/src/components/Library.test.tsx` (server rail count, EXPECTED counts)

- [x] **Step 1: Update the failing test**

In `Library.test.tsx`, replace:

```ts
  it("has exactly 4 server entries", () => {
    expect(SERVER_RAIL).toHaveLength(4);
  });
```

with:

```ts
  it("has exactly 8 server entries", () => {
    expect(SERVER_RAIL).toHaveLength(8);
  });
```

In the `EXPECTED` object, replace:

```ts
    "server-common": 216,
```

with:

```ts
    "server-common-identity": 38,
    "server-common-prevention": 43,
    "server-common-detection": 39,
    "server-common-audit": 49,
    "server-common-ops": 47,
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd web && bun run test -- Library.test.tsx`
Expected: FAIL — `SERVER_RAIL` has length 4 (not 8); `EXPECTED["server-common-identity"]` etc. undefined while `RAIL` still has an entry with id `server-common`.

- [x] **Step 3: Implement**

In `Library.tsx`, after the `NETWORK_VPN` constant added in Task 1, add:

```ts
// server-common sub-clusters — same disjoint-with-residual-catch-all pattern.
// サーバ (基盤運用) is the residual catch-all for every server subCategory not
// in SERVER_SPLIT_LABELS and not in the four sets below.
const SERVER_IDENTITY = new Set(['IAM・SSO', '認証', '証明書', 'sudo', 'パーミッション', 'ユーザー管理']);
const SERVER_PREVENTION = new Set(['侵入対策', 'シークレット管理', 'SELinux', 'AppArmor']);
const SERVER_DETECTION = new Set(['SIEM・HIDS', 'EDR・フォレンジック']);
const SERVER_AUDIT = new Set(['適合性監査', '資産・状態管理', 'ディスク管理', 'バックアップ', 'ログ運用']);
```

Then replace the `server-common` entry:

```ts
  {
    id: 'server-common',
    label: 'サーバ (共通)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && !SERVER_SPLIT_LABELS.has(t.subCategory),
  },
```

with:

```ts
  {
    id: 'server-common-identity',
    label: 'サーバ (ID・アクセス管理)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && SERVER_IDENTITY.has(t.subCategory),
  },
  {
    id: 'server-common-prevention',
    label: 'サーバ (予防・防御)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && SERVER_PREVENTION.has(t.subCategory),
  },
  {
    id: 'server-common-detection',
    label: 'サーバ (検知・対応)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && SERVER_DETECTION.has(t.subCategory),
  },
  {
    id: 'server-common-audit',
    label: 'サーバ (監査・資産)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && SERVER_AUDIT.has(t.subCategory),
  },
  {
    id: 'server-common-ops',
    label: 'サーバ (基盤運用)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) =>
      t.category === 'server' &&
      !SERVER_SPLIT_LABELS.has(t.subCategory) &&
      !SERVER_IDENTITY.has(t.subCategory) &&
      !SERVER_PREVENTION.has(t.subCategory) &&
      !SERVER_DETECTION.has(t.subCategory) &&
      !SERVER_AUDIT.has(t.subCategory),
  },
```

(`server-debian` / `server-rhel` / `server-container` entries immediately following stay unchanged.)

- [x] **Step 4: Run tests to verify they pass**

Run: `cd web && bun run test -- Library.test.tsx`
Expected: PASS.

- [x] **Step 5: Type-check**

Run: `cd web && bunx tsc -b`
Expected: exit 0.

- [x] **Step 6: Commit**

```bash
git add web/src/components/Library.tsx web/src/components/Library.test.tsx
git commit -m "$(cat <<'EOF'
refactor(library): split server-common rail label into 5 sub-50 labels

Refs #631
EOF
)"
```

---

### Task 3: Split `middleware` (88) into 3 labels

**Files:**
- Modify: `web/src/components/Library.tsx` (add constant; replace the `middleware` entry; add `MIDDLEWARE_RAIL` const in test)
- Test: `web/src/components/Library.test.tsx`

- [x] **Step 1: Update the failing test**

In `Library.test.tsx`, inside `describe("RAIL predicate exclusivity and exhaustiveness", ...)`, add a new const alongside `NETWORK_RAIL`/`SERVER_RAIL`:

```ts
  const MIDDLEWARE_RAIL = RAIL.filter((r) => r.id.startsWith("middleware-"));
```

Add a new length test after the "has exactly 8 server entries" test:

```ts
  it("has exactly 3 middleware entries", () => {
    expect(MIDDLEWARE_RAIL).toHaveLength(3);
  });
```

Add a new exhaustiveness test after the "every server template matches exactly one server rail entry" test:

```ts
  it("every middleware template matches exactly one middleware rail entry", () => {
    const middlewareTemplates = CGTemplates.filter((t) => t.category === "middleware");
    for (const t of middlewareTemplates) {
      const matches = MIDDLEWARE_RAIL.filter((r) => r.filter(t));
      expect(matches, `template ${t.id} (subCategory "${t.subCategory}") matched ${matches.length} middleware rail entries, want 1`).toHaveLength(1);
    }
  });
```

In the `EXPECTED` object, replace:

```ts
    middleware: 88,
```

with:

```ts
    "middleware-unbound": 21,
    "middleware-dns": 30,
    "middleware-services": 37,
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd web && bun run test -- Library.test.tsx`
Expected: FAIL — `MIDDLEWARE_RAIL` has length 0 (not 3, since `RAIL` still has one entry with id exactly `middleware`, which does not start with `"middleware-"`); the new exhaustiveness test fails with every middleware template matching 0 entries.

- [x] **Step 3: Implement**

In `Library.tsx`, after the `SERVER_AUDIT` constant added in Task 2, add:

```ts
// middleware sub-clusters. Unbound (21 templates) is large enough to need
// its own entry; ミドルウェア (DNS共通) covers the rest of the DNS
// product/ops subCategories; ミドルウェア (ネットワークサービス) is the
// residual catch-all (プロキシ/Webサーバ/ロードバランサ/メール/データベース).
const MIDDLEWARE_DNS_COMMON = new Set([
  'BIND',
  'BIND冗長化',
  'DNSSEC',
  'DNS切り分け',
  'DNS切替',
  'PowerDNS',
  'dnsmasq',
  'レコード管理',
  '動的更新',
  '暗号化DNS',
  '監視',
]);
```

Then replace this entry:

```ts
  { id: 'middleware', label: 'ミドルウェア', icon: 'ethernet-port', group: 'その他', filter: (t) => t.category === 'middleware' },
```

with:

```ts
  {
    id: 'middleware-unbound',
    label: 'ミドルウェア (Unbound)',
    icon: 'ethernet-port',
    group: 'ミドルウェア',
    filter: (t) => t.category === 'middleware' && t.subCategory === 'Unbound',
  },
  {
    id: 'middleware-dns',
    label: 'ミドルウェア (DNS共通)',
    icon: 'ethernet-port',
    group: 'ミドルウェア',
    filter: (t) => t.category === 'middleware' && MIDDLEWARE_DNS_COMMON.has(t.subCategory),
  },
  {
    id: 'middleware-services',
    label: 'ミドルウェア (ネットワークサービス)',
    icon: 'ethernet-port',
    group: 'ミドルウェア',
    filter: (t) =>
      t.category === 'middleware' &&
      t.subCategory !== 'Unbound' &&
      !MIDDLEWARE_DNS_COMMON.has(t.subCategory),
  },
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd web && bun run test -- Library.test.tsx`
Expected: PASS.

- [x] **Step 5: Type-check**

Run: `cd web && bunx tsc -b`
Expected: exit 0.

- [x] **Step 6: Commit**

```bash
git add web/src/components/Library.tsx web/src/components/Library.test.tsx
git commit -m "$(cat <<'EOF'
refactor(library): split middleware rail label into 3 sub-50 labels

Refs #631
EOF
)"
```

---

### Task 4: Split `ai` (114) into 3 labels

**Files:**
- Modify: `web/src/components/Library.tsx` (add constants; replace the `ai` entry)
- Test: `web/src/components/Library.test.tsx`

- [x] **Step 1: Update the failing test**

In `Library.test.tsx`, add a new const alongside `MIDDLEWARE_RAIL`:

```ts
  const AI_RAIL = RAIL.filter((r) => r.id.startsWith("ai-"));
```

Add a new length test after "has exactly 3 middleware entries":

```ts
  it("has exactly 3 ai entries", () => {
    expect(AI_RAIL).toHaveLength(3);
  });
```

Add a new exhaustiveness test after "every middleware template matches exactly one middleware rail entry":

```ts
  it("every ai template matches exactly one ai rail entry", () => {
    const aiTemplates = CGTemplates.filter((t) => t.category === "ai");
    for (const t of aiTemplates) {
      const matches = AI_RAIL.filter((r) => r.filter(t));
      expect(matches, `template ${t.id} (subCategory "${t.subCategory}") matched ${matches.length} ai rail entries, want 1`).toHaveLength(1);
    }
  });
```

In the `EXPECTED` object, replace:

```ts
    ai: 114,
```

with:

```ts
    "ai-infra": 34,
    "ai-model": 48,
    "ai-ops": 32,
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd web && bun run test -- Library.test.tsx`
Expected: FAIL — `AI_RAIL` has length 0 (not 3); the new exhaustiveness test fails with every ai template matching 0 entries.

- [x] **Step 3: Implement**

In `Library.tsx`, after the `MIDDLEWARE_DNS_COMMON` constant added in Task 3, add:

```ts
// ai sub-clusters. AIインフラ (運用・ガバナンス) is the residual catch-all
// for every ai subCategory not in the two sets below.
const AI_INFRA = new Set(['GPUクラスタ', 'GPU基盤', 'GPU監視', 'NVIDIA DGX', 'データ基盤', 'ベクトルDB']);
const AI_MODEL = new Set(['モデル管理', '推論サーバ', 'MLOps', 'エージェント基盤']);
```

Then replace this entry:

```ts
  { id: 'ai', label: 'AIインフラ', icon: 'terminal', group: 'その他', filter: (t) => t.category === 'ai' },
```

with:

```ts
  {
    id: 'ai-infra',
    label: 'AIインフラ (基盤・GPU)',
    icon: 'terminal',
    group: 'AIインフラ',
    filter: (t) => t.category === 'ai' && AI_INFRA.has(t.subCategory),
  },
  {
    id: 'ai-model',
    label: 'AIインフラ (モデル・推論)',
    icon: 'terminal',
    group: 'AIインフラ',
    filter: (t) => t.category === 'ai' && AI_MODEL.has(t.subCategory),
  },
  {
    id: 'ai-ops',
    label: 'AIインフラ (運用・ガバナンス)',
    icon: 'terminal',
    group: 'AIインフラ',
    filter: (t) => t.category === 'ai' && !AI_INFRA.has(t.subCategory) && !AI_MODEL.has(t.subCategory),
  },
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd web && bun run test -- Library.test.tsx`
Expected: PASS — all tests in the file green, including the full `EXPECTED` table (all 34 rail entries now accounted for).

- [x] **Step 5: Type-check**

Run: `cd web && bunx tsc -b`
Expected: exit 0.

- [x] **Step 6: Commit**

```bash
git add web/src/components/Library.tsx web/src/components/Library.test.tsx
git commit -m "$(cat <<'EOF'
refactor(library): split ai rail label into 3 sub-50 labels

Refs #631
EOF
)"
```

---

### Task 5: Full-suite verification and manual smoke test

**Files:** none (verification only).

- [ ] **Step 1: Light content spot-check (not a full audit — see design doc §6 risk note)**

Cluster assignment in Tasks 1-4 was derived from `subCategory` names, not individually verified against `.j2` content. Spot-check one template per new cluster (14 total) to catch a grossly wrong grouping before it ships. For each id below, read the listed template's `.j2` body and confirm it plausibly matches the cluster theme:

| cluster | pick one member id from `web/src/lib/templates.ts` | theme to confirm |
|---|---|---|
| network-common-security | any entry with `subCategory: "IDS・IPS"` | intrusion detection/traffic monitoring content |
| network-common-vpn | any entry with `subCategory: "オーバーレイVPN"` | VPN/overlay tunnel content |
| network-common-other | any entry with `subCategory: "ファイアウォール"` | generic firewalld (not a specific vendor) |
| server-common-identity | any entry with `subCategory: "IAM・SSO"` | identity/access management content |
| server-common-prevention | any entry with `subCategory: "侵入対策"` | hardening/prevention content |
| server-common-detection | any entry with `subCategory: "SIEM・HIDS"` | detection/response content |
| server-common-audit | any entry with `subCategory: "適合性監査"` | audit/asset/storage content |
| server-common-ops | any entry with `subCategory: "systemd"` | base ops content |
| middleware-unbound | any entry with `subCategory: "Unbound"` | Unbound resolver content |
| middleware-dns | any entry with `subCategory: "BIND"` | DNS product/ops content |
| middleware-services | any entry with `subCategory: "プロキシ"` | proxy/web/lb/mail/db content |
| ai-infra | any entry with `subCategory: "GPUクラスタ"` | GPU/compute infra content |
| ai-model | any entry with `subCategory: "モデル管理"` | model/serving content |
| ai-ops | any entry with `subCategory: "クラウドAI"` | ops/governance content |

Expected: all 14 spot-checks read as thematically consistent with their cluster. If one is clearly wrong, fix that single template's cluster assignment (move it between the relevant `Set`s in `Library.tsx`) before continuing — do not silently proceed on a known mismatch.

- [ ] **Step 2: Full web test suite**

Run: `cd web && bun run test`
Expected: all files pass (existing suite + updated `Library.test.tsx`), no regressions in unrelated files.

- [ ] **Step 3: Full type check**

Run: `cd web && bunx tsc -b`
Expected: exit 0.

- [ ] **Step 4: Python regression suite**

Run: `uv run pytest -k 'not e2e'`
Expected: all pass, no change expected (`test_template_taxonomy.py` is untouched — this run is a regression safety net per the design doc).

- [ ] **Step 5: Manual browser smoke test**

Start the dev server in the background, then drive it with Playwright (Chromium is pre-installed at `/opt/pw-browsers/chromium`) to open the Library, click every one of the 13 new rail entries, and confirm the displayed count matches this table:

| id | expected count |
|---|---|
| network-common-security | 47 |
| network-common-vpn | 41 |
| network-common-other | 35 |
| server-common-identity | 38 |
| server-common-prevention | 43 |
| server-common-detection | 39 |
| server-common-audit | 49 |
| server-common-ops | 47 |
| middleware-unbound | 21 |
| middleware-dns | 30 |
| middleware-services | 37 |
| ai-infra | 34 |
| ai-model | 48 |
| ai-ops | 32 |

Also confirm: no empty section grid, no duplicate group heading (`ネットワーク機器`/`サーバ`/`ミドルウェア`/`AIインフラ`/`その他` each render exactly once above their first entry), and the `すべて` entry still reads 794.

Run: `cd web && bun run dev &` (background), then drive a Playwright script against `http://localhost:5173` that opens the template library view, iterates the 13 new rail button labels, clicks each, and reads the count badge text next to the active button plus the section grid. Kill the dev server when done.

Expected: every count matches the table above; screenshot evidence saved for the task record.

- [ ] **Step 6: Confirm no stray changes**

Run: `git status --short && git diff --stat origin/develop...HEAD`
Expected: only `web/src/components/Library.tsx` and `web/src/components/Library.test.tsx` differ from `develop` (across all 4 task commits combined).

---

## Post-plan (not part of this plan's tasks)

Once Task 5 passes, open a PR against `develop` referencing #631, subscribe to its activity, and drive it to a mergeable state (CI green, review comments addressed) without merging — per explicit owner instruction to stop short of the merge action itself.
