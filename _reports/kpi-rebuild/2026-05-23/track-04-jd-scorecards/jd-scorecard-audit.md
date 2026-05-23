# JD Scorecard Audit - KPI Rebuild Track 04

Date: 2026-05-23
Branch: `codex/kpi-t4-jd-scorecards`
Mode: Phase 1 audit/spec only

## Scope and Source Files

Prompt 4 requires a role/JD scorecard audit before implementation. Track 1 target architecture was not present on this branch under `_reports/kpi-rebuild/2026-05-23/track-01-strategy-prune/`, so this track intentionally does not modify production registry, renderer, JD HTML, API, or controlled docs.

Files inspected:

- `tools/data/role-registry-job-order-cnc.json`
- `mom/data/registry/kpi-authority-registry.json`
- `mom/api/services/KpiEngine.php`
- `mom/api/controllers/DashboardController.php`
- `mom/api/routes/core-routes.php`
- `mom/scripts/portal/13-jd-scorecard-renderer.js`
- `mom/docs/system/organization/03-Job-Descriptions/**/*.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-123-deputy-backup-matrix.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-127-kpi-authority-registry-and-operational-metrics.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-128-kpi-system-matrix-and-document-usage.html`

## Current State Facts

| Item | Finding |
|---|---:|
| Canonical role registry entries | 39 |
| JD HTML files | 39 |
| JD files with KPI heading | 39 |
| JD files loading `13-jd-scorecard-renderer.js` | 39 |
| `jd_kpi_scorecards.roles` entries | 39 |
| Active scorecard items in registry | 184 |
| Unique JD metric codes used | 110 |
| Roles with more than 5 active items | 7 |
| Roles with candidate bank | 0 |
| Roles with optional/rotate bank | 0 |
| Roles with `do_not_use` controls | 0 |
| Active item fields currently present | `kpi_code`, `weight`, `rationale` only |

All JD scorecard metric codes currently resolve through at least one of `annex122_governance_kpis`, `gate_control_metrics`, or `proposed_operating_metrics`. That is good catalog coverage. The weaker point is governance depth: most JD scorecard rows do not carry role-level controllability, evidence source, scoring status, blocking conditions, or candidate/optional status in the `jd_kpi_scorecards` object itself.

## P0/P1 Findings

### P0 - Role-code SSOT drift between role registry and JD scorecards

`tools/data/role-registry-job-order-cnc.json` is the role SSOT for Prompt 4. `jd_kpi_scorecards.roles` uses ten noncanonical aliases:

| Role registry code | Scorecard key currently used | Meaning |
|---|---|---|
| `SET` | `SETUP` | Setup technician |
| `PIE` | `IE` | Production / industrial engineer |
| `PE` | `PRE` | Process engineer |
| `IAO` | `IA` | Internal auditor outsource |
| `XNK` | `IMX` | Import/export staff |
| `MPL` | `MPC` | Material planning and inventory control |
| `TOOL` | `TCK` | Tool crib / tool storekeeper |
| `WAR` | `WHC` | Warehouse clerk |
| `APAR` | `APA` | AP/AR and payments accountant |
| `GLP` | `GLA` | General ledger and payroll accountant |

Impact: The renderer currently matches by `jd_file` basename, so many pages can still render. Admin Console, API consumers, ANNEX-123 backup coverage, FRM-809 skills/KPI matrix, and future guards should not rely on those aliases as primary keys. Implementation should normalize keys to the role registry codes and keep aliases only as legacy redirects.

### P1 - Active-only model contradicts Prompt 4 target

Current registry has 39 role cards and every card is a weighted active card. There is no `candidate_bank`, `optional_rotate`, or `do_not_use` list for any role. Prompt 4 requires an active/candidate/optional model with no fixed active count.

Impact: The system cannot distinguish "must be measured now" from "candidate after data exists" or "should never be used for this role". This is the main path back to KPI theater.

### P1 - Some active sets are too large or too outcome-heavy

Seven roles have more than five active measures:

- `QA` has 7.
- `CEO`, `PD`, `PPL`, `WKM`, `SCM`, and `OPR` each have 6.

Potentially unfair or gaming-prone examples:

- `OPR` includes `POS_OP_MACHINE_UPTIME`, which can punish machine/material/CAM downtime outside operator control.
- `WKM` and `IE` use generic `OEE`; Track 1 guardrails prefer `OEE_BOTTLENECK` or constraint-specific operating use.
- `CS` and `IMX` include `OTD`, which should be attribution-broken before role scoring.
- `QA/QC/QCL` use escape/reject/pass metrics that must be paired with NCR capture and inspection-bypass counters to avoid suppression.
- `EHS` uses `RECORDABLE_INCIDENT_RATE`; this should be a blocker/gate, not a direct performance target that encourages under-reporting.
- `HR` uses `TRAINING_COMP`; Prompt 4 prefers verified critical-role certification coverage over completion-only training.

### P1 - JD scorecard rows lack role fairness fields

Current row keys are only:

```text
kpi_code
weight
rationale
```

Missing Prompt 4 target fields:

- `mapped_canonical_metric`
- `measure_type`
- `scorecard_scoring_status`
- `scorecard_contributes_to_reward`
- `evidence_source`
- `counter_code`
- `controllability_scope`
- `blocking_conditions`

Impact: The API renderer can display a weighted table, but the governance contract does not yet prove fairness, evidence lineage, or anti-gaming at the role level.

### P1 - Renderer assumes weighted active table only

`mom/scripts/portal/13-jd-scorecard-renderer.js` currently:

- reads `role.scorecard` only.
- has no UI path for active/candidate/optional/do-not-use sections.
- displays a total weight note.
- does not display "not used for direct discipline".
- injects hardcoded CSS colors/sizes into JS. This conflicts with the Graphics Authority no-hardcode rule for future implementation.

Impact: The renderer is adequate for the legacy weighted scorecard, but not for Prompt 4 target model.

## Existing Strengths

- All 39 JD files include the renderer and have KPI headings, so the adoption surface is complete.
- `DashboardController::kpiJdScorecards()` and `core-routes.php` expose `kpi_jd_scorecards`.
- `KpiEngine::jdScorecards()` enriches JD rows with metric display metadata, thresholds, calculation status, and counter code where registry metadata exists.
- ANNEX-127 already states that role performance measures are not automatically company KPIs.
- ANNEX-123 ties backup/deputy coverage to FRM-807 and SOP-801, which is a strong source for `CRITICAL_ROLE_CERT_COVERAGE`.

## Target Operating Model

Track 4 target model should be:

1. Canonical role keys come from `tools/data/role-registry-job-order-cnc.json`.
2. Every role has:
   - `recommended_active_count`
   - `active_scorecard`
   - `candidate_bank`
   - `optional_rotate`
   - `do_not_use`
   - `fairness_notes`
3. Active measures stay small:
   - 4-6 for top leadership.
   - 4-5 for managers and value-stream owners.
   - 3-4 for specialists.
   - 2-4 for frontline and support roles.
4. Outcome metrics can appear only where the role has authority or a documented attribution split.
5. High-pressure measures must have counter/blocker fields.
6. Candidate metrics cannot contribute to reward until runtime/manual evidence is approved.
7. Discipline is limited to falsification, bypass, unsafe act, or repeated non-compliance after coaching.

## Implementation Recommendations After Track 1 Acceptance

1. Normalize `jd_kpi_scorecards.roles` keys to the 39 role registry codes. Preserve alias redirects for `SETUP`, `IE`, `PRE`, `IA`, `IMX`, `MPC`, `TCK`, `WHC`, `APA`, and `GLA`.
2. Convert each role from `scorecard` to an active/candidate model. Keep a compatibility `scorecard` read projection only if `KpiEngine::jdScorecards()` or legacy renderer needs it during migration.
3. Add row-level fields required by Prompt 4:
   - `mapped_canonical_metric`
   - `measure_type: role_performance_measure`
   - `scorecard_scoring_status`
   - `scorecard_contributes_to_reward: false` by default for role coaching/OJT
   - `evidence_source`
   - `counter_code`
   - `controllability_scope`
   - `blocking_conditions`
4. Update `KpiEngine::jdScorecards()` to return `active_scorecard`, `candidate_bank`, `optional_rotate`, `do_not_use`, role code aliases, and fairness warnings.
5. Update `13-jd-scorecard-renderer.js` to render active measures first, candidate/optional collapsed, do-not-use warnings hidden behind a governance details toggle, and no direct-discipline note.
6. Move renderer style to tokens/CSS classes or read from Graphics Authority. Do not add new hardcoded visual literals.
7. Update ANNEX-127/129 policy only after registry model is changed, then regenerate ANNEX-128.

## Self-Critique

- Could this measure punish a role for something outside control? Yes, current `OTD`, `OEE`, machine uptime, gross margin, recordable incidents, and complaint-rate usage can do that without attribution.
- Could this cause gaming? Yes, especially low NCR/reject/escape/incident metrics, OTD without expedite/partial shipment counter, and training completion without competence evidence.
- Is evidence easy to capture during normal work? Some POS measures are practical if tied to existing operation, inspection, setup, ERP, and handover records. Several still require data contracts.
- Is the active set too many? Yes for 7 roles. QA at 7 is the clearest overload.
- Does it help OTD/quality/flow/cost/risk? The direction is good, but current rows do not always prove the operational decision they drive.
- Should many measures be candidate instead of active? Yes. Candidate status is needed for generic OEE, throughput per constraint hour, bottleneck buffer status, many POS measures without verified evidence, and any role outcome metric without attribution.

## Files Changed in Phase 1

Reports only:

- `_reports/kpi-rebuild/2026-05-23/track-04-jd-scorecards/jd-scorecard-audit.md`
- `_reports/kpi-rebuild/2026-05-23/track-04-jd-scorecards/role-scorecard-target-model.json`
- `_reports/kpi-rebuild/2026-05-23/track-04-jd-scorecards/role-measure-candidate-bank.csv`
- `_reports/kpi-rebuild/2026-05-23/track-04-jd-scorecards/jd-fairness-risk-register.md`

