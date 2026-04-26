# 05_WAVE_PACK_DEEP_DIVE_W5_W10.md

## Purpose

Continuation of file 04 — engineering deep-dive specifications for V5 Waves 4.5, 5, 6, 6.5, 7, 8, 9, 10. Each wave is treated like a small project: components, migrations, ADRs, contract fragments, test cases, decision phrases.

---

## W4.5 — OTG-Native Cutover (NEW SUB-WAVE)

### W4.5.1 CDC consumer pipeline

#### Components

```text
component:  hesem-cdc-consumer       (Go service or PHP daemon, polls Postgres logical decoding slot)
component:  hesem-cdc-state-store    (Postgres table tracking last-consumed LSN per stream)
component:  hesem-otg-event-writer   (idempotent insert into otg_event)
```

#### Migration

```sql
-- mom/database/migrations/210_cdc_state.sql
CREATE TABLE cdc_consumer_state (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id     TEXT NOT NULL UNIQUE,
  slot_name       TEXT NOT NULL,
  last_lsn        TEXT NOT NULL,           -- pg_lsn as text
  last_progress_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT NOT NULL CHECK (status IN ('running','paused','failed')),
  error_text      TEXT
);
```

#### Logical decoding slot

```sql
SELECT pg_create_logical_replication_slot('hesem_cdc_main', 'pgoutput');

CREATE PUBLICATION hesem_cdc_pub FOR TABLE
  brel, lot, irev, nc, capa, cdoc, eco,
  inspection, mrb, train_record, train_course, comp_matrix, role,
  scar, ipc, oqc, iqc, mwo, prec
  WITH (publish = 'insert, update, delete');
```

#### Consumer loop sketch

```php
public function consumeOnce(): ConsumeResult
{
    $messages = $this->slot->readMessages($lastLsn, batchSize: 1000, timeout: '5s');
    DB::transaction(function() use ($messages) {
        foreach ($messages as $m) {
            $this->otgEventWriter->insert([
                'event_type'      => "{$m->table}.{$m->op}",
                'subject_node_id' => $this->resolveSubjectNode($m),
                'payload'         => $m->newRow,
                'occurred_at'     => $m->commitTime,
                'tenant_id'       => $m->newRow['tenant_id'] ?? $m->oldRow['tenant_id'],
                'source_layer'    => 'L4',
                'idempotency_key' => "{$m->lsn}-{$m->table}-{$m->primaryKey}",
            ]);
        }
        $this->state->advance($lastMessage->lsn);
    });
    return ConsumeResult::ok(count($messages));
}
```

#### SLO

```text
otg_event lag p95: < 5 seconds (measured: NOW() - max(otg_event.recorded_at))
cdc_consumer_state.status = 'running': always
cdc_consumer_state.last_progress_at: < 60s old
```

#### ADRs

```text
ADR-0072  CDC pipeline: pgoutput logical decoding (vs Debezium, vs application dual-write)
ADR-0073  otg_event idempotency_key derivation (lsn + table + pk)
ADR-0074  CDC consumer at-least-once semantics; OTG insert idempotent
```

---

### W4.5.2 Materialized view backfill

For each materialized view defined in file 02 §5:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_otg_genealogy_upstream;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_otg_open_ncs_by_lot;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_otg_brel_release_history;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_otg_validation_evidence_freshness;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_otg_audit_chain_health;
```

Refresh schedule:

```text
mv_otg_open_ncs_by_lot              every 5 minutes (incremental sketch + nightly full)
mv_otg_genealogy_upstream           every 15 minutes
mv_otg_brel_release_history         every 5 minutes
mv_otg_validation_evidence_freshness every hour
mv_otg_audit_chain_health           every hour
```

#### Drift check

Nightly job rebuilds each MV from authoritative roots and compares row-by-row:

```sql
WITH live AS ( SELECT * FROM mv_otg_open_ncs_by_lot ),
     rebuild AS ( SELECT ... rebuild query ... )
SELECT live.lot_node_id
FROM live FULL OUTER JOIN rebuild USING (lot_node_id, open_nc_count)
WHERE live.lot_node_id IS NULL OR rebuild.lot_node_id IS NULL;
```

Result must be empty. Non-empty → SEV-2.

---

### W4.5.3 Workspace projection cutover

For each Wave-1 slice's workspace, change query target from L4 direct to L5 projection:

```php
// before
$rows = DB::table('brel')->where(...)->get();

// after
$rows = DB::table('mv_otg_brel_release_history')->where(...)->get();
```

Performance budget validation:

```text
Workspace BREL inbox:                p95 < 200ms (was 800ms direct)
Workspace open NCs:                  p95 < 100ms (was 500ms direct)
Workspace lot genealogy:             p95 < 300ms (was N/A; required new path)
```

---

### W4.5.4 Audit chain anchoring live

Daily anchor cron (per file 04 W0.5.7) runs for 7 consecutive days without failure before W4.5 exit gate.

External timestamping (RFC 3161) connector enabled for at least one anchor per week as proof-of-concept.

---

### W4.5.5 Integrity job at scale

Run axiom A1–A14 nightly for 7 consecutive nights with zero violations.

```text
runtime_target: < 1 hour
violation_target: 0 across all 14 axioms
```

---

### W4.5 ADRs

```text
ADR-0072 to ADR-0075 (CDC + MV + drift + integrity)
```

### W4.5 decision phrase

```text
WAVE_4_5_OTG_NATIVE_CUTOVER_PASS_READY_FOR_W5
WAVE_4_5_OTG_NATIVE_CUTOVER_PASS_WITH_WARNINGS
WAVE_4_5_OTG_NATIVE_CUTOVER_FAIL_BLOCK_NEXT
```

---

## W5 — Transactional Mutation

### W5.1 Per-mutation ADR template

Each Stage 3 graduation produces an ADR using template:

```markdown
# ADR-<NNNN>: Stage 3 mutation graduation for <slice>.<transition_id>

## Status: Proposed | Accepted | Superseded

## Context
- Slice: <slice_name>
- Transition: <state_machine>.<transition_id>
- Predecessor stage: 2 (live read-only)
- User approval phrase received: "Proceed with <slice> Stage 3 controlled mutation per ADR-<NNNN>"

## Decision
- State machine: <YAML reference>
- Workflow contract: guards [...], obligations [...], emits [...]
- Idempotency: 24h replay window
- Concurrency: If-Match required
- Audit: hash-chained
- E-sign: required (factor=N) | not required
- Validation evidence: required age <= N days | not required
- Rollback: saga compensation chain [...]
- 21 CFR Part 11 compliance: yes/no/n-a
- Tests: T-<id>-* covering happy + 5 negative paths

## Consequences
- Performance impact: ...
- Compliance impact: ...
- Operational risk: ...
```

### W5.2 Saga orchestration

For cross-machine coordinations (e.g., NC → CAPA → BREL), saga orchestrator:

```php
// mom/api/Services/Workflow/SagaOrchestratorService.php
class SagaOrchestratorService
{
    public function execute(SagaDefinition $saga, SagaContext $ctx): SagaResult
    {
        $log = SagaLog::start($saga->id, $ctx);
        try {
            foreach ($saga->steps as $i => $step) {
                $r = $this->executeStep($step, $ctx);
                $log->stepCompleted($i, $r);
                if ($r->isFailure()) {
                    return $this->compensate($saga, $log, fromStep: $i - 1);
                }
            }
            return SagaResult::success();
        } catch (\Throwable $e) {
            return $this->compensate($saga, $log, fromStep: $log->lastSuccessfulStep());
        }
    }

    private function compensate(SagaDefinition $saga, SagaLog $log, int $fromStep): SagaResult
    {
        for ($i = $fromStep; $i >= 0; $i--) {
            $compensation = $saga->steps[$i]->compensation;
            $this->executeStep($compensation, $log->context());
            $log->compensated($i);
        }
        return SagaResult::compensated();
    }
}
```

Saga definitions live in `mom/data/sagas/<saga_id>.yaml`.

### W5.3 Stage 3 graduation slate (initial)

The first wave of Stage 3 graduations targets safer surfaces:

```text
S5-1   train_record.certify              (single-factor e-sign)
S5-2   nc.dispose_concession             (two-factor e-sign per regulated)
S5-3   capa.action_complete              (two-factor e-sign + effectiveness check)
S5-4   cdoc.draft_save                   (no e-sign; non-released)
S5-5   inspection.complete               (no e-sign; pre-disposition)
```

Higher-stakes surfaces (BREL approve_release, eco.approve, supplier.qualify_decide) deferred to W5+ later iterations.

### W5.4 Tests per graduation

```text
T-S5-N-001   happy path: transition commits with all obligations satisfied
T-S5-N-002   guard failure: returns 422 with problem-detail listing failed guard
T-S5-N-003   missing e-sign: returns 401 with problem-detail factor list
T-S5-N-004   stale validation evidence: returns 451 (legal reasons)
T-S5-N-005   idempotent replay: same request twice → one mutation, two same responses
T-S5-N-006   version conflict: returns 412
T-S5-N-007   audit_event recorded with full chain extension
T-S5-N-008   workflow_event recorded with from-state, to-state, attempted, committed
T-S5-N-009   otg_event published within 5s
T-S5-N-010   saga compensation: forced mid-saga failure → state restored
```

### W5.5 ADRs

```text
ADR-0076  Saga orchestration framework (vs choreography)
ADR-0077  Stage 3 graduation queue + per-surface ADR mandate
ADR-0078  Saga compensation correctness proof obligation
```

---

## W6 — Digital Thread + Analytics

### W6.1 Roots authored

```text
LOT-GENEALOGY-LINK   (already implicit; promoted to first-class for partial-batch lineage)
PREC                 supplier-component contract record
IREV                 item revision (BOM revision integrity)
MWO                  maintenance work order
```

### W6.2 OTG genealogy at scale

The `mv_otg_genealogy_upstream` view (per file 02 §5.1) gets indexed for ancestry depth 5–20 queries.

PQ benchmark: 10M lots, 50M genealogy edges, depth-10 ancestry query p99 < 500ms.

### W6.3 Analytics workspaces

Three new workspaces:

```text
WS-DT-1   Lot Genealogy Tree                visual graph render
WS-DT-2   Item Revision Audit               BOM revision diff/history
WS-DT-3   Supplier Component Compliance     PREC + supplier qualification status
```

### W6.4 ADRs

```text
ADR-0079  Genealogy depth budget (max 20; pathological inputs rejected)
ADR-0080  Item revision diff algorithm (per-line + tree-aware)
ADR-0081  PREC ↔ SUP qualification linkage
```

---

## W6.5 — AI Advisory Rollout (NEW SUB-WAVE)

### W6.5.1 AI advisory contract

```yaml
# mom/data/ai_advisories/<advisory_id>.yaml
advisory_id: nc.similarity_cluster
authority_class: ai_advisory_annotation
banned_decisions: []                    # this advisory does not need RULE-2 banned-list test, but format check still applies
inputs:
  - resource_family: NC
    fields: [defect_description, root_cause_text, lot_id, product_id]
model:
  name: nc-similarity-bert-v1
  version: 1.0.3
  trained_at: 2026-04-14T00:00:00Z
  framework: PyTorch + sentence-transformers
  hosted_at: hesem-inference.observability.svc.cluster.local:8080
output:
  cluster_candidates:
    - cluster_id
    - representative_nc_id
    - confidence_score (float [0,1])
    - explanation (string, optional)
governance:
  nist_rmf_risk_class: tier_2          # advisory; not high-impact
  decision_record: ai_advisory_annotation per call
  override_capture: required
  human_in_the_loop: mandatory
  banned_per_rule_2: false             # this advisory is not on banned list (it's a cluster suggestion)
```

### W6.5.2 Inference service

Python FastAPI service in separate deployment, no direct DB write access.

```python
# inference/nc_similarity/main.py
@app.post("/v1/cluster")
def cluster(req: ClusterRequest) -> ClusterResponse:
    embeddings = model.encode(req.descriptions)
    clusters = clusterer.fit_predict(embeddings)
    return ClusterResponse(
        clusters=[
            ClusterCandidate(
                cluster_id=cid,
                representative_nc_id=req.nc_ids[representative_idx],
                confidence_score=float(score),
                explanation=None,
            )
            for cid, representative_idx, score in clusters
        ],
        model_name=MODEL_NAME,
        model_version=MODEL_VERSION,
        trained_at=TRAINED_AT,
    )
```

### W6.5.3 OTG annotation per call

After inference, HESEM API writes:

```sql
INSERT INTO otg_node (
  node_type, resource_family, external_id, authority_class, tenant_id, metadata
) VALUES (
  'ai_advisory', 'NC_SIMILARITY', :advisory_uuid, 'ai_advisory_annotation', :tenant_id,
  '{"model_name":"nc-similarity-bert-v1","model_version":"1.0.3",
    "trained_at":"2026-04-14","subjects":[...],"output":{...},"confidence":0.87}'::jsonb
);

INSERT INTO otg_edge (subject_node_id, predicate, object_node_id, ...)
SELECT :advisory_uuid, 'ANNOTATED', nc.id, ... FROM otg_node nc
WHERE nc.external_id IN (:nc_ids) AND nc.resource_family = 'NC';
```

### W6.5.4 Override capture

When a human accepts/rejects/modifies the advisory:

```sql
INSERT INTO ai_advisory_decision (
  advisory_id, principal_id, decision, override_reason, decided_at
) VALUES (...);
```

Aggregated → `analytic.ai_advisory_acceptance_rate` view.

### W6.5.5 RULE-2 enforcement check

CI test:

```text
T-W6.5-RULE2-001   Search codebase for any code that takes ai_advisory_annotation as
                   an input to a workflow.transition.commit. Must return zero matches.

T-W6.5-RULE2-002   Verify otg_edge integrity: zero edges of predicate=COMMITTED whose
                   subject is an ai_advisory_annotation. (Axiom A7.)
```

### W6.5.6 ADRs

```text
ADR-0082  AI advisory inference service architecture (separate Python service, no DB write)
ADR-0083  AI advisory annotation otg writes (canonical pattern)
ADR-0084  Override capture mandatory (training data + governance evidence)
ADR-0085  RULE-2 enforcement automated CI test
```

---

## W7 — AI Governance + Analytics

### W7.1 ML platform components

```text
component:  hesem-feature-store         (online: Redis; offline: Postgres + parquet snapshots)
component:  hesem-model-registry        (MLflow or simple S3 + manifest table)
component:  hesem-training-pipeline     (Airflow DAGs or Argo Workflows)
component:  hesem-inference-mesh        (per-model FastAPI + Triton if GPU needed)
component:  hesem-ai-monitoring         (drift detection, SLO per model)
```

### W7.2 5 production ML features (cumulative)

```text
ML-1 NC similarity cluster              (already from W6.5)
ML-2 CAPA root-cause candidate ranking  (already from W6.5)
ML-3 CDOC suggested reviewer            (already from W6.5)
ML-4 Predictive maintenance             (Weibull + LSTM hybrid; W7-new)
ML-5 Complaint NLP classification       (BERT-based; W7-new)
```

### W7.3 NIST AI RMF + ISO 42001 evidence

For each model:

```text
[ ] Model card (Google-style) published
[ ] NIST AI RMF risk profile completed
[ ] ISO 42001 management-system evidence
[ ] EU AI Act risk classification (most likely "limited risk" per advisory nature)
[ ] Bias audit (where applicable; complaint NLP needs language fairness check)
[ ] Drift detection running (data drift + concept drift)
[ ] SLO defined: prediction latency p95 < 200ms; daily availability ≥ 99.9%
```

### W7.4 ADRs

```text
ADR-0086  Feature store online/offline split
ADR-0087  Model registry choice (MLflow vs custom)
ADR-0088  Training pipeline orchestrator (Airflow vs Argo Workflows vs Prefect)
ADR-0089  Inference latency SLO + degradation policy (fall back to no-recommendation, never to dummy)
ADR-0090  Drift alert thresholds + retraining trigger policy
```

### W7.5 Wave 7 kill criteria

```text
K7-1   any AI advisory observed COMMITTING a banned regulated decision  → STOP
K7-2   any model in production without a model card                     → STOP (until card published)
K7-3   any model whose drift > 3σ from baseline for > 7 days            → STOP (retrain or roll back)
```

---

## W8 — Hardening + Release Readiness

V3 file 09_WAVE_8_HARDENING_RELEASE.md is the canonical scope. V5 additions:

### W8.1 DORA elite-tier targets

```text
deployment_frequency_per_team:    >= 1 per day
lead_time_for_change:             < 1 day (commit → production-equivalent)
change_failure_rate:              < 5%
mean_time_to_restore:             < 1 hour
```

Continuously measured; report in `V28_DORA_METRICS_REPORT.md`.

### W8.2 SOC 2 Type II evidence kit

```text
Trust Services Criteria covered:
  Security                 — IAM, change management, vulnerability mgmt
  Availability             — HA topology, DR drill, BCP test
  Processing Integrity     — workflow contract evidence, contract tests
  Confidentiality          — encryption at rest + in transit, data classification
  Privacy                  — DSAR runbook, retention enforcement, PIA

Evidence types collected:
  - access logs (90 days online, 7 years archived)
  - change management records (every release)
  - vulnerability scan history (weekly)
  - penetration test reports (annual, 3rd party)
  - incident response postmortems
  - vendor management records (per critical vendor)
  - employee training records (annual)
  - background check records (per hire)
```

### W8.3 OpenTelemetry conformance audit

```text
[ ] Every service emits OTel spans for all required operations
[ ] Trace propagation works end-to-end across 5+ service hops
[ ] Baggage carries tenant.id and request.id
[ ] Resource attrs include service.name + service.version + deployment.environment
[ ] Histogram metrics for all latency-sensitive operations
[ ] Synthetic monitoring covers golden user journeys
```

### W8.4 ADRs

```text
ADR-0091  DORA elite-tier as continuous SLO, not aspirational target
ADR-0092  SOC 2 Type II evidence retention 7 years
ADR-0093  Annual third-party penetration test scope
ADR-0094  Disaster recovery RPO 1h / RTO 4h commitment
```

### W8.5 Validation master plan

Per V3 09_WAVE_8 WP8.6, V5 produces:

```text
V28_VALIDATION_MASTER_PLAN.md          top-level VMP
V28_IQ_SCRIPT_PLATFORM.md              installation qualification
V28_OQ_SCRIPT_PER_SLICE.md             operational qualification per slice
V28_PQ_SCRIPT_PER_WORKFLOW.md          performance qualification per workflow
V28_VALIDATION_SUMMARY_REPORT.md       executive summary
```

The VMP is the single document that enables a regulated customer to consume HESEM under their own GxP umbrella.

### W8.6 Decision phrase

```text
WAVE_8_RELEASE_READINESS_PASS_READY_FOR_PRODUCTION_CUTOVER_GATE
```

---

## W9 — Multi-Tenancy + Portals

### W9.1 Multi-tenancy migration

#### Step 1: schema audit

```sql
-- Find every authoritative table missing tenant_id
SELECT table_schema, table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name NOT IN (
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'tenant_id' AND table_schema = 'public'
  );
```

#### Step 2: nullable backfill

```sql
ALTER TABLE <each_table> ADD COLUMN tenant_id UUID;
UPDATE <each_table> SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;
```

#### Step 3: NOT NULL + RLS

```sql
ALTER TABLE <each_table> ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE <each_table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY <table>_tenant_iso ON <each_table>
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

#### Step 4: query plan audit

CI gate that runs sample queries and verifies plans never scan rows from multiple tenants in non-aggregate contexts.

### W9.2 Customer portal (separate app)

```text
component:  hesem-customer-portal       (Next.js + React; deployed at customer.hesem.io)
auth:       OIDC SSO from main HESEM IdP
permissions: subset of customer-facing permission claims
features:
  - order placement (extends QUO/CPO/SO)
  - order status tracking
  - invoice download
  - complaint submission
  - released CDOC viewer (subset visible to customer)
```

### W9.3 Supplier portal (separate app)

```text
component:  hesem-supplier-portal       (similar tech; deployed at supplier.hesem.io)
features:
  - PO acknowledgment
  - ASN submission
  - quality score visibility
  - SCAR submission
  - doc upload (controlled drop-zone)
```

### W9.4 Real-time push (WebSocket / SSE)

```text
component:  hesem-realtime-gateway      (deployed at realtime.hesem.io)
protocol:   WebSocket with topic multiplexing
fallback:   SSE for legacy clients
auth:       JWT + per-topic ACL
topics:
  /tenant/<id>/workspace/<workspace_id>/freshness
  /tenant/<id>/workflow/<resource_family>/transition
  /tenant/<id>/audit/anchor
```

### W9.5 GraphQL gateway

```text
schema mirrors REST canonical paths
same auth + audit
convenience layer; REST stays canonical
introspection allowed in dev; restricted in prod (production introspection requires admin token)
```

### W9.6 Marketplace + connectors

```text
connectors (8 pre-built):
  - Salesforce CRM         (SO/CPO sync)
  - SAP S/4 HANA           (financial sync)
  - Oracle WMS             (warehouse integration)
  - PTC Windchill PLM      (item revision sync)
  - Siemens NX CAD         (design sync)
  - MS 365 / SharePoint    (document repo sync)
  - Slack / MS Teams       (notifications)
  - Microsoft Dynamics 365 (alternative ERP)
```

Each connector is a signed plugin manifest:

```yaml
plugin:
  id: hesem-connector-salesforce
  version: 1.2.0
  signature: <ed25519>
  manifest:
    inbound_events:  [hesem.so.created, hesem.so.updated]
    outbound_calls:  [salesforce.opportunity.create]
    api_scopes:      [so.read, so.write]
    rate_limits:     {per_minute: 60, per_day: 50000}
```

### W9.7 ADRs

```text
ADR-0095  Multi-tenancy schema choice: shared schema with tenant_id (vs schema-per-tenant)
ADR-0096  Customer portal architecture (separate app vs same app + role)
ADR-0097  WebSocket gateway protocol + topic ACL
ADR-0098  GraphQL gateway scope (convenience layer only)
ADR-0099  Plugin manifest signing (ed25519)
ADR-0100  Marketplace listing + revenue share policy
```

### W9.8 Decision phrase

```text
WAVE_9_PLATFORM_SCALE_PASS_READY_FOR_W10
WAVE_9_PLATFORM_SCALE_PASS_WITH_WARNINGS
WAVE_9_PLATFORM_SCALE_FAIL_BLOCK_NEXT
```

---

## W10 — Vertical Packs + Domain Depth

### W10.1 Stream catalog

| Stream | Scope | Eng-weeks | Dependencies |
|---|---|---|---|
| 10A MES Depth | OEE, Andon, SPC, calibration, FMEA, validation, downtime | 24 | W6 (digital thread) |
| 10B Finance Core | GL, AP, AR, FA, cost, period close, multi-currency, multi-entity | 16 | W4.5 (OTG cutover) |
| 10C Supply Chain Depth | demand planning, replenishment, cycle counting, inventory variance | 12 | W2 (workforce) |
| 10D CRM Depth | LEAD, OPPTY, CONTRACT, CREDIT, sales pipeline | 12 | W4 (live API) |
| 10E HR/EHS | EMPLOYEE, SHIFT, TIME, SAFETYINC, ENERGYREADING | 8 | W2 (workforce) |
| 10F Asset/Maintenance Depth | PM-SCHEDULE, RELIABILITY (Weibull/MTBF), SPARE-PART | 12 | W6 (digital thread) |
| 10H AI/ML Platform expansion | model registry maturity, feature store maturity, 3 more models | 16 | W7 (AI gov) |
| 10K1 Pharma Pack | APR, DEVIATIONLOG, BATCHRECORD, QC-SAMPLE, STABILITY-STUDY + 2-person e-sign + validation enforcement | 8 | W8 (release readiness) |
| 10K2 Automotive Pack | APQP, PPAP, FAI, CONTROL-PLAN, GAGE-RR + IATF 16949 conformance | 6 | W8 |
| 10K3 Aerospace Pack | AS9102-FAI, NADCAP cert, COUNTERFEIT-PARTS-CHECK + AS9100D conformance | 6 | W8 |
| 10K4 (opt) Med Device Pack | DHF, DHR, UDI, FDA 510(k) submission package | 6 | W10K1 |
| 10K5 (opt) Food Pack | HACCP, FSMA preventive controls, recall workflow | 6 | W10K1 |

### W10.2 Per-vertical-pack template

Each vertical pack has its own deep-dive file (07, 14, 15, 16 in V5 file series):

```text
07  Domain depth: regulatory & validation       (Pharma + Auto + Aero common patterns)
14  Pharma vertical pack
15  Automotive vertical pack
16  Aerospace vertical pack
```

### W10.3 ADRs (per pack)

```text
ADR-0101  Vertical pack contract (manifest, feature flag, isolation)
ADR-0102  Pharma 2-person e-sign on BREL/CAPA close/ECO approve
ADR-0103  Automotive PPAP submission packet generator
ADR-0104  Aerospace NADCAP certification conformance evidence
```

### W10.4 Per-stream decision phrases

Each stream gates independently:

```text
WAVE_10_<STREAM>_PASS_READY_FOR_NEXT_STREAM
WAVE_10_<STREAM>_PASS_WITH_WARNINGS
WAVE_10_<STREAM>_FAIL_BLOCK_STREAM
```

Wave 10 overall:

```text
WAVE_10_WORLDCLASS_EXTENSION_PASS_PARITY_ACHIEVED
WAVE_10_WORLDCLASS_EXTENSION_PASS_WITH_GAPS
WAVE_10_WORLDCLASS_EXTENSION_PARTIAL_NEEDS_CONTINUATION
```

---

## Cumulative artifacts W4.5–W10

| Wave | Migrations | Services | ADRs | Reports |
|---|---|---|---|---|
| W4.5 | 1 (210) | 4 NEW (CDC consumer, MV refresher, drift checker, integrity job) | 4 (72-75) | V25.5 |
| W5 | 0 | 1 NEW (saga orchestrator) | 3 (76-78) | V26 |
| W6 | 4 roots | 3 NEW (genealogy, IREV diff, PREC) | 3 (79-81) | V27 |
| W6.5 | 1 | 2 NEW (inference mesh, override capture) | 4 (82-85) | V27.5 |
| W7 | 5 ML features | 5 NEW (feature store, model registry, training, inference, monitoring) | 5 (86-90) | V28 |
| W8 | 0 | many hardening | 4 (91-94) | V28 series (security/a11y/perf/dr/etc.) |
| W9 | many | portals + RT + GraphQL + connectors | 6 (95-100) | V29 |
| W10 | per stream | per stream | per stream | V30+ |
| **W4.5-W10 total** | ~30+ | ~30+ | **~70 ADRs** | ~25+ V-reports |

---

## Cumulative across V5 W0-W10

```text
Total ADRs:               ~100 (44-143)
Total migrations:         ~50
Total services authored:  ~50
Total V-reports:          ~40
Total test cases:         ~500+ (smoke + contract + integration + visual + a11y + perf + chaos)
Engineering-weeks:        252
Calendar (full team):     12-18 months
Calendar (solo Codex):    18-32 months
```

---

## Decision phrase

```text
V5_WAVE_PACK_W5_W10_DEEP_DIVE_BASELINE_LOCKED
NEXT_FILE: 06_DOMAIN_DEPTH_MES_OT_ENGINEERING.md
```
