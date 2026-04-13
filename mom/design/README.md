# HESEM Frontend Design SSOT

This directory contains the machine-readable frontend authority required by `standards/36-frontend-module-layout-template-standard.md`.

The files here are production contract artifacts, not visual documentation:

- `schemas/` defines the JSON contract shape.
- `schemas/graphics-governance.schema.json` defines backend contracts for design config, template governance, impact analysis, rollout, waiver, release evidence and graphics audit records.
- `template-registry.json` defines approved templates, legacy aliases, zones and block placement rules.
- `block-contracts/` defines the minimum production contract for every block type used by a module.
- `build-packets/` defines the per-module packet that binds module metadata, template, blocks, endpoints, accessibility, QA and traceability.
- `qa-gates/frontend-layout-qa-gates.json` defines the frontend gate catalog that validators and release review must use.

Current pilot scope:

- `M2-orders`
- `M4-purchasing`

Stop rule: a module is not frontend production-compliant until its build packet, template, block contracts and endpoint bindings pass `mom/tools/design/validate-frontend-contracts.mjs`.

Graphics governance stop rule:

- Template registry production authority is backend-controlled; local browser caches are preview/draft only.
- Release review must read the graphics compliance matrix, debt/drift report, active waivers and release blockers before publishing a module or applying a global graphics rollout.
- New modules and major refactors are blocked unless graphics linkage is `full-admin-controlled` or `bridged-to-shared-tokens` with approved, unexpired waiver evidence.
- Release manifests must carry graphics authority refs, template registry version/checksum, compliance matrix ref, impact analysis ref, waiver refs and rollback plan.
