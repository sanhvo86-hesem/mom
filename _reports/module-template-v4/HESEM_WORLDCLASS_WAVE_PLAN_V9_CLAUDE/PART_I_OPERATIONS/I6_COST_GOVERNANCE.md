# I6 — Cost Governance

```
chapter_purpose: per-tenant cost attribution + tier SLA + throttling
owner_role:      FinOps Lead with SRE Lead
```

---

## 1. Per-tenant cost attribution

Per-tenant per-month breakdown:
```
- Compute (vCPU × hours)
- Memory (GB × hours)
- Storage tiered (hot / warm / cold / glacier)
- Network egress
- Managed services share
- ML inference per call
- Observability share
```

---

## 2. Per-tier budgets

```
HESEM Core small:           ~$1,500-2,000/mo + per-user
HESEM Pro mid:               ~$2,000-3,500/mo + per-user
HESEM Enterprise large:     $5,000+/mo per-customer-negotiated
```

---

## 3. Throttling thresholds

```
Warning at 80% utilization
Throttle at 95% (rate-limit AI advisory; rate-limit heavy queries)
Breach at 100% (CSM intervention; engineering absorbs OR uplift)
```

---

## 4. Engineering absorption commitment

HESEM absorbs cost overruns when caused by platform inefficiency
(missing indexes, expensive defaults). Customers pay uplift when
caused by tenant misuse (bulk genealogy depth>20, full re-export
hourly). SRE + FinOps + CSM jointly classify within 48h.

---

## 5. Quarterly cost optimization review

Top 20 expensive workflows + top 10 expensive queries reviewed.
Optimization PRs (right-sizing, query refactoring, caching).

---

## 6. Decision phrase

```
I6_COST_GOVERNANCE_BASELINE_LOCKED
NEXT: I7_SECURITY_OPERATIONS.md
```
