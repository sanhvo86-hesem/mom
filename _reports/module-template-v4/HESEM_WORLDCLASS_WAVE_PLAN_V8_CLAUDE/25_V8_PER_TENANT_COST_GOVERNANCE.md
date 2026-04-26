# 25 — V8 Per-Tenant Cost Governance

```text
purpose:        V7 silent on cost SLA + throttling; V8 specifies per-tenant FinOps
predecessor:    V5 file 17 §3.3 + V5 ADR-0265 (per-tenant cost SLO)
v8_advance:     Cost-attribution data product + throttling middleware + commercial integration
work_package:   WP-V8-COST (3 work packages)
owner:          FinOps Lead + SRE Lead
estimate:       2.5 engineering-weeks (W4 + W8)
```

---

## 1. Cost-attribution data product

```yaml
data_product: hesem.cost_per_tenant_v8
grain: tenant × day × cost_class
source: cloud billing + telemetry + ML inference logs + storage tier reports
freshness_sla: 6h (cloud billing typically delayed 4-6h)
fields:
  - tenant_id
  - date
  - compute_usd
  - memory_usd
  - storage_hot_usd
  - storage_warm_usd
  - storage_cold_usd
  - network_egress_usd
  - managed_services_usd
  - ml_inference_usd
  - observability_share_usd
  - total_usd
  - tier_budget_usd (from commercial pack)
  - utilization_pct (total / tier_budget)
```

---

## 2. Tier budgets (V5 file 17 §2 carry-forward)

```yaml
HESEM_Core:         tier_budget_usd_monthly: $1500    typical_per_user: $30
HESEM_Pro:          tier_budget_usd_monthly: $3000    typical_per_user: $20
HESEM_Enterprise:   tier_budget_usd_monthly: $5000+   per-customer-negotiated
```

---

## 3. Throttling thresholds

```yaml
threshold_warn:        utilization_pct >= 80
  action: email tenant admin + product owner
threshold_throttle:    utilization_pct >= 95
  action: 
    - rate-limit AI advisory calls (defer to async)
    - rate-limit heavy queries (genealogy depth>10, full DSAR)
    - HTTP 429 problem-detail https://hesem.io/problems/tenant/cost-budget-exceeded
threshold_breach:      utilization_pct >= 100
  action:
    - automatic conversation with CSM
    - engineering absorbs short-term OR
    - emergency budget uplift signed by Finance
```

---

## 4. Engineering-absorption commitment

V5 ADR-0265 carry-forward: HESEM absorbs cost overruns when caused by platform inefficiency, not tenant misuse. Distinction:

```yaml
platform_inefficiency:    HESEM optimizes the platform; absorbs cost
                          examples: missing indexes, expensive defaults
tenant_misuse:            tenant pays uplift OR is throttled
                          examples: bulk genealogy depth>20, full re-export hourly
investigation_runbook:    SRE + FinOps + CSM jointly classify within 48h
```

---

## 5. Cost optimization quarterly review

```yaml
cadence: quarterly
inputs:
  - top 20 most expensive workflows
  - top 10 most expensive queries
  - per-tenant cost trends
  - infra utilization vs allocation
outputs:
  - optimization PRs (right-sizing, query refactoring, caching)
  - tier pricing review
  - capacity planning update
```

---

## 6. Work packages

```yaml
WP-V8-COST-1: Cost-attribution data product + dashboard           (W4, 1 wk)
WP-V8-COST-2: Throttling middleware + per-tenant rate limit       (W4, 1 wk)
WP-V8-COST-3: Quarterly cost optimization review process          (W8, 0.5 wk)
total: 2.5 wk
```

---

## 7. Decision phrase

```text
V8_PER_TENANT_COST_GOVERNANCE_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-COST-1..3
NEXT_FILE: 26_V8_DESIGN_SYSTEM_AND_GRAPHICS_AUTHORITY.md
```
