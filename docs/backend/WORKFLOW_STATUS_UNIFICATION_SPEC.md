# Workflow And Status Unification Spec

This specification replaces fragmented status authority across PHP constants, JSON config, registry, workflow library, database constraints, OpenAPI, and frontend options.

## Current Status Mismatch

| Entity | Runtime PHP/JSON | Registry/status-options | Workflow-library | Database/migration evidence | Finding |
| --- | --- | --- | --- | --- | --- |
| Quote | `draft, internal_review, sent, accepted, rejected, expired, revised, converted` | `draft, review, sent, won, lost, expired` | `draft, review, sent, won, lost, expired` | Quote migration enum includes runtime-like values | documentation-runtime mismatch |
| SO | `draft, quoted, confirmed, in_production, shipped, closed, cancelled` | `sales_order_status`: `draft, confirmed, engineering_ready, in_production, shipped, closed`; `sales_order_status_code`: `draft, released, in_progress, completed, closed, cancelled` | `wf_sales_order` states `draft, confirmed, engineering_ready, in_production, shipped, closed` but statusSet `sales_order_status_code` | Multiple SO table variants | P0 mismatch; `engineering_ready` orphan until enforced |
| JO | `planned, released, active, on_hold, completed, closed, cancelled` | `draft, planned, released, active, completed, closed` | `draft, planned, released, active, completed, closed` | `job_orders` schema exists | `cancelled/on_hold` mismatch; `draft` registry not runtime |
| WO | `scheduled, setup, running, inspection, completed, on_hold, cancelled` | `draft, planned, released, in_production, quality_hold, closed, cancelled` | same as registry for `wf_work_order_execution` | `work_order` and `work_orders` both exist | Production WO lifecycle conflated with service/maintenance WO |
| NCR | Exception JSON + JSONL use `open` in automation | `draft, submitted, under_review, disposition_set, containment_active, close_requested, closed` | `wf_ncr` | `ncr_records` exists | unregistered runtime states |
| CAPA | JSONL trend trigger uses `pending_review` | `draft, initiated, action_planning, implementation, effectiveness_review, closed` | `wf_capa` | `capa_records` exists | unregistered trigger state |
| SCAR | Supplier JSON states are service-owned | `issued, acknowledged, root_cause_analysis, corrective_action, verification, closed, overdue` | `wf_scar_record` | `scar_records` exists | Multiple authorities |

## Canonical Lifecycle Targets

### Quote

Canonical states:

`draft -> internal_review -> sent -> accepted -> converted`

Alternate terminal states:

`sent -> rejected`, `sent -> expired`, `sent -> revised -> internal_review`

Deprecated mappings:

| Old state | Canonical state | Notes |
| --- | --- | --- |
| `review` | `internal_review` | Registry alias only. |
| `won` | `accepted` | Must not imply conversion. |
| `lost` | `rejected` | Terminal commercial loss. |

Required generated outputs:

- PHP `QuoteStatus` enum.
- `status-options.json` `quote_status`.
- `workflow-library.json` `wf_quote_lifecycle`.
- DB check/enum on quote status.
- OpenAPI enum and frontend options.

### Sales Order

Canonical states:

`draft -> quoted -> confirmed -> engineering_ready -> in_production -> shipped -> closed`

Alternate terminal/exception:

`draft|quoted|confirmed|engineering_ready|in_production -> cancelled` with reason and authority.

Rules:

- `engineering_ready` is mandatory before JO creation and production release.
- `confirmed` requires linked contract review and customer PO evidence.
- `shipped` can only be reached through `ConfirmDelivery`, not through raw logistics update.
- `closed` requires shipment, invoice policy, AR evidence, and no open quality/finance exceptions.

Deprecated mappings:

| Old state | Canonical state | Notes |
| --- | --- | --- |
| `released` from `sales_order_status_code` | `engineering_ready` or `in_production` by migration rule | Requires record-level evidence; cannot blind map without audit. |
| `in_progress` | `in_production` | Use only for legacy SO records. |
| `completed` | `shipped` or `closed` by shipment/invoice evidence | Requires migration script decision. |

### Job Order

Canonical states:

`planned -> released -> active -> completed -> closed`

Alternate states:

`released|active -> on_hold -> released|active`, any non-closed state -> `cancelled` with reason.

Rules:

- `planned` is created by `CreateJobOrder`.
- `released` requires SO `engineering_ready`, released route/BOM/control plan/inspection plan, and material plan.
- `active` is derived from at least one active/released WO or explicit `ReleaseJobOrder` policy.
- `closed` requires all WOs complete/closed and quality/ledger reconciliation.

### Work Order

Production WO canonical states:

`scheduled -> setup -> running -> inspection -> completed`

Alternate states:

`scheduled|setup|running|inspection -> on_hold -> scheduled|setup|running|inspection`; non-completed -> `cancelled`.

Rules:

- `scheduled` is created by `CreateWorkOrder`.
- `setup/running` requires `ReleaseWorkOrder`.
- `inspection` requires operation completion or in-process/final inspection route.
- `completed` requires inspection result and ledger postings.

Service/maintenance WO states must be separated from production WO. If `draft/planned/released/in_production/quality_hold/closed` is needed for maintenance/service, it must move to a separate `service_work_order_status` set and workflow.

### NCR/MRB/CAPA/SCAR

NCR canonical states:

`draft -> submitted -> containment_active -> under_review -> disposition_set -> implementation -> close_requested -> closed`

Alternate: `voided` only before `closed`, with e-signature and audit reason.

MRB canonical states:

`pending_review -> disposition_proposed -> disposition_approved -> executed -> closed`

Dispositions: `rework`, `scrap`, `use_as_is`, `return_to_supplier`, `sort_reinspect`.

CAPA canonical states:

`draft -> initiated -> root_cause -> action_planning -> implementation -> effectiveness_30 -> effectiveness_60 -> effectiveness_90 -> effectiveness_review -> closed`

SCAR canonical states:

`issued -> acknowledged -> root_cause_analysis -> corrective_action -> verification -> closed`

Alternate: `overdue` as derived SLA state, not a persisted lifecycle state unless kept as `sla_state`.

Deprecated mappings:

| Old state | Canonical state | Notes |
| --- | --- | --- |
| NCR `open` | `submitted` or `containment_active` | Use containment evidence to decide. |
| CAPA trigger `pending_review` | `initiated` with trigger review pending flag | Do not persist as lifecycle state. |
| SCAR `overdue` | `sla_state=overdue` | Keep lifecycle where it is. |

## Status Source Generation Rule

Create one machine-readable source, for example `mom/data/registry/workflow-status-authority.json`, containing:

- `entity`
- `status_column`
- `canonical_states`
- `terminal_states`
- `transition_matrix`
- `role_guards`
- `required_commands`
- `db_constraint_name`
- `legacy_mappings`
- `frontend_exposure`

Generated artifacts:

- PHP enums/constants in domain services.
- `mom/data/config/so_jo_wo_config.json`.
- `mom/data/registry/status-options.json`.
- `mom/data/registry/workflow-library.json`.
- OpenAPI schemas.
- Frontend option bundles.
- SQL enum/check migrations.
- Test fixtures for transition matrix.

CI must fail if a generated artifact is edited manually or if any runtime state is not registered.

## Migration Plan

1. Freeze governed mutations except read-only and command pilot.
2. Snapshot JSON stores and PostgreSQL tables.
3. Run status inventory query/tool across JSON and PG.
4. Generate migration mapping report for every old state.
5. Migrate Quote statuses:
   - `review -> internal_review`
   - `won -> accepted`
   - `lost -> rejected`
6. Migrate SO statuses:
   - Keep `draft/quoted/confirmed/in_production/shipped/closed/cancelled`.
   - If registry/PG has `released/in_progress/completed`, map only with evidence. Otherwise set `migration_hold` and require manual remediation.
   - Insert `engineering_ready` only when release package evidence exists; otherwise keep `confirmed`.
7. Migrate JO/WO statuses:
   - Add `cancelled` to config/registry.
   - Map registry WO `in_production -> running`; `quality_hold -> on_hold`; `closed -> completed|closed` depending table semantics.
8. Migrate NCR/CAPA/SCAR:
   - Convert JSONL triggers to canonical records or mark as `legacy_trigger_imported`.
9. Add DB constraints but initially `NOT VALID`.
10. Validate constraints after data cleanup.
11. Enable generated status source as required runtime dependency.
12. Remove old independent status constants/options.

## Acceptance Tests

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| WF-001 | Load generated status source and all generated artifacts | State sets are byte-equivalent after normalization. |
| WF-002 | Attempt SO `confirmed -> in_production` without engineering release | Fails; requires `ReleaseSalesOrderToProduction`. |
| WF-003 | Attempt JO/WO `cancelled` reporting after migration | State is registered in config, registry, workflow, and DB. |
| WF-004 | Attempt generic transition using stale `sales_order_status_code` values | Denied for governed table; command required. |
| WF-005 | Import legacy quote `won` | Migrates to `accepted`, not `converted`. |
| WF-006 | Quality JSONL `open` NCR import | Creates canonical NCR `submitted` or `containment_active`. |
| WF-007 | CAPA `pending_review` trigger | Creates CAPA `initiated` with trigger review metadata. |
| WF-008 | CI diff detects manual edit to generated `status-options.json` | CI fails with source-of-truth violation. |

