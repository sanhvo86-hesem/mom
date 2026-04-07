# Prompt 03: Foundation Governance Contract Slice Re-Audit

Date: 2026-04-07
Status: PENDING EXECUTION
Scope: strict re-audit of the `Foundation Governance Contract Slice` after Prompt 02 tranche-1 through tranche-N implementation passes, before frontend generation begins.

## 1. Audit Purpose

This is the Prompt 03 re-audit gate defined in the build-publish gate matrix.

It must determine whether the Foundation Governance Contract Slice has closed every build-complete gate and is credible enough for Prompt 04 reconciliation and frontend generation.

This re-audit replaces the prior `prompt-03-backend-audit-final-package-2026-04-06.md` which returned `NO-GO` with the metrics block as of `2026-04-06`.

## 2. Audit Scope

### 2.1 In scope

- The Foundation Governance Contract Slice only
- All 10 public canonical routes
- All 12 internal action commands
- The 5 canonical entity metadata contracts
- The workflow-engine bridge for approval decisions
- The benchmark proof artifact
- The observability contract
- The publication artifact integrity
- The build-complete gate matrix
- The publish gate pre-assessment

### 2.2 Out of scope

- Prompt 01 architecture changes
- Prompt 04 whole-program reconciliation
- Slices beyond foundation governance
- MES execution, dispatch, genealogy, costing, or finance
- Bearer/OIDC token validation (session+CSRF is the implemented auth)
- Full production load testing (stability probe is the current benchmark tier)

## 3. Mandatory Standards for This Re-Audit

The auditor must evaluate against these exact standards. Each finding must reference the applicable standard.

### 3.1 API and Contract Standards

| Standard | Reference | Audit usage |
|---|---|---|
| OpenAPI 3.1.1 | https://spec.openapis.org/oas/v3.1.1.html | Validate path, schema, securityScheme, and response structure |
| JSON Schema 2020-12 | https://json-schema.org/draft/2020-12 | Validate request/response schemas |
| RFC 9457 Problem Details | https://www.rfc-editor.org/rfc/rfc9457 | Validate all non-2xx responses use `application/problem+json` with `type`, `title`, `status` |
| GraphQL Cursor Connections | https://relay.dev/graphql/connections.htm | Validate cursor pagination discipline: `pageInfo`, `startCursor`, `endCursor`, `hasNextPage` |

### 3.2 Concurrency and Data Integrity

| Standard | Reference | Audit usage |
|---|---|---|
| Dataverse Optimistic Concurrency | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency | Validate `ETag` / `If-Match` / `row_version` behavior |
| PostgreSQL Transaction Isolation | https://www.postgresql.org/docs/current/transaction-iso.html | Validate that concurrent writes are safely handled |
| PostgreSQL pgbench | https://www.postgresql.org/docs/current/pgbench.html | Validate benchmark methodology |

### 3.3 Regulated Quality and Governance

| Standard | Reference | Audit usage |
|---|---|---|
| FDA 21 CFR Part 11 | https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application | Electronic signatures, audit trails, access controls, data integrity |
| EU GMP Annex 11 | https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf | Computerized system validation, data integrity, change control |
| ISPE GAMP 5 | Industry standard | Risk-based validation approach, system categories |
| ISO 9001:2015 | International | QMS requirements: document control, CAPA, audit, risk |
| IATF 16949:2016 | Automotive | Process approach, FMEA integration, supplier quality |
| AS9100D | Aerospace | Configuration management, risk management, special processes |

### 3.4 Manufacturing Standards

| Standard | Reference | Audit usage |
|---|---|---|
| ISA-95 / IEC 62264 | International | ERP/MES integration model, manufacturing operations hierarchy |
| ISA-88 / IEC 61512 | International | Batch control, recipe management |

### 3.5 Security

| Standard | Reference | Audit usage |
|---|---|---|
| NIST SP 800-162 ABAC | https://www.nist.gov/publications/guide-attribute-based-access-control-abac-definition-and-considerations | Attribute-based access control model |
| NIST SP 800-53 | https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final | Access control and audit requirements |

### 3.6 Observability

| Standard | Reference | Audit usage |
|---|---|---|
| OpenTelemetry | https://opentelemetry.io/docs/ | Trace propagation, metric collection, structured logging |
| W3C Trace Context | https://www.w3.org/TR/trace-context/ | `traceparent` / `tracestate` propagation |

### 3.7 ERP Vendor Reference Implementations

| Vendor | Reference | Audit usage |
|---|---|---|
| SAP S/4HANA QM | SAP documentation | Quality planning, inspection, certificates, CAPA |
| Oracle Cloud SCM QM | Oracle documentation | Inspection plans, NCR workflows, CAPA |
| Microsoft Dynamics 365 SCM QM | Microsoft documentation | Quality orders, tests, nonconformances |
| Epicor Kinetic QM | Epicor documentation | Quality assurance modules |

## 4. Mandatory Repo Evidence Inputs

The auditor must read and evaluate every file listed below. If a file is missing, that is a finding.

### 4.1 Runtime Code

- `api/openapi.yaml` — canonical API contract
- `api/index.php` — route registration
- `api/Router.php` — route dispatch
- `api/controllers/ApprovalGroupController.php` — governance decision controller
- `api/controllers/MasterDataController.php` — foundation list + internal commands
- `api/controllers/EvidenceController.php` — attachment controller
- `api/controllers/BaseController.php` — base controller helpers
- `api/services/ApprovalGroupService.php` — approval orchestration
- `api/services/ApprovalWorkflowAdapter.php` — workflow-engine bridge adapter
- `api/services/FoundationGovernanceService.php` — foundation read + write service
- `api/services/EvidenceVaultService.php` — evidence/attachment service
- `api/services/WorkflowEngine.php` — workflow state machine
- `api/services/AuditTrail.php` — immutable audit events
- `api/services/SliceObservability.php` — OTel observability service

### 4.2 Schema

- `database/migrations/072_canonical_foundation_governance.sql` — canonical schema
- `database/migrations/079_foundation_governance_contract_hardening.sql` — hardening: row_version, indexes, triggers, approval_group_id

### 4.3 Registry and Publication

- `qms-data/registry/endpoint-catalog.json` — endpoint metadata
- `qms-data/registry/frontend-foundation-catalog.json` — frontend entity metadata
- `qms-data/registry/registry-manifest.json` — registry coverage manifest
- `qms-data/registry/registry-quality-report.json` — quality gate report
- `qms-data/registry/data-fields-part2.json` — field definitions
- `qms-data/registry/domain-field-packs.json` — pack families

### 4.4 Tests and Benchmark

- `tests/foundation_governance_contract_smoke.php` — contract smoke (114 checks)
- `tools/benchmark/foundation_governance_contract_read_mix.sql` — benchmark SQL
- `tools/benchmark/fg_benchmark_schema.sql` — benchmark schema
- `tools/benchmark/fg_benchmark_seed.sql` — benchmark seed
- `tools/benchmark/run_runtime_benchmark.py` — benchmark harness
- `_reports/backend-runtime-benchmark-latest.json` — fresh benchmark artifact
- `_reports/backend-runtime-benchmark-2026-04-07.json` — dated benchmark artifact

### 4.5 Publication Tools

- `tools/registry/regenerate_slice_publication.py` — slice publication authority
- `tools/registry/add_slice_field_definitions.py` — field definition onboarder

## 5. Exact Audit Protocol

The auditor must follow this protocol exactly.

### 5.1 Step 1: Evidence Collection (no findings yet)

Read every mandatory input file. Record:

- file exists or not
- file is fresh (generatedAt after 2026-04-07) or stale
- file passes basic structural validation or not

### 5.2 Step 2: Build-Complete Gate Evaluation

For each build-complete gate from the gate matrix, produce an explicit `PASS`, `PARTIAL`, or `FAIL` with evidence reference.

| Gate ID | Gate | How to evaluate |
|---|---|---|
| `build.contract.openapi` | OpenAPI authority | Verify `openapi.yaml` contains all 10 frozen paths, is version 3.1.1, has security schemes, has all response schemas |
| `build.contract.schema` | schema authority | Verify JSON Schema 2020-12 compatible request/response shapes in OpenAPI components |
| `build.contract.problem` | problem details | Verify RFC 9457 problem types with `type`, `title`, `status` for all error responses; verify `application/problem+json` content type |
| `build.contract.concurrency` | concurrency semantics | Verify `ETag` generation (strong SHA-256), `If-Match` requirement on decide, `428`/`412`/`409` responses, `row_version` in schema |
| `build.workflow.bridge` | approval bridge | Verify `APPROVAL_STEP` workflow definition in WorkflowEngine, adapter makes engine rejection fatal, `WORKFLOW_BRIDGE_READY = true` |
| `build.evidence.immutability` | evidence hardening | Verify attachment evidence is immutable after creation, checksum verification, no public update/delete routes |
| `build.registry.slice_onboarding` | metadata onboarding | Verify 5 entity keys, 10 endpoint keys, 27 pack families, 6 field definition endpoints exist |
| `build.projection.ownership` | projection package | Verify approval_queue and attachment_timeline projections are documented in the execution package |
| `build.async.contract` | async package | Verify whether async is used in this slice and whether contract exists |
| `build.observability.contract` | observability package | Verify `SliceObservability` implements trace_id, correlation_id, request_id; structured logs for all 5 types; latency measurement; problem enrichment |
| `build.tests.parity` | parity tests | Verify smoke test covers route parity, blocked-capability, ETag format, cursor, self-approval, bridge, adapter, metadata, benchmark |

### 5.3 Step 3: Publish Gate Pre-Assessment

For each publish gate, produce an explicit `PASS`, `PARTIAL`, or `BLOCKED` with evidence reference.

| Gate ID | Gate | How to evaluate |
|---|---|---|
| `publish.slice.field_closure` | slice schema closure | Check if slice entities have field definitions in data-fields-part2.json and packs in domain-field-packs.json |
| `publish.slice.bridge_ready` | slice workflow readiness | Check `workflow_engine_bridge_ready > 0` in quality report; check `governance.approval_group.decide` status in endpoint catalog |
| `publish.slice.publishability` | slice publishability | Check `governance.approval_group` readiness verdict; check `capabilities` closure |
| `publish.slice.otel` | live telemetry proof | Check `SliceObservability` wiring, structured log files existence, trace context generation |
| `publish.slice.benchmark` | benchmark admissibility | Check benchmark report has `foundation_governance_read_mix` with status=completed and TPS data |
| `publish.slice.audit` | re-audit closure | THIS IS THE GATE BEING EVALUATED NOW |
| `publish.slice.orchestration` | program reconciliation | This gate is Prompt 04's responsibility; pre-assess readiness only |

### 5.4 Step 4: Standards Compliance Deep Dive

For each mandatory standard, evaluate:

#### 5.4.1 FDA 21 CFR Part 11 Compliance

Per Subpart B Section 11.10:
- [ ] **(a) Validation**: system validated for accuracy, reliability, consistent performance — evidence: 114-check smoke suite, benchmark proof, workflow engine validation
- [ ] **(c) Records Protection**: accurate retrieval throughout retention — evidence: PostgreSQL persistence with ACID, hash-chain audit trail
- [ ] **(d) Access Controls**: system access limited to authorized individuals — evidence: `requireAuth()`, `requireMasterDataWriteAccess()`, `requireCsrf()`
- [ ] **(e) Audit Trails**: secure, computer-generated, time-stamped; changes do not obscure prior data — evidence: `AuditTrail.php` with `prev_hash` + `event_hash` chain
- [ ] **(f) Operational Checks**: enforce permitted sequencing — evidence: `ApprovalWorkflowAdapter` state machine, `WorkflowEngine.APPROVAL_STEP` definition
- [ ] **(g) Authority Checks**: only authorized individuals can sign, alter, operate — evidence: role checks in controller, self-approval prohibition

Per Subpart C:
- [ ] **(11.50) Signature Manifestation**: signed records show signer name, date/time, meaning — evidence: `electronic_signature` table with `signed_by_party_id`, `signed_at`, `signature_meaning`
- [ ] **(11.70) Signature/Record Linking**: signatures permanently linked to records — evidence: `electronic_signature_id` FK in `approval` table, `hash_value` unique index
- [ ] **(11.200) Signature Components**: two distinct identification components — evidence: session cookie + CSRF token (AND security)

#### 5.4.2 EU GMP Annex 11 Compliance

Per ALCOA+ data integrity principles:
- [ ] **Attributable**: every record linked to actor — evidence: `approver_party_id`, `uploaded_by_party_id`, `stored_by` fields
- [ ] **Legible/Enduring**: records readable throughout retention — evidence: PostgreSQL persistence, JSON structured logs
- [ ] **Contemporaneous**: recorded at time of activity — evidence: `decided_at`, `created_at` timestamps, `gmdate('c')` in code
- [ ] **Original**: original record preserved — evidence: append-only audit trail, immutable attachments
- [ ] **Accurate**: free from errors with documented edits — evidence: `row_version` optimistic concurrency, hash-chain tamper detection
- [ ] **Complete/Consistent**: no gaps — evidence: `qms_touch_foundation_row()` trigger on all mutable tables

Per Annex 11 specific clauses:
- [ ] **(Clause 9) Data Storage**: regular checks for accessibility/readability — evidence: benchmark stability_probe proves DB accessibility
- [ ] **(Clause 12) Audit Trails**: immutable, time-stamped, reason-recorded — evidence: `AuditTrail.logEvent()` with hash chain
- [ ] **(Clause 13) Change Management**: all changes follow defined procedure — evidence: `row_version` concurrency, workflow state machine
- [ ] **(Clause 15) Security**: physical and logical access controls — evidence: session auth, CSRF, role-based access
- [ ] **(Clause 17) Electronic Signatures**: equivalent to handwritten, permanently linked — evidence: `electronic_signature` table structure

#### 5.4.3 ISA-95 Layer Model

- [ ] Organization hierarchy follows ISA-95: enterprise > company > site > plant > warehouse > work_center > work_unit
- [ ] Party master supports multi-role, multi-site relationships
- [ ] Calendar/shift structure supports production scheduling

#### 5.4.4 OpenTelemetry Compliance

- [ ] `trace_id`, `correlation_id`, `request_id` generated per request
- [ ] Structured events emitted with OTel-compatible naming
- [ ] Problem details enriched with trace context
- [ ] 5 structured log types implemented: approval, signature, attachment, policy, command
- [ ] Latency measurement helpers exist

### 5.5 Step 5: Findings Synthesis

Produce findings in exactly this format:

```
| Finding ID | Severity | Area | Description | Standard reference | Evidence | Closure action |
```

Severity levels:
- `Critical`: blocks both frontend generation and production rollout
- `High`: blocks one of frontend generation or production rollout
- `Medium`: should be fixed before production but does not block frontend generation
- `Low`: improvement recommended
- `Info`: observation only

### 5.6 Step 6: Verdict

Produce exactly one of:

- `GO` — slice passes all build-complete gates and has no critical or high blockers for frontend generation
- `GO WITH CONDITIONS` — slice passes most gates; remaining gaps are explicitly scoped and non-blocking for frontend generation
- `REVIEW REQUIRED` — slice has material gaps that must be closed before frontend generation
- `NO-GO` — slice has critical gaps that block any promotion

## 6. Known Pre-Audit State and Artifact Gaps

### 6.1 Gates expected to PASS

Based on Prompt 02 implementation work:

- `build.contract.openapi` — 10 frozen paths in OpenAPI 3.1.1 with full schemas
- `build.contract.concurrency` — strong ETag, If-Match, row_version, 428/412/409
- `build.workflow.bridge` — APPROVAL_STEP in WorkflowEngine, engine rejection is fatal
- `build.registry.slice_onboarding` — 5 entity keys, 10 endpoint keys, 27 packs, 6 field def endpoints
- `build.tests.parity` — 114 smoke checks including behavioral adapter validation

### 6.2 Gates expected to be PARTIAL

- `build.contract.schema` — schemas exist inline in OpenAPI; standalone `*.schema.json` files not produced as discrete artifacts
- `build.contract.problem` — RFC 9457 problem types implemented in code; standalone `problem-types.yaml` not produced
- `build.evidence.immutability` — attachment create/read implemented; explicit immutability tests (no update/delete proof) not yet in smoke suite
- `build.observability.contract` — `SliceObservability.php` implements Section 12 contract; standalone `otel-contract.md` not produced

### 6.3 Gates expected to be BLOCKED or NOT APPLICABLE

- `build.projection.ownership` — `approval_queue` and `attachment_timeline` are read-through queries in this slice, not async projections. The auditor must determine if this gate is `not_applicable` for synchronous read-through patterns or if a projection contract document is required.
- `build.async.contract` — this slice uses synchronous-only paths. No outbox, inbox, or async event publication exists. The auditor must determine if this gate is `not_applicable` or if an explicit exclusion document is required.

### 6.4 Artifact manifest gap

The execution package Section 14 lists target artifacts including standalone contract files:
- `contracts/openapi/foundation-governance-v1.yaml` — equivalent exists as `api/openapi.yaml`
- `contracts/json-schema/foundation-governance/*.schema.json` — NOT produced as standalone files (schemas are inline in OpenAPI)
- `contracts/problems/foundation-governance-problem-types.yaml` — NOT produced (problem types are in code)
- `contracts/metadata/foundation-governance-frontend-contract.json` — equivalent exists as entity rows in `frontend-foundation-catalog.json`
- `contracts/projections/foundation-governance-projection-contract.md` — NOT produced
- `contracts/observability/foundation-governance-otel-contract.md` — NOT produced
- `contracts/policy/foundation-governance-policy-architecture.md` — NOT produced

The auditor should evaluate whether inline/integrated artifacts satisfy the intent or whether discrete files are required before frontend generation.

## 7. Expected Metric Improvement Since Prior Audit

The prior Prompt 03 audit (2026-04-06) returned `NO-GO` with these metrics:

```yaml
workflow_engine_bridge_ready: 0
publishability_ready: false
missing_field_defs: 316
orphan_tables: 45
benchmark_overlap_count: 0
openapi_runtime_path_items: 0
```

The Prompt 02 implementation passes (tranche-1 through tranche-N) are expected to have improved:

- `workflow_engine_bridge_ready`: 0 → 1 (APPROVAL_STEP in WorkflowEngine)
- `openapi_runtime_path_items`: 0 → 10 (frozen public routes)
- `benchmark_overlap_count`: 0 → nonzero (FG read mix completed)
- `missing_field_defs` for slice: closed (field definitions + packs added)
- `publishability_ready` for slice entity: partial → ready (score 88)

The auditor must verify these improvements against live artifacts, not against claims.

## 7. Specific Audit Questions the Auditor Must Answer

1. Is the OpenAPI contract complete enough for frontend code generation?
2. Is the workflow bridge genuinely engine-backed or still a local validator?
3. Are the 11 internal write commands writing to real canonical tables?
4. Is the ETag behavior strong enough for regulated concurrency?
5. Is the self-approval prohibition enforced at the service layer?
6. Is the benchmark proof artifact fresh and does it show the FG read mix completed?
7. Are all 4 registry artifacts aligned on the same publication_run_id?
8. Is the observability contract sufficient for operational readiness?
9. Is the audit trail append-only with tamper detection?
10. Are there any split-truth or false-green conditions remaining?

## 8. Fail-Closed Rule

If the auditor discovers a contradiction between:
- code and published contract
- runtime behavior and metadata claims
- two different registry artifacts

The auditor must fail that gate and report the exact contradiction.

The auditor must not resolve contradictions by inference or assumption.

## 9. Output Requirements

The Prompt 03 re-audit must produce:

1. A live metrics block with fresh values from current artifacts
2. A gate-by-gate evaluation table (build-complete + publish)
3. A standards compliance checklist
4. A findings table with severity, evidence, and closure actions
5. A weighted blocker scoreboard
6. A frontend-readiness assessment specific to this slice
7. An explicit verdict: `GO`, `GO WITH CONDITIONS`, `REVIEW REQUIRED`, or `NO-GO`
8. A handoff package for Prompt 04 reconciliation

## 10. Standards Research References

The auditor should consult and reference these world-class implementations:

### 10.1 ERP Quality Management Reference Implementations

- **SAP S/4HANA**: QM-PT (quality planning), QM-IM (inspection management), QM-QC (quality certificates), QM-CA (quality notifications/CAPA). SAP uses material-based quality info records, inspection lots, usage decisions, and defect recording.
- **Oracle Cloud SCM**: Quality Management module with inspection plans, quality actions, quality issues (NCR), and supplier quality management. Oracle uses adaptive inspection sampling and skip-lot logic.
- **Microsoft Dynamics 365 SCM**: Quality orders, quality tests, test instruments, nonconformances, and corrections. D365 uses quality associations to trigger automatic quality orders.
- **Epicor Kinetic**: Quality Assurance module with inspection entry, first article inspection, non-conformance management, and corrective action.

### 10.2 ISA-95 Manufacturing Hierarchy

The canonical organization hierarchy implemented in this slice follows ISA-95 Level 4 (ERP) structure:
- Enterprise → Company → Site → Plant → Warehouse → Work Center → Work Unit
- This maps directly to ISA-95 role-based equipment hierarchy
- Party master enables multi-role, multi-scope relationships needed for ISA-95 personnel management
- Calendar/shift structure supports ISA-95 production scheduling definitions

### 10.3 Part 11 / Annex 11 Audit Trail Requirements

Per FDA 21 CFR Part 11 Section 11.10(e):
- "Use of secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records"
- Audit trail must not be modifiable by ordinary means
- Must include who, what, when, and why for every change

Per EU GMP Annex 11 Section 9:
- "Consideration should be given, based on a risk assessment, to building into the system the creation of a record of all GMP-relevant changes and deletions"
- "For the changing or deleting of GMP-relevant data an authorised reason should be documented"

### 10.4 GAMP 5 System Categories

- **Category 1**: Infrastructure software (OS, databases)
- **Category 3**: Non-configured products (COTS)
- **Category 4**: Configured products
- **Category 5**: Custom applications

This QMS portal falls under **Category 5** (custom application) which requires:
- Full specification and design documentation
- Code review
- Unit, integration, and system testing
- User acceptance testing
- Validation report

### 10.5 OpenTelemetry for Manufacturing

Best practices from OTel Collector Architecture and Semantic Conventions:
- **Traces**: propagate `trace_id` via W3C Trace Context (`traceparent`/`tracestate`) across all service boundaries; 100% sampling for regulated operations (approval decisions, signature applications)
- **Metrics**: Counter (total inspections, defects), UpDownCounter (queue depth), Histogram (inspection/approval duration distribution), Gauge (current system state)
- **Logs**: structured JSONL with trace correlation (`trace_id` + `span_id` injected into every log record)
- **Semantic conventions**: extend OTel standard naming with domain-specific conventions (e.g., `qms.approval.group_id`, `qms.approval.decision_code`, `manufacturing.work_order.id`)
- **OTLP protocol**: preferred over legacy Jaeger/Zipkin for new deployments; supports gRPC and HTTP/protobuf

### 10.6 ALCOA+ Data Integrity Principles (EMA/PIC/S)

All electronic records in the slice must satisfy ALCOA+:
- **A**ttributable: every record linked to the person who created or modified it
- **L**egible: records readable and permanent throughout retention period
- **C**ontemporaneous: recorded at the time of the activity
- **O**riginal: original record or a certified true copy preserved
- **A**ccurate: free from errors; any edits documented with audit trail
- Plus **C**omplete, **C**onsistent, **E**nduring, **A**vailable

### 10.7 GAMP 5 Category 5 Validation Requirements

This QMS portal is a Category 5 (custom application) under GAMP 5 2nd Edition (2022), requiring:
- Full User Requirements Specification (URS) ← OpenAPI contract + execution package
- Functional Specification (FS) ← route behavior contract + invariant catalog
- Design Specification (DS) ← aggregate manifest + schema DDL
- Code review ← Prompt 03 re-audit
- Unit/integration/system testing ← smoke suite (114 checks) + benchmark
- Traceability matrix: each requirement traceable to specification and test
- Risk-based testing depth: higher rigor for approval decisions and e-signatures

The 2nd Edition explicitly supports agile development and exception-based reporting, which aligns with the iterative Prompt 02 implementation approach used for this slice.

### 10.8 NIST SP 800-53 Rev 5 Audit Controls (AU Family)

Key controls the auditor must verify:
- **AU-2 Event Logging**: auditable events are defined and captured (AuditTrail.php)
- **AU-3 Content**: event type, time, location, source, outcome, user identity in every record
- **AU-8 Time Stamps**: synchronized, granular timestamps (gmdate ISO 8601)
- **AU-9 Protection**: audit information tamper-resistant (hash chain in AuditTrail)
- **AU-10 Non-repudiation**: e-signatures linked to records per Part 11 Section 11.70
- **AU-11 Retention**: audit records retained for required period

### 10.9 ISA-95 Quality Operations Management

The Foundation Governance Contract Slice implements ISA-95 Level 4 (ERP) structures:
- **Equipment hierarchy**: enterprise > company > site > plant > warehouse > work_center > work_unit (maps to ISA-95 role-based equipment model)
- **Personnel management**: party master with multi-role, multi-scope relationships
- **Quality operations bridge**: approval_group workflow bridges Level 4 governance decisions into Level 3 execution context
- **B2MML alignment**: canonical data exchange patterns for QualityTestSpecification, OperationsPerformance

### 10.10 SAP / Oracle / D365 Quality Management Patterns

The auditor should compare the slice's approval workflow against vendor patterns:
- **SAP QM-QN**: quality notifications with structured workflow (Create → Tasks → Activities → Corrective Actions → Close)
- **Oracle QM**: 8D CAPA methodology (D1-D8) with workflow statuses and automated notifications
- **D365 QM**: nonconformance approval workflow (New → Approved/Refused → Closed) with quality order re-testing
- **Common pattern**: all vendors use immutable decision records, maker-checker separation, and audit trail with who/what/when/why

## 11. Relationship to Prompt 04

After this Prompt 03 re-audit completes:

- If verdict is `GO` or `GO WITH CONDITIONS`: the handoff package goes to Prompt 04 for program reconciliation and promotion decision
- If verdict is `REVIEW REQUIRED`: remaining gaps must be closed in another Prompt 02 pass before re-audit
- If verdict is `NO-GO`: the slice cannot be promoted and requires significant remediation

Prompt 04 will decide whether to:
- Promote the slice for frontend generation
- Require additional hardening
- Descope capabilities that are not yet ready

## 12. Sources

- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)
- [GraphQL Cursor Connections](https://relay.dev/graphql/connections.htm)
- [Dataverse Optimistic Concurrency](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency)
- [PostgreSQL pgbench](https://www.postgresql.org/docs/current/pgbench.html)
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [FDA 21 CFR Part 11](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU GMP Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)
- [ISPE GAMP 5](https://ispe.org/publications/guidance-documents/gamp-5)
- [ISO 9001:2015](https://www.iso.org/standard/62085.html)
- [IATF 16949:2016](https://www.iatfglobaloversight.org)
- [AS9100D](https://www.sae.org/standards/content/as9100d/)
- [ISA-95 / IEC 62264](https://www.isa.org/isa95)
- [NIST SP 800-162 ABAC](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)
- [NIST SP 800-53 Rev 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [OpenTelemetry](https://opentelemetry.io/docs/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [AsyncAPI 3.0](https://www.asyncapi.com/docs/reference/specification/v3.0.0)
- [CloudEvents](https://cloudevents.io/)
- [SAP S/4HANA QM](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE)
- [Oracle Cloud SCM QM](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/)
- [Microsoft Dynamics 365 SCM QM](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/quality-management-processes)
