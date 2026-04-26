# 21 — V8 Vertical Pack Dependency Paths

```text
purpose:        Specify per-vertical dependency paths V7 lists as flat (Pharma/Auto/Aero packs)
predecessor:    V7 §21 (5 packs as flat root list)
v8_advance:     Per-pack: required-roots-prerequisites + L-level path + sequence + customer profile
work_package:   WP-V8-VPATH (5 work packages, one per pack)
owner:          Vertical Pack Lead per pack (Pharma/Auto/Aero/MedDevice/Food)
estimate:       per-pack 8-12 wk authoring + per-customer adoption
```

---

## 1. Pharma pack dependency path

```text
prerequisite: W0.5 + W1 + W2 + W3 + W4.5 + W5 + W6 + W7 + W9 (validation core)
target_wave: W10
required_roots_at_L≥5_before_pack:
  - ITEM, IREV, BOM, ROUTE       (master data)
  - LOT, SERIAL, INVTXN          (material)
  - JO, WO, OPER                 (execution)
  - INSP, NQCASE, CAPA, CDOC, ECO, MRB  (eQMS)
  - BREL, RECALL                 (release)
  - TRAIN_COURSE, TRAIN_RECORD, COMP_MATRIX  (workforce)
  - EQP, CAL, FMEA, VAL          (equipment + validation)
pack_only_roots:
  - APR (Annual Product Review)
  - DEVIATION (manufacturing deviation)
  - BATCH_RECORD (master + executed)
  - QC_SAMPLE
  - STABILITY_STUDY + STABILITY_PULL
  - SAFETY_REPORT (ICSR)
  - DSCSA_TRANSACTION (US)
  - QP_DECLARATION (EU)
pack_specific_substrates:
  - 2-person e-sign on BREL/CAPA-close/ECO-approve
  - GAMP 5 Cat 4 baseline (Cat 5 for custom workflows)
  - DSCSA serialization (US)
  - EU GMP Annex 1 sterile sub-pack (optional)
customer_profile:
  - Pharmaceutical manufacturer
  - 21 CFR 210/211 + ICH Q7 + Annex 11 + Annex 13 + Annex 15 + Annex 16
  - typical ARR: $500k-$2M (mid-market) or $2M-$10M (enterprise)
  - typical implementation time: 6-12 months
adoption_path:
  Step 1: customer signs vertical pack ADR
  Step 2: validation scoping + URS authoring (8 wk)
  Step 3: tenant provisioning + GAMP IQ (2 wk)
  Step 4: master data migration + per-product OQ (4-8 wk)
  Step 5: pilot batch + PQ (4 wk)
  Step 6: go-live as pre-production (3 mo observation)
  Step 7: full production cutover with validation_summary_report signed (per ADR-V8-RELEASE)
```

---

## 2. Automotive pack dependency path

```text
prerequisite: W0.5..W7 + IATF baseline gates
target_wave: W10
required_roots_at_L≥5_before_pack:
  same master data + execution + eQMS as Pharma
  + SUP, SUP_QUAL, SCAR (procurement quality emphasis)
pack_only_roots:
  - APQP, PSW, PPAP
  - CONTROL_PLAN, GAGE_RR (MSA)
  - WARRANTY_CLAIM, FIELD_RETURN
  - LPA_PLAN, LPA_AUDIT_RUN (layered process audit)
  - SPECIAL_PROCESS (CQI-9..23)
  - REQUIREMENT_LINK (per-OEM CSR)
  - IMDS declaration (material data)
pack_specific_substrates:
  - PPAP submission generator (18 elements)
  - APQP 5-phase state machine
  - 8D problem-solving workflow
  - CSR repository per OEM (Ford Q1, GM BIQS, etc.)
  - EDI ANSI X12 / EDIFACT integration
  - ASPICE process areas (optional sub-pack for E/E)
  - ISO 26262 (optional for safety-critical electronics)
customer_profile:
  - Tier 1-2 automotive supplier
  - IATF 16949 + customer-specific
  - typical ARR: $300k-$1.5M
  - typical implementation: 4-9 months
```

---

## 3. Aerospace pack dependency path

```text
prerequisite: W0.5..W7 + AS9100D baseline + ITAR readiness
target_wave: W10
pack_only_roots:
  - AS9102_FAI (First Article Inspection)
  - NADCAP_CERT (per CQI series)
  - COUNTERFEIT_CHECK (AS5553/AS6174)
  - SOFTWARE_CONFIG_CONTROL (DO-178C)
  - HARDWARE_CONFIG_CONTROL (DO-254)
  - SERVICE_LIFE_RECORD
  - MRO_ENGINE_RECORD (Part 145)
  - ITAR_CONTROL
  - QPL/QML registry
pack_specific_substrates:
  - AS9102 Rev C FAI generator with bubble drawings
  - NADCAP cert tracking + re-accreditation alerts
  - Counterfeit-parts workflow + GIDEP reporting
  - CMMC 2.0 control evidence mapping (DoD)
  - CUI handling per NIST SP 800-171
  - ITAR person-of-record verification + region pinning
customer_profile:
  - Aerospace OEM or Tier 1
  - AS9100D + NADCAP + DFARS + ITAR
  - typical ARR: $500k-$2M
  - typical implementation: 8-14 months (long due to certification cycles)
```

---

## 4. Medical Device pack dependency path

```text
prerequisite: W0.5..W7
target_wave: W10
pack_only_roots:
  - DHF (Design History File)
  - DHR (Device History Record)
  - UDI (Unique Device Identification)
  - COMPLAINT (already in core; pack adds reportability evaluator)
  - VIGILANCE_REPORT (FDA MDR / EU MIR)
  - PSUR (Periodic Safety Update Report; high-risk devices)
  - RISK_FILE_ENTRY (per ISO 14971)
  - IFU (Instructions for Use)
pack_specific_substrates:
  - 21 CFR 820 (FDA QSR) + ISO 13485
  - ISO 14971 risk management module
  - EUDAMED registration interface (EU)
  - UDI generator + GS1 compliance
  - reportability evaluator with regulatory affairs notification
customer_profile:
  - Medical device manufacturer (Class I/II/III)
  - typical ARR: $300k-$2M
  - typical implementation: 6-14 months
```

---

## 5. Food / FSMA pack dependency path

```text
prerequisite: W0.5..W7
target_wave: W10
pack_only_roots:
  - HACCP_PLAN (Hazard Analysis Critical Control Points)
  - PCQI (Preventive Controls Qualified Individual record)
  - RECALL (already in core; pack adds traceability)
  - SUPPLIER_VERIFICATION (FSVP)
  - ALLERGEN_CONTROL
pack_specific_substrates:
  - 21 CFR 117 / FSMA preventive controls
  - HACCP plan workflow
  - allergen management
  - traceability for high-risk foods (FSMA 204)
customer_profile:
  - Food manufacturer / processor / packer
  - typical ARR: $200k-$1M
  - typical implementation: 4-9 months
```

---

## 6. Decision phrase

```text
V8_VERTICAL_PACK_DEPENDENCY_PATHS_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-VPATH-PHARMA, AUTO, AERO, MED-DEVICE, FOOD (5 WPs)
NEXT_FILE: 22_V8_VALIDATION_FEEDBACK_LOOP.md
```
