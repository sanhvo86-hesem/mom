# I2 — Observability and SLO

```
chapter_purpose: how HESEM is observed at run time; SLO discipline
owner_role:      SRE Lead
```

---

## 1. Reference

The full observability description is in B9. I2 binds observability to
operations.

---

## 2. The 22 SLOs (catalog headlines)

```
L1 auth.decide p95 < 20ms             99.9% / 30d
L2 policy directive availability      99.95% / 30d
L3 workflow.commit p95 < 500ms        99.9% / 30d
L4 domain.root.write p95 < 100ms      99.95% / 30d
L5 projection freshness < 5s          99.5% / 30d
L5 OTG integrity zero violations      100% / 7d
L6 surface render p95 < 200ms         99.9% / 30d
L7 api request p95 < 500ms            99.9% / 30d
L7 api error rate < 0.1%              99.9% / 30d
L8 audit chain anchor lag < 25h       100% / 7d
L8 log ingest lag < 60s               99.9% / 30d
L8 trace ingest lag < 60s             99.9% / 30d
CDC consumer lag < 60s                99.9% / 30d
AI inference p95 < 200ms              99.5% / 30d
Audit pack export p95 < 24h           99% / 90d
Backup success rate                   100% / 30d
DR drill quarterly                    100% / 90d
Per-tenant cost SLA                   99% / 30d
Vulnerability patch SLA per severity   100% within SLA / 90d
Validation evidence freshness         100% non-expired / always
Edge gateway uptime per site          99.9% / 30d
Customer onboarding within tier SLA   90% / 90d
```

---

## 3. Burn rate alerting

Multi-window alerts per Google SRE: fast burn (5min, exhausts 30d
budget in 1h → critical) and slow burn (1h, on-trajectory →
warning).

---

## 4. Per-route SLO defined per release

When a new route graduates to L4, the SRE Lead defines its SLO. Without
SLO, the route does not graduate.

---

## 5. Decision phrase

```
I2_OBSERVABILITY_AND_SLO_BASELINE_LOCKED
NEXT: I3_INCIDENT_RESPONSE.md
```
