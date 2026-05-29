# Prompt 15 - LAM Evidence Pack, Retention, Traceability

## Verdict

- Status: PASS
- P0: 0
- P1: 0
- P2: 0

## Critical Re-audit

The defect here was architectural, not cosmetic. LAM evidence-pack policy existed only inside the profile subtree. That is too weak for audit retrieval, because reviewers need one explicit contract that answers: what is in the pack, how is it retrieved, how long is it retained, and what blocks audit-ready claims.

Senior-engineer critique:

1. If evidence-pack truth is only nested narrative, retrieval becomes interpretive.
2. If there is no governed query-key set, audit drills turn into scavenger hunts.
3. If retention and immutable provenance are not in the same contract, release-package claims are not defensible.

## Remediation

- Added top-level `lam_evidence_pack_contract`.
- Bound the contract to:
  - required sections by `G0 -> G7`
  - linked metric codes
  - retrieval query keys
  - expected outputs
  - retention years
  - immutable hash requirement
- Exposed the contract through the admin service and added integrity failure if required sections or retrieval keys drift.
- Hardened WI-203 so the audit-facing work instruction references the governed contract directly.

## Evidence

- Registry: `mom/data/registry/kpi-authority-registry.json`
- Service: `mom/api/services/KpiRegistryAdminService.php`
- Guard: `mom/tools/release/check_kpi_integrity.php`
- Tests:
  - `mom/tests/Unit/Services/KpiRegistryAdminServiceMetricControlTest.php`
  - `mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`
  - `mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`

## Validation

- `php mom/tools/release/check_kpi_integrity.php`
- `vendor/bin/phpunit tests/Unit/Services/KpiRegistryAdminServiceMetricControlTest.php tests/Unit/Services/KpiEngineAuthorityRegistryTest.php tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
