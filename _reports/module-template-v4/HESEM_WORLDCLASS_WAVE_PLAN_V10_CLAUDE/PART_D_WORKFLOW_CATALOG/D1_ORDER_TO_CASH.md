# D1 — Order to Cash

**Version:** V10 Deep Upgrade  
**Prompt source:** S2-07_D1_ORDER_TO_CASH  
**Supersedes:** V9 D1_ORDER_TO_CASH.md  

---

## 1. Purpose and Scope

D1 is the end-to-end workflow that converts a customer demand signal into delivered goods, a compliant shipment record, and collected revenue. It is the most commercially visible workflow in HESEM: every revenue-generating transaction passes through it.

D1 spans the resources in C1 (Commercial & Customer): Quotation, Sales Order, Customer Purchase Order, Shipment, Invoice, RMA, Concession, Demand Plan. It consumes services from every other domain — C3 for scheduling, C5 for inventory, C6 for production execution, C7 for quality gates and batch release, C8 for traceability and serialization, C9 for equipment qualification status, C10 for operator eligibility, and C11 for cost and invoicing. In regulated industries, D1 is the workflow most scrutinized by regulators because a released batch reaching a patient or an end-user without a complete evidence chain is a critical compliance failure.

---

## 2. Trigger Catalog

D1 is initiated by any of the following demand signals (≥ 25):

| # | Trigger | Source | Notes |
|---|---|---|---|
| T-01 | Customer PO via EDI 850 | Trading partner EDI | Auto-ingested; validated against Item master and pricing catalog |
| T-02 | Customer PO via order portal | C1 Customer Portal | Web form submission; same validation pipeline |
| T-03 | Customer PO via email (parsed) | Email parser | ML-extracted fields presented for human confirmation |
| T-04 | Customer PO via phone/manual | CSR manual entry | CSR captures CPO fields; same validation |
| T-05 | Won Quotation → SO conversion | C1 Quotation (won state) | Sales Engineer confirms conversion |
| T-06 | Forecast-driven scheduled release | C3 Demand Plan | System auto-generates SO from confirmed demand signal without CPO |
| T-07 | Blanket order release | C1 Blanket Purchase Order | Customer releases quantity against standing MSA/contract |
| T-08 | Scheduling agreement call-off | C1 Scheduling Agreement | JIT call-off for automotive (EDI 862); creates SO line for specific delivery window |
| T-09 | Consignment restock trigger | C5 Consignment Location | Inventory drop below reorder point at customer-managed location |
| T-10 | Drop-ship order | C1 SO (drop-ship flag) | Supplier ships direct to customer; HESEM manages the order without warehouse pick |
| T-11 | Kit / configure-to-order | C1 SO (kit flag) | BOM is assembled to customer spec at order time; routed to C3 for kit production |
| T-12 | Sample order | C1 SO (sample_type flag) | Free or reduced-price sample; quantity limited; specific lot required per customer agreement |
| T-13 | Qualification lot order | C1 SO (qual_lot_type) | Customer requests first-article or qualification lot; links to FAI (J3) or PPAP (J2) |
| T-14 | RMA replacement order | C1 RMA record | Customer returns defective; replacement SO auto-generated linked to original SO |
| T-15 | Recall replacement order | C7 Recall Record | Recalled lot replaced; new SO with zero-price replacement linked to recall record |
| T-16 | Service order / spare part | C1 SO (service_type) | Post-sale spare part; links to device serial for J4 MD service history |
| T-17 | Field replacement order | C1 SO (field_replacement) | Emergency replacement; expedited routing; bypasses standard lead time queue |
| T-18 | Stability sample order | C7 Stability Study | J1 Pharma stability pull lot shipped to external lab; internal SO with lab as customer |
| T-19 | Intercompany transfer order | C1 SO (intercompany_flag) | HESEM entity to entity; triggers parallel PO in receiving entity |
| T-20 | Loan order (trial / evaluation) | C1 SO (loan_type) | Asset loaned; auto-generates future return SO at loan expiry |
| T-21 | EDI 830 / 862 firm planned order | Trading partner EDI | Converts forecast to firm SO per customer-defined firmness fence |
| T-22 | Customer portal MES direct order | Integrated customer portal | Customer triggers replenishment directly from their MES/ERP |
| T-23 | Cross-border re-export order | C1 SO (reexport_flag) | Requires ITAR/EAR review and export license verification before processing |
| T-24 | Emergency / rush order | C1 SO (priority = emergency) | Overrides standard queue; manufacturing re-schedules; premium freight |
| T-25 | Clinical trial supply order (J1 Pharma) | C1 SO (clinical_supply_type) | Links to IMP batch; requires QP release; double-blind labeling if applicable |

---

## 3. Pre-conditions

Before D1 can progress beyond CPO capture to SO confirmation, all of the following must resolve to true:

| # | Pre-condition | Checked by | Block if false |
|---|---|---|---|
| P-01 | Customer KYC complete (entity verified, sanctions-screened) | C1 Customer master `kyc_status = cleared` | Hold CPO; alert CSR |
| P-02 | Credit check passed or credit hold waived with authority | C1 Customer `credit_status ≠ on_hold` | Block confirmation; route to Finance |
| P-03 | Pricing valid and effective for all SO lines (pricing catalog or contract price) | C1 Pricing Catalog `effective_from ≤ order_date ≤ effective_to` | Pricing exception queue |
| P-04 | All items active and product lifecycle status `active` or `limited` (not `obsolete`, `discontinued`) | C2 Item master `lifecycle_status` | Notify CSR; suggest replacement |
| P-05 | Requested spec revision effective for ship date (D7) | C2 Item + C7 Doc Effectivity | Engineering hold |
| P-06 | Customer-specific requirement overlay current (e.g., Ford Q1, GM BIQS, Boeing D1-9000) | C1 CSR record `status = current` | Compliance hold |
| P-07 | For make-to-order: capacity feasibility confirmed by C3 (RCCP pass) | C3 RCCP result for delivery date | Delivery date negotiation |
| P-08 | For ITAR-controlled items: ITAR Person-of-Record verified at shipping site (J3) | C10 ITAR POR `status = active` at site | ITAR hold; alert EO |
| P-09 | Customer country not under active trade embargo (OFAC/EU sanctions screening) | Sanctions API result `clear` | Block; escalate to Compliance |
| P-10 | Sub-processor DPA (Data Processing Agreement) listed for customer if order involves personal data processing | C1 Customer DPA record `signed = true` | GDPR hold |
| P-11 | For regulated items (J1/J4): product registered/authorized in destination country | C1 Product Registration record `status = authorized` for customer's country | Regulatory hold |
| P-12 | No active open recall covering the proposed fulfillment lots | C7 Recall Record `scope_lot_ids` does not intersect available inventory | Quality hold; alternate lot required |
| P-13 | For AAL-elevated actions in the path (e.g., BREL): AAL elevation token available in session for the signing authority | C10 Eligibility / IAM | Auth hold at step execution |
| P-14 | Region pinning honored: if customer's country requires local warehouse, order routed to correct site | C1 Customer Site `fulfillment_region` matches SO `site_id` | Route correction |
| P-15 | For cold-chain items: cold-chain carrier confirmed available for delivery date/region | Logistics master `cold_chain_capable = true` for lane | Carrier substitution or date shift |
| P-16 | Payment terms agreed and on file | C1 Customer `payment_terms` set | Finance hold |
| P-17 | For clinical supply (J1 T-25): IMP Authorization / IND on file for destination country | C1 Regulatory record | Clinical regulatory hold |

---

## 4. SM-1 — Sales Order Lifecycle (Full Transition Table)

States: `draft`, `confirmed`, `allocated`, `production_in_progress`, `quality_hold`, `ready_to_ship`, `in_transit`, `delivered`, `invoiced`, `closed`, `cancelled`

| From | To | Event | Guard | Side-Effects | Evidence Emitted | SLO |
|---|---|---|---|---|---|---|
| `draft` | `confirmed` | `confirm_so` | Pre-conditions P-01..P-17 all pass; CSR or Sales Engineer confirms | Trigger D3 MRP signal if MTO; trigger C3 demand netting; emit `so.confirmed` | CPO ingestion record; pre-condition check log | T+24h from CPO receipt |
| `confirmed` | `allocated` | `allocate_inventory` | Sufficient on-hand quantity in correct lot/serial status (`available`); FEFO policy applied | C5 reservation created; lot_ids locked; emit `so.allocated` | Allocation transaction record with lot_ids | T+1h from confirmation for stock items |
| `confirmed` | `production_in_progress` | `release_to_production` | Allocation fails (insufficient stock); D3 production order released | WO created in C6; MRP netting in C3 | D3 work order creation event | Immediately on allocation failure |
| `production_in_progress` | `allocated` | `production_complete` | WO completed + FQC pass + BREL released (if regulated) | C5 lot becomes `available`; reservation formed; emit `so.allocated` | BREL release packet linked | Per production schedule |
| `allocated` | `quality_hold` | `raise_quality_hold` | NQ event opened for allocated lot with `block_release = true` | C5 reservation suspended; hold reason visible to CSR | NC record linked to SO | Immediately on NC open |
| `quality_hold` | `allocated` | `release_quality_hold` | NC dispositioned (accept or concession); BD-2 signed | Reservation reinstated; notify CSR | NC disposition record | Per NC SLA |
| `allocated` | `ready_to_ship` | `approve_for_shipment` | BREL released (if regulated, BD-1); no open quality holds; customer-specific docs complete | Shipment record created; pick ticket generated | BREL release packet; shipment record | T+4h from allocation for express; T+24h standard |
| `ready_to_ship` | `in_transit` | `ship` | Carrier confirmed; BOL generated; lot/serial consumed from C5 | Inventory consumed; genealogy edge SO → Shipment → Customer written in C8 OTG; DSCSA TI/TH/TS transmitted (J1); EU FMD decommissioning (J1); UDI-PI scan confirmed (J4) | Shipment manifest; BOL; carrier tracking number; DSCSA transaction set | Per committed ship date |
| `in_transit` | `delivered` | `confirm_delivery` | Carrier POD received or customer portal acknowledgment | Emit `so.delivered`; SLA timer stops | POD document | Per committed delivery date |
| `in_transit` | `quality_hold` | `delivery_exception` | Carrier reports damage / temperature excursion / loss | Shipment in exception; investigation opened; replacement path (T-17) may be triggered | Carrier exception report | Alert within 1h of exception signal |
| `delivered` | `invoiced` | `generate_invoice` | Delivery confirmed; invoice terms trigger (immediate on delivery, or NET-30, etc.) | C11 invoice generated; tax applied; GL COGS posting; EDI 810 transmitted | Invoice record; GL posting | Per payment terms |
| `invoiced` | `closed` | `confirm_payment` | Payment received and matched to invoice | SO closed; C11 AR posting; emit `so.closed` | Payment confirmation | Per payment terms |
| `closed` | — | — | Immutable | — | — | — |
| `draft` | `cancelled` | `cancel_so` | No downstream WOs in progress; cancellation authority | Release any reservations; emit `so.cancelled` | Cancellation record with reason | — |
| `confirmed` | `cancelled` | `cancel_so` | MTO: Production not yet started; authority confirms | Cancel linked WO if in `planned` status in D3; release reservations | — | — |
| `allocated` | `cancelled` | `cancel_so` | Production complete but customer cancels before ship | Release C5 reservation; lot returns to available pool; COGS not posted | Cancellation + lot release record | — |

---

## 5. Saga Discipline

D1 is a multi-domain saga. The saga coordinator lives in C1 and records each step's outcome in the `so.saga_ledger` JSONB field. On failure at any step, compensation runs in reverse order for completed steps.

### 5.1 Saga Steps and Compensation

| Step | Action | Domains | Compensation on Failure |
|---|---|---|---|
| S1 | CPO ingestion + validation | C1 | Mark CPO `invalid`; notify CSR; no downstream action taken yet |
| S2 | SO creation and confirmation | C1, C3 | Delete draft SO; release any capacity reservation in C3 |
| S3 | Inventory reservation (C5) | C1, C5 | Release C5 reservation; lot returns to available |
| S4 | D3 WO release (if MTO) | C1, C3, C6 | Cancel WO in C6 (if `planned`); notify Production Planner |
| S5 | Batch Release gate (D10, regulated) | C7, C8 | BREL remains in `on_hold`; SO stays `production_in_progress`; notify QA |
| S6 | Shipment dispatch (C5 lot consumption + C8 genealogy write + DSCSA transmission) | C1, C5, C8 | Reverse C5 stock move (reversal journal); mark genealogy edge `voided`; send DSCSA correction event |
| S7 | Invoice generation (C11) | C1, C11 | Void invoice; reverse GL COGS posting; send EDI 810 credit memo |
| S8 | Payment matching | C1, C11 | Unlink payment match; reinstate open invoice; notify AR |

### 5.2 Saga Ledger

Each step writes to `so.saga_ledger`:
```json
{
  "step": "S6_SHIPMENT",
  "status": "completed"|"compensated"|"failed",
  "completed_at": "ISO8601",
  "compensated_at": "ISO8601",
  "evidence_refs": ["shipment_id", "stock_move_id", "dscsa_tx_id"]
}
```

The saga ledger is append-only. A failed saga leaves the SO in a named exception state visible to the operator, with the failed step and compensation result clearly identified.

---

## 6. Order Branches

| Branch | Description | Key Differences vs Standard |
|---|---|---|
| B-01 Standard B2B | CPO → SO → allocate → ship → invoice | Baseline path |
| B-02 Repeat / standing order | Customer with active contract; no quotation step; pricing from contract | Pricing from contract rate card; no RFQ |
| B-03 Contract release | Customer MSA defines terms; individual POs release against contract | Credit check deferred to MSA level |
| B-04 Sample / evaluation | Sample_type = true; quantity capped per product policy; often $0 or nominal price | Free goods handling; COGS policy differs in C11 |
| B-05 Return / RMA | Customer returns goods; RMA SO created; inspection on receipt (D4) | Negative inventory transaction; COPQ recording |
| B-06 Replacement | Triggered by RMA or recall; replacement SO linked to origin SO | Zero-price (covered by warranty or recall); linked to NC/recall record |
| B-07 Drop-ship | Supplier ships direct to customer; HESEM creates PO to supplier (D2) and SO to customer simultaneously | No pick/pack step; shipment confirmation comes from supplier |
| B-08 Kit / configure-to-order | Kit BOM assembled at order entry per customer specification | C3 produces kit; C6 executes kit assembly WO |
| B-09 Blanket / call-off | Customer issues annual PO; individual releases create child SOs | Release quantity constrained by blanket remaining balance |
| B-10 Scheduling agreement | Automotive (EDI 862); daily/weekly call-offs | Tight JIT delivery windows; carrier slot pre-booked |
| B-11 Consignment | HESEM inventory at customer site; replenishment triggered by consumption signal | Inventory remains on HESEM's books until consumed; reconciliation cycle |
| B-12 Intercompany | Entity A fulfills for Entity B | Internal transfer pricing; dual GL posting (A sells, B receives) |
| B-13 Recall replacement | Recall-driven; zero-price; lot cannot be from recalled batch | Linked to C7 Recall Record; lot genealogy verified as not recalled |
| B-14 Qualification lot | First production run; triggers FAI (J3) or PPAP (J2) before full-rate shipment | BREL held until FAI/PPAP approved |
| B-15 Clinical trial supply (J1) | IMP shipment; double-blind labeling; QP release required | Special labeling; IMP authorization required; destruction certificate expected back |
| B-16 Rush / emergency | Emergency priority; expedited production + premium freight | Air freight surcharge; queue bypass approval required |
| B-17 Cross-border re-export | ITAR or EAR item exported then re-exported by customer | ITAR license verification per T-23; export log maintained |
| B-18 Retail vs. B2B | Retail: unit pick + consumer label; B2B: pallet pick + trade label | Label template differs; VAT treatment differs |

---

## 7. Edge Cases

| # | Edge Case | Handling |
|---|---|---|
| EC-01 | Partial allocation: only 60% of ordered quantity available on-hand | Partial SO line: ship 60% as Ship-1 (allocated); remainder stays `production_in_progress`; customer notified of split shipment |
| EC-02 | Partial shipment: carrier picks up less than packed quantity | Shipment exception; residual quantity re-enters pick queue; customer notified; delivery SLA recalculated |
| EC-03 | Credit hold raised mid-flight (after SO confirmed, before ship) | SO transitions to `quality_hold` sub-state `credit_hold`; Finance Lead must approve override or customer pays; no shipment until resolved |
| EC-04 | Engineering hold: ECO mid-flight (D7) affects the item spec | SO placed on `engineering_hold`; new revision's effectivity date determines when SO can proceed; customer notified of delay |
| EC-05 | Compliance hold: customer's country added to sanctions list post-CPO | SO blocked immediately; Compliance escalation; customer notified per legal guidance; any in-transit shipment subject to recall consult |
| EC-06 | Customer-requested change mid-flight: quantity increase | If SO is `confirmed` or `allocated`, change order accepted; inventory re-allocated; if `in_transit`, change deferred to new SO |
| EC-07 | Pricing change mid-flight: contract renegotiated after CPO but before invoice | System locks pricing at SO confirmation date; price override requires Finance approval; credit/debit memo on invoice if applied |
| EC-08 | Lot recall mid-flight: recalled lot already allocated to an SO | Allocation voided; alternate lot sourced if available; customer notified per recall notification cadence; D1 ↔ D12 coupling activates |
| EC-09 | Concession-released lot fulfillment | BREL evidence chain must include the concession record and customer acceptance; extra BREL gate item in evidence chain (`concession_accepted = true`); BD-2 re-confirmed |
| EC-10 | ITAR shipment to foreign national | G6 gate re-evaluated at shipment step; export license number entered; EO e-signature captured at shipment; DDTC record created |
| EC-11 | Cold-chain temperature excursion in transit | IoT carrier data triggers temperature excursion alert; SO transitions to `quality_hold`; QA evaluates lot viability; if rejected: replacement order (B-06) triggered; DSCSA correction event if serialized (J1) |
| EC-12 | Cross-tenant supply chain: customer is also a HESEM tenant | API-to-API SO push between tenants; HESEM PO on receiving tenant auto-created; genealogy edges cross tenant boundaries |
| EC-13 | Force majeure declared (factory shutdown, natural disaster) | All affected SOs flagged `force_majeure`; delivery date commitments suspended; customer communications auto-generated from template; contracts department notified |
| EC-14 | AI advisory disagrees with pricing applied | AI-25 flags anomalous pricing vs. historical baseline; advisory presented to Sales Engineer; human decision required; advisory disagreement logged |
| EC-15 | Per-tenant freeze window: change freeze active at target delivery date | SO confirmed but MTO production blocked during freeze window per C3 planning rules; delivery date auto-shifted to post-freeze; customer notified |
| EC-16 | Duplicate CPO received: same customer PO number arrives twice via EDI | Idempotency key (customer_id + po_number) blocks duplicate SO creation; second CPO marked `duplicate`; alert to CSR |
| EC-17 | Currency fluctuation between order date and invoice date | Functional currency amount computed at invoice date using closing rate; exchange gain/loss posted to GL variance account in C11 |
| EC-18 | DSCSA trading partner verification lapse (J1 Pharma) | Shipment blocked until trading partner re-verification complete; C8 DSCSA transmission blocked; alert to Regulatory Affairs |

---

## 8. Cross-Workflow Couplings

| Coupled Workflow | Coupling Point | Direction |
|---|---|---|
| **D2 Procurement to Pay** | SO confirmation triggers MRP which generates purchase requisitions for sourced components | D1 → D2 (push) |
| **D3 Plan to Produce** | SO confirmation triggers capacity signal; WO release feeds back to SO when production complete | D1 ↔ D3 (bidirectional) |
| **D5 Inspect to Disposition** | RMA return from customer enters D4 receiving and D5 inspection before credit note is issued | D1 → D5 (for RMAs) |
| **D7 Document to Release** | Item spec revision effectivity gates SO progress (P-05); ECO mid-flight holds SO | D7 → D1 (block) |
| **D10 Batch to Release** | Regulated SOs: BREL must be in `released` status before SO transitions to `ready_to_ship` | D10 → D1 (gate) |
| **D11 Release to Trace** | Shipment step writes genealogy edge SO → Lot → Customer in C8 OTG | D1 → D11 (emit) |
| **D12 Complaint to Recall** | Recall record's `scope_lot_ids` triggers SO quality holds and replacement orders | D12 → D1 (interrupt) |
| **D14 Validate to Qualify** | Qualification lot orders (T-13, B-14) wait for validation/FAI/PPAP before shipment approval | D14 → D1 (gate) |

---

## 9. Per-Pack Overlays

**J1 Pharmaceutical:**
- DSCSA TI/TH/TS documents generated at shipment step; EPCIS event transmitted to trading partner system
- EU FMD pack decommissioning at shipment for EU-destined product
- QP Declaration (BD-1) required in BREL before `ready_to_ship`
- Clinical supply branch (T-25/B-15): IMP authorization, double-blind labeling, QP release; destruction certificate tracked when trial ends
- CoA transmitted with shipment as mandatory document
- Temperature-controlled shipment: cold-chain carrier verification (P-15); IoT monitoring during transit (EC-11)

**J2 Automotive:**
- EDI 856 ASN transmitted before or at shipment; customer-specific format per C1 customer master
- EDI 862 scheduling agreement call-offs (T-08); tight delivery windows
- Customer-specific labeling (Ford GTL, GM Odette, Toyota CTPAT) per C1 CSR
- PPAP status verified (P-06) before qualification lot (B-14) shipment approval
- Per-VIN traceability record created in C8 at shipment

**J3 Aerospace:**
- FAI (AS9102) required before full-rate shipment of qualification lots (B-14); SM-FAI gate
- ITAR export log created at shipment for ITAR-controlled items (EC-10); EO e-signature mandatory
- CoC (Certificate of Conformance) with material certs, NADCAP process certs, and FAI reference attached to shipment
- AS9100D §8.5.4 preservation requirements enforced: packaging specification from item master applied; ESD protection verified

**J4 Medical Device:**
- UDI-PI scanned and confirmed at pick/pack step; GUDID + EUDAMED records linked
- PRRC review (BD-1 equivalent for MDR) required in BREL evidence chain
- IFU (Instructions for Use) revision must match device revision shipped; doc effectivity gate (P-05)
- Vigilance reportability assessment triggered if a complaint is received post-delivery (D1 ↔ D12)
- Implantable device register: customer site's patient implant card requirement tracked

**J5 Food:**
- FSMA §204 KDE/CTE (shipping CTE) captured at shipment step: TLC, quantity, location, trading partner
- Allergen declaration on invoice/packing list required
- Country-of-origin labeling per COOL requirements for US shipments
- Temperature log for time-temperature sensitive products; carrier data captured
- Foreign supplier verification (FSVP) documentation attached for imported ingredients re-shipped

---

## 10. Evidence Emitted per Step

| Step | Evidence Records Created |
|---|---|
| CPO ingestion | CPO record: source channel, received_at, raw payload, validation results, parsed fields |
| SO confirmation | SO audit event: actor, pre-conditions check log, pricing snapshot, capacity feasibility result |
| Inventory reservation | C5 Reservation record: lot_ids, qty, reserved_at, FEFO selection rationale |
| BREL gate | BREL evidence chain snapshot (§C8 §2.2.1); QP Declaration (J1); PRRC decision (J4) |
| Shipment | Shipment manifest; BOL; carrier tracking number; DSCSA TI/TH/TS (J1); C8 genealogy edge; UDI scan (J4); FSMA §204 shipping CTE (J5); ITAR export record (J3); CoA + CoC |
| Invoice | Invoice record; GL posting records; EDI 810; tax computation record |
| Payment | Payment record; GL AR posting; invoice reconciliation |
| Closure | SO closure event; audit trail summary |

All evidence records are linked to the SO record via `so.evidence_refs` JSONB array and are queryable via the Audit Pack Export API (C7 CAP-C7-27).

---

## 11. AI Advisory Integration (L2 Features)

| Feature | Touch Point | Boundary |
|---|---|---|
| **AI-25 Schedule Optimizer** | At SO confirmation, AI-25 suggests optimal ship date and production slot based on current queue, capacity, and historical cycle times | Advisory only — suggested delivery date presented to CSR; human confirms or overrides |
| **AI-26 Customer Sentiment Analysis** | On CPO ingestion via email or portal text, AI-26 flags urgency signals ("critical shutdown", "patient safety") that may indicate a field replacement or emergency order requiring T-24/B-16 classification | Classification suggestion to CSR; human confirms order type |
| **AI-28 Customer Reply Draft** | When a delivery exception or quality hold requires customer notification, AI-28 drafts the customer communication from the event data | Draft presented to CSR for review and send; system never auto-sends customer-facing messages |
| Pricing anomaly detection | Flags SO line prices > 2σ from historical mean for the item × customer combination | Advisory to CSR; human confirms or investigates |
| Credit risk scoring | Continuous scoring based on payment history, order volume trend, external data | Advisory flag to Finance Lead; credit hold decision remains human (no BD equivalent, but follows credit policy gate P-02) |

---

## 12. Banned Decision Boundaries

**BD-1 — Batch Release:** The transition from `production_in_progress` → `allocated` → `ready_to_ship` for regulated batches passes through BREL (D10). BD-1 requires a QP (J1 EU), PRRC (J4), or authorized QA Manager e-signature. `POST /brel/{id}/release` returns 403 without valid e-sig token. No automated transition path exists; D1 saga step S5 waits until BREL status = `released`.

**BD-8 — Recall Initiation:** If a recall is initiated (D12) covering lots already allocated or in-transit for an open SO, D1 cannot automatically continue. The system places affected SOs on `quality_hold`; the recall scope classification and customer notification require BD-8 and BD-20 human authority. D1 resumes only after the recall team confirms whether replacement shipment is authorized.

---

## 13. Internationalization

| Aspect | Implementation |
|---|---|
| Currency | SO currency = customer's billing currency (from C1 Customer master); functional currency conversion in C11 at invoice date using FX rate per C11 Currency Conversion Record |
| Date format | All dates stored as UTC timestamps; rendered per user locale (dd/MM/yyyy for EU, MM/dd/yyyy for US, etc.) via i18n service |
| Address | Customer address stored per national format; tax jurisdiction derived from delivery address country + region code |
| Language | Customer-facing documents (invoices, packing lists, CoA cover letters) rendered in customer's preferred language from C1 Customer.preferred_language; translation catalog maintained in i18n service |
| Tax | VAT/GST applied per delivery address jurisdiction; reverse charge mechanism for B2B cross-border EU; US sales tax per Avalara/TaxJar connector |
| Incoterms | Incoterm captured on SO (EXW, FCA, DAP, DDP, etc.); determines who books freight, who pays duty, where risk transfers; impacts COGS recognition timing in C11 |

---

## 14. KPIs

| KPI | Target | Measurement |
|---|---|---|
| Order-to-ship cycle time (stock items) | ≤ 24h | `shipment.shipped_at - so.confirmed_at` for allocated-on-confirmation SOs |
| Order-to-ship cycle time (MTO) | Per customer lead time agreement | `shipment.shipped_at - so.confirmed_at` vs `so.committed_ship_date` |
| On-time delivery (OTIF) | ≥ 98% | `shipment.delivered_at ≤ so.committed_delivery_date` |
| CPO-to-SO confirmation time | ≤ 4h (auto-validated); ≤ 24h (manual) | `so.confirmed_at - cpo.received_at` |
| SO lines fulfilled complete (no partial ship) | ≥ 95% | Lines shipped in full / total lines |
| BREL release cycle time (regulated) | ≤ 5 days from FQC pass | `brel.released_at - fqc.completed_at` |
| Quality hold frequency | < 2% of SOs | SOs entering `quality_hold` / total SOs |
| Quality hold resolution time | ≤ 5 business days | `so.quality_hold_exit_at - so.quality_hold_entered_at` |
| Invoice accuracy rate | ≥ 99.5% | Invoices matching PO price ± tolerance / total invoices |
| Days Sales Outstanding (DSO) | Per customer terms + ≤ 5 days overrun | `payment_date - invoice_date` average |
| EDI processing success rate | ≥ 99% | EDI 850 → SO without manual intervention / total EDI 850 |
| DSCSA transmission success (J1) | 100% | Transmitted + acknowledged / total serialized shipments |
| EU FMD decommissioning success (J1) | 100% | NMVS `verified` / total packs supplied |
| ITAR export log completeness (J3) | 100% | ITAR shipments with EO-signed export record / total ITAR shipments |
| RMA processing cycle time | ≤ 10 business days from return receipt to credit note | `credit_note.issued_at - rma.received_at` |
| Recall replacement order fulfillment | ≤ 48h from recall notification | `replacement_so.shipped_at - recall.customer_notification_at` |

---

## 15. Failure Modes and Recovery

| # | Failure | Detection | Recovery |
|---|---|---|---|
| F-01 | EDI 850 parse failure: malformed segment | EDI processor returns parsing error | Dead-letter queue; alert to EDI team; customer notified to re-send or manual entry used |
| F-02 | CPO validation fails: item code not found in Item master | Validation pipeline returns `item_not_found` | Alert CSR; request item code clarification from customer; hold CPO |
| F-03 | Customer on credit hold at confirmation | P-02 check fails | SO blocked; Finance Lead notified; customer account manager alerted |
| F-04 | Sanctions hit: customer country added to OFAC list post-CPO | Daily sanctions re-screening of open SOs | SO flagged; Compliance hold; legal review; customer notified per guidance |
| F-05 | Allocation fails: all available lots on quality hold | P-12 check; no `available` lots | MTO triggered if feasible; alternate lot sourced via C3/C4; customer notified of delay |
| F-06 | BREL evidence gate fails: open NC for the batch | BREL checklist `open_nc_count > 0` | QA notified; NC must be closed or accepted via MRB (BD-2); SO remains `production_in_progress` |
| F-07 | Shipment label print failure | Printing service error | Retry with backup printer; manual label as fallback; shipment delay logged |
| F-08 | Carrier pickup missed | Carrier no-show | Rebook same-day or next carrier; premium freight surcharge; customer notified; SLA breach recorded |
| F-09 | DSCSA EPCIS transmission failed (J1) | ACK not received within 72h | Retry queue; manual submission via portal; shipment held until trading partner confirms receipt |
| F-10 | Temperature excursion during cold-chain transit (J1 / J4) | IoT sensor alert | Carrier instructed to hold; QA evaluates viability of lot; if rejected: replacement order; DSCSA correction event (J1) |
| F-11 | Invoice rejected by customer ERP via EDI 997 | EDI functional ACK = rejected | CSR reviews rejection reason; correct invoice data; re-transmit EDI 810 |
| F-12 | Payment overdue beyond terms | AR aging report | Collection process per customer policy; finance places customer on credit hold after configurable threshold |
| F-13 | Recall lot discovered allocated to in-transit SO | C7 Recall Record `scope_lot_ids` match triggers alert | Transit intercepted if possible; customer notified per recall notice; replacement SO created (B-06) |
| F-14 | ECO mid-flight: new item revision effective before ship date | D7 CDOC release event triggers SO review | SO placed on `engineering_hold`; new spec revision verified against the committed lot; if lot was produced to old rev: disposition decision (BD-2) |
| F-15 | Partial shipment accepted but customer disputes quantity | Shipment manifest vs. customer receipt discrepancy | Carrier weight/scan log compared; debit/credit memo issued; investigation opened |
| F-16 | Duplicate CPO received | Idempotency check on (customer_id, po_number) | Second CPO marked `duplicate`; CSR alerted; no second SO created |
| F-17 | ITAR export license not obtained before ship date (J3) | G6 ITAR gate at shipment fails | Shipment blocked; export compliance team notified; license expedited; customer notified of delay |
| F-18 | Intercompany transfer: receiving entity system unavailable | Saga step S2 (intercompany SO push) times out | Retry with exponential backoff; compensate by holding originating SO in `confirmed` state; alert both entity Finance Leads |

---

## 16. RACI per Major Action

| Action | CSR / Sales | Production Planner | QA | Finance | Logistics | Compliance |
|---|---|---|---|---|---|---|
| CPO ingestion + validation | **R** | — | C | C | — | C |
| SO confirmation | **R** | C | C | A | — | C |
| Credit hold override | I | — | — | **R** | — | — |
| Quality hold release (BD-2) | I | C | **R** | — | — | — |
| BREL sign-off (BD-1) | I | — | **R** | — | — | — |
| Shipment dispatch | C | — | C | — | **R** | — |
| ITAR export sign-off | I | — | C | — | C | **R** |
| DSCSA transmission (J1) | — | — | C | — | **R** | C |
| Invoice generation | C | — | — | **R** | — | — |
| Recall replacement decision (BD-8) | I | C | **R** | I | I | A |
| Customer communication on hold | **R** | — | C | — | — | C |

**Key:** R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## 17. Frontend Surfaces

| Surface | Domain | Purpose |
|---|---|---|
| Quotation Workspace + Record Shell | C1 | Author, review, submit quotes; win/lose/expire |
| Customer Purchase Order Workspace | C1 | CPO ingestion review; validation exception handling |
| Sales Order Workspace + Record Shell | C1 | SO lifecycle; holds management; saga status view |
| Allocation View | C1/C5 | Lot/serial assignment; FEFO display; reservation status |
| Shipment Workspace + Record Shell | C1 | Shipment dispatch; label print; carrier tracking |
| Invoice Workspace + Record Shell | C1/C11 | Invoice generation; tax breakdown; payment tracking |
| Customer 360 Dashboard | C1 | Open orders; delivery performance; complaint history; credit status |
| BREL Evidence Chain Viewer | C7/C8 | Read-only view of all BREL gates for an SO's batch |
| Recall Impact Dashboard | C7 | Shows all SOs affected by active recalls |

---

*Decision phrase: S2-07_D1_ORDER_TO_CASH_DEEP_UPGRADE_COMPLETE*
