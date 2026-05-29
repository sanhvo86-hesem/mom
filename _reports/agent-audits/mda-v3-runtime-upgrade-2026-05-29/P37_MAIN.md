# P37 Main Report - JSON to PostgreSQL Cutover, Restore Drill and Control Tower

## 1. Executive Verdict

Decision token: `P37_PASS_WITH_CONTROLLED_GAPS`.

P37 created a safe runtime proof slice for JSON to PostgreSQL cutover control: physical evidence tables, a side-effect-free cutover evaluator service, Generic CRUD hard stops, unit-test coverage and required simulation proof. It does not claim production cutover readiness because the local runtime audit still reports `JSON_ONLY`, live PostgreSQL rehearsal was not executed, restore drill evidence was simulated rather than persisted from a real restore, and the control tower UI/dashboard is not live.

## 2. Source Truth Audit

See `P37_SOURCE_TRUTH_AUDIT.csv`.

Key findings:

- `POSTGRES_MIGRATION_AND_SYNC_SPEC.md` requires drift reports, fallback monitoring, restore proof and rollback controls before PG-only.
- `DataLayer` exposes migration modes and fallback metadata but current runtime audit remains `JSON_ONLY`.
- Prior red-team and gap ledgers explicitly classify cutover and restore as implementation gaps.
- `mom/contracts/table-registry.json` is generated and stale for migration 241; it must be regenerated later, not hand-edited.

Discovery summary:

- `pwd`: `/Users/a10/Documents/mom-mda-v3-runtime-20260529`
- `git rev-parse --short HEAD` before P37 commit: `97280e859`
- `git status --short` showed only P37-scoped edits and new files.
- Grep evidence confirmed prior `runtime-complete`, `JSON primary`, `compatibility_only` and `PASS_WITH_CONTROLLED_GAPS` warnings.

## 3. Runtime Evidence Probe

Implemented evidence anchors:

- `runtime_cutover_rehearsal_run`
- `runtime_cutover_collection_probe`
- `runtime_cutover_fallback_incident`
- `runtime_restore_drill_evidence`
- `runtime_cutover_wave_gate`

Implemented evaluator:

- `RuntimeCutoverControlTowerService::evaluateFallbackRead()`
- `RuntimeCutoverControlTowerService::evaluateCollectionCountGate()`
- `RuntimeCutoverControlTowerService::evaluateDriftReport()`
- `RuntimeCutoverControlTowerService::evaluateRestoreDrill()`
- `RuntimeCutoverControlTowerService::generateHumanDriftExport()`
- `RuntimeCutoverControlTowerService::evaluateCutoverReadiness()`

Direct smoke returned:

```json
{
  "SIM-P37-001": "postgres_primary_fallback_incident_recorded",
  "SIM-P37-002": "drift_blocks_postgres_only",
  "SIM-P37-003": "restore_drill_checksum_mismatch_blocks_cutover",
  "SIM-P37-004": "collection_row_count_mismatch_blocks_cutover",
  "SIM-P37-005": "human_readable_drift_export_generated",
  "export_hash_ok": true
}
```

## 4. Files Changed

Created:

- `mom/database/migrations/241_runtime_cutover_control_tower.sql`
- `mom/api/services/RuntimeCutoverControlTowerService.php`
- `mom/tests/Unit/Services/RuntimeCutoverControlTowerServiceTest.php`
- `P37_SOURCE_TRUTH_AUDIT.csv`
- `P37_IMPLEMENTATION_PLAN.md`
- `P37_SIMULATION_MATRIX.csv`
- `P37_ADVERSARIAL_AUDIT.md`
- `P37_GAP_LEDGER_UPDATE.csv`
- `P37_MAIN.md`
- `P37_HANDOFF_PACKET.md`

Modified:

- `mom/api/controllers/GenericCrudController.php`
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `MDA_V3_RUNTIME_PROOF_MATRIX.csv`
- `MDA_V3_DOMAIN_RUNTIME_MATURITY_SCORECARD.csv`
- `MDA_V3_GENERIC_CRUD_DENYLIST_MATRIX.csv`
- `.ai/` generated index files, regenerated after PHP/migration changes per AGENTS workflow.

Intentionally not changed:

- UOM files and branches owned by other AI sessions.
- `mom/contracts/table-registry.json`, because it is generated and must be refreshed by the registry generator after migration acceptance.
- DataLayer runtime mode, because P37 must not flip production authority.

## 5. Design and Code Delta

Migration 241 is additive and reversible. It stores cutover run headers, per-collection parity probes, fallback incidents, restore checksum evidence and wave-gate decisions.

`RuntimeCutoverControlTowerService` produces deterministic gate payloads and hashes but does not persist state. This keeps P37 safe in the current branch while defining exactly what future P31/P32 command handlers must store inside PostgreSQL transactions.

Generic CRUD denylist and governed registry updates make P37 evidence tables governed records, not editable projections.

## 6. Simulation Summary

See `P37_SIMULATION_MATRIX.csv`.

All required prompt scenarios were converted into service tests or direct smoke checks. One additional scenario was added for `POSTGRES_ONLY` with open fallback incidents.

## 7. Adversarial Audit Summary

See `P37_ADVERSARIAL_AUDIT.md`.

Critical repairs completed before pass:

- False `unkeyed_collection` logic repaired.
- Drift status/count mismatch blocking strengthened.
- P37 tables added to Generic CRUD mutation hard stop.
- ROOT-INT proof/maturity rows updated.

## 8. Gap Ledger Update

See `P37_GAP_LEDGER_UPDATE.csv`.

Open blockers are controlled, owned and handed to P38/P39/P41. No runtime-ready claim is made.

## 9. CI and Test Evidence

Executed or queued for validation in this prompt:

- `php -l mom/api/services/RuntimeCutoverControlTowerService.php` passed.
- `php -l mom/tests/Unit/Services/RuntimeCutoverControlTowerServiceTest.php` passed.
- `php -l mom/api/controllers/GenericCrudController.php` passed.
- JSON parse for `mom/contracts/governed-entities.json` passed.
- CSV parse for proof, maturity and denylist matrices passed.
- Direct PHP smoke for SIM-P37-001 through SIM-P37-005 passed.
- `php tools/scripts/ai-index/generate.php --verbose` completed and updated generated `.ai/` indexes.

Required prompt commands were run during verification and recorded in handoff. Known environment limitations remain: root `composer test` has no script, local `mom/vendor/bin/phpunit` is unavailable, and runtime authority audit remains `JSON_ONLY`.

## 10. Decision Token

`P37_PASS_WITH_CONTROLLED_GAPS`

## 11. Handoff

P38 is unlocked. It must consume P37 outputs in an executable scenario DSL/dashboard without claiming production cutover until live PostgreSQL rehearsal, persisted evidence and restore drill are proven.
