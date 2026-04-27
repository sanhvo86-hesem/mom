# C4 — Procurement & Supplier Quality (V10)

```
domain_code:             D-04
domain_name:             Procurement & Supplier Quality
owner_role:              Procurement Lead (Quality Lead for SCAR + IQC; SQE for PPAP;
                         Regulatory Affairs for DSCSA + FSVP)
primary_state_machines:  SM-2 Procurement Lifecycle; SM-PPAP (Auto J2); SCAR Lifecycle
root_count:              21
capability_count:        16
wave_maturity_target:    L5 by W5 (PO/Supplier core); L5 by W7 (SCAR/IQC);
                         L5 by W8 (pack-specific: PPAP, DSCSA, FSVP, NADCAP)
part_c_version:          V10
```

---

## 1. Purpose

The Procurement & Supplier Quality domain is the inbound mirror of Commercial: where
Commercial manages outbound goods to customers, Procurement manages inbound goods from
suppliers. It answers:

- Who supplies us, and are they qualified and performing?
- What did we order, at what price, and when was it committed?
- Did the goods arrive, and did they pass incoming inspection?
- When a supplier fails, what corrective action did we demand, and was it effective?
- For regulated supply chains: are trading partners verified (DSCSA/EU FMD), are foreign
  suppliers assessed (FSVP), and are aerospace special processes certified (NADCAP)?

---

## 2. Resource Families — Full Enumeration

### 2.1 Supplier

| Field | Type | Semantics | Required | PII | Mutable |
|---|---|---|---|---|---|
| supplier_id | UUID | PK | Y | N | N |
| supplier_code | VARCHAR(20) | unique per tenant | Y | N | N (after qualified) |
| legal_name | VARCHAR(200) | | Y | Y | Y |
| trade_name | VARCHAR(200) | | N | Y | Y |
| supplier_type | ENUM | MANUFACTURER\|DISTRIBUTOR\|CM\|SERVICE\|BROKER\|OTHER | Y | N | Y |
| status | ENUM | prospect\|qualified\|active\|probation\|suspended\|disqualified\|blacklisted | Y | N | SM-controlled |
| tier | INTEGER | supply chain tier: 1\|2\|3 | Y | N | Y |
| currency | ISO 4217 | default payment currency | Y | N | Y |
| payment_terms | VARCHAR(50) | | Y | N | Y |
| duns_number | VARCHAR(9) | GS1 D-U-N-S; nullable | N | N | Y |
| tax_id | VARCHAR(50) | PII | N | Y | Y |
| regulatory_class | ENUM | STANDARD\|CRITICAL\|SOLE_SOURCE\|PREFERRED | Y | N | Y |
| certified_to | VARCHAR[] | e.g. ISO9001, IATF16949, AS9100D, ISO13485 | N | N | Y |
| cert_expiry_dates | JSONB | cert_code → expiry_date | N | N | Y |
| quality_agreement_id | FK → Contract | nullable | N | N | Y |
| last_audit_date | DATE | | N | N | Y |
| next_audit_due | DATE | system-computed from last_audit_date + audit_frequency | N | N | system |
| tenant_id | UUID | | Y | N | N |
| created_at | TIMESTAMPTZ | | Y | N | N |
| modified_at | TIMESTAMPTZ | | Y | N | Y |

Lifecycle: prospect → qualified (qualification record approved, see §2.6) → active → probation
(scorecard drops below threshold or SCAR opened) → suspended (pending corrective action;
new POs blocked) → disqualified (corrective action failed; source removed) → blacklisted
(terminal; legal or ethical grounds; dual approval: Procurement Lead + Legal).

### 2.2 Supplier Site

Fields: site_id, supplier_id (FK), site_code (VARCHAR 20), site_name (VARCHAR 200),
address_line1 (PII), city (PII), state_province, postal_code (PII), country_code (CHAR 2),
site_type (ENUM: MANUFACTURING|DISTRIBUTION|WAREHOUSE|HQ|SERVICE),
is_primary_ship_from (BOOLEAN), itar_registered (BOOLEAN — J3),
nadcap_certs (VARCHAR[] — e.g. ["AC7004","AC7101"]), status (ENUM: active|inactive).

### 2.3 Supplier Contact

Fields: contact_id, supplier_id (FK), site_id (FK, nullable), first_name (PII), last_name (PII),
title, email (PII), phone (PII), role (ENUM: SALES|QUALITY|LOGISTICS|AR|TECHNICAL|REGULATORY),
is_primary (BOOLEAN), scar_recipient (BOOLEAN — auto-CC on SCAR notifications), status.

### 2.4 Supplier Qualification

| Field | Type | Semantics | Required |
|---|---|---|---|
| qual_id | UUID | PK | Y |
| supplier_id | FK → Supplier | | Y |
| qualification_scope | TEXT | items or process families covered | Y |
| standard_applied | VARCHAR(100) | e.g. IATF 16949 §8.4.2 | Y |
| qualification_type | ENUM | SELF_ASSESSMENT\|QUESTIONNAIRE\|DESK_REVIEW\|ONSITE_AUDIT\|PPAP\|FAI | Y |
| status | ENUM | initiated\|in_progress\|approved\|conditional\|rejected\|expired\|suspended | Y |
| effective_date | DATE | | N |
| expiry_date | DATE | | N |
| auditor | USER_ID | | N |
| audit_score_pct | DECIMAL(5,2) | | N |
| conditions_text | TEXT | conditions for conditional approval | N |
| next_requalification_date | DATE | system-computed from expiry_date | N |
| evidence_refs | TEXT[] | DMS references | N |
| approved_by | USER_ID | HUMAN REQUIRED — BD-7 | N |
| approved_at | TIMESTAMPTZ | | N |

**Banned decision BD-7.** Supplier qualification approval requires a human decision.
AI may compute a risk score and surface evidence gaps but cannot set status = approved
autonomously. API POST /supplier-qualifications/{id}/approve returns 403 if called
without human e-sig token.

Re-qualification triggers: cert_expiry_dates any cert expired; scorecard drops to PROBATION
for ≥ 2 consecutive periods; SCAR in status `ineffective_closed`; audit_frequency elapsed.

### 2.5 Supplier Scorecard

| Field | Type | Semantics | Required |
|---|---|---|---|
| scorecard_id | UUID | PK | Y |
| supplier_id | FK → Supplier | | Y |
| period | DATE | first of scoring period | Y |
| period_type | ENUM | MONTHLY\|QUARTERLY | Y |
| otd_pct | DECIMAL(5,2) | on-time delivery % (delivered on or before PO required date) | Y |
| quality_ppm | INTEGER | defective parts per million (IQC rejects / total received × 1e6) | Y |
| responsiveness_score | INTEGER 1-5 | manual input: SCAR acknowledgment, communication | Y |
| cost_performance_score | INTEGER 1-5 | PO price variance, spot premium frequency | N |
| total_score | DECIMAL(5,2) | computed: weighted sum per score policy | Y |
| score_tier | ENUM | GOLD\|SILVER\|BRONZE\|PROBATION\|SUSPENDED | Y |
| created_by | USER_ID | | Y |
| created_at | TIMESTAMPTZ | | Y |

Score policy (configurable per tenant): OTD weight 40%, quality_ppm weight 40%,
responsiveness weight 20%. Tier thresholds configurable (default: GOLD ≥ 90; SILVER ≥ 75;
BRONZE ≥ 60; PROBATION < 60 for any one metric > threshold).

Status cascade: two consecutive PROBATION quarters → supplier.status → probation.
Three consecutive PROBATION → SCAR auto-opened, supplier.status → suspended.

### 2.6 SCAR (Supplier Corrective Action Request)

| Field | Type | Semantics | Required | Mutable |
|---|---|---|---|---|
| scar_id | UUID | PK | Y | N |
| scar_number | VARCHAR(20) | unique per tenant | Y | N |
| supplier_id | FK → Supplier | | Y | N |
| po_id | FK → PO | nullable | N | N |
| prec_id | FK → PREC | nullable | N | N |
| nc_case_id | FK → NQ Case (C7) | | Y | N |
| item_id | FK → Item (C2) | | Y | N |
| lot_id | FK → Lot (C5) | | N | N |
| defect_description | TEXT | verbatim description | Y | Y (pre-acknowledged) |
| defect_qty | DECIMAL(12,4) | | Y | N |
| total_qty_received | DECIMAL(12,4) | | Y | N |
| defect_ppm | DECIMAL(10,2) | computed: (defect_qty/total_qty) × 1e6 | Y | computed |
| status | ENUM | see SCAR lifecycle in §3.3 | Y | SM-controlled |
| response_due_date | DATE | | Y | Y (pre-acknowledged) |
| closed_at | TIMESTAMPTZ | nullable | N | system |
| effectiveness_verified | BOOLEAN | | N | Y |
| effectiveness_evidence | TEXT | | N | Y |
| ineffective_reason | TEXT | if effectiveness_verified = false | N | Y |

### 2.7 RTV (Return to Vendor)

Fields: rtv_id, rtv_number (VARCHAR 20, unique), supplier_id (FK), po_id (FK), prec_id (FK),
scar_id (FK, nullable), reason_code (ENUM: IQC_REJECT|WRONG_ITEM|OVERSHIP|DAMAGED|RECALL),
status (ENUM: initiated|authorized|shipped_to_supplier|received_by_supplier|credited|closed),
authorized_by (USER_ID), shipped_at (TIMESTAMPTZ, nullable), credit_amount (MONEY, nullable),
credit_ref (VARCHAR 100, supplier credit memo reference).

### 2.8 PREC (Procurement Receipt)

| Field | Type | Semantics | Required |
|---|---|---|---|
| prec_id | UUID | PK | Y |
| prec_number | VARCHAR(20) | unique per tenant | Y |
| po_id | FK → PO | | Y |
| supplier_id | FK → Supplier | | Y |
| received_date | DATE | | Y |
| status | ENUM | in_transit\|received\|under_iqc\|iqc_passed\|iqc_failed\|quarantine\|putaway_complete | Y |
| received_by | USER_ID | | Y |
| warehouse_location_id | FK → Warehouse Location (C5) | | Y |
| iqc_inspection_id | FK → INSP (C7) | nullable; created on IQC trigger | N |
| counterfeit_screened | BOOLEAN | J3 Aero: initial counterfeit screen done | N |
| coc_attached | BOOLEAN | J3 Aero: CoC from original manufacturer attached | N |
| dscsa_trx_recorded | BOOLEAN | J1 Pharma: DSCSA TI/TH recorded | N |
| eu_fmd_verified | BOOLEAN | J1 Pharma: EU FMD verification scan done | N |

PREC Line (sub-record): line_id, prec_id (FK), po_line_id (FK), item_id, qty_received,
uom, supplier_lot_number, expiry_date (nullable), serial_numbers (VARCHAR[], nullable),
udi_pi (VARCHAR 100, MD pack — Unit Device Identifier Production Identifier), line_status
(ENUM: under_iqc|iqc_passed|iqc_failed|quarantine|accepted).

### 2.9 PO (Purchase Order)

| Field | Type | Semantics | Required | Mutable |
|---|---|---|---|---|
| po_id | UUID | PK | Y | N |
| po_number | VARCHAR(20) | unique per tenant | Y | N |
| supplier_id | FK → Supplier | | Y | N |
| ship_from_site_id | FK → Supplier Site | | Y | N |
| status | ENUM per SM-2 | see §3.1 | Y | SM-controlled |
| order_type | ENUM | STANDARD\|BLANKET_RELEASE\|SUBCONTRACT\|SERVICE\|CONSIGNMENT | Y | N (after sent) |
| currency | ISO 4217 | | Y | N (locked at approve) |
| exchange_rate | DECIMAL(10,6) | | Y | N (locked at approve) |
| payment_terms | VARCHAR(50) | | Y | N (after sent) |
| incoterms | VARCHAR(11) | | N | N (after sent) |
| required_delivery_date | DATE | | Y | Y (pre-sent) |
| confirmed_delivery_date | DATE | supplier-confirmed; nullable | N | Y |
| total_net_value | MONEY | computed | Y | computed |
| mrp_action_id | FK → MRP Action (C3) | traceability to demand driver | N | N |
| approved_by | USER_ID | nullable | N | system |
| approved_at | TIMESTAMPTZ | nullable | N | system |
| sent_at | TIMESTAMPTZ | nullable | N | system |

PO Line: line_id, po_id (FK), line_number, item_id (FK), item_revision_id (FK, nullable),
qty_ordered, qty_received, qty_invoiced, uom, unit_price, discount_pct, net_price,
required_delivery_date (line-level, overrides header), coc_required (BOOLEAN — J3 Aero),
ppap_required (BOOLEAN — J2 Auto).

Approval thresholds (configurable per tenant): below threshold → auto-approved after
Procurement Clerk submit; above threshold → Procurement Manager approval required (e-sig).

### 2.10 PO Line Item

Already captured as sub-record in §2.9.

### 2.11 PSW (Part Submission Warrant — Auto, J2)

| Field | Type | Semantics | Required |
|---|---|---|---|
| psw_id | UUID | PK | Y |
| ppap_id | FK → PPAP Submission | | Y |
| item_id | FK → Item (C2) | | Y |
| supplier_id | FK → Supplier | | Y |
| submission_level | INTEGER 1..5 | | Y |
| part_number_supplier | VARCHAR(50) | supplier's own part number | Y |
| engineering_change_level | VARCHAR(20) | drawing revision level | Y |
| customer_part_number | VARCHAR(50) | HESEM's item_number | Y |
| submission_reason | ENUM | INITIAL\|ENG_CHANGE\|TOOLING_TRANSFER\|CORRECTION\|OTHER | Y |
| dimensional_results_status | ENUM | pass\|conditional\|fail | Y |
| material_certs_status | ENUM | pass\|conditional\|fail | Y |
| functional_tests_status | ENUM | pass\|conditional\|fail | Y |
| appearance_approval_status | ENUM | pass\|conditional\|fail\|na | Y |
| all_elements_submitted | BOOLEAN | computed | Y |
| submission_date | DATE | | Y |
| status | ENUM | draft\|submitted\|approved\|conditionally_approved\|rejected | Y |

### 2.12 PPAP Submission (Auto — SM-PPAP, J2, BD-17)

| Field | Type | Semantics | Required |
|---|---|---|---|
| ppap_id | UUID | PK | Y |
| ppap_number | VARCHAR(20) | unique per tenant | Y |
| item_id | FK → Item (C2) | | Y |
| supplier_id | FK → Supplier | | Y |
| apqp_id | FK → APQP (C3) | | Y |
| submission_level | INTEGER 1..5 | | Y |
| status | ENUM per SM-PPAP | draft\|submitted\|under_review\|approved\|conditionally_approved\|rejected | Y |
| revision_reason | TEXT | | Y |
| elements_checklist | JSONB | 18 elements per AIAG PPAP 4th | Y |
| submitted_at | TIMESTAMPTZ | nullable | N |
| reviewer | USER_ID | nullable | N |
| reviewed_at | TIMESTAMPTZ | nullable | N |
| approved_by | USER_ID | nullable; BD-17: human required | N |
| approved_at | TIMESTAMPTZ | nullable | N |

18 PPAP elements (elements_checklist JSONB keys): design_records, engineering_change_docs,
customer_engineering_approval, dfmea, process_flow_diagrams, pfmea, control_plan,
msa_studies, dimensional_results, material_performance_test, initial_process_studies,
qualified_lab_docs, appearance_approval, sample_parts, master_sample, checking_aids,
csr_checklist, psw.

Each element: status (ENUM: not_started|in_progress|complete|waived|na), doc_ref (VARCHAR 500),
notes (TEXT).

**Banned decision BD-17.** PPAP approval is a human quality decision. The Supplier Quality
Engineer must review all 18 elements and sign. API POST /ppap/{id}/approve returns 403 if
called without SQE e-sig token.

### 2.13 ISIR (Initial Sample Inspection Report — Auto, J2)

Fields: isir_id, item_id (FK), supplier_id (FK), ppap_id (FK, nullable), drawing_revision
(VARCHAR 20), sample_qty (INTEGER), measurement_date (DATE), inspector (USER_ID),
dimensional_results (JSONB — balloon_number → {nominal, tolerance_plus, tolerance_minus,
actual_mean, cpk, pass_fail}), all_dimensions_pass (BOOLEAN, computed), cpk_min (DECIMAL 5,3),
status (ENUM: draft|complete|approved|rejected), approved_by (USER_ID), approved_at.

### 2.14 FSVP Hazard Analysis (Food — J5, per FSMA Part 1)

| Field | Type | Semantics | Required |
|---|---|---|---|
| fsvp_ha_id | UUID | PK | Y |
| supplier_id | FK → Supplier | | Y |
| item_id | FK → Item | nullable; null = applies to all items from supplier | N |
| analysis_date | DATE | | Y |
| hazard_type | ENUM | BIOLOGICAL\|CHEMICAL\|PHYSICAL\|RADIOLOGICAL | Y |
| hazard_description | TEXT | specific hazard | Y |
| likelihood_of_hazard | ENUM | HIGH\|MEDIUM\|LOW | Y |
| severity | ENUM | SERIOUS\|MODERATE\|LOW | Y |
| requires_verification | BOOLEAN | true when hazard is known or reasonably foreseeable | Y |
| mitigation_measure | TEXT | supplier's control measure | Y |
| standard_ref | VARCHAR(200) | e.g. FDA FSMA 21 CFR 1.502(a) | N |
| reviewed_by | USER_ID | | Y |
| review_date | DATE | | Y |
| next_review_due | DATE | computed: review_date + 3 years per 21 CFR 1.506 | Y |
| status | ENUM | draft\|approved\|superseded | Y |

### 2.15 FSVP Verification Activity (Food — J5)

| Field | Type | Semantics | Required |
|---|---|---|---|
| fsvp_va_id | UUID | PK | Y |
| fsvp_ha_id | FK → FSVP Hazard Analysis | | Y |
| supplier_id | FK → Supplier | | Y |
| verification_type | ENUM | ONSITE_AUDIT\|CERT_REVIEW\|LAB_TEST\|COA_REVIEW | Y |
| verification_date | DATE | | Y |
| next_verification_due | DATE | computed from frequency per hazard severity | Y |
| result | ENUM | SATISFACTORY\|CONDITIONAL\|UNSATISFACTORY | Y |
| finding_summary | TEXT | | N |
| corrective_action_required | BOOLEAN | | Y |
| ca_deadline | DATE | nullable; required when corrective_action_required=true | N |
| verified_by | USER_ID | | Y |
| created_at | TIMESTAMPTZ | | Y |

Frequency defaults: SERIOUS hazard → ONSITE_AUDIT annually; MODERATE → CERT_REVIEW every
2 years; LOW → COA_REVIEW per shipment. Configurable per site.

### 2.16 NADCAP Cert Tracking (Aero — J3)

| Field | Type | Semantics | Required |
|---|---|---|---|
| nadcap_id | UUID | PK | Y |
| supplier_id | FK → Supplier | | Y |
| supplier_site_id | FK → Supplier Site | process certification is site-specific | Y |
| process_code | VARCHAR(20) | e.g. AC7004 (Heat Treat), AC7101 (NDT), AC7110 (Welding), AC7118 (Coatings) | Y |
| commodity | VARCHAR(100) | specific process commodity | Y |
| certificate_number | VARCHAR(100) | PRI-issued cert number | Y |
| effective_date | DATE | | Y |
| expiry_date | DATE | | Y |
| scope_of_approval | TEXT | metals, temperatures, methods covered | Y |
| status | ENUM | active\|expiring_soon\|expired\|suspended\|revoked | Y |
| audit_date | DATE | | Y |
| next_audit_due | DATE | computed from audit frequency per AC7004 etc. | Y |
| last_verified_by | USER_ID | | N |
| last_verified_at | TIMESTAMPTZ | | N |

Alert at T-90 days before expiry_date: email to Procurement Lead + SQE + supplier.scar_recipient.
If expired and PO exists for process requiring this certification: PO creation blocked.

### 2.17 Counterfeit Risk Assessment per Supplier (Aero — J3, per AS5553)

Fields: cra_supplier_id, supplier_id (FK), item_id (FK, nullable — null = all items from supplier),
assessment_date (DATE), risk_level (ENUM: LOW|MEDIUM|HIGH|CRITICAL),
risk_factors (TEXT), independent_test_required (BOOLEAN — true for HIGH/CRITICAL),
documentation_required (TEXT — CoC, C-TPAT, CCAP requirements),
approved_sources_confirmed (BOOLEAN), review_due_date (DATE, +1 year),
reviewed_by (USER_ID).

If risk_level = CRITICAL: items from this supplier for this item are blocked from PREC
acceptance unless coc_attached=true and independent test passes.

### 2.18 DSCSA Trading Partner — Supplier side (Pharma — J1)

Fields: dscsa_sup_tp_id, supplier_id (FK), dscsa_id (GS1 GLN), tp_type
(ENUM: MANUFACTURER|REPACKAGER|WHOLESALE_DISTRIBUTOR|3PL), license_state (VARCHAR 2),
license_number, license_expiry, verification_method (ENUM: VRS|DIRECT|ATP),
last_verified_at, status (active|suspended|revoked).

PO creation for drug product blocked when status ≠ active or last_verified_at > 365 days.

### 2.19 EU FMD Trading Partner — Supplier side (Pharma — J1, per EU Delegated Reg 2016/161)

Fields: eu_fmd_sup_id, supplier_id (FK), eu_fmd_actor_type
(ENUM: MAH|PARALLEL_DISTRIBUTOR|WHOLESALER), country_codes (CHAR(2)[]),
nmvs_registration_id (VARCHAR 100), effective_date, expiry_date, status (active|suspended|revoked).

### 2.20 Sub-Processor Record (per L2 §8 + I8 §6)

Required for any supplier who processes personal data on behalf of HESEM (e.g. cloud hosting,
analytics SaaS, HR systems).

Fields: sub_processor_id, supplier_id (FK), dpa_id (VARCHAR 100, Data Processing Agreement
reference), data_categories (TEXT[] — e.g. employee PII, customer PII, health data),
processing_purpose (TEXT), transfer_mechanism (ENUM: ADEQUACY_DECISION|SCCs|BCRs|DEROGATION),
gdpr_article_46_basis (TEXT, nullable), effective_date, expiry_date (nullable),
review_due_date (DATE, annual default), status (ENUM: active|under_review|terminated),
dpo_contact (VARCHAR 200, PII — DPO of the sub-processor).

### 2.21 Counterfeit Suspect Investigation (Aero — J3, per AS5553 + IDEA-STD-1010B)

Triggered when PREC screening (visual or XRF) raises a counterfeit suspicion.

| Field | Type | Semantics | Required |
|---|---|---|---|
| csi_id | UUID | PK | Y |
| item_id | FK → Item (C2) | | Y |
| supplier_id | FK → Supplier | | Y |
| prec_id | FK → PREC | | Y |
| trigger_reason | TEXT | what raised suspicion | Y |
| test_method | ENUM | VISUAL\|XRF\|DECAPPING\|CURVE_TRACE\|ACETONE_TEST\|OTHER | Y |
| test_lab | VARCHAR(200) | testing laboratory name | N |
| test_date | DATE | | N |
| result | ENUM | GENUINE\|SUSPECTED_COUNTERFEIT\|CONFIRMED_COUNTERFEIT\|INCONCLUSIVE | N |
| gidep_reported | BOOLEAN | whether GIDEP alert filed (BD-22 gate) | N |
| gidep_report_id | VARCHAR(100) | GIDEP report number | N |
| quarantine_quantity | DECIMAL(12,4) | | Y |
| disposition | ENUM | RETURN_TO_SUPPLIER\|DESTROY\|HOLD_FOR_TEST | N |
| status | ENUM | open\|closed | Y |

---

## 3. State Machines

### 3.1 SM-2 Procurement Lifecycle (full transition table)

Owner: Procurement Lead. Tier: T-2. Evidence: EC-4 on every transition; EC-18 on receipt.

| # | Source | Event | Guard | Target | Side Effect | Evidence |
|---|---|---|---|---|---|---|
| 1 | draft | submit_approval | Procurement Clerk; required fields + lines complete; supplier.status = active | pending_approval | Approval workflow triggered per threshold matrix | EC-4 |
| 2 | pending_approval | approve | Below threshold: auto-approve; Above threshold: Procurement Manager e-sig | sent | PO transmitted to supplier (EDI 850 or email/portal); supply plan firmed in C3 | EC-4 + EC-2 (above threshold) |
| 3 | pending_approval | reject | Procurement Manager; reason documented | draft | Returned to editor | EC-4 |
| 4 | sent | acknowledge | Supplier confirms via EDI 855 or portal | acknowledged | Confirmed delivery dates recorded; MRP supply plan updated | EC-4 |
| 5 | sent | override_acknowledge | Procurement Clerk; supplier non-responsive after 3 business days | acknowledged | Manual override logged; supplier contact notified | EC-4 |
| 6 | acknowledged | receive_partial | Logistics; goods received but qty < PO qty on any line | partially_received | PREC created; IQC triggered; quarantine inventory created in C5 | EC-4 + EC-18 |
| 7 | acknowledged | receive_full | Logistics; all PO lines fully received | fully_received | PREC created; IQC triggered; 3-way match evaluated | EC-4 + EC-18 |
| 8 | partially_received | receive_remaining | Logistics; remaining balance received | fully_received | Final PREC; 3-way match evaluated | EC-4 + EC-18 |
| 9 | fully_received | close | Finance; 3-way match PASS (PO qty = received qty = invoice qty within tolerance); invoice reconciled | closed | Financial accrual reversed; actual cost posted to GL | EC-4 |
| 10 | any (pre-sent) | cancel | Procurement Lead; cancellation reason | cancelled | EDI 850 change order cancellation sent if already sent; C3 MRP re-plans affected supply | EC-4 + EC-5 |
| 11 | any | hold_quality | Quality Lead; IQC fail on received lot | on_hold[QUALITY] | Further receipts blocked; SCAR candidate created | EC-4 + EC-5 |

Hard couplings: SM-2 → C5 inventory (receipt creates quarantine lot). SM-2 → C7 IQC
(receive triggers INSP). SM-2 → C3 supply plan (close confirms supply). NADCAP cert
expiry blocks SM-2 transition 1 (submit) for process-requiring items.

### 3.2 SM-PPAP — PPAP Submission (Auto J2, BD-17)

| # | Source | Event | Guard | Target | Side Effect | Evidence |
|---|---|---|---|---|---|---|
| 1 | draft | submit | Supplier or SQE; all 18 elements complete or waived with justification | submitted | SQE assigned for review; review SLA started | EC-16 |
| 2 | submitted | review_start | SQE; assignment accepted | under_review | Element-by-element review begins | EC-16 |
| 3 | under_review | approve | SQE e-sig; all elements PASS; BD-17 human check | approved | PPAP approval stored; supplier qualified for this item+revision; SM-1 ship gate opens for PPAP-required items | EC-2 + EC-16 |
| 4 | under_review | conditional_approve | SQE e-sig; elements with conditions documented | conditionally_approved | Conditions tracked as open actions; production can proceed with restrictions | EC-2 + EC-16 |
| 5 | under_review | reject | SQE; failed elements listed; BD-17 human decision | rejected | Supplier notified with failure details; re-submission required | EC-16 |
| 6 | rejected | resubmit | Supplier/SQE; failed elements addressed | submitted | New submission version | EC-16 |

BD-17 enforcement: POST /ppap/{id}/approve returns 403 if called without SQE e-sig JWT claim.

### 3.3 SCAR Lifecycle

| # | Source | Event | Guard | Target | Side Effect | Evidence |
|---|---|---|---|---|---|---|
| 1 | draft | open | SQE; NC Case confirmed; supplier notified | opened | Email to supplier.scar_recipient; response_due_date = T+30d default | EC-16 |
| 2 | opened | acknowledge | Supplier; containment plan submitted | acknowledged | Containment plan recorded on SCAR | EC-16 |
| 3 | acknowledged | containment_confirmed | SQE; containment evidence verified adequate | containment_in_place | IQC screen level increased for future lots from this supplier+item | EC-16 |
| 4 | containment_in_place | submit_root_cause | Supplier; root cause analysis (8D D4-D5) submitted | root_cause_identified | Root cause linked to SCAR; corrective action plan required | EC-16 |
| 5 | root_cause_identified | ca_complete | Supplier; corrective action evidence submitted | ca_complete | SQE reviews CA evidence | EC-16 |
| 6 | ca_complete | verify_effectiveness | SQE; effectiveness check: next 3 lots pass IQC; PPM trend improved | closed | Supplier scorecard updated; IQC screen level normalized | EC-2 + EC-16 |
| 7 | ca_complete | fail_effectiveness | SQE; effectiveness check failed; PPM not improved | ineffective_closed | Supplier.status → probation; disqualification review triggered | EC-16 |
| 8 | any (pre-ca_complete) | escalate | Procurement Lead; response_due_date elapsed + 14d | opened (escalated) | Escalation flag set; supplier.status → probation; VP Procurement notified | EC-5 + EC-16 |

---

## 4. Capabilities

### CAP-C4-01 — Supplier Master Lifecycle

**Purpose.** Maintain the authoritative record for every supplier: legal entity, sites,
contacts, certifications, status, and performance history.

**Lifecycle.** Per §2.1 Supplier lifecycle. New supplier onboarding triggered by procurement
request for new source or engineering approved-source list (C2 CRA). Qualification required
before first PO. Status cascades from scorecard (two consecutive PROBATION quarters →
supplier.status = probation). Blacklist requires Procurement Lead + Legal dual approval;
terminal state.

**Integration with SM-2.** Supplier.status = suspended blocks SM-2 submit (transition 1).
Supplier.status = disqualified blocks all PO creation. NADCAP cert expiry blocks PO for
affected process.

**Wave target.** L4 W1; L5 W5.

**Acceptance evidence.** Suspended supplier: PO submit returns 422 with Problem Detail
citing supplier status. NADCAP expiry: PO for heat-treat item from supplier with expired
AC7004 cert blocked. Cert expiry alert tested at T-90 days.

### CAP-C4-02 — Supplier Qualification (BD-7)

**Purpose.** Formally qualify suppliers for specific item families or process scopes.
Apply appropriate qualification method per supply chain risk. Enforce BD-7: no autonomous AI
qualification approval.

**Lifecycle.** Qualification request created by Procurement Lead for new supplier or
new scope. Qualification method selected per risk level and standard (IATF §8.4.2,
AS9100D §8.4, ISO 13485 §7.4). Self-assessment, questionnaire, desk review, or onsite audit
conducted. Evidence package assembled. SQE reviews. Approved (human e-sig required — BD-7).
Conditional approval with documented conditions. Re-qualification scheduled.

**AI advisory.** AI may evaluate the evidence package completeness and generate a risk score.
The score is advisory only; the SQE must make the approve/reject decision.

**Wave target.** L4 W6; L5 W6.

**Acceptance evidence.** BD-7 test: API approve call without e-sig → 403. AI risk score
generated for test supplier with incomplete evidence: score = HIGH_RISK; displayed to SQE;
SQE can override with documented justification.

### CAP-C4-03 — Supplier Scorecard

**Purpose.** Compute and publish quarterly supplier scorecards with OTD, quality PPM, and
responsiveness metrics. Cascade to supplier status based on threshold rules.

**Lifecycle.** Scorecard computed automatically at month/quarter end from: OTD from PREC dates
vs PO required_delivery_date; quality_ppm from IQC rejection data (C7 INSP linked to PREC);
responsiveness from manual SQE input (SCAR acknowledgment speed, RFQ response time).
Published to supplier portal (if configured). Two consecutive PROBATION quarters → supplier
status cascade.

**Wave target.** L4 W5 (scorecard computation); L5 W6 (supplier portal access).

**Acceptance evidence.** Scorecard computation verified: 5 rejected parts from 1,000 received
= 5,000 PPM. OTD: 18/20 deliveries on or before required date = 90%. Cascade: two PROBATION
quarters → supplier.status = probation within 24h of second scorecard finalization.

### CAP-C4-04 — PO Authoring and Approval Routing

**Purpose.** Author purchase orders from MRP purchase requisitions or manual requests.
Route for approval per approval matrix. Transmit to supplier (EDI 850 or portal or email).

**Lifecycle.** Per SM-2 full transition table (§3.1). PO draft may be auto-created from
MRP PLAN_ORDER_BUY actions (C3) that a Procurement Clerk has accepted. Approval threshold
matrix: configurable per tenant (e.g. < $5,000 auto-approve; $5,000–$50,000 require
Procurement Manager; > $50,000 require VP Procurement). E-sig above threshold.

**EDI 850 transmission.** On SM-2 transition to `sent`: EDI 850 generated per GS1 standard
and transmitted to supplier's EDI endpoint (E15 integration). EDI 855 acknowledgment
ingested asynchronously and updates PO to `acknowledged`.

**Wave target.** L4 W4; L5 W5.

**Acceptance evidence.** Auto-create from MRP action: accepted MRP PLAN_ORDER_BUY →
PO draft created with correct item, qty, required date. Approval threshold: $60,000 PO
requires VP e-sig. EDI 850 round-trip tested in integration environment.

### CAP-C4-05 — 3-Way Match (per D2 §8)

**Purpose.** Match purchase order quantity/price to receipt quantity to supplier invoice
quantity/price before authorizing payment.

**Logic.** At PO fully_received (or on invoice receipt, whichever comes first): compare
PO line qty_ordered = PREC line qty_received = invoice line qty_invoiced (within tolerance
configured per tenant, default ±2%). Compare PO unit_price = invoice unit_price (within
price tolerance, default ±0.5%). Match result: PASS (all within tolerance), CONDITIONAL
(within extended tolerance; Finance review), FAIL (outside extended tolerance; automatic
payment hold with Problem Detail).

**Wave target.** L4 W5; L5 W5.

**Acceptance evidence.** 3-way match pass tested with exact qty and price match. FAIL tested:
invoice price 2% above PO price → payment hold generated. CONDITIONAL tested: 1% price
variance → Finance review queue item created.

### CAP-C4-06 — SCAR Cycle

**Purpose.** Formally hold suppliers accountable for defective deliveries. Track corrective
action through to verified effectiveness.

**Lifecycle.** Per SCAR Lifecycle (§3.3). SCAR auto-candidate created when IQC rejection
PPM for a supplier+item exceeds threshold (configurable; default 2,000 PPM rolling 90d)
or any critical defect. SQE opens SCAR. Supplier responds per 8D methodology.
Effectiveness check: minimum 3 subsequent lots must pass IQC before SCAR closes.

**Integration with D6 NC to CAPA.** Every SCAR has an nc_case_id FK to the triggering NC.
If SCAR closes as ineffective, CAPA escalation (SM-6) may be triggered.

**Wave target.** L4 W7; L5 W7.

**Acceptance evidence.** PPM threshold test: inject 30 rejects from 1,000 received =
30,000 PPM → SCAR auto-candidate appears. BD-7 re-enforcement: SQE must manually open SCAR
(not auto-opened). Effectiveness check: SCAR cannot close if fewer than 3 subsequent lots
passed IQC.

### CAP-C4-07 — PPAP Submission Cycle (Auto — SM-PPAP, BD-17)

**Purpose.** Manage the PPAP submission for all new automotive parts from suppliers.
Enforce 18-element checklist. Enforce BD-17: SQE must approve, not automation.

**Lifecycle.** Per SM-PPAP (§3.2). PPAP submission created automatically when APQP reaches
Phase 4 approval in C3. Supplier submits documentation for each of the 18 elements. SQE
reviews element-by-element. PSW (§2.11) is element #18 and must be submitted last.
ISIR (§2.13) is mandatory for element #9 (dimensional results) and element #11 (initial
process studies). PPAP approved → supplier qualified for this item+revision; SM-1 ship gate
opens for PPAP-required SOs in C1.

**Wave target.** L4 W8; L5 W8. (J2 Auto pack only.)

**Acceptance evidence.** BD-17 test: API approve without SQE e-sig → 403. Element completeness:
submit with element #9 missing → submit blocked with Problem Detail listing missing elements.
PPAP approval → SM-1 ship gate validated as unlocked for affected SO.

### CAP-C4-08 — AS9120B Distributor Traceability (Aero — J3)

**Purpose.** For aerospace distributors (AS9120B certified), enforce traceability to original
manufacturer for every part received. Maintain certificate of conformance (CoC) chain.

**Lifecycle.** At PO creation for item with counterfeit_risk ≥ MEDIUM: PO requires
CoC documentation. At PREC: coc_attached must be true for acceptance. CoC stored in DMS
and linked to PREC line. If distributor cannot provide CoC to original manufacturer, item
flagged for independent testing per IDEA-STD-1010B.

**Wave target.** L4 W7; L5 W8. (J3 Aero pack only.)

**Acceptance evidence.** PREC for HIGH-risk item without CoC attached: acceptance blocked.
CoC stored and retrievable 10 years after last usage (per AS9100D retention).

### CAP-C4-09 — Counterfeit-Avoidance Plan and Per-Receipt Screen (Aero — J3)

**Purpose.** Implement counterfeit avoidance per AS5553/AS6174. Assess risk per supplier
per item. Screen incoming parts from HIGH/CRITICAL risk suppliers.

**Lifecycle.** CRA per supplier (§2.17) created at qualification and reviewed annually.
HIGH/CRITICAL risk: at PREC, system checks: (a) supplier in approved_sources for this item
(from C2 CRA); (b) coc_attached=true; (c) independent_test_required triggers CSI creation
(§2.21). CSI completed before PREC can move to `accepted`.

**GIDEP.** Confirmed counterfeit (CSI result = CONFIRMED_COUNTERFEIT): BD-22 requires GIDEP
(Government-Industry Data Exchange Program) alert filed within 30 days. gidep_reported must
be true before CSI can close. GIDEP API integration via E15.

**Wave target.** L4 W7; L5 W8. (J3 Aero pack only.)

**Acceptance evidence.** BD-22 test: CSI confirmed counterfeit → system blocks CSI close
until gidep_reported=true. PREC screen: CRITICAL risk supplier without approved-source
flag → receipt blocked.

### CAP-C4-10 — GIDEP Submission (Aero — J3, BD-22, per E15)

**Purpose.** Submit failure experience reports and counterfeit alerts to GIDEP per BD-22
mandate. Receive GIDEP alerts for items in active BOM.

**Lifecycle.** Outbound: CSI confirmed counterfeit → GIDEP report drafted; Quality Lead
reviews; filed via E15 GIDEP API. Inbound: GIDEP alert subscription running continuously
against active Item Master; match on part number triggers alert to SQE + Engineering Lead.

**Wave target.** L4 W8; L5 W8. (J3 Aero pack only.)

**Acceptance evidence.** GIDEP inbound alert matching: inject mock GIDEP alert for item
in active BOM → alert appears in SQE inbox within 15 minutes. Outbound: GIDEP report
generated from CSI record with correct fields.

### CAP-C4-11 — DSCSA Trading Partner Onboarding (Pharma — J1)

**Purpose.** Verify and maintain DSCSA trading partner records for all drug product suppliers.
Block POs to unverified or expired trading partners.

**Lifecycle.** New drug product supplier: DSCSA trading partner record created (§2.18).
License verification via VRS (Verification Router Service) or authorized trading partner
direct. Annual re-verification. Alert at T-30 days before license_expiry. If partner status
= suspended or revoked: PO creation blocked with Problem Detail citing DSCSA 21 USC §360eee.

**Wave target.** L4 W8; L5 W8. (J1 Pharma pack only.)

**Acceptance evidence.** PO for drug item to supplier without DSCSA record → 422 block.
Expired license: PO blocked. VRS verification round-trip tested in Pharma test environment.

### CAP-C4-12 — EU FMD Partner Onboarding (Pharma — J1, per EU 2016/161)

**Purpose.** Verify and maintain EU Falsified Medicines Directive (FMD) trading partner
records. Ensure all EU drug product suppliers are registered with NMVS (National Medicines
Verification System).

**Lifecycle.** Supplier onboarded with EU FMD record (§2.19). NMVS registration verified.
Country-specific requirements applied (some EU member states have different dispensing
rules). Alert at expiry. POs for EU-market drug products blocked if supplier EU FMD
record = expired or revoked.

**Wave target.** L4 W8; L5 W8. (J1 Pharma pack only.)

### CAP-C4-13 — FSVP Hazard Analysis (Food — J5, per FSMA Part 1, 21 CFR 1.502)

**Purpose.** Conduct and maintain Foreign Supplier Verification Program (FSVP) hazard
analyses for all imported food ingredients and food-contact materials.

**Lifecycle.** Hazard analysis (§2.14) conducted per supplier per item at onboarding and
reviewed every 3 years (21 CFR 1.506). Biological, chemical, physical, and radiological
hazards identified. Hazards with known or reasonably foreseeable risk: requires_verification=true,
triggering FSVP Verification Activity (§2.15).

**Wave target.** L4 W8; L5 W8. (J5 Food pack only.)

**Acceptance evidence.** Hazard analysis 3-year review trigger: system creates review task
at next_review_due date. New imported ingredient: hazard analysis required before first PO.

### CAP-C4-14 — FSVP Verification Activity (Food — J5)

**Purpose.** Execute and record verification activities against hazards identified in FSVP
Hazard Analysis. Track next verification due date. Suspend supplier if verification
result = UNSATISFACTORY.

**Lifecycle.** Verification activity (§2.15) scheduled per hazard. Executed (onsite audit,
cert review, lab test, or CoA review per hazard severity). Result recorded.
UNSATISFACTORY result: SCAR opened (CAP-C4-06); supplier.status → probation; further
shipments of the affected food ingredient placed on 100% hold pending resolution.

**Wave target.** L4 W8; L5 W8. (J5 Food pack only.)

### CAP-C4-15 — Sub-Processor Onboarding (per L2 §8 + I8 §6)

**Purpose.** Onboard and maintain Data Processing Agreements (DPAs) for all third-party
processors of personal data. Enforce GDPR Article 28 sub-processor controls.

**Lifecycle.** New sub-processor identified when a supplier contract includes personal data
processing. Sub-Processor Record (§2.20) created with DPA reference, data categories,
transfer mechanism. Annual review scheduled (review_due_date). DPA expired or terminated →
data processing halted until renewal; alert to Legal + DPO.

**Wave target.** L4 W7; L5 W8.

**Acceptance evidence.** DPA expiry alert tested at T-30 days. New sub-processor without
DPA: system flags as incomplete; contract cannot be activated.

### CAP-C4-16 — NADCAP Cycle Tracking (Aero — J3, per AC7004 family)

**Purpose.** Track NADCAP certifications for all aerospace suppliers providing special
processes (heat treat, NDT, welding, coatings, chemical processing). Block POs when
certification expired or suspended.

**Lifecycle.** NADCAP record (§2.16) created per supplier site per process code. Cert
expiry alert at T-90 days. Expired cert: PO submit for items requiring that process blocked.
Suspended cert: all open POs for affected supplier+process placed on quality hold (SM-2
hold_quality). Re-certification: NADCAP cert uploaded and verified by SQE; PO block lifted.

**Wave target.** L4 W7; L5 W8. (J3 Aero pack only.)

**Acceptance evidence.** PO for heat-treat part from supplier with expired AC7004 cert →
PO submit returns 422 with Problem Detail citing NADCAP expiry. T-90 alert email tested.
Suspended cert → open POs placed on hold (SM-2 hold_quality transition tested).

---

## 5. Workflows the Domain Participates In

Primary participant:
- D2 Procurement to Pay (§C4 owns PO lifecycle, receipt, 3-way match, supplier invoice)
- D4 Receive to Inspect (PREC triggers IQC in C7; receipt creates lot in C5)

Supporting participant:
- D3 Plan to Produce (MRP planned orders become POs via C3→C4 handoff)
- D5 Inspect to Disposition (IQC failures feed RTV and SCAR creation)
- D6 NC to CAPA (SCAR ties to NC Case; systemic supplier issues escalate to CAPA)
- D11 Release to Trace (supplier batch genealogy: supplier lot → PREC → internal lot → shipment)

---

## 6. APIs (per E4)

```
Supplier API             POST /suppliers; GET /suppliers/{id}; PATCH /suppliers/{id}/status;
                         GET /suppliers/{id}/qualifications; GET /suppliers/{id}/scorecards;
                         GET /suppliers/{id}/scars

Supplier Qualification API  POST /supplier-qualifications; GET /sq/{id};
                             POST /sq/{id}/approve (BD-7 enforced — e-sig required)

PO API                   POST /purchase-orders; GET /po/{id};
                         POST /po/{id}/approve (approval matrix enforced);
                         POST /po/{id}/send; GET /po/{id}/lines;
                         POST /po/from-mrp-action (batch create from accepted MRP actions)

PREC API                 POST /precs; GET /precs/{id}; POST /precs/{id}/lines;
                         POST /precs/{id}/trigger-iqc

SCAR API                 POST /scars; GET /scars/{id}; POST /scars/{id}/open;
                         POST /scars/{id}/acknowledge; POST /scars/{id}/close;
                         POST /scars/{id}/effectiveness-fail

PPAP API                 POST /ppap; GET /ppap/{id}; PATCH /ppap/{id}/elements/{element};
                         POST /ppap/{id}/submit; POST /ppap/{id}/approve (BD-17 enforced)

3-Way Match API          POST /po/{id}/3way-match (trigger); GET /po/{id}/3way-match/result

NADCAP API               POST /nadcap-certs; GET /nadcac-certs?supplier_id=&process_code=;
                         GET /nadcap-certs/expiring-soon (rolling 90d)

FSVP API                 POST /fsvp-hazard-analyses; GET /fsvp/{id};
                         POST /fsvp-verification-activities; GET /fsvp-va/{id}

GIDEP API                POST /gidep-reports (outbound); GET /gidep-alerts (inbound matches)
```

All endpoints: idempotency via Idempotency-Key. Rate limit: 300 req/min. SLO: p99 < 500ms
reads; p99 < 2s mutations. RBAC: Procurement role = full PO + Supplier; SQE = SCAR + PPAP +
NADCAP + IQC; Finance = PO approve (above threshold) + 3-way match; Read-only = GET.

---

## 7. Frontend Surfaces (per F4 + F5)

```
Supplier Workspace           Projection: suppliers by status; expiring certs; probation queue;
                              scorecard tier heat map.

Supplier Record Shell        Authoritative: supplier header; sites tab; contacts tab;
                              qualifications tab; scorecard history; SCAR history;
                              NADCAP certs (J3); DSCSA/EU FMD (J1); FSVP (J5).

PO Workspace                 Projection: open POs by status; overdue deliveries; POs pending
                              approval; EDI acknowledgment pending.

PO Record Shell              Authoritative: PO header; lines; receipt history; 3-way match
                              status; PREC links.

PREC Workspace               Projection: receipts today; under IQC; quarantine lots.

SCAR Workspace               Projection: open SCARs by status; overdue responses; top-10
                              suppliers by PPM.

SCAR Record Shell            Authoritative: SCAR header; 8D progress; containment evidence;
                              root cause; effectiveness verification.

PPAP Workspace               Projection: open PPAP submissions by status; pending SQE review.

PPAP Record Shell            Authoritative: PPAP header; 18-element checklist; PSW status;
                              ISIR link; approval trail.

Supplier Quality Dashboard   Aggregation: OTD by supplier; PPM trend; SCAR open count;
                              NADCAP expiry calendar; FSVP verification due dates.
```

---

## 8. Cross-Cutting Concerns Instantiation

```
C1 Audit Chain    Every Supplier status change, PO approval, SCAR state transition,
                  PPAP approval, qualification approval audit-logged.

C2 E-signature    Supplier qualification approval (BD-7). PO approval above threshold.
                  PPAP approval (BD-17). SCAR effectiveness verification.

C8 Observability  PO OTD metric emitted per PO close. SCAR response SLA breach alert
                  at T+0 (response_due_date elapsed). NADCAP expiry 90-day alert.

C10 Retention     PPAP records retained per IATF 16949 §7.5 (product lifetime + 1 year
                  minimum; typically 15 years for automotive). SCAR records retained per
                  quality agreement terms. FSVP records: 21 CFR 1.510 (2 years).
```

---

## 9. Wave Assignments

```
Supplier + Site + Contact       L4 W1;  L5 W5
Supplier Qualification          L4 W6;  L5 W6
Supplier Scorecard              L4 W5;  L5 W6
PO + PO Line                    L4 W4;  L5 W5
PREC + PREC Line                L4 W5;  L5 W5
3-Way Match                     L4 W5;  L5 W5
SCAR                            L4 W7;  L5 W7
RTV                             L4 W7;  L5 W7
PPAP Submission + PSW + ISIR    L4 W8;  L5 W8 (J2 Auto)
NADCAP Cert Tracking            L4 W7;  L5 W8 (J3 Aero)
Counterfeit Risk + CSI          L4 W7;  L5 W8 (J3 Aero)
GIDEP Integration               L4 W8;  L5 W8 (J3 Aero)
DSCSA Trading Partner           L4 W8;  L5 W8 (J1 Pharma)
EU FMD Trading Partner          L4 W8;  L5 W8 (J1 Pharma)
FSVP Hazard Analysis + VA       L4 W8;  L5 W8 (J5 Food)
Sub-Processor Record            L4 W7;  L5 W8
```

---

## 10. Standards Governing This Domain (clause-level)

```
ISO 9001:2015         §8.4 control of externally provided processes, products and services:
                      §8.4.1 general, §8.4.2 type and extent of control, §8.4.3 information
                      for external providers

IATF 16949:2016       §8.4.1 general supplier control; §8.4.2 supplier selection process;
                      §8.4.2.1 supplier selection criteria; §8.4.3 information to external
                      providers; §8.6.5 statutory regulatory conformity (traceability)

AS9100D               §8.4.1 general; §8.4.2 type and extent of control;
                      §8.4.2.2 customer-approved external providers

ISO 13485:2016        §7.4.1 purchasing process; §7.4.2 purchasing information;
                      §7.4.3 verification of purchased product

21 CFR Part 820       §820.50 purchasing controls: (a) evaluation of suppliers,
                      (b) purchasing data

AIAG PPAP 4th         §2 (general requirements); Appendix A (18 PPAP elements)

AIAG SCAR / 8D        8D disciplines D1-D8; containment, root cause, corrective action

AS9120B:2016          Aerospace distributor traceability requirements;
                      CoC chain of custody

AS5553B:2019          §5 (risk assessment); §6 (approved sources); §7 (requirements flow-down);
                      counterfeit electronic parts avoidance

AS6174B:2017          §5 (counterfeit materiel risk mitigation); IDEA-STD-1010B test methods

DSCSA 21 USC §360eee  Drug Supply Chain Security Act: §360eee-1 (product identifier);
                      §360eee-3 (trading partner authorized); verification steps at receipt

EU 2016/161           EU Falsified Medicines Directive: Article 11 (verification at receipt);
                      NMVS registration requirement

FSMA 21 CFR Part 1    §1.502 (FSVP applicability); §1.506 (hazard analysis);
                      §1.507 (verification activities); §1.510 (records retention: 2 years)

ICH Q10:2008          §3.2.2 (supplier management; qualification of suppliers)

VDA 6.3:2016          Process audit methodology (automotive supplier auditing)

GDPR Art. 28          Sub-processor requirements: controller/processor agreement;
                      data subject rights; deletion obligations
```

---

## 11. Boundary with Adjacent Domains

- **D-02 Engineering**: BOM components drive PO requirements. Approved-sources list (CRA)
  from C2 filters supplier selection for counterfeit-sensitive items. PPAP requires drawing
  revision from C2 ECO to be released before submission is accepted.

- **D-03 Planning**: MRP PLAN_ORDER_BUY actions are the primary demand signal for PO
  creation. Supply Plan records in C3 are updated when POs are firmed and received.

- **D-05 Inventory**: PREC receipt creates quarantine lot records in C5. IQC pass moves
  lot to available status. IQC fail keeps lot in quarantine; triggers RTV.

- **D-07 Quality (C7)**: PREC triggers IQC inspection creation (C7 INSP). IQC rejection
  triggers SCAR candidate in C4. SCAR root cause and CA evidence stored in C4 but linked
  to NC Case in C7 via nc_case_id.

- **D-08 Traceability**: Supplier lot number on PREC line is the root genealogy node.
  All downstream lots in C5 trace back to the PREC line. DSCSA transaction information
  submitted from PREC for Pharma pack.

---

## 12. Per-Pack Overlays

### J1 — Pharma

- DSCSA trading partner (§2.18) required for all wholesaler and distributor drug product
  suppliers before first PO. VRS verification on each shipment for certain transaction types.
- EU FMD (§2.19) required for all EU-market drug suppliers.
- Each PREC for drug product: DSCSA transaction information (TI) and transaction history (TH)
  recorded. dscsa_trx_recorded must be true before PREC → putaway_complete.
- ICH Q10 §3.2.2: supplier change notifications (SCN) required from drug substance suppliers
  before implementing process changes. SCN receipt triggers C2 ECO evaluation.

### J2 — Automotive

- PPAP mandatory before first production shipment of any new part. SM-1 ship gate blocked
  for PPAP-required items until ppap_id.status = approved.
- ISIR dimensional results must show Cpk ≥ 1.67 for all special characteristics (per AIAG PPAP
  4th element #11 initial process studies).
- VDA 6.3 process audit used for supplier qualification audits in addition to IATF §8.4.2.
- SCAR response uses 8D format with D1-D8 fields tracked per SCAR record.
- Annual Layout Inspection (C3 CAP-C3-09) failure triggers SCAR when root cause is supplier
  process deviation.

### J3 — Aerospace

- AS9120B CoC chain required for all electronic parts from distributors.
- NADCAP certs (§2.16) required for special process suppliers: heat treat (AC7004), NDT
  (AC7101), welding (AC7110), coatings (AC7108/AC7109), chemical processing (AC7004).
  PO blocked when cert expired or suspended.
- GIDEP (CAP-C4-10) alert subscription active against entire Item Master for aerospace items.
- ITAR supplier: supplier.site.itar_registered must be true for ITAR-controlled parts.
  PO for ITAR item to non-ITAR supplier → blocked.
- Counterfeit avoidance (CAP-C4-09): HIGH/CRITICAL risk suppliers require independent test
  per IDEA-STD-1010B before PREC accepted.

### J4 — Medical Device

- Supplier qualification per ISO 13485 §7.4.1 and 21 CFR 820.50. Quality agreement required
  for all critical suppliers (device component suppliers; sterilization services).
- UDI-PI on PREC line for implantable and active device components. Supports DHR traceability.
- Critical supplier audit frequency: annually for contract manufacturers; every 3 years for
  component suppliers with good performance history.

### J5 — Food & Beverage

- FSVP hazard analysis (CAP-C4-13) and verification (CAP-C4-14) mandatory for all imported
  food ingredients under FSMA Part 1.
- FSMA §204 traceability: supplier-provided PTI (product traceability information) recorded
  on PREC for all FSMA §204-listed foods (leafy greens, tomatoes, etc.).
- Allergen documentation: PREC for allergen-containing ingredients requires allergen statement
  CoA attached. Absence blocks IQC trigger.

---

## 13. Failure Modes Catalog

| Failure | Trigger | Impact | Recovery |
|---|---|---|---|
| PO created to suspended supplier | Status check not enforced at submit | Goods received with no quality standing | SM-2 submit guard: supplier.status ≠ active/qualified → 422 Problem Detail |
| BD-7 qualification auto-approved | Missing e-sig check | Non-compliant supplier in approved-source | API enforce: POST /sq/{id}/approve requires e-sig JWT; 403 without |
| NADCAP expiry not caught before PO | Alert system failure | Non-conforming special process | NADCAP block at PO submit: check supplier_site.nadcap_certs for process code; return 422 if expired |
| SCAR closed without effectiveness check | Workflow shortcut | Recurrence of supplier defect | SCAR lifecycle enforces: ca_complete → closed only via verify_effectiveness transition; direct jump blocked |
| 3-Way Match false positive | Invoice quantity matches PO but not actual receipt | Payment for undelivered goods | 3-way match runs on PREC qty (actual received), not PO qty alone |
| PPAP approved without all 18 elements | Element validation not enforced | Regulatory audit finding; production with unqualified supplier | elements_checklist all_complete_or_waived check enforced at SM-PPAP submit gate |
| DSCSA transaction not recorded | PREC putaway without dscsa_trx_recorded check | DSCSA non-compliance; FDA enforcement risk | PREC putaway transition blocked until dscsa_trx_recorded=true for drug product PRs |
| FSVP verification overdue | Scheduling gap | FSMA non-compliance for imported food | Monthly automated report of overdue FSVP VAs; alert to Regulatory Affairs |

---

## 14. KPIs

| KPI | Formula | Target | Measurement |
|---|---|---|---|
| Supplier OTD | (POs received on or before required_delivery_date) / total POs closed | ≥ 95% | Per supplier per quarter; from PREC received_date vs PO required_delivery_date |
| Incoming Quality PPM | (IQC rejected parts / total parts received) × 1e6 | < 1,000 PPM | Monthly rolling 90 days; per supplier; per item family |
| SCAR Response Rate | SCARs with supplier acknowledgment within response_due_date / total SCARs opened | ≥ 90% | Monthly; overdue SCARs auto-escalated at T+3d |
| SCAR Effectiveness Rate | SCARs closed as effective / total SCARs closed in period | ≥ 80% | Quarterly; low rate triggers supplier qualification review |
| PPAP First-Pass Rate | PPAP submissions approved or conditionally approved at first review / total | ≥ 70% | Per APQP project; supplier SQE collaboration quality indicator |
| NADCAP Cert Coverage | Supplier sites with all required NADCAP certs current / total aerospace sites | 100% | Monthly; expiring certs in 90-day window flagged |
| 3-Way Match Pass Rate | POs with 3-way match PASS / total POs closed | ≥ 98% | Monthly; conditional and fail rates by supplier and item category |
| FSVP Verification Currency | FSVP VAs completed before next_verification_due / total required | 100% | Monthly; overdue flagged to Regulatory Affairs |

---

## 15. RACI — Key Process Steps

| Step | Procurement Lead | SQE | Finance | Quality Lead | Regulatory |
|---|---|---|---|---|---|
| Supplier qualification approval | C | A/R | − | C | I (regulated) |
| PO approval (above threshold) | R | − | A | − | − |
| SCAR opening | C | A/R | − | C | − |
| PPAP approval | C | A/R | − | C | − |
| NADCAP cert renewal verification | C | A/R | − | − | − |
| DSCSA/FMD partner verification | C | C | − | − | A/R |
| FSVP verification | C | C | − | C | A/R |
| 3-way match payment authorization | I | − | A/R | − | − |

---

## 16. Decision Phrase

```
S2-02_C3_C4_PLANNING_PROCUREMENT_DEEP_UPGRADE_COMPLETE
```

After emit: load `S2-03_C5_C6_INVENTORY_SHOPFLOOR.md` next.
