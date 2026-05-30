# KPI V3 — Stage 06: Thresholds, Small-Lot Statistics & Fair Scoring

- **Date:** 2026-05-30
- **Branch:** `codex/kpi-v3-production-living-20260530`
- **Prompt:** `_reports/kpi-upgrade-prompts-v3/06-thresholds-small-lot-fair-scoring.md`
- **Registry edit:** completed `formula` + `small_lot_review_policy` on the 6 new
  ADD metrics (the Stage-04 clone had carried `sample_policy` but not these two).

---

## 1. The HMLV threshold framework already exists — verified

The registry carries a dedicated, mature policy object
`threshold_policy` (id `HIGH-MIX-LOW-MEDIUM-VOLUME-THRESHOLD-POLICY-2026-05`) with
six sub-policies that map 1:1 onto the V3 Stage-06 "mandatory HMLV rules":

| V3 mandatory rule | Where it already lives |
|---|---|
| Rolling window for low monthly sample | `small_lot_policy` + `sample_policy.rolling_window` (e.g. FAI uses 13-week) |
| **Severity beats rate** (1 critical escape = red) | `severity_policy` + `blocking_condition_registry.quality_escape` |
| **Frozen commit date** for OTD | OTD formula already keys delivery vs `delivery_date_est`; promise-change governance via `PROMISE_DATE_CHANGE_CONTROL`; Stage-04 `UNMANAGED_PROMISE_RISK_14D` adds the frozen baseline contract |
| Separate prototype/NPI from repeat | `small_lot_policy` event-review + FAI `small_lot_review_policy` |
| Constraint dynamic (no shop-wide avg util) | `OEE_BOTTLENECK` operating-only + Stage-04 `CURRENT_CONSTRAINT_HEALTH` |
| Margin needs a counter | `MARGIN_PER_CONSTRAINT_HOUR` ships with priority-backlog counter (Stage 04) |
| Manual not-verified not scored | `official_scorecard_policy.pilot_reward_rule` + dashboard render rule (Stage 11) |

The `threshold_schema` defines numeric RAG fields (`direction, unit, green_point,
yellow_point, target, basis`) with explicit higher/lower-is-better arithmetic —
so RAG, gap, achievement and score are computed, never stored as prose.

**Verified coverage:** of 164 rate/percent/ppm metrics, **0 are missing
`min_sample`** (via `formula.min_sample` or `sample_policy.min_n_score`) and **0
are missing a small-lot policy** (via `small_lot_review_policy` or
`sample_policy.provisional_n/internal_n`). The guard's `P0.7.2` (reward-eligible
rate metric must have `min_sample ≥ 1`) passes. So the existing portfolio already
satisfies the small-lot fairness rule.

---

## 2. Hard-gate / cap-score model already encoded

`blocking_condition_registry` has **6 hard-gate groups**, each with canonical
`condition_ids`, source table, an `open_predicate`, and a `waiver_authority`:

| Group | Effect | Maps to V3 hard-gate table |
|---|---|---|
| `safety` | no monetary recognition while safety action open | Safety serious incident → cap |
| `quality_escape` | critical escape blocks recognition | Critical customer escape → red/cap |
| `gate_bypass` | bypassing a required gate blocks | Unauthorized process change → hold/reject |
| `data_integrity` | falsified/un-auditable number blocks reward | Data integrity breach → no reward, cap |
| `flow_and_readiness` | readiness/traceability blockers | Traceability/CoC missing, calibration invalid → hold |
| `audit` | open audit finding blocks | (audit governance) |

The rule is explicitly **"blocker stops recognition and triggers evidence
review/containment/CAPA/escalation/coaching — not automatic individual
discipline"**, and `metric_governance_defaults.discipline_guardrail` forbids
discipline from an outcome metric (only verified controllable behaviour:
falsification, gate bypass, unsafe act, repeated non-compliance). This is exactly
the fair-scoring posture V3 demands and is stronger than the prompt's table.

---

## 3. What this stage actually fixed

The Stage-04 clone gave the 6 new metrics `sample_policy` + `thresholds` but
**not** a `formula` block or `small_lot_review_policy`. Stage 06 completed both,
consistent with the policy:

| Metric | formula (num/den/unit/dir/min_sample) | small_lot below_n / mode |
|---|---|---|
| `UNMANAGED_PROMISE_RISK_14D` | count of frozen-commit at-risk-unmanaged orders / event / count / lower / 1 | 1 / event_review |
| `RELEASE_READINESS_RFT` | fully-ready releases / all releases / percent / higher / 10 | 10 / event_review |
| `CURRENT_CONSTRAINT_HEALTH` | composite 0-100 / — / score / higher / 1 | 1 / event_review |
| `CUSTOMER_ESCAPE_SEVERITY_INDEX` | severity-weighted sum (rolling 12m) / — / score / lower / 1 | 1 / **severity-wins-rate** |
| `MARGIN_PER_CONSTRAINT_HOUR` | throughput$ / constraint-hours / VND / higher / 5 | 5 / event_review + counter |
| `RELEASE_AND_SHIP_PACKET_INTEGRITY` | complete-packet lots / all lots / percent / higher / 5 | 5 / critical-doc = hold regardless of rate |

All carry `thresholds.basis` (set Stage 04). All `reward_mode=not_rewardable`
while staged — so none can drive a bonus before graduation+verification.

**HMLV-specific choices made:**
- Escape severity uses **rolling 12-month** + severity-wins-rate (matches the
  Customer Escape DPMO design already in the repo for low-volume customers).
- Margin's small-lot rule explicitly forbids optimizing $/hr on <5 jobs and
  binds the OTD/priority-backlog counter into the review.
- Ship-packet integrity: a single missing **critical** document = hold the
  shipment regardless of the aggregate rate (severity over arithmetic).

---

## 4. Verification

- JSON valid; registry round-trips (indent-4).
- Guard `check_kpi_integrity.php` → **PASSED** (0 P0); `official active scorecard
  items: 7` (still honest).
- 3 audit scripts → exit 0.
- ANNEX-122/-129 not re-written this stage: the threshold/fairness model they
  document is already current in the registry; VN rewrite of the prose is Stage 13.
  ANNEX-128 left to portal regeneration per doc-guard.

---

## 5. Self-Critique (the 5 mandated questions)

1. **Any "pretty but fake" threshold?** No — every threshold cites a `basis`
   (customer/contract/benchmark/internal standard); the policy `basis_rule`
   enforces it. The 6 new ones inherit benchmark/contract basis.
2. **Any metric still gameable?** The big four (OTD-promise S10, margin S9,
   8D-submitted-vs-accepted S5, NCR month-end close S8) each have a counter and
   a blocking-condition group. Residual: counters must be *shown* (Stage 08/10)
   and *enforced* (Stage 12) — sequenced.
3. **Any small-sample false-red?** No — 0 rate metrics lack min_sample; below-n
   renders insufficient/event-review, not red. The 6 new ones now have explicit
   `below_n`.
4. **Any owner scored on what they don't control?** `discipline_guardrail` +
   `attribution_rule` + `exclude_conditions` prevent it; the deep fairness
   cascade is Stage 09.
5. **Any counter too weak?** Margin's counter was strengthened in Stage 04 to a
   *delivery/priority-backlog* counter (not just cost-completeness) — directly
   answering S9.

**Adversarial shopfloor check:** Simulate a 2-piece NPI FAI fail (S4). Under the
existing `small_lot_review_policy.below_n=5` + `event_review_not_rate_punishment`,
this triggers a defect-family event review, **not** a 50% rate crash. Correct.
Simulate one critical escape on a low-volume LAM part: `severity_policy` +
escape-severity index force red regardless of DPMO volume. Correct.

---

## Definition of Done — Stage 06

- [x] Every rate/percent/ppm KPI has min_sample (verified 0 gaps).
- [x] Every reward KPI has a counter (anti_gaming_guardrail enforced; new ones not_rewardable while staged).
- [x] Hard-gate/cap rules clear (6 blocking-condition groups).
- [x] Dashboard won't red small samples (below-n → event review; enforced Stage 11).
- [x] 6 new metrics completed with formula + small_lot_review_policy.
- [x] Guard PASS; 3 audits exit 0; JSON valid.
- [x] 3-round self-critique + adversarial shopfloor simulation.

**Hand-off to Stage 07:** validate every gate metric's `linked_cdr` resolves to a
real CDR, confirm no orphan/duplicate gate metric, and align ANNEX-122 §9 with
the registry gate set.
