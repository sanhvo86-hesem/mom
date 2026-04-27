# K1 — Pricing and Tiers (V10)

```
chapter_id:     K1
version:        V10
owner_role:     CFO with Product Lead
wave_target:    reviewed before each commercial engagement; updated
                at wave delivery + pricing policy change
dependencies:   I5 (capacity SLA), I6 (cost governance), I8 (tenant
                operations), L2 §9 (AI feature usage metering),
                H2 §14 (CVLP delivery commitment), M5 (SLO directory)
```

The pricing model is the commercial contract between HESEM and tenant
expressed as money, capability, SLA, and responsibility split. It must
scale from a 50-user Tier-2 automotive supplier doing IATF audit prep
to a multi-thousand-user multi-continent pharmaceutical company running
live APR chains, PSUR drafting, and DSCSA serialization. This chapter
defines the full commercial architecture of that scaling.

Pricing-as-data is the foundational principle: tier parameters, quota
limits, feature flags, AI usage envelopes, and SLA commitments are
authoritative data stored in the HESEM core domain, not hardcoded in
product logic. Pricing configuration changes are data migrations, not
code deployments.

The commercial model is built around three axes of value:

**Vertical depth**: A manufacturer in the Pharma vertical pays more
than a manufacturer in discrete automotive precisely because the
Pharma pack delivers PSUR drafting, APR evidence chains, sterile
serialization, and Annex 11-compliant audit records that have measurable
regulatory value. Each pack add-on is priced against the cost the
customer would otherwise pay to third-party consultants and point
solutions to achieve the same outcome. The pack pricing is not arbitrary;
it is pegged to the alternative cost + a discount for integration value.

**Platform leverage**: Each additional module, workflow, or pack a
tenant activates costs HESEM less to serve (shared infrastructure,
shared security model, shared compliance layer) while delivering more
value to the tenant (more integrated evidence chain, more AI advisory
features, more cross-domain data). This declining marginal cost is the
economic engine of expansion. NRR above 110% is achievable precisely
because the tenant's expanded scope costs HESEM sub-linearly while
billing grows at full ACV rates.

**Compliance posture monetization**: The CVLP (H2 §14) is a structural
cost advantage for regulated tenants. A pharmaceutical company spending
$500K/year on external validation consultants can reduce that to
$100-200K using HESEM's pre-built CVLP per release. This $300-400K
saving is a hard-dollar ROI that supports the Pro pack pricing. CSMs
are trained to quantify this in every business case conversation.

---

## 1. The five-tier commercial model

```
TIER            POSITIONING                        ARR ENVELOPE

HESEM Core      Small-to-lower-mid-market.         $30K – $200K
                Single facility or single
                department. Light vertical
                pack (Auto-light, MD-light, or
                Food-light). Up to 200 users.
                Shared cluster with per-tenant
                data isolation.

HESEM Pro       Mid-market mainstream.              $200K – $2.5M
                Multi-facility. One regulated
                vertical pack (full). 200–3,000
                users. Dedicated namespace;
                per-tenant feature flag
                boundaries. Dedicated CSM.

HESEM           Large enterprise; global            $2.5M – $30M+
Enterprise      accounts. Multi-facility +
                multi-region. Multiple vertical
                packs. 3,000+ users. Dedicated
                cluster per region. TAM included.
                24×5 support with formal
                escalation path. Per-tenant
                engineering engagement available.

HESEM           Defense, government, regulated      Custom; per agreement.
Sovereign       sovereign-data customers.           Infrastructure isolation
                ITAR, classified, or regional       cost included. No ARR
                data-residency mandate. FIPS        floor — determined by
                140-3 HSM isolation. Fully          scope and sovereignty
                dedicated compute and storage       tier.
                per agreement.

HESEM Pilot     Design partner or structured        Capped non-recurring fee.
                discovery. Defined success          Convert to Core/Pro/
                criteria. Time-boxed (typically     Enterprise on success
                90-120 days). No production         (per K2 §2 conversion
                SLA. Full access to prototype       rate target ≥60%).
                surfaces for evaluation.
```

---

## 2. Per-tier capability matrix

### 2.1 Wave coverage per tier

```
TIER         WAVE COVERAGE              NOTES
Core         W1-W7 baseline             Core infrastructure, basic
                                        eQMS, one light pack module,
                                        Tier-1 AI features included
Pro          W1-W8 + one pack           Full pack scope (one J-pack);
             (selected full)            Tier-1 + Tier-2 AI features
                                        within usage envelope
Enterprise   All waves (W1-W12+) +      All delivered wave capability;
             chosen vertical packs       multi-pack; advanced AI;
                                        full integration suite
Sovereign    All waves + sovereign       Per W13 sovereign cloud
             cloud extensions           variant; FIPS 140-3; dedicated
                                        data plane
Pilot        W1-W7 + target pack        Focused on the pack being
             preview                    evaluated; fixture data;
                                        prototype posture applies
```

### 2.2 Multi-tenancy and isolation model

```
TIER         CLUSTER MODEL              DATA ISOLATION
Core         Shared cluster             Per-tenant schema isolation;
                                        per-tenant encryption key;
                                        logical row-level isolation
Pro          Dedicated namespace        Per-tenant flag boundaries;
             in shared cluster          per-tenant encryption;
                                        cross-tenant query prevention
                                        enforced at gateway
Enterprise   Dedicated cluster          Per-region dedicated compute
             per region                 and storage; cross-region
                                        replication optional;
                                        per-tenant HSM key (standard)
Sovereign    Dedicated region           Fully isolated compute, storage,
             or dedicated VPC           network; per-agreement HSM;
                                        FIPS 140-3 validated
Pilot        Shared (with flag)         Shared cluster; fixture data
                                        only; no production data
                                        in pilot environment
```

### 2.3 Support model per tier

```
TIER         SUPPORT CHANNEL          SLA                    ESCALATION
Core         Email + portal           Next business day       CSM → Support Lead
             Shared CSM               response                → Engineering on-call
             Business hours only      (P1: 4h business hrs)

Pro          Email + portal           P1: 2h; P2: 4h;        Dedicated CSM
             Dedicated CSM            P3: 1 BD; P4: 2 BD     → Implementation Lead
             Business hrs +                                   → Engineering on-call
             on-call alert for P1

Enterprise   24×5 support             P0: 30min; P1: 1h;     CSM + TAM escalation
             Dedicated CSM + TAM      P2: 2h; P3: 4h;        path; CTO awareness
             Named engineering        P4: 1 BD               on P0/P1
             contacts available

Sovereign    Per agreement            Per agreement           Dedicated team;
             Dedicated team                                   per-agreement SLA

Pilot        Email + CSM              Best effort             CSM → Engineering
             No production SLA                               (prototype posture)
```

---

## 3. Per-tier capacity and SLA (aligned to I5 + M5)

```
TIER         AVAILABILITY   LATENCY TARGET     AUDIT PACK         DR/BCP
Core         99.5%          p95 < 1,000ms       7-day rolling      Regional;
             (monthly)      p99 < 3,000ms       (standard audit)   RPO 24h;
                                                                   RTO 12h

Pro          99.9%          p95 < 500ms         24h rolling        Regional;
             (monthly)      p99 < 1,500ms       (extended audit)   RPO 4h;
                                                                   RTO 4h

Enterprise   99.95%         p95 < 200ms         4h rolling         Multi-region;
             (monthly)      p99 < 600ms         (deep audit pack)  RPO 1h;
                                                                   RTO 2h

Sovereign    Per agreement  Per agreement       Per agreement      Per agreement;
                                                                   dedicated DR

Pilot        No SLA         Best effort         n/a                None
```

Internal SLOs are set 10-20% tighter than commercial SLAs to provide
error budget (per M5 §3). A 99.9% commercial SLA is backed by a 99.92%
internal target. When internal SLO breach triggers, customer communication
begins before SLA breach occurs.

SLA credits are issued per tier on verified breach. Credit schedule
(standard): 10% monthly subscription for each 0.1% below SLA up to
30% maximum per month. Sovereign tier credits per agreement.

---

## 4. Per-tier pricing model

### 4.1 Core tier

```
Base subscription (per tenant per month):   $2,500 – $8,000
                                             (facility count × base)
Per-user component (per active user/month): $20 – $35
                                             (volume discount at 100+ users)
Light pack overlay (one pack, light module): $1,000 – $3,000/month
AI Tier-1 features:                          Included in base (envelope
                                             per §6 usage component)
Integration:                                 CSV / standard EDI lite
                                             (2 pre-built connectors)
CVLP delivery:                               Not included (available as
                                             add-on for regulated Core)
Sandbox:                                     Not included
```

### 4.2 Pro tier

```
Base subscription:                          $8,000 – $25,000/month
                                            (facility count × module scope)
Per-user component:                         $15 – $30/month
                                            (volume discount at 500+ users)
Pack overlay (one pack, full):              $5,000 – $30,000/month
                                            (per pack — see §5 add-on bands)
AI Tier-1 + Tier-2:                         Included; usage envelope applies
                                            (overage per §6 usage components)
Integration:                                EDI suite; API outbound; CDC
                                            (up to 5 pre-built connectors)
CVLP delivery:                              Included per H2 §14
Sandbox:                                    1 non-production environment
                                            included
```

### 4.3 Enterprise tier

```
Base subscription:                          Negotiated; per scope
                                            Reference: $50K – $200K/month
Per-user component:                         $10 – $20/month
                                            (volume discount at 2K+ users)
Pack overlays (multiple packs):             Per §5 add-on bands;
                                            multi-pack bundle discount applies
AI envelope:                                Custom retention + usage
                                            negotiated; co-built features
                                            available on roadmap commitment
Integration:                                Full suite; per-customer
                                            connectors negotiated;
                                            EDI VAN connection included
                                            for Auto and Pharma tenants
Multi-region replication:                   Included; cross-region
                                            failover RPO 1h / RTO 2h
Sandbox + perf-test:                        2 non-production environments;
                                            perf-test environment with
                                            production-scale data set
CVLP delivery:                              Included; per-pack CVLP
                                            addendum per release cycle
TAM:                                        Included; 0.5 – 1.0 FTE
                                            dedicated per tenant
```

### 4.4 Sovereign tier

```
Base:                                       Custom; per infrastructure
                                            isolation scope + region
Infrastructure isolation:                   Dedicated compute + storage +
                                            network + HSM; FIPS 140-3
                                            validated where required
ITAR / export control posture:              Per J3 Aero sovereign path;
                                            dedicated US GovCloud tenant
                                            or equivalent
Data residency guarantee:                   Written commitment per DPA;
                                            no cross-border data movement
                                            without customer sign-off
DPA:                                        Custom; per-jurisdiction;
                                            sub-processor list reviewed
                                            and approved by customer
Pack scope:                                 All waves + sovereign extensions;
                                            per W13 sovereign cloud variant
```

### 4.5 Pilot tier

```
Fixed capped fee:                           $25K – $150K
                                            (based on scope + pack)
Duration:                                   90 – 120 days (standard)
Scope:                                      Defined success criteria;
                                            limited to target pack;
                                            fixture data only
Success path:                               Convert at negotiated pricing;
                                            pilot fee credited to first
                                            year of subscription
Failure path:                               No conversion obligation;
                                            pilot data exported + destroyed
                                            per data retention agreement
```

---

## 5. Per-pack add-on pricing bands

### 5.1 Full pack add-on bands (annual cost)

```
PACK          PRO TENANT                 ENTERPRISE TENANT
              (per facility per year)    (per facility per year)

Pharma J1     $100K – $400K              $200K – $2M
              Light: eQMS + APR          Heavy: Sterile injectable +
              Medium: + DSCSA            PSUR + DSCSA + stability
              Heavy: + Annex 11 deep     + per-site validation pack

Automotive J2 $60K – $200K               $120K – $800K
              Light: eQMS + PPAP         Heavy: OEM portfolio +
              Medium: + IATF audit pack  FMEA integration + AIAG
              Heavy: + OEM EDI           MSA + VDA 6.3 pack

Aerospace J3  $80K – $320K               $160K – $1.2M
              Light: AS9100 eQMS         Heavy: NADCAP + ITAR +
              Medium: + AS9102 FAI       CMMC + GIDEP + counterfeit
              Heavy: + defense track     risk + defense reporting

Med Device J4 $60K – $240K               $120K – $1M
              Light: ISO 13485 eQMS      Heavy: Class III + MDR IVDR
              Medium: + PMS/PMCF         + EUDAMED + GUDID + PCCP
              Heavy: + PSUR + 510(k)     + vigilance reporting

Food J5       $40K – $120K               $80K – $400K
              Light: HARPC + GFSI        Heavy: FSMA §204 + FSVP
              Medium: + FSMA 204         + HACCP CCP monitoring +
              Heavy: + FSVP + HACCP AI   mock recall + traceability
```

### 5.2 What pack add-on includes

```
INCLUDED IN EVERY PACK ADD-ON:
  - Pack-specific authoritative root schemas (per Jx chapter)
  - Pack-specific workflow state machines
  - Pack-specific UI surfaces and dashboards
  - Pack-specific AI features at declared tier (L2 per-pack overlay)
  - Pack-specific audit pack contents (per Hx + per Jx)
  - Pack-specific regulatory evidence classes (per H4)
  - Pack-specific CVLP components (per H2 §14 + per Jx)
  - Pack-specific support specialization (validated engineer contact)
  - Annual pack version update per regulatory change
```

---

## 6. Usage-based components (12 metered items)

Usage-based components apply above the included envelope per tier.
All meters are logged and reported monthly in the tenant billing dashboard.

```
COMPONENT                    METER UNIT           INCLUDED ENVELOPE
                                                   Core/Pro/Enterprise

AI advisory Tier-1           per advisory call     5K / 50K / 500K / mo
  (ML inference, non-LLM)    $0.001 – $0.005/call  Overage at listed rate

AI advisory Tier-2 LLM       per LLM call          500 / 5K / 50K / mo
  (RAG, generative drafts)   $0.02 – $0.10/call    Overage at listed rate

ML inference (custom model)  per inference call    Negotiated per feature
  (tenant-specific fine-tune) negotiated rate       Custom envelope

Bulk export overage          per GB                 10GB / 100GB / 1TB / mo
  (audit pack; data extract)  $0.20 – $0.40/GB      Overage at listed rate

EDI transaction overage      per transaction        1K / 25K / 500K / mo
  (inbound + outbound)        $0.005 – $0.02/msg    Overage at listed rate

Specialty connector          per connector/month    2 / 5 / unlimited
  (non-standard integration)  $500 – $2K/mo/conn    Additional at list rate

DSCSA event overage          per event processed    0 / 100K / 10M / mo
  (serialization; T3)          $0.001 – $0.005/event Overage at listed rate

EUDAMED / GUDID submission   per submission          0 / 50 / unlimited
  (MD pack; regulatory APIs)   $5 – $20/submission   Additional at list rate

PSUR draft (AI-21)           per generated draft    0 / 5 / unlimited
  (LLM-assisted; Pharma J1)    $200 – $500/draft     Additional at list rate

Audit pack export overage    per pack beyond N/mo   10 / 100 / unlimited
  (PDF + JSON export)           $50 – $200/pack       Additional at list rate

Cross-region replication     per GB replicated       0 / included / included
  (Enterprise multi-region)    $0.05 – $0.15/GB      (Core: not available)

Edge gateway site            per site per month      0 / 0 / negotiated
  (ISA-95 OT integration)      $500 – $2K/site/mo    Additional per site

Sub-processor pass-through   cost + margin           Included within
  (AI sub-processor at cost)   (per L2 §8 + I6)      declared AI envelope
```

### 6.1 Usage envelope governance

Usage envelopes are stored as authoritative pricing data (pricing-as-data
principle, §7). Tenants receive a real-time usage dashboard showing
current consumption against envelope. At 80% envelope consumption,
automated notification to tenant admin. At 95%, CSM outreach. At 100%,
throttling OR automatic overage (per contract choice) — never silent
quality degradation.

---

## 7. Implementation revenue

Professional services revenue supplements subscription ARR. It is
delivered by HESEM directly or by certified implementation partners
(per K3). HESEM takes 100% of direct delivery revenue and a referral
or co-delivery share for partner delivery.

Implementation partner economics per K3:
- Referral (partner refers, HESEM delivers): 15-20% of implementation ARR
- Co-delivery (partner leads delivery, HESEM supports): partner takes
  60-70% of implementation SOW; HESEM retains 30-40%
- Partner-led (partner delivers independently, HESEM licenses): partner
  pays HESEM 10% platform delivery fee on implementation ARR

Direct HESEM delivery rates (reference):
- Senior consultant / validation engineer: $250 – $450/hour (USD)
- Implementation architect: $350 – $600/hour (USD)
- Pack specialist (Pharma/MD/Aero regulatory): $400 – $700/hour (USD)
- Regional adjustment (SEA): 40-60% of USD reference rate
- Regional adjustment (EU): EUR near-parity to USD reference rate

SOW milestone payments are structured to protect cash flow:
- Signature: 20% of fixed SOW value
- Environment provisioned and configured: 20%
- First workflow live with test data: 20%
- User acceptance test passed: 20%
- Go-live / handoff: 20%
T&M billing is monthly in arrears with 30-day payment terms.
Disputed hours have a 10-business-day resolution window before
escalating to VP-level review.

```
ITEM                            RANGE                 MODEL

Onboarding implementation       $50K – $5M            T&M (per diem rate)
  (per tier + pack + scale)                           or fixed-scope;
                                                      phased milestones

Vertical pack adoption          $25K – $500K           Fixed-scope;
  (per pack go-live)            per pack               milestone-gated

Custom workflow development     $30K – $500K           T&M or fixed
  (non-standard process)        per project            (per scope doc)

Custom integration              $20K – $200K           Fixed per connector;
  (non-standard connector)      per connector          T&M for complex

Master data migration           $25K – $750K           Fixed-scope;
  (from legacy ERP/QMS)         per migration          data profiling
                                                      required first

Training (initial cohort)       $5K – $50K             Fixed per cohort
  (per module; per pack)        per cohort             (up to N users)

Training (recurring)            $2K – $15K             Fixed per cohort
  (annual refresh + new hire)   per cohort             (per pack)

Audit support                   $10K – $75K            Fixed per audit
  (HESEM artifact assembly;     per audit cycle        cycle; regulatory
  customer-side preparation)                           calendar-linked

Validation support              $25K – $200K           T&M primarily;
  (IQ/OQ/PQ + RTM + CVLP)       per validation         GAMP 5 Cat 4-5
  integration)                  package

TAM engagement (standalone)     $120K – $250K/yr       Included in
  (where not Enterprise tier)   per TAM                Enterprise; sold
                                                      separately for Pro

Go-live war room support        $25K – $100K           Fixed per go-live
  (dedicated engineering        per event              event; capped
  during cutover window)                               scope

Regulatory readiness            $15K – $80K            Fixed-scope;
  assessment                    per pack per tenant    deliverable:
  (pre-audit gap analysis)                             gap report + plan
```

---

## 8. Pricing-as-data: the operating principle

Every pricing variable in HESEM is authoritative data, not code logic.

### 8.1 What is stored as pricing data

```
RECORD TYPE                   TABLE / SERVICE
Tier definition               tenant_tier (per C1 core domain)
Per-tier quota                tenant_quota_config
Per-tier feature flags         tenant_feature_flag
Per-tenant overrides           tenant_pricing_override (logged)
Usage meter definitions        pricing_meter_catalog
Usage accumulation             pricing_usage_event (WORM per H5)
Overage rate card              pricing_rate_card
Pack add-on records            tenant_pack_subscription
AI usage envelope              ai_usage_envelope (per L2 §9)
SLA commitment                 tenant_sla_record (per I5)
```

### 8.2 Governance of pricing data changes

```
CHANGE TYPE                   CLASSIFICATION        APPROVAL
New tier (new row)             H7 Class A             CFO + CEO + board notice
Quota change (existing tier)   H7 Class A             CFO + CEO
Per-tenant override            H7 Class B             VP Sales + CFO
Rate card revision             H7 Class A             CFO + CEO
Pack add-on price change       H7 Class A             CFO + CEO + product
Usage meter new component      H7 Class B             CFO + Product Lead
Mid-term price increase        H7 Class A + customer  CEO + customer sign-off
                               sign-off required
```

### 8.3 Override governance

All per-tenant pricing overrides are:
- Logged as EC-16 (admin override) in the audit chain
- Visible to Billing Lead + Finance in override dashboard
- Time-bounded (override expires at contract renewal unless renewed)
- Subject to net-margin floor (CFO sets minimum floor per tier)
- Reported quarterly in commercial analytics

---

## 9. Pricing-as-data: tenant isolation

Each tenant's pricing configuration is isolated per the 4-mode data
strategy (JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY → POSTGRES_ONLY).
In POSTGRES_PRIMARY mode, all pricing data is authoritative in PostgreSQL.
The gateway reads pricing configuration at request time and enforces
quota limits and feature flags at the API boundary. No pricing bypass
path exists that circumvents the gateway pricing enforcement layer.

Tenant A cannot view or infer Tenant B's pricing configuration. Per-tenant
pricing override records are accessible only to the tenant's own admin
principal and to HESEM billing administrators.

---

## 10. Expansion path

Expansion is the commercial outcome of successful adoption, measured
by health score (per K5 §8) and triggered by adoption thresholds rather
than arbitrary sales pressure.

```
EXPANSION TYPE               TRIGGER                    MECHANISM

Pilot → Core                 Success criteria met;       Conversion agreement;
                             pilot conversion            pricing concession
                             rate target ≥ 60%          applied

Core → Pro                   Second facility added;      Tier change (H7 Class A);
                             regulated pack required;    data migration;
                             >200 users; SLA gap         CSM-led planning

Pro → Enterprise             Multi-region required;      Cluster migration;
                             multi-pack required;        negotiated base +
                             integration density grows;  volume discount;
                             TAM value clear;            TAM assigned
                             Enterprise-quality audit
                             rate required

Any → Sovereign              ITAR / classified mandate;  Custom agreement;
                             sovereign data residency;   infrastructure build;
                             government customer class   6-12 mo lead time

Pro add-on                   Second pack adopted;        Pack add-on activation;
(same tier)                  cross-vertical need         pricing per §5

Enterprise add-on            Additional pack; additional  Addendum to MSA;
(same tier)                  region                      cluster expansion
```

Expansion triggers are monitored by CSM through health score components
(per K5 §8). When a tenant hits a trigger threshold (e.g., user count
approaches 200 for Core tier), CSM initiates an expansion conversation
with documented rationale rather than a cold upsell.

---

## 11. Competitive positioning

### 11.1 The competitive landscape

```
COMPETITOR         SEGMENT           HESEM DIFFERENTIATION
Veeva Vault QMS    Pharma premium     HESEM = unified ERP+MOM+MES+QMS,
                   (Vault QMS only)   not QMS-only; lower entry price
                                      for mid-market Pharma
MasterControl      QMS mid-market     HESEM = deeper AI; full ERP
                   (QMS only)         capability; better regulated
                                      workflow automation
Sparta TrackWise   Enterprise QMS     HESEM = unified; faster implementation
                   (QMS only)         via CVLP + templates
IFS Cloud          ERP general-        HESEM = regulated QMS depth;
                   purpose            pack-specific compliance depth
                                      IFS lacks
QAD                Automotive ERP     HESEM = deeper eQMS; AI advisory
                   (ERP primary)      integration; multi-vertical packs
Plex (Rockwell)    Manufacturing ERP  HESEM = regulated QMS depth;
                   (MES strength)     pack-specific compliance automation
ETQ Reliance       QMS mid-market     HESEM = unified ERP+QMS; AI features;
                   (QMS only)         deeper vertical packs
AssurX             QMS mid-market     HESEM = same differentiation as ETQ;
                   (QMS only)         better platform economics
Honeywell Forge    Process industry   HESEM = discrete manufacturing depth;
                   (IoT/OT primary)   eQMS + regulatory coverage stronger
```

### 11.2 Positioning statements (by audience)

```
BUYER TYPE         POSITIONING
Quality Director   "HESEM closes your audit gaps with evidence-chain
                   records that regulators can inspect, AI advisories
                   that surface CAPA candidates, and a CVLP that
                   reduces your validation cost per release."

VP Manufacturing   "HESEM connects your shop floor to your quality
                   system in real time — NC raised on Line 7 triggers
                   CAPA workflow before the shift ends."

CFO                "HESEM's vertical pack model means you pay for the
                   compliance depth you need, not a full enterprise
                   suite you will never use. CVLP reduces your external
                   validation spend by up to 60%."

CIO                "HESEM is a unified platform, not a system-of-record
                   integration project. One data model, one audit chain,
                   one evidence store."
```

---

## 12. Discounting policy

```
DISCOUNT LEVEL     APPROVER              LIMITS
≤ 10%              Sales representative  Maximum once per deal per year
11 – 20%           Sales Manager         Documented rationale required
21 – 30%           VP Sales              Business case + CFO notification
> 30%              CEO + CFO             Board notification on deals > $5M
                                        ARR impact

AUTOMATIC DISCOUNTS (no approval required):
  Multi-year prepay — 3 years:  10% off subscription ARR
  Multi-year prepay — 5 years:  15% off subscription ARR
  Multi-pack bundle — 2 packs:  15% off combined pack price
  Multi-pack bundle — 3+ packs: 20% off combined pack price
  Per-user volume — >1,000:     Volume schedule applied automatically
  Per-user volume — >5,000:     Enhanced volume schedule

FLOOR RULES (cannot be overridden):
  Gross margin floor per tier:   Core ≥45%; Pro ≥55%; Enterprise ≥60%
  Implementation floor:          Cost+ 30% minimum on T&M
  Sub-processor cost pass-through: cost+ 15% minimum margin
```

Discount history is maintained per deal in CRM and reviewed quarterly
by the CFO against net margin floor compliance.

---

## 13. Renewal and churn protection

### 13.1 Renewal engagement timeline

```
TIER          RENEWAL NOTICE     CSM ENGAGEMENT STARTS
Core          60-day notice       T-90 days (CSM reviews health score)
Pro           90-day notice       T-120 days (CSM + health score + QBR)
Enterprise    6-month notice      T-270 days (CSM + TAM + executive
                                  sponsor alignment)
Sovereign     Per agreement       Per agreement (typically T-12 months)
```

### 13.2 Price escalation at renewal

```
STANDARD:    CPI-indexed escalation (regional CPI per contract)
CAPPED:      Per contract (typically CPI + 3% cap)
EXCEPTION:   No price increase if:
               - Material SLA breach in prior period (per §3)
               - Undelivered committed feature in prior period
               - Active P0/P1 incident unresolved at renewal date
SOVEREIGN:   Per agreement; renegotiated at renewal
```

### 13.3 Churn protection mechanisms

```
MECHANISM                  TRIGGER                  OWNER
Health score monitoring    Weekly automated          CSM dashboard
  (per K5 §8)              score calculation
CSM intervention           Score < 60               CSM proactive outreach
  (proactive outreach)                              within 3 business days
Executive sponsor          Score < 40               VP Customer Success
  alignment                                         + CTO awareness
QBR cadence                Quarterly per tenant      CSM + account team
  (per I8 §5)
Reduced renewal pricing    SLA breach in prior        Automatic per contract
  (SLA breach protection)  period verified           credit calculation
Win-back program           30-day post-churn          VP Sales + CSM
  (for churned tenants)    outreach window            review
Reference protection       Reference customer         CSM + Marketing
  (NPS ≥ 70 required for   NPS check before           approval before
  public reference)        reference request          reference use
```

---

## 14. ARPU model by segment

```
SEGMENT              ARR ENVELOPE       ARPU TARGET (STEADY STATE)
Core tenant          $30K – $200K        $75K blended (sub + impl)
Pro tenant           $200K – $2.5M       $800K blended
Enterprise tenant    $2.5M – $30M+       $8M blended (sub + impl +
                                         AI overage + multi-pack)
Sovereign            Custom              Custom (cost+ infrastructure)
Pilot (convert)      Capped (one-time)   → converts to tier ARPU above

Per-tenant AI        Included within     Overage target ≈ 8-12% of
  usage overage      envelope above      subscription ARR at mature
                                         adoption (2+ years post-
                                         deployment)
```

---

## 15. Contract structure

The Master Subscription Agreement (MSA) is the umbrella contract. All
commercial arrangements flow under the MSA with Order Forms and
addenda for specific scope.

### 15.1 MSA structure

```
DOCUMENT                       CONTENT
Master Subscription Agreement  Governing terms: SLA, DPA, IP, liability,
  (MSA)                        indemnification, termination, governing law
Order Form                     Specific tier, quota, pack scope, fee,
                               term, start date
Data Processing Addendum       GDPR / CCPA / PIPL requirements; sub-
  (DPA)                        processor list; data residency commitments;
                               erasure obligations (per I7 §9)
Vertical Pack Addendum         Pack-specific regulatory commitments;
  (per pack)                   evidence standard; CVLP delivery terms
Implementation Statement       SOW for professional services; milestones;
  of Work (SOW)                acceptance criteria; payment schedule
Security Addendum              Per Enterprise+; penetration test rights;
  (Enterprise+)                audit rights; SOC 2 report access
Sovereign Agreement            Custom; per K1 §4.4; jurisdiction-specific
  (Sovereign tenants)          terms
Sub-processor Disclosure       List of sub-processors (AI providers,
  Schedule                     cloud providers, CDN, analytics) per I7
```

### 15.2 Key contractual commitments

```
COMMITMENT                     STANDARD TERM
Uptime SLA                     Per §3 (tier-dependent)
SLA credit mechanism           Per §3 (credit per verified breach)
Data residency                 Per DPA + per Sovereign Agreement
Sub-processor notification     30-day notice of material sub-processor
                               change; customer opt-out right (90 days)
CVLP delivery                  Per release cycle; per H2 §14 addendum
AI advisory posture            Written acknowledgment that AI features
                               are advisory; human override preserved
Audit pack standard            EC-1..EC-38 evidence classes per H4;
                               WORM per H5 retention schedule
Regulatory update cadence      Pack version update within 90 days of
                               material regulatory change affecting pack
Penetration test rights        Enterprise+: annual; customer may
                               observe scope summary
Data export on termination     30-day export window post-termination;
                               HESEM destroys data within 90 days
Price change notice            90-day minimum notice for subscription
                               price changes; no mid-term increases
                               without customer sign-off
```

### 15.3 Liability and indemnification

```
LIABILITY CAP                  STANDARD
General liability cap          12 months aggregate subscription fees
IP indemnification             HESEM indemnifies for IP infringement
                               in base platform; customer indemnifies
                               for customer data
Data breach liability          Per DPA; sub-processor liability chain
                               per I7 §9
AI advisory disclaimer         Explicit: AI features produce advisory
                               output only; customer is responsible for
                               regulated decisions made using AI
                               advisory (per L1 §6)
Consequential damage waiver    Standard SaaS; mutual waiver of
                               consequential, indirect, special
                               damages except for data breach and
                               willful misconduct
```

---

## 16. Pricing analytics and commercial KPIs

Pricing performance is monitored continuously. The following KPIs drive
pricing model review at quarterly cadence:

### 16.1 Commercial KPIs

```
KPI                            TARGET           MEASUREMENT
ARR by tier                    Per K4 stage      Monthly; CFO dashboard
Net Revenue Retention (NRR)    ≥ 110% (Pro)      Monthly; rolling 12-mo
                               ≥ 115% (Enterprise)
Gross Revenue Retention (GRR)  ≥ 95% logo        Monthly; churn tracking
Pilot conversion rate          ≥ 60%              Per cohort
Average Contract Value (ACV)   Per tier target    Quarterly
Expansion ARR                  ≥ 30% of new ARR   Monthly; expansion deals
Implementation attach rate     ≥ 70% (Pro+)       Per new customer
Per-pack adoption rate         ≥ 40% of tenants   Quarterly; cross-sell
  (second pack within 18 mo)   in eligible tier
AI usage overage rate          8-12% of sub ARR   Monthly; per tier
  (target overage revenue)     at 2+ yr maturity
Discount depth by rep          ≤ 15% avg per rep  Per deal; quarterly review
Multi-year prepay rate         ≥ 30% of new deals Quarterly
```

### 16.2 Unit economics per tier (steady state)

```
TIER         GROSS MARGIN     CAC PAYBACK      LTV ESTIMATE
             TARGET           TARGET           (5-year; 115% NRR)

Core         50-60%           ≤ 18 months      2.5× ACV year 1
Pro          60-70%           ≤ 24 months      5× ACV year 1
Enterprise   65-75%           ≤ 30 months      10-15× ACV year 1
Sovereign    60-70%           ≤ 36 months      Per agreement
```

### 16.3 Pricing model review cadence

```
TRIGGER                        ACTION
Quarterly                       CFO reviews: NRR, GRR, discount depth,
                                unit economics vs targets; adjusts rate
                                card for next quarter if needed
Wave delivery milestone          Product Lead reviews: new capability
                                unlocked → pricing review for new feature
                                component or tier change
New competitor pricing move      VP Sales escalates; 2-week review;
                                CFO + CEO decision
CPI threshold breach             CFO prepares renewal price escalation
                                schedule for affected contracts
New geographic market entry      CFO + VP Sales review: regional pricing
  (per K2 §3)                   adjustments (purchasing power parity,
                                local competitor pricing)
Pack GA (J1..J5 expansion)      K1 §5 add-on band reviewed + published
```

---

## 17. Regional pricing adjustments

HESEM operates across geographies with significantly different purchasing
power and competitive pricing dynamics. The base pricing in §4 reflects
USD/global reference. Regional adjustments are applied via tenant_pricing_override
records with CFO approval.

```
REGION              ADJUSTMENT PRINCIPLE           FLOOR
Vietnam/SEA         Purchasing power parity;        Core floor not
(Year 1-2 primary   40-60% discount to USD          discounted below
market)             reference for Core/Pro;          cost+ 30%
                    Enterprise pricing per deal

Northeast Asia      70-80% of USD reference         Core floor maintained
(Japan/Korea;       for Core/Pro; Enterprise
Year 2-3)           per deal

North America       USD reference (baseline)         No adjustment
(Year 2-4)

EU                  EUR at approximately USD         Per EU pricing
(Year 3-5)          parity (1:1 EUR:USD              regulation compliance
                    approach); adjust for            (no price
                    local competitor                 discrimination
                    positioning                      within EU)

India               40-50% of USD reference          Cost+ 30% floor;
(Year 4+)           for Core; Pro/Enterprise         Enterprise per deal
                    per deal

MENA / LatAm        50-60% of USD reference          Cost+ 30% floor
(Year 4+)           for Core; negotiated
                    above Pro
```

Regional pricing is maintained as override records tied to tenant
country_code. It is never embedded in product code.

---

## 18. Implementation quality and pricing integrity

### 18.1 Implementation revenue recognition

```
ITEM                           RECOGNITION METHOD
Fixed-scope implementation     Percentage-of-completion (milestone
                               achievement) per GAAP ASC 606
T&M professional services      As delivered (monthly billing)
                               per actual hours × rate card
Pilot fee                      Recognized over pilot duration;
                               non-refundable unless HESEM breach
Training (per cohort)          At delivery date
CVLP delivery (Pro+)           Bundled with subscription (allocated
                               per standalone selling price)
```

### 18.2 Pricing integrity controls

```
CONTROL                        MECHANISM
Anti-bundling protection       Pricing-as-data audit: no feature
                               included in incorrect tier without
                               CFO approval
Override audit log             All tenant_pricing_override records
                               reviewed monthly; outliers flagged
Floor enforcement              Gateway pricing layer enforces minimum
                               (cannot go below floor in pricing data)
Rep accountability             Discount depth per rep tracked; outlier
                               reps flagged quarterly
Contract-pricing alignment     Legal review: Order Form price must
                               match CRM opportunity price; discrepancies
                               blocked at contract signing stage
Revenue leak detection         Finance audit: billed vs contracted;
                               quarterly reconciliation
```

---

## 19. Sales compensation model

Sales compensation must reinforce the commercial model. Misaligned
compensation creates adverse commercial behavior (discounting to close
at the expense of quality, over-promising features, or churning logo
count at low ACV).

### 19.1 Quota and OTE structure

```
ROLE                  QUOTA BASIS                   OTE SPLIT
Account Executive     Annual Quota: new ARR          60% base / 40% variable
  (Enterprise)        Quota: $3M – $10M new ARR      Accelerators above 100%:
                      Commission: 8-12% of ARR        1.5× above 100%; 2×
                                                      above 130%
Account Executive     Annual Quota: new ARR          60% base / 40% variable
  (Mid-market)        Quota: $1M – $3M new ARR       Accelerators above 100%:
                      Commission: 10-15% of ARR       1.5× above 100%; 2×
                                                      above 130%
Customer Success Mgr  Renewal + expansion NRR        70% base / 30% variable
                      Commission on expansion         5-8% of expansion ARR
Account Manager       Renewal GRR + expansion        70% base / 30% variable
  (Commercial)        Commission on renewal +         3-5% of renewal ARR
                      expansion
Sales Development     Qualified pipeline created     75% base / 25% variable
  (SDR)               MQL → SQL conversion            Per-SQL bonus + AE
                      rate target ≥ 30%               closed-won bonus
```

### 19.2 Compensation guardrails

```
GUARDRAIL              MECHANISM                    ENFORCEMENT
No clawback-avoidance  Commission earned at close;  Finance: churn within
                       clawback if churn within      12 months triggers
                       first 12 months (ratable)     ratable clawback
Discount depth cap     Commission reduced 50% on     Automated in CRM:
                       deals >25% discount           discount > threshold
                                                     flags commission
                                                     reduction
Multi-year bonus       1.0× multiplier for 2-year   Automatic in CRM
                       prepay; 1.2× for 3-year
Implementation attach  Bonus for implementation      Per-quarter: $2K
  bonus                ARR above quota               bonus per impl deal
                       attach rate ≥ 70%             above 70% attach
NRR component          Q4 bonus tied to team NRR      Company-wide; VP
  (team-wide)          ≥ 110% (Pro) or ≥ 115%         CS owns metric
                       (Enterprise)
```

---

## 20. Customer economic model (value quantification)

HESEM's commercial model is more defensible when customers can quantify
the economic return. CSMs and AEs use this framework in business case
conversations.

### 20.1 Cost categories HESEM reduces

```
COST CATEGORY                  HESEM IMPACT                 ESTIMATE
External validation cost       CVLP per H2 §14 reduces       40-60% reduction
  (IQ/OQ/PQ, RTM, GAMP 5       customer-side validation       in external
  Cat 4-5 validation)          effort per release             validation cost

Audit preparation cost         Pre-built audit pack export   50-80% reduction
  (manual record gathering      reduces manual prep time       in audit prep
  before FDA / NB / IATF        from weeks to hours            labor hours
  audit)

NC/CAPA cycle time             AI-powered NC clustering      20-40% faster
  (root cause, CAPA open        (AI-01) and automated          CAPA closure
  time, re-occurrence rate)     CAPA routing (AI-02)

Recall / mock recall cost      FSMA §204 traceability        50-90% faster
  (traceability gap;            (J5 + AR-J5-028) reduces      lot trace
  manual lot trace)             manual lot trace time          queries

Regulatory submission cost     AI-assisted PSUR (AI-21),    30-50% reduction
  (PSUR drafting, APR,          APR generation (AI-11),       in authoring
  510(k) dossier prep)          CAPA root-cause drafting       labor cost

System landscape               Replacement of 3-7 point       60-80% reduction
  consolidation                 solutions (QMS, MES,           in IT license
  (licensing + integration      document management,           cost on
  cost reduction)               training, maintenance)         replaced systems

Engineering change              ECO workflow (per planning     30-50% faster
  velocity                      domain) + AI-assisted          ECO cycle time
                                impact analysis (AI-05)        (design to release)
```

### 20.2 Customer ROI model inputs (per AE/CSM)

```
INPUT                          SOURCE
Current validation spend       Customer's current budget for validation
  per release cycle             consultants + internal validation team
Number of audits per year      Per customer regulatory calendar
  (internal + external)
Current NC/CAPA open time      Quality metrics (CSAT, audit finding rate)
Manual lot trace time          Current trace procedure time per lot query
Number of systems being        IT landscape (QMS + MES + MOM + training
  replaced by HESEM            + document management + etc.)
Annual system licensing cost   Total cost of replaced systems
Current FTE count in quality   Quality team headcount (for labor savings)
  + manufacturing IT
```

---

## 21. SLA credit detail

Credits are calculated and applied automatically. Tenants can view
credit status in the billing dashboard at any time.

### 21.1 Credit calculation

```
SLA BREACH                     CREDIT FORMULA
Monthly availability breach:
  99.5% → 99.0% (Core)         10% of monthly subscription fee
  <99.0% → 98.5% (Core)        20% of monthly subscription fee
  <98.5% (Core)                30% of monthly subscription fee (cap)
  99.9% → 99.5% (Pro)          10% of monthly subscription fee
  <99.5% → 99.0% (Pro)         20% of monthly subscription fee
  <99.0% (Pro)                 30% of monthly subscription fee (cap)
  99.95% → 99.5% (Enterprise)  10% of monthly subscription fee
  <99.5% (Enterprise)          30% of monthly subscription fee (cap)

Latency SLA breach (p95):
  >2× SLA threshold sustained  10% of monthly subscription fee
  for ≥ 1 hour                 (per verified incident per month)

AI advisory response breach:
  >5× declared latency          5% of monthly AI usage component fee
  sustained ≥ 30 min            (per verified incident)
```

### 21.2 Credit process

```
STEP 1    Automated SLA monitoring detects breach (per M5 SLO alerts)
STEP 2    Incident declared; RCA opened (per I3 §3)
STEP 3    Post-incident report published to tenant within 72h (P0/P1)
          or 5 business days (P2/P3)
STEP 4    Credit calculated automatically based on breach duration
          and tier credit formula above
STEP 5    Credit posted to tenant billing account within next
          billing cycle; tenant notified via CSM
STEP 6    Credit applied as reduction to next invoice
          (or refund if tenant terminates within credit period)
```

Credits cannot exceed 30% of monthly subscription fee. They do not
apply to implementation revenue or usage overage components. Sovereign
tier credit terms are per agreement.

The credit mechanism is designed to be proactive rather than
adversarial. CSMs notify tenants of any credits before the next
invoice rather than waiting for tenants to raise disputes. This
proactive approach is part of the trust-building posture with regulated
customers who face their own regulatory scrutiny if they cannot
demonstrate vendor accountability.

---

## 23. Failure modes (pricing)

```
FM-K1-01  Pricing tier config data out of sync with product behavior
  Effect: tenant billed for tier X but receives tier Y capability;
    regulatory exposure if higher pack capability included in lower tier.
  Detection: monthly billing reconciliation; pricing audit.
  Mitigation: pricing-as-data; gateway enforces tier at API layer;
    automated tier compliance test in CI.

FM-K1-02  Implementation underpricing creates margin erosion
  Effect: T&M projects billed below cost; cash drain on engineering.
  Detection: quarterly T&M project profitability review.
  Mitigation: rate card floor enforcement; implementation scoping
    discipline (SOW sign-off before work begins).

FM-K1-03  Usage metering gap (un-metered AI calls)
  Effect: AI usage above envelope not billed; revenue leak.
  Detection: AI usage audit vs billing data monthly.
  Mitigation: every AI feature in L2 has a declared meter type;
    pricing_usage_event logged for every call above envelope.

FM-K1-04  Per-tenant override not time-bounded
  Effect: pilot-era discount persists indefinitely; revenue leak.
  Detection: quarterly override audit; expiry check.
  Mitigation: all overrides require expiry date; renewal workflow
    prompts override review.

FM-K1-05  Competitive deal discount below gross margin floor
  Effect: deal closes at negative margin; cash drain.
  Detection: deal approval workflow; CFO floor enforcement.
  Mitigation: gateway pricing floor in CRM; deal approval matrix
    per §12.

FM-K1-06  Pack add-on activated without full pack capability delivered
  Effect: tenant charged for pack features not yet deployed;
    customer satisfaction risk + refund risk.
  Detection: wave delivery gate vs commercial activation check.
  Mitigation: commercial team cannot activate pack billing until
    wave delivery gate for that pack is confirmed by engineering.
```

---

## 24. Competitive deal dynamics

When competing against established vendors, the following disciplines
apply to preserve pricing integrity while winning competitive deals.

### 24.1 Competitive displacement plays

```
COMPETITOR           DISPLACEMENT LEVER             PRICING POSTURE
Veeva Vault QMS      Unified platform (ERP+MOM+      Do not match Veeva
                     MES+QMS) vs QMS-only. Lower      premium pricing;
                     year-1 TCO when counting         price at 60-70% of
                     eliminated point solutions.       Veeva for pure QMS
                                                       scope; win on TCO.

MasterControl        Speed of onboarding (CVLP);      Match MasterControl
                     AI features depth;                mid-market price;
                     better validation support.        win on capability.

IFS / QAD            Deeper eQMS + regulated          Price parity with
                     workflow; better vertical          IFS/QAD for
                     pack compliance.                  comparable ERP
                                                       scope; add pack
                                                       value on top.

ETQ / AssurX         Full platform vs QMS-only;        Price at 1.2-1.5×
                     AI advisory as differentiator.     ETQ/AssurX for
                                                        comparable scope
                                                        (justify with
                                                        platform breadth).
```

### 24.2 Competitive pricing floor rules

When competing, commercial teams must not price below the tier gross
margin floor (Core ≥45%, Pro ≥55%, Enterprise ≥60%) regardless of
competitive pressure. Winning a deal at negative margin is not a win —
it creates a liability and sets a precedent for the renewal cycle.

If a competitor deal cannot be won at margin floor, the recommended
approach is a structured pilot (Pilot tier) with defined success criteria.
A pilot at $50-150K that converts at ≥60% rate is preferable to a
full-term deal priced below floor.

### 24.3 Anti-discount disciplines

```
PROHIBITED PRACTICES:
  - Offering features from a higher tier at a lower tier price to
    close a deal without CFO approval (tier contamination)
  - Committing to a future feature delivery date outside the wave plan
    as a commercial condition (pre-selling undelivered waves)
  - Activating a pack billing component before the pack is
    delivered (charging for undelivered capability)
  - Discounting implementation to zero to get subscription ARR
    (devalues professional services and sets precedent)
  - Agreeing to pricing that cannot be renewed at market rate
    because the initial discount was too deep
```

---

## 25. RACI

```
RESPONSIBLE:
  CFO — owns the pricing model, rate card, tier definitions, and
  discount policy. Approves all H7 Class A changes. Reviews
  commercial KPIs quarterly.

  VP Sales — owns deal economics, discount depth tracking, and
  competitive positioning in active deals. Enforces compensation
  guardrails. Escalates to CFO for deals > 25% discount.

  Product Lead — owns the capability-to-tier mapping. Confirms
  wave delivery gating before commercial pack activation. Maintains
  the pricing-as-data schema in alignment with product roadmap.

ACCOUNTABLE:
  CEO — final sign-off on pricing policy changes, new tier creation,
  and deals > 30% discount. Board notification for material ARR
  impact changes.

CONSULTED:
  VP Engineering — confirms wave delivery timeline before commercial
  commitment. Advises on capacity envelope per tier (I5/I6 alignment).
  Legal — reviews MSA, DPA, and pack addendum for new customer segments
  or new jurisdictions. Confirms regulatory commitments in contract are
  deliverable.
  Compliance Lead — reviews pack addendum regulatory commitments;
  confirms CVLP delivery terms are aligned with H2 §14.

INFORMED:
  VP Customer Success — receives commercial KPI reports monthly; informed of
  pricing changes that affect renewal conversations and CSM playbooks and scripts.
  Board / Investors — quarterly ARR by tier; NRR; GRR; unit economics
  vs targets; material pricing policy changes reported immediately.
```

---

## 26. Decision phrase

```
K1_PRICING_AND_TIERS_V10_LOCKED
NEXT: K2_GO_TO_MARKET.md
```
