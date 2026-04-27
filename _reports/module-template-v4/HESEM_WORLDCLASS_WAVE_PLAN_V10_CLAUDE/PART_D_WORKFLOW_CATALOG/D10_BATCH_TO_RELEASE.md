# D10 — Batch to Release

```
workflow_id:    D10
workflow_name:  Batch to Release
domain_primary: Quality Improvement (Batch Release)
domains_cross:  MES Execution, Inventory & Logistics, Traceability,
                Planning & Production, Maintenance & EHS, Finance
state_machine:  SM-10
trigger_count:  17
branch_count:   13
edge_case_count:12
kpi_count:      16
failure_mode_count: 16
per_pack:       J1 J2 J3 J4 J5
bd_boundaries:  BD-1 BD-9 BD-13 BD-14 BD-15 BD-16 BD-20
ai_advisory:    AI-24
version:        V10-deep
```

---

## §1 Purpose and Scope

The Batch to Release (BREL) workflow governs the formal authorization of a
finished lot, batch, or serialized unit for distribution or shipment. It is the
culminating gate that synthesizes evidence from every upstream workflow — production
execution (D3), incoming inspection (D4), disposition (D5), CAPA (D6), document
control (D7), training (D8), and maintenance/calibration (D9) — into a single,
structured release decision backed by mandatory e-signatures.

D10 is the densest regulated workflow because it is the convergence point of all
quality system obligations. A release cannot proceed if any evidence chain element
is missing, expired, or flagged as non-conforming unless a formal exception path
(concession, deviation, conditional release) with documented authority is followed.

BD-1 is the master release ban: no lot, batch, or serialized unit may be released
for distribution without the release authority's e-signature. This applies to all
industry types; the identity of the required authority varies by pack.

Standards aligned: 21 CFR 211.165 (release testing), 21 CFR 211.188 (batch records),
EU GMP Annex 16 (QP certification for release), ICH Q10 §3.2.1, ISA-88 (batch
control), ISO 13485 §7.5.6, AS9100D §8.5, Annex 13 (IMP), ISO 14155 (clinical).

---

## §2 SM-10 State Machine — Batch Release

### States

| State | Meaning |
|-------|---------|
| `production_complete` | WO confirmed; yield recorded; lot created but not yet in release review |
| `evidence_assembly` | Release coordinator assembling all evidence chain items |
| `qp_review` | Pre-release pack under formal QP/release authority review |
| `bd_approval_pending` | BD-1 (or BD-9/BD-13..16/BD-20) gate: mandatory e-signature not yet obtained |
| `released` | All required e-signatures obtained; lot status = RELEASED; available for shipment/distribution |
| `rejected` | Lot rejected by release authority; lot quarantined; D5/D6 triggered |
| `conditional_released` | Released with documented exception (concession, deviation); limited use scope |
| `on_hold_pending_investigation` | Release blocked pending OOT/CAPA/NC investigation |
| `withdrawn` | Previously released lot recalled or withdrawn from distribution |
| `closed` | Post-release activities complete (CoA/CoC issued; regulatory submissions done) |

### Transition Table

| From | Event | Guard | To | Actor |
|------|-------|-------|-----|-------|
| `production_complete` | Release coordinator opens BREL review | `wo.status = closed ∧ lot_created = true` | `evidence_assembly` | Release Coordinator |
| `evidence_assembly` | All evidence items assembled and verified | `evidence_chain.completeness = 100%` | `qp_review` | Release Coordinator |
| `evidence_assembly` | Evidence gap found | `evidence_chain.gap_count > 0` | `on_hold_pending_investigation` | System |
| `qp_review` | QP/release authority review complete | `release_authority_review_recorded = true` ∧ `!bd_trigger` | `bd_approval_pending` | System |
| `qp_review` | QP rejects batch | `qp_rejection_recorded = true` | `rejected` | QP |
| `bd_approval_pending` | BD-1 e-sig obtained | `bd_1_esig_complete = true` | `released` | Release Authority |
| `bd_approval_pending` | Additional BD (BD-9/BD-13..16/BD-20) | `additional_bd_esig = true` | `released` | Pack-specific Authority |
| `bd_approval_pending` | Conditional release path | `concession_approved = true ∧ bd_esig_for_exception = true` | `conditional_released` | QP + additional |
| `on_hold_pending_investigation` | Investigation cleared | `investigation.result = CLOSED_ACCEPT` | `evidence_assembly` | QC Manager |
| `on_hold_pending_investigation` | Investigation concludes rejection | `investigation.result = REJECT` | `rejected` | QP |
| `released` | Field recall triggered | `recall_issued = true` | `withdrawn` | QA Director |
| `released` | All post-release activities complete | `coa_issued ∧ submissions_complete` | `closed` | Release Coordinator |
| `rejected` | Lot disposition resolved (scrap/RTV) | `disposition_case.status = closed` | `closed` | QC Manager |

---

## §3 Trigger Catalog

| ID | Trigger | Context |
|----|---------|---------|
| T-01 | All production operations confirmed; WO closed | Standard discrete manufacturing |
| T-02 | Pharma batch: all EBR steps signed; batch record review (BRR) complete | J1 pharmaceutical batch |
| T-03 | Outgoing quality control (OQC): finished product testing complete with all results | All regulated packs |
| T-04 | Sub-assembly completion: component lot released for use in final assembly | Multi-level assembly |
| T-05 | Rework WO complete: re-tested lot ready for re-release decision | D3/D5 rework branch |
| T-06 | Concession-based release request: lot non-conforming but customer approved | D5 concession disposition |
| T-07 | Qualification lot completion: IQ/OQ/PQ production run complete | D3 validation/qualification type |
| T-08 | Stability sample lot: dedicated production run for stability program | J1 stability (T-18 from D3) |
| T-09 | Partial release request: portion of lot released; remainder held | Supply constraint scenario |
| T-10 | Release against deviation (J1): planned deviation during manufacture with pre-approved exception | J1 deviation management |
| T-11 | Investigational Medicinal Product (IMP) release (J1): Annex 13 / 21 CFR 312 | J1 clinical supply |
| T-12 | Clinical trial device release (J4): ISO 14155 investigational device | J4 clinical trial |
| T-13 | Custom-made device release (J4): EU MDR Article 52; one-off custom device | J4 custom device |
| T-14 | PPAP-verified production lot (J2): first production lot post-PPAP approval | J2 first production |
| T-15 | First Article Inspection (FAI) anchor lot (J3): AS9102 FAI record approved | J3 first article |
| T-16 | Recall replacement lot: replacement production for recalled product | D12-linked recall replacement |
| T-17 | Sterilization cycle complete: device lot sterilization cycle record released | J4 sterile device |

---

## §4 Pre-Release Evidence Chain

The evidence chain is the structured, exhaustive checklist that must be
satisfied before the BREL record can transition from `evidence_assembly` to
`qp_review`. Each evidence item is evaluated against the lot's pack overlay,
production type, and regulatory scope. Evidence items are resolved as:
`SATISFIED`, `NOT_APPLICABLE`, `WAIVED` (with documented exception authority),
or `BLOCKING` (halts release until resolved).

### EC-01 — Production Operations Complete

`wo.status = closed` ∧ `all_wo_operations.status = CONFIRMED`  
For J1 EBR: all EBR steps e-signed including critical steps with countersignature.  
For ISA-88 batch: all process phases confirmed; batch deviation log reviewed.

### EC-02 — Yield Within Acceptance Range

`actual_good_qty ≥ wo.planned_qty × (1 − max_scrap_tolerance)`  
Out-of-range yield triggers investigation before release.  
J1: theoretical yield reconciliation within MBR tolerance mandatory.

### EC-03 — Incoming Material IQC (All Components)

All component lots consumed in this WO: `inspection_record.disposition = ACCEPT`  
OR `disposition = USE_AS_IS` with valid BD-7 e-sig on file.  
J1: all raw material lots have QP-reviewed IQC certificate.

### EC-04 — In-Process Inspections (All Plan Steps)

All `wo_operation.inspection_plan` IPCs completed and passed.  
For J1: all in-process controls (IPCs) in EBR within acceptance criteria.  
For J2: control plan CTQ monitoring records complete and within spec.

### EC-05 — Final / Outgoing Inspection Complete

`inspection_record` for finished lot exists with `disposition = ACCEPT`.  
For J1: all finished product testing per specifications (identity, assay,
purity, sterility, endotoxins, other compendial tests) completed with
results within specification. FDA OOS guidance applied if any OOS result.

### EC-06 — Open Critical NC / CAPA — No Blocking

Query: `nonconformance_report` where `affected_lot_id = lot_id` AND
`status ≠ closed` AND `severity = CRITICAL`.  
Result must be empty OR each open NC has `release_blocking = false` with
documented risk acceptance by QC Manager.

### EC-07 — Equipment Validation Evidence Fresh

For each production equipment used in WO:  
`equipment.qualification_status = QUALIFIED` ∧  
`equipment.last_qualification_date + requalification_interval ≥ today`  
J1: IQ/OQ/PQ status for all critical equipment.  
J4: sterilization cycle validation current (ISO 11135/11137/17665).

### EC-08 — Calibration Currency (Critical Instruments)

For each instrument used in OQC or critical IPC measurements:  
`calibration_record.status = released` ∧  
`calibration_record.calibration_due_date ≥ today`  
No OOT instrument used in critical measurements during production window.

### EC-09 — Document Revision Currency

Work instructions and SOPs used during production:  
`document.status = released` ∧ `document.revision = wo.document_revision_ref`  
No superseded documents used after their effective replacement date.

### EC-10 — Training Compliance (All Operators on WO)

For each operator who performed operations on this WO:  
Eligibility resolver G1 result = GO at time of operation.  
`training_record.status = CERTIFIED` for all required skills.  
J1 aseptic: `aseptic_qualification.status = QUALIFIED` for all sterile filling operators.

### EC-11 — Cleaning Validation State (J1 Pharma)

For the production equipment used:  
`cleaning_validation_record.result = PASS` for the last cleaning cycle.  
No cleaning validation excursion between previous batch and this batch.  
`line_clearance_record` in EBR: complete and signed.

### EC-12 — Environmental Monitoring (J1 Sterile Pharma)

For sterile manufacturing: environmental monitoring results from the
manufacturing period are within action limits for the relevant area
classification (ISO 5/Grade A, ISO 7/Grade B, etc.).  
Excursion during the batch period triggers OOT-equivalent investigation.

### EC-13 — MBR / Master Production Record Adherence (J1)

EBR (Electronic Batch Record) completeness review:  
All mandatory fields populated; all critical parameters within MBR limits;
all deviations documented with QP approval (if planned) or investigation
(if unplanned); yield reconciliation complete.

### EC-14 — DSCSA Partner Exchange Data (J1)

For prescription drug products: EPCIS event data for `manufacturing_event`
and `commissioning_event` generated for all serialized units.  
Transaction Information (TI), Transaction History (TH), Transaction
Statement (TS) records complete for DSCSA exchange to trading partners.

### EC-15 — UDI Applied and Registered (J4)

`udi_record` exists for each device in the lot with UDI-DI + UDI-PI.  
For EU-MDR devices: EUDAMED device registration confirmed.  
For US FDA: GUDID registration or exemption on file.

### EC-16 — FAI on File (J3)

For first production lot per drawing revision:  
`first_article_inspection_record.status = APPROVED` referencing current
drawing revision.  
For subsequent lots: FAI record from current revision valid and not expired.

### EC-17 — PPAP on File (J2)

`ppap_record.status ∈ {APPROVED, INTERIM}` for the item + customer combination.  
Interim PPAP: expiry date not exceeded; interim conditions met.  
Expired PPAP: full re-PPAP required before release.

### EC-18 — HACCP CCP Within Limit During Production (J5)

`ccp_monitoring_record` for all CCPs during production period: no unresolved
CCP limit breach.  
Any CCP deviation (T-11 in D6): CAPA open and not blocking, OR resolved
with food safety disposition confirmed by PCQI.

### EC-19 — Allergen Verification Post-Cleanup (J5)

If prior production run on same equipment used different allergen profile:  
`allergen_changeover_verification.result = PASS` confirmed before this
lot's production start.  
ATP swab or allergen-specific test result on file.

### EC-20 — Recall Not in Effect

Query: `product_recall` where `affected_item_id = lot.item_id` AND
`status = ACTIVE`.  
Result must be empty. If active recall exists, lot held pending recall
scope assessment — lot may be post-recall replacement (T-16) which is
explicitly exempted.

### EC-21 — Sanitary Transport Check (J5)

For outgoing food lots requiring temperature-controlled transport:  
Transport vehicle qualification record (prior cleaning; temperature
history) reviewed before shipping authorization.  
`transport_sanitary_check.status = PASS`.

### EC-22 — Sterilization Cycle Complete and Released (J4)

`sterilization_cycle_record.status = released` for the associated
sterilization cycle.  
Biological indicator (BI) result: all BIs pass (sterility assurance level
= 10⁻⁶ or per method spec).  
Physical cycle parameters within validated ranges.

### EC-23 — Validation Evidence Fresh (Process Validation)

For processes under validated state:  
`process_validation_record.status = VALIDATED` ∧  
`revalidation_due_date ≥ today`  
J1: cleaning validation, sterilization validation, aseptic process validation.  
J4: sterilization process validation, packaging validation.

### EC-24 — Audit Chain Extension Confirmed

All audit log entries for this lot are complete and unbroken.  
No unauthorized data manipulation detected (21 CFR Part 11 / Annex 11 audit trail).  
For regulated packs: e-signature records complete and verifiable.

---

## §5 Step Substance

### Step 1 — Pre-Flight Evidence Assembly

The release coordinator opens the BREL record and initiates evidence assembly.
The system auto-evaluates all evidence items (EC-01 through EC-24) that are
applicable to this lot based on `item_master.pack_overlay_flags`,
`item_master.production_type`, and `lot.regulatory_scope`.

System-evaluated items: those where data already exists in the database
(inspection records, training records, calibration records, equipment
qualification, etc.) are auto-evaluated via queries. The coordinator
reviews each auto-evaluation and either confirms or escalates anomalies.

Manual items: some evidence items require coordinator review of documents
(EBR completeness, deviation log review, visual inspection of physical batch
record) and manual confirmation with e-signature.

`brel_evidence_item` table tracks each EC:
```
brel_id (FK → batch_release_record)
evidence_code (EC-01 through EC-24 and beyond)
applicable (bool)
status (SATISFIED | NOT_APPLICABLE | WAIVED | BLOCKING)
waiver_authority_id (if WAIVED)
waiver_justification_doc_id
evaluated_at, evaluated_by
auto_evaluated (bool)
```

Any `BLOCKING` item freezes the BREL record in `evidence_assembly` state
until resolved. The system generates a task per blocking item assigned to
the appropriate owner.

### Step 2 — QP / Release Authority Review

When evidence chain = 100% satisfied (no BLOCKING items), the pre-release
pack is presented to the designated release authority for formal review.

The pre-release pack is a consolidated view (rendered PDF for signed archival)
comprising:
- Batch record / EBR summary
- All inspection result summaries
- Deviation/NC log (with dispositions)
- Equipment, calibration, and validation status summary
- Training compliance summary for operators
- Environmental monitoring summary (J1)
- Any open CAPA status (non-blocking)
- Evidence chain checklist with all EC statuses
- Previous similar batch comparison (AI-24 advisory)

The release authority reviews the pack and records their review decision:
- `PROCEED_TO_RELEASE`: no concerns
- `CONDITIONAL_PROCEED`: concerns noted; proceed with specific conditions attached
- `REJECT`: batch rejected; reasons mandatory

QP review is time-targeted per SLA (p95 target: ≤ 3 business days for standard
pharmaceutical batch; ≤ 1 business day for medical device OQC lot).

### Step 3 — BD-1 and Pack-Specific BD Signature Capture

**BD-1**: no lot may be released without the designated release authority e-sig.

Pack-specific release authority:

| Pack | Release Authority | BD Code |
|------|-----------------|---------|
| J1 EU/UK/AU | QP (Qualified Person) | BD-1 + BD-9 (QP non-delegable) |
| J1 US FDA | Authorized QA representative + responsible person | BD-1 |
| J2 Automotive | QA Manager | BD-1 |
| J3 Aerospace | Quality Representative (AS9100D §8.5) | BD-1 + BD-20 (FAI confirmation) |
| J4 EU MDR | PRRC (Person Responsible for Regulatory Compliance) | BD-1 + BD-13 (PRRC declaration) |
| J4 US FDA | QA Manager | BD-1 |
| J5 Food | PCQI (for release against Food Safety Plan) | BD-1 |
| General | QA Manager | BD-1 |

Multiple BD codes may fire simultaneously (e.g., J1 EU batch triggers BD-1 + BD-9).
All required e-signatures must be captured before `released` transition.

E-signature API enforcement:
```
POST /api/v1/brel/{id}/release
```
Returns 403 with RFC 9457 problem detail for each unsatisfied BD:
```json
{
  "type": "https://hesem.io/problems/banned-decision",
  "status": 403,
  "bd_code": "BD-1",
  "detail": "BD-1: Batch release requires QA Manager or higher e-signature. No release authority has signed.",
  "required_signatories": ["qp", "qa_manager"],
  "signed_by": [],
  "brel_id": "BREL-2026-003891"
}
```

### Step 4 — Release Commit and Cascade

Upon all required e-signatures captured, the system executes the release
commit as a single atomic transaction:
1. `lot.status` → `RELEASED`
2. `brel_record.status` → `released`; `released_at` = timestamp
3. ATP (Available to Promise) calculation updated in Order Management (D1)
4. Open SO allocations against this item fulfilled from released lot
5. D11 (Release to Trace) workflow triggered: traceability records finalized
6. CoA / CoC generation initiated (Step 5)
7. Pack-specific regulatory submissions initiated (Steps 6-8)

### Step 5 — Certificate of Analysis / Conformance Issuance

CoA (Certificate of Analysis) for pharmaceutical and chemical lots:
- `coa_document` record created with: `lot_number`, `item_id`, `batch_size`,
  `manufacturing_date`, `expiry_date`, all test results with method references
  and specification limits, release decision, `release_authority_name`,
  `release_authority_signature_hash`
- CoA transmitted to customer via: EDI document (ANSI X12 856 attachment),
  customer portal, email (where portal not available)

CoC (Certificate of Conformance) for discrete manufacturing (J2/J3):
- `coc_document` record: `lot_number`, `item_id`, `revision`, `quantity`,
  `serial_numbers[]` (if serialized), dimensional inspection reference,
  material certifications, process certifications (NADCAP, welding, etc.),
  conformance statement, signatory
- For J3: CoC per AS9100D §8.5.3 format with drawing/specification revision references

### Step 6 — DSCSA Partner Exchange (J1)

For prescription drug products: upon release commit, the system generates
EPCIS events:
- `commissioning_event`: associates GTINs (Global Trade Item Numbers) with
  assigned serial numbers and lot/expiry
- `packing_event`: describes the aggregation (serial → case → pallet)
- `shipping_event` (generated at D1 shipment): TI, TH, TS data transmitted
  to direct trading partner via VRS-compliant EPCIS repository or direct
  EDI 856 exchange

DSCSA verification response time: ≤ 24 hours of request per §582(b)(4)(B).

### Step 7 — UDI Submission (J4)

For medical devices: upon release:
- US FDA GUDID submission (or confirmation if already registered): `PUT /gudid/devices/{udi_di}`
  updating `productionIdentifiers` with lot number and expiry
- EU EUDAMED submission: device registration and UDI registration confirmed;
  if new device or new UDI-PI format: API call to EUDAMED actor registration
- UDI labeling verification: physical label on device packaging includes human-
  readable and machine-readable (DataMatrix) UDI

### Step 8 — Pack-Specific Additional Submissions

| Pack | Submission | Timing |
|------|-----------|--------|
| J1 Pharma | Batch release certificate per Annex 16; APR contribution | On release; batch data feeds annual APR |
| J2 Automotive | First production lot: PPAP PSW update; CoC to customer | On release |
| J3 Aerospace | CoC per AS9100D; FAI record cross-reference on CoC | On release |
| J4 Medical Device | EUDAMED UDI registration update; PRRC declaration | On release; BD-13 required |
| J5 Food | FSMA §204 CTE `transformation` event with output TLC | On release; FSVP documentation if export |

---

## §6 Branch Catalog

| Branch ID | Condition | Special Logic |
|-----------|----------|--------------|
| BR-D10-01 | Standard pharmaceutical batch release (J1) | Full EBR review; QP BD-1+BD-9 e-sig; DSCSA exchange; CoA |
| BR-D10-02 | Standard discrete manufacturing release | OQC pass; QA Manager BD-1; CoC |
| BR-D10-03 | Concession-based release | D5 concession approved; concession document linked; conditional release state; limited scope |
| BR-D10-04 | Release against deviation (J1) | Deviation pre-approved by QP; deviation reference on CoA; any unplanned deviation requires post-facto QP approval |
| BR-D10-05 | Investigational Medicinal Product (IMP) release (J1) | Annex 13 / 21 CFR 312 IND; additional QP certification; Qualified Investigator (QI) cross-reference |
| BR-D10-06 | Clinical trial device release (J4) | ISO 14155; Sponsor/CRO cross-reference; CE mark not required for clinical use but IEC 62304 software compliance evidence |
| BR-D10-07 | Custom-made device (J4) | EU MDR Article 52; no CE mark; Declaration of Conformity per Article 52(5); statement of individual patient needs |
| BR-D10-08 | PPAP first production lot (J2) | PPAP PSW approved; first lot CoC with PPAP reference; customer notification |
| BR-D10-09 | FAI anchor lot (J3) | AS9102 FAI record approved before release; FAI reference on CoC; BD-20 check |
| BR-D10-10 | Recall replacement lot | Linked to D12 recall; priority release; recall scope verification before ship |
| BR-D10-11 | Partial release | System splits lot into released sub-lot and held sub-lot; separate lot numbers; independent evidence chains |
| BR-D10-12 | Qualification/validation lot | Released for internal use (process validation supply); not for commercial distribution; special CoA note |
| BR-D10-13 | Sterile device lot (J4) | Sterilization cycle record released; BI pass; physical integrity check of sterile barrier; BD-1 + sterilization release authority |

---

## §7 Edge Cases

| EC # | Scenario | Handling |
|------|---------|---------|
| EC-01 | Concession overuse pattern: same item with concession > threshold frequency | AI-24 flags pattern; Quality Director review triggered; systemic CAPA initiated |
| EC-02 | QP unavailable (holiday, illness) for pharma batch | Designated deputy QP must be pre-registered; no release without QP or designated deputy; lot held |
| EC-03 | Aseptic re-qualification lapsed mid-campaign (J1) | Operator removed from filling pool immediately; batch held if unqualified operator performed critical aseptic step; QP batch investigation |
| EC-04 | Sterilization revalidation overdue (J4) | All lots sterilized on non-validated cycle held; revalidation priority; regulatory notification assessed |
| EC-05 | AD/SB discovered post-production affecting production equipment (J3) | Retrospective assessment: if AD affects production tooling used in suspect period, lots in evidence_assembly held; AD compliance MWO created |
| EC-06 | OOT instrument discovered during BREL evidence assembly (EC-08 fails) | BREL held; OOT impact assessment (D9) initiated; if critical measurement affected, lot cannot release until investigation complete |
| EC-07 | EBR data integrity question: system log shows anomaly (J1) | 21 CFR Part 11 / Annex 11 audit trail reviewed; QP investigation; potential FDA Part 211.192 deviation |
| EC-08 | DSCSA VRS service unavailable at release time (J1) | EPCIS commissioning events generated locally; exchange queued; lot held from customer distribution until VRS communication restored; max 24-hour hold |
| EC-09 | Partial lot released and remainder fails subsequent testing | Released sub-lot cannot be recalled retroactively without field recall (D12); remaining sub-lot rejected |
| EC-10 | PPAP status changes to SUSPENDED during BREL (J2) | G5 gate fires; BREL held; buyer and quality team notified; customer waiver or re-PPAP required |
| EC-11 | Post-release recall initiated on this lot | `lot.status → WITHDRAWN`; D12 recall triggered; customer notification; distribution trace via D11 |
| EC-12 | Evidence chain auto-evaluation query timeout | Timeout logged; coordinator manually verifies affected items; timeout root cause investigated (performance issue) |

---

## §8 Per-Pack Overlays

### J1 Pharma — Densest Overlay

**QP Certification (EU GMP Annex 16)**:
The Qualified Person certifies that each batch has been manufactured and
tested in accordance with the requirements of the MA (Marketing Authorisation),
GMP, and any other applicable regulatory requirements.

QP certification is BD-9 (non-delegable), meaning no software workaround,
automated approval, or proxy can substitute for the QP's personal
e-signature on the batch certificate. The system records:
```
qp_certification_record:
  brel_id, lot_id, batch_number
  qp_person_id (must have qp_record.status = ACTIVE)
  qp_certificate_number (national CA registration)
  certification_statement (regulatory text per Annex 16)
  esig_hash, timestamp, ip_address, session_id
```

**EBR Batch Record Review**:
QP reviews the complete EBR before certification. Critical review items:
- All in-process controls within acceptance criteria
- Any deviations documented and resolved
- Yield within reconciliation limits
- Media fill data current (for sterile batches)
- Environmental monitoring data clean
- All operators aseptically qualified (if sterile)
- All equipment qualified and calibration current
- Raw material IQC certificates reviewed
- Cleaning validation data for equipment in contact

**APR/PQR Contribution**:
Each batch release data point (yield, OOS count, deviation count) is automatically
recorded into the `apl_batch_data` table used for Annual Product Review generation.

### J2 Automotive
- PPAP PSW (Part Submission Warrant) is updated at first production lot release:
  `ppap_record.status = APPROVED` if customer sign-off received.
- CoC format follows customer-specific requirements (GM, Ford, Toyota, BMW etc.
  each have specific CoC templates stored in `customer_coc_template`).
- Customer portal submission: for customers requiring electronic CoC submission
  via their supplier portal, D10 integrates with the portal API.

### J3 Aerospace
- **BD-20 FAI Gate**: first lot per drawing revision cannot be released unless
  `first_article_inspection_record.status = APPROVED` for that drawing revision.
  BD-20 fires at `POST /api/v1/brel/{id}/release` if FAI record missing or
  in `in_progress` state.
- **AS9120B distributor release**: distributor lots require additional
  traceability documentation: original manufacturer CoC, receiving inspection
  records, storage conditions log.
- CoC content per AS9100D §8.5.3: includes customer part number, revision,
  order number, quantity, inspection results, material certifications, NADCAP
  process certifications.

### J4 Medical Device
- **PRRC Declaration (BD-13 through BD-16)**: the Person Responsible for
  Regulatory Compliance must sign the technical documentation review for any
  device released under EU MDR. Different BD codes cover different PRRC
  declarations:
  - BD-13: PRRC declaration for Class I devices (self-certified)
  - BD-14: PRRC declaration for Class II devices (notified body involvement)
  - BD-15: PRRC declaration for Class III devices (PMA or conformity assessment)
  - BD-16: Authorized Representative (AR) EU declaration for non-EU manufacturers
- **MDSAP**: for MDSAP-participating facilities, audit finding status reviewed
  before release; Grade 5 (major) findings block release.
- **Sterile release**: sterilization cycle record must be released (SM-CAL path)
  before device lot can transition to `released` state.

### J5 Food Safety
- PCQI sign-off on release against Food Safety Plan: for facilities under FSMA
  preventive controls rule, PCQI confirms that all applicable preventive controls
  were applied, monitored, and are effective for the lot.
- FSMA §204 output CTE: `cte_transformation_output` event created at batch
  release with: output TLC, product description, quantity, facility, date.
- Sanitary transport: for cold-chain food products, transport vehicle
  qualification checked before distribution authorization (EC-21).

---

## §9 RACI Matrix

| Action | Responsible | Accountable | Consulted | Informed |
|--------|------------|------------|---------|---------|
| Open BREL record | Release Coordinator | QA Manager | Production | Planner |
| Evidence auto-evaluation | System | Release Coordinator | QC Inspector | — |
| Manual evidence confirmation | Release Coordinator | QA Manager | QC Inspector | — |
| QP pre-release review (J1) | QP | QP | Regulatory Affairs | QA Director |
| BD-1 e-signature | Release Authority | QA Director | — | Regulatory Affairs |
| BD-9 QP certification (J1) | QP | QP | — | QA Director |
| BD-20 FAI gate (J3) | Quality Rep | Quality Manager | Engineering | — |
| PRRC declaration (J4) | PRRC | PRRC | Regulatory Affairs | QA Director |
| CoA/CoC generation | System / Release Coord | Release Coordinator | QA Manager | Customer |
| DSCSA exchange (J1) | System / IT | QA Manager | Regulatory Affairs | Trading Partner |
| UDI submission (J4) | Regulatory Affairs | QA Director | IT | EUDAMED/FDA |
| Post-release recall decision | QA Director | VP Quality | Regulatory | Customers |

---

## §10 AI Advisory Integration

| AI Advisor | Invocation Point | Output |
|-----------|----------------|--------|
| AI-24 Batch Release Intelligence | Pre-release pack review (Step 2) | Anomaly detection: batch parameters outside historical distribution; concession frequency warning; similar batch comparison; predictive risk of QP rejection |

AI-24 advisory is non-binding. All flagged anomalies reviewed by release
coordinator; anomaly overrides require documented justification stored in
`brel_ai_advisory_override`.

---

## §11 Cross-Workflow Couplings

| Coupled Workflow | Coupling | Direction |
|-----------------|---------|-----------|
| D3 Plan to Produce | WO completion triggers D10 evidence assembly | D3 → D10 |
| D4 Receive to Inspect | Component IQC records feed EC-03 | D4 → D10 |
| D5 Inspect to Disposition | Disposition records feed EC-04/EC-05; concession feeds BR-D10-03 | D5 → D10 |
| D6 NC to CAPA | Open CAPA status feeds EC-06; effectiveness influences release | D6 → D10 |
| D7 Document to Release | Document revision currency feeds EC-09 | D7 → D10 |
| D8 Train to Qualify | Operator training records feed EC-10 | D8 → D10 |
| D9 Maintain to Restore | Equipment qualification + calibration feeds EC-07/EC-08; OOT feeds EC-08 | D9 → D10 |
| D11 Release to Trace | Release commit triggers D11 traceability finalization | D10 → D11 |
| D1 Order to Cash | Released lot feeds ATP; enables SO fulfillment | D10 → D1 |
| D12 Complaint to Recall | Post-release recall withdraws lot; recall replacement lot feeds T-16 | D10 ↔ D12 |
| D14 Validate to Qualify | Validation supply lots released via D10; validation evidence feeds EC-23 | D14 ↔ D10 |

---

## §12 KPIs

| KPI | Definition | Target |
|-----|-----------|--------|
| KPI-D10-01 | Right-First-Time (RFT) Release Rate | BREL records reaching `released` without any `BLOCKING` evidence items discovered / total BRELs × 100 | ≥ 95% |
| KPI-D10-02 | QP Review Cycle Time p95 (J1) | 95th percentile of `qp_review_start → qp_decision` time | ≤ 3 business days |
| KPI-D10-03 | BD-1 Signature Cycle Time | `bd_approval_pending → released` | ≤ 1 business day |
| KPI-D10-04 | Release On-Time Rate | Lots released by customer-required date / total lots × 100 | ≥ 97% |
| KPI-D10-05 | Concession Release Rate | BREL using concession path / total BRELs × 100 | ≤ 3% |
| KPI-D10-06 | Batch Rejection Rate | Lots reaching `rejected` state / total lots reviewed × 100 | ≤ 1% |
| KPI-D10-07 | Evidence Chain Completeness on First Assembly | BRELs with 100% EC satisfaction on first assembly / total × 100 | ≥ 90% |
| KPI-D10-08 | DSCSA Exchange Timeliness (J1) | EPCIS events transmitted to trading partner within 24 h of release / total × 100 | 100% |
| KPI-D10-09 | UDI Registration Timeliness (J4) | UDI registered in GUDID/EUDAMED before first shipment / total device lots × 100 | 100% |
| KPI-D10-10 | FAI Gate Pass Rate (J3) | BREL passing FAI gate first attempt / total first-lot BRELs (J3) × 100 | ≥ 90% |
| KPI-D10-11 | PPAP Status Coverage (J2) | Item-customer combinations with approved PPAP / total active item-customer pairs × 100 | ≥ 98% |
| KPI-D10-12 | CCP Compliance Rate at Release (J5) | Food lots released with all CCPs within limits / total food lots released × 100 | 100% |
| KPI-D10-13 | OOT Discovery During BREL | BREL records discovering OOT at evidence assembly / total BRELs × 100 | ≤ 1% (trigger to improve calibration program) |
| KPI-D10-14 | Post-Release Withdrawal Rate | Released lots subsequently recalled / total lots released × 100 | ≤ 0.1% |
| KPI-D10-15 | CoA/CoC Issuance Cycle Time | `released → coa_transmitted` | ≤ 4 hours |
| KPI-D10-16 | Evidence Assembly Automation Rate | EC items auto-evaluated / total applicable EC items × 100 | ≥ 80% |

---

## §13 Failure Modes

| FM # | Failure Mode | Cause | Detection | Mitigation |
|------|-------------|-------|----------|----------|
| FM-01 | BD-1 e-sig obtained from unauthorized person | RBAC misconfiguration; emergency bypass | BD-1 log audit; role review | Role-based access control; quarterly signatory role audit |
| FM-02 | QP signs without reviewing EBR (rubber stamp) (J1) | Workload pressure; trust without verification | BD-9 audit; regulatory inspection finding | QP review time tracking; training on batch review expectations; regulatory inspection evidence |
| FM-03 | Evidence auto-evaluation query returns stale data | DB replication lag; caching error | Evidence freshness check; data timestamp validation | Real-time queries; no cache for BREL evidence items; staleness alert if data > threshold old |
| FM-04 | Concession used repeatedly on same defect (chronic non-conformance) | Concession easier than fixing root cause | Concession frequency KPI; AI-24 alert | AI-24 flags pattern; mandatory CAPA trigger after n concessions for same defect |
| FM-05 | DSCSA exchange failure: EPCIS not transmitted (J1) | API integration failure; connectivity | DSCSA exchange timeliness KPI; retry monitor | Retry queue with dead-letter; alert if not transmitted within 2 hours; max 24-hour hold |
| FM-06 | UDI not registered before first shipment (J4) | Registration step skipped; system not blocking | UDI timeliness KPI; shipment system check | Shipping API block: lot with `udi_required = true` cannot ship without `udi_record.registered = true` |
| FM-07 | FAI record bypassed for first lot (J3) | Schedule pressure; FAI in progress | BD-20 audit; BREL FAI gate | Hard BD-20 block; no first-lot release without FAI approval |
| FM-08 | Pharma batch released by non-QP person (J1) | QP deputy not properly designated | Annex 16 compliance audit; regulatory inspection | `qp_record.status = ACTIVE` enforced at BD-9 e-sig; no fallback to non-QP release |
| FM-09 | Environmental monitoring excursion not blocking sterile batch (J1) | EC-12 check not querying EM data | BREL completeness audit | EC-12 auto-evaluation queries `em_monitoring_result` for production period; excursion = BLOCKING |
| FM-10 | Allergen changeover not verified (J5) | EC-19 bypassed; manual override | Food safety audit; allergen incident | EC-19 result required from `allergen_changeover_verification` table; no manual bypass without PCQI sign |
| FM-11 | Released lot recalled but traceability incomplete for customer notification | D11 not triggered or traceability gaps | D12 recall scope assessment | D10 release commit triggers D11 atomically; D11 traceability check mandatory before `closed` |
| FM-12 | Sterilization cycle released without BI result (J4) | Lab result not in system; timing issue | Sterilization release check; BI result latency | EC-22 specifically checks `sterilization_cycle_record.bi_result_status = PASS`; not just cycle parameters |
| FM-13 | OOT instrument not detected during evidence assembly | EC-08 query misses instrument used in a sub-process | OOT cascade completeness audit | EC-08 queries all instruments in measurement chain, not just direct QC instruments |
| FM-14 | PPAP suspended mid-campaign; existing lots not held (J2) | PPAP suspension event not propagating to open BRELs | PPAP status propagation check | PPAP suspension triggers `brel_hold_signal` for all open BRELs on affected item-customer combination |
| FM-15 | Custom-made device released without patient-specific Declaration of Conformity (J4) | Document not generated for custom item | BREL document completeness for Article 52 | EC check: `item_master.custom_made = true` → `article_52_doc` required in evidence chain |
| FM-16 | Batch record data integrity compromised (21 CFR Part 11 violation) | Unauthorized edit to EBR data post-signature | Audit trail anomaly detector | EC-24 queries audit log for any modification to signed EBR records; any modification = BLOCKING |

---

*Decision phrase: S2-12_D10_BATCH_TO_RELEASE_DEEP_UPGRADE_COMPLETE*
