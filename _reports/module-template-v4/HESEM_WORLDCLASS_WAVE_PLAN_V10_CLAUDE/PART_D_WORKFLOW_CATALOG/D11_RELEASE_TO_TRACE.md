# D11 — Release to Trace

```
workflow_id:    D11
workflow_name:  Release to Trace
domain_primary: Traceability & Serialization
domains_cross:  Commercial & Customer, Inventory & Logistics,
                Quality Improvement, Finance, MES Execution
trigger_count:  19
branch_count:   18
edge_case_count:12
kpi_count:      13
failure_mode_count: 13
per_pack:       J1 J2 J3 J4 J5
bd_boundaries:  BD-8 (via D12 linkage)
ai_advisory:    AI-26 AI-28
version:        V10-deep
```

---

## §1 Purpose and Scope

The Release to Trace (R2T) workflow covers every event from the moment a lot
or serialized unit is authorized for release (D10) through physical shipment,
in-transit visibility, proof of delivery, and the creation of a complete,
queryable traceability record that supports recall scope identification,
field action response, and regulatory audit.

D11 is the outbound mirror of D4 (Receive to Inspect). While D4 governs
incoming material control, D11 governs outgoing material chain-of-custody.
The traceability records created here feed D12 (Complaint to Recall) for
scope identification using the OTG (Operational Truth Graph) genealogy
substrate.

Key regulatory obligations fulfilled:
- DSCSA §582: TI/TH/TS and EPCIS shipping event transmission to trading partner
- EU FMD (EU 2016/161): decommissioning of serialized pack on dispense or export
- UDI: shipment records link UDI-DI + UDI-PI to customer and shipment date
- FSMA §204: `first_land_received` and `shipping` CTE/KDE
- ITAR §123: export shipment records for USML articles
- AS9100D §8.5.2: preservation of product during delivery

---

## §2 Entry Conditions

| # | Pre-condition | Enforcement |
|---|-------------|------------|
| PC-1 | `lot.status = RELEASED` (D10 BREL complete) | Lot status check at allocation |
| PC-2 | Open SO line or internal transfer order referencing this item/lot | Demand source check |
| PC-3 | Customer account active, credit limit not exceeded | Credit check (D1) |
| PC-4 | For ITAR: export license or EAR99 classification confirmed; consignee authorized | Trade compliance gate |
| PC-5 | For DSCSA (J1): EPCIS commissioning event exists for all serialized units | DSCSA EPCIS check |
| PC-6 | For UDI (J4): UDI-DI registered in GUDID/EUDAMED | UDI registration check |
| PC-7 | Concession lot: customer concession document active and not expired | Concession validity check |

---

## §3 Trigger Catalog

| ID | Trigger | Source |
|----|---------|--------|
| T-01 | SO line confirmed and ATP allocated; shipment scheduled | D1 Order Management |
| T-02 | Blanket SO release: scheduled shipment date reached | D1 blanket order |
| T-03 | Customer-specific KANBAN: supplier ship-signal received | Customer EDI schedule |
| T-04 | Service replacement shipment: field defect drives replacement | D12 complaint response |
| T-05 | Sample shipment: commercial sample or trial shipment | Sales / R&D |
| T-06 | Recall replacement shipment: D12 recall replacement lot available | D12 recall management |
| T-07 | Clinical supply shipment: IMP to clinical site (J1 Annex 13) | J1 clinical supply |
| T-08 | Clinical trial device shipment (J4 ISO 14155) | J4 clinical trial |
| T-09 | ITAR-controlled article export shipment (J3) | J3 export compliance |
| T-10 | Inter-company transfer: ship to sister facility | Inter-company order |
| T-11 | Consignment stock replenishment: ship to customer-held consignment location | D2 consignment |
| T-12 | Export shipment: international sale with customs clearance | Trade compliance |
| T-13 | Drop-ship: manufacturer ships directly to SO end customer | D2 BR-D2-03 |
| T-14 | Emergency expedited shipment: production stoppage at customer | Priority shipment |
| T-15 | PPAP physical sample submission: first article samples to customer (J2) | J2 PPAP |
| T-16 | Stability sample dispatch to external lab (J1) | J1 stability program |
| T-17 | Lot split shipment: partial lot released; partial held | D10 partial release |
| T-18 | RMA replacement shipment: authorized return swap | D1 return process |
| T-19 | Warranty replacement: defect confirmed; warranty fulfillment | D12 complaint |

---

## §4 State Machine — Shipment Lifecycle

### States

| State | Meaning |
|-------|---------|
| `open` | Shipment order created; lots not yet allocated or pick-initiated |
| `pick_initiated` | Pick tasks generated; pickers assigned; lots reserved |
| `picked` | All SO lines physically picked; staged at outbound dock |
| `packed` | Goods packed in outer cartons/pallets; labels applied; seal affixed |
| `documents_prepared` | All mandatory shipping documents generated and validated |
| `dispatched` | Goods issued to carrier; GI (Goods Issue) transaction posted; ASN sent |
| `in_transit` | Carrier has physical possession; tracking number active |
| `delivered` | Proof of delivery (POD) confirmed; customer receipt acknowledged |
| `closed` | All regulatory submissions complete; traceability records finalized |
| `returned` | Customer rejected shipment; return in progress; D4 re-entry pending |
| `cancelled` | Shipment cancelled before dispatch; inventory reservation reversed |

### Transition Table

| From | Event | Guard | To | Actor |
|------|-------|-------|-----|-------|
| `open` | Pick tasks created | `lot.status = RELEASED ∧ so_line.allocated = true` | `pick_initiated` | WMS |
| `pick_initiated` | All lines confirmed picked | `all_pick_tasks.confirmed = true` | `picked` | Picker + WMS scan |
| `picked` | Pack and label complete | `label_applied ∧ seal_check = PASS ∧ serial_scan_complete` | `packed` | Packer |
| `packed` | All mandatory documents generated | `document_checklist.complete = true` | `documents_prepared` | System |
| `documents_prepared` | Carrier dispatch confirmed | `goods_issue_posted ∧ asn_sent = true` | `dispatched` | Shipping Coordinator |
| `dispatched` | Carrier tracking active | `tracking_number ≠ null` | `in_transit` | System / Carrier EDI |
| `in_transit` | POD received | `pod.confirmed_at ≠ null` | `delivered` | Carrier / Customer EDI |
| `delivered` | Post-delivery regulatory submissions complete | `reg_submissions.complete = true OR not_required` | `closed` | System |
| `dispatched` | Customer rejects at dock | `customer_rejection_confirmed = true` | `returned` | Customer notification |
| `in_transit` | Customer refuses delivery | `carrier_return_initiated = true` | `returned` | Customer / Carrier |
| `open` | Cancellation before pick | `no_pick_started` | `cancelled` | Sales / Planner |
| `pick_initiated` | Cancellation with reversal | `picks_reversed = true` | `cancelled` | Shipping Supervisor |

---

## §5 Step Substance

### Step 1 — Allocation and Pick Authorization

The warehouse management system (WMS) executes lot allocation against the
SO line using FEFO (earliest expiry first) / FIFO (same-expiry: earliest
receipt first) rules:

```sql
SELECT lot_id, available_qty, expiry_date, receipt_date
FROM inventory_lot
WHERE item_id = :so_item_id
  AND location_id IN (pickable_locations)
  AND status = 'RELEASED'
  AND expiry_date >= CURRENT_DATE + minimum_remaining_shelf_life_days
ORDER BY expiry_date ASC, receipt_date ASC
```

Allocation creates `inventory_reservation` records (type = SO_FULFILLMENT).
Pick authorization generates a `pick_task` with: `picker_id`, `lot_id`,
`from_location`, `to_location` (staging area), `pick_qty`, `uom`.

For ITAR-controlled items: picker must have `itar_person_of_record.cleared = true`
OR be explicitly authorized on the export license.

### Step 2 — Pick and Pack Execution

Picker scans lot label (barcode or RFID) to confirm pick. The WMS validates:
- Picked lot = allocated lot (scan match)
- Quantity scanned = pick task quantity
- Lot expiry date still valid

For serialized units (J1 DSCSA, J4 UDI): each unit serial number scanned
individually during pack. `serial_number` records linked to `shipment_line_item`:
`serial_number.shipment_id = shipment_id`.

**Packing documentation** generated at this step:
- Packing list (item, qty, lot, expiry, serial numbers)
- DSCSA TI/TH/TS document (J1)
- CoA / CoC copy (attached to shipping document)
- MSDS/SDS (for HAZMAT)
- ITAR Export Control statement (J3)
- Organic certificate copy (J5)

### Step 3 — Mandatory Document Assembly

Before carrier dispatch, the system verifies all mandatory shipping documents:

| Document | Pack / Condition | Source |
|---------|----------------|--------|
| Commercial invoice | All export | Finance (C11) |
| Packing list | All | WMS auto-generate |
| CoA / CoC | All regulated | D10 release |
| DSCSA TI/TH/TS | J1: all Rx drugs | D10 EPCIS |
| ITAR export license copy | J3: USML articles | Trade compliance |
| FAA Form 8130-3 | J3: aviation parts | D9 RTS record |
| FSMA §204 KDE | J5: FSMA-covered foods | FSMA traceability |
| Temperature monitor | Cold-chain | WMS / logistics |
| Dangerous goods declaration | HAZMAT | Safety (C9) |
| Customs entry / AES | US export | Trade compliance |

Missing mandatory document: `shipment.status` cannot transition to
`dispatched` until gap resolved.

### Step 4 — Carrier Dispatch and ASN

Carrier scans final sealed packages; `goods_issue` transaction posted in WMS:
- `inventory_lot.quantity_available` decremented by shipped qty
- `inventory_transaction` record (type = SHIPMENT) created
- GL posting: cost of goods sold (COGS) debit; inventory credit (C11)

ASN (Advance Shipment Notice) transmitted to customer:
- EDI X12 856 (standard)
- cXML for PunchOut customers
- Customer portal upload

**DSCSA EPCIS shipping event** (J1) transmitted simultaneously:
- `shipping_event` with product identifier, lot, expiry, serial numbers
- Transaction Information: NDC, lot, expiry, quantity, dosage form
- Transaction History: complete chain from manufacturer to direct trading partner
- Transaction Statement: attestation of lawful transaction

### Step 5 — Cold-Chain and In-Transit Monitoring

For cold-chain shipments (pharmaceutical temperature-sensitive, food
refrigerated/frozen):
- Temperature monitoring device (data logger or IoT tracker) activated
  and associated with `shipment_id`
- Carrier vehicle qualification record verified (last clean, temperature
  pre-cooling check)
- `in_transit_record` monitors: `temperature_reading` events polled;
  excursion alert if temp outside limits for > `excursion_threshold_minutes`

Temperature excursion in transit:
- Customer notified immediately
- `cold_chain_excursion_in_transit` flag set on shipment
- Customer performs receiving inspection per cold-chain protocol
- If product impact confirmed: D12 complaint opened; potential D5 disposition
  on customer side

### Step 6 — Proof of Delivery and Traceability Finalization

Upon customer delivery confirmation (carrier POD scan, EDI 861, or customer
portal receipt confirmation):
1. `shipment.status → delivered`; `delivery_date` recorded
2. `lot_traceability_record` updated: `sold_to_customer_id`,
   `shipped_date`, `delivered_date`, `carrier`, `tracking_number`,
   `serial_numbers_shipped[]`
3. OTG genealogy edge extended: shipment traceability node appended to
   `mv_otg_genealogy_upstream` materialized view refresh triggered
4. For D12 recall scope identification: `shipment_by_lot` view queryable
   by lot, item, date range, customer

**EU FMD decommissioning** (J1, EU destination):
When pharmaceutical product arrives at pharmacy or hospital:
the dispenser calls `POST /fmd/decommission` with GTIN + serial + lot + expiry.
HESEM logs the `fmd_decommission_event`; product marked as
`fmd_status = DECOMMISSIONED`. Products distributed to FMD countries
must all reach decommissioned status; unverified products trigger alert.

### Step 7 — Regulatory Submission Integration

| Pack | Post-Shipment Action | Timing |
|------|---------------------|--------|
| J1 DSCSA | EPCIS repository sync; TS data to next trading partner | At dispatch |
| J1 EU FMD | Decommission event monitoring; unverified shipment alert | Within 30 days |
| J4 UDI | Shipment records link to UDI; EUDAMED / GUDID updated if distribution data shared | At dispatch |
| J5 FSMA §204 | `shipping` CTE: TLC, qty, unit of measure, location, date, recipient TLC | At dispatch |
| J3 ITAR | DDTC Part 123 record: export value, consignee, quantity, USML category | At dispatch; annual aggregate report |
| J2 | EDI 856 ASN to OEM customer portal; delivery confirmation | At dispatch |

---

## §5 Branch Catalog

| Branch ID | Condition | Special Logic |
|-----------|----------|--------------|
| BR-D11-01 | Standard domestic shipment | FEFO allocation; standard documents; EDI 856 |
| BR-D11-02 | Cold-chain pharmaceutical (J1) | Temperature logger; GDP-compliant carrier; DSCSA EPCIS at dispatch |
| BR-D11-03 | DSCSA serialized drug product (J1) | Unit-level serial scan; TI/TH/TS; VRS-verified SSCC |
| BR-D11-04 | EU FMD drug product (J1) | EU Medicines Verification System decommission monitoring |
| BR-D11-05 | Medical device UDI shipment (J4) | UDI-DI + UDI-PI on packing list; EUDAMED update |
| BR-D11-06 | Sterile device (J4) | Sterile barrier integrity check before pack; sterilization cycle reference |
| BR-D11-07 | ITAR controlled article export (J3) | Export license copy; DDTC filing; consignee verification; authorized picker |
| BR-D11-08 | FAA Form 8130-3 component (J3) | 8130-3 attached to shipment; serial number traceability |
| BR-D11-09 | FSMA §204 food shipment (J5) | Shipping CTE with KDE; TLC handoff to recipient |
| BR-D11-10 | Cold-chain food (J5) | Temperature monitoring; sanitary transport check |
| BR-D11-11 | PPAP sample submission (J2) | Sample packing list; PPAP cross-reference; retained sample parallel |
| BR-D11-12 | Consignment replenishment | Customer-managed inventory; ownership transfer deferred; WMS consignment zone |
| BR-D11-13 | Inter-company transfer | Internal pricing; no customer CoA required; inventory transfer in GL |
| BR-D11-14 | Recall replacement lot | Linked to D12 recall; priority dispatch; recall cross-reference on shipment |
| BR-D11-15 | Clinical supply shipment (J1 Annex 13) | Clinical kit labeling; blinding compliance; depot management; Qualified Investigator receiving |
| BR-D11-16 | Clinical trial device (J4) | ISO 14155 shipment documentation; sponsor acknowledgement |
| BR-D11-17 | Custom-made device (J4) | Patient-specific labeling; PRRC declaration copy; no batch release — individual certificate |
| BR-D11-18 | International export (non-ITAR) | AES Electronic Export Information; country-specific regulatory certificates |

---

## §6 Edge Cases

| EC # | Scenario | Handling |
|------|---------|---------|
| EC-01 | Customer rejects shipment at receiving dock | Carrier return initiated; `shipment.status → returned`; D4 inspection on receipt back; original lot reservation re-created if lot acceptable |
| EC-02 | ASN sent with incorrect serial numbers (J1) | DSCSA correction: `DSCSA_ASN_CORRECTION` event sent; customer notified; corrected TI/TH/TS reissued within 24 h |
| EC-03 | EU FMD decommission not received 30 days post-shipment (J1) | Alert to regulatory affairs; investigation: was product dispensed but not reported, or is there a dispenser system failure? |
| EC-04 | Shipment temperature excursion confirmed after delivery | Customer IQC disposition required; supplier investigation; if product impacted — D12 complaint opened |
| EC-05 | ITAR consignee changes between PO and shipment | ITAR compliance re-verification required; shipment held until new consignee added to export license |
| EC-06 | Lot partially picked and partial lot shipped; expiry split between packages | System creates two `shipment_line_item` records; FEFO verified per package; traceability at package level |
| EC-07 | Drop-ship: manufacturer ships to end customer but DSCSA TI is HESEM's (J1) | HESEM generates TI/TH as distributor; manufacturer CoA attached; EPCIS chain includes HESEM as trading partner |
| EC-08 | Recall replacement shipment and original lot still in transit to same customer | D12 recall scope extended to in-transit lot; ASN cancel request sent to carrier; if not interceptable, customer hold-and-return instruction |
| EC-09 | Organic certification expired day of shipment (J5) | WMS blocks pick until new certificate loaded; buyer notified; customer informed of potential delay |
| EC-10 | Serial number reuse detected: outgoing scan matches previously shipped serial | System rejects scan; `duplicate_serial_alert` created; investigation: fraudulent or system error |
| EC-11 | Customer insists on specific lot (FIFO override) | Lot-specific allocation permitted only with QA Manager override; FEFO override creates `fefo_exception_record` with justification |
| EC-12 | ITAR shipment returned by customs (export license issue) | Shipment recalled; export compliance investigation; DDTC notification if required; re-export after license correction |

---

## §7 Per-Pack Overlays

### J1 Pharma
- Full DSCSA exchange with EPCIS events at every handoff in the distribution chain.
- GDP-compliant carrier: carrier's last temperature qualification date verified; temperature pre-conditioning of vehicle recorded.
- EU FMD monitoring: for each lot shipped to EU, decommission status tracked per serial number. Any undecommissioned serial after 30 days triggers regulatory investigation.
- Clinical supply: IMP shipment to clinical sites requires depot authorization; randomization code handling if blinded; temperature-controlled depots confirmed.

### J2 Automotive
- EDI 856 ASN per AIAG B-11 standard transmitted at dispatch; customer-specific ASN format (GM EDI, Ford B2B, Toyota, etc.) configured in `customer_edi_profile`.
- PPAP PSW cross-referenced on first production lot ASN.
- Customer-specific container and label requirements enforced from `customer_packing_specification`.

### J3 Aerospace
- FAA Form 8130-3: for aviation parts, original 8130-3 (or EASA Form 1) attached to shipment physically and scanned into system. For export: dual-release (FAA + EASA) when required.
- ITAR: DDTC export license copy in shipment package; `ddtc_export_record` created per shipment with license number, consignee, quantity, value.
- AS9120B distributor: traceability maintained from original manufacturer through distributor to customer; back-to-birth record required.

### J4 Medical Device
- UDI on outer package: DataMatrix barcode encoding GTIN + lot + expiry (GS1 standard) verified before dispatch; human-readable UDI verified.
- EUDAMED device registration: shipment data (lot, quantity, distribution channel) may feed EUDAMED periodic reports per EU MDR Article 31.
- Sterile device integrity: pre-shipment sterile barrier visual inspection; `sterile_barrier_check_record` per lot.

### J5 Food Safety
- FSMA §204 shipping CTE: at dispatch, `shipping` CTE created with: TLC (Traceability Lot Code), description, quantity, unit, recipient identifier, shipping point, date.
- Sanitary transport: trailer/container verified clean and free of contamination per FDA sanitary transport rule (21 CFR §1.900).
- Temperature-controlled food: continuous temperature monitoring during transit; delivery confirmation with temperature log.

---

## §8 AI Advisory Integration

| AI Advisor | Invocation Point | Output |
|-----------|----------------|--------|
| AI-26 Complaint Sentiment | Customer communications (complaint context) | Early complaint signal detection from customer POD rejections and return rates |
| AI-28 Customer Reply | ASN dispute; customer inquiry response | Suggested response text for customer logistics queries; traceability data summary |

---

## §9 Cross-Workflow Couplings

| Coupled Workflow | Coupling | Direction |
|-----------------|---------|-----------|
| D10 Batch to Release | Release commit triggers D11 traceability initiation | D10 → D11 |
| D1 Order to Cash | SO fulfillment; revenue recognition on POD | D11 → D1 |
| D12 Complaint to Recall | Shipment traceability powers recall scope identification | D11 → D12 |
| D4 Receive to Inspect | Customer returns re-enter via D4 | D11 → D4 (return) |
| C5 Inventory | Goods issue; FEFO lot depletion | D11 → C5 |
| C8 Traceability | OTG genealogy edges extended with shipment nodes | D11 → C8 |
| C11 Finance | COGS posting; revenue accrual | D11 → C11 |

---

## §10 KPIs

| KPI | Definition | Target |
|-----|-----------|--------|
| KPI-D11-01 | On-Time Shipment Rate | Shipments dispatched ≤ promised date / total × 100 | ≥ 98% |
| KPI-D11-02 | Fill Rate | SO lines fully shipped on first shipment / total SO lines × 100 | ≥ 97% |
| KPI-D11-03 | FEFO Compliance Rate | Lots shipped in FEFO order / total lots shipped × 100 | ≥ 99% |
| KPI-D11-04 | ASN Timeliness | ASN transmitted before physical arrival at customer / total shipments × 100 | ≥ 95% |
| KPI-D11-05 | DSCSA EPCIS Exchange Completeness (J1) | Shipments with complete TI/TH/TS transmitted / total Rx shipments × 100 | 100% |
| KPI-D11-06 | EU FMD Decommission Rate (J1) | Serialized units decommissioned / total units shipped to EU × 100 | ≥ 99.5% |
| KPI-D11-07 | Cold-Chain Excursion Rate (In-Transit) | Shipments with in-transit temp excursion / total cold-chain shipments × 100 | ≤ 0.5% |
| KPI-D11-08 | Customer POD Rejection Rate | Deliveries rejected at customer / total deliveries × 100 | ≤ 1% |
| KPI-D11-09 | ITAR Export Compliance Rate (J3) | ITAR shipments without compliance findings / total ITAR shipments × 100 | 100% |
| KPI-D11-10 | FSMA §204 CTE Completeness (J5) | Shipping CTEs with all required KDEs / total FSMA-covered shipments × 100 | 100% |
| KPI-D11-11 | Traceability Recall Scope Identification Time | Time from lot recall trigger → complete shipped lot list | ≤ 2 hours |
| KPI-D11-12 | Perfect Order Rate | Orders shipped on time, complete, damage-free, with correct documentation / total orders × 100 | ≥ 95% |
| KPI-D11-13 | Serial Number Scan Accuracy (J1/J4) | Units with correct serial scan match / total serialized units shipped × 100 | 100% |

---

## §11 Failure Modes

| FM # | Failure Mode | Cause | Detection | Mitigation |
|------|-------------|-------|----------|----------|
| FM-01 | Wrong lot shipped (FEFO bypass) | Manual lot selection override; WMS bypass | FEFO compliance KPI; customer lot number on invoice | FEFO enforced by WMS; override requires QA Manager e-sig; `fefo_exception_record` |
| FM-02 | DSCSA EPCIS not sent before delivery (J1) | Integration failure; timing issue | EPCIS completeness KPI; trading partner complaint | Retry queue; shipping blocked until EPCIS confirmation; max 2-hour delay |
| FM-03 | Temperature excursion not detected during transit | Logger battery fail; coverage gap | Customer complaint; cold-chain KPI | Redundant logger; backup temp indicator strip; carrier SLA for data transmission |
| FM-04 | ITAR export without license (J3) | Compliance check bypassed; emergency shipment | DDTC audit; CBP examination | Hard gate: ITAR-flagged item cannot complete goods issue without `export_license.status = ACTIVE` |
| FM-05 | Lot shipped to unauthorized consignee (ITAR) (J3) | License not updated for new consignee | Trade compliance audit | Pre-shipment consignee verification against license; system block if mismatch |
| FM-06 | Serial number not scanned — unit shipped without EPCIS link (J1) | Picker bypasses scan; label unreadable | Serial completeness check at close | Shipping dock scanner enforces unit-level scan; `goods_issue` blocked if scan count ≠ qty |
| FM-07 | EU FMD decommission never received for shipped units (J1) | Pharmacy system failure; product not dispensed | FMD decommission KPI; 30-day alert | Regular HESEM FMD monitoring run; alert per lot when decommission rate < 95% after 30 days |
| FM-08 | FSMA §204 CTE missing KDE (J5) | Automation gap; legacy customer receiving system | CTE completeness KPI; FDA audit | Template-based CTE generation with all required KDE fields validated before shipment close |
| FM-09 | Customer receives expired product | FEFO not enforced; shelf life miscalculated | Customer complaint; POD rejection | `minimum_remaining_shelf_life_days` check enforced in WMS allocation query |
| FM-10 | CoA not transmitted with shipment | Email failure; EDI error | Customer complaint; invoice mismatch | CoA transmission confirmation tracked; retry mechanism; fallback to portal |
| FM-11 | Recalled lot shipped (system lag) | D12 recall not blocking D11 allocation | Recall × shipment cross-check | Recall status propagates to `lot.status = RECALLED` synchronously; goods issue blocked |
| FM-12 | Consignment consumption understated | Customer scan-out not recorded | Consignment audit; stock reconciliation | Cycle count schedule on consignment locations; automatic reminders if scan rate drops |
| FM-13 | ASN quantity mismatch from actual shipment | Pack error; count mistake | Customer receiving mismatch; EDI 856 vs. GRN | Pack verification: system count vs. physical pack check at staging; supervisor sign-off |

---

## §12 Traceability Record Schema

The following key tables constitute the D11 traceability substrate:

**`shipment`**: master shipment header
```
shipment_id (UUID PK)
so_id (FK → sales_order, nullable for transfers)
transfer_order_id (FK, nullable)
facility_id
customer_id (FK → customer)
ship_from_location_id
ship_to_address_id
carrier_id
tracking_number
incoterm
shipment_date
estimated_delivery_date
actual_delivery_date
status (shipment lifecycle state)
cold_chain_required (bool)
temperature_logger_device_id (FK, nullable)
itar_controlled (bool)
export_license_id (FK, nullable)
dscsa_exchange_required (bool)
udi_required (bool)
fsma_covered (bool)
```

**`shipment_line_item`**: lot-level line items
```
shipment_line_id (UUID PK)
shipment_id (FK)
so_line_id (FK, nullable)
item_id (FK)
lot_id (FK → inventory_lot)
quantity_shipped
uom
expiry_date
coa_document_id (FK)
coc_document_id (FK)
concession_doc_id (FK, nullable)
serial_numbers[]: UUID[] (FK → serial_number)
udi_pi (string, J4)
traceability_lot_code (string, J5)
```

**`shipment_serial_number`**: unit-level for J1/J4
```
scan_id (UUID PK)
shipment_line_id (FK)
serial_number (string)
gtin (string)
lot_number (string)
expiry_date (date)
dscsa_scan_confirmed (bool)
fmd_decommission_status ∈ {PENDING, DECOMMISSIONED, NOT_APPLICABLE}
fmd_decommission_event_id (FK, nullable)
```

**`shipment_regulatory_submission`**: post-dispatch regulatory events
```
submission_id (UUID PK)
shipment_id (FK)
submission_type ∈ {DSCSA_EPCIS, FSMA_CTE, ITAR_DDTC, UDI_EUDAMED, FMD_DECOMMISSION}
submitted_at
submission_reference
status ∈ {PENDING, SUBMITTED, CONFIRMED, FAILED}
retry_count
```

This schema enables: recall scope query by lot (direct and genealogy-expanded),
DSCSA EPCIS event reconstruction, FSMA CTE forward-trace from TLC, and
ITAR export record generation.

---

*Decision phrase: S2-13_D11_D12_DEEP_UPGRADE_COMPLETE (partial — D11 complete)*
