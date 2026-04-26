# I5 — Capacity Planning

```
chapter_purpose: per-service capacity model, aggregation per region,
                 scaling tier targets, growth modeling, regulated
                 burst behavior, audit-spike preparedness
owner_role:      SRE Lead with FinOps Lead and Platform Lead
sources:         AWS Well-Architected Reliability + Performance
                 pillars, Google SRE Workbook capacity planning,
                 ISO 22301 capacity considerations, FinOps
                 Foundation framework
```

Capacity planning is the alignment of "what the system can do" with
"what tenants will demand." For HESEM the demand is uneven: a steady
operational baseline punctuated by audit spikes, end-of-period
closes, recall surges, regulator-driven exports. The plan must
absorb spikes without burning cost in the steady state.

---

## 1. Per-service capacity model (declared in service contract)

Each service registers:

```
DEMAND METRICS
  expected_qps_normal             baseline
  expected_qps_peak_p99           steady-state peak
  expected_qps_burst              transient (audit / recall / close)
  cpu_ms_per_request_p50          median CPU
  cpu_ms_per_request_p99          worst-case CPU
  memory_kb_per_request_p50        median memory
  memory_kb_per_request_p99        worst-case memory
  db_connections_steady            baseline pool
  db_connections_burst             peak pool
  external_calls_per_request       count
  external_dependencies            list of downstream services / APIs

SCALING CHARACTERISTICS
  scaling_dimension                cpu | memory | concurrency |
                                   queue depth | io throughput
  scaling_units                    pods / replicas / shards
  scaling_min                      lower bound for SLO
  scaling_max                      upper bound for cost
  cold_start_ms                    serverless services
  warmup_period_ms                  for cache warm-up

REGULATED CHARACTERISTICS
  audit_spike_factor                multiplier during audit (typ 5×)
  recall_spike_factor               multiplier during recall (typ 10×)
  end_of_period_factor              monthly close (typ 3×)
  pack_specific_factor              per pack (Pharma APR; Auto PPAP
                                   surge)
```

---

## 2. Aggregate per-region planning

```
PER REGION CAPACITY = SUM (per-tenant capacity) + BUFFER

PER-TENANT CAPACITY = baseline QPS × peak factor
                      + AI inference load
                      + batch job load
                      + ingestion (CDC, edge gateway, search)
                      + analytics + reporting load
                      + audit-spike reserve
                      + recall-spike reserve

REGION BUFFER
  + 30% steady-state safety
  + 100% during planned event window
  + on-demand auto-scale to absorbing transient spikes
  + 50% reserve for region-failover absorption
   (to handle cross-region failover load)
```

---

## 3. Scaling tier targets

```
DIMENSION                       TARGET CAPACITY (per region; W14)
Active tenants per region       100
Concurrent users per largest     100,000
   tenant
Read API peak QPS                50,000 / region
Write API peak QPS                5,000 / region
Workspace projection peak         20,000 / region
AI inference QPS                  per L2 §6 cost envelope
Authoritative data per tenant    1-10 GB / active year
OTG events                       10B / region / 5-year window
OTG nodes                        100M / region
OTG edges                         500M / region
Audit chain anchor cycle          daily; max 1M evidence/day per
                                  region (sufficient for largest)
Edge gateway sites per tenant     up to 1,000
Edge gateway events / hour         100M (cross-tenant, per region)
Telemetry samples / second         per-tenant scale × 100k tenants
Audit pack export                 per H3 §4; nightly delta build
                                  + on-demand
Recall execution                  10M units / 4 hours
Notifications / hour              1M (regulator + customer + user)
LRO concurrent jobs                10K (per region)
Bulk import / hour                 100M rows aggregate
```

These targets shape infrastructure sizing per region.

---

## 4. Audit-spike + recall-spike planning

Audit and recall events are infrequent but cause sharp spikes.

```
AUDIT SPIKE
  Triggers: regulator inspection notification; customer audit;
   certification surveillance
  Profile: 24-72 h elevated read; 5× normal read QPS for affected
   tenant; cross-cutting evidence queries
  Reserve: dedicated reserved capacity per pack region; on-demand
   over-provisioning for confirmed audits
  Cooldown: post-audit return to baseline within 7 days

RECALL SPIKE
  Triggers: recall execution per D12 (Pharma / Auto / Aero / MD /
   Food)
  Profile: hours of intense read for trace-forward / trace-backward;
   notification surge; partner integration spike
  Reserve: ability to scale to 10× read in under 15 min
  Cooldown: extended (per recall execution length, often weeks)

AI INFERENCE SPIKE
  Triggers: feature ramp; mass-classification job; AI-assisted
   audit pack drafting (AI-31)
  Reserve: per L2 §9 cost envelopes + dynamic scale within envelope

END-OF-PERIOD SPIKE
  Triggers: monthly close; quarter close; year close
  Profile: 3× analytics + reporting; predictable
  Reserve: scheduled scale-up

DR / FAILOVER SPIKE
  Triggers: regional event
  Profile: target region absorbs source region load; audit chain
   reconciliation
  Reserve: per-region buffer per §2
```

---

## 5. Capacity governance

```
QUARTERLY REVIEW
  Per-service actual vs declared (capacity drift)
  Per-tenant actual vs commit (sales-side awareness)
  Per-pack capacity (J1..J5 specific)
  Region balance + headroom
  Cost vs budget
  Forecast next 4 quarters

CAPACITY-RELATED INCIDENT
  Per I3 SEV based on impact
  Capacity exhaustion triggers SEV-2 minimum
  Auto-scale failure (max reached) triggers SEV-1

ON-DEMAND CAPACITY
  Per-region surge buffer (cloud auto-scale within constraints)
  Per-tenant rate-limit + budget enforcement (per I6)
  Per-feature kill-switch + degraded mode (per L2)
```

---

## 6. Tenant-tier expectations

```
TIER             COMMITTED CAPACITY            BURST
Standard         baseline; rate-limited        2× short
Pro              2× standard                    5× short
Enterprise       4× standard                    10× short + reserved
Sovereign        per agreement; isolated        per agreement
Pilot            limited; no SLA                limited
```

Tier capacity is part of K1 pricing tiers; per-tenant capacity is
honored by API gateway + queue + DB pool.

---

## 7. Capacity KPIs

```
- Headroom percent per region (target ≥ 30% steady-state)
- Auto-scale event rate (per region)
- Auto-scale failure count (target 0)
- Saturation alert count
- Per-tenant rate-limit hit count
- Audit-spike success rate (handled within SLO)
- Recall-spike success rate
- Cost per tenant per month
- Cost per AI inference per feature
- Cost per audit pack export
- Tenant onboarding to active capacity (per K5)
```

---

## 8. Failure modes

```
FM1   Auto-scale ceiling reached during spike
      Recovery: kill-switch non-essential features; degrade
              gracefully; H8 CAPA on capacity sizing

FM2   Audit-spike exhausts capacity for non-audited tenants
      Recovery: per-tenant isolation enforced; cross-tenant
              QoS protection; H8 CAPA on isolation discipline

FM3   AI inference cost-envelope breached
      Recovery: per L2 §9 + I6 cost SLO; degraded mode; H8 CAPA

FM4   Regional capacity insufficient post-failover
      Recovery: per I4 cross-region buffer; secondary buffer
              activated; H8 CAPA on capacity reserve sizing

FM5   OTG event scale exceeds plan
      Recovery: per B6; partition rebalancing; H8 CAPA on
              per-tenant data growth modeling

FM6   Recall-execution capacity insufficient
      Recovery: per D12 emergency mode; surge buffer activated;
              H8 systemic CAPA

FM7   End-of-period capacity squeeze on analytics
      Recovery: scheduled scale-up missed; H8 CAPA on
              calendar discipline

FM8   Tenant tier exceeded by usage (free-rider)
      Recovery: per I8 + I6 contract enforcement;
              tenant communication; rate-limit
```

---

## 9. Roles and authority (RACI)

```
Role             MODEL  AGGREGATE  REVIEW  ON-DEMAND  TIER  COST
SRE Lead         A      A          A       A          C     C
Platform Lead    R      R          R       R          C     C
FinOps Lead      C      A          A       C          A     A
Engineering Ld   R      C          R       C          C     C
Vertical Pack Ld C(pack) C(pack)   R(pack) C          C     C
Customer Success -      I          I       -          A     -
Tenant Admin     -      -          I       I          -     I
```

---

## 10. Cross-references

- B7 §6 — deployment topology
- H3 §4 — audit pack capacity
- H8 — CAPA from capacity events
- I1 — deploy considerations
- I2 §5 — cardinality + per-tenant SLI
- I3 — incident from capacity exhaustion
- I4 — DR capacity buffer
- I6 — cost governance
- I7 — security capacity (rate-limits as defense)
- I8 — tenant-tier policy
- L2 §9 — AI cost envelope
- M5 — SLO directory
- K1 — pricing tiers
- M9 — cross-reference

---

## 11. Decision phrase

```
I5_CAPACITY_PLANNING_BASELINE_LOCKED
NEXT: I6_COST_GOVERNANCE.md
```
