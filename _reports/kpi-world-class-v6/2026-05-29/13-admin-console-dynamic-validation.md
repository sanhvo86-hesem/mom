# Prompt 13 - Admin Console Dynamic Validation

## Verdict

- Status: PASS
- P0: 0
- P1: 0
- P2: 1

## Critical Re-audit

The console already had strong UI shape, but the backend contract still needed to prove that raw JSON abuse, translated canonical codes, broken gate links, and bad composite weights cannot slip through server-side save paths.

Senior-engineer critique:

1. Frontend-only validation is not a control.
2. A KPI registry editor that accepts Vietnamese diacritics in canonical codes is an audit defect waiting to happen.
3. If a gate metric can save without `linked_cdr`, the authority model is cosmetic.

## Remediation

- Raised the admin contract version to `KPI-ADMIN-CONSOLE-DYNAMIC-UX-P13`.
- Added explicit structured-editor mode and render rules so staged metrics stay visibly staged.
- Added server-side rejection for:
  - gate metric without `linked_cdr`
  - canonical code containing Vietnamese characters
  - composite weights that do not total `100`
  - role measures lacking controllability scope

## Evidence

- Service contract: `mom/api/services/KpiRegistryAdminService.php`
- Regression suite:
  - `mom/tests/Unit/Services/KpiRegistryAdminServiceMetricControlTest.php`
  - `mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`
  - `mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`

## Residual Critique

P2 remains: the UI is now safer, but operator ergonomics still depend on disciplined use of controlled dropdowns and impact review. The backend now blocks structurally bad saves; it does not guarantee that every future metric is useful.

## Validation

- `php mom/tools/release/check_kpi_integrity.php`
- `vendor/bin/phpunit tests/Unit/Services/KpiRegistryAdminServiceMetricControlTest.php tests/Unit/Services/KpiEngineAuthorityRegistryTest.php tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
