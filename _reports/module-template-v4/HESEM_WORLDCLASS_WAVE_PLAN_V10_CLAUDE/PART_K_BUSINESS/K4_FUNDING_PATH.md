# K4 — Funding Path (V10)

```
chapter_id:     K4
version:        V10
owner_role:     CEO with CFO
wave_target:    reviewed before each fundraising round; updated at
                each stage close and wave delivery milestone
dependencies:   K1 (ARPU model + unit economics), K2 (GTM cost model
                + ARR targets), K3 (partner channel ARR), K5 (FTE
                payroll model), M6 (venture and financing risk register)
sources:        SaaS Capital benchmarks; OpenView SaaS metrics; Bessemer
                Venture Partners cloud index; Christoph Janz SaaS napkin
                (investor signal thresholds); Jason Lemkin SaaStr ARR
                benchmarks; Mark Suster Upfront Ventures (regulated
                SaaS premium); NVCA term sheet standards
```

Capital is not the constraint that determines HESEM's success; the
wave delivery plan and the customer adoption rate are. Capital is what
enables the team and the GTM motion to operate long enough for that
adoption to compound. K4 defines how capital is staged, deployed, and
governed so that each funding round closes from a position of demonstrated
traction rather than projected potential.

The funding path has two modes: the bootstrap/solo-founder path for
Years 0-3 before a funding decision is made, and the venture-backed
path for the scale phase. Both paths are modeled here because the
technical plan (V10 wave plan) is designed to be executable in both
modes — the solo path takes longer and scales more conservatively, but
the same architectural decisions apply.

---

## 1. Funding stages overview

```
STAGE            SIZE RANGE     TIMING                  STATE AT RAISE
Bootstrap /      $0 – $500K     Months 0-36             Solo founder or
Pre-seed         (self-funded   (pre-formal raise)       small founding
                 or friends/                            team; prototype;
                 family seed)                           0-3 paying pilots

Seed             $2M – $5M      Post-W1 prototype        W1-W2 complete;
                                (months 12-18            2-5 design partners;
                                after founding)          first pilot revenue;
                                                        Vietnamese market
                                                        evidence

Series A         $10M – $20M    Post-W3 product          3-5 paying customers;
                                (months 24-36)           $500K – $2M ARR;
                                                        one pack demonstrated;
                                                        partner ecosystem
                                                        started

Series B         $30M – $60M    Post-W6 vertical         10-25 paying customers;
                                pack GA (months          $3M – $10M ARR; first
                                36-48)                   pack fully GA; SEA
                                                        traction; enterprise
                                                        pipeline visible

Series C         $80M – $150M   Post-W8 multi-           50+ customers;
                                vertical (months         $15M – $40M ARR;
                                48-60)                   multi-pack; NA entry;
                                                        NRR ≥ 110%

Growth /         $200M+         $100M+ ARR;              Global; multi-region;
Late stage                       IPO readiness           Sovereign tier;
                                                        partner ecosystem
                                                        mature; DORA elite
```

---

## 2. Capital deployment per round

### 2.1 Bootstrap / pre-seed (Year 0-3)

```
PRIMARY SPEND:
  - Founder's own time (opportunity cost, not cash)
  - Core infrastructure: cloud (shared cluster; minimal cost);
    tooling subscriptions; domain + SSL + email
  - AI augmentation tools (Claude Code / Codex subscriptions):
    < $500/month; replaces $200K+ in junior engineering cost
  - Legal (incorporation; IP assignment; first pilot MSA template):
    $10K-$30K
  - Accounting + finance setup: $5K-$15K annually

CASH REQUIRED:
  Months 1-12:  $30K-$60K (infrastructure + legal + founder living)
  Months 12-24: $50K-$120K (+ first design partner support costs)
  Months 24-36: $100K-$250K (+ second hire + first customer travel)
  Total 36-month cash: $180K-$430K (self-funded or pre-seed FFF round)

DELIVERABLES BY MONTH 36 (solo path):
  - W0-W4 delivered (core + eQMS + one pack prototype)
  - 2-5 design partners with letters of intent or signed pilots
  - $200K-$500K ARR (pilot + early customer revenue)
  - Series A pitch ready (metrics deck + customer references)
```

### 2.2 Seed ($2M-$5M)

```
DEPLOYMENT:
  Team:            First 4-6 hires (per K5 §6 Phase 1 team plan)
    - 2 backend engineers (PHP + PostgreSQL depth)
    - 1 frontend engineer (HMV4 slice program)
    - 1 QMS/Validation specialist (CVLP delivery + pack expertise)
    - 1 Security/DevOps (I7 + CI/CD infrastructure)
    - 1 first CSM/account role (could be founder initially)
  GTM:             $200K-$500K (founder-led sales + first AE hire)
  Infrastructure:  $100K-$200K (per-tenant cluster; redundancy; DR)
  Legal + Finance: $100K-$200K (Series A prep; international entity)
  Reserve:         $500K (operating buffer; runway extension)

TARGET METRICS AT SEED DEPLETION:
  ARR: $1.5M – $3M
  Customers: 5-10 (paying)
  NRR: > 105%
  Team: 10-12 FTEs
  W deliverable: W4-W5 delivered (baseline + first pack)
  Series A signal: clear pack-specific differentiation proven
```

### 2.3 Series A ($10M-$20M)

```
DEPLOYMENT:
  Team:            15-20 FTE target (per K5 §6 Phase 2)
    - 3-5 additional engineers (per domain stream)
    - 1 AI Lead + 1 ML engineer
    - 1 Privacy/Compliance Lead
    - 2-3 additional CSMs
    - 1 Marketing Manager
    - 2-3 AEs (mid-market)
  GTM:             $2M-$4M (inbound content + first outbound ABM
                   + channel partner program launch)
  Infrastructure:  $500K-$1M (multi-region; Enterprise cluster)
  Pack development: $1M-$2M (second pack team + regulatory content)
  Legal + Finance: $500K (international legal; GDPR DPA structure)

TARGET METRICS AT SERIES A DEPLETION:
  ARR: $5M – $12M
  Customers: 20-40 (paying)
  NRR: ≥ 110%
  Team: 25-35 FTEs
  W deliverable: W7-W8 (Enterprise tier; two packs GA)
  Series B signal: enterprise deal pipeline > $20M; NRR stable
```

### 2.4 Series B ($30M-$60M)

```
DEPLOYMENT:
  Team:            40-60 FTE target (per K5 §6 Phase 3-4)
    - Engineering teams per domain stream (15-20 engineers)
    - Pack teams (J1+J2 or J1+J4 dedicated; 4-6 engineers each)
    - CS-A Security team full (4 FTE)
    - CS-B Validation team full (3 FTE)
    - VP Sales + 5-8 AEs (Enterprise + mid-market)
    - VP Customer Success + TAM team (3-4 FTEs)
    - Marketing team 3-5 FTEs
  GTM:             $8M-$15M (enterprise ABM; North America entry;
                   analyst relations; industry events)
  Infrastructure:  $3M-$5M (N. America region; EU region prep;
                   Sovereign tier infrastructure start)
  Pack completion: $3M-$6M (3-4 packs GA; Sovereign pack)
  Legal + Finance: $1M-$2M (N. America entity; ITAR counsel for J3)

TARGET METRICS AT SERIES B DEPLETION:
  ARR: $20M – $40M
  Customers: 60-100 (paying)
  NRR: ≥ 112%
  Team: 60-80 FTEs
  W deliverable: W10-W11 (all 5 packs; marketplace; N. America entry)
  Series C signal: enterprise ACV > $2M; multi-pack expansion proven
```

### 2.5 Series C ($80M-$150M)

```
DEPLOYMENT:
  Team:            80-120 FTE target (per K5 §6 Phase 5)
  GTM:             $25M-$40M (EU expansion; global partner program;
                   self-serve motion build; field engineering)
  Infrastructure:  $10M-$20M (EU Sovereign; ANZ region; India region)
  R&D:             $15M-$25M (W12+ waves; AI feature investment;
                   platform optimization)
  Legal + Finance: $3M-$5M (EU entity + DPA compliance; board prep)

TARGET METRICS AT SERIES C DEPLETION:
  ARR: $80M – $150M
  Customers: 200+ (paying)
  NRR: ≥ 115%
  Team: 100-150 FTEs
  W deliverable: W12-W13 (marketplace; global; Sovereign)
  IPO readiness signal: $100M ARR; Rule of 40 ≥ 40;
    audited financials; Board + CFO in place
```

---

## 3. Bootstrap / solo-founder path

The solo founder path with AI augmentation (Claude Code / Codex) is
a credible Y0-Y3 mode. It is not a permanent state — it is a runway
extension that delays the cash need for a full engineering team until
there is enough customer signal to raise at favorable terms.

```
PHASE 0 (Months 1-12): prototype + design partner
  - 1 founder + AI agent (10-20× development velocity multiplier)
  - Deliverable: W0-W1 (core foundation + eQMS prototype)
  - Revenue: $0 (design partner; no cash)
  - Cash burn: $2K-$5K/month (cloud + tools + founder living)

PHASE 1 (Months 12-24): first pilots
  - 1-2 founders + 1-2 contractors (regulatory expertise)
  - AI augmentation for all non-regulatory code
  - Deliverable: W2-W3 (planning + quality streams)
  - Revenue: $100K-$400K (2-3 pilot customers)
  - Cash burn: $10K-$20K/month total

PHASE 2 (Months 24-36): first paying customers
  - 1-2 founders + 2-3 hires (first full-time engineering hire)
  - Deliverable: W3-W4 (first pack prototype)
  - Revenue: $300K-$700K ARR (3-5 paying customers)
  - Cash burn: $30K-$50K/month total
  - Decision point: raise seed now or extend bootstrap to $1M ARR

PHASE 3 (Months 36-48): raise or extend
  Option A (raise Seed): use $300K-$700K ARR as traction;
    raise $2M-$5M; per §2.2 seed deployment plan
  Option B (extend to $1M ARR): reach $1M ARR solo;
    raise Series A directly (skip Seed); command better terms
    (lower dilution) from position of strength
```

### 3.1 AI augmentation economics in solo path

```
AI AGENT INVESTMENT:         $500-$2,000/month (Claude Pro / API)
EQUIVALENT HIRE COST:        $150K-$250K/year (senior engineer)
EFFECTIVE LEVERAGE:           4-8× senior engineer equivalent on
                              architectural + implementation tasks;
                              lower leverage on customer-facing + regulatory
                              judgment tasks (human required per L1)

TASKS WHERE AI AUGMENTATION IS HIGH LEVERAGE (≥ 5× human):
  - Code generation within defined architecture (70-80% of engineering)
  - Documentation and governance document authorship
  - Test authorship (Playwright E2E, unit tests)
  - Code review and refactoring
  - SQL migration authorship

TASKS WHERE AI AUGMENTATION IS LOW LEVERAGE (< 2× human):
  - Customer relationship management (human required)
  - Regulatory judgment (human required per L1 human authority boundary)
  - Architecture decisions with novel regulatory implications
  - Board and investor relationship management
  - Hiring and team culture
```

---

## 4. Cumulative payroll model through W12

Based on K5 §6 phased scaling:

```
PHASE            DURATION     FTE COUNT    LOADED COST/FTE    TOTAL COST
Phase 0          12 months    1-2 FTEs     $40K-$60K (founder  $40K-$120K
  (pre-seed)                               stipend equivalent)
Phase 1          12 months    4-8 FTEs     $100K/FTE avg       $400K-$800K
  (seed)
Phase 2          12 months    10-15 FTEs   $110K/FTE avg       $1.1M-$1.65M
  (Series A)
Phase 3          12 months    20-35 FTEs   $115K/FTE avg       $2.3M-$4.0M
  (Series A+)
Phase 4          24 months    40-80 FTEs   $120K/FTE avg       $9.6M-$19.2M
  (Series B)
Phase 5          24 months    80-120 FTEs  $125K/FTE avg       $20M-$30M
  (Series C)

Cumulative 7-year payroll (W0→W14):   $33M-$56M
Blended loaded rate used in models:   $117K/FTE-year (Series A-B blended)
```

Loaded cost includes: salary + benefits + employer tax + desk/equipment
+ software licenses. Does not include real-estate for remote-first
organizations. Contractor rates (for specialized regulatory consultants)
are not included in FTE count but are included in relevant phase budgets.

---

## 5. ARR targets per funding stage

```
STAGE        ARR AT RAISE       ARR AT DEPLETION     GROWTH RATE
Seed         $100K-$500K        $1.5M-$3M            3-6× in 18 months
Series A     $1.5M-$3M          $5M-$12M             3-4× in 18-24 months
Series B     $5M-$12M           $20M-$40M            3-4× in 24 months
Series C     $20M-$40M          $80M-$150M           3-4× in 24-30 months
Growth       $80M-$150M         $200M+               2-3× in 24-30 months
```

Key investor signal thresholds for regulated B2B SaaS (Christoph Janz
framework adapted for regulated manufacturing):

```
MILESTONE           METRIC               BENCHMARK (Janz-adapted)
"10 mice"           10 customers × $10K  Pre-seed / FFF round
"1 elephant"        1 customer × $100K   Early Seed validation
"100 deer"          100 customers × $10K Series A threshold
"10 elephants"      10 customers × $100K Series B threshold
"1 whale"           1 customer × $1M     Series C signal
"10 whales"         10 customers × $1M   Late-stage / IPO signal

HESEM target trajectory:
  Seed close:    5-10 deer ($50K-$100K ACV) + 1-2 elephants ($100K+)
  Series A:      20 deer + 5-10 elephants + 1 whale visible in pipeline
  Series B:      50 deer + 20 elephants + 3-5 whales
  Series C:      80 deer + 40 elephants + 10+ whales
```

---

## 6. Burn and runway model

### 6.1 Burn rate targets

```
STAGE        MONTHLY BURN     RUNWAY TARGET     RAISE TRIGGER
Seed         $100K-$200K      18-24 months      At 12 months remaining
Series A     $500K-$900K      18-24 months      At 12 months remaining
Series B     $2M-$3.5M        18-24 months      At 12 months remaining
Series C     $5M-$9M          18-24 months      At 12 months remaining
```

Raise trigger at 12 months remaining ensures the company has sufficient
time for a 6-9 month fundraising process without operational stress.

### 6.2 Rule of 40

```
RULE OF 40 = ARR GROWTH RATE + EBITDA MARGIN (or FCF MARGIN)

HESEM TARGETS:
  Series B stage:   Rule of 40 ≥ 30
                    (e.g., 80% growth + -50% EBITDA, or
                           60% growth + -20% EBITDA)
  Series C stage:   Rule of 40 ≥ 35
  IPO readiness:    Rule of 40 ≥ 40
                    (e.g., 40% growth + 0% EBITDA → breakeven)

Regulated B2B SaaS typically commands 2-4× revenue multiple premium
over generic SaaS at equivalent Rule of 40, due to:
  - Higher NRR (sticky regulated workflows)
  - Higher switching cost (evidence chain lock-in)
  - Longer average contract term (multi-year preferred)
  - Lower churn risk (compliance mandate drives retention)
```

### 6.3 Revenue quality metrics for investors

```
METRIC                       HESEM TARGET          INVESTOR SIGNAL
NRR                          ≥ 110% (Pro)           Top-decile SaaS
                             ≥ 115% (Enterprise)
GRR                          ≥ 95%                  Top-decile
Payback period               ≤ 24 months (Pro)      Efficient GTM
                             ≤ 30 months (Enterprise)
LTV / CAC                    ≥ 5× (Pro)             Healthy unit economics
                             ≥ 8× (Enterprise)
Magic Number (net)           ≥ 0.75                 Efficient GTM spend
  (net new ARR / S&M spend)
Gross margin                 ≥ 65% (Pro)            SaaS-comparable
                             ≥ 70% (Enterprise)
Implementation attach rate   ≥ 70% (Pro)            Additional revenue signal
```

---

## 7. Per-stage milestones tied to V10 wave plan

```
WAVE         COMMERCIAL MILESTONE             INVESTOR SIGNAL
W1           Core platform functional;         "Product exists" —
             first design partner live          required for Seed

W2           Planning + MES streams            "Addressable for
             operational; first eQMS           mid-market mfg" —
             paying customer                   Seed signal

W3           Second stream complete;           "Expansion starts" —
             second pack prototype;            Seed → Series A
             $500K ARR milestone               bridge signal

W4           First pack GA (eQMS + pack);      "First vertical proved" —
             CVLP delivered per release;        Series A condition
             5+ paying customers

W5-W6        Second pack GA; multi-tenant       "Multi-vertical" —
             stability; $2M ARR milestone       Series A → B signal

W7           Enterprise tier live;              "Enterprise-ready" —
             AI advisory (Tier-1 + Tier-2);    Series B signal
             first enterprise customer

W8           Third pack; multi-region;          "Platform" —
             $5M ARR milestone                 Series B condition

W9-W10       Fourth + fifth packs;             "Full suite" —
             marketplace launch;               Series B → C signal
             $15M ARR milestone

W11          N. America traction;               "Global" —
             Sovereign tier (ITAR);            Series C signal
             $30M ARR milestone

W12          Full marketplace GA;               "Ecosystem" —
             connector cert program;           Series C condition;
             $50M ARR milestone                IPO prerequisite begins

W13-W14      EU Sovereign; ANZ;                 "Pre-IPO" —
             $100M ARR milestone;              Growth round or IPO
             DORA Elite sustained
```

---

## 8. M&A and acquisition considerations

### 8.1 Acquisition target profile (inbound acquirers)

```
ACQUIRER TYPE        MOTIVATION                 LIKELY STAGE
Large ERP vendor     Regulated QMS depth;        Series C+ ($50M+ ARR)
  (SAP, Oracle,      AI governance; pack         Acquirer: $500M-$3B offer
  Microsoft)         ecosystem; customer base     target

QMS-only vendor      Platform + ERP; unified      Series B-C ($15M+ ARR)
  (Veeva, ETQ,       evidence chain; AI           Acquirer: $150M-$800M
  MasterControl)     features they lack            target

Private equity       SaaS roll-up; platform       Series B-C; acquirer
                     with multiple verticals;      takes controlling stake;
                     regulated sector premium      management stays

Strategic buyer      Geographic market access;     Varies; could be
  (regional ERP,     regulated sector entry;        earlier stage
  regional cloud)    local regulatory expertise
```

### 8.2 M&A defense (preventing premature acquisition pressure)

```
DEFENSE STRATEGY:
  - Maintain board control through series of non-dilutive structure
    (founder-friendly terms; dual-class if achievable at Series A+)
  - Build strategic value that is higher as independent company:
    open SDK + marketplace creates network effects that an acquirer
    would need to preserve (destroying it = destroying value)
  - Reference customer base that is sticky (15-20 year device
    lifecycle for MD; long-term pharma compliance)
  - IP moat: OTG audit chain architecture; CVLP framework; per-pack
    evidence schemas are protectable as trade secrets and patents

ACCEPTABLE ACQUISITION CRITERIA (if pursued):
  - Price: ≥ 10× ARR for early-stage; ≥ 8× ARR at Series C+
  - Team: core team retained for ≥ 3-year earnout
  - Product: roadmap commitment maintained; no pack retirement
  - Customers: all customer contracts honored; no forced migration
```

---

## 9. Unit economics by tier and customer segment

Unit economics must be tracked per tier and per customer segment because
HESEM's cost structure differs dramatically by tier: a Core tenant costs
$2K-$6K per year to serve while an Enterprise tenant costs $30K-$70K.
The unit economics model must confirm that each tier is profitable at
scale, and that the portfolio mix is improving as Enterprise concentration
increases.

### 9.1 CAC calculation by channel and tier

```
CHANNEL              CAC RANGE          NOTES
Inbound / self-serve $5K – $20K         Content investment amortized
  (Core tier)                           over inbound volume; CS-light
Outbound ABM         $30K – $80K        AE quota × cost; event spend;
  (Pro tier)                            field engineer involvement
Enterprise AE        $80K – $200K       6-9 month sales cycle; proof
  (Enterprise tier)                     of concept; compliance review;
                                        SC involvement; legal
Channel partner      $15K – $40K        Partner margin + HESEM field
  (any tier)                            support; no direct S&M cost
                                        until co-sell threshold

BLENDED CAC TARGET:
  Seed stage:        $25K-$50K blended (small deal mix)
  Series A:          $40K-$70K blended (Pro/Enterprise shift)
  Series B+:         $60K-$100K blended (Enterprise dominant)
```

### 9.2 LTV calculation by tier

```
TIER         ACV RANGE      CHURN RATE    EXPANSION RATE    LTV RANGE
Core         $10K-$30K      10-15%/yr     5-10%/yr          $50K-$150K
Pro          $30K-$100K     5-8%/yr       10-20%/yr         $250K-$1.2M
Enterprise   $100K-$500K    2-5%/yr       15-30%/yr         $1.5M-$15M+
Sovereign    $300K-$1.5M    1-3%/yr       10-20%/yr         $5M-$50M+

LTV CALCULATION:
  LTV = ACV × Gross Margin × (1 / Net Monthly Churn Rate)
  Gross margin used: 65% (Pro), 68% (Enterprise), 72% (Sovereign)

  Example Enterprise:
    ACV = $200K; GRR = 96%; NRR = 118%; Gross Margin = 68%
    Monthly gross churn = 4% / 12 = 0.33%
    LTV = $200K × 68% / 0.0033 = $41M (use capped at 5-7yr horizon)
    Practical 7-year LTV: $200K × 68% × NRR_compounded = ~$1.8M per customer
```

### 9.3 LTV/CAC ratio targets and payback period

```
METRIC                  CORE         PRO          ENTERPRISE
LTV/CAC (target)        ≥ 5×         ≥ 6×         ≥ 8×
Payback period (target) ≤ 18 months  ≤ 24 months  ≤ 30 months
CAC recovery point      Month 15-18  Month 20-24  Month 24-30

PAYBACK PERIOD FORMULA:
  Payback Months = CAC / (ACV × Gross Margin / 12)

  Example Pro at Series A:
    CAC = $50K; ACV = $60K; Gross Margin = 65%
    Payback = $50K / ($60K × 0.65 / 12) = $50K / $3,250 = 15.4 months ✓

MAGIC NUMBER TARGET (net new ARR / prior quarter S&M spend):
  Seed:       ≥ 0.5 (acceptable early-stage efficiency)
  Series A:   ≥ 0.75
  Series B+:  ≥ 0.8 (benchmark for regulated SaaS peers)
```

### 9.4 Gross margin expansion model

```
STAGE           BLENDED GROSS MARGIN     DRIVER
Seed            55-62%                   High implementation attach; low
                                         automation; cloud cost not optimized
Series A        60-66%                   Infrastructure optimization; higher
                                         ACV mix; CVLP partly templatized
Series B        64-70%                   Multi-tenant efficiency; pack
                                         reuse across customers; CS scale
Series C        68-73%                   Platform leverage; Enterprise
                                         concentration; AI-assisted operations
IPO readiness   70-75%                   Mature peer benchmark (Veeva ~74%;
                                         Procore ~53%; ServiceNow ~77%)

GROSS MARGIN LEVERS:
  1. Infrastructure: multi-tenant cluster reuse across Core tenants
  2. CVLP: templatized validation pack reduces per-customer delivery cost
  3. AI features: advisory AI reduces CSM intervention time
  4. Implementation attach: fixed SOW vs T&M reduces margin variability
  5. Tier mix: Enterprise and Sovereign have inherently higher margins
     as their higher ACV more than offsets their higher service cost
```

---

## 10. Investor relations and board composition by stage

### 10.1 Board composition evolution

```
STAGE            BOARD STRUCTURE              NOTES
Bootstrap/Seed   1-3 founders only            No formal board required
                 (advisory board optional)     until institutional raise
Seed             3 seats: 2 founder +         Lead seed investor gets
                 1 lead seed investor          observer or board seat
Series A         5 seats: 2 founder +         Lead Series A gets 1 board
                 1 seed investor +             seat; independent search
                 1 Series A lead +             begins (technical or
                 1 independent                regulated industry)
Series B         5-7 seats: 2 founder +       Board chair established
                 1 seed/Series A rep +         (typically independent);
                 1 Series B lead +             Series B lead gets seat;
                 1-2 independent               audit committee formed
Series C / IPO   7-9 seats full corporate     Audit + Comp + Nom/Gov
                 governance structure          committees; lead director;
                                              CFO position formalized
```

### 10.2 Investor selection criteria

HESEM operates in regulated manufacturing — a sector where the wrong
investor creates operational risk if they push for growth strategies
that conflict with the compliance posture or the pre-production
governance model (ADR-0001). Selection criteria for investors beyond
financial terms:

```
CRITERION                    WHY IT MATTERS FOR HESEM
Domain understanding of      Investors who don't understand that a 9-month
regulated B2B SaaS           validation cycle is normal will apply premature
                             growth pressure that forces compliance shortcuts.

Portfolio fit (no conflicts) Lead investor must not have a portfolio company
                             that is a direct HESEM competitor (Veeva, ETQ,
                             MasterControl board overlap is disqualifying).

Geographic and regulatory    Series A investors with NA focus who don't
alignment                    understand EU GDPR, FDA CFR Part 11, or
                             Vietnamese manufacturing sector will under-
                             value compliance posture as a moat.

Reference check: founder     Check how prior founders describe board
behavior under stress        behavior during missed milestones. HESEM's
                             wave-gated development means milestone slippage
                             is possible; investors who call extraordinary
                             governance measures at first miss are dangerous.

Long time horizon            Regulated SaaS companies take 8-12 years to
                             IPO; ensure fund lifecycle aligns (avoid
                             investors with 7-year fund window at Series B).
```

### 10.3 Board meeting cadence and reporting package

```
FREQUENCY:         Monthly (board meeting or written update through Series A)
                   Quarterly board meetings + monthly CEO update at Series B+
PACKAGE CONTENTS:
  - ARR dashboard: total ARR; new ARR; expansion ARR; contraction ARR; churn
  - Cohort analysis: NRR by cohort vintage; customer health score distribution
  - Unit economics: LTV/CAC by channel; Magic Number; payback period
  - Cash: cash balance; monthly burn; runway; raise trigger status
  - Wave delivery: W current vs plan; quality gates passed; next wave ETA
  - GTM: pipeline by stage and segment; win rate; cycle time; ICP score
  - Headcount: FTE vs plan; open reqs; attrition rate
  - Risk register: M6 top-5 risks vs prior month
  - AI governance: L3 ledger summary; BD violation count; red-team status

Board package sent 48 hours before meeting. No surprises at board meetings —
issues escalated in CEO → Board chair channel within 24 hours of materiality.
```

---

## 11. Equity and cap table management

### 11.1 Dilution model per round

```
ROUND           PRE-MONEY ($M)   INVESTMENT ($M)   INVESTOR OWNERSHIP
Seed            $8M-$15M         $2M-$5M           13-38%
Series A        $30M-$60M        $10M-$20M         17-33%
Series B        $100M-$200M      $30M-$60M         15-30%
Series C        $300M-$600M      $80M-$150M        13-25%
IPO             $800M-$2B+       Variable           Dilution from float

FOUNDER OWNERSHIP TARGETS:
  Post-Seed:     65-75% (two-founder split)
  Post-Series A: 45-60%
  Post-Series B: 30-45%
  Post-Series C: 20-35%
  Post-IPO:      15-25% (depending on float size)

ESOP POOL:
  Pre-Seed:      10% option pool reserved
  Post-Seed:     15% (expanded to accommodate 5-10 FTE grants)
  Post-Series A: 15-18% (refreshed; accounts for Series A FTE expansion)
  Series B+:     15% maintained; refreshed at each round
  ESOP strategy: options over RSUs pre-Series B (lower 409A complexity);
                 RSUs considered at Series C+ when valuation is stable
```

### 11.2 Anti-dilution and protective provisions

```
ANTI-DILUTION:   Broad-based weighted-average (never full ratchet)
                 Seed and Series A: standard 1× non-participating preferred
                 Series B+: negotiate to keep non-participating

PROTECTIVE PROVISIONS (standard for regulated SaaS):
  Investor approval required for:
  - Issuing new shares above the authorized share pool
  - Selling the company below the liquidation preference
  - Changing the company's core business (i.e., moving out of regulated mfg)
  - Taking on debt above a defined threshold (typically 3-6 months burn)
  - Dividends or any cash distribution

FOUNDER PROTECTIONS:
  - Pro-rata rights on subsequent rounds (negotiate to Series B)
  - Information rights (standard; required for board reporting anyway)
  - Vesting acceleration: double-trigger on change of control
    (single-trigger acceleration creates acquisition friction — avoid)
  - Founder vesting cliff: no cliff for post-seed co-founders
    (cliff only for employee hires)
```

### 11.3 Secondary sales and liquidity for early employees

```
EMPLOYEE LIQUIDITY PATH:
  Series B:    Tender offer of $3M-$10M (selective; board-approved)
               Enables early employee liquidity without full exit
               Clears "zombie option" holders (employees who left)
  Series C:    Larger tender; structured secondary of $10M-$30M
               Select early investors may sell 20-30% of position
  IPO:         Lock-up of 180 days standard; 25% vest at IPO for RSU holders

OPTION EXERCISE POLICY:
  Standard:    90-day post-termination window (PTW)
  Extended:    Consider 5-year PTW for tenured employees (> 3 years)
               Rationale: regulated SaaS companies take 8-12 years to IPO;
               90-day PTW forces employees to exercise or lose options before
               any liquidity event, creating retention and culture risk.
```

---

## 12. Alternative capital structures

Not all capital should or must come from venture equity. HESEM's
regulated market position creates access to capital structures not
available to generic SaaS companies.

### 12.1 Revenue-based financing (RBF)

```
APPLICABILITY:   Post-$500K ARR; highly predictable recurring revenue
                 from regulated customers (low churn, multi-year terms)
PROVIDERS:       Clearco; Capchase; Lighter Capital; Silicon Valley Bank
                 (RBF product); specialized regulated SaaS lenders
TERMS:           Advance: 3-6× MRR; repay 4-10% of monthly revenue
                 until 1.2-1.5× repaid (no equity dilution)
HESEM USE CASE:  Bridge to Series A (extend runway 6-9 months while
                 fundraising); fund implementation professional services
                 backlog without taking equity dilution; fund one-time
                 infrastructure build without drawing on equity capital
RISK:            Revenue-based repayment means high burn in growth months;
                 model must confirm positive working capital at peak repay
```

### 12.2 Government and regulatory grants

```
VIETNAM:         Ministry of Science and Technology NATIF program
                 ($100K-$2M grants for software + AI R&D)
                 Hanoi Innovation Hub, Ho Chi Minh City Digital
                 Economy grants for manufacturing software companies
EU:              Horizon Europe (H2020 successor) for regulated AI systems;
                 €1M-€5M non-dilutive for compliant AI development
                 EIC Accelerator for regulated deep-tech companies
US:              SBIR/STTR for defense-adjacent use cases (J3 Aerospace);
                 NIST Manufacturing Extension Partnership for US SMB
                 manufacturing software adoption
Singapore:       Enterprise Development Grant (EDG) for regional SI
                 partners deploying HESEM in Singapore manufacturing

GRANT MANAGEMENT:
  - Assign a Grants Coordinator (part-time contractor through Series A)
  - Milestone-based reporting is compatible with wave plan deliverables
  - Grant applications do not require equity dilution; always pursue
    in parallel with equity fundraising
  - Avoid grants with exclusive IP clauses or output publication requirements
    that conflict with commercial product protection
```

### 12.3 Strategic investment and corporate venture

```
CORPORATE VC CONSIDERATIONS:
  Attractive strategic investors for HESEM:
  - SAP.iO / SAP Ventures (ERP ecosystem; potential future acquirer)
  - Salesforce Ventures (if CRM integration becomes primary revenue)
  - NVIDIA Ventures (AI hardware relevance to inference cost model)
  - Siemens Next47 (Siemens is a direct competitor; avoid)
  - AVEVA / AVEVA parent (Schneider Electric corporate VC)
  - Regional manufacturing funds: Asia Partners; Golden Gate Ventures;
    Jungle Ventures (SEA focus)

STRATEGIC INVESTMENT CAUTION:
  - Never take strategic investment from a direct ERP competitor
    (SAP strategic investment might require exclusive ERP integration
    commitments that limit market freedom)
  - Strategic investor board seats require conflict-of-interest analysis
  - Data-sharing provisions in strategic investment term sheets
    require Legal + Compliance review before execution
  - Strategic investment is most valuable when it includes commercial
    commitment (preferred customer status; co-marketing; technical integration
    roadmap commitments) — pure financial strategic investment at standard
    VC terms is not differentiated from standard VC
```

---

## 13. Due diligence preparation and data room structure

Investors in regulated B2B SaaS conduct more detailed due diligence
than generic SaaS investors because regulatory and compliance risk is
a real category of investment risk. HESEM should maintain a living
data room that is updated quarterly so that a fundraising process
can begin without a 6-week data room build sprint.

### 13.1 Data room structure

```
SECTION 1: COMPANY AND CAPITALIZATION
  - Certificate of incorporation (all jurisdictions)
  - Cap table (current; post-money pro-forma for proposed round)
  - ESOP pool: issued + outstanding + available
  - Board consent resolutions (all material decisions)
  - Prior round term sheets and investment agreements

SECTION 2: FINANCIAL STATEMENTS
  - 24 months P&L (actual vs budget by month)
  - Balance sheet (current)
  - Cash flow statement (trailing 12 months)
  - ARR waterfall (new/expansion/contraction/churn by month)
  - Unit economics dashboard (CAC/LTV/payback by channel and tier)
  - 3-year financial model with assumptions documented

SECTION 3: CUSTOMER AND REVENUE
  - Customer list with ACV, tier, industry, cohort, NRR
  - Top-10 customer contracts (signed)
  - CVLP delivery log per Enterprise customer
  - Churn events (trailing 24 months with root cause)
  - NPS/CSAT scores and methodology
  - Pipeline report (CRM export; stage-weighted ARR)

SECTION 4: PRODUCT AND TECHNOLOGY
  - V10 wave plan (this document set) — full disclosure
  - ADR directory (frozen architecture decisions)
  - Security posture: SOC 2 report or audit in progress
  - Penetration test results (trailing 12 months)
  - AI governance: L1-L5 posture; BD-1..BD-36 ban list;
    red-team results (L4)
  - Pre-production posture: ADR-0001 explanation and investor FAQ

SECTION 5: REGULATORY AND COMPLIANCE
  - Per-pack regulatory posture summary (J1-J5)
  - Audit pack status: EC-1..EC-38 coverage by customer
  - Data protection: DPA with each EU and regulated customer
  - GDPR / PDPA compliance summary
  - FDA CFR Part 11 compliance assessment for J1 customers
  - ITAR classification memo (J3 aerospace pack)

SECTION 6: TEAM AND ORGANIZATION
  - Org chart (current)
  - Executive biographies
  - Key employee agreements (IP assignment; non-compete)
  - Compensation philosophy + ESOP grant history
  - K5 phased team plan (this document set)
  - Open reqs and hiring plan (next 18 months)

SECTION 7: IP AND CONTRACTS
  - IP assignment: all founders and key employees
  - Trademark registrations (HESEM mark; per-country)
  - Patent applications (if any; OTG audit chain candidates)
  - Material vendor contracts (cloud; tooling; regulatory consultants)
  - Partner agreements (K3 tier partners; connector licensees)
  - Insurance policies (D&O; E&O; cyber; commercial general)
```

### 13.2 Investor FAQ for regulated SaaS due diligence

```
Q: What is your regulatory approval status for the AI features?
A: HESEM AI features are advisory-only (L1 posture). No HESEM AI feature
   autonomously approves, releases, or records regulated outcomes. Human
   authority is mandatory at every BD-1..BD-36 boundary. This posture
   pre-empts regulatory scrutiny: HESEM is not subject to the EU AI Act
   high-risk system requirements because no HESEM AI feature makes
   autonomous regulated decisions.

Q: What does "pre-production posture" (ADR-0001) mean for revenue?
A: The HMV4 frontend redesign is development-grade. All customer-facing
   functionality that generates revenue runs on the existing production
   portal. The HMV4 redesign is feature-flagged inert by default. This
   creates zero revenue risk from the redesign program.

Q: How does your evidence chain create switching cost?
A: Customer audit packs (EC-1..EC-38) accumulate per-product-lot, per-
   release, per-batch evidence that is stored in HESEM's schema. Migrating
   to a different system would require recreating this evidence chain in
   the target system or running dual systems during the validation period —
   a 12-24 month process for a regulated manufacturer. This is structural
   retention, not contractual lock-in.

Q: What is the competitive risk from SAP / Oracle building this?
A: SAP and Oracle have announced regulatory AI features but do not have
   an advisory-only, validated-posture AI governance framework for
   regulated manufacturing. They have a 7-10 year product cycle for
   deep vertical features; HESEM has a 2-3 year head start in per-pack
   regulatory depth. The evidence chain architecture (OTG) and CVLP
   framework are defensible trade secrets. SAP/Oracle as acquirers
   (§8.1) is the more likely scenario than direct competition in the
   SME and mid-market tiers.
```

---

## 14. Failure modes (funding)

```
FM-K4-01  Raise timing too early (pre-product-market fit)
  Effect: high dilution; investor pressure to grow before stable;
    customer quality sacrificed for growth metrics.
  Mitigation: bootstrap to 5+ customers + $500K ARR before Seed
    if possible; don't raise until pack differentiation is demonstrated.

FM-K4-02  Burn rate above runway calculation
  Effect: company runs out of cash before Series A conditions met.
  Detection: monthly cash forecast vs 18-month runway model.
  Mitigation: raise trigger at 12 months remaining (per §6.1);
    reduce burn to 12-month breakeven plan if raise fails.

FM-K4-03  Revenue concentration (single customer > 30% ARR)
  Effect: customer-driven leverage; valuation discount; acquirer
    concern; board pressure.
  Detection: monthly ARR by customer.
  Mitigation: per M6 risk register; enforce ICP diversification in
    GTM; manage large customer growth to stay below 20% ARR.

FM-K4-04  NRR below 100% (net churn)
  Effect: growth requires proportionally more new ARR; burn increases;
    investor concern; Series B at risk.
  Detection: monthly NRR tracking.
  Mitigation: health score intervention at < 60; CVLP delivery quality;
    price-increase buffer at renewal (per K1 §13).

FM-K4-05  GTM spend not generating proportional ARR
  Effect: Magic Number < 0.5; CAC payback > 36 months; Series B
    fundraising narrative weakened.
  Detection: quarterly Magic Number calculation.
  Mitigation: channel mix review; ICP score enforcement (disqualify
    low-probability pipeline); reduce burn on non-productive channels.

FM-K4-06  Wave plan slippage affects investor milestone narrative
  Effect: investor expected W7 at Series B; W6 slipped; narrative
    gap creates valuation pressure.
  Detection: wave delivery gate tracking vs K4 stage milestones.
  Mitigation: wave delivery gates are non-negotiable (per ADR-0005);
    investor milestones in K4 are set conservatively with 2-wave
    buffer vs internal plan; never promise wave delivery in term sheet.
```

---

## 15. RACI

```
RESPONSIBLE:
  CFO — owns financial model, burn tracking, unit economics, investor
  data room, due diligence preparation, term sheet review.

  CEO — owns investor relationships, board composition, fundraising
  narrative, strategic timing of raises, M&A decision authority.

ACCOUNTABLE:
  Board — accountable for capital allocation decisions; approves rounds
  above $10M; reviews cap table and dilution at each round.

CONSULTED:
  VP Sales — revenue forecast input; customer pipeline for investor
  data room; ARR milestone validation.
  VP Engineering — wave delivery timeline confirmation for investor
  milestone narrative; technical due diligence questions.
  Legal — term sheet review; ESOP structure; M&A terms; international
  entity structure for each expansion round.
  Compliance Lead — regulatory risk disclosure in investor materials;
  AI governance posture for investor due diligence.

INFORMED:
  All employees — funding announcement at each close; equity refresh
  or new option grants per compensation plan.
  Board observers (pre-Series A angels) — monthly financial update.
```

---

## 16. Decision phrase

```
K4_FUNDING_PATH_V10_LOCKED
NEXT: K5_CUSTOMER_SUCCESS_AND_TEAM_TOPOLOGY.md
```
