# Template category reorganization: server distro split + network vendor audit

Refs #501, #572. Base branch: develop.

## Summary

Reorganize the `server` and `network` template categories along the axis the
owner asked for: server templates split out by Linux distribution family where
genuinely warranted, network templates confirmed already organized by
manufacturer. The taxonomy stays a two-axis model (`category` domain x
`activity` purpose, per #570/#571) with `subCategory` as a flat, allow-listed
string — no new type, field, or UI axis is introduced. This supersedes the
nested category/subcategory-module design originally proposed in #501 (that
proposal's specific mechanism — a new taxonomy module, vendor badges, a nested
UI rail — was never built; the codebase instead evolved via #570/#571 into the
two-axis model this spec continues).

## Background

- `web/src/lib/types.ts` defines `TemplateCategory = "network" | "server" |
  "dns" | "ai" | "ops" | "facility"` and a required `subCategory: string` on
  every `Template`.
- `tests/unit/test_template_taxonomy.py` is the drift gate: it parses
  `web/src/lib/templates.ts` and asserts every `(category, subCategory)` pair
  is in `ALLOWED_SUBCATEGORIES`. Extending the vocabulary is a deliberate,
  explicit edit to that dict — this is the mechanism that keeps sub-category
  naming from sprawling (the drift #570/#571 fixed).
- `network` (221 templates) already carries vendor names (Cisco, YAMAHA,
  Juniper, Fortinet, ...) as flat `subCategory` strings, informally, via
  recent bulk template batches (#595, #596). `server` (266 templates) has no
  such split — 45 of its 46 allow-listed sub-categories are topic-based
  (SIEM・HIDS, systemd, sudo, ...); only one, `"Ubuntu / Debian"` (3
  templates), names a distro at all.
- Issue #501 (owner-filed, 2026-07-02, never implemented, zero linked PRs)
  proposed formalizing vendor/generic as a distinct sub-axis with its own
  taxonomy module and UI. That design predates and was superseded by #570/#571
  in practice. Per owner decision (this spec), #501 is updated to track the
  present plan instead of its original proposal, rather than opening a
  parallel issue.
- Issue #572 (open retrospective on #571) flagged two still-missing pieces
  this spec closes: (a) the drift-gate allow-list must encode *canonical
  intent*, not be derived from unverified post-migration data; (b)
  `Library.tsx`'s `groupBySubCategory()` and the rail/chip count logic have no
  unit test coverage.

## Decision

Keep the flat-`subCategory`-per-domain convention and extend it the same way
`network` already extends it for vendors: only templates whose content is
*genuinely* locked to one axis value get that value; everything else keeps its
current, topic-based `subCategory`. No new TypeScript type, no new `Template`
field, no Library.tsx UI restructuring (`groupBySubCategory()` already groups
by `(category, subCategory)` generically and needs no change to render the new
values).

### server: distro-family split, locked templates only

New allowed `subCategory` values under `server`: `"Debian系"` (Ubuntu/Debian),
`"RHEL系"` (RHEL/Rocky/CentOS/AlmaLinux). Grouped at the distro-*family* level,
not per individual distro, to avoid recreating the single-item-category
problem #501 originally flagged (e.g. AlmaLinux- or CentOS-only groups would
have 0-1 members).

**Classification rule** (applied to every server template, see Methodology):
a template is `"Debian系"`/`"RHEL系"` only if its core, unconditional commands
depend on that family's package manager or family-only tooling (apt/dpkg/ufw
vs. dnf/yum/rpm/firewalld/subscription-manager) such that a reader on the
other family would hit a command that does not exist there. Templates that
offer both families as alternatives (e.g. `apt-get install X || dnf install
X`), or where the distro-specific text is incidental (a single swappable
install line, a comment, a filler example never checked in 動作確認), stay on
their current topic `subCategory`. **Exception:** `"SELinux"` and `"AppArmor"`
stay as-is regardless of content — the mechanism name itself already
communicates the distro family, and folding them into RHEL系/Debian系 would
lose that information for no benefit.

The existing `"Ubuntu / Debian"` sub-category (3 templates: `linux-init`,
`cloud-init-first-boot`, `unattended-upgrades-setup`) is renamed to
`"Debian系"` and removed from the allow-list under its old name — this is a
rename to the new naming convention, not a prune, and keeping both would
reintroduce the exact "group + near-duplicate variant" sprawl #572's
retrospective flagged as the bug class to avoid. Three other topic labels
(`"パッチ・脆弱性"`, `"負荷分散"`, `"プロキシ"`) end up with zero members after
this migration (their sole occupant was reclassified) but are **kept** in the
allow-list: they are legitimate generic topics a future cross-distro template
could reuse, not synonyms of the new distro labels, so pruning them isn't
warranted by the same anti-sprawl logic that justifies removing `"Ubuntu /
Debian"`.

### network: consistency audit only, no new sub-categories

No structural change. Audited all 52 vendor-tagged entries plus one
topic-tagged entry that weakly matched a vendor-signature grep pre-filter
(`lldp-neighbor-discovery`) against their actual `.j2` content. Result: **zero
mismatches** — every vendor label matches genuine vendor-specific CLI syntax
(Cisco IOS, JunOS, FortiOS, YAMAHA RTX, AOS-CX, AlliedWare Plus, Alaxala
AX-series, Dell OS10, Arista EOS, SonicOS, PAN-OS, EdgeOS, ArubaOS, NEC
UNIVERGE IX), and `lldp-neighbor-discovery` is genuinely vendor-neutral Linux
tooling correctly left under its topic label. No `templates.ts` or
`ALLOWED_SUBCATEGORIES["network"]` changes.

### dns / ai / ops / facility: light check, no findings

Sampled product-named sub-categories (BIND, PowerDNS, Unbound, dnsmasq, NVIDIA
DGX, step-ca / Caddy) against their content, and scanned the remaining entries
for a top-level miscategorization (the historical `firewall-rules`-under-
`network` bug class #501 cited). Zero findings. No changes.

## Methodology (audit, not assumption)

Per the release-archive-preflight practice in this repo (never write from
assumption; verify the real layout first), the server/network audits were
performed against actual template content, not inferred from sub-category
labels:

1. Deterministic grep pre-filter of every `server`-category `.j2` body for
   Debian-family signals (`apt`, `apt-get`, `dpkg`, `ufw`, `/etc/apt`, ...)
   and RHEL-family signals (`dnf`, `yum`, `rpm`, `firewalld`,
   `subscription-manager`, ...) — narrows 266 templates to 46 real candidates
   (files with zero hits are, by construction, free of the signal and stay
   generic without further review).
2. Each of the 46 candidates read in full and classified against the rule
   above (agent-assisted, batched; spot-checked by hand against 4 of the
   more borderline calls — `kvm-snapshot-restore`, `wazuh-fim-syscheck-config`,
   `lynis-baseline-drift-triage`, `node-exporter-setup` — by reading the raw
   `.j2` file directly).
3. All 52 network vendor-tagged entries plus 1 grep-flagged topic entry read
   in full and checked against known vendor CLI syntax.
4. dns/ai/ops/facility sampled per category against the same
   product-vs-topic consistency criterion.
5. For every server topic label losing members, the *full* `server` set (not
   just the 46 candidates) was re-checked via grep for remaining members
   before deciding whether to keep or prune the label from the allow-list
   (see the `パッチ・脆弱性`/`負荷分散`/`プロキシ` decision above).

## Migration mapping (server, 27 templates change subCategory)

### → `Debian系` (22)

| id | current subCategory |
|---|---|
| apache-vhost-setup | Webサーバ |
| apt-repo-pinning | パッケージ管理 |
| cloud-init-first-boot | Ubuntu / Debian |
| crowdsec-agent-bouncer-setup | 侵入対策 |
| haproxy-load-balancer | 負荷分散 |
| linux-init | Ubuntu / Debian |
| logwatch-daily-report | ログ運用 |
| lynis-baseline-drift-triage | 適合性監査 |
| lynis-container-image-audit | 適合性監査 |
| lynis-pre-audit-drill | 適合性監査 |
| node-exporter-setup | 監視 |
| openvpn-server-setup | VPN |
| osquery-differential-logging | 資産・状態管理 |
| postfix-send-only | メール |
| samba-file-server | ファイル共有 |
| squid-forward-proxy | プロキシ |
| sysstat-sar-recording | 監視 |
| trivy-image-scan | Docker |
| unattended-upgrades-setup | Ubuntu / Debian |
| wazuh-rule-update-routine | SIEM・HIDS |
| wireguard-vpn-server | VPN |
| zabbix-agent-install | 監視 |

### → `RHEL系` (5)

| id | current subCategory |
|---|---|
| dnf-automatic-updates | パッケージ管理 |
| lynis-hardening-remediation | 適合性監査 |
| ntp-chrony | 時刻同期 |
| ssh-lockout-recovery | SSH |
| vuln-patch-triage | パッチ・脆弱性 |

### Stay generic — reviewed, no change (19)

certbot-auto-renewal, clamav-scheduled-scan, disk-quota-setup,
etckeeper-config-history, fail2ban-journald-backend, fail2ban-nftables-action,
fail2ban-ssh-guard, kvm-snapshot-restore, lynis-file-permission-audit,
lynis-malware-toolkit-scan, nfs-server-setup, nginx-reverse-proxy,
osquery-network-exposure-audit, osquery-package-vuln-correlation,
selinux-denial-triage (excluded: SELinux stays SELinux), selinux-mode-basics
(excluded: SELinux stays SELinux), smartctl-disk-health,
wazuh-fim-syscheck-config, wazuh-vulnerability-detection.

The remaining 220 server templates had zero distro-signal grep hits and are
unchanged.

## Scope of code changes

| File | Change |
|---|---|
| `web/src/lib/templates.ts` | `subCategory` field updated for the 27 templates listed above. No other field changes. |
| `tests/unit/test_template_taxonomy.py` | `ALLOWED_SUBCATEGORIES["server"]`: remove `"Ubuntu / Debian"`, add `"Debian系"` and `"RHEL系"`. |
| `web/src/lib/types.ts` | No change. |
| `web/src/components/Library.tsx` | No behavior change (grouping is already generic over `(category, subCategory)`). `groupBySubCategory` is exported, and the rail/chip count logic (`count`/`actCount` in the `Library` component) is extracted into two pure, exported functions (`countByCategory`, `countByActivity`) so both become independently unit-testable — closes #572 item (b)/(c). |
| `web/src/components/Library.test.tsx` (new) | Unit coverage for `groupBySubCategory` (same-name sub-category across different domains stays in separate sections — the exact regression #572 documented) and for `countByCategory`/`countByActivity` (each respects the other axis's active filter). |

## Issue tracking

- **#501** is rewritten to describe this plan (two-axis model, flat
  subCategory extension, no new taxonomy module) and stays open as the
  tracking issue for this work; its original nested-taxonomy proposal is
  marked superseded in the body rather than silently dropped.
- **#572** is closed by the PR that adds the `Library.tsx` test coverage
  above — its remaining two follow-up items are both satisfied (canonical,
  audit-derived allow-list changes; grouping/count unit tests).
- Commits and the PR cite #501; the PR closes #572.

## Verification

- `pytest tests/unit/test_template_taxonomy.py` — drift gate passes with the
  updated allow-list and the 27 reassigned entries.
- `vitest run` — new `Library.test.tsx` passes; full suite green.
- `tsc -b` — no type errors (no type changes expected).
- Offline render check (`scripts/local_render_check.py` or repo equivalent) —
  all templates still resolve id -> files; unaffected by subCategory-only
  edits.
- Manual smoke: open the Library UI, confirm the `server` domain now shows
  `Debian系`/`RHEL系` sections alongside the existing topic sections, with no
  empty or duplicate section headers.
