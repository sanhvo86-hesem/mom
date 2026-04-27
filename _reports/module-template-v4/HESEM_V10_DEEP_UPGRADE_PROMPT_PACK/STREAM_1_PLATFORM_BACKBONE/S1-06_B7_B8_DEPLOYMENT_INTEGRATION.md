# S1-06 — B7 Deployment Topology + B8 Integration Boundaries

```
prompt_id:        S1-06
stream:           1
sequence:         6 of 9
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. STREAM_1_PLATFORM_BACKBONE/S1-00_STREAM_MASTER.md
2. V9 baseline:
   PART_B_ARCHITECTURE_MASTER/B7_DEPLOYMENT_TOPOLOGY.md
   PART_B_ARCHITECTURE_MASTER/B8_INTEGRATION_BOUNDARIES.md
3. Cross-references: B1, B6, I1 (CI/CD), I4 (DR), I7 (security),
   I8 (tenant ops), E15 (integration API), W13 (multi-region)
4. Standards / patterns:
   - Kubernetes deployment patterns
   - Service mesh (Istio / Linkerd)
   - SLSA v1.0; in-toto; CycloneDX SBOM
   - IEC 62443 industrial cyber zones
   - AS2 / AS4 EDI; CloudEvents 1.0; AsyncAPI 3.0
   - DSCSA EPCIS; EU FMD EMVS; FSMA §204; ICH E2B(R3)
```

## Deliverable

```
PART_B_ARCHITECTURE_MASTER/B7_DEPLOYMENT_TOPOLOGY.md
PART_B_ARCHITECTURE_MASTER/B8_INTEGRATION_BOUNDARIES.md
```

## Depth requirements — B7 Deployment Topology

```
1.  Compute topology
    - Kubernetes-as-substrate; per-region cluster; per-tenant
      namespace; service mesh (Istio / Linkerd choice + reason)
    - Stateful vs stateless service classification
    - Per-pod resource requests + limits per service tier
    - Per-region capacity per I5
    - HPA + VPA + cluster autoscaler

2.  Network topology
    - Per-tenant network policy (Cilium NetworkPolicy)
    - Service mesh mTLS
    - Egress allow-list per service
    - Edge gateway L9 OT zone connectivity
    - DNS-over-TLS resolver
    - IPv6 dual-stack

3.  Persistence topology
    - Postgres primary + replicas; per-tenant + per-region
    - WAL streaming + PITR (per I4)
    - Object storage (per H5 WORM); per-region pinning
    - Time-series tier (hot/warm/cold per I4 §1)
    - Cache (Redis / Memcached); per-tenant key-prefix
    - Search index (OpenSearch); per-tenant

4.  Per-region deployment patterns
    - Single-region (Core tier)
    - Multi-region active-active (Enterprise; W13)
    - Sovereign cloud variant (ITAR / EU / per local-law)
    - Edge gateway appliance (per L9 OT)

5.  Per-tenant isolation level
    - Shared cluster (Core/Pro)
    - Dedicated namespace (Pro)
    - Dedicated cluster (Enterprise)
    - Sovereign tenant (per agreement; per W13)

6.  Per-tenant cost attribution
    - Per-pod tenant_id label
    - Allocation model for shared services
    - Per I6 cost report

7.  Capacity per scaling tier (per I5 §3)
    - Per-region active tenant count
    - Per-tenant concurrent users
    - Per-route peak QPS
    - Audit-spike + recall-spike reserves

8.  Per-pack deployment overlay
    PHARMA: cleanroom-near edge gateway; sterile-line uptime
    AUTO: shopfloor SCADA integration
    AERO: ITAR US-only deployment; FIPS 140-3 modules; CMMC
    MD: per-device-class partitioning (Class III long-retention)
    FOOD: per-facility edge gateway for HACCP CCP

9.  Deployment lifecycle (per I1)
    Per stage (DEV / TEST / PRE-PROD / PROD / SHADOW / CANARY /
    DARK / SOVEREIGN): purpose; entry criteria; exit criteria

10. Cross-references: B1 (layers), B6, I1 + I4 + I5 + I6 + I7 +
    I8, E14 (admin), J3 (ITAR), W13 (multi-region)
```

## Depth requirements — B8 Integration Boundaries

```
1.  Inbound integration patterns
    - Webhook callback (signed HMAC; per E15.19)
    - Pull-based partner sync
    - File-based exchange (CSV / NDJSON / EDIFACT / X12)
    - EDI VAN
    - Per-regulator submission (DSCSA + EU FMD + GUDID +
      EUDAMED + GIDEP + FSMA §204 + ICSR)

2.  Outbound integration patterns
    - Outbox pattern (every domain emit)
    - CloudEvents 1.0 envelope
    - AsyncAPI 3.0 channel definitions
    - Webhook delivery (per E15.1; signed; retry; dead-letter)
    - CDC outbound to lakehouse (per W8)

3.  Sub-processor boundary discipline
    - Per L2 §8 + per I8 §6 + per I7 §7
    - Per-tenant DPA listing
    - Per-region constraint
    - Per-incident propagation

4.  Per-partner SLA per pack
    PHARMA: DSCSA partner network; EU FMD EMVS
    AUTO: per-OEM portal SLA
    AERO: FAA + EASA + GIDEP submission
    MD: GUDID + EUDAMED submission
    FOOD: §204 trading partner

5.  Schema evolution discipline
    - Additive only; breaking change is H7 Class A + 6-mo
      deprecation window
    - Sunset header (RFC 8594)
    - Schema registry per E15.3

6.  Authentication + authorization
    - Service-account tokens (per E1.4)
    - HMAC signing for webhooks
    - mTLS for partner direct
    - Per-tenant credential isolation

7.  Cross-region integration constraints
    - Per region pinning honored
    - Cross-border egress rejection
    - ITAR / EAR special handling

8.  Failure modes
    - Partner unreachable (per RB-INC-012)
    - Schema mismatch
    - HMAC signature invalid
    - Quota exceeded
    - Region pinning violated

9.  KPIs
    - Per-partner availability
    - Webhook delivery success rate
    - Per-regulator submission acceptance rate
    - CDC lag < 60s (per SLO-13)

10. Per-pack overlay
    Detailed per-pack integration map (cross-link E15 §8)

11. Cross-references: E15 (canonical), I7 §7 (security), L2 §8
    (sub-processor), W13 (multi-region)
```

## Required substance

B7: ≥ 4,000 words
B8: ≥ 3,500 words

## Acceptance criteria

```
B7:
[ ] Compute topology spec
[ ] Network topology
[ ] Persistence topology
[ ] Per-region deployment patterns (4+)
[ ] Per-tenant isolation levels (4+)
[ ] Per-tenant cost attribution
[ ] Capacity scaling tier per I5
[ ] Per-pack deployment overlay (J1..J5)
[ ] Deployment lifecycle stages
[ ] Cross-references resolve

B8:
[ ] Inbound + outbound integration patterns
[ ] Sub-processor boundary
[ ] Per-partner SLA per pack
[ ] Schema evolution
[ ] Auth + authz
[ ] Cross-region constraints
[ ] ≥ 5 failure modes
[ ] ≥ 4 KPIs
[ ] Per-pack overlay
[ ] Cross-references resolve

Both:
[ ] No marketing language
[ ] Decision phrase emitted
```

## Decision phrase upon completion

```
S1-06_B7_B8_DEPLOYMENT_INTEGRATION_DEEP_UPGRADE_COMPLETE
```

After emit: load `S1-07_B9_OBSERVABILITY.md` next.
