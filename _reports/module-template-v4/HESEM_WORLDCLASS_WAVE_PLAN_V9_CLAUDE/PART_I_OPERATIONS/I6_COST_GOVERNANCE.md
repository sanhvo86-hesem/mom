# I6 — Cost Governance

```
chapter_purpose: per-tenant cost attribution, tier policy, throttling,
                 engineering-absorbing-vs-uplift classification,
                 quarterly optimization, AI cost envelopes,
                 cost-as-quality-of-service
owner_role:      FinOps Lead with SRE Lead
sources:         FinOps Foundation Framework + Capabilities,
                 AWS / Azure / GCP cost allocation models, ISO/IEC
                 19770 IT asset management, Google SRE cost-aware
                 development, NIST SP 800-204 cost as security
                 control
```

Cost governance ensures HESEM operates sustainably for the vendor
and predictably for the tenant. Cost overrun in the steady state
is a planning failure; cost overrun during a regulated event
(audit, recall) is a feature, not a bug — but must still be visible
and bounded.

---

## 1. Per-tenant cost attribution

Each tenant has a monthly cost envelope assembled from:

```
DIMENSION                       SUBSTANCE
Compute (vCPU × hours)           per-pod attribution by tenant tag
Memory (GB × hours)               per-pod attribution
Storage hot                       per-tenant database storage
Storage warm                       per-tenant evidence + telemetry
Storage cold / glacier             per-tenant archive
Network egress                    per-tenant outbound traffic
Network inter-region               per-tenant cross-region replication
                                  (where tenant has DR active)
Managed services share             per-tenant share of shared services
                                  (queue, search, ML platform)
ML / AI inference                  per-call × per-feature × per-tenant;
                                  per L2 §9 envelope
Observability share                per-tenant share of OTel + log + trace
                                  storage (cardinality-weighted)
Audit chain anchor                 per-tenant share (per anchor entry)
Backup + DR                        per-tenant retention × frequency
Sub-processor share                 per-tenant share of provider costs
                                  (per L2 §8)
Per-pack overhead                   pack-specific surcharges where
                                  pack uses pack-only sub-processors
                                  or storage tiers
```

Attribution method: tag-based (per-resource tenant_id label) +
allocation model for shared services.

---

## 2. Per-tier policy

```
TIER          MONTHLY ENVELOPE      PER-USER     OVERAGE BEHAVIOR
Standard      $1,500-2,000          per-user      throttle at 95%
                                    add-on
Pro           $2,000-3,500          per-user      throttle at 95% + alert
                                    add-on
Enterprise    $5,000+               per-tenant    pre-approved overage
                                    negotiated    + tier upgrade option
Sovereign     per-agreement; deep   per-user      per-agreement
              isolated                            (pre-approved
                                                  overage path)
Pilot         capped at $X          n/a           hard-stop at cap;
                                                  CSM coordinates
```

The tier (per K1 pricing) defines the envelope. Customer-side
predictability is part of the tier promise.

---

## 3. Throttling thresholds

```
LEVEL    THRESHOLD                   ACTION
Watch    > 60% of envelope            tracking only; CSM aware
Warning  > 80%                         tenant alert + CSM proactive
Throttle > 95%                         throttle:
                                       - rate-limit AI advisory
                                       - rate-limit heavy bulk queries
                                       - delay non-essential batch jobs
                                       - throttle ingestion (with
                                         backpressure)
                                       Tenant alert; CSM intervention
Breach   > 100%                         per §4 classify; either:
                                       - HESEM absorbs (platform fault)
                                       - tenant uplift / tier upgrade
                                       - emergency tier escalation
```

Throttling honored: regulated workflows are NOT throttled (would
cause regulatory exposure). Throttling impacts non-essential AI +
bulk + analytics.

---

## 4. Engineering absorption vs tenant uplift classification

When usage exceeds envelope, classification within 48 h jointly by
SRE + FinOps + CSM:

```
HESEM ABSORBS COST              ENGINEERING / PLATFORM CAUSE
  - Missing index causing slow query
  - Expensive default (e.g., excessive logging)
  - Provider outage causing duplicate work
  - Inefficient algorithm in regulated capability
  - Mis-allocated resource share
  - AI-feature cost-envelope sized poorly per L2 §9

TENANT UPLIFT                    TENANT-SIDE USAGE
  - Tenant ran bulk genealogy with depth > N (per-tier limit)
  - Tenant exported full audit pack hourly (vs daily)
  - Tenant integrated AI feature outside contract
  - Tenant onboarding generated burst beyond plan
  - Tenant automation ran at scale beyond commit

GREY ZONE                         JOINT REVIEW
  - New AI feature usage burst (could be platform mis-pricing or
    tenant overuse)
  - Audit-spike (regulated exception)
  - Recall-spike (regulated exception)
  - End-of-period close (predictable vs ad-hoc)

REGULATED ABSORPTION              HESEM ABSORBS by policy regardless
  - Audit-spike for confirmed audit
  - Recall-spike for confirmed recall
  - DR / failover overhead
  - Per H1 §3 regulator-driven event
```

The classification record itself is evidence (EC-16 change_record
or EC-17 incident_record subtype) for transparency to tenant +
internal review.

---

## 5. AI cost envelopes (per L2 §9)

```
TIER-1 features    target ≤ $0.001 per call avg
TIER-2 features    target ≤ $0.05 per call avg
LLM features       cost-aware routing
                   - cache aggressively for top-K patterns
                   - smaller-model fallback for low-confidence
                   - static-answer cache for FAQs
                   - per-tenant rate limit
                   - per-feature kill-switch on envelope breach
```

AI-feature cost SLO breach (per SLO-18) freezes ramp + may toggle
degraded mode (per L4 + L2 §11 FM7).

---

## 6. Per-pack cost overlay

```
PHARMA            APR + stability storage; sub-processor (LIMS
                  integration)
MED DEVICE        DHF + DHR per-unit storage; vigilance integration
AUTO              PPAP submission storage; EDI bandwidth
AERO              ITAR-compliant infrastructure premium; FIPS 140-3
                  HSM premium
FOOD              §204 traceability storage; per-zone EMP storage
```

Pack overlay disclosed in tier proposal; tenant aware in advance.

---

## 7. Cost-aware development

```
PER-CHANGE COST IMPACT
  H7 IA Q11 (per H7 §4): change estimates cost delta
  Cost delta > X% per-tenant requires FinOps signoff

PER-FEATURE COST INSTRUMENTATION
  every API endpoint emits cost-per-call estimate (compute +
   data transfer + downstream calls)
  cost surfaced in observability per route per tenant

CACHING + REUSE
  cache-friendly defaults; per-tenant share where allowed
  workspace projection invalidation tuned per access pattern

ARCHIVE TIER MOVEMENT
  policies move data hot → warm → cold per H5 retention floors
  retrieval cost surfaced

QUEUE COST AWARENESS
  workflows can be prioritized by importance; high-cost low-priority
  jobs run off-peak

LRO COST DISCIPLINE
  long-running ops have estimated cost surface; tenant aware before
   start; per E13
```

---

## 8. Quarterly cost optimization review

```
TOP-20 EXPENSIVE WORKFLOWS         per-tenant + per-pack
TOP-10 EXPENSIVE QUERIES            DB query plans
TOP-10 AI INFERENCE COST DRIVERS    per L2 envelope
TOP-10 STORAGE GROWTH DRIVERS        per H5 class
TOP-10 EGRESS DRIVERS                per integration
NETWORK OPTIMIZATION                  inter-region; CDN; proxy
CACHE EFFECTIVENESS                    per route hit rate vs target
RIGHT-SIZING                            per-pod CPU/memory request /
                                       limit tuned to actual usage
RESERVED VS ON-DEMAND BALANCE          per-cloud commitment vs flex
ARCHIVE TIER TRANSITION                cost-trajectory per tenant
PROVIDER COST                          per sub-processor; renegotiation
                                       cycle
```

Output: optimization PR backlog; per-PR cost-saving estimate;
adopted into roadmap.

---

## 9. Cost SLO (per SLO-18)

```
Per-tenant cost within tier envelope:    99% / 30 d
                                         (1% breach allowed for spikes)
Cost breach triggers throttle (§3) + classification (§4)
SLO breach is platform-side measure (HESEM owns it; tenant
 visibility per CSM)
```

---

## 10. Failure modes

```
FM1   Cost attribution mis-tagged (cost charged wrong tenant)
      Recovery: monthly reconciliation; H8 CAPA on tagging discipline;
              tenant credit if found

FM2   AI feature cost envelope breached
      Recovery: per L2 §11 FM7; degraded mode; H8 CAPA on envelope
              sizing

FM3   Throttle applied to regulated workflow
      Recovery: throttle exclusion list updated; H8 CAPA on
              throttle scope; possible regulatory exposure

FM4   Tenant uplift claimed but tenant disputes
      Recovery: joint review evidence; CSM mediation; per
              §4 classification record

FM5   HESEM-absorption claimed but actually tenant misuse
      Recovery: classification audit; per H8 systemic if pattern

FM6   Provider cost spike unannounced
      Recovery: H7 retro-CR; tenant communication; H8 CAPA
              on provider relationship

FM7   Quarterly review skipped
      Recovery: H6 surfaces; H8 CAPA on calendar discipline

FM8   Cost-aware development gate weakened
      Recovery: per H7 governance; quarterly review surfaces
```

---

## 11. Roles and authority (RACI)

```
Role             ATTRIB  TIER  THROTTLE  ABSORPTION  AI-COST  REVIEW
FinOps Lead      A       A     A         A           A        A
SRE Lead         R       C     R         R           C        R
Platform Lead    R       C     R         R           C        R
Engineering Ld   R       C     C         R           R        R
AI Lead          C       C     C         C           A        R
Customer Success C       R     R         R           C        C
Tenant Admin     I       R     I         I           I        I
Sales            -       R     -         -           -        -
```

---

## 12. Cross-references

- I1 — deploy gate per cost SLO
- I2 — observability for cost
- I3 — cost-spike incidents
- I5 — capacity ↔ cost coupling
- I7 — secrets/cyber as cost driver
- I8 — per-tenant tier
- L2 §9 — AI cost envelopes
- L4 — kill-switch via cost
- K1 — pricing tiers
- K5 — customer success cost transparency
- M5 — SLO-18
- M9 — cross-reference

---

## 13. Decision phrase

```
I6_COST_GOVERNANCE_BASELINE_LOCKED
NEXT: I7_SECURITY_OPERATIONS.md
```
