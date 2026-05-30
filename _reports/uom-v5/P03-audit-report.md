# P03 Audit Report

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 8574a9c3660eb28d27d2bcc52cf254fb945fdf45

## Static Audit

- TEST_EVIDENCE: PHP syntax checks passed for all touched PHP files and the new unit test.
- TEST_EVIDENCE: Focused PHPUnit passed: 104 tests, 187 assertions, 1 skipped.
- TEST_EVIDENCE: PHPStan analyse passed with 0 errors.
- TEST_EVIDENCE: AI index regeneration completed successfully.
- TEST_EVIDENCE: Full `composer check` is not green because of an unrelated KPI registry expectation failure.

## P03 Hard Questions

1. Multi-site/supplier/language risk: P03 does not implement site/supplier context logic beyond adding cache context key. P08/P12 own contextual policy.
2. Factor-only affine/log/contextual risk: P03 did not alter math dispatch. P05 owns category matrix.
3. Naked numbers: Not touched in P03. P09/P11 own.
4. Canonical/quarantine bypass: Not touched in P03. P06 owns.
5. AI authority: Not touched in P03. P04/P14 own.
6. Permission bridge: First-user manifest bridge remains explicitly out of scope and assigned to P04.
7. Schema/service drift: `version AS rule_version` repair is complete for touched service paths and stale review scanner.
8. Cache stale risk: Resolver cache key now includes from, to, as-of date, context hash or none, and lifecycle policy version. Invalidation deletes legacy and current no-context v5 keys; historic/as-of/context keys remain TTL-bound.
9. Rollback: Revert touched PHP/test/index files and remove P03 reports.
10. Replay evidence: Rule version and as-of resolution now support replay preconditions; MEASVAL replay proof remains P09.

## Gate Result

PASS_WITH_WARNINGS. P03-specific P0 drift is repaired and tested; out-of-scope V5 gates remain assigned to later prompts.
