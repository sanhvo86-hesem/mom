# K1 — Pricing and Tiers

```
chapter_purpose: tier structure, per-tier capability + capacity +
                 SLA + cost; add-on catalog (pack + AI + integration);
                 implementation pricing; pricing-as-data; expansion
                 path; competitive positioning; ARPU envelope per
                 tenant tier
owner_role:      CFO with Product Lead
sources:         SaaS pricing patterns (per-user / per-volume /
                 per-outcome), enterprise SaaS deals (Veeva,
                 MasterControl, IFS, QAD reference points)
```

The pricing model is the contract between HESEM and tenant
expressed as money + capability + SLA + responsibility split. It
must scale from a 50-user Tier-2 supplier to a multi-thousand-user
multi-jurisdiction enterprise. This chapter defines the baseline
(non-confidential).

---

## 1. The three baseline tiers

```
TIER             POSITIONING                     ARR ENVELOPE
HESEM Core       small / lower-mid market         $30K-$200K
                 single facility; light vertical
HESEM Pro        mid-market mainstream             $200K-$2.5M
                 multi-facility; one regulated
                 vertical
HESEM Enterprise large enterprise + global         $2.5M-$30M+
                 multi-vertical; multi-region
HESEM Sovereign  per-agreement                     custom
                 ITAR / sovereign cloud /
                 dedicated tenant
HESEM Pilot      design-partner / discovery        capped; non-recurring
```

---

## 2. Per-tier breakdown

```
TIER         USERS    FEATURES                MULTI-TENANCY      SUPPORT          IMPL
Core         up to    W1-W7 baseline +        shared cluster;    shared CSM;      4-8 wk
             200      one light pack          per-tenant data    business hrs
                      (Auto / MD-light /      isolation          email + portal
                      Food)
Pro          200-3K   W1-W8 + selected pack   dedicated          dedicated CSM    8-16 wk
                                              namespace; per-    business hrs +   per pack
                                              tenant flag        on-call alert
                                              boundaries
Enterprise   3K+      all waves + chosen      dedicated cluster  dedicated CSM    16-52 wk
                      vertical packs           per region;        + TAM 24×5;     per pack
                                              per-tenant flag    formal escalation
Sovereign    per      all + sovereign          dedicated region   per agreement   per agreement
             agreement cloud variant            isolated
```

---

## 3. Per-tier capacity + SLA mapping (per I5 + I8)

```
TIER         AVAILABILITY     LATENCY          AUDIT PACK       DR
Core         99.5%             p95 < 1s          7 days           per region
Pro          99.9%             p95 < 500ms       24 h             per region
Enterprise   99.95%             p95 < 200ms      4 h              RPO 1h / RTO 4h
Sovereign    per agreement      per agreement    per agreement    per agreement
Pilot        no SLA             best effort       n/a              -
```

Internal SLOs are stricter to provide error budget (per M5 §3).

---

## 4. Per-tier pricing model

```
Core
  Base subscription (per tenant per month)
  Per-user component (per active user per month)
  Light pack overlay (Auto / MD-light / Food)
  Limited AI (Tier-1 features included)
  Limited integration (CSV / standard EDI lite)

Pro
  Base subscription higher
  Per-user component
  One pack overlay (full)
  AI Tier-1 + Tier-2 with usage envelope (per L2 §9)
  Integration suite (EDI, API, CDC outbound)
  Sandbox environment

Enterprise
  Per-tenant negotiated base
  Per-user component (volume discount tier)
  Multi-pack overlay
  Full AI envelope (custom retention; co-built features negotiable)
  Full integration suite + per-customer connectors
  Multi-region; cross-region failover
  Sandbox + perf-test environment
  TAM (Technical Account Manager) included

Sovereign
  Custom; per agreement
  Includes infrastructure isolation cost
  FIPS 140-3 / dedicated HSM included where required
  Custom DPA + sub-processor list

Pilot
  Capped fixed fee
  Limited scope; defined success criteria
  Convert to Core/Pro/Enterprise upon success
```

---

## 5. Per-pack add-on pricing

```
PACK          PRO ADD-ON / MONTH    ENTERPRISE ADD-ON
Pharma         $25K-$100K            $50K-$500K (sterile heavier)
Automotive     $15K-$50K              $30K-$200K (Tier-1 supplier)
Aerospace      $20K-$80K              $40K-$300K (defense heavier)
Med Device     $15K-$50K              $30K-$250K (Class III heavier)
Food           $10K-$30K              $20K-$100K (FSMA §204 heavier)
```

Pack add-on includes:
- Pack-specific roots + workflows
- Pack-specific UI surfaces
- Pack-specific AI features
- Pack-specific audit pack contents
- Per-pack support specialization

---

## 6. Usage-based components

```
COMPONENT                         METER                   PRICE BAND
AI advisory (Tier-1)               per call                 $0.001-0.005
AI advisory (Tier-2 LLM)           per call                 $0.01-0.10
ML inference (custom model)         per call                 negotiated
Bulk export overage                  per GB                   $X / GB
EDI transaction overage              per transaction           $X / msg
Specialty connector                   per connector per month   $X / mo
DSCSA event volume overage             per event                 $X / event
EUDAMED / GUDID submission              per submission            $X / sub
PSUR drafting (AI-21)                    per draft                  $X / draft
Audit pack export overage                 per pack > N / month       $X / pack
Cross-region replication overhead          per GB                     $X / GB
Edge gateway site                            per site per month         $X / site
Sub-processor pass-through                    per L2 §8 + I6           cost+margin
```

Usage envelopes per tier:
- Core: limited
- Pro: medium with overage rates
- Enterprise: high with negotiated overage

---

## 7. Implementation revenue

```
ITEM                                  RANGE                   T&M / FIXED
Onboarding implementation              $50K-$5M                 mostly T&M
   (per tier + per pack + per scale)
Vertical pack adoption                  $25K-$300K               fixed
Custom workflow development             per project              T&M or fixed
Custom integration                      per connector            fixed
Master data migration                    $25K-$500K               fixed (per scope)
Training (initial)                        $5K-$50K                fixed per cohort
Training (recurring)                      per cohort               fixed
Audit support                              per audit                fixed
Validation support                         per package              T&M
Customer Validation Leverage Pack          included after Pro       n/a
   (per release; H2 §14)
TAM (Technical Account Mgr)                included Enterprise+    n/a
GO-LIVE WAR ROOM                           $25K-$100K               fixed per
                                                                   go-live
```

---

## 8. Pricing-as-data principle

```
TIER CONFIG, QUOTA, RATE LIMITS, FEATURE TOGGLES
  Stored as authoritative data records (per Part C Core domain)
  Loaded by gateway + admin + billing + support tooling
  No tier-specific code; tier is just data

OVERRIDES
  Per-tenant overrides allowed (per K2 commercial deal)
  Per-pack overrides
  Per-feature overrides
  All overrides logged + audited (per H4 EC-16)

CHANGES
  Tier changes are H7 Class A (regulated implication)
  Pricing changes are tied to renewal cycle (per contract)
  Mid-term pricing change requires customer signoff
```

---

## 9. Expansion path (per K5 + K2)

```
PILOT → CORE                  natural fit
                              first-customer in-vertical play
CORE → PRO                    when:
                              - second facility added
                              - regulated vertical pack
                              - tier hits capacity / SLA gap
PRO → ENTERPRISE              when:
                              - multi-region required
                              - multi-pack required
                              - integration density grows
                              - TAM value clear
                              - audit-rate of customer increases
ANY → SOVEREIGN               when:
                              - regulatory isolation required
                                (ITAR / classified / regional law)
PRO ADD-ON                    second pack added (cross-vertical)
ENTERPRISE ADD-ON              additional packs, additional regions
```

Expansion is tracked + targeted by CSM (per K5 health score).

---

## 10. Pricing strategy (positioning vs comparables)

```
COMPETITOR REFERENCE
  Veeva Vault QMS (Pharma)            premium; broader QMS
  MasterControl                        midmarket; QMS-only
  Sparta TrackWise                     enterprise QMS-only
  IFS Cloud                             ERP+; less depth in regulated
  QAD                                    automotive-strong ERP
  Plex (Rockwell)                        manufacturing ERP
  ETQ Reliance                           QMS-only
  AssurX                                  midmarket QMS
  Honeywell                                process industries

HESEM POSITIONING
  Lower entry than Veeva but with
  unified ERP+MOM+MES+QMS+AI
  Faster onboarding via templates
  AI integration deeper than
  competitors' bolt-ons
  Vertical pack model lets customer
  pay for what they use
```

---

## 11. Discounting policy

```
DEAL APPROVALS (per sales discount)
  ≤ 10%    sales rep
  10-20%   sales manager
  20-30%   VP sales
  > 30%    CEO + CFO

VOLUME (per-user) DISCOUNTS
  Tiered automatic per per-user count
  Negotiable above floor

MULTI-YEAR DISCOUNTS
  3-year prepay: ~10% off
  5-year prepay: ~15% off

MULTI-PACK DISCOUNTS
  Bundle 2 packs: ~15% off pack price
  Bundle 3+ packs: ~20% off

PILOT-CONVERSION DISCOUNT
  Successful pilot: pricing concessions to land first 12 months
```

---

## 12. Renewal + churn-protection

```
RENEWAL LEAD TIME
  Enterprise: 6 mo notice; account team engagement starts T-9 mo
  Pro: 90 day notice
  Core: 60 day notice

PRICE INCREASES AT RENEWAL
  CPI-indexed by default
  Capped per contract
  Subject to capability delivery

CHURN-PROTECTION
  Health score monitoring (per K5)
  QBR cadence (per I8)
  Customer Success Manager intervention thresholds
  Reduced renewal price if SLA breached during prior period
```

---

## 13. Decision phrase

```
K1_PRICING_AND_TIERS_BASELINE_LOCKED
NEXT: K2_GO_TO_MARKET.md
```
