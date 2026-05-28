# RACI V3 Deep Audit Baseline

Date: 2026-05-28
Branch: `codex/raci-v3-audit-20260528`
Scope: Prompt 01-03 tranche (`deep audit`, `P0 consistency cleanup`, `threshold hardening`)

## Repo-truth findings confirmed before remediation

1. `DecisionThresholdService` still used stale hardcoded fallback semantics for `A2`, `A3`, `A4`, while published `AUTHORITY-MATRIX` and runtime `decision_thresholds.json` had newer USD / margin / payment-term wording.
2. `AUTHORITY-MATRIX` body copy contradicted itself with both `51 mã CDR` and `47 mã CDR`.
3. `SOP-201` still cited `ISO 9001:2026` as if current, while current ISO status is still `ISO 9001:2015` with `Amd 1:2024`; `ISO/FDIS 9001` is under development for expected publication in September 2026.
4. Shared UI badge `.iso-map::before` still rendered `ISO 9001:2026`, so even corrected doc text could still display the wrong standard version at point of use.
5. `check_raci_integrity.php` prose still documented a `16-column` gate matrix while code already enforced `15`.
6. After republishing the authority threshold block from runtime SSOT, `check_raci_integrity.php` exposed a deeper SSOT gap: `RACI-MASTER-MATRIX` referenced `C8`, `D15`, `F8`, but threshold registry/runtime only carried `51` items and dropped those anchors on republish.

## Remediation completed in this tranche

1. Added `mom/data/config/decision_thresholds.bootstrap.json` as bootstrap baseline and changed `DecisionThresholdService` to load bootstrap semantics instead of relying on stale hardcoded defaults.
2. Added `mom/tools/release/check_decision_threshold_consistency.php` and wired it into both CI and deploy gates.
3. Added `mom/tests/DecisionThresholdServiceTest.php` to prove bootstrap fallback keeps current `A2/A3/A4` semantics when runtime file is absent.
4. Republished `AUTHORITY-MATRIX` from runtime SSOT and then reconciled missing registry rows `C8`, `D15`, `F8` into both runtime and bootstrap threshold registries.
5. Corrected `AUTHORITY-MATRIX` registry-count narrative to the current repo-truth count of `54` authority rows.
6. Corrected `SOP-201` references from `ISO 9001:2026` to `ISO 9001:2015/Amd 1:2024`.
7. Corrected the global `.iso-map` badge from `ISO 9001:2026` to `ISO 9001:2015/Amd 1:2024`.
8. Corrected stale checker prose in `check_raci_integrity.php` from `16 columns` to `15`.

## Verification after remediation

- `php mom/tools/release/check_decision_threshold_consistency.php` → pass
- `php mom/tools/release/check_raci_integrity.php` → pass
- `php mom/tools/release/check_raci_derivatives.php` → pass
- `cd mom && vendor/bin/phpunit tests/DecisionThresholdServiceTest.php tests/RaciDerivativeIntegrityServiceTest.php` → pass

## Remaining critical observations

1. Repo-wide `ISO 9001:2026` references still exist outside the immediate RACI tranche (portal, policy, training, other SOPs, scripts, standards references). They are no longer hidden inside the RACI threshold path, but they remain a broader consistency debt.
2. `decision_thresholds.bootstrap.json` and runtime `decision_thresholds.json` are now treated as release-governed equals. Any future admin threshold edit that updates runtime only and does not refresh source control will now fail the new consistency gate by design.
3. Managed-region inventory confirms `86` generated RACI regions across served docs. This tranche hardened the authority-threshold plane, not the full scenario/workflow/admin-governance layers promised later in V3.
