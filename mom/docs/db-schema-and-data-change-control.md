# DB Schema And Data Change Control

This document defines how to inspect and change DB schema and DB data without letting Schema Studio drafts become hidden authority.

## Authority Rules

| Area | Authority | Not Authority |
| --- | --- | --- |
| Physical database schema | `mom/database/migrations/*.sql`, applied in order to PostgreSQL schema `public` | `workspace.json`, `schema-studio-*`, conceptual SQL blueprints |
| Schema snapshot | `mom/database/schema.sql`, generated from migrations by `mom/database/build_schema_snapshot.php` | Manual edits to `schema.sql` |
| Backend contract | `mom/data/registry/system-contract-*.json`, generated from registry artifacts | Editable workspace draft |
| Runtime table/API/workflow catalog | `table-registry.json`, `relation-map.json`, `endpoint-catalog.json`, `workflow-library.json` and generated system contract artifacts | UI dropdown labels |
| Editable design work | `mom/data/schema-studio/designs/workspace.json`, currently blank | Runtime or DB source of truth |

## Inspect DB Schema

Use these layers in this order:

1. Read migration authority: `mom/database/migrations/*.sql`.
2. Confirm generated snapshot: `php mom/database/build_schema_snapshot.php`.
3. Refresh authority summary: `php mom/tools/schema/refresh_schema_authority_summary.php`.
4. Verify publication truth: `python3 mom/tools/registry/verify_publication_truth.py`.
5. Inspect live DB through `SchemaStudioController::reverseEngineer()` or direct PostgreSQL `information_schema` queries when DB credentials are available.
6. Check Data Schema metrics for `authoritative_table_count`, `system_contract_table_count`, `db_structural_drift_table_count`, `db_missing_column_count`, `db_unexpected_column_count`, and migration backlog.

## Change DB Schema

Normal path:

1. Create a new ordered migration file under `mom/database/migrations/NNN_descriptive_name.sql`.
2. Make it idempotent where practical and transactional when the DB operation supports it.
3. Include explicit rollback notes when destructive changes are unavoidable.
4. Run `php mom/database/migrate.php --dry-run` to confirm pending migration selection.
5. Apply migrations through `php mom/database/migrate.php` on the target environment.
6. Regenerate `mom/database/schema.sql` with `php mom/database/build_schema_snapshot.php`.
7. Refresh generated authority artifacts with `php mom/tools/schema/refresh_data_schema_authority.php --skip-publication`.
8. Run smoke and truth checks before frontend work depends on the new contract.

Do not manually edit `schema.sql`, `table-registry.json`, or workspace draft to pretend the DB schema changed. Those are generated or design surfaces, not executable DDL authority.

## Inspect DB Data

Use read-only paths first:

1. Application/runtime APIs for business objects.
2. Schema Studio `previewTableData()` for controlled admin preview, limited by schema/table/limit/offset.
3. `mom/database/HealthCheck.php` for connection, table existence, row count, migration status, and JSON-vs-PostgreSQL comparison.
4. Direct SQL `SELECT` only for admin diagnostics, never as an undocumented business workflow.

## Change DB Data

Normal business data changes must go through service/runtime endpoints so permission checks, CSRF, audit logging, workflow state, and invariants run.

Controlled data migrations or seed/backfill work must be:

- Transactional or safely restartable.
- Idempotent, using natural keys or conflict handling.
- Auditable, with source file, actor, timestamp, and reason.
- Linked to the migration or backfill script that produced the change.
- Verified by row counts and targeted business assertions.

Schema Studio `saveTableRow()` is a break-glass admin surface. It requires database access and `schema_studio.data_write`; it should not be used as the normal ERP/MOM data-entry path.

Schema Studio `applyMigration()` is also a controlled admin surface. It blocks data statements such as `INSERT`, `UPDATE`, `DELETE`, `COPY`, and `TRUNCATE`; destructive DDL requires explicit confirmation. The normal source-controlled path remains migration files.

## Required Verification Gate

Before a schema/data change is considered safe:

```bash
php -l mom/api/services/DataSchemaService.php
php -l mom/api/controllers/SchemaStudioController.php
php mom/tests/data_schema_admin_smoke.php
php mom/tests/backend_smoke.php
python3 mom/tools/registry/verify_publication_truth.py
```

Pass criteria:

- System Contract Registry still reports full platform coverage.
- Workspace draft being blank does not create runtime risk.
- Operational blocking risk count is zero.
- Critical system contract gap count is zero.
- Migration backlog and live DB drift are explicitly known before deployment.
