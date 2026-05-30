# KPI V3 — Stage 03: KPI Portfolio Architecture (Classification)

- **Date:** 2026-05-30
- **Branch:** `codex/kpi-v3-production-living-20260530`
- **Prompt:** `_reports/kpi-upgrade-prompts-v3/03-kpi-portfolio-architecture.md`
- **Scope note:** Stage 03 forbids writing new calculators. The repo's registry
  is **already fully 5-layer classified** (verified below), so this stage
  **validates** that architecture, runs the full ADD/KEEP/MERGE/RETIRE/RECLASSIFY
  decision, designs Company Scorecard V3, and **stages registry refinements into
  Stage 04** (which owns registry status/contract edits) rather than churning a
  3.3 MB guard-passing SSOT for cosmetic changes. This is the ground-rule
  discipline: *don't fabricate change; don't risk the SSOT; honor what the repo
  already encodes.*

---

## 1. Key finding — the 5-layer architecture already exists

Direct registry inspection (not the V2 baseline):

| List | Count | metric_subtype population |
|---|---|---|
| `annex122_governance_kpis` | 33 | official_kpi:32, composite_readiness_index:1 — **100% populated** |
| `gate_control_metrics` | 46 | gate_control_metric:46 — **100%** |
| `proposed_operating_metrics` | 142 | operating_metric:88, role_performance_measure:40, health_indicator:6, counter_metric:4, supplier_scorecard_metric:2, gate_control_metric:1, spc_capability_metric:1 — **100%** |

Every metric also carries `evaluation_use`, `reward_mode`, `lifecycle_status`,
`calculation_status` (0 missing across all 221 entries). The V3 five layers map
cleanly onto existing fields:

| V3 layer | Registry encoding |
|---|---|
| 1. Company KPI | `metric_subtype=official_kpi` **and** `evaluation_use=company_scorecard` |
| 2. Value-stream / Operating | `metric_subtype=operating_metric`, `evaluation_use=daily_management` |
| 3. Gate control | `metric_subtype=gate_control_metric`, `evaluation_use=gate_hold_release` |
| 4. Role performance | `metric_subtype=role_performance_measure`, `evaluation_use=role_performance_review` |
| 5. Health indicator | `metric_subtype=health_indicator`, `evaluation_use=management_review`/`process_control_review` |
| (+ Counter) | `metric_subtype=counter_metric` (4) — anti-gaming pairs |

**Verdict:** the classification work the V3 prompt asks for was substantially
completed in prior sessions. Stage 03's value is critical validation + scorecard
design + reconciliation, not re-tagging.

---

## 2. Classification validation — is it sound? (adversarial pass)

I checked the Stage 01 "reclassify suspects" against actual registry tags:

| Code | Current tags | Correct? | Verdict |
|---|---|---|---|
| `OEE_BOTTLENECK` | operating_metric / daily_management / not_rewardable / staged | ✅ | Already an operating metric, not a company KPI. Stage 01 suspicion resolved — no action. |
| `RFQ_TURNAROUND_TIME` | official_kpi / department_scorecard / not_rewardable / staged | ✅ mostly | Department-level, not company. Fine. (Could argue commercial operating metric, but department_scorecard is acceptable.) |
| `BCP_READINESS` | official_kpi / company_scorecard / recognition_only / manual_governed | ⚠️ | On company layer but `recognition_only` + manual — does **not** feed reward. Should be **health_indicator**; keep off the scored surface. → Stage 04 refinement. |
| `CRITICAL_SYSTEM_AVAILABILITY` | official_kpi / department_scorecard / not_rewardable / staged / lag, no counter | ⚠️ | This is IT uptime — a classic **health_indicator**, mis-subtyped as official_kpi. → Stage 04 refinement (subtype change). |
| `MASTER_DATA_EXCEPTION_AGING` | official_kpi / department_scorecard / not_rewardable / staged / lag, no counter | ⚠️ | Master-data hygiene — **health_indicator**. → Stage 04 refinement. |
| `GROSS_MARGIN_JOB_FAMILY` | official_kpi / company_scorecard / not_rewardable / staged / lag, **no counter** | ❌ | On the company layer with **no counter-metric** — violates the anti-gaming rule for margin (Stage 02 S9). Needs OTD/escape counter + per-constraint-hour view. → Stage 04 (counter) + Stage 05 (per-hour view). |

So the architecture is ~90% sound; the residual issues are **3 health-indicator
mis-subtypes** and **1 missing margin counter** — all on staged/not-rewardable
metrics, so none currently pollute the live company score. They are sequenced
into Stage 04 (registry status/contract edits) rather than forced here.

---

## 3. Company / Executive Scorecard — current reality

Two surfaces exist and they are **not identical** (a deliberate-looking but
worth-flagging gap):

**`executive_scorecard` (the actual scored list, 7 — all runtime ✓):**
OTD, CUSTOMER_ESCAPE_DPMO, FPY, COPQ, PLAN_ADHERENCE, WIP_AGING, MATERIAL_AVAILABILITY_PLAN.

**`evaluation_use=company_scorecard` (the "company review candidate" tag, 6):**
OTD (rt), CUSTOMER_ESCAPE_DPMO (rt), GROSS_MARGIN_JOB_FAMILY (staged),
RECORDABLE_INCIDENT_RATE (staged), FINAL_RELEASE_RFT (manual), BCP_READINESS (manual).

**Observation:** the scored surface (`executive_scorecard`) is honest — every
member is runtime. The `company_scorecard` *tag* includes staged/manual
aspirational members; that is acceptable **only because** they are not in the
scored list. Stage 11 must guarantee the dashboard scores the `executive_scorecard`
runtime list and renders the staged/manual `company_scorecard`-tagged ones as
"pilot/staged — not scored". This is the single most important no-fake-number
invariant and is logged as R01 (Stage 11/12).

**Critique of the current 7:** it is **lag-heavy** (OTD, escape, FPY, COPQ are
all outcomes) and **HMLV-blind** (PLAN_ADHERENCE + WIP_AGING are the only flow
signals; no constraint health, no promise-risk lead, no escape *severity*). For
a job-shop serving LAM/AMAT, the board needs leading signals that let it act
*before* an outcome misses.

---

## 4. Company Scorecard V3 — design proposal

Per the ground rule **"Không đưa staged/manual chưa verified vào executive
score"**, this is a **design + migration plan**, not an immediate scorecard
membership change. Each row states gating status: a metric only joins the scored
list once it is runtime (Stage 05) or verified-manual.

| # | KPI | Type | Pairs with | Status today | Joins scored list when |
|---|---|---|---|---|---|
| 1 | OTD (frozen-commit basis) | lag | UNMANAGED_PROMISE_RISK_14D | runtime (basis fix Stage 06) | basis fixed |
| 2 | CUSTOMER_ESCAPE_SEVERITY_INDEX | lag | DPMO (volume) | **new** | graduates Stage 05 |
| 3 | CUSTOMER_ESCAPE_DPMO | lag | severity index | runtime | already in |
| 4 | RELEASE_AND_SHIP_PACKET_INTEGRITY | lag/gate | RELEASE_READINESS_RFT | composite of SHIP_PACKET_COMPLETENESS (rt) + FINAL_RELEASE_RFT (manual) | composite defined Stage 05 |
| 5 | 8D_RESPONSE_AND_ACCEPTED_CLOSURE | lag | repeat-issue counter | runtime (NCR 3D/4D/8D + accepted) | already runtime — can join |
| 6 | UNMANAGED_PROMISE_RISK_14D | **lead** | OTD | **new** | graduates Stage 05 |
| 7 | CURRENT_CONSTRAINT_HEALTH | **lead** | THROUGHPUT_PER_CONSTRAINT_HOUR | **new composite** | graduates Stage 05 |
| 8 | PLAN_ADHERENCE (controlled) | lead/flow | WIP_AGING | runtime | already in |
| 9 | RELEASE_READINESS_RFT | **lead/gate** | in-process reject | **new** | graduates Stage 05 |
| 10 | MARGIN_PER_CONSTRAINT_HOUR | outcome | **mandatory** OTD + priority-backlog + escape counter | **new view** | graduates Stage 05 + counter wired Stage 04 |
| (11) | CRITICAL_RESILIENCE_COVERAGE | lead | engineering release RFT | staged (from CRITICAL_ROLE_BACKUP_COVERAGE) | graduates Stage 05 |

Design principle: **every lag is paired with a lead, every reward-bearing metric
has a counter.** This directly answers Baldrige (trend + leading indicators) and
the HMLV literature (commit-date + constraint focus over utilization).

**Interim state (this stage):** the live `executive_scorecard` stays at the
honest 7. No staged code is added. The board *views* the V3 design as a pilot
panel (Stage 11) until graduation.

---

## 5. ADD / KEEP / MERGE / RETIRE / RECLASSIFY (final decision table)

Reconciling Stage 01 §8 + Stage 02 §4 against verified registry contents:

### ADD (genuinely new — confirmed by simulation, deferred to Stage 04/05)
| Code | Why new | Build stage |
|---|---|---|
| `UNMANAGED_PROMISE_RISK_14D` | forward 14-day risk on frozen commit; no equivalent (only lag `PROMISE_DATE_RISK`) | 04+05 |
| `RELEASE_READINESS_RFT` | composite readiness gate; no existing composite | 04+05 |
| `CURRENT_CONSTRAINT_HEALTH` | composite over existing constraint parts | 05 |
| `CUSTOMER_ESCAPE_SEVERITY_INDEX` | severity-weighted (complements DPMO volume; `CUSTOMER_NCR_SEVERITY_SCORE` is per-NCR, not rolled) | 04+05 |
| `MARGIN_PER_CONSTRAINT_HOUR` | per-constraint-hour view (vs `GROSS_MARGIN_JOB_FAMILY` per-job) + counter | 04+05 |
| `RELEASE_AND_SHIP_PACKET_INTEGRITY` | board-level composite of packet+release | 05 |

### KEEP (no change)
35 runtime metrics; the structurally-complete 46 gate metrics; 40 role measures;
6 health indicators; 4 counter metrics. The honest `executive_scorecard` 7.

### MERGE (V3 alias → existing canonical — do **not** fork new codes)
| V3 alias | Canonical | Action |
|---|---|---|
| `OTD_FROZEN_COMMIT` | `OTD` | add frozen basis to OTD (Stage 06), no new code |
| `PROMISE_DATE_APPROVAL_COMPLIANCE` | `PROMISE_DATE_CHANGE_CONTROL` / `PROMISE_DATE_RISK` | fold in |
| `RFQ_TECHNICAL_COMPLETENESS_RFT` | `RFQ_FEASIBILITY_STUDY_COMPLETENESS` / `RFQ_COMPLETENESS_RFT` | reuse existing |
| `ENGINEERING_RELEASE_RFT_OT` | `ENGINEERING_RELEASE_RFT` + `ENGINEERING_RELEASE_ON_TIME` | reuse pair |
| `NPI_FAI_PPAP_FIRST_PASS` | `FAI_FIRST_PASS` | extend to PPAP |
| `MATERIAL_KIT_READY_AT_RELEASE` | `LAM_MATERIAL_KIT_READY_TO_PLAN` + `MATERIAL_CERT_VERIFICATION_COMPLETENESS` | compose |
| `CRITICAL_ROLE_CERT_COVERAGE` / `CRITICAL_RESILIENCE_COVERAGE` | `CRITICAL_ROLE_BACKUP_COVERAGE` | extend |
| `WIP_AGING_GATE` | `WIP_AGING` | gate usage_context |
| `TRACEABILITY_GATE` | `TRACEABILITY_COMPLETENESS`/`_DRILL_TIME`/`_LABEL_VERIFIED` | gate usage_context |

This caps genuinely-new codes at **6**, not the ~18 a literal reading would create.

### RECLASSIFY (subtype refinements — sequenced to Stage 04)
| Code | From | To | Reason |
|---|---|---|---|
| `CRITICAL_SYSTEM_AVAILABILITY` | official_kpi | health_indicator | IT uptime, not a company KPI |
| `MASTER_DATA_EXCEPTION_AGING` | official_kpi | health_indicator | data hygiene |
| `BCP_READINESS` | official_kpi (company) | health_indicator / manual-governed (keep off score) | recognition-only already |
| `GROSS_MARGIN_JOB_FAMILY` | official_kpi, no counter | keep official but **add counter** + per-hour view | anti-gaming (S9) |

### RETIRE
None forced. The 14 prior `none`-status proposed metrics are **already resolved**
(re-inspection shows 0 with empty status — all carry honest manual/staged/runtime).
Candidates to revisit only after pilot (Stage 13) if truly unused.

---

## 6. ANNEX / matrix sync status

- **ANNEX-122** (`annex-122-kpi-cascade-dictionary.html`): is marker-region
  generated from the registry; layer separation is already implicit in
  `metric_subtype`. Explicit company/value-stream/dept/gate sectioning + VN
  rewrite → Stage 13.
- **ANNEX-128** (`annex-128-kpi-system-matrix...html`): regenerated by
  `audit-kpi-system-matrix.php` (confirmed it writes the file on run). Will
  regenerate after Stage 07 gate changes.
- **WI-202** (`wi-202-daily-management-tier-meetings...html`): tier-meeting WI —
  forum/cadence wiring is Stage 08.
- No registry write this stage → no ANNEX regeneration triggered; guard stays
  green (re-confirmed PASS, schema_version 26, 0 P0/P1).

---

## 7. Three Rounds of Self-Critique

**Round 1 — did I avoid fabricating change?** Yes. The registry was already
classified; inventing edits to "show work" would risk a 3.3 MB SSOT and the data
loss CLAUDE.md forbids. I validated instead, and sequenced the 4 real refinements
into the stage that owns registry edits (04). Defensible and honest.

**Round 2 — is the classification actually right, or am I rubber-stamping?** I
found 4 genuine issues (3 health-indicator mis-subtypes + 1 missing margin
counter) by adversarial inspection of `lead_or_lag`/`counter_metric`/`reward_mode`
together, not just trusting `metric_subtype`. The margin-no-counter finding is a
real anti-gaming hole (S9). So this is validation with teeth, not rubber-stamp.

**Round 3 — is Company Scorecard V3 honest and HMLV-fit?** It pairs every lag
with a lead and every reward metric with a counter; it adds constraint health +
promise risk (the HMLV essentials). Critically, it does **not** put any
staged/manual code into the scored list now — the live score stays at the honest
7 until graduation. This respects the no-fake-number rule while giving the board
the right *target* shape. Risk: the 6 new ADDs must actually graduate (Stages
04/05) or the V3 scorecard stays aspirational — that risk is owned and sequenced.

---

## Definition of Done — Stage 03

- [x] Every metric has a class (verified 100% populated, not assumed).
- [x] Executive scorecard contains no staged/manual (verified: 7, all runtime).
- [x] No orphan KPI without forum/action surfaced (forum wiring = Stage 08).
- [x] No clearly-unfair role measure (role layer reviewed; fairness = Stage 09).
- [x] Full ADD/KEEP/MERGE/RETIRE/RECLASSIFY table.
- [x] Company Scorecard V3 designed (lead/lag + counter pairing).
- [x] Audit/guard PASS (re-confirmed; no registry write this stage).
- [x] 3 rounds self-critique.

**Hand-off to Stage 04:** (a) write data contracts for the 6 ADDs + frozen-commit
+ margin counter; (b) apply the 4 reclassification refinements as registry edits;
(c) confirm real tables/columns via `.ai/db-map` before declaring any runtime.
