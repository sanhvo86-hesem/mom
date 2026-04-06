# Prompt 02: Canonical Backend Implementation Factory

## GPT Codex launch mode

Paste the full contents of this file into a fresh GPT Codex section and press Enter with no additional text.
Do not add any preface, explanation, or wrapper message.
After the first run starts, execute all planned Prompt 02 sub-prompts sequentially in the same run until the file is complete.
Do not stop between sub-prompts unless blocked by missing evidence, tool failure, or hard response limits.
If an extra message is needed only because of hard system limits, resume from the last unfinished step automatically. `Continue` is optional, not required.
Do not switch to Prompt 01, Prompt 03, or Prompt 04 from this section.

## Purpose

Use this prompt when you want an AI to implement the backend platform and modules on top of the approved canonical architecture.

This prompt is for:

- schema migrations and constraint hardening
- aggregate behavior and domain services
- workflow runtime and command handling
- OpenAPI, JSON Schema, and AsyncAPI contracts
- read projections and board or query models
- security, governance, and compliance enforcement
- observability, tests, rollout gates, and benchmark hooks

## Owned scope

Prompt 02 owns:

- implementation-grade backend construction design
- schema and service decomposition
- commands, events, APIs, projections, and rollout gates
- implementation assumptions and blockers
- executable handoff for build teams

## Forbidden scope

Prompt 02 must not own:

- target-state architecture redesign
- independent audit verdicts
- cross-bundle reconciliation
- vendor benchmark conclusions as the primary output
- program-level arbitration between parallel bundles

## Language and localization rule

The backend platform must be English-only:

- schema names
- field names
- workflow states and transitions
- API contracts
- error codes
- event names
- permission keys
- code comments
- technical backend documentation

Localization belongs to the frontend presentation layer only.
The backend may expose optional localizable presentation metadata, but canonical business identifiers remain English.

## Sequential standalone execution mode

Assume this prompt may be pasted alone into one AI session or one AI section.
Do not assume hidden memory from earlier runs.
Reconstruct context from the provided artifacts and any available architecture package, then run as a dynamic implementation bundle that executes all sub-prompts sequentially in one run until the final package is complete.
Keep step logs concise so token budget is spent on implementation detail and proof quality instead of repetitive narration.

## Parallel bundle mode

Prompt 02 may run at the same time as Prompt 01 and Prompt 03 in separate AI sections.
Do not block all implementation-grade thinking just because Prompt 01 is still running.
Use local artifacts as the main source of truth, consume any available architecture package when present, and record provisional assumptions and sync requests for later reconciliation by Prompt 04.

## Execution-package-first mode

If an execution package exists for the next loop, Prompt 02 must treat it as the primary implementation input and as the narrowest authoritative slice definition.

Current primary implementation input for the next loop:

- [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md)

Supporting execution-package inputs:

- [execution-package-build-publish-gates-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-build-publish-gates-2026-04-06.md)
- [execution-package-implementation-backlog-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-implementation-backlog-2026-04-06.md)
- [execution-package-index-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-index-2026-04-06.md)

Rules:

- if the execution package exists, it overrides broader architectural slice narratives for Prompt 02 implementation scope
- Prompt 02 must not broaden the chosen slice unless the execution package itself is internally inconsistent
- if a contradiction exists between the execution package and older Prompt 01 or Prompt 02 outputs, the execution package wins for the current loop and the contradiction must be logged explicitly
- Prompt 02 must implement toward `BUILD READY -> PUBLISH BLOCKED -> PUBLISH READY`, not toward whole-program closure

## Six-reviewer protocol for each sub-prompt

Every Prompt 02 sub-prompt must be reviewed from 6 distinct reviewer roles before it can be closed.

If the environment supports real sub-agents, run these 6 reviewers in parallel.
If you are running in GPT Codex or any single-thread GPT environment without real sub-agent tooling, emulate the same 6 reviewers sequentially as 6 explicit passes before synthesizing the step result.
Never claim or imply that real agents were used unless the environment actually provided agent tooling and you explicitly used it.
Default assumption: real sub-agents are not available unless the environment visibly exposes and uses agent tooling in this run.

Reviewer roles:

1. `implementation-architecture`
2. `erp-implementation`
3. `mes-implementation`
4. `eqms-implementation`
5. `platform-implementation`
6. `delivery-red-team`

Each reviewer must return only:

- findings about the current Prompt 02 sub-prompt
- contradictions
- missing evidence
- recommended corrections within Prompt 02 ownership only

The step cannot be closed until the primary model reconciles those 6 reviewer outputs and records a `Six-Reviewer Review Synthesis`.

## Single-prompt focus rule

This prompt must optimize for maximum quality on Prompt 02 only.
Do not partially execute Prompt 01, Prompt 03, or Prompt 04 inside the same run.
Do not drift into full audit, orchestration, or architecture-redesign output unless a blocker forces escalation.
Finish the implementation-grade design deeply, pass the QA checklist, and stop with a clean handoff package.
Do not redefine architecture ownership that belongs to Prompt 01.

## Prompt 02 dynamic sub-prompt planner

At the beginning of the first run, the AI must create a `Prompt 02 Step Plan` with as many sub-prompts as needed for quality.
The number of sub-prompts must depend on scope, dependency complexity, contract depth, and risk.

The plan should usually separate work such as:

- conformance and dependency freeze
- contract definition
- data, command, event, and projection design
- proof strategy, rollout gate, QA, and final package

but it may split or merge these depending on complexity.

Each step must also record:

- what Prompt 02 can complete independently
- what assumptions depend on architecture decisions that may still be evolving
- what should later be synchronized with Prompt 01 or Prompt 03
- what Prompt 04 must reconcile at program level
- what the 6 reviewer roles changed in this step

## Auto-complete execution protocol

If there is no prior Prompt 02 sub-prompt output in the conversation, start by building the step plan and execute all planned Prompt 02 steps sequentially.
Do not wait for `Continue` between Prompt 02 sub-prompts.
After the final planned sub-prompt, stop Prompt 02 and instruct that this file is complete.
Do not jump to Prompt 01, Prompt 03, or Prompt 04 automatically from this file.
Do not stop early after `Step 1` or any intermediate step unless blocked by missing evidence, tool failure, or hard response limits.
If the AI must change the number of remaining sub-prompts, it must explain why and publish an updated step plan before continuing.

## Required local documents to read first

The AI must read these local files before proposing or writing code:

- [execution-package-index-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-index-2026-04-06.md)
- [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md)
- [execution-package-build-publish-gates-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-build-publish-gates-2026-04-06.md)
- [execution-package-implementation-backlog-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-implementation-backlog-2026-04-06.md)
- [01-canonical-platform-architect-prompt.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/01-canonical-platform-architect-prompt.md)
- [04-master-orchestrator-prompt.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/04-master-orchestrator-prompt.md)
- [greenfield-canonical-first-execution-plan-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/greenfield-canonical-first-execution-plan-2026-04-06.md)
- [canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md)
- [canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md)
- [frontend-foundation-global-blueprint-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/frontend-foundation-global-blueprint-2026-04-06.md)
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)
- [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json)
- [schema-field-audit-full.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/schema-field-audit-full.json)
- [strategic-roadmap-2026.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/strategic-roadmap-2026.md)
- [34-module-builder-architecture.md](C:/Users/TEST4/qms.hesem.com.vn/core-standards/34-module-builder-architecture.md)
- [module-builder-world-class-prompts.md](C:/Users/TEST4/qms.hesem.com.vn/core-standards/prompts/module-builder-world-class-prompts.md)
- [072_canonical_foundation_governance.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/072_canonical_foundation_governance.sql)
- [073_canonical_master_data_core.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/073_canonical_master_data_core.sql)
- [074_canonical_engineering_definition.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/074_canonical_engineering_definition.sql)
- [075_canonical_planning_erp_orchestration.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/075_canonical_planning_erp_orchestration.sql)
- [076_canonical_mes_execution_spine.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/076_canonical_mes_execution_spine.sql)
- [077_canonical_inventory_cost_traceability.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/077_canonical_inventory_cost_traceability.sql)
- [078_canonical_eqms_compliance_backbone.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/migrations/078_canonical_eqms_compliance_backbone.sql)

## Mandatory live metrics import block

Before any implementation synthesis, the AI must import one normalized `Live Metrics Block` from local artifacts and place it near the start of the output.

The `Live Metrics Block` must include at least:

- `generated_at` for each source artifact used for counts
- `workflow_engine_bridge_ready`
- `workflow_engine_bridge_blocked`
- `frontend_ready_entities`
- `frontend_partial_entities`
- `publishability_ready`
- `missing_field_defs`
- `orphan_tables`
- `canonical_onboarding_gap_count` if provable
- any additional blocker counts used later in the output

Rules:

- all later counts in the output must reference this block
- implementation backlog rows must point back to one blocker in this block
- stale counts from older documents must be called out explicitly as stale

## Official references the AI must prioritize

Use official or primary references only.

- OpenAPI 3.1: [OpenAPI Specification v3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- JSON Schema: [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)
- RFC 9457: [Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- OpenID Connect: [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-18.html)
- NIST Digital Identity: [NIST SP 800-63-4](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63-4.pdf)
- NIST RBAC: [Role Based Access Control](https://csrc.nist.gov/Projects/Role-Based-Access-Control)
- NIST ABAC: [NIST SP 800-162](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-162.pdf)
- Microsoft CQRS: [CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- Microsoft Event Sourcing: [Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- Microsoft Dataverse optimistic concurrency: [Optimistic concurrency](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency)
- OData 4.01: [OData Version 4.01](https://www.oasis-open.org/standard/odata-v4-01-os/)
- GraphQL pagination: [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- AsyncAPI: [AsyncAPI Specification](https://www.asyncapi.com/docs/reference/specification/v3.0.0)
- CloudEvents: [CloudEvents](https://cloudevents.io/)
- OpenTelemetry: [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
- PostgreSQL materialized views: [Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)
- PostgreSQL transaction isolation: [Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- Oracle genealogy: [How You View Product Genealogy Details](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25a/faumf/how-you-view-product-genealogy-details.html)
- Oracle quality issue to action: [Create a Quality Action from a Quality Issue](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25a/fauqm/create-a-quality-action-from-a-quality-issue.html)
- MTConnect: [MTConnect documentation](https://www.mtconnect.org/documentation)
- Sparkplug: [The Sparkplug Specification](https://sparkplug.eclipse.org/specification)
- OPC UA: [OPC Unified Architecture](https://opcfoundation.org/about/opc-technologies/opc-ua/)
- FDA Part 11: [Part 11, Electronic Records; Electronic Signatures](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- EU Annex 11: [EudraLex Volume 4 Annex 11](https://health.ec.europa.eu/system/files/2016-11/2011-01_annex_11_en_0.pdf)
- ICH Q10: [ICH Q10 Pharmaceutical Quality System](https://database.ich.org/sites/default/files/Q10%20Guideline.pdf)
- RFC 3339: [Date and Time on the Internet: Timestamps](https://datatracker.ietf.org/doc/html/rfc3339)
- RFC 9557: [Internet Extended Date/Time Format](https://www.ietf.org/rfc/rfc9557.html)

## Source hierarchy and contradiction arbitration

Use the same hierarchy as Prompt 01, with the active execution package added above it:

1. active execution package for the current loop
2. implemented local artifacts for current-state reality
3. approved canonical architecture and migrations for target truth
4. official standards and protocol specifications
5. official vendor platform references for benchmark
6. implementation inference

Rules:

- do not code around contradictions
- do not invent missing contracts
- if prerequisites are missing, return `BLOCKED`
- if current implementation conflicts with target truth, fix the architecture gap first or escalate it explicitly
- keep facts, inferences, assumptions, and gaps separated in the work output
- when an execution package exists, do not reopen broader slice selection inside Prompt 02

## Mandatory implementation workflow

Before proposing code, the AI must complete these passes:

### Pass 1. Architecture conformance

- verify the requested implementation aligns with the approved canonical architecture
- identify missing prerequisites and blocked dependencies
- refuse to code around unresolved architecture gaps

### Pass 2. Domain-depth review

- study the specific ERP, MES, eQMS, platform, governance, or integration domain involved
- trace how it connects to identity, workflow, projections, metadata, observability, and release gates

### Pass 3. Contract definition

- define API, schema, event, metadata, error, and authorization contracts before code
- define versioning and deprecation strategy before code

### Pass 4. Operational design

- reason about concurrency, pagination, indexing, audit, observability, retry, rebuild, replay, and benchmark implications
- ensure the implementation is production-minded, not just functionally correct

### Pass 5. Proof strategy

- define tests
- define benchmark hooks
- define release gates
- define what evidence is required before calling the work complete

## Minimum evidence bar before code

Do not implement until all of these are true:

- relevant local architecture and schema artifacts were reviewed
- the target bounded context dependency map exists
- aggregate roots and invariants are explicit
- API, event, metadata, and error contract shapes are explicit
- authorization and org-scope implications are explicit
- concurrency and idempotency behavior are explicit
- projection ownership and refresh semantics are explicit
- benchmark hooks and tests are explicit
- assumptions, negative scope, and blocked dependencies are explicit

## Required implementation coverage

For every bounded context or capability, explicitly cover:

- research ledger
- dependency map
- facts-vs-inference register
- aggregate roots and invariants
- commands, validations, and side effects
- workflow transitions and command semantics
- data model, constraints, foreign keys, indexes, and archive or deletion strategy
- API contracts and error model
- event contracts and integration semantics
- metadata contracts for list, detail, related lists, actions, workflow, timeline, attachments, and analytics
- projection freshness class, ownership, refresh trigger, lag budget, rebuild procedure, and stale-read behavior
- authorization, org scope, segregation of duties, and delegation
- audit, archive, retention, legal hold, and evidence semantics
- observability and benchmark hooks
- tests, rollout gate, negative scope, and blocked scope

## Mandatory first delivery slice

Prompt 02 must define exactly one `First Delivery Slice`.

The first delivery slice must include:

- slice name
- included bounded contexts
- included aggregates
- included canonical tables
- included routes
- included schemas
- included events
- included projections
- included metadata packs
- included workflow bridge target
- excluded scope
- exact build order
- exact release gate for the slice

## Mandatory implementation artifact manifest

Prompt 02 must publish an artifact manifest for the first delivery slice.

The manifest must include:

- migrations to create or update
- services to implement or modify
- routes to publish or change
- OpenAPI or JSON Schema files to publish or update
- AsyncAPI or event contract files to publish or update
- registry or metadata artifacts to emit or regenerate
- tests to add
- benchmark hooks to add
- observability instrumentation to add

## Mandatory command-event-invariant catalog

For every selected aggregate in the first delivery slice, Prompt 02 must define:

- aggregate name
- commands
- validations
- forbidden transitions
- emitted events
- idempotency rule
- concurrency rule
- projection consumers
- audit or governed envelope implications

## Mandatory policy architecture

Prompt 02 must define the implementation-ready policy model for the first delivery slice:

- subject attributes
- object attributes
- action attributes
- environment attributes
- PDP and PEP boundaries
- service identity rules
- delegation and substitution behavior
- field redaction or masking behavior

## Mandatory benchmark charter and proof matrix

Prompt 02 must define the implementation-facing benchmark and proof matrix for the first delivery slice:

- dataset scale
- traffic mix
- concurrency profile
- required p50, p95, and p99 targets
- lag budgets
- rebuild thresholds
- route overlap target
- soak duration
- failure budget
- pass or fail cut lines

## Non-negotiable implementation rules

- Every public API must be defined in OpenAPI 3.1 and JSON Schema 2020-12.
- Every non-2xx response must use `application/problem+json`.
- Cursor or keyset pagination is the default for enterprise lists. `OFFSET` is allowed only for bounded admin or diagnostic views.
- OIDC validation must check issuer, audience, subject, expiry, issued-at, and nonce before any authorization logic.
- Roles must be derived from verified identity. ABAC must then evaluate org scope, object state, ownership, classification, and environment.
- Every write command must have idempotency semantics.
- Every mutable record must require row-version or ETag preconditions for update, delete, or governed transition.
- Stale writes must fail explicitly with a conflict response. Never merge silently.
- Async integrations must define outbox, inbox, deduplication, replay, ordering assumptions, backoff, and poison-message handling.
- Domain events must use a stable CloudEvents-style envelope and AsyncAPI documentation.
- Every event must carry a provenance envelope covering actor, work unit or station, machine, tool, labor, shift, source system, adapter or agent, correlation ID, idempotency key, and offline sync state where applicable.
- Observability must be OpenTelemetry-native and specify traces, metrics, logs, correlation IDs, and mandatory attributes for org scope, actor, policy decision, DB operation, queue lag, and conflict outcome.
- Materialized views are allowed only as derived read models with explicit rebuild and freshness policy.
- Every bounded context must define contract versioning and deprecation policy for APIs, schemas, events, metadata, and workflow contracts, including breaking-change gates, consumer pinning, and minimum deprecation windows.
- The ERP backbone must explicitly model operating scopes, party master depth, commercial lifecycle, procurement lifecycle, planning, inventory, cost, and finance linkage.
- The production-version or release-selection gate is mandatory between engineering and execution, including selection logic by site, date, and effectivity.
- The MES execution chain must explicitly model `site or plant -> work center -> work unit -> released order -> work order -> operation -> job -> event -> projection`.
- Execution objects must carry frozen released snapshots for BOM, routing or work definition, instructions, resources, and qualifications. Do not join back to mutable current master data as runtime truth.
- Dispatch is not a sorted queue. It must cover capacity, readiness, material gating, tool gating, operator qualification, freeze, override reason, hold, replan, and sequencing rationale.
- Genealogy must support consume, split, merge, rework, and shipment trace using typed foreign keys or typed link tables.
- Downtime must include planned or unplanned status, alarm linkage, owner, acknowledgement, and OEE loss class.
- Edge or offline manufacturing must define adapter or gateway behavior, local outbox, store-and-forward, replay protection, heartbeat, staleness, and last-known-good behavior.
- Regulated records must carry an immutable governed envelope including identity, version, retention class, legal hold, source system, source record ID, and signature evidence where required.
- Released or signed governed records cannot be directly edited or deleted. Change must happen through supersession, revision, or a new governed case.
- Electronic signatures must bind action meaning, actor, timestamp, record identity, record version, and tamper-evident evidence.
- Documents, attachments, and evidence must define checksum, MIME type, size, retention class, legal hold, owner, human-readable retrieval, and immutable revision semantics.
- Regulated entities must support explicit governed commands such as submit, review, approve, sign, reject, reopen, supersede, archive, and void where applicable.
- Do not claim frontend-readiness unless metadata contracts are emitted.
- Do not ship dangerous approximations as `temporary`. Mark unsupported capability as unsupported.
- Canonical extensibility must use reserved extension points or additive fields only. Do not drift the canonical contract ad hoc.

## Required deliverables

The output must include:

1. Live Metrics Block
2. Research Ledger
3. Dependency Map
4. First Delivery Slice
5. Implementation Artifact Manifest
6. Command-Event-Invariant Catalog
7. Data Layer Design
8. Command and Workflow Design
9. API Contract Design
10. Event and Integration Design
11. Metadata Contract Design
12. Projection Design
13. Security and Governance Design
14. Policy Architecture
15. Benchmark Charter and Proof Matrix
16. Observability and Benchmark Hooks
17. Test Strategy and Rollout Gate
18. Negative Scope and Blocked Scope
19. Prompt 02 Final Package for Prompt 04
20. Cross-Bundle Sync Requests for Prompt 04
21. Six-Reviewer Review Synthesis

## Integrated execution playbook

The AI must execute implementation in this order:

1. Confirm architecture conformance and blocked dependencies.
2. Freeze the bounded context scope and dependency map.
3. Define contracts first: API, error, event, metadata, workflow, authorization, and versioning.
4. Define data model, aggregate invariants, commands, side effects, and projection strategy.
5. Define observability, test strategy, benchmark hooks, and rollout gate.
6. Only then propose code, migrations, or implementation steps.
7. Run the integrated QA checklist before claiming the implementation is complete.
8. If any critical item fails, return `BLOCKED` or `REVIEW REQUIRED` instead of pretending the implementation is ready.

## Integrated prompt QA checklist

Before final output, the AI must verify all of these:

- no code was proposed before contracts were explicit
- OpenAPI, JSON Schema, and `application/problem+json` are explicitly covered
- OIDC, RBAC, and ABAC ordering is explicit
- idempotency and optimistic concurrency behavior are explicit
- outbox, inbox, replay, ordering, and poison-message handling are explicit where async behavior exists
- live metrics block exists and all major counts align to it or stale counts are explicitly rejected
- one exact first delivery slice is defined
- artifact manifest is explicit enough to assign to build teams without guessing
- command-event-invariant catalog exists for selected aggregates
- policy architecture is explicit
- benchmark charter and proof matrix are explicit
- projection freshness class, owner, lag budget, rebuild, and stale-read behavior are explicit
- production-version or release-selection logic is explicit where execution depends on engineering definition
- released snapshots are used for execution truth
- MES execution provenance and offline behavior are explicit where applicable
- regulated immutability, signature binding, retention, and legal hold are explicit where applicable
- unsupported capability is marked unsupported instead of approximated
- rollout gate and tests are concrete enough to prove correctness
- the final package is specific enough that Prompt 04 can reconcile without guessing scope or intent
- provisional assumptions and cross-bundle dependencies are explicit
- the 6 reviewer roles were reconciled or any missing reviewer role is explicit
- the output is consistent with the active execution package

If any checklist item fails, the AI must downgrade the result to `BLOCKED` or `REVIEW REQUIRED`.

## Copy-paste prompt

```text
You are the world-class backend implementation lead for a greenfield canonical-first ERP + MES + eQMS platform.

You are not allowed to build a shallow CRUD app. You must build a serious backend platform that is ready for metadata-driven frontend generation, regulated records, planning boards, MES execution, and long-term enterprise evolution.

Assume this file runs as a dynamic sequential bundle inside one AI section and may run in parallel with Prompt 01 and Prompt 03 in other sections. On the first run, create the step plan and execute all planned steps sequentially in the same run until the final package is complete. Do not wait for `Continue` between steps unless hard system limits interrupt the run. Focus only on implementation-quality design in this bundle. Do not start audit synthesis in the same run.

If an execution package exists for the current loop, treat it as the primary implementation input and as the authoritative slice boundary. For the current loop, the primary input is:

- `execution-package-foundation-governance-contract-slice-2026-04-06.md`

Supporting execution-package inputs are:

- `execution-package-build-publish-gates-2026-04-06.md`
- `execution-package-implementation-backlog-2026-04-06.md`
- `execution-package-index-2026-04-06.md`

Do not broaden the slice beyond the execution package unless the package is internally inconsistent. If it conflicts with older bundle narratives, the execution package wins for this loop and the contradiction must be logged.

For every step, run 6 reviewer roles before closing the step:

1. implementation-architecture
2. erp-implementation
3. mes-implementation
4. eqms-implementation
5. platform-implementation
6. delivery-red-team

If real sub-agents are available, run them in parallel.
If you are running in GPT Codex or any single-thread GPT environment without real sub-agent tooling, emulate the same 6 reviewers sequentially and then reconcile them explicitly.
Never claim or imply that real agents were used unless the environment actually provided agent tooling and you explicitly used it.
Default assumption: real sub-agents are not available unless the environment visibly exposes and uses agent tooling in this run.

Before implementation, read the provided execution package, local documents, and canonical migrations carefully.

You must complete this workflow before proposing code:

1. Architecture conformance
2. Domain-depth review
3. Contract definition
4. Operational design
5. Proof strategy

Do not code until:

- dependencies are mapped
- the execution package has been imported and reconciled against live metrics
- architecture prerequisites are satisfied
- aggregate roots and invariants are explicit
- API, event, metadata, and error contracts are explicit
- authorization and org-scope rules are explicit
- concurrency and idempotency behavior is explicit
- projection ownership and freshness policy is explicit
- tests and benchmark hooks are defined
- assumptions, negative scope, and blocked dependencies are recorded

Non-negotiable rules:

- every public API is defined in OpenAPI 3.1 and JSON Schema 2020-12
- every non-2xx response uses application/problem+json
- cursor or keyset pagination is the default for enterprise lists
- OIDC validation checks issuer, audience, subject, expiry, issued-at, and nonce before authorization
- roles are derived from verified identity and ABAC then evaluates org scope, object state, ownership, classification, and environment
- every write command has idempotency semantics
- every mutable record requires row-version or ETag preconditions for update, delete, or governed transition
- stale writes fail explicitly with a conflict response
- async integration defines outbox, inbox, deduplication, replay, ordering assumptions, backoff, and poison-message handling
- domain events use a stable CloudEvents-style envelope and AsyncAPI documentation
- every event carries a provenance envelope covering actor, work unit or station, machine, tool, labor, shift, source system, adapter or agent, correlation ID, idempotency key, and offline sync state where applicable
- observability is OpenTelemetry-native with traces, metrics, logs, correlation IDs, and mandatory attributes
- materialized views are derived read models only, with explicit rebuild and freshness policy
- versioning and deprecation are explicit for APIs, schemas, events, metadata, and workflow contracts
- the ERP backbone explicitly models operating scopes, party master depth, commercial lifecycle, procurement lifecycle, planning, inventory, cost, and finance linkage
- the production-version or release-selection gate is mandatory between engineering and execution
- the MES execution chain explicitly models site or plant, work center, work unit, released order, work order, operation, job, event, and projection
- execution objects carry frozen released snapshots for BOM, routing or work definition, instructions, resources, and qualifications
- dispatch covers capacity, readiness, material gating, tool gating, operator qualification, freeze, override reason, hold, replan, and sequencing rationale
- genealogy supports consume, split, merge, rework, and shipment trace using typed foreign keys or typed link tables
- downtime includes planned or unplanned status, alarm linkage, owner, acknowledgement, and OEE loss class
- edge or offline manufacturing defines adapter or gateway behavior, local outbox, store-and-forward, replay protection, heartbeat, staleness, and last-known-good behavior
- regulated records carry an immutable governed envelope including identity, version, retention class, legal hold, source system, source record ID, and signature evidence where required
- released or signed governed records cannot be directly edited or deleted
- electronic signatures bind action meaning, actor, timestamp, record identity, record version, and tamper-evident evidence
- documents, attachments, and evidence define checksum, MIME type, size, retention class, legal hold, owner, human-readable retrieval, and immutable revision semantics
- regulated entities support explicit governed commands such as submit, review, approve, sign, reject, reopen, supersede, archive, and void where applicable
- frontend-readiness requires emitted metadata contracts, not just APIs
- unsupported capability must be marked unsupported, not silently approximated

For every bounded context or capability, provide:

1. Live Metrics Block
2. Research Ledger
3. Dependency Map
4. First Delivery Slice
5. Implementation Artifact Manifest
6. Command-Event-Invariant Catalog
7. Data Layer Design
8. Command and Workflow Design
9. API Contract Design
10. Event and Integration Design
11. Metadata Contract Design
12. Projection Design
13. Security and Governance Design
14. Policy Architecture
15. Benchmark Charter and Proof Matrix
16. Observability and Benchmark Hooks
17. Test Strategy and Rollout Gate
18. Negative Scope and Blocked Scope
19. Execution Playbook Trace
20. Prompt QA Checklist Result
21. Prompt 02 Final Package for Prompt 04
22. Cross-Bundle Sync Requests for Prompt 04
23. Six-Reviewer Review Synthesis

Output requirements:

- Output in English.
- Keep all backend technical content in English.
- Distinguish facts from inferences and assumptions.
- Record gaps explicitly instead of silently approximating them.
- Do not code around blocked prerequisites.
- Be explicit about contract shapes, failure semantics, and release gates.
- Include a short QA verdict stating `PASS`, `REVIEW REQUIRED`, or `FAIL`.
```
