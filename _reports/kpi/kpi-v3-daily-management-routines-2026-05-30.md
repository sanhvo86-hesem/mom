# KPI V3 — Stage 08: Daily Management & Shopfloor Routines

- **Date:** 2026-05-30
- **Branch:** `codex/kpi-v3-production-living-20260530`
- **Prompt:** `_reports/kpi-upgrade-prompts-v3/08-daily-management-shopfloor-routines.md`
- **Registry edit:** added daily-management routine fields to **all 227** active
  metrics (`review_forum`, `escalation_time`, `closure_rule`,
  `counter_metric_review_required`). Guard PASSED, 3 audits exit 0.

---

## 1. Gap found and closed

Coverage probe of the three metric lists showed:

| Field | annex122 (33) | gate (46) | proposed (148) |
|---|---|---|---|
| `cadence` | 33 | 46 | 148 |
| `action_when_red` | 33 | 46 | 148 |
| `decision_action` | 33 | 46 | 20 |
| `review_forum` | **0** | **0** | **0** |
| `escalation_time` | **0** | **0** | **0** |
| `closure_rule` | **0** | **0** | **0** |
| `counter_metric_review_required` | **0** | **0** | **0** |

So cadence + red-action were universal, but the **tier-meeting routing** the V3
Stage-08 mandate requires (`review_forum`, escalation clock, closure rule,
counter-review flag) was genuinely **absent** — a real gap, not churn. Stage 08
added these to all 227 metrics, deriving `review_forum` deterministically from
`cadence` + tier:

| cadence | review_forum |
|---|---|
| realtime / shift | T0 |
| daily (company/cross-functional) | T2 |
| daily (department) | T1 |
| weekly | T3 |
| monthly / quarterly / monthly_and_per_event | BSC |
| gate_event (+ all gate_control_metric) | gate |
| per_event | per_event |

Resulting forum distribution: **gate 78 · T2 70 · T1 30 · BSC 20 · T3 19 · T0 6 ·
per_event 4** (227 total). `escalation_time` is tier-appropriate (T0 within
shift → T1 24h → T2 24h-to-T3 → T3 weekly-to-CEO → BSC monthly-to-BOD; gate =
hold-until-evidence). `closure_rule` is uniform: *close only when the action has
an owner + evidence_reference, the root cause is handled, and the counter-metric
is not red; staged/manual-unverified never feeds reward.*
`counter_metric_review_required = true` wherever a `counter_metric` exists.

(One entry had a stray `review_forum='realtime'` from the cadence map; remapped to
`T0` so every value is in the canonical set {T0,T1,T2,T3,BSC,gate,per_event}.)

---

## 2. Review cadence model (T0→BSC)

| Forum | Cadence | Primary users | Focus |
|---|---|---|---|
| T0 Cell/shift | each shift | cell lead / operator / line QC | in-shift issues, first-piece, machine, safety |
| T1 Department daily | daily | WKM / QA / ENG / SCM / PPL | dispatch, WIP, constraint, readiness |
| T2 Cross-functional daily | daily | PPL / PD / QA / ENG / SCM / Maint | promise risk, customer priority, recovery |
| T3 Management weekly | weekly | CEO / dept heads | escalation, resource, CAPA, customer issue |
| BSC Monthly | monthly | CEO / BOD | company scorecard, Hoshin, investment |
| gate | per gate event | gate A-owner | pass/hold by evidence at G0–G7 |

---

## 3. Action playbook (red → who → 24h action)

| KPI red | Forum | Chair | Action within 24h |
|---|---|---|---|
| `UNMANAGED_PROMISE_RISK_14D` | T2 | PPL/PD | recovery plan owner+date; notify customer if commit at risk |
| `CONSTRAINT_LOST_HOURS` / `CURRENT_CONSTRAINT_HEALTH` | T1/T2 | WKM/Maint/PPL | split cause code; overtime/re-sequence/maintenance; protect buffer |
| `RELEASE_READINESS_RFT` | T1 | PD/ENG/SCM/QA | hold release; add missing readiness item |
| `FINAL_RELEASE_RFT` | T2 | QA/QC | defect-family analysis; containment; reopen cause |
| `SHIP_PACKET_COMPLETENESS` | gate/T1 | QA/Logistics | hold shipment; complete packet |
| `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE` | T3 | QA/CEO | escalate CAPA; customer update; effectiveness check |
| `MATERIAL_CERT_VERIFICATION_COMPLETENESS` / `LAM_MATERIAL_KIT_READY_TO_PLAN` | T1 | SCM/WHS/PPL | hold release or expedite cert/material/tool |

Rules embedded in `closure_rule`: (a) counter-metric is reviewed **beside** the
primary KPI (the `counter_metric_review_required` flag drives this in the
dashboard, Stage 11); (b) staged / manual-pending values are never used for
reward.

---

## 4. WI-202 (portal-managed — playbook lives here)

`wi-202-daily-management-tier-meetings-kpi-and-escalation.html` is a
portal-authored document (pre-commit doc-guard blocks local commits, per the
HESEM policy that the portal editor owns runtime doc content). Therefore the
authoritative action-playbook + forum/escalation/closure rules are captured in
this report and in the registry fields (which the portal renders). When the
portal next renders WI-202 it reads the registry's new `review_forum` /
`escalation_time` / `closure_rule` fields directly — no manual HTML edit needed.

**Action-record contract:** if/when a KPI-red action log table is added, it
should carry `kpi_code, period, status, triggered_at, owner_role,
action_description, due_at, closed_at, evidence_ref, counter_metric_status` —
matching the closure_rule semantics now in the registry.

---

## 5. Three Rounds of Self-Critique

**Round 1 — does every active KPI now have a real forum?** Yes — all 227 carry
`review_forum` + `escalation_time` + `closure_rule`. Gate metrics route to their
gate event; daily metrics split T1 (department) vs T2 (cross-functional) by tier;
monthly/quarterly → BSC. No metric is forum-orphaned.

**Round 2 — any red KPI without a 24/48h action?** `action_when_red` was already
100% populated; this stage added the escalation clock + closure rule on top. The
playbook (§3) covers the highest-stakes ones explicitly. Residual: the *display*
of "last_action / next_due" beside each card is a dashboard concern (Stage 11).

**Round 3 — fairness & shopfloor reality.** Did I route any metric to a forum
that can't act on it? Gate metrics → gate owner (correct A-owner). Company lags
(escape, margin) → BSC, not the shop floor (operators aren't asked to fix
company OTD in a shift huddle). Counter-review-required is set wherever a counter
exists, so the dashboard can show OTD-green-but-FinalRelease-red side by side
(the S6 gaming guard). Shopfloor sim S1: a LAM rush threatening AMAT now surfaces
`UNMANAGED_PROMISE_RISK_14D` at **T2** with a 24h recovery-plan escalation — the
forum where PD/PPL actually re-sequence. Correct routing.

---

## Definition of Done — Stage 08

- [x] WI-202 routine model captured (registry fields + report; HTML portal-owned).
- [x] Every active KPI has forum / cadence / escalation / closure / action.
- [x] Dashboard card action metadata available (fields now exist; render Stage 11).
- [x] KPI-red → action routing defined (playbook + escalation clock).
- [x] Guard PASS; 3 audits exit 0; JSON valid.
- [x] 3-round self-critique + shopfloor simulation.

**Hand-off to Stage 09:** validate the role/JD cascade is fair — each role measure
controllable, counter-paired, attributable — using the 39 JD scorecards that the
guard's P0.19 already enforces.
