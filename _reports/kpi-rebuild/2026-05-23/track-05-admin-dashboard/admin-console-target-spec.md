# Track 05 Admin Console Target Spec

Date: 2026-05-23

## Target Operating Model

The KPI Admin Console is a governance console, not a formula editor. It edits only allowed governance fields, persists a runtime overlay with schema-version gate, regenerates controlled ANNEX marker regions, and records audit events through the existing admin controller path.

## Console Views Implemented

| View | Purpose | Source |
|---|---|---|
| Overview | Counts, runtime/manual/staged/retired distribution, gate/JD/counter summary, integrity status | `admin_views.counts`, `admin_views.integrity_status` |
| Official KPI | Active governance KPI cards with thresholds, owners, decisions, counters | `admin_views.official_kpis` |
| Operating | Proposed/operating metrics, staged labels, action/counter context | `admin_views.operating_metrics` |
| Gate G0-G7 | Gate coverage matrix plus editable gate metric cards | `admin_views.gate_coverage`, `admin_views.gate_control_metrics` |
| JD | Role scorecard summary, active count, total weight, candidate/optional placeholders | `admin_views.role_scorecards` |
| Data Contracts | Metric status, gap, graduation condition, input/runtime endpoints | `admin_views.data_contracts` |
| Counter/Blockers | Parent KPI to dedicated counter-metric map | `admin_views.counter_metrics` |
| Retired/Aliases | Retired soft-state view | `admin_views.retired_metrics` |
| Audit/Drift | Integrity findings from current SSOT | `admin_views.integrity_status` |

## Save Rules

Allowed runtime-overlay fields:

- `thresholds`
- `owner_role`
- `data_stewardship_role`
- `cadence`
- `decision_action`
- `action_reference`
- `counter_metric`
- `data_contract_gap`
- `target_graduation_condition`
- `evidence_source`
- `blocking_conditions`

Blocked from Console:

- Formula edits.
- Runtime calculator assignment.
- Runtime data source mutation.
- Direct `calculation_status` changes.
- Raw JSON/file write exposure.
- Reward/scoring promotion for staged metrics.

## New Metric Proposal Rule

New metrics created from the UI are `staged_data_contract`, not runtime and not manual-governed scoring. The add form requires:

- canonical code;
- name;
- numeric green/yellow threshold;
- data-contract gap;
- target graduation condition.

The service stores `origin=console_proposed`, `reward_eligible=false`, and derives the counter metric code from the canonical code.

## Integrity Findings To Surface

Current registry findings after Track 05 hardening:

- P0 `STAGED_REWARD_METRIC`: `FINAL_RELEASE_RFT`.
- P0 `STAGED_REWARD_METRIC`: `GROSS_MARGIN_JOB_FAMILY`.
- P2 `JD_ACTIVE_SET_TOO_LARGE`: `QA`.

These are intentionally surfaced, not hidden. They should be remediated in registry/data-contract/JD tracks rather than patched around in the UI.

## Files Changed

- `mom/api/services/KpiRegistryAdminService.php`
- `mom/api/services/KpiEngine.php`
- `mom/api/controllers/AdminController.php`
- `mom/scripts/portal/00o-admin-kpi-registry.js`
- `mom/scripts/portal/12-kpi-badge-renderer.js`
- `mom/scripts/portal/13-jd-scorecard-renderer.js`

## Validation Results

| Command | Result |
|---|---|
| `php -l mom/api/services/KpiRegistryAdminService.php` | PASS |
| `php -l mom/api/services/KpiEngine.php` | PASS |
| `php -l mom/api/controllers/AdminController.php` | PASS |
| `node --check mom/scripts/portal/00o-admin-kpi-registry.js` | PASS |
| `node --check mom/scripts/portal/12-kpi-badge-renderer.js` | PASS |
| `node --check mom/scripts/portal/13-jd-scorecard-renderer.js` | PASS |
| `rg -n -P "(?<!&)#[0-9a-fA-F]{3,6}\|rgba\(\|rgb\(" ...` | PASS: no hardcoded color literal remains in touched KPI JS files |
| `php -r ... KpiRegistryAdminService::load()` | PASS: 33 official, 71 operating, 21 gate, 125 data-contract rows, integrity FAIL with 3 surfaced findings |
| `php -r ... KpiEngine::getMetricCatalog()` | PASS: schema 16, 132 metrics, 39 JD roles, gate coverage 100%, integrity FAIL with 3 surfaced findings |
| `php tools/scripts/kpi/audit-html-kpis.php` | PASS |
| `php tools/scripts/kpi/audit-kpi-performance-governance.php` | PASS |
| `php tools/scripts/kpi/audit-kpi-system-matrix.php` | PASS; regenerated ANNEX/report side effects were reverted because they were validation noise outside Track 05 scope |
| `php mom/tools/release/check_kpi_integrity.php` | PASS with 12 existing warnings |
| `php tools/scripts/ai-index/generate.php --verbose` | PASS |
| `composer --working-dir=mom run analyse -- --memory-limit=1G` | PASS |
| `composer --working-dir=mom run test` | PASS: 603 tests, 5970 assertions, 1 skipped |
| `composer --working-dir=mom run check` | PASS: PHPStan + PHPUnit |
| Browser smoke harness on `http://127.0.0.1:8766/kpi-console-harness.html` | PASS: Overview/Official/Data Contracts/Audit tabs rendered; Official tab showed proposal button and OTD card; 0 console errors |

## Remaining Risks

- Current KPI integrity is intentionally surfaced as FAIL in the new UI/API because `FINAL_RELEASE_RFT` and `GROSS_MARGIN_JOB_FAMILY` are staged but reward eligible in the registry SSOT.
- `check_kpi_integrity` still reports 12 existing warnings, including ANNEX-128 enumeration gaps and staged executive-scorecard entries. This branch does not rewrite the registry or ANNEX matrix to hide them.
- Authenticated production-session save smoke was not run; browser smoke used a local fixture harness to verify the new frontend view logic without writing runtime data.
