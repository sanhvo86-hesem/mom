# Prompt 06 - Cpk/CTQ/SPC Capability Module Concrete

Date: 2026-05-24  
Branch: `codex/kpi-lam-reaudit-prompt-6`  
Base: Prompt 05 HEAD `1a513dcb`  
Result: GO for Prompt 07  
STOP_NEXT_PROMPT: false

## Current-State Delta

Prompt 06 does not pretend runtime Cpk exists. It adds a concrete CTQ/SPC capability contract and pure policy evaluator while keeping all capability KPIs staged until runtime evidence exists.

- Registry bumped to `schema_version=23`, `version=2026-05-24+p06`.
- Added CTQ governance blocks: `ctq_characteristics`, `ctq_capability_policy`, `ctq_data_contract`.
- Added/updated Prompt 06 metrics: `CPK_PRODUCT_MIN_CTQ`, `CPK_COVERAGE_RATE`, `CTQ_MEASUREMENT_COMPLETENESS`, `CTQ_SAMPLE_POLICY_STATUS`, `POST_CHANGE_CPK_REVALIDATION`, `GAGE_VALID_FOR_CTQ_MEASUREMENT`, plus enriched `CHECK_DIM_REPORT_ON_SHIP` and `SPC_SIGNAL_REACTION_TIME`.
- Added `CtqCapabilityService` with enforced sample bands: `<25 insufficient`, `25-49 provisional`, `50-99 internal`, `>=100 customer-grade only if stable, gage-valid, spec-present, and revalidated after change`.
- Added Admin Console CTQ/Cpk tab and stricter add/save validation for sample policy, stability, gage validity, and reward suppression.
- Added CI guard `P0.16` to reject fake/runtime Cpk without CTQ spec, sample policy, gage validity, CDR evidence, or dashboard render suppression.
- Regenerated ANNEX-122 from registry because gate rows increased from 41 to 42.
- Regenerated AI index; service count is now 146.

## Validation Results

- `bash tools/ai/preflight.sh || true`: completed; expected dirty-tree hazard only during active edits.
- `php -l` on `KpiEngine.php`, `KpiRegistryAdminService.php`, `CtqCapabilityService.php`, `AdminController.php`, `check_kpi_integrity.php`: PASS.
- `node --check mom/scripts/portal/00o-admin-kpi-registry.js`: PASS.
- `node --check mom/scripts/portal/13-jd-scorecard-renderer.js`: PASS.
- `php mom/tools/release/check_kpi_integrity.php`: PASS with 25 inherited P1 warnings.
- `php mom/tools/release/check_migration_drift.php`: PASS; 0 P1, 3 inherited P2 prefix collisions (`108`, `115`, `188`).
- `php mom/tools/release/audit_kpi_hardcode.php`: PASS; 209 registry rows, 200 canonical codes, 42 gate rows linked.
- `php mom/tools/release/check_kpi_integrity_drift_test.php`: PASS; 4 fake-drift scenarios caught.
- KPI audit outputs:
  - HTML KPI audit: 867 HTML files, 683 files with KPI, 4357 KPI occurrences, 62 canonical metric codes seen.
  - Performance governance audit: 867 HTML files, 624 KPI files, 0 files missing all people-governance terms, 219 row-level advisory findings.
  - KPI system matrix: 481 HTML files, 127 documents with metric usage, 211 registry metric count, 174 metric codes seen, 8 findings total (0 P1, 7 P2, 1 P3).
- Targeted PHPUnit:
  - `CtqCapabilityServiceTest`: 4 tests, 23 assertions, PASS.
  - `KpiRegistryAdminServiceMetricControlTest`: 4 tests, 10 assertions, PASS.
  - `KpiIntegrityMetricControlGuardTest`: 19 tests, 76 assertions, PASS.
  - `KpiEngineAuthorityRegistryTest`: 9 tests, 3932 assertions, PASS.
- `composer --working-dir=mom check`: PASS; PHPStan 0 errors; PHPUnit 636 tests, 7444 assertions, 1 skipped.

## Harsh 10-Angle Critique

1. Source-of-truth: improved, but CTQ master is still a contract, not a runtime authority table.
2. Statistical validity: low-N Cpk is now blocked, but no live process-stability computation exists yet.
3. Gage validity: policy and guard exist, but IPQC/SPC sources still do not all carry `gage_id` with validity-at-measurement.
4. CTQ specificity: characteristic fields are declared, but real part/revision/customer CTQ rows are not populated.
5. Runtime Cpk: intentionally staged; any numeric dashboard Cpk remains forbidden until Prompt 06 graduation conditions are met.
6. One-sided specs: formula policy is explicit; no runtime proof yet validates one-sided source data at scale.
7. Change revalidation: metric and blocker exist; actual change-to-CTQ impact mapping is still a future integration.
8. Check-dim report: shipment/CDR evidence path is guarded, but report-file runtime linking is not implemented.
9. Admin UX: CTQ tab and validation exist; it is still a governance console, not a full SPC workbench.
10. Reward/customer claim: direct reward is blocked; customer-grade capability claims still need runtime proof and management approval before use.

## Remaining Risks

P0: none confirmed.

P1:
- 25 inherited KPI integrity warnings remain, mostly critical-CDR staged evidence fallback and CDR owner/alignment warnings.
- CTQ capability is not runtime-calculated; this is deliberate, but must not be treated as closed runtime capability.
- `spc_data` has precomputed Cpk-like fields, but it is not accepted as authoritative because it lacks the full CTQ/gage/revalidation proof chain.

P2:
- Migration drift reports inherited prefix collisions for `108`, `115`, `188`.
- KPI system matrix still has 7 P2 and 1 P3 advisory findings.
- Performance-governance audit still has row-level advisory gaps; no P0/P1 blocker was introduced.

## Next Prompt Gate

`STOP_NEXT_PROMPT=false`.

Prompt 07 may proceed. It must not claim Cpk runtime completion unless it implements and proves the CTQ master, measurement joins, gage validity-at-measurement, stability signal, sample windows, and post-change revalidation workflow.
