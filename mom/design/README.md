# HESEM Frontend Design SSOT

This directory contains the machine-readable frontend authority required by `standards/36-frontend-module-layout-template-standard.md`.

The files here are production contract artifacts, not visual documentation:

- `schemas/` defines the JSON contract shape.
- `schemas/graphics-governance.schema.json` defines backend contracts for design config, template governance, impact analysis, rollout, waiver, release evidence and graphics audit records.
- `template-registry.json` defines approved templates, legacy aliases, zones and block placement rules.
- `block-contracts/` defines the minimum production contract for every block type used by a module.
- `build-packets/` defines the per-module packet that binds module metadata, template, blocks, endpoints, accessibility, QA and traceability.
- `qa-gates/frontend-layout-qa-gates.json` defines the frontend gate catalog that validators and release review must use.
- `canonical/` contains the imported world-class 34-module canonical packet pack. It is the authoritative import set for broad module rollout planning, but promotion into `build-packets/` remains gated by the repo validator and backend graphics authority.
- `enriched/` contains derived catalogs and enriched packets. It is a projection layer, not an independent production authority.
- `graphics/` contains the imported graphics-governance artifacts: template authority, theme compatibility, compliance matrix, lineage graph, drift/debt/release schemas and runtime beacon contracts.
- `repo-alignment/` contains migration and backend-alignment notes used to reconcile the imported pack with the existing MOM MVC/API authority.

Current production-gated compatibility scope:

- `M2-orders`
- `M4-purchasing`

Imported canonical planning scope:

- 34 module packets listed in `canonical/manifest.json`
- 34 template authority rows listed in `graphics/template-registry-authority.json`
- 34 module compliance rows listed in `graphics/module-graphics-compliance-matrix.json`

Operational rule: the imported pack is not a second workflow. It feeds the same Admin -> backend authority -> shared tokens/components -> runtime/release evidence chain. A module becomes production-compliant only when its canonical packet is promoted or reconciled into the active production packet path, its template is backend-governed, and graphics compliance/release blockers pass.

Stop rule: a module is not frontend production-compliant until its build packet, template, block contracts and endpoint bindings pass `mom/tools/design/validate-frontend-contracts.mjs`.

Graphics governance stop rule:

- Template registry production authority is backend-controlled; local browser caches are preview/draft only.
- Release review must read the graphics compliance matrix, debt/drift report, active waivers and release blockers before publishing a module or applying a global graphics rollout.
- New modules and major refactors are blocked unless graphics linkage is `full-admin-controlled` or `bridged-to-shared-tokens` with approved, unexpired waiver evidence.
- Release manifests must carry graphics authority refs, template registry version/checksum, compliance matrix ref, impact analysis ref, waiver refs and rollback plan.
