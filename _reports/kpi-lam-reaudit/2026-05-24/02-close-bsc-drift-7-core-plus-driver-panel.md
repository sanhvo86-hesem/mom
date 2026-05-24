# Prompt 02 Report - Close BSC Drift to 7 Core + Driver Panel

Date: 2026-05-24
Branch: `codex/kpi-lam-reaudit-prompt-2`
Prompt: `02_CLOSE_BSC_DRIFT_7_CORE_PLUS_DRIVER_PANEL.md`
Status: IMPLEMENTED_WITH_WARNINGS
STOP_NEXT_PROMPT: false
Recommended next prompt: Prompt 03

## Files Read

- `/Users/a10/Downloads/kpi_lam_reaudit_gated_prompt_pack_2026-05-24.zip`
- `/tmp/codex-kpi-lam-reaudit-pack/kpi_lam_reaudit_gated_prompt_pack_2026-05-24/RUNBOOK.md`
- `/tmp/codex-kpi-lam-reaudit-pack/kpi_lam_reaudit_gated_prompt_pack_2026-05-24/prompts/00_MASTER_REAUDIT_GUARDRAILS.md`
- `/tmp/codex-kpi-lam-reaudit-pack/kpi_lam_reaudit_gated_prompt_pack_2026-05-24/prompts/02_CLOSE_BSC_DRIFT_7_CORE_PLUS_DRIVER_PANEL.md`
- `_reports/kpi-lam-reaudit/2026-05-24/01-current-state-master-gap-register.md`
- `AGENTS.md`, `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`

## Files Changed

- `mom/data/registry/kpi-authority-registry.json`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-125-cnc-performance-operating-system.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-127-kpi-authority-registry-and-operational-metrics.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-128-kpi-system-matrix-and-document-usage.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-129-bsc-kpi-operating-mechanism-assessment.html`
- `docs/benchmark/kpi-operating-system-world-benchmark-2026-04-18.md`
- `mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`
- `_reports/kpi-lam-reaudit/2026-05-24/02-kpi-system-matrix.json`
- `_reports/kpi-lam-reaudit/2026-05-24/02-kpi-system-matrix.md`

## Re-Audit Delta From Prompt 01

Prompt 01 found a real authority drift: the corpus still read like `CNC-EXEC-BSC-15-2026`, while the execution direction was a smaller lean BSC. Prompt 02 closes that drift by making the registry the explicit authority for `CNC-EXEC-BSC-LEAN-7+DRIVERS-2026`.

Before: old docs and benchmark text treated 12-15/15 KPI as the executive model, and staged drivers were close enough to the CEO scorecard that a manager could plausibly misread them as bonus inputs.
After: the registry has 7 scored core KPIs, 11 strategic drivers, 5 gate blockers, and a hard rule that only `scored_core` contributes to score. Driver/gate items can warn, cap, block, or trigger action, but do not add points.

## Registry Result

- Model ID: `CNC-EXEC-BSC-LEAN-7+DRIVERS-2026`.
- Scored core: `OTD`, `COMPLAINT_RATE`, `FPY`, `COPQ`, `PLAN_ADHERENCE`, `WIP_AGING`, `MATERIAL_AVAILABILITY_PLAN`.
- Strategic driver panel: 11 metrics covering FAI/final release, inspection queue, constraint, LAM CDR/8D, IQC/material, role backup, supplier readiness.
- Gate blockers: safety/near-miss open action, customer escape without containment, data falsification, required gate bypass, open LAM hard gate.
- Weight total: 100%; scorecard item total: 100%.
- Perspective coverage: customer, financial, internal process/flow, learning growth/capability, risk/safety/compliance.
- Pilot rule: 90-day simulation/calibration only; no monetary payout unless explicitly approved after data evidence, LAM gates, Cpk/CTQ, NCR severity, and BSC drift are proven.

## Validation Summary

- `bash tools/ai/preflight.sh`: exit 0; expected `dirty_tree` hazard before commit.
- `php -l mom/api/services/KpiEngine.php`: pass.
- `php -l mom/api/services/KpiRegistryAdminService.php`: pass.
- `php -l mom/api/controllers/AdminController.php`: pass.
- `node --check mom/scripts/portal/00o-admin-kpi-registry.js`: pass.
- `node --check mom/scripts/portal/13-jd-scorecard-renderer.js`: pass.
- `php tools/scripts/kpi/audit-html-kpis.php`: pass; executive scorecard count 7, proposed operating metrics 123, known metric codes 203.
- `php tools/scripts/kpi/audit-kpi-performance-governance.php`: pass.
- `php tools/scripts/kpi/audit-kpi-system-matrix.php --json _reports/kpi-lam-reaudit/2026-05-24/02-kpi-system-matrix.json --md _reports/kpi-lam-reaudit/2026-05-24/02-kpi-system-matrix.md --annex .../annex-128-kpi-system-matrix-and-document-usage.html`: pass and regenerated ANNEX-128 plus Prompt 02 evidence files.
- `php mom/tools/release/check_migration_drift.php`: pass with 3 existing P2 prefix collisions at 108, 115, 188.
- `php mom/tools/release/check_kpi_integrity.php`: pass with 27 P1 warnings, no P0.
- `composer --working-dir=mom test -- --filter KpiEngineAuthorityRegistryTest`: pass, 9 tests / 3345 assertions.
- `composer --working-dir=mom check`: pass; PHPStan no errors, PHPUnit 609 tests / 6748 assertions / 1 skipped.
- Source drift grep for `CNC-EXEC-BSC-15-2026`, 15-KPI CEO language, and 12-15 limit: no matches outside historical `_reports`.

## Issues Found And Fixed During Prompt 02

P0 fixed: `check_kpi_integrity.php` initially failed because legacy aliases `QC_HOLD`, `DOWNTIME`, and `TIME_ENTRY` pointed to codes that had only been present through the old dashboard list. Fix: added `QC_HOLD_SLA`, `DOWNTIME_IMPACT`, and `TIME_ENTRY_COMPLIANCE` as proposed/governed operating metrics, not as executive scorecard items. This preserves API/test compatibility without reopening 15-KPI drift.

P0 fixed: test contract still expected `CNC-EXEC-BSC-LEAN-7-2026`, 12 dashboard cards, 120 proposed metrics, and old FPY local ID. Fix: updated the unit test to the 7 core + 11 driver dashboard and 123 proposed metric registry reality.

P2 contained: a default run of `audit-kpi-system-matrix.php` touched historical `_reports/kpi/report-kpi-system-matrix-2026-04-19.*`; those generated changes were restored to HEAD. Prompt-specific evidence is kept under `_reports/kpi-lam-reaudit/2026-05-24/`.

## Harsh Critique

Shop-floor reality: better than 15 KPI because operators and supervisors can now see a smaller scored target set, but the driver panel still needs UI labels to prevent "visible metric = bonus metric" behavior.

LAM readiness: improved because LAM hard gate and CDR/8D drivers are explicit blockers/panel items. Remaining P1 risk is that several LAM gate metrics still lack manual/evidence fallback in the integrity checker.

Lean/TOC: improved because OEE and constraint lost hours are drivers, not bonus KPIs. This prevents gaming local utilization while preserving weekly constraint action.

Data truth: improved because staged/manual-governed drivers cannot add points. Remaining risk is that some driver data contracts are still pilot/manual and need Prompt 03+ hardening.

Low-volume statistics: partially improved. `RECORDABLE_INCIDENT_RATE` still has a P1 min-sample warning. That is a blocker for statistical confidence, not for the BSC model closure.

Fairness: improved because only core metrics with explicit reward rules can score and staged drivers are blocked from payout. The pilot rule is still only registry/documented; UI and admin affordances should make this harder to misconfigure.

Anti-gaming: improved through gate blockers and counter-metric stance. Risk remains where legacy docs use aliases or role measures in prose; current source drift for the BSC model is clean, but broader KPI prose cleanup is not complete.

Admin/UX: registry now exposes role fields and card classes, but this prompt did not visually test Admin Console rendering. Prompt 02 scope was metadata/docs; UI affordance verification should be a later gate.

Documentation sync: ANNEX-122/125/127/128/129 plus benchmark are aligned to the new model. Historical `_reports/kpi/*` still contain old model strings as time-stamped prior evidence and were intentionally not rewritten.

CI guard: unit tests and KPI integrity now enforce the new model enough to catch the previous drift. The CI guard still reports existing P1 LAM evidence/owner-alignment warnings that should be closed by later prompts.

## Answer To Prompt-Specific Challenge Questions

- Can the CEO tell score vs visible-only? Yes. Registry role fields, ANNEX-125/127/129 language, and dashboard card classes separate `scored_core` from `strategic_driver`.
- Can a manager claim staged driver is bonus KPI? Not legitimately. Registry rule, pilot rule, docs, dashboard metadata, and tests all say drivers are visible-only/cap/block until change control and pilot approval.
- Are LAM blockers visible enough? Better: `LAM_HARD_GATE_OPEN` is a first-class gate blocker linked to CDR/release evidence. Remaining weakness is the P1 evidence fallback warnings for critical LAM gate metrics.
- Does this help delivery and quality, not just documentation? Yes. Core keeps OTD/complaint/FPY/COPQ/plan/WIP/material flow in score; drivers preserve FAI, final release, constraint, inspection queue, NCR SLA, IQC, backup coverage, and supplier readiness as action signals without bonus gaming.

## Remaining Risk Register

- P1: LAM critical CDR metrics still need manual/evidence fallback closure.
- P1: some gate owner roles differ from RACI CDR-A without owner-alignment notes.
- P1: `RECORDABLE_INCIDENT_RATE` min-sample guard remains weak for low-volume statistics.
- P1: `ORDER_REVIEW_RFT` paired metric `RFQ_COMPLETENESS_SCORE` does not resolve to a known canonical code.
- P2: migration prefix collisions remain at 108, 115, 188, but no fatal migration drift was reported.

## Gate Decision

Prompt 02 scope is complete. Do not execute Prompt 03 until the user says `tiep tuc`.
