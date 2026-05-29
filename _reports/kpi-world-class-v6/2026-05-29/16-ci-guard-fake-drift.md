# Prompt 16 - CI Guard and Fake-Drift Mutation Proof

## Verdict

- Status: PASS
- P0: 0
- P1: 0
- P2: 0

## Critical Re-audit

Prompt 16 is only real if the guard fails on purpose when the system is corrupted. Passing on clean state is not enough. The mutation suite therefore matters more than the green check itself.

Senior-engineer critique:

1. A guard that never gets attacked is just formatting.
2. Drift tests must target the exact fraud patterns operators and rushed admins create under pressure.
3. Clean-pass proof must follow the mutations, otherwise the suite may only prove that it can fail.

## Mutation Coverage Confirmed

The drift suite caught all required regressions:

1. gate metric without linked CDR
2. runtime metric without calculator
3. unknown LAM linked metric
4. Cpk metric missing sample policy
5. staged metric wrongly marked reward-eligible
6. translated canonical code in docs
7. composite weights not equal to `100`
8. role scorecard referencing an unknown metric
9. clean-pass proof after temporary mutation rollback

## Evidence

- Guard: `mom/tools/release/check_kpi_integrity.php`
- Drift suite: `mom/tools/release/check_kpi_integrity_drift_test.php`

## Validation

- `php mom/tools/release/check_kpi_integrity_drift_test.php`
- `php mom/tools/release/check_kpi_integrity.php`
