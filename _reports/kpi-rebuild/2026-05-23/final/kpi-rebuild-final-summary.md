# KPI Rebuild Final Summary

Date: 2026-05-23
Branch: `codex/kpi-final-integration`
Scope: Track 99 final integration across KPI rebuild Tracks 1-6.

## 1. Executive Summary

Track 99 consolidated the six KPI rebuild track outputs and merged the Track 6
implementation branch into the final integration branch. The practical final
state is stronger than the pre-track baseline: staged metrics are no longer
reward eligible, the KPI integrity guard now catches fake runtime/reward/CDR/JD
drift, the Admin Console uses structured governance views instead of raw JSON,
and the gate matrix has complete G0-G7 coverage.

This branch is not claimed as a full production deployment. It is a final
integration branch with validation evidence and explicit remaining P1/P2 debt.
The largest remaining implementation gap is Track 4: the registry still uses
legacy weighted JD `scorecard` arrays instead of the target
`active_candidate_role_scorecard` model.

## 2. Before / After KPI Architecture

| Area | Before track integration | After Track 99 integration |
|---|---|---|
| KPI philosophy | Historical 33-governance-KPI estate mixed official, operating, gate, JD, health, and counter usage. | Lean architecture is explicit: official KPI, operating metric, gate control, role measure, health indicator, counter metric, and runtime/manual/staged truth are separated in reports, UI, and guard checks. |
| Staged reward risk | Track 5 surfaced staged reward-eligible debt. | `reward_eligible=true` on staged KPI rows is now P0-blocked; current staged reward count is 0. |
| Runtime truth | Runtime list and engine existed, but guard coverage was narrower. | Guard checks runtime list against `KpiEngine::getCalculator()` and blocks runtime-without-calculator fake drift. |
| Gate controls | G0-G7 existed but were not fully enforced by the guard. | Guard enforces gate coverage, linked CDR, and pass condition. Current G0-G7 coverage is 100%. |
| Admin Console | KPI management could collapse into a library/editing surface. | Structured governance tabs expose official, operating, gate, data contract, counter, retired, and audit views; structural fields are not editable. |
| JD scorecards | 39 legacy weighted role scorecards. | Renderer supports active/candidate-compatible payloads, but registry model conversion remains P1. |

## 3. Official KPI List

Track 1 target official core is intentionally small and not fixed by a legacy
count.

Active runtime core:

- `OTD`
- `COMPLAINT_RATE`
- `FPY`
- `COPQ`
- `PLAN_ADHERENCE`
- `WIP_AGING`
- `MATERIAL_AVAILABILITY_PLAN`

Candidate official items, non-payout until data contract or manual governance
is approved:

- `PROMISE_DATE_RISK`
- `FINAL_RELEASE_RFT`
- `FAI_FIRST_PASS`
- `REPEAT_NCR_RATE`
- `CAPA_EFFECTIVENESS`
- `OEE_BOTTLENECK`
- `CONSTRAINT_LOST_HOURS`
- `THROUGHPUT_PER_CONSTRAINT_HOUR`
- `SUPPLIER_READINESS`
- `GROSS_MARGIN_JOB_FAMILY`
- `CRITICAL_ROLE_CERT_COVERAGE`
- `CUSTOMER_COMM_CLOSURE_OT`

Blockers with no normal score weight:

- `RECORDABLE_INCIDENT_RATE`
- `KPI_DATA_INTEGRITY`
- `KPI_DATA_FRESHNESS`
- `KPI_REGISTRY_DRIFT_COUNT`

Current registry note: the `executive_scorecard` array still contains 15 items.
The guard reports staged executive items as P1 visibility debt, not as P0,
because they are no longer reward eligible.

## 4. Demoted / Merged / Retired List

Track 1 decisions kept the following outside the official core:

| Code | Final treatment |
|---|---|
| `MACHINE_UTIL` | Demote to health/operating; all-machine utilization can increase WIP and local optimization. |
| `CAPA_CLOSURE` | Demote to health; CAPA effectiveness is the useful official signal. |
| `TRAINING_COMP` | Demote to health; completion is not competence. |
| `LABOR_EFF` | Keep only as guarded operating metric. |
| `DPMO` | Diagnostic health indicator for low-volume CNC sample noise. |
| `NCR_RATE` | Diagnostic operating metric; low NCR count can reward hiding problems. |
| `SUPPLIER_OTD`, `SUPPLIER_QUAL` | Merge as components of `SUPPLIER_READINESS`. |
| `DSO`, `INVOICE_RFT`, `INV_TURNS`, `MONTH_END_CLOSE_OT`, `SERVICE_TICKET_SLA` | Finance/IT/SCM health controls, not core CNC manufacturing KPIs. |

No mass registry retirement was performed in Track 99. The decisions above are
the accepted architecture and should be implemented in a follow-up registry/JD
normalization branch if the user wants the final model fully materialized.

## 5. Runtime / Manual / Staged Counts

KPI integrity guard output after Track 99:

| Scope | Runtime | Staged | Manual | Manual governed | Retired |
|---|---:|---:|---:|---:|---:|
| Governance KPIs | 14 | 18 | 1 | 0 | 0 |
| All governed metrics | 18 | 48 | 59 | 0 | 0 |

Other current counts:

- Governance KPI rows: 33.
- Runtime calculated metric list: 28.
- Gate metrics: 21.
- Operating/proposed metrics: 71.
- Counter metrics in Admin view: 125.
- Data-contract rows in Admin view: 125.

## 6. Gate G0-G7 Coverage

Current guard output:

| Gate | Metric count |
|---|---:|
| G0 | 2 |
| G1 | 3 |
| G2 | 2 |
| G3 | 2 |
| G4 | 2 |
| G5 | 2 |
| G6 | 2 |
| G7 | 3 |

All 21 gate metrics have linked CDR/pass-condition coverage. Guard exits P0 if
any G0-G7 gate has no metric, if linked CDR is absent, or if pass condition is
missing.

## 7. JD Scorecard Model And Active Count Distribution

Current registry state:

- JD roles with active legacy scorecards: 39.
- Active count distribution: 3-item roles = 3, 4-item roles = 13, 5-item roles
  = 16, 6-item roles = 6, 7-item roles = 1.
- `QA` has 7 active items and remains too broad for practical coaching.
- 16 roles still have exactly 5 active items; guard reports this as P1 because
  it may indicate fixed-count carryover.

Target state from Track 4:

- Registry model: `active_candidate_role_scorecard`.
- Active scorecard is small and role-fit, not fixed at 5.
- Candidate bank, optional rotation, and do-not-use controls exist.
- Candidate metrics cannot contribute to reward until runtime/manual evidence
  is approved.

Track 99 does not hide this gap. It records it as remaining P1 implementation
work.

## 8. Admin Console / Dashboard Changes

Track 5 implementation is present in this branch:

- `KpiRegistryAdminService` builds structured admin views for official,
  operating, gate, data-contract, staged, retired, counter, role-scorecard, and
  integrity surfaces.
- `KpiEngine::CONSOLE_EDITABLE_FIELDS` allows only governance fields such as
  thresholds, owner, cadence, decision action, counter metric, data-contract
  gap, evidence source, and blocking conditions.
- Structural fields such as formula, data source, calculation status, metric
  type, and canonical code are not editable through the console.
- KPI JS surfaces use structured controls/views and the guard checks that raw
  JSON editing patterns do not return.
- Dashboard/API status labels preserve runtime/manual/staged visibility; staged
  metrics must not look like normal payout-ready results.

Remaining dashboard P1:

- `WIP_AGING` dashboard primary endpoint still references
  `GET /api/dashboard/widget?widget_type=wip_aging`, outside `/api/kpi/`.

## 9. CI Guard / Fake Drift Tests

Track 6 implementation is merged:

- `.github/workflows/deploy.yml` keeps KPI integrity guard coverage in deploy
  CI.
- `mom/tools/release/check_kpi_integrity.php` now checks runtime calculators,
  staged reward, reward blockers, gate coverage, CDR links, route presence,
  Admin Console raw JSON patterns, JD scorecard known codes, and weighted
  legacy scorecard totals.
- Fake drift evidence exists in
  `_reports/kpi-rebuild/2026-05-23/track-06-ci-integration/fake-drift-test-results.md`.

Fake drift cases recorded as PASS:

- Missing counter metric exits 1.
- Staged reward exits 1.
- Runtime without calculator exits 1.
- Bad linked CDR exits 1.
- Duplicate governance code exits 1.
- JD unknown metric code exits 1.
- Percent min-sample warning exits 0 by policy.

## 10. Remaining Limitations

P0 remaining: none found by `mom/tools/release/check_kpi_integrity.php`.

P1 remaining:

- 38 KPI guard warnings remain.
- Staged executive-scorecard items still visible: `GROSS_MARGIN_JOB_FAMILY`,
  `RECORDABLE_INCIDENT_RATE`, and `FAI_FIRST_PASS`.
- Several percent metrics have `min_sample=0`.
- `BCP_READINESS` still uses legacy `manual` status; next schema should prefer
  `manual_governed`.
- ANNEX-128 still does not enumerate eight governance KPI codes after matrix
  regeneration; this appears to be usage-visibility debt, not P0 drift.
- JD registry still uses legacy weighted scorecard arrays instead of the Track
  4 active/candidate model.
- Migration drift checker reports three non-fatal P2 prefix collisions:
  migration IDs 108, 115, and 188.

P2 report findings:

- System matrix audit reports five P2 findings: legacy alias use in three
  documents and one OEE context-fit review in RACI authority content.

## 11. 30 / 60 / 90-Day Rollout Plan

First 30 days:

- Use KPI outputs for baseline learning, action review, data-quality repair,
  and gate discipline.
- Do not use staged metrics or insufficient-data metrics for individual reward
  or discipline.
- Run weekly prune review: any metric not used for a real decision gets
  demoted or retired.

Days 31-60:

- Graduate only the highest-value staged data contracts where source tables,
  columns, calculators or manual evidence, owner, counter metric, and
  min-sample rules are verified.
- Resolve staged executive-scorecard P1 items by demoting, labeling as
  candidate, or implementing verified runtime/manual governance.
- Normalize WIP dashboard endpoint into the `/api/kpi/` namespace.

Days 61-90:

- Implement the Track 4 active/candidate JD model, including candidate bank,
  optional rotation, do-not-use controls, and role-level evidence rules.
- Complete monthly data-quality review and quarterly Hoshin/TOC catchball
  refresh.
- Run an annual KPI architecture refresh policy so the system does not drift
  back into KPI theater.

## 12. Self-Critique: What Could Still Become KPI Theater?

The architecture and guard now block the worst fake-green paths, but they do
not by themselves prove operating discipline. The system can still degrade if
leaders treat candidate/staged metrics as performance truth, reward low NCR or
incident counts without capture-completeness counters, use OEE outside the real
constraint, or leave JD scorecards as fixed weighted tables instead of
role-controllable coaching measures.

The final integration is therefore GO for guarded report-level integration and
NO-GO for declaring the KPI rebuild fully operational until the P1 JD model,
staged executive-scorecard, min-sample, and endpoint namespace items are
closed.

## Validation Results

| Command | Result |
|---|---|
| `bash tools/ai/preflight.sh || true` | PASS, no hazards detected. |
| `php -l mom/api/services/KpiEngine.php` | PASS. |
| `php -l mom/api/services/KpiRegistryAdminService.php` | PASS. |
| `php -l mom/api/controllers/AdminController.php` | PASS. |
| `node --check mom/scripts/portal/00o-admin-kpi-registry.js` | PASS. |
| `node --check mom/scripts/portal/13-jd-scorecard-renderer.js` | PASS. |
| `php tools/scripts/kpi/audit-html-kpis.php` | PASS; 867 HTML files, 683 files with KPI text, 4200 KPI occurrences. |
| `php tools/scripts/kpi/audit-kpi-performance-governance.php` | PASS; 624 KPI files, 95 missing evaluation terms, 227 missing recognition terms, 29 missing discipline/corrective terms. |
| `php tools/scripts/kpi/audit-kpi-system-matrix.php` | PASS; regenerated `_reports/kpi` matrix reports and ANNEX-128. |
| `php tools/release/check_kpi_integrity.php || php mom/tools/release/check_kpi_integrity.php` | PASS via `mom/tools/release/check_kpi_integrity.php`, 0 P0 and 38 P1 warnings. |
| `php mom/tools/release/check_migration_drift.php || true` | PASS/non-fatal; 0 P1 and 3 P2 prefix collisions. |
| `composer --working-dir=mom run check` | PASS; PHPStan 306 files no errors, PHPUnit 603 tests / 5970 assertions / 1 skipped. |

## Changed Files

Key integration changes include:

- `.github/workflows/deploy.yml`
- `mom/tools/release/check_kpi_integrity.php`
- `mom/data/registry/kpi-authority-registry.json`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-127-kpi-authority-registry-and-operational-metrics.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-128-kpi-system-matrix-and-document-usage.html`
- `_reports/kpi-rebuild/2026-05-23/final/final-integration-plan.md`
- `_reports/kpi-rebuild/2026-05-23/final/kpi-rebuild-final-summary.md`
- `_reports/kpi-rebuild/2026-05-23/track-06-ci-integration/fake-drift-test-results.md`
- `_reports/kpi/report-kpi-system-matrix-2026-04-19.json`
- `_reports/kpi/report-kpi-system-matrix-2026-04-19.md`
