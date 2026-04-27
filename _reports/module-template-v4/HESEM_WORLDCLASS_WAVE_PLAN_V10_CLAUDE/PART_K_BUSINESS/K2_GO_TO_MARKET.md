# K2 — Go-to-Market (V10)

```
chapter_id:     K2
version:        V10
owner_role:     CEO + VP Sales + Marketing Lead
wave_target:    read before first pilot customer engagement; reviewed
                at each geographic expansion decision; updated at
                each funding stage
dependencies:   K1 (tier model + pricing), J0..J5 (vertical packs +
                regulatory landscape per pack), K3 (partner channels),
                K4 (funding-GTM alignment), K5 (customer metrics),
                I8 §5 (QBR cadence driving expansion)
sources:        Geoffrey Moore Crossing the Chasm + Inside the Tornado;
                Brad Feld Startup Communities; Jason Lemkin SaaStr
                enterprise SaaS playbook; Andy Raskin strategic narrative;
                ProductLed GTM for self-serve motion
```

Go-to-market is not the story HESEM tells about itself — it is the
mechanism by which a target customer who has the right regulatory
pressure and the right budget finds HESEM, evaluates it, buys it,
and expands. Every element of K2 is designed around that customer
journey rather than around HESEM's self-image.

The fundamental GTM hypothesis: regulated manufacturers face increasing
regulatory complexity (EU AI Act, FSMA §204 enforcement, EU MDR
transition, IATF 16949 OEM CSR pressure) that their existing point-solution
landscapes cannot address cost-effectively. HESEM is the only platform
that unifies ERP + MOM + MES + eQMS + AI into a single evidence-chain
system validated for regulatory audit. Customers who understand this
proposition close at high rates and expand predictably.

The GTM strategy is therefore built on two disciplines: generating
enough conversations with buyers who face this regulatory pressure,
and converting those conversations through a consultative sales process
that quantifies the cost of the current landscape versus HESEM. The
consultative process works because HESEM's implementation team can
produce a credible current-state cost model using industry benchmarks
for validation, audit preparation, and point-solution licensing. The
ROI case is not speculative — it is grounded in the buyer's own data
once discovery is complete. Buyers who see their own numbers are far
more likely to convert and far less likely to churn in Year 1.

This chapter does not contain marketing aspiration. Every claim about
a channel, a motion, or a metric is operationally grounded: it has
an owner, a measurement method, and an escalation path if the metric
misses target. GTM without operational discipline produces pipeline
that does not convert and customers that churn. HESEM's GTM is designed
to convert and retain because the product delivers on what the GTM
motion promises — and because the GTM motion is honest about what the
product is (pre-production prototype that becomes regulated enterprise
software through the wave plan).

---

## 1. The land-and-expand-multiply-deepen-recontract motion

HESEM's commercial motion has five distinct phases, each with a
different playbook, team composition, and success metric.

### 1.1 LAND

```
DEFINITION:   Deploy a defined slice of HESEM capability within a
              customer's most regulated workflow within 90 days of
              contract signing.

TARGET:       Time to first value (TTFV) ≤ 30 days for Core;
              ≤ 90 days for Pro/Enterprise.
              Pilot conversion rate ≥ 60%.

TACTICS:
  - Start with the Pilot tier (per K1 §1) for Enterprise prospects
    who need a defined success period before full commitment
  - Use pre-built CVLP artifacts (H2 §14) to reduce customer-side
    validation burden in the first 90 days
  - Assign implementation specialist from day 1 for Pro/Enterprise
  - Define explicit success criteria before pilot starts; document in
    SOW; create the reference-ready proof at day 90

LAND SELECTION CRITERIA (by priority):
  - Customer has active regulatory audit pressure in 12-month horizon
  - Customer is replacing ≥2 point solutions (quantifiable ROI)
  - Customer has a Quality Director or PRRC as internal champion
  - Customer has budget authority and procurement timeline < 6 months
  - Customer operates in a pack vertical where HESEM has at least one
    reference customer (reduces first-in-vertical risk)
```

### 1.2 EXPAND

```
DEFINITION:   Add modules, users, and workflow scope within the same
              tenant over 6-18 months post-land.

TARGET:       Per-module expansion rate ≥ 30% within 12 months.
              User count growth ≥ 20% within 12 months.

TACTICS:
  - Health score monitoring (K5 §8) identifies expansion-ready tenants
  - QBR cadence (I8 §5) surfaces expansion opportunities quarterly
  - CSM-led expansion playbook: show NRR impact of modules not yet
    deployed; quantify evidence-chain gaps in the current deployment
  - Integration density as expansion hook: each new integration
    (ERP connector, PLM connector) adds value to existing modules
    and creates new workflow automation opportunities

EXPANSION TRIGGER THRESHOLDS:
  - User count within 80% of tier limit → tier upgrade conversation
  - Second facility onboarded → multi-facility scope expansion
  - Audit preparation manual labor reported by tenant → audit pack
    expansion conversation
  - AI advisory adoption rate ≥ 30% → Tier-2 AI feature conversation
```

### 1.3 MULTIPLY

```
DEFINITION:   Acquire new tenants within the same industry group,
              supply chain, or OEM network as an existing customer.

TARGET:       Reference-driven new logo rate ≥ 25% of new closes
              within 24 months of reference customer go-live.

TACTICS:
  - Signed reference customer as anchor for in-network GTM
  - OEM supplier portfolio approach (per K2 §4): if tenant is a
    Tier-1 supplier to Toyota, approach other Toyota Tier-1s
  - Industry user group (quarterly) generates peer-to-peer selling
  - Case study publishing per pack (see §6 reference program)
  - Conference presence at industry-specific events (per §7)
```

### 1.4 DEEPEN

```
DEFINITION:   Expand an existing tenant to additional geographies,
              additional packs, or sovereign cloud capability.

TARGET:       Multi-region expansion for Enterprise tenants in Year 2-3
              of relationship. Second pack adoption within 18 months.

TACTICS:
  - Geographic expansion: support tenant's own international growth
    by landing HESEM in each new jurisdiction (per K2 §3 regional
    motion per language per F12)
  - Cross-vertical expansion: if a Pharma tenant also has a medical
    device manufacturing unit, introduce J4 Med Device pack
  - Sovereign expansion: when tenant's regulatory situation demands
    data residency (ITAR, EU-only mandate), convert to Sovereign tier
```

### 1.5 RE-CONTRACT

```
DEFINITION:   Renew at higher ARR than the prior contract, reflecting
              the expanded scope and deepened integration of HESEM.

TARGET:       NRR ≥ 110% (Pro); ≥ 115% (Enterprise).
              GRR ≥ 95% logo retention.

TACTICS:
  - T-270 (Enterprise) or T-120 (Pro) engagement start (per K1 §13)
  - Health score as negotiation preparation: high-health tenants
    renew at premium; low-health tenants get intervention before
    renewal to prevent churn
  - CPI-indexed automatic escalation (per K1 §13.2) prevents revenue
    erosion without contentious negotiation
  - Multi-year prepay incentive (per K1 §12) converts renewal risk
    into 3-5 year commitment
  - Capability delivery review: CSM presents modules delivered in
    prior period vs contracted; demonstrates ROI trajectory
```

---

## 2. Sales channels (5 channels)

### 2.1 Inbound (mid-market)

The inbound channel serves Core and Pro tier prospects who discover
HESEM through content marketing, SEO, or referral from peers. These
prospects have self-identified the regulatory problem and are looking
for a solution.

```
TACTICS:
  Content marketing:
    - Regulatory whitepapers per pack (Pharma: "APR readiness with
      automated evidence chains"; Auto: "IATF 16949 audit prep";
      Food: "FSMA §204 traceability implementation guide")
    - ROI calculators: validation cost savings (CVLP), audit prep
      time reduction, NC/CAPA cycle time improvement
    - Readiness assessments: online tools that score a manufacturer's
      current regulatory posture and show the gap HESEM closes

  SEO and content:
    - Regulatory vocabulary per vertical (long-tail compliance terms
      in the vertical's language — "APR automation", "PPAP workflow",
      "FSMA §204 KDE records")
    - Localized content per region per language (per F12 i18n)
    - Technical blog (engineering decisions, architecture, compliance
      integration — builds technical credibility)

  Webinar program:
    - Monthly per-pack (Pharma, Auto, Aero, MD, Food alternating)
    - Per-regulator update (FDA final rule, EU MDR transition,
      IATF revision cycle, FSMA enforcement milestones)
    - Customer-led sessions: reference customer presents their
      deployment experience (most persuasive)

  Trial and demo:
    - Guided prototype demo (HMV4 pre-production surfaces per ADR-0001)
    - CVLP demo: show the validation artifact package a customer
      would receive per release
    - Pack-specific sandbox: configure a read-only sandbox to the
      prospect's pack and workflow scope
```

### 2.2 Outbound (enterprise)

The outbound channel targets Enterprise tier prospects who may not
yet be actively searching but who face the regulatory pressure that
HESEM addresses. This is primarily an account-based marketing (ABM)
motion.

```
TARGET PROFILE:
  - Director of Quality / VP Quality / QP / PRRC as primary contact
  - VP Manufacturing / Plant Manager as secondary champion
  - CIO / CTO as procurement stakeholder
  - Companies with ≥ 500 manufacturing employees in a regulated vertical
  - Companies with recent regulatory citation or warning letter (FDA,
    NB, IATF audit finding) — high urgency

ABM TACTICS:
  - OEM supplier portfolio approach: identify Tier-1 and Tier-2 supplier
    networks per OEM (Toyota, BMW, Boeing, Airbus, J&J, Pfizer supply
    chains) and sequence outreach across the network
  - Regulatory trigger monitoring: track regulatory calendar per vertical
    (IATF revision, MDR transition, FSMA §204 enforcement dates) and
    time outreach to precede deadlines
  - Industry event attendance: in-person meetings at trade shows and
    conferences per §7
  - LinkedIn ABM: targeted content per vertical per job title;
    direct outreach by AEs after content engagement

OUTREACH SEQUENCE:
  Week 1: value-add content share (regulatory whitepaper for their vertical)
  Week 2: case study relevant to their industry
  Week 3: ROI calculator specific to their company size and vertical
  Week 4: meeting request with specific regulatory-pressure hook
  Week 6 (no response): VP-level outreach
  Week 8 (no response): partner introduction if applicable
```

### 2.3 Self-serve (Core tier; future)

Self-serve is a future channel targeting Core tier and SMB customers
who want to evaluate and adopt HESEM without a sales-assisted process.

```
READINESS:   Not available in pre-production posture (ADR-0001).
             Target: W10-W12 when Core tier modules reach sufficient
             stability and onboarding automation exists.

DESIGN:      - Free trial with guided onboarding (time-boxed, limited
               scope, fixture data only)
             - Partner-led implementation option for customers who
               want implementation support after self-serve land
             - Pre-built templates per pack (HARPC template for Food,
               IATF audit prep template for Auto) reduce time-to-value
             - In-app upgrade prompts when self-serve customer hits
               Core tier limits
             - Usage-based pricing (per K1 §6) compatible with
               self-serve billing
```

### 2.4 Referral channel

```
CUSTOMER REFERRAL PROGRAM:
  - Formal referral program with defined incentives (credits on
    subscription, conference speaking opportunities, co-marketing)
  - CSM tracks referral activity per tenant
  - High-NPS customers (NPS ≥ 70) invited to join referral program
    before being approached for external reference use

INDUSTRY INFLUENCER PROGRAM:
  - Per-pack thought leaders (Quality Directors, PRRC officers,
    Validation Engineers who publish or speak)
  - Advisory Board: 3-5 industry advisors per vertical who shape
    pack roadmap and provide credibility in sales cycles
  - Analyst relations: Gartner, Forrester, IDC; HESEM positioned in
    manufacturing SaaS categories once ARR/customer count qualifies

PEER NETWORK (CUSTOMER COMMUNITY):
  - Quarterly user group per region (virtual + in-person)
  - Annual user conference (target Year 3+)
  - Private community forum for sharing best practices per pack
```

### 2.5 Channel partners (per K3)

```
IMPLEMENTATION PARTNER CHANNEL:
  - Certified implementation partners (per K3 §1) sell and deliver
    HESEM in their customer relationships
  - Partner-led sales motion: partner owns the customer relationship;
    HESEM provides commercial terms and product support
  - Deal registration (per K3 §5) prevents partner conflict

RESELLER CHANNEL:
  - Resellers hold HESEM paper (MSA with HESEM); sell to end customer
    under their own agreement
  - Used primarily for geographic expansion where HESEM lacks direct
    presence (SEA expansion through local resellers)

TECHNOLOGY PARTNER REFERRALS:
  - Integration partners (Salesforce, SAP, PTC) refer HESEM to their
    customers when HESEM capability complements their stack
  - Mutual referral and co-marketing agreements per K3 §2
```

---

## 3. Geographic priority and per-region motion

### 3.1 Phase 1 — Vietnam foundation (Year 1-2)

```
MARKET:      Vietnamese domestic manufacturing; government-owned and
             private manufacturing; pharmaceutical (GMP-certified);
             electronics; food processing
REGULATORY:  Vietnamese Ministry of Health; MOH pharmaceutical GMP;
             Vietnam Food Safety Authority; domestic IATF-certified
             auto suppliers (Toyota Vietnam, Honda Vietnam supply chain)
LANGUAGE:    vi-VN native (HESEM baseline language per F12)
MOTION:      Founder-led; direct sales; government relationships;
             Vietnamese regulatory consulting partnerships
TARGET ARR:  $500K – $2M (Year 2); design-partner focused
```

### 3.2 Phase 2 — SEA expansion (Year 1-3)

```
MARKETS:     Indonesia (id-ID), Thailand (th-TH), Malaysia (ms-MY),
             Philippines (tl-PH), Singapore (English baseline)
REGULATORY:  ASEAN GMP harmonization (ASEAN Common Technical Dossier);
             BPOM (Indonesia), FDA Thailand, NPRA (Malaysia);
             PDEA Philippines; HSA Singapore
MOTION:      Local reseller partners + Tier-2 SI partnerships;
             ASEAN pharmaceutical industry associations;
             Singapore as regional HQ candidate
PRIORITY     Discrete manufacturing first (IATF-certified); then
  PACKS:     Pharma (ASEAN GMP); Food (FSMA-equivalent enforcement
             trend in SEA)
TARGET ARR:  $2M – $8M (Year 3)
```

### 3.3 Phase 3 — Northeast Asia (Year 2-3)

```
MARKETS:     Japan (ja-JP), South Korea (ko-KR)
REGULATORY:  Japan: PMDA (Pharma), MHLW (Medical Device);
             Korea: MFDS (Pharma + MD), KAMA (Automotive),
             KEPS (Aerospace)
MOTION:      Japanese: through established SI partnerships (NTT Data,
             Fujitsu, Hitachi Consulting); long sales cycles (18-24 mo);
             Korea: automotive Tier-1 and Tier-2 through KAMA network
PRIORITY     Japan: Pharma (PMDA alignment) + Auto (Toyota/Honda
  PACKS:     supply chain); Korea: Auto + MD
TARGET ARR:  $3M – $10M (Year 3-4)
```

### 3.4 Phase 4 — North America (Year 2-4)

```
MARKETS:     United States (en-US), Canada (en-CA, fr-CA)
REGULATORY:  FDA (Pharma, MD, Food); EPA (environmental adjacent);
             FAA/DOD (Aerospace ITAR/CMMC); NHTSA (Auto recall);
             Health Canada; CFIA (Food)
MOTION:      US: partner-led initially (Big-4 SI + specialty partners);
             FDA regulatory consulting partnerships;
             Canada: Quebec Pharma cluster; Ontario Auto Tier-1 network
PRIORITY     Pharma (FDA aligned); MD (510(k)/PMA); Food (FSMA §204
  PACKS:     enforcement urgency); Aero (ITAR/CMMC with Sovereign tier)
TARGET ARR:  $10M – $30M (Year 4)
```

### 3.5 Phase 5 — EU and ANZ (Year 3-5)

```
MARKETS:     Germany (de-DE), UK (en-GB), France (fr-FR),
             Switzerland, Netherlands, Scandinavia;
             Australia (en-AU), New Zealand (en-NZ)
REGULATORY:  EU MDR 2017/745; EU IVDR; EU GMP Annex 11; EU AI Act;
             TGA (Australia MD/Pharma); Medsafe (NZ)
MOTION:      EU: through Big-4 SI partnerships (EY, Deloitte) with
             manufacturing + life-sciences practices; German pharma +
             auto cluster; UK pharma (post-Brexit regulatory complexity
             creates differentiation opportunity);
             ANZ: partner-led with regional SIs; TGA alignment key
SPECIAL:     Sovereign EU variant (per W13) required for EU data
             residency customers; GDPR DPA framework critical
TARGET ARR:  $15M – $50M (Year 5)
```

### 3.6 Phase 6 — Additional markets (Year 4+)

```
MARKETS:     India (hi-IN), Latin America (es-MX, pt-BR),
             MENA (ar-SA), China (zh-CN; strategic)
MOTION:      India: partner-led; CDSCO Pharma + auto (India's
             growing Tier-2 auto sector);
             LatAm: reseller-led (Mexico auto cluster; Brazil Pharma);
             MENA: sovereign-adjacent (Gulf data residency requirements);
             China: only if regulatory and trade conditions allow;
             low priority until Year 4+
TARGET ARR:  $10M – $30M (Year 5-6)
```

---

## 4. Industry priority and per-pack motion

```
PRIORITY 1 — DISCRETE MANUFACTURING (Year 1)
  Entry point: eQMS (NC/CAPA + doc control + training matrix)
  Entry pack: Auto-light or MD-light
  Why first: largest addressable market; fastest TTFV; lowest
    regulatory friction; builds reference base for heavier packs
  GTM: IATF certification cycle (every 3 years) is a natural
    trigger; PPAP readiness calculator inbound tool

PRIORITY 2 — PHARMACEUTICAL (Year 1-2)
  Entry point: eQMS + APR workflow + DSCSA
  Entry pack: Pharma J1 (light: eQMS + APR)
  Why: Vietnamese pharma pilot creates first regulated reference;
    ASEAN GMP harmonization creates regional urgency; sterile
    injectable manufacturers have highest compliance cost per unit
  GTM: ICH Q10 readiness; FDA warning letter response teams;
    PSUR drafting differentiation; DSCSA 2024 enforcement

PRIORITY 3 — FOOD (Year 2-3)
  Entry point: HARPC + FSMA §204 traceability
  Entry pack: Food J5 (light then medium)
  Why: FSMA §204 enforcement deadlines (January 2026 for large
    businesses) create hard urgency; mid-market food manufacturers
    are underserved by QMS-only vendors
  GTM: FSMA §204 readiness tool (inbound); GFSI partner network;
    mock recall automation as primary differentiator

PRIORITY 4 — AUTOMOTIVE (Year 2)
  Entry point: IATF 16949 eQMS + PPAP
  Entry pack: Auto J2 (light then full OEM CSR)
  Why: per-OEM Tier-1 portfolio approach multiplies within supply
    chains; AIAG MSA and FMEA integration are quantifiable
    differentiators vs generic QMS tools
  GTM: OEM portfolio approach; PPAP-readiness calculator;
    IATF / VDA event presence

PRIORITY 5 — MED DEVICE (Year 2-3)
  Entry point: ISO 13485 eQMS + PMS
  Entry pack: MD J4 (Class II first)
  Why: Class II (510(k)) devices have lower validation cost and
    faster sales cycle than Class III (PMA); MDR transition in EU
    creates urgency for CE-marked manufacturers; IVDR transition
    for diagnostics
  GTM: Notified Body audit support; MDR transition urgency;
    PSUR / PMS differentiation; 15-year device lifecycle creates
    long-term retention

PRIORITY 6 — AEROSPACE (Year 3-4; opportunistic)
  Entry point: AS9100D eQMS; AS9120B distributor
  Entry pack: Aero J3 (lite: AS9100 eQMS; then defense track)
  Why: AS9120B distributor market is simpler than AS9100D OEM;
    ITAR defense market requires Sovereign tier; NADCAP accreditation
    is a differentiator; GIDEP integration is unique
  GTM: AIAA / SAE events; ITAR-cleared SI partnerships;
    NADCAP consultant network; defense prime → subcontractor motion
```

---

## 5. Pricing negotiation discipline

Sales negotiation is governed by the K1 discounting policy (§12)
and the following disciplines:

```
DISCOVERY     Identify tier, pack scope, user count, facility count,
              current point-solution landscape, regulatory calendar.
              Do not quote price until discovery is complete.
              Discovery output: tailored ROI model per §20 of K1.

POSITIONING   Lead with regulatory pressure + cost of status quo.
              Present HESEM ARPU vs cost of current landscape.
              Do not lead with features; lead with outcomes.
              Per K1 §11.2 positioning statements by buyer type.

PILOT         Offer Pilot tier for Enterprise prospects with >180d
              sales cycle. Define success criteria jointly. Pilot fee
              credited to first year. Convert ≥ 60% is the target.

CONTRACT      Per K1 §15 MSA structure. Standard terms; negotiate
              only on price (within discount policy), SLA tier,
              pack scope, and implementation SOW.
              Legal red-lines (DPA, liability, AI advisory disclaimer)
              are not negotiable without Compliance Lead + Legal approval.

MULTI-YEAR    Offer 3-year prepay incentive proactively in Enterprise
              deals. Multi-year commits reduce churn risk and create
              predictable cash flow. Per K1 §12 automatic discounts.

RENEWAL       Per K1 §13 engagement timeline. CPI-indexed default.
              No mid-term increase without customer sign-off.
              Health score determines negotiating posture: high-health
              tenant renews at market; low-health tenant receives
              recovery plan before renewal conversation.
```

---

## 6. Reference and case-study program

```
TIER 1 — DESIGN PARTNER REFERENCES (Year 1-2)
  5-7 design partner references per pack
  Each partner: signed reference agreement; case study rights;
  joint conference speaking; co-marketing.
  Reference criteria: ≥ 90 days live; NPS ≥ 70; at least one
  measurable outcome documented (audit pass, TTFV, cost saving)

TIER 2 — PUBLISHED CASE STUDIES (Year 2+)
  Quarterly per pack; regulatory-cleared (FDA/EMA/NB consent
  where applicable for regulated outcome claims)
  Format: problem → HESEM solution → measurable outcome
  Distribution: website; conference materials; analyst briefings

TIER 3 — PEER NETWORK REFERENCES (Year 2+)
  Customer community forum; quarterly user group
  Prospect can request peer conversation with a reference customer
  in their vertical and geography

ANALYST RELATIONS (Year 3+)
  Gartner Manufacturing SaaS report; Forrester MES/QMS Wave;
  IDC manufacturing software landscape
  HESEM positioned when ARR + customer count qualifies for inclusion
  ROI studies commissioned per vertical as analyst-validated proof point
```

---

## 7. Industry events calendar (per pack)

```
PACK            KEY EVENTS                              CADENCE
Pharma J1       PDA Annual Meeting (US);                Annual
                ISPE Annual Conference;
                Pharma Forum (EU);
                PIC/S training events (SEA)

Auto J2         AIAG Quality Summit;                    Annual
                VDA conference (DE);
                IATF IAQG annual meetings;
                SAE World Congress

Aero J3         SAE AeroTech Congress;                  Annual
                AIAA (US);
                GIDEP annual meeting;
                NADCAP annual supplier conference

MD J4           RAPS Annual Conference;                  Annual
                MDM West / East (US);
                Medtec Europe;
                FDA medical device workshop series

Food J5         Food Safety Tech (US);                  Annual
                GFSI conference;
                FMI supply chain conference;
                IFT Annual Food Science event

Cross-pack      Hannover Messe (manufacturing);          Annual
                Automatica;
                Manufacturing USA consortium events;
                HIMSS (adjacent for J4)
```

---

## 8. Customer success metrics (sales-side KPIs)

```
METRIC                      TARGET                  MEASUREMENT
Time to first value (TTFV)  ≤ 30 days (Core)        Per customer; CSM tracked
                            ≤ 90 days (Pro/Enterprise)
Pilot conversion rate       ≥ 60%                   Per cohort; quarterly
CSAT (post-onboarding)      ≥ 4.2 / 5.0              Per onboarding completion
NPS (steady state)          ≥ 50                    Quarterly per tenant
NRR (Net Revenue Retention) ≥ 110% (Pro)            Monthly; rolling 12-mo
                            ≥ 115% (Enterprise)
GRR (Gross Revenue          ≥ 95% logo retention    Monthly
  Retention)
Win rate (qualified opps)   ≥ 30%                   Per quarter; per AE
Average sales cycle         Core: 30-60 days         Per closed deal
                            Pro: 90-150 days
                            Enterprise: 180-365 days
Pipeline coverage           ≥ 4× quota               Weekly; sales dashboard
Per-pack expansion rate     ≥ 30% within 12 months  Per cohort; pack cohort
  (second pack, same tenant) of first pack go-live   tracking
SDR to AE handoff rate      ≥ 30% MQL → SQL          Per SDR; weekly
  (qualified conversion)     (SQL = scheduled demo
                              with right-level buyer)
```

---

## 9. Funding-GTM alignment (per K4)

GTM expenditure and team growth scale with funding stages. Under-funding
GTM before product-market fit is found wastes capital; over-investing
in GTM before operational readiness creates churn.

```
FUNDING STAGE     GTM INVESTMENT           PRIMARY MOTION
Pre-seed /        Founder-led sales only.  Direct outreach;
Bootstrap         0 dedicated sales hire.  pilot customer focus;
                  GTM spend: < $50K/yr.   Vietnam-first.

Seed ($2-5M)      First sales hire (AE).  Vietnam/SEA pilot closes;
                  Basic CRM + outreach.   first 3-5 paying customers;
                  GTM spend: $200-500K/yr. reference program starts.

Series A          3-5 AEs; 2 SDRs;        SEA + NE Asia expansion;
($10-20M)         1 Marketing Manager;     first outbound motion;
                  Channel program begins.  first partner closes;
                  GTM spend: $2-4M/yr.    content marketing launch.

Series B          8-12 AEs per region;    North America entry;
($30-60M)         4-6 SDRs; Marketing     OEM portfolio approach;
                  team 4-6; Partner Mgr.  first analyst relations;
                  GTM spend: $8-12M/yr.   US SI partnerships signed.

Series C          Full GTM org; VP Sales  EU expansion; full pack
($80-150M)        + VP Marketing;         suite GTM; Sovereign tier
                  Regional sales teams.   GTM; multi-language content.
                  GTM spend: $25-40M/yr.

Growth round      Enterprise sales team;  Late-stage enterprise;
($200M+)          Global partner org;     public sector/government;
                  Field engineering.      IPO readiness.
```

---

## 10. Per-pack go-to-market motion detail

### 10.1 Pharma J1

```
PRIMARY BUYER:      Quality Assurance Director / VP Quality / Qualified
                    Person (QP) / PRRC
PRIMARY TRIGGER:    Upcoming FDA inspection; Annex 11 compliance gap;
                    APR generation manual burden; PSUR submission
                    preparation; DSCSA compliance deadline
DIFFERENTIATORS:    PSUR AI drafting (AI-21); APR automation (AI-11);
                    DSCSA serialization events; Annex 11 audit chain;
                    CVLP reduces IQ/OQ/PQ cost by 40-60%
ENTRY POINT:        eQMS + APR workflow (J1 light pack);
                    upgrade path → DSCSA → PSUR → sterile full pack
PARTNERSHIP:        Pharma validation consulting firms; FDA regulatory
                    consultants; ISPE member network; PDA chapters
REFERENCE PROGRAM:  PSUR submission outcome; FDA inspection readiness;
                    DSCSA compliance milestone
```

### 10.2 Automotive J2

```
PRIMARY BUYER:      Director of Quality / VP Manufacturing / IATF
                    Management Representative
PRIMARY TRIGGER:    IATF 16949 recertification (3-year cycle);
                    OEM CSR update from customer; PPAP rejection;
                    AIAG FMEA revision compliance gap
DIFFERENTIATORS:    PPAP workflow automation; FMEA integration
                    (AI-05 impact analysis); OEM EDI connectivity;
                    IATF audit pack export in hours
ENTRY POINT:        eQMS + PPAP workflow (J2 light)
PARTNERSHIP:        IATF auditor network; VDA Quality Association;
                    OEM supplier portal integration partners
REFERENCE PROGRAM:  IATF re-certification pass; OEM audit clean score;
                    PPAP cycle time reduction
```

### 10.3 Med Device J4

```
PRIMARY BUYER:      Quality Management Representative / PRRC /
                    Regulatory Affairs Director
PRIMARY TRIGGER:    EU MDR transition (CE mark renewal); ISO 13485
                    recertification; FDA 510(k) in progress; PMS/PMCF
                    requirement from Notified Body
DIFFERENTIATORS:    PMS/PMCF workflow; PSUR/PMS reporting; vigilance
                    AI advisory (AI-19); EUDAMED/GUDID integration;
                    PCCP-compatible change management (H7)
ENTRY POINT:        ISO 13485 eQMS + PMS (J4 light; Class II first)
PARTNERSHIP:        Notified Body coordinators; ISO 13485 consulting
                    firms; MDR regulatory specialists
REFERENCE PROGRAM:  MDR surveillance audit outcome; Notified Body
                    inspection readiness; Class II 510(k) support
```

### 10.4 Aerospace J3

```
PRIMARY BUYER:      Quality Director / AS9100 Management Representative
                    / Export Control Officer (ITAR tenants)
PRIMARY TRIGGER:    AS9100 recertification; NADCAP accreditation
                    renewal; OEM counterfeit mitigation requirement;
                    CMMC Level 2/3 preparation (US defense)
DIFFERENTIATORS:    Counterfeit risk AI advisory (AI-18); GIDEP
                    integration; NADCAP audit chain; ITAR-clean
                    Sovereign tier; AS9102 FAI workflow
ENTRY POINT:        AS9120B distributor eQMS (simpler entry);
                    upgrade path → AS9100D OEM → NADCAP → defense
PARTNERSHIP:        ITAR consulting firms; NADCAP auditor network;
                    GIDEP government network; CMMC prep companies
REFERENCE PROGRAM:  AS9100 audit clean; NADCAP accreditation; GIDEP
                    integration milestone
```

### 10.5 Food J5

```
PRIMARY BUYER:      Food Safety Director / HACCP Team Leader /
                    Regulatory Compliance Manager
PRIMARY TRIGGER:    FSMA §204 enforcement (Jan 2026 hard deadline
                    for large businesses); GFSI recertification;
                    mock recall failure; FSVP supplier audit gap
DIFFERENTIATORS:    FSMA §204 KDE traceability (AR-J5-028..031);
                    HACCP CCP monitoring AI advisory (AI-09 J5
                    extension); mock recall automation (SM-MOCK-RECALL);
                    FSVP gap analyzer (AI-34)
ENTRY POINT:        HARPC + FSMA §204 traceability (J5 light)
PARTNERSHIP:        FSMA/GFSI consulting firms; BRCGS/SQF certification
                    bodies; food safety technology associations
REFERENCE PROGRAM:  FSMA §204 compliance milestone; GFSI certification
                    pass; successful mock recall (< 2 hours KDE trace)
```

---

## 10.6 Cross-vertical GTM (multi-pack tenants)

A significant revenue opportunity exists in converting single-pack
tenants to multi-pack. A pharmaceutical manufacturer that also operates
a medical device unit, or an automotive Tier-1 that has a food-adjacent
manufacturing line, represents a cross-vertical expansion opportunity.

```
MULTI-PACK SIGNAL              TRIGGER + PLAYBOOK
Pharma + MD (J1+J4)            Common in life-sciences contract
                               manufacturers (CMOs); drug-device
                               combination products. TAM identifies
                               during Year 1 expansion QBR. CSM
                               presents unified evidence chain benefit:
                               single OTG audit log for both regulated
                               environments.

Auto + Aero (J2+J3)            Tier-1 suppliers who serve both OEM and
                               defense prime customers. NADCAP + IATF
                               dual compliance is a significant manual
                               burden. HESEM unifies both audit chains.
                               Trigger: customer mentions defense contract
                               in QBR.

Food + Pharma (J5+J1)          Nutraceutical / functional food companies
                               that have both HARPC and pharmaceutical
                               GMP obligations. FSMA + GMP dual
                               compliance creates evidence chain
                               complexity. Trigger: customer mentions
                               GMP classification in FSMA context.

Discrete + Any (base + pack)   Discrete manufacturers who adopt eQMS
                               baseline and then add a regulated pack
                               when they enter a new customer segment
                               (e.g., auto Tier-3 supplier becoming
                               Tier-2 with IATF requirement). Trigger:
                               QBR reveals new OEM customer won.
```

---

## 11. Strategic narrative discipline (Andy Raskin framework)

HESEM's external narrative must follow the Raskin strategic narrative
structure to be maximally persuasive with executive buyers. Sales decks,
website hero messaging, and conference abstracts must follow this
structure rather than feature-listing.

### 11.1 The HESEM strategic narrative

```
NAMED ENEMY:       The fragmented compliance landscape — point solutions
                   that create evidence silos, manual audit preparation,
                   and regulatory exposure that a single integrated
                   platform eliminates.

PROMISED LAND:     A regulated manufacturer where every quality event,
                   manufacturing execution step, and regulatory decision
                   is traceable in a single evidence chain — and where
                   AI surfaces the right information to the right human
                   at the right time, without removing the human from
                   the regulated decision.

MAGIC GIFT:        HESEM's unified ERP+MOM+MES+eQMS+AI with a pre-built
                   CVLP that validates itself — so the manufacturer's own
                   validation cost drops by 40-60% while their audit
                   pack depth increases.

PROOF:             Reference customers who passed FDA inspections, IATF
                   audits, or GFSI certifications using HESEM's evidence
                   chain in lieu of manual record assembly.

CALL TO ACTION:    A structured 90-day pilot with defined success criteria
                   — not a demo, a proof. If HESEM doesn't deliver
                   measurable value in 90 days, the pilot fee is refunded.
```

### 11.2 Messaging by buyer persona

```
QUALITY DIRECTOR:  "Stop spending three weeks before every audit
                   assembling records from 5 different systems.
                   HESEM's audit pack exports your evidence chain
                   in 4 hours."

VP MANUFACTURING:  "Your shop floor and your QMS are finally in the
                   same system. NC raised at Line 7 triggers a CAPA
                   workflow before the shift ends."

CFO:               "HESEM replaces $800K/year in point-solution licenses
                   and reduces your external validation spend by
                   $300K/year. ROI in 18 months."

CIO:               "One data model. One audit chain. No more integration
                   projects between your QMS, your MES, and your ERP.
                   HESEM is the platform."

REGULATORY AFFAIRS:"HESEM's evidence chain is built to the EC-1..EC-38
                   standard that FDA and EMA inspectors are already
                   accustomed to seeing. Your regulatory dossier
                   assembles itself."
```

---

## 12. Marketing operations and content pipeline

### 12.1 Content marketing engine

```
CONTENT TYPE       CADENCE         PURPOSE              PACK PRIORITY
Regulatory         Monthly         Inbound SEO +        All packs; rotate
  whitepaper       (1 per pack     MQL generation       by vertical
                   per quarter)

ROI calculator     Per pack;       Inbound lead         Pharma, MD, Auto,
  (web tool)       per region      qualification        Food (highest ROI
                                                        quantification)

Blog post          2-4 per month   SEO + credibility;   Engineering
  (technical)                      developer audience   + regulatory mix

Customer success   Quarterly       Sales enablement;    Each pack by
  case study                       referral trigger;    rotation;
                                   NPS follow-up        design partner first

Webinar recording  Monthly         On-demand content    Per pack; per
  (YouTube/blog)                   + SEO boost          regulator update

Pack readiness     Per pack;       Inbound lead         Pharma (Annex 11);
  assessment tool  annually        qualification;       Food (FSMA §204);
  (web tool)       updated         TTFV acceleration    MD (MDR); Auto (IATF)

Conference talk    Quarterly       Pipeline + analyst   Reference customer
  (abstract)                       credibility          speaker preferred
```

### 12.2 Marketing attribution model

```
CHANNEL            TARGET MQL %       NOTES
Inbound organic    35-45%             Long-term investment; SEO compounds
  (content + SEO)
Referral           20-25%             Highest conversion; lowest CAC
Outbound ABM       20-25%             Highest ACV; longest cycle
Events             10-15%             Annual spike; compound with ABM
Partner channel    10-15%             Grows with partner certification
                                      program (per K3)
```

### 12.3 CRM and pipeline discipline

```
STAGE              DEFINITION                       EXIT CRITERIA
Lead               Contact captured (content         Marketing qualifies
                   download, event scan, referral)    (ICP match check)

MQL                Marketing Qualified Lead:          AE accepts + schedules
                   ICP match + content engagement      discovery call
                   above threshold

SQL                Sales Qualified Lead:              Discovery call complete;
                   Discovery done; pain confirmed;     buying process understood;
                   budget authority identified;        decision criteria known
                   timeline plausible

Discovery          Pain deep-dive; current            ROI model presented;
  Complete         landscape mapped; ROI model          pack scope agreed;
                   presented to buyer                   pilot proposed (if Enterprise)

Proposal/          Proposal or pilot agreement        Signed pilot SOW or MSA
  Pilot            submitted                           Order Form received

Negotiation        Commercial terms under review      MSA + DPA finalized;
                                                      pricing agreed

Closed Won         Contract signed; payment terms     Implementation kick-off
                   agreed                              scheduled

Closed Lost        Documented loss reason              Loss reason → pipeline
                                                      intelligence report
```

---

## 13. Win/loss analysis and competitive intelligence

### 13.1 Win/loss process

Every lost deal above $200K ARR requires a formal win/loss debrief within
30 days of loss. Every won deal above $500K ARR receives a win analysis
within 30 days of close.

```
LOSS DEBRIEF QUESTIONS:
  1. Which competitor won? What was their primary winning argument?
  2. Was price the primary loss factor or secondary?
  3. What HESEM capability was missing or perceived as missing?
  4. Was the CVLP / validation cost argument understood and valued?
  5. Was the regulatory alignment (pack-specific) adequate?
  6. What could have changed the outcome (without compromising
     technical integrity or ADR commitments)?

WIN ANALYSIS QUESTIONS:
  1. What was the primary buying trigger (regulatory pressure, cost,
     audit failure, competitive displacement)?
  2. Which HESEM differentiator was most persuasive?
  3. What was the CVLP ROI estimate that closed the deal?
  4. How was the pilot structured? What made it succeed?
  5. Who was the internal champion and what was their role?
  6. Could this win template be replicated in similar accounts?
```

### 13.2 Competitive intelligence cadence

```
CADENCE            ACTIVITY
Monthly            Competitor pricing monitoring; public case study
                   review; LinkedIn feed monitoring (competitor
                   customer wins); VP Sales summary to CEO
Quarterly          Product gap analysis vs top 3 competitors;
                   pricing model delta; differentiation refresh
                   for sales playbooks
Annual             Full competitive landscape reassessment;
                   analyst report review; repositioning if needed
Event-triggered    New competitor funding; competitor product launch;
                   competitor pricing change; competitor customer
                   win in HESEM target vertical
```

---

## 13.3 GTM metrics governance

All GTM metrics are reported weekly in the sales dashboard, reviewed
monthly by VP Sales + CEO, and presented to the board quarterly.

```
METRIC GOVERNANCE:

Pipeline coverage (≥ 4× quota):
  Calculated every Monday. If coverage drops below 4×, outbound
  motion is accelerated within the week. VP Sales escalates to
  CEO immediately if coverage drops below 3×.

Win rate (≥ 30% on qualified opps):
  Calculated monthly per AE and per channel. AEs below 25% for
  two consecutive months receive coaching intervention. Channel
  below 25% triggers channel strategy review.

Pilot conversion rate (≥ 60%):
  Calculated per pilot cohort. Failure to convert a pilot triggers
  a structured debrief (§13.1 loss debrief questions); findings
  feed back into pilot design and success criteria templates.

NRR by segment:
  Monthly rolling 12-month calculation. Reported to board. If NRR
  drops below 105% for any tier for two consecutive months, VP
  Customer Success + CEO trigger an emergency health score review.

GTM efficiency ratio (CAC / payback):
  Quarterly. CAC payback by tier vs targets in K1 §14. If CAC
  payback exceeds tier target by > 20%, Marketing + Sales review
  channel mix and conversion funnel.

Average sales cycle by tier:
  Monthly average. If Enterprise cycle exceeds 400 days (vs 180-365
  target), pipeline quality review is triggered to assess whether
  unqualified opportunities are consuming AE capacity.
```

---

## 13.4 GTM failure modes

```
FM-K2-01  GTM motion before product-market fit
  Effect: high churn rate in early cohort; destroys reference program.
  Mitigation: limit to ≤ 5 paying customers before first pack is
    stable (per wave-gate discipline); Pilot tier reduces commitment.

FM-K2-02  Sales cycle mismatch (under-resourced for Enterprise)
  Effect: Enterprise deals stall at negotiation; AE bandwidth exhausted.
  Mitigation: dedicated AE per account >$2M ARR; pre-qualify
    Enterprise opportunities before assigning senior AE time.

FM-K2-03  Reference customer churns before reference is established
  Effect: no reference for the vertical; slows sales cycle for next
    account; damages credibility with analyst/press.
  Mitigation: health score intervention at <60; reference agreement
    signed before case study published; NPS ≥ 70 required.

FM-K2-04  Pre-production vocabulary used in marketing materials
  Effect: ADR-0001 violation; creates false expectations in prospect;
    potential legal exposure if customer relies on "production-ready"
    claim for a feature in pre-production state.
  Mitigation: CI grep on all outbound materials; Legal review before
    publish; Marketing Lead accountability.

FM-K2-05  Partner channel conflict without deal registration
  Effect: two partners pursue same account; both stall; HESEM loses
    credibility with both.
  Mitigation: deal registration system (per K3 §5); conflict
    resolution SLA within 5 business days.

FM-K2-06  Geographic expansion without regulatory readiness
  Effect: EU tenant signed before GDPR DPA is validated; FDA-regulated
    US tenant signed before FDA regulatory evidence classes tested.
  Mitigation: regional readiness checklist (compliance + legal +
    DPA + support language) required before regional GTM launch.
```

---

## 14. RACI

```
RESPONSIBLE:
  VP Sales — owns pipeline, deal execution, channel management,
  competitive positioning in active deals, win/loss process.

  Marketing Lead — owns content pipeline, inbound motion, event
  calendar, brand messaging, CRM data quality.

ACCOUNTABLE:
  CEO — approves GTM strategy, geographic expansion decisions,
  major partnership agreements, strategic narrative.

CONSULTED:
  Product Lead — confirms capability availability per wave before
  GTM commitments made. Reviews pack-specific differentiators.
  VP Customer Success — contributes customer success metrics;
  reviews case study and reference program candidates.
  Compliance Lead — reviews marketing materials for regulatory
  accuracy and ADR-0001 pre-production posture compliance.
  Legal — reviews customer-facing materials for claims accuracy;
  reviews partner agreements and channel contracts.

INFORMED:
  VP Engineering — informed of GTM commitments that create delivery
  timelines; can flag conflicts with wave plan immediately when
  a GTM commitment threatens wave-gate discipline.
  Board / Investors — quarterly GTM metrics (pipeline, win rate,
  ARR by channel, NRR, GRR); geographic expansion decisions;
  new partner program announcements; major reference customer wins.
```

---

## 15. Ideal customer profile (ICP) summary

The ICP that ties all GTM sections together:

```
FIRMOGRAPHICS:
  Industry:       Regulated manufacturing (Pharma, Auto Tier-1/2,
                  Med Device Class II/III, Aerospace AS9100D, Food
                  FSMA §204)
  Size:           200-10,000 employees; 1-50 manufacturing facilities
  Revenue:        $50M – $10B annual revenue
  Geography:      SEA Year 1; NE Asia + NA Year 2-4; EU Year 3-5
  ERP maturity:   Fragmented or inadequate for regulated workflows
                  (SAP/Oracle with bolt-on QMS is typical target)

TRIGGERING CONDITIONS (need ≥ 2):
  1. Regulatory audit in next 12-24 months
  2. Recent audit finding or warning letter requiring system improvement
  3. Current QMS is ≥ 7 years old or fails to produce evidence chain
  4. New OEM CSR requirement current system cannot satisfy
  5. FSMA §204 or EU MDR compliance deadline approaching
  6. Merger creating multi-system integration need
  7. AI-driven quality mandate from parent or customer

DISQUALIFIERS:
  - Non-manufacturing (services only)
  - Non-regulated industry (no compliance pressure)
  - < 100 employees (below Core tier minimum viable value)
  - Competitor contract > 18 months remaining
  - Customer expects autonomous AI-driven regulated decisions
    (incompatible with L1 human authority boundary)

ICP SCORING FOR PIPELINE QUALIFICATION:
  Each MQL is scored at discovery on: vertical match (25 pts),
  trigger count (25 pts), budget authority presence (20 pts),
  timeline clarity (15 pts), geography fit (10 pts), and
  incumbent system age (5 pts). Score ≥ 70/100 advances to SQL.
  Score 50-69 goes to nurture sequence. Score < 50 is disqualified
  immediately to preserve AE capacity for high-probability pipeline.
  Disqualification reason logged for quarterly pipeline quality review.
```

---

## 16. Decision phrase

```
K2_GO_TO_MARKET_V10_LOCKED
NEXT: K3_PARTNER_ECOSYSTEM.md
```
