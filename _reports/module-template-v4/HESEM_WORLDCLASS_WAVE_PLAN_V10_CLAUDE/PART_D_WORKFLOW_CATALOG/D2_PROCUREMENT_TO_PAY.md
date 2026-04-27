# D2 — Procurement to Pay

```
workflow_id:    D2
workflow_name:  Procurement to Pay
domain_primary: Procurement & Supplier Quality
domains_cross:  Inventory & Logistics, Finance, Quality Improvement,
                Master Data, MES Execution, Traceability
state_machine:  SM-2
trigger_count:  25
branch_count:   18
edge_case_count:14
kpi_count:      14
failure_mode_count: 13
per_pack:       J1 J2 J3 J4 J5
bd_boundaries:  BD-7 BD-17 BD-21 BD-22
ai_advisory:    AI-17 AI-18 AI-22
version:        V10-deep
```

---

## §1 Purpose and Scope

The Procurement to Pay (P2P) workflow orchestrates every event between a
recognized material need and the settlement of the corresponding supplier
invoice. It covers direct and indirect purchases, services, capital
expenditures, sub-contractor processing, and consignment replenishment across
all manufacturing facility types.

P2P is the primary entry point for externally sourced materials that feed
into D3 (Plan to Produce), D4 (Receive to Inspect), D5 (Inspect to
Disposition), and D9 (Maintain to Restore). It is the canonical owner of
SM-2 (Procurement State Machine) and is the obligatory host for
per-pack-overlay regulatory controls applied at the supplier and item level
before any material enters the facility.

Scope includes:
- Purchase requisition origination (manual, MRP-generated, Kanban-triggered,
  consignment signal, blanket release, JIT call-off)
- Supplier qualification gate (approved supplier list enforcement, DSCSA
  trading partner registration, FSVP importer-of-record verification,
  ITAR foreign-national disclosure, NADCAP special-process certification check,
  counterfeit-risk mitigation verification)
- Purchase order lifecycle (draft → issued → acknowledged → in-transit →
  received → invoiced → paid → closed)
- In-transit visibility (ASN ingestion, container tracking, temperature logger
  data acquisition for cold-chain)
- Dock receipt and IQC cascade (triggers D4)
- Three-way match invoice approval and ERP/GL posting (links to C11 Finance)
- Supplier scorecard event recording (on-time delivery, quality, service)

Out of scope for D2: incoming inspection logic (D4), physical put-away (C5),
and supplier corrective action routing (C7 / D6).

---

## §2 Entry Conditions (Pre-conditions)

A procurement action may only be initiated when ALL of the following are
satisfied:

| # | Pre-condition | Enforcement Point |
|---|--------------|-------------------|
| PC-1 | Item master exists with `procurement_type` set and approved UOM | `item_master.status = 'active'` check at PR creation |
| PC-2 | Supplier record exists in `approved_supplier_list` for item + facility combination | Supplier gating rule at PO draft |
| PC-3 | Requestor holds `PROC_PR_CREATE` permission | RBAC middleware |
| PC-4 | Budget center has open PO budget line OR budget override approved via BD-21 | Budget validation service |
| PC-5 | Item not on embargo, ITAR-restricted to unauthorized foreign national, or sanctioned-country origin | Trade compliance check (C3 / C5) |
| PC-6 | For pharma pack: supplier holds current DEA registration, FDA facility registration, GDP certificate where applicable | J1 overlay |
| PC-7 | For food pack: FSVP importer-of-record record exists for foreign food supplier | J5 overlay |
| PC-8 | For aero pack: GIDEP and counterfeit-risk assessment completed for electronic parts meeting AS5553 scope | J3 overlay |
| PC-9 | For medical device pack: biocompatibility risk classification exists for direct-contact materials | J4 overlay |

---

## §3 Trigger Catalog

| ID | Trigger | Source | SM-2 Entry State |
|----|---------|--------|-----------------|
| T-01 | MRP net-requirement signal: `reorder_point` breached | Planning engine (C4) | `requisition` |
| T-02 | Kanban empty-bin scan at supermarket location | WMS event (C5) | `requisition` |
| T-03 | Blanket PO release: scheduled call-off date reached | Blanket order engine | `po_draft` |
| T-04 | Consignment min-level breach: `consignment_level < reorder_min` | Consignment monitor | `requisition` |
| T-05 | JIT supplier-schedule publish: takt-aligned call-off | Scheduling engine (C4) | `po_draft` |
| T-06 | Drop-ship order confirmed: SO line flagged `supply_method = drop_ship` | Order management (C2) | `po_draft` |
| T-07 | Sub-processor service request: WO step assigned to external service supplier | MES (C6) | `requisition` |
| T-08 | Maintenance spare part request: MWO part pick triggers reorder | CMMS (C9) | `requisition` |
| T-09 | Capital equipment requisition: asset addition approved by BD-22 committee | Asset management (C9) | `requisition` |
| T-10 | Calibration service purchase: calibration master due date + lead-time signal | Calibration (C9) | `requisition` |
| T-11 | Emergency procurement: production stoppage risk, `priority = URGENT` | Manual + approval chain | `po_draft` |
| T-12 | DSCSA saleable-returns verification purchase (J1): returns verification service license | Pharma compliance (J1) | `requisition` |
| T-13 | Clinical supply purchase (J1): IND/CTA-referenced investigational API | Pharma compliance (J1) | `requisition` |
| T-14 | NADCAP special-process service purchase (J3): heat treat, NDI, chemical processing | Aero compliance (J3) | `requisition` |
| T-15 | PPAP submission material purchase (J2): first-article sample material | Auto compliance (J2) | `requisition` |
| T-16 | Counterfeit-risk mitigation buy (J3): independent distributor parts exceeding AS5553 risk threshold | Aero compliance (J3) | `requisition` |
| T-17 | Biocompatibility test article purchase (J4): ISO 10993 test specimens | MD compliance (J4) | `requisition` |
| T-18 | FSVP foreign food supplier first purchase (J5): FSVP hazard analysis completed | Food compliance (J5) | `requisition` |
| T-19 | ITAR controlled article purchase (J3): TAA/MLA authorized | Trade compliance (C3) | `requisition` |
| T-20 | EAR-controlled technology purchase: export license or EAR99 classification confirmed | Trade compliance (C3) | `requisition` |
| T-21 | RTV (Return to Vendor) replacement PO: rejected lot triggers replacement order | QMS disposition (C7) | `po_draft` |
| T-22 | Inter-company transfer order: procurement from sister facility on ASL | Inter-company engine | `po_draft` |
| T-23 | Indirect procurement: MRO supplies, packaging, lab consumables via catalog punch-out | Procurement portal | `requisition` |
| T-24 | Spot purchase: unplanned single-buy with spend authority ≤ threshold (no formal bid) | Manual | `po_draft` |
| T-25 | Supplier-managed inventory (SMI) replenishment: supplier-push based on shared forecast | VMI agreement engine | `po_draft` |

---

## §4 State Machine — SM-2 Procurement

### States

| State | Meaning |
|-------|---------|
| `requisition` | Need identified; PR created, pending approval |
| `rfq_issued` | Request for quotation sent to qualified suppliers |
| `po_draft` | PO document drafted, pending internal approval |
| `po_issued` | PO transmitted to supplier, legally binding |
| `acknowledged` | Supplier confirmed receipt and delivery commitment |
| `in_transit` | Goods or service in progress; ASN or service confirmation received |
| `received` | Physical receipt confirmed at dock; GRN created |
| `inspected` | IQC completed; disposition recorded (C5/D4/D5) |
| `invoiced` | Supplier invoice received; 3-way match in progress |
| `paid` | Payment authorised and transmitted |
| `closed` | PO line fully settled; spend booked to GL |
| `cancelled` | PO voided before receipt |

### Transition Table

| From | Event | Guard | To | Actor | Notes |
|------|-------|-------|-----|-------|-------|
| `requisition` | PR approved | `budget_ok ∧ asl_ok` | `rfq_issued` OR `po_draft` | Buyer | Skip RFQ if single-source or blanket |
| `requisition` | PR rejected | — | `cancelled` | Approver | Rejection reason mandatory |
| `rfq_issued` | Quotes received + evaluated | `≥1 compliant quote` | `po_draft` | Buyer | Evaluation stored as `supplier_bid` records |
| `po_draft` | PO approved (spend ≤ BD-17 threshold) | `approver_sign = true` | `po_issued` | Procurement Manager | BD-17 ban if spend > threshold without committee |
| `po_draft` | PO approved (spend > BD-17 threshold) | `bd_17_committee_esig = true` | `po_issued` | Procurement Committee | BD-17 Banned Decision |
| `po_issued` | Supplier acknowledgement received | `ack.delivery_date_confirmed = true` | `acknowledged` | System / EDI | Auto-transition on EDI 855 |
| `po_issued` | Supplier rejection | — | `po_draft` | Buyer | Buyer must revise or re-source |
| `acknowledged` | ASN received | `asn.qty_matches_po_line` | `in_transit` | System / EDI | EDI 856 or portal entry |
| `acknowledged` | Service start confirmed | `service_start_confirmed = true` | `in_transit` | Service Coordinator | |
| `in_transit` | GRN created at dock | `grn.qty > 0` | `received` | Receiving Clerk | D4 IQC cascade triggered |
| `received` | IQC pass | `disposition = ACCEPT` | `inspected` | QC Inspector | Lot released to stock |
| `received` | IQC fail | `disposition = REJECT` | `inspected` | QC Inspector | RTV or MRB initiated (C7) |
| `received` | IQC conditional | `disposition = USE_AS_IS or REWORK` | `inspected` | QC Manager | Requires BD-7 e-sig |
| `inspected` | Invoice received | `invoice.matches_grn ∧ invoice.matches_po` | `invoiced` | AP System | 3-way match: PO × GRN × Invoice |
| `inspected` | Invoice mismatch | — | `invoiced` | AP Clerk | Dispute workflow opened |
| `invoiced` | Payment authorised | `payment_terms_met ∧ dispute_cleared` | `paid` | Finance Manager | |
| `invoiced` | Invoice disputed | `dispute.reason_code set` | `invoiced` | AP Clerk | Stays in invoiced until resolved |
| `paid` | Final settlement confirmed | `bank_confirmation = true` | `closed` | System | GL posting finalized (C11) |
| `po_issued` | Cancellation approved | `no_goods_shipped` | `cancelled` | Buyer + Approver | Cancellation fee calc if contract |
| `acknowledged` | Cancellation after ASN | `supplier_consent = true` | `cancelled` | Buyer | Partial shipment handled separately |

---

## §5 Step Substance

### Step 1 — Demand Origination and Requisition

Every P2P cycle begins with a validated demand signal. The Planning engine
(C4) generates purchase recommendations via MRP net-change or MPS-driven
replenishment. These appear in the buyer's work queue as `purchase_suggestion`
records with fields: `item_id`, `required_qty`, `required_date`,
`suggested_supplier_id`, `planned_order_reference`.

For Kanban-triggered replenishment, the WMS generates a `kanban_replenishment_signal`
event when a bin scan detects an empty card. The PR is auto-created from the
Kanban master card data (supplier, qty, UOM, lead time).

PR approval routing is configurable by spend tier:
- Tier 1 (≤ threshold_1): auto-approved if item on ASL and budget line open
- Tier 2 (threshold_1 < spend ≤ threshold_2): first-line supervisor
- Tier 3 (spend > threshold_2): department head + finance controller
- Capital asset: committee approval required (BD-22 e-sig mandatory)

### Step 2 — Supplier Selection and Qualification Gate

Before a PO line can be drafted, the system executes the Supplier Qualification
Gate, which performs the following checks in sequence:

1. **ASL Membership**: `approved_supplier_list` record exists for
   `(supplier_id, item_id, facility_id)` and status = `ACTIVE`
2. **Supplier Score Floor**: `supplier_scorecard.composite_score ≥ min_score_threshold`
   (configurable per commodity code)
3. **Certificate Validity**: All required certificates (ISO 9001, IATF 16949,
   AS9100D, BRC, SQF, etc.) on `supplier_certificate` table are not expired
4. **Trade Compliance**: No active embargo, OFAC sanctions hit, denied-party
   screening flag on supplier entity
5. **Pack-specific gate**: J1 DEA/FDA check; J3 NADCAP cert + GIDEP check;
   J4 biocompatibility risk screen; J5 FSVP record existence

If any gate fails, the PR is placed in `HOLD` state with a `disqualification_reason`
code and routed to the Procurement Manager for exception handling.

For new supplier introductions, the full supplier qualification process
(supplier audit, first-article approval, quality agreement signature) must
complete before the ASL record becomes `ACTIVE`. This is governed by C3
(Supplier Quality).

### Step 3 — PO Issuance

The buyer creates a PO from the approved PR. The PO document carries:
- Header: `po_number`, `buyer_id`, `supplier_id`, `facility_id`,
  `currency`, `incoterm`, `payment_terms`, `po_date`, `required_delivery_date`
- Line items: `po_line_id`, `item_id`, `qty`, `uom`, `unit_price`,
  `line_total`, `requested_delivery_date`, `ship_to_location`,
  `inspection_plan_ref`, `compliance_class`
- Regulatory attachments: DSCSA trading-partner attestation (J1),
  ITAR TAA reference (J3), FSVP hazard-analysis doc reference (J5)

PO transmission channels: EDI X12 850 (preferred), cXML PunchOut,
supplier portal PDF, email (fallback with audit trail).

Spend threshold BD-17: PO with line total or blanket value exceeding the
configured high-value threshold requires Procurement Committee e-signature
(multi-member quorum) before transmission. The system blocks transmission
and records `bd_17_pending` on the PO header.

### Step 4 — Supplier Acknowledgement

The supplier returns a Purchase Order Acknowledgement (POA / EDI 855)
confirming line-by-line delivery date commitments. If the supplier proposes
a delivery date later than `po_line.requested_delivery_date`, the system
calculates the schedule impact on the linked MPS/MRP plan and flags the
planner. Buyers may accept the revised date (updating `po_line.confirmed_delivery_date`)
or escalate to the sourcing manager.

### Step 5 — In-Transit Visibility and ASN

Upon shipment, the supplier submits an Advance Shipment Notice (ASN / EDI 856)
or manual portal entry. The ASN provides:
- Carton-level packing list with item/lot/qty/SSCC label data
- Carrier name, PRO number, expected delivery date
- Temperature logger device ID (cold-chain shipments)
- DSCSA EPCIS transaction statement (J1) — product identifier, lot number,
  expiration date, NDC, quantity, serial numbers
- Dangerous goods declaration (if applicable)

The system creates an `in_transit_record` and triggers `receiving_preparation`
tasks in the WMS: dock door assignment, unloading crew scheduling, IQC hold
label printing.

Cold-chain monitoring: the temperature logger data feed is polled every
15 minutes. If any `temperature_reading` falls outside `item_master.storage_temp_min`
or `storage_temp_max`, an alert fires and the receiving supervisor is notified.
The receiving event captures the excursion flag and routes the lot to IQC
with `cold_chain_excursion = true`.

### Step 6 — Dock Receipt and GRN

At dock arrival, the receiving clerk:
1. Scans incoming SSCC or lot labels against the open ASN
2. Verifies outer packaging integrity and seal check
3. Records `goods_receipt_note` (GRN) with actual quantities
4. Prints quarantine labels and places material in IQC hold location
5. Transmits GRN confirmation back to supplier (EDI 861 or portal)

Quantity discrepancies between ASN and actual count trigger an
`over_shipment_alert` (qty > PO line) or `under_shipment_alert` (qty < PO line).
The buyer receives notification and must resolve whether to accept partial,
wait for remainder, or issue a shortage credit memo.

### Step 7 — IQC Cascade

Dock receipt triggers D4 (Receive to Inspect). The IQC plan is determined by
the `inspection_plan_ref` on the PO line, which resolves from:
- `item_master.default_inspection_plan_id`
- Supplier-specific override in `supplier_item_inspection_plan`
- Skip-lot eligibility: if supplier has ≥ 12 consecutive PASS results and
  composite score ≥ skip_lot_threshold, the sampling frequency drops to
  `reduced` or `skip` per AQL plan

Disposition outcomes:
- `ACCEPT`: Lot released to stock; inventory transaction posted (C5)
- `REJECT`: RTV process initiated; replacement PO auto-generated (T-21)
- `USE_AS_IS`: Requires BD-7 e-sig (Quality Director); lot released with
  deviation reference
- `REWORK`: Internal rework WO created; rework cost allocated to COPQ
- `CONDITIONAL_RELEASE`: Pharma-specific (J1); QP/RP signature required

### Step 8 — Invoice Receipt and Three-Way Match

Supplier invoice (EDI 810 or OCR-scanned PDF) is received by AP. The
three-way match engine compares:

```
Invoice.po_number     = PO.po_number           → header match
Invoice.line_item     = PO.line_item + GRN      → line match
Invoice.qty_billed    = GRN.qty_received (net of RTV deductions)
Invoice.unit_price    = PO.unit_price ± price_tolerance_pct
Invoice.tax           = computed_tax_rule(supplier, item, ship_to)
```

Match outcomes:
- Full match: invoice auto-approved for payment scheduling
- Price variance within tolerance: auto-approved with variance GL posting to
  `purchase_price_variance` account
- Price variance outside tolerance: buyer review and supplier dispute
- Quantity mismatch: GRN reconciliation required; partial payment may proceed
- Duplicate invoice: system suppresses and alerts AP

### Step 9 — Payment Execution

Payment is scheduled according to `po.payment_terms` (Net 30, 2/10 Net 30,
etc.). The Finance module (C11) calculates:
- Early payment discount capture if `payment_date ≤ discount_date`
- DPO (Days Payable Outstanding) impact on cash flow forecast
- Currency conversion rate applied at invoice date vs. payment date;
  exchange difference posted to `fx_gain_loss` GL account
- Withholding tax deduction if supplier is subject to WHT per local tax rules

Payment runs are batched and transmitted via bank payment file (ISO 20022
pain.001, ACH NACHA, SWIFT MT103 as applicable). The system records the
`bank_confirmation_number` and transitions the PO to `paid`.

### Step 10 — Closure and Scorecard Update

Upon full settlement:
1. PO line transitions to `closed`
2. GL posting finalized: accrual reversed, actual cost posted to perpetual
   inventory (or expense for MRO)
3. Supplier scorecard event recorded: delivery performance (OTD), quality
   performance (IQC pass rate, PPM), invoice accuracy
4. Blanket PO: remaining balance and call-off count updated
5. Spend analytics data updated (commodity spend, supplier concentration)
6. Commitment reversed in budget module

---

## §6 Branch Catalog

| Branch ID | Trigger/Condition | Divergence Point | Special Logic |
|-----------|------------------|-----------------|---------------|
| BR-D2-01 | Blanket PO call-off | T-03: scheduled release | PO draft skipped; release against blanket header |
| BR-D2-02 | Consignment replenishment | T-04: level breach | PO issued to consignment supplier; payment deferred until consumption |
| BR-D2-03 | Drop-ship | T-06: SO drop-ship flag | PO linked to SO; goods never enter receiving dock |
| BR-D2-04 | Sub-processor service | T-07: WO external step | Service PO with WO reference; GRN = service completion certificate |
| BR-D2-05 | JIT call-off | T-05: schedule trigger | Same-day PO-to-delivery cycle; ASN required before GRN |
| BR-D2-06 | DSCSA-compliant pharma purchase (J1) | T-12/T-13: drug/API | EPCIS TI/TH/TS attestation required at PO level; VRS verification at GRN |
| BR-D2-07 | FSVP foreign food supplier (J5) | T-18: FSVP required | Importer-of-record record linked to PO; hazard analysis doc attached |
| BR-D2-08 | ITAR controlled article (J3) | T-19: ITAR flag | TAA/MLA number on PO; foreign national restriction check; DDTC recordkeeping |
| BR-D2-09 | Counterfeit-risk parts (J3) | T-16: AS5553 flag | Independent distributor certificate of conformance; GIDEP alert check; CoC on GRN |
| BR-D2-10 | Biocompatibility test article (J4) | T-17: ISO 10993 | Test article traceability lot; biocomp risk class on item master |
| BR-D2-11 | NADCAP special-process service (J3) | T-14: NADCAP service | Supplier's current NADCAP commodity accreditation verified before PO |
| BR-D2-12 | Capital equipment acquisition | T-09: asset add | BD-22 committee e-sig required; delivery inspection triggers IQ protocol (C9) |
| BR-D2-13 | RTV replacement order | T-21: reject disposition | Replacement PO auto-linked to rejection event; expedite flag set |
| BR-D2-14 | Cold-chain shipment | T-01–T-25 with cold-chain item | Temperature logger data required; excursion = conditional IQC |
| BR-D2-15 | Inter-company transfer | T-22: sister facility | Internal pricing rules; no outbound payment; inventory transfer posting |
| BR-D2-16 | Emergency procurement | T-11: production stoppage | Spend approval retroactive (BD-21 waiver with post-facto e-sig); expedite surcharge |
| BR-D2-17 | SMI / VMI replenishment | T-25: supplier push | Supplier reads shared forecast; PO auto-generated on system recommendation |
| BR-D2-18 | PPAP material purchase (J2) | T-15: PPAP sample | Lot linked to PPAP submission package; retained sample lot created |

---

## §7 Edge Cases

| EC # | Scenario | Handling |
|------|---------|---------|
| EC-01 | Supplier ships against wrong PO revision | Receiving system compares ASN PO reference to latest revision; if mismatch, receiving hold and buyer notification |
| EC-02 | Invoice arrives before GRN (supplier ships directly to site without dock scan) | AP accrual created; GRN required to release payment |
| EC-03 | Duplicate ASN submitted | ASN de-duplication by `asn_number`; duplicate silently discarded; audit log entry |
| EC-04 | Partial shipment — multiple GRNs per PO line | Each GRN creates separate `grn_line`; cumulative qty tracked against PO line; final GRN triggers invoice matching |
| EC-05 | Supplier out-of-stock: requests PO line split with two delivery dates | Buyer accepts split via PO amendment; MRP plan regenerated |
| EC-06 | Price change between PO issue and invoice: supplier claims raw material surcharge | Price dispute workflow; if surcharge accepted, PO amendment with BD-17 check on cumulative value |
| EC-07 | Goods damaged in transit: carrier claim required | GRN created with `damage_flag = true`; lot quarantined; carrier claim initiated; insurance notification |
| EC-08 | Cold-chain excursion during transit | Lot received into IQC-HOLD with `cold_chain_excursion = true`; QC disposition required even for skip-lot approved supplier |
| EC-09 | Supplier insolvency mid-PO | PO cancelled; alternative sourcing triggered (T-01 MRP re-plan); AP writes off partial deposit if any |
| EC-10 | Currency fluctuation exceeds FX hedge threshold | Finance notified; FX hedge instrument referenced on PO; realized gain/loss posted to dedicated GL account |
| EC-11 | DSCSA serialization mismatch (J1) | Product withheld from stock; EPCIS verification failure logged; supplier notified within 24 h per §582 requirement |
| EC-12 | ITAR shipment to unauthorized consignee (J3) | PO blocked at issuance; DDTC violation prevention alert; case escalated to legal/export compliance |
| EC-13 | Supplier scorecard drops below disqualification threshold during active PO | Active PO proceeds; future PRs blocked; qualification remediation plan initiated (C3) |
| EC-14 | Budget line exhausted mid-year | New PRs blocked; budget transfer approval required (BD-21); emergency procurement under separate BD-21 waiver |

---

## §8 Saga — P2P Compensation Ledger

The P2P saga uses an event-driven compensation pattern. Each step records a
`saga_step` row in the `procurement_saga_ledger` JSONB column of
`purchase_order`. Forward events and compensating actions:

| Step | Forward Event | Compensating Action |
|------|--------------|---------------------|
| 1 | `PR_APPROVED` | `PR_CANCELLED` — reverse budget reservation |
| 2 | `SUPPLIER_SELECTED` | `SUPPLIER_DESELECTED` — unlock alternative suppliers |
| 3 | `PO_ISSUED` | `PO_CANCELLED` — EDI 850 cancellation to supplier; cancellation fee calc |
| 4 | `PO_ACKNOWLEDGED` | `PO_RECALL_REQUEST` — buyer calls supplier to stop shipment |
| 5 | `GRN_CREATED` | `GRN_REVERSED` — stock decrement reversed; lot quarantined |
| 6 | `IQC_DISPOSITION_SET` | `IQC_DISPOSITION_REVISED` — BD-7 e-sig required to revise post-disposition |
| 7 | `INVOICE_MATCHED` | `INVOICE_DISPUTED` — payment hold; dispute case opened |
| 8 | `PAYMENT_AUTHORISED` | `PAYMENT_RECALLED` — if bank transmission not yet completed |

Saga instance ID: `procurement_saga_id` UUID on `purchase_order` header.
All step transitions published to the `procurement.saga.events` RabbitMQ topic.

---

## §9 Per-Pack Overlays

### J1 Pharma
- DSCSA §582: every purchase of prescription drug product or investigational
  drug requires trading partner verification before stock release. System
  stores `dscsa_transaction_information`, `dscsa_transaction_history`,
  `dscsa_transaction_statement` per shipment.
- VRS (Verification Router Service) call at GRN for serialized product:
  `POST /dscsa/vrs/verify` with product identifier + lot + expiry + serial.
  Non-verified products cannot transition out of IQC-HOLD.
- GDP qualification check: supplier's storage and transport conditions
  verified against GDP guidelines (EU GMP Annex 15, PIC/S).
- CMO (Contract Manufacturing Org) purchases: additional GMP agreement
  reference on PO; batch record package required as GRN attachment.

### J2 Automotive
- PPAP material purchases: PO flagged `ppap_material = true`; lot created
  with `ppap_reference`; retained sample quantity reserved per control plan.
- IATF 16949 §8.4: supplier performance monitoring is mandatory; scorecard
  threshold triggers supplier development program automatically.
- IMDS material data sheet required for new parts per EU ELV Directive
  (REACH, RoHS). IMDS node ID stored on `supplier_item` record.

### J3 Aerospace
- AS5553 counterfeit mitigation: for electronic parts from independent
  distributors, `counterfeit_risk_assessment` record must exist and
  `risk_level ≠ UNACCEPTABLE` before PO issuance.
- GIDEP alert check: `GET /gidep/alerts?cage_code={supplier_cage}&nsn={part_nsn}`
  before PO draft; any open GIDEP alert triggers buyer review.
- ITAR: PO for USML-listed article requires `taa_mla_number` on header;
  `foreign_national_access_granted = false` unless TAA/MLA explicitly covers
  foreign transfer.
- NADCAP: supplier's `nadcap_accreditation` record for required commodity
  must have `expiry_date > po.required_delivery_date`.

### J4 Medical Device
- Biocompatibility: direct-contact materials require `biocompatibility_risk_class`
  on item master (per ISO 10993-1) before purchase. Class III or higher
  triggers additional test article traceability.
- UDI-DI traceability: GRN lot records include `udi_di` and `udi_pi` for
  device components where applicable.
- Design freeze control: purchased components subject to design freeze cannot
  change specification without a formal ECO (C3 Engineering Change).

### J5 Food Safety
- FSVP (21 CFR §1.500): for foreign suppliers of food ingredients, the
  importer-of-record must have a current `fsvp_foreign_supplier_record`
  on file. Hazard analysis document ID linked to PO.
- FSMA §204 KDE: at GRN, system records Critical Tracking Events (CTE):
  `first_land_received` event with Key Data Elements (KDE): TLC (Traceability
  Lot Code), quantity, unit of measure, location description, date received.
- Allergen declaration: supplier allergen declaration form required for
  each food ingredient purchase; stored as `allergen_declaration` attachment.
- Organic/non-GMO certification: if `item_master.organic_certified = true`,
  current organic certification document required on `supplier_certificate`.

---

## §10 Banned Decision Boundaries

| BD | Description | Trigger | API Enforcement |
|----|------------|---------|----------------|
| BD-7 | Use-as-is disposition on non-conforming material | `IQC disposition = USE_AS_IS` | `POST /api/v1/inspection/disposition` → 403 if `bd_7_esig` absent |
| BD-17 | High-value PO approval | `po_total > bd_17_threshold` | `POST /api/v1/procurement/po/{id}/approve` → 403 if committee quorum not met |
| BD-21 | Emergency procurement spend override | `priority = URGENT ∧ budget_exhausted` | `POST /api/v1/procurement/pr/{id}/emergency-approve` → 403 without BD-21 e-sig |
| BD-22 | Capital asset acquisition approval | `po.asset_type ≠ null` | `POST /api/v1/assets/capex-approve` → 403 without committee e-sig |

All BD API responses use RFC 9457 Problem Detail:
```json
{
  "type": "https://hesem.io/problems/banned-decision",
  "title": "Banned Decision Requires E-Signature",
  "status": 403,
  "detail": "BD-17: PO value exceeds high-value threshold. Procurement committee quorum e-signature required.",
  "instance": "/api/v1/procurement/po/PO-2026-004821/approve",
  "bd_code": "BD-17",
  "required_signatories": ["procurement_director", "finance_controller", "coo"]
}
```

---

## §11 AI Advisory Integration

| AI Advisor | Invocation Point | Output |
|-----------|----------------|--------|
| AI-17 Supplier Risk | Supplier selection (Step 2); scorecard review | Risk score delta, disruption probability, alternative supplier suggestions |
| AI-18 Price Intelligence | PO draft (Step 3) | Market price benchmark vs. quoted price; deviation alert if > ±15% |
| AI-22 Spend Analytics | PO closure (Step 10) | Spend concentration alerts, maverick spend detection, savings opportunity identification |

AI recommendations are non-binding; all advisory outputs are stored as
`ai_recommendation` records with `confidence_score` and `accepted_by` (null
if ignored). No AI recommendation can bypass a BD gate or ASL qualification check.

---

## §12 Cross-Workflow Couplings

| Coupled Workflow | Coupling Type | Direction |
|-----------------|--------------|-----------|
| D3 Plan to Produce | MRP net-requirement triggers D2 T-01 | D3 → D2 (demand) |
| D4 Receive to Inspect | GRN creation triggers IQC cascade | D2 → D4 (receipt) |
| D5 Inspect to Disposition | Disposition outcome feeds back to D2 Step 7 | D4/D5 → D2 |
| D9 Maintain to Restore | MWO spare-part shortfall triggers D2 T-08 | D9 → D2 (emergency) |
| D10 Batch to Release | Pharma raw material release status required before batch start | D2 ↔ D10 |
| C3 Supplier Quality | New supplier qualification; supplier corrective action | C3 ↔ D2 |
| C5 Inventory | GRN stock posting; consignment tracking | D2 → C5 |
| C11 Finance | PO accrual; 3-way match; GL posting; payment execution | D2 → C11 |

---

## §13 KPIs and Metrics

| KPI | Definition | Target |
|-----|-----------|--------|
| KPI-D2-01 | Purchase Order Cycle Time | PR approval date → PO issue date | ≤ 2 business days (standard) |
| KPI-D2-02 | Supplier On-Time Delivery Rate | `GRN.actual_delivery ≤ PO.confirmed_delivery_date` / total PO lines × 100 | ≥ 95% |
| KPI-D2-03 | IQC First-Pass Acceptance Rate | Lots accepted on first inspection / total lots received × 100 | ≥ 98% |
| KPI-D2-04 | Incoming PPM | Defective units from supplier / total units received × 10⁶ | ≤ 500 ppm |
| KPI-D2-05 | Three-Way Match Rate | Invoices auto-matched / total invoices × 100 | ≥ 90% |
| KPI-D2-06 | Days Payable Outstanding (DPO) | Avg days from invoice receipt to payment | Target per financial policy |
| KPI-D2-07 | Supplier Count Concentration (Pareto) | % of spend from top-5 suppliers | Alert if > 60% from single supplier |
| KPI-D2-08 | Emergency Procurement Rate | Emergency POs / total POs × 100 | ≤ 3% |
| KPI-D2-09 | Maverick Spend Rate | POs without approved PR / total PO value × 100 | ≤ 1% |
| KPI-D2-10 | Blanket PO Utilization Rate | Blanket release qty / blanket authorized qty × 100 | ≥ 80% per contract |
| KPI-D2-11 | DSCSA Verification Pass Rate (J1) | Serialized units VRS-verified / total serialized units received × 100 | 100% |
| KPI-D2-12 | Invoice Dispute Resolution Time | Invoice dispute open date → resolved date | ≤ 5 business days |
| KPI-D2-13 | Purchase Price Variance (PPV) | Actual cost − standard cost, summed by commodity | Alert if > ±5% category |
| KPI-D2-14 | Supplier Corrective Action Response Rate | Supplier CARs responded within SLA / total CARs issued × 100 | ≥ 95% |

---

## §14 Failure Modes

| FM # | Failure Mode | Cause | Detection | Mitigation |
|------|-------------|-------|----------|----------|
| FM-01 | Stockout due to PO delivery miss | Supplier capacity failure; carrier delay | OTD KPI alert; MRP exception message | Safety stock buffer; alternate supplier pre-qualification |
| FM-02 | Duplicate payment to supplier | Invoice duplicate not caught | AP invoice duplicate screen | Idempotency key on invoice ingestion; bank debit limit |
| FM-03 | Unapproved supplier used (ASL bypass) | Manual PO creation without PR | ASL gate enforcement; audit report | Hard block at PO draft — system returns 422 if supplier not on ASL |
| FM-04 | Price manipulation on amended PO | Buyer changes unit price after supplier acknowledgement | PO amendment audit log; approver notification | Approval required for any PO line price change > tolerance |
| FM-05 | Cold-chain excursion undetected | Logger device failure; data gap | Logger health check; alert if no reading > 2 h | Redundant logger; backup temperature strip |
| FM-06 | DSCSA serialization failure (J1) | Supplier system error; manual packing error | VRS verification rejection at GRN | Supplier EDI monitoring; VRS retry protocol; FDA §582 breach escalation |
| FM-07 | ITAR violation — unauthorized export (J3) | Missing TAA; foreign national access error | ITAR flag check at PO issuance | Pre-PO ITAR gate; DDTC audit trail |
| FM-08 | Budget overrun — maverick procurement | Department bypasses PR system | Spend report; AP exception | Mandatory PR for all spend above minimal threshold |
| FM-09 | Counterfeit part received (J3) | Non-authorized distributor | GIDEP alert; IQC CoC check; AS5553 test | Counterfeit-risk assessment pre-PO; independent lab testing |
| FM-10 | Invoice fraud — BEC (Business Email Compromise) | Supplier payment detail change request via email | Bank account change alert | Bank account change requires phone verification + dual approval |
| FM-11 | Allergen cross-contamination from supplier (J5) | Undisclosed allergen in ingredient | Allergen declaration; IQC allergen test | Mandatory allergen declaration; lab verification for new lots |
| FM-12 | Consignment level reporting error | Supplier over-claims consumption | Cycle count reconciliation; audit trail | Regular consignment count audit; scan-based confirmation |
| FM-13 | FSVP hazard analysis expired (J5) | Annual renewal missed | Certificate expiry alert | Automated expiry tracking; ASL block on expired FSVP record |

---

*Decision phrase: S2-08_D2_D3_DEEP_UPGRADE_COMPLETE (partial — D2 complete)*
