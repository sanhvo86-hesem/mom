# 30 — V8 Quantitative Models

```text
purpose:        Carry V5 file 19 + V7 §22 + add per-tenant cost model + capacity sensitivity
predecessor:    V5 file 19 + V7 §22
v8_advance:     5 quantitative matrices (capacity, ROI, DORA baseline, per-tenant cost, sensitivity)
work_package:   WP-V8-QUANT (1 work package)
owner:          Program Manager + FinOps Lead
estimate:       2 engineering-weeks (initial) + ongoing
```

---

## 1. Five matrices (CSV in `matrices/`)

```text
matrices/v8_capacity_model.csv
matrices/v8_roi_model.csv
matrices/v8_dora_baseline.csv
matrices/v8_per_tenant_cost_model.csv
matrices/v8_sensitivity_analysis.csv
```

---

## 2. Capacity model (per V5 file 19 §1.3 + V7 §22 §1)

```yaml
work_unit_types: 7 (per V7 §22)
  L1 planning           0.5 - 2 days
  L2 fixture            1 - 3 days
  L3 E2E                3 - 7 days
  L4 live read-only API 5 - 10 days
  L5 mutation           7 - 14 days
  L6 validation package 14 - 30 days
  L7 vertical pack      15 - 60 days

per_wave_engineering_weeks: per V8 file 03
total_path_dependent: 82-148 calendar wk

team_size_per_wave: per V5 file 19 §2.1
total_FTE_years_through_W10: ~142 FTE-yr
loaded_payroll_estimate: ~$16.6M for 5-year build (regional blend)

ai_augmentation_multiplier: 1.5-2.5x (V5 file 19 §1.2)
solo_codex_path: 24-32 months
team_path: 12-18 months
```

---

## 3. ROI model

```yaml
levers (per file 17 §6 + V7 §22):
  - quality escape rate reduction (-30% to -50%)
  - release cycle compression
  - schedule attainment
  - labor efficiency
  - inventory carrying cost
  - maintenance cost (predictive)
  - compliance overhead reduction

per_customer_economics:
  Mid-market customer (1500 users):
    ARR: $750k - $2.5M
    Implementation rev y1: $200k - $800k
    Steady-state cost-to-serve: $30k - $80k/yr
    Steady-state gross margin: 65-75%
    CAC payback: 12-24 months
    NRR target: > 110%
  Enterprise (10k users + multi-pack):
    ARR: $5M - $30M
    Implementation rev: $1M - $5M
    CAC payback: 18-30 months
    NRR target: > 115%

COPQ savings (V5 file 19 §7):
  $200M revenue customer:
    5% COPQ × 30% reduction = $3M/yr savings
    HESEM ARR ($200k-1M) recovered in months
```

---

## 4. DORA baseline + targets per wave

```yaml
DORA Elite-tier thresholds (V5 file 18 §5.3):
  deployment_frequency:    >= daily per team
  lead_time_for_change:    < 1 hour P50; < 1 day P95
  change_failure_rate:     < 5%
  mean_time_to_restore:    < 1 hour P50; < 4 hours P95

per_wave_target:
  W0:    measurement starts
  W4:    Medium tier achieved
  W8:    Elite tier on >= 60% of services
  W12:   Elite tier on 100%
  W14:   Elite sustained 12 mo
```

---

## 5. Per-tenant cost model (per file 25)

```yaml
per_tenant_per_month_average:
  HESEM_Core small:     $1500 base + $30/user
  HESEM_Pro mid:        $3000 base + $20/user
  HESEM_Enterprise:     $5000+ base + negotiated

infrastructure_cost_breakdown (per file 25 + V5 file 19 §3.1):
  compute (4 vCPU, 16 GB × 5 pods):  $400/mo
  database (4 vCPU, 32 GB):           $300/mo
  storage tiered:                     $168/mo
  search (OpenSearch 2 nodes):        $400/mo
  time-series TimescaleDB:            $200/mo
  observability share:                $50-150/mo
  network + LB + CDN:                 $50-100/mo
  ML inference per active feature:    $30-150/mo
total: $1700-3500/mo per tenant baseline

per_tenant_cost_SLO: 99% / 30d under tier_budget
engineering_absorption_commitment: see file 25 §4
```

---

## 6. Sensitivity analysis

```yaml
scenarios:
  base:                    16-32 months team / 24-32 months solo / $16.6M payroll
  team_half_size:          calendar 2x; payroll 0.5x; solo path infeasible
  ai_augmentation_3x:      calendar 0.6x; payroll same; quality risk if quality gate not enforced
  regulatory_drift_+10%:   W7-W10 +10% scope; W9 +1mo
  major_incident_per_quarter:  5-10% slack budget consumed; SLOs at risk

probability_full_plan_within_3x_estimate: ~10% (V5 file 19 §9)
recommendation: continuous re-baselining quarterly + ruthless prioritization
```

---

## 7. Work package

```yaml
WP-V8-QUANT-1: Author 5 matrices + sensitivity scenarios + dashboard
  effort: 2 wk
```

---

## 8. Decision phrase

```text
V8_QUANTITATIVE_MODELS_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-QUANT-1
NEXT_FILE: 31_V8_VERTICAL_PACK_AUTOMOTIVE_v8.md
```
