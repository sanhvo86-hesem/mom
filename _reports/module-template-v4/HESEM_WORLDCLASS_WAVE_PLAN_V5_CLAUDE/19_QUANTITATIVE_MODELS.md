# 19_QUANTITATIVE_MODELS.md

## Purpose

GPT Pro V4 publishes timelines and team-size estimates as bullets without quantitative grounding. V5 produces the **quantitative model** with explicit math, assumptions, and sensitivity ranges so plans are falsifiable and revisable.

---

## Section 1 — Engineering capacity model

### 1.1 Effective engineering hours

```text
Annual engineering hours per FTE:
  workdays:                     ~225 (260 - holidays - PTO)
  hours/day:                    8
  productive ratio:              0.6   (meetings, reviews, comms, context-switch)
  effective hours/year/FTE:    225 × 8 × 0.6 = 1080 hours/year
                                ≈ 27 effective weeks per FTE per year
```

### 1.2 Codex-augmented effective hours

```text
With Claude Code / Codex augmentation (1M context, max thinking):
  productivity multiplier:       1.5-2.5x  (varies by task)
  routine code:                  ~2x   (boilerplate, tests, docs, refactoring)
  novel architecture:            ~1.3x (still mostly human)
  validation + audit:            ~1.5x (template + AI validation)
  
  effective hours/year/FTE:    1080 × 1.7 (avg blended) ≈ 1836 effective hours
                                ≈ 46 effective weeks
```

### 1.3 V5 cumulative engineering-weeks per wave (from file 03 §6)

```text
Wave            Eng-weeks (full team baseline)
W0              2
W0.5            8
W1              24
W2              8
W3              12
W4              12
W4.5            6
W5              18
W6              12
W6.5            6
W7              20
W8              12
W9              32
W10             80

Total           252 eng-weeks
```

### 1.4 Calendar duration

```text
Full team (assuming overlapping wave streams):
  252 eng-weeks / (avg 4 parallel teams × ~6 weeks/team-quarter capacity)
  ≈ 16-18 calendar months

Solo Codex-augmented:
  252 eng-weeks needed
  assume 1 FTE-equivalent at 1.7x augmentation = 46 weeks/year
  but solo cannot run 4 parallel streams; serial only
  effective single-thread velocity ~30 eng-weeks/year (with context-switch tax)
  
  → 252 / 30 = 8.4 years pure serial
  
  Realistic with hybrid (founder + 2 contractors + AI):
  ≈ 24-32 months
```

V5 ADR-0280: Cumulative 252 eng-weeks; 16-18 months team / 24-32 months solo.

---

## Section 2 — Team scaling model

### 2.1 Per-wave team size

```text
Wave            Team size       Notes
W0              4-5             founders + AI
W0.5            5-6             +1 platform engineer
W1              5-7             +1 PM, +1 designer
W2-W3           7-10            stream + platform split
W4-W4.5         10-14           +data platform + SRE
W5-W6           14-20           more streams
W6.5-W7         20-30           +ML platform
W8              25-35           +security + compliance
W9              35-50           +portals + tenancy + connectors
W10             50-80           per-vertical streams
```

### 2.2 Per FTE annual budget (loaded)

```text
Region          Senior eng     Staff eng      Principal
Vietnam         $40-70k        $70-100k       $120-180k
SEA (mixed)     $50-80k        $90-130k       $150-220k
Japan           $80-130k       $130-180k      $200-280k
Korea           $80-130k       $130-180k      $200-280k
US (remote)     $130-200k      $200-280k      $280-380k
US (SF)         $180-250k      $260-350k      $380-500k
EU              $80-150k       $140-200k      $220-320k

Loaded cost = base × 1.3 (benefits, taxes, equipment, overhead)
```

### 2.3 Cumulative payroll through Wave 10

```text
Assumptions: regional blend (Vietnam-anchored + remote)
Avg blended FTE cost: $90k base × 1.3 = $117k loaded

Phased headcount-years:
Phase 0 (months 1-12):    4 FTEs × 1 yr = 4 FTE-yrs
Phase 1 (months 12-24):   8 FTEs × 1 yr = 8 FTE-yrs
Phase 2 (months 24-36):  20 FTEs × 1 yr = 20 FTE-yrs
Phase 3 (months 36-48):  40 FTEs × 1 yr = 40 FTE-yrs
Phase 4 (months 48-60):  70 FTEs × 1 yr = 70 FTE-yrs

Cumulative FTE-years: 142

Approximate total payroll (5-year build):
  142 × $117k ≈ $16.6M
```

### 2.4 Solo path

```text
Phase 0-1 (months 1-24):   1 FTE (founder, AI-augmented) ≈ $0-50k/yr survival
                            + AI tooling cost ($1-3k/mo for top-tier) ≈ $30k/yr
Phase 2 (months 24-36):     1-2 contractors ≈ $80-150k/yr
Phase 3+ (post seed):       team build-out per Phase 2-3 above

Pre-Series-A burn (24 mo):  $200k-$500k total
                            (mostly self-funded or seed)
```

V5 ADR-0281: Phased headcount + payroll model with regional blending.

---

## Section 3 — Cloud + infra cost model

### 3.1 Per-tenant baseline cost (steady state)

```text
Compute (Kubernetes nodes):
  - 4 vCPU, 16 GB per app pod × 5 pods avg
  - $0.05/hr per node (managed cloud avg)
  - $400/mo per tenant base

Database (Postgres):
  - 4 vCPU, 32 GB managed instance
  - $300/mo per tenant base
  - storage: $0.10/GB/mo × 100 GB avg = $10/mo
  - backup retention: $30/mo

Object storage (S3):
  - 1 TB hot + 5 TB warm + 20 TB cold
  - hot $23/TB + warm $13/TB + cold $4/TB
  - $23 + $65 + $80 = $168/mo per tenant

Search (OpenSearch):
  - 2 nodes, 4 vCPU, 16 GB
  - $400/mo per tenant

Time-series (Timescale):
  - additional Postgres for hypertables
  - $200/mo per tenant if heavy IIoT

Observability (per tenant share):
  - $50-150/mo

Networking + LB + CDN:
  - $50-100/mo per tenant

ML inference (per active feature):
  - $30-150/mo per tenant
  
Total steady-state per tenant:    $1700-3500/mo
Annual:                            $20k-42k per tenant
```

### 3.2 Per-tenant cost vs revenue band

```text
Tier                ARR/tenant      Infra cost/tenant   Gross margin
Core (small)        $30k            $20k                 33%
Pro (mid)           $200k           $25k                 87.5%
Enterprise (large)  $1M+            $40-100k             90%+
```

The Core tier is barely sustainable at infrastructure cost alone — Pro+ tiers fund the platform.

V5 ADR-0282: Per-tenant infra cost model + tier alignment.

---

## Section 4 — Latency budget per layer

(Restated from file 01 + bound at the end-to-end level.)

```text
End-to-end target: API p95 < 500ms

Layer breakdown:
  L7 routing/parsing:           5ms
  L1 auth.decide:               20ms
  L2 governance check:          10ms (often inline with L1)
  L3 workflow.attempt:          50ms
  L3 guard evaluation:          20ms (per guard)
  L3 workflow.commit:            50ms (DB write)
  L4 root write:                30ms (DB upsert)
  L5 OTG event emit:             5ms (async, off critical path)
  L7 response shaping:          10ms
  network roundtrip:            20ms (inter-region; <5ms intra-AZ)
  
  Total budgeted:              220ms (under 500ms target)
  Buffer for variability:      280ms

p99 target: < 1s
p99.9 target: < 5s
```

V5 ADR-0283: End-to-end latency budget per route + per layer.

---

## Section 5 — Throughput / capacity model

### 5.1 Per-tenant throughput

```text
Read throughput:     500-2000 req/sec at peak
Write throughput:    50-200 req/sec at peak
Mutation throughput: 10-50 req/sec at peak
                     (most ops are reads + projections)

Per-tenant workload mix:
  workspace queries:       70%
  record reads:            15%
  mutations:                8%
  edge gateway events:     5%
  bulk operations:         1%
  AI advisory calls:       1%
```

### 5.2 Aggregate cluster capacity

```text
Per region cluster (steady state):
  ~50 active tenants
  ~100k concurrent users
  ~50k req/sec read aggregate
  ~5k req/sec write aggregate
  ~1k req/sec mutation aggregate

Capacity unit = "tenant-pod-set":
  ~5 app pods + 1 db replica + share of common services
  scales linearly per tenant up to ~100 tenants
  beyond: shard or per-tenant cluster
```

V5 ADR-0284: Capacity unit definition + linear scaling regime.

---

## Section 6 — OTG scale model

### 6.1 Node + edge volume per tenant

```text
Active mid-size manufacturer (1 plant, 1500 employees):
  authoritative_root nodes:  ~500k         (LOTs, BRELs, NCs, etc., over 5 years)
  workflow_event nodes:      ~5M           (transitions over 5 years)
  audit_event nodes:         ~10M          (chain over 5 years)
  evidence_artifact nodes:   ~2M           (signed evidence)
  ai_advisory nodes:         ~5M           (advisory calls)
  
  total nodes:               ~22M per tenant per 5 years
  total edges:                ~80M per tenant per 5 years
  total events:                ~80M per tenant per 5 years

For 100 tenants (steady state):
  ~2.2B nodes, ~8B edges, ~8B events
  
Storage estimate (Postgres + indexes):
  ~2.5 KB per node row + indexes = ~5 KB
  ~1.5 KB per edge row + indexes = ~3 KB
  ~3 KB per event row + indexes = ~6 KB
  
Total: 2.2B × 5KB + 8B × 3KB + 8B × 6KB
     = 11 + 24 + 48 = 83 GB per tenant amortized
     × 100 tenants = ~8 TB cluster
```

### 6.2 Query latency at scale

```text
Q1 (lot ancestry depth-5):                p95 < 150ms (target met with mv_genealogy_upstream)
Q2 (open NCs for lot):                    p95 < 80ms  (target met with mv_open_ncs_by_lot)
Q3 (release history 12mo):                p95 < 400ms (warehouse query)
Q4 (BREL workflow current):                p95 < 40ms  (direct OTG)
Q8 (audit chain proof):                    p95 < 200ms (chain walk + merkle)

If scale exceeds budget:
  - shard per tenant (per-tenant DB)
  - graph DB read accelerator (Neo4j / Memgraph)
  - columnar warehouse for historical queries
```

V5 ADR-0285: OTG scale targets + sharding trigger criteria.

---

## Section 7 — Cost-of-quality (COPQ) economic model

```text
Without HESEM (typical mid-market manufacturer):
  COPQ as % of revenue:           5-15%
  - scrap & rework:                3-8%
  - warranty + field returns:      1-4%
  - inspection overhead:           1-2%
  - regulatory cost (manual):      0.5-1%
  
With HESEM (post-Wave 6):
  COPQ reduction target:           20-40%
  - faster NC closure:             saves rework cost
  - early SPC alerts:               prevents OOS batches
  - genealogy:                      narrows recall scope
  - audit-pack automation:          reduces compliance cost
  - predictive maintenance:         reduces unplanned downtime
  
  Net annual savings for $200M revenue customer:
    5% COPQ × $200M × 30% reduction = $3M/year
```

This is the customer ROI argument. HESEM ARR cost ($200k-1M for mid-market) is paid back from COPQ savings alone within months.

V5 ADR-0286: COPQ savings model as customer ROI proof.

---

## Section 8 — Slice maturity scoring

(Per master thesis §10 Slice Maturity Cube.)

```text
Each slice has a (Surface, API, Validation, Compliance) tuple.

Score = surface_axis × api_axis × validation_axis × compliance_axis (each 0-5)

Normalized: score / max_score = score / 625 (0-1)

Per wave target tuple:
W1 target:  (2, 1, 2, 1) = 4   normalized 0.64
W4 target:  (3, 3, 3, 1) = 27  normalized 0.92
W5 target:  (4, 4, 3, 3) = 144 normalized 0.98
W8 target:  (4, 4, 5, 4) = 320 normalized 0.99
W10 target: (5, 5, 5, 5) = 625 normalized 1.0
```

V5 ADR-0287: Slice maturity scoring formula.

---

## Section 9 — Probability-of-shipping per wave

Bayesian-style estimate based on:

```text
- prior similar work
- team capability score
- platform maturity (W0.5 helps)
- regulatory complexity
- external dependencies
```

```text
Wave    Plan eng-weeks    P(ship within 2x of plan)    P(ship within 3x)
W0      2                 95%                          99%
W0.5    8                 80%                          93%
W1      24                75%                          90%
W2      8                 85%                          95%
W3      12                75%                          90%
W4      12                70%                          85%
W4.5    6                 70%                          85%
W5      18                60%                          80%
W6      12                70%                          85%
W6.5    6                 65%                          80%
W7      20                55%                          75%
W8      12                70%                          85%
W9      32                50%                          70%
W10     80                40%                          60%

Cumulative probability of full plan within 3x estimate:
  Π(0.99 × 0.93 × 0.90 × 0.95 × 0.90 × 0.85 × 0.85 × 0.80 × 0.85 × 0.80 × 0.75 × 0.85 × 0.70 × 0.60)
  ≈ 0.10 (10%)
```

That is sobering. Therefore V5 commits to:

```text
- continuous re-baselining quarterly
- explicit acknowledgment that timelines drift
- per-wave decision phrase allows graceful "PARTIAL_NEEDS_CONTINUATION"
- customer expectation set realistically: ~3 years to mature
```

V5 ADR-0288: Probability model + transparent timeline-drift policy.

---

## Section 10 — Sensitivity analysis

### 10.1 What if team is half size?

```text
Engineering-weeks unchanged (252).
Calendar duration ~doubles → 32-36 months team.
Solo Codex path: ~50-60 months (5 years).
Recommendation: prioritize ruthlessly; ship fewer waves; vertical packs deferred.
```

### 10.2 What if AI augmentation is 3x not 1.7x?

```text
Effective eng-weeks needed drops to 252 / (3/1.7) ≈ 143.
Calendar 12-15 months team / 18-24 solo.
Recommendation: invest in AI tooling discipline; train team on Codex.
```

### 10.3 What if regulatory landscape shifts?

```text
EU AI Act enforcement post-2027 may add ~10% scope.
NIST AI RMF Profile updates ongoing.
Recommendation: budget for ~10% of W7-W10 dedicated to regulatory drift.
```

### 10.4 What if a major incident occurs?

```text
A SEV-0 (data breach, audit chain break) consumes ~5 eng-weeks across team.
Recommendation: budget 5-10% slack per quarter for incident response.
```

---

## Section 11 — Sensitivity to Codex/Claude continuation

V5 plan assumes continued AI augmentation. If AI tooling regresses:

```text
- effective hours drop to 1080/year (1.0x baseline)
- calendar extends ~70%
- solo path becomes infeasible
```

V5 ADR-0289: AI augmentation as load-bearing assumption; mitigation = team scale.

---

## Section 12 — Cumulative ADRs

```text
ADR-0280  252 eng-weeks; 16-18 months team / 24-32 months solo
ADR-0281  Phased headcount + payroll model
ADR-0282  Per-tenant infra cost model
ADR-0283  End-to-end latency budget per layer
ADR-0284  Capacity unit + linear scaling
ADR-0285  OTG scale targets + sharding trigger
ADR-0286  COPQ savings model as customer ROI proof
ADR-0287  Slice maturity scoring formula
ADR-0288  Probability model + timeline-drift policy
ADR-0289  AI augmentation as load-bearing assumption
```

---

## Decision phrase

```text
V5_QUANTITATIVE_MODELS_BASELINE_LOCKED
NEXT_FILE: 20_RISK_REGISTER_V5_FORMAL.md
```
