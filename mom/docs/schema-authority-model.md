# Schema Authority Model

This project separates database authority, generated system contracts, and editable design workspaces.

## Layers

| Layer | Purpose | Source | Write Policy | Delete Policy |
| --- | --- | --- | --- | --- |
| Physical DB schema | Runtime data storage in PostgreSQL | PostgreSQL schema `public` | Database writes only through application/runtime or governed migrations | Never delete from Schema Studio |
| DB authority | Versioned structural source of truth | `database/migrations/*.sql` -> `database/schema.sql` | Governed migration review, deployment gate, rollback planning | Immutable history; supersede with a later migration |
| System Contract Registry | Full backend contract for AI, frontend, API, workflow, and audit visibility | `data/registry/table-registry.json` and generated registry artifacts | Read-only generated artifact | Regenerate from authority; do not hand-edit or hard-delete |
| Workspace Design Draft | Blank editable design surface for future controlled experiments only | `data/schema-studio/designs/workspace.json` | Editable with revision guard and audit trail | Archive or replace through a controlled change; do not hard-delete while Schema Studio needs an editable surface |

## Active Workspace State

As of 2026-04-11, `data/schema-studio/designs/workspace.json` and `data/schema-studio/snapshots/workspace.baseline.json` are intentionally blank. They contain zero tables and zero relations by design.

This prevents AI, frontend, and backend tools from mistaking an old curated 101-table draft for the real ERP+MOM schema. The real backend contract remains the System Contract Registry, and the physical DB authority remains migrations plus the generated schema snapshot.

## Runtime Contract Artifacts

The runtime/API/frontend contract must be generated from registry authority, not from the editable workspace draft.

| Artifact | Role | Source Inputs |
| --- | --- | --- |
| `data/registry/system-contract-runtime-projections.json` | Full table/relation/workflow/endpoint projection for runtime and AI tooling | `table-registry`, `relation-map`, `endpoint-catalog`, `workflow-library` |
| `data/registry/system-contract-registry-contracts.json` | Full table contract index, one contract per registry table | `table-registry`, `endpoint-catalog`, `workflow-library` |
| `data/registry/system-contract-diagnostics.json` | Release gate diagnostics for the published system contract | registry authority artifacts and global capability audit |
| `data/registry/system-contract-manifest.json` | Single read-only manifest for the full backend contract layer | generated system-contract artifacts |
| `data/registry/graphics-governance-registry.json` | Machine-readable graphics authority projection for runtime, builder, release and evidence tooling | backend graphics authority, controlled template registry, module compliance, drift/debt diagnostics |
| `data/registry/graphics-template-registry.json` | Runtime template registry projection consumed by frontend and module builder | `design/template-registry.json` through graphics governance publication |

`schema-studio-*` artifacts remain valid only as workspace/design outputs. With the active blank workspace they should compile to zero design projections and must not be used as the source of truth for runtime release decisions.

## Graphics Authority Model

Graphics governance follows the same authority rule as schema governance: runtime/API/frontend contracts are generated or read from registry authority, not from editable workspace drafts or browser cache.

| Layer | Authority Role | LocalStorage Policy |
| --- | --- | --- |
| Admin Graphics Control Plane | User-facing control surface for graphics changes, impact, compliance, rollout, rollback, waiver and audit | May store last view/filter/sort only |
| Backend Graphics Authority | Canonical owner of design config, controlled template registry, compliance matrix, drift/debt, audit, waiver and release blockers | No browser cache authority |
| Theme runtime (`HmTheme`) | Applies admin config and user preview prefs to CSS variables | User preference and offline read cache only |
| Template draft/preview cache | Unsaved editor draft and preview-only token/template overrides | Must not be treated as production registry |
| Module UI | Consumes shared tokens/components or approved bridge aliases | No private graphics source of truth |

Any registry, builder or release tool that reads `hesem_layout_templates` or a browser-only template cache as production authority is invalid. The controlled path is backend graphics authority -> registry artifact/projection -> runtime/module builder -> release evidence.

## Workspace Deletion Impact

Deleting or blanking `workspace.json` does not delete database rows and does not remove the generated system registry. It only changes the editable Schema Studio design surface.

If a workspace is retired, use an archive/replacement flow:

1. Export and archive the current workspace document and baseline.
2. Create a replacement workspace from the current System Contract Registry, live DB reverse engineering, or an approved target design.
3. Preserve revision/audit evidence for the retired workspace.
4. Keep System Contract Registry read-only and regenerate it from migrations/registry publication tooling.

This keeps AI and frontend tools from guessing which layer is authoritative.
