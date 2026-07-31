# Server コンテナ consolidation: dedicated rail entry + cross-domain migration

Refs #501, #625. Base branch: develop.

## Summary

Add a dedicated left-nav rail entry for `server`'s `コンテナ` sub-category,
matching the existing `server-debian`/`server-rhel` split introduced by
#611. Populate it by consolidating every container-runtime/orchestration
template into one `(category: "server", subCategory: "コンテナ")` bucket:
the already-in-`server` `Docker` (8) and `Podman` (2) sub-categories, plus 4
templates whose core subject is generic container/Kubernetes
infrastructure but that currently sit under `ai`/`ops`. The taxonomy stays
the same two-axis model (`category` domain x `activity` purpose, flat
allow-listed `subCategory`) established by #570/#571/#611/#615 — this is a
sub-category consolidation plus one new rail entry, not a new axis or type.

## Background

- `web/src/lib/types.ts`'s `TemplateCategory` and
  `tests/unit/test_template_taxonomy.py`'s `ALLOWED_SUBCATEGORIES["server"]`
  already list `"コンテナ"` as a valid sub-category, but only one template
  uses it (`k3s-single-node`). `Docker` (8 templates) and `Podman` (2
  templates) are separate, well-populated `server` sub-categories today.
- `web/src/components/Library.tsx`'s `RAIL` splits `server` into
  `server-common` (everything not Debian系/RHEL系), `server-debian`, and
  `server-rhel` (`SERVER_DISTRO_LABELS = {'Debian系', 'RHEL系'}`). Container
  templates (`Docker`/`Podman`/`コンテナ`) currently fall into
  `server-common` alongside every other topic-based sub-category — there is
  no dedicated way to browse "just the container templates" from the left
  nav today.
- Owner decision (this spec, via brainstorming dialogue): the primary ask is
  the left-nav rail entry itself; consolidating `Docker`/`Podman` into
  `コンテナ` (rather than keeping them as separate rail-visible groups) and
  pulling in the cross-domain templates below are both explicitly in scope.
- Content audit (full `.j2` bodies read, not sub-category labels or
  descriptions) of every container/Docker/Podman/Kubernetes-adjacent
  template outside `server` found 4 templates whose core subject is generic
  container/Kubernetes infrastructure rather than the domain their current
  category implies:
  - `ai` / `GPUコンテナ`: `nvidia-container-toolkit` — sole member of that
    sub-category. Content is Docker + NVIDIA Container Toolkit runtime
    configuration (`nvidia-ctk runtime configure`, `docker run --gpus`); the
    template's own 注意事項 explicitly contrasts itself with
    `docker-basic-ops` (a `server`/`Docker` template), i.e. the template
    itself identifies its sibling as a `server`-domain template.
  - `ai` / `GPUクラスタ`: `k8s-gpu-operator-deploy`, `k8s-gpu-node-drain` —
    content is generic Kubernetes cluster administration (`helm
    repo add`/`helm install`, `kubectl cordon`/`drain`/`uncordon`,
    PodDisruptionBudget); GPU is only the workload label, not a technical
    dependency of the commands themselves. The other 8 `GPUクラスタ` members
    (`slurm-gpu-gres-setup`, `slurm-topology-aware-scheduling`,
    `nccl-allreduce-benchmark`, `dcgm-gpu-health-monitoring`,
    `nvlink-fabric-manager-ops`, `infiniband-fabric-health-check`,
    `gpu-xid-error-triage`, `rack-power-capacity-design`) stay in `ai` —
    genuinely AI/GPU-cluster hardware/scheduling topics (Slurm, NCCL, DCGM,
    NVLink, InfiniBand, power design), not container orchestration.
  - `ops` / `ポリシー統制`: `opa-kubernetes-admission` — one of a cohesive
    14-member OPA/Rego policy series (`opa-rego-policy-authoring`,
    `opa-api-authorization`, `opa-terraform-iac-policy`,
    `opa-bundle-distribution`, `opa-decision-log-audit`,
    `opa-policy-test-cicd`, `opa-policy-conflict-triage`,
    `opa-envoy-external-authz`, `opa-data-document-management`,
    `opa-policy-rollout-change`, `opa-performance-bundle-triage`,
    `opa-policy-governance-drill`, `opa-secrets-access-policy`,
    `opa-server-deployment-hardening`), all built the same day covering "OPA
    applied to a different target system." Owner decision (raised and
    confirmed during brainstorming): move it to `server`/`コンテナ` anyway,
    prioritizing "content is Kubernetes-admission-specific" over "stays with
    its OPA siblings for series cohesion" — an accepted trade-off, not an
    oversight. The other 13 `ポリシー統制` members are unaffected and keep
    the sub-category populated in `ops`.
- Templates considered and excluded from this migration:
  - `ai`: `qdrant-collection-setup`, `milvus-standalone-deploy` (ベクトルDB),
    `wandb-selfhost-server` (MLOps), `langfuse-selfhost-deploy` (監視・可観測性),
    `qdrant-rag-collection`, `langgraph-agent-server`, `langfuse-llm-tracing`
    (エージェント基盤), `open-webui-deploy`, `triton-model-repository-deploy`,
    `tgi-server-deploy` (推論サーバ) — 10 templates. Docker/Docker Compose is
    only the delivery mechanism; the subject is the named AI software
    (Qdrant, Milvus, W&B, Langfuse, LangGraph, Open WebUI, Triton, TGI)
    itself, the same reasoning that keeps BIND/PowerDNS/Unbound in
    `middleware` despite all running on Linux.
  - `network`: `linux-bridge-setup` (ブリッジ), `wireguard-container-gateway`
    (オーバーレイVPN) — subject is Linux bridging / WireGuard VPN tunneling;
    containers are only the workload context, not the topic.
  - `server`: `trivy-image-scan`, `lynis-container-image-audit` — already
    reclassified to `Debian系` by #611 on audit grounds (core commands are
    apt-locked); left as-is, no change.

## Decision

### Migrate 15 templates into `(server, コンテナ)`

All 15 end up as `category: "server", subCategory: "コンテナ"`. No `.j2`,
`.toml`/`.yaml`/`.csv` data file changes — this is a metadata-only edit
(`category`/`subCategory` fields), consistent with every prior taxonomy
migration in this repo (#611, #615).

### New rail entry: `server-container`

`web/src/components/Library.tsx`: add, immediately after `server-rhel`:

```ts
{
  id: 'server-container',
  label: 'サーバ (コンテナ)',
  icon: 'server',
  group: 'サーバ',
  filter: (t) => t.category === 'server' && t.subCategory === 'コンテナ',
}
```

No dedicated container/Docker icon asset exists under
`web/src/assets/icons/`; reuses the `server` icon, matching
`server-debian`/`server-rhel`'s own precedent of reusing the same icon
rather than introducing a new asset for a sub-split.

`SERVER_DISTRO_LABELS` (currently `{'Debian系', 'RHEL系'}`, used only to
define `server-common`'s exclusion filter) is renamed to
`SERVER_SPLIT_LABELS` and extended to `{'Debian系', 'RHEL系', 'コンテナ'}` —
the name no longer accurately described its contents once a non-distro
value joins it, and `server-common` must exclude `コンテナ` the same way it
excludes the two distro labels so container templates don't double-count
in both sections.

### Allow-list changes

- `server`: remove `"Docker"`, `"Podman"` (0 members after consolidation).
  `"コンテナ"` stays (already present).
- `ai`: remove `"GPUコンテナ"` (0 members after consolidation — the concept
  moved to `server`, so keeping the label would invite the same
  miscategorization back, the same logic #615 used to prune `server`'s
  `プロキシ`/`メール`/`Webサーバ`/`データベース`). `"GPUクラスタ"` keeps its
  remaining 8 members, unchanged in the allow-list.
- `ops`: `"ポリシー統制"` keeps its remaining 13 members, unchanged in the
  allow-list.

## Migration mapping (15 templates end up in `server`/`コンテナ`; 14 field edits)

### Already in `server`, folded into the `コンテナ` bucket (11 templates, 10 field edits)

`k3s-single-node`'s `subCategory` is already `コンテナ` — no field edit, it
simply starts appearing under the new `server-container` rail entry instead
of `server-common`. The other 10 need their `subCategory` changed.

| id | current subCategory | new subCategory |
|---|---|---|
| k3s-single-node | コンテナ | コンテナ (no field edit) |
| docker-basic-ops | Docker | コンテナ |
| docker-compose-stack | Docker | コンテナ |
| dockerfile-image-build | Docker | コンテナ |
| docker-network-design | Docker | コンテナ |
| private-docker-registry | Docker | コンテナ |
| container-crashloop-triage | Docker | コンテナ |
| docker-disk-bloat-cleanup | Docker | コンテナ |
| image-pull-failure-triage | Docker | コンテナ |
| podman-rootless-service | Podman | コンテナ |
| podman-auto-update | Podman | コンテナ |

### `ai` → `server` (3, `category` and `subCategory` both change)

| id | current category/subCategory | new category/subCategory |
|---|---|---|
| nvidia-container-toolkit | ai / GPUコンテナ | server / コンテナ |
| k8s-gpu-operator-deploy | ai / GPUクラスタ | server / コンテナ |
| k8s-gpu-node-drain | ai / GPUクラスタ | server / コンテナ |

### `ops` → `server` (1, `category` and `subCategory` both change)

| id | current category/subCategory | new category/subCategory |
|---|---|---|
| opa-kubernetes-admission | ops / ポリシー統制 | server / コンテナ |

`format`/`output`/`activity`/`updated`/`live` fields are untouched for all 15
entries.

## Scope of code changes

| File | Change |
|---|---|
| `web/src/lib/templates.ts` | `category` (4 entries) and/or `subCategory` (14 entries total) updated per the mapping above; `k3s-single-node` needs no edit. |
| `tests/unit/test_template_taxonomy.py` | `ALLOWED_SUBCATEGORIES["server"]`: remove `"Docker"`, `"Podman"`. `ALLOWED_SUBCATEGORIES["ai"]`: remove `"GPUコンテナ"`. |
| `web/src/components/Library.tsx` | Rename `SERVER_DISTRO_LABELS` → `SERVER_SPLIT_LABELS`, add `'コンテナ'`. Add the `server-container` rail entry after `server-rhel`. `groupBySubCategory`/`countByCategory`/`countByActivity` need no change (already generic over whatever `(category, subCategory)` values appear). |
| `web/src/components/Library.test.tsx` | Update "has exactly 3 server entries" → 4. Update `EXPECTED`: `server-common` 227→216, add `server-container: 15`, `ai` 117→114, `ops` 44→43. `server-debian` (18), `server-rhel` (5), `all` (794) unchanged. |

## Verification

- `uv run pytest tests/unit/test_template_taxonomy.py -v` — drift gate
  passes with the updated allow-lists and the 14 field-edited entries.
- `cd web && bun run test` (vitest) — full suite green, including the
  updated `Library.test.tsx` rail-count table and exclusivity/exhaustiveness
  assertions (every `server` template still matches exactly one `server`
  rail entry, now across 4 entries instead of 3).
- `cd web && bunx tsc -b` — no type errors (no `TemplateCategory` union
  change; only data and rail-filter edits).
- `python3 scripts/local_render_check.py <14 field-edited ids>` — offline
  render check on the touched subset (metadata-only edit, but this is the
  safety check precedent #611/#615 both used). `k3s-single-node` is skipped
  here — its fields don't change, so its render behavior can't be affected.
- Manual smoke: open the Library UI, confirm a new "サーバ (コンテナ)" entry
  appears in the left rail under the "サーバ" group heading, between "サーバ
  (RHEL系)" and the "その他" group's "ミドルウェア". Selecting it shows all
  15 templates in one "コンテナ" section. Confirm `server-common`'s count
  drops to 216 (no Docker/Podman/コンテナ items remain in it), and `ai`/`ops`
  counts drop by 3/1 respectively.

## Issue tracking

- **#625** tracks this work; references #501 (the taxonomy-restructure
  tracking issue this continues).
- Commits and the PR cite #625.
