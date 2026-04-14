# Business Contract Authority

This directory is the explicit semantic layer between:

- storage authority in `database/migrations/*.sql`
- generated runtime registry in `mom/data/registry/*.json`

Tranche 13 correction, 2026-04-14: this directory's authored business-contract bundle is present, and a bootstrap runtime registry now exists in the checked-in `mom/data/registry` path consumed by the application. The generated bootstrap table registry is structural and may be skeletal for domains/columns, so runtime registry consumers overlay the authored `mom/contracts/table-registry.json` metadata until full publication produces a complete runtime artifact. That bootstrap is not full publication truth: required publication artifacts such as `endpoint-catalog.json`, `frontend-foundation-catalog.json`, workflow/wave policy files, and system-contract outputs remain unverified until the full publication pipeline runs successfully.

Purpose:

- stop backend meaning from being implicit
- make canonical objects, state models, commands, events, and deprecations readable by humans and AI
- support non-destructive ERP + MOM restructuring

Authored source packages:

- `objects/*/contract.json`

Generated bundle files:

- `glossary.json`
- `domain-map.json`
- `authority-report.json`
- `package-index.json`
- `object-index.json`
- `state-model-index.json`
- `command-index.json`
- `event-index.json`
- `deprecation-ledger.json`
- `migration-manifest.json`

Generator:

- `mom/tools/contracts/generate_business_contract_bundle.py`

Rules:

- this layer does not define physical tables
- this layer does not replace migrations
- this layer does not replace the generated runtime registry
- this layer defines canonical meaning, ownership, and migration intent
- core lifecycle owners should prefer authored packages over pure inference from registry metadata
- `authority-report.json` is the rollout meter for authored coverage and the next-priority contract gaps
