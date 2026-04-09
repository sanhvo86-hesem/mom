# Schema Authority Summary

**Declared**: 2026-04-09
**Scope**: Platform-global (652 tables)
**Migration range**: 001–085 (85 migrations)

## Authority Chain

| Layer | File | Role |
|-------|------|------|
| **Executable Source of Truth** | `database/migrations/001–085_*.sql` | Sequential DDL. Applied in order. This IS the schema. |
| **Generated Snapshot** | `database/schema.sql` | Aggregate of all migrations. Built by `build_schema_snapshot.php`. Reference only; regenerate after any migration change. |
| **Conceptual Blueprint** | `database/canonical-erp-mes-eqms-7-layer-blueprint.sql` | ISA-95/IEC 62264 7-layer design input. NOT executable authority. |
| **Specification Reference** | `database/mes-schema-specification.sql` | MES specification reference. NOT executable authority. |

## Anti-Parallel Authority Statement

There is exactly **one** schema authority chain: `migrations → schema.sql`.

Blueprint and specification SQL files are design inputs, not parallel authorities.
No table definition outside migrations is authoritative.

## Drift Control

- `schema.sql` is a generated artifact; if it differs from migrations, regenerate it.
- `table-registry.json` derives table metadata from `schema.sql` via `generate-table-architecture.mjs`.
- Registry does not modify schema; schema does not depend on registry.
- Snapshot CREATE TABLE count: 642
- Drift verifier: `tools/verify_schema_authority.py`

## Verification

```bash
python3 tools/verify_schema_authority.py
```
