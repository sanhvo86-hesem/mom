prompt_id: P36
decision_token: P36_PASS_WITH_CONTROLLED_GAPS
repo_commit: pending
branch: codex/mda-v3-runtime-upgrade-20260529
implementation_mode: hybrid-runtime-repair

files_created:
- `mom/database/migrations/240_inventory_ledger_genealogy_wip_cost_authority.sql`
- `mom/api/services/InventoryLedgerAuthorityService.php`
- `mom/tests/Unit/Services/InventoryLedgerAuthorityServiceTest.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P36_SOURCE_TRUTH_AUDIT.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P36_IMPLEMENTATION_PLAN.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P36_SIMULATION_MATRIX.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P36_ADVERSARIAL_AUDIT.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P36_GAP_LEDGER_UPDATE.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P36_MAIN.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P36_HANDOFF_PACKET.md`

files_modified:
- `mom/api/controllers/GenericCrudController.php`
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_GENERIC_CRUD_DENYLIST_MATRIX.csv`

tests_run:
- `php -l mom/api/services/InventoryLedgerAuthorityService.php`
- `php -l mom/tests/Unit/Services/InventoryLedgerAuthorityServiceTest.php`
- `php -l mom/api/controllers/GenericCrudController.php`
- `php -l mom/api/services/*.php 2>/dev/null || true`
- `php -l mom/api/controllers/*.php 2>/dev/null || true`
- `python3 -m json.tool mom/contracts/governed-entities.json`
- CSV parse for proof/denylist matrices
- direct PHP smoke for P36 required scenarios and reconciliation mismatch
- `composer test -- --filter Inventory, || true`
- `composer --working-dir=mom test -- --filter InventoryLedgerAuthorityServiceTest || true`
- `php mom/tools/audit_runtime_authority_consistency.php || true`
- `php mom/tools/release/check_migration_drift.php || true`
- `php mom/tools/release/check_user_identity_ssot.php || true`
- `npm test -- --runInBand 2>/dev/null || true`
- `git diff --check`

open_p0_blockers:
- Inventory command handlers are not yet live P31/P32 PostgreSQL transaction handlers.
- PostgreSQL runtime is still inactive/unreachable locally; runtime audit remains `JSON_ONLY`.

open_p1_blockers:
- Projection refresh writers must set `app.inventory_projection_refresh=on` after migration 240.
- Scheduled reconciliation runner and period-close UI/telemetry are not live.
- Recall export review/release/void workflow is not live.
- Local PHPUnit vendor is missing.

controlled_gaps:
- P36 is service/schema/test proof, not live command authority.
- Balance projection DB guard is intentionally fail-closed and requires P37/P39 writer updates.
- Generated table registry/OpenAPI/Arazzo artifacts were not regenerated in P36.

next_prompt_unlock_condition:
- P37 is unlocked. It must wire domain command handlers/telemetry to the P31/P32 transaction spine and consume P34/P35/P36 services without bypassing audit/evidence/outbox.

notes_for_next_agent:
- Do not treat `InventoryLedgerAuthorityService` as persistence. It returns packets/gates that command handlers must persist atomically.
- Projection tables may only be refreshed under the trusted DB session setting introduced in migration 240.
- Preserve UOM work owned by other sessions.
