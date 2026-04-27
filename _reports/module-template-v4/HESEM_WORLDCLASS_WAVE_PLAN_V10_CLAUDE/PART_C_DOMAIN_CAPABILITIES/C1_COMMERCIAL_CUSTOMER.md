# C1 — Commercial & Customer (V10)

```
domain_code:             D-01
domain_name:             Commercial & Customer
owner_role:              Commercial Lead (Logistics Lead for shipment; Finance Lead for invoice)
primary_state_machines:  SM-1 Order Lifecycle; SM-12 Complaint Lifecycle
root_count:              20
capability_count:        12
wave_maturity_target:    L5 by W5 (core); L5 by W7 (complaint + RMA)
part_c_version:          V10
```

---

## 1. Purpose

The Commercial & Customer domain owns every interaction between the manufacturer and its customers.
It is the demand side of the business. This domain answers:

- Who are our customers, what are the legal terms of our relationship, and what are their
  customer-specific requirements (CSR)?
- What did we promise to make and ship, and at what price?
- What did we actually ship — on time, in full, to correct revision, to correct lot?
- What did we charge, and has the customer paid?
- What did the customer complain about, and did we handle it within regulatory SLA?

This domain is the interface where the manufacturer's contractual obligations meet execution reality.

---

## 2. Resource Families — Full Enumeration

### 2.1 Customer (master)

Entity model:

| Field | Type | Semantics | Required | PII | Mutable |
|---|---|---|---|---|---|
| customer_id | UUID | system-generated PK | Y | N | N |
| customer_code | VARCHAR(20) | unique short code; tenant-scoped | Y | N | after active |
| legal_name | VARCHAR(200) | full registered legal entity name | Y | Y | Y |
| trade_name | VARCHAR(200) | DBA / trading name | N | Y | Y |
| customer_type | ENUM | OEM\|TIER1\|TIER2\|DISTRIBUTOR\|DIRECT\|GOV\|OTHER | Y | N | Y |
| status | ENUM | prospect\|active\|credit_hold\|inactive\|blacklisted | Y | N | Y |
| credit_limit | MONEY(2) | maximum outstanding receivable authorized | Y | N | Y |
| customer_currency | ISO 4217 | default billing currency | Y | N | Y |
| payment_terms | VARCHAR(50) | e.g. NET30, 2/10NET30 | Y | N | Y |
| tax_id | VARCHAR(50) | VAT / EIN / GST number | N | Y | Y |
| incoterms | VARCHAR(11) | ICC 2020 incoterms for shipment | N | N | Y |
| regulatory_class | ENUM | STANDARD\|FDA_DEVICE\|FDA_DRUG\|AERO_ITAR\|OTHER | Y | N | Y |
| csr_required | BOOLEAN | whether CSR overlay applies | Y | N | Y |
| coa_required | BOOLEAN | Certificate of Analysis must accompany every shipment | Y | N | Y |
| dscsa_trading_partner | BOOLEAN | Pharma pack: whether DSCSA applies | N | N | Y |
| vigilance_contact_required | BOOLEAN | MD pack: adverse event reporting contact required | N | N | Y |
| tenant_id | UUID | tenant isolation; immutable | Y | N | N |
| created_at | TIMESTAMPTZ | immutable | Y | N | N |
| created_by | USER_ID | immutable | Y | N | N |
| modified_at | TIMESTAMPTZ | last mutation timestamp | Y | N | Y |

Lifecycle events: `prospect_created` → `qualified` → `active` → `credit_hold` → `active` (on release)
→ `inactive`. Blacklist is a terminal administrative state requiring Finance Lead + Quality Lead
dual approval.

### 2.2 Customer Site

Sub-record of Customer. Stores billing and shipping location data.

| Field | Type | Semantics | Required | PII |
|---|---|---|---|---|
| site_id | UUID | PK | Y | N |
| customer_id | FK → Customer | owning customer | Y | N |
| site_code | VARCHAR(20) | unique within customer | Y | N |
| site_name | VARCHAR(200) | human label | Y | Y |
| address_line1 | VARCHAR(200) | | Y | Y |
| city | VARCHAR(100) | | Y | Y |
| state_province | VARCHAR(100) | | N | Y |
| postal_code | VARCHAR(20) | | Y | Y |
| country_code | CHAR(2) | ISO 3166-1 alpha-2 | Y | N |
| is_billing | BOOLEAN | | Y | N |
| is_shipping | BOOLEAN | | Y | N |
| ship_to_code | VARCHAR(20) | EDI 856 ShipTo ID | N | N |
| bill_to_code | VARCHAR(20) | EDI 810 BillTo ID | N | N |
| status | ENUM | active\|inactive | Y | N |

### 2.3 Customer Contact

| Field | Type | Semantics | Required | PII |
|---|---|---|---|---|
| contact_id | UUID | PK | Y | N |
| customer_id | FK → Customer | | Y | N |
| site_id | FK → Site | optional; site-specific contact | N | N |
| first_name | VARCHAR(100) | | Y | Y |
| last_name | VARCHAR(100) | | Y | Y |
| title | VARCHAR(100) | | N | N |
| email | VARCHAR(254) | | Y | Y |
| phone | VARCHAR(30) | | N | Y |
| mobile | VARCHAR(30) | | N | Y |
| role | ENUM | PURCHASING\|QUALITY\|LOGISTICS\|AP\|TECHNICAL\|OTHER | Y | N |
| is_primary | BOOLEAN | primary contact for all orders | Y | N |
| vigilance_contact | BOOLEAN | MD pack: authorized adverse event recipient | N | N |
| status | ENUM | active\|inactive | Y | N |

### 2.4 Quote (QUO)

State machine: informal (no SM number). States: draft → submitted → under_revision → accepted →
rejected → expired → superseded → converted.

| Field | Type | Semantics | Required | PII | Mutable |
|---|---|---|---|---|---|
| quote_id | UUID | PK | Y | N | N |
| quote_number | VARCHAR(20) | unique per tenant | Y | N | N |
| revision | INTEGER | increments on re-issue; starts at 1 | Y | N | N (each is new row) |
| customer_id | FK → Customer | | Y | N | N |
| contact_id | FK → Contact | | Y | N | Y |
| status | ENUM | see states above | Y | N | Y |
| valid_from | DATE | | Y | N | N |
| valid_until | DATE | | Y | N | N |
| currency | ISO 4217 | | Y | N | N (locked at submit) |
| incoterms | VARCHAR(11) | | N | N | Y |
| payment_terms | VARCHAR(50) | | Y | N | Y |
| total_net_value | MONEY | computed from lines | Y | N | computed |
| total_tax_value | MONEY | computed | Y | N | computed |
| so_id | FK → SO | populated at conversion | N | N | system |
| submitted_at | TIMESTAMPTZ | | N | N | system |
| accepted_at | TIMESTAMPTZ | | N | N | system |

Quote Line (sub-record): line_number, item_id, item_revision_id, quantity, uom, unit_price,
discount_pct, net_price (computed), lead_time_days, csr_notes (text).

### 2.5 Customer Purchase Order (CPO)

Arrives via EDI 850, portal upload, email attachment, or manual entry. Idempotency key:
`(customer_id, cpo_number)` — duplicate intake creates a validation event, not a new CPO.

| Field | Type | Semantics | Required | PII | Mutable |
|---|---|---|---|---|---|
| cpo_id | UUID | PK | Y | N | N |
| cpo_number | VARCHAR(50) | customer's PO number; unique per customer | Y | N | N |
| customer_id | FK → Customer | | Y | N | N |
| ship_to_site_id | FK → Site | | Y | N | Y |
| intake_channel | ENUM | EDI_850\|PORTAL\|EMAIL\|MANUAL | Y | N | N |
| intake_timestamp | TIMESTAMPTZ | immutable | Y | N | N |
| customer_required_date | DATE | | Y | N | N |
| status | ENUM | received\|validating\|discrepancy\|validated\|converted\|cancelled | Y | N | Y |
| validation_notes | TEXT | discrepancy detail | N | N | Y |
| so_id | FK → SO | set at conversion | N | N | system |
| quote_id | FK → QUO | when CPO references prior quote | N | N | Y |
| raw_edi_ref | VARCHAR(200) | file store reference for EDI payload | N | N | N |
| discrepancy_count | INTEGER | computed; count of line validation issues | Y | N | computed |

CPO Line: customer_item_code, item_id (resolved), quantity, uom, customer_unit_price,
customer_required_date, validation_status (enum: OK|ITEM_MISMATCH|PRICE_MISMATCH|DATE_MISMATCH).

### 2.6 Sales Order (SO) — primary SM-1 root

| Field | Type | Semantics | Required | PII | Mutable |
|---|---|---|---|---|---|
| so_id | UUID | PK | Y | N | N |
| so_number | VARCHAR(20) | unique per tenant | Y | N | N |
| customer_id | FK → Customer | | Y | N | N |
| cpo_id | FK → CPO | nullable (internal SOs) | N | N | N |
| quote_id | FK → QUO | nullable | N | N | N |
| ship_to_site_id | FK → Site | | Y | N | N (after committed) |
| bill_to_site_id | FK → Site | | Y | N | N (after committed) |
| status | ENUM per SM-1 | see §3 | Y | N | SM-controlled |
| hold_types | ENUM[] | CREDIT\|ENGINEERING\|QUALITY\|RECALL\|CUSTOMS | N | N | SM-controlled |
| order_type | ENUM | STANDARD\|MTO\|CTO\|REPAIR\|SERVICE | Y | N | N (after draft) |
| currency | ISO 4217 | | Y | N | N (locked at commit) |
| exchange_rate | DECIMAL(10,6) | locked at SO creation | Y | N | N |
| incoterms | VARCHAR(11) | | N | N | N (after committed) |
| payment_terms | VARCHAR(50) | | Y | N | N (after committed) |
| requested_ship_date | DATE | customer's desired date | Y | N | Y (before released) |
| promised_ship_date | DATE | HESEM's committed date | N | N | Y (before shipped) |
| confirmed_ship_date | DATE | planning-confirmed date | N | N | Y (before shipped) |
| total_net_value | MONEY | computed | Y | N | computed |
| credit_approved_by | USER_ID | | N | N | system |
| released_at | TIMESTAMPTZ | | N | N | system |
| shipped_at | TIMESTAMPTZ | | N | N | system |
| closed_at | TIMESTAMPTZ | | N | N | system |

SO Line: line_number, item_id, item_revision_id (locked at release), qty_ordered, qty_allocated,
qty_shipped, qty_invoiced, uom, unit_price, discount_pct, net_price, lot_traceability_required
(boolean), batch_release_gate (boolean, from item + CSR), csr_flags (JSONB).

### 2.7 Customer Order Forecast

| Field | Type | Semantics |
|---|---|---|
| forecast_id | UUID | PK |
| customer_id | FK → Customer | |
| item_id | FK → Item (C2) | |
| period | DATE | first day of period |
| period_type | ENUM | DAILY\|WEEKLY\|MONTHLY |
| forecast_quantity | DECIMAL(12,4) | |
| uom | VARCHAR(10) | |
| confidence_pct | INTEGER 0-100 | |
| source | ENUM | EDI_830\|PORTAL\|MANUAL\|API |
| superseded_by | FK → forecast_id | rolling forecast chain |

### 2.8 Customer Order Schedule

Represents firm or planning releases per EDI 862 / 830 release schedule.

Fields: schedule_id, customer_id, so_id (nullable), item_id, schedule_date, quantity, uom,
schedule_type (FIRM|PLANNING|SHIPPING_AUTHORIZATION), edi_reference, created_at.

### 2.9 Pricing Catalog

| Field | Type | Semantics |
|---|---|---|
| catalog_id | UUID | PK |
| catalog_code | VARCHAR(20) | unique per tenant |
| catalog_name | VARCHAR(200) | |
| currency | ISO 4217 | |
| effective_date | DATE | |
| expiry_date | DATE | nullable |
| base_unit | ENUM | EACH\|KG\|LB\|LITER\|M\|M2\|M3\|OTHER |
| status | ENUM | draft\|active\|superseded\|expired |

### 2.10 Pricing Override

Customer-specific price that supersedes the catalog price for a given item.

Fields: override_id, customer_id (FK), item_id (FK, C2), catalog_id (FK), override_price,
currency, min_quantity, max_quantity (nullable — no ceiling), effective_date, expiry_date,
reason (text), approved_by (user_id), approved_at (timestamptz).

Mutability: override_price and expiry_date mutable before effective_date; read-only after.

### 2.11 Customer Contract

| Field | Type | Semantics |
|---|---|---|
| contract_id | UUID | PK |
| contract_number | VARCHAR(50) | customer-supplied; unique per customer |
| customer_id | FK → Customer | |
| contract_type | ENUM | MASTER_SUPPLY\|BLANKET_PO\|FRAME_AGREEMENT\|NDA\|QUALITY_AGREEMENT\|OTHER |
| effective_date | DATE | |
| expiry_date | DATE | nullable (open-ended) |
| status | ENUM | draft\|under_review\|active\|expired\|terminated |
| currency | ISO 4217 | |
| max_value | MONEY | nullable (blanket PO ceiling) |
| auto_renew | BOOLEAN | |
| renewal_notice_days | INTEGER | days before expiry to trigger renewal alert |
| document_ref | VARCHAR(500) | DMS reference |
| signed_by_customer | VARCHAR(200) | name of customer signatory; PII |
| signed_by_manufacturer | USER_ID | |
| executed_at | DATE | |

### 2.12 Customer MSA (Master Service Agreement)

Fields: msa_id, customer_id, msa_number, effective_date, expiry_date, governing_law (text),
arbitration_clause (boolean), liability_cap (money, nullable), ip_ownership
(ENUM: CUSTOMER|MANUFACTURER|JOINT|NONE), status (draft|active|expired|terminated),
document_ref.

### 2.13 Customer Specific Requirement (CSR)

| Field | Type | Semantics |
|---|---|---|
| csr_id | UUID | PK |
| customer_id | FK → Customer | |
| csr_code | VARCHAR(50) | customer-assigned code e.g. "Ford Q1 §4.2.3" |
| title | VARCHAR(200) | |
| requirement_text | TEXT | verbatim customer requirement |
| category | ENUM | QUALITY\|SAFETY\|DELIVERY\|DOCUMENTATION\|LABELING\|TRACEABILITY\|OTHER |
| effective_date | DATE | |
| review_date | DATE | next scheduled review |
| applies_to | ENUM | ALL_PRODUCTS\|SPECIFIC_ITEMS\|PRODUCT_FAMILY |
| item_ids | UUID[] | populated when applies_to=SPECIFIC_ITEMS |
| evidence_required | TEXT | what evidence must be produced |
| waiver_possible | BOOLEAN | |
| status | ENUM | active\|pending_review\|waived\|expired |

### 2.14 RMA (Return Material Authorization)

| Field | Type | Semantics |
|---|---|---|
| rma_id | UUID | PK |
| rma_number | VARCHAR(20) | unique per tenant |
| customer_id | FK → Customer | |
| so_id | FK → SO | original shipment SO |
| reason_code | ENUM | QUALITY_DEFECT\|SHIPPING_DAMAGE\|WRONG_ITEM\|OVERSHIP\|CUSTOMER_CHANGE\|RECALL |
| complaint_id | FK → Complaint | nullable |
| status | ENUM | requested\|authorized\|in_transit\|received\|inspection\|disposition_complete\|credited\|closed |
| authorized_by | USER_ID | |
| authorized_at | TIMESTAMPTZ | |
| expected_receipt_date | DATE | |
| actual_receipt_date | DATE | nullable |
| disposition | ENUM | return_to_stock\|rework\|scrap\|destroy\|to_supplier | nullable |
| credit_amount | MONEY | nullable |
| credit_memo_id | FK → CreditMemo (Finance) | nullable |

### 2.15 Sales Forecast

Fields: forecast_id, item_id (C2), planning_period (date, first of period), period_type
(WEEKLY|MONTHLY), forecast_qty, baseline_qty (system-computed from 24-month history),
manual_override_qty (nullable), final_qty (computed: override if set, else baseline), uom,
confidence_band_low, confidence_band_high, version (integer, increments on revision),
created_by, created_at.

### 2.16 Demand Plan

Fields: demand_plan_id, plan_name, plan_horizon_start, plan_horizon_end, plan_type
(UNCONSTRAINED|CONSTRAINED), status (draft|under_review|approved|active|superseded),
approved_by, approved_at, source_forecast_ids (UUID[]), total_demand_value (money, computed).

### 2.17 Order Hold

Created when SO status enters on_hold for any hold_type. Each hold type is a separate record.

Fields: hold_id, so_id (FK), hold_type (CREDIT|ENGINEERING|QUALITY|RECALL|CUSTOMS),
reason (text, required), placed_by, placed_at, released_by (nullable), released_at (nullable),
release_notes (text, nullable), blocking_since_state (SM-1 state when hold placed).

### 2.18 Customer Concession Acceptance Record

Captures written customer acceptance of a known nonconformance in delivered goods.

Fields: concession_id, so_id (FK), nc_case_id (FK → NQ Case, C7), lot_id (FK → Lot, C5),
customer_contact_id (FK), concession_description (text), acceptance_conditions (text),
quantity_accepted (decimal), validity_period_end (date), reference_document (customer-issued ID),
accepted_by_customer (name, PII), accepted_at (date), created_by, created_at,
status (draft|awaiting_acceptance|accepted|expired|withdrawn).

### 2.19 Customer Vigilance Contact (MD pack — J4)

Required when customer.vigilance_contact_required = true.

Fields: vigilance_contact_id, customer_id (FK), contact_type
(ENUM: REGULATORY_AUTHORITY|AUTHORIZED_REP|DISTRIBUTOR|IMPORTING_MARKET),
country_code (ISO 3166-1 alpha-2), authority_name (PII), contact_name (PII), email (PII),
phone (PII), reporting_language (BCP 47), mdr_form_type (e.g. EUDAMED | MedWatch 3500A),
effective_date, expiry_date (nullable).

### 2.20 Customer DSCSA Trading Partner (Pharma pack — J1)

Required when customer.dscsa_trading_partner = true.

Fields: trading_partner_id, customer_id (FK), dscsa_id (GS1 GLN), trading_partner_type
(AUTHORIZED_DISPENSER|REPACKAGER|WHOLESALE_DISTRIBUTOR|3PL), license_state (US state),
license_number, license_expiry, verification_method (VRS|DIRECT), last_verified_at, status
(active|suspended|revoked).

---

## 3. State Machine — SM-1 Order Lifecycle (full transition table)

Owner: Commercial Lead. Tier: T-2 (standard authority). Evidence class: EC-4 on every
transition; EC-2 (human approval record) at release and ship. EC-5 (deviation record) on any
hold or cancel.

| # | Source | Event | Guard | Target | Side Effect | Evidence |
|---|---|---|---|---|---|---|
| 1 | draft | submit | sales_role; pricing complete; ship-to site valid; item revisions effective | credit_check | Initiate credit evaluation; lock pricing snapshot | EC-4 |
| 2 | credit_check | approve_credit | credit score ≥ threshold; no overdue balance > 60d | committed | Lock unit prices; capacity slot reserved | EC-4 + EC-22 |
| 3 | credit_check | hold_credit | credit score < threshold OR overdue > limit | on_hold[CREDIT] | Notify sales + Finance Lead; block all SO mutations | EC-4 + EC-5 |
| 4 | on_hold[CREDIT] | release_credit_hold | Finance Lead; overdue cleared OR manual override with VP approval | committed | Resume; credit limit recorded | EC-4 |
| 5 | committed | confirm_allocation | inventory available per MRP; or ATP date accepted by customer | allocated | Inventory reservation created per SO line (hard reserve) | EC-4 |
| 6 | committed | hold_engineering | Engineering Lead; technical discrepancy on item revision | on_hold[ENGINEERING] | Block pick; notify Engineering + Commercial Lead | EC-4 + EC-5 |
| 7 | on_hold[ENGINEERING] | release_engineering_hold | Engineering Lead; discrepancy resolved; revision confirmed | committed | Resume allocation flow | EC-4 |
| 8 | allocated | release | SM-7 doc effective; SM-8 training current; material available; all CSR flags addressed | released | Dispatch production WO (SM-3) or pull signal | EC-4 + EC-2 |
| 9 | released | production_start | Shopfloor: first operation opened | in_production | WO transitions cascade per SM-3 | EC-4 |
| 10 | in_production | hold_quality | Quality Lead; NC opened against lot in scope | on_hold[QUALITY] | Block pick; suspend ASN generation; notify Quality + Commercial | EC-4 + EC-5 |
| 11 | on_hold[QUALITY] | release_quality_hold | Quality Lead; NC disposition complete; BREL gate passed if regulated | in_production | Restore pick permission; log resolution | EC-4 |
| 12 | in_production | ready_to_ship | All SO lines: qty_ordered = qty_completed; BREL gate passed (when batch_release_gate=true) | ready_to_ship | Shipment record auto-created with manifest draft | EC-4 + EC-2 |
| 13 | ready_to_ship | ship | Logistics role; all mandatory documents attached (CoA, packing slip, hazard docs); customer CSR flags satisfied | shipped | Inventory lots consumed; genealogy edge written; EDI 856 ASN sent if configured | EC-4 + EC-2 + EC-19 |
| 14 | shipped | invoice | Finance role; delivery confirmation received OR contractual ship-and-bill terms | invoiced | Invoice record created; AR posting made | EC-4 |
| 15 | invoiced | close | Finance role; payment applied OR payment terms elapsed | closed | All financial postings finalized; AR cleared | EC-4 |
| 16 | any (pre-shipped) | cancel | Sales Lead + GM approval if in_production; SO not shipped | cancelled | Released WOs cancelled; inventory reservations freed; credit limit restored | EC-4 + EC-5 |
| 17 | any | hold_recall | Quality Lead; recall trigger per SM-11 | on_hold[RECALL] | Block ship for all affected SO lines; notify Recall team | EC-4 + EC-5 |
| 18 | on_hold[RECALL] | release_recall_hold | Quality Lead; recall scope assessed; SO lines not in recall scope confirmed | prior_state | Resume per lot disposition | EC-4 |

Hard couplings: SM-1 → SM-3 (release dispatches WO). SM-7 gates SM-1 release (doc effectivity).
SM-10 gates SM-1 ship (batch release, when batch_release_gate=true). SM-11 → SM-1 hold_recall.

---

## 4. Capabilities

### CAP-C1-01 — Customer Master Lifecycle

**Purpose.** Maintain the authoritative record for each customer: legal entity, sites, contacts,
compliance posture, credit terms, and CSR overlays.

**Lifecycle.** Prospect created (synced from CRM or manual). Qualification review (commercial
terms, regulatory class, credit limit approved by Finance Lead). Active. Credit hold (automated
at overdue trigger; manual release by Finance Lead). Inactive (no new SOs, existing SOs run
to close). Blacklist (dual approval: Finance Lead + Quality Lead; blocks any new engagement).

**Integration with state machine.** Customer.status = credit_hold propagates to all open SOs
→ triggers SM-1 hold_credit event on each. Customer.status = blacklisted blocks SO creation.

**Wave target.** L4 W4 (read-only + search); L5 W5 (full lifecycle mutation via API).

**Acceptance evidence.** Customer Master queryable by external CRM via connector. Site-level
addresses geocoded. CSR flags visible to operations and respected in SO release gate.
Credit limit changes audit-logged with before/after values.

### CAP-C1-02 — Quotation Authoring and Versioning

**Purpose.** Produce a quotation with version control. Track through win/loss/expiry.
Convert won quotations to SOs.

**Lifecycle.** Draft (pricing team authors lines; Engineering provides lead time). Internal
review (capacity feasibility per Planning; margin review per Finance). Submitted to customer.
Under revision (customer requests changes; increment revision integer; prior revision
superseded). Accepted → converted to SO. Rejected → closed with reason code. Expired
(system event when valid_until passed and status ≠ accepted).

**Decision points.** Before submission: capacity feasibility check (Planning confirms lead time);
margin threshold check (Finance confirms net margin ≥ policy floor). If either check fails,
quote returns to Draft with reason.

**Integration with state machine.** Quote conversion sets so.quote_id and triggers SO draft
creation. Quote revision supersedes prior row; so_id on prior revision cleared.

**Wave target.** L4 W4; L5 W5.

**Acceptance evidence.** Quote versioning preserves all prior revisions queryable. Conversion
to SO retains quote_id traceability. Margin and capacity checks logged per quote submission.

### CAP-C1-03 — Customer Purchase Order Capture and Validation

**Purpose.** Receive CPOs through all configured channels. Validate against Item Master,
Customer Master, and Pricing Catalog. Route discrepancies to human review.

**Lifecycle.** Received (intake timestamp recorded; raw EDI payload stored if EDI 850).
Validating (system checks: item codes match Item Master; prices within tolerance of Pricing
Override or Catalog; dates achievable per available capacity). Discrepancy (one or more lines
fail validation; commercial team reviews and resolves). Validated → Converted (SO created with
CPO reference).

**Idempotency rule.** Duplicate intake on (customer_id, cpo_number) creates a validation
discrepancy event rather than a second CPO record.

**Integration with state machine.** CPO conversion creates SO in draft state. CPO.status →
converted is one-time; subsequent EDI 860 change orders link to the SO via so_id.

**Wave target.** L4 W4; L5 W5. EDI 850 integration active by W4.

**Acceptance evidence.** CPOs from all configured channels (EDI 850, portal, email, manual)
validated with discrepancy report. Duplicate intake test: same EDI 850 received twice → one CPO
record, not two. Discrepancy routing to commercial team tested end-to-end.

### CAP-C1-04 — Sales Order Lifecycle

**Purpose.** Manage SO from draft through fulfillment, invoicing, and close. Handle all hold
types with correct SM-1 transitions.

**Lifecycle.** Per SM-1 full transition table (§3). Key gates: credit check, allocation,
release (doc + training + material gates), production, batch release (if regulated), ship,
invoice, close.

**Decision points at release gate.** Three checks must all pass before SM-1 transition
`allocated → released`:
  1. SM-7 gate: controlled documents affecting the item revision are in status `effective`
  2. SM-8 gate: all operators assigned to the production routing are training-current
  3. Material gate: physical inventory confirmed available (ATP or hard reservation)

**Integration with state machine.** SM-1 is the primary SM. SO release triggers SM-3 WO
dispatch. SM-10 batch release gates SM-1 ship for lots with batch_release_gate=true.

**Wave target.** L4 W4; L5 W5.

**Acceptance evidence.** SO state machine transitions verified per each transition in §3.
Hold placement and release tested for all hold_types. Release gate failures generate
Problem Detail (RFC 9457) with specific blocking reason.

### CAP-C1-05 — Shipment Execution

**Purpose.** Execute physical shipment to customers. Attach mandatory documents per customer
CSR. Emit genealogy edge for traceability. Send ASN if EDI 856 configured.

**Lifecycle.** Planned (created auto from SO ready_to_ship). Pick list generated per SO lines
and allocated lots. Packed (packing list generated; weight and dimensions captured).
In-transit (carrier tracking number captured; EDI 856 sent). Delivered (carrier confirmation
OR customer portal signature). Exception (carrier exception or delivery refusal; triggers
investigation).

**Decision points.** Before ship transition (SM-1 §3 row 13): all mandatory documents must
be attached. Document checklist is computed from: (a) CoA required per customer.coa_required,
(b) hazard documentation per item.dangerous_goods_class, (c) CSR documentation requirements
per active CSR records for this customer + item combination.

**Wave target.** L4 W4; L5 W5. EDI 856 integration active by W4.

**Acceptance evidence.** Shipment record traceable to specific lots and serials. Genealogy
edge written to traceability graph. ASN generated per EDI 856 on ship transition.
Document checklist validation tested per CSR scenario.

### CAP-C1-06 — Invoice Generation

**Purpose.** Generate invoices from shipment data. Apply tax rules. Post to AR. Track
payment status.

**Lifecycle.** Drafted (auto from SO shipped event; lines populated from shipment manifest).
Reviewed (Finance reviews for accuracy). Sent (EDI 810, email, or portal upload per
customer preference). Partially paid / fully paid (payment applied by Finance).
Overdue (SLA elapsed; automatic escalation to credit collection).

**Wave target.** L4 W5; L5 W5.

**Acceptance evidence.** Invoice generated with correct tax per jurisdiction. Currency
conversion applied at SO exchange_rate (not spot rate at invoice time). Payment status
synchronized to Customer.credit_limit consumed calculation.

### CAP-C1-07 — Customer Complaint Handling

**Purpose.** Receive, classify, investigate, and resolve customer complaints. Evaluate
regulatory reportability within SLA. Link to NC / CAPA / Recall as appropriate.

**Lifecycle (SM-12).** Received → triaged (24h SLA) → classified (severity: critical/major/minor;
category; regulatory_reportable flag) → investigation → root_cause_identified →
corrective_action → resolved → closed. Alternative path: duplicate (merged to parent complaint).

**Regulatory reportability evaluation.** For MD pack: EU MDR Article 87 / 21 CFR 803 threshold
evaluation runs at classification step. Result: reportable_yes / reportable_no / under_evaluation.
Reportable complaints must reach authority notification within 15 days (serious incident, EU MDR)
or 30 days (MDR 803.50). System generates a Vigilance Report draft and assigns to Quality Lead.

**Integration with state machine.** Critical complaint triggers NC Case creation (SM-6).
Complaint root cause may trigger CAPA (SM-6). Recall evaluation runs on any complaint
flagged as potential systematic failure (SM-11 initial evaluation).

**Wave target.** L4 W7; L5 W7. Reportability evaluator live by W7.

**Acceptance evidence.** Complaint classification SLA tested: critical complaints escalated
within 4h. Reportability flag evaluated for each MD-pack scenario. Regulatory authority
notification workflow tested for EU MDR Article 87 and 21 CFR 803.

### CAP-C1-08 — Field Return / RMA Authorization

**Purpose.** Authorize customer returns. Track returned material through receipt, inspection,
and disposition. Issue credit.

**Lifecycle.** Requested (customer contacts commercial). Review (verify against original SO;
determine reason code; authorize return). Goods in transit. Received (warehouse receives;
creates receiving record). Inspection (Quality inspects; may raise NC if defect confirmed).
Disposition complete (return_to_stock, rework, scrap, destroy, or supplier claim).
Credited (credit memo issued per Finance). Closed.

**Wave target.** L4 W7; L5 W7.

**Acceptance evidence.** RMA authorization traceable to original SO. Returned material
disposition consistent with quality findings. Credit memo linked to RMA record.

### CAP-C1-09 — Pricing Engine

**Purpose.** Apply multi-tier pricing per customer, per item, per volume, and per CSR
requirement. Support catalog base price, customer override, and volume discount logic.

**Lifecycle.** Pricing Catalog activated by Finance Lead on effective_date. Per-customer
Pricing Override approved by Commercial Lead. At quote line creation and SO line confirmation:
engine resolves final unit price as: (1) lowest matching Pricing Override if exists; else
(2) Pricing Catalog base price; else (3) default list price. Volume thresholds evaluated
against line quantity and order total.

**Wave target.** L4 W4; L5 W5.

**Acceptance evidence.** Pricing resolution audit log captures which catalog / override
applied per SO line. Volume discount breakpoints tested. Currency conversion at SO exchange
rate applied correctly. Override expiry enforced: expired override falls back to catalog price.

### CAP-C1-10 — Forecast Ingestion and Demand Planning

**Purpose.** Ingest customer-provided forecasts via EDI 830 or portal. Build demand plans
that feed MRP in C3.

**Lifecycle.** Forecast received per customer per item per period. Rolling forecast supersedes
prior period entries. Demand Planner reviews and adjusts (manual_override_qty). Demand Plan
drafted from aggregated forecasts. Approved Demand Plan pushed to C3 MRP as demand input.

**Wave target.** L4 W5 (read-only forecast ingestion); L5 W6 (demand plan authoring + MRP push).

**Acceptance evidence.** EDI 830 rolling forecast correctly supersedes prior version.
Manual override preserved with audit trail. Approved Demand Plan visible in C3 MRP demand.

### CAP-C1-11 — Order Hold Handling

**Purpose.** Place and release all hold types (credit, engineering, quality, recall, customs)
with correct SM-1 state management and authority enforcement.

**Lifecycle.** Hold placed (automated or manual by authorized role; creates Order Hold record).
SM-1 → on_hold[type]. All mutations blocked. Notifications sent. Hold reviewed.
Release authorized (role-specific: Finance for CREDIT, Engineering Lead for ENGINEERING,
Quality Lead for QUALITY, Recall Team for RECALL). SM-1 resumes from prior state.

**Decision points.** Multiple simultaneous holds possible. Each hold type has independent
release authority. SO remains on_hold until ALL active holds released.

**Wave target.** L4 W4; L5 W5.

**Acceptance evidence.** Dual-hold scenario: SO on both CREDIT and QUALITY hold. Confirm:
releasing CREDIT hold does not release QUALITY hold; SO remains blocked until both released.

### CAP-C1-12 — Customer Concession Workflow

**Purpose.** Process customer acceptance of a known nonconformance in delivered or
about-to-be-delivered goods. Link concession to NC Case, Lot, and SO.

**Lifecycle.** Initiated by Quality Lead when NC disposition is `use-as-is` and item destined
for a customer order. Concession record drafted (description, affected lots, acceptance
conditions, validity period). Customer review (sent to customer contact). Customer accepts
(Customer Concession Acceptance Record created; customer signature reference stored).
Concession filed against SO line; lot marked `concession_accepted`. Reviewed on next CSR
review cycle.

**Integration.** Linked to D5 Inspect to Disposition and D7 Document to Release.
Concession acceptance is a prerequisite for SO line to proceed to ship when NC is open.

**Wave target.** L4 W7; L5 W7.

**Acceptance evidence.** Concession record traceable to NC Case and Lot. Ship transition in
SM-1 validates concession_accepted flag before allowing ship when open NC exists on lot.

---

## 5. Workflows the Domain Participates In

Primary participant:
- D1 Order to Cash (§C1 owns every step from SO creation through invoice and close)
- D11 Release to Trace (shipment creates genealogy edge)
- D12 Complaint to Recall (complaint lifecycle; recall evaluation)

Supporting participant:
- D2 Procurement to Pay (when customer-driven sourcing or customer-consigned material)
- D3 Plan to Produce (confirmed SOs drive MPS/MRP demand)
- D5 Inspect to Disposition (customer concession workflow)
- D7 Document to Release (CSR documentation requirements gate shipment)

---

## 6. APIs the Domain Exposes (per E4)

```
Customer Master API          GET /customers/{id}; PATCH /customers/{id};
                             POST /customers; GET /customers/{id}/sites;
                             GET /customers/{id}/contacts; GET /customers/{id}/csrs

Quotation API                POST /quotes; GET /quotes/{id}; POST /quotes/{id}/submit;
                             POST /quotes/{id}/accept; POST /quotes/{id}/convert

Customer PO API              POST /cpos (intake + idempotency); GET /cpos/{id};
                             POST /cpos/{id}/validate; POST /cpos/{id}/convert;
                             GET /cpos/{id}/discrepancies

Sales Order API              POST /sales-orders; GET /sales-orders/{id};
                             POST /sales-orders/{id}/release;
                             POST /sales-orders/{id}/holds;
                             DELETE /sales-orders/{id}/holds/{hold_type};
                             POST /sales-orders/{id}/ship; POST /sales-orders/{id}/invoice;
                             POST /sales-orders/{id}/close

Shipment API                 GET /shipments/{id}; POST /shipments/{id}/ship;
                             POST /shipments/{id}/documents;
                             GET /shipments/{id}/documents

Invoice API                  GET /invoices/{id}; POST /invoices/{id}/send;
                             POST /invoices/{id}/payment

Complaint API                POST /complaints; GET /complaints/{id};
                             POST /complaints/{id}/classify;
                             PATCH /complaints/{id}/investigation;
                             POST /complaints/{id}/close

RMA API                      POST /rmas; POST /rmas/{id}/authorize;
                             POST /rmas/{id}/receive; PATCH /rmas/{id}/disposition;
                             POST /rmas/{id}/credit

Pricing API                  GET /pricing/resolve (query: customer_id + item_id + quantity);
                             POST /pricing-catalogs; POST /pricing-overrides

Demand API                   POST /forecasts/ingest; GET /demand-plans/{id};
                             POST /demand-plans/{id}/approve

Customer 360 API             GET /customers/{id}/360 (read-only projection: orders, shipments,
                             invoices, complaints, RMAs, forecasts in one response)
```

All endpoints: idempotency via `Idempotency-Key` header. Rate limit: 600 req/min per tenant.
SLO: p99 < 500 ms for reads; p99 < 2 s for mutations. RFC 9457 problem detail on all 4xx.
RBAC: Commercial role = full; Finance role = invoice + payment; Logistics = ship; Quality = hold
+ complaint; Read-only = GET only.

---

## 7. Frontend Surfaces (per F4 + F5)

```
Customer 360 Workspace          Projection: per-customer order, shipment, invoice,
                                 complaint, RMA history. Search + filter by date, status.

Customer Master Record Shell    Authoritative: customer detail; sites tab; contacts tab;
                                 CSR tab; compliance flags; credit status.

Quotation Workspace             Projection: quotes by status (draft, submitted, accepted,
                                 rejected, expired). Win/loss rate metric.

Quotation Record Shell          Authoritative: quote lines; pricing breakdown; revision
                                 history; conversion trail.

Sales Order Workspace           Projection: open orders by status; OTIF risk heatmap;
                                 holds summary; late-risk queue.

Sales Order Record Shell        Authoritative: SO header; lines with allocation status;
                                 hold history; fulfillment progress; SM-1 timeline.

Shipment Workspace              Projection: shipments today/this week; exceptions;
                                 pending ASN.

Shipment Record Shell           Authoritative: shipment detail; manifest; carrier tracking;
                                 document attachments; genealogy link.

Invoice Workspace               Projection: open invoices; aging buckets (30/60/90d);
                                 DSO metric.

Invoice Record Shell            Authoritative: invoice lines; payment history; credit memos.

Complaint Workspace             Projection: open complaints by severity; age; regulatory
                                 reportable flag. SLA breach indicator.

Complaint Record Shell          Authoritative: complaint detail; investigation log;
                                 classification; reportability decision; NC/CAPA links.

RMA Workspace                   Projection: RMA pipeline by status; overdue receipts.

RMA Record Shell                Authoritative: RMA detail; returned lot disposition;
                                 credit status.
```

---

## 8. Cross-Cutting Concerns Instantiation

```
C1 Audit Chain      Every SO mutation, shipment, invoice, complaint classification,
                    and hold placement/release logged with actor, timestamp, before/after.

C3 i18n / l10n      Customer-facing data: address per country format; currency per
                    customer_currency; date/time per customer time zone (IANA zone code
                    stored per Customer Site).

C4 Tenant Isolation Customer data strictly per-tenant; no cross-tenant Customer ID leaks
                    in any API response.

C5 Idempotency      CPO intake idempotent on (customer_id, cpo_number). SO release endpoint
                    idempotent via Idempotency-Key header.

C7 Problem Details  RFC 9457 on: credit limit exceeded; item revision mismatch;
                    CSR flag unresolved; batch release gate not passed.

C8 Observability    Per-route SLO trace. OTIF metric emitted per SO close. Complaint SLA
                    breach alert at T-2h.
```

---

## 9. Wave Assignments

```
Customer Master + Site + Contact    L4 W4;  L5 W5
Quote (QUO)                         L4 W4;  L5 W5
Customer PO (CPO)                   L4 W4;  L5 W5
Sales Order (SO)                    L4 W4;  L5 W5
Pricing Catalog + Override          L4 W4;  L5 W5
Customer Order Forecast             L4 W5;  L5 W6
Demand Plan                         L4 W5;  L5 W6
Shipment                            L4 W4;  L5 W5
Invoice                             L4 W5;  L5 W5
Customer Contract + MSA             L4 W4;  L5 W5
Customer Specific Requirement       L4 W4;  L5 W5
Order Hold                          L4 W4;  L5 W5
Customer Complaint                  L4 W7;  L5 W7
RMA                                 L4 W7;  L5 W7
Concession Acceptance Record        L4 W7;  L5 W7
Customer Vigilance Contact (MD)     L4 W8;  L5 W8
Customer DSCSA Trading Partner      L4 W8;  L5 W8
```

---

## 10. Standards Governing This Domain (clause-level)

```
ISO 9001:2015    §8.2 (customer-related processes: req determination; review; changes)
                 §8.2.4 (changes to requirements for products and services)
                 §9.1.2 (customer satisfaction monitoring)

IATF 16949:2016  §8.2.1 (customer communication; customer satisfaction)
                 §8.2.2.1 (customer-directed sources of external supply)
                 §10.2 (nonconformity and corrective action — complaint handling)
                 Automotive CSR framework (OEM-specific: Ford Q1, GM BIQS, VW Group)

21 CFR Part 803  §803.50 (manufacturer 30-day MDR), §803.53 (5-day report)
                 Complaint handling implicitly per 21 CFR 820.198

EU MDR 2017/745  Article 87 (serious incident 15-day notification)
                 Article 89 (trend reporting)
                 EUDAMED Article 100 (registration of complaints)

ICH E2B(R3)      ICSR exchange format (structure of adverse event electronic report)
                 Applies at Pharma pack (J1)

DSCSA 21 USC §360eee  Drug Supply Chain Security Act — trading partner verification,
                      transaction information, transaction history (applies J1)

UCC / GS1        EDI 850 (PO), 810 (invoice), 856 (ASN), 830 (forecast), 862 (schedule),
                 860 (PO change); GS1 GTIN, GLN, SSCC

GDPR / CCPA      Customer PII (legal_name, contact data, signed_by fields) subject to
                 data subject rights; retention per H5 §5.2; deletion per right-to-erasure
                 after contractual retention period
```

---

## 11. Boundary with Adjacent Domains

- **D-02 Product & Engineering**: SO line references item_id + item_revision_id from C2.
  ECO changes to an item revision trigger customer notification when CSR requires advance notice.
  Engineering hold on SO sourced from C2 Engineering Lead.

- **D-03 Planning & Production**: Confirmed SOs feed MRP as demand. Demand Plan from C1
  is primary unconstrained demand input. ATP dates from C3 are surfaced in quote lead-time
  validation.

- **D-05 Inventory & Logistics**: Shipment consumes specific lot inventory. Allocation at SO
  commit creates hard reservation in C5. FEFO allocation order enforced per customer CSR when
  csr.allocation_method = FEFO.

- **D-07 Quality**: Customer complaints feed NC investigation (C7). Quality holds halt shipment
  via SM-1. BREL gate (SM-10) gates ship for regulated lots. Concession acceptance links to
  C7 NC Case disposition.

- **D-08 Traceability**: Every shipment writes a genealogy edge from (lot_id, shipment_id,
  customer_id) enabling backward recall traceability. DSCSA transaction information submitted
  at ship for Pharma pack.

- **D-11 Finance**: Invoice generation is a joint boundary: SO confirms commercial terms;
  Finance posts AR and manages payment. Pricing is C1-owned; cost is C11-owned.

---

## 12. Per-Pack Overlays

### J1 — Pharma

- DSCSA trading partner verification required before first shipment to each distributor.
  Verification must be current (not expired). System blocks shipment if last_verified_at
  is null or > 365 days.
- Transaction information (TI) and transaction history (TH) generated at ship event per
  21 USC §360eee. Format: EPCIS SGTIN-96 or human-readable per dispenser type.
- ICSR complaint path: complaints involving adverse drug reactions generate SM-ICSR workflow
  (M4 pack SM table). ICH E2B(R3) XML generated for EMA / FDA submission.
- Serialization: SO line with serialized items requires EPCIS commissioning event before ship.

### J2 — Automotive

- CSR per OEM customer loaded in §2.13 CSR registry. Ford Q1 §4.2.3 (complaint 8D response
  SLA: 24h containment), GM BIQS §6 (PPAP required before first production shipment),
  Stellantis CS.00013 (Customer-Specific IATF requirements).
- Every automotive customer complaint with D/TGR > 0 must open an 8D investigation (SM-8D).
  SM-8D disciplines D1-D8 tracked with customer-visible status.
- PPAP submission (SM-PPAP) must reach customer_approved before first production shipment.
  SM-1 release gate includes PPAP gate when customer.regulatory_class = AUTOMOTIVE.

### J3 — Aerospace

- ITAR-controlled customer: Customer.regulatory_class = AERO_ITAR. ITAR Access SM
  (SM-ITAR-ACCESS) must be in state `authorized` before technical data shared. Customer
  contact granted export license number recorded.
- Customer-specific packaging requirements (e.g. AS9003) enforced via CSR §2.13.
- Counterfeit risk: for items sourced under AS5553/AS6174, CoC (Certificate of Conformance)
  from original manufacturer must be attached to shipment. Shipment blocked if CoC missing
  when item.counterfeit_risk = HIGH.
- AS9102 FAI: first shipment of a new item requires FAI completion (SM-FAI = approved)
  before ship gate passes.

### J4 — Medical Device

- Customer Vigilance Contact (§2.19) required for each EU/US market customer.
- Serious incident complaints trigger EU MDR Article 87 reportability evaluation within
  classification step. System generates Vigilance Report draft with EUDAMED-required fields
  pre-filled from complaint record.
- UDI on shipment: each SO line for an implantable or active device must include UDI-DI + UDI-PI
  on shipment manifest (FDA 21 CFR 830; EU MDR Annex VI Part C).
- DHR cross-link: ship event writes a reference to the Device History Record (DHR) for the lot.
  DHR must be in status `complete` before batch_release_gate passes.

### J5 — Food & Beverage

- FSMA §204 trace event: ship event writes PTI (product traceability information) record:
  TLC (traceability lot code), location, date, quantity per FDA 21 CFR 1.1336.
- Customer-specific allergen documentation: if item.allergen_flags non-empty, allergen
  statement must be on packing slip per customer CSR.
- HACCP customer complaint: complaints citing foreign material, undeclared allergen, or
  pathogen automatically routed to Food Safety Lead with 24h triage SLA.

---

## 13. Failure Modes Catalog

| Failure | Trigger | Impact | Recovery |
|---|---|---|---|
| Duplicate CPO intake | EDI 850 sent twice | Duplicate SO risk | Idempotency key on (customer_id, cpo_number); second intake creates discrepancy event, not new CPO |
| Credit hold not auto-released | Payment posted to wrong AR account | SO stuck in on_hold[CREDIT] indefinitely | Finance Lead manual release with approval override; root cause: AR reconciliation |
| Pricing Override expired but applied | Price resolution bug | Customer billed wrong price | Pre-ship pricing audit report; override expiry check at SO commit, not just at quote |
| CSR flag unresolved at ship | New CSR added after SO created | Shipment blocked | CSR flag re-evaluation triggered at ready_to_ship; commercial team resolves with customer |
| BREL gate not cleared at ship | Batch release delayed | SO blocked at ready_to_ship | Quality Lead escalation path; root cause in production or inspection flow |
| Customer complaint not classified within SLA | Triage staff shortage | Regulatory SLA breach | Auto-escalation at T-12h to Quality Lead; at T-20h to Regulatory Affairs |
| EDI 856 ASN failure | Integration endpoint down | Customer ERP not updated | Retry queue with exponential backoff (5 attempts); fallback to email notification to customer contact |
| Genealogy edge not written | Ship event partial failure | Recall traceability gap | Compensating transaction: ship event is two-phase (inventory consume + genealogy write); rollback if second phase fails |

---

## 14. KPIs

| KPI | Formula | Target | Measurement Method |
|---|---|---|---|
| OTIF (On-Time In-Full) | (SOs shipped on_or_before promised_ship_date with correct qty) / total SOs shipped | ≥ 95% monthly | Auto-computed per SO close: actual_ship_date ≤ promised_ship_date AND qty_shipped = qty_ordered |
| Quote Win Rate | accepted_quotes / (accepted + rejected) quotes in period | ≥ 35% | Monthly report; per sales rep and per customer segment |
| CPO-to-SO Cycle Time | median(so.created_at − cpo.intake_timestamp) | < 4 hours for EDI; < 24h for manual | P50 per channel, measured rolling 30d |
| SO Fulfillment Cycle | median(so.shipped_at − so.released_at) | Per item lead time SLA | Per item family; vs. routing standard time |
| Complaint Triage SLA | % complaints with classification within 24h (critical: 4h) | 100% triage within SLA | Per SM-12 transition timestamp; breach alert at T-2h |
| DSCSA Verification Rate | DSCSA trading partners verified and current / total | 100% | Daily check: trading_partner.last_verified_at < 365d |
| Credit Hold Duration | median duration of on_hold[CREDIT] per SO | < 2 business days | Hold placed_at to released_at per hold record |
| DSO (Days Sales Outstanding) | (AR balance / total revenue) × 30 | < 45 days | Monthly; computed from invoiced vs. closed SOs |

---

## 15. RACI — Key Process Steps

| Step | Commercial Lead | Finance Lead | Quality Lead | Logistics Lead | Engineering Lead |
|---|---|---|---|---|---|
| Quote submit + internal review | A/R | C | C | C | C |
| CPO validation + conversion | R/A | C | − | − | − |
| Credit check at SO submit | I | A/R | − | − | − |
| SO release gate check | R | C | C | − | C |
| Shipment execution + ASN | C | − | I | A/R | − |
| Invoice generation + send | I | A/R | − | − | − |
| Complaint triage + classification | I | − | A/R | − | − |
| Concession workflow | C | − | A/R | − | C |
| RMA authorization | A/R | C | C | − | − |

(R = Responsible; A = Accountable; C = Consulted; I = Informed)

---

## 16. Decision Phrase

```
S2-01_C1_C2_COMMERCIAL_ENGINEERING_DEEP_UPGRADE_COMPLETE
```

After emit: load `S2-02_C3_C4_PLANNING_PROCUREMENT.md` next.
