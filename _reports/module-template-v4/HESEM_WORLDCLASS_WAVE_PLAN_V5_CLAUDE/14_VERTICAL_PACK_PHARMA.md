# 14_VERTICAL_PACK_PHARMA.md

## Purpose

GPT Pro V4 §07 W9 lists "Pharma vertical pack" as 3-4 weeks scope. V5 produces the engineering substance for the Pharma vertical pack (pharmaceuticals, biotech, life sciences).

Standards:

- 21 CFR Part 11 (electronic records / signatures) — covered in file 07
- 21 CFR Part 210 / 211 (drug cGMP)
- 21 CFR Part 820 (medical device QSR — separate vertical possibility)
- ICH Q7 (active pharmaceutical ingredients GMP)
- ICH Q9(R1) (quality risk management, 2023 revision)
- ICH Q10 (pharmaceutical quality system)
- ICH Q12 (lifecycle management)
- ICH Q14 (analytical procedure development, 2023)
- EU GMP Annex 1 (sterile manufacturing, 2023 revision)
- EU GMP Annex 11 (computerised systems) — covered in file 07
- EU GMP Annex 13 (investigational medicinal products)
- EU GMP Annex 15 (qualification & validation)
- EU GMP Annex 16 (QP certification)
- ISPE GAMP 5 Second Edition (computerised system validation)
- WHO TRS 957 / 992 (good manufacturing practices)
- ISO 14644 (cleanrooms)
- USP <1058> (analytical instrument qualification)
- DEA / WHO controlled substance handling
- FDA Drug Supply Chain Security Act (DSCSA) for serialization

---

## Section 1 — Pharma-specific data model

### 1.1 New authoritative roots (extend Wave 1-6 baseline)

```text
APR             Annual Product Review record
DEVIATION       Manufacturing deviation
BATCH_RECORD    Master batch record + executed batch record (per S88)
QC_SAMPLE       Quality control sample
STABILITY_STUDY Stability program study
STABILITY_PULL  Time-point sample pull from stability program
INV_RES         Investigation result (lab investigation under §211.192)
COMPLAINT       Drug product complaint
DRUG_PRODUCT    Master drug product reference (extends ITEM)
ACTIVE_INGREDIENT API / drug substance
EXCIPIENT       Inactive ingredient
SAFETY_REPORT   Pharmacovigilance / ICSR (Individual Case Safety Report)
RECALL          Recall record (Class I/II/III)
QP_DECLARATION  Qualified Person batch certification (EU)
DSCSA_TRANSACTION  Track-and-trace transaction
```

### 1.2 Edges

```text
BATCH_RECORD —EXECUTED_FROM→ MASTER_RECIPE
DEVIATION —AFFECTS→ BATCH_RECORD
INV_RES —INVESTIGATES→ DEVIATION
QC_SAMPLE —SAMPLED_FROM→ BATCH_RECORD
STABILITY_PULL —PART_OF→ STABILITY_STUDY
SAFETY_REPORT —MENTIONS→ DRUG_PRODUCT
RECALL —AFFECTS→ BATCH_RECORD (multiple)
QP_DECLARATION —CERTIFIES→ BATCH_RECORD
APR —SUMMARIZES→ DRUG_PRODUCT (annual window)
```

V5 ADR-0225: Pharma vertical pack new roots + edges.

---

## Section 2 — Two-person e-signature requirement

### 2.1 Mandatory two-factor for regulated transitions

Pharma has stricter e-sign than general:

```text
- 2-person sign on BREL approve_release
- 2-person sign on CAPA close
- 2-person sign on ECO approve (for regulated CDOC)
- QP batch certification: 1 person (the QP) but with cryptographic identity
```

### 2.2 Implementation

```yaml
# Pharma override of state machine obligations
pharma_overrides:
  brel.approve_release:
    obligations:
      - e_signature:
          factor_count: 2
          signers: 2                       # two distinct principals
          factors_per_signer: [password, totp]
          part11_compliant: true
          time_window_seconds: 300         # both sign within 5 min
  capa.action_close:
    obligations:
      - e_signature:
          factor_count: 2
          signers: 2
          factors_per_signer: [password, totp]
  qp_certification:
    obligations:
      - e_signature:
          factor_count: 2
          signers: 1                        # QP only, with HSM-backed key
          factors_per_signer: [password, totp, hsm_smart_card]
```

V5 ADR-0226: Pharma 2-person e-sign on regulated transitions.

---

## Section 3 — Mandatory reason for change

Every mutation requires a reason captured (per Annex 11 §10):

```text
- structured reason code (from controlled vocabulary)
- free-text justification (≥ 20 chars)
- stored in audit_event payload
```

Reason codes per category:

```text
- ROC-001  data correction
- ROC-002  process improvement
- ROC-003  regulatory change
- ROC-004  supplier change
- ROC-005  equipment change
- ROC-006  procedure update
- ROC-007  CAPA implementation
- ROC-008  risk mitigation
... (full taxonomy per customer)
```

V5 ADR-0227: Reason-for-change taxonomy + structured + free-text.

---

## Section 4 — Validation enforcement

Pharma forbids release of any record from a system component that is not currently validated.

```text
Pre-release evidence chain (extends file 08 §6.1):
  - all required inspections passed
  - lot quarantine cleared
  - relevant CAPA closed effectively
  - training compliance confirmed
  - equipment validation evidence fresh (within validation window)
  - calibration status valid
  - master batch record / control plan adherence verified
  + PHARMA-ADD: every component in the manufacturing chain is validated:
    - equipment IQ/OQ/PQ within window
    - method validation per USP <1225>
    - software validation per GAMP 5
    - facility qualification (HVAC, water systems)
  - 21 CFR Part 11 e-sign captured
  - audit chain extension confirmed
  - QP certification (EU)
```

V5 ADR-0228: Pharma validation enforcement: every chain component validated; otherwise release blocked.

---

## Section 5 — Annual Product Review (APR) generator

### 5.1 APR scope (per ICH Q7 §2.5 + 21 CFR 211.180(e))

For each licensed drug product, generate annually:

```text
- batch summary (count, yield, deviations)
- stability data trend
- complaint summary
- adverse event summary
- recall history
- specification adherence
- in-process control trend
- CAPA effectiveness
- supplier change history
- regulatory submission status
- changes (major/minor) with impact
```

### 5.2 Generator

```text
APR generator pulls from:
  - BATCH_RECORD authoritative_root
  - INV_RES authoritative_root
  - DEVIATION authoritative_root
  - COMPLAINT authoritative_root
  - SAFETY_REPORT authoritative_root
  - STABILITY_STUDY authoritative_root
  - SCAR + supplier change records
  - CAPA effectiveness records
  
Output: signed PDF per drug product per year, archived as evidence_artifact
```

V5 ADR-0229: APR generator + signed annual report.

---

## Section 6 — Stability program

### 6.1 Stability study schema

```text
STABILITY_STUDY:
  drug_product_id
  storage_conditions (e.g., 25C/60%RH, 30C/65%RH, 40C/75%RH)
  pull_schedule (months: 0, 3, 6, 9, 12, 18, 24, 36)
  acceptance_criteria
  status (active, completed, terminated)
  
STABILITY_PULL:
  study_id
  pull_at_month
  scheduled_at
  pulled_at
  test_results (assay, impurity, dissolution, etc.)
  pass_fail
  trend_assessment
```

### 6.2 OOS / OOT alerts

```text
OOS (Out-of-Specification): result outside acceptance criteria
                             → mandatory investigation
OOT (Out-of-Trend): result inside spec but trending toward fail
                     → CAPA candidate; investigate
```

V5 ADR-0230: Stability OOS/OOT detection + investigation workflow.

---

## Section 7 — DSCSA (Drug Supply Chain Security Act)

### 7.1 Track-and-trace requirements (US, post 2024 enforcement)

```text
- unique product identifier (NDC + serial number) on each saleable unit
- aggregation: case ↔ pallet ↔ shipment
- transaction information (TI) + transaction history (TH) + transaction statement (TS)
- electronic exchange (EPCIS standard)
- 6-year recordkeeping
- saleable returns verification
```

### 7.2 Implementation

```text
new authoritative_root: SERIALIZED_UNIT
  - GTIN, lot, serial, expiration date
  - aggregation parent_id
  - movement history (shipped, received, dispensed, destroyed)
  - status (active, dispensed, returned, recalled)

new edges:
  SERIALIZED_UNIT —AGGREGATED_INTO→ SERIALIZED_UNIT (case → pallet → shipment)
  DSCSA_TRANSACTION —TRANSFERS→ SERIALIZED_UNIT
```

V5 ADR-0231: DSCSA serialization + EPCIS event exchange.

---

## Section 8 — Pharmacovigilance

### 8.1 ICSR (Individual Case Safety Report)

```text
SAFETY_REPORT:
  case_id
  drug_product_id
  reporter_type (consumer, healthcare professional)
  patient (anonymized; demographic only)
  adverse_events[]
  seriousness (death, life-threatening, hospitalization, etc.)
  causality_assessment
  outcome
  reporting_obligations:
    - 7-day expedited (FDA, life-threatening)
    - 15-day expedited
    - periodic (PSUR / PADER)
```

### 8.2 E2B(R3) electronic exchange

V5 ADR-0232: ICH E2B(R3) format for ICSR exchange with authorities.

---

## Section 9 — EU MDR / IVDR (if Med Device sub-pack)

(Optional; if Med Device dimension in addition to drug)

```text
- UDI (Unique Device Identification)
- EUDAMED registration (post-market data exchange)
- DHF (Design History File) management
- DHR (Device History Record) per unit
- Vigilance reporting (incidents, FSCAs)
- PSUR for higher-risk devices
```

---

## Section 10 — Recall workflow

### 10.1 Recall classes (FDA)

```text
Class I: reasonable probability of serious adverse health consequences or death
Class II: temporary or medically reversible adverse health consequences
Class III: not likely to cause adverse health consequences
```

### 10.2 Recall execution

```text
1. detect (complaint trend, stability OOS, regulatory finding)
2. classify (Class I/II/III)
3. notify (FDA within 24h for Class I; 3 days Class II)
4. trace affected lots (via OTG genealogy)
5. notify customers (via DSCSA recall notice)
6. effectiveness check (% recovered)
7. close (post-recall report)
```

V5 ADR-0233: Recall workflow with OTG-driven impact analysis.

### 10.3 OTG impact analysis

```sql
-- Find all serialized units derived from a recalled lot
WITH RECURSIVE descendants AS (
  SELECT id FROM otg_node WHERE id = :recalled_lot_id
  UNION
  SELECT n.id FROM otg_node n
  JOIN otg_edge e ON e.subject_node_id = n.id
                 AND e.predicate = 'GENEALOGY'
  JOIN descendants d ON e.object_node_id = d.id
)
SELECT su.metadata->>'serial' AS serial_number,
       su.metadata->>'recipient' AS recipient
FROM otg_node su
WHERE su.id IN (SELECT id FROM descendants)
  AND su.resource_family = 'SERIALIZED_UNIT';
```

---

## Section 11 — Audit pack (FDA inspection ready)

V5 produces a Pharma-specific audit pack template:

```text
- inspection cover page (FDA Form 482 awareness)
- list of products manufactured at facility
- master batch record samples (3-5 most representative)
- executed batch records (random sample)
- deviation log (last 24 months)
- CAPA log (last 24 months)
- complaint log (last 24 months)
- annual product reviews (last 3 years)
- stability program summary
- personnel training records (sample)
- equipment qualification records (sample)
- cleaning validation
- environmental monitoring (sterile only)
- water system monitoring
- supplier qualification list
```

V5 ADR-0234: Pharma audit pack template + FDA inspection readiness.

---

## Section 12 — GxP scope expansion

For Pharma tenants, V5 expands gxp_classification scope:

```text
authoritative_roots in gxp scope:
  - all manufacturing roots (BATCH, MASTER_RECIPE, BREL)
  - all quality roots (NC, CAPA, INSPECTION, MRB)
  - all materials roots (LOT, IREV, ITEM)
  - all equipment roots (EQUIP, CAL, VAL, FMEA)
  - all documentation roots (CDOC, ECO, SOP)
  - all training roots (TRAIN-COURSE, TRAIN-RECORD, COMP-MATRIX)
  - all stability roots
  - all complaint roots
  - all safety report roots
  - all recall roots

Non-gxp:
  - finance roots (unless materially impactful)
  - HR roots (PII; subject to GDPR but not GxP)
  - some ingest analytics
```

---

## Section 13 — Annex 1 (Sterile Manufacturing) — sterile sub-pack

For sterile manufacturers, additional V5 controls:

```text
- contamination control strategy (CCS) document
- environmental monitoring (viable + non-viable particle counts)
- water quality (PW, WFI) monitoring with continuous trending
- gowning qualification per personnel
- aseptic process simulation (media fill) per shift annually
- isolator / RABS technology (recommended)
- pre-use post-sterilization integrity test (PUPSIT)
- visual inspection 100% of vials/syringes
```

V5 ADR-0235: Annex 1 sterile sub-pack with environmental monitoring.

---

## Section 14 — Performance targets

```text
- batch record execution: digital, no paper
- batch release lead time: target < 24h post-completion
- deviation closure cycle: target < 30 days
- CAPA closure: target < 90 days with effectiveness
- inspector readiness: audit pack export within 24h of request
```

---

## Section 15 — Cumulative ADRs

```text
ADR-0225  Pharma vertical pack new roots + edges
ADR-0226  Pharma 2-person e-sign on regulated transitions
ADR-0227  Reason-for-change taxonomy structured + free-text
ADR-0228  Pharma validation enforcement: every chain component validated
ADR-0229  APR generator + signed annual report
ADR-0230  Stability OOS/OOT detection
ADR-0231  DSCSA serialization + EPCIS
ADR-0232  ICH E2B(R3) format for ICSR
ADR-0233  Recall workflow OTG-driven
ADR-0234  Pharma audit pack + FDA inspection ready
ADR-0235  Annex 1 sterile sub-pack
```

---

## Decision phrase

```text
V5_PHARMA_VERTICAL_PACK_BASELINE_LOCKED
NEXT_FILE: 15_VERTICAL_PACK_AUTOMOTIVE.md
```
