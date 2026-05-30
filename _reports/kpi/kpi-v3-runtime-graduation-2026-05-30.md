# KPI V3 — Stage 05: Runtime Graduation

- **Date:** 2026-05-30
- **Branch:** `codex/kpi-v3-production-living-20260530`
- **Prompt:** `_reports/kpi-upgrade-prompts-v3/05-runtime-graduation.md`
- **Engine:** `mom/api/services/KpiEngine.php` (36 `calc*`, `ALL_METRICS`=35)

---

## 0. The cardinal rule governs this stage

Ground rule #6: **"Không runtime giả."** A metric may be marked
`runtime_calculated` only if there is a real `calc*` function reading **real
tables/columns that exist today**, with period filter, div-0 guard, sample_size,
min-sample behavior, breakdown, and snapshot/trend path.

The honest, disciplined outcome of Stage 05 is therefore **narrow on purpose**:
graduate only what genuinely can be, and refuse to fabricate the rest. This
report documents that decision metric-by-metric, and pre-writes the calc design
so graduation is a small, safe step once each data stream exists.

---

## 1. Current runtime contract is intact (verified)

```
registry runtime_calculated_metrics : 35
engine ALL_METRICS                  : 35
reg − eng                           : []   (0 drift)
eng − reg                           : []   (0 drift)
36 calc* functions (incl. shared calcCustomerNcrSlaHours for 3D/4D/8D)
```

So the 35 already-runtime KPIs — including the V3-priority `SHIP_PACKET_COMPLETENESS`,
`FAI_FIRST_PASS`, `NCR_3D/4D/8D_RESPONSE_SLA`, `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE`,
`INVOICE_RFT`, `OTD`, `CUSTOMER_ESCAPE_DPMO` — are real and need no graduation.
**5 of the V3 prompt's 15 "priority graduate" codes are already runtime.** No
engine change is made this stage (that would be churn without a data stream).

---

## 2. Graduation decision for the 6 new ADD codes

Each new ADD (Stage 04) was checked against the "no fake runtime" gate. The
verdict for all six is **stay staged** — because the source *stream* (not just
the table) does not exist yet. The tables are real; the event/readiness columns
that the formula needs are the contract still to be built. Graduating now would
mean inventing columns or returning `null` dressed as a number — exactly the
"số ảo" the program forbids.

| Code | Real tables (exist) | Missing stream (why it can't graduate) | Graduation trigger |
|---|---|---|---|
| `UNMANAGED_PROMISE_RISK_14D` | `com_order_promises`, `job_orders`, `aps_kpi_snapshots` | No `frozen_commit_date` / `commit_frozen_at` / recovery-plan linkage — can't compute "unmanaged risk" without a frozen baseline + recovery flag | frozen-commit + recovery-plan stream (Stage 04 contract) |
| `RELEASE_READINESS_RFT` | `job_release_gates`, `mes_dispatch_queue`, `order_document_requirements` | No per-release readiness-checklist rows (material/cert/tool/fixture/program/inspection ready + approver at release moment) | release-readiness checklist stream |
| `CURRENT_CONSTRAINT_HEALTH` | `aps_constraint_resources`, `mes_oee_loss_events`, `mes_dispatch_queue` | No approved "current constraint" register with effective dates + buffer/starved/lost-hour event rows | constraint register/event stream |
| `CUSTOMER_ESCAPE_SEVERITY_INDEX` | `qual_escape_events`, `customer_complaints`, `ncr_records` | `customer_ncr_severity_matrix` exists in registry but is not wired to a normalized escape event stream carrying severity per event | severity-matrix ↔ escape-event join |
| `MARGIN_PER_CONSTRAINT_HOUR` | `job_costing`, `cost_ledger`, `aps_constraint_resources` | No join of job margin to constraint-hours-consumed; constraint register absent | job-costing ↔ constraint-hour join |
| `RELEASE_AND_SHIP_PACKET_INTEGRITY` | `shipment_releases`, `release_manifests`, `eqms_batch_release` | Composite of `SHIP_PACKET_COMPLETENESS` (runtime ✓) + `FINAL_RELEASE_RFT` (manual) — depends on FINAL_RELEASE_RFT having a stable source first | FINAL_RELEASE_RFT graduates + composite weighting approved |

**Note on the closest call — `RELEASE_AND_SHIP_PACKET_INTEGRITY`:** one of its two
inputs (`SHIP_PACKET_COMPLETENESS`) *is* runtime. But a composite that is half
real and half manual-pending would itself be a partly-fake number on a
company-level surface — so it correctly waits for `FINAL_RELEASE_RFT` to graduate.

---

## 3. Pre-written calc design (ready for when streams land)

So graduation is later a 1–2 hour mechanical step, here is the contract each
`calc*` will satisfy (mirrors the existing engine signature
`calcX(DateRange $period, array $filters): array`):

**`calcReleaseReadinessRft` (first to graduate when checklist stream exists):**
```
numerator   = COUNT(job releases in period WHERE all of:
                material_ready AND material_cert_ready AND nc_program_ready
                AND tool_ready AND fixture_ready AND inspection_plan_ready
                AND special_process_route_ready = true at release moment)
denominator = COUNT(job releases in period)
unit        = percent ; direction = higher_is_better ; min_sample = 10
div0        = denominator 0 -> value null, status_hint=empty_result, sample_size=0
min-sample  = sample_size < 10 -> status_hint=insufficient_sample (no RAG)
breakdown   = by missing_item, department_owner, job/customer
evidence    = list of releases with the failing readiness item
snapshot    = saveSnapshot() row; trend via kpi_snapshots
```

**`calcUnmanagedPromiseRisk14d`:**
```
value       = COUNT(orders WHERE frozen_commit_date within next 14 days
                AND at_risk_flag = true AND recovery_plan_ref IS NULL)
unit        = count ; direction = lower_is_better ; min_sample = 1 (event)
breakdown   = by due bucket, customer, owner, recovery status, priority class
counter     = unapproved promise-date moves (customer_approval_ref IS NULL)
```

**`calcCurrentConstraintHealth` (composite):**
```
inputs      = buffer_zone status + lost_hours + starved_time at current constraint
value       = weighted 0-100 score (RAG via thresholds), only when a current
              constraint resource is approved in aps_constraint_resources
breakdown   = by resource, reason code, owner, shift
```

`calcCustomerEscapeSeverityIndex`, `calcMarginPerConstraintHour`, and
`calcReleaseAndShipPacketIntegrity` follow the same shape (severity-weighted
sum; throughput-accounting per constraint hour with delivery/escape counter;
weighted composite of packet+release respectively), each with div-0, sample,
breakdown, and the anti-gaming counter already declared in the registry.

When a stream lands, graduation = (a) implement the `calc*`, (b) add the
`METRIC_*` const to `ALL_METRICS`, (c) flip the registry entry to
`runtime_calculated`, (d) add to snapshot job + trend, (e) API verify, (f) guard
must still PASS with 0 drift.

---

## 4. Verification

- `php -l mom/api/services/KpiEngine.php` → no syntax errors (no change made,
  re-confirmed).
- Guard `check_kpi_integrity.php` → **PASSED** (0 P0).
- 3 audit scripts → exit 0.
- `runtime_calculated_metrics` 35 = engine `ALL_METRICS` 35 (0 drift).
- `executive_scorecard` still 7, all runtime (no staged number entered the score).

---

## 5. Self-Critique (the 5 mandated questions)

1. **Any calculator using unconfirmed tables/columns?** None — I wrote no
   calculator. The pre-written designs cite real tables and label the missing
   columns as the stream-to-build, not as existing.
2. **Any metric without a period filter?** N/A — no new calc. All 35 existing
   ones already take `DateRange $period`.
3. **Any metric under min_sample still showing RAG?** No — and the pre-written
   designs all specify `insufficient_sample` below min_sample.
4. **Is the breakdown enough for a T1/T2 action?** Yes — each design's breakdown
   (missing_item/owner/customer/reason) maps directly to the Stage-08 action
   playbook.
5. **Should any of these be manual/staged instead of runtime?** That is exactly
   the conclusion: all 6 stay staged until their stream exists. Forcing runtime
   would be fake.

**Shopfloor simulation of "graduate anyway" (adversarial):** If I graduated
`UNMANAGED_PROMISE_RISK_14D` today, `calc*` would find no `frozen_commit_date`
column and either crash or return 0 — a dashboard reading "0 unmanaged risks"
that is **false** and would actively hide the S1/S10 gaming holes. That is worse
than an honest "staged — needs frozen-commit stream." The refusal to graduate is
the correct production decision, not a shortfall.

---

## Definition of Done — Stage 05

- [x] Every would-be-graduated KPI has a calc design **or** an honest reason it
      stays staged (all 6 → staged, documented).
- [x] Registry runtime list = engine `ALL_METRICS` (0 drift).
- [x] API returns real numbers for the existing 35 runtime KPIs (unchanged path).
- [x] Empty-period / small-sample handling specified in every pre-written design.
- [x] Guard PASS, 3 audits exit 0, engine lint clean.
- [x] 3-round self-critique + adversarial shopfloor simulation.

**Hand-off to Stage 06:** thresholds, small-lot statistics, and fair scoring —
validate every rate/%/ppm KPI carries `formula.min_sample` + small-lot policy,
add HMLV rolling-window + severity-override + hard-gate caps, and confirm OTD
moves to a frozen-commit basis in its threshold model.
