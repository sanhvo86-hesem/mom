# Prompt 04 - LAM G3/G5 Gate Coverage And Evidence Rows

Date: 2026-05-24
Branch: `codex/kpi-lam-reaudit-prompt-4`
Base HEAD: `972b1ace` (`feat(kpi): enforce metric control objects`)
Scope: Prompt 04 only.

## Gate Decision

`STOP_NEXT_PROMPT: false`

Reason: Prompt 04 now has explicit LAM/SEMSYSCO G3 and G5 gate coverage in the KPI Authority registry, ANNEX-122 gate rendering is registry-driven and synced to all 41 gate rows, the release integrity guard rejects missing/invalid LAM G3/G5 coverage as P0, targeted fake-drift PHPUnit tests pass, the hardcode audit passes, and `composer --working-dir=mom check` passes. Remaining findings are P1/P2 carry-forward debts outside this prompt.

## Current-State Delta

- Added 10 LAM/SEMSYSCO gate-control rows under `gate_control_metrics`: six G3 material/IQC/kit/traceability/special-process/subtier controls and four additional G5 IPQC/CMM/NCR/gage controls.
- Enriched the two existing G5 rows (`IN_PROCESS_REJECT_RATE`, `SPC_SIGNAL_REACTION_TIME`) with full Prompt 04 gate/evidence/profile semantics.
- Updated `LAM_SEMSYSCO` profile coverage from partial G3/G5 coverage to explicit G3 x6 and G5 x6 required metrics, 31 linked metrics, 21 evidence-pack requirements, and an explicit assignment-event contract. There is no silent default activation.
- Kept all new Prompt 04 LAM gate controls non-rewardable/blocker-only. Staged rows remain staged and do not claim fake runtime.
- Extended `check_kpi_integrity.php` with P0 LAM guardrails for missing assignment event, missing G3/G5 coverage, missing linked metrics, missing gate rows, wrong gate, missing `lam_profile_link`, missing CDR/pass/evidence/hold-release fields, and rewardable LAM G3/G5 gate controls.
- Extended ANNEX-122 regeneration in `KpiRegistryAdminService` and `sync_kpi_annex122.php` so section 9 is generated from `gate_control_metrics`, not stale static rows.
- Regenerated ANNEX-122 section 9 to 41 gate rows and refreshed ANNEX-125/127/128/129 LAM/G3/G5 summaries.
- Added fake-drift PHPUnit coverage for empty LAM G3 coverage, missing LAM G5 gate row, and missing LAM profile link.
- Regenerated `.ai` index files during validation; resulting diffs were timestamp-only and not retained in the prompt commit.

## LAM Coverage Evidence

- Registry schema version: 21.
- LAM linked metrics: 31.
- LAM evidence-pack requirements: 21.
- LAM G3 required rows:
  - `MATERIAL_CERT_VERIFICATION_COMPLETENESS`
  - `IQC_RELEASE_ON_TIME`
  - `LAM_MATERIAL_KIT_READY_TO_PLAN`
  - `TRACEABILITY_LABEL_VERIFIED`
  - `SPECIAL_PROCESS_REQUIREMENT_CLEAR`
  - `SUBTIER_REQUIREMENT_FLOWDOWN`
- LAM G5 required rows:
  - `IN_PROCESS_REJECT_RATE`
  - `SPC_SIGNAL_REACTION_TIME`
  - `IPQC_CHARACTERISTIC_COMPLETENESS`
  - `CMM_QUEUE_AGING`
  - `NCR_CONTAINMENT_ON_TIME`
  - `GAGE_VALID_FOR_IN_PROCESS_MEASUREMENT`
- Evidence sources now point to existing MOM/MES/EQMS-adjacent authority paths: material certificates, incoming inspection/result tables, supplier ASN data, planning/material readiness data, traceability label jobs, IPQC inspection/result tables, NCR records, calibration records, tools, and shipment/final-release context where applicable.

## Exact Validation Results

- `bash tools/ai/preflight.sh || true`: exit 0; reported dirty-tree hazard only, expected before commit.
- `php -l mom/api/services/KpiEngine.php`: pass.
- `php -l mom/api/services/KpiRegistryAdminService.php`: pass.
- `php -l mom/api/controllers/AdminController.php`: pass.
- `php -l mom/tools/release/check_kpi_integrity.php`: pass.
- `php -l mom/tools/release/sync_kpi_annex122.php`: pass.
- `node --check mom/scripts/portal/00o-admin-kpi-registry.js`: pass.
- `node --check mom/scripts/portal/13-jd-scorecard-renderer.js`: pass.
- `php mom/tools/release/check_kpi_integrity.php`: pass with 25 P1 warnings, no P0.
- `php mom/tools/release/audit_kpi_hardcode.php`: pass; registry 197 rows / 188 canonical codes, ANNEX-122 sections 4/5/6 all 33 live badges, ANNEX-122 section 9 all 41 gate rows carry `data-gate-metric`, all 39 JD scorecards registry-linked.
- `php mom/tools/release/check_migration_drift.php || true`: 0 P1, 3 P2 migration prefix collisions for 108, 115, and 188.
- `php tools/scripts/kpi/audit-html-kpis.php || true`: exit 0; scanned 867 HTML files, 683 files with KPI references, 4311 KPI occurrences.
- `php tools/scripts/kpi/audit-kpi-performance-governance.php || true`: exit 0; scanned 867 HTML files, 624 KPI files, 95 missing evaluation terms, 227 missing recognition terms, 29 missing discipline/corrective terms, 219 KPI table rows without people-governance terms.
- `php tools/scripts/kpi/audit-kpi-system-matrix.php || true`: exit 0; regenerated ANNEX-128 and temporary `_reports/kpi` outputs. Only ANNEX-128 was retained for Prompt 04 scope.
- `mom/vendor/bin/phpunit --configuration mom/phpunit.xml mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`: pass, 18 tests / 3728 assertions.
- `git diff --check`: pass.
- `php tools/scripts/ai-index/generate.php --verbose`: pass; regenerated repo map, route map, DB map, symbols, and contracts map.
- `composer --working-dir=mom check`: pass; PHPStan no errors; PHPUnit 620 tests / 7136 assertions / 1 skipped.

## Harsh 10-Angle Critique

1. G3/G5 coverage is now explicit, but most new rows are still staged contracts; this is governance truth, not runtime truth.
2. LAM activation is now guarded by an assignment-event contract, but the actual customer-assignment write path still needs an end-to-end workflow test in a later prompt.
3. Gate rows reference plausible source tables, but several evidence chains need UI capture and approved record forms before they are audit-ready.
4. ANNEX-122 section 9 is now registry-generated, but section 9 remains HTML output rather than a typed artifact consumed by the portal at runtime.
5. LAM G3 material readiness spans procurement, IQC, traceability, and planning; this prompt links the control rows but does not implement a cross-domain material-release transaction.
6. G5 in-process quality coverage now includes IPQC, CMM, NCR, SPC, and gage validity, but CMM and SPC runtime calculations remain staged.
7. New P0 guards prevent future G3/G5 drift, but they are specialized to `LAM_SEMSYSCO`; other customer-specific profiles still need comparable coverage rules.
8. Owner roles are assigned, yet several owner-vs-CDR-A alignment warnings remain in the broader registry and need explicit alignment notes or ownership changes.
9. Non-rewardable/blocker-only classification prevents fake payout, but it also means the dashboard must explain these controls as gate blockers rather than score drivers.
10. The prompt closes the immediate gate-coverage hole, but it does not solve the larger people-governance document debt reported by the KPI performance-governance audit.

## Remaining Risks

### P0

None confirmed by `check_kpi_integrity.php`, hardcode audit, targeted PHPUnit, or `composer --working-dir=mom check`.

### P1

- 25 `check_kpi_integrity.php` warnings remain, led by critical-CDR staged evidence fallback gaps, gate owner-vs-CDR-A alignment notes, and unresolved `ORDER_REVIEW_RFT -> RFQ_COMPLETENESS_SCORE` pairing.
- KPI performance-governance audit still reports broad document-governance debt: 95 KPI files missing evaluation terms, 227 missing recognition terms, 29 missing discipline/corrective terms, and 219 KPI table rows without people-governance terms.
- Several Prompt 04 rows are deliberately staged and need future runtime/data-capture implementation before they can become calculated metrics.

### P2

- Migration drift check still reports prefix collisions for migration numbers 108, 115, and 188.
- LAM assignment-event contract is declared in registry but not yet exercised by browser/API workflow tests.
- ANNEX-128 is regenerated and synced, but the generated long-line HTML remains difficult to review manually.
