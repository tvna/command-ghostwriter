# Middleware Category Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `middleware` `TemplateCategory` domain that consolidates the standalone `dns` category (51 templates) with proxy/web-server/load-balancer/mail/database templates currently scattered across `network` (21) and `server` (16), for a total of 88 reclassified templates, closing #615.

**Architecture:** Pure data + type + drift-gate migration (no new type, field, or UI axis; the two-axis `category` x `activity` model from #570/#571/#611 is unchanged). A script-driven `templates.ts` migration (id-anchored, verifies every old value before overwriting, same technique #611 used), a `TemplateCategory`/`ALLOWED_SUBCATEGORIES` update, and a small `Library.tsx` rail-entry swap (`dns` -> `middleware`, same position/group/icon — `groupBySubCategory`/`countByCategory`/`countByActivity` need no change, they are already generic).

**Tech Stack:** TypeScript (React, Vite, Vitest, `@testing-library/react`), Python (pytest) for the taxonomy drift gate.

Full rationale, scope decisions, and the audited migration mapping: `docs/superpowers/specs/2026-07-31-middleware-category-consolidation-design.md`.

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

## Task 2: Migrate `category`/`subCategory` for the 88 templates

**Files:**
- Modify: `web/src/lib/templates.ts`

This is a mechanical, id-anchored data migration covering three groups (see the design doc's Migration mapping section for the full rationale per group). Use a script rather than manual edits so every substitution is verified against its expected *old* value before being applied — do not hand-edit the 88 lines individually.

- [ ] **Step 1: Run the migration script**

Run this from the repo root:

```bash
cd /home/user/command-ghostwriter
python3 - <<'PYEOF'
import re
from pathlib import Path

PATH = Path("web/src/lib/templates.ts")

# Group A: dns -> middleware, subCategory unchanged (51 ids).
DNS_IDS = [
    "dns-zone", "dns-resolve-troubleshoot", "dns-record-migration", "dnsmasq-office-dns",
    "dns-secondary-transfer", "dns-stale-cache-triage", "unbound-cache-resolver",
    "bind-forwarder-config", "reverse-zone-ptr", "dnssec-zone-signing", "dnssec-ksk-rollover",
    "bind-split-dns-views", "bind-recursion-acl", "bind-query-logging", "rndc-operations",
    "nsupdate-dynamic-dns", "dns-over-tls-forwarding", "caa-record-setup",
    "spf-dkim-dmarc-records", "srv-record-design", "wildcard-cname-design",
    "dns-round-robin-lb", "dns-provider-migration", "zone-file-validation",
    "dnsmasq-dhcp-integration", "powerdns-authoritative", "subdomain-delegation",
    "dns-health-monitoring", "bulk-record-registration", "bind-chroot-hardening",
    "dns-manual-failover", "unbound-rpz-threat-blocking", "unbound-dns-over-tls-upstream",
    "unbound-local-zone-split-horizon", "unbound-dnssec-validation-hardening",
    "unbound-access-control-tags", "unbound-query-logging-analytics",
    "unbound-cache-poisoning-hardening", "unbound-response-ratelimit-ddos",
    "unbound-forward-fail-triage", "unbound-dns-tunneling-response",
    "unbound-cache-flush-runbook", "unbound-performance-tuning",
    "unbound-redundant-resolver-drill", "unbound-serve-expired-resilience",
    "unbound-tls-service-listener", "unbound-view-based-policy",
    "unbound-blocklist-automation", "unbound-stub-zone-internal-auth",
    "unbound-config-audit-routine", "unbound-monitoring-metrics",
]
assert len(DNS_IDS) == 51, f"expected 51 dns ids, got {len(DNS_IDS)}"

# Group B: network "プロキシ / Web" -> middleware / "プロキシ" (21 ids).
PROXY_WEB_IDS = [
    "incident-proxy", "squid-ssl-bump-inspection", "squid-category-url-filtering",
    "squid-auth-ldap-integration", "squid-transparent-proxy-setup",
    "squid-cache-peer-hierarchy", "squid-delay-pools-bandwidth", "squid-acl-review-routine",
    "squid-exfil-block-response", "squid-access-denied-triage",
    "squid-cache-tuning-performance", "squid-logformat-siem-shipping",
    "squid-icap-av-integration", "squid-time-based-access", "squid-wpad-pac-deployment",
    "squid-upstream-outage-triage", "squid-proxy-abuse-response", "squid-config-change-drill",
    "squid-connection-limit-hardening", "squid-antivirus-bypass-review",
    "squid-forward-proxy-tls-listener",
]
assert len(PROXY_WEB_IDS) == 21, f"expected 21 network proxy ids, got {len(PROXY_WEB_IDS)}"

# Group C: server -> middleware, per-id subCategory remap (16 ids).
# id -> (expected current subCategory, new subCategory)
SERVER_MIGRATIONS = {
    "squid-forward-proxy": ("Debian系", "プロキシ"),
    "nginx-reverse-proxy": ("Webサーバ", "プロキシ"),
    "apache-vhost-setup": ("Debian系", "Webサーバ"),
    "web-error-log-triage": ("Webサーバ", "Webサーバ"),
    "http-slow-response-triage": ("Webサーバ", "Webサーバ"),
    "haproxy-load-balancer": ("Debian系", "ロードバランサ"),
    "postfix-send-only": ("Debian系", "メール"),
    "mail-delivery-triage": ("メール", "メール"),
    "mail-queue-flush": ("メール", "メール"),
    "mail-blacklist-recovery": ("メール", "メール"),
    "postgresql-pgdump-backup": ("データベース", "データベース"),
    "mysql-dump-restore": ("データベース", "データベース"),
    "mariadb-replication-basics": ("データベース", "データベース"),
    "redis-persistence-config": ("データベース", "データベース"),
    "db-connection-failure-triage": ("データベース", "データベース"),
    "db-slow-query-triage": ("データベース", "データベース"),
}
assert len(SERVER_MIGRATIONS) == 16, f"expected 16 server ids, got {len(SERVER_MIGRATIONS)}"

lines = PATH.read_text(encoding="utf-8").split("\n")
changed = {"dns": 0, "network": 0, "server": 0}

for i, line in enumerate(lines):
    m = re.search(r'\{ id: "([^"]+)"', line)
    if not m:
        continue
    tid = m.group(1)

    if tid in DNS_IDS:
        needle = 'category: "dns"'
        if needle not in line:
            raise SystemExit(f"ABORT: {tid}: expected category 'dns' not found on its line -- data drifted since the design doc was written, re-audit before proceeding")
        lines[i] = line.replace(needle, 'category: "middleware"', 1)
        changed["dns"] += 1

    elif tid in PROXY_WEB_IDS:
        cat_needle = 'category: "network"'
        sub_needle = 'subCategory: "プロキシ / Web"'
        if cat_needle not in line or sub_needle not in line:
            raise SystemExit(f"ABORT: {tid}: expected category 'network' + subCategory 'プロキシ / Web' not found on its line")
        new_line = line.replace(cat_needle, 'category: "middleware"', 1)
        new_line = new_line.replace(sub_needle, 'subCategory: "プロキシ"', 1)
        lines[i] = new_line
        changed["network"] += 1

    elif tid in SERVER_MIGRATIONS:
        old_sub, new_sub = SERVER_MIGRATIONS[tid]
        cat_needle = 'category: "server"'
        sub_needle = f'subCategory: "{old_sub}"'
        if cat_needle not in line or sub_needle not in line:
            raise SystemExit(f"ABORT: {tid}: expected category 'server' + subCategory {old_sub!r} not found on its line")
        new_line = line.replace(cat_needle, 'category: "middleware"', 1)
        new_line = new_line.replace(sub_needle, f'subCategory: "{new_sub}"', 1)
        lines[i] = new_line
        changed["server"] += 1

if changed != {"dns": 51, "network": 21, "server": 16}:
    raise SystemExit(f"ABORT: expected dns=51/network=21/server=16, got {changed}")

PATH.write_text("\n".join(lines), encoding="utf-8")
print(f"OK: applied {sum(changed.values())} category migrations ({changed})")
PYEOF
```

Expected output: `OK: applied 88 category migrations ({'dns': 51, 'network': 21, 'server': 16})`

- [ ] **Step 2: Verify exactly 88 lines changed**

Run: `git diff --stat web/src/lib/templates.ts`
Expected: `1 file changed, 88 insertions(+), 88 deletions(-)`

- [ ] **Step 3: Confirm the drift gate now fails (red)**

Run: `uv run pytest tests/unit/test_template_taxonomy.py -v`
Expected: FAIL — `test_taxonomy_invariants` reports `bad category 'middleware'` for the 88 reassigned entries (the type union / allow-list don't recognize `middleware` yet). This confirms the drift gate actually catches an unrecognized category, which is the whole point of the gate.

- [ ] **Step 4: Confirm the TypeScript compiler now fails (red)**

Run: `cd /home/user/command-ghostwriter/web && bunx tsc -b`
Expected: FAIL — `Type '"middleware"' is not assignable to type 'TemplateCategory'` on the 88 changed lines. Confirms the type system catches the same drift `tsc`-side.

---

## Task 3: Add the `middleware` category to the type and the drift gate

**Files:**
- Modify: `web/src/lib/types.ts`
- Modify: `tests/unit/test_template_taxonomy.py`

- [ ] **Step 1: Update `TemplateCategory`**

In `web/src/lib/types.ts`, change:

```ts
export type TemplateCategory = "network" | "server" | "dns" | "ai" | "ops" | "facility";
```

to:

```ts
export type TemplateCategory = "network" | "server" | "middleware" | "ai" | "ops" | "facility";
```

- [ ] **Step 2: Update `CATEGORIES` in the drift gate**

In `tests/unit/test_template_taxonomy.py`, change:

```python
CATEGORIES: Final[frozenset[str]] = frozenset({"network", "server", "dns", "ai", "ops", "facility"})
```

to:

```python
CATEGORIES: Final[frozenset[str]] = frozenset({"network", "server", "middleware", "ai", "ops", "facility"})
```

- [ ] **Step 3: Prune `network`'s allow-list**

In `tests/unit/test_template_taxonomy.py`, within `ALLOWED_SUBCATEGORIES["network"]`, remove the `"プロキシ / Web",` line (between `"ブリッジ",` and `"ポート確認",`). The block goes from 38 to 37 entries.

- [ ] **Step 4: Prune `server`'s allow-list**

In `tests/unit/test_template_taxonomy.py`, within `ALLOWED_SUBCATEGORIES["server"]`, remove these five lines: `"Webサーバ",`, `"データベース",`, `"プロキシ",`, `"メール",`, `"負荷分散",`. The block goes from 48 to 43 entries. This is the full replacement block:

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
            "cron",
            "sudo",
            "systemd",
            "カーネル",
            "コンテナ",
            "シークレット管理",
            "ディスク管理",
            "ネットワーク設定",
            "バックアップ",
            "パッケージ管理",
            "パッチ・脆弱性",
            "パーミッション",
            "ファイル共有",
            "ブート・起動",
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
            "資産・状態管理",
            "資産管理",
            "運用ツール",
            "適合性監査",
        }
    ),
```

- [ ] **Step 5: Replace the `"dns"` entry with `"middleware"`**

In `tests/unit/test_template_taxonomy.py`, replace the entire `"dns"` block:

```python
    "dns": frozenset(
        {
            "BIND",
            "BIND冗長化",
            "DNSSEC",
            "DNS切り分け",
            "DNS切替",
            "PowerDNS",
            "Unbound",
            "dnsmasq",
            "レコード管理",
            "動的更新",
            "暗号化DNS",
            "監視",
        }
    ),
```

with:

```python
    "middleware": frozenset(
        {
            "BIND",
            "BIND冗長化",
            "DNSSEC",
            "DNS切り分け",
            "DNS切替",
            "PowerDNS",
            "Unbound",
            "dnsmasq",
            "Webサーバ",
            "データベース",
            "プロキシ",
            "メール",
            "ロードバランサ",
            "レコード管理",
            "動的更新",
            "暗号化DNS",
            "監視",
        }
    ),
```

(Same dict position, between `"server"` and `"ai"`. 12 original dns values plus 5 new ones: `Webサーバ`, `データベース`, `プロキシ`, `ロードバランサ`, `メール` — 17 total.)

- [ ] **Step 6: Confirm the Python drift gate passes again (green)**

Run: `uv run pytest tests/unit/test_template_taxonomy.py -v`
Expected: 2 passed

- [ ] **Step 7: Confirm TypeScript compiles (green)**

Run: `cd /home/user/command-ghostwriter/web && bunx tsc -b`
Expected: no errors

- [ ] **Step 8: Commit the taxonomy migration**

```bash
cd /home/user/command-ghostwriter
git add web/src/lib/templates.ts web/src/lib/types.ts tests/unit/test_template_taxonomy.py
git commit -m "$(cat <<'EOF'
feat(templates): consolidate dns/proxy/web/lb/mail/db under middleware category

Add a middleware TemplateCategory domain and move 88 templates into it: the
full former dns category (51, unchanged subCategory), network's "プロキシ /
Web" entries (21, renamed to "プロキシ"), and 16 server templates covering
proxy (squid-forward-proxy, nginx-reverse-proxy), web server
(apache-vhost-setup + 2 troubleshoot templates), load balancer
(haproxy-load-balancer), mail (postfix-send-only + 3 troubleshoot
templates), and database (6 PostgreSQL/MySQL/MariaDB/Redis templates).

Four of these (squid-forward-proxy, postfix-send-only, apache-vhost-setup,
haproxy-load-balancer) lose the Debian系 label #611 gave them 1 day ago --
an accepted trade-off, not an oversight, since the software-topic axis is
now more useful than the distro-lock axis for these four (see the design
doc for the full rationale).

Prunes network's "プロキシ / Web" and server's "プロキシ"/"メール"/
"Webサーバ"/"データベース"/"負荷分散" from the drift-gate allow-lists --
unlike #611's keep-for-future-reuse labels, these are fully superseded by
middleware, not generic topics that still belong in their old domain.

Refs #501, #611, #615
EOF
)"
```

---

## Task 4: Update `Library.tsx`'s rail entry

**Files:**
- Modify: `web/src/components/Library.tsx`

- [ ] **Step 1: Replace the `dns` rail entry**

In `web/src/components/Library.tsx`, change:

```ts
  { id: 'dns', label: 'DNS', icon: 'ethernet-port', group: 'その他', filter: (t) => t.category === 'dns' },
```

to:

```ts
  { id: 'middleware', label: 'ミドルウェア', icon: 'ethernet-port', group: 'その他', filter: (t) => t.category === 'middleware' },
```

(Same position — first entry in the `その他` group, right after `server-rhel` — and same icon.)

- [ ] **Step 2: Update `DOMAIN_ORDER`**

Change:

```ts
const DOMAIN_ORDER: TemplateCategory[] = ['network', 'server', 'dns', 'ai', 'ops', 'facility'];
```

to:

```ts
const DOMAIN_ORDER: TemplateCategory[] = ['network', 'server', 'middleware', 'ai', 'ops', 'facility'];
```

- [ ] **Step 3: Update `CATEGORY_ICON`**

Change:

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

to:

```ts
const CATEGORY_ICON: Record<TemplateCategory, string> = {
  network: 'router',
  server: 'server',
  middleware: 'ethernet-port',
  ai: 'terminal',
  ops: 'config-file',
  facility: 'server',
};
```

- [ ] **Step 4: Typecheck**

Run: `cd /home/user/command-ghostwriter/web && bunx tsc -b`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd /home/user/command-ghostwriter
git add web/src/components/Library.tsx
git commit -m "$(cat <<'EOF'
refactor(library): swap the dns rail entry for middleware

Same position, group, and icon as the former dns entry -- the rail filter
now matches category === 'middleware' (88 templates: DNS + the newly
consolidated proxy/web-server/load-balancer/mail/database templates).
groupBySubCategory/countByCategory/countByActivity need no change, they
are already generic over whatever category/subCategory values appear.

Refs #615
EOF
)"
```

---

## Task 5: Update `Library.test.tsx`

**Files:**
- Modify: `web/src/components/Library.test.tsx`

- [ ] **Step 1: Fix the synthetic-list predicate test**

In `web/src/components/Library.test.tsx`, change (inside `describe("countByCategory")`, the `"counts only templates matching the given predicate"` test):

```ts
    expect(countByCategory(list, (t) => t.category === "dns")).toBe(0);
```

to:

```ts
    expect(countByCategory(list, (t) => t.category === "middleware")).toBe(0);
```

(The fixture `list` only contains `server`/`network` items, so this still asserts "a category absent from the list counts as 0" — same intent, valid category literal.)

- [ ] **Step 2: Update the real-data `EXPECTED` count table**

In `web/src/components/Library.test.tsx`, inside `describe("RAIL counts against real template data")`, replace the `EXPECTED` object:

```ts
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
```

with:

```ts
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
    "network-common": 148,
    "server-common": 227,
    "server-debian": 18,
    "server-rhel": 5,
    middleware: 88,
    ai: 117,
    ops: 44,
    facility: 20,
  };
```

Only 5 values change: `network-common` (169 -> 148, the 21 proxy templates leave `network`), `server-common` (239 -> 227, 12 of the 16 server-origin templates were non-distro-labeled), `server-debian` (22 -> 18, the 4 templates that lose their `Debian系` label per Task 3), `dns` key renamed to `middleware` (51 -> 88). Vendor counts, `server-rhel`, `all`, `ai`, `ops`, `facility` are unaffected.

- [ ] **Step 3: Run the updated test file**

Run: `cd /home/user/command-ghostwriter/web && bunx vitest run src/components/Library.test.tsx`
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
cd /home/user/command-ghostwriter
git add web/src/components/Library.test.tsx
git commit -m "$(cat <<'EOF'
test(library): update RAIL/count expectations for the middleware category

Refs #615
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

- [ ] **Step 4: Offline render-fidelity check on the full library**

Run: `cd /home/user/command-ghostwriter && python3 scripts/local_render_check.py`
Expected: all pairs pass (no arguments = checks every `assets/examples/*.j2` pair; this change only touches `category`/`subCategory` metadata in `templates.ts`, not template bodies or sample data, so this is a safety net, not an expected-fix)

- [ ] **Step 5: Repo-standard lint/format gates**

Run: `cd /home/user/command-ghostwriter && uv run ruff check . && uv run mypy .`
Expected: no errors (no Python source changed besides the taxonomy test's data dict, already covered by the taxonomy test itself)

- [ ] **Step 6: Manual smoke check of the Library UI**

Run: `cd /home/user/command-ghostwriter/web && bun run dev` (or `vite preview` against a build), open the app, navigate to the template Library, and confirm:
- The left rail shows "ミドルウェア" where "DNS" used to be, with count 88
- Selecting it shows sections for BIND / BIND冗長化 / DNSSEC / DNS切り分け / DNS切替 / PowerDNS / Unbound / dnsmasq / レコード管理 / 動的更新 / 暗号化DNS / 監視 (the former dns sections) plus プロキシ / Webサーバ / ロードバランサ / メール / データベース, with no empty or duplicate section headers
- "ネットワーク機器 (共通)" count dropped from 169 to 148
- "サーバ (共通)" count dropped from 239 to 227, "サーバ (Debian系)" dropped from 22 to 18
- No console errors

Stop the dev server after checking (Ctrl-C).

---

## Task 7: Push and open the PR

**Files:** none (git/GitHub operations only)

- [ ] **Step 1: Push the branch**

Run: `git push -u origin claude/template-structure-reorganize-jy3wfw`

- [ ] **Step 2: Open the PR**

Use the `mcp__github__create_pull_request` tool (base: `develop`, head: `claude/template-structure-reorganize-jy3wfw`). Check for a PR template first (`.github/pull_request_template.md` or similar) and follow its section structure if one exists. Body must state:
- Summary: new `middleware` category consolidating dns (51) + network proxy (21) + server proxy/web/lb/mail/db (16) = 88 templates.
- The explicit trade-off: 4 templates lose the `Debian系` label #611 gave them a day earlier, and why.
- Reference to the design doc path (`docs/superpowers/specs/2026-07-31-middleware-category-consolidation-design.md`).
- `Refs #501, #611` and `Closes #615`.
- The verification commands run and their results (from Task 6).

- [ ] **Step 3: Subscribe to PR activity**

Call `subscribe_pr_activity` for the newly opened PR immediately after creation, per this repo's standing instruction to auto-watch every PR it opens. Do not merge — the operator asked to proceed only up to the point right before merge.

---

## Self-review notes (for whoever executes this plan)

- Every `category`/`subCategory` change traces to a row in the design doc's
  migration mapping table — if `git diff` after Task 2 doesn't match that
  table exactly (88 lines, 25 of which also change `subCategory`), stop and
  re-check the design doc before continuing.
- Task 2's migration script is intentionally not committed as a permanent
  repo script — it is a one-time id-anchored data migration, not a reusable
  tool.
- If Task 2 Step 1 aborts (`ABORT: ...`), the live `templates.ts` has
  drifted from what the design doc's audit observed (e.g. another PR
  touched the same template in the meantime). Do not force the change —
  re-read the current line, re-verify against the design doc, and update
  the migration table before retrying.
- Task 5's `EXPECTED` count changes were derived arithmetically from the
  Task 2 migration groups (not re-measured against a live run) — Task 6
  Step 2 (`bun run test`) is what actually proves them; if it fails, recount
  by hand against the design doc's migration table rather than adjusting
  the expected numbers to whatever the failure reports.
