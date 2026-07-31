# Middleware category consolidation: dns + proxy/web/lb/mail/db under one domain

Refs #501, #611, #615. Base branch: develop.

## Summary

Introduce a new `TemplateCategory` domain value, `middleware`, that
consolidates the standalone `dns` category with proxy, web server, load
balancer, mail server, and database templates currently scattered across
`network` and `server`. This mirrors the conventional Japanese
enterprise-IT "middleware" grouping (network services layered on top of an
OS/device, distinct from the device/vendor axis `network` and the
OS/host-administration axis `server`). The taxonomy stays the same
two-axis model established by #570/#571/#611 (`category` domain x
`activity` purpose, flat allow-listed `subCategory`) — this is a rebalancing
of domain boundaries, not a new axis or type.

## Background

- `web/src/lib/types.ts` defines `TemplateCategory = "network" | "server" |
  "dns" | "ai" | "ops" | "facility"`.
- `dns` (51 templates) has no overlap with `network`/`server` today — it is
  already a clean, standalone domain.
- Proxy templates are split: `network`'s "プロキシ / Web" subCategory (21
  templates, mostly Squid, plus the generic `incident-proxy` troubleshoot
  template) and `server`'s `squid-forward-proxy` (subCategory `Debian系`
  after #611) and `nginx-reverse-proxy` (subCategory `Webサーバ`).
- `server` also carries other classic "middleware" topics as flat
  `subCategory` groups, none of which name a device vendor or a Linux distro
  family: web server (`apache-vhost-setup` [`Debian系`],
  `web-error-log-triage`, `http-slow-response-triage` — `Webサーバ`, 4
  total with nginx-reverse-proxy), load balancer (`haproxy-load-balancer`,
  `Debian系`, 1 total), mail (`postfix-send-only` [`Debian系`],
  `mail-delivery-triage`, `mail-queue-flush`, `mail-blacklist-recovery` —
  `メール`, 4 total), database (`postgresql-pgdump-backup`,
  `mysql-dump-restore`, `mariadb-replication-basics`,
  `redis-persistence-config`, `db-connection-failure-triage`,
  `db-slow-query-triage` — `データベース`, 6 total).
- Four templates (`squid-forward-proxy`, `postfix-send-only`,
  `apache-vhost-setup`, `haproxy-load-balancer`) were reclassified to
  `server`/`Debian系` by #611 (2026-07-30) on the grounds that their core
  install commands are apt-locked. This spec knowingly supersedes that label
  for these four: the software they configure (Squid, Postfix, Apache,
  HAProxy) is the more useful grouping axis now that `middleware` exists as
  a domain, and the apt-vs-dnf distinction is lost for these four as an
  accepted trade-off, not an oversight. #611's `Debian系`/`RHEL系` split
  itself is untouched for every other template — this only pulls out the
  subset whose *topic* is leaving `server` entirely.
- Owner decision (this spec, via brainstorming dialogue): scope is "broadly
  middleware-ify network services" — dns + proxy + web server + load
  balancer + mail + database. VPN, certificates (`証明書`), and local
  auth/PAM (`認証`) were explicitly considered and excluded: they are not
  classic "ミドルウェア" in the Japanese enterprise-IT sense and stay in
  `server`.

## Decision

### New category: `middleware`

`web/src/lib/types.ts`: `TemplateCategory` becomes `"network" | "server" |
"middleware" | "ai" | "ops" | "facility"` (drops `"dns"`).

New `middleware` `subCategory` allow-list (17 values, replacing the old
`dns` entry in `ALLOWED_SUBCATEGORIES`):

```
BIND, BIND冗長化, DNSSEC, DNS切り分け, DNS切替, PowerDNS, Unbound, dnsmasq,
レコード管理, 動的更新, 暗号化DNS, 監視,
プロキシ, Webサーバ, ロードバランサ, メール, データベース
```

The first 12 are the former `dns` allow-list, unchanged. The last 5 are new:
`プロキシ` (renamed from `network`'s `プロキシ / Web`), `Webサーバ`,
`ロードバランサ` (new — single-item today, same precedent as existing
single-item labels like `server`'s `資産管理`/`運用ツール`/`コンテナ`),
`メール`, `データベース` (all three carried over unchanged from `server`).

### Pruned labels (fully superseded, not "kept for future reuse")

Unlike #611's decision to keep emptied `server` labels
(`パッチ・脆弱性`/`負荷分散`(originally)/`プロキシ`) because they were
still legitimate generic topics *within* `server`, the labels below are
removed outright: the concept itself has moved to `middleware`, so leaving
them in `network`/`server` would invite a future template to be
miscategorized back into the wrong domain.

- `network`: remove `プロキシ / Web` (38 → 37 allowed values).
- `server`: remove `プロキシ`, `メール`, `Webサーバ`, `データベース`,
  `負荷分散` (48 → 43 allowed values). `VPN`, `証明書`, `認証` are
  untouched — out of scope per the owner decision above.

## Migration mapping (88 templates change `category`, some also `subCategory`)

### `dns` → `middleware` (51, `subCategory` unchanged)

All 51 current `dns` templates move as-is: `dns-zone`,
`dns-resolve-troubleshoot`, `dns-record-migration`, `dnsmasq-office-dns`,
`dns-secondary-transfer`, `dns-stale-cache-triage`, `unbound-cache-resolver`,
`bind-forwarder-config`, `reverse-zone-ptr`, `dnssec-zone-signing`,
`dnssec-ksk-rollover`, `bind-split-dns-views`, `bind-recursion-acl`,
`bind-query-logging`, `rndc-operations`, `nsupdate-dynamic-dns`,
`dns-over-tls-forwarding`, `caa-record-setup`, `spf-dkim-dmarc-records`,
`srv-record-design`, `wildcard-cname-design`, `dns-round-robin-lb`,
`dns-provider-migration`, `zone-file-validation`,
`dnsmasq-dhcp-integration`, `powerdns-authoritative`,
`subdomain-delegation`, `dns-health-monitoring`,
`bulk-record-registration`, `bind-chroot-hardening`, `dns-manual-failover`,
`unbound-rpz-threat-blocking`, `unbound-dns-over-tls-upstream`,
`unbound-local-zone-split-horizon`, `unbound-dnssec-validation-hardening`,
`unbound-access-control-tags`, `unbound-query-logging-analytics`,
`unbound-cache-poisoning-hardening`, `unbound-response-ratelimit-ddos`,
`unbound-forward-fail-triage`, `unbound-dns-tunneling-response`,
`unbound-cache-flush-runbook`, `unbound-performance-tuning`,
`unbound-redundant-resolver-drill`, `unbound-serve-expired-resilience`,
`unbound-tls-service-listener`, `unbound-view-based-policy`,
`unbound-blocklist-automation`, `unbound-stub-zone-internal-auth`,
`unbound-config-audit-routine`, `unbound-monitoring-metrics`.

### `network` "プロキシ / Web" → `middleware` / `プロキシ` (21)

`incident-proxy`, `squid-ssl-bump-inspection`, `squid-category-url-filtering`,
`squid-auth-ldap-integration`, `squid-transparent-proxy-setup`,
`squid-cache-peer-hierarchy`, `squid-delay-pools-bandwidth`,
`squid-acl-review-routine`, `squid-exfil-block-response`,
`squid-access-denied-triage`, `squid-cache-tuning-performance`,
`squid-logformat-siem-shipping`, `squid-icap-av-integration`,
`squid-time-based-access`, `squid-wpad-pac-deployment`,
`squid-upstream-outage-triage`, `squid-proxy-abuse-response`,
`squid-config-change-drill`, `squid-connection-limit-hardening`,
`squid-antivirus-bypass-review`, `squid-forward-proxy-tls-listener`.

### `server` → `middleware` (16)

| id | current subCategory | new subCategory |
|---|---|---|
| squid-forward-proxy | Debian系 | プロキシ |
| nginx-reverse-proxy | Webサーバ | プロキシ |
| apache-vhost-setup | Debian系 | Webサーバ |
| web-error-log-triage | Webサーバ | Webサーバ (category only) |
| http-slow-response-triage | Webサーバ | Webサーバ (category only) |
| haproxy-load-balancer | Debian系 | ロードバランサ |
| postfix-send-only | Debian系 | メール |
| mail-delivery-triage | メール | メール (category only) |
| mail-queue-flush | メール | メール (category only) |
| mail-blacklist-recovery | メール | メール (category only) |
| postgresql-pgdump-backup | データベース | データベース (category only) |
| mysql-dump-restore | データベース | データベース (category only) |
| mariadb-replication-basics | データベース | データベース (category only) |
| redis-persistence-config | データベース | データベース (category only) |
| db-connection-failure-triage | データベース | データベース (category only) |
| db-slow-query-triage | データベース | データベース (category only) |

Total: 51 + 21 + 16 = 88 templates change `category`; of those, 25 also
change `subCategory` (the 21 renamed `プロキシ / Web` → `プロキシ`, plus
`squid-forward-proxy`, `apache-vhost-setup`, `haproxy-load-balancer`,
`postfix-send-only`).

No other `server`/`network` templates are affected — in particular, `VPN`
(`openvpn-server-setup`, `wireguard-vpn-server`, both `Debian系`),
certificates (`server`'s `証明書`, 4 templates), and local
auth/PAM (`server`'s `認証`, 4 templates) stay in `server` unchanged.

## Scope of code changes

| File | Change |
|---|---|
| `web/src/lib/types.ts` | `TemplateCategory`: replace `"dns"` with `"middleware"`. |
| `web/src/lib/templates.ts` | `category` (and `subCategory` where noted above) updated for the 88 templates listed above. No other field changes. |
| `tests/unit/test_template_taxonomy.py` | `CATEGORIES`: replace `"dns"` with `"middleware"`. `ALLOWED_SUBCATEGORIES`: remove the `"dns"` key; add a `"middleware"` key with the 17 values above; remove `プロキシ / Web` from `"network"`; remove `プロキシ`/`メール`/`Webサーバ`/`データベース`/`負荷分散` from `"server"`. |
| `web/src/components/Library.tsx` | Replace the `dns` `RAIL` entry with `{ id: 'middleware', label: 'ミドルウェア', icon: 'ethernet-port', group: 'その他', filter: (t) => t.category === 'middleware' }` at the same position (first entry in the `その他` group, right after `server-rhel`). Update `DOMAIN_ORDER` and `CATEGORY_ICON` (`'dns'` → `'middleware'` in both, same `ethernet-port` icon). `groupBySubCategory`/`countByCategory`/`countByActivity` need no change — both are already generic over whatever `category`/`subCategory` values appear. |
| `web/src/components/Library.test.tsx` | Update the one `t.category === "dns"` reference (line 76) to `"middleware"`. |

No changes to `.j2` template bodies, `.csv`/`.toml`/`.yaml` sample data, or
any file paths — this migration only touches the `category`/`subCategory`
metadata fields on the registry entries.

## Verification

- `uv run pytest tests/unit/test_template_taxonomy.py -v` — drift gate
  passes with the updated `CATEGORIES`/`ALLOWED_SUBCATEGORIES` and all 88
  reassigned entries.
- `cd web && bun run test` (vitest) — full suite green, including the
  updated `Library.test.tsx` assertion.
- `cd web && bunx tsc -b` — no type errors (the `TemplateCategory` union
  changes shape but every reference is updated in the same change).
- `python3 scripts/local_render_check.py <16 server-origin ids>` — offline
  render check on the subset of templates whose `subCategory` also changed
  (metadata-only edit, but this is the safety check precedent set by #611).
- Manual smoke: open the Library UI, select "ミドルウェア" in the left
  rail, confirm sections appear for BIND-family/PowerDNS/Unbound/dnsmasq
  topics plus プロキシ/Webサーバ/ロードバランサ/メール/データベース, no
  empty or duplicate section headers, and the rail count reads 88. Confirm
  `network`'s vendor/common counts drop by 21 and `server`'s count drops by
  16 accordingly (both totals sum correctly against the prior baseline).

## Issue tracking

- **#615** tracks this work; references #501 (the taxonomy-restructure
  issue this continues) and #611 (the PR whose `Debian系` labels this
  partially supersedes for 4 templates, with rationale recorded above).
- Commits and the PR cite #615.
