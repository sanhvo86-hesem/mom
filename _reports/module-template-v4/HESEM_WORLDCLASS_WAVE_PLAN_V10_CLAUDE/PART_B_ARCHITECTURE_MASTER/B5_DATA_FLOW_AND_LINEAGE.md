# B5 — Data Flow and Lineage

**Version:** V10-Deep  
**Status:** Authoritative  
**Replaces:** V9 B5 (four-plane summary without lineage model or PII control)  
**Cross-references:** B3 (OTG), B6 C5, B8 (CDC), C8 (traceability), E5, E6, I7 §9, M3, M4

---

## §1 W3C PROV-DM Lineage Model

HESEM's data lineage is formally modelled using the W3C PROV Data Model (PROV-DM),
which defines three core concepts — Entity, Activity, and Agent — and a set of
directed relationship types. This is not an academic mapping: every data product
in HESEM has an explicit provenance statement that is recorded in the OTG (B3) and
queryable via the audit API (E6).

### 1.1 Entities

PROV-DM Entities map to authoritative roots in M3. Each entity is a versioned snapshot
of an authoritative root at a specific `root_revision`. Examples:

- LOT entity: the physical or logical lot with its current state, quantity, and attributes.
- BATCH_RECORD entity: the electronic batch record at a specific revision.
- INSPECTION_RESULT entity: the result set for a specific inspection event.
- DISPOSITION entity: the disposition decision record.
- AI_ADVISORY entity: an advisory recommendation emitted by the AI advisory layer (per L3 §2).

Each entity is represented as an `otg_node` with `node_kind = <root_family>` and `root_revision`.
The `wasGeneratedBy` relationship maps to OTG predicate PRODUCED_LOT, COMMITTED, or the relevant
production predicate. Entity versions are chained via the `predecessor_hash` on `otg_node` and the
SUPERSEDED_BY predicate (P-20).

### 1.2 Activities

PROV-DM Activities map to state-machine transitions (B4) and CDC events (B8). An activity
takes one or more entities as inputs, transforms them, and generates output entities.

- `STATE_MACHINE_TRANSITION` activity: every SM-1..SM-14 transition is an activity with
  `startTime = transition_initiated_at`, `endTime = transition_committed_at`.
- `CDC_PROJECTION_REFRESH` activity: the MV refresh triggered by a CDC event; inputs = OTG events;
  outputs = updated materialised view snapshot.
- `ANALYTICAL_TRANSFORM` activity: dbt or equivalent transform that produces a derived data product
  from the projection plane.
- `AI_INFERENCE` activity: an AI advisory engine inference run; inputs = workspace projection snapshot
  + contextual entities; output = AI_ADVISORY entity.

Activities are recorded as `otg_event` rows of kind `EDGE_ASSERTED` for the predicates TRIGGERED_BY
and COMMITTED.

### 1.3 Agents

PROV-DM Agents map to principals in the identity layer (E1) and authority layer (E2). Agents are
responsible for activities.

- `HUMAN_PRINCIPAL` agent: a natural person with an identity record in E1; acts via ACTED_BY and
  SIGNED_BY predicates (P-05, P-04).
- `SERVICE_PRINCIPAL` agent: an automated service (e.g. MES step sequencer, scheduled job);
  acts via ACTED_BY with `principal_kind = SERVICE`.
- `AI_SERVICE_PRINCIPAL` agent: an AI advisory engine; constrained to advisory mutations only (Tier-3
  authority per B2); banned from any BD-classified activity (axiom A-05).
- `TENANT_PRINCIPAL` agent: the tenant organisation as an entity; used in wasAttributedTo for
  cross-tenant audit.

### 1.4 Core Lineage Relationships (PROV-DM to OTG Mapping)

| PROV-DM Relationship | OTG Predicate | Semantic |
|---|---|---|
| wasGeneratedBy(entity, activity) | PRODUCED_LOT, COMMITTED | Entity was created by an activity |
| wasDerivedFrom(entity, entity) | GENEALOGY, DERIVED_FROM, SOURCED_FROM | Entity was derived from prior entity |
| wasAttributedTo(entity, agent) | AUTHORED_BY, RELEASED_BY, SIGNED_BY | Entity is attributed to a specific agent |
| wasAssociatedWith(activity, agent) | ACTED_BY, ON_BEHALF_OF | Agent was associated with an activity |
| used(activity, entity) | CONSUMED_LOT, VALIDATES, GOVERNS | Activity used an entity as input |
| hadMember(collection, entity) | PART_OF, LINKED | Collection contains an entity |
| wasInformedBy(activity, activity) | TRIGGERED_BY | One activity was informed by another |

The PROV-DM graph is queryable via E6 audit queries and MV-04 `mv_audit_trail_by_record`.
Full lineage from a finished product back to raw material origins (multi-level PROV-DM chain)
is supported by the MV-01 / MV-02 genealogy views (B3 §5).

### 1.5 Per-Tenant Isolation

Every PROV-DM entity, activity, and agent carries `tenant_id`. The lineage graph is
partitioned by tenant — no cross-tenant lineage relationships exist except through
explicit inter-company agreement nodes (B3 axiom A-07). The wasAttributedTo relationship
never crosses tenant boundaries for Tier-1 regulated entities.

---

## §2 Data Flow Paths Per Data Class

### 2.1 Authoritative Root Data (Regulated)

**Flow path:**

1. **Source:** Human principal (L6 / E1 authenticated session) or MES sensor (L9 OT, per B1 L9).
2. **Producer service (L4):** Domain root service (e.g. `LotService`, `InspectionService`) validates command against L2 authority, executes SM transition, writes domain entity tables.
3. **Persistence (L5):** OTG node/edge/event written in same Postgres transaction. Outbox event written for cross-service integration.
4. **CDC (B8):** pgoutput replication captures entity table and OTG table changes; relays to RabbitMQ via L8 outbox relay (< 60s SLO-13).
5. **Projection (E5):** MV-05 `mv_workspace_projection_feed` updated; workspace subscription notified (< 5s SLO-5).
6. **Consumer (L6/L7):** HMV4 workspace receives updated projection via WebSocket push; API consumers query via E5 workspace endpoint.
7. **Cross-region:** Postgres logical replication to secondary region (< 60s SLO-13); MVs rebuilt from replicated event stream.
8. **Cross-tenant boundary:** Strictly prohibited; `tenant_id` bound at every layer.

### 2.2 Evidence / Audit Data (Immutable)

**Flow path:**

1. **Source:** Every SM transition side-effect; OTG axiom check result; signature event.
2. **Producer (L4/L3):** Audit event emitted synchronously within the SM transition transaction.
3. **Persistence (L5):** `otg_event` row + H4 audit event row written in same transaction.
4. **CDC:** MV-04 `mv_audit_trail_by_record` updated via CDC (< 5s SLO-5).
5. **Projection:** Audit events available to E6 audit trail API within 1 minute of write.
6. **Daily anchor:** At 00:30 UTC, Merkle anchor batch commits all unanchored events to `audit_chain_anchor`; TSA timestamp token obtained (per B3 §8.3).
7. **WORM export:** Monthly partition exported to WORM storage at age > 30 days (per B3 §12.3).
8. **Cross-region:** Replicated; anchor hash verified across regions daily.
9. **Cross-tenant:** Audit events are per-tenant; vendor-side L8 telemetry never includes customer audit content.

### 2.3 Telemetry Data (Hot / Warm / Cold Tiering)

**Flow path:**

1. **Source:** Application instrumentation (OpenTelemetry traces, metrics, logs) from L1..L9 services; L9 OT sensors (B1 L9).
2. **Producer (L8):** OpenTelemetry collector receives OTLP data.
3. **Persistence:**
   - Hot (< 2 weeks): in-memory TSDB (e.g. VictoriaMetrics); query latency < 10ms.
   - Warm (2 weeks – 6 months): compressed Parquet in object storage; query latency < 5s.
   - Cold (> 6 months): deep archival tier; query by request only.
4. **Projection:** Grafana dashboards query hot tier; SLO burn rate dashboards query warm tier.
5. **Consumer:** On-call engineers, SRE dashboards, SLO alerting.
6. **Cross-region:** Aggregated vendor telemetry is cross-region at L8; per-tenant telemetry remains per-region.
7. **Cross-tenant:** Anonymised aggregate metrics only at vendor level.

### 2.4 AI Advisory Data

**Flow path:**

1. **Source:** AI advisory engine (L3 §2); inputs are workspace projection snapshots and contextual entities from L5.
2. **Producer (L3):** AI advisory command handler writes ADVISORY_EMIT event; creates AI_ADVISORY entity node in OTG.
3. **Persistence (L5):** Advisory entity stored with `principal_kind = AI_SERVICE`; PRODUCED_BY edge points to AI_SERVICE_PRINCIPAL agent.
4. **Lineage:** Every advisory carries lineage to its input entities via PROV-DM `used(advisory_activity, input_entities)` — the "what data fed this advisory" query.
5. **Consumer (L6/L7):** Advisory presented to human principal in workspace; human must explicitly accept/reject/ignore.
6. **Audit:** Every advisory emit, accept, and reject is an OTG event and H4 audit event.
7. **AI cannot commit banned decisions:** axiom A-05 enforced; AI advisory output is Tier-3 authority at most.

### 2.5 Integration / Partner Exchange Data

**Flow path:**

1. **Source:** External partner systems (DSCSA trading partner, OEM EDI, EU FMD authority).
2. **Inbound:** L7 API gateway receives partner event; L3 integration saga validates and processes.
3. **Persistence (L5):** OTG outbox event consumed and matched to internal lot/serial; OTG edge asserted (e.g. DSCSA_EXCHANGED_WITH).
4. **Outbound:** L8 outbox relay publishes outbox_event to partner endpoint; at-least-once delivery with retry.
5. **Error handling:** Failed partner deliveries go to `integration_dead_letter_queue`; L8 alert; retry with exponential backoff.
6. **Cross-tenant:** Inter-company agreements enable controlled cross-tenant edges (B3 §9); all other cross-tenant exchange rejected.

---

## §3 Data Classification Taxonomy

Every data item in HESEM is tagged with exactly one primary classification and zero or more secondary flags. Classification determines retention floor, encryption tier, redaction rules, and region residency.

| Classification | Description | Retention Floor | Encryption | Redaction Rule |
|---|---|---|---|---|
| `AUTHORITATIVE_REGULATED` | Regulated authoritative records (lot, batch record, inspection, signature) | 10y (pharma/MD); 5y (food/auto) | AES-256 at rest; TLS 1.3 in transit | Never deleted; PII fields redacted-by-default for non-owners |
| `AUTHORITATIVE_GENERAL` | Non-regulated authoritative records (SO, PO, JO) | 7y (statutory) | AES-256 at rest | Standard business retention |
| `PROJECTION_REBUILDABLE` | Materialised views, workspace projections | No minimum; rebuild from OTG | AES-256 at rest | Same as source classification |
| `TELEMETRY_HOT` | Metrics and traces < 2 weeks old | 14 days | TLS in transit; unencrypted at rest in TSDB | Auto-expire; no PII in telemetry |
| `TELEMETRY_WARM` | Metrics and traces 2 weeks – 6 months | 6 months | AES-256 compressed Parquet | Auto-expire |
| `TELEMETRY_COLD` | Long-term telemetry archive | 3y (operational analytics) | AES-256 | By request |
| `AUDIT_IMMUTABLE` | OTG events, audit trail, Merkle anchors | 10y minimum (regulated) | AES-256 + WORM | Never deleted; immutable |
| `PII` | Personal data (names, email, phone, signatures) | Per GDPR/local law | AES-256; field-level encryption for sensitive fields | Redacted-by-default; erasure per H5 §6 |
| `PHI` | Protected Health Information (HIPAA; subset of PII) | Minimum 6y (HIPAA) | FIPS 140-3 for HIPAA-scoped tenants | De-identified on export; BAA required |
| `CUI` | Controlled Unclassified Information (NIST 800-171) | Per authorisation | FIPS 140-3 | Access restricted to cleared personnel |
| `ITAR_CONTROLLED` | ITAR-regulated technical data (J3 Aero) | Per EAR/ITAR | FIPS 140-3; US-only region | Access restricted to US persons; export authorisation required |
| `SUB_PROCESSOR` | Data processed by approved sub-processors (per L2 §8 + I8) | Per DPA | Sub-processor SCC/DPA governs | Sub-processor data processing agreement |

Secondary flags (may apply to any classification): `ENCRYPTED_IN_TRANSIT_ONLY`, `GDPR_DATA_SUBJECT`, `SCHREMS_II_RESTRICTED`, `PACK_SPECIFIC`.

---

## §4 Lineage Query Patterns

The following canonical lineage query patterns are supported by the OTG graph, the materialised views, and the E6 audit API.

### 4.1 "Which lots fed this batch?" (Backward Genealogy)

- **OTG query path:** Backward walk from BATCH_RECORD node via CONSUMED_LOT (reverse) and GENEALOGY (reverse) predicates to all ancestor LOT nodes.
- **Supporting MV:** MV-02 `mv_lot_genealogy_backward` (B3 §5).
- **SLO target:** p95 < 1s for depth 20 (SLO-5 freshness; MV serves this query).
- **PROV-DM expression:** `wasDerivedFrom*(batch_entity, lot_entity)` — transitive derivation.
- **Use cases:** Genealogy report for regulatory submission; raw material traceability; IQC source verification.

### 4.2 "Which customers received this lot?" (Forward Genealogy + Recall Scope)

- **OTG query path:** Forward walk from LOT node via GENEALOGY and PRODUCED_LOT predicates to all descendant SHIPMENT and SO nodes; then via RELEASED_TO_MARKET to customer records.
- **Supporting MV:** MV-01 `mv_lot_genealogy_forward` + MV-07 `mv_recall_scope` (B3 §5).
- **SLO target:** MV-07 pre-computed; p95 < 5s for scope identification (SLO-5 freshness).
- **PROV-DM expression:** `wasGeneratedBy*(shipment, lot_entity)` through PRODUCED_LOT chain.
- **Use cases:** Recall scope identification (SM-11 Recall); customer notification for FSCA; DSCSA traceability response.

### 4.3 "Who edited this record at time T?" (Audit Query)

- **OTG query path:** Query MV-04 `mv_audit_trail_by_record` for all ACTED_BY and SIGNED_BY edges on the target node with `asserted_at BETWEEN T - interval '1s' AND T + interval '1s'`; return `principal_id` and `asserted_at`.
- **API path:** E6 audit trail endpoint `GET /api/v1/audit/records/{root_id}/history?at=T`.
- **SLO target:** p95 < 100ms (served from MV-04; data available within 5s of write per SLO-5).
- **PROV-DM expression:** `wasAttributedTo(entity_version_at_T, agent)`.
- **Regulatory basis:** 21 CFR 11.10(b) accurate copies; EU GMP Annex 11 §9 audit trail.

### 4.4 "What data fed this AI advisory?" (AI Lineage)

- **OTG query path:** From AI_ADVISORY entity node, walk TRIGGERED_BY to the AI_INFERENCE activity node; from there, walk `used` (CONSUMED predicate) to all input entity nodes (projection snapshot, lot, inspection result).
- **API path:** E8 AI lineage endpoint `GET /api/v1/ai/advisories/{advisory_id}/lineage`.
- **SLO target:** p95 < 500ms (AI advisory lineage cached on advisory creation).
- **PROV-DM expression:** `used(advisory_activity, input_entity)` for all inputs.
- **Why this matters:** EU AI Act Article 13 transparency requires that AI system outputs be traceable to their inputs for high-risk AI systems operating in regulated manufacturing.

### 4.5 "Which approver signed at time T?" (Signature Query)

- **OTG query path:** Query MV-06 `mv_signature_audit` for all SIGNED_BY edges on the target node; filter by `asserted_at BETWEEN T - interval '5m' AND T + interval '5m'`; return `principal_id`, `signature_id`, `algorithm`, `key_id`.
- **API path:** E7 signature history `GET /api/v1/signatures/{root_id}/history`.
- **SLO target:** p95 < 100ms (MV-06 freshness SLO-5 < 5s).
- **PROV-DM expression:** `wasAttributedTo(signed_entity, signing_agent)` at time T.
- **Regulatory basis:** 21 CFR 11.70 record-signature linking; E7 §2.5 signature history endpoint.

### 4.6 "What was the state of this record at time T?" (Point-in-Time Query)

- **OTG query path:** Query `otg_node` for the version of the node with `created_at <= T` and `predecessor_hash` chain intact; reconstruct entity state from that version's `root_revision`.
- **API path:** E6 `GET /api/v1/records/{root_id}/state?at=T`.
- **SLO target:** p95 < 200ms (requires index scan on `(root_id, created_at)`).
- **PROV-DM expression:** `Entity(e, attributes={state_at_T})`.
- **Use cases:** Regulatory inspection response; dispute resolution; audit pack generation.

---

## §5 Per-Region Data Residency

Data residency rules determine where each classification of data may be stored, processed, and replicated. These rules are enforced at L5 (write guard) and L8 (replication routing).

| Classification | Primary Region | Replication Allowed | Residency Rule | Legal Basis |
|---|---|---|---|---|
| `AUTHORITATIVE_REGULATED` | Tenant-designated primary region | Secondary region (same jurisdiction) | Must remain within jurisdiction specified in DPA | GDPR Article 46; Schrems II adequacy decision |
| `ITAR_CONTROLLED` | US-only region | No cross-region replication | US persons only; no foreign national access | ITAR 22 CFR §120-130 |
| `PHI` | Tenant-designated region with BAA | Disaster recovery within same jurisdiction | HIPAA §164.312 technical safeguards | HIPAA Security Rule |
| `CUI` | Federated cloud region (DoD IL4 equivalent) | Within approved enclave only | NIST 800-171 CUI handling | DFARS 252.204-7012 |
| `PII` | Tenant-designated region | Secondary region with SCC | Subject to erasure requests per GDPR Article 17 | GDPR Chapter V |
| `TELEMETRY_*` | Vendor L8 region (global aggregation) | Cross-region for global SRE dashboards | Anonymised; no PII in telemetry | Vendor DPA |
| `AUDIT_IMMUTABLE` | Primary region + WORM export | Cross-region WORM mirror | Both copies must be verifiable; Merkle hash cross-checked | 21 CFR 11.10(c) |

**Cross-region transfer gate:** Before any data crosses a region boundary, the L8 routing middleware checks:
1. Classification of the data item.
2. Destination region jurisdiction.
3. Whether a valid legal mechanism (adequacy decision, SCC, or equivalent) covers the transfer.
4. If ITAR-controlled: hard reject; log attempt; SEV-1 alert.
5. If PHI: check for BAA coverage of destination region.
If any check fails, the transfer is rejected and logged to the security audit trail (H4 EC-22).

---

## §6 PII Flow Control

### 6.1 PII Tagging

Every field in the M3 root catalog that may contain personal data is tagged in the contract schema with `pii_flag: true` and a `pii_category` (name | contact | health | biometric | financial | signature_identity). Tagging is maintained in the `contract_field_catalog` table. OTG edges with `pii_flag = true` (per B3 §3) are subject to additional access controls.

### 6.2 Redaction-by-Default

API responses that include PII fields apply redaction-by-default: fields are returned as `<REDACTED>` unless the requesting principal has an explicit `DATA_SUBJECT_ACCESS` or `AUDIT_INSPECTOR` authority grant (per B2 Tier-4 authority class). This applies to:
- `SIGNED_BY` edges returned by E7 (signer identity is PII).
- `AUTHORED_BY` edges in audit queries.
- Training record queries (employee name is PII).
- NC/CAPA records where the reporter identity is PII.

The redaction engine operates at the L7 API response serialisation layer (E14 admin routes excluded; E2 authority-checked before serialisation).

### 6.3 Pseudonymisation

For analytical and reporting use cases (Plane 4 analytics), PII fields are pseudonymised using a tenant-specific HMAC key (`HMAC-SHA256(field_value, tenant_pseudonym_key)`). The pseudonymisation key is stored in the tenant key vault (separate from the data encryption key). Re-identification is possible only with the pseudonymisation key and is logged as an H4 audit event.

### 6.4 Erasure and Retention Conflict Resolution

GDPR Article 17 right to erasure conflicts with regulated record retention (21 CFR 11.10(c), EU GMP Annex 11 §17). HESEM resolves this conflict as follows per H5 §6:

- **PII fields in regulated records:** Cannot be deleted during the retention floor period. During this period, the data subject is informed that their data must be retained for regulatory compliance, and the legal basis is documented.
- **PII fields outside regulated records:** May be erased on valid Article 17 request within 30 days. Erasure replaces the field value with a SHA3-256 hash of the original value plus a deletion timestamp, creating a cryptographic proof of erasure without storing the original value.
- **Erasure audit trail:** Every erasure event is itself an OTG event with `event_kind = PII_ERASED`; the erasure is anchored in the daily Merkle batch (per B3 §8.3), providing proof of when erasure occurred.
- **Post-retention erasure:** After the regulated retention floor has passed, PII fields in regulated records may be erased on request; the record structure and non-PII content are retained per H5 §4.

---

## §7 Failure Modes

**FM-B5-01 Lineage Gap (Regulator-Relevant)**
- Trigger: OTG event sequence has a gap (predecessor_event_id chain broken); or CDC delivery dropped an event, creating an unlinked node or orphan edge.
- Severity: SEV-1 for regulated lineage paths (genealogy, batch record, signature chain); SEV-2 for informational paths.
- Detection: Axiom A-09 hash chain check in daily reconciliation; axiom A-11 orphan edge check.
- Recovery: Per RB-INC-017: identify the gap in the CDC stream from `last_applied_lsn`; replay from the last verified anchor checkpoint; validate axiom A-09 on the rebuilt chain; emit `LINEAGE_REPLAYED` edges (P-25); notify Compliance if regulated records were affected.
- Regulatory implication: A lineage gap in a regulated record may require a deviation and potentially regulatory notification.

**FM-B5-02 Cross-Region Transfer Attempt Rejection**
- Trigger: L8 routing middleware rejects a cross-region data transfer due to residency rule violation (§5).
- Severity: SEV-2 for standard PII; SEV-1 for ITAR-controlled data.
- Detection: L8 transfer gate audit log; SLO-19 cross-tenant/cross-region attempt counter.
- Recovery: Investigate which service attempted the transfer; patch routing configuration; CAPA if violation was due to code defect.

**FM-B5-03 PII Redaction Failure**
- Trigger: API response contains unredacted PII field for a principal without `DATA_SUBJECT_ACCESS` authority.
- Severity: SEV-1; potential GDPR Article 33 notification obligation.
- Detection: Per RB-INC-018: automated API response scan in staging for PII field exposure; production alert if redaction middleware throws exception.
- Recovery: Take affected endpoint offline; identify root cause (redaction middleware bypass, serialiser bug); patch; verify fix; notify DPO; assess whether breach notification is required (GDPR 72h window).

**FM-B5-04 CDC Lineage Event Loss**
- Trigger: RabbitMQ message dropped or CDC relay crash causes a gap in the lineage event stream.
- Severity: SEV-2 initially; escalates to SEV-1 if regulated records affected.
- Detection: CDC consumer lag monitoring (SLO-13); event count reconciliation between `otg_event` table and `cdc_consumer_checkpoint`.
- Recovery: Restart CDC relay from `last_applied_lsn`; reconcile MV row counts against `otg_event` counts; rebuild affected MVs via RB-INC-001 §3 if discrepancy found.

**FM-B5-05 AI Advisory Lineage Unresolvable**
- Trigger: AI advisory entity's input entity references are missing or point to deleted nodes.
- Severity: SEV-2.
- Detection: E8 AI lineage endpoint returns incomplete graph for an advisory.
- Recovery: Reconstruct lineage from `otg_event` payload (advisory event stores input entity IDs in `payload`); if entities were deleted before retention floor, this is an axiom A-13 violation (SEV-1 escalation).

---

## §8 KPIs

| KPI | Metric | Target | Window | Source | Alert |
|---|---|---|---|---|---|
| Lineage Gap Rate | Count of regulated records with broken PROV-DM chain (hash chain gap or orphan edge) | 0 per 7-day period | 7 days rolling | Daily reconciliation axiom A-09 + A-11 | > 0 |
| Cross-Region Transfer Rejection Rate | Count of cross-region transfers rejected by residency gate | 0 ITAR violations; < 5 PII route misconfigurations per year | Annual | L8 transfer gate audit log | ITAR > 0; PII > 5 |
| PII Redaction Compliance | Fraction of API responses with PII fields correctly redacted for unauthorised principals | >= 99.99% | 30-day rolling | API response scanner (automated test suite) | < 99.95% |
| Audit Trail Completeness | Fraction of regulated SM transitions with complete PROV-DM lineage (wasGeneratedBy + wasAttributedTo present) | >= 99.99% | 7-day rolling | MV-04 completeness scan | < 99.95% |
| AI Advisory Lineage Resolvability | Fraction of AI advisories with complete and resolvable PROV-DM input lineage | >= 99.5% | 30-day rolling | E8 lineage scan | < 99.0% |

---

## §9 Per-Pack Overlay

### J1 Pharma (DSCSA + EU FMD)

DSCSA T1 (sold), T2 (returned), T3 (dispensed) events are recorded as OTG events with
DSCSA_EXCHANGED_WITH predicate (B3 §17 J1). The PROV-DM lineage for a dispensed unit
traces: LOT entity → PRODUCED_LOT → BATCH_RECORD → RELEASED_BY (QP) → RELEASED_TO_MARKET
(DSCSA T3). This lineage must be producible within 24 hours of an FDA Section 582 trace request.

EU FMD pack-level serialisation lineage: SERIALISED_UNIT → PRODUCED_UDI → FMD_PRODUCT_MASTER →
FMD_DECOMMISSIONED (at dispense). OTG MV-03 `mv_record_authority_snapshot` carries the
QP release event referenced in the FMD verification response.

### J2 Auto (VIN Traceability)

Per-VIN lineage traces all consumed lots through the GENEALOGY chain to the finished vehicle
identified by the VIN_NODE. The `PER_VIN_SERIALISED` OTG predicate (B3 §17 J2) anchors the
lineage at the VIN level. OEM EDI events are recorded as OTG events and linked to the
relevant SO via LINKED predicate with `link_type = OEM_DELIVERY`.

Cross-OEM data: each OEM has a separate authority scope in B2; OEM-specific data is never
shared across OEM tenants (cross-tenant prohibition).

### J3 Aero (AS9120B Lot → Heat → Coil + ITAR)

The AS9120B material genealogy chain (LOT → HEAT_NUMBER → COIL_NUMBER → ALLOY_CERT) is
implemented via the HEAT_TRACE, COIL_TRACE, and ALLOY_CERTIFIED_BY predicates (B3 §17 J3).
PROV-DM lineage for an aerospace lot includes the full three-level upstream material chain.

ITAR lineage events are written exclusively to the ITAR-designated US region. The cross-region
residency gate (§5) hard-rejects any ITAR data transfer to non-US regions. The daily Merkle
anchor for ITAR partitions is verified only within the US region; no cross-region anchor
reconciliation for ITAR data.

### J4 Medical Device (UDI Lineage)

UDI lineage: SERIALISED_UNIT → PRODUCED_UDI → LOT → PRODUCED_LOT → BATCH_RECORD → VALIDATED
(SM-14 validation status). This chain supports the EU MDR Article 27 traceability requirement
and FDA UDI unique device identification.

SOUP register lineage: SOFTWARE_COMPONENT → VALIDATED_AGAINST → VALIDATION_RECORD (SM-14);
the full software component inventory and its validation evidence are queryable via E6 for
IEC 62304 §8.1 SOUP audits.

Post-market surveillance lineage: COMPLAINT → LINKED → LOT → GENEALOGY → upstream lots;
complaint-to-lot traceability enables root cause analysis within the PMS framework.

### J5 Food (FSMA §204 KDE/CTE)

FSMA §204 mandates that Critical Tracking Events (CTE) and Key Data Elements (KDE) be
electronically recorded and producible within 24 hours of an FDA request.

PROV-DM lineage for a regulated food item traces: RAW_AGRICULTURAL_COMMODITY (SOURCED_FROM
supplier) → KDE_RECORDED (harvesting KDE) → CTE_COMPLETED (first receiver) → GENEALOGY
(transformation / processing) → CTE_COMPLETED (shipping CTE) → RELEASED_TO_MARKET.

The MV-07 `mv_recall_scope` serves the "one step forward, one step back" FDA traceability
requirement by pre-computing the immediate upstream and downstream lots for any target
lot at any point in time.

---

## §10 Cross-References

- **B3 (OTG):** B5 is the lineage and flow specification layer above the OTG substrate; all entity, activity, and agent records are stored as OTG nodes/edges/events
- **B6 C5:** Tenant boundary and per-region residency rules (§5) implement CC-5 cross-cutting concern
- **B8 (CDC):** CDC integration described in B3 §6 is the Plane 1 → Plane 2 data flow mechanism; B5 §2 references it for each data class
- **C8 (Traceability):** C8 recall scope calculator consumes the lineage queries described in §4.2; MV-07 is the implementation substrate
- **E5:** Workspace projection layer is the Plane 3 consumer of OTG CDC events; §2.1 documents the flow from L5 to E5
- **E6:** Audit trail API serves lineage queries §4.3 and §4.6; E6 reads MV-04 and MV-06
- **E7:** Signature history API serves lineage query §4.5; E7 reads MV-06 and SIGNED_BY edges
- **E8:** AI lineage API serves lineage query §4.4; referenced in AI advisory data flow §2.4
- **I7 §9:** PII tagging taxonomy and erasure procedure referenced in §6; HESEM privacy policy implemented via §6.4
- **M3:** Every entity in the PROV-DM model maps to an M3 root; data classification in §3 applies per M3 root family
- **M4:** Pack-specific data flows in §9 reference M4 pack SM directories for the relevant SM transition events

---

```
S1-04_B4_B5_DEEP_UPGRADE_COMPLETE
```
