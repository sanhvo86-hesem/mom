# C5 — Inventory & Logistics (V10)

```
domain_code:             D-05
domain_name:             Inventory & Logistics
owner_role:              Logistics Lead (Quality Lead for quarantine; Production Lead for WIP;
                         Regulatory Affairs for DSCSA/FSMA/ITAR)
primary_state_machines:  Lot Lifecycle (informal); Quarantine State (inline transitions)
root_count:              18 (including pack-specific families)
capability_count:        12
wave_maturity_target:    L5 by W5 (Lot/Stock Move/Reservation core);
                         L5 by W7 (Serial); L5 by W8 (pack-specific)
part_c_version:          V10
```

---

## 1. Purpose

The Inventory & Logistics domain maintains the authoritative account of every piece of
material in the facility: what it is, where it is, how much there is, and what its status is.
The core discipline is that the digital inventory state mirrors the physical state at all times.
When the two diverge, every downstream domain (planning, production, shipment, quality) acts
on incorrect data.

---

## 2. Resource Families — Full Enumeration

### 2.1 Lot (Batch)

The primary traceability unit for all lot-controlled material.

| Field | Type | Semantics | Required | Mutable |
|---|---|---|---|---|
| lot_id | UUID | PK | Y | N |
| lot_number | VARCHAR(50) | unique per item per tenant | Y | N |
| item_id | FK → Item (C2) | | Y | N |
| item_revision_id | FK → Item Revision | revision in effect at lot creation | Y | N |
| lot_type | ENUM | PURCHASED\|MANUFACTURED\|RETURNED\|REWORK\|MIXED | Y | N |
| status | ENUM | quarantine\|available\|reserved\|allocated\|in_wip\|shipped\|scrapped\|rejected | Y | SM-controlled |
| quantity | DECIMAL(14,4) | total quantity created | Y | N |
| quantity_available | DECIMAL(14,4) | computed: quantity − reserved − allocated − consumed | Y | computed |
| quantity_on_hand | DECIMAL(14,4) | computed: quantity − shipped − scrapped − rejected | Y | computed |
| uom | VARCHAR(10) | | Y | N |
| origin_prec_id | FK → PREC (C4) | null for manufactured lots | N | N |
| origin_jo_id | FK → JO (C6) | null for purchased lots | N | N |
| supplier_lot_number | VARCHAR(50) | as stated on CoC or label | N | N |
| expiry_date | DATE | nullable; populated when item.shelf_life_days set | N | N |
| manufacturing_date | DATE | nullable | N | N |
| concession_accepted | BOOLEAN | customer concession granted for this lot | N | Y |
| concession_id | FK → C1 Concession Record | | N | Y |
| itar_controlled | BOOLEAN | J3; lot contains ITAR-classified material | N | N |
| itar_license_number | VARCHAR(50) | J3; nullable | N | Y |
| created_at | TIMESTAMPTZ | | Y | N |
| created_by | USER_ID | | Y | N |
| tenant_id | UUID | | Y | N |

Lifecycle: quarantine → available (on IQC pass or QA release) → reserved (allocation) →
allocated (hard-reserved for job/SO) → in_wip (issued to production) → shipped (consumed
by SO) | scrapped | rejected.

### 2.2 Serial

Unique identifier for a single physical unit (high-value or regulated items: MD devices,
aerospace serialized parts, serialized drug units).

| Field | Type | Semantics | Required | Mutable |
|---|---|---|---|---|
| serial_id | UUID | PK | Y | N |
| serial_number | VARCHAR(100) | unique per item per tenant | Y | N |
| item_id | FK → Item (C2) | | Y | N |
| lot_id | FK → Lot | parent batch | Y | N |
| status | ENUM | created\|in_production\|completed\|shipped\|scrapped\|returned\|decommissioned | Y | SM-controlled |
| current_location_id | FK → Bin/Location | | Y | Y |
| udi_pi | VARCHAR(100) | MD pack: production identifier (lot+expiry or serial+mfg date) | N | N |
| shipped_at | TIMESTAMPTZ | nullable | N | system |
| customer_id | FK → C1 Customer | nullable; set at shipment | N | system |
| so_line_id | FK → C1 SO Line | nullable | N | system |
| sllp_id | FK → SLLP Record (C6) | nullable; Aero service-life-limited parts | N | N |
| created_at | TIMESTAMPTZ | | Y | N |

### 2.3 Bin / Location

Physical storage location within a site. ISA-95 Level 2 material storage unit.

| Field | Type | Semantics | Required |
|---|---|---|---|
| location_id | UUID | PK | Y |
| site_id | FK → Site | | Y |
| zone_id | FK → Zone | | Y |
| location_code | VARCHAR(20) | human-readable barcode label; unique per site | Y |
| location_type | ENUM | RECEIVING\|STORAGE\|PICKING\|STAGING\|QUARANTINE\|WIP\|SHIPPING\|REJECT\|KANBAN | Y |
| capacity_qty | DECIMAL(10,2) | maximum capacity in capacity_uom | N |
| capacity_uom | VARCHAR(10) | | N |
| is_quarantine_zone | BOOLEAN | material in this location auto-quarantined | Y |
| temperature_class | ENUM | AMBIENT\|CONTROLLED_2_8C\|FROZEN_MINUS_20\|FREEZER_MINUS_80\|ULTRA_COLD | Y |
| itar_restricted | BOOLEAN | J3: only itar_controlled lots allowed | N |
| allergen_dedicated | VARCHAR[] | J5: allergen codes exclusively processed here | N |
| status | ENUM | active\|inactive\|locked | Y |

Zone (parent grouping): zone_id, site_id (FK), zone_code (VARCHAR 20), zone_name,
zone_type (ENUM: RM|WIP|FG|QC|DISPATCH|BONDED|ITAR), is_clean_room (BOOLEAN),
iso_class (INTEGER nullable — ISO 14644 cleanliness class), status.

### 2.4 Stock Move

The atomic, immutable inventory transaction. All inventory changes are Stock Moves.
No direct edits to quantity are permitted; corrections are compensating Stock Moves
of type REVERSAL.

| Field | Type | Semantics | Required |
|---|---|---|---|
| move_id | UUID | PK | Y |
| move_number | VARCHAR(20) | unique per tenant | Y |
| move_type | ENUM | RECEIPT\|ISSUE\|TRANSFER\|ADJUSTMENT\|SCRAP\|SHIP\|RETURN\|REVERSAL | Y |
| item_id | FK → Item | | Y |
| lot_id | FK → Lot | | Y |
| serial_id | FK → Serial | nullable | N |
| quantity | DECIMAL(14,4) | positive = inbound; negative = outbound | Y |
| uom | VARCHAR(10) | | Y |
| from_location_id | FK → Location | null for RECEIPT | N |
| to_location_id | FK → Location | null for SHIP/SCRAP | N |
| reference_type | ENUM | PO\|SO\|JO\|CYCLE_COUNT\|MANUAL\|RMA | Y |
| reference_id | UUID | FK to reference record | Y |
| posted_by | USER_ID | | Y |
| posted_at | TIMESTAMPTZ | | Y |
| is_reversal | BOOLEAN | true for compensating transactions | Y |
| reversed_move_id | FK → move_id | null when is_reversal=false | N |
| idempotency_key | VARCHAR(64) | prevents duplicate post | Y |
| tenant_id | UUID | | Y |

On-hand quantity for any lot is computable as `SUM(quantity) WHERE lot_id = ?` across all
Stock Moves at any point in time. Immutable: posted_at and posted_by cannot change after
insert.

### 2.5 Adjustment

Reconciliation of physical count vs digital count. Generates a Stock Move of type ADJUSTMENT.

Fields: adjustment_id, adjustment_number (VARCHAR 20, unique), adjustment_type
(ENUM: PHYSICAL_COUNT|DAMAGE|EXPIRY|SYSTEM_ERROR|REWORK_GAIN), item_id (FK), lot_id (FK),
location_id (FK), quantity_before (DECIMAL 14,4), quantity_after (DECIMAL 14,4),
delta (DECIMAL 14,4, computed), reason_code (VARCHAR 50), reference_cc_id
(FK → Cycle Count, nullable), approved_by (USER_ID), approved_at (TIMESTAMPTZ),
move_id (FK → Stock Move, created when posted), created_by, created_at.

Approval threshold (configurable per tenant): adjustments above threshold require
Finance Lead + Logistics Lead dual approval.

### 2.6 Cycle Count

Periodic inventory accuracy verification per location or ABC class.

| Field | Type | Semantics | Required |
|---|---|---|---|
| cc_id | UUID | PK | Y |
| cc_number | VARCHAR(20) | unique per tenant | Y |
| location_id | FK → Location | | Y |
| cc_date | DATE | | Y |
| count_method | ENUM | ABC_ROTATION\|TARGETED\|FULL_WALL_TO_WALL\|RANDOM | Y |
| status | ENUM | planned\|in_progress\|complete\|approved | Y |
| counted_by | USER_ID | | N |
| approved_by | USER_ID | | N |
| accuracy_pct | DECIMAL(5,2) | computed: (lines_no_variance / total_lines) × 100 | N |
| created_at | TIMESTAMPTZ | | Y |

Cycle Count Line (sub-record): cc_line_id, cc_id (FK), item_id, lot_id (nullable),
system_qty (DECIMAL 14,4, snapshot at cc_date), counted_qty (DECIMAL 14,4), variance
(DECIMAL 14,4, computed), variance_pct (DECIMAL 5,2), variance_disposition
(ENUM: accepted|investigate|adjust), adjusted (BOOLEAN).

### 2.7 Cycle Count Variance

Investigation and disposition record for count lines with unacceptable variance.

Fields: variance_id, cc_id (FK), cc_line_id (FK), item_id, lot_id, system_qty, counted_qty,
variance (DECIMAL 14,4), variance_reason (TEXT), investigation_notes (TEXT),
adjustment_id (FK → Adjustment, nullable — set when variance reconciled),
status (ENUM: open|investigating|adjusted|written_off), created_at.

### 2.8 Reservation

Soft allocation of a specific lot (or generic lot) to a future demand. Prevents
double-allocation.

| Field | Type | Semantics | Required |
|---|---|---|---|
| reservation_id | UUID | PK | Y |
| item_id | FK → Item | | Y |
| lot_id | FK → Lot | null for generic (any available lot); specific for hard reserve | N |
| location_id | FK → Location | null for any location | N |
| quantity_reserved | DECIMAL(14,4) | | Y |
| uom | VARCHAR(10) | | Y |
| source_type | ENUM | SO\|JO\|TRANSFER\|MANUAL | Y |
| source_id | UUID | FK to source record | Y |
| lot_selection_method | ENUM | FEFO\|FIFO\|SPECIFIC\|MANUAL | Y |
| reserved_by | USER_ID | | Y |
| reserved_at | TIMESTAMPTZ | | Y |
| expires_at | TIMESTAMPTZ | nullable; auto-cancel on expiry | N |
| status | ENUM | active\|consumed\|cancelled\|expired | Y |

FEFO rule: when lot_selection_method = FEFO and lot_id is null, the system assigns the
lot with the earliest expiry_date with sufficient available quantity. If multiple lots
have same expiry, FIFO (earliest lot_id creation date) applies as tiebreaker.

### 2.9 Quarantine State

Active hold on a lot or serial. A lot may have multiple simultaneous quarantine reasons;
all must be released before status → available.

| Field | Type | Semantics | Required |
|---|---|---|---|
| quarantine_id | UUID | PK | Y |
| lot_id | FK → Lot | | Y |
| serial_id | FK → Serial | nullable | N |
| quarantine_reason | ENUM | IQC_HOLD\|NC_HOLD\|RECALL_HOLD\|EXPIRY_WARNING\|ITAR_HOLD\|TEMP_EXCURSION\|MANUAL | Y |
| nc_case_id | FK → C7 NC Case | nullable | N |
| recall_id | FK | nullable | N |
| placed_by | USER_ID | | Y |
| placed_at | TIMESTAMPTZ | | Y |
| released_by | USER_ID | nullable | N |
| released_at | TIMESTAMPTZ | nullable | N |
| release_basis | TEXT | nullable; required when released | N |
| status | ENUM | active\|released\|expired | Y |

Multi-hold rule: lot.status = quarantine persists until ALL active quarantine_state records
for that lot_id have status = released. Released by: IQC_HOLD → Quality role + IQC pass;
NC_HOLD → Quality Lead + NC disposition; RECALL_HOLD → Quality Lead + recall scope assessment.

### 2.10 Concession-Released Lot Flag

Not a separate table. Captured as fields on Lot entity (§2.1): concession_accepted (BOOLEAN),
concession_id (FK → C1 Customer Concession Acceptance Record). When concession_accepted = true,
the lot may proceed to shipment even with an open NC, provided the concession covers the
specific defect. SM-1 ship gate (C1) validates concession_accepted before allowing ship of
lots with open NCs.

### 2.11 DSCSA Transaction + Serialized Unit (Pharma — J1)

**Serialized Unit:**

| Field | Type | Semantics |
|---|---|---|
| su_id | UUID | PK |
| item_id | FK → Item | drug product item |
| lot_id | FK → Lot | |
| serial_id | FK → Serial | nullable; null for lot-level traceability |
| sgtin_96 | VARCHAR(100) | GS1 SGTIN-96 encoding (GTIN-14 + serial number) |
| ndc | VARCHAR(11) | National Drug Code |
| gtin_14 | VARCHAR(14) | |
| lot_number | VARCHAR(50) | as on label |
| expiry_date | DATE | |
| status | ENUM | commissioned\|in_supply_chain\|decommissioned\|recalled |

**DSCSA Transaction:**

| Field | Type | Semantics |
|---|---|---|
| dscsa_txn_id | UUID | PK |
| su_id | FK → Serialized Unit | nullable for lot-level |
| lot_id | FK → Lot | |
| txn_type | ENUM | TI_SHIP\|TI_RECEIVE\|TS_DISPUTE\|VERIFICATION_REQUEST\|SALEABLE_RETURNS |
| from_tp_id | FK → C4 DSCSA Trading Partner (supplier) | |
| to_tp_id | FK → C1 DSCSA Trading Partner (customer) | |
| transaction_date | DATE | |
| epcis_event_ref | VARCHAR(200) | EPCIS event XML reference in file store |
| status | ENUM | draft\|submitted\|acknowledged\|disputed |
| created_at | TIMESTAMPTZ | |

### 2.12 EU FMD Pack-Level Decommissioning (Pharma — J1)

Fields: eu_fmd_decom_id, serial_id (FK → Serial), product_code (VARCHAR 100 — EU product code),
country_code (CHAR 2), decommission_reason
(ENUM: DISPENSE|DESTRUCTION|EXPORT|SAMPLE|STOLEN|LOCKED|RECALLED),
decommission_timestamp (TIMESTAMPTZ), dispensing_site_id (FK → Site),
nmvs_response_code (VARCHAR 20), nmvs_response_status (ENUM: OK|ERROR|ALREADY_DECOMMISSIONED),
created_at (TIMESTAMPTZ).

Decommission is irreversible (terminal state per EU 2016/161). nmvs_response_status = ERROR
triggers retry queue; ALREADY_DECOMMISSIONED is treated as success (idempotent).

### 2.13 FSMA §204 KDE/CTE (Food — J5)

Key Data Elements (KDE) per Critical Tracking Event (CTE) per FDA 21 CFR 1.1336.

| Field | Type | Semantics |
|---|---|---|
| fsma204_id | UUID | PK |
| item_id | FK → Item | must be a §204-listed High-Risk Food (HRF) |
| lot_id | FK → Lot | |
| cte_type | ENUM | SHIPPING\|RECEIVING\|TRANSFORMATION |
| cte_date | DATE | |
| tlc | VARCHAR(100) | Traceability Lot Code — unique identifier for this food lot |
| tlc_source | ENUM | ASSIGNED_BY_HESEM\|SUPPLIER_PROVIDED |
| reference_document | VARCHAR(200) | e.g. Bill of Lading, PO number |
| quantity | DECIMAL(14,4) | |
| uom | VARCHAR(10) | |
| location_id | FK → Location or Supplier Site | location of CTE |
| business_name | VARCHAR(200) | entity conducting the CTE |
| created_at | TIMESTAMPTZ | |

Retention: 2 years per 21 CFR 1.1456. Must be producible within 24 hours of FDA request.

### 2.14 Material Traceability Chain (Aero — J3 per AS9120B)

Not a separate mutation table. The AS9120B traceability chain is a read-only projection
assembled from:
  1. Lot.supplier_lot_number → PREC Line (supplier CoC reference, §2.8 of C4)
  2. Lot → Item (C2) → Drawing Revision
  3. Lot → WO Operation (C6) → work_center_id + operator_id
  4. Lot → Serial → FAI Record (C6)

Query endpoint: `GET /lots/{id}/traceability-chain?standard=AS9120B` returns the full
chain as a nested JSON document. Stored as a materialised view refreshed on each
related mutation.

### 2.15 ITAR Item Control (Aero — J3)

| Field | Type | Semantics | Required |
|---|---|---|---|
| itar_item_id | UUID | PK | Y |
| item_id | FK → Item (C2) | | Y |
| usml_category | VARCHAR(20) | USML Category e.g. "Cat VIII(f)" | Y |
| export_license_required | BOOLEAN | | Y |
| export_license_number | VARCHAR(50) | nullable | N |
| license_expiry | DATE | nullable | N |
| authorized_countries | CHAR(2)[] | ISO 3166-1 alpha-2 list | Y |
| authorized_end_users | TEXT[] | cleared entity names | N |
| last_reviewed_by | USER_ID | | Y |
| last_reviewed_at | TIMESTAMPTZ | | Y |
| status | ENUM | active\|license_expired\|under_review | Y |

Enforcement: lot.itar_controlled = true → lot may only be stored in itar_restricted locations.
Stock Move to non-itar location blocked. PO for ITAR item to foreign entity: export_license_required
check runs at PO send event.

### 2.16 EAR Item Classification (Aero — J3)

Fields: ear_id, item_id (FK → C2), eccn (VARCHAR 20 — Export Control Classification Number),
commerce_control_list_reason (TEXT[] — e.g. ["AT1","NS1"]), license_requirement
(ENUM: NLR|LICENSE|LICENSE_EXCEPTION), license_exception_code (VARCHAR 10, nullable),
last_reviewed_by (USER_ID), last_reviewed_at (TIMESTAMPTZ).

EAR and ITAR are mutually exclusive for a given item (an item is either USML or CCL-controlled,
not both). Dual-use determination: if item has both itar_item and ear record, system flags
for Regulatory Affairs review.

### 2.17 UDI per Device (MD — J4)

| Field | Type | Semantics | Required |
|---|---|---|---|
| udi_id | UUID | PK | Y |
| item_id | FK → Item | | Y |
| lot_id | FK → Lot | | Y |
| serial_id | FK → Serial | nullable for lot-based UDI | N |
| udi_di | VARCHAR(100) | Device Identifier from item.udi_di | Y |
| udi_pi | VARCHAR(100) | Production Identifier: lot+expiry or serial+mfg_date | Y |
| udi_encoded_format | ENUM | GS1_128\|HIBCC\|ICCBBA\|QR | Y |
| udi_label_ref | VARCHAR(500) | DMS reference for the printed label | N |
| issued_at | TIMESTAMPTZ | | Y |
| status | ENUM | issued\|in_supply_chain\|implanted\|disposed | Y |

UDI must be issued before item ships (FDA 21 CFR 830; EU MDR Annex VI). Issued UDI stored in
FDA GUDID / EU EUDAMED via E15 integration.

### 2.18 Item (cross-reference C2)

Item is authoritative in C2. In C5, item_id FK appears on all inventory entities. No
separate inventory-owned Item entity; all item attributes are read from C2. Inventory-specific
view: `GET /inventory/items/{id}` returns C2 item fields plus computed on_hand, reserved,
quarantine quantities.

---

## 3. Capabilities

### CAP-C5-01 — Lot/Serial Lifecycle and Genealogy Edge Creation

**Purpose.** Track lot status through its full lifecycle. Create genealogy edges (parent →
child lot links) at every production consumption and output event for traceability.

**Lot lifecycle transitions.**
quarantine → available (IQC pass or manual QA release; all Quarantine States released).
available → reserved (Reservation created).
reserved → allocated (hard allocation at WO dispatch).
allocated → in_wip (Stock Move ISSUE at operation start).
in_wip → shipped (Stock Move SHIP at SO ship event; genealogy edge to SO).
Any state → scrapped | rejected (Stock Move SCRAP; lot.quantity_available → 0).

**Genealogy edge creation.** At WO completion (C6), for every consumed lot and every
output lot: a genealogy edge is written to C8 Traceability graph:
  `(parent_lot_id, child_lot_id, wo_id, quantity, timestamp)`.
Multi-level genealogy enables backward recall traceability (given a finished lot, find all
input lots to any depth) and forward traceability (given a raw material lot, find all
downstream lots and customer shipments).

**Wave target.** L4 W5; L5 W5.

**Acceptance evidence.** Multi-level genealogy: production job consumes 3 raw material lots;
genealogy chain queryable to depth 5. Recall scenario test: identify all shipped SOs
containing a specific raw material lot.

### CAP-C5-02 — Bin / Location / Zone Management (per ISA-95)

**Purpose.** Manage the physical storage hierarchy (Site → Zone → Location). Enforce
location-level rules: quarantine isolation, temperature class, allergen dedication, ITAR
restriction.

**Lifecycle.** Locations created by Logistics Lead. Status transitions: active (normal use) →
locked (temporary hold; no new moves; e.g. during cycle count) → inactive (decommissioned).
Zone classification changes require Quality Lead approval for regulated zones (clean rooms,
quarantine zones).

**Enforcement.** Stock Move to an allergen_dedicated location blocked if item's allergen profile
does not match. Stock Move to ITAR_restricted location blocked if lot.itar_controlled = false.
QUARANTINE location_type: any lot moved here automatically gains a MANUAL quarantine state.

**Wave target.** L4 W5; L5 W5.

**Acceptance evidence.** Allergen blocking tested: move allergen-free item to peanut-dedicated
location → blocked. ITAR blocking tested: move non-ITAR item to ITAR zone → blocked.

### CAP-C5-03 — Stock Move, Adjustment, and Cycle Count

**Purpose.** Post atomic inventory transactions. Reconcile physical vs system inventory via
cycle count. Issue adjustments with dual-approval above threshold.

**Stock move idempotency.** Every POST /stock-moves requires an idempotency_key. Duplicate
key within 24h returns the original move record (HTTP 200) without creating a duplicate.
This prevents double-counting from network retries.

**Cycle count workflow.** Logistics Lead generates cycle count plan (ABC rotation or targeted).
Location locked during count. Operators scan each lot barcode; counted_qty captured. Variances
> tolerance (configurable: default 1% by value) require investigation. Approved adjustments
post compensating Stock Moves.

**Wave target.** L4 W5 (stock move); L5 W8 (cycle count + adjustment workflow).

**Acceptance evidence.** Idempotency test: same stock move posted twice → one record, second
returns 200 with original. Cycle count locking: stock move to locked location blocked.
Adjustment above threshold: blocked without dual approval.

### CAP-C5-04 — Reservation and Allocation (FEFO + Per-Pack)

**Purpose.** Soft-allocate material to SOs and JOs. Prevent double-allocation. Apply FEFO
for shelf-life items. Apply per-pack rules.

**FEFO logic.** When source_type = SO or JO for a shelf-life item, system auto-assigns the
lot with earliest expiry_date and sufficient available quantity. If no single lot covers
the full quantity, multiple lot reservations created (split reservation). Expiry check:
if earliest available lot expires before SO promised_ship_date, system alerts Logistics Lead
and creates an expedite MRP action in C3.

**Campaign-aware allocation (J1 Pharma).** Lots of the same active ingredient allocated
together to the same campaign run. Cross-campaign allocation blocked unless cleaning cycle
(SM-CLEANING-V) completes between them.

**ITAR allocation (J3 Aero).** Lot.itar_controlled = true: reservation source_id SO must
reference a customer with authorized export clearance. System checks C1 Customer.regulatory_class
= AERO_ITAR and ITAR access record current (SM-ITAR-ACCESS = authorized) before reservation.

**Wave target.** L4 W5; L5 W6 (FEFO with expiry alert); L5 W8 (pack-specific rules).

**Acceptance evidence.** FEFO test: two lots of same item, expiry 30d and 60d; SO reserves
30d lot first. Split reservation: demand 150 units, two lots of 100 available; creates two
reservation records summing to 150. ITAR test: reserve ITAR lot for customer without clearance
→ blocked.

### CAP-C5-05 — Quarantine State Management

**Purpose.** Place and release material holds with multi-hold logic. Enforce that all active
holds are cleared before a lot can return to available.

**Lifecycle.** Each quarantine reason is a separate Quarantine State record. Lot.status =
quarantine when ANY active quarantine state exists. Lot.status = available only when zero
active quarantine states remain.

**Placement triggers.** IQC_HOLD: auto on PREC receipt (every incoming lot starts in
quarantine until IQC passes, unless item is skip-lot configured). NC_HOLD: auto when an NC
case references this lot. RECALL_HOLD: auto when recall scope includes this lot.
TEMP_EXCURSION: auto when cold chain monitoring reports a breach on the lot's storage
location.

**Release authority per reason.** IQC_HOLD: Quality role, IQC inspection PASS.
NC_HOLD: Quality Lead, NC disposition complete. RECALL_HOLD: Quality Lead + Recall team.
ITAR_HOLD: Regulatory Affairs, export license confirmed.

**Wave target.** L4 W3; L5 W5.

**Acceptance evidence.** Multi-hold test: lot with both IQC_HOLD and NC_HOLD; release IQC_HOLD
→ lot.status remains quarantine; release NC_HOLD → lot.status = available. Skip-lot config:
item with skip_lot_frequency=5; every 5th lot skips IQC quarantine.

### CAP-C5-06 — Concession-Release Flag Propagation

**Purpose.** Mark a lot as concession-accepted once a Customer Concession Acceptance Record
(C1) is approved. Allow this lot to proceed to shipment despite an open NC.

**Propagation.** When C1 Concession Record transitions to `accepted`: system sets
lot.concession_accepted = true and lot.concession_id = concession_id for all lot_ids listed
in the concession. C1 SM-1 ship gate (§3 transition 13) validates: if any SO line lot has
an open NC_HOLD, concession_accepted must be true and the concession must be in `accepted`
status and cover the specific NC.

**Wave target.** L4 W7; L5 W7.

**Acceptance evidence.** Lot with open NC and concession_accepted=true: SM-1 ship proceeds.
Lot with open NC and concession_accepted=false: SM-1 ship blocked. Concession scope check:
concession for NC-001 does not apply to NC-002 on same lot → ship blocked.

### CAP-C5-07 — DSCSA TI/TH/TS Capture and Exchange (Pharma — J1, per E15.9)

**Purpose.** Capture DSCSA transaction information (TI) and transaction history (TH) at
every supply chain event (receive, ship). Support saleable returns verification (TS).
Submit via EPCIS/GS1 to trading partners.

**At receipt (PREC).** DSCSA TI received from supplier (EDI 856 with EPCIS payload or
direct API). DSCSA Transaction record created (type=TI_RECEIVE). Lot commissioned as
Serialized Unit (§2.11) for serialized drug products.

**At shipment (C1 ship event).** DSCSA TI generated for downstream trading partner.
DSCSA Transaction record created (type=TI_SHIP). EPCIS event XML generated and sent via
E15.9 integration. lot.status → shipped; Serialized Unit.status → in_supply_chain.

**Saleable returns.** When drug product returned via C1 RMA: Verification Request submitted
to manufacturer verification system. If verified genuine: lot status restored to available.
If verification fails: lot quarantined; suspect counterfeit escalation.

**Wave target.** L4 W8; L5 W8. (J1 Pharma only.)

**Acceptance evidence.** TI receipt: PREC for drug item → DSCSA transaction TI_RECEIVE created
with correct SGTIN-96. TI ship: SO ship → DSCSA TI_SHIP + EPCIS event generated. Saleable
returns: verification failure → lot quarantine + suspect alert.

### CAP-C5-08 — EU FMD Decommissioning at Dispense (Pharma — J1)

**Purpose.** Decommission serialized drug packs at point of dispense or destruction per EU
FMD (EU 2016/161 / EU MDR Annex VII). Submit to NMVS.

**Lifecycle.** At SO ship for EU-market drug product: EU FMD decommission request submitted
per Serial. NMVS response captured. Status = OK: Serialized Unit → decommissioned.
Status = ERROR: retry queue. ALREADY_DECOMMISSIONED: treated as success (idempotent).

**Wave target.** L4 W8; L5 W8. (J1 Pharma only.)

**Acceptance evidence.** Ship event for EU-market serialized drug → decommission record
created + NMVS submitted. ALREADY_DECOMMISSIONED response → no error raised.

### CAP-C5-09 — UDI Capture per Device-Unit (MD — J4, per E15.10)

**Purpose.** Issue, record, and maintain UDI for every medical device lot/serial. Submit to
FDA GUDID and EU EUDAMED via E15.10.

**Issuance.** At lot creation for MD items with udi_di populated: UDI record (§2.17) created.
UDI-DI from item.udi_di; UDI-PI computed from lot_number + expiry_date (or serial_number +
mfg_date for implantables). Label generated per udi_encoded_format.

**Shipment gate.** SM-1 ship transition (C1) validates: for regulated device items, all
serial_ids on the SO line must have a UDI record with status = issued. Missing UDI blocks ship.

**Wave target.** L4 W7; L5 W8. (J4 MD pack only.)

**Acceptance evidence.** Ship gate: MD item SO without UDI → blocked. GUDID submission:
UDI record created → GUDID API call verifiable in integration log.

### CAP-C5-10 — FSMA §204 KDE/CTE Capture (Food — J5, per E15.12)

**Purpose.** Capture Key Data Elements (KDE) at each Critical Tracking Event (CTE) for all
FDA §204-listed High-Risk Foods (HRF): leafy greens, tomatoes, melons, fresh herbs, tropical
tree fruits, cucumbers, peppers, and others per FDA §204 list.

**CTE triggers.** RECEIVING: auto on PREC for §204-listed item. SHIPPING: auto on SO ship
for §204-listed item. TRANSFORMATION: auto on JO completion when a §204-listed item is
an output.

**Traceability Lot Code (TLC) assignment.** If supplier provides TLC: captured from PREC.
If not: HESEM assigns TLC (UUID-based, prefixed with site identifier). TLC is the FDA
§204 traceability anchor.

**24-hour producibility.** System provides `GET /fsma204?tlc=&date=` endpoint that returns
the complete KDE record set for any TLC within 1 second (indexed). Required response SLA: 24h
per FDA request; system delivers in < 1s.

**Wave target.** L4 W8; L5 W8. (J5 Food only.)

**Acceptance evidence.** TLC query test: inject 3-level supply chain KDE records; query TLC of
finished good lot → returns all upstream CTEs within 1 second.

### CAP-C5-11 — AS9120B Lot-to-Heat-to-Coil Traceability (Aero — J3)

**Purpose.** Maintain full CoC chain from original mill heat number to finished part lot for
aerospace raw material (per AS9120B distributor requirements).

**Implementation.** Each PREC line for aerospace raw material carries: supplier_lot_number
(mill heat number), coc_reference (CoC document in DMS from original mill or foundry).
At each production step consuming the raw material lot, the genealogy edge in C8 preserves
the heat number. Query `GET /lots/{id}/traceability-chain?standard=AS9120B` returns:
finished_lot → WIP_lot(s) → raw_material_lot → supplier_lot_number (heat number) → CoC_ref.

**Wave target.** L4 W7; L5 W8. (J3 Aero only.)

**Acceptance evidence.** Multi-level test: mill bar → machined blank → finished part;
query finished part lot → returns heat number and CoC ref within 2 seconds.

### CAP-C5-12 — ITAR / EAR Item Control (Aero — J3)

**Purpose.** Enforce physical and digital controls on ITAR (USML-listed) and EAR (CCL-listed)
items at every inventory movement, storage, and shipment event.

**Controls enforced.** Storage: itar_controlled lots only in itar_restricted zones.
Stock Move: from/to location ITAR compliance check at every move. Reservation: ITAR lots only
reserved for customers with export authorization (SM-ITAR-ACCESS = authorized). Shipment:
export license_number required on ITAR items; validated against authorized_countries and
license_expiry. Cycle count: ITAR zone access logged with auditor identity.

**Wave target.** L4 W7; L5 W8. (J3 Aero only.)

**Acceptance evidence.** Storage check: ITAR lot moved to non-ITAR zone → blocked.
Shipment check: ITAR item to non-authorized country → blocked with RFC 9457 citing ITAR §120.

---

## 4. Workflows the Domain Participates In

Primary participant:
- D4 Receive to Inspect (PREC receipt creates lot in quarantine; IQC result releases)
- D11 Release to Trace (lot genealogy edges are the traceability substrate)

Supporting participant:
- D1 Order to Cash (shipment consumes lot; DSCSA/UDI at ship)
- D3 Plan to Produce (on-hand qty and reserved qty feed MRP netting in C3)
- D5 Inspect to Disposition (disposition creates lot status transitions)
- D10 Batch to Release (BREL checks lot status before release)
- D12 Complaint to Recall (recall scope identified via genealogy reverse query)

---

## 5. APIs (per E4)

```
Lot API              GET /lots/{id}; POST /lots; PATCH /lots/{id}/status (SM-controlled);
                     GET /lots/{id}/genealogy; GET /lots/{id}/traceability-chain

Serial API           GET /serials/{id}; POST /serials; PATCH /serials/{id}/status

Location API         GET /locations/{id}; GET /zones/{id}/locations;
                     POST /locations; PATCH /locations/{id}/status

Stock Move API       POST /stock-moves (Idempotency-Key required); GET /moves/{id};
                     GET /moves?lot_id=&type=&from=&to=

Reservation API      POST /reservations; GET /reservations/{id};
                     POST /reservations/{id}/consume; DELETE /reservations/{id}

Quarantine API       POST /quarantine-states; GET /quarantine-states?lot_id=;
                     POST /quarantine-states/{id}/release

Adjustment API       POST /adjustments; GET /adjustments/{id};
                     POST /adjustments/{id}/approve

Cycle Count API      POST /cycle-counts; GET /cc/{id}; POST /cc/{id}/lines;
                     POST /cc/{id}/approve

DSCSA API            POST /dscsa/transactions; GET /dscsa/transactions?lot_id=;
                     POST /dscsa/verification-requests

UDI API              POST /udi-records; GET /udi-records?lot_id=;
                     POST /udi-records/{id}/submit-gudid

FSMA 204 API         POST /fsma204/cte; GET /fsma204?tlc=&date=

ITAR API             GET /itar-items/{item_id}; PATCH /itar-items/{id}
```

SLO: stock move post p99 < 200 ms; lot genealogy query p99 < 2 s (depth ≤ 10).
Idempotency-Key required on all POST /stock-moves. RFC 9457 on all 4xx.
RBAC: Logistics = full; Quality = quarantine + adjustment; Finance = adjustment approve;
Regulatory = DSCSA + UDI + ITAR read/write.

---

## 6. Frontend Surfaces

```
Inventory Workspace        Projection: on-hand by item/lot/location; quarantine queue;
                            expiry alert (< 30d remaining). FEFO aging chart.

Lot Record Shell           Authoritative: lot header; stock move history; quarantine states;
                            reservation status; genealogy link; pack-specific: UDI (MD),
                            SGTIN (Pharma), TLC (Food), heat number (Aero).

Quarantine Workspace       Projection: all quarantined lots by reason; age; releasing
                            authority queue.

Cycle Count Workspace      Projection: scheduled counts; in-progress; variance queue.

Warehouse Task Workspace   Projection: today's tasks per operator (put-away, pick, transfer,
                            count). Barcode scan to complete.

DSCSA Dashboard (Pharma)   Projection: TI/TH submission status; verification pending;
                            saleable returns queue.

FSMA 204 Workspace (Food)  Projection: CTEs by date; HRF lots on hand; TLC search.

ITAR Control Workspace (Aero) Projection: ITAR lot locations; license expiry; movement log.
```

---

## 7. Cross-Cutting Concerns

```
C1 Audit Chain    Every stock move, quarantine placement/release, reservation, and
                  adjustment posted with actor, timestamp, reference. Immutable.

C5 Idempotency    Stock move POST idempotent via Idempotency-Key; DSCSA decommission
                  idempotent (ALREADY_DECOMMISSIONED treated as success).

C6 Concurrency    Two operators cannot pick the same serial simultaneously.
                  Optimistic lock: serial.status check at pick time; 409 Conflict if
                  already allocated.

C8 Observability  Lot on-hand accuracy metric (target: ≥ 99.5%). Quarantine age alerts.

C10 Retention     Lot records per regulated class: MD pack ≥ 5 years beyond device lifetime;
                  Pharma per 21 CFR 211.180 (1 year beyond drug product expiry, min 3 years);
                  Aero per AS9100D retention schedule; FSMA §204 records 2 years.
```

---

## 8. Wave Assignments

```
Lot + Serial                L4 W5; L5 W5 (Lot); L5 W7 (Serial)
Bin/Location/Zone           L4 W5; L5 W5
Stock Move                  L4 W5; L5 W5
Adjustment                  L4 W5; L5 W8 (dual-approval workflow)
Cycle Count + Variance      L4 W8; L5 W8
Reservation                 L4 W5; L5 W5 (FEFO); L5 W8 (pack rules)
Quarantine State            L4 W3; L5 W5
Concession Flag             L4 W7; L5 W7
DSCSA (J1)                  L4 W8; L5 W8
EU FMD (J1)                 L4 W8; L5 W8
UDI (J4)                    L4 W7; L5 W8
FSMA §204 (J5)              L4 W8; L5 W8
ITAR/EAR (J3)               L4 W7; L5 W8
AS9120B Chain (J3)          L4 W7; L5 W8
```

---

## 9. Standards (clause-level)

```
ISO 9001:2015    §8.5.4 (preservation of outputs: identification, handling,
                 contamination control, packaging, storage, transmission)

IATF 16949:2016  §8.5.4 (preservation; FEFO for perishable); §8.5.6.1 (traceability)

21 CFR 211       §211.122 (labeling controls); §211.142 (warehousing; temperature);
                 §211.150 (distribution records); §211.180 (record retention: 1yr + expiry)

21 CFR 117       §117.135 (holding and distribution of human food; FSMA)

DSCSA 21 USC §360eee  §360eee-1 (product identifier requirement);
                      §360eee-3 (verification at receipt); §360eee-4 (saleable returns)

21 CFR 1.1336    FSMA §204 KDE requirements; CTE definitions; TLC assignment

EU 2016/161      Articles 11-19 (verification, decommissioning, alerts);
                 NMVS integration requirements

21 CFR 830       UDI system: §830.3 (definitions); §830.50 (direct marking)
EU MDR Annex VI  UDI assignment; labeling requirements; EUDAMED submission

AS9120B:2016     Aerospace distributor traceability: CoC chain from OEM to end customer

ITAR 22 CFR 120-130  USML categories; export licensing; storage and access controls

EAR 15 CFR 730-774   ECCN classification; license requirements; license exceptions
```

---

## 10. Decision Phrase

```
S2-03_C5_C6_INVENTORY_SHOPFLOOR_DEEP_UPGRADE_COMPLETE
```
