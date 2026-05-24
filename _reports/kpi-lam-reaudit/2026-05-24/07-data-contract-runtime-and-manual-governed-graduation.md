# Prompt 07 - Data Contract Runtime And Manual-Governed Graduation

Date: 2026-05-24  
Branch: `codex/kpi-lam-reaudit-prompt-7`  
Previous gate: `_reports/kpi-lam-reaudit/2026-05-24/06-cpk-ctq-spc-capability-module-concrete.md` has `STOP_NEXT_PROMPT=false` and no open P0.

## Files Read

- `AGENTS.md`
- `.ai/AI-WORKFLOW.md`
- `.ai/CONVENTIONS.md`
- `.ai/repo-map.json`
- `/Users/a10/Downloads/kpi_lam_reaudit_gated_prompt_pack_2026-05-24.zip`
- `prompts/00_MASTER_REAUDIT_GUARDRAILS.md`
- `prompts/07_DATA_CONTRACT_RUNTIME_AND_MANUAL_GOVERNED_GRADUATION.md`
- `_reports/kpi-lam-reaudit/2026-05-24/06-cpk-ctq-spc-capability-module-concrete.md`
- `mom/data/registry/kpi-authority-registry.json`
- `mom/api/services/KpiEngine.php`
- `mom/api/services/KpiRegistryAdminService.php`
- `mom/api/controllers/AdminController.php`
- `mom/scripts/portal/00o-admin-kpi-registry.js`
- `mom/scripts/portal/13-jd-scorecard-renderer.js`
- `mom/tools/release/check_kpi_integrity.php`
- `mom/database/schema.sql`
- `mom/database/migrations/032_order_management_world_class_foundations.sql`
- `mom/database/migrations/136_eqms_worldclass_surface.sql`
- `mom/database/migrations/198_customer_ncr_severity_contract.sql`

## Files Changed

- `mom/api/services/KpiEngine.php`
- `mom/api/services/KpiRegistryAdminService.php`
- `mom/data/registry/kpi-authority-registry.json`
- `mom/tools/release/check_kpi_integrity.php`
- `mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`
- `mom/tests/Unit/Services/KpiEnginePrompt07RuntimeTest.php`
- `mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-128-kpi-system-matrix-and-document-usage.html`
- `_reports/kpi/report-kpi-system-matrix-2026-04-19.json`
- `_reports/kpi/report-kpi-system-matrix-2026-04-19.md`
- `.ai/*` generated index metadata from `php tools/scripts/ai-index/generate.php --verbose`

## Current-State Delta

Prompt 06 made the CTQ/Cpk surface concrete but intentionally left most practical LAM operating metrics staged/manual. Prompt 07 changes that boundary for only metrics with real tables/columns or a governed manual evidence path.

Stale assumption corrected: `shipment_releases` and `eqms_complaints` now support a small runtime graduation set. It is no longer true that all ship-packet and 3D/4D/8D metrics must stay staged. It is still true that check-dimension, gage-release, special-release, process-change approval, material-cert, IQC, kit readiness, trace-label and CMM queue metrics do not have enough normalized runtime joins for honest automatic calculation.

Scope in: the prioritized LAM delivery/quality, customer NCR, flow/material metrics listed by Prompt 07. Scope out: JD detemplating, Vietnamese rewrite, Cpk runtime calculation without CTQ/spec/gage stability source, and broad Admin Console UX beyond generated ANNEX rendering support for structured `data_source`.

Drift risk if not updated together: registry status, KpiEngine runtime list, getCalculator wiring, ANNEX-122/128 generated outputs, CI guard, and fake-drift PHPUnit tests must move as one set.

## Before / After

Before:
- `runtime_calculated_metrics` had 30 entries.
- Several practical LAM metrics were staged even though `shipment_releases` and `eqms_complaints` now have enough fields for limited runtime truth.
- Manual-governed rows lacked a dedicated Prompt 07 guard to prevent accidental reward/runtime promotion.

After:
- Registry version is `2026-05-24+p07`, `schema_version=24`.
- `runtime_calculated_metrics` has 35 entries.
- New runtime metrics:
  - `SHIP_PACKET_COMPLETENESS` from `shipment_releases.packlist_status/coc_status/coa_status/customs_status`.
  - `NCR_3D_RESPONSE_SLA` from `eqms_complaints.received_at/d3_sent_at`.
  - `NCR_4D_PRELIMINARY_SLA` from `eqms_complaints.received_at/d4_sent_at`.
  - `NCR_8D_UPDATE_SLA` from `eqms_complaints.received_at/d8_updated_at`.
  - `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE` from `eqms_complaints.customer_acceptance_at/closed_at`.
- Verified existing runtime metrics remain runtime: `FAI_FIRST_PASS`, `IN_PROCESS_REJECT_RATE`.
- Manual-governed metrics with maker/checker verification:
  - `FINAL_RELEASE_RFT`
  - `CHECK_DIM_REPORT_ON_SHIP`
  - `GAGE_VALID_FOR_RELEASE`
  - `PROCESS_CHANGE_APPROVAL_RATE`
  - `SPECIAL_RELEASE_COMPLIANCE`
  - `MATERIAL_CERT_VERIFICATION_COMPLETENESS`
  - `IQC_RELEASE_ON_TIME`
  - `LAM_MATERIAL_KIT_READY_TO_PLAN`
  - `TRACEABILITY_LABEL_VERIFIED`
  - `CMM_QUEUE_AGING`
- Staged with explicit gap and graduation target:
  - `FAI_QUEUE_AGING`
  - `FINAL_INSPECTION_QUEUE_AGING`

## Implementation Notes

- `KpiEngine` now has constants, target/unit metadata, lower-is-better flags and calculators for five Prompt 07 runtime metrics.
- NCR SLA calculators use open age when response timestamps are missing. Missing 3D/4D/8D evidence therefore cannot look green by excluding open failures.
- Ship-packet completeness handles empty periods as non-green empty results and exposes document gap breakdown.
- Customer accepted 8D closure rate requires `customer_acceptance_at`; closed complaints without customer acceptance produce data quality flags.
- `KpiRegistryAdminService` renders structured `data_source` objects in generated ANNEX rows and suppresses duplicate evidence text.
- `check_kpi_integrity.php` now has P0.17 Prompt 07 guards for runtime contract proof, manual-governed verification, dashboard runtime endpoint status and staged backlog graduation plans.

## Validation Results

- `bash tools/ai/preflight.sh || true` - completed; reported expected dirty-tree hazard while this branch had uncommitted Prompt 07 edits.
- `php -l mom/api/services/KpiEngine.php` - pass.
- `php -l mom/api/services/KpiRegistryAdminService.php` - pass.
- `php -l mom/api/controllers/AdminController.php` - pass.
- `php -l mom/tools/release/check_kpi_integrity.php` - pass.
- `php -l mom/tests/Unit/Services/KpiEnginePrompt07RuntimeTest.php` - pass.
- `php -l mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php` - pass.
- `node --check mom/scripts/portal/00o-admin-kpi-registry.js` - pass.
- `node --check mom/scripts/portal/13-jd-scorecard-renderer.js` - pass.
- `php mom/tools/release/sync_kpi_annex122.php` - pass; regenerated ANNEX-122 from registry `schema_version 24`.
- `php tools/scripts/kpi/audit-html-kpis.php || true` - completed; registry version `2026-05-24+p07`, 35 runtime calculators observed.
- `php tools/scripts/kpi/audit-kpi-performance-governance.php || true` - completed; inherited governance warnings remain outside Prompt 07 scope.
- `php tools/scripts/kpi/audit-kpi-system-matrix.php || true` - completed; regenerated system matrix report and ANNEX-128.
- `php mom/tools/release/check_migration_drift.php` - pass with existing P2 prefix collisions for 108, 115 and 188; no fatal drift.
- `php mom/tools/release/check_kpi_integrity.php` - pass with 22 inherited P1 warnings and no P0.
- `composer --working-dir=mom test -- --filter 'KpiIntegrityMetricControlGuardTest|KpiEnginePrompt07RuntimeTest|KpiEngineAuthorityRegistryTest'` - pass, 34 tests, 4082 assertions.
- `php tools/scripts/ai-index/generate.php --verbose` - pass.
- `composer --working-dir=mom check` - pass; PHPStan no errors, PHPUnit 642 tests, 7518 assertions, 1 skipped.

API route execution for new runtime metrics was not run because no local API server/database runtime was available in this Codex run. The service calculators are covered with fake-connection tests and the registry/API catalog wiring is covered through `KpiEngineAuthorityRegistryTest` plus `check_kpi_integrity.php`.

## Harsh 10-Angle Critique

1. Shop-floor reality: better than before because ship packet and 3D/4D/8D response metrics now use real operational tables. Weakness remains that CMM queue and material readiness still depend on governed manual logs, so bottleneck action is not fully automatic.
2. LAM/Semsysco readiness: the change strengthens 8D, ship packet and customer acceptance truth. It does not complete check-dim runtime, gage-release runtime, subtier flowdown runtime or special-release runtime; these remain manual/staged by design.
3. Lean/TOC: queue metrics are not faked as runtime. `CMM_QUEUE_AGING`, `FAI_QUEUE_AGING` and `FINAL_INSPECTION_QUEUE_AGING` now state exact graduation gaps, preserving the constraint focus without pretending a queue event stream exists.
4. Data truth: no Prompt 07 metric is marked runtime without table/column proof, KpiEngine calculator wiring and integrity guard coverage. The biggest risk is SQL semantics drift if future migrations rename response columns; P0.17 should catch registry/source drift but not every raw SQL typo.
5. Low-volume statistics: empty periods return `empty_result=true`, zero sample, and no green value. Ratio metrics still need future min-sample/pilot calibration before reward use.
6. Fairness: manual-governed metrics are blocked from reward and require verification. Role attribution is still imperfect in inherited gate rows, and integrity check reports owner-vs-CDR P1 warnings.
7. Anti-gaming: 8D acceptance blocks self-closure gaming; ship-packet completeness exposes missing document status. Remaining gaming risk is manual evidence quality until normalized scan/approval events exist.
8. Admin/UX: registry/admin rendering now supports structured data-source summaries, but this prompt does not redesign the Admin Console workflow. Prompt 10 remains the proper place for deeper non-technical UX hardening.
9. Documentation: ANNEX-122 and ANNEX-128 were regenerated from registry. ANNEX-125/127/129 were not edited because Prompt 07 did not require a Vietnamese/docs rewrite.
10. CI guard: P0.17 fake-drift tests now catch stale runtime gaps, manual-governed rows without verification, and dashboard runtime rows downgraded to staged. Remaining gap: a future SQL calculator can still be syntactically valid but semantically weak unless a live DB fixture is added.

## Issues Found

P0:
- None remaining.

P1:
- Inherited `check_kpi_integrity.php` warnings remain: `RECORDABLE_INCIDENT_RATE` min-sample, critical staged evidence fallback for several G7 rows, owner-vs-CDR split notes, and unresolved `ORDER_REVIEW_RFT` paired metric `RFQ_COMPLETENESS_SCORE`.
- Runtime API route smoke for the new metrics was not executed against a live local DB.
- Manual-governed metrics still depend on maker/checker discipline until normalized event sources exist.

P2:
- Migration drift command reports existing duplicate migration prefixes 108, 115 and 188.
- `.ai` index regeneration changed generated timestamps only.
- Generated KPI system matrix diff is large because the report is full-scan output, not a hand-authored delta.

## Fixes Applied After Critique

- Kept `FAI_QUEUE_AGING` and `FINAL_INSPECTION_QUEUE_AGING` staged instead of inventing runtime queue events.
- Kept check-dim, gage, special release, process change, material cert, IQC, kit readiness, trace label and CMM queue as manual-governed with verification contracts.
- Added integrity P0 guards for accidental fake runtime/manual reward drift.
- Fixed ANNEX rendering for structured data sources to avoid duplicate evidence text.

## Remaining Risk Register

- R1: Live DB smoke for the five new calculators should be added when a representative local DB fixture is available.
- R2: CMM queue, FAI queue and final inspection queue need normalized event tables before Prompt 08 can safely improve Lean/TOC flow dashboards.
- R3: Manual-governed metrics need operational maker/checker adoption; the software now records the contract but cannot prove human discipline without usage data.
- R4: Existing owner-vs-CDR alignment warnings should be closed before final re-audit.
- R5: Low-volume customer NCR periods need pilot thresholds before any reward or customer-grade claim.

## Recommended Next Prompt

Run Prompt 08: Lean Flow / TOC / CMM Queue / Material Readiness. Prompt 07 gives it honest runtime/manual/staged status and explicit graduation gaps.

STOP_NEXT_PROMPT: false
