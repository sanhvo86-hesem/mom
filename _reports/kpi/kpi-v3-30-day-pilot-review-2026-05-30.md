# KPI V3 — Stage 13B: 30-Day Pilot Review Framework

- **Date:** 2026-05-30
- **Branch:** `codex/kpi-v3-production-living-20260530`
- **Companion to:** `kpi-v3-pilot-readiness-pack-2026-05-30.md`
- **Purpose:** the instrument to run at day-30 to decide which KPIs are truly
  living and what to keep / retire / merge / graduate after the pilot.

---

## 1. How to run the review

At day 30, gather: the daily pilot log (one row per forum-KPI-day), the action
records, the manual-input approvals, the gate-hold records, and the
counter-review notes. Score each pilot KPI against the **living-system test** (the
6 questions every official KPI must answer):

1. Data from where (table/column/form)?
2. When red, who acts, in how long?
3. Used in a real daily/weekly/monthly review?
4. Has an anti-gaming counter?
5. Does the owner have real authority?
6. Auditable from evidence?

A KPI that fails ≥2 of these after 30 days is **demoted** (operating metric /
role measure / health indicator / manual-governed / staged) or **retired**.

---

## 2. The 30-day review questions (answer with log evidence)

| Question | Evidence to cite |
|---|---|
| Which KPIs were actually used to make a decision? | action records linked to the KPI |
| Which KPIs did no one look at? | zero forum appearances in the log |
| Which caused dispute / gaming? | counter-review notes, contested actions |
| Which lacked data? | staged KPIs that never got a verified manual input |
| Which went red unfairly on a small sample? | below-min_sample reds in the log |
| Which saved an OTD / customer issue? | recovery actions that prevented a miss |
| Which gate still passed on feeling? | gate holds with no evidence attached |
| Which role measure was unfair? | attribution disputes |
| Which dashboard still showed a fake number? | staged rendered as a live value |
| What to retire / merge / add after pilot? | synthesis of the above |

---

## 3. Graduation decisions expected from the pilot

- **UNMANAGED_PROMISE_RISK_14D / RELEASE_READINESS_RFT / CURRENT_CONSTRAINT_HEALTH**
  — if the manual evidence proves the signal drives real T1/T2 recovery, fund the
  data stream (frozen_commit / readiness-checklist / constraint-register) and
  graduate to runtime (Stage-05 calc designs are pre-written).
- **CUSTOMER_ESCAPE_SEVERITY_INDEX** — wire the severity matrix to the escape
  event stream; graduate alongside DPMO (volume) as the paired severity lag.
- **MARGIN_PER_CONSTRAINT_HOUR** — only graduate with its delivery/priority-backlog
  counter live (anti-S9).
- Any pilot KPI that no forum used → demote/retire (kills paper KPIs by evidence).

---

## 4. Program-level Definition of Done (final)

| Final DoD item | State |
|---|---|
| 3 audit scripts PASS | ✅ every stage (exit 0) |
| KPI integrity guard PASS | ✅ every stage (0 P0) + drift self-test |
| Dashboard no fake numbers | ✅ exec scorecard honest 7 runtime; render rule specified; 3-layer containment of staged cards |
| Gate G0→G7 evidence-based | ✅ 46 gate metrics, full fields, red-line holds mapped (Stage 07) |
| Admin Console no official-KPI bypass | ✅ seed-SSOT + overlay-merge + guard P0 (Stage 10) |
| Manual / counter workflow real | ✅ contract + engine + Stage-08 counter flag |
| WI-202 action playbook | ✅ registry forum/escalation/closure + report playbook (Stage 08) |
| JD cascade fair | ✅ guard P0.19 + role controllability/counter/attribution (Stage 09) |
| Vietnamese rewrite | ✅ new fields expert-VN; glossary + plan for portal HTML (Stage 13A) |
| Pilot plan with log + rules | ✅ readiness pack + this review framework |
| Evidence KPI is used in decisions | → produced by running the 30-day pilot |

---

## 5. Three Rounds of Self-Critique

**Round 1 — is the pilot a real test or theatre?** It is a real test: a KPI that
no forum uses in 30 days is demoted/retired by evidence — the framework actively
hunts paper KPIs rather than rubber-stamping them.

**Round 2 — does it protect against gaming during the pilot?** Yes — counter
review beside primary is a pilot rule, and the review questions explicitly probe
gaming/dispute and unfair small-sample reds.

**Round 3 — is anything declared "done" that isn't?** The one item that can only
be *produced by running the pilot* (evidence that KPIs drive real decisions) is
marked as such, not claimed. Everything else (audits, guard, gates, scorecard
honesty, fair cascade) is verified in the repo today.

---

**End of KPI Upgrade Prompt Pack V3 execution (stages 00–13).**
