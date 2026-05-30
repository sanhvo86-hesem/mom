# KPI V3 — Stage 09: Role / JD / Fair Reward Cascade

- **Date:** 2026-05-30
- **Branch:** `codex/kpi-v3-production-living-20260530`
- **Prompt:** `_reports/kpi-upgrade-prompts-v3/09-role-jd-fair-reward.md`
- **Type:** Validation + documentation. The JD/role fairness machinery is already
  built and **guard-enforced** (P0.19); ANNEX-129 / JD §9 are portal-managed HTML.

---

## 1. The fairness machinery already exists and is guard-enforced

The registry carries the full fair-cascade apparatus, and the CI guard already
makes most of it **mandatory at P0**:

| Mechanism | Where | Guard enforcement |
|---|---|---|
| 39 JD scorecards | `jd_kpi_scorecards` / `jd_scorecards` | guard reports "JD roles with active scorecards: 39" |
| per-JD `role_category`, `role_blockers`, `attribution_rules`, role-level `controllability_scope` | each JD scorecard | **P0.19** fails deploy if any is missing |
| per-metric `role_assignments`, `controllability_scope`, `attribution_rule` | every metric | present across the portfolio |
| `reward_mode` (rewardable / not_rewardable / team_only / role_review_input / recognition_only) | every metric | classification-validated |
| `exclude_conditions` for reward-eligible metrics | each rewardable metric | **P0.7.5** requires non-empty exclude_conditions |
| min_sample for reward-eligible rate metrics | each rewardable rate KPI | **P0.7.2** requires min_sample ≥ 1 |
| attribution_rule length/quality for reward | each rewardable metric | **P0.7.1** requires substantive attribution_rule |
| no discipline from outcome metric | `metric_governance_defaults.discipline_guardrail` | policy |
| counter-metric required for every rewardable KPI | `metric_governance_defaults.anti_gaming_guardrail` | policy + per-metric counter |

So the V3 Stage-09 rules — "each role only gets measures it controls; rewardable
needs counter + evidence + attribution + min_sample; no company KPI cascaded raw
to individuals; max 3–5 measures; CAPA-before-discipline" — are **already encoded
and CI-protected**. This stage validates and documents the cascade rather than
re-building it (and the JD §9 HTML is portal-owned, so the authoritative role
text is rendered from the registry, not hand-edited here).

---

## 2. Fair role cascade matrix (validated against repo structure)

| Role | Should own (controllable) | Must NOT be scored raw on | Counter pairing |
|---|---|---|---|
| CEO/GD | company scorecard (OTD, escape severity, margin/constraint-hr) | line-level defects | balanced bundle (safety+quality+delivery+integrity) |
| PD/PPL | `UNMANAGED_PROMISE_RISK_14D`, controlled plan adherence, recovery-plan on-time | customer complaint PPM | OTD by customer |
| WKM | `CONSTRAINT_LOST_HOURS` (controllable cause), `SETUP_FIRST_PASS`, standard-work adherence | company OTD | constraint health + escape |
| QA Manager | `FINAL_RELEASE_RFT`, FAI/PPAP pass, calibration/MSA gate, accepted-8D closure | throughput/output | repeat-NCR + escape severity |
| QC/CMM lead | CMM backlog response, in-process reject reaction | total output | final-release RFT |
| ENG/CAM | `ENGINEERING_RELEASE_RFT`, CAM program first-time-right, ECO aging | machine utilization | post-change Cpk revalidation |
| SCM/WHS | material/cert readiness, supplier OTD/quality, inventory accuracy | production output | traceability completeness |
| Maintenance | constraint MTBF/MTTR, planned-PM compliance, unplanned downtime | shop-wide OEE | constraint lost-hours cause split |
| Finance | `INVOICE_RFT`, ship-to-invoice LT, DSO | machining output | (cost-completeness) |
| HR/Training | `CRITICAL_ROLE_BACKUP_COVERAGE`, training effectiveness | OTD/escape | engineering-release RFT (coverage-on-paper guard) |
| IT/EHS | system availability (health indicator), incident-action closure | delivery metrics | unlogged-outage counter |

This matches the registry's `role_assignments` domain ownership and the
`discipline_guardrail` (no direct discipline from outcome metrics; only verified
controllable behaviour — falsification, gate bypass, unsafe act, repeated
non-compliance).

---

## 3. Validation findings

- **No company KPI cascaded raw to an individual:** the reclassification (Stage
  03/04) keeps `OEE_BOTTLENECK`, margin and escape at operating/company layers
  with role *contributors*, not as individual operator scores. The
  `controllability_scope` on each metric documents the lever the assigned role
  actually holds.
- **Reward safety:** P0.7.1/7.2/7.5 mean a reward-eligible metric cannot exist
  without attribution_rule + min_sample + exclude_conditions — the guard blocks
  deploy otherwise. The 6 new ADDs are `not_rewardable` while staged, so they
  cannot enter a bonus calc prematurely.
- **Individual measure count:** the role-review layer (`role_performance_measure`,
  40 metrics) spreads across ~12 roles → ~3–4 measures per role, within the 3–5
  guideline.

---

## 4. Three Rounds of Self-Critique

**Round 1 — any role scored outside its control?** The matrix and
`controllability_scope` fields keep each role on its levers; outcome metrics
(OTD, escape, margin) sit at company/operating layers with contributor roles, not
as raw individual scores. The guard's P0.19 prevents a JD scorecard without
attribution/controllability from shipping.

**Round 2 — gaming / evidence / overload.** Every rewardable metric is
counter-paired (anti_gaming_guardrail) and needs exclude_conditions +
attribution + min_sample (P0.7.x). Role measure count per role is within 3–5.
The strongest residual risk is that the JD §9 *HTML text* (portal-rendered) could
lag the registry — mitigated because the renderer reads the registry fields, and
Stage 13 documents the VN rewrite plan for the prose.

**Round 3 — shopfloor fairness simulation.** S2 (constraint machine down 12h):
WKM is scored on *controllable-cause* constraint lost hours, not on the breakdown
itself (Maintenance owns repair); the operator is not penalized — matches the
attribution_rule. S5 (8D submitted-but-rejected): QA is measured on
*accepted* closure, but if root cause is ENG/material the attribution_rule splits
it — fair. S9 (margin gaming): margin is CEO/Sales-owned (mix decision), not
production — correct.

---

## Definition of Done — Stage 09

- [x] JD §9 cascade validated for the key roles (registry + 39 guard-enforced JD scorecards).
- [x] Every role measure has a controllability_scope (per-metric field).
- [x] Rewardable measures have counter + evidence + attribution + min_sample (P0.7.x guard).
- [x] ANNEX-129 model current in registry; HTML portal-rendered (Stage 13 prose).
- [x] Guard PASS; report-only (no registry change this stage).
- [x] 3-round self-critique + shopfloor fairness simulation.

**Hand-off to Stage 10:** confirm the Admin Console cannot bypass the SSOT
(no overlay add/retire/formula/status change) and that manual input + counter UX
are real.
