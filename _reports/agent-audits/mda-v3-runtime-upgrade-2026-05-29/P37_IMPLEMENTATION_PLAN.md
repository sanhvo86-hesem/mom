# P37 Implementation Plan

## Domain

P37 affects `integration_resilience`, `master_data`, `mes_execution`, `inventory_logistics`, `quality_improvement`, `planning_production`, `finance` and `record_system` because JSON to PostgreSQL cutover gates must see every governed domain before any `POSTGRES_PRIMARY` or `POSTGRES_ONLY` claim.

## Tables

Created by migration `241_runtime_cutover_control_tower.sql`:

- `runtime_cutover_rehearsal_run`
- `runtime_cutover_collection_probe`
- `runtime_cutover_fallback_incident`
- `runtime_restore_drill_evidence`
- `runtime_cutover_wave_gate`

Existing dependencies:

- `data_collection_state`
- `data_collection_drift`
- `domain_command_audit`
- `domain_command_outbox_link`
- `domain_outbox_events`
- `idempotency_replay_ledger`

## Files Created

- `mom/database/migrations/241_runtime_cutover_control_tower.sql`
- `mom/api/services/RuntimeCutoverControlTowerService.php`
- `mom/tests/Unit/Services/RuntimeCutoverControlTowerServiceTest.php`
- P37 report artifacts in `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/`

These paths comply with `.ai/CONVENTIONS.md`: migration under `mom/database/migrations/`, service under `mom/api/services/`, test under `mom/tests/`, generated AI reports under `_reports/`.

## Files Modified

- `mom/api/controllers/GenericCrudController.php`
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_DOMAIN_RUNTIME_MATURITY_SCORECARD.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_GENERIC_CRUD_DENYLIST_MATRIX.csv`

## Runtime Delta

P37 adds a reversible, side-effect-free runtime proof slice:

- A physical evidence model for rehearsal run headers, per-collection probes, fallback incidents, restore drill checksums and wave gates.
- `RuntimeCutoverControlTowerService` to evaluate fallback reads, collection count probes, drift reports, restore drills and target-mode readiness.
- Generic CRUD hard stop coverage for all new evidence tables.
- Registry and proof matrix updates so cutover evidence cannot be silently treated as projection-only documentation.

## Regression Surface

- Generic CRUD writes to P37 evidence tables must now return `409 domain_command_required`.
- Any future table-registry generation must include migration 241 tables or P37 evidence will appear stale in registry views.
- Real cutover command handlers must persist service outputs transactionally; this service intentionally does not write DB rows.
- `POSTGRES_ONLY` promotion must remain blocked until a real restore drill and zero-drift rehearsal exist.

## Verification Plan

- PHP syntax for new service/test and touched controller.
- JSON parse of governed entity registry.
- CSV parse of runtime proof and denylist matrices.
- Direct PHP smoke for SIM-P37-001 through SIM-P37-005.
- Required prompt commands, reported as pass or tool unavailable.
- Runtime authority audit to confirm current mode remains visible rather than hidden.
