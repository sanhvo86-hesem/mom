# B3 — Operational Truth Graph (OTG)

**Version:** V10-Deep  
**Status:** Authoritative  
**Replaces:** V9 B3 (shallow predicate / axiom stubs)  
**Cross-references:** A1, B1 §5 (L5), B2, B6 C1+C2+C5, B7, B8, C8, D11, E5, E6, H1 §4, H4, M3, M4, M5

---

## §1 Purpose and Role

The Operational Truth Graph (OTG) is the relational substrate that joins every
authoritative root in M3 into a navigable, append-only graph of causality,
authority, and lineage. It is the canonical answer to the questions: *who
authorised this change, on which record, under which workflow, using which
input materials, and has anyone verified the result?* Every state-machine
transition (per B7), every workflow command (per B1 L3), every disposition
decision, and every audit query (per B6 C1) writes to or reads from the OTG.

The OTG is not a separate graph database. It is implemented as three Postgres
tables — `otg_node`, `otg_edge`, and `otg_event` — co-located with the domain
data and protected by the same Postgres transaction boundary. A domain root
mutation (L4) inserts or updates its entity tables AND appends the corresponding
OTG node/edge/event rows within a single serialisable transaction. There is no
separate synchronisation step and therefore no window of inconsistency between
the domain record and its graph representation.

This chapter specifies the entity model, the full predicate catalog, the full
axiom catalog, the materialised view catalog, CDC integration, genealogy query
discipline, authority and signature anchoring, tenant boundary enforcement,
schema evolution governance, performance targets, storage strategy, cross-region
operation, replay tooling, failure modes, KPIs, per-pack overlays, and all
cross-references.

---

## §2 Entity Model

### 2.1 `otg_node` — Subject and Object Registry

Every entity that can appear as the subject or object of an OTG predicate is
registered in `otg_node` before any edge referencing it is written.

| Column | Type | Constraint | Semantic | PII Flag | Audit Visibility |
|---|---|---|---|---|---|
| `node_id` | UUID | PK; server-generated | Stable, opaque identity for this node | No | Always |
| `tenant_id` | UUID | NOT NULL; FK tenant | Owning tenant; all cross-tenant queries rejected at L5 layer | No | Always |
| `node_kind` | TEXT | NOT NULL; check IN enum | Root family (e.g. `LOT`, `JOB_ORDER`, `NQCASE`, `USER`, `DEVICE`, `MATERIAL`) | No | Always |
| `root_id` | UUID | NOT NULL; references domain entity PK | Domain entity this node represents; one-to-one | No | Always |
| `root_revision` | INTEGER | NOT NULL; default 0 | Monotonic revision counter from domain entity; incremented on every mutation | No | Always |
| `lifecycle_state` | TEXT | NOT NULL | Current state per M4 state machine; replicated from domain for fast graph reads | No | Always |
| `created_at` | TIMESTAMPTZ | NOT NULL; default now() | Wall-clock insertion time; server-side; not user-supplied | No | Always |
| `created_by_principal` | UUID | NOT NULL; FK identity | Principal (human or service) that triggered creation | No | Always |
| `hash` | BYTEA | NOT NULL | SHA3-256 of canonical field set at creation; predecessor_hash XOR'd in updates | No | Always |
| `predecessor_hash` | BYTEA | NULL | Hash of previous version of this node; NULL on first version; monotonic chain | No | Always |
| `anchor_seq` | BIGINT | NULL | Sequence number in daily Merkle anchor batch (per B6 C1); populated post-anchor | No | Always |
| `pack_tags` | JSONB | NOT NULL; default '{}' | Pack-specific flags: `{"pharma": true, "gtin": "..."}` etc. | No | Always |

Unique index on `(tenant_id, root_id)`. Partial index on `(tenant_id, node_kind, lifecycle_state)` for
state-filtered graph traversals. Hash-partitioned by `tenant_id` (16 shards, mod 16).

### 2.2 `otg_edge` — Predicate Assertions

An edge asserts a typed, directional relationship between two nodes. Edges are
append-only: superseding or retracting a relationship creates a new edge with
`superseded_by` pointing to the new edge; the old edge is never deleted.

| Column | Type | Constraint | Semantic | PII Flag | Audit Visibility |
|---|---|---|---|---|---|
| `edge_id` | UUID | PK; server-generated | Stable identity for this assertion | No | Always |
| `tenant_id` | UUID | NOT NULL; FK tenant | Owning tenant | No | Always |
| `predicate` | TEXT | NOT NULL; check IN enum | Relationship kind from predicate catalog (§3) | No | Always |
| `subject_node_id` | UUID | NOT NULL; FK otg_node | The "from" node | No | Always |
| `object_node_id` | UUID | NOT NULL; FK otg_node | The "to" node | No | Always |
| `asserted_at` | TIMESTAMPTZ | NOT NULL; default now() | Time the edge was written | No | Always |
| `asserted_by_event_id` | UUID | NOT NULL; FK otg_event | The OTG event that created this edge | No | Always |
| `effective_from` | TIMESTAMPTZ | NOT NULL | Business-time from which this assertion holds | No | Always |
| `effective_to` | TIMESTAMPTZ | NULL | Business-time until which this assertion holds; NULL = open | No | Always |
| `superseded_by` | UUID | NULL; FK otg_edge | If this edge was retracted, the retraction edge | No | Always |
| `cardinality_slot` | INTEGER | NULL | For 1:N predicates, the ordinal position; NULL for unordered | No | Always |
| `metadata` | JSONB | NOT NULL; default '{}' | Predicate-specific payload (e.g. lot quantity, UOM, step number) | Conditional | Always |
| `hash` | BYTEA | NOT NULL | SHA3-256 of (tenant_id, predicate, subject, object, asserted_at, metadata) | No | Always |
| `pii_flag` | BOOLEAN | NOT NULL; default false | TRUE for predicates encoding personal data (e.g. SIGNED_BY) | Conditional | Masked for non-owners |

Index on `(tenant_id, predicate, subject_node_id)` for forward traversal.
Index on `(tenant_id, predicate, object_node_id)` for reverse traversal.
Partial index on `(tenant_id, predicate, subject_node_id) WHERE superseded_by IS NULL` for current-only queries.

### 2.3 `otg_event` — Immutable Transition Record

Every write to the OTG (node insertion, edge assertion) is recorded as an
immutable OTG event. Events drive the CDC pipeline (§6) and are the unit of
replay (§14).

| Column | Type | Constraint | Semantic | PII Flag | Audit Visibility |
|---|---|---|---|---|---|
| `event_id` | UUID | PK; server-generated | Stable, globally unique event identity | No | Always |
| `tenant_id` | UUID | NOT NULL | Owning tenant | No | Always |
| `event_kind` | TEXT | NOT NULL; check IN enum | `NODE_CREATED`, `NODE_UPDATED`, `EDGE_ASSERTED`, `EDGE_RETRACTED`, `AXIOM_CHECKED`, `MV_REFRESHED`, `ANCHOR_EMITTED` | No | Always |
| `occurred_at` | TIMESTAMPTZ | NOT NULL; default now() | Server-side wall clock | No | Always |
| `principal_id` | UUID | NOT NULL | Identity (human or service) that caused this event | No | Always |
| `command_id` | UUID | NOT NULL; FK L3 command_bus | L3 command that produced this event; enables OTG-to-workflow traceability | No | Always |
| `sm_transition_id` | UUID | NULL; FK sm_transition | If event was caused by a state machine transition (B7) | No | Always |
| `payload` | JSONB | NOT NULL | Full diff of what was created/changed; WORM-eligible | Conditional | Always |
| `signature_id` | UUID | NULL; FK e7_signature | For regulated events, references the E7 signature record | No | Always |
| `predecessor_event_id` | UUID | NULL | Previous event in the tenant's event chain; forms monotonic linked list | No | Always |
| `hash` | BYTEA | NOT NULL | SHA3-256 of (event_id, tenant_id, occurred_at, payload, predecessor_event_id.hash) | No | Always |
| `anchor_seq` | BIGINT | NULL | Daily Merkle anchor sequence; populated post-anchor | No | Always |
| `region` | TEXT | NOT NULL | Originating region (per W13); for cross-region conflict detection | No | Always |

Range-partitioned by `occurred_at` (monthly partitions). Sub-partitioned by `tenant_id` within each
monthly partition. WORM export triggered at partition age > 30 days (per H5 archival tier).

---

## §3 Predicate Catalog

Each predicate is a typed, directional, versioned assertion. Adding a predicate
is a Class B schema change (§10). Removing or narrowing a predicate is a Class A
change requiring Compliance sign-off. The following 27 predicates are authorised.

### 3.1 Provenance Predicates

**P-01 AUTHORED_BY**
- Domain: Any mutable root node (LOT, NQCASE, JOB_ORDER, ...)
- Range: USER node
- Cardinality: M:1 (many roots may be authored by one user; one root has exactly one original author)
- Mutability: Once-only (first authorship cannot be retracted; use SUPERSEDED_BY for delegation)
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: TRUE (identifies a natural person)
- Semantic: Records the natural person or service principal who created the root record.

**P-02 RELEASED_BY**
- Domain: LOT, BATCH, SERIALISED_UNIT, CPO, SO
- Range: USER node (must hold Tier-1 authority per B2)
- Cardinality: 1:1 per lifecycle Release transition
- Mutability: Append-only (a new RELEASED_BY edge supersedes but does not delete prior)
- Tenant scope: Always per-tenant
- Audit visibility: Always visible; never masked
- PII flag: TRUE (identifies QP or designated person)
- Semantic: Asserts that a qualified person with release authority has executed a disposition release.

**P-03 DISPOSITIONED_AS**
- Domain: LOT, BATCH, COMPONENT, INSPECTION_RESULT
- Range: DISPOSITION node (kind = disposition; value = ACCEPT / REJECT / QUARANTINE / CONDITIONAL)
- Cardinality: 1:1 per disposition event; prior disposition edges remain as history
- Mutability: Append-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Records the outcome of a quality decision. A retraction of a prior disposition must create a compensating COMPENSATED_BY edge (P-22).

**P-04 SIGNED_BY**
- Domain: Any regulated record requiring e-signature (per 21 CFR 11.70 record-signature linking)
- Range: USER node + SIGNATURE node
- Cardinality: M:N (multi-signer quorum workflows)
- Mutability: Append-only (signatures are permanent; revocation creates REVOKED_BY edge per E7 §2.8)
- Tenant scope: Always per-tenant
- Audit visibility: Always visible; signature hash always logged
- PII flag: TRUE
- Semantic: Links a regulated record to the electronic signature event (per E7). Subject node is the record; object node is the signature record which carries algorithm, key-id, timestamp, and reason-text.

**P-05 ACTED_BY**
- Domain: Any root undergoing a lifecycle transition
- Range: USER or SERVICE_PRINCIPAL node
- Cardinality: M:N (one actor per transition event; many transitions per root)
- Mutability: Append-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: TRUE (human actors)
- Semantic: General action-actor link for state machine transitions not requiring a qualified signature. Complements SIGNED_BY for transitions that require only authenticated action (not e-signature).

**P-06 ON_BEHALF_OF**
- Domain: USER node (the delegate)
- Range: USER node (the delegating principal)
- Cardinality: M:1 (one delegate, one principal per delegation event)
- Mutability: Append-only; bounded by effective_from / effective_to on the edge
- Tenant scope: Always per-tenant; cross-tenant delegation forbidden
- Audit visibility: Always visible
- PII flag: TRUE
- Semantic: Records that a user performed an action as delegated representative of another user. Cannot be used for banned decisions (BD-1..BD-36 are non-delegable per B2 §6).

### 3.2 Material / Lot Predicates

**P-07 CONSUMED_LOT**
- Domain: JOB_ORDER, WORK_ORDER, BATCH_RECORD, PRODUCTION_ORDER
- Range: LOT node
- Cardinality: M:N (one order can consume many lots; one lot can be consumed by many orders)
- Mutability: Append-only; once a lot is recorded as consumed it cannot be un-consumed (compensate with COMPENSATED_BY)
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Metadata fields: `quantity`, `uom`, `step_id`, `consumption_type` (standard | scrap | rework)
- Semantic: Asserts that a specific lot (or sub-lot) was consumed as input to a production execution step. This edge is the primary driver of backward lot genealogy.

**P-08 PRODUCED_LOT**
- Domain: JOB_ORDER, WORK_ORDER, BATCH_RECORD
- Range: LOT node
- Cardinality: 1:N (one order produces one or more output lots)
- Mutability: Once-only for the primary output; append-only for yield splits
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Metadata fields: `quantity`, `uom`, `yield_type` (primary | co-product | by-product)
- Semantic: Asserts that a production execution created an output lot. Primary driver of forward lot genealogy.

**P-09 GENEALOGY** (also LINKS_PARENT_TO_CHILD per M3 terminology)
- Domain: LOT node (parent)
- Range: LOT node (child)
- Cardinality: M:N (multi-parent lots in rework / mixing scenarios)
- Mutability: Append-only; cycle prevention enforced by axiom A-14
- Tenant scope: Always per-tenant; cross-tenant genealogy links require explicit inter-company agreement node
- Audit visibility: Always visible
- PII flag: FALSE
- Metadata fields: `split_ratio`, `genealogy_type` (split | merge | rework | repack)
- Semantic: Direct parent-child lot relationship used by the genealogy depth-N traversal query (§7). Subject = parent lot, object = child lot.

**P-10 DERIVED_FROM**
- Domain: LOT, SAMPLE, ALIQUOT
- Range: LOT node
- Cardinality: M:1 (one derived item has one source)
- Mutability: Once-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Used for laboratory samples and aliquots derived from a lot. Distinct from GENEALOGY to allow different query paths (GENEALOGY = manufacturing path; DERIVED_FROM = analytical/QC path).

**P-11 SOURCED_FROM**
- Domain: PURCHASE_RECEIPT, INCOMING_INSPECTION
- Range: SUPPLIER node + PURCHASE_ORDER node
- Cardinality: 1:1 per receipt event
- Mutability: Append-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Links a goods receipt to its source supplier and PO. Enables supplier traceability in genealogy walk.

### 3.3 Validation / Governance Predicates

**P-12 VALIDATES**
- Domain: INSPECTION_RESULT, TEST_RESULT, CALIBRATION_RECORD
- Range: LOT, EQUIPMENT, INSTRUMENT node (the thing validated)
- Cardinality: M:N (multiple results may validate one lot; one result may be composite)
- Mutability: Append-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: A test or inspection result positively asserts conformance of a subject. For negative outcomes, use DISPOSITIONED_AS with REJECT outcome on the subject instead.

**P-13 GOVERNS**
- Domain: DOCUMENT (specification, procedure, work instruction), CONTROL_METHOD
- Range: Any root governed by that document
- Cardinality: 1:N (one document governs many instances over time)
- Mutability: Append-only; effective_from / effective_to on the edge reflects document revision scope
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Declares that a controlled document was the authoritative specification applicable to a record at a specific point in time. Used to reconstruct "which version of the procedure was in effect when this lot was processed".

**P-14 GOVERNED_BY**
- Domain: Any root (reverse direction of GOVERNS)
- Range: DOCUMENT node
- Cardinality: N:1 per document-version window
- Mutability: Append-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Explicit reverse index for GOVERNS; maintained as a separate edge to avoid full-scan reversals on large GOVERNS fan-out.

### 3.4 Workflow / Command Predicates

**P-15 TRIGGERED_BY**
- Domain: Any root mutation event
- Range: WORKFLOW node or SCHEDULED_JOB node
- Cardinality: M:1 (many events may be triggered by one workflow execution)
- Mutability: Once-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Records the L3 workflow or scheduled job that caused a mutation. Provides full command-to-effect traceability without foreign key coupling across layers.

**P-16 COMMITTED**
- Domain: COMMAND node (L3 command bus entry)
- Range: Domain root node mutated by the command
- Cardinality: 1:N (one command may mutate multiple roots in a saga)
- Mutability: Once-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Asserts that a command was successfully committed to a domain root. Complements ATTEMPTED and DENIED to form the full command lifecycle.

**P-17 ATTEMPTED**
- Domain: COMMAND node
- Range: Domain root node
- Cardinality: 1:N
- Mutability: Append-only (repeated retries all logged)
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Records that a command was attempted on a root, regardless of outcome. Used in forensic analysis to detect repeated failed attempts or replay attacks.

**P-18 DENIED**
- Domain: COMMAND node
- Range: Domain root node
- Cardinality: 1:N
- Mutability: Append-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible; alert trigger on pattern
- PII flag: FALSE
- Semantic: Records that a command was denied by the authority layer (L2 decide() returning deny). Denial events feed the SLO-22 banned-decision attempt counter and anomaly detection.

### 3.5 Audit / Integrity Predicates

**P-19 RECORDED_BY**
- Domain: Any regulated record
- Range: AUDIT_CHAIN_ANCHOR node (per B6 C1)
- Cardinality: 1:N (record is captured in multiple anchors over its life)
- Mutability: Append-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Links a regulated record to the specific Merkle anchor batch that captured its state. Supports "prove this record was captured at time T" without re-hashing the entire chain.

**P-20 SUPERSEDED_BY**
- Domain: Any node (representing a prior version)
- Range: Node representing the superseding version
- Cardinality: 1:1 per supersession event
- Mutability: Once-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Explicit lineage link between successive versions of the same logical entity. Distinct from the hash-chain predecessor pointer on `otg_node` (which is structural) — SUPERSEDED_BY is a first-class graph predicate visible to graph queries.

**P-21 ANNOTATED_BY**
- Domain: Any regulated record
- Range: ANNOTATION node (carries text, category, timestamp)
- Cardinality: 1:N
- Mutability: Append-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible; annotation text retained permanently
- PII flag: Conditional (annotation text may contain personal health information)
- Semantic: Non-mutation commentary attached to a record (e.g. lab analyst note, inspector observation). Annotations cannot alter the record; they are evidence of human review.

**P-22 COMPENSATED_BY**
- Domain: Any edge or node representing a prior asserted fact
- Range: The compensating action node (TCC compensation step per B1 L3)
- Cardinality: 1:1
- Mutability: Once-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible; SEV-2 alert on repeated compensations
- PII flag: FALSE
- Semantic: When a prior fact (e.g. a CONSUMED_LOT edge) must be corrected, a compensating action is created and linked via this predicate. The original edge is never deleted; the compensation provides the correction chain. Required for TCC Saga integrity (per B1 L3).

### 3.6 Structural / Classification Predicates

**P-23 PART_OF**
- Domain: Sub-component, sub-lot, assembly component
- Range: Parent assembly, kit, compound, device
- Cardinality: M:N (a component can be in multiple builds; a build has many components)
- Mutability: Append-only; effective_to set when component is removed
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Bill-of-material / bill-of-substance structural composition. Distinct from GENEALOGY (which is lot-level manufacturing lineage); PART_OF is engineering structure.

**P-24 LINKED**
- Domain: Any root
- Range: Any root
- Cardinality: M:N
- Mutability: Append-only
- Tenant scope: Always per-tenant; cross-tenant links require inter-company agreement node
- Audit visibility: Always visible
- PII flag: FALSE
- Metadata fields: `link_type` (CAPA_TO_NCR, CAPA_TO_CHANGE, DEVIATION_TO_BATCH, COMPLAINT_TO_NCR, ...)
- Semantic: General cross-root association where no specific predicate captures the semantics. `link_type` is a controlled vocabulary; new link_types are Class B changes (§10).

**P-25 LINEAGE_REPLAYED**
- Domain: LOT node or MV_SNAPSHOT node
- Range: REPLAY_JOB node
- Cardinality: 1:N (many replay jobs may refresh the same lot's lineage)
- Mutability: Append-only
- Tenant scope: Always per-tenant
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Records that a lot's lineage was replayed from the anchor checkpoint (§14). Enables proof that the current graph state was validated against the audit anchor after a rebuild.

**P-26 TENANT_SCOPED**
- Domain: Any resource node
- Range: TENANT node
- Cardinality: N:1 (each resource belongs to exactly one tenant)
- Mutability: Once-only (tenant ownership cannot be changed)
- Tenant scope: Defines the tenant scope
- Audit visibility: Always visible
- PII flag: FALSE
- Semantic: Explicit ownership assertion. Used by the tenant boundary guard (axiom A-07) to reject cross-tenant traversal attempts at query time.

**P-27 RELEASED_TO_MARKET**
- Domain: LOT, SERIALISED_UNIT, PACKAGED_PRODUCT
- Range: MARKET_AUTHORISATION node (per pack: DSCSA transaction, FMD activation, OEM delivery acceptance)
- Cardinality: 1:1 per market release event
- Mutability: Once-only per market region (may be multiple for parallel markets)
- Tenant scope: Always per-tenant
- Audit visibility: Always visible; regulatory-facing event
- PII flag: FALSE
- Semantic: Records the act of releasing a lot or unit to a specific market channel. Per-pack: Pharma maps to DSCSA T3 event; MD maps to UDI activation; Food maps to FSMA §204 first receiver CTE.

---

## §4 Axiom Catalog

Axioms are invariants that the OTG enforces at write time, at daily reconciliation,
and on demand via the verification job. Each axiom violation triggers a SEV-1 incident
unless a lower severity is explicitly specified. Adding an axiom is a Class A change (§10).

**A-01 NO_SELF_SIGN**
- Formal statement: No SIGNED_BY edge may have the same natural person as both the author of the record and the signer of that record, unless the authority class of the action is Tier-3 or lower.
- Why: 21 CFR 11.10(j) accountability; EU GMP Annex 11 §14 independence requirement. Self-certification is the most common audit finding in e-signature implementations.
- When checked: At write (L5 guard before edge insert); at daily reconciliation (batch query).
- Failure behavior: Reject write with HTTP 422 `AXIOM_A01_SELF_SIGN_VIOLATION`; emit SEV-1 incident.
- Daily verification job: Query all SIGNED_BY edges where `subject.authored_by_principal = object.signer_identity` and authority class >= Tier-2; emit to `audit_chain` on any match.
- Recovery: Void the signature record via E7 §2.8; require independent signer; CAPA under RB-INC-005.
- Cross-reference: B2 §4 (quorum policy); H1 §4 clause (j).

**A-02 NO_FUTURE_DATING**
- Formal statement: No `otg_event.occurred_at` may exceed the current server time by more than 60 seconds after accounting for NTP drift tolerance.
- Why: Backdating and future-dating are primary integrity attacks in regulated systems. 21 CFR 11.10(b) accurate copies; EU GMP Annex 11 §9.
- When checked: At write (L5 guard).
- Failure behavior: Reject write with HTTP 422 `AXIOM_A02_FUTURE_DATE_VIOLATION`; log to security audit.
- Daily verification: Scan for any events with `occurred_at > created_at + interval '2 minutes'`; alert.
- Recovery: If drift detected, synchronise NTP; audit all records from drift window; potential regulatory notification per H8.

**A-03 EVIDENCE_COMPOSITION_COMPLETE**
- Formal statement: Before any DISPOSITIONED_AS edge with value ACCEPT or REJECT may be committed, all required evidence predicates for that root-kind and disposition type must exist in the graph.
- Why: Prevents disposition without evidence — the most consequential quality data gap in regulated manufacturing.
- When checked: At write (L5 pre-commit guard checks graph completeness per M3 root evidence profile).
- Failure behavior: Reject write with HTTP 422 `AXIOM_A03_EVIDENCE_INCOMPLETE`; list missing predicate types in error detail.
- Daily verification: Scan all DISPOSITIONED_AS ACCEPT edges; verify each has the required evidence set per M3; flag discrepancies.
- Recovery: Collect missing evidence; re-run disposition workflow; CAPA if evidence was lost.

**A-04 QUORUM_SUFFICIENT**
- Formal statement: For any action classified as a Banned Decision (BD-1..BD-36), the number of distinct SIGNED_BY edges from principals satisfying the quorum policy (per B2 §4) must be met before the event is committed.
- Why: Quorum is the primary control preventing unilateral execution of high-risk actions. 21 CFR 11.10(e) requires authority levels and responsibility.
- When checked: At write; the L3 saga coordinator checks quorum status before issuing the L5 commit command.
- Failure behavior: Block commit; return `QUORUM_NOT_MET` to saga coordinator; saga waits for remaining signers.
- Daily verification: Scan for BD-classified events where `count(SIGNED_BY) < quorum_policy.min_signers`; SEV-1 if found post-commit.
- Recovery: Retroactive quorum is not permitted; if violation found post-commit, void the event via compensation chain and re-execute with proper quorum; notify regulator if impact determined.

**A-05 AI_NOT_BANNED_PRINCIPAL**
- Formal statement: No SIGNED_BY, ACTED_BY, or RELEASED_BY edge for a Banned Decision (per L1 §4) may have an AI_SERVICE_PRINCIPAL node as the subject.
- Why: AI may not execute banned decisions. Triple-defense per B1 L1 §4: CI enforcement, runtime middleware interception, and this OTG axiom as offline integrity check.
- When checked: At write; at daily reconciliation.
- Failure behavior: Reject write; SEV-1 incident; notify AI governance owner (per L4 §5).
- Daily verification: Scan for banned-decision events where `principal.principal_kind = 'AI_SERVICE'`; immediate alert.
- Recovery: Void event; CAPA; notify Compliance; review AI system boundary configuration.
- Cross-reference: B1 L1 §4 (triple defense); B2 §5 (authority algorithm AI pre-check); L1 §4.

**A-06 NO_CYCLE_IN_GENEALOGY**
- Formal statement: The directed graph formed by all GENEALOGY edges within a single tenant must be acyclic (a DAG). A lot may not, through any chain of GENEALOGY edges, be its own ancestor.
- Why: A genealogy cycle makes it impossible to determine recall scope and indicates data integrity failure. Cycles also cause depth-N traversal queries to infinite-loop.
- When checked: At write (before inserting a GENEALOGY edge, the system performs a reachability check: is the proposed object_node reachable from the proposed subject_node via existing GENEALOGY edges?).
- Failure behavior: Reject write with HTTP 422 `AXIOM_A06_GENEALOGY_CYCLE_DETECTED`; SEV-1 incident.
- Daily verification: Run full transitive closure check per tenant; any cycle found = SEV-1.
- Recovery: Identify the erroneous edge source; correct the input data; CAPA for the data entry control that permitted the cycle attempt.

**A-07 CROSS_TENANT_BOUNDARY**
- Formal statement: No query or mutation may assert an OTG edge where `subject_node.tenant_id != object_node.tenant_id`, unless both nodes belong to an inter-company agreement with an explicit LINKED predicate of type `INTER_COMPANY_AGREEMENT`.
- Why: Tenant data isolation is the primary multi-tenancy security invariant. Cross-tenant data leakage is a regulatory and contractual breach (per B6 C5; SLO-19).
- When checked: At write; at query time for all graph traversals.
- Failure behavior: Reject write; log cross-tenant attempt; alert security ops; SLO-19 burn.
- Daily verification: Scan for edges crossing tenant boundaries without a valid inter-company agreement; SEV-1 if found.
- Recovery: Delete erroneous edge; audit how cross-tenant data was accessed; security incident per NIST IR playbook.

**A-08 MONOTONIC_REVISION**
- Formal statement: The `root_revision` of an `otg_node` must be strictly monotonically increasing. A new version of a node must have a `root_revision` strictly greater than all prior versions of the same `root_id`.
- Why: Non-monotonic revisions indicate clock skew, concurrency bugs, or data tampering. Required for reliable predecessor hash chain integrity.
- When checked: At write (optimistic lock on `root_revision`).
- Failure behavior: Reject with HTTP 409 `OPTIMISTIC_LOCK_FAILURE`; retry via L3 command retry policy.
- Daily verification: Scan for revision gaps or reversals per `root_id`; alert on anomaly.
- Recovery: Investigate concurrency path; re-sequence if safe; if tampering suspected, SEV-1 + legal hold.

**A-09 HASH_CHAIN_CONTINUOUS**
- Formal statement: For every `otg_node`, the `predecessor_hash` of the current version must equal the `hash` of the previous version of that node. No gaps permitted.
- Why: The hash chain is the primary data integrity mechanism. A break indicates tampering or data loss.
- When checked: At daily reconciliation (full chain scan); at read for regulated queries.
- Failure behavior: SEV-1; lock affected node for human review; trigger RB-INC-005.
- Daily verification: Batch job scans all node chains per tenant; emits `ANCHOR_EMITTED` event on successful verification.
- Recovery: Identify break point; restore from WORM backup or prior anchor; regulatory notification if data loss confirmed.

**A-10 SIGNATURE_ALGORITHM_APPROVED**
- Formal statement: All SIGNED_BY edges must reference a signature record using an approved algorithm from the current approved list (Ed25519 for standard; ECDSA-P384 for FIPS-140-3 tenants; post-quantum algorithms per migration schedule in B6 C7).
- Why: Algorithm agility governance prevents use of deprecated cryptography. 21 CFR 11.70; NIST SP 800-131A.
- When checked: At write.
- Failure behavior: Reject with HTTP 422 `AXIOM_A10_UNAPPROVED_ALGORITHM`.
- Daily verification: Scan for signatures using deprecated algorithms; alert on any remaining; H7 migration ticket if found.
- Recovery: Re-sign affected records with approved algorithm per H7 Class B migration process; retain original signature as historical record.

**A-11 NO_ORPHAN_EDGE**
- Formal statement: Both `subject_node_id` and `object_node_id` of any edge must exist in `otg_node` at the time of edge insertion.
- Why: Orphan edges break graph traversal and indicate out-of-order event processing.
- When checked: At write (FK constraint enforced by Postgres; additionally checked in L5 guard for informative error).
- Failure behavior: Reject with HTTP 422 `AXIOM_A11_ORPHAN_EDGE`; log for CDC lag investigation.
- Daily verification: FK constraint inherent; anomaly scan for edges referencing soft-deleted nodes.
- Recovery: Determine if node creation event was dropped; replay from CDC checkpoint.

**A-12 DISPOSITION_IMMUTABLE_AFTER_RELEASE**
- Formal statement: Once a LOT or SERIALISED_UNIT has a RELEASED_BY edge (i.e. has been released to market), no new DISPOSITIONED_AS edge may alter the outcome from ACCEPT to REJECT without a compensating recall event.
- Why: Post-release disposition changes are regulatory events requiring specific controls (recall, field safety notice). Prevents silent quality downgrades.
- When checked: At write.
- Failure behavior: Reject with HTTP 422 `AXIOM_A12_POST_RELEASE_MUTATION`; require recall workflow.
- Daily verification: Scan for DISPOSITIONED_AS edges post-dating RELEASED_BY with outcome downgrade; SEV-1 if found without compensating recall.
- Recovery: Initiate recall workflow per B7 SM-7 (Recall Management); notify regulatory authorities.

**A-13 EVIDENCE_RETENTION_FLOOR**
- Formal statement: No OTG event older than the configured retention floor (per M5 data retention policy; minimum 5 years for regulated tenants; 10 years for pharma / MD) may be deleted or archived to a non-restorable medium.
- Why: 21 CFR 11.10(c) record protection; EU GMP Annex 11 §17 data management. Premature deletion is a GMP critical finding.
- When checked: On any delete or archive operation attempt.
- Failure behavior: Reject with HTTP 403 `AXIOM_A13_RETENTION_FLOOR_VIOLATION`; alert compliance officer.
- Daily verification: Scan upcoming WORM export jobs; verify retention floor not breached.
- Recovery: Restore from backup; assess scope of deletion; notify regulator.

**A-14 GENEALOGY_DAG_DEPTH_BOUNDED**
- Formal statement: No genealogy chain (via GENEALOGY predicate) may exceed 50 levels of depth for a single tenant, as a guard against runaway recursive queries and data-entry loops.
- Why: Depth > 50 is operationally impossible for any real manufacturing genealogy and indicates data entry error. Bounded recursion prevents query timeouts.
- When checked: At write (depth check via recursive CTE before insert).
- Failure behavior: Reject with HTTP 422 `AXIOM_A14_GENEALOGY_DEPTH_EXCEEDED`; alert data quality.
- Daily verification: Scan for chains approaching depth 50 (warn at depth 40); alert.
- Recovery: Investigate data entry pipeline; correct upstream error; flatten erroneous intermediate nodes.

**A-15 PRINCIPAL_NOT_SUSPENDED**
- Formal statement: No ACTED_BY, SIGNED_BY, or RELEASED_BY edge may reference a principal whose identity record has `account_status = SUSPENDED` at the time of the event.
- Why: Suspended accounts must not act on regulated records. 21 CFR 11.10(j) individual accountability requires that only active, traceable principals act.
- When checked: At write (identity status check via L1 identity cache, TTL 30s).
- Failure behavior: Reject with HTTP 403 `AXIOM_A15_SUSPENDED_PRINCIPAL`.
- Daily verification: Scan for recent events with suspended principals (identity change lag); SEV-2 alert.
- Recovery: Void affected actions; re-execute with active principal; security review of how suspended account accessed the system.

**A-16 PACK_PREDICATE_VALID**
- Formal statement: Pack-specific predicates (see §17 per-pack overlay) may only appear in graphs for tenants with the corresponding pack license enabled.
- Why: Pack predicates encode pack-specific regulatory semantics (e.g. DSCSA_EXCHANGED_WITH for pharma). Allowing a food tenant to assert a DSCSA predicate would corrupt cross-pack queries.
- When checked: At write.
- Failure behavior: Reject with HTTP 422 `AXIOM_A16_UNLICENSED_PACK_PREDICATE`.
- Daily verification: Scan for pack predicates in tenants without corresponding pack license; alert.
- Recovery: Remove erroneous edges; audit what system wrote them.

**A-17 COMMAND_IDEMPOTENT**
- Formal statement: For any `command_id`, there must be at most one `COMMITTED` OTG event in the graph. Duplicate command delivery must produce the same committed state, not a second committed event.
- Why: At-least-once CDC delivery (§6) means commands may be replayed. Without this axiom, duplicate delivery causes double-mutations.
- When checked: At write (unique constraint on `otg_event(command_id, event_kind='COMMITTED')`).
- Failure behavior: Reject duplicate with HTTP 409 `IDEMPOTENCY_CONFLICT`; return original event ID.
- Daily verification: Scan for duplicate command_ids in COMMITTED events; alert.
- Recovery: Determine CDC replay source; tune idempotency key strategy.

**A-18 ANCHOR_COVERAGE_COMPLETE**
- Formal statement: Every OTG event with `occurred_at` older than 25 hours must have a non-null `anchor_seq`, indicating it has been included in a Merkle anchor batch.
- Why: The 25-hour window corresponds to SLO-10 anchor lag budget. Events older than 25 hours without an anchor are at risk of undetectable tampering.
- When checked: At daily reconciliation; monitored continuously by SLO-10 burn rate alert.
- Failure behavior: SEV-1 `AXIOM_A18_ANCHOR_COVERAGE_GAP`; trigger RB-INC-004.
- Daily verification: `SELECT count(*) FROM otg_event WHERE occurred_at < now() - interval '25h' AND anchor_seq IS NULL`; alert if > 0.
- Recovery: Run emergency anchor job; investigate why scheduled anchor failed; post-incident review.

---

## §5 Materialised View Catalog

Materialised views are the CQRS read side of the OTG. They are computed from
OTG events and edges via CDC (§6) and serve the workspace projection layer (E5)
and the audit query layer (E6). Each MV is per-tenant + per-region partitioned.

### MV-01 `mv_lot_genealogy_forward`
- Source predicates: GENEALOGY, PRODUCED_LOT, CONSUMED_LOT, PART_OF
- Refresh strategy: On-write CDC; every GENEALOGY edge insert triggers incremental update via materialised view refresh function; not full rebuild
- Freshness SLO: SLO-5 < 5s from edge commit to MV available
- Consumers: Lot Genealogy Workspace (E5), Recall Scope Calculator (C8 §3), Regulatory Submission Pack generator
- Replay procedure: RB-INC-001 §3: replay from `anchor_seq` checkpoint for affected tenant; rebuild takes < 4h for 5-year dataset per M3 cardinality estimate
- Per-tenant partitioning: View is filtered by `tenant_id` at query time; underlying data is hash-partitioned by `tenant_id` (16 shards)

### MV-02 `mv_lot_genealogy_backward`
- Source predicates: GENEALOGY (reverse), CONSUMED_LOT (reverse), SOURCED_FROM
- Refresh strategy: On-write CDC; same trigger as MV-01; maintained separately because backward walk requires different index strategy
- Freshness SLO: SLO-5 < 5s
- Consumers: Recall Scope Calculator (C8); incoming inspection quarantine release; supplier deviation correlation
- Replay procedure: RB-INC-001 §3; independent replay from MV-01 (different index)
- Per-tenant partitioning: Same as MV-01

### MV-03 `mv_record_authority_snapshot`
- Source predicates: RELEASED_BY, SIGNED_BY, ACTED_BY, DISPOSITIONED_AS
- Refresh strategy: On-write CDC; triggers on every RELEASED_BY or SIGNED_BY edge assertion
- Freshness SLO: SLO-5 < 5s
- Consumers: Regulatory record workspace (E5); batch record review; certificate of analysis generator; EU FMD verification endpoint
- Replay procedure: RB-INC-001 §2; can be rebuilt from `otg_event` stream alone; no cross-dependency
- Per-tenant partitioning: Hash-partitioned by `tenant_id`; time-range sub-partition by month for regulated query windows

### MV-04 `mv_audit_trail_by_record`
- Source predicates: All predicates with `audit_visibility = always`
- Refresh strategy: On-write CDC; append-only; new events appended to existing MV rows; never updated in place
- Freshness SLO: SLO-5 < 5s; this MV must be queryable within 1 minute of any write for 21 CFR 11 audit query compliance
- Consumers: Audit trail API (E6); inspector/auditor workspace; 21 CFR 11.10(b) accurate copy export
- Replay procedure: RB-INC-001 §4; full rebuild from `otg_event`; regulated requirement to retain full audit trail; replay validates hash chain integrity
- Per-tenant partitioning: Range-partitioned by `occurred_at` (monthly) + hash sub-partition by `tenant_id`

### MV-05 `mv_workspace_projection_feed`
- Source predicates: ACTED_BY, COMMITTED, TRIGGERED_BY, lifecycle_state on otg_node
- Refresh strategy: On-write CDC; workspace-specific subscription (per E5 workspace contract); each workspace subscribes to a subset of node_kinds
- Freshness SLO: SLO-5 < 5s
- Consumers: All 18 Wave-1 workspace projections (HMV4 frontend, per B1 L6); real-time dashboard updates
- Replay procedure: RB-INC-001 §5; workspace-scope replay (single workspace, single tenant); target rebuild < 30 minutes for current-day data
- Per-tenant partitioning: Per-tenant + per-workspace filtered view; isolates high-volume workspaces from cross-contamination

### MV-06 `mv_signature_audit`
- Source predicates: SIGNED_BY, REVOKED_BY (per E7 §2.8), ANNOTATED_BY
- Refresh strategy: On-write CDC; insert-only; revocation appended as separate row (never updates original signature row)
- Freshness SLO: SLO-5 < 5s
- Consumers: E-signature compliance dashboard; 21 CFR 11 audit export; EU GMP Annex 11 §14 compliance verification
- Replay procedure: RB-INC-001 §2; independent replay
- Per-tenant partitioning: Hash-partitioned by `tenant_id`

### MV-07 `mv_recall_scope`
- Source predicates: GENEALOGY (both directions), CONSUMED_LOT, PRODUCED_LOT, SOURCED_FROM, RELEASED_TO_MARKET
- Refresh strategy: On-write CDC for incremental updates; scheduled full rebuild weekly (to catch any CDC delivery gaps)
- Freshness SLO: SLO-5 < 5s for incremental; full rebuild < 2h (weekly)
- Consumers: Recall Scope Calculator (C8 §3); regulatory agency request handler; MV-02 feeds into this for backward scope
- Replay procedure: RB-INC-001 §6; two-phase: backward genealogy first, then forward to identify downstream affected lots; target < 6h for full 5-year scope per M3 cardinality
- Per-tenant partitioning: Per-tenant; ITAR-segregated for Aero tenants (separate region per J3 overlay)

---

## §6 CDC Integration

The OTG uses Postgres logical decoding (pgoutput plugin) as the foundation of
its change-data-capture pipeline. This implements the B8 integration boundary
contract between L5 (OTG / Persistence) and L8 (Platform / SRE).

### 6.1 Postgres Configuration

Replication slot: `hesem_otg_pub`  
Publication: `CREATE PUBLICATION hesem_otg FOR TABLE otg_node, otg_edge, otg_event`  
WAL level: `wal_level = logical` (required; must be set at Postgres startup)  
`max_replication_slots = 8` (4 for OTG CDC; 4 spare for maintenance)  
`max_wal_senders = 8`  
Slot lag monitoring: SLO-13 CDC lag < 60s; lag > 300s = SEV-2; lag > 600s = SEV-1

### 6.2 Outbox Pattern

L3 commands that must fan out to external systems (e.g. DSCSA partner notification,
EU FMD verification, OEM EDI acknowledgment) write to the `outbox_event` table
within the same Postgres transaction that writes the OTG event. The L8 outbox relay
reads `outbox_event` via CDC and publishes to RabbitMQ. This ensures atomicity
between the OTG write and the outbound integration event.

Outbox table: `outbox_event(outbox_id, tenant_id, topic, payload, created_at, relayed_at, relay_attempts)`  
Publication: `hesem_otg_pub` includes `outbox_event`  
Relay target: RabbitMQ exchange `hesem.otg.events` (topic exchange; routing key = `tenant_id.event_kind`)

### 6.3 At-Least-Once Delivery and Consumer Idempotency

The CDC relay delivers each event at least once. Consumers must be idempotent.
Idempotency mechanism: each consumer tracks `last_applied_lsn` (Postgres LSN of
the last processed WAL record) in a `cdc_consumer_checkpoint` table. On startup,
the consumer resumes from `last_applied_lsn`. Events with LSN <= `last_applied_lsn`
are skipped.

MV refresh functions additionally check the `command_id` of the triggering event
against the A-17 COMMAND_IDEMPOTENT axiom before executing a refresh.

### 6.4 Per-Tenant Routing

All CDC events carry `tenant_id` in the event payload. The L8 router inspects
`tenant_id` to route events to the correct MV partition (§5) and to the correct
outbound integration endpoint (e.g. per-tenant DSCSA trading partner).

### 6.5 Cross-Region Replication

For tenants operating in multiple regions (per W13), the `otg_event` table is
replicated via Postgres logical replication to secondary region replicas.
The replication lag budget is 60s (SLO-13). MVs in secondary regions are rebuilt
from the replicated event stream. If a secondary region detects a replication lag
> 300s, it downgrades to read-only mode and alerts ops (RB-DR-012).

---

## §7 Genealogy Depth Queries

### 7.1 Forward Genealogy (Lot to All Descendants)

The forward genealogy walk identifies all lots derived from a source lot —
the "what was made from this" scope used in forward recall calculations.

The query uses a recursive CTE anchored on the source lot's `node_id`, expanding
via GENEALOGY edges where `subject_node_id = current_node`. The expansion is bounded
by two guards: the `visited_nodes` array (which prevents re-visiting any node already
in the path, providing cycle immunity even if axiom A-06 is bypassed) and a `depth < 20`
limit (corresponding to the target SLO for genealogy queries). The composite index
on `(tenant_id, predicate, subject_node_id) WHERE superseded_by IS NULL` ensures that
each recursion step resolves in a single index scan over the active edge set.

Target performance: p95 < 1s for depth = 20 over a 5-year dataset. Per M3 lot
cardinality estimates for a large pharma tenant (approximately 10M GENEALOGY edges),
this requires the index to be resident in Postgres shared_buffers on the secondary
read replica. The OTG MV-01 pre-computes and caches common genealogy paths to reduce
hot-path recursion frequency.

### 7.2 Backward Genealogy (Lot to All Ancestors)

The backward walk — "what went into this lot" — uses the reverse direction:
expanding via GENEALOGY edges where `object_node_id = current_node`. The reverse
index on `(tenant_id, predicate, object_node_id) WHERE superseded_by IS NULL`
supports this without a full table scan.

For multi-parent lots (rework / mixing scenarios), the backward walk fans out at
each merge node, recovering all contributing genealogy paths. The `genealogy_type`
metadata on the GENEALOGY edge identifies which merge pattern applies.

### 7.3 Cycle Prevention

Axiom A-06 rejects cycle-forming edges at write time. The CTE additionally
carries a `visited_nodes` array and aborts expansion on revisit.
The two-layer defence ensures that even if A-06 is bypassed via a direct
database write in an emergency, the query will not loop infinitely.

### 7.4 Recall Scope Identification

Recall scope = backward genealogy (all ancestors, including supplier source lots) +
forward genealogy (all descendants, including already-released lots).

MV-07 `mv_recall_scope` pre-computes affected nodes incrementally via CDC. For
ad-hoc recall impact queries (e.g. during a live regulatory inspection), the raw
CTE query can be run against the live `otg_edge` table with a timeout of 5s and
a depth limit of 20. If depth > 20 is required, the request is escalated to the
batch recall scope calculator which runs unconstrained.

---

## §8 Authority and Signature Anchoring

### 8.1 Per-Event Signature Reference

Every OTG event that corresponds to a regulated action (SIGNED_BY, RELEASED_BY,
DISPOSITIONED_AS for Tier-1 or Tier-2 actions) carries `signature_id` referencing
the E7 signature record. The E7 signature record independently stores the algorithm,
key ID, signature bytes, and RFC 3161 timestamp token. The OTG does not duplicate
these fields — it references them by ID, creating the "record-signature linking"
required by 21 CFR 11.70.

### 8.2 Hash Chain Per Node

Each `otg_node` version carries a SHA3-256 hash computed over the canonical field
set including `node_id`, `tenant_id`, `root_id`, `root_revision`, `lifecycle_state`,
`created_by_principal`, and `predecessor_hash`. The `predecessor_hash` for the first
version is a 32-byte zero value. This forms a linked chain where any tampering with
an intermediate version breaks all subsequent hashes. Axiom A-09 verifies chain
continuity in the daily reconciliation job.

### 8.3 Daily Merkle Anchor

At 00:30 UTC daily, the anchor job:
1. Selects all `otg_event` rows with `anchor_seq IS NULL` (the previous 24h window).
2. Computes a Merkle tree over the SHA3-256 hashes of these events, ordered by `occurred_at`, broken by tenant.
3. Stores the Merkle root hash in `audit_chain_anchor` (shared table with B6 C1).
4. Updates `anchor_seq` on all included events.
5. For tenants with RFC 3161 contract: submits Merkle root to the external TSA; stores the timestamp token in `audit_chain_anchor.tsa_token`.
6. Emits `ANCHOR_EMITTED` OTG event per tenant.

Anchor failure > 25h triggers SLO-10 burn and SEV-1 incident (RB-INC-004).
Cross-reference: B2 §7 (Authority Ledger anchoring uses the same `audit_chain_anchor` table).

---

## §9 Tenant Boundary

The OTG enforces tenant isolation at three levels:

**Write guard (L5):** Every node/edge/event insert checks that `tenant_id` matches
the current request context derived from the authenticated session (L1). Mismatch
returns HTTP 403 and emits a security audit event. The `tenant_id` is never
accepted from user-supplied request body fields — it is always resolved from the
validated session context.

**Query guard (L5):** All OTG query functions bind `tenant_id` as the first
parameter of every WHERE clause. Parameterised queries prevent injection; the
service layer enforces that `tenant_id` is resolved from session context before
any graph traversal is initiated.

**Axiom A-07 (daily reconciliation):** Post-hoc check that no cross-tenant edges
exist without an explicit inter-company agreement. Any violation detected post-commit
triggers SEV-1 and RB-INC-005, as this indicates either a bug in the write guard
or a direct database write that bypassed the application layer.

Vendor-side OTG (platform telemetry) operates at L8 under `tenant_id = PLATFORM`.
Cross-tenant aggregation for L8 analytics reads only anonymised node counts and
event type distributions; it may never read node content or edge metadata from
customer tenants (per B6 C5 SLO-19).

---

## §10 Schema Evolution

| Change type | Classification | Ratification required |
|---|---|---|
| Adding a new predicate to the catalog | Class B | Engineering review board; Compliance sign-off only if predicate encodes regulated personal data |
| Adding a new axiom | Class A | Engineering review board + Compliance sign-off; impacts all existing data verification |
| Removing an axiom | Class A | Engineering review board + Compliance sign-off + regulatory impact assessment |
| Changing predicate cardinality | Class A | Compliance sign-off required; existing edges may need migration |
| Adding a column to `otg_node` / `otg_edge` / `otg_event` | Class B | Additive; NULL default required; no migration of existing rows |
| Removing or renaming a column | Class A | Migration required; all consumers updated before deployment |
| Adding a pack predicate | Class B | Pack architect review; pack license enforcement via axiom A-16 |

Backward compatibility rule: old events written before a predicate addition remain
valid. Consumers that encounter a predicate they do not recognise must treat it as
opaque (store and forward; do not error). This is the open-world assumption required
for forward compatibility as new pack predicates are added in later waves.

New predicates are assigned the next available P-NN identifier and added to the
`otg_predicate_catalog` table. The Postgres check constraint on `otg_edge.predicate`
is updated in a H7 Class B migration.

---

## §11 Performance

### 11.1 Write Path

Target: < 50ms p95 for a single L4 mutation that inserts one `otg_node` version
plus one to three `otg_edge` rows plus one `otg_event` row, all within a single
serialisable transaction on the primary Postgres instance.

Budget breakdown: L4 domain entity insert/update approximately 15ms; OTG
node/edge/event insert for three rows approximately 10ms; SHA3-256 hash
computation for three items approximately 2ms; axiom guards for A-06 cycle
check plus A-07 tenant check plus A-01, A-02, and A-11 approximately 8ms;
outbox event insert if applicable approximately 5ms. Total approximately 40ms,
leaving 10ms headroom against the 50ms target.

Hash computation is performed in the application service layer (L4) before the
transaction is opened, eliminating Postgres-side computation cost.

The cycle check (A-06) uses the pre-built `mv_lot_genealogy_forward` to check
reachability in < 5ms for genealogy depths less than 10, which covers 95% of
write workloads. Only if the lot is at depth > 15 does the cycle check fall
back to a live CTE query against `otg_edge`.

### 11.2 Read Path

Genealogy depth-20 query: p95 < 1s. Sustained by the composite index described
in §7.1 and the MV-01 pre-computation for common lot paths.

MV reads (all): p95 < 50ms served from Postgres buffer pool on the read replica;
no disk I/O for data created within the past 90 days.

Audit trail by record (MV-04): p95 < 100ms for a full 5-year record history,
assuming the monthly partition for the query window is in shared_buffers.

---

## §12 Storage Strategy

### 12.1 Primary Store

PostgreSQL 16 is the sole OTG primary store. All three tables (`otg_node`,
`otg_edge`, `otg_event`) reside in the same Postgres database as the domain
entity tables, enabling same-transaction writes and FK integrity without
distributed transaction overhead.

`otg_event` is range-partitioned by `occurred_at` (monthly partitions) with
hash sub-partitioning by `tenant_id` within each monthly partition.
`otg_node` and `otg_edge` are hash-partitioned by `tenant_id` (16 shards).

### 12.2 Optional Graph Accelerator

For tenants requiring genealogy depth > 20 at scale (more than 50M GENEALOGY
edges), Apache AGE (PostgreSQL graph extension) may be provisioned as a
read-only accelerator. AGE ingests `otg_edge` rows via CDC and builds a
Cypher-queryable graph in memory. AGE is strictly read-only — all writes
continue through the `otg_edge` table to preserve audit chain integrity.
AGE is subject to the same backup and WORM retention policies as the primary
OTG tables.

### 12.3 WORM Export

Monthly `otg_event` partitions older than 30 days are WORM-exported to immutable
object storage using S3-compatible Object Lock in COMPLIANCE mode. The partition
data is exported as Parquet format. The SHA3-256 hash of the Parquet file is
stored in `audit_chain_anchor` alongside the daily Merkle root for that period.
This satisfies 21 CFR 11.10(c) record protection and EU GMP Annex 11 §17
long-term data accessibility requirements.

### 12.4 Archival Tier

Per H5 retention policy: regulated tenant events are retained for a minimum of
10 years (pharma/MD) or 5 years (food/auto). After the active Postgres partition
is WORM-exported and verified, the Postgres partition is dropped to manage
primary storage cost. Replay from WORM export is the recovery path if older
data is needed (§14).

---

## §13 Cross-Region Operation

Per W13, tenants operating across multiple geographic regions require OTG event
consistency across those regions.

**Anchor consistency:** Each region runs its own daily Merkle anchor job against
the local `otg_event` replica. The Merkle root hashes from all regions for a
given tenant and date window must match, verified by the cross-region anchor
reconciler (a daily L8 job). A mismatch triggers SEV-1 and RB-DR-012.

**Conflict resolution:** If two regions concurrently write events for the same
`root_id` during a network partition, the OTG saga coordinator (L3) uses
optimistic locking on `root_revision` (axiom A-08). On reconnect, the saga
replays the losing region's events with new timestamps and links them via a
`COMPENSATED_BY` edge to the conflicting version. The resolution is recorded
as a `CONFLICT_RESOLVED` event kind in `otg_event`.

**Per-region latency budget:** Replication lag from primary to secondary region
must be < 60s (SLO-13). If lag exceeds 300s, the secondary region enters
degraded mode (read-only for Tier-1 regulated writes; informational writes
continue). Degraded mode triggers alert and page to on-call.

**ITAR-segregated regions (Aero pack J3):** ITAR-controlled OTG events are
written only to the ITAR-designated region. Cross-region replication for
ITAR-tagged events is disabled. The secondary region anchor reconciler skips
ITAR-flagged partitions.

---

## §14 Replay Tooling

The OTG replay tool rebuilds any materialised view or the full OTG node/edge
state from the append-only `otg_event` stream, starting from a verified anchor
checkpoint.

### 14.1 Replay Procedure (per RB-INC-001)

Step 1: Identify the target scope — single MV, all MVs for a tenant, or cross-MV
per tenant.

Step 2: Identify the start anchor — the latest `audit_chain_anchor` entry whose
Merkle root hash can be independently verified from the WORM export or TSA token.

Step 3: If replaying from WORM export — restore the Parquet partition to a staging
Postgres schema; verify the SHA3-256 of the restored data against the WORM manifest
stored in `audit_chain_anchor`.

Step 4: Apply OTG events in `occurred_at` order from the anchor checkpoint to
present, replaying node and edge insertions in the staging schema.

Step 5: Verify axiom A-09 (hash chain continuous) on all rebuilt node chains;
any break halts the replay and triggers FM-OTG-08 escalation.

Step 6: Swap the rebuilt MV into production via view alias; retain the old MV
for 48 hours as a rollback target.

Step 7: Emit a `LINEAGE_REPLAYED` OTG event (predicate P-25) for each rebuilt
lot node to record that the lineage was validated post-rebuild.

### 14.2 Replay Timing Targets

| Scope | Target duration |
|---|---|
| Single MV, single tenant, current day | < 30 minutes |
| Full MV set, single tenant, current year | < 4 hours |
| Full MV set, single tenant, 5-year history | < 24 hours |
| Full OTG rebuild from WORM export, single tenant | < 48 hours |

---

## §15 Failure Modes

**FM-OTG-01 Axiom Violation in Production**
- Trigger: Daily reconciliation job detects A-01..A-18 violation on committed data.
- Severity: SEV-1.
- Immediate response: Lock affected records; notify Compliance and Engineering; open RB-INC-005.
- Recovery: Identify root cause (code bug vs. direct DB write vs. CDC replay error); compensate or void erroneous edges via TCC compensation; re-verify axiom compliance; CAPA.
- Regulatory implication: May require deviation report per customer's QMS.

**FM-OTG-02 Anchor Missed More Than 25 Hours**
- Trigger: SLO-10 burn alert; count of unanchored events older than 25 hours is greater than zero.
- Severity: SEV-1; triggers RB-INC-004.
- Recovery: Run emergency anchor job; identify root cause (cron failure, Postgres lock contention, TSA endpoint unavailability); restore normal anchor cadence; verify A-18 compliance post-recovery.

**FM-OTG-03 CDC Consumer Crash**
- Trigger: L8 CDC relay process down; replication slot lag increasing; SLO-13 CDC lag > 60s.
- Severity: SEV-2 initially; escalates to SEV-1 if lag > 600s or if any regulated write has not been replicated.
- Recovery: Restart CDC relay; resume from `last_applied_lsn`; verify no events dropped by comparing event counts pre- and post-resume; replay MVs if gap detected per RB-INC-001.

**FM-OTG-04 Genealogy DAG Cycle Detected**
- Trigger: Axiom A-06 fires at write time, or daily reconciliation detects a cycle.
- Severity: SEV-1.
- Recovery: Identify the edge forming the cycle; determine whether inserted via application code bug or direct DB write; correct the data by compensating the erroneous edge; update the application-layer guard; CAPA.

**FM-OTG-05 MV Freshness Drift**
- Trigger: SLO-5 burn alert; MV `last_refreshed_at` lags `otg_event.occurred_at` by more than 5s.
- Severity: SEV-2.
- Recovery: Identify CDC lag as root cause; scale the CDC relay; check Postgres WAL sender queue depth; if MV data is materially stale, trigger manual MV rebuild per RB-INC-001 §5.

**FM-OTG-06 Cross-Region Anchor Mismatch**
- Trigger: Cross-region anchor reconciler detects Merkle root hash mismatch for the same tenant and date window.
- Severity: SEV-1; triggers RB-DR-012.
- Recovery: Identify which region's event stream diverged; compare event counts and hashes; if split-brain confirmed, replay the minority region from the primary region's anchor; document as incident; post-incident review within 48 hours.

**FM-OTG-07 Predicate Version Mismatch**
- Trigger: Consumer encounters an unknown predicate; indicates schema evolution was deployed without updating the consumer.
- Severity: SEV-2.
- Recovery: Consumer must treat unknown predicates as opaque per the open-world assumption (§10). If a consumer errors on an unknown predicate, that is a consumer code bug; fix the consumer to handle gracefully; no data recovery required.

**FM-OTG-08 Replay Tool Corruption**
- Trigger: Hash chain integrity check fails during replay; axiom A-09 violation detected during rebuild.
- Severity: SEV-1.
- Recovery: Stop replay; restore from WORM export rather than the CDC stream; verify the WORM Parquet SHA3-256 against the manifest in `audit_chain_anchor`; if WORM is also corrupt, engage legal hold and forensic investigation.

**FM-OTG-09 Partition Drop Before Retention Floor**
- Trigger: Axiom A-13 fires; a partition drop is attempted before the retention floor date.
- Severity: SEV-1.
- Recovery: Block the drop operation; restore the partition if partially dropped; notify Compliance; update the DBA runbook and implement a pre-drop retention check in the maintenance automation.

---

## §16 KPIs

| KPI | Numerator | Denominator | Window | Target | Source | Alert threshold |
|---|---|---|---|---|---|---|
| SLO-5 MV Freshness | MV refreshes completing within 5s of triggering OTG event | All MV refresh events | 24h rolling | >= 99.9% | `mv_refresh_log` | < 99.5% |
| SLO-6 Axiom Violation Rate | Post-commit axiom violations found in reconciliation | 7-day period | 7 days | 0 violations | Daily reconciliation job | > 0 |
| SLO-10 Anchor Lag | Max age of unanchored events across all tenants | Per tenant | Continuous | < 25 hours | Anchor lag monitor | > 20 hours |
| SLO-13 CDC Lag | Max replication slot lag across all CDC consumers | Per slot | Continuous | < 60 seconds | `pg_replication_slots` | > 45 seconds |
| Genealogy Depth-20 Query p95 | p95 latency of depth-20 genealogy queries | All depth-20 queries | 24h rolling | < 1 second | APM trace | > 800ms |
| SLO-19 Cross-Tenant Attempt Rate | Rejected cross-tenant edge assertions | Year | 0 attempts | Security audit log | > 0 |

---

## §17 Per-Pack Overlay

### J1 Pharma (DSCSA + EU FMD)

Pack predicates added: `DSCSA_EXCHANGED_WITH` (domain: PACKAGED_PRODUCT; range:
TRADING_PARTNER node; cardinality: 1:N per transaction step; Tier-1 regulated event),
`FMD_DECOMMISSIONED` (domain: SERIALISED_UNIT; range: DISPENSE_EVENT node; once-only).

Pack nodes added: TRADING_PARTNER, DSCSA_TRANSACTION, FMD_PRODUCT_MASTER.

RELEASED_TO_MARKET (P-27) maps to DSCSA T3 (dispense) event for US market releases
and to FMD decommission event for EU market releases. Both are recorded as OTG events
with pack-specific payload in `otg_event.payload`.

Axiom A-16 enforces that DSCSA predicates appear only in graphs for tenants with
`pack_tags @> '{"pharma": true}'`.

### J2 Auto (VIN Traceability + OEM EDI)

Pack predicates: `PER_VIN_SERIALISED` (domain: FINISHED_ASSEMBLY; range: VIN_NODE;
once-only; cardinality 1:1 per VIN), `OEM_EDI_ACKNOWLEDGED` (domain: DELIVERY_ORDER;
range: OEM_EDI_ACK node; cardinality 1:N for multi-OEM deliveries).

GENEALOGY edges are used to record per-VIN assembly genealogy, linking all consumed
lot IDs through sub-assembly nodes to the finished vehicle VIN. This supports
the per-VIN recall scope calculator required by OEM contractual obligations.

OEM EDI acknowledgment events are recorded as OTG events with pack-specific metadata
including `ediMessageId`, `oemCode`, and `deliveryDate`.

### J3 Aero (AS9120B + ITAR)

Pack predicates: `HEAT_TRACE` (domain: LOT; range: HEAT_CERT node), `COIL_TRACE`
(domain: LOT; range: COIL_CERT node), `ALLOY_CERTIFIED_BY` (domain: MATERIAL;
range: ALLOY_CERT node).

The AS9120B traceability chain is represented as a three-level GENEALOGY extension:
LOT node linked to HEAT_NUMBER node via HEAT_TRACE, HEAT_NUMBER linked to COIL_NUMBER
via COIL_TRACE, COIL_NUMBER linked to the originating ALLOY_CERT via ALLOY_CERTIFIED_BY.
This three-level chain satisfies AS9120B §5.3 material traceability requirements.

ITAR flag on `otg_event.pack_tags` (`"itar": true`) triggers write exclusively to the
ITAR-designated region partition. Cross-region replication is disabled for ITAR-tagged
events (§13). Axiom A-10 requires ECDSA-P384 (FIPS 140-3) for all SIGNED_BY edges in
ITAR-flagged tenants.

### J4 Medical Device (UDI + SOUP)

Pack predicates: `PRODUCED_UDI` (domain: SERIALISED_UNIT; range: UDI_RECORD node;
once-only; carries UDI-DI and UDI-PI composite per EU MDR Article 27 and FDA 21
CFR §830), `VALIDATED_AGAINST` (domain: SOFTWARE_COMPONENT; range: VALIDATION_RECORD
node; for IEC 62304 §8.1 SOUP verification).

RELEASED_TO_MARKET (P-27) triggers a UDI activation outbox event to the relevant
EUDAMED or FDA GUDID endpoint via the L8 outbox relay. The outbox event payload
includes the full UDI string, device identifier, and lot/serial number.

VALIDATED_AGAINST links each SOUP component to its OQ/PQ validation record, enabling
the SOUP register required by IEC 62304. The graph walk from any device serial number
through PRODUCED_UDI to VALIDATED_AGAINST provides the complete software bill of
materials traceability.

### J5 Food (FSMA §204 KDE/CTE)

Pack predicates: `KDE_RECORDED` (domain: LOT; range: KEY_DATA_ELEMENT node; M:N
because multiple KDE types apply to one lot), `CTE_COMPLETED` (domain: SHIPMENT;
range: CRITICAL_TRACKING_EVENT node; one CTE per supply chain step), `TRANSPORTED_AS`
(domain: LOT; range: TRANSPORT_RECORD node carrying temperature logs, carrier ID,
and sanitary transport certificate reference).

FSMA §204 requires Key Data Elements and Critical Tracking Events to be electronically
recorded for FDA-designated foods. OTG KDE/CTE predicates form the FSMA-compliant
traceability record that must be producible within 24 hours of an FDA request.

CTE_COMPLETED events are the FSMA-equivalent of RELEASED_BY for supply chain custody
transfer. The combination of DISPOSITIONED_AS (quality) plus CTE_COMPLETED (custody)
forms the "one step forward / one step back" traceability required by FSMA §204.

TRANSPORTED_AS carries sanitary transport compliance metadata per FSMA Sanitary
Transport final rule (21 CFR Part 1 Subpart O), including temperature exceedance
flags and carrier license verification.

---

## §18 Cross-References

- **A1:** OTG is a foundational platform substrate; aligns with system-level constraints on modular monolith and single-transaction writes
- **B1 §5 (L5):** OTG is the sole persistence mechanism at L5; all L4 domain root mutations write to OTG within the same serialisable transaction; no separate synchronisation step
- **B2:** Authority Ledger axioms AL-A-1..AL-A-4 cross-check OTG axioms A-01, A-04, A-05, and A-07; both use the shared `audit_chain_anchor` table for Merkle anchoring
- **B6 C1:** OTG events feed the Audit Chain anchor; Merkle root is shared; P-19 RECORDED_BY predicate cross-links specific records to their anchor batch
- **B6 C2:** OTG axioms A-01..A-18 are the runtime enforcement layer for CC-2 (OTG Axiom Enforcement cross-cutting concern)
- **B6 C5:** Tenant boundary CC-5 is implemented at OTG level via axiom A-07 and per-tenant hash partitioning across all three OTG tables
- **B7:** State machine transitions SM-1..SM-14 are the primary source of OTG events; every SM transition carries `sm_transition_id` on the corresponding `otg_event` row
- **B8:** CDC integration (§6) implements the B8 integration boundary specification between L5 and L8; outbox pattern is defined at B8 and implemented here
- **C8:** Recall scope calculator consumes MV-07 `mv_recall_scope`; genealogy walk specifications in §7.4 are the implementation reference for C8 §3
- **D11:** OTG genealogy and lineage data powers the Digital Thread at the D11 integration layer; D11 reads from MV-01 and MV-02
- **E5:** Workspace projection layer consumes MV-05 `mv_workspace_projection_feed` for real-time workspace updates across all 18 HMV4 workspace slices
- **E6:** Audit trail API reads MV-04 `mv_audit_trail_by_record` and MV-06 `mv_signature_audit`; E6 endpoints are the primary consumer of the OTG audit surface for regulatory query
- **E7 §2.5:** Signature history queries use SIGNED_BY edges from MV-06; E7 §2.8 revocation creates a REVOKED_BY edge (retraction of the original SIGNED_BY edge via COMPENSATED_BY)
- **H1 §4:** 21 CFR 11.10(b) accurate copies satisfied by MV-04 append-only design; 11.10(c) record protection satisfied by WORM export; 11.10(j) accountability satisfied by ACTED_BY and AUTHORED_BY predicates; EU GMP Annex 11 §9 satisfied by axiom A-02; Annex 11 §17 satisfied by archival tier (§12.4)
- **H4:** Every ACTED_BY, SIGNED_BY, and DISPOSITIONED_AS OTG event is also an H4 audit event; OTG is the implementation substrate for audit event emission in CC-1
- **M3:** Every `node_kind` in `otg_node` maps to a root in the M3 root catalog (95 roots); the predicate catalog of 27 predicates is sized and typed to cover all M3 root relationships and regulatory traceability requirements
- **M4:** State machine network specification (M4) defines the 14 SMs whose transitions drive OTG events; SM-7 (Recall Management) directly drives MV-07 consumption
- **M5:** SLO-5 (MV freshness < 5s), SLO-6 (axiom violations = 0/7d), SLO-10 (anchor lag < 25h), SLO-13 (CDC lag < 60s), and SLO-19 (cross-tenant attempts = 0 per year) are all defined in M5 and monitored via the KPIs in §16

---

```
S1-03_B3_OPERATIONAL_TRUTH_GRAPH_DEEP_UPGRADE_COMPLETE
```
