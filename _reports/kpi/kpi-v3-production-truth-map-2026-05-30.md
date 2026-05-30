# KPI V3 — Stage 02: Production Truth Map

- **Date:** 2026-05-30
- **Branch:** `codex/kpi-v3-production-living-20260530`
- **Stage type:** Research + operational mapping (no runtime calculator changes).
- **Prompt:** `_reports/kpi-upgrade-prompts-v3/02-production-truth-map.md`
- **Grounding:** `process_catalog` (G0–G7 with VN names), 46 `gate_control_metrics`
  (29 CDR codes A1–E6), Stage 01 audit.

---

## 0. Why this stage exists

KPIs designed from the office die on the shop floor. This map forces every
metric to trace back to a real decision a real person makes at a real gate,
with real evidence, and a real hold point when it fails. The 14 simulations
below are the acid test: if a scenario can hurt LAM/AMAT and no metric catches
it (or a metric can be gamed around it), that is a gap the later stages must close.

The repo already encodes the flow — `process_catalog` keys map 1:1 to the
operation:

| Gate | process_catalog | Operation (VN) |
|---|---|---|
| G0 | `G0_rfq_quote` | Tiếp nhận RFQ & Báo giá |
| G1 | `G1_order_review` | Soát xét đơn hàng & Hợp đồng |
| G2 | `G2_engineering` | Chuẩn bị kỹ thuật & Lập trình |
| G3 | `G3_material_kitting` | Chuẩn bị vật tư & Kitting |
| G4 | `G4_fai_first_piece` | FAI & Mẫu đầu |
| G5 | `G5_production` | Sản xuất & Kiểm soát quá trình |
| G6 | `G6_final_release` | Kiểm cuối & Phát hành |
| G7 | `G7_customer_close` | Giao hàng, Hóa đơn & Đóng đơn |

---

## 1. G0→G7 Operating Map (real operation)

| Gate | Operating question | Real evidence | Decision owner | Hold point if fail | Metric(s) today | Status |
|---|---|---|---|---|---|---|
| **G0 RFQ** | RFQ đủ drawing/spec/rev/qty/date/critical req? | RFQ/quote record, feasibility checklist | CS/EST/ENG | Không báo giá | `RFQ_FEASIBILITY_STUDY_COMPLETENESS`, `RFQ_TURNAROUND_TIME` | staged |
| **G1 Order review** | Promise date kiểm capacity+material? Frozen chưa? | order review record, CSR ack, profile assign | CS/PD/QA | Không release order | `ORDER_REVIEW_RFT`, `PROMISE_DATE_CHANGE_CONTROL`, `PROMISE_KEPT_RATE`, `CUSTOMER_REQUIREMENT_PROFILE_ASSIGNED`, `CSR_ACKNOWLEDGEMENT_RATE`, `PROCESS_CHANGE_APPROVAL_RATE` | mixed |
| **G2 Engineering** | Routing/program/fixture/inspection+control plan ready? | ENG release pack, PFMEA, inspection plan | ENG/CAM/QA | Không phát hành job | `ENGINEERING_RELEASE_RFT`, `ENGINEERING_RELEASE_ON_TIME`, `CONTROL_PLAN_PFMEA_APPROVAL`, `INSPECTION_PLAN_COMPLETENESS`, `ECN_LEAD_TIME` | staged |
| **G3 Material/kitting** | Material+cert+tool+fixture+route+subtier ready? | kit checklist, IQC, cert, traceability label | SCM/WHS/ENG | Không thả lệnh | `MATERIAL_AVAILABILITY_PLAN`(rt), `MATERIAL_CERT_VERIFICATION_COMPLETENESS`, `LAM_MATERIAL_KIT_READY_TO_PLAN`, `IQC_RELEASE_ON_TIME`, `TRACEABILITY_LABEL_VERIFIED`, `SPECIAL_PROCESS_REQUIREMENT_CLEAR`, `SUBTIER_REQUIREMENT_FLOWDOWN`, `SETUP_FIRST_PASS`, `CHANGEOVER_TIME` | mostly staged |
| **G4 FAI/first piece** | FAI/PPAP/first-piece pass or waiver? gage valid? | FAI/PPAP/CMM report, gage cal record | QA/QC/ENG | Không chạy tiếp | `FAI_FIRST_PASS`(rt), `FAI_CYCLE_TIME`, `GAGE_VALID_FOR_RELEASE` | mixed |
| **G5 Production** | Constraint hiện tại? WIP nghẽn? CTQ/SPC/NCR? | dispatch/operation/equipment logs, SPC, IPQC | PPL/WKM/QC | Re-sequence/recovery/hold | `WIP_AGING`(rt), `IN_PROCESS_REJECT_RATE`(rt), `CONSTRAINT_*`(staged), `CMM_QUEUE_AGING`, `NCR_CONTAINMENT_ON_TIME`, `IPQC_CHARACTERISTIC_COMPLETENESS`, `SPC_SIGNAL_REACTION_TIME`, `CTQ_OUT_OF_SPEC_EVENT_COUNT`, `CTQ_SPECIAL_CAUSE_OPEN_ACTIONS`, `GAGE_VALID_FOR_*` | mostly staged |
| **G6 Final release** | CoC/cert/inspection/traceability/CDR complete? | final release packet, CoC, dim report | QA/QC | Hold shipment | `SHIP_PACKET_COMPLETENESS`(rt), `FINAL_RELEASE_RFT`(manual), `TRACEABILITY_DRILL_TIME`, `CHECK_DIM_REPORT_ON_SHIP`(manual) | mixed |
| **G7 Customer close** | Giao đúng commit? invoice đúng? 8D accepted? special release? | shipment/invoice/NCR, evidence pack | PD/FIN/QA/CS | Escalation/CAPA | `OTD`(rt), `INVOICE_RFT`(rt), `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE`(rt), `NCR_3D/4D/8D_SLA`(rt), `SPECIAL_RELEASE_COMPLIANCE`, `LAM_EVIDENCE_PACK_COMPLETENESS`, `CUSTOMER_ESCAPE_NOTIFICATION_LT` | mixed |

---

## 2. Decision Inventory (gate-anchored, CDR-linked)

The gates reference 29 CDR codes (A1, A2, A5, B1–B8, C2/C4/C7, D1–D14, E3–E6).
Each is an authoritative decision with an accountable (RACI "A") owner. The
decisions that most directly protect LAM/AMAT delivery and quality:

| decision_id | gate | decision_name | owner | input evidence | output | leading signal | hold/release | escalation |
|---|---|---|---|---|---|---|---|---|
| DEC-A1 | G0 | Accept RFQ as quotable | EST/ENG | feasibility checklist | quote / no-quote | `RFQ_FEASIBILITY_STUDY_COMPLETENESS` | no checklist → no quote | PD |
| DEC-A2/A5 | G1 | Commit & freeze delivery date | PD/CS | capacity+material check, CSR | frozen commit | `ORDER_REVIEW_RFT`, promise change control | unverified capacity → no commit | CEO |
| DEC-B1/B2 | G2 | Release engineering pack | ENG | routing/program/fixture/inspection | job release | `ENGINEERING_RELEASE_RFT` | incomplete pack → no release | QA |
| DEC-B8 | G2 | Approve control plan / PFMEA | QA | control plan, PFMEA | approve | `CONTROL_PLAN_PFMEA_APPROVAL` | no approval → no release | QA Mgr |
| DEC-D10 | G3 | Release material to plan | SCM/IQC | IQC, cert, traceability | kit release | `LAM_MATERIAL_KIT_READY_TO_PLAN`, `MATERIAL_CERT_VERIFICATION_COMPLETENESS` | missing cert → hold kit | PD |
| DEC-D1/D2 | G4 | Pass FAI / first piece | QA/QC | FAI/PPAP/CMM | run-on / hold | `FAI_FIRST_PASS` | fail & no waiver → hold | ENG/QA |
| DEC-D3/D4 | G5 | React to SPC/CTQ signal | QC/WKM | SPC, IPQC, CTQ | adjust/hold | `SPC_SIGNAL_REACTION_TIME`, `CTQ_OUT_OF_SPEC_EVENT_COUNT` | special cause open → hold lot | QA |
| DEC-C2/C4 | G5 | Protect & sequence constraint | PPL/WKM | dispatch/equipment | re-sequence | `CURRENT_CONSTRAINT_HEALTH`(new), `CONSTRAINT_LOST_HOURS` | constraint buffer red → recovery plan | PD |
| DEC-D8 | G6 | Release for shipment | QA | release packet, CoC, traceability | ship/hold | `SHIP_PACKET_COMPLETENESS`, `FINAL_RELEASE_RFT` | packet incomplete → hold | QA Mgr |
| DEC-D11 | G7 | Approve special release / deviation | QA Mgr/PD | written customer approval | ship-under-deviation | `SPECIAL_RELEASE_COMPLIANCE` | no written approval → no ship | CEO |
| DEC-D7 | G7 | Confirm on-time vs frozen commit | PD | shipment vs frozen date | close/escalate | `OTD` (frozen basis) | miss → recovery/customer comm | CEO |
| DEC-D6/D11 | G7 | Manage complaint / 8D | QA | NCR, 8D, customer accept | close on accept | 8D SLA chain + `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE` | not accepted → reopen | CEO |

---

## 3. The 14 Mandatory Scenario Simulations

Format per prompt: *scenario · what happens · old KPI behavior · failure/gaming
risk · new KPI/metric required · data/evidence required · action playbook ·
owner attribution · counter-metric.*

### S1 — LAM chen job gấp làm AMAT có nguy cơ trễ
- **What happens:** PPL inserts a LAM rush job ahead of an AMAT order; AMAT now at risk of missing its committed date.
- **Old KPI behavior:** OTD still green until the AMAT miss actually occurs — purely lagging; no early warning.
- **Failure/gaming risk:** Re-sequencing decisions made informally; the AMAT slip is invisible until too late; priority favoritism untracked.
- **New metric required:** `UNMANAGED_PROMISE_RISK_14D` (forward 14-day risk on frozen commit) + `customer_priority_class` weighting.
- **Data/evidence:** `frozen_commit_date`, `approved_resequence_ref`, `customer_priority_class`, current schedule position.
- **Action playbook:** T2 daily — PD/PPL build recovery plan with owner+date, notify AMAT if commit at risk.
- **Owner attribution:** PD/PPL (sequencing); not the operator.
- **Counter-metric:** OTD by customer + customer-priority backlog (so rush-favoring one customer shows up as risk to another).

### S2 — Máy 5-axis/mill-turn hỏng 12 giờ
- **What happens:** Constraint machine down 12h; everything queued behind it slips.
- **Old KPI behavior:** Shop-wide `MACHINE_UTIL`/`OEE` dips slightly — drowned in the average; constraint impact hidden.
- **Failure/gaming risk:** Running easy non-constraint jobs to keep utilization up while the constraint starves the schedule.
- **New metric:** `CONSTRAINT_LOST_HOURS` (graduate) + `CURRENT_CONSTRAINT_HEALTH` + `CONSTRAINT_STARVED_TIME`.
- **Data/evidence:** `current_constraint_resource`, `constraint_event_start/end`, `lost_hour_reason_code` (SEMI E10 taxonomy), equipment log.
- **Action playbook:** T1/T2 — WKM/Maintenance split cause code; decide overtime / re-sequence / external machining; protect constraint buffer.
- **Owner attribution:** Maintenance (repair) + PPL (re-sequence). Operator not penalized.
- **Counter-metric:** OTD + promise risk (so "keep utilization up" can't hide a delivery hit).

### S3 — CMM backlog: CNC chạy nhưng hàng không release
- **What happens:** Parts machined fine but pile up waiting for CMM; nothing ships.
- **Old KPI behavior:** Output/throughput looks healthy; OTD silently degrades.
- **Failure/gaming risk:** Celebrating machining output while finished-but-unreleased WIP grows.
- **New metric:** `CMM_QUEUE_AGING` (graduate), `FINAL_INSPECTION_QUEUE_AGING`, feed into `RELEASE_READINESS_RFT`.
- **Data/evidence:** inspection queue timestamps, CMM program availability, lot-in-queue age.
- **Action playbook:** T1 release review — QA prioritize CMM by ship date; add CMM capacity/shift; flag CTQ lots first.
- **Owner attribution:** QC/CMM lead (queue), QA (priority).
- **Counter-metric:** Final release RFT (don't clear queue by skipping checks).

### S4 — Lô NPI 2 pcs fail FAI
- **What happens:** A 2-piece NPI lot fails first article.
- **Old KPI behavior:** FPY/FAI rate craters because n=2 — one fail = 50% — punishing a normal NPI event.
- **Failure/gaming risk:** Pressure to pass marginal FAI to protect the rate; or NPI avoidance.
- **New metric:** Separate NPI from repeat production; FAI event-review by defect family, not rate, when n < min_sample.
- **Data/evidence:** lot type (NPI vs repeat), defect family, FAI report.
- **Action playbook:** Event review (not rate punishment) — ENG/QA root cause, correct program/fixture, re-FAI.
- **Owner attribution:** ENG/CAM (program), QA (judgment) — shared, evidence-based.
- **Counter-metric:** escape severity (a forced FAI pass that escapes is worse than a fail caught).

### S5 — 8D gửi đúng hạn nhưng khách không accept
- **What happens:** 8D submitted within SLA but customer rejects it.
- **Old KPI behavior:** If "submitted" is the scored event, it shows green despite an unsatisfied customer.
- **Failure/gaming risk:** Rewarding paperwork speed over real closure.
- **New metric:** `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE` (already runtime, keyed on *accepted*) — protect this semantic in the guard.
- **Data/evidence:** `customer_accepted_at`, `effectiveness_verified_at`, `repeat_issue_detected_at`.
- **Action playbook:** T3 weekly — QA/CEO escalate CAPA, customer update, effectiveness check before closure.
- **Owner attribution:** QA (8D quality); root cause may be ENG/material — attribute fairly.
- **Counter-metric:** repeat-issue detection (accepted-but-recurs is a false closure).

### S6 — Thiếu material cert ngay trước shipment
- **What happens:** At G6, material cert/traceability missing.
- **Old KPI behavior:** OTD pressure pushes the ship anyway; traceability gap discovered later (or by customer).
- **Failure/gaming risk:** Shipping to hit OTD by skipping cert/CoC — a hard LAM red-line.
- **New metric:** `SHIP_PACKET_COMPLETENESS` (runtime) as a **hard hold**, `MATERIAL_CERT_VERIFICATION_COMPLETENESS`.
- **Data/evidence:** `material_cert_id`, `heat_lot`, `coc_ready`, `traceability_verified_at`.
- **Action playbook:** G6/T1 shipping — QA/Logistics hold shipment; expedite cert; never ship incomplete.
- **Owner attribution:** SCM (cert procurement), QA (release gate).
- **Counter-metric:** OTD (so the hold is visible as a delivery cost, not buried).

### S7 — CAM engineer nghỉ, không có backup
- **What happens:** Sole CAM programmer absent; programs/fixtures stall.
- **Old KPI behavior:** No metric — single point of failure invisible until it bites.
- **Failure/gaming risk:** Resilience gap unmanaged; G2 silently blocked.
- **New metric:** `CRITICAL_RESILIENCE_COVERAGE` (graduate from `CRITICAL_ROLE_BACKUP_COVERAGE`).
- **Data/evidence:** `critical_role_code`, `primary_person_id`, `backup_person_id`, `certification_status/expiry`, `deputy_approved`.
- **Action playbook:** T3/monthly — HR/ENG cross-train, designate deputy, track cert coverage.
- **Owner attribution:** HR (coverage program) + Dept head (cross-training).
- **Counter-metric:** engineering release RFT (coverage on paper but releases still late = not real).

### S8 — Cuối tháng đóng NCR hàng loạt để làm đẹp số
- **What happens:** Mass-closing NCRs at month end to flatter closure metrics.
- **Old KPI behavior:** NCR closure aging looks great; quality of closure unverified.
- **Failure/gaming risk:** Closing without real corrective action / effectiveness.
- **New metric:** keep `NCR_CLOSURE_AGING` but pair with effectiveness verification + repeat-issue counter; data-integrity hard gate.
- **Data/evidence:** `effectiveness_verified_at`, `repeat_issue_detected_at`, audit trail of closure timestamps.
- **Action playbook:** T3 — QA require effectiveness evidence before closure counts; spike-at-month-end flag.
- **Owner attribution:** QA. CAPA-not-discipline framing.
- **Counter-metric:** repeat-NCR rate + customer escape (gaming closure shows up downstream).

### S9 — Tăng margin bằng cách chạy job dễ, bỏ job chiến lược
- **What happens:** Cherry-pick easy/high-margin jobs, defer strategic LAM/AMAT work.
- **Old KPI behavior:** Margin green; strategic backlog and customer relationship erode invisibly.
- **Failure/gaming risk:** The classic margin-gaming hole.
- **New metric:** `MARGIN_PER_CONSTRAINT_HOUR` with **mandatory counter** = OTD + customer-priority backlog + escape.
- **Data/evidence:** job margin, constraint hours consumed, `customer_priority_class`, backlog by customer.
- **Action playbook:** BSC monthly — CEO review margin only beside delivery+priority counters.
- **Owner attribution:** Sales/CEO (mix), not production.
- **Counter-metric:** strategic-customer OTD + priority backlog aging.

### S10 — Đổi promise date không có customer approval
- **What happens:** Internal promise date silently moved to avoid an OTD miss.
- **Old KPI behavior:** OTD measured on the *moved* due date → always green. The core OTD gaming hole.
- **Failure/gaming risk:** Self-granted extensions; customer never agreed.
- **New metric:** OTD on `frozen_commit_date`; `PROMISE_DATE_CHANGE_CONTROL` requiring `customer_approval_ref`.
- **Data/evidence:** `frozen_commit_date`, `commit_frozen_at`, `promise_change_reason`, `customer_approval_ref`, `promise_date_changed_by/at`.
- **Action playbook:** G1/G7 — any change needs customer approval ref; unapproved change = OTD miss.
- **Owner attribution:** PD/CS.
- **Counter-metric:** unapproved-promise-change count.

### S11 — Thả job khi thiếu fixture/tool nhưng vẫn để máy chạy
- **What happens:** Job released without fixture/tool ready; machine "runs" but can't complete correctly.
- **Old KPI behavior:** Utilization counts the run; rework/scrap appears later.
- **Failure/gaming risk:** Releasing to show activity, creating downstream defects.
- **New metric:** `RELEASE_READINESS_RFT` (new composite: material+cert+program+tool+fixture+inspection plan ready).
- **Data/evidence:** `tool_ready`, `fixture_ready`, `nc_program_ready`, `inspection_plan_ready`, `release_readiness_approved_by`.
- **Action playbook:** T1 release review — PD/ENG/SCM hold release until all items green.
- **Owner attribution:** PD (release decision), ENG/SCM (item readiness).
- **Counter-metric:** in-process reject/scrap (forced release shows up as defects).

### S12 — Special process cert về trễ sau khi hàng đã machining xong
- **What happens:** Parts machined; special-process (e.g. plating/heat-treat) cert arrives late or routing wasn't cleared.
- **Old KPI behavior:** Production "done" but lot can't release; not flagged at G3.
- **Failure/gaming risk:** Special-process requirement discovered post-machining.
- **New metric:** `SPECIAL_PROCESS_REQUIREMENT_CLEAR` (graduate), `SUBTIER_REQUIREMENT_FLOWDOWN`.
- **Data/evidence:** `special_process_route_ready`, `special_process_cert_ready`, subtier flowdown record.
- **Action playbook:** G3/T1 — ENG/SCM clear special-process route before release; expedite cert.
- **Owner attribution:** ENG (route), SCM (subtier).
- **Counter-metric:** final release RFT + traceability.

### S13 — Revision drawing đổi nhưng route/program chưa update
- **What happens:** Customer revises drawing; routing/CNC program not updated → wrong-rev parts.
- **Old KPI behavior:** No catch until FAI/inspection or customer escape.
- **Failure/gaming risk:** Producing to a superseded revision.
- **New metric:** `PROCESS_CHANGE_APPROVAL_RATE`, `POST_CHANGE_CPK_REVALIDATION`, `ECN_LEAD_TIME` enforced at G1/G2.
- **Data/evidence:** revision linkage between drawing↔route↔program, change approval, post-change Cpk.
- **Action playbook:** G2 — ENG block release on rev mismatch; re-validate Cpk after change.
- **Owner attribution:** ENG/CAM.
- **Counter-metric:** escape severity (wrong-rev escape is critical).

### S14 — Gauge/CMM program chưa validate cho feature critical
- **What happens:** CTQ measured with an unvalidated gage/CMM program.
- **Old KPI behavior:** Measurements trusted; capability numbers meaningless.
- **Failure/gaming risk:** "Green" Cpk on invalid measurement = false confidence; calibration-invalid shipment (LAM red-line).
- **New metric:** `GAGE_VALID_FOR_CTQ_MEASUREMENT`, `GAGE_VALID_FOR_IN_PROCESS_MEASUREMENT`, `GAGE_VALID_FOR_RELEASE`.
- **Data/evidence:** gage cal status, MSA/validation record per CTQ, program validation flag.
- **Action playbook:** G4/G5 — QC block CTQ acceptance on invalid gage; hard hold on release.
- **Owner attribution:** QC/metrology.
- **Counter-metric:** escape severity + CTQ out-of-spec events.

---

## 4. Shopfloor-Critical KPI Candidates (for Stage 03/04)

Grouped by the decision they serve. **Bold = genuinely new code; rest = existing,
needs graduation/enforcement.**

| Group | Candidates | Source |
|---|---|---|
| Committed delivery / promise risk | `OTD` (frozen basis), **`UNMANAGED_PROMISE_RISK_14D`**, `PROMISE_DATE_CHANGE_CONTROL` | S1,S10 |
| Release readiness | **`RELEASE_READINESS_RFT`**, `LAM_MATERIAL_KIT_READY_TO_PLAN`, `MATERIAL_CERT_VERIFICATION_COMPLETENESS`, `SPECIAL_PROCESS_REQUIREMENT_CLEAR` | S6,S11,S12 |
| Constraint health | **`CURRENT_CONSTRAINT_HEALTH`**, `CONSTRAINT_LOST_HOURS`, `CONSTRAINT_STARVED_TIME`, `BOTTLENECK_BUFFER_STATUS`, **`THROUGHPUT_PER_CONSTRAINT_HOUR`** | S2,S3 |
| Quality escape / final release / ship packet | `SHIP_PACKET_COMPLETENESS`, `FINAL_RELEASE_RFT`, **`CUSTOMER_ESCAPE_SEVERITY_INDEX`**, `CHECK_DIM_REPORT_ON_SHIP` | S6,S8,S13,S14 |
| 8D accepted closure | `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE`, `NCR_3D/4D/8D_SLA` | S5 |
| Engineering / NPI readiness | `ENGINEERING_RELEASE_RFT`, `FAI_FIRST_PASS` (NPI split), `POST_CHANGE_CPK_REVALIDATION`, `GAGE_VALID_FOR_CTQ_MEASUREMENT` | S4,S13,S14 |
| Material/cert readiness | `MATERIAL_AVAILABILITY_PLAN`, `IQC_RELEASE_ON_TIME`, `TRACEABILITY_LABEL_VERIFIED` | S6,S12 |
| Margin per constraint hour | **`MARGIN_PER_CONSTRAINT_HOUR`** (+ counter) | S9 |
| Critical role / system resilience | **`CRITICAL_RESILIENCE_COVERAGE`** (from `CRITICAL_ROLE_BACKUP_COVERAGE`) | S7 |

Confirmed genuinely-new ADDs surviving simulation: **6** —
`UNMANAGED_PROMISE_RISK_14D`, `RELEASE_READINESS_RFT`, `CURRENT_CONSTRAINT_HEALTH`,
`THROUGHPUT_PER_CONSTRAINT_HOUR`, `CUSTOMER_ESCAPE_SEVERITY_INDEX`,
`MARGIN_PER_CONSTRAINT_HOUR`. Everything else is graduate-or-enforce of an
existing code (consistent with Stage 01 §8 — no code bloat).

---

## 5. Three Rounds of Self-Critique

**Round 1 — coverage.** Do the 14 scenarios cover G0→G7? G0:S— (RFQ
completeness implicitly via feasibility; acceptable). G1:S1,S10. G2:S13.
G3:S6,S11,S12. G4:S4,S14. G5:S2,S3,S14. G6:S6. G7:S5,S8,S9,S10. Every gate
has at least one stress test. The thinnest is G0 — but RFQ completeness is
lower-stakes than delivery/quality, and is covered by an existing staged
metric. Acceptable.

**Round 2 — gaming.** Every scenario names a counter-metric, and the counters
form a closed loop: delivery (OTD/promise) ↔ readiness ↔ quality escape ↔
margin. No metric can be gamed without lighting up its counter. The most
dangerous holes (S9 margin, S10 promise, S6 cert-skip, S8 NCR-close) all map to
hard gates or mandatory counters. Remaining risk: counters only work if shown
beside the primary (Stage 08/10) and enforced in the guard (Stage 12).

**Round 3 — fairness & feasibility.** Owner attribution avoids punishing
operators for system failures (S2 maintenance, S6 SCM, S1 PD). NPI small-lot
fairness (S4) is explicitly event-review-not-rate. Feasibility check: every
"data/evidence required" item maps to an instrumentation field already named in
the Stage 04 prompt's contract template — so Stage 04 can verify real columns
rather than invent them. The one ambition risk is `THROUGHPUT_PER_CONSTRAINT_HOUR`
and `CURRENT_CONSTRAINT_HEALTH` composites: they depend on the constraint family
graduating first (Stage 05) — sequencing is correct.

---

## Definition of Done — Stage 02

- [x] G0→G7 map complete and grounded in `process_catalog` + gate metrics.
- [x] Decision inventory with owner / evidence / leading signal / hold / escalation.
- [x] 14 mandatory scenarios simulated in full required format (≥10 required).
- [x] Each operational problem has a metric/evidence/action or an explicit gap.
- [x] Shopfloor-critical candidate list for Stages 03/04 (6 confirmed new ADDs).
- [x] 3 rounds of self-critique.

**Hand-off to Stage 03:** classify the full portfolio into 5 layers, finalize
the canonical-code reconciliation from Stage 01 §8, design Company Scorecard V3
(pair the 6 new leads with existing lags), and write `metric_subtype` /
`evaluation_use` / `reward_mode` / `lifecycle_status` into the registry.
