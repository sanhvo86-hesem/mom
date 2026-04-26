# M5 — SLO Directory

```
chapter_purpose: every SLO listed once with target, measurement, owner
owner_role:      SRE Lead with Domain Leads
```

22 SLOs spanning availability, latency, freshness, integrity. Each
SLO has an owner who is paged on burn (per I3 incident response).

---

## 1. Availability SLOs

```
SLO-1   API availability (read paths)        99.9%   monthly
SLO-2   API availability (write paths)       99.5%   monthly
SLO-3   Frontend portal availability         99.9%   monthly
SLO-4   Edge gateway connectivity            99.5%   monthly
SLO-5   Audit chain anchor success           100%    daily
```

---

## 2. Latency SLOs

```
SLO-6   Read API p95                         300ms
SLO-7   Read API p99                         800ms
SLO-8   Write API p95                        500ms
SLO-9   Write API p99                        1200ms
SLO-10  AI advisory p95                      2000ms
SLO-11  Long-running op start ack p95        500ms
SLO-12  CDC consumer lag p95                 60s
SLO-13  Database replica lag p95             5s
```

---

## 3. Freshness SLOs

```
SLO-14  Materialized view freshness          60s
SLO-15  KPI dashboard freshness              5min
SLO-16  Edge telemetry freshness             30s
SLO-17  AI advisory data freshness           per-feature; per L3 model card
```

---

## 4. Integrity SLOs

```
SLO-18  Audit chain anchor missed > 25h      0 events / quarter
SLO-19  Tenant boundary breach detected      0 events / year
SLO-20  OTG axiom violation                  0 events / week
SLO-21  RFC 9457 schema drift                0 events / sprint
SLO-22  Banned-decision bypass attempt       0 events / quarter
```

---

## 5. SLO measurement

- **Source**: OpenTelemetry traces + metrics (per B9, I2)
- **Aggregation**: monthly rolling window (or as noted)
- **Burn rate alerts**: 2x and 5x burn rates page Tier-1 / Tier-2
- **Error budget**: SLO breach pauses non-critical deploys per CS-A

---

## 6. Decision phrase

```
M5_SLO_DIRECTORY_BASELINE_LOCKED
NEXT: M6_RISK_REGISTER.md
```
