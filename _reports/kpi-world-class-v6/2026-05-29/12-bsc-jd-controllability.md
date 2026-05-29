# Prompt 12 - BSC / Hoshin / JD Scorecards Controllability

## Verdict

- Status: PASS
- P0: 0
- P1: 0
- P2: 1

## Critical Re-audit

The real risk was not missing scorecards. The real risk was fake fairness: several support roles still carried near-template wording that sounded controlled but did not tell the operator or reviewer what the role can actually influence. That kind of text passes surface review and then fails in calibration, because HR/Finance/IT/EHS get judged on outcomes they only partially control.

Senior-engineer critique:

1. If the scorecard text can be copy-pasted across APAR, FIN, ITA, ESA, HR, EHS, it is not a controllability contract.
2. If `active_scorecard` and the mirrored `scorecard` array drift, calibration becomes arbitrary.
3. If support-role action text does not name the controllable boundary, a red metric turns into blame routing instead of operational correction.

## Remediation

- Rewrote support-role fairness, controllability, attribution, and red-action text in `jd_kpi_scorecards.roles`.
- Updated both `active_scorecard` and mirrored `scorecard` structures to keep runtime and audit-facing views aligned.
- Added hard blocklist protection against generic template text so the same defect cannot quietly return.

## Evidence

- Registry hardened in `mom/data/registry/kpi-authority-registry.json`
- Guard hardened in `mom/tools/release/check_kpi_integrity.php`
- Regression tests added in:
  - `mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
  - `mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`

## Residual Critique

P2 remains: controllability is now explicit at registry level, but real calibration quality still depends on management discipline in monthly review. The software now blocks lazy wording; it does not replace leadership judgment.

## Validation

- `php mom/tools/release/check_kpi_integrity.php`
- `vendor/bin/phpunit tests/Unit/Services/KpiEngineAuthorityRegistryTest.php tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php tests/Unit/Services/KpiRegistryAdminServiceMetricControlTest.php`
