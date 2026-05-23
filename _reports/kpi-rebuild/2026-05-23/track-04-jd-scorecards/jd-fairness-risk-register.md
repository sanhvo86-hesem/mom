# JD Fairness Risk Register - KPI Rebuild Track 04

Date: 2026-05-23
Mode: Phase 1 audit/spec

## Summary

The current JD scorecard registry is usable as a legacy weighted display, but not yet fair enough for coaching, OJT, performance review, recognition, or discipline. The highest-risk gaps are role-code SSOT drift, active-only scorecards, outcome metrics assigned without attribution, and missing candidate/do-not-use controls.

## Risk Register

| ID | Severity | Risk | Affected roles | Current evidence | Required control |
|---|---|---|---|---|---|
| JD-FR-001 | P0 | Role-code SSOT drift can split role authority between registry, ANNEX-123, FRM-809, Admin Console, and API. | `SET/SETUP`, `PIE/IE`, `PE/PRE`, `IAO/IA`, `XNK/IMX`, `MPL/MPC`, `TOOL/TCK`, `WAR/WHC`, `APAR/APA`, `GLP/GLA` | `comm -3` between role registry keys and `jd_kpi_scorecards.roles` shows ten mismatch pairs. | Normalize registry keys to role registry codes; keep aliases only as `legacy_role_aliases`. |
| JD-FR-002 | P1 | Active-only model turns candidate ideas into scorecard commitments. | All 39 roles | No role has `candidate_bank`, `optional_rotate`, or `do_not_use`. | Add active/candidate/optional/do-not-use model. Candidate metrics cannot score payout. |
| JD-FR-003 | P1 | Too many active measures overload users and dilute coaching. | `QA`, `CEO`, `PD`, `PPL`, `WKM`, `SCM`, `OPR` | 7 roles have more than five active measures; QA has seven. | Reduce active set to role-category guide; move lower-readiness items to candidate bank. |
| JD-FR-004 | P1 | Company OTD can punish roles that do not control material, engineering, machine, supplier, customer-change, or management resource decisions. | `CS`, `IMX/XNK`, any frontline if added later | `OTD` appears in `CS` and `IMX` role cards, and in leadership cards. | Use attribution split and role-specific recovery/communication measures. |
| JD-FR-005 | P1 | Generic `OEE` can reward nonconstraint overproduction and WIP growth. | `WKM`, `IE/PIE` | `OEE` is active in WKM and IE cards. | Prefer `OEE_BOTTLENECK`, `CONSTRAINT_LOST_HOURS`, or role-specific SMED/cycle metrics with WIP/quality guard. |
| JD-FR-006 | P1 | Low NCR, reject, complaint, or incident targets can encourage suppression. | `QA`, `QC`, `QCL`, `QE`, `EHS`, `CS` | Current cards include complaint/escape/reject/incident metrics without row-level counters. | Add capture completeness, containment, near-miss quality, inspection-bypass, and data-integrity counters. |
| JD-FR-007 | P1 | Operator machine uptime can punish downtime outside operator control. | `OPR` | `POS_OP_MACHINE_UPTIME` is active in OPR card. | Move to candidate/health or replace with downtime reason-code accuracy and escalation compliance. |
| JD-FR-008 | P1 | Purchase price variance can bias BUY toward low price over quality/OTD. | `BUY` | `POS_PURCHASE_PRICE_VARIANCE` active in BUY card. | Candidate only unless paired with supplier quality, supplier OTD, premium freight, and escape blockers. |
| JD-FR-009 | P1 | Training completion can hide lack of competence. | `HR`, `QMS` | `TRAINING_COMP` active in HR card; QMS owns record integrity in practice. | Use critical-role certification coverage, OJT verification pass, and training record integrity. |
| JD-FR-010 | P1 | Ticket closure count/SLA can reward closing low-quality support work. | `ITA`, `ESA` | `SERVICE_TICKET_SLA` appears in IT cards. | Candidate/support only; pair with critical system availability, restore drill, access review, patch compliance, and reopened-ticket guard. |
| JD-FR-011 | P2 | Existing renderer cannot display candidate/optional/do-not-use model. | All JD docs | Renderer only uses `role.scorecard`. | Extend API payload and renderer to show active first, candidate collapsed, optional rotate, do-not-use governance list. |
| JD-FR-012 | P2 | Renderer injects hardcoded visual literals in JS. | All JD docs | Inline CSS uses hardcoded colors, font sizes, spacing, border radii. | Move to CSS/token layer or Graphics Authority before implementation. |
| JD-FR-013 | P2 | ANNEX-123 says 39 JD in one section but DCC bootstrap subtitle still says 38 JD. | ANNEX-123/HR continuity | Search shows DCC subtitle "38 JD" while section says 39 JD. | Fix in docs track after source role count is confirmed and doc guard permits edit. |
| JD-FR-014 | P2 | `scorecard_evidence_contracts` covers executive scorecard metrics, not most role POS measures. | All POS-heavy role cards | Many role metrics have no scorecard evidence contract. | Add role-level evidence source per active measure, not necessarily executive evidence contract. |
| JD-FR-015 | P2 | Current weighted model suggests numeric payout readiness even when Prompt 4 is coaching/OJT first. | All roles | Every current card totals 100. | Make `scorecard_contributes_to_reward` false by default for JD role measures; calibration can opt in later with controls. |

## Bad Measure Rules by Role Group

| Role group | Do not use | Replacement |
|---|---|---|
| Frontline operator/deburr/packing/warehouse/tooling | Company OTD, gross margin, all-machine availability, raw output without quality | Process compliance, first-piece/self-check, issue/pick/pack RFT, safety/FOD, escalation quality |
| Production management | All-machine utilization, plan adherence without approved resequence, output-only metrics | Constraint lost hours, WIP aging, plan with quality/resequence approval, setup/FAI abnormality closure |
| Engineering/CAM/DFM/PE | OTD alone, shop OEE alone, release-on-time without defect counter | Release RFT, post-release revision guard, DFM risk capture, process validation, prove-out quality |
| QA/QC/QMS/QE | Low NCR count, low finding count, QC throughput without accuracy | Capture completeness, escape containment, RCA quality, CAPA effectiveness, inspection bypass guard |
| Supply chain/buyer/materials | Lowest purchase price, inventory turns alone, supplier OTD without attribution | Supplier readiness, material availability, IQC, premium freight guard, shortage aging |
| Sales/estimation/customer service | Quote hit alone, OTD without cause split, complaint rate as personal penalty | Complete RFQ turnaround, quote margin accuracy, order review RFT, communication closure |
| Finance | Gross margin assigned to non-finance roles, DSO alone for AP/AR | Job cost accuracy, invoice RFT, COPQ capture, dispute aging, close RFT |
| HR/EHS/IT | Training complete only, zero incidents only, ticket closed count only | Verified certification, near-miss quality, action closure, restore drill, access review, patch compliance |

## Implementation Acceptance Criteria

Track 4 implementation should be accepted only when:

- `jd_kpi_scorecards.roles` keys match all 39 canonical role registry codes.
- Every role has `active_scorecard`, `candidate_bank`, `optional_rotate`, `do_not_use`, and `fairness_notes`.
- Every active item has controllability, evidence, counter/blocker, and scoring status fields.
- Candidate metrics are not included in active weight total and cannot contribute to reward.
- Renderer supports active/candidate/optional and a "not direct discipline" note.
- Admin/API consumers can resolve both canonical role code and legacy alias.
- ANNEX-127/129 and ANNEX-128 are updated only after registry source changes.

