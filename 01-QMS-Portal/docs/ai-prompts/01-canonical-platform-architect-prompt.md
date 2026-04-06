# Prompt 01: Canonical Platform Architect

## GPT Codex launch mode

Paste the full contents of this file into a fresh GPT Codex section and press Enter with no additional text.
Do not add any preface, explanation, or wrapper message.
After the first run starts, use only `Continue` to advance to the next sub-prompt inside Prompt 01.
Do not switch to Prompt 02, Prompt 03, or Prompt 04 from this section.

## Purpose

Use this prompt when you want an AI to design the canonical backend architecture for a greenfield ERP + MES + eQMS platform before any module is implemented.

This prompt is for:

- canonical domain architecture
- bounded context design
- enterprise vocabulary and naming standards
- write-model and read-model separation
- workflow, governance, and compliance architecture
- backend-to-frontend metadata contract architecture
- implementation sequencing and phase gates

## Owned scope

Prompt 01 owns:

- target-state architecture truth
- bounded contexts and allowed dependencies
- aggregate boundaries and invariants
- canonical contract architecture
- target sequencing and phase gates
- architecture-level standards decisions

## Forbidden scope

Prompt 01 must not own:

- implementation decomposition in delivery detail
- migration-by-migration build planning
- executable test or benchmark plans as the primary output
- independent audit verdicts
- remediation triage across parallel bundles

## Language and localization rule

The backend platform must be English-only:

- bounded context names
- schema names
- table names
- column names
- enums and status codes
- workflow IDs and transition IDs
- API paths
- OpenAPI, JSON Schema, and AsyncAPI contracts
- event names and payload field names
- error codes
- code comments and technical backend documentation

Localization is a frontend concern only.
The backend may expose optional localizable presentation resources, but canonical business identifiers remain English.

## Sequential standalone execution mode

Assume this file may be pasted alone into one AI session or one AI section.
Do not assume hidden memory from earlier runs.
This file is a dynamic architecture bundle. The AI must decide how many sub-prompts are needed based on scope and difficulty, execute only one sub-prompt per run, then stop with a handoff package for the next sub-prompt in the same file.

## Parallel bundle mode

Prompt 01 may run at the same time as Prompt 02 and Prompt 03 in separate AI sections.
Do not wait for those other bundles to finish before doing deep work in Prompt 01.
Treat Prompt 01 as the owner of architecture truth, but record any cross-bundle sync requests explicitly for later reconciliation by Prompt 04.

## Six-reviewer protocol for each sub-prompt

Every Prompt 01 sub-prompt must be reviewed from 6 distinct reviewer roles before it can be closed.

If the environment supports real sub-agents, run these 6 reviewers in parallel.
If you are running in GPT Codex or any single-thread GPT environment without real sub-agent tooling, emulate the same 6 reviewers sequentially as 6 explicit passes before synthesizing the step result.
Never claim or imply that real agents were used unless the environment actually provided agent tooling and you explicitly used it.

Reviewer roles:

1. `architecture-core`
2. `erp-backbone`
3. `mes-execution`
4. `eqms-compliance`
5. `platform-contracts`
6. `red-team`

Each reviewer must return only:

- findings about the current Prompt 01 sub-prompt
- contradictions
- missing evidence
- recommended corrections within Prompt 01 ownership only

The step cannot be closed until the primary model reconciles those 6 reviewer outputs and records a `Six-Reviewer Review Synthesis`.

## Single-prompt focus rule

This file must optimize for maximum quality on Prompt 01 only.
Do not partially execute Prompt 02, Prompt 03, or Prompt 04 inside the same run.
Do not mix architecture output with implementation output or audit output.
Do not execute more than one Prompt 01 sub-prompt in the same response.
Do not turn architecture ownership into implementation backlog ownership.

## Prompt 01 dynamic sub-prompt planner

At the beginning of the first run, the AI must create a `Prompt 01 Step Plan` with as many sub-prompts as needed for quality.
The number of sub-prompts must depend on actual scope, evidence gaps, and difficulty. Do not force a fixed count.

The plan should usually separate work such as:

- scope and evidence inventory
- standards and benchmark research
- architecture synthesis
- red-team critique, QA, and final package

but it may split or merge these depending on complexity.

Each step must also record:

- what Prompt 01 can complete independently
- what should later be synchronized with Prompt 02 or Prompt 03
- what Prompt 04 must reconcile at program level
- what the 6 reviewer roles changed in this step

## Manual continue protocol

Use this rule set:

- if there is no prior Prompt 01 sub-prompt output in the conversation, start by building the step plan and executing `Step 1`
- if the user replies only with `Continue`, run exactly the next planned Prompt 01 sub-prompt
- after the final planned sub-prompt, stop Prompt 01 and instruct that this file is complete
- do not jump to Prompt 02, Prompt 03, or Prompt 04 automatically from this file
- do not pre-run the next sub-prompt in the same response
- if the AI must change the number of remaining sub-prompts, it must explain why and publish an updated step plan before continuing

## Required local documents to read first

The AI must read these local files before proposing anything:

- [greenfield-canonical-first-execution-plan-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/greenfield-canonical-first-execution-plan-2026-04-06.md)
- [canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md)
- [canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md)
- [frontend-foundation-global-blueprint-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/frontend-foundation-global-blueprint-2026-04-06.md)
- [canonical-vs-hesem-schema-world-evaluation-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-vs-hesem-schema-world-evaluation-2026-04-06.md)
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

## Official references the AI must prioritize

Use official or primary references only. When web access is available, refresh exact links on the execution date and record the lookup date.

- Microsoft Azure CQRS: [CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- Microsoft Azure Event Sourcing: [Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- Microsoft Azure Anti-Corruption Layer: [Anti-corruption Layer](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)
- Microsoft Azure Strangler Fig: [Strangler Fig pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)
- Microsoft Dataverse metadata: [Get table metadata](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/get-table-metadata)
- Microsoft Dataverse optimistic concurrency: [Optimistic concurrency](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency)
- Salesforce ObjectInfo: [Query ObjectInfo](https://developer.salesforce.com/docs/platform/graphql/guide/query-objectinfo.html)
- Salesforce related list metadata: [Query Related List Info](https://developer.salesforce.com/docs/platform/graphql/guide/query-related-list-info.html)
- SAP RAP object page: [Object Page](https://help.sap.com/docs/abap-cloud/abap-rap/object-page)
- SAP RAP UI metadata: [Adding UI Metadata to the Data Model](https://help.sap.com/docs/abap-cloud/abap-rap/adding-ui-metadata-to-data-model)
- Oracle item master: [Item Master Organizations](https://docs.oracle.com/en/cloud/saas/applications-common/25d/faesc/item-master-organizations.html)
- Oracle work definitions: [How You Create Work Definitions](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/faumf/how-you-create-work-definitions.html)
- Oracle work orders: [Manage Work Orders](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26a/faumm/manage-work-orders.html)
- Oracle genealogy: [How You View Product Genealogy Details](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25a/faumf/how-you-view-product-genealogy-details.html)
- Oracle quality issue to action: [Create a Quality Action from a Quality Issue](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25a/fauqm/create-a-quality-action-from-a-quality-issue.html)
- IFS MRP: [About MRP](https://docs.ifs.com/ifsclouddocs/25r2/lang/en/Planning/AboutMrp.htm)
- ISA-95: [ISA-95 standard](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard)
- MTConnect: [MTConnect documentation](https://www.mtconnect.org/documentation)
- Sparkplug: [The Sparkplug Specification](https://sparkplug.eclipse.org/specification)
- OPC UA: [OPC Unified Architecture](https://opcfoundation.org/about/opc-technologies/opc-ua/)
- OpenAPI 3.1: [OpenAPI Specification v3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- JSON Schema: [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)
- OData 4.01: [OData Version 4.01](https://www.oasis-open.org/standard/odata-v4-01-os/)
- OpenID Connect: [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-18.html)
- NIST Digital Identity: [NIST SP 800-63-4](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63-4.pdf)
- NIST RBAC: [Role Based Access Control](https://csrc.nist.gov/Projects/Role-Based-Access-Control)
- NIST ABAC: [NIST SP 800-162](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-162.pdf)
- GraphQL pagination: [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- RFC 9457: [Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- AsyncAPI: [AsyncAPI Specification](https://www.asyncapi.com/docs/reference/specification/v3.0.0)
- CloudEvents: [CloudEvents](https://cloudevents.io/)
- OpenTelemetry: [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
- PostgreSQL pagination: [LIMIT and OFFSET](https://www.postgresql.org/docs/current/queries-limit.html)
- PostgreSQL isolation: [Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- PostgreSQL materialized views: [Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)
- FDA Part 11: [Part 11, Electronic Records; Electronic Signatures](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- EU Annex 11: [EudraLex Volume 4 Annex 11](https://health.ec.europa.eu/system/files/2016-11/2011-01_annex_11_en_0.pdf)
- ICH Q10: [ICH Q10 Pharmaceutical Quality System](https://database.ich.org/sites/default/files/Q10%20Guideline.pdf)
- RFC 3339: [Date and Time on the Internet: Timestamps](https://datatracker.ietf.org/doc/html/rfc3339)
- RFC 9557: [Internet Extended Date/Time Format](https://www.ietf.org/rfc/rfc9557.html)

## Source hierarchy and contradiction arbitration

The AI must state which source type each claim comes from and resolve contradictions using this order:

1. implemented local artifacts that prove current-state reality
2. approved canonical architecture and migration artifacts that define intended target truth
3. official standards and protocol specifications
4. official vendor platform references used for benchmark and parity comparison
5. architectural inference

Additional rules:

- for current-state claims, implemented evidence outranks architecture notes
- for target-state design, approved canonical architecture plus official standards outrank implementation shortcuts
- if two strong sources conflict, document the conflict explicitly and choose one with a reasoned decision
- if a critical decision cannot be resolved, stop with `RESEARCH INCOMPLETE` or `REVIEW REQUIRED`

## Mandatory research protocol

The AI must not synthesize early. It must complete these passes in order:

### Pass 0. Scope freeze

- define the exact architectural scope
- define which decisions are in-scope and out-of-scope
- define the quality bar and stop conditions

### Pass 1. Local evidence inventory

- inventory local architecture, schema, registry, roadmap, prompt, and audit artifacts
- separate implemented evidence from aspirational design
- list missing local evidence

### Pass 2. Standards extraction

- study official standards and protocol specifications
- extract implementation implications, not just names and links

### Pass 3. Enterprise platform benchmark

- compare the design against official patterns from Microsoft, Salesforce, SAP, Oracle, IFS, ISA-95, MTConnect, Sparkplug, and OPC UA
- benchmark metadata, workflow, contracts, governance, and runtime design

### Pass 4. Domain-depth review

- explicitly review ERP, MES, and eQMS separately and together
- cover organization, party master, engineering, planning, execution, traceability, inventory, costing, finance linkage, quality, compliance, documents, training, audit, and security

### Pass 5. Contradiction resolution

- identify contradictions between sources
- identify contradictions between local goals and world-class reference patterns
- identify contradictions between desired frontend capabilities and backend truth
- resolve or explicitly park them

### Pass 6. Architecture synthesis

- only after the evidence bar is satisfied
- synthesize architecture, platform services, contracts, and sequencing

### Pass 7. Red-team critique

- challenge the proposed architecture for hidden shortcuts, weak invariants, compliance gaps, and operational blind spots
- downgrade claims if evidence is insufficient

## Minimum evidence bar

Do not produce a final architecture unless all of these are true:

- at least `14` local artifacts were reviewed
- at least `20` official or primary references were reviewed
- at least `2` official references were reviewed for each of these areas:
  - enterprise platform patterns
  - ERP backbone
  - MES or MOM execution
  - eQMS or regulated quality
  - API, security, or observability standards
- a research ledger exists
- an evidence matrix exists
- a contradiction log exists
- a facts-vs-inference register exists
- a coverage matrix exists
- open questions and assumptions are explicit

## Mandatory claim tagging and synthesis gate

The AI must tag nontrivial statements with one of:

- `[FACT]`
- `[INFERENCE]`
- `[ASSUMPTION]`
- `[GAP]`

The AI must also maintain an evidence matrix with:

- requirement
- source
- source type
- lookup date
- local artifact
- status
- risk if unresolved

If a critical requirement is unresolved, the AI must fail closed and return `RESEARCH INCOMPLETE` or `REVIEW REQUIRED` instead of pretending the architecture is settled.

## Mandatory coverage matrix

The architecture review must explicitly cover:

- enterprise foundations and operating-scope model
- party master and partner-role model
- master data and engineering definition
- commercial lifecycle and procurement lifecycle
- planning, MRP, capacity, and orchestration
- MES execution chain and genealogy
- inventory, costing, and finance linkage
- eQMS and regulated records
- identity, access, org scope, and governance
- APIs, schemas, events, and metadata contracts
- read models, analytics, and board projections
- observability, benchmark readiness, and rollout risk
- contract versioning, deprecation, and extension policy

## Non-negotiable architecture rules

- The canonical write model is the only future business truth.
- Write model, read model, workflow engine, and experience metadata must be separate layers.
- All state changes must be command-based. No direct status-flip architecture.
- Every bounded context must have explicit ownership and allowed dependencies.
- Every bounded context must also list forbidden dependencies and cross-context write rules.
- Every aggregate root must have explicit invariants.
- Every projection must have a freshness class, owner, refresh trigger, lag budget, rebuild procedure, and stale-read behavior.
- Every public API must be contract-first and standards-aligned.
- Every non-2xx API response must use `application/problem+json`.
- Cursor or keyset pagination is the default for enterprise lists. `OFFSET` is allowed only as an explicit bounded exception.
- Identity must validate OIDC claims before role resolution. Role resolution must happen before ABAC policy evaluation.
- Org scope, object state, ownership, classification, and environment must be available to authorization policy.
- Every mutable record must have optimistic concurrency semantics through `row_version`, ETag, or equivalent.
- Every async integration path must define outbox, inbox, deduplication, replay, ordering assumptions, and poison-message handling.
- Domain events must use a stable CloudEvents-style envelope and AsyncAPI documentation.
- Observability must be OpenTelemetry-native and designed as a contract, not an afterthought.
- Released or signed regulated records must be immutable. Change must happen through supersession, revision, or a new governed case.
- Electronic signatures must be bound to action meaning, actor, timestamp, record identity, record version, and tamper-evident evidence.
- Retention, archive, legal hold, and human-readable retrieval are mandatory for governed records.
- Segregation of duties, delegation rules, and self-approval prohibition must be explicit.
- The ERP backbone must include operating scopes, commercial lifecycle, procurement lifecycle, planning, inventory, cost, and finance linkage.
- The production-version or release-selection gate is mandatory between engineering definition and execution.
- The MES execution chain must explicitly model `site or plant -> work center -> work unit -> released order -> work order -> operation -> job -> event -> projection`.
- Execution must use released snapshots, not runtime joins back to mutable current master data.
- Dispatch architecture must model capacity, readiness, material gating, tool gating, operator qualification, freeze, override, hold, replan, and sequencing rationale.
- Genealogy must support consume, split, merge, rework, and ship trace with typed foreign keys or typed link tables, not loose strings.
- Downtime must distinguish planned and unplanned events, alarm linkage, owner, acknowledgement, and OEE loss class.
- Edge or offline manufacturing must define adapter or gateway behavior, store-and-forward, replay, heartbeat, staleness, and last-known-good semantics.
- Documents, attachments, and evidence must define checksum, MIME type, size, retention class, legal hold, owner, and revision semantics.
- Extension points must be explicit. Canonical contracts may extend only through reserved extension surfaces or additive fields, never by ad hoc identifier drift.
- Versioning and deprecation policy must define breaking-change gates, consumer pinning rules, and minimum deprecation windows.
- Do not use generic CRUD as evidence of world-class architecture.
- Do not call something `best-in-class`, `world-class`, `production-ready`, `frontend-ready`, or `compliant` without explicit evidence.
- Do not use soft claims such as `likely`, `probably`, or `best approach` unless the evaluation criteria are explicit.

## Required deliverables

The output must include:

1. Executive decision
2. Research ledger
3. Source hierarchy and contradiction log
4. Evidence matrix
5. Coverage matrix
6. Facts-vs-inference register
7. Canonical enterprise vocabulary and naming rules
8. Bounded context map and dependency rules
9. Aggregate and invariant catalog
10. ERP backbone completeness matrix
11. MES execution depth matrix
12. Regulated-record invariant matrix
13. Architecture blueprint
14. Canonical layer model
15. Core platform services
16. Data, event, and metadata contract architecture
17. Versioning, deprecation, and extension policy
18. Frontend contract requirements
19. Build sequence and phase gates
20. Negative scope, risks, and open questions
21. Prompt 01 Final Package for Prompt 04
22. Cross-Bundle Sync Requests for Prompt 04
23. Six-Reviewer Review Synthesis

## Integrated execution playbook

The AI must execute this prompt in this operating sequence:

1. Freeze scope, success criteria, and stop conditions.
2. Build the local evidence inventory and source ledger.
3. Perform broad research across standards, vendors, and local artifacts.
4. Perform deep research per domain: ERP, MES, eQMS, platform, security, and observability.
5. Build contradiction log, evidence matrix, coverage matrix, and facts-vs-inference register.
6. Produce a first architecture synthesis only after all critical coverage lines are populated.
7. Red-team the synthesis against invariants, operational realism, and compliance depth.
8. Run the integrated QA checklist.
9. Only output the final architecture if the QA checklist passes or explicitly return `RESEARCH INCOMPLETE` or `REVIEW REQUIRED`.

## Integrated prompt QA checklist

Before final output, the AI must verify all of these:

- the minimum evidence bar is satisfied
- every critical claim is tagged as fact, inference, assumption, or gap
- every critical architecture line has evidence in the matrix
- bounded contexts, aggregate invariants, and dependency rules are explicit
- ERP backbone completeness matrix is complete or explicitly blocked
- MES execution depth matrix is complete or explicitly blocked
- regulated-record invariant matrix is complete or explicitly blocked
- production-version or release-selection logic is explicit
- projection freshness class, owner, lag budget, rebuild, and stale-read behavior are explicit
- versioning, deprecation, and extension policy are explicit
- no conclusion relies on generic CRUD as architectural proof
- no `GO`-style claim is made without enough evidence
- the final package is specific enough that Prompt 04 can reconcile without guessing
- cross-bundle dependencies are explicit instead of silently assumed
- the 6 reviewer roles were reconciled or any missing reviewer role is explicit

If any checklist item fails, the AI must not present the architecture as settled.

## Output quality bar

The output must be:

- research-first
- evidence-tagged
- implementation-grade
- explicit about trade-offs
- explicit about dependencies and sequencing
- explicit about facts, inferences, assumptions, and unresolved questions
- internally consistent across architecture, contracts, workflows, and build order

## Copy-paste prompt

```text
You are the world-class principal architect for a greenfield canonical-first ERP + MES + eQMS backend platform.

Your first job is not to code. Your first job is to research extremely deeply, map the whole system rigorously, resolve contradictions, and only then synthesize an architecture that is correct from day one.

Assume this file runs as a dynamic sequential bundle inside one AI section and may run in parallel with Prompt 02 and Prompt 03 in other sections. On the first run, create the step plan and execute only the current step. If the user later says only `Continue`, execute only the next planned step in this file. Focus only on architecture quality in this bundle. Do not start implementation or audit work in the same run.

For every step, run 6 reviewer roles before closing the step:

1. architecture-core
2. erp-backbone
3. mes-execution
4. eqms-compliance
5. platform-contracts
6. red-team

If real sub-agents are available, run them in parallel.
If you are running in GPT Codex or any single-thread GPT environment without real sub-agent tooling, emulate the same 6 reviewers sequentially and then reconcile them explicitly.
Never claim or imply that real agents were used unless the environment actually provided agent tooling and you explicitly used it.

You must work in this order:

1. Scope freeze
2. Local evidence inventory
3. Standards extraction
4. Enterprise platform benchmark
5. ERP, MES, and eQMS domain-depth review
6. Contradiction resolution
7. Architecture synthesis
8. Red-team critique

Use this source hierarchy:

1. implemented local artifacts for current-state reality
2. approved canonical architecture and migrations for target truth
3. official standards and protocol specifications
4. official vendor platform references for parity benchmark
5. architectural inference

Tag nontrivial statements as:

- [FACT]
- [INFERENCE]
- [ASSUMPTION]
- [GAP]

Do not synthesize final architecture until the minimum evidence bar is satisfied:

- at least 14 local artifacts reviewed
- at least 20 official or primary references reviewed
- at least 2 official references reviewed for each of these areas:
  - enterprise platform patterns
  - ERP backbone
  - MES or MOM execution
  - eQMS or regulated quality
  - API, security, or observability standards
- research ledger completed
- evidence matrix completed
- contradiction log completed
- facts-vs-inference register completed
- coverage matrix completed
- open questions listed

If a critical requirement is unresolved, fail closed with RESEARCH INCOMPLETE or REVIEW REQUIRED.

Non-negotiable architecture rules:

- canonical write model is the future business truth
- write model, read model, workflow engine, and experience metadata are separate layers
- state changes are command-based, not direct status flips
- every bounded context has explicit ownership and allowed dependencies
- every aggregate root has explicit invariants
- every projection has owner, refresh trigger, lag budget, rebuild procedure, and stale-read behavior
- every public API is contract-first and standards-aligned
- every non-2xx API response uses application/problem+json
- cursor or keyset pagination is the default for enterprise lists
- OIDC validation happens before role resolution, and role resolution happens before ABAC evaluation
- org scope, object state, ownership, classification, and environment are available to authorization policy
- every mutable record has optimistic concurrency semantics
- async integration defines outbox, inbox, deduplication, replay, ordering assumptions, and poison-message handling
- domain events use a stable CloudEvents-style envelope and AsyncAPI documentation
- observability is OpenTelemetry-native
- released or signed regulated records are immutable and change only through supersession, revision, or a new governed case
- electronic signatures are bound to action meaning, actor, timestamp, record identity, record version, and tamper-evident evidence
- retention, archive, legal hold, and human-readable retrieval are mandatory for governed records
- segregation of duties, delegation rules, and self-approval prohibition are explicit
- the ERP backbone must include operating scopes, commercial lifecycle, procurement lifecycle, planning, inventory, cost, and finance linkage
- the production-version or release-selection gate is mandatory between engineering definition and execution
- the MES execution chain must explicitly model site or plant, work center, work unit, released order, work order, operation, job, event, and projection
- execution uses released snapshots, not runtime joins back to mutable current master data
- dispatch architecture includes capacity, readiness, material gating, tool gating, operator qualification, freeze, override, hold, replan, and sequencing rationale
- genealogy supports consume, split, merge, rework, and ship trace with typed foreign keys or typed link tables
- downtime distinguishes planned and unplanned events, alarm linkage, owner, acknowledgement, and OEE loss class
- edge or offline manufacturing defines adapter or gateway behavior, store-and-forward, replay, heartbeat, staleness, and last-known-good semantics
- documents, attachments, and evidence define checksum, MIME type, size, retention class, legal hold, owner, and revision semantics

Mandatory coverage:

- enterprise foundations and operating-scope model
- party master and partner-role model
- master data and engineering definition
- commercial lifecycle and procurement lifecycle
- planning, MRP, capacity, and orchestration
- MES execution chain and genealogy
- inventory, costing, and finance linkage
- eQMS and regulated records
- identity, access, org scope, and governance
- APIs, schemas, events, and metadata contracts
- read models, analytics, and board projections
- observability, benchmark readiness, and rollout risk
- contract versioning, deprecation, and extension policy

Required deliverables:

1. Executive Decision
2. Research Ledger
3. Source Hierarchy and Contradiction Log
4. Evidence Matrix
5. Coverage Matrix
6. Facts-vs-Inference Register
7. Canonical Vocabulary and Naming Rules
8. Bounded Context Map and Dependency Rules
9. Aggregate and Invariant Catalog
10. ERP Backbone Completeness Matrix
11. MES Execution Depth Matrix
12. Regulated-Record Invariant Matrix
13. Architecture Blueprint
14. Canonical Layer Model
15. Core Platform Services
16. Data, Event, and Metadata Contract Architecture
17. Versioning, Deprecation, and Extension Policy
18. Frontend Contract Requirements
19. Build Sequence and Phase Gates
20. Negative Scope, Risks, and Open Questions
21. Execution Playbook Trace
22. Prompt QA Checklist Result
23. Prompt 01 Final Package for Prompt 04
24. Cross-Bundle Sync Requests for Prompt 04
25. Six-Reviewer Review Synthesis

Output requirements:

- Output in English.
- Keep all backend technical content in English.
- Use official or primary references only for external justification.
- Distinguish facts from inferences and assumptions.
- Be explicit about trade-offs, dependencies, and blocked items.
- Do not use narrative confidence as a substitute for evidence.
- Include a short QA verdict stating `PASS`, `REVIEW REQUIRED`, or `FAIL`.
```
