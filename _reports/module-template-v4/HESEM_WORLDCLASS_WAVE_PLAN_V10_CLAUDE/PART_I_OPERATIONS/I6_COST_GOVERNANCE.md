# I6 — Cost Governance

```
chapter_purpose: per-tenant cost attribution, tier policy, throttling
                 thresholds, engineering-absorption-vs-uplift classification,
                 AI cost envelopes, per-pack overlays, cost-aware
                 development, quarterly optimization review, cost SLO
owner_role:      FinOps Lead with SRE Lead and Platform Lead
sources:         FinOps Foundation Framework + Capabilities, AWS / Azure /
                 GCP cost allocation models, ISO/IEC 19770 IT asset
                 management, Google SRE cost-aware development, NIST SP
                 800-204 cost as security control, FinOps Foundation
                 practitioner maturity model
```

Cost governance ensures HESEM operates sustainably for the vendor and
predictably for the tenant. Cost overrun in steady state is a planning
failure. Cost overrun during a regulated event — audit, recall, DR
failover — is a feature, not a bug, but it must still be visible and
bounded. Every cost decision carries three axes: what the tenant pays,
what HESEM absorbs, and what the engineer causes.

---

## 1. Per-tenant cost attribution

Each tenant receives a monthly cost envelope assembled from at least
14 attribution dimensions. Every dimension carries a methodological
note distinguishing direct tagging from allocation modeling.

```
DIMENSION                       METHOD          SUBSTANCE
────────────────────────────────────────────────────────────────────────
Compute (vCPU × hours)          tag-based       per-pod tenant_id label;
                                                auto-scaled pods tagged
                                                proportionally to replica
                                                fraction
Memory (GB × hours)             tag-based       per-pod; co-resident pods
                                                proportioned by declared
                                                memory_kb_per_request_p99
                                                (per I5 §1.1)
Storage — hot                   tag-based       per-tenant DB partition;
                                                bytes × hourly rate
Storage — warm                  tag-based       evidence + telemetry store
                                                per-tenant prefix;
                                                S3-class or equivalent
Storage — cold / glacier        tag-based       per-tenant archive prefix;
                                                lifecycle-tier transition
                                                cost allocated at move time
Network egress                  tag-based       per-tenant outbound traffic
                                                measured at gateway; per-
                                                integration partner labeled
Network inter-region            tag-based       cross-region replication
                                                traffic where tenant has
                                                active DR per I4
Managed services share          allocation      queue, search, ML platform:
                                                per-tenant share by message
                                                count / doc count /
                                                inference-call count
ML / AI inference               tag-based       per-call × per-feature ×
                                                per-tenant; L2 §9 envelope
                                                tracking; cost per inference
                                                route emitted per I2
Observability share             allocation      OTel + log + trace storage
                                                cardinality-weighted per
                                                I2 §8; high-cardinality
                                                tenants pay proportionally
Audit chain anchor              allocation      per-anchor-entry; per-
                                                tenant anchor frequency
                                                determines share
Backup + DR                     tag-based       per-tenant retention window
                                                × snapshot frequency;
                                                cross-region replication
                                                cost per I4
Sub-processor share             allocation      per-tenant share of third-
                                                party service costs (per
                                                L2 §8); disclosed in
                                                tier proposal
Per-pack overhead               tag-based       pack-specific sub-processors
                                                or storage tiers unique to
                                                that pack; charged only
                                                to tenants with pack enabled
Support + CSM overhead          allocation      Pilot + Standard proportional;
                                                Pro + Enterprise flat rate
                                                (included in tier)
```

### 1.1 Attribution infrastructure

Tag schema: every cloud resource carries `tenant_id`, `pack_id`,
`service_id`, `env` (prod/staging), `cost_category` (compute / storage
/ network / managed / ai). Untagged resources are detected in the
monthly reconciliation; untagged cost is classified as HESEM
platform overhead.

Shared-resource allocation applies a weighting function. For queue:
weight = message_count_for_tenant / total_message_count over billing
period. For search: weight = document_count_for_tenant / total. For
AI platform: weight = inference_call_count_for_tenant / total. The
weighting function and its inputs are retained as EC-36 operational
metric evidence (H4).

---

## 2. Per-tier policy

```
TIER          MONTHLY ENVELOPE            PER-USER ADD-ON    OVERAGE BEHAVIOR
──────────────────────────────────────────────────────────────────────────────
Standard      $1,500–$2,000 base          per-seat add-on    throttle at 95%;
                                                             CSM alert; no
                                                             emergency burst
                                                             without approval
Pro           $2,000–$3,500 base          per-seat add-on    throttle at 95% +
                                                             proactive CSM
                                                             intervention;
                                                             limited burst
                                                             self-serve via
                                                             portal
Enterprise    $5,000+ base                per-tenant         pre-approved
              (negotiated)                negotiated         overage path;
                                                             tier upgrade
                                                             option via CSM
Sovereign     per-agreement; isolated     per-agreement      per-agreement;
              infrastructure premium                         isolated cost
                                                             model; HESEM +
                                                             tenant joint
                                                             monthly review
Pilot         capped at agreed $X         n/a                hard-stop at cap;
                                                             CSM coordinates;
                                                             no regulatory
                                                             compliance SLA
```

Tier envelopes are reviewed semi-annually. Inflation adjustments are
disclosed in the annual service notification (K5 §3). The tier
definition is the customer-side SLA commitment; the engineering-side
expression is in I5 §6.

---

## 3. Throttling thresholds

Throttling is applied at three enforcement points: API gateway
(request rate), queue ingestion (back-pressure), and job scheduler
(batch job delay). Regulated paths are excluded from all throttle
actions.

```
LEVEL    THRESHOLD         API GATEWAY ACTION         QUEUE ACTION
─────────────────────────────────────────────────────────────────────
Watch    > 60% envelope    tracking only; CSM aware   none
Warning  > 80% envelope    tenant alert emitted;      low-priority batch
                           CSM proactive outreach     jobs delayed
                           within 4h
Throttle > 95% envelope    rate-limit AI advisory     non-essential batch
                           calls; rate-limit heavy    jobs paused; ingestion
                           bulk analytics queries;    back-pressure applied;
                           delay non-essential LROs   tenant notification
                           per E13; tenant alert
Breach   > 100% envelope   per §4 classification      emergency tier
                           within 48h; action taken   escalation path or
                           per classification result  HESEM absorption
```

### 3.1 Throttle exclusion list

The following path classes are unconditionally excluded from throttle:

- Any path marked `regulated_path_protected = true` in I5 §1.3
- Audit-triggered evidence export and auditor portal sessions
- Recall-execution trace paths per D12
- DR failover replication
- Regulatory notification submission per H1 §3
- CAPA action verification evidence per H8
- Periodic review scheduled jobs per H6

The exclusion list is maintained by SRE Lead + Compliance Lead and
reviewed per quarterly capacity review. Any change to the exclusion
list is a Class B change per H7 (non-regulatory but operationally
significant).

---

## 4. Engineering absorption vs tenant uplift classification

When usage exceeds the tier envelope, classification occurs within
48 hours, jointly by SRE Lead + FinOps Lead + CSM. The outcome is
one of four categories.

### 4.1 HESEM absorbs (platform cause)

```
CAUSE                           DESCRIPTION
Missing DB index                slow query consumed excess DB CPU;
                                execution plan degrades with data growth
Expensive default logging       debug-level log left in production;
                                log storage and transport inflated
Provider outage causing         duplicate processing because of
duplicate work                  idempotency gap during provider incident
Inefficient algorithm in        regulated capability implemented with
regulated path                  O(n²) traversal instead of optimized
                                join; affects all tenants, not misuse
Mis-allocated resource share    attribution formula error caused one
                                tenant to be charged another's cost
AI feature cost-envelope        L2 §9 envelope priced incorrectly;
sized incorrectly               actual model cost per call higher
                                than modeled
Cache invalidation bug          workspace projection cache invalidated
                                too broadly; upstream DB load exceeded
```

### 4.2 Tenant uplift (tenant cause)

```
CAUSE                           DESCRIPTION
Genealogy depth exceeded        tenant ran bulk trace with depth > tier
                                limit (documented in tier contract)
Audit pack exported hourly      contract specifies daily delta build;
vs daily                        tenant automation ran hourly
AI feature outside contract     tenant integrated AI feature not in
                                subscribed tier
Onboarding burst beyond plan    tenant onboarding generated data
                                volume 3× the agreed estimate; no
                                commit adjustment made in advance
Automation at scale beyond      tenant's integration partner ran
committed plan                  mass-import beyond the contracted
                                hourly row budget
Un-approved experimental        tenant toggled experimental feature
feature enabled at scale        (per I8 §10) and ran mass job
                                against it
```

### 4.3 Grey zone (joint review)

```
CAUSE                           DISPOSITION
New AI feature usage burst      could be platform mis-pricing or
                                tenant over-use; requires per-feature
                                cost telemetry review; if feature is
                                < 30 days GA, presumptive HESEM absorption
Audit spike during confirmed    HESEM absorbs per §4.4 policy; but if
audit                           audit scope was 3× larger than declared
                                in regulatory profile (H1 §5), joint
                                cost-sharing discussion initiated
Recall spike cost               HESEM absorbs; if recall was caused by
                                tenant-side quality failure, contractual
                                reserve discussion at QBR
End-of-period close burst       predictable bursts are HESEM-covered;
                                if tenant ran ad-hoc additional jobs
                                coincidentally, joint review
```

### 4.4 Regulated absorption (HESEM absorbs by policy)

```
EVENT                           BASIS
Confirmed regulator audit       regulatory obligation; HESEM cannot
spike                           reasonably throttle a tenant during
                                active inspection
Confirmed product recall        life-safety / regulatory obligation
                                (D12); HESEM absorbs unconditionally
DR / failover overhead          platform resilience obligation
Regulator-driven export         per H1 §3; authority-requested data
                                export must not be throttled
```

The classification record is stored as an EC-16 change_record subtype
(cost-event) per H4, with fields: tenant_id, period, overage_amount,
classification_category, evidence, decision, action. This record is
available to the tenant via their I8 auditor portal scope and to
internal FinOps review.

---

## 5. AI cost envelopes (per L2 §9)

AI features are organized into three cost tiers, each with a per-call
target, a kill-switch threshold, and a degraded-mode fallback.

```
TIER      FEATURES               TARGET PER CALL    KILL-SWITCH
────────────────────────────────────────────────────────────────────────
TIER-1    inline classification;  ≤ $0.001 avg       breach for
          NCR pre-triage;                             > 7 consecutive
          defect likelihood;                          days at > 2×
          SPC anomaly signal                          target
TIER-2    AI-assisted CAPA root   ≤ $0.05 avg         breach for
          cause; regulatory       (tolerated range:   > 3 consecutive
          intelligence brief;     $0.02–$0.08)        days at > 2×
          document pre-review;                        target
          supplier scorecard
LLM       AI-31 audit pack draft; dynamic routing    per-feature
          AI-21 FMEA suggester;   cache-first;        kill-switch on
          AI-25 spec drafting     smaller-model       14-day rolling
                                  fallback for low-   envelope breach
                                  confidence; static  (M5 SLO-18)
                                  answer cache for
                                  top-K repeated
                                  queries; per-tenant
                                  rate limit per I5
                                  §4.3
```

### 5.1 Cost-aware routing rules (LLM tier)

```
RULE                               SUBSTANCE
Cache hit                          serve cached response; zero
                                   inference cost; TTL per feature
Smaller-model fallback             if confidence of full model ≥ 0.95,
                                   route to smaller model; if
                                   confidence < 0.7, escalate to
                                   full model with user disclosure
Static answer cache                for regulatory FAQ or spec lookup
                                   with < 5% answer variation, serve
                                   static answer with version tag
Per-tenant rate limit              per I5 §4.3 envelope; breach
                                   triggers graceful refusal with
                                   estimated wait time
Per-feature kill-switch            FinOps Lead + AI Lead jointly
                                   flip; tenant notified; degraded
                                   mode per L4 taxonomy
Degraded mode disclosure           tenant status page updated;
                                   in-app notice per feature
```

---

## 6. Per-pack cost overlay

```
PACK         COST DRIVER                  ATTRIBUTION          POLICY
─────────────────────────────────────────────────────────────────────
Pharma       APR + stability storage;      tag-based storage    disclosed in
             LIMS sub-processor            direct + share       tier proposal;
             integration traffic                                subject to sub-
                                                                processor DPA
                                                                addendum
Med Device   DHF + DHR per-unit            tag-based storage    charged only to
             storage; per-unit             per device record    tenants with
             inspection records                                 MD pack enabled
Auto         PPAP submission document      tag-based storage;   EDI bandwidth
             store; EDI partner            network tag          at cost; PPAP
             bandwidth                                          storage charged
                                                                per submission
Aero         ITAR-compliant isolated       infrastructure       dedicated zone
             compute premium; FIPS         premium              premium 25–40%
             140-3 HSM per I7 §4;          allocation           above standard
             CMMC-required controls                             compute; ITAR
                                                                premium disclosed
                                                                per J3
Food         § 204 traceability            tag-based storage    EMP IoT ingestion
             storage; per-zone                                  cost at IoT
             EMP sensor ingestion;                              gateway egress
             HACCP evidence store                               rate; disclosed
                                                                per pack sign-up
```

Pack overlays are disclosed in the tier proposal prior to contract
execution. Tenants adding a pack mid-contract receive a cost-delta
estimate within 5 business days of pack-toggle request (H7 Class A).

---

## 7. Cost-aware development

### 7.1 Per-change cost impact (H7 gate)

Every change request in H7 includes impact analysis field Q11 (cost
delta estimate). The engineering team provides an estimate in three
components: compute delta (vCPU-hours per day), storage delta (GB-month),
and managed-service delta (inference calls, message count, search docs).

```
THRESHOLD               ACTION
Cost delta > 5%         FinOps review required before deploy
Cost delta > 15%        FinOps signoff + tier-proposal update
                        if tenant-visible
Cost delta negative     cost saving surfaced in optimization backlog
```

### 7.2 Per-endpoint cost instrumentation

Every API endpoint emits a `cost_estimate` span attribute in OTel (per
I2 §2.1) containing: compute_cost_usd, data_transfer_cost_usd,
downstream_call_cost_usd, ai_inference_cost_usd (where applicable).
Aggregated per-route per-tenant in the cost attribution dashboard.
This data feeds quarterly review §8.

### 7.3 Caching and reuse policy

```
POLICY                          SUBSTANCE
Workspace projection cache      invalidation tuned per access pattern;
                                cache TTL set to maximize hit rate vs
                                freshness; target hit rate ≥ 80%
Per-tenant cache sharing        tenants may not share cached data;
                                cache keys are tenant-scoped
AI response cache               per feature; TTL determined by answer
                                volatility; shared responses (non-PII
                                regulatory text) may be cross-tenant
                                cached (per L2 §9 rule)
Archive tier movement           hot → warm → cold lifecycle per H5
                                retention floors; retrieval cost
                                surfaced at request time; tenant
                                notified before large cold retrieval
```

### 7.4 Queue and batch cost discipline

Long-running operations (LROs per E13) surface a cost estimate before
start: compute_hours, storage_write, downstream_calls. Tenant is
aware before confirming. High-cost low-priority batch jobs are
scheduled to off-peak windows by default; tenant can request peak
scheduling at burst cost (classified per §4.2 if over envelope).

---

## 8. Quarterly cost optimization review

### 8.1 Analysis items

```
ITEM                              METHOD
─────────────────────────────────────────────────────────────────────
Top-20 expensive workflows         per-tenant + per-pack; measured
per tenant + pack                  by total cost-per-execution × volume;
                                   compared quarter-over-quarter
Top-10 expensive queries           DB query plan analysis; slow query
                                   log; explain plan for top candidates;
                                   PR backlog for index additions
Top-10 AI inference cost drivers   per L2 §9 per-feature envelope
                                   review; model routing efficiency;
                                   cache hit rate per feature
Top-10 storage growth drivers      per H5 evidence class; cold-tier
                                   candidates; lifecycle adjustment
Top-10 network egress drivers      per-integration partner; CDN
                                   effectiveness; compression ratio
Cache effectiveness               per-route hit rate vs target (80%);
                                   routes below target flagged for
                                   TTL or key-design review
Right-sizing pods                 CPU / memory request vs actual
                                   utilization p50 and p99; pods where
                                   request > 2× actual trigger
                                   right-sizing PR
Reserved vs on-demand balance     cloud provider commitment vs flex;
                                   optimize commitment for stable
                                   tenants; retain flex for volatile
Archive tier transition            cost-trajectory per tenant; any
                                   tenant not moving data to cold per
                                   H5 schedule is flagged for CSM
                                   lifecycle conversation
Provider cost renegotiation        sub-processor costs per L2 §8;
                                   renegotiation cycle with commercial
                                   triggers
ML platform right-sizing           GPU reservation vs on-demand
                                   inference; batch vs streaming cost
                                   routing per §5
```

### 8.2 Output artifacts

```
- Optimization PR backlog: each item has cost-saving estimate and
  effort classification (trivial / small / medium / large)
- Adopted items promoted to engineering roadmap per H7
- Tenant-visible savings communicated at QBR (I8 §5) as cost-health
  metric improvement
- Per-pack optimization recommendations surfaced to Vertical Pack Leads
- FinOps optimization memo: internal quarterly artifact retained per H5
```

---

## 9. Cost SLO (SLO-18 per M5)

```
OBJECTIVE
  Per-tenant cost within contracted tier envelope: 99% / 30-day window
  Measurement: (days where cost ≤ envelope) / (total days in window)
  Breach allowance: 1% (≈ 0.3 days / month) for spike-class events

ERROR BUDGET CONSUMPTION
  Audit spike classified as regulated absorption: does NOT consume
    error budget
  Recall spike classified as regulated absorption: does NOT consume
    error budget
  Engineer-caused overrun: DOES consume error budget; H8 CAPA triggered
  Grey-zone joint review result: proportional attribution to error budget

BREACH RESPONSE
  SLO-18 breach → throttle applied per §3 if not already active
  SLO-18 breach → classification per §4 within 48h
  SLO-18 breach > 2 consecutive months → FinOps + SRE Lead joint review;
    tier re-proposal to tenant; or capacity optimization sprint
  SLO-18 is a HESEM-side platform measure; tenant transparency via CSM
    and QBR (I8 §5)

REPORTING
  Monthly: tenant cost report via I8 secure delivery
  Quarterly: QBR cost health score (I8 §5)
  Annually: cost-trend analysis for tier renewal discussion (K5)
```

---

## 10. Failure modes

```
FM1   Cost attribution mis-tagged (cost charged wrong tenant)
      Root cause: pod or resource missing tenant_id label;
        shared resource allocation formula error
      Recovery: monthly reconciliation detects mis-tag; credits
        issued to affected tenant within next billing cycle;
        H8 CAPA on tagging discipline; automated tag-coverage
        check added to I1 deploy gate

FM2   AI feature cost envelope breached
      Root cause: model routing skipped cheaper fallback;
        batch volume underestimated; per-tenant rate limit
        not enforced
      Recovery: per L2 §11 FM7 kill-switch; degraded mode;
        tenant notified; H8 CAPA on envelope sizing and
        routing logic

FM3   Throttle applied to regulated workflow
      Root cause: regulated path not on exclusion list;
        exclusion list out of date after new path added
      Recovery: throttle removed immediately; regulated
        exclusion list updated; H8 CAPA on exclusion-list
        governance; possible regulatory exposure documented

FM4   Tenant uplift claimed but tenant disputes
      Root cause: attribution evidence insufficient; tenant
        automation logged differently than HESEM measurement
      Recovery: joint review with evidence; CSM mediation;
        per §4 classification record as evidence; if dispute
        unresolvable, split cost per grey-zone protocol

FM5   HESEM-absorption claimed but actually tenant misuse
      Root cause: classification review incomplete; pattern
        not detected in single event
      Recovery: classification audit over 3-month history;
        pattern detection → H8 systemic CAPA on
        classification rigor; amend contract if persistent

FM6   Provider cost spike unannounced
      Root cause: provider pricing change; unplanned usage
        tier breach at provider
      Recovery: H7 retro-CR on provider relationship;
        tenant communication if passed through; H8 CAPA on
        provider contract monitoring

FM7   Quarterly review skipped
      Root cause: no ownership; review date not calendared
      Recovery: H6 periodic-review mechanism surfaces gap;
        H8 CAPA on quarterly review calendar governance;
        FinOps Lead accountable

FM8   Cost-aware development gate weakened
      Root cause: cost-delta estimate skipped on CR; gate
        misconfigured in CI
      Recovery: gate re-enabled; H7 governance audit; H8
        CAPA on gate reliability; retrospective costing of
        recent changes
```

---

## 11. Roles and authority (RACI)

```
Role             ATTRIB   TIER     THROTTLE  ABSORPTION  AI-COST  REVIEW
FinOps Lead      A        A        A         A           A        A
SRE Lead         R        C        R         R           C        R
Platform Lead    R        C        R         R           C        R
Engineering Ld   R        C        C         R           R        R
AI Lead          C        C        C         C           A        R
Customer Success C        R        R         R           C        C
Compliance Lead  C        C        C         C           C        C
Tenant Admin     I        R        I         I           I        I
Sales            -        R        -         -           -        -
```

---

## 12. Cross-references

- I1 — deploy gate per cost SLO; cost-delta check
- I2 — per-route per-tenant cost telemetry in OTel spans
- I3 — cost-spike incidents per I3 SEV classification
- I5 — capacity ↔ cost coupling; tier enforcement
- I7 — secrets rotation and security controls as cost driver
- I8 — per-tenant tier assignment; QBR cost health
- L2 §9 — AI cost envelopes; model routing; per-feature kill-switch
- L4 — kill-switch execution from cost breach
- K1 — pricing tier definitions; envelope amounts
- K5 — customer success; cost transparency at QBR
- H7 — cost-delta field in change impact analysis
- H8 — CAPA from cost governance failures
- M5 — SLO-18 cost SLO definition
- M6 — cost-governance risks
- M9 — cross-reference index

---

## 13. Decision phrase

```
I6_COST_GOVERNANCE_V10_LOCKED
NEXT: I7_SECURITY_OPERATIONS.md
```
