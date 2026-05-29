# P28 Handoff Packet

prompt_id: `P28`

decision_token: `P28_PASS_WITH_CONTROLLED_GAPS`

repo_commit_before_p28: `7a303f12a`

## Files Created

- `mom/database/migrations/232_party_identity_link_authority.sql`
- `mom/api/services/PartyIdentityAuthorityService.php`
- `mom/tests/Unit/Services/PartyIdentityAuthorityServiceTest.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_MAIN.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_SOURCE_TRUTH_AUDIT.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_IMPLEMENTATION_PLAN.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_SIMULATION_MATRIX.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_ADVERSARIAL_AUDIT.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P28_GAP_LEDGER_UPDATE.csv`

## Files Modified

- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `mom/api/controllers/GenericCrudController.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`

## Tests Run

- `php -l mom/api/services/PartyIdentityAuthorityService.php`
- `php -l mom/tests/Unit/Services/PartyIdentityAuthorityServiceTest.php`
- `python3 -m json.tool mom/contracts/governed-entities.json`
- `php mom/tools/release/check_user_identity_ssot.php || true`
- Direct PHP smoke for terminated employee block and SoD self-approval block.
- `php mom/tools/audit_runtime_authority_consistency.php || true`: still `JSON_ONLY`, PostgreSQL not configured/reachable.
- `php mom/tools/release/check_migration_drift.php || true`: only existing P2 prefix collisions for `108`, `115`, and `188`.
- `composer test -- --filter Party, || true`: unavailable, root Composer has no `test` command.
- `composer --working-dir=mom test -- --filter PartyIdentityAuthorityServiceTest || true`: unavailable, `vendor/bin/phpunit` missing.
- `npm test -- --runInBand 2>/dev/null || true`: no runnable test output.
- `git diff --check`

## Open P0 Blockers

- Inherited P33/P34/P36 P0 blockers remain outside P28: canonical hold absence, ResourceReadinessService absence, inventory reconciliation absence.
- P28 does not introduce a new P0 blocker.

## Open P1 Blockers

- P31 must implement command envelope, idempotency, audit/evidence, outbox, and problem details for party link, approvals, and merge apply.
- P32 must implement e-sign/re-auth/SoD exception lifecycle.
- P34 must consume the qualification chain in ResourceReadinessService.
- P37/P40 must regenerate generated registries/OpenAPI and telemetry surfaces.
- P29 must prove migration execution, drift, and restore evidence in a reachable PostgreSQL environment.

## Controlled Gaps

- PHPUnit runner unavailable in this checkout because `mom/vendor/bin/phpunit` is missing.
- Live PostgreSQL is not configured/reachable; migration `232` was linted structurally by review but not applied to a database.
- `table-registry.json` is generated and was not hand-edited.

## Next Prompt Unlock Condition

P29 may run next. It must consume migration `232`, the P28 gap ledger, and the updated runtime proof matrix. It must not claim POSTGRES_PRIMARY/POSTGRES_ONLY for party identity unless live migration, reconciliation, backup/restore, and drift evidence exist.

## Notes For Next Agent

Use `PartyIdentityAuthorityService::authorityProbe()` and the new physical tables as evidence that P28 physicalized the bridge. Do not treat the service as final command authority. Mutation authority remains locked to P31/P32 command and e-sign spines.
