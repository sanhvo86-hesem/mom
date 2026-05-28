# 12 Final Acceptance Regression Audit

Date: 2026-05-28
Branch: `codex/raci-v3-complete-20260528`
Scope: V3 prompts 01-13 re-audit, hardening, simulation, and release-gate closure

## Executive Verdict

Verdict: `PASS (branch acceptance)`

Reason:

1. The RACI V3 hardening layer is now enforceable at source-control level: master integrity, derivative integrity, threshold consistency, role coverage, forbidden placeholders, scenario coverage, workflow-authority mapping, managed-marker inventory, and ISO reference status all pass.
2. Published `AUTHORITY-MATRIX` decision-threshold content had drifted from runtime render during acceptance; this was caught by the new guard and republished from SSOT before sign-off. That is a real P0 class failure mode, now closed.
3. Full repository PHPUnit now passes when executed with the repository-standard memory ceiling (`php -d memory_limit=1G vendor/bin/phpunit` / `composer test`). The earlier `EXIT=255` was traced to the default PHP CLI `memory_limit=128M`, not a failing business rule.
4. Scenario coverage is materially stronger (`110` scenarios, `24` drills), and each scenario row now carries explicit top-level `a_process`, `proposer`, `verifier`, `responsible`, `consulted`, `informed`, `hold_authority`, and `release_authority` fields, with validation that they must stay in sync with nested `raci` / `authority` structures.
5. This is a branch-level PASS, not a production-release PASS. Merge, deploy, and live browser proof still remain outside this report.

## Findings Reconfirmed During Final Audit

### Closed in this tranche

1. `DecisionThresholdService` no longer depends on stale PHP-only defaults for `A2/A3/A4`; bootstrap JSON is now the source baseline.
2. `AUTHORITY-MATRIX` no longer republishes with missing threshold anchors `C8`, `D15`, `F8`.
3. `SOP-201` and the shared `.iso-map` badge no longer claim `ISO 9001:2026` as the current standard.
4. CI and deploy workflows now execute the V3 guard suite, not just the older master/derivative pair.

### Still open after harsh re-audit

1. This branch has not been merged or deployed. No live browser verification was performed for this tranche, by design, because acceptance was completed on a remediation branch while unrelated dirty work existed in the original checkout.
2. Workflow enforcement is validated at registry/config layer and by tests, but not yet proven through end-to-end production transaction hooks on live MOM/Epicor/M365 flows.

## Validation Evidence

### Release guards

- `php mom/tools/release/check_raci_integrity.php` → pass
- `php mom/tools/release/check_raci_derivatives.php` → pass
- `php mom/tools/release/check_decision_threshold_consistency.php` → pass
- `php mom/tools/release/check_role_registry_coverage.php` → pass
- `php mom/tools/release/check_forbidden_placeholders.php` → pass
- `php mom/tools/release/check_scenario_coverage.php` → pass
- `php mom/tools/release/check_workflow_authority.php` → pass
- `php mom/tools/release/check_generated_marker_inventory.php` → pass
- `php mom/tools/release/check_iso_reference_status.php` → pass

### Focused RACI tests

- `vendor/bin/phpunit tests/DecisionThresholdServiceTest.php tests/RaciDerivativeIntegrityServiceTest.php tests/RaciControlRegistryServiceTest.php tests/ScenarioRegistryServiceTest.php tests/AuthorityWorkflowGuardServiceTest.php tests/RaciChangeImpactServiceTest.php` → pass
- Focused PHPStan on touched RACI V3 services/tests → pass

### Full-repo regression

- `vendor/bin/phpunit --testdox` with default CLI memory (`128M`) → `EXIT=255` around `315/678` tests
- `php -d memory_limit=1G vendor/bin/phpunit --testdox` → pass
- `composer test` → pass (`678` tests, `7925` assertions, `1` skipped)
- `composer analyse -- --memory-limit=1G` → pass
- Single isolated rerun of `WorldClassControlPlaneExecutionTest` → pass

Interpretation: the earlier acceptance blocker was infrastructure-level test memory, not a RACI regression.

## Operational Simulation Matrix

These simulations were assessed against the current combination of:

- `mom/data/config/raci_control_registry.bootstrap.json`
- `mom/data/config/scenario_registry.bootstrap.json`
- `mom/data/config/workflow_transition_registry.bootstrap.json`
- `mom/data/config/decision_thresholds.bootstrap.json`
- published `AUTHORITY-MATRIX` / `RACI-MASTER-MATRIX`

### 1. RFQ thiếu bản vẽ

- Scenario: `SCN-G0-RFQ-MISSING-DRAWING`
- Control row: `A1`
- Workflow: `quote_approval`
- Outcome: no-guess path exists; RFQ cannot be cleanly approved without `FRM-202`, drawing revision evidence, and escalation path to `CEO` on timeout.

### 2. Quote margin thấp

- Scenario: `SCN-G0-LOW-MARGIN-QUOTE`
- Control row: `A2`
- Threshold plane: `≤3000 USD`, `>3000 USD`, margin `<30%` escalation
- Outcome: threshold-aware decision path is explicit again; stale VND defaults are no longer the fallback source.

### 3. Điều kiện thanh toán ngoại lệ

- Scenario: `SCN-G0-PAYMENT-TERM-EXCEPTION`
- Control row: `A4`
- Workflow expectation: threshold_required + evidence package
- Outcome: decision authority is no longer left to free-form email approval.

### 4. Dùng sai revision ở xưởng

- Scenario: `SCN-G1-WRONG-REVISION-IN-SHOP`
- Control rows: `B2`, `B4`
- Workflow: `job_release`
- Outcome: release path requires QA verification and an engineering authority path; prevents silent release by workshop convenience.

### 5. Đề nghị thay vật liệu

- Scenario: `SCN-G1-MATERIAL-SUBSTITUTION`
- Control rows: engineering + purchasing crossover
- Outcome: cross-functional authority exists and the scenario row now carries flat point-of-use authority fields, reducing operator lookup steps.

### 6. FAI fail nhưng khách muốn giao gấp

- Scenario family: G4/G5 quality release
- Control expectation: hold authority broader than release authority
- Outcome: current registries preserve the principle correctly; no evidence of a path that lets schedule pressure auto-release a failed FAI.

### 7. NCR/CAPA lặp lại

- Scenario family: G5
- Control expectation: hold, verification, release, CAPA evidence chain
- Outcome: scenario coverage exists and drill pack includes recurrence handling, but KPI telemetry for repeated escapes is still planning-level, not runtime-enforced.

### 8. ERP outage khi cần release shipment

- Scenario family: digital workflow / outage fallback
- Workflow registry: outage fallback requires incident number + replay
- Outcome: this is a strong control-plane feature and aligns with fail-closed governance; bypass by “system down nên ký tay rồi quên nhập lại” is explicitly blocked.

### 9. Khách audit đột xuất / source inspection

- Threshold row: `F7`
- Authority plane: `QA/QMS/CEO` escalation and scope control
- Outcome: decision path is explicit and published; point-of-use clarity is materially improved versus a generic “top management approves” anti-pattern.

### 10. Near-miss chưa gây thương tích

- Threshold row: `F8`
- Authority plane: `EHS` primary with escalation to `PD/HR/CEO` when severity rises
- Outcome: the earlier missing-anchor risk is closed; this row now survives republish and is no longer silently lost from the published authority matrix.

## Maturity Assessment After V3

### Strong now

1. Source-of-truth layering is materially stronger: runtime, bootstrap, published HTML, and release guards now cross-check each other.
2. Threshold drift is no longer a hidden latent defect; it is a deploy-blocking condition.
3. Point-of-use drill materials exist and are generated at meaningful scale (`24` drills).
4. Workflow enforcement thinking is encoded in machine-readable rows rather than only in prose.

### Not yet world-class

1. Workflow enforcement is described and guarded at config level, but not yet proven live through production transaction hooks in MOM/Epicor/M365.
2. No live deploy/browser proof was executed for this tranche.

## Recommended Next Tranche

1. Bind workflow transition registry to live runtime transaction guards instead of config-only checks.
2. Merge to `main`, deploy, and run live Chrome proof against published RACI/Authority/training pages.
