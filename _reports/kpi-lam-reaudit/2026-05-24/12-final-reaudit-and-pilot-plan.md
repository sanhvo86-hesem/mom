# Prompt 12 - Final Reaudit And 90-Day Pilot Plan

Date: 2026-05-25 ICT
Prompt-pack folder: `2026-05-24`
Branch: `codex/kpi-lam-reaudit-prompt-12`
Base: Prompt 11 HEAD `50a9cba7`
Registry observed: `2026-05-24+p09`, schema `26`

## Gate Decision

`STOP_NEXT_PROMPT: false`

Prompt 11 declared `STOP_NEXT_PROMPT: false` and no P0. Prompt 12 found no new P0 after final guard hardening, fake-drift proof, KPI audits, migration drift check, lints, targeted PHPUnit, and full `composer check`.

Prompt 12 is the final prompt in this pack. The correct next work is pilot execution plus focused remediation of the remaining P1/P2 backlog, not another prompt-pack slice.

## Files Read

- `AGENTS.md`
- `.ai/AI-WORKFLOW.md`
- `.ai/CONVENTIONS.md`
- `.ai/repo-map.json`
- Zip prompt pack: `00_MASTER_REAUDIT_GUARDRAILS.md`, Prompt 12, manifest, runbook, and reference notes
- `_reports/kpi-lam-reaudit/2026-05-24/11-docs-vietnamese-lam-bsc-rewrite-and-matrix-regen.md`
- KPI registry, ANNEX-122/125/128/129, Admin Console JS, `KpiRegistryAdminService`, `KpiEngine`, admin controller/routes, KPI audit scripts, and `check_kpi_integrity.php`

## Files Changed

- `.github/workflows/deploy.yml`
- `_reports/kpi-lam-reaudit/2026-05-24/12-final-reaudit-and-pilot-plan.md`
- `mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
- `mom/tools/release/check_kpi_integrity.php`
- `mom/tools/release/check_kpi_integrity_drift_test.php`

No portal-managed HTML document diff is retained in this prompt. `audit-kpi-system-matrix.php` was run for validation, but its timestamp-only generated report churn was removed before commit.

## Current-State Delta

- Prompt 11 aligned the visible operating documents to the 7 scored core + driver panel model. Prompt 12 converted that alignment into CI-enforced drift protection.
- `check_kpi_integrity.php` now treats ANNEX-128 stale/missing generated content as P0 when required matrix tokens or 7 core KPI codes disappear.
- The integrity guard now validates that `scorecard_operating_model.model_id` remains `CNC-EXEC-BSC-LEAN-7+DRIVERS-2026`, the scored core equals the official 7-code scorecard, scored-core weights total 100, ANNEX-125/129 do not drift back to 15-KPI language, ANNEX-125 states `7 core` + `driver panel`, and ANNEX-129 states `BSC là layer 2`.
- Strategic driver panel entries remain visible-only unless promotion/reward approval is explicit.
- The fake-drift self-test now mutates temporary registry/document copies across the 8 required Prompt 12 regressions and proves the clean state still passes.
- The deploy workflow comment now describes the real P12 drift scenarios instead of the older P09 wording.

## Final Reaudit Result

- Scorecard model: `CNC-EXEC-BSC-LEAN-7+DRIVERS-2026`.
- Scored core: `OTD`, `COMPLAINT_RATE`, `FPY`, `COPQ`, `PLAN_ADHERENCE`, `WIP_AGING`, `MATERIAL_AVAILABILITY_PLAN`.
- Scored-core weight total: 100.
- Official active scorecard items: 7.
- Governance KPI status from integrity guard: 33 total; runtime 15, staged 16, manual 0, manual_governed 2, retired 0.
- All metric status from integrity guard: runtime 28, staged 66, manual 58, manual_governed 62, retired 0.
- Runtime calculated metric count: 35.
- Gate metric count: 42.
- JD roles with active scorecards: 39.
- Gate coverage: G0=3, G1=6, G2=3, G3=8, G4=3, G5=7, G6=3, G7=6.
- BSC docs drift status: PASS. Fake stale `CNC-EXEC-BSC-15-2026` / 15-KPI wording in ANNEX-125 is now caught as P0.
- LAM profile status: G0-G7 coverage is present, including LAM/SEMSYSCO evidence rows for customer profile assignment, CSR acknowledgement, feasibility, inspection plan, CDR, gage validity, NCR 3D/8D SLA, retention, change approval, special release/marking, flowdown, RBA/compliance, CTQ/Cpk evidence, and contingency readiness.
- Cpk/CTQ status: sample-policy and CTQ spec gates exist and are guarded. This still does not prove full customer-grade runtime Cpk; pilot must collect and review real evidence.
- Customer NCR severity status: severity matrix, hard-gate blocker vocabulary, and simulation-only bonus model are guarded. Fake disabling of `simulation_only` is caught.
- Role scorecard status: 39 JD roles remain active and registry-linked. Prompt 12 did not change JD content.
- Admin Console status: Prompt 10 dynamic MCO validation remains the active contract. Prompt 12 did not change Admin Console UX.

## CI Guard Fake-Drift Proof

`php mom/tools/release/check_kpi_integrity_drift_test.php` now proves:

1. Removing linked CDR from a gate metric is rejected.
2. Putting a staged metric into scored core / executive scorecard is rejected.
3. Creating a Cpk/SPC metric without `sample_policy.min_n_score` is rejected.
4. Removing a LAM linked metric row while the LAM profile still references it is rejected.
5. Setting `bonus_simulation_model.simulation_only=false` is rejected.
6. Reintroducing stale ANNEX-125 15-KPI wording is rejected.
7. Marking a non-runtime metric rewardable is rejected.
8. Creating composite component weights that do not total 100 is rejected.
9. The untouched clean registry/document set still exits 0 and reports `KPI integrity check PASSED`.

## Exact Validation Results

- `bash tools/ai/preflight.sh || true`: PASS; drift clean, expected dirty tree during active work.
- `php -l mom/api/services/KpiEngine.php`: PASS.
- `php -l mom/api/services/KpiRegistryAdminService.php`: PASS.
- `php -l mom/api/controllers/AdminController.php`: PASS.
- `php -l mom/tools/release/check_kpi_integrity.php`: PASS.
- `php -l mom/tools/release/check_kpi_integrity_drift_test.php`: PASS.
- `php -l mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`: PASS.
- `node --check mom/scripts/portal/00o-admin-kpi-registry.js`: PASS.
- `node --check mom/scripts/portal/13-jd-scorecard-renderer.js`: PASS.
- `php mom/tools/release/check_kpi_integrity.php`: PASS with 22 P1 warnings, no P0.
- `php mom/tools/release/check_kpi_integrity_drift_test.php`: PASS; 8 required fake drifts plus clean pass proof.
- `composer --working-dir=mom test -- --filter KpiIntegrityMetricControlGuardTest`: PASS; 33 tests, 133 assertions.
- `php tools/scripts/kpi/audit-html-kpis.php --output /tmp/kpi-html-audit-p12.json`: PASS; 867 HTML files, 683 files with KPI, 4381 KPI occurrences, 69 canonical metric codes seen.
- `php tools/scripts/kpi/audit-kpi-performance-governance.php --output /tmp/kpi-performance-governance-p12.json`: PASS; 867 HTML files, 624 KPI files, 0 files missing all people-governance terms, 217 KPI table rows without row-level people-governance terms.
- `php tools/scripts/kpi/audit-kpi-system-matrix.php`: PASS; 481 HTML scanned, 128 metric documents, 180 metric codes seen, 7 findings (0 P1, 6 P2, 1 P3).
- `php mom/tools/release/check_migration_drift.php`: PASS with 0 P1 and 3 existing P2 prefix collisions: 108, 115, 188.
- `php mom/tools/release/audit_kpi_hardcode.php`: PASS; 214 rows, 205 canonical codes, all 33 governance KPIs live, 42 gate rows, 39 JD scorecards registry-linked.
- `php tools/scripts/ai-index/generate.php --verbose`: PASS; timestamp-only `.ai/*` churn removed before commit.
- `git diff --check`: PASS.
- `composer --working-dir=mom check`: PASS; PHPStan no errors; PHPUnit 658 tests, 7715 assertions, 1 skipped.

## Harsh 10-Angle Critique

1. Executive scorecard: now structurally safe. The old 15-KPI wording can no longer re-enter ANNEX-125/129 without a P0. It still needs live pilot discipline to avoid managers treating driver panel metrics as payout levers.
2. LAM/Semsysco customer reality: materially better than the starting state. The gate profile covers G0-G7 and evidence expectations, but the pilot must prove the evidence is complete on real orders, not just present in registry/docs.
3. Low-volume statistics: guarded, not solved. Cpk without sample policy is blocked, but true low-volume capability still needs a controlled runtime/evidence process before external claims.
4. Reward fairness: protected against staged/runtime misuse. Non-runtime rewardable metrics, staged scored-core metrics, and simulation-only bonus drift are blocked. Human review quality remains outside this guard.
5. Gate authority: stronger. Missing CDR and removed LAM metric rows are P0. Remaining owner-vs-CDR split warnings still weaken accountability clarity.
6. NCR severity and escalation: usable for pilot, not yet mature enough for automatic payout or customer-facing claims. Severity and 3D/8D vocabulary exist, but real SLA performance must be sampled.
7. Admin Console: previous MCO validation remains intact. Prompt 12 did not add new UI behaviors; this is acceptable because the final-pack need was CI proof, not another UI pass.
8. Documentation sync: improved through guard coverage. ANNEX-128 generated content is now protected against stale/missing key tokens, but natural-language quality still depends on human review and scoped grep.
9. CI reliability: substantially improved. The self-test now proves the guard rejects the actual drifts the program fears. The risk is future maintainers weakening assertions to satisfy a broken registry instead of fixing the source.
10. Pilot readiness: adequate for a no-payout controlled pilot. It is not adequate for full compensation, external customer scorecard claims, or automated discipline decisions.

## Remaining Risks

### P0

None confirmed.

### P1

- 22 KPI integrity warnings remain: `RECORDABLE_INCIDENT_RATE` min_sample 0; critical staged CDR fallback gaps for `KPI-G7-02`, `KPI-LAM-G7-02`, `KPI-LAM-G7-03`; owner-vs-CDR alignment warnings; and unresolved paired metric `ORDER_REVIEW_RFT` -> `RFQ_COMPLETENESS_SCORE`.
- KPI performance governance audit still finds 217 KPI table rows without row-level people-governance terms.
- LAM/Cpk/CTQ customer-grade readiness still depends on pilot evidence sampling; Prompt 12 did not create new runtime data capture.
- Role-scorecard fairness still depends on manager review discipline and audit sampling, not only registry shape.

### P2

- Migration drift still reports duplicate numeric prefixes `108`, `115`, and `188`.
- ANNEX-128 matrix still reports 6 P2 and 1 P3 findings.
- Some historical report/doc metadata remains English where it is schema or generated audit metadata rather than operating prose.

## 90-Day Pilot Plan

Scope: one LAM/SEMSYSCO-relevant customer profile, one value stream, one part family or product line, and a limited role set covering sales/CS, engineering, QA, planning/material, workshop, warehouse/shipping, and finance review. No monetary payout, automatic discipline, or external customer claim is allowed during pilot.

### Days 0-14: Setup And Baseline

- Freeze the pilot metric set to the 7 scored core plus visible-only strategic drivers and gate blockers.
- Confirm LAM customer requirement profile assignment before G1 for every pilot order.
- Baseline current performance for OTD, complaint rate, FPY, COPQ, plan adherence, WIP aging, and material availability.
- Define sampling checklist for CDR, inspection plan, gage validity, CTQ/Cpk evidence, special release, product/process change approval, flowdown, RBA/compliance, and 3D/8D SLA records.
- Train pilot owners that staged/manual metrics are learning signals, not payout or blame signals.

### Days 15-45: Controlled Execution

- Run daily tier review on gate blockers, red/yellow scorecard items, material readiness, CMM/QC queues, WIP aging, and NCR containment.
- Require every red/yellow item to have owner, due date, evidence link, and closure rationale.
- Sample at least weekly whether CDR, gage, inspection, CTQ/Cpk, and NCR severity evidence is complete and traceable.
- Keep bonus simulation output visible only to governance reviewers; do not communicate it as pay.
- Record every metric dispute as a data-quality or controllability issue, not a personnel conclusion.

### Days 46-75: Stability And Repeatability

- Compare weekly trend stability against baseline, with explicit notes for volume/sample-size effects.
- Review all Cpk/CTQ claims against sample policy before any customer-facing interpretation.
- Audit whether gate blockers are catching real risks before shipment and not merely documenting late failures.
- Review owner-vs-CDR split warnings for pilot rows and either add alignment notes or propose registry cleanup.
- Confirm no dashboard/admin consumer suppresses staged status or converts visible-only drivers into scored reward items.

### Days 76-90: Go / No-Go

- Prepare pilot evidence pack: registry snapshot, KPI integrity output, fake-drift output, sampled evidence logs, NCR SLA review, Cpk/CTQ sample review, role feedback, and unresolved risks.
- GO criteria: no P0 guard failures; 100% LAM profile assignment before G1; sampled evidence completeness at least 95%; no staged metric used for payout; Cpk only interpreted under sample policy; 3D/8D SLA adherence reviewed; every red/yellow action has owner/due/evidence.
- NO-GO criteria: any customer escape without containment; missing CDR on required shipment; expired gage used without governed exception; unauthorized special release/change; fake green dashboard from staged/manual data; unresolved guard P0; evidence completeness below threshold; unresolved role unfairness that affects scorecard interpretation.
- Graduation decision: either extend the pilot with specific P1 owners, promote only proven runtime metrics, or keep the model in pilot/manual-governed mode.

## Final Decision

The KPI/LAM model is ready for a tightly controlled 90-day pilot with no payout, no automatic discipline, no external customer performance claims, and explicit evidence sampling. It is not ready for full compensation linkage or customer-grade automation until the remaining P1 items are closed or explicitly governed.

`STOP_NEXT_PROMPT: false`
