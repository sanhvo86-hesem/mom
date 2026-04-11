# Schema Authority Model

This project separates database authority, generated system contracts, and editable design workspaces.

## Layers

| Layer | Purpose | Source | Write Policy | Delete Policy |
| --- | --- | --- | --- | --- |
| Physical DB schema | Runtime data storage in PostgreSQL | PostgreSQL schema `public` | Database writes only through application/runtime or governed migrations | Never delete from Schema Studio |
| DB authority | Versioned structural source of truth | `database/migrations/*.sql` -> `database/schema.sql` | Governed migration review, deployment gate, rollback planning | Immutable history; supersede with a later migration |
| System Contract Registry | Full backend contract for AI, frontend, API, workflow, and audit visibility | `data/registry/table-registry.json` and generated registry artifacts | Read-only generated artifact | Regenerate from authority; do not hand-edit or hard-delete |
| Workspace Design Draft | Editable schema design surface for baseline, diff, review, compiler, and release workflow | `data/schema-studio/designs/workspace.json` | Editable with revision guard and audit trail | Archive or replace through a controlled change; do not hard-delete while Schema Studio needs an editable surface |

## Workspace Deletion Impact

Deleting `workspace.json` does not delete database rows and does not remove the generated system registry. It does remove the editable Schema Studio surface, including design baseline/diff, compiler, and release-bundle workflows until a replacement workspace is created.

If a workspace is retired, use an archive/replacement flow:

1. Export and archive the current workspace document and baseline.
2. Create a replacement workspace from the current System Contract Registry or an approved target design.
3. Preserve revision/audit evidence for the retired workspace.
4. Keep System Contract Registry read-only and regenerate it from migrations/registry publication tooling.

This keeps AI and frontend tools from guessing which layer is authoritative.
