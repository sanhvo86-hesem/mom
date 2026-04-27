# I5 — Capacity Planning

```
chapter_purpose: per-service capacity model, aggregation per region and
                 per pack, scaling tier targets, regulated burst behavior,
                 spike planning, tier expectations, capacity KPIs
owner_role:      SRE Lead with FinOps Lead and Platform Lead
sources:         AWS Well-Architected Reliability + Performance pillars,
                 Google SRE Workbook capacity planning, ISO 22301
                 capacity considerations, FinOps Foundation Framework,
                 NIST SP 800-160 (resilience), TOGAF ADM capacity
                 governance
```

Capacity planning is the alignment of what the system can sustain with
what tenants will demand. For HESEM the demand is structurally uneven:
a steady operational baseline punctuated by audit spikes, end-of-period
closes, recall surges, AI mass-classification jobs, and regulator-driven
exports. Each spike class has a distinct profile, duration, cooldown, and
isolation requirement. The plan must absorb spikes without burning cost in
the steady state and without starving co-resident tenants.

---

## 1. Per-service capacity model

Every service exposes a capacity contract registered in the service
catalog and updated per quarterly review. The contract has three
sections: demand metrics, scaling characteristics, and regulated
characteristics.

### 1.1 Demand metrics

```
FIELD                           DEFINITION
expected_qps_normal             baseline QPS during business hours;
                                p50 over 30-day window
expected_qps_peak_p99           steady-state peak; worst business-hour
                                burst without triggered event
expected_qps_burst              transient max; triggered by audit /
                                recall / AI mass job / end-of-period
cpu_ms_per_request_p50          median CPU cost per request; from
                                profiling under production load
cpu_ms_per_request_p99          99th-percentile CPU; determines pod
                                sizing for tail latency compliance
memory_kb_per_request_p50       median heap allocation per request
memory_kb_per_request_p99       worst-case; OOM boundary if exceeded
db_connections_steady           baseline pool size for this service
db_connections_burst            peak pool during burst; must stay
                                below DB max_connections reserve
io_throughput_mb_s_steady       for storage-intensive services
                                (evidence export, audit pack build,
                                telemetry ingestion)
io_throughput_mb_s_burst        peak I/O during audit pack export
                                or bulk genealogy read
external_calls_per_request      fan-out to downstream services;
                                drives cascading capacity
external_dependencies           list of downstream service IDs;
                                used for dependency graph analysis
queue_depth_normal              baseline message queue depth
queue_depth_max                 max tolerated before back-pressure
cache_hit_rate_target           workspace projection cache; below
                                this threshold DB load increases
payload_size_bytes_p99          for serialization + network sizing
```

### 1.2 Scaling characteristics

```
FIELD                           DEFINITION
scaling_dimension               primary driver: cpu | memory |
                                concurrency | queue_depth |
                                io_throughput | connection_count
scaling_units                   pods for stateless; shards for
                                stateful (OTG partitions, DB shards);
                                replicas for read-heavy
scaling_min                     minimum replicas for SLO coverage
                                at off-peak; never zero for regulated
                                paths
scaling_max                     ceiling before cost-break; must be
                                approved by FinOps for services
                                above 20× normal
hpa_target_utilization          HPA trigger threshold (%); typically
                                60-70% for smooth response
scale_up_latency_s              time to add one replica and pass
                                readiness probe; affects spike
                                absorption ramp
scale_down_cooldown_s           stabilization window after downscale;
                                prevents thrash
cold_start_ms                   for serverless / edge; how long to
                                serve first request after cold
warmup_period_ms                cache and JIT warmup; determines
                                how long a new pod underperforms
stateful_rebalancing_policy     for partitioned stores: how partition
                                reassignment proceeds; impact on
                                availability during rebalancing
```

### 1.3 Regulated characteristics

```
FIELD                           DEFINITION
audit_spike_factor              multiplier during regulator inspection
                                or certification audit; default 5×
                                normal read QPS; Pharma sterile /
                                MD class III / Aero defense may reach
                                8-10×
recall_spike_factor             multiplier during active recall; read
                                trace-forward / backward; default 10×;
                                Food § 204 may require 15× for batch
                                genealogy queries
end_of_period_factor            monthly close / quarter close /
                                year-end; driven by analytics,
                                reporting, periodic review jobs (H6);
                                default 3×
ai_inference_factor             AI mass-classification jobs (L2 §9);
                                default 5× inference QPS during ramp
dr_failover_factor              target region absorbs source region
                                at failover; target absorption 100%
                                of source baseline + 50% buffer
pack_specific_factor            Pharma APR + stability report
                                generation: 4× analytics; Auto PPAP
                                submission: 2× document store; Aero
                                FAI: 3× root ops; MD post-market
                                surveillance: 2× evidence queries;
                                Food recall: 15× genealogy reads
regulated_path_protected        boolean; if true this path is excluded
                                from throttle (per I6 §3); capacity
                                must be reserved unconditionally
```

---

## 2. Aggregate per-region planning

### 2.1 Formula

```
PER-REGION CAPACITY = SUM_over_tenants(per_tenant_capacity) × 1.30
                    + spike_reserve
                    + dr_failover_buffer

PER-TENANT CAPACITY =
    baseline_qps × peak_factor
  + ai_inference_load (per L2 §9 envelope × concurrent-feature-count)
  + batch_job_load (LROs, mass-import, bulk analytics)
  + ingestion_load (CDC gateway, edge events, telemetry)
  + analytics_and_reporting_load (workspace projections, period reports)
  + audit_spike_reserve (always reserved; not collapsed on cost pressure)
  + recall_spike_reserve (always reserved)
  + dr_failover_absorption (100% source baseline per §2.3)

REGION BUFFER
  + 30% steady-state safety margin
  + 100% on-demand over-provisioning during declared event window
    (audit, recall, DR exercise)
  + cloud auto-scale headroom for transient spikes (< 15 min)
  + 50% region-failover absorption buffer
```

### 2.2 Per-pack aggregate modifiers

```
PACK        AGGREGATE MODIFIER          REASON
Pharma      +15% storage hot/warm       APR + stability data growth
            +25% analytics at period end  Periodic review batch
            +40% at recall              Batch genealogy depth
Med Device  +10% document store         DHF + DHR per-unit churn
            +15% audit evidence         Per-unit inspection records
Auto        +10% integration I/O        EDI + OEM portal traffic
            +20% at PPAP submission       Document and approval burst
Aero        +30% on ITAR-compliant infra   isolated compute zones
            +25% during AS9100D audit      Full trail query
Food        +35% at recall               § 204 2-step trace
            +10% ingestion              EMP + SQF IoT stream
```

### 2.3 Failover absorption model

When region A fails, region B must absorb region A's full load:

- Region B normal capacity reserved = region A's SLA-covered load × 1.0
- Region B auto-scale ceiling pre-warmed before each DR exercise
- Failover tests validate absorption within RTO 4h (per I4)
- OTG replication lag at failover ≤ RPO 1h (per I4 §2.1)

---

## 3. Scaling tier targets (W14)

The following targets represent the platform capacity to achieve by
wave W14. Each figure is per region unless noted.

```
DIMENSION                              TARGET (per region; W14)
─────────────────────────────────────────────────────────────────
Active tenants per region              100
Concurrent users (largest tenant)      100,000
Read API peak QPS                      50,000
Write API peak QPS                     5,000
Workspace projection peak QPS          20,000
AI inference QPS (aggregate)           per L2 §9 cost envelope;
                                       ≈ 500 QPS sustained;
                                       3,000 QPS burst (mass job)
AI inference batch jobs concurrent     50 (cross-tenant)
Authoritative data per tenant          1–10 GB / active year
OTG events total (5-year window)       10 billion / region
OTG live nodes                         100 million / region
OTG live edges                         500 million / region
Audit chain anchor cycles              ≤ 1M evidence items anchored
                                       per region per day
Edge gateway sites per tenant          up to 1,000
Edge gateway events / hour             100 million (cross-tenant)
Telemetry samples / second             sum across tenants; per OTel
                                       cardinality governance (I2 §8)
Audit pack export (per tenant)         nightly delta; on-demand
                                       within SLO-07 / SLO-08
Recall execution capacity              10M lot/unit records traced
                                       within 4 hours
Notifications / hour                   1 million (regulator + customer
                                       + user + integration)
LRO concurrent jobs                    10,000 / region
Bulk import throughput                 100M rows / hour (aggregate)
DB connection pool (aggregate)         10,000 sustained /
                                       25,000 burst
Search index throughput                1M events / min ingestion
                                       (cross-tenant)
```

These targets drive infrastructure right-sizing for storage, compute,
network, and DB pools. They are validated per quarterly review and
re-forecast for the next 4 quarters.

---

## 4. Spike planning

### 4.1 Audit spike

```
TRIGGER
  Regulator inspection notification received (per H1 §3 window);
  certification surveillance visit; customer internal audit declaration;
  third-party supplier audit (where HESEM hosts supplier data)

PROFILE
  Duration: 24–72 hours elevated read; can extend to 7 days
  Intensity: 5× normal read QPS for affected tenant(s)
  Character: cross-cutting evidence queries spanning multiple domains;
             audit pack build job (H3 §4) triggered;
             auditor portal (I8 §9) read sessions sustained

RESERVATION POLICY
  Per-tenant dedicated reserved capacity pre-allocated 24h before
  declared audit start; sourced from 100% over-provisioning buffer
  Audit-spike capacity is protected from cost throttle (I6 §3;
  regulated_path_protected = true)
  Cross-tenant QoS isolation enforced: audit spike does not compress
  capacity for non-audited tenants

SCALE-DOWN
  After auditor portal session ends + 24h cooldown confirmation from
  CSM, scale-down begins; full return to baseline within 7 days
  Audit spike costs HESEM-absorbed (per I6 §4 regulated-absorption)
```

### 4.2 Recall spike

```
TRIGGER
  Recall execution per D12; Pharma lot recall; Auto DRBFM-driven;
  Aero airworthiness directive; MD post-market safety recall;
  Food § 204 forward trace

PROFILE
  Duration: hours to weeks (product recall duration)
  Intensity: 10× normal read QPS sustained; burst to 15× during
             batch genealogy phase
  Character: trace-forward + trace-backward genealogy queries;
             lot-to-component graph traversal (OTG depth ≥ 10);
             partner integration surge (EDI/DSCSA/regulatory portal);
             notification surge (regulatory + customer + user)

RESERVATION POLICY
  Scale to 10× read within 15 minutes of recall trigger
  Recall capacity ring-fenced: HESEM absorbs cost (I6 §4)
  Batch genealogy threads isolated to dedicated worker pool
  Recall-spike capacity is protected from cost throttle

SCALE-DOWN
  Recall execution manager signals recall-complete or recall-paused;
  staged scale-down over 7-day window; some trace capacity retained
  for post-recall attestation and regulatory submission
```

### 4.3 AI inference spike

```
TRIGGER
  New AI feature GA ramp; AI-assisted audit pack drafting (AI-31);
  mass batch classification job (AI-05, AI-06, AI-12);
  customer triggers bulk re-score via API

PROFILE
  Duration: hours (mass job); sustained during ramp-up period
  Intensity: 5× sustained inference QPS; 10× burst
  Cost envelope: per L2 §9 per-feature envelope enforced;
                 per-tenant per-feature rate limits active

RESERVATION POLICY
  Dynamic scale within L2 §9 cost envelope; envelope breach
  triggers kill-switch on feature per L2 + I6 §5
  AI inference pool is separate from transactional API pool;
  over-load does not compress operational SLOs
```

### 4.4 End-of-period spike

```
TRIGGER
  Monthly close; quarter-end; year-end; regulatory period-end
  (e.g., FDA annual product review calendar; PPAP submission window)

PROFILE
  Duration: 24–48 hours
  Intensity: 3× analytics and reporting QPS; 3× workspace
             projection cache misses; 2× audit evidence queries
  Character: predictable; known calendar; can be scheduled

RESERVATION POLICY
  Calendar-driven scale-up pre-warmed 4 hours before period end
  Scheduled analytics jobs queued with priority per SLA tier
  Cost: classified as predictable overage; HESEM absorbs
```

### 4.5 DR / failover spike

```
TRIGGER
  Regional infrastructure event; provider AZ failure; security
  isolation (per I4 §3); DR exercise (planned)

PROFILE
  Duration: hours to days
  Intensity: target region absorbs source region's full baseline
  Character: audit chain reconciliation; OTG delta replication;
             cross-region session migration; tenant notification

RESERVATION POLICY
  Per-region 50% reserve always maintained (§2.1)
  DR exercise validates absorption quarterly; exercise findings
  drive reserve sizing adjustment in quarterly review
  Failover spike costs HESEM-absorbed
```

---

## 5. Capacity governance

### 5.1 Quarterly review

The quarterly capacity review is a structured analysis:

```
ANALYSIS ITEM                      SUBSTANCE
Per-service actual vs declared       detect drift from contract;
                                     services exceeding declared
                                     demand trigger re-classification
Per-tenant actual vs commit          sales-side awareness; tenants
                                     at > 80% of committed tier
                                     flagged for upgrade proposal (K5)
Per-pack capacity delta              J1..J5 pack-specific demand
                                     growth vs plan
Region headroom                      current headroom vs 30% target;
                                     regions below 15% trigger
                                     immediate re-sizing
Cost vs budget                       per I6; capacity changes with
                                     cost delta > 10% require
                                     FinOps signoff
4-quarter forecast                   demand model updated with
                                     latest actuals; W14 target
                                     gap recalculated
Spike post-mortems                   each spike event reviewed:
                                     did reserves hold? Did isolation
                                     work? Did recovery meet SLO?
Auto-scale event analysis            frequency, delta, ceiling hits
Reserved vs on-demand balance        cloud commitment vs flex;
                                     optimize for cost (I6 §8)
```

Output artifacts: updated service capacity contracts; re-sizing
PRs where needed; FinOps optimization backlog entries (I6 §8).

### 5.2 On-demand capacity

```
SURGE BUFFER
  Cloud auto-scale up to 3× baseline within 15 minutes
  Beyond 3× requires manual approval (SRE Lead + FinOps Lead)
  Regulated spikes (audit, recall, DR) pre-approved by policy

PER-TENANT RATE LIMIT
  API gateway enforces per-tier QPS envelope (per I6 §3)
  Regulated-path exclusion list maintained and reviewed
  Rate-limit hit events logged and surfaced in I2 observability

PER-FEATURE KILL SWITCH
  Non-essential AI features killed first under capacity pressure
  Per L2 degraded-mode taxonomy; tenant notified via status page
  Operational SLOs remain protected
```

### 5.3 Capacity incident trigger

Capacity-related conditions escalate to incidents per I3:

```
CONDITION                          SEV
Auto-scale ceiling reached         SEV-1
Headroom below 10%                 SEV-2
Per-tenant tier breach             SEV-3
Scheduled spike absorption failed  SEV-2
AI envelope breach                 SEV-3
DB connection pool exhausted       SEV-1
```

---

## 6. Tenant-tier capacity expectations

```
TIER          COMMITTED CAPACITY          BURST ALLOWANCE
──────────────────────────────────────────────────────────────
Standard      baseline; rate-limited at   2× for up to 30 min;
              tier QPS ceiling            throttled back after
Pro           2× Standard baseline        5× for up to 2 hours;
                                          extended burst costs
                                          classified per I6 §4
Enterprise    4× Standard baseline        10× for sustained event
                                          window; dedicated
                                          reserved pool for
                                          audit / recall spikes
Sovereign     per agreement; logically    per agreement; isolated
              isolated compute zones      auto-scale envelope
Pilot         limited; no SLA guarantee   hard-stop at cap;
                                          CSM coordinates
```

Tier capacity is enforced by API gateway per-tier rate policy, queue
priority, and DB connection pool partitioning. Capacity promises are
part of the K1 service agreement.

---

## 7. Capacity KPIs

```
KPI                                   TARGET
──────────────────────────────────────────────────────────────
Headroom percent per region           ≥ 30% steady-state
Auto-scale event count / month        tracked; upward trend
                                      triggers review
Auto-scale ceiling-hit count          0 target; any breach = SEV-1
Saturation alert count                ≤ 2 per region per quarter
Per-tenant rate-limit hit count       ≤ 1% of tenant requests;
                                      breach triggers CSM engagement
Audit-spike absorption success        100% (SLO-protected)
Recall-spike absorption success       100% (SLO-protected)
End-of-period spike absorption        ≥ 99% within SLO-16 window
DR failover absorption success        ≥ 99.5% within RTO 4h
Cost per tenant per month vs plan     ≤ 5% variance (I6 §1)
Cost per AI inference call            within L2 §9 envelope
Cost per audit pack export            tracked; feeds I6 quarterly
Quarterly review on-time delivery     100%
Service capacity contract drift       0 services exceeding declared
                                      demand by > 20% without CR
```

---

## 8. Failure modes

```
FM1   Auto-scale ceiling reached during spike
      Root cause: reserve undersized; forecast missed; burst
        exceeded model
      Recovery: kill-switch non-essential features immediately;
        graceful degradation to regulated paths only; H8 CAPA
        on capacity sizing and forecast accuracy; post-mortem

FM2   Audit spike exhausts capacity for co-resident tenants
      Root cause: per-tenant isolation insufficient at gateway
        or DB pool layer
      Recovery: enforce per-tenant QoS isolation; escalate to
        SEV-2; H8 CAPA on isolation discipline; review
        cross-tenant protection model

FM3   AI inference cost-envelope breached under capacity load
      Root cause: L2 §9 envelope undersized; batch job volume
        exceeded plan
      Recovery: per L2 + I6 kill-switch; degraded mode; H8
        CAPA on envelope sizing and per-tenant rate limit tuning

FM4   Regional capacity insufficient post-failover
      Root cause: DR buffer undersized; reserve consumed by
        concurrent events
      Recovery: per I4 cross-region buffer; secondary buffer
        activated; SRE Lead escalation; H8 CAPA on reserve model

FM5   OTG event scale exceeds plan
      Root cause: per-tenant data growth faster than modeled;
        pack-specific burst not captured in contract
      Recovery: OTG partition rebalancing per B6; H8 CAPA on
        per-tenant growth modeling; forecast revision

FM6   Recall-execution capacity insufficient
      Root cause: recall scale larger than model; genealogy
        depth exceeded expected
      Recovery: per D12 emergency mode; surge buffer activated;
        genealogy job chunked; H8 systemic CAPA on recall
        capacity model

FM7   End-of-period scale-up missed (calendar failure)
      Root cause: scale-up automation failed; alert suppressed
      Recovery: manual scale-up; I3 SEV-3; H8 CAPA on calendar
        automation reliability

FM8   Tenant tier exceeded by usage without alert
      Root cause: rate-limit misconfiguration; tagging error
        (I6 FM1 related)
      Recovery: per I6 + I8 contract enforcement; tenant
        communication; H8 CAPA on rate-limit coverage audit

FM9   DB connection pool exhausted during burst
      Root cause: pool sizing not updated after service
        capacity contract revision
      Recovery: SEV-1; emergency pool increase; query queue
        backpressure; H8 CAPA on pool-size governance

FM10  Capacity contract stale (quarterly review skipped)
      Root cause: review process not scheduled; owner unclear
      Recovery: H6 surfaces; H8 CAPA on quarterly review
        scheduling; re-run review immediately
```

---

## 9. Roles and authority (RACI)

```
Role             MODEL    AGGREGATE  REVIEW   ON-DEMAND  TIER-POLICY  FORECAST
SRE Lead         A        A          A        A          C            A
Platform Lead    R        R          R        R          C            R
FinOps Lead      C        A          A        C          A            A
Engineering Ld   R        C          R        C          C            R
AI Lead          R(AI)    C(AI)      R(AI)    C(AI)      C            R(AI)
Vertical Pack Ld C(pack)  C(pack)    R(pack)  C          C            R(pack)
Customer Success -        I          I        -          A            I
Tenant Admin     -        -          I        I          -            -
```

---

## 10. Cross-references

- B7 §6 — deployment topology and region selection
- H3 §4 — audit pack export capacity requirements
- H6 — period-review job scheduling (capacity load)
- H8 — CAPA from capacity-related incidents
- I1 — deploy pipeline capacity gate
- I2 §5 — cardinality governance and per-tenant SLI observability
- I3 — incident triggers from capacity exhaustion
- I4 — DR capacity buffer and failover absorption model
- I6 — cost governance; capacity-cost coupling
- I7 — security capacity (rate-limits as DDoS defense)
- I8 — tenant-tier capacity enforcement and tier upgrade path
- L2 §9 — AI inference cost envelopes and dynamic scale
- K1 — pricing tier definitions and committed capacity
- M5 — SLO directory (SLO-16 for period operations; SLO-22 for
         onboarding timeline)
- M6 — capacity risks
- M9 — cross-reference index

---

## 11. Decision phrase

```
I5_CAPACITY_PLANNING_V10_LOCKED
NEXT: I6_COST_GOVERNANCE.md
```
