# KPI V3 — Stage 01: Research-to-Operations Audit

- **Date:** 2026-05-30
- **Branch:** `codex/kpi-v3-production-living-20260530` (off `origin/main` @ 857ca8fd)
- **Stage type:** Report-only. No code/registry/doc changes in this stage.
- **Prompt:** `_reports/kpi-upgrade-prompts-v3/01-research-to-operations-audit.md`
- **Author:** Claude (Opus 4.8)

---

## 1. Executive Summary

The HESEM KPI subsystem is **far past the V2 baseline**. The CI guard reports
`PASS · schema_version=26 · 0 P0 · 0 P1 · runtime=35 manual=11 staged=145
retired=0 · annex122=33 gate=46`. All three audit scripts exit 0. The
registry↔engine contract is **perfectly aligned** (35 runtime codes = 35 engine
`ALL_METRICS` entries, 36 `calc*` functions). The executive scorecard (7 KPIs)
is clean — every one is `runtime_calculated`.

So this V3 program is **not a rebuild**. It is three things:

1. **Operationalization** — wire existing metrics into G0→G7 gates, T0–T3 tier
   meetings (WI-202), JD §9 cascade, and counter-metric workflows so the KPIs
   are *used*, not just computed.
2. **Honest-status hardening** — ~18 of 31 `dashboard_core_kpis` are
   `staged_data_contract` (constraint/TOC + LAM gate metrics). They currently
   sit on the dashboard surface. The dashboard rendering rule and CI guard must
   guarantee these never render as real numbers or feed the executive score.
3. **Targeted graduation, not code inflation** — the V3 prompt names ~18
   "new" codes, but most already exist under repo-native names (see §8). The
   ground rule "không cố định số KPI / gộp KPI trùng" means we **map V3 intent
   onto existing codes** and add only genuinely-missing concepts.

**Top risks going into stages 02–13:**

- **P0** — staged metrics on the CEO dashboard could read as live numbers
  (the "số ảo" the whole V3 program exists to kill). Must be enforced by
  render rule + guard (Stages 11, 12).
- **P0** — the V3 prompt's aspirational code list, if applied literally, would
  create ~18 duplicate KPIs (e.g. `RFQ_TECHNICAL_COMPLETENESS_RFT` vs existing
  `RFQ_FEASIBILITY_STUDY_COMPLETENESS`). Must reconcile to canonical codes
  (Stage 03).
- **P1** — OTD is computed on a mutable due date, not a frozen committed date.
  Gaming-resistant OTD needs `frozen_commit_date` instrumentation (Stage 04).
- **P1** — gate metrics are richly structured (all 46 have `gate` +
  `linked_cdr` + `gate_pass_condition`), but 37/46 are staged — gates are
  documented but not yet evidence-enforced (Stage 07).

---

## 2. World Benchmark Matrix

Each row states the operational implication for HESEM, not just the standard name.

| Source | Operating logic extracted | Implication for HESEM KPI |
|---|---|---|
| **LAM / SEMSYSCO supplier quality (TE_0030 family)** | Supplier scored on OTD, quantity accuracy, complaints, PPM, pricing, customer service, QMS status, audit results. Complaint lifecycle is time-boxed: **3D ≤ 1 working day, 4D ≤ 2 working days, 8D update ≤ 10 working days**; a complaint is only *closed* when the customer **accepts** the 8D. Product/process changes need prior approval; deviations need **written special release** before delivery. C-class suppliers face 100% inspection, external inspection at their expense, blocked new orders, or termination. | The 8D SLA chain (`NCR_3D_RESPONSE_SLA`, `NCR_4D_PRELIMINARY_SLA`, `NCR_8D_UPDATE_SLA`, `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE`) is the correct shape and already runtime. **"Accepted closure" — not "submitted" — must be the scored event.** `SPECIAL_RELEASE_COMPLIANCE`, `PROCESS_CHANGE_APPROVAL_RATE`, `LAM_EVIDENCE_PACK_COMPLETENESS` are exactly the right red-line gate metrics; they must become hard holds (Stage 07). |
| **Applied Materials machining supplier expectations** | Precision machined components judged on quality/cost/delivery, manufacturability, GD&T, surface finish, tolerance stack-up, critical dimensions, material specs, NPI manufacturability, process capability, inspection methods. | Justifies CTQ capability (`ctq_capability_policy`, `POST_CHANGE_CPK_REVALIDATION`, `GAGE_VALID_FOR_CTQ_MEASUREMENT`) and FAI/PPAP first-pass as gate G4 enforcement. Margin must be paired with delivery + escape counters so cost pressure never erodes precision. |
| **HMLV / job-shop research (MDPI 2022, TNO 2025)** | Delivery performance should be measured against the **committed delivery date**, not the requested date; drivers are material, supplier capability, production capacity, logistics, product complexity, planning quality. HMLV has rush orders, sequence-dependent setup, job flexibility, multi-skill machines/people — so KPIs must measure constraint, readiness, sequencing, and commit-date risk, **not** OEE/output count. | OTD must use `frozen_commit_date` (Stage 04/06). Lead signals `UNMANAGED_PROMISE_RISK_14D`, `RELEASE_READINESS_RFT`, `CURRENT_CONSTRAINT_HEALTH` matter more than utilization. Do **not** score the company on shop-wide average utilization. |
| **SEMI E10** | Common language for equipment state, RAM (reliability/availability/maintainability), utilization, time-in-state, planned/unplanned downtime. | `CONSTRAINT_LOST_HOURS` lost-hour reason codes should follow an E10-style taxonomy; equipment metrics (MTBF/MTTR) belong to Maintenance role measures, not company score (Stage 09). |
| **ISA-95 / IEC 62264** | Defines ERP/MOM/MES/QMS/WMS/Finance boundaries and the production-schedule / production-performance / quality / maintenance / inventory operations model. | Every data contract (Stage 04) must name a single system-of-record per metric and avoid cross-boundary double counting. |
| **Baldrige** | Resilience and long-term success must be shown via performance **levels + trends + comparisons/benchmarks**, not a single month's number. | Every company KPI needs a trend + segmentation (customer / part family / constraint) — not a lone aggregate. Drives the breakdown requirement in Stage 05 and the 30-day pilot evidence in Stage 13. |

---

## 3. Repo Current-State Map

| Component | Path | Current capability | Gap | Risk | Stage |
|---|---|---|---|---|---|
| Registry SSOT | `mom/data/registry/kpi-authority-registry.json` (3.3 MB, schema_version 26) | 45 top-level sections; runtime/annex122/gate/proposed/dashboard/exec lists; rich per-metric schema (48 fields incl. `metric_subtype`, `evaluation_use`, `lifecycle_status`, `counter_metric`, `sample_policy`, `gate_pass_condition`) | `metric_subtype`/`lifecycle_status` not consistently populated across all 142 proposed metrics | P1 | 03 |
| Engine | `mom/api/services/KpiEngine.php` (227 KB) | 36 `calc*` functions; `ALL_METRICS` const = SSOT for runtime; `calculateKpi()` with min-sample gate via `formula.min_sample`; `calculateFromManualInput()`; empty/div-0 handling present | Constraint/TOC + release-readiness families not yet runtime | P1 | 05 |
| Admin console (service) | `mom/api/services/KpiRegistryAdminService.php` (195 KB) | Seed = structural SSOT; runtime overlay merge; add/retire; ANNEX marker regen | Need to verify overlay cannot add/retire official KPI or change formula/status (structural bypass) | P0 | 10 |
| Admin console (UI) | `mom/scripts/portal/00o-admin-kpi-registry.js` | Library + dashboard editing UI | Manual-input verify/reject workflow + counter-metric-beside-primary UX to confirm | P1 | 10 |
| Dashboard / API | KPI routes + dashboard scripts | catalog / per-code / trend endpoints | Render rule per `calculation_status` must hide staged & manual-pending from score | **P0** | 11 |
| Manual input | `manual_input_contract` (registry) + engine `calculateFromManualInput` | Contract exists | pending/verified/rejected lifecycle + approver enforcement to confirm end-to-end | P1 | 10 |
| Counter-metric workflow | `counter_metric` field on metrics | Field populated | No input/review workflow; not shown beside primary on cards | P1 | 08/10 |
| Gate / CDR linkage | `gate_control_metrics` (46) | All have `gate` + `linked_cdr` + `gate_pass_condition` + `hold_release_rule` | 37/46 staged → gates documented but not evidence-enforced; CDR existence not guard-checked | P1 | 07/12 |
| ANNEX-122 | `qms-anx-122-kpi-authority-matrix.html` | KPI authority matrix (marker-region generated) | Layer separation (company/value-stream/dept/gate) + §9 gate table sync | P1 | 03/07/13 |
| ANNEX-128 | `qms-anx-128-kpi-system-matrix.html` | System matrix (generated) | Regenerate after classification + gate changes; stale-check in guard | P1 | 07/12 |
| ANNEX-110/121/127/129/120 | annex dir | dictionary / RACI / backend-coverage / perf-eval / decision-authority | VN expert rewrite + sync | P2 | 13 |
| WI-202 | `wi-202-kpi-operating-cadence.html` | KPI operating cadence WI | Per-KPI forum/cadence/action playbook + counter-review rule | P1 | 08 |
| JD §9 | role JD docs | §9 result-indicators sections | Fair cascade: controllability scope + counter + attribution | P1 | 09 |
| CI guard | `mom/tools/release/check_kpi_integrity.php` (208 KB) | PASS, 0 P0/P1; counts runtime/manual/staged/retired | Harden for the 18 paper-KPI P0 checks + fake-drift self-test | P1 | 12 |
| Audit scripts | `tools/scripts/kpi/audit-*.php` (3) | All PASS (0 HTML refs, 33 gov KPIs validated, matrix ok) | Keep green every stage | — | all |

---

## 4. KPI Reality Table (status distribution + verdicts)

**Population counts (from guard + registry):**

| Bucket | Count | Notes |
|---|---|---|
| runtime_calculated (engine-backed) | 35 | 1:1 with engine `ALL_METRICS`; no drift |
| manual_governed | 11 | incl. FINAL_RELEASE_RFT, BCP_READINESS, CHECK_DIM_REPORT_ON_SHIP |
| staged_data_contract | 145 | the bulk of `proposed_operating_metrics` (96) + gate metrics (37) + annex122 (12) |
| retired | 0 | nothing retired yet — candidate cleanups in §8 |
| **executive_scorecard** | 7 | OTD, CUSTOMER_ESCAPE_DPMO, FPY, COPQ, PLAN_ADHERENCE, WIP_AGING, MATERIAL_AVAILABILITY_PLAN — **all runtime ✓** |
| dashboard_core_kpis | 31 | ~18 staged (see drift table) |
| annex122_governance_kpis | 33 | 18 runtime / 3 manual / 12 staged |
| gate_control_metrics | 46 | 8 runtime / 37 staged / 1 none |
| proposed_operating_metrics | 142 | 29 runtime / 3 manual / 96 staged / 14 none |

**Per-metric verdict (representative — full reclassification is Stage 03):**

| Code | Status | Verdict | Reason |
|---|---|---|---|
| OTD | runtime | **production-ready, but fix basis** | Must move to `frozen_commit_date` (Stage 06) |
| CUSTOMER_ESCAPE_DPMO | runtime | production-ready | Opportunity-normalized; correct for HMLV |
| FPY / COPQ / PLAN_ADHERENCE / WIP_AGING / MATERIAL_AVAILABILITY_PLAN | runtime | production-ready | Exec scorecard core |
| NCR_3D/4D/8D_*_SLA, CUSTOMER_ACCEPTED_8D_CLOSURE_RATE | runtime | production-ready | Matches LAM 8D logic |
| SHIP_PACKET_COMPLETENESS, FAI_FIRST_PASS, INVOICE_RFT, SUPPLIER_OTD, DSO, INVENTORY_ACCURACY | runtime | production-ready | Keep |
| FINAL_RELEASE_RFT | manual | manual-governed (verify enforced) | Needs verify/reject workflow live |
| BCP_READINESS | manual | health_indicator / manual-governed | Not rewardable; don't score until verified |
| CONSTRAINT_LOST_HOURS, CURRENT_CONSTRAINT_RESOURCE, BOTTLENECK_BUFFER_STATUS, CONSTRAINT_STARVED_TIME | staged | **graduate (Stage 05)** | Core HMLV constraint family; high decision value |
| OEE_BOTTLENECK | staged | operating/diagnostic | Constraint-context only; not company KPI |
| GROSS_MARGIN_JOB_FAMILY | staged | reclassify → operating + add per-constraint-hour view | Needs OTD/escape counter |
| RFQ_TURNAROUND_TIME | staged | reclassify → commercial operating/role measure | Not a company KPI |
| MASTER_DATA_EXCEPTION_AGING, CRITICAL_SYSTEM_AVAILABILITY, SERVICE_TICKET_SLA, SAFETY_ONBOARDING_COMPLIANCE | staged | health_indicator | Not rewardable directly |
| CRITICAL_ROLE_BACKUP_COVERAGE | staged | graduate → resilience (Stage 05) | HR role measure |

---

## 5. Drift Table

| Surface A ↔ Surface B | Result | Finding |
|---|---|---|
| registry `runtime_calculated_metrics` ↔ engine `ALL_METRICS` | **0 drift** | 35 = 35; no missing/extra either direction. Clean. |
| registry runtime ↔ engine `calc*` functions | aligned | 36 calc functions (incl. shared `calcCustomerNcrSlaHours` for 3D/4D/8D); every runtime code resolves |
| `dashboard_core_kpis` ↔ runtime list | **~18 staged on dashboard** | OEE_BOTTLENECK, CONSTRAINT_LOST_HOURS, CRITICAL_ROLE_BACKUP_COVERAGE, SUPPLIER_READINESS, CURRENT_CONSTRAINT_RESOURCE, BOTTLENECK_BUFFER_STATUS, CONSTRAINT_STARVED_TIME, CONSTRAINT_IDLE_WHILE_NON_CONSTRAINT_RUNS, CMM_QUEUE_AGING, FAI_QUEUE_AGING, FINAL_INSPECTION_QUEUE_AGING, QC_HOLD_SLA, MATERIAL_CERT_VERIFICATION_COMPLETENESS, IQC_RELEASE_ON_TIME, LAM_MATERIAL_KIT_READY_TO_PLAN, TRACEABILITY_LABEL_VERIFIED, SPECIAL_PROCESS_REQUIREMENT_CLEAR → **P0 fake-number risk** (Stage 11) |
| `executive_scorecard` ↔ status | clean | all 7 runtime; no staged/manual in the score |
| `gate_control_metrics` ↔ registry codes | structurally complete | all 46 carry gate + linked_cdr + gate_pass_condition; but linked_cdr existence vs ANNEX-121 CDR registry **not** guard-verified → P1 (Stage 07/12) |
| ANNEX-128 ↔ registry | needs re-gen after Stages 03/07 | stale-check to add to guard |

---

## 6. Missing Operations Map (G0→G7 decision coverage)

| Gate | Decision needing a signal | Covered today? | Gap → stage |
|---|---|---|---|
| G0 RFQ completeness | Is RFQ technically complete to quote? | `RFQ_FEASIBILITY_STUDY_COMPLETENESS` (staged) + `RFQ_TURNAROUND_TIME` | graduate / enforce — Stage 05/07 |
| G1 order review / promise capacity | Did we check capacity+material before committing? Is the commit frozen? | `ORDER_REVIEW_RFT` (staged), `PROMISE_DATE_CHANGE_CONTROL`, `PROMISE_KEPT_RATE`; **no frozen-commit instrumentation** | **frozen_commit_date — Stage 04**; promise-approval enforcement — Stage 07 |
| G2 engineering release | Routing/program/fixture/inspection plan ready? | `ENGINEERING_RELEASE_RFT` / `ENGINEERING_RELEASE_ON_TIME` (staged), `INSPECTION_PLAN_COMPLETENESS`, `CONTROL_PLAN_PFMEA_APPROVAL` | graduate / gate — Stage 05/07 |
| G3 material/kitting | Material+cert+tool+fixture+route ready at release? | `MATERIAL_CERT_VERIFICATION_COMPLETENESS`, `LAM_MATERIAL_KIT_READY_TO_PLAN`, `IQC_RELEASE_ON_TIME`, `MATERIAL_AVAILABILITY_PLAN` (runtime) | **composite RELEASE_READINESS_RFT missing** — Stage 03/04/05 |
| G4 FAI/first-piece | FAI/PPAP/first-piece pass or waiver? | `FAI_FIRST_PASS` (runtime), `FAI_CYCLE_TIME`, `GAGE_VALID_FOR_RELEASE` | enforce as hold — Stage 07 |
| G5 production control | Current constraint, WIP nghẽn, NCR containment? | constraint family **staged**; `WIP_AGING` runtime; `NCR_CONTAINMENT_ON_TIME`, `IPQC_*`, `CMM_QUEUE_AGING` | **CURRENT_CONSTRAINT_HEALTH composite + graduate constraint family** — Stage 03/05 |
| G6 final release | CoC/cert/inspection/traceability complete? | `SHIP_PACKET_COMPLETENESS` (runtime), `FINAL_RELEASE_RFT` (manual), `TRACEABILITY_DRILL_TIME`, `CHECK_DIM_REPORT_ON_SHIP` | enforce holds — Stage 07 |
| G7 customer close | Delivered on frozen commit? invoice RFT? 8D accepted? | OTD (runtime, mutable basis), `INVOICE_RFT` (runtime), `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE` (runtime), `SPECIAL_RELEASE_COMPLIANCE`, `LAM_EVIDENCE_PACK_COMPLETENESS` | OTD frozen basis — Stage 06; red-line holds — Stage 07 |
| Cross-cut: critical-role resilience | Single-point-of-failure people/skills? | `CRITICAL_ROLE_BACKUP_COVERAGE` (staged) | graduate → CRITICAL_RESILIENCE_COVERAGE — Stage 05/09 |
| Cross-cut: throughput per constraint hour | Are we maximizing constraint $/hour? | **none** | genuinely missing — Stage 03/04 |

---

## 7. P0 / P1 / P2 Risk Register

| ID | Sev | Risk | Evidence | Resolving stage |
|---|---|---|---|---|
| R01 | **P0** | Staged metrics on CEO dashboard could render as live numbers (số ảo) | ~18 staged in `dashboard_core_kpis` | 11 (render rule) + 12 (guard) |
| R02 | **P0** | Literal application of V3 code list creates ~18 duplicate KPIs | §8 equivalence map | 03 (canonical reconciliation) |
| R03 | **P0** | Admin overlay could add/retire official KPI or change formula/status, bypassing SSOT | to verify in `KpiRegistryAdminService` | 10 |
| R04 | P1 | OTD on mutable due date → gameable by silent re-promise | OTD calc; no frozen_commit field | 04 (instrument) + 06 (basis) |
| R05 | P1 | Gates documented but not evidence-enforced (37/46 staged) | gate status breakdown | 07 |
| R06 | P1 | `linked_cdr` existence not verified against CDR registry | gates carry CDR refs; no guard check | 07 + 12 |
| R07 | P1 | Counter-metrics defined but no input/review workflow, not shown beside primary | `counter_metric` populated, no UX | 08 + 10 |
| R08 | P1 | Constraint/TOC + release-readiness families staged → G5 decisions blind | constraint family all staged | 05 |
| R09 | P1 | Manual-governed verify/reject lifecycle not confirmed end-to-end | manual_input_contract exists | 10 |
| R10 | P1 | Small-lot / min_sample policy not uniformly present on every rate/% KPI | sample_policy partial | 06 + 12 |
| R11 | P2 | ANNEX VN text has machine-translation residue | annex docs | 13 |
| R12 | P2 | 14 proposed metrics have `none` status (neither honest state) | status breakdown | 03/04 |

---

## 8. ADD / KEEP / MERGE / RETIRE / RECLASSIFY + V3-code reconciliation

**Critical reconciliation — V3 prompt code ↔ existing repo code.** The V3 prompt
names aspirational codes; most already exist. Applying them literally violates
the "no KPI bloat / merge duplicates" ground rule. Canonical decision:

| V3 prompt code | Existing repo equivalent | Decision |
|---|---|---|
| `OTD_FROZEN_COMMIT` | `OTD` + `PROMISE_KEPT_RATE` / `PROMISE_DATE_CHANGE_CONTROL` | **MERGE into OTD** — add frozen-commit basis to OTD, don't fork a new code |
| `UNMANAGED_PROMISE_RISK_14D` | `PROMISE_DATE_CHANGE_CONTROL`, `PROMISE_KEPT_RATE` | **ADD** as forward-looking lead signal (14-day horizon is new), reuse promise instrumentation |
| `PROMISE_DATE_APPROVAL_COMPLIANCE` | part of `ORDER_REVIEW_RFT` + `PROMISE_DATE_CHANGE_CONTROL` | **MERGE** into promise-change-control |
| `RFQ_TECHNICAL_COMPLETENESS_RFT` | `RFQ_FEASIBILITY_STUDY_COMPLETENESS` | **KEEP existing** (rename intent only) |
| `ENGINEERING_RELEASE_RFT_OT` | `ENGINEERING_RELEASE_RFT` + `ENGINEERING_RELEASE_ON_TIME` | **KEEP existing pair** |
| `NPI_FAI_PPAP_FIRST_PASS` | `FAI_FIRST_PASS` | **KEEP existing**, extend to cover PPAP |
| `MATERIAL_KIT_READY_AT_RELEASE` | `LAM_MATERIAL_KIT_READY_TO_PLAN` + `MATERIAL_CERT_VERIFICATION_COMPLETENESS` | **MERGE/compose** |
| `CURRENT_CONSTRAINT_HEALTH` | composite of `CURRENT_CONSTRAINT_RESOURCE` + `CONSTRAINT_LOST_HOURS` + `BOTTLENECK_BUFFER_STATUS` | **ADD as composite** over existing parts |
| `MARGIN_PER_CONSTRAINT_HOUR` | `GROSS_MARGIN_JOB_FAMILY` (not per-hour) | **ADD** (genuinely new view) with OTD/escape counter |
| `CRITICAL_RESILIENCE_COVERAGE` / `CRITICAL_ROLE_CERT_COVERAGE` | `CRITICAL_ROLE_BACKUP_COVERAGE` | **KEEP existing**, graduate |
| `RELEASE_READINESS_RFT` | — none — | **ADD** (genuinely missing composite) |
| `THROUGHPUT_PER_CONSTRAINT_HOUR` | — none — | **ADD** (genuinely missing) |
| `CUSTOMER_ESCAPE_SEVERITY_INDEX` | `customer_ncr_severity_matrix` exists but no rolled metric; `CUSTOMER_ESCAPE_DPMO` is the volume view | **ADD** severity-weighted index (complements DPMO) |
| `RELEASE_AND_SHIP_PACKET_INTEGRITY` | `SHIP_PACKET_COMPLETENESS` + `FINAL_RELEASE_RFT` | **MERGE** as a composite view, keep parts |
| `WIP_AGING_GATE` | `WIP_AGING` | **KEEP**, add gate usage context |
| `TRACEABILITY_GATE` | `TRACEABILITY_COMPLETENESS` + `TRACEABILITY_DRILL_TIME` + `TRACEABILITY_LABEL_VERIFIED` | **KEEP existing**, gate usage |

**Summary counts of intended actions (finalized in Stage 03):**
- **ADD (genuinely new):** ~5 — `UNMANAGED_PROMISE_RISK_14D`, `CURRENT_CONSTRAINT_HEALTH` (composite), `RELEASE_READINESS_RFT`, `THROUGHPUT_PER_CONSTRAINT_HOUR`, `CUSTOMER_ESCAPE_SEVERITY_INDEX`, (`MARGIN_PER_CONSTRAINT_HOUR` view).
- **KEEP:** 35 runtime + the structurally-sound gate set.
- **MERGE:** the ~8 V3 aliases above onto canonical codes.
- **RETIRE candidates:** none forced yet; revisit `none`-status proposed metrics (14) in Stage 03 — either give honest staged contract or retire.
- **RECLASSIFY:** `OEE_BOTTLENECK`→operating, `RFQ_TURNAROUND_TIME`→commercial operating/role, `GROSS_MARGIN_JOB_FAMILY`→operating (+counter), `BCP_READINESS`/`CRITICAL_SYSTEM_AVAILABILITY`/`MASTER_DATA_EXCEPTION_AGING`/`SERVICE_TICKET_SLA`→health_indicator.

---

## 9. Three Rounds of Self-Critique

**Round 1 — KPI / data / action / gate.**
- Is the exec scorecard honest? Yes — all 7 runtime. But it lacks the
  customer-escape *severity* dimension and a promise-risk lead signal; it is
  lag-heavy. → Company Scorecard V3 (Stage 03) should pair lags with leads.
- Are gates real? Structurally yes (46 with full fields), operationally no
  (37 staged). Documented ≠ enforced. → Stage 07 must make red-lines hold.
- Did I verify data exists before trusting status labels? Yes for the
  registry↔engine contract (0 drift). For staged metrics, the *label itself*
  is the honest signal (no data yet) — correct, not a defect.

**Round 2 — gaming / fairness / owner / control.**
- OTD on a mutable due date is the single biggest gaming hole: re-promise
  silently → OTD looks green. Frozen commit basis is non-negotiable (Stage 06).
- Margin without a counter incentivizes cherry-picking easy jobs and dropping
  strategic LAM/AMAT work. `MARGIN_PER_CONSTRAINT_HOUR` must ship with an
  OTD/customer-priority-backlog/escape counter (Stage 06/09).
- "Accepted closure" vs "submitted" for 8D: scoring submission rewards
  paperwork speed, not customer satisfaction. The runtime metric already keys
  on accepted — keep it that way; guard it (Stage 12).
- Owner authority: many staged metrics have an `owner_role` but the owner
  can't act without the gate/forum wiring. Stages 07/08/09 close this.

**Round 3 — shopfloor simulation / customer audit.**
- Simulate: LAM rush job jumps the queue, AMAT slips. Today nothing flags the
  *unmanaged* promise risk before it becomes a miss. → `UNMANAGED_PROMISE_RISK_14D`
  is genuinely needed (Stage 02 will stress-test 14 scenarios).
- Simulate: CMM backlog — CNC runs but parts can't release. `CMM_QUEUE_AGING`
  exists but staged; G5/G6 can't see it. → graduate + gate.
- Customer audit: could I reconstruct a shipped lot's CoC/cert/traceability
  from evidence? The fields exist (`material_cert_id`, `coc_ready`,
  `traceability_verified_at` in the contract template) but many are staged. →
  Stage 04 must confirm real columns or mark honest gaps.
- Am I about to over-engineer? Risk: adding 18 codes. Mitigation: §8
  reconciliation caps genuinely-new ADDs at ~5–6.

---

## 10. Stage-by-Stage Action Roadmap

| Stage | Primary deliverable | Key P-items closed |
|---|---|---|
| 02 | Production truth map; 14 scenario simulations; shopfloor-critical candidates | confirms R04, R08; scopes ADDs |
| 03 | 5-layer classification; Company Scorecard V3; canonical-code reconciliation; registry `metric_subtype`/`evaluation_use`/`reward_mode`/`lifecycle_status`; ANNEX-122/128 layer split | R02, R12 |
| 04 | Data contracts + instrumentation (frozen_commit, constraint, release-readiness, 8D, traceability, resilience); honest status per metric | R04, R09 |
| 05 | Runtime graduation: constraint family, RELEASE_READINESS_RFT, CONSTRAINT_HEALTH, escape severity, resilience; calc+breakdown+snapshot+API | R08 |
| 06 | Thresholds + sample_policy + small_lot + severity_override + HMLV rules + hard-gate caps + OTD frozen basis | R04, R10 |
| 07 | Gate matrix; red-line holds; linked_cdr validity; ANNEX-122 §9 + ANNEX-128 regen | R05, R06 |
| 08 | WI-202 forum/cadence/action playbook; dashboard action panel; counter-review rule; action record | R07 |
| 09 | Role/JD §9 fair cascade; controllability scope; counter+attribution; ANNEX-129 | fairness |
| 10 | Console hardening (no structural bypass → draft_change_request); manual verify/reject; counter UX; staged UX | R03, R07, R09 |
| 11 | Dashboard render rule per status; exec scorecard runtime/verified-only; alerts→action; trend safety | **R01** |
| 12 | CI guard: 18 paper-KPI P0 checks + fake-drift self-test; CI wiring | R01, R02, R06, R10 |
| 13 | VN expert rewrite; final audit pack with evidence; 30-day pilot readiness + review framework | R11 |

---

## Definition of Done — Stage 01

- [x] Report exists at this path.
- [x] No files changed outside this report (report-only stage).
- [x] Every KPI bucket has a verdict (full per-metric in Stage 03).
- [x] Every P0 mapped to a resolving stage.
- [x] Benchmarks carry operational implications, not just standard names.
- [x] Baseline audits captured: 3 audit scripts PASS (exit 0); guard PASS
      `schema_version=26 · 0 P0 · 0 P1 · runtime=35 manual=11 staged=145
      retired=0`.
- [x] 3 rounds of self-critique.

**Hand-off to Stage 02:** stress-test the 14 mandatory shopfloor scenarios
against this map to confirm which of the ~5 genuinely-new ADDs survive contact
with real production, and finalize the shopfloor-critical candidate list.
