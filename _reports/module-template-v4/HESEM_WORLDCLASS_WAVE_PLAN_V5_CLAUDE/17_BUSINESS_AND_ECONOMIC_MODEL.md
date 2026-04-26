# 17_BUSINESS_AND_ECONOMIC_MODEL.md

## Purpose

GPT Pro V4 does not address the business model, pricing, unit economics, or funding/cash-flow trajectory of a HESEM-class platform. World-class engineering without an economically sustainable business is a research project.

V5 produces the business model + economic substance.

---

## Section 1 — Market positioning

### 1.1 Comparable platforms (and their positioning)

```text
SAP S/4 HANA               full-stack ERP+SCM+QM         enterprise; high TCO; heavy
                                                          implementation
Oracle Cloud SCM + ERP     similar to SAP                similar
Veeva Vault                                              eQMS for life sciences
                                                          (regulated SaaS)
Siemens Opcenter           MES + APS focus               manufacturing
PTC Windchill              PLM focus                     engineering data
ETQ Reliance               eQMS                          quality-only depth
MasterControl              eQMS                          quality-only depth
Plex (Rockwell)            cloud manufacturing           SMB-MDM focus
QAD                        ERP for manufacturing         mid-market
Aptean                     industry-specific ERPs        niche
Tulip                      manufacturing apps platform   shop-floor
HighByte                   industrial DataOps            data only
```

### 1.2 HESEM positioning

```text
ONE platform combining:
  ERP + MOM + MES + eQMS + supply chain + quality + maintenance + analytics
  with pre-built vertical packs (Pharma, Auto, Aero)

Differentiators:
  - Operational Truth Graph (single source of truth across domains)
  - Three-stage slice graduation discipline (verifiable maturity)
  - Per-vertical compliance evidence pre-built
  - AI advisory framework with NIST AI RMF + RULE-2 enforcement
  - Modern engineering substrate (OpenTelemetry, RFC 9457, OpenAPI 3.1.1)
  - Audit-ready output by default (audit pack + DSAR + SOC 2)
  - Cost-aware per-tenant SLA (predictable economics)
  - Open-standard-first (OPC UA, ISA-95, ICH, IATF) — not proprietary lock-in
```

### 1.3 Target customers

```text
Primary (Wave 8-10):
  - mid-market manufacturers ($50M-$5B revenue) seeking to replace fragmented stack
  - regulated manufacturers (Pharma, Auto Tier 1-2, Aero) seeking consolidation
  - growth-stage manufacturers (private-equity-owned, scaling)
  
Secondary (post-Wave 10):
  - large enterprise replacements (multi-year displacement projects)
  - SMB (smaller manufacturers via simplified entry tier)
  
Geographic priority:
  - Vietnam (founder home; pilot market)
  - Southeast Asia (regional expansion)
  - Japan + Korea (manufacturing density; high standards)
  - North America (largest TAM)
  - EU (GDPR + MDR-driven demand)
```

---

## Section 2 — Pricing model

### 2.1 Tiers

```text
HESEM Core             $X/user/month + $Y/tenant/month base
                       Wave 1-7 features
                       1 tenant
                       fair-use API
                       community support

HESEM Professional     $XX/user/month + $YYY/tenant/month base
                       Wave 1-8 features
                       multi-tenant capable
                       SLA-backed support
                       customer success manager

HESEM Enterprise       custom pricing
                       all waves + vertical packs
                       dedicated tenant or VPC
                       enterprise SLA (99.95%)
                       FedRAMP / ITAR / GDPR-region deployments
                       customer-validation leverage pack
                       dedicated CSM + TAM (technical account manager)

HESEM Vertical Add-Ons per pack: $ZZZ/tenant/month
                       Pharma pack
                       Auto pack
                       Aero pack
                       (each add-on includes vertical-specific features + audit pack)
```

### 2.2 Usage-based components

```text
- API call overage:        flat per million above quota
- ML advisory call:        per call (low cost; visible in invoice)
- storage overage:         per TB-month above quota
- AI features (RAG, draft): per 1000 calls or per token
- specialty connectors:    per connector per month (Salesforce, SAP S/4, etc.)
- custom training:         per model trained
```

### 2.3 Implementation revenue

```text
- onboarding implementation: time + materials (typical $50k-$500k)
- vertical pack adoption:    fixed (typical $25k-$100k)
- custom workflow dev:        per project
- training:                   per cohort
- audit support:              per audit
```

V5 ADR-0264: Pricing model with tier + add-on + usage-based + implementation.

---

## Section 3 — Unit economics

### 3.1 Cost structure (rough)

```text
COGS:
  cloud infra (compute + storage + network)   25-35% of revenue
  third-party SaaS (Cloudflare, Sentry, etc.)  3-5%
  managed DBs / services                       5-10%
  ML inference (GPU when applicable)           1-3%
  
Gross margin: 50-65% (typical for B2B SaaS)

OpEx:
  R&D                                          30-40% of revenue
  Sales + Marketing                            20-30% (early); 15-20% (mature)
  G&A                                          10-15%
  Customer Success                             5-10%
```

### 3.2 Per-customer economics

```text
Mid-market customer (1500 users):
  ARR:                                         $750k - $2.5M
  Implementation revenue (year 1):             $200k - $800k
  Onboarding cost (HESEM):                     $100k - $400k
  Steady-state cost-to-serve (HESEM):          $30k - $80k/year
  Steady-state gross margin:                   65-75%
  CAC payback:                                 12-24 months
  Net Revenue Retention (NRR) target:           > 110%

Enterprise (10k users + multi-pack):
  ARR:                                         $5M - $30M
  Implementation revenue:                       $1M - $5M
  CAC payback:                                  18-30 months
  NRR target:                                   > 115%
```

### 3.3 Cost-of-quality SLO

V5 commits to a per-tenant cost SLO:

```text
- 95th percentile cost-per-user-per-month within band
- if cost exceeds SLA: HESEM absorbs (engineering investment to reduce)
- prevents tenant gaming via expensive-query overuse (rate limits)
```

V5 ADR-0265: Per-tenant cost SLO + engineering absorption commitment.

---

## Section 4 — Market sizing (TAM / SAM / SOM)

### 4.1 Methodology

```text
TAM (Total Addressable):  global manufacturing software market
SAM (Serviceable Addressable): markets HESEM can serve given language, 
                                geography, regulatory readiness, vertical packs
SOM (Serviceable Obtainable): realistic 5-year capture given GTM, 
                              competitive position, sales capacity
```

### 4.2 Sizing (rough order of magnitude)

```text
Global manufacturing software TAM:     $80-120B (2024)
  ERP for manufacturing:                $30-40B
  MES + MOM:                            $10-15B
  eQMS:                                  $3-5B
  SCM:                                  $20-30B
  CMMS / EAM:                            $5-8B
  PLM:                                  $10-15B
  
Growth: 8-12% CAGR (digital transformation, regulated complexity)

SAM (post-Wave 10):                    $25-40B
  - regions: SEA + JP/KR + NA + EU
  - vertical: Pharma + Auto + Aero verticals (which have ~$10-15B QM/MES alone)

SOM (5-year aspiration):               $200M-$1B ARR
  - market share: 0.5-2% of SAM
  - assumes enterprise GTM + vertical specialization
```

### 4.3 Why HESEM can compete

```text
Existing platforms have:
  - high TCO (license + implementation + ops)
  - long implementation cycles (1-3 years)
  - poor user experience (legacy UI)
  - vendor lock-in
  - per-vertical separate products (need 3+ vendors for ERP+MES+QM)
  - difficult upgrade paths

HESEM offers:
  - lower TCO (cloud-native, modern stack, fewer vendors)
  - faster implementation (slice-based deployment, vertical packs)
  - modern UX (HMV4 design system)
  - open standards (no lock-in)
  - one platform (one vendor for ERP+MES+QM+SCM)
  - continuous deployment (rolling updates)
```

---

## Section 5 — GTM (Go-to-Market) strategy

### 5.1 Land-and-expand

```text
Land:    a small slice deployed within 4-8 weeks (e.g., eQMS for Pharma)
         with mid-market pilot
Expand:  add modules (MES depth, supply chain) over 6-12 months
Multiply: add tenants in same group / industry network
```

### 5.2 Sales motion

```text
Inbound (mid-market):
  - content marketing (regulatory whitepapers, calculators)
  - SEO for compliance + manufacturing terms
  - free assessment tools (e.g., "How ready is your QMS for IATF audit?")
  
Outbound (enterprise):
  - account-based marketing
  - vertical-specific events (Pharma trade shows, IATF events)
  - partner channel (consulting firms with vertical expertise)

Self-serve (Core tier; future):
  - free trial with HMV4 prototype
  - guided onboarding with partner-led implementation option
```

### 5.3 Partner ecosystem

```text
Implementation partners:
  - Big 4 + manufacturing-specialty consultancies
  - regional SIs in SEA/Asia
  
Technology partners:
  - cloud providers (AWS, Azure, GCP)
  - PLM vendors (PTC, Siemens) — connectors
  - CRM (Salesforce) — connectors
  - data + observability (Snowflake, Datadog, etc.)
  
Connector partners:
  - per-platform certified connector (8 pre-built; W9 stream 9L)
```

V5 ADR-0266: Partner ecosystem strategy + connector certification program.

---

## Section 6 — Funding model

### 6.1 Stages

```text
Seed:              ~$2-5M    (pre-Wave-0; assemble core team)
Series A:         ~$10-20M  (post-Wave 1-3; 3-5 reference customers)
Series B:         ~$30-60M  (post-Wave 4-6; 10-20 customers; vertical pack 1)
Series C:         ~$80-150M (post-Wave 8; 50+ customers; multi-vertical)
Pre-IPO / Late:   ~$200M+   (multi-region; $100M+ ARR)
```

### 6.2 Capital deployment per round

```text
Seed:        team build, prototype, initial waves
Series A:    Wave 1-4 + first pilot customers + GTM build
Series B:    Wave 4.5-6 + vertical pack 1 + scale GTM
Series C:    Wave 7-8 + multi-vertical + international expansion
```

### 6.3 Solo / bootstrap path

If solo founder with Codex/Claude augmentation:

```text
Phase 0 (months 1-12):     Wave 0-1 prototype (single founder + AI augmentation)
Phase 1 (months 12-24):    Wave 2-4 + first design partner (revenue $0-200k)
Phase 2 (months 24-36):    Wave 4-6 + 2-3 paid pilots (revenue $200k-1M)
Phase 3 (months 36-48):    raise Series A; hire team
```

---

## Section 7 — Cost engineering across waves

```text
Wave 0:     ~$50k                                    repo + CI + initial cloud
Wave 0.5:   ~$200k                                   platform substrate dev + 
                                                      initial OTel/Prom/Loki/Jaeger
Wave 1-3:   ~$500k-$1M                               18 root buildout
Wave 4:     ~$300k                                   live API + adapters
Wave 4.5:   ~$200k                                   OTG cutover engineering
Wave 5-6:   ~$500k                                   transactional + digital thread
Wave 6.5:   ~$200k                                   AI advisory rollout
Wave 7:     ~$1M-$2M                                 ML platform + 5 features
Wave 8:     ~$1M-$2M                                 hardening + SOC 2 + DR
Wave 9:     ~$2M-$5M                                 multi-tenancy + portals + GraphQL
Wave 10:    ~$5M-$10M                                vertical packs + connectors + 
                                                      MES depth + finance core
                                                      
Cumulative through Wave 10:                          $11M-$25M total dev cost

Plus operating cost per year:
  Wave 0-3:     ~$50k/yr
  Wave 4-6:    ~$200k/yr
  Wave 7-8:    ~$500k/yr
  Wave 9-10:   ~$1M+/yr (multi-region, multi-tenant scale)
```

---

## Section 8 — Risk to economic model

```text
R-ECON-1   Underestimating CAC in regulated verticals
R-ECON-2   Implementation timeline blowing out (mid-market expects 3-6 months)
R-ECON-3   Vertical pack maturity gap (customer waits or churns)
R-ECON-4   Connector ecosystem slow to bootstrap
R-ECON-5   ML/AI promised but advisory feels weak (over-promise)
R-ECON-6   Pricing pressure from open-source alternatives
R-ECON-7   Vertical certification body delays (NADCAP, FDA)
R-ECON-8   Currency / FX risk for international expansion
R-ECON-9   Regulatory landscape change (EU AI Act enforcement, etc.)
R-ECON-10  Big-vendor incumbent reaction (price drops, feature parity)
```

V5 ADR-0267: Economic risk register tracked quarterly with mitigation.

---

## Section 9 — Pricing-as-data principle

```text
- pricing tiers, quotas, rate limits expressed as configuration data
- per-tenant overrides via ABAC obligation 'rate_limit_assert'
- no hardcoded pricing in product code
- enables fast iteration and per-customer custom deals
```

V5 ADR-0268: Pricing-as-data; no hardcoded pricing in product.

---

## Section 10 — Open source strategy

```text
HESEM core:                proprietary (commercial license)
HESEM SDK:                 Apache 2.0 (foster ecosystem)
HMV4 design system tokens: Apache 2.0 (interop demonstration)
Plugin SDK + connectors:   Apache 2.0 (encourage marketplace)
Sample integrations:       Apache 2.0
Standards extensions:      contribute back (e.g., ISA-95 enrichments to OAGi)

Forbidden:
  - GPL/AGPL ingestion into proprietary core
  - any license that requires source disclosure of HESEM core
```

V5 ADR-0269: Selective open-source strategy.

---

## Section 11 — Customer success metrics

```text
Time to first value (TTFV):                   < 30 days (Core); < 90 days (Pro/Ent)
Time to full deployment:                       3-6 months (mid-market); 12-18 (Ent)
Customer satisfaction (CSAT):                 ≥ 90%
Net Promoter Score (NPS):                     ≥ 50
Net Revenue Retention (NRR):                  ≥ 110% Ent; ≥ 105% Pro
Logo retention:                               ≥ 95%/yr
Implementation success rate:                  ≥ 90%
Customer audit-readiness rate:                100% (audit pack always available)
```

V5 ADR-0270: Customer success scorecard + quarterly review.

---

## Section 12 — Competitive intelligence

V5 platform monitors:

```text
- competitor feature releases (RSS / press)
- pricing changes (public lists)
- customer movements (lost / won deals)
- analyst reports (Gartner, Forrester, IDC)
- standards changes (FDA, ICH, IATF, AS) that change competitive landscape
- AI/ML advances that disrupt current cost structure
```

A quarterly competitive review informs roadmap.

---

## Section 13 — Why this matters

V4's plan is engineering-only. V5 adds the economic substrate that makes the engineering sustainable: a pricing model that scales, a GTM that lands and expands, a partner ecosystem that multiplies reach, a cost model that earns gross margin, a funding path that survives 5 years.

A world-class engineering plan without economics is a research curiosity. A world-class platform that ships and earns is a business.

---

## Section 14 — Cumulative ADRs

```text
ADR-0264  Pricing tier + add-on + usage + implementation model
ADR-0265  Per-tenant cost SLO + engineering absorption
ADR-0266  Partner ecosystem + connector certification
ADR-0267  Economic risk register
ADR-0268  Pricing-as-data
ADR-0269  Selective open-source strategy
ADR-0270  Customer success scorecard
```

---

## Decision phrase

```text
V5_BUSINESS_AND_ECONOMIC_MODEL_BASELINE_LOCKED
NEXT_FILE: 18_TEAM_TOPOLOGY_AND_DORA.md
```
