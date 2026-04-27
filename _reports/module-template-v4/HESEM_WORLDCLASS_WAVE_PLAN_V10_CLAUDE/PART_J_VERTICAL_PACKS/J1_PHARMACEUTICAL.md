# J1 — Pharmaceutical Vertical Pack (V10 Deep Upgrade)

```
pack_id:        Pharma
schema_version: 10.0
owner_role:     Pharma Lead; Compliance Lead; QP / Designated Person
wave_target:    W10 sterile-injectable preview; W11 GA
sources:        21 CFR Part 11 / 207 / 210 / 211 / 212 / 314 /
                600–680 / 606 / 803 / 7 (recall);
                EU GMP Annex 1 (2022) / 11 / 13 / 15 / 16 / 17 / 21;
                ICH Q1A–Q14 + E2B(R3);
                WHO TRS 957 / 992;
                DSCSA (21 USC 360eee-1 through 360eee-4);
                EU FMD Regulation (EU) 2016/161;
                USP <795> / <797> / <800> / <1058>;
                ISO 14644-1/2/3 (cleanroom classification);
                PIC/S PI 041-1 (data integrity);
                ASTM E2500-13 (specification and verification);
                Health Canada Division 2 (Food and Drug Regulations);
                ANVISA RDC 658 / 2022
```

The Pharma pack is the regulatory-densest vertical HESEM serves. It
carries the largest authoritative-root surface, the strictest signing
discipline (BD-9 QP declaration; BD-10 DSCSA TI; BD-11 IND; BD-12
recall), and the widest jurisdictional scope (US / EU / WHO / CA /
BR). Every other vertical pack reuses parts of Pharma's e-signature,
audit-chain, WORM, and validation-lifecycle substrate, extended for
its own domain.

---

## 1. Sub-vertical taxonomy (15 sub-verticals)

Each sub-vertical is a tenant attribute set in `tenant_config.pharma_sub_vertical`
(array; multi-value). The pack runtime activates overlays per value.

```
SUB-VERTICAL                      PRIMARY REGULATION DELTA
─────────────────────────────────────────────────────────────────────
1  API synthesis                   ICH Q7 GMP for APIs; ICH Q3A/B/C/D
                                   impurity limits; 21 CFR 211.100–114
                                   process controls (API section)
2  Drug product, solid oral        ICH Q1A–Q1E stability; dissolution
                                   per USP <711>; content uniformity
                                   per 21 CFR 211.110
3  Drug product, sterile           EU GMP Annex 1 (2022) contamination
   injectable                      control strategy; environmental
                                   monitoring; media fill; visible
                                   particulate inspection per USP <790>
4  Drug product, inhalation        USP <601> aerodynamic particle-size
                                   distribution; 21 CFR 211.110 in-
                                   process; device compatibility
5  Drug product, topical           USP <41> weights & measures; skin
                                   absorption bioequivalence
6  Biologics / biosimilars         21 CFR 600–680; potency assay;
                                   potency stability; ICH Q5A–E
7  Cell and gene therapy           21 CFR 1271; viability assays;
                                   real-time release testing (RTRT);
                                   cryogenic chain; lentiviral titer
8  Investigational IMP             EU GMP Annex 13; IND/CTX expanded
                                   access logs; blinding reconciliation
9  PET radiopharmaceutical         21 CFR 212; USP <823>; abbreviated
                                   release process; decay correction
10 OTC / consumer health           OTC monograph compliance; 21 CFR 330;
                                   labeling under 21 CFR 201
11 Compounded (503A / 503B)        USP <795> non-sterile; USP <797>
                                   sterile; USP <800> hazardous drugs;
                                   PCAB accreditation overlay
12 Veterinary drug                 21 CFR 514; NADA/ANADA; residue
                                   studies
13 Combination product             21 CFR Part 4 (primary mode); device
   (drug + device)                 portion per ISO 13485 / 21 CFR 820;
                                   single-entity or co-packaged
14 DSCSA trading partner           Supply-chain serialization; TI/TH/TS
   (mfr / repackager / WSD /       exchange at each custodial transfer;
   dispenser)                      lot-level → unit-level transition
                                   (full unit-level effective 2023-11-27)
15 EU FMD participant              Regulation (EU) 2016/161; 2D DataMatrix
                                   + unique identifier; tamper-evident
                                   feature; EMVS gateway verification
                                   at dispense; decommissioning per
                                   Article 25
```

---

## 2. Authoritative roots (30 roots, full specification)

Naming convention for IDs: `AR-J1-NNN`. Each root inherits platform
evidence class, audit chain, e-sig, and WORM per H5. Retention floor
is the platform floor plus any pack overlay (§14 of this document).

---

### AR-J1-001 Annual Product Review (APR)

```
Canonical name:  Annual Product Review
Owning SM:       SM-APR (§3.1)
Evidence class:  EC-1 (authoritative root)
Key fields:
  apr_id               UUID PK
  product_id           FK → master_product
  review_period_start  date (YYYY-01-01 typically)
  review_period_end    date
  review_status        enum: DRAFT | IN_REVIEW | QP_REVIEWED |
                             APPROVED | PUBLISHED | NEXT_CYCLE_OPEN
  batch_count          integer
  deviation_count      integer
  oos_count            integer
  stability_trend      enum: WITHIN_SPEC | OOT | OOS | PENDING
  complaints_count     integer
  capa_count           integer
  process_capability   jsonb  (Cpk per CQA)
  conclusions_text     text
  qp_signature_id      FK → esig_record (null until QP_REVIEWED)
  approved_by_id       FK → esig_record (null until APPROVED)
  next_review_due      date   (review_period_end + 365d; system-set)
Retention floor:  max(product_approval_date + 25 yr, last_review + 10 yr)
Banned decisions: BD-9 (AI cannot issue QP declaration on APR);
                  BD-1 (AI cannot approve APR)
```

---

### AR-J1-002 Manufacturing Deviation

```
Canonical name:  Manufacturing Deviation
Owning SM:       SM-DEV (§3.2)
Evidence class:  EC-1 (authoritative root); EC-14 (CAPA link)
Key fields:
  deviation_id         UUID PK
  lot_id               FK → executed_batch_record
  deviation_type       enum: PLANNED | UNPLANNED
  severity             enum: CRITICAL | MAJOR | MINOR
  occurrence_datetime  timestamptz
  description_text     text
  root_cause_text      text (required at CLOSED)
  regulatory_impact    boolean
  capa_id              FK → capa_record (required if severity MAJOR/CRITICAL)
  blocks_batch_release boolean (system-set from SM-DEV × SM-10 coupling)
  closed_by_id         FK → esig_record (2-person quorum)
  closed_at            timestamptz
Retention floor:  product shelf-life + 1 yr; min 15 yr per 21 CFR 211.180
Banned decisions: BD-1 (AI cannot close a CRITICAL deviation without
                       human QA review sign-off)
```

---

### AR-J1-003 Master Batch Record (MBR)

```
Canonical name:  Master Batch Record
Owning SM:       SM-7 (document lifecycle); effectivity gates SM-10
Evidence class:  EC-1
Key fields:
  mbr_id               UUID PK
  product_id           FK → master_product
  version              semver string
  status               enum: DRAFT | IN_REVIEW | APPROVED |
                             EFFECTIVE | OBSOLETE | SUPERSEDED
  effective_date       date
  superseded_date      date
  formulation_jsonb    jsonb (ingredients, quantities, UoM)
  process_steps_jsonb  jsonb (per ISA-88 procedure model)
  in_process_tests     jsonb
  yield_formula        text
  approved_by_id       FK → esig_record (QA + QP co-sign for EU)
Retention floor:  perpetual; 25 yr minimum per EU GMP Annex 11 §17
Banned decisions: BD-1 (AI cannot approve MBR to EFFECTIVE)
```

---

### AR-J1-004 Executed Batch Record (EBR)

```
Canonical name:  Electronic Batch Record
Owning SM:       SM-10 (batch execution + release)
Evidence class:  EC-8 (transaction); EC-12 (audit anchor)
Key fields:
  ebr_id               UUID PK
  mbr_id               FK → master_batch_record (version-locked at start)
  lot_number           varchar(50) (GS1 GTIN + lot)
  manufacturing_date   date
  expiry_date          date
  batch_size           numeric (with UoM)
  status               enum: OPEN | IN_PROCESS | COMPLETE | RELEASED |
                             REJECTED | RECALLED
  steps_jsonb          jsonb (per-step: operator_esig, timestamp,
                               actual_value, in_spec boolean,
                               deviation_id nullable)
  yield_actual         numeric
  yield_target         numeric
  qp_release_id        FK → qp_declaration (null until RELEASED)
  worm_sealed_at       timestamptz (system-set on RELEASED or REJECTED)
Retention floor:  product shelf-life + 1 yr; min 25 yr; perpetual for GxP
Banned decisions: BD-1 (AI cannot set status RELEASED);
                  BD-9 (AI cannot issue QP declaration)
```

---

### AR-J1-005 QC Sample

```
Canonical name:  QC Sample
Owning SM:       SM-INSP-QC (variant of SM-5)
Evidence class:  EC-1; EC-8
Key fields:
  sample_id            UUID PK
  lot_id               FK → executed_batch_record | null (for stability)
  sample_type          enum: RELEASE | IN_PROCESS | STABILITY |
                             ENVIRONMENTAL | WATER | RETAIN
  sample_point         varchar (location / pull-point)
  collected_by_id      FK → user
  collected_at         timestamptz
  test_plan_id         FK → test_plan
  results_jsonb        jsonb (per test: spec, result, unit, oos boolean)
  disposition          enum: PENDING | PASS | OOS | OOT | INVALID
  oos_investigation_id FK → deviation (required if OOS)
  chain_of_custody     jsonb (each transfer timestamped + signed)
Retention floor:  per ICH Q1A test-type specific; min 2 yr post-release
Banned decisions: BD-1 (AI cannot set disposition PASS; advisory only)
```

---

### AR-J1-006 Stability Study

```
Canonical name:  Stability Study
Owning SM:       SM-STAB (§3.3)
Evidence class:  EC-1
Key fields:
  study_id             UUID PK
  product_id           FK → master_product
  study_type           enum: PRIMARY | ACCELERATED | STRESS |
                             PHOTOSTABILITY | ONGOING | SUPPORTIVE
  protocol_version     semver
  storage_conditions   jsonb (temperature, RH, per ICH Q1A Table 1)
  pull_schedule_jsonb  jsonb (time points: 0,3,6,9,12,18,24,36,48,60 mo)
  status               enum: PLANNED | ONGOING | COMPLETED | CANCELLED
  oos_count            integer
  oot_count            integer
  protocol_locked_at   timestamptz (WORM after first pull committed)
  protocol_amendment_id FK → stability_protocol_amendment | null
Retention floor:  product approval + 25 yr; per ICH Q1A §6.7
Banned decisions: BD-1 (AI cannot close study as COMPLETED)
```

---

### AR-J1-007 Stability Pull

```
Canonical name:  Stability Pull
Owning SM:       sub-state of SM-STAB pull point machine
Evidence class:  EC-8
Key fields:
  pull_id              UUID PK
  study_id             FK → stability_study
  pull_point_label     varchar (e.g., "T=12M")
  scheduled_date       date
  actual_date          date
  status               enum: DUE | DRAWN | IN_TESTING | REVIEWED |
                             ACCEPTED | OOS | OOT
  samples_jsonb        jsonb (sample_id array)
  results_jsonb        jsonb (per parameter per ICH Q1A)
  deviation_id         FK → manufacturing_deviation | null (if OOS/OOT)
  reviewed_by_id       FK → esig_record
Retention floor:  per parent stability study
Banned decisions: BD-1 (AI cannot accept pull as ACCEPTED)
```

---

### AR-J1-008 ICSR (Individual Case Safety Report)

```
Canonical name:  Individual Case Safety Report
Owning SM:       SM-ICSR (§3.4)
Evidence class:  EC-20 (complaint); EC-21 (reportable event)
Key fields:
  icsr_id              UUID PK
  source_type          enum: SPONTANEOUS | SOLICITED | LITERATURE |
                             CLINICAL_STUDY | SOCIAL_MEDIA | REGULATOR
  serious             boolean
  serious_criteria    jsonb (death, life-threatening, hospitalization,
                              disability, congenital, other)
  expectedness        enum: EXPECTED | UNEXPECTED | UNKNOWN
  causality           enum: CERTAIN | PROBABLE | POSSIBLE | UNLIKELY |
                              CONDITIONAL | UNASSESSABLE
  meddra_pt_code      varchar (MedDRA Preferred Term)
  e2b_r3_xml          text (serialized ICH E2B(R3) XML)
  reporting_window_days integer (7, 15, or periodic per jurisdiction)
  submission_deadline timestamptz (calculated on assessment)
  submitted_at        timestamptz | null
  follow_up_due       timestamptz | null
  status              enum: INTAKE | TRIAGED | ASSESSED | CODED |
                            SUBMITTED | FOLLOW_UP | CLOSED
  regulator_ack_id    varchar (EMA/VAERS/FDA receipt)
Retention floor:  25 yr from case creation; per ICH E2C(R2)
Banned decisions: BD-1 (AI cannot submit ICSR to regulator)
```

---

### AR-J1-009 DSCSA Transaction Set (TI / TH / TS)

```
Canonical name:  DSCSA Transaction Set
Owning SM:       SM-DSCSA (§3.5)
Evidence class:  EC-37 (DSCSA); EC-8
Key fields:
  txset_id             UUID PK
  txset_type           enum: TI | TH | TS
  trading_partner_id   FK → trading_partner
  product_identifier   varchar (GTIN-14 + lot + expiry + serial if unit-
                               level; per DSCSA §582(a)(8))
  quantity             integer
  transaction_date     date
  shipment_id          FK → shipment_record
  verification_status  enum: PENDING | VERIFIED | SUSPECT | ILLEGITIMATE |
                              QUARANTINED
  suspect_reason       text | null
  investigation_opened_at timestamptz | null (3-day clock start)
  investigation_closed_at timestamptz | null
  atp_proof_id         FK → atp_record | null (authorized trading partner)
Retention floor:  6 yr per 21 USC 360eee-1(e)(1)(A)
Banned decisions: BD-10 (AI cannot sign or transmit TI as authorized
                        trading partner)
```

---

### AR-J1-010 Serialized Unit (EU FMD)

```
Canonical name:  Serialized Unit
Owning SM:       serialization lifecycle
Evidence class:  EC-37
Key fields:
  serial_id            UUID PK
  gtin                 varchar(14)
  serial_number        varchar(20) (per GS1 DataMatrix AIDC)
  batch_number         varchar
  expiry_date          date
  ui_status            enum: ACTIVE | DECOMMISSIONED | EXPORTED |
                              SAMPLE | STOLEN | RECALLED | LOCKED
  emvs_status          enum: VERIFIED | NOT_VERIFIED | DISPENSED |
                              DESTROYED | EXPORTED
  dispensed_at         timestamptz | null
  dispense_location_id FK → dispensing_site | null
  verification_event   jsonb (EPCIS 2.0 ObjectEvent payload)
Retention floor:  5 yr post expiry per (EU) 2016/161 Art 35; or 1 yr
                  beyond product shelf-life
Banned decisions: BD-10 (AI cannot generate or activate serial number)
```

---

### AR-J1-011 QP Declaration

```
Canonical name:  QP Declaration
Owning SM:       SM-10 (RELEASED gate)
Evidence class:  EC-1; EC-12
Key fields:
  qp_decl_id           UUID PK
  ebr_id               FK → executed_batch_record
  qp_user_id           FK → user (must carry role QP)
  declaration_text     text (per EU GMP Annex 16 §3.2 template)
  certifying_country   varchar(2) ISO (country of batch release)
  eu_ms_requirements   jsonb (per-MS extensions)
  esig_id              FK → esig_record (QP e-sig; CFR Part 11 + Annex 11)
  declared_at          timestamptz
  pre_release_pack_id  FK → pre_release_pack
Retention floor:  product shelf-life + 5 yr; min 25 yr per Annex 16 §5
Banned decisions: BD-9 (AI cannot issue or sign QP declaration)
```

---

### AR-J1-012 Pre-Release Evidence Pack

```
Canonical name:  Pre-Release Pack
Owning SM:       SM-10 gate (all components checked before QP unlock)
Evidence class:  EC-5 (validation artifact)
Key fields:
  pack_id              UUID PK
  ebr_id               FK → executed_batch_record
  mbr_current          boolean (MBR status = EFFECTIVE at batch start)
  all_equipment_qualified boolean
  cleaning_current     boolean (last cleaning_validation_cycle ACCEPTED
                                within validity window)
  em_status_ok         boolean (no open EM excursions on the line)
  water_ok             boolean (no open water system alerts)
  all_tests_passed     boolean (QC Sample dispositions = PASS)
  stability_ok         boolean (no unresolved OOS/OOT pulls)
  all_deviations_resolved boolean (no open CRITICAL/MAJOR deviations
                                    blocking batch)
  personnel_qualified  boolean (all operators have current aseptic quals)
  generated_at         timestamptz
  component_snapshot_jsonb jsonb (FK + status of each component at time)
Retention floor:  same as linked EBR
Banned decisions: BD-9 (AI cannot mark all-components OK to force unlock)
```

---

### AR-J1-013 Cleaning Validation Cycle

```
Canonical name:  Cleaning Validation Cycle
Owning SM:       SM-CLEANING-V (§3.6)
Evidence class:  EC-5; EC-1
Key fields:
  cycle_id             UUID PK
  equipment_id         FK → equipment_master
  cleaning_procedure_id FK → sop_document
  product_worst_case   varchar (product with highest allowable residue)
  acceptance_criteria_jsonb jsonb (per MAC / MACO per ASTM E2500)
  swab_results_jsonb   jsonb (per location, per analyte, limit, result)
  rinse_results_jsonb  jsonb
  visual_inspection    enum: PASS | FAIL
  overall_status       enum: PLANNED | EXECUTING | ANALYSED |
                             ACCEPTED | FAILED
  validity_months      integer (protocol-defined re-validation interval)
  next_revalidation_due date
  closed_by_id         FK → esig_record
Retention floor:  equipment lifetime + 5 yr; min 15 yr
Banned decisions: BD-1 (AI cannot accept cleaning cycle as ACCEPTED)
```

---

### AR-J1-014 Environmental Monitoring Run

```
Canonical name:  Environmental Monitoring Run
Owning SM:       SM-EMP (§3.7)
Evidence class:  EC-8
Key fields:
  em_run_id            UUID PK
  area_id              FK → cleanroom_area (ISO 14644-1 class stored)
  shift_date           date
  shift_type           enum: A | B | C | OVERNIGHT
  sample_plan_id       FK → em_sample_plan
  results_jsonb        jsonb (per sample point: type [settle plate /
                               active air / contact plate / fingerdab],
                               cfu_count, alert_limit, action_limit)
  alert_triggered      boolean
  action_triggered     boolean
  excursion_id         FK → manufacturing_deviation | null
  reviewed_by_id       FK → esig_record
Retention floor:  product shelf-life + 1 yr; min 10 yr per Annex 1 §9
Banned decisions: BD-1 (AI cannot clear an action limit excursion)
```

---

### AR-J1-015 Media Fill Run

```
Canonical name:  Media Fill Run
Owning SM:       SM-MEDIA-FILL (§3.8)
Evidence class:  EC-5
Key fields:
  mf_run_id            UUID PK
  fill_line_id         FK → manufacturing_line
  run_date             date
  units_filled         integer (target ≥ 5000 per Annex 1 §9.36)
  units_incubated      integer
  contamination_count  integer
  contamination_rate   numeric (contamination_count / units_incubated)
  acceptance_limit     numeric (0.1% for ≥5000; 0 for <5000)
  status               enum: PLANNED | FILLED | INCUBATED | READ |
                             PASSED | FAILED | INVALIDATED
  failure_investigation_id FK → manufacturing_deviation | null
  approved_by_id       FK → esig_record
Retention floor:  10 yr per EU GMP Annex 1 §9
Banned decisions: BD-1 (AI cannot invalidate a failed media fill without
                       human QA and QP review)
```

---

### AR-J1-016 Water System Monitoring Record

```
Canonical name:  Water System Monitoring
Owning SM:       periodic monitoring lifecycle
Evidence class:  EC-8
Key fields:
  wm_id                UUID PK
  loop_id              FK → water_loop (WFI / PW / HPW)
  sample_point         varchar
  sample_date          date
  conductivity_us_cm   numeric
  toc_ppb              numeric
  microbial_cfu_100ml  integer
  endotoxin_eu_ml      numeric | null (WFI only; USP <85>)
  alert_limit_breach   boolean
  action_limit_breach  boolean
  excursion_id         FK → manufacturing_deviation | null
Retention floor:  10 yr; per 21 CFR 211.180
Banned decisions: none pack-specific (platform BD-1 applies)
```

---

### AR-J1-017 HVAC Qualification Record

```
Canonical name:  HVAC Qualification
Owning SM:       SM-7 (qualification document lifecycle)
Evidence class:  EC-5
Key fields:
  hvac_qual_id         UUID PK
  area_id              FK → cleanroom_area
  qualification_type   enum: IQ | OQ | PQ | RE_QUALIFICATION | PERIODIC
  iso_class_target     integer (per ISO 14644-1)
  air_changes_per_hr   numeric
  pressure_differential_pa numeric
  hepa_filter_integrity boolean (DOP / PAO test result)
  temperature_degC     numeric
  rh_percent           numeric
  particle_counts_jsonb jsonb (0.5µm / 5.0µm per ISO 14644-1 Table 1)
  status               enum: PLANNED | EXECUTING | ACCEPTED | FAILED
  next_requalification_due date (per protocol-defined interval)
  approved_by_id       FK → esig_record
Retention floor:  equipment lifetime + 5 yr; min 15 yr
Banned decisions: BD-1 (AI cannot approve HVAC qualification)
```

---

### AR-J1-018 Aseptic Personnel Qualification

```
Canonical name:  Aseptic Personnel Qualification
Owning SM:       personnel qualification lifecycle
Evidence class:  EC-5
Key fields:
  apq_id               UUID PK
  user_id              FK → user
  qualification_type   enum: INITIAL | ANNUAL | RE_QUALIFICATION |
                              AFTER_ABSENCE | AFTER_INCIDENT
  gown_test_result     enum: PASS | FAIL
  media_fill_participation_id FK → media_fill_run | null
  fingerdab_result_cfu integer
  validity_date        date (expiry of this qualification)
  status               enum: CURRENT | EXPIRED | SUSPENDED
  approved_by_id       FK → esig_record (line supervisor + QA)
Retention floor:  employment term + 10 yr; min 15 yr per GMP expectation
Banned decisions: BD-1 (AI cannot grant CURRENT status)
```

---

### AR-J1-019 Pharmacovigilance Signal Record

```
Canonical name:  PV Signal
Owning SM:       signal lifecycle
Evidence class:  EC-21
Key fields:
  signal_id            UUID PK
  product_id           FK → master_product
  meddra_soc_code      varchar (System Organ Class)
  meddra_pt_code       varchar (Preferred Term)
  signal_source        enum: ICSR_AGGREGATE | LITERATURE | SPONTANEOUS |
                              WHO_VIGIBASE | EMEA_EUDRAVIGILANCE | EHR
  disproportionality_ror numeric (Reporting Odds Ratio; advisory only)
  signal_strength      enum: WEAK | MODERATE | STRONG
  status               enum: DETECTED | UNDER_EVALUATION | VALIDATED |
                             REFUTED | ACTION_TAKEN | CLOSED
  action_type          enum: LABEL_UPDATE | REMS | DHCP | MARKET_WITHDRAWAL
                              | NONE | null
  action_id            FK → recall_decision | rems_record | null
Retention floor:  25 yr; per ICH E2C(R2) §5.4
Banned decisions: BD-1 (AI cannot validate a signal or trigger recall;
                       advisory only per L2 AI-32)
```

---

### AR-J1-020 Recall Decision

```
Canonical name:  Recall Decision
Owning SM:       SM-RECALL (§3.9)
Evidence class:  EC-1; EC-21
Key fields:
  recall_id            UUID PK
  lot_ids              UUID[] (affected lots)
  recall_class         enum: CLASS_I | CLASS_II | CLASS_III | MARKET_WITHDRAWAL
  scope_countries      varchar[] ISO
  fda_ores_number      varchar | null
  press_release_text   text
  distribution_records UUID[] FK → distribution_record
  dscsa_notification   boolean (required for Class I + Class II per DSCSA)
  status               enum: EVALUATING | AUTHORIZED | NOTIFIED |
                             EXECUTING | EFFECTIVENESS_CHECK | CLOSED
  authorized_by_id     FK → esig_record (exec QA + legal co-sign)
  initiated_at         timestamptz
Retention floor:  25 yr; perpetual for Class I
Banned decisions: BD-12 (AI cannot authorize recall decision)
```

---

### AR-J1-021 Field Alert Report (FAR)

```
Canonical name:  Field Alert Report
Owning SM:       SM-FAR (§3.10)
Evidence class:  EC-21
Key fields:
  far_id               UUID PK
  product_id           FK → master_product
  lot_id               FK → executed_batch_record
  event_type           varchar (per 21 CFR 314.81(b)(1))
  three_day_deadline   timestamptz (occurrence_datetime + 3 business days)
  submitted_at         timestamptz | null
  fda_ack_number       varchar | null
  status               enum: DRAFT | UNDER_REVIEW | SUBMITTED | CLOSED
  submitted_by_id      FK → esig_record
Retention floor:  10 yr; per 21 CFR 314.81(c)
Banned decisions: BD-1 (AI cannot submit FAR to FDA)
```

---

### AR-J1-022 PADER (Periodic Adverse Drug Experience Report)

```
Canonical name:  PADER
Owning SM:       periodic reporting lifecycle
Evidence class:  EC-21
Key fields:
  pader_id             UUID PK
  product_id           FK → master_product
  period_start         date
  period_end           date (quarterly for first 3 yr; annually after)
  icsr_count           integer
  serious_icsr_count   integer
  aggregate_analysis   text
  status               enum: DRAFT | REVIEW | SUBMITTED | CLOSED
  submitted_at         timestamptz | null
  fda_ack_number       varchar | null
Retention floor:  10 yr per 21 CFR 314.80(l)
Banned decisions: BD-1 (AI cannot submit to FDA)
```

---

### AR-J1-023 REMS Record

```
Canonical name:  REMS Record
Owning SM:       REMS lifecycle
Evidence class:  EC-1
Key fields:
  rems_id              UUID PK
  product_id           FK → master_product
  fda_rems_number      varchar
  rems_type            enum: COMMUNICATION | ELEMENTS_TO_ASSURE_SAFE_USE |
                              IMPLEMENTATION_SYSTEM
  enrollment_records   jsonb (prescriber / patient / pharmacy per REMS)
  dispensing_checks    jsonb (per dispense event)
  assessment_due       date (per FDA REMS schedule)
  status               enum: ACTIVE | UNDER_ASSESSMENT | MODIFIED | CLOSED
Retention floor:  product approval + 25 yr
Banned decisions: BD-1 (AI cannot dispense authorization without REMS check)
```

---

### AR-J1-024 IND Distribution Record

```
Canonical name:  IND Distribution Record
Owning SM:       SM-IND-DIST (§3.11)
Evidence class:  EC-8
Key fields:
  ind_dist_id          UUID PK
  ind_number           varchar (FDA IND number)
  site_id              FK → clinical_site
  shipment_date        date
  lot_id               FK → executed_batch_record
  quantity             integer (units)
  blind_code           varchar | null (for blinded studies)
  return_reconciliation_id FK → return_record | null
  status               enum: SHIPPED | RECEIVED | IN_USE | RECONCILED |
                             DESTROYED
Retention floor:  15 yr post study completion; per 21 CFR 312.57
Banned decisions: BD-11 (AI cannot submit IND amendment)
```

---

### AR-J1-025 Master Cell Bank

```
Canonical name:  Master Cell Bank
Owning SM:       cell bank qualification lifecycle
Evidence class:  EC-5; EC-1
Key fields:
  mcb_id               UUID PK
  product_id           FK → master_product
  cell_line_id         varchar
  passage_number       integer
  characterization_jsonb jsonb (identity, purity, potency, sterility,
                                mycoplasma, adventitious agents)
  storage_location_id  FK → cryogenic_tank
  vial_count           integer
  stability_study_id   FK → stability_study
  status               enum: UNDER_QUALIFICATION | QUALIFIED | DEPLETED |
                             SUPERSEDED
  qualified_at         timestamptz
  qualified_by_id      FK → esig_record
Retention floor:  product approval + 25 yr; per ICH Q5D
Banned decisions: BD-1 (AI cannot qualify MCB)
```

---

### AR-J1-026 Working Cell Bank

```
Canonical name:  Working Cell Bank
Owning SM:       cell bank qualification lifecycle (child of MCB)
Evidence class:  EC-5
Key fields:
  wcb_id               UUID PK
  mcb_id               FK → master_cell_bank
  passage_number       integer
  vial_count           integer
  characterization_jsonb jsonb
  storage_location_id  FK → cryogenic_tank
  status               enum: UNDER_QUALIFICATION | QUALIFIED | DEPLETED
  qualified_by_id      FK → esig_record
Retention floor:  same as parent MCB
Banned decisions: BD-1 (AI cannot qualify WCB)
```

---

### AR-J1-027 APR Signal (Trending Flag)

```
Canonical name:  APR Signal
Owning SM:       APR section sub-state
Evidence class:  EC-15 (risk)
Key fields:
  signal_id            UUID PK
  apr_id               FK → annual_product_review
  signal_type          enum: OOS_TREND | OOT_TREND | YIELD_DECLINE |
                             DEVIATION_SPIKE | COMPLAINT_CLUSTER |
                             PROCESS_CAPABILITY_DRIFT
  cqa_affected         varchar (Critical Quality Attribute)
  trend_data_jsonb     jsonb (time-series data points)
  advisory_text        text (AI-21 generated; labelled ADVISORY)
  status               enum: OPEN | UNDER_REVIEW | ACTIONED | CLOSED
  action_capa_id       FK → capa_record | null
Retention floor:  parent APR retention
Banned decisions: BD-1 (AI may generate advisory text; human must approve
                       signal as ACTIONED)
```

---

### AR-J1-028 Lot Genealogy Record

```
Canonical name:  Lot Genealogy Record
Owning SM:       batch lifecycle; immutable once EBR RELEASED
Evidence class:  EC-8; EC-37
Key fields:
  genealogy_id         UUID PK
  finished_lot_id      FK → executed_batch_record
  component_lots_jsonb jsonb (each: component_type, lot_number,
                               supplier_id, CoA_id, received_date,
                               disposition_status)
  bulk_lots_jsonb      jsonb (for multi-step processes)
  packaging_lot_id     FK → executed_batch_record | null
  created_at           timestamptz (system-set at EBR RELEASED)
Retention floor:  same as parent EBR (25 yr)
Banned decisions: none (read-only after creation)
```

---

### AR-J1-029 Distribution Record

```
Canonical name:  Distribution Record
Owning SM:       distribution lifecycle
Evidence class:  EC-8; EC-37
Key fields:
  dist_id              UUID PK
  lot_id               FK → executed_batch_record
  customer_id          FK → trading_partner
  quantity             integer
  ship_date            date
  destination_country  varchar(2) ISO
  dscsa_txset_id       FK → dscsa_transaction_set | null
  eu_fmd_events_jsonb  jsonb (serialized unit decommission events)
  cold_chain_proof_id  FK → cold_chain_log | null
  status               enum: SHIPPED | DELIVERED | RETURNED | RECALLED
Retention floor:  6 yr per DSCSA; 25 yr for GxP recall readiness
Banned decisions: none pack-specific
```

---

### AR-J1-030 Pharma Complaint Record

```
Canonical name:  Complaint Record (Pharma)
Owning SM:       SM-12 (complaint lifecycle)
Evidence class:  EC-20
Key fields:
  complaint_id         UUID PK
  product_id           FK → master_product
  lot_id               FK → executed_batch_record | null
  complaint_source     enum: PATIENT | HEALTHCARE_PROFESSIONAL | REGULATOR |
                             SOCIAL_MEDIA | DISTRIBUTOR
  complaint_text       text
  reportability_assessed boolean
  icsr_required        boolean
  icsr_id              FK → icsr_record | null
  far_required         boolean
  far_id               FK → field_alert_report | null
  investigation_id     FK → manufacturing_deviation | null
  status               enum: INTAKE | TRIAGE | INVESTIGATION | CLOSED
  closed_by_id         FK → esig_record
Retention floor:  10 yr per 21 CFR 211.198; 25 yr GxP custodian
Banned decisions: BD-1 (AI cannot close complaint without human QA sign-off)
```

---

## 3. State machines (11 state machines, full specification)

### 3.1 SM-APR — Annual Product Review lifecycle

```
States:  DRAFT | IN_REVIEW | QP_REVIEWED | APPROVED | PUBLISHED |
         NEXT_CYCLE_OPEN

Transitions:
  DRAFT → IN_REVIEW
    guard: at least one contributing data source attached (batch list,
           deviation list, stability trend, complaint summary);
           QA analyst role required
    banned decisions per state: none in DRAFT; advisory AI-21 permitted

  IN_REVIEW → QP_REVIEWED
    guard: quorum = {QA_manager, QP}; both must e-sign;
           all APR_SIGNAL flags either ACTIONED or acknowledged
    banned: BD-9 (AI cannot e-sign as QP)

  QP_REVIEWED → APPROVED
    guard: e-sig by {site_director | VP_quality};
           linked CAPA IDs present for all SIGNAL flags requiring action
    banned: BD-1 (AI cannot approve)

  APPROVED → PUBLISHED
    guard: PDF rendition generated and hash-sealed in audit_anchor;
           distribution list notified
    banned: none (system transition)

  PUBLISHED → NEXT_CYCLE_OPEN
    guard: review_period_end + 365d reached or manual trigger by QA
    effect: creates successor APR in DRAFT with period_start = prior
            review_period_end + 1d

Escalation: if NEXT_CYCLE_OPEN not created within 30 days of
  review_period_end + 365d → H6 SEV-2 alert to Compliance Lead
```

---

### 3.2 SM-DEV — Manufacturing Deviation

```
States:  OPEN | TRIAGE | INVESTIGATION | ROOT_CAUSE | IMPACT_ASSESSED |
         CAPA_LINKED | EFFECTIVENESS_TRACKED | CLOSED

Transitions:
  OPEN → TRIAGE
    guard: assigned QA investigator; severity classified
    auto-set: blocks_batch_release = true if severity CRITICAL or MAJOR

  TRIAGE → INVESTIGATION
    guard: immediate containment action documented
    if deviation type = PLANNED: skip to CAPA_LINKED with annex-15 §10 form

  INVESTIGATION → ROOT_CAUSE
    guard: timeline with evidence attached; at least one witness e-sig;
           AI-13 RCA advisory may be attached but is non-binding (L2)

  ROOT_CAUSE → IMPACT_ASSESSED
    guard: impact to product quality, patient safety, regulatory
           status assessed in structured field

  IMPACT_ASSESSED → CAPA_LINKED
    guard: if severity MAJOR or CRITICAL → CAPA record created and
           capa_id FK populated (mandatory); MINOR may link or not
    banned: BD-1 (AI cannot perform impact assessment)

  CAPA_LINKED → EFFECTIVENESS_TRACKED
    guard: CAPA effectiveness date passed + evidence of check recorded

  EFFECTIVENESS_TRACKED → CLOSED
    guard: 2-person e-sig {QA_manager, site_director};
           blocks_batch_release reset to false if previously set
    banned: BD-1 (AI cannot countersign to close CRITICAL deviation)

Coupling to SM-10: if deviation.blocks_batch_release = true,
  SM-10 gate PRE_RELEASE_PACK.all_deviations_resolved = false →
  SM-10 transition to COMPLETE blocked
```

---

### 3.3 SM-STAB — Stability Study

```
States (study):  PLANNED | ONGOING | COMPLETED | CANCELLED

States (pull point sub-machine):
  DUE | DRAWN | IN_TESTING | REVIEWED | ACCEPTED | OOS | OOT

Study transitions:
  PLANNED → ONGOING
    guard: first pull committed (DRAWN); protocol WORM-locked
    effect: protocol_locked_at timestamped; amendment requires
            SM-AMEND approval with 2-person e-sig

  ONGOING → COMPLETED
    guard: all pull points at final time point in ACCEPTED, OOS, or OOT;
           QA e-sign
    banned: BD-1 (AI cannot close study)

  ONGOING → CANCELLED
    guard: {VP_quality} e-sig + reason; OOS/OOT pulls must be linked to
           deviation before cancel

Pull-point transitions:
  DUE → DRAWN: pull executed; sample IDs linked
  DRAWN → IN_TESTING: samples transferred to QC
  IN_TESTING → REVIEWED: results entered; QC analyst e-sign
  REVIEWED → ACCEPTED: results within spec; QA e-sign (advisory from
                        AI-09 anomaly detector permitted, not binding)
  REVIEWED → OOS: any result outside specification
    effect: auto-create AR-J1-002 Deviation; notify QP
    guard for OOS close: OOS investigation completed
  REVIEWED → OOT: result within spec but outside trend control limit
    effect: create APR_SIGNAL; notify QA; may auto-extend study per ICH Q1E

Coupling: SM-10 gate checks stability_ok field on PRE_RELEASE_PACK
```

---

### 3.4 SM-ICSR — Individual Case Safety Report (E2B R3)

```
States:  INTAKE | TRIAGED | SERIOUSNESS_ASSESSED | EXPECTEDNESS_ASSESSED |
         CAUSALITY_ASSESSED | CODED | SUBMITTED | FOLLOW_UP | CLOSED

Transitions:
  INTAKE → TRIAGED
    guard: minimum data elements present (patient, suspect drug, event);
           PV intake specialist assigned
    auto-set: reporting_window_days = 7 if serious+unexpected;
              15 if serious+expected; periodic if non-serious

  TRIAGED → SERIOUSNESS_ASSESSED
    guard: seriousness criteria evaluated against 21 CFR 312.32 / ICH E2A
    banned: BD-1 (AI may suggest seriousness classification; advisory only)

  SERIOUSNESS_ASSESSED → EXPECTEDNESS_ASSESSED
    guard: reference product label reviewed; expectedness field set
    timer: if serious_unexpected → submission_deadline = triage_date + 7d

  EXPECTEDNESS_ASSESSED → CAUSALITY_ASSESSED
    guard: causality algorithm applied (per WHO-UMC criteria or Bradford
           Hill); at least one medical reviewer e-sign

  CAUSALITY_ASSESSED → CODED
    guard: MedDRA LLT + PT + HLT + SOC coded by authorized MedDRA coder
    banned: BD-1 (AI cannot perform final MedDRA coding without human
                  coder review)

  CODED → SUBMITTED
    guard: E2B(R3) XML generated; gateway validation (EudraVigilance / FDA
           FAERS) returns ACK; submission_deadline not exceeded
    banned: BD-1 (AI cannot transmit ICSR)
    SLA: if submission_deadline exceeded → SEV-1 + H6 escalation

  SUBMITTED → FOLLOW_UP
    guard: regulator requests follow-up (identified by ack type)
    guard: follow_up_due set to request_date + reporting_window_days

  FOLLOW_UP → CLOSED | SUBMITTED (iterative follow-up)
  SUBMITTED → CLOSED: no follow-up required; QA closure e-sign

Coupling: ICSR may trigger SM-RECALL evaluation if causality CERTAIN and
          signal strength STRONG
```

---

### 3.5 SM-DSCSA — Transaction Set Verification

```
States:  PENDING | VERIFIED | SUSPECT | ILLEGITIMATE | QUARANTINED |
         CLEARED | REPORTED

Transitions:
  PENDING → VERIFIED
    guard: product identifier (GTIN + lot + expiry + serial) matches
           EPCIS lookup or ATP-verified record;
           trading partner ATP status = current
    banned: BD-10 (AI cannot sign TI/TH/TS as authorized trading partner)

  PENDING → SUSPECT
    guard: verification fails OR discrepancy in product identifier OR
           trading partner ATP expired / revoked
    effect: investigation clock starts (3 business days per 21 USC 360eee-1(r))

  SUSPECT → ILLEGITIMATE
    guard: investigation confirms counterfeit / diverted product
    effect: FDA and trading partners notified per 21 USC 360eee-1(r)(2)(B)
    banned: BD-10 (AI cannot send official illegitimate notification)

  SUSPECT → CLEARED
    guard: investigation resolves discrepancy; QA e-sign + reason
    timing: must occur within 3 business days of SUSPECT; if 3-day
            window missed → SEV-1 + H6 + external counsel alert

  CLEARED → VERIFIED (state corrected)
  ILLEGITIMATE → QUARANTINED
    guard: physical quarantine confirmed; lot removed from inventory
  QUARANTINED → REPORTED
    guard: FDA notification submitted with investigation evidence

ATP check: trading_partner.atp_proof_id must reference a non-expired
  Authorized Trading Partner record (self-attested or third-party ATPs
  per DSCSA §582(b)(3))
```

---

### 3.6 SM-CLEANING-V — Cleaning Validation Cycle

```
States:  PLANNED | EXECUTING | ANALYSED | ACCEPTED | FAILED |
         REVALIDATION_REQUIRED

Transitions:
  PLANNED → EXECUTING
    guard: cleaning procedure SOP version = EFFECTIVE; equipment status =
           QUALIFIED; QA pre-approval
  EXECUTING → ANALYSED
    guard: all swab / rinse samples submitted to QC; visual inspection
           performed
  ANALYSED → ACCEPTED
    guard: all results ≤ MACO (Maximum Allowable Carryover per ASTM E2500);
           visual = PASS; 2-person e-sig {QA + QC analyst}
    effect: next_revalidation_due = ACCEPTED_date + validity_months
    banned: BD-1 (AI cannot accept cleaning validation)

  ANALYSED → FAILED
    guard: any result > MACO or visual = FAIL
    effect: auto-create AR-J1-002 Deviation; line cleaning status = DIRTY;
            SM-10 gate blocks production
  FAILED → PLANNED
    guard: CAPA linked; root cause documented; re-execution authorized
  ACCEPTED → REVALIDATION_REQUIRED
    guard: next_revalidation_due passed without new cycle started
    effect: line cleaning status = EXPIRED; SM-10 gate blocks production
```

---

### 3.7 SM-EMP — Environmental Monitoring (Sterile)

```
States:  SCHEDULED | SAMPLED | REVIEWED | OK | ALERT | ACTION_LIMIT |
         EXCURSION_INVESTIGATED | CLOSED

Transitions:
  SCHEDULED → SAMPLED
    guard: sample plan executed; all sample points covered; shift date met
  SAMPLED → REVIEWED
    guard: microbiology results entered; QC analyst e-sign
  REVIEWED → OK
    guard: all CFU counts < alert limits (per EU GMP Annex 1 Table 1 /
           ISO 14644-1 classification)
  REVIEWED → ALERT
    guard: one or more sample points ≥ alert limit but < action limit
    effect: notify QA; trend flag added to em_trend dashboard
  REVIEWED → ACTION_LIMIT
    guard: one or more sample points ≥ action limit (per Annex 1 §9)
    effect: create AR-J1-002 Deviation; consider line stoppage; QP notified
    banned: BD-1 (AI cannot clear action limit excursion)
  ACTION_LIMIT → EXCURSION_INVESTIGATED
    guard: Deviation CLOSED; root cause documented; additional EM performed
  EXCURSION_INVESTIGATED → CLOSED
    guard: QP e-sign confirms contamination source resolved
  OK | ALERT → CLOSED
    guard: QA e-sign
```

---

### 3.8 SM-MEDIA-FILL — Media Fill Exercise

```
States:  PLANNED | FILLED | INCUBATED | READ | PASSED | FAILED |
         INVALIDATED | INVESTIGATION_COMPLETE

Transitions:
  PLANNED → FILLED
    guard: aseptic line qualified; all participating operators have
           current AR-J1-018 qualification; media certification current;
           FILLED by QA witness e-sign
  FILLED → INCUBATED
    guard: incubation started within 4h of fill; temperature logged
           (22.5°C ± 2.5°C per Annex 1 §9.36)
  INCUBATED → READ
    guard: 14-day incubation complete; each unit inspected
  READ → PASSED
    guard: contamination_rate = 0.0% for ≤ 5000 units or
           ≤ 0.1% for > 5000 units per Annex 1 §9.36
    effect: participating personnel qualification extended
    banned: BD-1 (AI cannot declare PASSED)
  READ → FAILED
    guard: contamination_rate > acceptance limit
    effect: auto-create Deviation; line aseptic status = SUSPENDED;
            all operators involved must re-qualify; QP notified
    banned: BD-12 (recall decision must be human-authorized)
  FAILED → INVESTIGATION_COMPLETE
    guard: root cause + CAPA + re-media-fill required; QP e-sign
  INCUBATED → INVALIDATED
    guard: only if documented critical incubation failure (e.g., incubator
           failure) with full evidence; 2-person e-sig {QA + QP};
           re-run required
    banned: BD-1 (AI cannot invalidate to avoid reporting failure)
```

---

### 3.9 SM-RECALL — Recall Authorization

```
States:  EVALUATING | AUTHORIZED | NOTIFIED | EXECUTING | EFFECTIVENESS_CHECK |
         CLOSED

Transitions:
  EVALUATING → AUTHORIZED
    guard: recall class assessed; distribution scope known; exec QA + legal
           2-person e-sig; regulatory counsel review documented
    banned: BD-12 (AI cannot authorize; may only present impact analysis
                   as advisory per L1)

  AUTHORIZED → NOTIFIED
    guard: FDA (21 CFR 7.45) / EMA / Health Canada notified within deadline;
           press release approved; trading partner / customer notifications sent
    banned: BD-12 (AI cannot send official FDA recall notification)

  NOTIFIED → EXECUTING
    guard: product retrieval confirmed with at least one trading partner;
           DSCSA notification sent (if applicable per DSCSA)

  EXECUTING → EFFECTIVENESS_CHECK
    guard: retrieval rate ≥ FDA-negotiated percentage; effectiveness
           check date set (per 21 CFR 7.55)

  EFFECTIVENESS_CHECK → CLOSED
    guard: FDA termination letter received or QP/exec QA e-sign with
           evidence of full recovery

Coupling: SM-RECALL may be triggered by SM-ICSR (causality CERTAIN +
  signal STRONG), SM-EMP (systemic contamination), or SM-MEDIA-FILL
  (FAILED + lot already distributed)
```

---

### 3.10 SM-FAR — Field Alert Report

```
States:  DRAFT | UNDER_REVIEW | SUBMITTED | AMENDMENT | CLOSED

Transitions:
  DRAFT → UNDER_REVIEW
    guard: event type per 21 CFR 314.81(b)(1) confirmed;
           three_day_deadline auto-calculated from occurrence_datetime
  UNDER_REVIEW → SUBMITTED
    guard: Regulatory Affairs e-sign; QP e-sign (EU sites);
           three_day_deadline not exceeded
    banned: BD-1 (AI cannot submit FAR)
    SLA: if three_day_deadline exceeded → SEV-1 + external notification
  SUBMITTED → AMENDMENT
    guard: new information discovered post-submission
  AMENDMENT → SUBMITTED (iterative)
  SUBMITTED → CLOSED
    guard: FDA closes case or internal determination complete
```

---

### 3.11 SM-IND-DIST — IND Distribution Record

```
States:  PENDING | SHIPPED | RECEIVED | IN_USE | RECONCILED | DESTROYED

Transitions:
  PENDING → SHIPPED
    guard: blind_code assigned (if blinded); IND number confirmed valid;
           site_id has active IRB approval on file
  SHIPPED → RECEIVED
    guard: site receipt confirmation; cold-chain proof logged (if cold)
  RECEIVED → IN_USE
    guard: site pharmacist e-sign (21 CFR 312.61)
  IN_USE → RECONCILED
    guard: all administered + returned + destroyed units accounted for;
           discrepancy < 0 → auto-create Deviation
    banned: BD-11 (AI cannot amend IND; any protocol deviation requires
                   human submission)
  IN_USE → DESTROYED
    guard: unused drug destroyed per DEA / FDA protocol with certificate
  RECONCILED | DESTROYED → CLOSED (per study completion)
```

---

## 4. Per-pack workflow overlays (D1 through D14)

Each workflow is defined in Part D of the base plan. This section
lists Pharma-specific extensions that activate when sub_vertical
includes any Pharma value.

```
D1  Order to Cash
    Extension: shipment validation against DSCSA TI before dispatch;
               serialized units decommissioned at point of sale (EU FMD
               Art 25); lot-level coA attached to invoice; cold-chain
               proof required for biologics / CGT shipments;
               export certificate per importing-country regulation

D2  Procurement to Pay
    Extension: excipient / API / primary-packaging supplier
               qualification (per ICH Q7 §7 + 21 CFR 211.84);
               incoming material identity test before CoA acceptance;
               supplier change notification triggers SUPCA sub-process
               (per ICH Q12 established-conditions concept);
               contract lab qualification per 21 CFR 211.34

D3  Plan to Produce
    Extension: MBR status = EFFECTIVE verified at dispatch (SM-7 gate);
               environmental monitoring clear on target line (SM-EMP
               gate); cleaning validation current (SM-CLEANING-V gate);
               personnel aseptic qualifications current (AR-J1-018
               check); HVAC qualification current (AR-J1-017 check)

D4  Receive to Inspect
    Extension: identity test mandatory per 21 CFR 211.84(d);
               sample plan per ICH Q6 sampling-based or skip-lot
               (requires 3-yr supplier history); CoA cross-check;
               cold-chain break detection triggers Deviation;
               quarantine default until disposition

D5  Inspect to Disposition
    Extension: QC sample lifecycle per SM-INSP-QC;
               OOS investigation mandatory per FDA OOS guidance (2006)
               within 10 business days;
               OOT triggers APR trend flag;
               retain sample program: minimum per 21 CFR 211.170

D6  NC to CAPA
    Extension: deviation lifecycle SM-DEV feeds every NC;
               CAPA effectiveness tracking window ≥ 3 batch cycles;
               regulatory-impact flag → proactive health authority
               notification evaluated

D7  Document to Release
    Extension: MBR + SOP + cleaning protocol effectivity enforced
               per EU GMP Annex 11 §10 + H7 document control;
               change-request sub-process per ICH Q12 lifecycle
               management (reporting categories: Prior Approval /
               Notification / SUPCA)

D8  Train to Qualify
    Extension: GxP training plan per 21 CFR 211.68 + EU GMP Ch 2;
               aseptic re-qualification annual cycle for Grade A/B
               operators (AR-J1-018); media fill participation
               required per sub-vertical sterile

D9  Maintain to Restore
    Extension: qualified equipment status preserved; calibration cycle
               per USP <1058>; cleaning state preserved per SM-
               CLEANING-V; re-qualification triggered on equipment
               modification (per ASTM E2500 specification change)

D10 Batch to Release
    Extension: pre-release evidence pack (AR-J1-012) must score ALL
               = true before QP unlock; QP Declaration (AR-J1-011)
               issued per EU GMP Annex 16; US Designated Person e-sign;
               certificate of analysis generated from EBR results;
               DSCSA TI transmitted within 24h of shipment tender
               (per 21 USC 360eee-1(c)(1)(A))

D11 Release to Trace
    Extension: lot genealogy record (AR-J1-028) sealed on release;
               DSCSA transaction set transmitted to downstream partner;
               EU FMD serialized units activated in EMVS;
               import certificate filed for export lots

D12 Complaint to Recall
    Extension: complaint triage includes ICSR assessment (within 24h
               per ICH E2A for serious reports); FAR assessment for
               manufacturing or product quality; PV signal detection
               feeds PV dashboard; recall decision per SM-RECALL;
               PADER aggregate analysis updated

D13 Audit to Remediate
    Extension: pre-FDA / pre-EMA inspection readiness drill;
               483 / Form 482 simulation using audit pack;
               inspector-selected EBR subset export < 24h SLA;
               Annex 11 self-inspection score updated quarterly

D14 Validate to Qualify
    Extension: additional qualification stages beyond H2 baseline:
               facility qualification (ISO 14644-1 classification);
               utility qualification (water system, HVAC, compressed
               gas per Annex 15 §6);
               equipment qualification (IQ/OQ/PQ per ASTM E2500);
               computerized system validation (per EU GMP Annex 11 +
               21 CFR 11); cleaning validation (SM-CLEANING-V);
               analytical method validation (per ICH Q2(R2));
               process validation (per FDA 2011 guidance + ICH Q8/Q11);
               transport validation (per ASTM D4169 + WHO TRS 992)
```

---

## 5. Pack-specific APIs

### E15.9 — DSCSA API

Base path: `/api/v1/pharma/dscsa`

```
Endpoint                                    Method  Description
─────────────────────────────────────────────────────────────────────
/transaction-sets                           POST    Create TI/TH/TS
/transaction-sets/{txset_id}                GET     Retrieve TX set
/transaction-sets/{txset_id}/verify         POST    Trigger EPCIS
                                                    lookup + ATP check
/transaction-sets/{txset_id}/suspect        POST    Mark SUSPECT;
                                                    start 3-day clock
/suspect-products/{txset_id}/investigate    PUT     Record investigation
                                                    progress
/suspect-products/{txset_id}/clear          POST    Clear + e-sig
/suspect-products/{txset_id}/illegitimate   POST    Confirm illegitimate
                                                    (human only; BD-10)
/authorized-trading-partners                GET     List current ATPs
/authorized-trading-partners/{partner_id}   GET     ATP status + expiry
/epcis-events                               POST    Ingest EPCIS 2.0
                                                    ObjectEvent or
                                                    AggregationEvent
/epcis-events/query                         POST    GS1 EPCIS 2.0
                                                    query interface

EPCIS 2.0 format: JSON-LD per GS1 EPCIS 2.0 standard §7;
  eventType: ObjectEvent | AggregationEvent | TransactionEvent;
  bizStep: shipping | receiving | commissioning | decommissioning;
  disposition: active | in_transit | sold | destroyed
Transport: REST over HTTPS; AS2 adaptor for legacy partners;
           SFTP ingestion for bulk files;
           cloud API integrations (TraceLink / rfxcel / SAP ATR) via
           webhook relay

Suspect product 3-day window enforcement:
  On SUSPECT creation: calendar.business_day_deadline = suspect_at +
  3 business_days (per tenant locale);
  H6 escalation at T+48h if not cleared;
  SEV-1 at T+72h (business day limit);
  External counsel alert if ILLEGITIMATE
```

---

### E15.13 — ICSR API

Base path: `/api/v1/pharma/icsr`

```
Endpoint                                    Method  Description
─────────────────────────────────────────────────────────────────────
/cases                                      POST    Create ICSR intake
/cases/{icsr_id}                            GET     Retrieve case
/cases/{icsr_id}/assess-seriousness        PUT     Set seriousness +
                                                    criteria
/cases/{icsr_id}/assess-causality          PUT     Set causality +
                                                    algorithm reference
/cases/{icsr_id}/code-meddra               PUT     Assign MedDRA terms
                                                    (LLT / PT / HLT / SOC)
/cases/{icsr_id}/generate-e2b              POST    Build ICH E2B(R3)
                                                    XML payload
/cases/{icsr_id}/submit                    POST    Transmit to regulator
                                                    gateway (human only;
                                                    BD-1 enforced at
                                                    authorization layer)
/cases/{icsr_id}/follow-up                 POST    Attach follow-up
/cases/{icsr_id}/close                     PUT     Close case
/submissions/{submission_id}/ack           GET     Poll gateway ACK

E2B(R3) XML generation:
  Follows ICH M2 EWG schema (HL7 V3 ICSR DTD);
  MedWatch 3500A mapping: ICH fields mapped to MedWatch identifiers
  for FDA FAERS gateway;
  EudraVigilance gateway: EVWEB / EVPM WS interface;
  WHO VigiBase: WHO-UMC eReporting API (for multi-jurisdiction tenants)

Reporting window enforcement:
  serious + unexpected → 7-day deadline (submission_deadline set at
  SERIOUSNESS_ASSESSED transition);
  serious + expected → 15-day deadline;
  non-serious → periodic (PADER cycle);
  H6 escalation at T−24h before deadline;
  SEV-1 if deadline passed without submission
```

---

### E15.16 — Sub-processor (CMO) Batch Record Exchange API

Base path: `/api/v1/pharma/cmo`

```
Endpoint                                    Method  Description
─────────────────────────────────────────────────────────────────────
/batch-records                              POST    CMO submits EBR
                                                    data payload
/batch-records/{ebr_id}                     GET     Retrieve CMO EBR
/batch-records/{ebr_id}/accept              PUT     Sponsor QA accepts
                                                    CMO EBR; starts
                                                    SM-10 gate eval
/batch-records/{ebr_id}/reject              PUT     Reject + reason;
                                                    notifies CMO
/batch-records/{ebr_id}/deviations         GET     List deviations
                                                    attached to CMO
                                                    batch
/certificates-of-analysis                   POST    CMO uploads CoA
                                                    (PDF + structured
                                                    results JSON)
/quality-agreements/{qa_id}                 GET     Active quality
                                                    agreement terms
                                                    (per 21 CFR 211.22)

Data format: EBR payload is JSON per HESEM EBR schema;
  CoA: PDF/A-1b + structured JSON (analyte, spec, result, unit);
  Authentication: mutual TLS + per-CMO API key scoped to cmo_tenant_id;
  Traceability: all CMO-submitted data carries source_system_id field
    and is immutable after sponsor acceptance;
  Quality agreement: references qa_agreement_id active at batch start;
    agreement terms are version-locked at batch open
```

---

## 6. UI surfaces (14 surfaces)

```
SURFACE                              DESCRIPTION + KEY INTERACTIONS
──────────────────────────────────────────────────────────────────────
1  EBR Workspace (AR Shell)          Per-step execution with ISA-88
                                     PFC procedure model; per-step
                                     e-signature; inline deviation
                                     capture; photo / sample evidence
                                     attach; challenge-response for
                                     alarm states; read-only after
                                     RELEASED (WORM)
2  APR Workspace (WS)                Draft + section editor sourced
                                     from D10 telemetry, D5 disposition,
                                     D6 CAPA, D9 maintenance, stability
                                     trend; AI-21 section draft advisory
                                     displayed in amber label ADVISORY;
                                     QP review + approve flow
3  QP Pre-Release Decision Console   Single-pane chain-of-evidence:
                                     all PRE_RELEASE_PACK components
                                     with RAG status; QP cannot click
                                     RELEASE if any component = FAIL;
                                     audit trail of every inspection
                                     step; QP Declaration generation
                                     + e-sign
4  Manufacturing Deviation AR Shell  SM-DEV full lifecycle; AI-13 RCA
                                     Whys advisory; 5-Whys + Fishbone
                                     builder; CAPA link; severity badge;
                                     blocks-batch-release indicator
5  QC Sample AR Shell                Chain-of-custody log; test assignment;
                                     result entry; OOS / OOT flag;
                                     retest authorization flow; sample
                                     disposition e-sign
6  Stability Study Dashboard (WS)    Protocol + storage conditions;
                                     pull schedule Gantt with DUE /
                                     OVERDUE / DRAWN states; trend
                                     chart per parameter × timepoint
                                     (per ICH Q1E); OOS/OOT alert panel
7  DSCSA Transaction Console         Inbound / outbound TI/TH/TS list;
                                     EPCIS event viewer; suspect product
                                     queue with 3-day countdown; ATP
                                     status per trading partner
8  ICSR Entry + Submission Console   Intake form with MedDRA code picker
                                     (WHOART synonym search); seriousness
                                     checklist; reporting window
                                     countdown banner; E2B(R3) XML
                                     preview; gateway submission button
                                     (human-gated per BD-1)
9  Cleaning Validation Cycle AR Shell Protocol viewer; swab result entry
                                     table with MACO limit inline;
                                     visual inspection checklist;
                                     ACCEPTED / FAILED decision + e-sig;
                                     next-revalidation countdown
10 Environmental Monitoring Console  Real-time per-area cfu counts vs
   (Sterile)                         alert / action limits (per Annex 1
                                     Table 1); shift heat-map; excursion
                                     badge → Deviation shortcut;
                                     trend chart per area per analyte
11 Media Fill AR Shell               Fill run setup (operator list + qual
                                     check); unit count entry; incubation
                                     log; unit inspection tally; PASSED /
                                     FAILED decision with acceptance-
                                     limit math shown; operator requalification
                                     trigger on FAILED
12 Recall Decision Console           Class I/II/III assessment wizard;
                                     distribution scope query (lot
                                     genealogy lookup); estimated units
                                     in distribution; FDA draft notification
                                     builder (ADVISORY; BD-12 enforced);
                                     effectiveness check scheduler
13 FAR Submission Console            Event type picker (per 21 CFR
                                     314.81(b)(1)); 3-day deadline
                                     countdown; narrative editor;
                                     FDA submission + ACK poll;
                                     amendment flow
14 PV Signal Console                 Signal detection KPIs; PRR / ROR
                                     disproportionality charts (advisory
                                     per L2 AI-32); case clustering
                                     heat-map; signal lifecycle board
                                     (DETECTED → ACTION_TAKEN); REMS
                                     linkage panel
```

---

## 7. Pack discipline (14 items, concrete rules)

Each rule maps to an enforcement mechanism in the platform.

**D-01 Two-person e-signature for batch release**
BD-9 + BD-1 enforced at SM-10 RELEASED gate. E7 quorum check requires
esig_record.signatories ≥ 2 with roles {QP, authorized_QA_manager}.
Shared account detection per 21 CFR 11.10(d): login event includes
biometric token or hardware TOTP bound to individual user; account
sharing triggers immediate SEV-1 and session termination.

**D-02 QP signature per EU GMP Annex 16**
QP Declaration (AR-J1-011) is mandatory for any EBR destined for EU
market. `tenant_config.eu_release_required = true` activates QP gate in
SM-10. QP role is provisioned per Annex 16 §2.1 (qualification
requirements stored in AR-J1-018 equivalent for QP credentials).

**D-03 US Designated Person for DSCSA**
`tenant_config.dscsa_designated_person_id` must reference an active
user with role `dscsa_designated_person`. DSCSA TI sign action (BD-10)
requires this user's e-sig. Role assignment logged in audit chain.

**D-04 21 CFR 11.10(j) accountability — no shared IDs**
Each e-signature record stores `user_id` (individual UUID), `login_session_id`,
`ip_address`, and `user_agent`. System prevents concurrent sessions for
the same user signing in the same SM gate. Individual accountability
report generated for FDA inspection per 21 CFR 11.10(j).

**D-05 Mandatory reason-for-change on every regulated record edit**
E3 mutation endpoint rejects any PUT/PATCH on a regulated root (any
AR-J1-* record with status ≥ IN_REVIEW) if `reason_for_change` field
is absent or < 10 characters. Stored in `audit_event.change_reason`.
Per EU GMP Annex 11 §10 and PIC/S PI 041-1 §5.

**D-06 Validation chain at QP release**
PRE_RELEASE_PACK (AR-J1-012) gates: all 9 boolean fields
(mbr_current, all_equipment_qualified, cleaning_current, em_status_ok,
water_ok, all_tests_passed, stability_ok, all_deviations_resolved,
personnel_qualified) must be true. System evaluates each against live
record state at pack generation time; any false blocks QP unlock button
regardless of operator action.

**D-07 WORM perpetual + 25-year GxP custodian obligation**
H5 sets storage_class = WORM on seal. Pharma overlay extends minimum
retention to 25 yr for EBR, MBR, QP Declaration, Stability Study,
ICSR. Legal hold flag freezes deletion even post-expiry until hold
released by Compliance Lead e-sign. Custodian obligation transferred
on tenant decommission per data custodian transfer protocol.

**D-08 APR cadence enforcement**
Calendar job runs nightly: if `annual_product_review.next_review_due`
< today + 60 days and no successor APR in DRAFT, create alert. If
overdue by > 30 days: H6 SEV-2 to Compliance Lead + Pharma Lead. If
overdue by > 90 days: SEV-1 + exec escalation (FDA OAI risk).

**D-09 Annex 1 contamination control strategy**
For sub-verticals including sterile_injectable, tenant must maintain an
active CCS (Contamination Control Strategy) document as a controlled
SOP (SM-7 EFFECTIVE). CCS is referenced in MBR `contamination_control_ref`
field. SM-10 gate checks CCS status = EFFECTIVE before batch start.
Per EU GMP Annex 1 (2022) §4.1–4.30.

**D-10 Aseptic re-qualification cycle**
AR-J1-018 validity_date = qualification_date + 365 days (annual per
Annex 1 §9.31). Expired qualification: user's access to Grade A/B
lines blocked at line login by personnel_qualified check in PRE_RELEASE_PACK.
Supervisor re-assignment triggers incident record. Failed media fill
(SM-MEDIA-FILL FAILED) triggers mandatory re-qualification for all
involved operators before next aseptic production.

**D-11 Stability protocol immutability**
After first pull committed (SM-STAB PLANNED → ONGOING), stability study
`protocol_locked_at` is set and the protocol JSON becomes WORM. Any
change requires a formal `stability_protocol_amendment` record (own
AR root; 2-person e-sig {QA + study director}; reason + impact
assessment mandatory). Amendment links to parent study; pulls continue
under new amendment version. Per ICH Q1A §6.5.

**D-12 DSCSA suspect product 3-day investigation window**
SM-DSCSA SUSPECT state sets `investigation_opened_at`. Business-day
clock per tenant locale. H6 alert at T+48h. SEV-1 at T+71h (1h buffer).
If T+72h (3 business days) passes with status still SUSPECT: external
counsel alert auto-generated; FDA notification draft queued for human
submission (BD-10 still enforced). Per 21 USC 360eee-1(r).

**D-13 EU FMD verification at dispense**
For sub-vertical eu_fmd_participant: serialized unit scan at dispensing
event triggers call to EMVS (European Medicines Verification System)
gateway per (EU) 2016/161 Art 25. Response must be ACTIVE before
dispense. Decommissioning event written to EMVS and to HESEM
`serialized_unit.ui_status = DISPENSED`. Failures (DECOMMISSIONED /
RECALLED / LOCKED) trigger immediate alert + quarantine.

**D-14 ICH Q12 lifecycle management (established conditions)**
For post-approval changes, tenant selects reporting category per ICH
Q12 Annex I: Prior Approval Supplement (PAS), Changes Being Effected
(CBE-30 / CBE-0), or Annual Report. HESEM change-request sub-process
(within D7) stores `regulatory_category` on the change record. System
blocks implementation if PAS and no health authority approval on file.

---

## 8. Standards instantiation depth

```
REGULATION / STANDARD                 HESEM CONTROL REALIZATION
──────────────────────────────────────────────────────────────────────
21 CFR 11.10 (a)–(k)                  H7 document integrity; E7 e-sig;
                                       21 CFR 11.10(j) per D-04 above;
                                       audit trail per E0
21 CFR 207                            Product registration metadata in
                                       master_product (NDC, establishment
                                       registration number)
21 CFR 210 / 211                      EBR + MBR roots; D5 sampling; D10
                                       batch release; 211.180(e) APR;
                                       211.192 production review;
                                       211.194 lab records; 211.198
                                       complaints; 211.68 training
21 CFR 212                            PET sub-vertical: abbreviated EBR
                                       with decay-correction logic
21 CFR 314.80 / 314.81                PADER + FAR roots; SM-PADER;
                                       SM-FAR; 3-day FAR window
21 CFR 600–680                        Biologics sub-vertical: potency
                                       assay; lot release per 21 CFR 610
21 CFR 606                            Blood / plasma (if tenant);
                                       compatibility testing fields
21 CFR 803                            MDR for combination products;
                                       30-day and 5-day MDR windows
21 CFR Part 7 (recall)                SM-RECALL states + FDA notification
21 USC 360eee-1 (DSCSA)               SM-DSCSA; AR-J1-009/010; E15.9 API
EU GMP Annex 1 (2022)                 CCS per D-09; EM per SM-EMP;
                                       media fill per SM-MEDIA-FILL;
                                       Annex 1 Table 1 limits per AR-J1-014
EU GMP Annex 11                       Computerized system validation per
                                       D14; audit trail per H3;
                                       §10 reason-for-change per D-05;
                                       §17 retention per H5
EU GMP Annex 13                       IMP sub-vertical: AR-J1-024 IND
                                       Distribution; blinding reconciliation
EU GMP Annex 15                       Process validation per D14; planned
                                       deviation per SM-DEV
EU GMP Annex 16                       QP Declaration per AR-J1-011;
                                       pre-release pack per AR-J1-012
EU GMP Annex 17                       Real-time release testing (RTRT)
                                       for CGT sub-vertical
EU GMP Annex 21                       Import; export certificate per D11
ICH Q1A – Q1E                         Stability study design (Q1A);
                                       accelerated (Q1B); storage
                                       conditions (Q1C); bracketing (Q1D);
                                       trend analysis (Q1E)
ICH Q2(R2)                            Analytical method validation per D14
ICH Q3A/B/C/D                         Impurity limits per API sub-vertical
ICH Q5A–E                             Biologics cell-culture: viral safety
                                       (Q5A); genetic stability (Q5B);
                                       cell substrate (Q5D); specifications
                                       (Q5E); adventitious agents (Q5C)
ICH Q6A/B                             Specifications per release QC tests
ICH Q7                                GMP for APIs; contract manufacturer
                                       oversight per D2
ICH Q8                                Pharmaceutical development;
                                       design space in MBR
ICH Q9(R1)                            Risk management per H9; risk
                                       assessment linked in SM-DEV +
                                       SM-RECALL
ICH Q10                               PQS overlay; management review
                                       per D13
ICH Q11                               Development + manufacture of drug
                                       substances; process parameter
                                       classification (CPP / NCPP)
ICH Q12                               Lifecycle management per D-14;
                                       established conditions; reporting
                                       categories
ICH Q14                               Analytical procedure development
                                       (2023); PAT compatibility
ICH E2A / E2B(R3) / E2C(R2)          ICSR reporting windows (E2A);
                                       E2B(R3) XML format (SM-ICSR);
                                       PSUR / PADER (E2C)
WHO TRS 957                           Stability guidance for tropical zones
                                       (Zone IVb storage condition in
                                       SM-STAB)
WHO TRS 992                           Cold chain and vaccine transport
                                       validation per D14
(EU) 2016/161 (EU FMD)                AR-J1-010 serialized unit; EMVS
                                       calls per D-13
USP <795> / <797> / <800>             Compounding sub-vertical overlays
USP <823>                             PET radiopharmaceutical abbreviated
                                       EBR
USP <1058>                            Analytical instrument qualification
                                       per D14 + AR-J1-017 analogous
ISO 14644-1 / -2 / -3                 Cleanroom classification per
                                       AR-J1-017 HVAC; AR-J1-014 EM
                                       sample limits
PIC/S PI 041-1                        Data integrity per D-05;
                                       audit trail per H3; ALCOA++ per E0
ASTM E2500-13                         Specification and verification for
                                       pharmaceutical manufacturing
                                       systems; cleaning validation MACO
                                       per AR-J1-013
Health Canada Division 2              Canadian market: QP equivalent
                                       (Qualified Person for Release);
                                       HC site licence stored in
                                       tenant_config.hc_site_licence
ANVISA RDC 658 (2022)                 Brazilian market: Certificado de
                                       Boas Práticas de Fabricação (CBPF);
                                       DP import permit stored in
                                       distribution_record.br_import_permit
```

---

## 9. Audit pack contents (34 sections)

Pre-staged nightly; delta build on demand. Inspector-requested export
SLA: 24h per H3 §4. Each section carries evidence type, source AR,
and retention floor.

```
SECTION  TITLE                              EVIDENCE CONTAINED
────────────────────────────────────────────────────────────────────
 1  Validation Master Plan (current)         Active VMP document (SM-7
                                             EFFECTIVE); signed approval
 2  Computerized System Inventory            All validated computer systems;
                                             validation status; last
                                             revalidation date
 3  IT Change Log (24 mo)                    All CS changes per Annex 11;
                                             impact assessment; test
                                             evidence
 4  21 CFR Part 11 Compliance               Self-assessment checklist;
    Attestation                              e-sig policy; audit trail policy
 5  EU GMP Annex 11 Self-Inspection          Scored checklist per §4–17;
    Report                                   last inspection date
 6  IQ/OQ/PQ Records (equipment +           Per equipment ID; per utility;
    utilities + facility)                    per system; approval e-sig;
                                             next requalification date
 7  Analytical Method Validation             Per assay per ICH Q2(R2);
    Summaries                                accuracy, precision, linearity,
                                             specificity, LOD/LOQ
 8  Process Validation Reports               Stage 1/2/3 per FDA 2011
                                             guidance; CPV data (Stage 3)
 9  Cleaning Validation Summary              Per equipment per product
                                             worst-case; MACO calculations;
                                             acceptance criteria
10  HVAC Qualification Summary               Per cleanroom area; ISO class
                                             confirmed; HEPA integrity;
                                             re-qualification schedule
11  Environmental Monitoring                 24-month trend per area;
    Summary (sterile)                        excursion log; action limit
                                             handling records
12  Water System Monitoring Summary          24-month trend per loop;
                                             conductivity + TOC + microbial;
                                             excursion handling
13  Media Fill Records (last 6)              Per line; pass/fail; unit count;
                                             contamination rate; operator list
14  Aseptic Personnel Qualification          Per operator; current / expired;
    Log                                      media fill participation history
15  EBR Sample Set (24 mo,                   Inspector-selected lot subset;
    inspector-selected)                      per-step execution evidence;
                                             deviation links
16  MBR Version History                      Per product; all versions;
                                             effective dates; change reasons
17  Manufacturing Deviation Log              24-month; severity breakdown;
    (24 mo)                                  investigation summaries; CAPA
                                             links; regulatory impact
18  CAPA Log + Effectiveness                 24-month; open/closed count;
    Records (24 mo)                          effectiveness check evidence
19  OOS / OOT Investigation Log              Per test per lot; investigation
    (24 mo)                                  evidence; outcome
20  QC Sample Retain Log                     Per lot; sample location; expiry
21  Last 3 APRs per Product                  Full APR documents; QP review
                                             e-sigs; APR Signal actions
22  Stability Program Summary                Per study; pull schedule; trend
                                             charts; OOS/OOT handling
23  Supplier Qualification                   Approved supplier list; audit
    Summary                                  dates; CoA cross-check stats;
                                             disqualification history
24  Personnel Training Records               GxP training plan; per-operator
    (GxP-specific)                           completion; qualification expiry
25  Equipment Calibration Log                Per instrument; calibration date;
                                             next due; as-found data
26  DSCSA Event Log + Suspect               24-month; TI/TH/TS counts;
    Handling Records                         suspect events; resolution time;
                                             ATP list
27  EU FMD Activity Log                      Serialization events; EMVS
    (where applicable)                       verification results;
                                             decommission events
28  Complaint Log + Investigation            24-month; complaint source;
    Evidence (24 mo)                         reportability assessment;
                                             ICSR links; resolution
29  ICSR Submission Log                      Per case; seriousness;
                                             submission date; ACK; follow-up
30  PADER Submission History                 Per period; submission date;
                                             FDA ACK
31  FAR Submission History                   Per report; 3-day window
                                             adherence; amendment log
32  PV Signal Management Summary            Open/closed signals; action
                                             taken; REMS records
33  Recall Decision Evidence                 Per recall; class; scope;
    (if applicable)                          effectiveness check; FDA
                                             termination
34  Recall Simulation Evidence               Quarterly drill records; scope;
    (quarterly drills)                       retrieval rate simulation;
                                             time-to-identify
```

---

## 10. Pack KPIs (12 KPIs)

```
KPI-01  Right-First-Time (RFT) Release Rate
  Definition: Lots released without rework or rejection /
              total lots manufactured × 100
  Target:     ≥ 98%
  Alert threshold: < 96% for any rolling-3-month window

KPI-02  Deviation Count per 1 000 Batches
  Definition: Total deviations / batches × 1000
              (tracked separately for CRITICAL / MAJOR / MINOR)
  Target:     CRITICAL: 0; MAJOR: ≤ 5; MINOR: ≤ 25
  Alert threshold: any CRITICAL; MAJOR > 8; MINOR > 40

KPI-03  Mean Deviation Cycle Time (days)
  Definition: Average days from deviation OPEN to CLOSED
              (by severity tier)
  Target:     CRITICAL ≤ 30 d; MAJOR ≤ 45 d; MINOR ≤ 60 d
  Alert threshold: CRITICAL > 30 d triggers SEV-2

KPI-04  CAPA Effectiveness Pass Rate
  Definition: CAPAs closed with effectiveness check = PASS /
              total CAPAs closed × 100
  Target:     ≥ 90%
  Alert threshold: < 80% for any rolling-6-month window

KPI-05  OOS Rate
  Definition: OOS test results / total release test results × 100
  Target:     ≤ 0.1%
  Alert threshold: > 0.3%

KPI-06  QP / Annex 16 Release p95 Cycle Time (hours)
  Definition: 95th percentile of time from EBR COMPLETE to RELEASED
  Target:     ≤ 48 h
  Alert threshold: p95 > 72 h

KPI-07  DSCSA Suspect Product Window Adherence
  Definition: Suspect events resolved within 3 business days /
              total suspect events × 100
  Target:     100%
  Alert threshold: any miss → SEV-1

KPI-08  ICSR Reporting SLA Adherence
  Definition: ICSRs submitted within regulatory window /
              total ICSRs requiring submission × 100
              (7-day for serious-unexpected; 15-day for serious-expected)
  Target:     100%
  Alert threshold: any miss → SEV-1 + regulator notification

KPI-09  APR Cycle Adherence
  Definition: Products with APR published within 365 d of
              prior review period end / total products × 100
  Target:     100%
  Alert threshold: any product > 30 d overdue → SEV-2

KPI-10  Environmental Monitoring Action Limit Excursion Rate
  Definition: EM runs with action limit breach / total EM runs × 100
              (per area per month)
  Target:     Grade A: 0%; Grade B: ≤ 0.1%; Grade C: ≤ 0.5%
  Alert threshold: any Grade A excursion → immediate SEV-1

KPI-11  Media Fill Pass Rate
  Definition: Media fill runs PASSED / total runs × 100
              (per line per half-year)
  Target:     100% per line per period
  Alert threshold: any failure → SEV-1 + line suspension

KPI-12  Stability OOT Rate
  Definition: Stability pull points with OOT flag / total pull
              points reviewed × 100 (per study type)
  Target:     ≤ 0.5%
  Alert threshold: > 1% triggers accelerated trend review
```

---

## 11. Pack failure modes (8 scenarios)

```
FM-01  QP signature issued without complete PRE_RELEASE_PACK
Scenario:  QP clicks release on a batch where a component flag is
           actually false but a UI bug shows it as true.
Detection: PRE_RELEASE_PACK gate re-evaluated server-side at the
           instant of QP Declaration creation (AR-J1-011); any
           component false → HTTP 409 with body indicating which
           component failed; Declaration not persisted.
Recovery:  QP Declaration creation rolled back; component owner
           notified via H6 alert; H8 CAPA on root-cause (data
           freshness bug); regression test added to E2E suite.

FM-02  APR cycle deadline missed (annual deadline passed without
       successor APR reaching PUBLISHED)
Scenario:  Product team distracted; calendar job fires but no
           escalation acknowledged.
Detection: H6 nightly calendar job; SEV-2 at +30 days overdue;
           SEV-1 at +90 days; SMS / email to Pharma Lead + Compliance
           Lead + site VP.
Recovery:  Emergency APR kickoff with QA manager as author;
           FDA voluntary disclosure evaluated by regulatory counsel;
           H8 CAPA on process + calendar tooling.

FM-03  DSCSA suspect product 3-day window missed
Scenario:  Suspect event created on Friday afternoon in a short-staff
           week; investigation not started until Tuesday (4 business
           days).
Detection: SM-DSCSA business-day clock fires H6 alert at T+48h;
           SEV-1 at T+71h; external counsel auto-email at T+72h.
Recovery:  Regulatory counsel files voluntary FDA disclosure per
           21 USC 360eee-1(r)(2)(D); H8 CAPA on staffing model +
           after-hours escalation playbook.

FM-04  Cleaning validation expired before batch start
Scenario:  next_revalidation_due passed without new cycle; production
           planner overrides without authority.
Detection: PRE_RELEASE_PACK gate cleaning_current = false blocks
           SM-10; production override attempt logged as unauthorized
           event → SEV-2 alert + audit event.
Recovery:  New cleaning cycle initiated (SM-CLEANING-V); batch put on
           hold until ACCEPTED; H8 CAPA on maintenance scheduling.

FM-05  Aseptic personnel qualification expired for operator on line
Scenario:  Operator qualification lapsed 2 days before scheduled fill;
           schedule not checked at line login.
Detection: PRE_RELEASE_PACK personnel_qualified check at batch start;
           also real-time check at line login: badge scan + qualification
           lookup → access denied with reason code.
Recovery:  Operator removed from line; backup operator assigned or
           fill rescheduled; H8 CAPA on qualification tracking
           notification cadence.

FM-06  ICSR submission late (E2B R3 deadline breached)
Scenario:  Medical reviewer out of office; causality assessment not
           completed in time; no coverage assigned.
Detection: H6 alert T−24h before submission_deadline; if no e-sign
           by T−2h → SEV-1 escalation to PV manager + medical director.
Recovery:  Expedited submission with explanation letter; H8 CAPA on
           medical reviewer coverage model; regulator notification per
           ICH E2A §3.2.

FM-07  APR section draft (AI-21 advisory) contains fabricated stability
       data
Scenario:  AI-21 LLM advisory generates a trend description citing a
           pull-point value not in the actual stability record.
Detection: QA reviewer cross-references each AI-generated figure
           against the source stability_pull record in the EBR section;
           discrepancy flagged; advisory hidden pending fix.
Recovery:  AI-21 output quarantined for the affected product line;
           L4 SEV-3 incident opened; AI advisory disabled for that
           section until retrained; H8 CAPA on reviewer checklist.

FM-08  CMO batch record contains forged CoA values
Scenario:  Contract manufacturer submits a CoA (via E15.16) with
           interpolated OOS results to avoid rejection.
Detection: HESEM compares CoA structured results against the actual
           QC instrument data file (if exchanged); statistical
           outlier check (AI-09 advisory); sponsor QA lab performs
           independent retain-sample verification per quality agreement.
Recovery:  CMO EBR status → REJECTED; quality agreement breach
           triggered; root-cause investigation; FDA Voluntary Action
           Initiated (VAI) or Official Action Indicated (OAI) risk
           assessed; H8 CAPA.
```

---

## 12. RACI per regulated decision

R = Responsible (does the work)
A = Accountable (signs off; only one per decision)
C = Consulted (input required)
I = Informed (notified after)

```
DECISION              QP    QA MGR  PHARMA  REGULATORY  EXEC QA  AI
                                    LEAD    AFFAIRS              SYSTEM
──────────────────────────────────────────────────────────────────────
Batch release         A     R       C       I           I        I
(SM-10 RELEASED)      [BD-9: A must be human QP; AI cannot substitute]

DSCSA TI sign         I     I       I       R→A         I        I
(authorized xfer)           [BD-10: A must be Designated Person; AI cannot]

QP Declaration        A     C       I       I           I        I
(EU market)           [BD-9: A must be QP; AI cannot issue]

Recall authorization  C     C       C       C           A        I
(SM-RECALL AUTHORIZED)[BD-12: A must be Exec QA + legal co-sign; AI cannot]

ICSR submission       I     R       I       A           I        I
(SM-ICSR SUBMITTED)   [BD-1: A must be regulatory affairs; AI cannot transmit]

Stability protocol    I     A       R       C           I        I
approval (SM-STAB     [BD-1: A must be QA manager; AI cannot approve]
ONGOING gate)

Deviation close       I     A       R       C           I        I
(CRITICAL severity)   [BD-1: A must be QA manager + site director co-sign]

IND amendment         I     C       C       A           I        I
submission            [BD-11: A must be regulatory affairs; AI cannot submit]
```

---

## 13. Retention overlays (per H5 floor)

H5 defines platform-wide WORM storage classes and minimum retention
floors. Pharma pack applies the following overlays wherever the
Pharma floor exceeds the H5 baseline.

```
RECORD TYPE                      H5 BASELINE    PHARMA OVERLAY
─────────────────────────────────────────────────────────────────────
EBR (released lot)               7 yr           25 yr (EU GMP Annex 11
                                                §17); perpetual for GxP
                                                custodian obligation
MBR (all versions)               7 yr           25 yr; perpetual
QP Declaration                   7 yr           product shelf-life + 5 yr;
                                                min 25 yr (Annex 16 §5)
Stability Study + Pulls           7 yr           product approval + 25 yr
                                                per ICH Q1A §6.7
ICSR                             7 yr           25 yr per ICH E2C(R2)
DSCSA Transaction Set            7 yr           6 yr per 21 USC 360eee-1
                                                (e)(1)(A); HESEM stores
                                                25 yr for recall readiness
APR                              7 yr           25 yr (product lifecycle)
Manufacturing Deviation           7 yr           product shelf-life + 1 yr;
                                                min 15 yr per 21 CFR 211.180
QC Sample (results)              7 yr           per test type; min 2 yr
                                                post-release per ICH Q1A
Cleaning Validation Cycle        7 yr           equipment lifetime + 5 yr;
                                                min 15 yr
Environmental Monitoring Run     7 yr           10 yr per Annex 1 §9
Media Fill Run                   7 yr           10 yr per Annex 1 §9
Water System Monitoring          7 yr           10 yr per 21 CFR 211.180
HVAC Qualification               7 yr           equipment lifetime + 5 yr
Aseptic Personnel Qual           7 yr           employment + 10 yr; min 15 yr
Recall Decision                  7 yr           25 yr; perpetual for Class I
FAR                              7 yr           10 yr per 21 CFR 314.81(c)
PADER                            7 yr           10 yr per 21 CFR 314.80(l)
REMS Record                      7 yr           product approval + 25 yr
IND Distribution Record          7 yr           15 yr post study completion
                                                per 21 CFR 312.57
MCB / WCB                        7 yr           product approval + 25 yr
                                                per ICH Q5D
Distribution Record              7 yr           25 yr for GxP recall
                                                readiness; 6 yr DSCSA
Complaint Record                 7 yr           10 yr per 21 CFR 211.198;
                                                25 yr GxP custodian
```

Legal hold flag on any record: freezes deletion post-retention-expiry
until Compliance Lead e-sign releases hold. Data custodian transfer
protocol executed on tenant decommission (Compliance Lead + legal
sign-off; receiving custodian attestation).

---

## 14. Pack deployment schedule

```
WAVE  ITEM
W6    Platform readiness confirmed: audit chain, e-sig quorum,
      WORM, evidence taxonomy, H5 retention classes
W7    AI feature shadow-mode activated for pharma-relevant features:
      AI-09 anomaly detection (EM + stability trends);
      AI-13 RCA Whys advisory (deviations);
      AI-21 APR section draft advisory;
      AI-32 PV signal detection advisory
W8    Roots scaffolded: EBR + MBR + QC Sample + Stability Study +
      Manufacturing Deviation; SM-10 gate logic
W9    APIs + workflows: D10 + D5 pharma overlays; E15.9 DSCSA;
      E15.13 ICSR; E15.16 CMO batch record
W10   Sterile sub-vertical preview: Annex 1 CCS; SM-EMP; SM-MEDIA-FILL;
      SM-CLEANING-V; EM Console; Media Fill AR Shell
W11   Pack GA: DSCSA full unit-level; ICSR gateway (FDA + EMA);
      APR full lifecycle; FAR; PADER; SM-RECALL; PV Signal Console;
      recall simulation quarterly drill tooling
W12   Optimization: PV signal management + REMS overlay (where applicable);
      CMO batch record exchange polish; APR AI advisory tuning;
      first design-partner customer validation pack delivery
```

Pre-W10: opt-in for design partners under enhanced support.
Post-GA: available to all Pharma tenants under standard SLA.

---

## 15. Cross-references

- H1 §2.1 — Pharma regulatory inventory (maps each regulation to HESEM control)
- H2 — validation lifecycle (Pharma extends with 9 additional qualification stages per §4)
- H3 §4 — audit pack standard (34 Pharma-specific sections in §9 above)
- H5 — WORM retention (Pharma overlays in §13 above)
- H6 — escalation ladder (SEV thresholds referenced per failure mode in §11)
- H7 — document control (MBR / SOP / cleaning protocol effectivity per D7)
- H8 — CAPA standard (linked from every deviation + failure mode)
- H9 — risk management (ICH Q9 overlay; FMEA per HVAC + EM + media fill)
- L1 — banned decisions (BD-9 through BD-12 Pharma extension)
- L2 — AI features (AI-09, AI-13, AI-21, AI-32 advisory-only constraints)
- D10 — batch-to-release workflow (pharma overlay in §4 above)
- E7 — e-signature subsystem (quorum rules; BD-9 / BD-10 enforcement)
- E15 — integration hub (DSCSA / FMD / E2B gateway adapters)
- M3 — root catalog (all 30 AR-J1-* roots registered)
- J2 — Automotive pack (reuses Pharma e-sig + audit-chain substrate)
- J3 — Medical Device pack (21 CFR 820 + MDR from combination product
       root AR-J1-013)

---

```
S4-09_J1_PHARMA_DEEP_UPGRADE_COMPLETE
```
