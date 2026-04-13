# PostgreSQL Migration And Sync Spec

This spec governs migration from JSON-first runtime stores to PostgreSQL transactional authority.

## Migration Modes

| Mode | Definition | Allowed for governed domains | Required exit criterion |
| --- | --- | --- | --- |
| `JSON_ONLY` | Read/write JSON only | Temporary only | Migration backlog and no enterprise-ready claim |
| `SHADOW_WRITE` | Read JSON, write JSON and PostgreSQL | Yes during migration | Drift report zero missing records and acceptable mismatches |
| `POSTGRES_PRIMARY` | Read PostgreSQL, fallback JSON, write both | Yes during cutover | No fallback reads for defined window |
| `POSTGRES_ONLY` | Read/write PostgreSQL only | Target | Backup/restore and rollback tested |

Current code supports these modes in `DataLayer`, but runtime services do not consistently use `DataLayer`; several services instantiate JSON-only paths directly.

## Current Sync Findings

| Area | Finding | Required remediation |
| --- | --- | --- |
| Master data | JSON contains `routing_library`, `bom_library`, `control_plans`, `inspection_plans`, traveler/quality gate/customer/supplier approvals; `DataLayer::loadRuntimeMasterDataFromPg()` does not rebuild all of these. | Add complete collection mapping and tests. |
| Orders | `OrderController`/`QuoteService` often writes JSON stores through dedicated services, not always DB-backed `DataLayer`. | Commands must use PG transaction authority. |
| MES | `MtconnectPollingService` syncs master/orders/MES stores to PG when not JSON-only; raw event stream is not canonical. | Add raw event table and idempotent replay. |
| Quality | Exception JSON, logistics OQC JSON, supplier-quality JSON, quality JSONL, and PG quality tables diverge. | Canonical quality importer and single command authority. |
| Supplier quality shadow write | `SupplierQualityService` now maps SCAR shadow writes to `scar_records` instead of the wrong `supplier_scorecards` target; scorecard remains JSON primary with PG shadow best-effort only. | Add deterministic upsert keys, table-specific column mapping, reconciliation, and failure reporting before trusting supplier quality PG projections. |
| Idempotency ledger | Migration `097` now uses `scope_key TEXT`, `scope_key_hash CHAR(64)`, and unique `(scope_key_hash, idempotency_key)` so long command scopes are not truncated; runtime refuses to reclaim `in_progress` rows automatically. | Add real PostgreSQL CI integration and operator recovery workflow for stale `in_progress` rows. |
| Drift tool | `audit_runtime_authority_consistency.php` now runs in current `JSON_ONLY` mode after the `audit_collection()` argument fix. | Expand coverage and fail conditions before trusting cutover reports. |

## Missing Sync Keys

Minimum required master-data collections:

| Collection | Key | Runtime use |
| --- | --- | --- |
| `customers` | `customer_id` | SO/contract/customer PO |
| `customer_sites` | `site_id` | shipping, contract terms |
| `commercial_accounts` | `account_id` | credit/terms |
| `suppliers` | `supplier_id` | PO/IQC/SCAR/ASL |
| `parts` | `part_number` | SO/JO/WO/inventory |
| `revisions` | `revision_id` | engineering readiness |
| `routing_library` | `routing_id` | JO/WO operation generation |
| `bom_library` | `bom_id` | material planning/issue |
| `control_plans` | `control_plan_id` | release and inspection enforcement |
| `inspection_plans` | `inspection_plan_id` | OQC/IQC/mobile inspection |
| `traveler_templates` | `traveler_template_id` | production release |
| `quality_gate_profiles` | `quality_gate_profile_id` | shipment/production gates |
| `customer_item_approvals` | `approval_id` | contract/engineering release |
| `supplier_process_approvals` | `approval_id` | ASL/special process |
| `warehouse_locations` | `warehouse_id` or `location_id` | putaway/issue |
| `defect_catalog` | `defect_code` | NCR/OQC/IQC |
| `nc_program_releases` | `program_id` | WO release |
| `work_centers` | `work_center_id` | routing/dispatch |
| `machines` | `machine_id` | MES/WO release |
| `operators` | `operator_id` | MES qualification |
| `tooling_assets` | `tool_id` | WO release |
| `mes_connectivity_adapters` | `adapter_id` | machine event ingestion |
| `mes_alarm_catalog` | `alarm_code` | alarm escalation |
| `mes_alarm_playbooks` | `playbook_id` | alarm response |
| `tool_assemblies` | `assembly_id` | setup/release |

All collections must have:

- JSON key.
- PG source table and ID column.
- Metadata shape mapping.
- Diff strategy.
- Owner.
- Required/optional classification.

## Master-Data Sync Completeness

`syncMasterDataStore()` and PG rebuild must round-trip:

1. JSON -> PG shadow write.
2. PG -> JSON rebuild.
3. Canonical sort/normalize.
4. Diff by key.
5. Report missing in PG, missing in JSON, field mismatches.

Acceptance: `bom_library`, `routing_library`, `control_plans`, and `inspection_plans` are included and fail CI if omitted.

## Drift Detection Tool Requirements

`mom/tools/audit_runtime_authority_consistency.php` has passed the first runtime repair:

- `audit_domain()` calls `audit_collection($domain, $collection, $jsonRows, $pgRows)`.
- The tool can emit a JSON report in the current `JSON_ONLY` environment.

The tool is still not complete. It must next:

- The script must exit non-zero on fatal drift or unknown governed state.
- Output JSON and human summary.
- Include master_data, orders, MES, Epicor, quality, supplier-quality, finance controls after canonicalization.
- Identify unkeyed collections as failures for governed domains.
- Identify status values not present in workflow authority.

Required report sections:

- Collection count.
- Missing in PostgreSQL.
- Missing in JSON.
- Mismatch samples.
- Unknown statuses.
- Duplicate identifiers.
- Last sync timestamp by domain.
- Recommended cutover blocker list.

## Reconciliation Reports

| Report | Purpose | Required before cutover |
| --- | --- | --- |
| Master-data readiness reconciliation | BOM/routing/CP/IP/traveler/approval parity | Yes |
| Orders reconciliation | Quote/SO/JO/WO hierarchy parity and status mapping | Yes |
| Quality reconciliation | NCR/CAPA/MRB/SCAR/OQC/IQC/holds parity | Yes |
| Supplier quality projection reconciliation | JSON `incoming`, `scar`, `asl`, `audits`, `scorecards` to PG `iqc_inspections`, `scar_records`, ASL/cert tables, audit records, scorecard snapshots | Yes |
| Inventory ledger reconciliation | Ledger sum equals balance, lot status parity | Yes |
| Finance reconciliation | Period close/backdate/AP/AR/GL posting parity | Yes |
| MES event reconciliation | Raw events, derived events, latest signal parity | Yes for machine cutover |
| DPP/genealogy reconciliation | Lot/serial genealogy and DPP parity | Yes for traceability release |

## Cutover Checklist

1. Freeze Generic CRUD mutations for governed tables.
2. Deploy command services behind feature flags.
3. Run JSON snapshot and database backup.
4. Run fixed drift detection and store evidence.
5. Run data migration mapping unknown statuses.
6. Enable `SHADOW_WRITE` for selected domain.
7. Run command simulation tests with dual-write.
8. Validate drift report daily until zero blocker drift.
9. Switch to `POSTGRES_PRIMARY`.
10. Monitor fallback reads and command errors.
11. Disable fallback after stability window.
12. Switch to `POSTGRES_ONLY`.
13. Archive JSON as evidence/export, not authority.

## Rollback Strategy

Rollback is allowed only from `POSTGRES_PRIMARY` to `SHADOW_WRITE` if:

- Command event log is intact.
- JSON dual-write was enabled for all commands in rollback window.
- Drift report shows no missing command-created records.
- No PostgreSQL-only migration has been accepted without reverse mapping.

Rollback is not allowed from `POSTGRES_ONLY` unless a tested restore procedure recreates JSON exports from PG.

## Data Integrity Tests

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| PG-001 | Run drift tool | No fatal error; includes master/orders/MES collections. Baseline repaired on 2026-04-13. |
| PG-002 | Omit `bom_library` from PG rebuild | CI fails. |
| PG-003 | JSON SO status unknown to workflow authority | CI fails with unknown state report. |
| PG-004 | Duplicate converted quote mapping | Migration fails before cutover. |
| PG-005 | Ledger balance mismatch | Cutover blocked. |
| PG-006 | PG primary read falls back to JSON | Observability report records fallback and reason. |
| PG-007 | Rollback snapshot restore | Command-created record remains consistent in JSON and PG. |
| PG-008 | Supplier quality shadow write maps a SCAR record | `scar_records` row is upserted with deterministic key; no write to `supplier_scorecards`. |
| PG-009 | Supplier quality reconciliation with one missing SCAR in PG | Report exits non-zero and lists the missing `scar_id`. |
| PG-010 | Supplier quality shadow write failure | JSON command response reports warning/telemetry and reconciliation marks PG projection stale; no silent cutover pass. |
| PG-011 | Idempotency scope key over 255 chars | Insert succeeds, raw `scope_key` is preserved as `TEXT`, and unique replay is enforced by `scope_key_hash`. |
| PG-012 | Expired `in_progress` idempotency row | Runtime rejects retry instead of reclaiming the row; operator recovery report lists the stale row. |
