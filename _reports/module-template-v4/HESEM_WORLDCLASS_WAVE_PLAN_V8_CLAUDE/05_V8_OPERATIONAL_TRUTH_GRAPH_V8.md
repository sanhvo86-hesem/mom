# 05 — V8 Operational Truth Graph V8

```text
purpose:        Carry forward V5 file 02 OTG normative model + extend with V7 §07 vocabulary + add 4 new axioms
predecessor:    V5 file 02 (V8 keeps verbatim) + V7 §07 (V7's OTG V3 prose)
v8_advance:     22 predicates (V5 had 18); 18 axioms (V5 had 14); 7 MVs (V5 had 5);
                 evidence_class enum (9 types); cross-reference to Authority Ledger
work_package:   WP-V8-OTG (5 work packages)
owner:          Data Platform Lead + Compliance Lead
estimate:       8 engineering-weeks
```

---

## 1. Position statement

V5 file 02 already produced a normative OTG schema with 14 axioms, 18 predicates, online triggers, offline integrity job, and 5 mandatory materialized views. V7 §07 introduced the **V3 OTG vocabulary** with new node types (Business root, Master/dependency, Evidence, Workflow event, Signature, Data product, AI recommendation) and 9 edge predicates (DERIVES_FROM, EXECUTES, CONSUMES, PRODUCES, INSPECTED_BY, RAISES, CORRECTED_BY, RELEASED_BY, EXPLAINS).

V8 reconciles. The V5 schema is normative — V7's vocabulary is absorbed by mapping V7 predicates to V5 predicates (where they overlap) and adding 4 new V8-only predicates (where V7 introduces new semantics).

---

## 2. Predicate vocabulary (22 total)

### V5 carry-forward (18)

```text
TRIGGERED_BY     ATTEMPTED        COMMITTED        DENIED
GENEALOGY        DERIVED_FROM     SOURCED_FROM     VALIDATES
GOVERNS          RECORDED_BY      SUPERSEDED_BY    ANNOTATED
ACTED_BY         ON_BEHALF_OF     SIGNED_BY        LINKED
TENANT_SCOPED    LINEAGE_REPLAYED
```

### V7 vocabulary mapping

```text
V7 EXECUTES        → V5 LINKED with edge_metadata.relation='execution'
V7 CONSUMES        → V5 LINKED with edge_metadata.relation='consumption' + GENEALOGY for material
V7 PRODUCES        → V5 LINKED with edge_metadata.relation='production' + GENEALOGY for material
V7 INSPECTED_BY    → V5 LINKED with edge_metadata.relation='inspection'
V7 RAISES          → V5 LINKED with edge_metadata.relation='quality_trigger'
V7 CORRECTED_BY    → V5 LINKED with edge_metadata.relation='corrective'
V7 RELEASED_BY     → V5 SIGNED_BY (when by principal) or LINKED.relation='release'
V7 EXPLAINS        → V5 ANNOTATED + edge_metadata.role='explanation'
```

### V8 NEW predicates (4)

```text
GOVERNED_BY              authoritative_root → authority_ledger_entry
                         "this root's authority rules are this AL entry"
                         cardinality: M:1, required: true (every root must reference an AL entry)

COMMANDS_ALLOWED_BY      command → authority_ledger_entry
                         "this command is permitted by this AL entry"
                         cardinality: M:1, required: true

FORBIDDEN_AT             surface → authority_ledger_entry
                         "this AL entry forbids mutation at this surface"
                         cardinality: M:N

COMPENSATED_BY           workflow_event → workflow_event
                         "this committed transition was rolled back by this compensating transition"
                         cardinality: 1:1, required: only when rollback fired
```

Total: **22 standardized predicate types**. Adding new predicates requires ADR-V8-PREDICATE-NNNN.

---

## 3. Authority class taxonomy (V5 8 classes + V7 alignment)

V5 §1.1 published 8 classes (authoritative_root, projection_workspace, derived_read_model, evidence_artifact, workflow_event, audit_event, ai_advisory_annotation, policy_directive).

V7 §07 calls them: business root, master/dependency, evidence, workflow event, signature, data product, AI recommendation. Mapping:

```text
V5 authoritative_root      ⇔ V7 business root + V7 master/dependency
V5 projection_workspace    ⇔ V7 (implicit; projections in V7 are a different concept layer)
V5 derived_read_model      ⇔ V7 data product
V5 evidence_artifact       ⇔ V7 evidence + V7 signature
V5 workflow_event          ⇔ V7 workflow event
V5 audit_event             ⇔ V8 keeps separate; V7 conflates with workflow_event
V5 ai_advisory_annotation  ⇔ V7 AI recommendation
V5 policy_directive        ⇔ V8 keeps separate; V7 implicit in standards_gates
```

V8 keeps V5's 8-class taxonomy. The reconciliation note: V7's "signature" is an evidence_artifact subtype with `evidence_class='signature'`.

---

## 4. New evidence_class enum (V8 advance)

V5 §4.1 has `gxp_classification` and `retention_class` columns on `otg_node`. V8 adds:

```sql
ALTER TABLE otg_node ADD COLUMN evidence_class TEXT
  CHECK (evidence_class IN
    ('validation','signature','telemetry','transaction','rollback',
     'retraining','redteam','audit_anchor','fallback')
  ) NULL;  -- only set when authority_class = 'evidence_artifact'

ALTER TABLE otg_node ADD CONSTRAINT otg_node_evidence_class_required
  CHECK (
    (authority_class = 'evidence_artifact' AND evidence_class IS NOT NULL) OR
    (authority_class != 'evidence_artifact' AND evidence_class IS NULL)
  );
```

Each evidence_class has its own retention/WORM/freshness policy (per file 22 validation feedback loop):

```yaml
validation:    permanent + WORM + freshness_alarm 365d
signature:     permanent + WORM (per 21 CFR 11)
telemetry:     90d hot, 1y warm
transaction:   gxp_long_term (7y) + WORM if regulated
rollback:      retention per parent root
retraining:    permanent + ML evidence
redteam:       gxp_long_term + WORM + restricted access
audit_anchor:  permanent + WORM (per V5 file 02 §13)
fallback:      30d for analysis
```

---

## 5. Axioms (V5's 14 + V8's 4 new)

### V5 carry-forward (axioms A1-A14, see V5 file 02 §2)

A1 tenant scoping totality, A2 authoritative-root uniqueness, A3 audit chain totality, A4 workflow-event totality, A5 evidence linkage for regulated roots, A6 policy directive coverage, A7 AI advisory non-authority, A8 lineage soundness, A9 supersession chain finiteness, A10 cross-tenant edge prohibition, A11 evidence WORM, A12 freshness monotonicity, A13 watermark causality, A14 genealogy DAG.

### V8 new (A15-A18)

```text
A15 — Authority Ledger backing
     Every authoritative_root node has at least one outbound GOVERNED_BY edge to an active
     authority_ledger_v8 entry. Roots without AL entry cannot be mutated.

A16 — OT edge integrity
     Every otg_node with metadata.source='edge_gateway' must have:
       - subject node device_cert_fingerprint set
       - sequence_number monotonic per edge_id
       - within tenant subgraph; no cross-tenant edges from edge_gateway
     Detection: nightly axiom_A16_ot_audit job

A17 — AI advisory chain anchoring
     Every ai_advisory_annotation node must reference its model_card_v8 entry, training_at,
     and have an associated audit_chain extension within the day's anchor.
     Detection: weekly axiom_A17_ai_anchor job (sampled 1%)

A18 — Validation evidence freshness propagation
     If a root's validation_evidence (latest VALIDATES edge) becomes stale (> per-class
     freshness_alarm_days), the root's lifecycle_state on regulated transitions auto-blocks.
     Detection: hourly mv_otg_validation_evidence_freshness refresh + alarm
```

---

## 6. Two new mandatory materialized views (V5 had 5; V8 has 7)

```sql
-- mv_oee_freshness — used by file 24 SLO file
CREATE MATERIALIZED VIEW mv_oee_freshness AS
SELECT
  e.id AS equipment_id,
  e.external_id AS equipment_code,
  e.tenant_id,
  MAX(ev.occurred_at) AS last_state_event_at,
  EXTRACT(EPOCH FROM (NOW() - MAX(ev.occurred_at))) AS staleness_seconds
FROM otg_node e
JOIN otg_event ev ON ev.subject_node_id = e.id
WHERE e.authority_class = 'authoritative_root'
  AND e.resource_family = 'EQUIPMENT'
  AND ev.event_type LIKE 'equipment.state.%'
GROUP BY e.id, e.external_id, e.tenant_id;
CREATE UNIQUE INDEX mv_oee_freshness_pk ON mv_oee_freshness (equipment_id);
-- refresh: every 60s

-- mv_ai_advisory_acceptance — used by file 19 AI authority boundary
CREATE MATERIALIZED VIEW mv_ai_advisory_acceptance AS
SELECT
  feature_id,
  model_name,
  model_version,
  tenant_id,
  COUNT(*) FILTER (WHERE decision = 'accepted') AS accepted_count,
  COUNT(*) FILTER (WHERE decision IN ('rejected','modified')) AS overridden_count,
  COUNT(*) AS total_count,
  ROUND(COUNT(*) FILTER (WHERE decision='accepted')::numeric * 100.0 /
        NULLIF(COUNT(*),0), 2) AS acceptance_rate_pct,
  MAX(decided_at) AS last_decision_at
FROM ai_advisory_decision_v8
WHERE decided_at >= NOW() - INTERVAL '90 days'
GROUP BY feature_id, model_name, model_version, tenant_id;
CREATE UNIQUE INDEX mv_ai_acceptance_pk ON mv_ai_advisory_acceptance
  (feature_id, model_name, model_version, tenant_id);
-- refresh: hourly
```

---

## 7. Migration plan (V5 file 02 §10 carry-forward)

V8 stages remain Stage 0-5 per V5. V8 adds checkpoints:

```text
Stage 0 (W0.5):   tables exist + integrity job runs against empty tables
Stage 1 (W4):     backfill 18 W1 roots from fixtures + initial AL entries seeded
Stage 2 (W4-W4.5): every L4 graduation populates OTG via L5 consumer + AL entry update
Stage 3 (W4.5):   L4 mutations write OTG events synchronously in same DB transaction
Stage 4 (W7):     digital thread (genealogy) MV serves all workspaces
Stage 5 (W8):     full DR replay validated; integrity job zero violations × 30d
Stage 6 (W9):     audit chain anchored externally (RFC 3161) for regulated tenants
Stage 7 (W10):    vertical-pack-specific OTG node types added per pack ADR
```

---

## 8. Work packages

```yaml
WP-V8-OTG-1:
  title: Migration 200_otg_v8_baseline.sql + axioms A1-A18 triggers + integrity job
  deliverables:
    - mom/database/migrations/200_otg_baseline.sql (V5 carry-forward + V8 deltas)
    - mom/database/migrations/201_otg_v8_axioms_extended.sql
    - mom/api/Jobs/OtgIntegrityAuditJob.php (axioms A1-A18)
  effort_eng_weeks: 2

WP-V8-OTG-2:
  title: Materialized views (5 V5 + 2 V8 = 7 total) + refresh strategy
  deliverables:
    - mom/database/migrations/202_otg_mv.sql
    - mom/api/Jobs/MvRefreshJob.php (incremental + nightly full)
  effort_eng_weeks: 1.5

WP-V8-OTG-3:
  title: CDC pipeline (logical decoding consumer)
  deliverables:
    - mom/api/Services/Cdc/CdcConsumerService.php
    - mom/database/migrations/210_cdc_state.sql
  effort_eng_weeks: 2

WP-V8-OTG-4:
  title: Audit chain anchor cron + RFC 3161 connector (optional)
  deliverables:
    - mom/api/Services/Compliance/AuditChainAnchorService.php
    - mom/api/Services/Compliance/Rfc3161TimestampConnector.php
  effort_eng_weeks: 1.5

WP-V8-OTG-5:
  title: Stage 1 backfill scripts for W1 roots
  deliverables:
    - scripts/otg_backfill_w1_roots.py
  effort_eng_weeks: 1
```

---

## 9. Decision phrase

```text
V8_OTG_V8_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-OTG-1..5
NEXT_FILE: 06_V8_WAVE_DAG_AND_PARALLELISM.md
```
