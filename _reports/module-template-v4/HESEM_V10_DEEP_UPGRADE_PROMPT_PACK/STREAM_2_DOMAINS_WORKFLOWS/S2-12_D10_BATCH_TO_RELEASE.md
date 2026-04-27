# S2-12 — D10 Batch to Release (Standalone; Densest Regulated)

```
prompt_id:   S2-12
stream:      2
sequence:    12 of 14
effort:      ~80 minutes
```

## Pre-flight reading

```
1. S2-00 stream master
2. V9: D10_BATCH_TO_RELEASE.md (V9 already 241 lines; needs
   significant deepening)
3. Cross-refs: C5 + C6 + C7 + C8; M3 + M4 (SM-10);
   D3 + D5 + D7 + D8 + D9 (all feed BREL evidence chain);
   D11 (next workflow); E7 + E8 (sig + evidence);
   J1 (Pharma; densest pack here); J4 (MD release);
   J3 (Aero conformance); L1 (BD-1 batch release)
4. Standards: 21 CFR 211.165 + 211.188; EU GMP Annex 16
   (QP certification); ICH Q10 §3.2.1 release-related;
   ISA-88 batch control; ISO 13485 §7.5.6 production +
   service preservation; AS9100D §8.5; MDSAP single audit
   (where MD)
```

## Deliverable

```
PART_D_WORKFLOW_CATALOG/D10_BATCH_TO_RELEASE.md
```

## Depth requirements (D10 specific)

```
1.  Trigger catalog (≥ 15)
    All operations complete; OQC complete; qualification lot
    complete; sub-assembly complete; partial release; release
    against deviation (Pharma); rework re-test complete;
    concession-released; etc.

2.  Pre-release evidence chain (canonical; per H4 §3)
    EXHAUSTIVE list of evidence required per release:
    - All required inspections passed (EC-18)
    - Lot quarantine cleared (no open critical NCs blocking)
    - Relevant CAPAs closed effectively or non-blocking (EC-14)
    - Training compliance per qualified-person (EC-11)
    - Equipment validation evidence fresh (EC-1; per H2 §13)
    - Calibration current per critical instrument (EC-12)
    - MBR / Master Production Record adherence verified
      (per EBR; Pharma)
    - Cleaning state acceptable (Pharma per SM-CLEANING-V)
    - EM clean (Pharma sterile; per SM-EMP)
    - Aseptic personnel qualified (Pharma)
    - 21 CFR 11 e-sig captured (per E7 §2.3)
    - QP signature (Pharma EU per Annex 16; per BD-9)
    - PRRC signoff path (MD per BD-13..BD-16)
    - Audit chain extension confirmed (B6 C1)
    - DSCSA partner serial captured (Pharma per E15 §2.9)
    - UDI applied (MD per E15 §2.10)
    - FAI on file (Aero first-piece-per-revision; per BD-20)
    - PPAP on file (Auto per BD-17)
    - HACCP CCP within limit (Food per SM-CCP-MONITOR)
    - Allergen verification post-cleanup (Food)
    - Recall-not-in-effect verified
    - Validation evidence fresh per H2 §13

3.  SM-10 full transition table (4 → 6+ states; per BD-1)

4.  Step substance (multi-stage canonical)
    Step 1: pre-flight evidence assembly
    Step 2: QP / PRRC pre-release pack review
    Step 3: signature capture (per E7; multi-sig per L1 quorum)
    Step 4: release commit (per E3; cascade to D11 + D1)
    Step 5: certificate of analysis / conformance issued
    Step 6: DSCSA partner exchange (Pharma per E15.9)
    Step 7: UDI submission (MD per E15.10)
    Step 8: per-pack additional regulator submission

5.  Branches (≥ 12)
    Standard release; concession-release with addendum;
    per-customer concession; recall replacement release;
    qualification lot release; stability sample release;
    investigational drug (Pharma IMP per Annex 13);
    clinical trial (MD per ISO 14155); custom-made (MD per
    MDR Art 52); partial release; release-against-deviation
    (Pharma documented exception)

6.  Edge cases
    Concession overuse pattern; aseptic re-qual lapsed mid-
    campaign; sterilization revalidation overdue; AD/SB late
    discovered; post-release recall scope; QP unavailability

7.  Cross-workflow couplings
    D10 ← D3 (production), D4 (incoming), D5 (disposition),
    D6 (NC/CAPA), D7 (doc effective), D8 (training), D9
    (calibration + cleaning + sterilizer)
    D10 → D11 (release to trace), D1 (customer ship), D14
    (validation supply where applic)

8.  Failure modes (≥ 15)
    Composition gate failure (per H4 §3); QP signature without
    chain (axiom rejection); partner exchange failure (DSCSA);
    UDI submission late; per-pack window missed (per H1 §3);
    concession overuse; recall mid-flight; etc.

9.  KPIs (≥ 15)
    RFT (Right-First-Time) release; QP cycle p95; concession
    rate; recall avoidance evidence; per-pack regulator
    submission timeliness; per-customer SLA compliance;
    SOC 2 + GxP evidence completeness

10. RACI per major action

11. Per-pack overlay substantive
    PHARMA: BREL with full chain + APR contribution + DSCSA
    AUTO: per-OEM CSR + PSW + PPAP-verified
    AERO: AS9100D §8.5; AS9120B distributor; FAI required
    MD: PRRC release + UDI + sterilization re-val verified
    FOOD: lot release per Food Safety Plan; allergen
    verification; sanitary-transport check

12. Cross-references inter-Part exhaustive

13. Decision phrase
```

## Required substance

≥ 9,000 words. D10 is the densest regulated workflow.

## Acceptance criteria

```
[ ] All 13 sections present per S2-00 template
[ ] Pre-release evidence chain canonical (≥ 20 items)
[ ] BD-1 banned-decision boundary spec
[ ] Per-pack overlay substantive (especially J1 + J4)
[ ] ≥ 12 branches + ≥ 6 edge cases
[ ] Cross-workflow couplings exhaustive
[ ] AI advisory integration (where applicable)
[ ] ≥ 15 KPIs concrete; ≥ 15 failure modes concrete
[ ] RACI per major action
[ ] Cross-references resolve
[ ] No marketing
[ ] Decision phrase emitted
[ ] Length ≥ 9,000 words
```

## Decision phrase

```
S2-12_D10_BATCH_TO_RELEASE_DEEP_UPGRADE_COMPLETE
```

After: load `S2-13_D11_D12.md`.
