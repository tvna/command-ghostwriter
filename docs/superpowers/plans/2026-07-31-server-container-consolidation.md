# Server コンテナ Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated "サーバ (コンテナ)" left-nav rail entry to the template Library UI, and consolidate every container-runtime/orchestration template (existing `Docker`/`Podman`/`コンテナ` sub-categories plus 4 cross-domain templates from `ai`/`ops`) into one `(category: "server", subCategory: "コンテナ")` bucket.

**Architecture:** Two independent, sequential slices, each following a red→green cycle against an existing drift-gate test, committed once green (matching this repo's own #611/#615 precedent of one commit per gate+data pair): (1) data-layer migration — 14 field edits in `web/src/lib/templates.ts`, validated by the Python taxonomy drift gate (`tests/unit/test_template_taxonomy.py`); (2) UI-layer rail entry — one new `RailEntry` in `web/src/components/Library.tsx`, validated by the Vitest exclusivity/count assertions in `web/src/components/Library.test.tsx`. No new types, fields, or icons; no `.j2`/data-file changes.

**Tech Stack:** TypeScript/React (`Library.tsx`), Vitest (`Library.test.tsx`), Python/pytest (`test_template_taxonomy.py`), no new dependencies.

**Design doc:** `docs/superpowers/specs/2026-07-31-server-container-consolidation-design.md`
**Issue:** #625 (refs #501) — cite in every commit.

---

### Task 1: Migrate 14 templates into `server`/`コンテナ` (drift gate red → green)

**Files:**
- Modify: `tests/unit/test_template_taxonomy.py:79-125` (`server` frozenset), `:147-166` (`ai` frozenset)
- Modify: `web/src/lib/templates.ts` (14 entries; line numbers below are current-state references — apply by exact-string match, since earlier edits in this task shift later line numbers)

- [ ] **Step 1: Remove `"Docker"` and `"Podman"` from `server`'s allow-list**

In `tests/unit/test_template_taxonomy.py`, find:

```python
            "AppArmor",
            "Debian系",
            "Docker",
            "EDR・フォレンジック",
            "IAM・SSO",
            "KVM/libvirt",
            "Podman",
            "RHEL系",
```

Replace with:

```python
            "AppArmor",
            "Debian系",
            "EDR・フォレンジック",
            "IAM・SSO",
            "KVM/libvirt",
            "RHEL系",
```

- [ ] **Step 2: Remove `"GPUコンテナ"` from `ai`'s allow-list**

Find:

```python
            "APIゲートウェイ",
            "GPUクラスタ",
            "GPUコンテナ",
            "GPU基盤",
```

Replace with:

```python
            "APIゲートウェイ",
            "GPUクラスタ",
            "GPU基盤",
```

- [ ] **Step 3: Run the drift gate and confirm it now fails**

Run: `cd /home/user/command-ghostwriter && uv run pytest tests/unit/test_template_taxonomy.py -v`

Expected: **FAIL**. `test_taxonomy_invariants` raises `AssertionError: taxonomy drift detected:` listing exactly 11 lines — 8 entries with `subCategory 'Docker' not in the allow-list for category 'server'` (`docker-basic-ops`, `docker-compose-stack`, `dockerfile-image-build`, `docker-network-design`, `private-docker-registry`, `container-crashloop-triage`, `docker-disk-bloat-cleanup`, `image-pull-failure-triage`), 2 with `subCategory 'Podman'` (`podman-rootless-service`, `podman-auto-update`), and 1 with `subCategory 'GPUコンテナ'` (`nvidia-container-toolkit`). `test_registry_parses` still passes. This confirms the gate actually catches the pre-migration state — it is not a vacuous check. Do not commit at this point (red state).

- [ ] **Step 4: Consolidate the 8 `Docker`-labeled `server` entries**

In `web/src/lib/templates.ts`, replace **every** occurrence (there are exactly 8) of:

```
category: "server", subCategory: "Docker",
```

with:

```
category: "server", subCategory: "コンテナ",
```

(This is a `replace_all` edit — safe because every current `server`/`Docker` template is moving to `server`/`コンテナ` with no exceptions, per the design doc's migration mapping.)

- [ ] **Step 5: Consolidate the 2 `Podman`-labeled `server` entries**

Replace **every** occurrence (exactly 2) of:

```
category: "server", subCategory: "Podman",
```

with:

```
category: "server", subCategory: "コンテナ",
```

- [ ] **Step 6: Migrate `nvidia-container-toolkit` from `ai` to `server`**

Around line 301, replace:

```
  { id: "nvidia-container-toolkit", name: "NVIDIA Container ToolkitによるGPUコンテナ実行", desc: "DockerコンテナからGPUを利用するためのContainer Toolkit導入と動作検証・リソース指定を行う手順書を生成。", category: "ai", subCategory: "GPUコンテナ", format: "yaml", output: "markdown", updated: "2026-07-16", live: true },
```

with:

```
  { id: "nvidia-container-toolkit", name: "NVIDIA Container ToolkitによるGPUコンテナ実行", desc: "DockerコンテナからGPUを利用するためのContainer Toolkit導入と動作検証・リソース指定を行う手順書を生成。", category: "server", subCategory: "コンテナ", format: "yaml", output: "markdown", updated: "2026-07-16", live: true },
```

- [ ] **Step 7: Migrate `k8s-gpu-operator-deploy` from `ai` to `server`**

Around line 319, replace:

```
  { id: "k8s-gpu-operator-deploy", name: "GPU OperatorによるGPUノードの自動管理", desc: "HelmでNVIDIA GPU Operatorを導入し、ドライバ・デバイスプラグインの展開とGPU要求Podの実行を確認する手順書を生成。", category: "ai", subCategory: "GPUクラスタ", format: "yaml", output: "markdown", updated: "2026-07-18", live: true },
```

with:

```
  { id: "k8s-gpu-operator-deploy", name: "GPU OperatorによるGPUノードの自動管理", desc: "HelmでNVIDIA GPU Operatorを導入し、ドライバ・デバイスプラグインの展開とGPU要求Podの実行を確認する手順書を生成。", category: "server", subCategory: "コンテナ", format: "yaml", output: "markdown", updated: "2026-07-18", live: true },
```

- [ ] **Step 8: Migrate `k8s-gpu-node-drain` from `ai` to `server`**

Around line 320, replace:

```
  { id: "k8s-gpu-node-drain", name: "GPUノードの安全なドレインと保守復帰", desc: "kubectl cordon/drainでGPUノードからワークロードを退避し、保守作業後にuncordonで復帰させる手順書を生成。", category: "ai", subCategory: "GPUクラスタ", format: "csv", output: "markdown", updated: "2026-07-18", live: true },
```

with:

```
  { id: "k8s-gpu-node-drain", name: "GPUノードの安全なドレインと保守復帰", desc: "kubectl cordon/drainでGPUノードからワークロードを退避し、保守作業後にuncordonで復帰させる手順書を生成。", category: "server", subCategory: "コンテナ", format: "csv", output: "markdown", updated: "2026-07-18", live: true },
```

- [ ] **Step 9: Migrate `opa-kubernetes-admission` from `ops` to `server`**

Around line 704, replace:

```
  { id: "opa-kubernetes-admission", name: "OPA/GatekeeperによるKubernetes受付制御", desc: "Gatekeeper ConstraintTemplateでPodセキュリティ等の受付ポリシーを強制するOPA構成手順書を生成。", category: "ops", subCategory: "ポリシー統制", format: "yaml", output: "markdown", updated: "2026-07-17", live: true },
```

with:

```
  { id: "opa-kubernetes-admission", name: "OPA/GatekeeperによるKubernetes受付制御", desc: "Gatekeeper ConstraintTemplateでPodセキュリティ等の受付ポリシーを強制するOPA構成手順書を生成。", category: "server", subCategory: "コンテナ", format: "yaml", output: "markdown", updated: "2026-07-17", live: true },
```

- [ ] **Step 10: Confirm no stray `Docker`/`Podman`/`GPUコンテナ` references remain**

Run: `grep -n 'subCategory: "Docker"\|subCategory: "Podman"\|subCategory: "GPUコンテナ"' web/src/lib/templates.ts`

Expected: no output (empty match).

- [ ] **Step 11: Run the drift gate and confirm it now passes**

Run: `cd /home/user/command-ghostwriter && uv run pytest tests/unit/test_template_taxonomy.py -v`

Expected: **PASS**. Both `test_registry_parses` and `test_taxonomy_invariants` pass (2 passed).

- [ ] **Step 12: Commit**

```bash
git add tests/unit/test_template_taxonomy.py web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
refactor(templates): consolidate Docker/Podman/K8s templates into server コンテナ

Moves nvidia-container-toolkit, k8s-gpu-operator-deploy, and
k8s-gpu-node-drain out of ai, and opa-kubernetes-admission out of ops, into
server/コンテナ alongside the existing Docker (8) and Podman (2) templates.
Metadata-only edit (category/subCategory), no .j2/data file changes.
Retires Docker/Podman/GPUコンテナ from the drift-gate allow-list.

Refs #625.
EOF
)"
```

---

### Task 2: Add the `server-container` rail entry (Vitest red → green)

**Files:**
- Modify: `web/src/components/Library.test.tsx:113-116` (exclusivity count), `:136-160` (`EXPECTED` table)
- Modify: `web/src/components/Library.tsx:40` (label set), `:60-66` (`server-common` filter), `:74-80` (insert after `server-rhel`)

- [ ] **Step 1: Update the server-rail-entry-count assertion**

In `web/src/components/Library.test.tsx`, replace:

```typescript
  it("has exactly 15 network entries and 3 server entries", () => {
    expect(NETWORK_RAIL).toHaveLength(15);
    expect(SERVER_RAIL).toHaveLength(3);
  });
```

with:

```typescript
  it("has exactly 15 network entries and 4 server entries", () => {
    expect(NETWORK_RAIL).toHaveLength(15);
    expect(SERVER_RAIL).toHaveLength(4);
  });
```

- [ ] **Step 2: Update the `EXPECTED` rail-count table**

Replace:

```typescript
    "server-common": 227,
    "server-debian": 18,
    "server-rhel": 5,
    middleware: 88,
    ai: 117,
    ops: 44,
    facility: 20,
```

with:

```typescript
    "server-common": 216,
    "server-debian": 18,
    "server-rhel": 5,
    "server-container": 15,
    middleware: 88,
    ai: 114,
    ops: 43,
    facility: 20,
```

- [ ] **Step 3: Run the Vitest suite and confirm it now fails**

Run: `cd web && bun run test -- src/components/Library.test.tsx`

Expected: **FAIL**. At minimum: `"has exactly 15 network entries and 4 server entries"` fails (`SERVER_RAIL` is still length 3 — `server-container` doesn't exist in `RAIL` yet), and `"each rail entry's count matches the recorded expectation"` fails on `server-common` (actual 231 — Task 1's migrated templates already landed in `server-common` since `Library.tsx` hasn't split `コンテナ` out yet — vs. expected 216). Do not commit at this point (red state).

- [ ] **Step 4: Generalize `SERVER_DISTRO_LABELS` into `SERVER_SPLIT_LABELS`**

In `web/src/components/Library.tsx`, replace:

```typescript
const SERVER_DISTRO_LABELS = new Set(['Debian系', 'RHEL系']);
```

with:

```typescript
const SERVER_SPLIT_LABELS = new Set(['Debian系', 'RHEL系', 'コンテナ']);
```

- [ ] **Step 5: Update the `server-common` filter to use the renamed set**

Replace:

```typescript
  {
    id: 'server-common',
    label: 'サーバ (共通)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && !SERVER_DISTRO_LABELS.has(t.subCategory),
  },
```

with:

```typescript
  {
    id: 'server-common',
    label: 'サーバ (共通)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && !SERVER_SPLIT_LABELS.has(t.subCategory),
  },
```

- [ ] **Step 6: Insert the `server-container` rail entry after `server-rhel`**

Replace:

```typescript
  {
    id: 'server-rhel',
    label: 'サーバ (RHEL系)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && t.subCategory === 'RHEL系',
  },
  { id: 'middleware', label: 'ミドルウェア', icon: 'ethernet-port', group: 'その他', filter: (t) => t.category === 'middleware' },
```

with:

```typescript
  {
    id: 'server-rhel',
    label: 'サーバ (RHEL系)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && t.subCategory === 'RHEL系',
  },
  {
    id: 'server-container',
    label: 'サーバ (コンテナ)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && t.subCategory === 'コンテナ',
  },
  { id: 'middleware', label: 'ミドルウェア', icon: 'ethernet-port', group: 'その他', filter: (t) => t.category === 'middleware' },
```

- [ ] **Step 7: Run the Vitest suite and confirm it now passes**

Run: `cd web && bun run test -- src/components/Library.test.tsx`

Expected: **PASS** (13 tests passed) — including `"has exactly 15 network entries and 4 server entries"`, the exclusivity/exhaustiveness checks (every `server` template matches exactly one of the 4 `server-*` rail entries), and the full `EXPECTED` count table.

- [ ] **Step 8: Commit**

```bash
git add web/src/components/Library.tsx web/src/components/Library.test.tsx
git commit -m "$(cat <<'EOF'
feat(library): add サーバ (コンテナ) rail entry

Splits コンテナ out of server-common the same way #611 split off
server-debian/server-rhel. Reuses the server icon (no dedicated
container/Docker icon asset exists). SERVER_DISTRO_LABELS renamed to
SERVER_SPLIT_LABELS now that it holds a non-distro value.

Refs #625.
EOF
)"
```

---

### Task 3: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Run the full Python test suite**

Run: `cd /home/user/command-ghostwriter && uv run pytest -q`

Expected: all tests pass, no failures (the taxonomy drift gate and any other suite-wide tests unaffected by this change).

- [ ] **Step 2: Run the full Vitest suite**

Run: `cd /home/user/command-ghostwriter/web && bun run test`

Expected: all test files pass, no failures.

- [ ] **Step 3: Type-check the web app**

Run: `cd /home/user/command-ghostwriter/web && bunx tsc -b`

Expected: exits 0, no type errors (no `TemplateCategory` union change, no new fields — only data values and a `RailEntry` literal).

- [ ] **Step 4: Offline render check on the 14 field-edited templates**

Run:

```bash
cd /home/user/command-ghostwriter && python3 scripts/local_render_check.py \
  docker-basic-ops docker-compose-stack dockerfile-image-build docker-network-design \
  private-docker-registry container-crashloop-triage docker-disk-bloat-cleanup \
  image-pull-failure-triage podman-rootless-service podman-auto-update \
  nvidia-container-toolkit k8s-gpu-operator-deploy k8s-gpu-node-drain opa-kubernetes-admission
```

Expected: `14/14 pairs OK` (this is a metadata-only edit — `.j2`/data files are untouched — so this is expected to pass trivially; it re-confirms no unrelated regression).

- [ ] **Step 5: Manual smoke test**

Run: `cd /home/user/command-ghostwriter/web && bun run dev` (or the project's existing `run` skill/workflow if one is set up), open the Library UI in the pre-installed browser, and confirm:
- A "サーバ (コンテナ)" entry appears in the left rail, in the "サーバ" group, between "サーバ (RHEL系)" and the "その他" group's "ミドルウェア".
- Selecting it shows one "コンテナ" section with 15 template cards.
- "サーバ (共通)" no longer shows any Docker/Podman/k3s cards, and its rail count reads 216.
- "AIインフラ" rail count reads 114, "運用共通" reads 43.

Stop the dev server after confirming (`Ctrl+C` / kill the background process).

---

### Task 4: Push

- [ ] **Step 1: Push the branch**

Run: `git push -u origin claude/template-server-category-migration-z3fed1`

Expected: push succeeds (branch already exists on origin from the design-doc commit; this fast-forwards it with the 2 new commits).

- [ ] **Step 2: Report back**

Summarize the 2 commits and the verification results to the user. Do not open a pull request unless the user explicitly asks for one (`finishing-a-development-branch` skill covers that decision when it comes up).
