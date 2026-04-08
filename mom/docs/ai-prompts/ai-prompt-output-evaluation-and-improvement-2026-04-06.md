# AI Prompt Output Evaluation and Improvement Plan

Date: 2026-04-06
Scope: Evaluation of the completed outputs generated from Prompt 01, Prompt 02, Prompt 03, and Prompt 04.

Reviewed local outputs:

- `prompt-01-canonical-platform-architecture-package-2026-04-06.md`
- `prompt-02-backend-implementation-review-package-2026-04-06.md`
- `prompt-03-backend-audit-final-2026-04-06.md`
- `prompt-04-master-orchestrator-package-2026-04-06.md`

Reviewed live local anchors:

- `qms-data/registry/registry-quality-report.json`
- `docs/schema-field-audit-full.json`
- `qms-data/registry/frontend-foundation-catalog.json`
- canonical migrations `072` through `078`

Reviewed official reference lanes:

- Microsoft CQRS: <https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs>
- Microsoft Dataverse optimistic concurrency: <https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency>
- Microsoft Dataverse runtime metadata access: <https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/get-table-metadata>
- Salesforce ObjectInfo metadata: <https://developer.salesforce.com/docs/platform/graphql/guide/query-objectinfo.html>
- OpenAPI 3.1.1: <https://spec.openapis.org/oas/v3.1.1.html>
- RFC 9457 Problem Details: <https://www.rfc-editor.org/rfc/rfc9457>
- JSON Schema Draft 2020-12: <https://json-schema.org/draft/2020-12>
- AsyncAPI 3.0.0: <https://www.asyncapi.com/docs/reference/specification/v3.0.0>
- OpenTelemetry docs and context: <https://opentelemetry.io/docs/> and <https://opentelemetry.io/docs/specs/otel/context/>
- PostgreSQL LIMIT/OFFSET: <https://www.postgresql.org/docs/current/queries-limit.html>
- PostgreSQL Materialized Views: <https://www.postgresql.org/docs/current/rules-materializedviews.html>
- PostgreSQL Transaction Isolation: <https://www.postgresql.org/docs/current/transaction-iso.html>
- OpenID Connect Core: <https://openid.net/specs/openid-connect-core-1_0-18.html>
- NIST SP 800-162 ABAC: <https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.SP.800-162.pdf>
- FDA Part 11 guidance: <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application>
- EU Annex 11: <https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf>
- Oracle Work Orders: <https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25b/faumm/manage-work-orders.html>
- Oracle Product Genealogy: <https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/24d/faumf/how-you-review-product-genealogy.html>
- Oracle Genealogy Deferred Build: <https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/24c/faims/how-you-set-up-manufacturing.html>
- Oracle Inspections: <https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/faumf/how-you-manage-inspections.html>

## Executive Evaluation

The four generated outputs are materially better than generic AI planning artifacts. They are evidence-aware, fail-closed, and internally consistent enough to be useful as program control documents.

However, they are not yet the best possible world-class output set for the next build loop.

They are strongest at:

- separating architecture ownership from implementation ownership and audit ownership
- refusing premature rollout claims
- identifying the real blockers visible in the repo today
- preserving a canonical-first target while acknowledging the current transition runtime

They are weaker at:

- turning blockers into one executable slice with explicit artifact ownership
- closing important world-class depth areas that matter for ERP, MES, and eQMS
- preventing stale or mixed evidence from leaking between bundles
- defining a measurable benchmark and proof system that can drive the next loop without interpretation

Recommended interpretation:

- Prompt 01 output is architecture-grade and useful
- Prompt 02 output is a strong implementation review baseline, but not yet a build package
- Prompt 03 output is the strongest of the four because it correctly enforces fail-closed audit logic
- Prompt 04 output is directionally correct, but still too orchestration-heavy and not concrete enough about the first promotable slice

Program decision after deep review:

- keep the current result set
- do not discard it
- do not treat it as the final program package
- harden the prompts and rerun a narrower, more execution-oriented next loop

## Verified Current-State Alignment

The four bundles are directionally consistent with live repo evidence on the most important gates:

- `workflow_engine_bridge_ready = 0`
- `workflow_engine_bridge_blocked = 115`
- `frontend_ready_entities = 330`
- `frontend_partial_entities = 198`
- `publishability_ready = false`
- `missing_field_defs = 316`
- `orphan_tables = 45`

This matters because the outputs are not simply optimistic architecture essays. They do pick up the major current blockers correctly.

## What The Outputs Did Well

### 1. They enforced real separation of concerns

This is aligned with Microsoft CQRS guidance, which emphasizes distinct read and write concerns and the synchronization problem between them.

Why this is good:

- Prompt 01 kept canonical write truth separate from projections
- Prompt 02 preserved projection-backed planning and operator surfaces
- Prompt 03 correctly challenged runtime proof instead of architecture intent
- Prompt 04 preserved the split between target truth and compatibility runtime

This is one of the most important signs of output quality.

### 2. They used good standards anchors

The result set correctly centered on:

- OpenAPI 3.1.1
- JSON Schema 2020-12
- RFC 9457 problem details
- optimistic concurrency
- OIDC then authorization
- CloudEvents and AsyncAPI for async publication
- OpenTelemetry-grade observability

These are the right global reference points for a modern platform backend.

### 3. They were conservative about publishability

This is a major positive.

The bundles did not confuse:

- metadata breadth with runtime safety
- current compatibility runtime with canonical readiness
- prompt structure quality with production readiness

Prompt 03 and Prompt 04 especially did the right thing by refusing a false `GO`.

### 4. They recognized regulated-domain requirements

The outputs correctly elevated:

- immutability after release or signature
- retention and legal hold
- signature meaning and version binding
- segregation of duties
- genealogy and provenance
- audit-grade benchmark evidence

This is aligned with FDA Part 11, Annex 11, and the broader global expectation for validated computerized systems.

## What The Outputs Missed Or Underdeveloped

### 1. They still do not define the first promotable slice precisely enough

This is the single biggest practical weakness.

The outputs say what must be true, but they do not lock one concrete build slice such as:

- exact canonical tables in Wave 1
- exact contracts to publish in Wave 1
- exact projections to ship in Wave 1
- exact workflow bridge target in Wave 1
- exact benchmark scenarios for Wave 1
- exact file or migration ownership for Wave 1

World-class program quality requires a named first slice, not only a blocker list.

### 2. Finance and subledger realism are still too shallow

The outputs mention finance linkage, posting bridges, and ledger-first rules, but they still under-specify:

- subledger-to-GL posting contract
- valuation method boundaries
- period-close invariants
- cost object hierarchy
- reconciliation ownership
- inventory valuation and cost reclassification flows

For a world-class ERP backbone, this is not optional.

### 3. MES edge and industrial realism are not deep enough

The outputs correctly care about genealogy, dispatch, and event truth, but they still under-specify:

- edge or offline ingestion rules
- replay ordering and dedup identity shape
- equipment hierarchy mapping from site to plant to area to work center to work unit
- source protocol normalization strategy for MTConnect, OPC UA, Sparkplug, and historian replay
- time synchronization and late-arriving event policy
- machine state to production state reconciliation

Oracle and industrial standards evidence strongly suggest these must be explicit much earlier.

### 4. eQMS validation lifecycle is still too narrow

The outputs care about immutability and signatures, which is good, but they still do not force a full validated-system discipline:

- computerized system validation package ownership
- requirement to test traceability from requirement to risk to design to verification
- controlled configuration and release evidence
- training effectiveness closure
- complaint to NCR to CAPA to change to training loop
- audit program planning and audit finding closure model

For a serious regulated platform, this gap is important.

### 5. Frontend-generation semantics are still below best-in-class metadata platforms

The outputs talk about `list`, `detail`, `form`, `workflow`, `timeline`, and `attachments`, but the metadata still needs stronger semantics comparable to Dataverse and Salesforce metadata depth.

Missing or under-specified areas:

- variant layouts by record type or lifecycle state
- field visibility predicates and editability predicates
- lookup picker behavior and query policy
- related list policy by relationship type and cardinality
- list preset definitions and default filters
- board semantics such as grouping field, lane sort, WIP limits, action affordances
- timeline event taxonomy and ordering contract
- search facets and ranking contract

Without these, frontend generation will still require too much hand interpretation.

### 6. Security architecture is not concrete enough

The outputs correctly say `OIDC -> RBAC -> ABAC`, but they do not yet force:

- policy decision point and policy enforcement point boundaries
- canonical attribute dictionary
- relationship-based policy rows
- break-glass policy
- delegation and substitution rules
- service-to-service identity policy
- field-level redaction contract

NIST ABAC guidance requires subject, object, action, and environment attributes to be explicit, not implied.

### 7. Benchmark requirements are better than the old baseline, but still not execution-ready

Prompt 03 correctly rejected the current benchmark.

But the replacement benchmark is still underspecified because it lacks:

- dataset scale by domain
- scenario traffic mix percentages
- percentile thresholds
- queue lag budget
- projection lag budget
- rebuild completion thresholds
- contention target zones
- soak duration
- failure budget
- route overlap target for supported runtime coverage

This means the next team would still need to interpret too much.

### 8. Anti-staleness discipline needs to be stronger

The outputs already caught one contradiction:

- stale narrative: `40 ready / 488 partial`
- live registry evidence: `330 ready / 198 partial`

This is a healthy catch, but it also proves the next iteration must import one live metrics block at run start and force every narrative count to reference it.

## Prompt-By-Prompt Quality Assessment

### Prompt 01

Strengths:

- strong architecture framing
- strong bounded-context discipline
- correct insistence on canonical write truth
- good platform service inventory
- good metadata and contract taxonomy

Weaknesses:

- too broad at phase level
- not enough aggregate-by-aggregate command and event detail
- insufficient finance and policy architecture depth
- not enough frontend semantic contract specificity

Quality assessment:

- architecture quality: high
- execution utility: medium
- world-class completeness: medium-high

### Prompt 02

Strengths:

- strongest baseline for standards freeze
- good compatibility-boundary discipline
- good blocker matrix
- correctly blocks workflow promotion when bridge readiness is `0`

Weaknesses:

- remains review-oriented rather than implementation-wave-oriented
- no explicit first slice artifact manifest
- no migration sequence or ownership matrix
- no exact contract publication scope for the first delivery wave

Quality assessment:

- implementation baseline quality: high
- implementation actionability: medium
- next-loop readiness: medium-high

### Prompt 03

Strengths:

- best fail-closed behavior
- correct rejection of unsupported readiness claims
- strongest bridge from repo reality to global standards
- strongest benchmark critique

Weaknesses:

- no quantified remediation priority model
- no closure economics by blocker
- still does not force audit package outputs into exact SLI/SLO thresholds

Quality assessment:

- audit quality: very high
- production-hardening usefulness: high
- re-audit readiness: high

### Prompt 04

Strengths:

- clean reconciliation boundary
- correctly chose split-path
- correctly routed next work to Prompt 02

Weaknesses:

- too little program economics
- no weighted blocker scoreboard
- no one exact promotable slice
- no phase-exit checklist concrete enough for `GO`

Quality assessment:

- orchestration quality: good
- decision concreteness: medium
- program control value: medium-high

## Global Best-Practice Comparison

### Metadata and frontend contracts

Dataverse runtime metadata and Salesforce ObjectInfo both emphasize that frontend generation quality depends on rich metadata that includes:

- field types
- requiredness
- queryability
- updatability
- relationships
- child relationships
- layout and UI relevance

The current bundles are correct to prioritize metadata, but the next iteration must force stronger UI-semantic metadata, not just structural metadata.

### Read-model strategy

Microsoft CQRS and PostgreSQL documentation support the bundle position that:

- write truth and read projections must be separated
- event or refresh synchronization must be explicit
- `LIMIT/OFFSET` is not sufficient for serious user-facing pagination without careful ordering
- materialized views are useful but not automatically current

This confirms that the outputs are right to demand explicit projection freshness and stale-read contracts.

### Concurrency and mutation safety

Dataverse optimistic concurrency guidance supports the bundle stance that update or delete flows must detect concurrent changes, not silently overwrite them.

The current bundles should go one step further next time by requiring:

- explicit public mutation examples
- conflict payload examples
- retry policy examples

### Async and observability

OpenTelemetry and AsyncAPI both support the bundle claim that async publication and telemetry cannot remain implementation detail only.

The next iteration should require:

- correlation ID contract
- event envelope examples
- topic or channel naming policy
- replay semantics
- projection lag metrics

### Regulated records

FDA Part 11 and Annex 11 support the bundle position that validated controls, data integrity, and role clarity matter across the system lifecycle.

The next iteration must make this more operational by requiring:

- validation package structure
- risk assessment ownership
- release evidence
- immutable archive policy
- role separation and delegation policy

### ERP, MES, and genealogy realism

Oracle's work order, inspection, and genealogy documentation supports several patterns the next iteration should encode more explicitly:

- work orders tied to organization context and work definitions
- release to execution as an explicit stateful transition
- genealogy as a dedicated navigable capability, not just a generic relation
- inspections and plans as execution-linked quality controls
- deferred genealogy build as a performance tradeoff that must still preserve correctness

The current bundles are aligned with these ideas but need more explicit implementation semantics.

## Improvement Actions For The Prompt System

### Action 1. Add a mandatory live metrics import block to every result bundle

Every result must start with one normalized metrics block loaded from local artifacts:

- registry quality summary
- schema audit summary
- current canonical onboarding summary
- route inventory summary

All subsequent counts in the bundle must reference that block.

This prevents stale narrative drift.

### Action 2. Force a single promotable slice

Every major result bundle after Prompt 01 must name exactly one:

- promotable slice name
- included bounded contexts
- included canonical tables
- included APIs
- included events
- included projections
- included workflow bridge target
- included benchmark scenarios

Without this, the output remains too strategic.

### Action 3. Require an artifact manifest

Each implementation-oriented bundle must list:

- migrations to create or update
- services to implement
- routes to publish
- schemas to publish
- events to publish
- metadata packs to emit
- tests to add
- metrics to instrument

This must be a mandatory deliverable, not optional prose.

### Action 4. Require a command-event-invariant catalog

Prompt 01 and Prompt 02 should emit for each selected aggregate:

- commands
- resulting events
- forbidden transitions
- concurrency rules
- idempotency rule
- projection consumers

This will dramatically improve output precision.

### Action 5. Require a regulated validation matrix

For every governed root, the next iteration should explicitly publish:

- release condition
- signature meaning
- immutable-after rule
- retention class
- legal-hold behavior
- archive behavior
- training impact
- change-control impact
- audit trace expectation

### Action 6. Require a benchmark charter, not only benchmark principles

Prompt 03 must emit:

- dataset sizes
- concurrency profiles
- percentiles and thresholds
- route overlap target
- lag budgets
- soak duration
- rebuild thresholds
- pass or fail cut lines

### Action 7. Require a policy architecture section

The next result set should publish:

- subject attributes
- object attributes
- action attributes
- environment attributes
- PDP and PEP boundaries
- service identity rules
- delegation and substitution rules

### Action 8. Require frontend semantic metadata depth

The next result set should include:

- record type or variant model
- dynamic form and layout predicates
- related list behavior
- board semantics
- timeline event taxonomy
- search facets
- lookup and picker policies

## Recommended First Promotable Slice

The current outputs do not choose one exact slice. They should.

Recommended first promotable slice:

- `EnterpriseFoundation`
- `PartyMaster`
- `ProductMaster`
- `ControlledDocumentsChange`

Why this slice should go first:

- it establishes identity, org scope, policy, and concurrency foundations
- it establishes canonical master data and revision discipline
- it establishes regulated document, approval, signature, attachment, audit, retention, and evidence behavior
- it creates the core object-page, timeline, attachment, workflow, and permission patterns that later ERP, MES, and eQMS modules will reuse

Recommended follow-on slices:

1. `PlanningAndRelease`
2. `MESExecution`
3. `InventoryCostTraceability`
4. `QualityCompliance`
5. `FinanceLinkage`

## Recommended Next Iteration Strategy

Do not rerun all four prompts unchanged.

Use this sequence:

1. Harden Prompt 01, Prompt 02, Prompt 03, and Prompt 04 with the improvement actions above.
2. Rerun Prompt 01 only for:
   - finance-linkage depth
   - MES edge and equipment model
   - regulated validation package model
   - frontend semantic metadata model
   - exact first promotable slice
3. Rerun Prompt 02 to produce:
   - exact Wave 1 artifact manifest
   - exact `/api/v1` contract scope
   - exact canonical onboarding scope
   - exact workflow bridge target
   - exact benchmark and observability hooks
4. Rerun Prompt 03 only after Prompt 02 produces the above artifacts.
5. Run Prompt 04 last to reconcile and gate.

## Bottom-Line Recommendation

The four generated outputs are high-quality control artifacts, but not yet the highest-utility world-class program package.

Use them as:

- architecture freeze input
- implementation blocker baseline
- audit truth source
- orchestration gate

Do not use them yet as:

- the final backend master plan
- the final benchmark package
- the final publishability package
- the final slice execution package

Most important improvement:

- move from blocker-oriented bundles to slice-oriented, artifact-oriented, proof-oriented bundles

If that change is made, the next run can become dramatically more actionable without losing rigor.
