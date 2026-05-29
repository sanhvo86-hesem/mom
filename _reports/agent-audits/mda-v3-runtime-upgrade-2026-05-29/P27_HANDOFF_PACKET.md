# P27 Handoff Packet

prompt_id: `P27`

decision_token: `P27_PASS_WITH_CONTROLLED_GAPS`

repo_commit_before_p27: `da5682804`

## Files Created

- `mom/api/services/DataLayerMasterDataRepository.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P27_MAIN.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_MASTERDATA_PG_REPOSITORY_SPEC.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_JSON_CUTOVER_BRIDGE_MAP.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_DRIFT_RECONCILIATION_TEST_PLAN.md`

## Files Modified

- `mom/api/services/MasterDataService.php`
- `mom/api/controllers/MasterDataController.php`
- `mom/api.php`
- `mom/database/DataLayer.php`
- `mom/database/RuntimeShadowSync.php`
- `mom/tests/Unit/Services/MasterDataRepositoryBoundaryTest.php`

## Tests Run

- `php -l mom/api/services/MasterDataService.php`
- `php -l mom/api/services/DataLayerMasterDataRepository.php`
- `php -l mom/api/controllers/MasterDataController.php`
- `php -l mom/api.php`
- `php -l mom/database/DataLayer.php`
- `php -l mom/database/RuntimeShadowSync.php`
- `php -l mom/tests/Unit/Services/MasterDataRepositoryBoundaryTest.php`
- Direct smoke: JSON_ONLY repository bridge creates/finds customer and reports `compatibility_only`.
- Direct smoke: PostgreSQL authority with unreachable PG blocks JSON fallback via `master_data_postgres_authority_unavailable`.
- `php mom/tools/audit_runtime_authority_consistency.php || true`
- `php mom/tools/release/check_user_identity_ssot.php || true`
- `composer test -- --filter MasterDataRepositoryBoundaryTest || true` blocked: root Composer has no `test` command.
- `composer --working-dir=mom test -- --filter MasterDataRepositoryBoundaryTest || true` blocked: `vendor/bin/phpunit` missing.

## Open P0 Blockers

- Live runtime remains `JSON_ONLY`; PostgreSQL database is not configured/reachable in this worktree.
- `POSTGRES_ONLY` still lacks restore-drill evidence.
- P30/P34 must fail closed if `authorityProbe()` returns `compatibility_only`, `shadow_write_bridge`, or any JSON fallback source.

## Open P1 Blockers

- `history`, `pending`, and `archive` stores remain JSON compatibility bridges.
- Traveler templates, quality gate profiles, warehouse locations, and defect catalog need physical PG mapping in later prompts.
- Native idempotency/audit/outbox command writes are not complete until P31/P32.

## Controlled Gaps

- Full PHPUnit unavailable because `mom/vendor/bin/phpunit` is missing.
- Live PG reconciliation cannot be run until a PostgreSQL test/runtime profile exists.

## Next Prompt Unlock Condition

P28 may run next. It must consume:

- `DataLayerMasterDataRepository::authorityProbe()`
- `MDA_V3_JSON_CUTOVER_BRIDGE_MAP.csv`
- `MDA_V3_DRIFT_RECONCILIATION_TEST_PLAN.md`
- the P27 fail-closed rule for JSON fallback under PostgreSQL authority.

## Notes For Next Agent

Do not claim runtime-ready. P27 repaired repository wiring and stale JSON fallback behavior, but runtime proof still requires a reachable PostgreSQL database, reconciliation hashes, and restore drill.
