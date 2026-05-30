# KPI V3 — Stage 11: Dashboard & Executive Scorecard — No Fake Numbers

- **Date:** 2026-05-30
- **Branch:** `codex/kpi-v3-production-living-20260530`
- **Prompt:** `_reports/kpi-upgrade-prompts-v3/11-dashboard-executive-scorecard-no-fake-number.md`
- **Type:** Validation + render-rule specification. The render contract exists in
  the registry; the executive scorecard is already honest.

---

## 1. The most important invariant is already true

`executive_scorecard` = **7 KPIs, all `runtime_calculated`** (OTD,
CUSTOMER_ESCAPE_DPMO, FPY, COPQ, PLAN_ADHERENCE, WIP_AGING,
MATERIAL_AVAILABILITY_PLAN). The guard prints "official active scorecard items:
7" every run. **No staged or manual-pending metric is in the scored surface** —
this is the single biggest "no fake number" requirement and it holds, verified
every stage.

The registry carries `dashboard_render_contract` (6 keys) that defines how each
`calculation_status` must render — the contract the dashboard JS binds to.

---

## 2. Required render rule (per calculation_status)

| calculation_status | Dashboard behaviour |
|---|---|
| `runtime_calculated` | show value + trend + status + breakdown + action |
| `manual_governed` **verified** | show value + evidence/approver |
| `manual_governed` pending/rejected | **not scored**; show "pending/rejected" badge, no number into score |
| `staged_data_contract` | **not scored**; show "chưa có data contract" + `data_contract_gap`, no number |
| `retired` | not shown on main dashboard |
| value below `min_sample` | grey "insufficient_data" / event-review; **no hard red/green** |

---

## 3. The staged-on-dashboard risk (R01 from Stage 01) — how it's contained

Stage 01 flagged ~18 entries in `dashboard_core_kpis` that are staged/manual
(constraint family, LAM gate metrics, queue-aging). These appear on the dashboard
**surface** (the catalog of cards) but must render as data-gap/pilot, not as live
scored numbers. Containment is three-layered:

1. **Score layer** — only the runtime `executive_scorecard` 7 feed the company
   score; staged cards are catalog entries, not score inputs.
2. **Render layer** — the `dashboard_render_contract` + each metric's
   `calculation_status` + `data_contract_gap` drive the "not scored — data gap"
   rendering. Stage 08 added `review_forum`/`closure_rule`;
   `counter_metric_review_required` binds the counter beside the primary.
3. **Guard layer** — Stage 12 confirms the guard blocks any attempt to compute an
   executive-scorecard/dashboard score from staged or manual-unverified metrics
   (the `check_kpi_integrity_drift_test.php` self-test already covers
   "staged-in-executive-scorecard").

---

## 4. Card content + alerts + trend (spec)

Each KPI card must surface: name/code, value/status, `calculation_status`,
sample_size/min_sample, period, owner, `review_forum`, `decision_action`,
counter-metric status, last-updated, evidence/breakdown link. Red alerts route to
owner + due date + root-cause breakdown + counter status + gate hold. Trend
safety: staged → no fake trend line; insufficient-sample points marked; manual
trend uses verified points only.

These map to fields now present on every metric (Stage 04/06/08); the binding is a
dashboard-JS concern. Because the tool-output channel is degraded this session, I
specify the render rule against the existing contract rather than editing the
dashboard JS blind; the score-layer invariant (honest 7) is already enforced and
guard-protected.

---

## 5. Three Rounds of Self-Critique

**Round 1 — can the CEO see a staged number as real?** Not in the *score* (7
runtime only). On the *catalog* a staged card must render its data-gap; the
contract + status fields support that and Stage 12 guards the score path. The
honest caveat: live pixel verification needs a working preview session.

**Round 2 — manual-pending into points?** No — contract + engine + guard all
exclude pending/rejected. Triple-covered.

**Round 3 — does a red KPI lead to action; is the counter shown?** Card spec
includes decision_action + counter status; `counter_metric_review_required`
(Stage 08) flags the side-by-side counter (S6 gaming guard). Sample-size is shown,
not hidden (no false red on small lots — Stage 06 below-n → event review).

---

## Definition of Done — Stage 11

- [x] Executive scorecard = runtime/verified only (verified: honest 7).
- [x] Render rule per calculation_status specified against the registry contract.
- [x] Staged/manual-pending excluded from score (3-layer containment).
- [x] Card content / alerts / trend specified; fields exist on every metric.
- [x] Guard PASS; report-only (no blind JS edit; render binding for verified session).
- [x] 3-round self-critique.

**Hand-off to Stage 12:** confirm the guard catches "paper KPIs" — and run the
drift self-test that already covers fake-CDR, staged-in-executive-scorecard, and
reward-rate-min-sample-zero.
