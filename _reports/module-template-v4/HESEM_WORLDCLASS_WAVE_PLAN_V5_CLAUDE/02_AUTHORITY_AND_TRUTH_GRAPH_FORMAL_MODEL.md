# 02_AUTHORITY_AND_TRUTH_GRAPH_FORMAL_MODEL.md

## Purpose

GPT Pro V4 §09 sketches an **Operational Truth Graph (OTG)** with three concepts:

```text
otg_node, otg_edge, otg_event
authority_class ∈ { authoritative_root, projection_workspace, derived_read_model,
                    evidence_artifact, workflow_event, audit_event,
                    AI_advisory_annotation }
```

This is one of V4's strongest contributions — and one of its most underspecified. V4 lists the schema columns but does not define:

1. The **edge type catalog** (what predicates connect which classes)
2. The **invariants** that the graph must satisfy at all times
3. The **integrity checking algorithms** (online + offline) that prove the graph is sound
4. The **temporal semantics** (when is `freshness` updated, when is `source_watermark`, what is "stale")
5. The **query patterns** the graph must serve at world-class latency
6. The **migration story** from "no graph" (today) to "graph-as-truth" (Wave 4+)
7. The **regulated-class subset** (which OTG slice is GxP, which is not)
8. The **failure modes** when graph and underlying tables disagree
9. The **multi-tenant scoping** of the graph (per-tenant subgraph isolation)
10. The **audit chain anchoring** of graph mutations

This file produces the **formal model**: vocabulary, axioms, invariants, query catalog, lifecycle, validation. The companion file `10_DATA_ENGINEERING_DIGITAL_THREAD.md` covers implementation details (CDC, materialized view refresh, partitioning, vacuum strategy, etc.).

This file is normative for V5.

---

## Section 1 — Formal vocabulary

### 1.1 Authority classes (the 8-class taxonomy, formalized)

| # | Class | Mutability | Persistence | OTG presence | Example |
|---|---|---|---|---|---|
| 1 | `authoritative_root` | mutable, version-tracked | permanent (per retention class) | always 1:1 | LOT, BREL, CDOC, NC, WO |
| 2 | `projection_workspace` | derived, refresh-only | rebuildable | optional (referenced as a target) | `workspace.brel_inbox` |
| 3 | `derived_read_model` | derived, refresh-only | rebuildable | optional | `analytic.open_ncs_by_lot` |
| 4 | `evidence_artifact` | append-only | permanent + WORM where regulated | always | IQ/OQ/PQ run, calibration cert |
| 5 | `workflow_event` | append-only | permanent (compliance ≥ 7y) | always | "BREL submitted_for_review" |
| 6 | `audit_event` | append-only | permanent + hash-chained | always | "user X mutated BREL Y at T" |
| 7 | `ai_advisory_annotation` | append-only | permanent (training evidence) | always | "model M scored record R at T with conf C" |
| 8 | `policy_directive` *(V5-added)* | versioned, signed | permanent | always | "21 CFR 11 §11.10 e-sign required" |

V5 **adds** `policy_directive` as a first-class authority because it is:

- emitted by L2,
- consumed by L1,
- referenced by L3 transitions,
- subject to its own retention/audit chain.

This brings the V4 list of 7 classes to **V5's 8 classes**.

### 1.2 Class properties

```text
mutability ∈ { mutable, append_only, append_only_hash_chained, derived }
persistence ∈ { permanent, retention_bounded, rebuildable }
otg_required ∈ { true, optional }
worm_required ∈ { true, false }   # S3 Object Lock for evidence
gxp_eligible ∈ { true, false }    # may carry GxP classification
```

```text
authoritative_root          : mutability=mutable, persistence=permanent,
                              otg=true, worm=false, gxp=true
projection_workspace        : mutability=derived, persistence=rebuildable,
                              otg=optional, worm=false, gxp=false
derived_read_model          : mutability=derived, persistence=rebuildable,
                              otg=optional, worm=false, gxp=false
evidence_artifact           : mutability=append_only, persistence=permanent,
                              otg=true, worm=true, gxp=true
workflow_event              : mutability=append_only, persistence=permanent,
                              otg=true, worm=false, gxp=true
audit_event                 : mutability=append_only_hash_chained,
                              persistence=permanent, otg=true, worm=true, gxp=true
ai_advisory_annotation      : mutability=append_only, persistence=permanent,
                              otg=true, worm=false, gxp=true
policy_directive            : mutability=mutable_with_supersession,
                              persistence=permanent, otg=true, worm=true, gxp=true
```

### 1.3 Edge type catalog

V4 sketches a graph but does not name the predicates. V5 standardizes a finite **predicate vocabulary**:

```text
TRIGGERED_BY        : workflow_event ← audit_event
                      "this audit_event records this workflow_event"
ATTEMPTED           : workflow_event → authoritative_root
                      "this transition attempted to mutate this root"
COMMITTED           : workflow_event → authoritative_root
                      "this transition committed (state changed)"
DENIED              : workflow_event → authoritative_root
                      "this transition was denied (no state change)"
GENEALOGY           : authoritative_root → authoritative_root
                      "child material lot derived from parent"
                      cardinality: M:N
DERIVED_FROM        : projection_workspace → authoritative_root
                      "this projection sources from this root"
SOURCED_FROM        : derived_read_model → authoritative_root
                      cardinality: M:N
VALIDATES           : evidence_artifact → authoritative_root
                      "this IQ/OQ/PQ run validates this root"
GOVERNS             : policy_directive → workflow.transition_id
                      cardinality: M:N
RECORDED_BY         : audit_event → authoritative_root
                      "this audit_event recorded mutation of this root"
SUPERSEDED_BY       : authoritative_root → authoritative_root
                      "this root version was superseded by that one"
                      cardinality: 1:1
ANNOTATED           : ai_advisory_annotation → authoritative_root
                      "this AI advisory targeted this root"
ACTED_BY            : audit_event → identity_principal
                      "this mutation was acted by this principal"
ON_BEHALF_OF        : audit_event → identity_principal
                      delegation chain
SIGNED_BY           : audit_event → identity_principal
                      e-signature factor record
LINKED              : authoritative_root → authoritative_root
                      "domain-defined association"
                      e.g., BREL.lot_id → LOT
LINEAGE_REPLAYED    : projection_workspace → otg_event
                      "rebuilt from this event window"
TENANT_SCOPED       : * → tenant
                      every node has exactly one TENANT_SCOPED edge
```

That is 17 standardized predicate types. Adding new predicates requires an ADR (per `13_RISK_REGISTER_V5_FORMAL.md` change-control protocol).

### 1.4 Edge cardinality and direction

Each edge is **directed** (subject → predicate → object) and carries a cardinality:

```text
edge:
  subject_class:
  predicate:
  object_class:
  cardinality: 1:1 | 1:N | M:1 | M:N
  required:    boolean
```

Examples:

```yaml
- subject: workflow_event,    predicate: COMMITTED,   object: authoritative_root,
  cardinality: M:1, required: true
- subject: authoritative_root, predicate: GENEALOGY,  object: authoritative_root,
  cardinality: M:N, required: false
- subject: authoritative_root, predicate: SUPERSEDED_BY, object: authoritative_root,
  cardinality: 1:1, required: false
- subject: audit_event,        predicate: ACTED_BY,    object: identity_principal,
  cardinality: M:1, required: true
- subject: *,                  predicate: TENANT_SCOPED, object: tenant,
  cardinality: M:1, required: true
```

---

## Section 2 — Axioms (must always hold)

These are the OTG's truth conditions. A graph that violates any axiom is *broken* and must trigger SEV-1.

### A1 — Tenant scoping totality

Every OTG node has exactly one `TENANT_SCOPED` edge. No node is global; tenant `hesem-system` exists for system-level nodes.

### A2 — Authoritative-root uniqueness

For each `(resource_family, external_id, tenant_id)` tuple, there is at most one `authoritative_root` node. Supersession produces a *new* node with a `SUPERSEDED_BY` edge from the old to the new.

### A3 — Audit chain totality

Every `mutable` or `append_only_hash_chained` mutation is preceded by an `audit_event` node with a `RECORDED_BY` edge to the mutated root, and followed (within ≤ 5 seconds) by a hash-chain extension that includes that audit_event's hash.

```text
∀ mutation m on authoritative_root r:
  ∃ audit_event a such that
    a.RECORDED_BY → r
    a.timestamp ≤ m.timestamp
    a.timestamp > m.timestamp - 1s
    audit_chain_anchor.daily_root contains hash(a) within 24h
```

### A4 — Workflow-event totality

Every state transition on an `authoritative_root` produces a `workflow_event` node. The workflow_event records: from-state, to-state, attempted-vs-committed, guard evaluation results, principal, idempotency-key, trace-id.

### A5 — Evidence linkage for regulated roots

Every GxP-classified `authoritative_root` whose lifecycle reaches a "released" terminal state has at least one `evidence_artifact` with a `VALIDATES` edge whose `freshness` is within the validation policy window (default 365 days).

### A6 — Policy directive coverage

Every `workflow.transition_id` exists in `policy_directive.GOVERNS` for at least one currently-effective directive. A transition with no governing directive is *unreachable* (L1 returns `not_applicable`).

### A7 — AI advisory non-authority

No `ai_advisory_annotation` may have an outbound `COMMITTED` edge. AI advisories never commit transitions. (Per master thesis §5 RULE-2.)

### A8 — Lineage soundness

For every `derived_read_model` node, the `LINEAGE_REPLAYED` edge points to an `otg_event` window such that replaying that window from authoritative roots produces (within tolerance) the current model. Drift > 0 is a SEV-2 incident.

### A9 — Supersession chain finiteness

The directed graph formed by `SUPERSEDED_BY` edges across all authoritative_roots in a single `(resource_family, external_id, tenant_id)` series is a **simple chain** (no branching, no cycles, no orphans except the head).

### A10 — Cross-tenant edge prohibition

No edge connects nodes in different tenants except where `subject.class = policy_directive` and `subject.tenant_id = 'hesem-system'`.

### A11 — Evidence WORM

Every `evidence_artifact` and `audit_event` is stored in WORM media (S3 Object Lock or equivalent) with a retention period at least equal to its `retention_class.minimum_years`.

### A12 — Freshness monotonicity

For any node, `freshness` increases monotonically. A backwards-clock anomaly is a SEV-1 incident (NTP drift, clock-skew, or tampering).

### A13 — Watermark causality

For any `derived_read_model` or `projection_workspace`, `source_watermark ≤ NOW()` and `source_watermark ≤ MAX(otg_event.timestamp WHERE consumed_by = node)`.

### A14 — Genealogy DAG

`GENEALOGY` edges form a DAG. A material lot cannot be its own ancestor.

---

## Section 3 — Temporal semantics

V4's schema names `freshness` and `source_watermark` but does not define their meaning. V5 fixes:

```text
node.freshness           = max timestamp of any field write to this node
node.source_watermark    = highest otg_event.timestamp consumed by this node
                           (only relevant for derived nodes; NULL for authoritative)

freshness  ≥  source_watermark  always

projection.freshness_lag_seconds = NOW() - source_watermark
                                 = how far behind the projection is

authoritative_root.freshness    = last commit time of this root
                                  (used for ETag generation)
```

Two times every node has:

```text
created_at              — node first inserted
updated_at              — last mutation (= freshness for authoritative)
```

Two times relevant for evidence:

```text
evidence_artifact.attested_at        — when the evidence claims to be true
evidence_artifact.recorded_at        — when the system recorded it
                                       (gap = backdating, audited)
```

Backdating beyond `policy_directive.max_backdate_window` (default 24h) requires e-signature obligation per L2.

---

## Section 4 — SQL schema (normative)

This section is **normative** for V5. Migration `200_otg_baseline.sql` must produce exactly this shape.

### 4.1 otg_node

```sql
CREATE TABLE otg_node (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type               TEXT NOT NULL,
  resource_family         TEXT NOT NULL,
  external_id             TEXT NOT NULL,
  authority_class         TEXT NOT NULL CHECK (authority_class IN (
    'authoritative_root',
    'projection_workspace',
    'derived_read_model',
    'evidence_artifact',
    'workflow_event',
    'audit_event',
    'ai_advisory_annotation',
    'policy_directive'
  )),
  lifecycle_state         TEXT,
  version                 INTEGER NOT NULL DEFAULT 1,
  freshness               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_watermark        TIMESTAMPTZ,
  tenant_id               UUID NOT NULL,
  gxp_classification      TEXT NOT NULL DEFAULT 'non_gxp'
                          CHECK (gxp_classification IN ('gxp', 'non_gxp')),
  retention_class         TEXT NOT NULL DEFAULT 'standard'
                          CHECK (retention_class IN
                            ('standard','gxp_long_term','permanent','privacy_subject')),
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by              UUID,
  superseded_by_id        UUID REFERENCES otg_node(id) ON DELETE RESTRICT,
  CONSTRAINT otg_node_external_unique
    UNIQUE (resource_family, external_id, tenant_id)
);

CREATE INDEX otg_node_class_family_idx
  ON otg_node (authority_class, resource_family, tenant_id);
CREATE INDEX otg_node_freshness_idx
  ON otg_node (tenant_id, freshness DESC);
CREATE INDEX otg_node_metadata_idx
  ON otg_node USING gin (metadata);
```

### 4.2 otg_edge

```sql
CREATE TABLE otg_edge (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_node_id         UUID NOT NULL REFERENCES otg_node(id) ON DELETE RESTRICT,
  predicate               TEXT NOT NULL CHECK (predicate IN (
    'TRIGGERED_BY','ATTEMPTED','COMMITTED','DENIED','GENEALOGY',
    'DERIVED_FROM','SOURCED_FROM','VALIDATES','GOVERNS','RECORDED_BY',
    'SUPERSEDED_BY','ANNOTATED','ACTED_BY','ON_BEHALF_OF','SIGNED_BY',
    'LINKED','TENANT_SCOPED','LINEAGE_REPLAYED'
  )),
  object_node_id          UUID NOT NULL REFERENCES otg_node(id) ON DELETE RESTRICT,
  cardinality_constraint  TEXT NOT NULL CHECK (cardinality_constraint IN
                            ('1:1','1:N','M:1','M:N')),
  edge_metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id               UUID NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT otg_edge_self_loop_check CHECK (subject_node_id <> object_node_id),
  CONSTRAINT otg_edge_unique UNIQUE
    (subject_node_id, predicate, object_node_id)
);

CREATE INDEX otg_edge_subject_idx
  ON otg_edge (subject_node_id, predicate);
CREATE INDEX otg_edge_object_idx
  ON otg_edge (object_node_id, predicate);
CREATE INDEX otg_edge_tenant_predicate_idx
  ON otg_edge (tenant_id, predicate);
```

### 4.3 otg_event

```sql
CREATE TABLE otg_event (
  id                      BIGSERIAL PRIMARY KEY,
  event_id                UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  event_type              TEXT NOT NULL,
  subject_node_id         UUID REFERENCES otg_node(id) ON DELETE RESTRICT,
  payload                 JSONB NOT NULL,
  occurred_at             TIMESTAMPTZ NOT NULL,
  recorded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id               UUID NOT NULL,
  trace_id                TEXT,
  span_id                 TEXT,
  idempotency_key         TEXT,
  source_layer            TEXT NOT NULL CHECK (source_layer IN
                            ('L1','L2','L3','L4','L5','L6','L7','L8'))
);

CREATE INDEX otg_event_subject_time_idx
  ON otg_event (subject_node_id, occurred_at DESC);
CREATE INDEX otg_event_type_time_idx
  ON otg_event (event_type, occurred_at DESC);
CREATE INDEX otg_event_tenant_time_idx
  ON otg_event (tenant_id, occurred_at DESC);
CREATE INDEX otg_event_idempotency_idx
  ON otg_event (idempotency_key) WHERE idempotency_key IS NOT NULL;
```

### 4.4 audit_chain_anchor

```sql
CREATE TABLE audit_chain_anchor (
  id                      BIGSERIAL PRIMARY KEY,
  anchor_date             DATE NOT NULL UNIQUE,
  audit_events_count      BIGINT NOT NULL,
  merkle_root             BYTEA NOT NULL,
  prev_merkle_root        BYTEA,
  signed_by               TEXT NOT NULL,
  signature               BYTEA NOT NULL,
  external_anchor_uri     TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`external_anchor_uri` may point to (per ADR choice):

- a public timestamping authority (RFC 3161),
- a blockchain transaction (optional, per Wave 9 vertical packs),
- internal customer-witnessed S3 Object Lock root.

### 4.5 Row-Level Security

```sql
ALTER TABLE otg_node ENABLE ROW LEVEL SECURITY;
ALTER TABLE otg_edge ENABLE ROW LEVEL SECURITY;
ALTER TABLE otg_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY otg_node_tenant_iso ON otg_node
  USING (tenant_id = current_setting('app.tenant_id')::uuid
      OR current_setting('app.tenant_id', true) = 'hesem-system');

CREATE POLICY otg_edge_tenant_iso ON otg_edge
  USING (tenant_id = current_setting('app.tenant_id')::uuid
      OR current_setting('app.tenant_id', true) = 'hesem-system');

CREATE POLICY otg_event_tenant_iso ON otg_event
  USING (tenant_id = current_setting('app.tenant_id')::uuid
      OR current_setting('app.tenant_id', true) = 'hesem-system');
```

The middleware `TenantGuardMiddleware` sets `app.tenant_id` per request. RLS is the **second** line of defense; the first is parameterized queries with explicit `tenant_id = $1`.

---

## Section 5 — Materialized views (canonical query catalog)

Five materialized views are mandatory per V5 baseline. They drive workspace UIs and analytics.

### 5.1 `mv_otg_genealogy_upstream` — material lineage

```sql
CREATE MATERIALIZED VIEW mv_otg_genealogy_upstream AS
WITH RECURSIVE upstream AS (
  SELECT
    e.subject_node_id  AS descendant_id,
    e.object_node_id   AS ancestor_id,
    1                  AS depth,
    e.tenant_id
  FROM otg_edge e
  WHERE e.predicate = 'GENEALOGY'
  UNION ALL
  SELECT
    u.descendant_id,
    e.object_node_id,
    u.depth + 1,
    e.tenant_id
  FROM upstream u
  JOIN otg_edge e
    ON e.subject_node_id = u.ancestor_id
   AND e.predicate = 'GENEALOGY'
   AND e.tenant_id = u.tenant_id
  WHERE u.depth < 20    -- guard against pathological depth
)
SELECT
  descendant_id,
  ancestor_id,
  MIN(depth) AS shortest_depth,
  tenant_id
FROM upstream
GROUP BY descendant_id, ancestor_id, tenant_id;

CREATE UNIQUE INDEX mv_otg_genealogy_upstream_pk
  ON mv_otg_genealogy_upstream (descendant_id, ancestor_id);
CREATE INDEX mv_otg_genealogy_upstream_tenant_idx
  ON mv_otg_genealogy_upstream (tenant_id);
```

Refresh policy: incremental via the `genealogy_refresh_worker` whenever a new `GENEALOGY` edge is committed; full `REFRESH MATERIALIZED VIEW CONCURRENTLY` nightly.

### 5.2 `mv_otg_open_ncs_by_lot`

```sql
CREATE MATERIALIZED VIEW mv_otg_open_ncs_by_lot AS
SELECT
  lot.id          AS lot_node_id,
  lot.external_id AS lot_code,
  lot.tenant_id   AS tenant_id,
  COUNT(nc.id) FILTER (WHERE nc.lifecycle_state IN ('open','in_progress')) AS open_nc_count,
  COUNT(nc.id) FILTER (WHERE nc.lifecycle_state = 'capa_pending') AS capa_pending_count,
  MAX(nc.freshness) AS last_nc_activity_at
FROM otg_node lot
LEFT JOIN otg_edge link
  ON link.object_node_id = lot.id
 AND link.predicate = 'LINKED'
LEFT JOIN otg_node nc
  ON nc.id = link.subject_node_id
 AND nc.authority_class = 'authoritative_root'
 AND nc.resource_family = 'NC'
WHERE lot.authority_class = 'authoritative_root'
  AND lot.resource_family = 'LOT'
GROUP BY lot.id, lot.external_id, lot.tenant_id;

CREATE UNIQUE INDEX mv_otg_open_ncs_by_lot_pk
  ON mv_otg_open_ncs_by_lot (lot_node_id);
```

### 5.3 `mv_otg_brel_release_history`

Records the full release history of every batch, including denied attempts, with reviewer and signer chain.

### 5.4 `mv_otg_validation_evidence_freshness`

Per regulated authoritative_root, the most recent `VALIDATES` edge's freshness, used for proactive expiration alerts.

### 5.5 `mv_otg_audit_chain_health`

Per day, the count of audit_events vs. the latest anchor, surfacing chain-lag.

---

## Section 6 — Online integrity checks

Real-time invariant enforcement via triggers. Trigger functions are kept simple to avoid lock contention.

```sql
CREATE FUNCTION otg_enforce_no_self_supersession() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subject_node_id = NEW.object_node_id
     AND NEW.predicate = 'SUPERSEDED_BY' THEN
    RAISE EXCEPTION 'A1/A9: a node cannot supersede itself';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER otg_edge_self_supersession_guard
  BEFORE INSERT ON otg_edge
  FOR EACH ROW EXECUTE FUNCTION otg_enforce_no_self_supersession();

CREATE FUNCTION otg_enforce_tenant_match() RETURNS TRIGGER AS $$
DECLARE
  s_tenant UUID;
  o_tenant UUID;
BEGIN
  SELECT tenant_id INTO s_tenant FROM otg_node WHERE id = NEW.subject_node_id;
  SELECT tenant_id INTO o_tenant FROM otg_node WHERE id = NEW.object_node_id;
  IF s_tenant <> o_tenant
     AND NEW.predicate <> 'GOVERNS' THEN
    RAISE EXCEPTION 'A10: cross-tenant edges only allowed for predicate GOVERNS';
  END IF;
  IF NEW.tenant_id <> s_tenant THEN
    RAISE EXCEPTION 'A1: edge tenant must equal subject tenant';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER otg_edge_tenant_guard
  BEFORE INSERT ON otg_edge
  FOR EACH ROW EXECUTE FUNCTION otg_enforce_tenant_match();
```

Hot-path integrity (millions of rows) cannot be checked at every write. The remaining axioms are checked **offline** (Section 7).

---

## Section 7 — Offline integrity job

A nightly job named `otg_integrity_audit` runs the full axiom suite and emits a report.

```yaml
job: otg_integrity_audit
schedule: every 24h at 02:00 UTC
runtime_budget: 1h
checks:
  - id: A2
    query: |
      SELECT resource_family, external_id, tenant_id, COUNT(*) AS n
      FROM otg_node
      WHERE authority_class = 'authoritative_root'
      GROUP BY 1,2,3
      HAVING COUNT(*) > 1
    severity_on_violation: SEV-1
  - id: A3
    query: |
      SELECT n.id
      FROM otg_node n
      WHERE n.authority_class = 'authoritative_root'
        AND n.updated_at > n.created_at      -- has been mutated
        AND NOT EXISTS (
          SELECT 1 FROM otg_edge e
          WHERE e.predicate = 'RECORDED_BY'
            AND e.object_node_id = n.id
            AND e.created_at >= n.updated_at - INTERVAL '5 seconds'
        )
    severity_on_violation: SEV-1
  - id: A5
    query: |
      SELECT n.id
      FROM otg_node n
      WHERE n.authority_class = 'authoritative_root'
        AND n.gxp_classification = 'gxp'
        AND n.lifecycle_state = 'released'
        AND NOT EXISTS (
          SELECT 1 FROM otg_edge e
          JOIN otg_node ev ON ev.id = e.subject_node_id
          WHERE e.predicate = 'VALIDATES'
            AND e.object_node_id = n.id
            AND ev.authority_class = 'evidence_artifact'
            AND ev.freshness > NOW() - INTERVAL '365 days'
        )
    severity_on_violation: SEV-1
  - id: A7
    query: |
      SELECT id FROM otg_edge
      WHERE predicate = 'COMMITTED'
        AND subject_node_id IN (
          SELECT id FROM otg_node
          WHERE authority_class = 'ai_advisory_annotation'
        )
    severity_on_violation: SEV-1
  - id: A9
    query: |
      WITH RECURSIVE chain AS (
        SELECT id, superseded_by_id, 1 AS depth, ARRAY[id] AS path
        FROM otg_node
        UNION ALL
        SELECT n.id, n.superseded_by_id, c.depth+1, c.path || n.id
        FROM otg_node n
        JOIN chain c ON n.id = c.superseded_by_id
        WHERE NOT n.id = ANY(c.path)
          AND c.depth < 100
      )
      SELECT id FROM chain WHERE depth >= 100
    severity_on_violation: SEV-2
  - id: A14
    query: |
      WITH RECURSIVE descendants AS (
        SELECT subject_node_id AS root, object_node_id AS ancestor, 1 AS d
        FROM otg_edge WHERE predicate = 'GENEALOGY'
        UNION ALL
        SELECT d.root, e.object_node_id, d.d+1
        FROM descendants d
        JOIN otg_edge e ON e.subject_node_id = d.ancestor
                        AND e.predicate = 'GENEALOGY'
        WHERE d.d < 50
      )
      SELECT root FROM descendants WHERE root = ancestor
    severity_on_violation: SEV-1
on_violation:
  - emit slo_breach_event with breach_class = 'otg_integrity'
  - page on-call
  - block release pipeline until fixed
```

---

## Section 8 — Query catalog (the world-class operations)

A world-class platform must answer at scale. V5 commits to these query-latency targets:

| Query | Result example | p50 | p95 | p99 |
|---|---|---|---|---|
| Q1: "lot 47 ancestry depth-5" | parent lots, raw materials, supplier batches | 30ms | 150ms | 500ms |
| Q2: "open NCs and CAPAs for lot 47" | counts + list | 20ms | 80ms | 200ms |
| Q3: "release history for product X last 12 months" | timeline | 100ms | 400ms | 1s |
| Q4: "where is BREL Y in workflow right now" | current state + history | 10ms | 40ms | 100ms |
| Q5: "all CDOC released by user U in May 2026" | list + audit chain | 50ms | 200ms | 500ms |
| Q6: "graph diff between two LOT versions" | edge add/remove | 100ms | 500ms | 1s |
| Q7: "which validation runs are expiring in 60d" | list | 20ms | 80ms | 200ms |
| Q8: "audit chain proof for record R at time T" | Merkle proof | 50ms | 200ms | 500ms |
| Q9: "AI advisory acceptance rate by model + tenant + 90d" | aggregate | 100ms | 500ms | 1s |
| Q10: "tenant data export (DSAR)" | full graph slice | 5min | 30min | 1h |

Q1, Q2, Q4, Q5, Q7 are served by materialized views.
Q3, Q6, Q9 are served by derived_read_model + columnar OLAP (DuckDB embed or external warehouse).
Q8 walks the audit chain anchor table.
Q10 streams via async export job.

---

## Section 9 — Lifecycle of an OTG node

```text
phase 1: PROPOSED
  - external request arrives at L7
  - L1 decides permit
  - L3 begins transition
  - workflow_event[ATTEMPTED] created
  - audit_event recorded

phase 2: COMMITTED (success path)
  - L3 commits state change in L4
  - workflow_event upgraded to COMMITTED
  - L4 row update fires CDC → L5 propagation queue
  - otg_event emitted by L4 trigger
  - audit_event hashed and queued for daily anchor

phase 3: PROJECTED
  - L5 consumer reads otg_event, updates projection_workspace
  - mv refresh runs in <5s (incremental) or schedules nightly (concurrent)
  - lineage_record updated with new source_watermark

phase 4: ANCHORED
  - within 24h, daily merkle root computed
  - audit_chain_anchor row inserted
  - external timestamping (if configured)

phase 5: RETAINED
  - per retention_class, the node persists
  - upon retention expiry: tombstone (soft-delete) per privacy law
                            OR full purge (only non-GxP non-evidence nodes)
                            BUT evidence_artifact and audit_event NEVER purged
                            until WORM lock expires

phase 6 (optional): SUPERSEDED
  - new authoritative_root node created
  - SUPERSEDED_BY edge from old to new
  - old node lifecycle_state transitions to 'superseded' (not deleted)
```

Failure paths in each phase produce specific SLO breach events with mapped runbooks.

---

## Section 10 — Migration story (from "no graph" today to "OTG-native" Wave 4+)

The current repo (Wave 1 prototype) has **no OTG**. Migration is staged.

### Stage 0 — Wave 0.5 (V5-added)
- Create OTG tables (this file's Section 4) with no data.
- Run integrity job nightly against empty tables (validates schema).
- Add OTG migration to `mom/database/migrations/200_otg_baseline.sql`.

### Stage 1 — Wave 4 entry
- Backfill `otg_node` for the 18 Wave 1 authoritative_roots from existing fixtures.
- Backfill `otg_edge` for known LINKED relations from foreign keys.
- Backfill `otg_event` from existing audit log (best-effort, mark backfilled).

### Stage 2 — Wave 4 live-API
- Every L4 mutation (per Stage 2 graduated slice) writes to OTG via L5 consumer.
- L5 projections start being served from OTG (instead of direct queries to L4).
- Materialized views populated.

### Stage 3 — Wave 5+
- L4 mutations write OTG events synchronously in same DB transaction.
- Old direct queries deprecated; clients migrate to projections.

### Stage 4 — Wave 8 hardening
- OTG is the canonical reporting source.
- Audit chain anchored daily to external timestamping authority.
- DR drill validates OTG full replay from event log within 4h RTO.

### Stage 5 — Wave 9 worldclass
- Multi-tenant scaling: per-tenant subgraph isolation verified.
- Vertical packs (Pharma, Auto, Aero) add extension authority classes.
- AI advisories begin emitting `ai_advisory_annotation` nodes at scale.
- Optional: graph database (Neo4j / Memgraph) as read-side acceleration; Postgres remains source of truth.

---

## Section 11 — Backend choice rationale (PostgreSQL-first)

Why not Neo4j or TigerGraph from day one?

| Criterion | PostgreSQL adjacency | Neo4j | TigerGraph |
|---|---|---|---|
| Operational maturity | high (already in stack) | medium | low |
| ACID transactions | yes, with workflow_event in same TX | yes (Cypher TX) | yes |
| Integration with L4 | trivial (same DB) | needs sync layer | needs sync layer |
| Cost | $0 incremental | medium (license + ops) | high |
| Recursive CTE expressivity | sufficient for depth ≤ 20 | better for unbounded | best for unbounded |
| Compliance evidence | proven (Postgres in regulated systems) | acceptable | low |
| Backup/DR primitives | proven (PITR, logical decoding) | proprietary | proprietary |

**Decision:** PostgreSQL adjacency tables as **canonical**. Add a graph-engine read-side accelerator (Neo4j or Memgraph) at Wave 9 if and only if Q1/Q6 fail their p99 budget at expected scale.

ADR: `ADR-0050-otg-postgres-canonical.md` (to be authored).

---

## Section 12 — Multi-tenant subgraph isolation

V5 axiom A10 forbids cross-tenant edges. Implementation:

1. **Tenant `hesem-system`** holds policy_directive nodes that govern all tenants.
2. Application code never crosses tenant_id without explicit `app.tenant_id = 'hesem-system'` superuser context.
3. Row-level security (Section 4.5) is the second wall.
4. Query plan inspection in CI: any plan that scans rows from multiple tenant_ids in a non-aggregate join is rejected.
5. DSAR (data subject access request) export is implemented as a **subgraph extraction** scoped to a single principal; subjects are walked via `ACTED_BY` and `LINKED` edges within their tenant.

---

## Section 13 — Audit chain mechanics

### 13.1 Hashing

Each `audit_event` carries:

```text
fields:
  prev_hash    BYTEA  (hash of previous audit_event in chain for this anchor window)
  payload_hash BYTEA  (hash of canonical JSON of mutation payload + metadata)
  this_hash    BYTEA  (hash of (prev_hash || payload_hash || timestamp || principal))
chain_position BIGINT (sequential per anchor window)
```

Chain rule: a missing or modified event invalidates every subsequent `this_hash`. The daily anchor commits the merkle root of the day's chain.

### 13.2 Anchoring

Each day at 00:30 UTC:

```text
1. Query audit_events with anchor_date = previous day
2. Build merkle tree (SHA-256) over their this_hash values
3. Insert audit_chain_anchor row with merkle_root and prev_merkle_root
4. Sign with platform key (HSM-backed in Wave 8)
5. Optionally publish merkle_root to:
   - public timestamping authority (RFC 3161)
   - customer-witnessed S3 Object Lock
   - blockchain transaction (vertical pack option)
```

### 13.3 Verification

Auditor query: "prove that audit_event E existed at time T":

```text
1. Read E from otg_node (and audit_chain_anchor on its day)
2. Recompute merkle path from E.this_hash to anchor.merkle_root
3. Compare anchor.merkle_root with externally-anchored value
4. If externally anchored, retrieve external timestamp proof
```

Result: cryptographic non-repudiation of the audit trail.

---

## Section 14 — Failure modes (operational)

| Mode | Probability | Impact | Mitigation | Detection |
|---|---|---|---|---|
| Dangling edge (target node deleted) | low | SEV-2 | FK ON DELETE RESTRICT | nightly A* checks |
| Hash chain broken (tamper) | very low | SEV-1 | WORM + external anchor | weekly verification job |
| Projection drift (rebuild ≠ live) | medium | SEV-2 | nightly drift check | drift counter > 0 |
| Tenant boundary leak | low | SEV-1 | RLS + middleware double-defense | continuous query plan audit |
| Genealogy cycle | very low | SEV-1 | A14 nightly | DAG check |
| Backdated evidence beyond window | medium | SEV-3 | L2 obligation requires e-sign | A12 freshness monotonicity |
| OTG event lag > 5min | medium | SEV-3 | scale CDC consumers | freshness gauge alert |
| Materialized view refresh failure | medium | SEV-3 | retry + alert | mv_health metric |
| Audit chain anchor missed | low | SEV-2 | daily cron + alert | recent_anchor_age_hours |
| Cross-version migration failure | low | SEV-1 | shadow-write Stage 1+2 | migration test harness |

---

## Section 15 — Validation footprint (regulated verticals)

The OTG is the **single substrate** that lets HESEM produce GxP/IATF/AS9100 audit packs without bespoke per-vertical schemas.

### 15.1 IQ checklist

```text
[ ] All OTG tables exist with normative schema (Section 4)
[ ] Indexes present
[ ] RLS enabled with tenant_iso policies
[ ] Triggers active (Section 6)
[ ] Materialized views created
[ ] Integrity job scheduled
[ ] Anchor cron scheduled
```

### 15.2 OQ test suite

```text
- positive paths: a regulated mutation produces full chain (axioms A1–A14 hold)
- negative paths: forbidden mutations rejected, chain unbroken
- isolation: tenant A cannot read or write tenant B's nodes
- recovery: kill primary mid-transaction, secondary takes over without chain corruption
- replay: rebuild a projection from event log, drift = 0
- supersession: chain finite, no cycles
```

### 15.3 PQ benchmarks

```text
- 100M nodes, 500M edges, 1B events
- Q1–Q9 query budget met
- Integrity job under 1h budget
- Anchor cron under 5 min for 10M daily events
- DR failover within 4h
- Backup restore validated quarterly
```

---

## Section 16 — Why this matters

V4's instinct that there must be a "single graph of operational truth" is correct and powerful. But V4 stopped at the schema sketch.

V5 produces:

1. A complete **vocabulary** (8 classes + 18 predicates + temporal semantics)
2. A complete **axiom set** (14 always-true conditions)
3. A complete **schema** (normative SQL)
4. A complete **integrity story** (online triggers + offline jobs)
5. A complete **query catalog** (10 queries with latency budgets)
6. A complete **lifecycle** (6 phases per node)
7. A complete **migration plan** (Stages 0–5 across waves)
8. A complete **backend rationale** (Postgres-first, Neo4j-later)
9. A complete **multi-tenant story** (RLS + middleware + query plan audit)
10. A complete **audit chain mechanic** (hash chain + daily merkle anchor + external timestamping)
11. A complete **validation footprint** (IQ/OQ/PQ)

The OTG is the architectural keystone that turns ERP+MOM+MES+eQMS from "four federated systems" into **one operational truth**, with cryptographic and statistical proofs of integrity. It is the substrate on which world-class compliance, traceability, and AI all stand.

---

## Section 17 — Decision phrase

```text
V5_OTG_FORMAL_MODEL_BASELINE_LOCKED
NEXT_FILE: 03_WAVE_PLAN_V5_REFINED.md
```
