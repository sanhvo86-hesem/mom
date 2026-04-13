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
