# D4 — Receive to Inspect

```
workflow_id:    D4
workflow_name:  Receive to Inspect
domain_primary: Procurement & Supplier Quality
domains_cross:  Inventory & Logistics, Quality Improvement,
                Traceability, Master Data
state_machine:  SM-4
trigger_count:  21
branch_count:   16
edge_case_count:13
kpi_count:      12
failure_mode_count: 13
per_pack:       J1 J2 J3 J4 J5
bd_boundaries:  BD-7
ai_advisory:    AI-17 AI-19
version:        V10-deep
```

---

## §1 Purpose and Scope

The Receive to Inspect (R2I) workflow covers every event from physical arrival
of goods at a facility receiving dock through the final recorded disposition of
incoming material. D4 is the primary quality gate for all externally sourced
materials, sub-contracted assemblies, consignment stock, customer-returned goods,
and inter-facility transfers before they are admitted to usable inventory.

D4 owns the Inspection State Machine (SM-4) and interfaces directly with:
- D2 (Procurement to Pay) — triggered by GRN creation at Step 6 of D2
- D5 (Inspect to Disposition) — hands off immediately after inspection execution
- C5 (Inventory & Logistics) — lot status transitions and inventory posting
- C7 (Quality Improvement) — non-conformance escalation
- C3 (Supplier Quality) — supplier scorecard event recording

Scope includes physical receipt verification, inspection plan selection,
sample preparation and drawing, dimensional/attribute/laboratory inspection
execution, and first-pass disposition recording. Detailed multi-party
disposition boards (MRB) are in D5 scope; D4 only records the first-pass
outcome that may trigger D5 MRB.

---

## §2 Entry Conditions

| # | Pre-condition | Enforcement |
|---|-------------|------------|
| PC-1 | Open GRN exists referencing a confirmed PO line (`po_line.status ∈ {acknowledged, in_transit}`) | GRN creation validator |
| PC-2 | Item master active with inspection class and default inspection plan | Item completeness check |
| PC-3 | Receiving dock location exists and has available quarantine hold slots | Location capacity check |
| PC-4 | For cold-chain items: temperature logger data feed active or logger scan completed before unload | Cold-chain gate |
| PC-5 | For DSCSA products (J1): ASN EPCIS data received and serialized product identifiers present | DSCSA pre-check |
| PC-6 | For ITAR-controlled goods (J3): import permit and end-use certificate on file | Trade compliance gate |
| PC-7 | Inspection instruments required for the plan are calibrated (calibration_due_date ≥ today) | Calibration check in IQC system |

---

## §3 Trigger Catalog

| ID | Trigger | Source | Context |
|----|---------|--------|---------|
| T-01 | GRN created: standard PO receipt at dock | D2 Step 6 | Purchased material |
| T-02 | GRN created: consignment replenishment receipt | D2 BR-D2-02 | Consignment stock |
| T-03 | GRN created: sub-contractor service return | D2 BR-D2-04 | Sub-process WO |
| T-04 | GRN created: RMA customer return | Return authorization (D1) | Customer returns |
| T-05 | GRN created: inter-facility transfer | D3 BR-D3-18 | Sister facility |
| T-06 | GRN created: cold-chain shipment | D2 BR-D2-14 | Pharma/Food temperature-controlled |
| T-07 | GRN created: capital equipment delivery | D2 BR-D2-12 | Asset installation (IQ trigger) |
| T-08 | DSCSA product received (J1): serialized drug product | D2 BR-D2-06 | VRS verification required |
| T-09 | FSVP foreign food ingredient received (J5) | D2 BR-D2-07 | FSVP CTE record required |
| T-10 | Aero counterfeit-risk part received (J3) | D2 BR-D2-09 | AS5553/6174 CoC and test required |
| T-11 | Medical device component received (J4) | D2 BR-D2-10 | UDI-DI registration; biocomp check |
| T-12 | ITAR-controlled hardware received (J3) | D2 BR-D2-08 | Import permit check; foreign national restriction |
| T-13 | PPAP sample material received (J2) | D2 BR-D2-18 | First-article sample processing |
| T-14 | Skip-lot re-evaluation trigger: supplier scorecard drop | Supplier quality (C3) | Skip-lot suspension |
| T-15 | Regulatory sample receipt (J1): FDA/EMA stability sample return | External | Stability program |
| T-16 | Calibration equipment returned from external calibration service | D2 (calibration service GRN) | Calibration release check |
| T-17 | Emergency purchase receipt | D2 T-11 | Priority inspection |
| T-18 | Biological material receipt (J4/J1): human tissue, animal origin | Regulatory | Extended biologic testing |
| T-19 | Organic ingredient receipt (J5) | D2: organic certified item | Organic certificate check |
| T-20 | Hazardous material receipt | D2: HAZMAT item | GHS/SDS verification; segregation |
| T-21 | Re-inspection trigger: lot already in stock but quality alert raised | C7 quality alert | Re-inspect in-stock lot |

---

## §4 State Machine — SM-4 Inspection Record

### States

| State | Meaning |
|-------|---------|
| `pending_receipt` | GRN created; goods physically in transit to receiving dock |
| `received_hold` | Physical receipt confirmed; material in quarantine hold location |
| `inspection_plan_selected` | Inspection plan and sample size determined |
| `sampling_in_progress` | Sampler has drawn sample; sample in lab or on inspection bench |
| `inspection_in_progress` | Inspector actively recording measurements and results |
| `inspection_complete` | All plan requirements satisfied; first-pass result recorded |
| `disposition_pending` | First-pass result entered; awaiting final disposition (may trigger D5) |
| `disposition_recorded` | Final disposition applied to lot; lot status updated in inventory |
| `closed` | Lot moved to final location; GRN closed; scorecard updated |
| `cancelled` | GRN voided (wrong delivery, supplier recalled before inspection) |

### Transition Table

| From | Event | Guard | To | Actor |
|------|-------|-------|-----|-------|
| `pending_receipt` | Physical arrival confirmed at dock | `driver_delivery_confirmed = true` | `received_hold` | Receiving Clerk |
| `received_hold` | Inspection plan assigned | `inspection_plan_id set` | `inspection_plan_selected` | IQC System |
| `inspection_plan_selected` | Sampler draws sample | `sample_qty_drawn ≥ plan.required_sample_qty` | `sampling_in_progress` | Sampler |
| `sampling_in_progress` | Sample delivered to inspection station | `sample_location = INSPECTION_BENCH or LAB` | `inspection_in_progress` | Inspector |
| `inspection_in_progress` | All tests recorded | `all_plan_steps.result_entered = true` | `inspection_complete` | Inspector |
| `inspection_complete` | First-pass accept | `all_results_pass = true` | `disposition_pending` → auto `disposition_recorded` | System |
| `inspection_complete` | First-pass fail | `any_result_fail = true` | `disposition_pending` | QC Inspector |
| `disposition_pending` | Simple accept/reject decision | `disposition ∈ {ACCEPT, REJECT}` ∧ `no_mrb_required` | `disposition_recorded` | QC Inspector |
| `disposition_pending` | MRB required | `disposition = USE_AS_IS` OR `ncr_raised = true` | MRB in D5 → `disposition_recorded` | QC Manager → D5 |
| `disposition_recorded` | Lot moved to target location | `inventory_transaction_posted = true` | `closed` | WMS |
| `received_hold` | Cancellation | `grn_voided = true` | `cancelled` | Receiving Supervisor |

---

## §5 Step Substance

### Step 1 — Physical Arrival and Dock Verification

Upon truck or carrier arrival, the receiving clerk performs:
1. **Delivery document check**: carrier bill of lading matches expected ASN;
   PO number on packing slip matches open PO in system
2. **Packaging integrity**: outer cartons checked for damage, moisture,
   infestation signs; seal integrity verified for sterile or controlled items
3. **Cold-chain integrity check** (if applicable): logger device scanned
   or data extracted; temperature readings reviewed against item's
   `storage_temp_min / storage_temp_max`; any excursion triggers
   `cold_chain_excursion = true` flag on GRN
4. **Quantity verification**: packing list quantities counted; over/under
   shipment recorded
5. **GRN creation**: `goods_receipt_note` record created with:
   `po_id`, `supplier_id`, `grn_date`, `actual_qty_received`,
   `damage_flag`, `cold_chain_excursion`, `carrier_name`, `tracking_number`
6. **Quarantine label printing and placement**: lot label with lot number,
   GRN reference, QC HOLD status printed and affixed; material moved to
   quarantine hold location in WMS

### Step 2 — Inspection Plan Selection

The IQC system selects the inspection plan via the following resolution priority:

1. **Supplier-item specific plan**: `supplier_item_inspection_plan` where
   `supplier_id` + `item_id` + `facility_id` matches — highest priority
2. **Item-level default plan**: `item_master.default_inspection_plan_id`
3. **Commodity-class default**: `commodity_class.default_inspection_plan_id`
4. **Blanket facility plan**: facility-level fallback

**Skip-lot evaluation**: if the supplier-item combination has ≥
`skip_lot_min_passes` consecutive PASS results AND
`supplier_scorecard.composite_score ≥ skip_lot_score_threshold`:
- Frequency reduced to `REDUCED` (1 of n lots)
- Or `SKIP` (identity test only; no dimensional/attribute sampling)
- Skip-lot eligibility re-evaluated after every receipt event

**Skip-lot suspension triggers**: supplier score drops below threshold;
field complaint received from this supplier's lot; supplier corrective action
open; IQC fail on any lot from this supplier in the last N days.

### Step 3 — Sample Size Determination

Sample size is calculated per the inspection plan's sampling standard:

- **AQL sampling** (ANSI/ASQ Z1.4 / Z1.9 or AIAG reference): lot size →
  sample size code letter → sample size from inspection level table →
  accept/reject numbers from AQL table
- **Fixed sample**: plan specifies absolute sample count (for small lots,
  lab tests, or destructive tests)
- **100% inspection**: plan specifies inspection level = FULL (typically for
  new suppliers, critical safety features, or regulatory requirement)
- **MIL-STD-1916**: for military/defense items (J3) — risk-based zero-defect
  sampling with Verification Level (VL) instead of AQL

Sampler records:
`sample_event`: `sample_event_id`, `grn_id`, `item_id`, `lot_number`,
`population_qty`, `sample_qty`, `sampling_standard`, `inspection_level`,
`aql_value`, `accept_number`, `reject_number`, `sample_drawn_by`,
`sample_drawn_datetime`

### Step 4 — Inspection Execution

The inspection checklist is generated from the plan's step definitions:

Each `inspection_step` contains:
- `step_type`: VISUAL, DIMENSIONAL, ATTRIBUTE, LABORATORY, IDENTITY,
  FUNCTIONAL, BIOLOGICAL, CHEMICAL
- `characteristic_name`, `nominal`, `upper_tolerance`, `lower_tolerance`
  (for dimensional/variable data)
- `test_method_ref`: reference to test method document
- `required_instrument_type`: micrometer, CMM, tensile tester, etc.
- `measurement_count`: number of measurements per sample unit
- `acceptance_criteria_expression`

Inspector enters results per step. System evaluates:
- Variable data: `nominal − lower_tol ≤ measurement ≤ nominal + upper_tol`
- Attribute data: `defect_count ≤ accept_number`
- Laboratory: result vs. specification limit (for chemical, biological assays)
- Identity (J1 ICH Q6A): compendial identity test pass/fail

All measurement values stored in `inspection_result` with:
`inspector_id`, `instrument_id`, `calibration_verification`, `result_value`,
`result_status` (PASS/FAIL), `observation_note`

### Step 5 — First-Pass Disposition Recording

After all steps complete, system calculates aggregate result:
- **PASS**: all steps PASS → first-pass status = PASS
- **FAIL**: any critical step FAIL → first-pass status = FAIL
- **CONDITIONAL**: critical steps pass, minor failures within tolerance → QC review

QC Inspector records first-pass disposition:
- `ACCEPT`: lot released to stock; inventory transaction posted
- `REJECT`: lot quarantined; D5 MRB or direct RTV initiated
- `CONDITIONAL_ACCEPT`: lot accepted with recorded reservation (BD-7 required)
- `PENDING_LAB`: physical inspection pass; lab results pending; lot held

Scorecard event recorded to `supplier_scorecard_event` regardless of outcome.

---

## §6 Branch Catalog

| Branch ID | Condition | Special Logic |
|-----------|----------|--------------|
| BR-D4-01 | Standard purchased material | AQL sampling per inspection plan; standard disposition |
| BR-D4-02 | Skip-lot eligible supplier | Identity test only; reduced or skip sampling |
| BR-D4-03 | Cold-chain shipment | Temperature logger review before unload; excursion forces full inspection even if skip-lot eligible |
| BR-D4-04 | DSCSA serialized drug product (J1) | VRS verification call before quarantine label printed; failed VRS blocks receiving |
| BR-D4-05 | FSVP foreign food ingredient (J5) | FSVP CTE `first_land_received` created; hazard analysis doc verified |
| BR-D4-06 | Aero counterfeit-risk part (J3) | AS5553 CoC review; GIDEP check; independent test if risk_level = HIGH |
| BR-D4-07 | Medical device direct-contact component (J4) | UDI-DI registration; ISO 10993 biocompatibility class check |
| BR-D4-08 | ITAR-controlled hardware (J3) | Import permit verified; foreign national access restriction check; DDTC shipment record |
| BR-D4-09 | Customer RMA return | Return authorization verified; condition assessment; original lot traceability restored |
| BR-D4-10 | Sub-contractor return | Service completion certificate as GRN; work order operation linked |
| BR-D4-11 | PPAP sample receipt (J2) | Lot flagged PPAP; 100% inspection per first-article plan; linked to PPAP submission |
| BR-D4-12 | Consignment stock receipt | Lot ownership remains with supplier until consumption; quarantine check same as standard |
| BR-D4-13 | Capital equipment / calibration equipment | Asset tag creation; IQ protocol trigger (C9); calibration record creation |
| BR-D4-14 | Hazardous material | GHS/SDS verified; segregated storage location; hazmat label verified |
| BR-D4-15 | Biological / human-origin material (J4/J1) | Extended biological testing; additional safety controls per BSL classification |
| BR-D4-16 | Organic ingredient (J5) | Organic certificate validity check; chain of custody documentation |

---

## §7 Edge Cases

| EC # | Scenario | Handling |
|------|---------|---------|
| EC-01 | Mis-shipment: goods delivered to wrong facility | GRN not created; carrier redirect arranged; supplier notified; cross-dock or return arranged |
| EC-02 | Cold-chain excursion detected | Even if supplier is skip-lot eligible, full inspection executed; QC hold until disposition |
| EC-03 | Counterfeit suspected at visual inspection (J3) | Lot immediately quarantined; Lab testing ordered; supplier notified; GIDEP alert filed if confirmed; potential DMSMS notification |
| EC-04 | Identity test failure (J1 ICH Q6A) | Lot held in quarantine; QP notified; OOS investigation per FDA OOS guidance initiated; supplier investigation request |
| EC-05 | Calibration instrument just expired before inspection | Inspector cannot use instrument; replacement instrument required; ongoing inspections paused until calibrated instrument available |
| EC-06 | Partial shipment: only portion of PO qty received | GRN for received qty; PO line remains open; inspection covers received quantity; subsequent GRN triggers new inspection |
| EC-07 | Lot number collision: supplier reuses lot number from previous shipment | System detects duplicate lot; new internal lot number issued; supplier notified of lot numbering violation |
| EC-08 | Sample destruction during testing | QC documents sample destruction; if population large enough, re-sample; if insufficient qty, escalate to MRB (D5) |
| EC-09 | Inspector qualifications lapse during inspection | Eligibility check triggered; re-assign to qualified inspector; measurements taken by unqualified inspector voided |
| EC-10 | DSCSA VRS service unavailable (J1) | Lot placed in extended hold (up to 24 h); VRS retry with exponential backoff; lot not released to stock until verification confirmed |
| EC-11 | Supplier ships substitute item without notification | GRN item ID mismatch; receiving system flags `unauthorized_substitution`; PO buyer notified; material held pending approval |
| EC-12 | Over-shipment above PO authorization | GRN records authorized qty; over-shipment qty held separately; buyer must create PO amendment or arrange return of excess |
| EC-13 | Lab result turnaround exceeds hold time limit for perishable | Expedited lab protocol; if result not available before expiry risk threshold, risk-based decision with QC Manager approval |

---

## §8 Per-Pack Overlays

### J1 Pharma
- **DSCSA (21 CFR §360eee)**: at GRN, for every prescription drug product
  (SNDC-level): `POST /dscsa/vrs/verify` with NDC, lot, expiry, serialized
  product identifier. VRS response includes `verified = true/false` and
  `suspect_product_flag`. Failed VRS: product withheld; FDA notification within
  24 hours per §582(h)(2).
- **Identity testing (ICH Q6A)**: every lot of each API must pass compendial
  identity test (e.g. IR spectroscopy comparison). Identity test failure triggers
  OOS investigation per FDA 2006 OOS guidance.
- **Cold-chain**: temperature log data from electronic monitoring device reviewed
  before unloading. Excursion: lot quarantined with `excursion_detail` JSONB
  (time_out_of_range, max_excursion_temp, duration_minutes). QP disposition
  required for all excursion lots.
- **GDP (Good Distribution Practice)**: receiving documentation package includes
  GDP-compliant delivery completion record; transporter GDP certificate on file.

### J2 Automotive
- **AIAG PPAP sampling**: for PPAP sample lots, 100% inspection against all
  product characteristics listed in the control plan. Dimension data feeds
  PPAP Part Submission Warrant (PSW) package.
- **Statistical sampling**: AIAG/IATF preferred sampling plans for production
  lots (AQL 0.65 for critical characteristics per customer requirements).
- **CoC (Certificate of Conformance)**: mandatory supplier CoC document on each
  GRN; CoC version number stored in `grn.coc_document_id`.
- **IMDS submission verification**: for PPAP lots, IMDS material data submission
  number verified against part number.

### J3 Aerospace
- **AS5553/6174 counterfeit mitigation**: for electronic parts from independent
  distributors, mandatory physical inspection checklist (date code, batch code,
  surface condition, marking legibility). If visual inspection raises concern:
  electrical test per AS6171 or test to DLA-PROM-8-0002. Confirmed counterfeit:
  GIDEP alert submitted; DCSA notification if ITAR item.
- **ITAR import verification**: import permit and end-use certificate archived
  per DDTC Part 123 requirements. Part number and quantity reconciled against
  import permit allowances.
- **MIL-STD-1916 sampling**: for defense items, VL (Verification Level)
  sampling replaces AQL; zero-defect criteria apply at agreed VL.
- **Traceability**: serialized aero parts receive traceability record linking
  to manufacturer CoC, heat/lot number, and material certification.

### J4 Medical Device
- **UDI registration**: upon GRN for device components with `udi_required = true`:
  `POST /api/v1/traceability/udi` creates `udi_record` with UDI-DI from item
  master and UDI-PI (lot number + expiry); GUDID lookup for reference data.
- **ISO 10993 biocompatibility**: for direct-contact materials, `biocompatibility_risk_class`
  on item master verified. Class III: additional biological evaluation required
  before lot released.
- **Sterile packaging integrity**: for pre-sterilized incoming components,
  sterile barrier system integrity check (visual + dye penetration for
  applicable packaging types).

### J5 Food Safety
- **FSMA §204 CTE**: `first_land_received` CTE created at dock with:
  TLC (Traceability Lot Code), quantity and unit of measure, receiving point
  description, date received, originator TLC (from shipper's CTE).
- **Allergen declaration verification**: allergen declaration form from supplier
  verified against `item_master.allergen_profile`; any undeclared allergen
  triggers immediate quarantine and QC Manager notification.
- **Organic chain of custody**: for organic-certified items, organic certificate
  (NOP or equivalent) validity checked; lot flagged `organic_certified = true`
  only when certificate valid.
- **HACCP hazard check**: for incoming food ingredients, hazard classification
  (biological, chemical, physical) per facility HACCP plan verified against
  hazard analysis for that ingredient.

---

## §9 AI Advisory Integration

| AI Advisor | Invocation Point | Output |
|-----------|----------------|--------|
| AI-17 Supplier Risk | Inspection plan selection (Step 2) | Recommendation to increase inspection level if supplier risk score elevated; trend alerts |
| AI-19 Inspection Intelligence | Inspection execution (Step 4) | Defect pattern recognition; anomaly detection on measurement data vs. historical distribution |

---

## §10 Cross-Workflow Couplings

| Coupled Workflow | Coupling | Direction |
|-----------------|---------|-----------|
| D2 Procurement to Pay | GRN creation is entry trigger for D4 | D2 → D4 |
| D5 Inspect to Disposition | First-pass disposition outcome feeds D5 for MRB/complex disposition | D4 → D5 |
| C5 Inventory | Lot status change; inventory posting on release | D4 → C5 |
| C7 Quality Improvement | NCR raised on fail disposition | D4 → C7 |
| C3 Supplier Quality | Scorecard event; skip-lot update; SCAR trigger | D4 → C3 |
| D9 Maintain to Restore | Calibration equipment return receipt triggers calibration release | D4 → D9 |
| D10 Batch to Release (J1) | Raw material IQC pass required before batch start | D4 → D10 |

---

## §11 KPIs and Metrics

| KPI | Definition | Target |
|-----|-----------|--------|
| KPI-D4-01 | Dock-to-IQC Cycle Time | GRN creation → `inspection_in_progress` timestamp | ≤ 4 hours standard; ≤ 1 hour emergency |
| KPI-D4-02 | Inspection Cycle Time | `inspection_in_progress` → `disposition_recorded` | Per plan type: attribute ≤ 1 day; lab ≤ 3 days |
| KPI-D4-03 | First-Pass Accept Rate | Lots accepted first-pass / total lots inspected × 100 | ≥ 98% |
| KPI-D4-04 | Incoming PPM | Defective units / total units received × 10⁶ | ≤ 500 ppm |
| KPI-D4-05 | Skip-Lot Coverage Rate | Lots under skip-lot program / total lots received × 100 | Optimized per supplier portfolio |
| KPI-D4-06 | Cold-Chain Excursion Rate | GRNs with cold-chain excursion / total cold-chain GRNs × 100 | ≤ 1% |
| KPI-D4-07 | DSCSA VRS Pass Rate (J1) | VRS verifications passed / total verifications × 100 | 100% |
| KPI-D4-08 | Counterfeit Detection Rate (J3) | Confirmed counterfeit lots detected / total high-risk lots received | Track; zero tolerance |
| KPI-D4-09 | Inspection Backlog | Lots in `received_hold` or `inspection_in_progress` > SLA time | ≤ 5% of receiving volume |
| KPI-D4-10 | Supplier Repeat Defect Rate | Defect lots from suppliers with prior SCAR / total defect lots × 100 | ≤ 10% (measure effectiveness of SCArs) |
| KPI-D4-11 | Sample Accuracy | Measurement system analysis (MSA) R&R < 10% gauge R&R | Per characteristic type |
| KPI-D4-12 | Identity Test Pass Rate (J1) | Identity tests passed / total identity tests × 100 | 100% |

---

## §12 Failure Modes

| FM # | Failure Mode | Cause | Detection | Mitigation |
|------|-------------|-------|----------|----------|
| FM-01 | Defective material admitted to stock | Inspector misses defect; false PASS | Downstream IPC failure; customer complaint | Measurement system analysis; inspector recertification; skip-lot suspension on repeat |
| FM-02 | Cold-chain excursion missed | Logger data not downloaded; manual override | Temperature review SOP; dock supervisor check | Mandatory logger scan before unload; system block if no logger data |
| FM-03 | Counterfeit part accepted (J3) | Visual CoC not scrutinized; test skipped | Customer detection; GIDEP alert | Mandatory AS5553 checklist; independent test for high-risk items |
| FM-04 | DSCSA VRS not called (J1) | System integration failure; manual bypass | Daily VRS completion audit | Hard system block: GRN cannot close without VRS confirmation |
| FM-05 | Sample drawn from wrong lot | Physical segregation failure at receiving | Cross-lot contamination complaint | FIFO scan-based lot assignment; physical quarantine segregation |
| FM-06 | Calibration instrument expired during inspection | Instrument not checked before use | Calibration status indicator | Pre-inspection calibration check; instrument status displayed on inspection screen |
| FM-07 | Skip-lot not suspended after supplier failure | Scorecard not triggering suspension | Skip-lot KPI; audit | Auto-suspend skip-lot on scorecard drop; any IQC fail suspends skip-lot status |
| FM-08 | ITAR import permit quantities exceeded (J3) | Over-shipment against permit | Trade compliance audit; CBP inspection | Real-time permit balance tracking; GRN blocked if permit qty exhausted |
| FM-09 | Allergen undeclared by supplier (J5) | Supplier production change not communicated | Allergen surveillance test | Annual allergen re-declaration required; lot-level allergen test for high-risk ingredients |
| FM-10 | Inspection data entry error | Manual transcription; typo | Data range checks; outlier detection | Instrument direct-to-system interface (SPC integration); range validation on entry |
| FM-11 | Inspector not qualified for test method | Skill assignment gap | Eligibility check on inspection assignment | Inspection step assignment validates inspector qualification against required skill code |
| FM-12 | Lot quarantine label removed or misplaced | Physical handling error | Physical audit; WMS location mismatch | RFID/barcode label + system location lock; unauthorized movement alert |
| FM-13 | Biological material mishandled (J4/J1) | BSL protocol not followed | Safety audit | Mandatory HAZMAT training for receiving staff; restricted location access |

---

*Decision phrase: S2-09_D4_D5_DEEP_UPGRADE_COMPLETE (partial — D4 complete)*
