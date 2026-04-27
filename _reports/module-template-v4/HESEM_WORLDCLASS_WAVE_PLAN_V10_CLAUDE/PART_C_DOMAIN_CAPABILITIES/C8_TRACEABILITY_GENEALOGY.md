# C8 — Traceability & Genealogy

**Version:** V10 Deep Upgrade  
**Prompt source:** S2-05_C8_C9_TRACE_MAINTENANCE  
**Supersedes:** V9 C8_TRACEABILITY_GENEALOGY.md  

---

## 1. Domain Purpose and Boundaries

C8 owns the chain connecting raw material to finished product to customer, and the authority to release a lot for shipment. It answers three questions that regulators, customers, and recall coordinators ask:

1. **What is this lot made of?** (upstream genealogy — ingredients, supplier lots, components)
2. **Where did this lot go?** (downstream genealogy — which customer orders, which shipped units)
3. **Is this lot authorized to ship?** (BREL evidence chain)

C8 is a read-heavy, append-mostly domain. Genealogy edges are written at production events (C6) and never mutated afterward. BREL records progress through a linear lifecycle and are immutable once released. Recall scope identification is a traversal query over the genealogy graph, not a recomputed table.

The Operational Truth Graph (OTG, Part B3) is the physical substrate of C8's genealogy. Every `GENEALOGY` edge in the OTG is projected here as a Lot Genealogy Edge resource. The `mv_otg_genealogy_upstream` materialized view pre-computes depth-limited ancestor chains for query performance.

**Domain boundaries:**

| Boundary | C8 owns | C8 consumes | C8 produces |
|---|---|---|---|
| Upstream | — | WO completion events from C6; PO receipt from C4; Stock moves from C5 | — |
| Downstream | — | — | BREL release signal to C1 (shipment unblock); recall scope to C7; serialization data to trading partners (DSCSA/EU FMD) |
| Excluded | Lot creation, stock moves, quality disposition (those are C5/C7) | — | — |

---

## 2. Resource Families

### 2.1 Core Genealogy Resources

**Lot Genealogy Edge**

| Field | Type | Notes |
|---|---|---|
| edge_id | UUID PK | Immutable |
| parent_lot_id | UUID FK | Ingredient / component lot |
| child_lot_id | UUID FK | Output lot |
| wo_id | UUID FK | Work order that consumed parent to produce child |
| wo_op_id | UUID FK | Specific operation at which consumption occurred |
| qty_consumed | DECIMAL(18,6) | Quantity of parent consumed |
| uom | VARCHAR(10) | |
| consumption_type | ENUM | direct, co_product, by_product, rework_input |
| created_at | TIMESTAMPTZ | Immutable — set at WO operation completion |
| site_id | UUID FK | |

Genealogy edges are strictly append-only. No update or delete. A correction (e.g., wrong lot consumed) is handled by voiding the WO operation and re-executing — which creates a corrective edge and a void record referencing the original edge_id.

**Genealogy Snapshot**

| Field | Type | Notes |
|---|---|---|
| snapshot_id | UUID PK | |
| lot_id | UUID FK | Root of the snapshot |
| direction | ENUM | upstream, downstream, both |
| depth | SMALLINT | Max traversal depth captured |
| captured_at | TIMESTAMPTZ | |
| edge_count | INTEGER | Total edges in snapshot |
| node_ids | UUID[] | All lot_ids reachable |
| compressed_graph | BYTEA | Serialized adjacency structure (gzip) |
| trigger | ENUM | brel_release, recall_initiation, on_demand, scheduled |

Snapshots are taken automatically at BREL release and recall initiation so that the genealogy as-of-release is preserved even if subsequent production moves change the graph structure.

**Serial Number**

| Field | Type | Notes |
|---|---|---|
| serial_id | UUID PK | |
| serial_number | VARCHAR(60) | |
| item_id | UUID FK | |
| lot_id | UUID FK | |
| status | ENUM | active, shipped, returned, scrapped, recalled, itar_controlled |
| manufactured_at | DATE | |
| site_id | UUID FK | |
| customer_id | UUID FK | nullable — set at shipment |
| udi_di | VARCHAR(60) | nullable — J4 MD |
| udi_pi | VARCHAR(60) | nullable — J4 MD, the production identifier portion |
| dscsa_serial | VARCHAR(20) | nullable — J1 Pharma DSCSA serial number |
| itar_controlled | BOOLEAN | |
| sllp_record_id | UUID FK | nullable — J3 Aero service-life-limited |

### 2.2 Batch / Build Release

**BREL — Batch/Build Release Record**

*(Primary record defined in C7 CAP-C7-10; C8 owns the evidence chain assembly and the release authority gate.)*

| Field | Type | Notes |
|---|---|---|
| brel_id | UUID PK | |
| lot_id | UUID FK | |
| batch_number | VARCHAR(60) | |
| product_id | UUID FK | |
| genealogy_snapshot_id | UUID FK | Taken at release initiation |
| evidence_chain | JSONB | Full assembled evidence — see §2.2.1 |
| release_packet_id | UUID FK | nullable — set when packet generated |
| status | ENUM | initiated, review_in_progress, pending_release, released, rejected, on_hold |
| released_by | UUID FK | BD-1 human required |
| released_at | TIMESTAMPTZ | |
| rejection_reason | TEXT | |

**§2.2.1 Evidence Chain Structure**

The `evidence_chain` JSONB captures a snapshot of all gate results at the time of release review. Each gate is an object with `{gate, status, evidence_refs, evaluated_at}`. Gates:

| Gate | Source | Pass Condition |
|---|---|---|
| `inspection_pass` | C7 Inspection records | All required inspections for this lot in `accepted` status |
| `open_nc_zero` | C7 NC records | Zero open NCs for this lot_id with `block_release = true` |
| `capa_status` | C7 CAPA records | No CAPAs in `investigation` or `action_in_progress` status for this product/lot |
| `training_compliance` | C10 Training | All production operators for this WO have current training |
| `calibration_valid` | C9 Calibration | All measurement equipment used for this batch has current, passing calibration |
| `deviation_closed` | C7 Deviation (J1) | Zero open deviations for this batch |
| `ebr_released` | C6 EBR (J1) | EBR status = `released` |
| `stability_current` | C7 Stability (J1) | Shelf-life supported by current stability data |
| `validation_fresh` | C9 Validation | All critical process equipment in `validated` status |
| `coa_approved` | Lab results | Certificate of Analysis reviewed and approved |

**Release Packet**

| Field | Type | Notes |
|---|---|---|
| release_packet_id | UUID PK | |
| brel_id | UUID FK | |
| generated_at | TIMESTAMPTZ | |
| generated_by | UUID FK | |
| document_refs | JSONB | array of {document_type, doc_id, version, file_id} |
| signature | VARCHAR(512) | SHA-256 HMAC of packet content (tamper-evident) |
| watermark | VARCHAR(100) | generation timestamp + requestor embedded |
| retention_class | ENUM | standard, regulated_pharma, regulated_md, regulated_food |
| expires_at | TIMESTAMPTZ | null for permanent retention classes |

The packet bundle includes: BREL evidence chain summary, genealogy snapshot, CoA, EBR (J1), inspection records, deviation records (J1), QP declaration (J1 EU), PRRC decision (J4), batch disposition letter, and a machine-readable JSON summary for API consumers.

### 2.3 Recall Resources

**Recall Record**

*(Primary record in C7 CAP-C7-19; C8 owns the genealogy-driven scope identification.)*

| Field | Type | Notes |
|---|---|---|
| recall_id | UUID PK | Cross-ref C7 |
| scope_lot_ids | UUID[] | Auto-populated from downstream genealogy traversal |
| scope_serial_ids | UUID[] | For serialized products |
| scope_customer_ids | UUID[] | Customers who received affected lots |
| downstream_snapshot_id | UUID FK | Genealogy snapshot at recall initiation (forward traversal) |
| affected_units | INTEGER | Total units in scope |
| scope_classified_by | UUID FK | BD-20 human required |

### 2.4 Serialization Pack Resources

**DSCSA Transaction Set (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| dscsa_tx_id | UUID PK | |
| transaction_type | ENUM | sale, dispensation, return, recall, suspect_report |
| trading_partner_id | UUID FK | Verified trading partner (C4 Supplier or C1 Customer) |
| product_ndc | VARCHAR(20) | |
| lot_number | VARCHAR(60) | |
| serial_numbers | VARCHAR[] | DSCSA serialized units in this transaction |
| quantity | INTEGER | |
| transaction_date | DATE | |
| ti_document_id | UUID | Transaction Information document |
| th_document_id | UUID | Transaction History document |
| ts_document_id | UUID | Transaction Statement document |
| epcis_event_id | VARCHAR(80) | EPCIS event reference |
| status | ENUM | pending, transmitted, acknowledged, disputed |
| transmitted_at | TIMESTAMPTZ | |

**DSCSA Serialized Unit**

| Field | Type | Notes |
|---|---|---|
| dscsa_unit_id | UUID PK | |
| gtin | VARCHAR(14) | |
| serial_number | VARCHAR(20) | |
| lot_number | VARCHAR(20) | |
| expiration_date | DATE | |
| product_id | UUID FK | |
| status | ENUM | commissioned, shipped, dispensed, decommissioned, suspect, recalled |
| commissioned_at | TIMESTAMPTZ | |
| decommissioned_at | TIMESTAMPTZ | |
| decommission_reason | ENUM | dispensed, returned, recalled, destroyed, stolen |
| saleable_unit_serial | VARCHAR(20) | Case or pallet serial for aggregation |

**EU FMD Pack-Level Decommissioning (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| fmd_decom_id | UUID PK | |
| pack_serial | VARCHAR(30) | 2D data matrix encoded serial |
| gtin | VARCHAR(14) | |
| batch_number | VARCHAR(60) | |
| expiry_date | DATE | |
| national_medicines_verification_system | VARCHAR(50) | NMVS endpoint (country-specific) |
| decommission_type | ENUM | supply, recall, free_samples, destruction, export |
| decommissioned_at | TIMESTAMPTZ | |
| verification_response | JSONB | NMVS response payload |
| status | ENUM | active, decommissioned, recalled, expired |

**UDI per Device (J4 Medical Device)**

| Field | Type | Notes |
|---|---|---|
| udi_record_id | UUID PK | |
| serial_id | UUID FK | C8 Serial Number |
| device_id | UUID FK | |
| udi_di | VARCHAR(60) | Device Identifier — from C2 Item master |
| udi_pi | VARCHAR(60) | Production Identifier: lot + serial + mfg_date + expiry_date |
| label_format | ENUM | gs1_128, hibc, gs1_datamatrix |
| gudid_submitted | BOOLEAN | FDA GUDID submission status |
| gudid_submitted_at | TIMESTAMPTZ | |
| eudamed_submitted | BOOLEAN | EU EUDAMED submission |
| eudamed_submitted_at | TIMESTAMPTZ | |
| carrier_type | ENUM | barcode, rfid, direct_part_mark |
| applied_at_wo_id | UUID FK | WO where label was applied |

**FSMA §204 KDE/CTE (J5 Food)**

| Field | Type | Notes |
|---|---|---|
| fsma204_record_id | UUID PK | |
| cte_type | ENUM | harvesting, cooling, initial_packing, first_receiver, shipping, receiving, transformation |
| kde_set | JSONB | Key Data Elements per CTE type per FDA §204 rule (traceability lot code, quantity, unit of measure, location description, date) |
| lot_id | UUID FK | |
| trading_partner_id | UUID FK | |
| event_date | DATE | |
| location_description | TEXT | |
| traceability_lot_code | VARCHAR(60) | FSMA §204 TLC |
| reference_document_type | VARCHAR(60) | BOL, PO, invoice |
| reference_document_id | VARCHAR(60) | |
| retained_at | TIMESTAMPTZ | Records retained ≥ 2 years |

**Aero S/N Traceability + SLLP Trace (J3 Aerospace)**

| Field | Type | Notes |
|---|---|---|
| aero_trace_id | UUID PK | |
| serial_id | UUID FK | |
| part_number | VARCHAR(40) | |
| drawing_revision | VARCHAR(10) | |
| fai_id | UUID FK | linked First Article Inspection |
| original_manufacturer | VARCHAR(100) | for AS9120B distributor traceability |
| material_cert_id | UUID FK | material certification document |
| heat_number | VARCHAR(30) | for material traceability to mill cert |
| nadcap_process_records | JSONB | array of {process_type, cert_id, performed_at} |
| itar_export_controlled | BOOLEAN | |
| itar_export_authorization | VARCHAR(60) | license number if exported |
| sllp_life_data | JSONB | current accumulated / remaining per life-limit type |

**Auto Per-VIN Traceability (J2 Automotive)**

| Field | Type | Notes |
|---|---|---|
| vin_trace_id | UUID PK | |
| vin | VARCHAR(17) | Vehicle Identification Number |
| customer_id | UUID FK | OEM customer |
| customer_so_line_id | UUID FK | C1 SO line |
| components_installed | JSONB | array of {item_id, lot_id, serial_id, installed_at_plant, install_date} |
| recall_scope_flag | BOOLEAN | set if any component_lot recalled |
| ppap_records | UUID[] | PPAP submission IDs for components |
| build_date | DATE | |

---

## 3. Genealogy Query Specification

### 3.1 Depth-20 Upstream Query

The upstream genealogy query traverses `lot_genealogy_edge` starting from a target `lot_id` following `child_lot_id → parent_lot_id` until either depth 20 or no more edges exist.

**PostgreSQL CTE approach (canonical):**

```sql
WITH RECURSIVE upstream(lot_id, depth, path, cycle_guard) AS (
  -- Anchor: target lot
  SELECT :target_lot_id, 0, ARRAY[:target_lot_id]::uuid[], false

  UNION ALL

  -- Recursive: find parents
  SELECT
    e.parent_lot_id,
    u.depth + 1,
    u.path || e.parent_lot_id,
    e.parent_lot_id = ANY(u.path)   -- cycle guard per axiom A14
  FROM lot_genealogy_edge e
  JOIN upstream u ON e.child_lot_id = u.lot_id
  WHERE NOT u.cycle_guard
    AND u.depth < 20
)
SELECT DISTINCT lot_id, MIN(depth) AS min_depth
FROM upstream
GROUP BY lot_id
ORDER BY min_depth;
```

Cycles are theoretically impossible (OTG axiom A14 enforces DAG structure) but the guard is present for defensive correctness.

**Performance envelope:** With `lot_genealogy_edge(child_lot_id)` B-tree index and `mv_otg_genealogy_upstream` materialized view refreshed on edge insert, depth-20 upstream queries complete in < 50ms for lots with up to 10,000 edges in their ancestry.

### 3.2 mv_otg_genealogy_upstream Materialized View

The view pre-computes the full upstream ancestor set for every lot currently in the system using an incremental refresh strategy. Structure:

| Column | Type | Notes |
|---|---|---|
| lot_id | UUID | Child (descendant) |
| ancestor_lot_id | UUID | Any ancestor at any depth |
| min_depth | SMALLINT | Shortest path distance |
| max_depth | SMALLINT | Longest path distance (for M:N fan-in) |
| edge_count | INTEGER | Number of paths connecting them |
| last_computed | TIMESTAMPTZ | |

Refresh is triggered by `lot_genealogy_edge` insert via a pg_notify channel; the background worker processes refreshes in batches of ≤ 500 new edges. Stale-read tolerance: 30 seconds. For recall scope identification, the system falls back to the live recursive CTE if the MV refresh age exceeds 5 minutes.

### 3.3 Forward (Downstream) Genealogy

Downstream traversal follows `parent_lot_id → child_lot_id`. Used for recall scope identification. The same recursive CTE pattern applies with parent/child reversed. Downstream depth is typically shallower (3–5 levels: raw material → intermediate → finished → customer shipment) but may reach depth 10 in complex process industries.

---

## 4. Capabilities

### CAP-C8-01 — Lot Genealogy Edge Automatic Creation

Every WO Operation completion in C6 that consumes one or more input lots and produces an output lot fires an event that creates Lot Genealogy Edges in C8. The edge creation is transactional with the yield record write — if the edge insert fails, the yield record rolls back. M:N relationships are fully supported: one output lot may have multiple parent lots (multi-component assembly); one parent lot may produce multiple output lots (batch splitting).

Edge creation is idempotent per `(parent_lot_id, child_lot_id, wo_op_id)` — duplicate events from retry or at-least-once delivery are rejected with a unique constraint violation, not duplicated.

### CAP-C8-02 — mv_otg_genealogy_upstream Materialized View

The materialized view pre-computes full upstream genealogy for every lot in the system. It enables sub-50ms recall scope queries over millions of lot relationships. The refresh worker consumes edge-insert notifications from the OTG event stream and applies incremental updates. During a refresh, read queries fall through to the live CTE; the transition is transparent to callers. View freshness is exposed via `GET /api/v1/genealogy/mv-status` for monitoring.

### CAP-C8-03 — BREL with Full Evidence Chain

BREL is initiated automatically when a WO transitions to `completed` and the output lot qualifies for release review. The system auto-populates the evidence chain by querying each gate in sequence (§2.2.1). Any gate returning `fail` blocks progression to `pending_release`; the specific failing gate and its evidence refs are returned in the 422 response body. The release authority (BD-1) reviews the assembled chain and signs; the system records the e-signature token and moves the BREL to `released`. A genealogy snapshot is captured at initiation and another at release, preserving the graph state at both timepoints.

### CAP-C8-04 — Recall Scope Identification (Forward + Backward Genealogy)

When a recall is initiated (C7 CAP-C7-19), C8 computes recall scope in two directions:

- **Backward (upstream):** identifies all supplier lots and raw materials that went into the affected lot — for root cause tracing and supplier notification
- **Forward (downstream):** identifies all finished lots, shipments, and customer orders that contain the affected lot — for customer notification and recovery

The forward traversal walks `mv_otg_genealogy_upstream` in reverse plus the C1 SO → shipment → customer chain. The resulting scope_lot_ids, scope_serial_ids, and scope_customer_ids are written to the Recall Record and exposed via `GET /api/v1/recall/{id}/scope`. Scope computation completes within 60 seconds for lots with up to 100,000 affected descendants.

### CAP-C8-05 — Release Packet Generator and Signed Bundle

On BREL release, the Release Packet generator assembles all evidence documents into a signed bundle. The signature is SHA-256 HMAC over the canonical JSON serialization of the evidence chain. The watermark embeds: generated_at, generated_by, brel_id, lot_id, and a nonce. The packet is stored in the Document Storage service and linked to the BREL record. `GET /api/v1/brel/{id}/release-packet` returns the bundle with Content-Disposition for download. The packet format is version-stamped; older formats remain accessible via the archive service for retention period compliance.

### CAP-C8-06 — DSCSA TI/TH/TS Exchange (J1 Pharma)

For US pharma shipments, the system generates Transaction Information (TI), Transaction History (TH), and Transaction Statement (TS) documents per DSCSA 21 CFR Part 582 (effective November 2023 serialization requirements). TI captures product identifier + lot + serial + quantity + trading partner. TH is the full chain of custody back to the original manufacturer. TS is the statement that each prior transaction was with an authorized trading partner. Documents are transmitted via EPCIS 2.0 over AS2 or HTTPS/XML per trading partner agreement. Acknowledgment failures trigger retry with exponential backoff up to 72 hours, then alert to the logistics team.

The system maintains a Verified Trading Partner registry (C4 Supplier and C1 Customer sides) — `DSCSA Transaction Set.trading_partner_id` must reference a verified partner; otherwise the transmission is blocked with a 422.

### CAP-C8-07 — EU FMD Pack-Level Decommissioning (J1 Pharma)

For EU-destined medicinal products, each saleable pack carries a 2D Data Matrix encoding GTIN + serial + batch + expiry per Delegated Regulation 2016/161. Before or at the point of supply to a hospital/pharmacy, the system calls the national medicines verification system (NMVS) to decommission the pack. The NMVS response (verified/already decommissioned/unknown) is stored in `fmd_decom.verification_response`. Packs that return `unknown` trigger a pharmacovigilance alert. Decommissioned packs cannot be re-commissioned. Pack status is queryable in real-time; EU FMD compliance dashboard shows decommissioning rate by batch.

### CAP-C8-08 — UDI Generation, GUDID, and EUDAMED Submission (J4 MD)

For each medical device serial number, the system generates the UDI per FDA 21 CFR Part 830 (GS1 or HIBCC format based on issuing agency configured in Item master). The UDI-DI is derived from the Item's GTIN (registered in the GUDID database). The UDI-PI encodes lot number, serial number, manufacturing date, and expiry date per the label format. UDI is applied to the device label at the WO labeling step in C6. After application, the system submits device record updates to GUDID via the FDA GUDID API and to EUDAMED via the EU EUDAMED API. Submission acknowledgment is stored; failure triggers retry queue.

For Reusable devices: UDI is applied to the device itself (direct part marking) and the association between the physical device and the UDI record is maintained in the Serial Number resource. If a device is refurbished, the refurbishment event is logged and, if the refurbishment changes the device significantly, a new UDI-PI is generated.

### CAP-C8-09 — FSMA §204 KDE/CTE Capture (J5 Food)

For foods on the FDA Food Traceability List (FTL), the system captures Key Data Elements (KDEs) at each Critical Tracking Event (CTE): harvesting, cooling, initial packing, first receiver, shipping, receiving, and transformation. The KDE set per CTE is defined by 21 CFR Part 204.170 and configured per item category. Traceability Lot Codes (TLCs) are assigned at first packing and propagated through subsequent CTEs. The system supports FDA-required two-hour recall response: given a TLC, the system returns all CTEs for that lot and all trading partners in the forward chain within 2 hours. Records are retained for ≥ 2 years per 21 CFR §204.210.

### CAP-C8-10 — Per-VIN Traceability (J2 Automotive Tier-1)

For automotive Tier-1 suppliers, every component shipped for a specific vehicle build is linked to the vehicle's VIN through the customer SO line. The system records which lot and serial of each item was installed on which VIN. This enables: customer recall delineation (which VINs are affected), warranty investigation (which production lot and shift produced the part), and OEM portal integration (VIN-level traceability data exported on demand). PPAP records for each component are linked to the VIN trace for audit purposes.

### CAP-C8-11 — Aero Serial Number and SLLP Chain Traceability (J3 Aerospace)

For aerospace parts, the traceability chain records: original manufacturer, material heat number linked to mill certificate, all NADCAP special processes (with cert IDs), FAI approval, and ITAR export authorization if applicable. For Service-Life-Limited Parts (SLLPs, tracked in C6), C8 provides the full service history view: every installation, removal, WO, and accumulated life event across the part's lifetime. AS9120B distribution traceability requirements are met by recording the original manufacturer's certificate of conformance alongside the distributor's shipment records.

---

## 5. Per-Pack Overlays

| Pack | C8 additions |
|---|---|
| **J1 Pharma** | DSCSA TI/TH/TS exchange; EU FMD decommissioning; BREL requires QP Declaration; Release Packet includes EBR + QP Declaration + CoA; genealogy includes API lot + excipient lot edges; DSCSA Serialized Unit per saleable unit |
| **J2 Automotive** | Per-VIN traceability; PPAP records linked at BREL; genealogy includes sub-assembly components per BOM revision; VIN recall scope computation |
| **J3 Aerospace** | Serial + heat number + mill cert + NADCAP cert chain; SLLP full service history; ITAR/EAR export records in serial trace; FAI linked to first-article serial; AS9120B distributor chain |
| **J4 Medical Device** | UDI per serial; GUDID + EUDAMED submission; BREL requires PRRC Decision + DHR completeness; genealogy includes component UDID for combination devices |
| **J5 Food** | FSMA §204 KDE/CTE per CTE type; TLC propagation; 2-hour recall trace capability; allergen control plan linked at genealogy transformation CTE |

---

## 6. State Machine Cross-References

BREL lifecycle is SM-10 (defined in C7 §3 SM-10). Recall lifecycle is SM-11 (defined in C7 §3 SM-11). C8 does not define new state machines — it is the evidence-assembly and query layer for those lifecycles.

---

## 7. Failure Modes

| Failure | Detection | Recovery |
|---|---|---|
| MV refresh lag > 5 minutes | Background monitor checks `mv_otg_genealogy_upstream.last_computed` | API falls back to live recursive CTE; alert fires to ops team |
| DSCSA EPCIS transmission failure | ACK timeout after 72h | Alert to logistics team; manual transmission via DSCSA portal; holds shipment dispatch in C1 until transmission confirmed |
| EU FMD NMVS returns `unknown` | Verification response parsing | Pharmacovigilance alert triggered; pack withheld from supply; C7 NC created |
| BREL evidence gate returns `fail` on valid lot | Gate logic error or stale data | Full gate re-evaluation on demand; gate audit log shows evaluated_at timestamps; manual override requires QA director e-sig with documented rationale |
| Recall scope computation timeout | > 60s for query | Async job submitted; scope delivered via push notification when complete; interim status = `computing` |

---

## 8. KPIs

| KPI | Target | Measurement |
|---|---|---|
| Genealogy depth-20 query latency (MV warm) | < 50ms p99 | Prometheus histogram |
| Genealogy depth-20 query latency (MV stale, live CTE) | < 5s p99 | |
| BREL evidence chain auto-population success rate | ≥ 99% | Gates returning data / total BRELs initiated |
| Release Packet generation time | < 30s | |
| DSCSA EPCIS transmission success (first attempt) | ≥ 98% | |
| EU FMD decommissioning success | 100% | NMVS verified / total packs supplied |
| FSMA §204 two-hour recall trace | ≤ 2h | Recall trace time measured in mock recall |

---

## 9. Standards

| Standard | Clause | Capability |
|---|---|---|
| 21 CFR Part 211 | §211.165 Batch release | CAP-C8-03 |
| EU GMP Annex 16 | QP certification | CAP-C8-03 (QP declaration in evidence chain) |
| DSCSA 21 CFR Part 582 | Serialized dispensing requirements | CAP-C8-06 |
| EU FMD Delegated Regulation 2016/161 | Pack decommissioning | CAP-C8-07 |
| 21 CFR Part 830 / 21 CFR Part 801 | UDI for devices | CAP-C8-08 |
| EU MDR 2017/745 Art 27 | UDI system | CAP-C8-08 |
| 21 CFR Part 204 | FSMA Food Traceability | CAP-C8-09 |
| GS1 EPCIS 2.0 | DSCSA event exchange | CAP-C8-06 |
| AS9120B | Distribution traceability | CAP-C8-11 |
| ITAR 22 CFR §120-130 | Export controlled serial tracking | CAP-C8-11 |
| ISA-95 Part 2 | Operational genealogy | CAP-C8-01/02 |

---

## 10. Cross-References

| Domain | Reference |
|---|---|
| C4 Procurement | Supplier lot is the anchor parent in upstream genealogy; DSCSA trading partner verification |
| C5 Inventory | Lot status drives BREL gate; stock move events contribute genealogy edges |
| C6 Shopfloor | WO operation completion creates genealogy edges; serial numbers assigned at WO labeling step |
| C7 Quality | BREL evidence chain gates (inspection, NC, CAPA, deviation, EBR); Recall Record scope |
| C9 Maintenance | Calibration validity gate in BREL evidence chain |
| C10 Workforce | Training compliance gate in BREL evidence chain |
| C1 Commercial | Shipment unblock on BREL release; customer notification on recall |

---

*Decision phrase: S2-05_C8_C9_TRACE_MAINTENANCE_DEEP_UPGRADE_COMPLETE (partial — C9 follows)*
