# B3 — Operational Truth Graph

This chapter describes the Operational Truth Graph (OTG) — HESEM's single
graph of operational facts. The OTG is the substrate that turns four
federated systems (ERP, MOM, MES, eQMS) into one operational truth.

The OTG is HESEM's most distinctive architectural element. Without it,
genealogy queries take seconds and traverse multiple databases; with it,
they take milliseconds and traverse one consistent graph. Without it,
audit packs take weeks to assemble; with it, they take 24 hours. Without
it, AI advisory has no clean substrate to reason over; with it, AI sees
the full operational picture without crossing system boundaries.

---

## 1. What the Operational Truth Graph is

The OTG is a single, consistent, append-only-by-default graph in which
every operational fact about the manufacturing enterprise is represented
as a node, every relationship as an edge, and every change as an event.

Concretely:

- **Nodes** represent things: lots, batches, releases, nonconformances,
  CAPAs, controlled documents, equipment, calibrations, audit events,
  workflow events, evidence artifacts, AI advisory annotations, and
  policy directives.
- **Edges** represent relationships: parent-of-lot, derived-from,
  inspected-by, raised, corrected-by, released-by, governed-by,
  validates, signed-by, acted-by, lineage-replayed-from, and others.
- **Events** represent changes: every mutation in HESEM produces at
  least one event that is consumed by the OTG and persisted.

The OTG is logically a graph; physically it is implemented as adjacency
tables in PostgreSQL plus a daily anchor of the audit chain. (Per V8 ADR
the implementation choice is PostgreSQL adjacency, with optional graph-DB
read-side accelerator if future scale demands it; the choice is made by
engineering, not by V9.)

---

## 2. Why HESEM has the OTG

Without the OTG, HESEM would have:
- One database for the ERP (Sales Order, Customer, Item)
- Another for the MOM (Job Order, Work Order, Operation)
- Another for the MES (Operation Execution, OEE Event, SPC)
- Another for the eQMS (Inspection, Nonconformance, CAPA, CDOC)
- Another for the maintenance system (Equipment, Maintenance Work Order)
- Yet another for the genealogy (Lot Genealogy, Serial)

Each database would have its own data model, its own query language, its
own consistency guarantee. To answer "show me everything about Lot 47,"
HESEM would have to query six databases, each with its own foreign-key
conventions, and assemble the answer in application code. The answer
would be slow, prone to drift, and fragile to schema changes.

The OTG collapses this to one graph. Every authoritative root (Class A
of B2) is also an OTG node. Every relationship between roots is an OTG
edge. Every mutation is also an OTG event. The OTG is the consistent
view across all six databases worth of detail.

Examples of queries the OTG answers in milliseconds:

- "Show me every lot derived from supplier batch X."
- "What is the genealogy of finished-goods lot Y back to raw materials?"
- "What CAPA actions have been taken in response to NCs raised on
  equipment Z?"
- "What evidence artifacts support the release of batch B?"
- "What audit events were generated for user U over the past 30 days?"
- "What controlled documents were released by user V?"
- "What is the full chain of authority for the close of CAPA C?"
- "What AI advisories have been issued on case N? What did the human
  decide? Did the human override?"

These are the queries customers want, regulators want, and engineers
need to answer in seconds.

---

## 3. The eight authority classes inside the OTG

OTG nodes are typed. Each node has exactly one authority class:

```
authoritative_root           the system of record (e.g., LOT, BREL, NC, CAPA, CDOC)
projection_workspace          a denormalized read view (e.g., NQ Case Inbox)
derived_read_model            an analytic data product (e.g., Quality Trend)
evidence_artifact             a signed evidence record (e.g., IQ run, calibration cert)
workflow_event                a transition record (e.g., NQCASE.dispose_concession)
audit_event                   a hash-chained mutation record
ai_advisory_annotation        an AI-generated recommendation record
policy_directive              a versioned policy entry from the Authority Ledger
```

These are the same eight classes referenced in B2 (Authority Model). The
OTG and the Authority Ledger share the same vocabulary because the
Authority Ledger is itself a special class of OTG node (policy_directive)
linked to authoritative_roots via GOVERNED_BY edges.

---

## 4. The 22 OTG edge predicates

OTG edges are typed. There are 22 standardized predicates. Most predicates
are binary (subject → object); some are M:N (a lot can have many parents
via GENEALOGY).

```
Workflow predicates:
   TRIGGERED_BY        an audit event triggered by a workflow event
   ATTEMPTED            a workflow event that attempted a mutation (may have failed)
   COMMITTED            a workflow event that succeeded in mutating
   DENIED               a workflow event that was denied at the guard

Genealogy predicates:
   GENEALOGY            child material derived from parent material (M:N)
   DERIVED_FROM         derived read model derived from authoritative root
   SOURCED_FROM         derived read model sourced from another derived model

Validation predicates:
   VALIDATES            evidence artifact validates an authoritative root
                        (e.g., calibration certifies equipment)
   GOVERNS              policy directive governs a transition (M:N)

Audit predicates:
   RECORDED_BY          audit event records a mutation of an authoritative root
   ACTED_BY             audit event acted by an identity principal
   ON_BEHALF_OF         audit event acted on behalf of a delegated principal
   SIGNED_BY            audit event signed by an identity principal (e-signature)
   ANNOTATED            AI advisory annotated an authoritative root

Lifecycle predicates:
   SUPERSEDED_BY        an authoritative root version superseded by a new version (1:1)
   COMPENSATED_BY       a committed transition rolled back by a compensating transition

Linkage predicates:
   LINKED               authoritative root linked to another (e.g., BREL.lot_id → LOT)
   PART_OF              child entity part of parent (e.g., FAILURE_MODE PART_OF FMEA)

Authority Ledger predicates:
   GOVERNED_BY          authoritative root governed by an Authority Ledger entry
   COMMANDS_ALLOWED_BY  command allowed by an Authority Ledger entry (M:N)
   FORBIDDEN_AT         surface forbidden to mutate per Authority Ledger entry

Lineage predicates:
   LINEAGE_REPLAYED     derived read model rebuilt from event log

Tenant predicates:
   TENANT_SCOPED        every node has exactly one TENANT_SCOPED edge
```

Total: 22 predicates. Adding new predicates requires an Architecture
Decision Record.

---

## 5. The 18 OTG axioms (truth conditions)

The OTG has 18 truth conditions that must always hold. These axioms are
checked online by database triggers (where feasible) and offline by a
nightly integrity audit job.

```
A1.  Tenant scoping totality. Every node has exactly one TENANT_SCOPED
     edge. No node is global; system-level entries belong to the
     tenant 'hesem-system'.

A2.  Authoritative root uniqueness. For each (resource_family,
     external_id, tenant_id) tuple, at most one node has authority
     class 'authoritative_root' and superseded_by_id IS NULL.

A3.  Audit chain totality. Every mutation on an authoritative root is
     preceded by at least one audit_event with a RECORDED_BY edge to
     the mutated root, within 5 seconds of the mutation, and is part
     of the daily-anchored hash chain.

A4.  Workflow event totality. Every state transition on an
     authoritative root produces a workflow_event node with the
     transition's from-state, to-state, attempted-vs-committed flag,
     guard evaluation results, principal id, idempotency-key, and
     trace identifier.

A5.  Evidence linkage for regulated roots. Every regulated
     authoritative root that reaches a 'released' terminal state has
     at least one evidence_artifact with a VALIDATES edge whose
     freshness is within the validation policy window (default 365
     days; per-regulatory windows in PART_H).

A6.  Policy directive coverage. Every workflow transition exists in
     at least one policy_directive's GOVERNS edge for at least one
     currently-effective directive. A transition with no governing
     directive is unreachable.

A7.  AI advisory non-authority. No ai_advisory_annotation has an
     outbound COMMITTED edge. AI never commits transitions. (Per
     V3 RULE-2 and PART_L.)

A8.  Lineage soundness. For every derived_read_model node, the
     LINEAGE_REPLAYED edge points to an event window such that
     replaying that window produces (within tolerance) the current
     model. Drift greater than zero is a SEV-2 incident.

A9.  Supersession chain finiteness. The directed graph formed by
     SUPERSEDED_BY edges across all authoritative_roots in a single
     (resource_family, external_id, tenant_id) series is a simple
     chain (no branches, no cycles, no orphans except the head).

A10. Cross-tenant edge prohibition. No edge connects nodes in
     different tenants except where the subject is policy_directive
     and tenant_id is 'hesem-system'.

A11. Evidence WORM. Every evidence_artifact and every audit_event is
     stored in WORM media (S3 Object Lock or equivalent) with retention
     at least equal to its declared retention class minimum.

A12. Freshness monotonicity. For any node, the freshness timestamp
     increases monotonically. A backwards-clock anomaly is a SEV-1
     incident (NTP drift, clock skew, or tampering).

A13. Watermark causality. For any derived_read_model or
     projection_workspace, the source_watermark timestamp is at or
     before NOW() and is at or before the maximum event timestamp
     consumed by the node.

A14. Genealogy DAG. GENEALOGY edges form a directed acyclic graph. A
     material lot cannot be its own ancestor.

A15. Authority Ledger backing. Every authoritative_root has at least
     one outbound GOVERNED_BY edge to an active Authority Ledger
     entry. Roots without an Authority Ledger entry cannot be mutated.

A16. OT edge integrity. Every node with metadata source 'edge_gateway'
     has the device certificate fingerprint set, has sequence numbers
     monotonic per edge_id, and stays within the tenant subgraph; no
     cross-tenant edges from edge gateway. (See PART_B8 for OT details.)

A17. AI advisory chain anchoring. Every ai_advisory_annotation node
     references its model card entry, training timestamp, and has an
     associated audit chain extension within the day's anchor window.

A18. Validation evidence freshness propagation. If a root's validation
     evidence (latest VALIDATES edge) becomes stale, the root's
     lifecycle state on regulated transitions is automatically
     blocked until evidence is refreshed.
```

These axioms are inviolable. The nightly integrity audit job verifies
all 18.

---

## 6. The seven mandatory materialized views

The OTG, while logically a graph, must answer specific queries fast. Seven
materialized views are mandated to ensure these query latencies are met:

```
MV-1  mv_otg_genealogy_upstream
       Recursively walks GENEALOGY edges to give the upstream ancestry of
       any lot, with depth tracking (capped at 20 levels). Used by genealogy
       workspaces and recall workflows.

MV-2  mv_otg_open_ncs_by_lot
       Per lot, count of open NCs and CAPAs, plus most-recent activity.
       Used by lot release workflows and quality dashboards.

MV-3  mv_otg_brel_release_history
       Full release history per product, with reviewer and signer chains.
       Used by Annual Product Review (pharma) and audit pack export.

MV-4  mv_otg_validation_evidence_freshness
       Per regulated authoritative root, the most recent VALIDATES edge's
       freshness. Used for proactive expiration alerts (90 days, 30 days,
       7 days, on-due).

MV-5  mv_otg_audit_chain_health
       Per day, count of audit events versus the most recent anchor.
       Used by the audit chain integrity dashboard.

MV-6  mv_oee_freshness
       Per equipment, last state event timestamp. Used by Andon and OEE
       dashboards to indicate data freshness.

MV-7  mv_ai_advisory_acceptance
       Per AI feature per model version per tenant per day, count of
       advisories accepted vs overridden. Used by AI Lead's acceptance-
       rate KPI.
```

Each MV has a refresh cadence (incremental vs full) appropriate to its
freshness SLA. Each MV's drift (its current rows vs a fresh rebuild from
event log) is checked nightly; non-zero drift is a SEV-2 incident.

---

## 7. The OTG temporal model

The OTG is append-only by default. Authoritative records can be mutated
(state changes), but the audit_event records of those mutations are
append-only and hash-chained. The chain anchors daily.

Every node has two timestamps:
- **created_at**: when the node was first inserted
- **updated_at**: the last mutation; for authoritative records, this is
  also the freshness timestamp used to generate ETags

Every derived node (projection or read-model) also has:
- **source_watermark**: the highest event timestamp consumed by this node
  (used to indicate how fresh the projection is)

Every evidence artifact has:
- **attested_at**: when the evidence claims to be true
- **recorded_at**: when the system recorded the evidence
  (the gap between these two is the backdating window; backdating
  beyond a policy-defined limit requires an e-signature)

This temporal model serves the regulator's question "what was true at
time T?" — the OTG can rewind to any past state by replaying the event
log up to T.

---

## 8. The OTG migration story

The OTG is not built in one wave. It is built in stages aligned with
the Wave Plan (PART_G):

```
Stage 0 (Wave 0.5 Platform Substrate):
  OTG schema migration applied; tables exist with no data.
  Integrity job runs cleanly against empty tables.

Stage 1 (Wave 4):
  Backfill the 18 Wave-1 authoritative roots from existing fixtures.
  Backfill known LINKED relationships from foreign keys.
  Backfill audit events from existing audit log (best-effort, marked).

Stage 2 (Waves 4 to 4.5):
  Every L4 graduation (live read-only API) populates OTG via L5 consumer.
  L5 projections start being served from OTG.

Stage 3 (Wave 4.5 OTG-native cutover):
  L4 mutations write OTG events synchronously in the same database
  transaction. Old direct queries deprecated; clients migrate to
  projections.

Stage 4 (Wave 8):
  OTG is the canonical reporting source. Audit chain anchored daily to
  external timestamping authority (RFC 3161) for regulated tenants.
  DR drill validates OTG full replay from event log within 4-hour RTO.

Stage 5 (Wave 9 to Wave 10):
  Multi-tenant scaling: per-tenant subgraph isolation verified.
  Vertical packs (Pharma, Auto, Aero) add extension authority classes.
  AI advisories begin emitting AI advisory annotation nodes at scale.

Stage 6 (Wave 13):
  Multi-region OTG with cross-region anchor consistency.
```

This staged migration is described in PART_G per wave.

---

## 9. The OTG owner and discipline

The OTG is owned by the Data Platform Lead. The OTG schema is reviewed
quarterly. New predicates require ADR. New axioms require ADR. New
materialized views require ADR + freshness SLA + drift check.

The discipline:
- The OTG is read-only from the Authority side.
- Mutations to the OTG happen only via L5 consumers consuming L3 and L4
  events.
- No application directly inserts OTG rows.
- The integrity audit runs nightly without exception.
- Non-zero drift, dangling edges, axiom violations, anchor lag — all
  are SEV-1 or SEV-2 incidents and trigger appropriate runbooks.

---

## 10. Decision phrase

```
B3_OPERATIONAL_TRUTH_GRAPH_BASELINE_LOCKED
NEXT: B4_STATE_MACHINE_NETWORK.md
```
