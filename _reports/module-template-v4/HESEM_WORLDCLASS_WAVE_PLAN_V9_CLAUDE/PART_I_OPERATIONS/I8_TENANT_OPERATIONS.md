# I8 — Tenant Operations and Customer Onboarding

```
chapter_purpose: per-tenant lifecycle from onboarding through steady state
owner_role:      Customer Success Lead with Implementation Lead
```

---

## 1. The 8 onboarding phases

```
P1   Discovery (1-2 wk):     SoW + tier + vertical pack selection
P2   Validation Scoping (2-4 wk; regulated): URS + risk + plan
P3   Tenant Provisioning (1-2 wk): tenant + IAM + SSO + IQ
P4   Master Data Migration (2-6 wk): ITEM/CUST/SUP/EQP/MDEV/USER/ROLE
P5   Configuration (2-8 wk): workflows + documents + users + OQ
P6   Pilot Operation (4-12 wk): pilot batches; PQ observation
P7   Pre-Production Cutover (2-4 wk): training + runbook + on-call
P8   Steady State (ongoing): SLA + QBR + periodic review
```

---

## 2. Per-tier SLA

```
Core:           total impl 4-8 wk; CSM shared
Pro:            total impl 8-16 wk; CSM dedicated business-hours
Enterprise:     16-52 wk depending on vertical; CSM dedicated 24x5
Vertical Pack:  +6 mo for Pharma full validation
                +12 mo for Aerospace AS9100D + NADCAP
```

---

## 3. Customer-side artifacts

Per onboarding:
- Customer profile (industry, size, regulatory frame)
- Statement of Work
- Validation plan (regulated)
- Master data migration plan
- Configuration documents (per workflow)
- Training plan
- Runbook (customer-side)
- Support escalation path
- QBR schedule

---

## 4. Customer Validation Leverage Pack

(Cross-reference H2.) Per release HESEM ships leverage evidence to
reduce customer validation effort. Pack contents per H2.

---

## 5. QBR cadence

Quarterly Business Review per customer:
- KPI review
- SLA compliance
- Customer health score
- Cost vs budget
- Roadmap discussion
- Issues / opportunities

---

## 6. Off-boarding

When a customer departs:
- 30-day notice typical
- Full data export per agreement
- Per-retention compliance: WORM evidence retained for full retention
   period regardless of customer departure
- Customer audit pack final export
- Tenant decommissioning per security cleanup procedure

---

## 7. Decision phrase

```
I8_TENANT_OPERATIONS_BASELINE_LOCKED
PART_I_COMPLETE
NEXT: PART_J_VERTICAL_PACKS/J0_PART_J_OVERVIEW.md
```
