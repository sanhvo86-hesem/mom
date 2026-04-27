# S2-07 — D1 Order to Cash (Standalone; Densest Workflow)

```
prompt_id:        S2-07
stream:           2
sequence:         7 of 14
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. S2-00 stream master
2. V9: D1_ORDER_TO_CASH.md (V9 already 299 lines; needs depth)
3. Cross-refs: C1 + C5 + C7 + C8 + C11; M3 + M4 (SM-1);
   E3 + E4 + E5; F4 + F5; J1-J5; H1 §3 (regulator windows for
   DSCSA + MD vigilance + UDI); L1 (BD-1, BD-8 cascade)
4. Standards: 21 CFR 211; EU GMP Annex 16 (QP release);
   IATF 16949 §10.6; AS9100D §8.5.4 + §8.5.5; ISO 13485 §7.2;
   DSCSA TI/TH/TS; EU FMD; UDI; FSMA §204; ICH Q12 lifecycle;
   per-OEM EDI sets (850/855/856/810/820/860/862/865/997)
```

## Deliverable

```
PART_D_WORKFLOW_CATALOG/D1_ORDER_TO_CASH.md
```

## Depth requirements (D1 specific)

```
1.  Trigger catalog (≥ 25 distinct triggers; concrete)
    Customer PO arrival; Order portal submit; EDI 850;
    Forecast-driven schedule; Recall replacement order;
    RMA replacement; Sample order; Configurable order; Kit
    order; Blanket release; Scheduling agreement; Drop-ship;
    Consigned restock; Service order; Field replacement;
    Qualification lot; Stability sample; etc. + per pack

2.  Pre-conditions (≥ 15)
    Customer KYC complete; credit check passed; pricing valid +
    effective; item active + effective; spec revision effective
    (per D7); doc effective (per D7); training current for
    sign-off (per D8); customer-specific requirement overlay
    current (per H1 §7); region pinning honored;
    sub-processor DPA listed; ITAR person-of-record verified
    (per J3); AAL elevation if banned-decision in path; etc.

3.  Authoritative roots involved
    SO; CPO; QUO; allocations; RMA; concession addendums

4.  SM-1 full transition table (8-12 states; not 7)
    Every transition: state; event; guard; target;
    side-effects; evidence; SLO; per-pack overlay

5.  Saga discipline
    Multi-domain saga: SO release → JO release (D3) → batch
    release (D10 if regulated) → ship → invoice → close;
    per-step compensation; saga ledger; failure modes per step

6.  Branches (≥ 15 variants)
    Standard, repeat, contract, sample, return, replacement,
    drop-ship, kit, configurable, blanket, scheduling agreement,
    consignment, recall replacement, qualification lot, sample,
    rush, retail vs B2B, per-pack-specific, etc.

7.  Edge cases
    Partial allocation; partial ship; hold for credit; hold
    for engineering; hold for compliance; customer-requested
    change mid-flight; pricing change mid-flight; lot recall
    mid-flight; force majeure; cross-border tax issues;
    sanctions hit; concession-released lot ship; ITAR shipment;
    cold-chain shipment; cross-tenant supply chain;
    ECO mid-flight per D7; AI advisory disagreement;
    per-tenant freeze window encounters

8.  Cross-workflow couplings
    D1 ↔ D2 (procurement); D1 ↔ D3 (P2P); D1 ↔ D5 (disposition
    of returned); D1 ↔ D7 (doc effectivity); D1 ↔ D10 (batch
    release for regulated); D1 ↔ D11 (release to trace);
    D1 ↔ D12 (recall); D1 ↔ D14 (validation lot)

9.  Evidence emitted (per H4 every step + per pack)

10. SLO impact (per M5; per route; per saga step)

11. AI advisory touch points (per L2: AI-25 schedule
    optimizer; AI-26 sentiment; AI-28 customer reply draft)

12. Banned decisions never crossed (BD-1 + BD-8 in cascade
    paths)

13. Internationalization (currency; date; address per locale)

14. Vertical pack overlays (J1..J5 per branch)

15. Frontend surfaces involved (per Part F)

16. APIs invoked (per Part E)

17. Test categorization (per CSA per H2 + per pack)

18. KPIs / business signals (≥ 15 KPIs with target band +
    measurement)

19. Failure modes + recovery (≥ 18; concrete)

20. RACI per major action

21. Decision phrase
```

## Required substance

≥ 8,000 words.

## Acceptance criteria

```
[ ] ≥ 25 trigger catalog
[ ] ≥ 15 pre-conditions
[ ] SM-1 full transition table (8-12 states)
[ ] Saga discipline + compensation per step
[ ] ≥ 15 branches
[ ] ≥ 15 edge cases concrete
[ ] All cross-workflow couplings (D2, D3, D5, D7, D10, D11,
    D12, D14)
[ ] Per-pack overlay (J1..J5; especially Pharma DSCSA + MD UDI)
[ ] BD-1 + BD-8 banned-decision boundary
[ ] AI advisory integration (L2 features)
[ ] ≥ 15 KPIs concrete
[ ] ≥ 18 failure modes with concrete recovery
[ ] RACI per major action
[ ] Cross-references resolve
[ ] No marketing
[ ] Decision phrase emitted
```

## Decision phrase

```
S2-07_D1_ORDER_TO_CASH_DEEP_UPGRADE_COMPLETE
```

After: load `S2-08_D2_D3_PROCUREMENT_PRODUCTION.md`.
