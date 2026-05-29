# P29 Handoff Packet

prompt_id: `P29`

decision_token: `P29_PASS_WITH_CONTROLLED_GAPS`

repo_commit_before_p29: `349420739`

## Files Created

- `mom/database/migrations/233_item_revision_profile_authority.sql`
- `mom/api/services/ItemRevisionAuthorityService.php`
- `mom/tests/Unit/Services/ItemRevisionAuthorityServiceTest.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P29_MAIN.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P29_SOURCE_TRUTH_AUDIT.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P29_IMPLEMENTATION_PLAN.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P29_SIMULATION_MATRIX.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P29_ADVERSARIAL_AUDIT.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P29_GAP_LEDGER_UPDATE.csv`

## Files Modified

- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `mom/api/controllers/GenericCrudController.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`

## Tests Run

- `php -l mom/api/services/ItemRevisionAuthorityService.php`
- `php -l mom/tests/Unit/Services/ItemRevisionAuthorityServiceTest.php`
- `php -l mom/api/controllers/GenericCrudController.php`
- `php -l mom/api/services/*.php 2>/dev/null || true`
- `php -l mom/api/controllers/*.php 2>/dev/null || true`
- `python3 -m json.tool mom/contracts/governed-entities.json`
- Direct PHP smoke for released revision edit block, draft UOM block, and customer revision mismatch.
- `php mom/tools/release/check_user_identity_ssot.php || true`
- `php mom/tools/audit_runtime_authority_consistency.php || true`
- `php mom/tools/release/check_migration_drift.php || true`
- `composer test -- --filter Item, || true`
- `composer --working-dir=mom test -- --filter ItemRevisionAuthorityServiceTest || true`
- `npm test -- --runInBand 2>/dev/null || true`

## Open P0 Blockers

- Inherited P30/P33/P34/P36 blockers remain outside P29: engineering release package physicalization, canonical hold, ResourceReadinessService, and inventory/cost ledger reconciliation.
- P29 introduces no new P0 blocker.

## Open P1 Blockers

- P31 must implement item/revision/site/crossref command services with idempotency, audit/evidence, outbox, problem details, and transactional enforcement.
- P32 must implement e-sign, re-auth, SoD exception lifecycle, and record hash linkage for regulated release actions.
- P37/P40 must run live PostgreSQL migration/reconciliation/restore evidence and regenerate generated registries/OpenAPI/frontend projections.
- P36 must consume item/site/profile and supplier/customer crossref authority in inventory, WIP, genealogy, and cost ledger gates.

## Controlled Gaps

- Local runtime audit remains `JSON_ONLY`; PostgreSQL is not configured/reachable in this worktree.
- `mom/contracts/table-registry.json` is generated and was not hand-edited.
- PHPUnit runner is unavailable because `mom/vendor/bin/phpunit` is missing.
- P29 service is a deterministic gate helper, not final command mutation authority.

## Next Prompt Unlock Condition

P30 is unlocked because P29 physicalized deterministic item/revision/profile/crossref surfaces and registered remaining P1 authority gaps. P30 must build the engineering release package on top of P29 item revision immutability and must not claim runtime readiness until P31/P32/P37 close command, e-sign, and cutover proof.

## Notes For Next Agent

Use `ItemRevisionAuthorityService::authorityProbe()` and migration `233` as P29 evidence. Do not mutate released item revisions or specs directly; ECO/revision replacement is the only acceptable path. Do not hand-edit generated registry artifacts.
