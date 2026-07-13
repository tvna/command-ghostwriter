# Phase 2: DNS/Cloud/Virtualization Scenario Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 10 new training-scenario templates (DNS/cloud/virtualization cluster) to the `assets/examples/` library and register them in `web/src/lib/templates.ts`, closing issue #545.

**Architecture:** Each scenario is a `.j2` Jinja2 template + a same-basename data file (`.yaml`/`.toml`/`.csv`) under `assets/examples/`, following the existing 6-section Markdown structure (目的/用語解説/シナリオ設定/手順/動作確認/注意事項) established in Phase 1 (see `assets/examples/dns-zone.j2`, `linux-init.j2`, `firewall-rules.j2` as reference implementations). No changes to `web/src/lib/types.ts` (all categories already exist) or the render engine. `tests/unit/test_example_templates_render.py` auto-discovers new pairs by basename, no test changes needed.

**Tech Stack:** Jinja2 templates, YAML/TOML/CSV data files, TypeScript (`templates.ts` META array).

**Source material:** All learning objectives, glossary candidates, procedure outlines, verification checks, and caution notes for each of the 10 scenarios are already finalized in `docs/superpowers/specs/2026-07-12-infra-training-scenario-templates-scenario-details.md` (フェーズ2 section, lines 5-86). Each task below cites the exact subsection to use as source material; the implementer must still verify command syntax accuracy (the spec explicitly flags command details as estimates to be re-verified).

**Known bug class to check per template (from Phase 1 review):** every glossary term listed in 用語解説 must actually appear in the rendered template body, and every jargon term used in the body must be defined in 用語解説. Do not carry over unused glossary entries or introduce undefined jargon.

---

## Common per-task pattern

Each of Tasks 1-10 follows the same steps:

1. Create `assets/examples/<id>.<format>` (data file) using realistic example values consistent with the scenario's 手順概要.
2. Create `assets/examples/<id>.j2` with the 6-section structure: title line, 目的, 用語解説, シナリオ設定 (short realistic framing), 手順 (numbered sections with CLI code blocks, using Jinja variables/loops from the data file), 動作確認 (checklist derived from spec's 動作確認 bullet), 注意事項 (derived from spec's 注意事項 bullet, phrased as bullet list per design doc's "破壊的操作の影響範囲・ロールバック手段・課金/実害リスク・必要な権限・演習環境の前提" checklist).
3. Add one entry to the `META` array in `web/src/lib/templates.ts` (alphabetical-ish insertion after the last existing entry is fine; order in the array does not matter functionally) with `category`/`subCategory`/`format` exactly as specified in the design doc table, `output: "markdown"`, `live: true`, `updated: "2026-07-13"`.
4. Render-verify with the project's real engine (not tsc/lint) — this is the "live proof" required before marking the task done:

```bash
cd /home/user/command-ghostwriter
uv run python -c "
from pathlib import Path
from io import BytesIO
from features.config_parser import ConfigParser
from features.document_render import DocumentRender

tid = '<id>'
ext = '<format>'
p = Path('assets/examples')
data = (p / f'{tid}.{ext}').open('rb'); data.name = f'{tid}.{ext}'
parser = ConfigParser(config_file=data)
assert parser.parse(), parser.error_message
tpl = (p / f'{tid}.j2').open('rb'); tpl.name = f'{tid}.j2'
render = DocumentRender(tpl)
assert render.is_valid_template, render.error_message
ok = render.apply_context(parser.parsed_dict, 0, True)
assert ok, render.error_message
print(render.render_content)
"
```

Expected: prints rendered Markdown, no exception. Then manually check the printed Markdown for the glossary-drift bug class (every defined term appears in body; every jargon term in body is defined).

5. Run the automated render test (covers this pair plus all others, cheap regression check):

```bash
uv run pytest tests/unit/test_example_templates_render.py -k <id> -q
```

Expected: 1 passed.

6. Commit:

```bash
git add assets/examples/<id>.<format> assets/examples/<id>.j2 web/src/lib/templates.ts
git commit -m "feat(templates): add <id> training scenario (#545)"
```

---

### Task 1: docker-basic-ops

- **Files:** Create `assets/examples/docker-basic-ops.yaml`, `assets/examples/docker-basic-ops.j2`. Modify `web/src/lib/templates.ts`.
- **Source:** scenario-details.md lines 7-14 (Dockerコンテナ基本操作). category=server, subCategory=Docker, format=yaml.
- **Data file content:** container name, image (`nginx:1.27`), host port (8080), container port (80), a volume host path/content, target for the content replacement step.
- **Template content:** pull → run -d --name -p → curl check → logs → volume remount demo → stop/rm/rmi cleanup. Glossary: コンテナ / イメージ / レジストリ(Docker Hub) / タグ / ポート公開(-p) / ボリューム / デタッチ実行(-d) / docker logs — use only the ones actually referenced in the body.
- Follow steps 1-6 of the common pattern above.

### Task 2: dns-resolve-troubleshoot

- **Files:** Create `assets/examples/dns-resolve-troubleshoot.yaml`, `assets/examples/dns-resolve-troubleshoot.j2`. Modify `web/src/lib/templates.ts`.
- **Source:** scenario-details.md lines 15-21. category=runbook, subCategory=DNS切り分け, format=yaml.
- **Data file content:** the name under investigation, a public resolver IP (e.g. `8.8.8.8`), a test hosts-file entry (name + IP) to add/remove.
- **Template content:** MUST include the `/etc/hosts` test-entry step showing `getent hosts` vs `dig` divergence (design doc explicitly requires this), plus its cleanup step. Steps: reproduce → `getent hosts` → `dig` → `dig @8.8.8.8` compare → `resolvectl status`/`/etc/resolv.conf` → add hosts test entry → observe getent-vs-dig gap → judge layer → remove test entry. Glossary candidates in spec line 18.
- Follow steps 1-6 of the common pattern above.

### Task 3: kvm-snapshot-restore

- **Files:** Create `assets/examples/kvm-snapshot-restore.yaml`, `assets/examples/kvm-snapshot-restore.j2`. Modify `web/src/lib/templates.ts`.
- **Source:** scenario-details.md lines 23-29. category=runbook, subCategory=KVMスナップショット, format=yaml.
- **Data file content:** VM (domain) name, snapshot name following `<date>_<ticket-number>` convention, a change to make inside the VM (e.g. package update) for the rollback demo.
- **Template content:** `virsh list --all` → `snapshot-create-as` → `snapshot-list` → in-VM change → `snapshot-revert` → verify rollback → `snapshot-delete` cleanup. Glossary per spec line 26.
- Follow steps 1-6 of the common pattern above.

### Task 4: aws-ec2-basic-ops

- **Files:** Create `assets/examples/aws-ec2-basic-ops.yaml`, `assets/examples/aws-ec2-basic-ops.j2`. Modify `web/src/lib/templates.ts`.
- **Source:** scenario-details.md lines 31-37. category=server, subCategory=AWS CLI, format=yaml.
- **Data file content:** AWS profile name, region, AMI id (placeholder, e.g. `ami-0123456789abcdef0`), instance type `t3.micro`, key pair name, security group name, allowed SSH source (self IP placeholder), Name tag.
- **Template content:** `aws configure --profile` → key pair create + chmod 600 → security group create (SSH restricted to own IP) → `run-instances` → `describe-instances` to get IP, SSH → `stop-instances` → state check → `terminate-instances` → confirm SG/key-pair/EBS cleanup. Glossary per spec line 34. Caution: real AWS billing — emphasize cleanup + billing dashboard check.
- Follow steps 1-6 of the common pattern above.

### Task 5: dns-record-migration

- **Files:** Create `assets/examples/dns-record-migration.csv`, `assets/examples/dns-record-migration.j2`. Modify `web/src/lib/templates.ts`.
- **Source:** scenario-details.md lines 39-45. category=dns, subCategory=DNS切替, format=csv.
- **Data file content:** CSV columns `name,type,old_value,new_value,old_ttl` with 2-3 rows (A and CNAME records) — mirror the `firewall-rules.csv` + `firewall-rules.j2` `csv_rows` loop convention (`{{ r["name"] }}` etc.).
- **Template content:** inventory table from CSV → TTL shortened to 300s before cutover → `dig +short` baseline → record value change + SOA serial bump → `dig @<authoritative>` immediate check → cache-resolver check after TTL expiry → restore original TTL. Glossary per spec line 42. Caution: practice on staging zone first, don't forget to restore TTL.
- Follow steps 1-6 of the common pattern above.

### Task 6: virsh-vm-lifecycle

- **Files:** Create `assets/examples/virsh-vm-lifecycle.toml`, `assets/examples/virsh-vm-lifecycle.j2`. Modify `web/src/lib/templates.ts`.
- **Source:** scenario-details.md lines 47-53. category=server, subCategory=KVM/libvirt, format=toml.
- **Data file content:** VM name, vcpus, memory MB, disk path/size, cloud image path, network name (`default`).
- **Template content:** check virtualization support (`/proc/cpuinfo`, `virsh version`) → `virsh net-list` → `qemu-img create` → `virt-install` → `virsh console` login check → `shutdown` → `start` → `autostart`. Glossary per spec line 50. Caution: host needs VT-x/AMD-V; `destroy` is a hard power-off, different from `shutdown`.
- Follow steps 1-6 of the common pattern above.

### Task 7: aws-s3-backup-basics

- **Files:** Create `assets/examples/aws-s3-backup-basics.yaml`, `assets/examples/aws-s3-backup-basics.j2`. Modify `web/src/lib/templates.ts`.
- **Source:** scenario-details.md lines 55-61. category=server, subCategory=AWS CLI, format=yaml.
- **Data file content:** profile name, bucket name (placeholder globally-unique-looking name), local archive path, sync source directory, restore-check destination directory.
- **Template content:** `aws s3 mb` → `get-public-access-block` check → enable versioning → `aws s3 cp` archive upload → `aws s3 sync` → restore via `cp` + sha256 compare → `rm --recursive` + `rb` cleanup. Glossary per spec line 58. Caution: real (small) AWS billing, globally-unique bucket names, don't leave public access block disabled.
- Follow steps 1-6 of the common pattern above.

### Task 8: dnsmasq-office-dns

- **Files:** Create `assets/examples/dnsmasq-office-dns.toml`, `assets/examples/dnsmasq-office-dns.j2`. Modify `web/src/lib/templates.ts`.
- **Source:** scenario-details.md lines 63-69. category=dns, subCategory=dnsmasq, format=toml.
- **Data file content:** listen address, internal domain suffix, upstream DNS server(s), a list of internal hostname→IP entries for `/etc/hosts`.
- **Template content:** install dnsmasq → configure listen-address/domain/upstream `server=` → append internal hosts → `dnsmasq --test` → `systemctl enable --now dnsmasq` → client points resolver at it, `dig` verify internal + external (upstream forward) + cache speed-up on 2nd query. Glossary per spec line 66. Caution: port 53 conflict with systemd-resolved, always `--test` before applying.
- Follow steps 1-6 of the common pattern above.

### Task 9: dns-secondary-transfer

- **Files:** Create `assets/examples/dns-secondary-transfer.toml`, `assets/examples/dns-secondary-transfer.j2`. Modify `web/src/lib/templates.ts`.
- **Source:** scenario-details.md lines 71-77. category=dns, subCategory=BIND冗長化, format=toml.
- **Data file content:** zone name, primary server IP, secondary server IP (used in `allow-transfer`/`also-notify`), a record to add for the propagation demo.
- **Template content:** primary `allow-transfer`/`also-notify` config → secondary transfer-receiving zone stanza → `named-checkconf` both sides → reload + confirm zone file generated on secondary → add record on primary + bump serial → confirm NOTIFY propagation via `dig SOA` on both. Glossary per spec line 74. Caution: restrict `allow-transfer` to the secondary's IP only, requires a 2-host lab.
- Follow steps 1-6 of the common pattern above.

### Task 10: podman-rootless-service

- **Files:** Create `assets/examples/podman-rootless-service.yaml`, `assets/examples/podman-rootless-service.j2`. Modify `web/src/lib/templates.ts`.
- **Source:** scenario-details.md lines 79-85. category=server, subCategory=Podman, format=yaml.
- **Data file content:** unprivileged username, image (`nginx:1.27`), non-privileged host port (8080), Quadlet/unit name.
- **Template content:** `podman info` rootless check → run nginx on 8080 as normal user → curl check → Quadlet/unit definition → `systemctl --user enable --now` → `loginctl enable-linger` → reboot-survival check. Glossary per spec line 82. Caution: without `enable-linger` the user service stops at logout; ports <1024 unavailable rootless.
- Follow steps 1-6 of the common pattern above.

---

## Final verification (after all 10 tasks)

- [ ] **Full test suite:**

```bash
cd /home/user/command-ghostwriter
uv run pytest -k 'not e2e' -q
```
Expected: all passing (existing 448 + 10 new).

- [ ] **Web type check + unit tests:**

```bash
cd web && npx tsc --noEmit && npm test -- --run
```
Expected: 0 tsc errors; all suites pass except the Pyodide render-parity suite (network-restricted, acceptable per handoff).

- [ ] **Diff scope check:**

```bash
git diff origin/develop...HEAD --stat
```
Expected: only `assets/examples/*` (20 new files) and `web/src/lib/templates.ts` changed. `web/src/lib/types.ts` and `Library.tsx` untouched.

- [ ] **Code review:** run `/code-review` (high effort), fix findings, re-review if fixes were non-trivial.

- [ ] **PR:** create PR titled `Phase 2: add 10 DNS/cloud/virtualization training scenarios (Closes #545)`, ASCII only, mirroring PR #543's Summary/Test plan/Refs structure. Subscribe to PR activity after creation.
