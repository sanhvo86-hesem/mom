# K1 — Pricing and Tiers

```
chapter_purpose: tier structure + pricing model + add-ons
owner_role:      CFO with Product Lead
```

---

## 1. The three tiers

```
HESEM Core (small mid-market)
   ARR:                  $30K-$200K
   Users:                up to 200
   Features:             W1-W7 baseline
   Multi-tenant:         shared cluster
   Support:              shared CSM
   Implementation:       4-8 weeks

HESEM Pro (mid-market mainstream)
   ARR:                  $200K-$2.5M
   Users:                200-3,000
   Features:             W1-W8 + selected vertical
   Multi-tenant:         dedicated namespace
   Support:              dedicated CSM, business hours
   Implementation:       8-16 weeks

HESEM Enterprise
   ARR:                  $2.5M-$30M+
   Users:                3,000+
   Features:             all waves + chosen vertical packs
   Multi-tenant:         dedicated cluster (or VPC for ITAR)
   Support:              dedicated CSM + TAM, 24x5
   Implementation:       16-52 weeks (per vertical)
```

---

## 2. Add-on pricing

```
Vertical pack add-on (per pack, per tenant per month):
  Pharma:           $25K-$100K
  Automotive:       $15K-$50K
  Aerospace:        $20K-$80K
  Med Device:       $15K-$50K
  Food:             $10K-$30K

Usage-based components:
  AI advisory call:                  per call (low cost)
  ML inference (custom model):       per call
  Bulk export overage:                per GB
  EDI overage:                        per transaction
  Specialty connector:                per connector per month
```

---

## 3. Implementation revenue

```
- Onboarding implementation:       $50K-$5M (T&M)
- Vertical pack adoption:           $25K-$300K fixed
- Custom workflow development:      per project
- Training:                         per cohort
- Audit support:                    per audit
```

---

## 4. Pricing-as-data principle

Tier configurations, quotas, rate limits expressed as data, not code.
Per-tenant overrides supported. Custom commercial deals via the same
mechanism.

---

## 5. Decision phrase

```
K1_PRICING_AND_TIERS_BASELINE_LOCKED
NEXT: K2_GO_TO_MARKET.md
```
