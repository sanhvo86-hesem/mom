# Schema Authority Summary

**Declared**: 2026-04-24
**Scope**: Platform-global (837 tables)
**Migration range**: 001–155 (155 migrations)

## Authority Chain

| Layer | File | Role |
|-------|------|------|
| **Executable Source of Truth** | `database/migrations/001–155_*.sql` | Sequential DDL. Applied in order. This IS the schema. |
| **Generated Snapshot** | `database/schema.sql` | Aggregate of all migrations. Built by `build_schema_snapshot.php`. Reference only; regenerate after any migration change. |
| **Conceptual Blueprint** | `database/canonical-erp-mes-eqms-7-layer-blueprint.sql` | ISA-95/IEC 62264 7-layer design input. NOT executable authority. |
| **Specification Reference** | `database/mes-schema-specification.sql` | MES specification reference. NOT executable authority. |

## Anti-Parallel Authority Statement

There is exactly **one** schema authority chain: `migrations → schema.sql`.

Blueprint and specification SQL files are design inputs, not parallel authorities.
No table definition outside migrations is authoritative.

## Drift Control

- `schema.sql` is a generated artifact; if it differs from migrations, regenerate it.
- Full `table-registry.json` publication is intended to derive table metadata from `schema.sql` via `generate-table-architecture.mjs`; a bootstrap or partial registry is not schema authority.
- Physical partition children are storage implementation details; they are counted separately and excluded from frontend/runtime contract table targets.
- Registry does not modify schema; schema does not depend on registry.
- Snapshot CREATE TABLE statement count: 852
- Snapshot unique physical table count: 850
- Snapshot logical runtime-contract table count: 837
- Snapshot partition table count: 13
- Registry contract table count: 837
- Drift verifier: `tools/verify_schema_authority.py`

## Verification

```bash
python3 tools/verify_schema_authority.py
```
