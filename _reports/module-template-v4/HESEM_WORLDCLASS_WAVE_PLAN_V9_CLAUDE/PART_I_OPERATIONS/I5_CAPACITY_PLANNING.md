# I5 — Capacity Planning

```
chapter_purpose: per-service capacity model; aggregate planning
owner_role:      SRE Lead with FinOps Lead
```

---

## 1. Per-service capacity model

Each service publishes:
```
- expected_qps (normal + p99 peak)
- cpu_per_request_ms (median + p99)
- memory_per_request_kb (median + p99)
- db_connections (steady-state + burst)
- external_calls_per_request (count + dependencies)
```

---

## 2. Aggregate per-region

```
- N tenants × per-tenant QPS × peak factor
- + buffer (2x for safety)
- + ML inference load
- + batch job load
- + ingestion load (CDC, edge, search)
- + analytics load
```

---

## 3. Scaling characteristics

```
Per region:    100 active tenants
Per tenant:    100,000 concurrent users (largest deployments)
Per route:     50K req/sec read peak; 5K req/sec write peak
Per tenant:    1-10 GB authoritative data per active year
OTG scale:     100M nodes, 500M edges, 10B events per region (5-year)
```

---

## 4. Quarterly review

Quarterly capacity vs actual review. Adjustments propagate to
deployment topology (B7) and per-service resource quotas.

---

## 5. Decision phrase

```
I5_CAPACITY_PLANNING_BASELINE_LOCKED
NEXT: I6_COST_GOVERNANCE.md
```
