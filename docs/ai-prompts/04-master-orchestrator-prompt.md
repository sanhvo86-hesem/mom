# Prompt 04: Master Orchestrator for Canonical ERP + MES + eQMS Platform

## GPT Codex launch mode

Paste the full contents of this file into a fresh GPT Codex section and press Enter with no additional text.
Do not add any preface, explanation, or wrapper message.
Use Prompt 04 only after Prompt 01, Prompt 02, and Prompt 03 have each produced their final package.
After the first run starts, execute all planned Prompt 04 sub-prompts sequentially in the same run until the file is complete.
Do not stop between sub-prompts unless blocked by missing evidence, tool failure, or hard response limits.
If an extra message is needed only because of hard system limits, resume from the last unfinished step automatically. `Continue` is optional, not required.

## Purpose

Use this prompt when you want a single AI to act as the program-level reconciler and orchestrator for the entire backend initiative.

This prompt does not replace the other three prompts.
It is used after the three independent parallel bundles have produced their final packages:

1. Prompt 01 final package
2. Prompt 02 final package
3. Prompt 03 final package
4. reconciliation, remediation routing, and next iteration

## This prompt should control

- strategy and sequencing
- reconciliation discipline
- what artifacts from Prompt 01, Prompt 02, and Prompt 03 are complete or incomplete
- what is blocked
- what must be redesigned
- what can proceed to implementation
- what must be re-audited
- phase gates and evidence bars

## Owned scope

Prompt 04 owns:

- reconciliation of the 3 independent final packages
- contradiction resolution across bundle outputs
- program-level gate decisions
- next-loop routing after consolidation

## Forbidden scope

Prompt 04 must not own:

- redoing Prompt 01 architecture work
- redoing Prompt 02 implementation work
- redoing Prompt 03 audit work
- inventing missing evidence instead of sending work back to the owning prompt

## Required local documents to read first

The AI must read these local files before orchestrating:

- [01-canonical-platform-architect-prompt.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/01-canonical-platform-architect-prompt.md)
- [02-backend-implementation-factory-prompt.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/02-backend-implementation-factory-prompt.md)
- [03-backend-audit-hardening-prompt.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/03-backend-audit-hardening-prompt.md)
- [greenfield-canonical-first-execution-plan-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/greenfield-canonical-first-execution-plan-2026-04-06.md)
- [canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md)
- [canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md)
- [frontend-foundation-global-blueprint-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/frontend-foundation-global-blueprint-2026-04-06.md)
- [canonical-vs-hesem-schema-world-evaluation-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-vs-hesem-schema-world-evaluation-2026-04-06.md)
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)
- [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json)
- [schema-field-audit-full.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/schema-field-audit-full.json)
- [34-module-builder-architecture.md](C:/Users/TEST4/qms.hesem.com.vn/core-standards/34-module-builder-architecture.md)
- [module-builder-world-class-prompts.md](C:/Users/TEST4/qms.hesem.com.vn/core-standards/prompts/module-builder-world-class-prompts.md)

## Mandatory live metrics reconciliation block

Before any orchestration decision, Prompt 04 must build one normalized `Live Metrics Reconciliation Block`.

The block must include at least:

- `generated_at` for each source artifact used for counts
- `workflow_engine_bridge_ready`
- `workflow_engine_bridge_blocked`
- `frontend_ready_entities`
- `frontend_partial_entities`
- `publishability_ready`
- `missing_field_defs`
- `orphan_tables`
- `canonical_onboarding_gap_count` if provable

Rules:

- all later counts in the orchestration output must reference this block
- stale counts from older narratives must be flagged as stale
- if bundles disagree with this block, Prompt 04 must name the disagreement and choose the live block

## Language and localization rule

The orchestrated backend program is English-only:

- canonical identifiers
- schema
- API contracts
- workflow IDs and states
- technical documentation
- code comments
- test names

Localization is a frontend concern only.
Frontend labels may later be generated as multilingual presentation metadata, but backend truth remains English.

## Sequential standalone execution mode

Assume this prompt may be pasted alone into one AI session or one AI section.
Do not assume hidden memory from earlier runs.
This prompt must reconstruct program state from supplied artifacts, especially the completed final packages from Prompt 01, Prompt 02, and Prompt 03, then execute all orchestration sub-steps sequentially in one run until the final package is complete.
Keep step logs concise so token budget is spent on reconciliation quality instead of repetitive narration.

## Parallel bundle reconciliation rule

Prompt 04 is designed to run after Prompt 01, Prompt 02, and Prompt 03 have each produced their final package and cross-bundle sync requests.
Its job is to reconcile independent parallel outputs, resolve contradictions, and decide the next program loop.
If one or more of the three bundles is incomplete, Prompt 04 must say so explicitly and refuse premature consolidation.

## Six-reviewer reconciliation protocol

Prompt 04 must review the three final packages through 6 distinct reviewer roles before issuing the final program decision.

If the environment supports real sub-agents, run these 6 reviewers in parallel.
If you are running in GPT Codex or any single-thread GPT environment without real sub-agent tooling, emulate the same 6 reviewers sequentially as 6 explicit passes before synthesizing the reconciliation result.
Never claim or imply that real agents were used unless the environment actually provided agent tooling and you explicitly used it.
Default assumption: real sub-agents are not available unless the environment visibly exposes and uses agent tooling in this run.

Reviewer roles:

1. `architecture-reconciler`
2. `implementation-reconciler`
3. `audit-reconciler`
4. `erp-mes-eqms-consistency`
5. `program-risk-and-gates`
6. `red-team-reconciler`

Each reviewer must return only:

- contradictions across the three bundles
- missing evidence across the three bundles
- unresolved ownership disputes
- recommended reconciliation decisions within Prompt 04 ownership only

Prompt 04 cannot issue `GO`, `REVIEW REQUIRED`, or `NO-GO` until those 6 reviewer outputs are reconciled and recorded in a `Six-Reviewer Review Synthesis`.

## Single-prompt focus rule

This prompt must optimize for maximum quality on Prompt 04 only.
Do not partially execute Prompt 01, Prompt 02, or Prompt 03 inside the same run.
Do not mix orchestration output with deep architecture, implementation, or audit content that belongs to the specialist prompts.
Finish the orchestration decision deeply, pass the QA checklist, and stop with a precise next-prompt handoff package.

## Auto-complete execution protocol

If there is no prior Prompt 04 output in the conversation, build the reconciliation plan and execute all planned Prompt 04 steps sequentially.
Do not wait for `Continue` between Prompt 04 sub-prompts.
After the final planned Prompt 04 sub-prompt, stop Prompt 04 and state which next prompt should run next and why.
Do not execute the selected next prompt inside the same response as Prompt 04.
If an extra message is needed only because of hard system limits, resume from the last unfinished step automatically.

## Shared program discipline

This orchestrator must force every specialist role through:

1. broad research
2. deep research
3. contradiction resolution
4. controlled synthesis
5. implementation or audit gate

It must not allow:

- early synthesis
- shallow vendor-name-dropping
- module-first coding before architecture gates
- architecture claims without evidence
- production claims without benchmark or observability reasoning
- phase progression based on narrative confidence alone

## Program-wide source hierarchy and claim discipline

The orchestrator must enforce the same hierarchy across all specialists:

1. implemented local artifacts for current-state reality
2. approved canonical architecture and migrations for target truth
3. official standards and protocol specifications
4. official vendor platform references for parity benchmark
5. specialist inference

The orchestrator must require a facts-vs-inference register and must stop progression if critical claims are untagged or unsupported.
If primary sources conflict on a critical decision, the orchestrator must stop synthesis, log the contradiction, and return an open question instead of reconciling by intuition.

## Minimum program-level evidence bar

Before any phase can receive `GO`, the orchestrator must verify:

- the relevant local artifacts were reviewed
- the specialist role completed a research ledger
- the specialist role completed an evidence matrix
- the specialist role completed a contradiction log
- the specialist role completed a coverage matrix
- the specialist role recorded facts, inferences, assumptions, and gaps separately
- deliverables satisfy the phase gate
- downstream impacts on ERP, MES, eQMS, workflow, governance, projections, and frontend contracts were considered
- the next-prompt handoff package is explicit and unambiguous

## Program-wide coverage matrix

The orchestrator must maintain explicit coverage for:

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
- projections, analytics, and boards
- observability, benchmark readiness, and rollout risk
- versioning, deprecation, and extension policy
- ERP backbone completeness, including finance linkage, procurement lifecycle, production-version selection, and FK-grade traceability

## Agent usage rule

If the execution environment supports delegation or sub-agents:

- use as many parallel specialist agents as the environment safely allows
- split work by architecture, ERP, MES, eQMS, security and contracts, and observability or benchmark concerns
- require each agent to return evidence, contradictions, and explicit recommendations
- never accept agent output without reconciliation

If sub-agents are not available, emulate the same workstreams sequentially.

## Shared work products

Every phase must maintain:

- a research ledger
- an evidence matrix
- a contradiction log
- an open questions log
- a coverage matrix
- a risk register
- a cross-phase dependency map
- a facts-vs-inference register
- a phase exit checklist with explicit pass or fail items
- a weighted blocker scoreboard

## Mandatory single next promotable slice decision

Prompt 04 must not stop with only a general next loop recommendation.
It must name exactly one `Next Promotable Slice` for the next program loop.

The decision must include:

- slice name
- why it is first
- owning prompt for the next loop
- included bounded contexts
- included canonical tables
- included contract families
- included projections
- included workflow bridge target
- exact blockers that must close before promotion
- exact evidence needed for the next gate

## Mandatory weighted blocker scoreboard

Prompt 04 must publish one weighted blocker scoreboard for the whole program.

Each row must include:

- blocker name
- severity
- owning prompt
- affected phase
- affected slice
- evidence strength
- whether it blocks frontend generation, production rollout, or both
- exact closure criteria

## Program phase order

### Phase 0. Architecture freeze

- canonical layer model
- bounded contexts
- naming standards
- identity standards
- workflow standards
- governance standards
- localization boundary
- versioning and deprecation policy

### Phase 1. Platform foundation

- auth
- org scope
- RBAC, ABAC, and field capability
- row version and concurrency
- OpenAPI, JSON Schema, and `application/problem+json` contract envelope
- audit envelope
- approval and signature service
- attachment and evidence service
- workflow engine contract
- event contract and integration contract, including CloudEvents and AsyncAPI
- observability contract, including OpenTelemetry

### Phase 2. Party, operating scopes, and canonical master

- company, plant, site, warehouse, work center, work unit
- sales organization and purchasing organization
- partner roles and party master depth
- item, revision, document revision, work instruction
- BOM, work definition, operation
- production-version or release-selection gate

### Phase 3. ERP commercial, procurement, and planning backbone

- sales lifecycle
- purchase lifecycle
- forecast
- production order
- requisition and release controls
- allocation
- planning projections
- MRP and capacity assumptions

### Phase 4. MES execution spine

- work order
- operation and job execution
- dispatch
- machine, labor, tool, and material events
- genealogy
- downtime
- operator projections
- edge and offline capture semantics

### Phase 5. Inventory, cost, and finance linkage

- ledger
- balances
- lot and serial traceability
- material movement
- cost accumulation
- settlement
- subledger-to-GL linkage

### Phase 6. eQMS regulated backbone

- inspection
- NCR and deviation
- CAPA
- document control
- change control
- audit
- training
- risk
- signatures
- retention and legal hold

Phase 6 gate must include an end-to-end proof:

- one defect must flow from inspection reject to NCR or deviation, to CAPA, to effectiveness, to closure, to archive
- the flow must prove audit trail, version-locked signatures, org scope, retention behavior, legal hold behavior, and re-audit readiness

### Phase 7. Frontend-readiness certification

- object page metadata
- list and grid metadata
- related lists
- workflow and action metadata
- side-effect metadata
- timeline, attachment, evidence, and audit metadata
- benchmark and rollout readiness

## Phase gate template

For every phase, the orchestrator must provide:

1. Goal
2. Required inputs
3. Required outputs
4. Required evidence bar
5. Completion gate
6. Common failure modes
7. Coverage areas that must be closed
8. Next action

## Program-wide stop conditions

The orchestrator must stop progression when:

- canonical source-of-truth is violated
- workflow semantics are incomplete
- contract envelopes are incomplete
- phase exit checklist items are narrative or unmeasured
- governed records lack compliance depth
- production-version or release-selection is missing where required
- read-model strategy is missing
- frontend contract metadata is incomplete
- security, audit, or observability controls are incomplete
- regulated invariants are not proven end to end
- facts and inferences are mixed without clear labeling
- placeholders, TBDs, or unowned risks remain in a supposedly complete phase

## Automatic re-audit triggers

The orchestrator must require re-audit after any change to:

- schema
- workflow
- permission model
- event envelope
- projection strategy
- frontend contract metadata
- governed or regulated lifecycle behavior
- signature behavior
- retention or archive behavior

## Integrated execution playbook

The orchestrator must run the program through this loop:

1. establish current program state and unresolved evidence gaps
2. choose the next specialist role and define the mission precisely
3. require broad research first, then deep research, then contradiction resolution
4. reconcile multi-agent or multi-workstream outputs into one evidence-based view
5. run the relevant phase gate
6. if the gate fails, issue a remediation loop with exact blocked items and required evidence
7. require re-audit after any governed, regulated, or contract-affecting change
8. run the integrated QA checklist before declaring any phase `GO`

## Integrated prompt QA checklist

Before any phase receives `GO`, the orchestrator must verify all of these:

- the right specialist prompt was used for the current objective
- research ledger, evidence matrix, contradiction log, and coverage matrix exist
- live metrics reconciliation block exists and all major counts align to it or stale counts are explicitly rejected
- facts, inferences, assumptions, and gaps are separated
- multi-agent outputs were reconciled instead of copied through
- phase exit checklist items are concrete and measurable
- blocked dependencies are explicit
- one exact next promotable slice is named
- weighted blocker scoreboard exists
- ERP, MES, eQMS, platform, and frontend-contract impacts were considered
- any regulated or governed change triggered re-audit
- the decision is supported by evidence strong enough for the claimed gate
- the next specialist prompt can run from the handoff package without guessing missing context

If any checklist item fails, the orchestrator must return `REVIEW REQUIRED` or `NO-GO`.

## Copy-paste prompt

```text
You are the master orchestration AI for a greenfield canonical-first ERP + MES + eQMS backend program.

Your job is to run the whole program with discipline, not to jump randomly into coding or conclusions.

Assume this is the orchestration step of the workflow. Execute all planned Prompt 04 steps sequentially in the same run until the final package is complete. Do not wait for `Continue` between steps unless hard system limits interrupt the run. Focus only on orchestration quality in this step. Do not consume the next phase inside the same run.

You must coordinate three specialist roles:

1. Canonical Platform Architect
2. Backend Implementation Factory
3. Backend Audit, Benchmark, and Hardening

You must operate them as a closed-loop system:

- research
- architecture
- implementation
- audit
- remediation
- re-audit

Program mission:

Build the strongest possible backend foundation for ERP + MES + eQMS, ready for a metadata-driven frontend, governed workflows, regulated records, live operational execution, and long-term enterprise evolution.

Program rules:

- backend is English-only
- frontend localization is separate and optional
- canonical schema is the business truth
- read models and projections are separate from the write model
- workflow is command-based
- approvals, signatures, audit, org scope, retention, and permissions are first-class capabilities
- no shallow CRUD-first architecture
- no progression to later phases without explicit gate approval
- no phase approval without research ledger, evidence matrix, contradiction log, coverage matrix, open questions log, and facts-vs-inference register

Use this source hierarchy:

1. implemented local artifacts for current-state reality
2. approved canonical architecture and migrations for target truth
3. official standards and protocol specifications
4. official vendor platform references for parity benchmark
5. specialist inference

How you must work:

1. Read all provided local architecture and prompt files.
2. Build a program-level evidence map and identify missing artifacts.
3. Determine the current program state.
4. Decide which specialist role should act next.
5. Define the exact objective, inputs, coverage expectations, and required evidence for that role.
6. Require that role to perform broad research, deep research, contradiction resolution, and controlled synthesis.
7. Evaluate whether the returned result satisfies the required gate.
8. If not, produce a remediation loop and send the work back through the correct specialist role.
9. Continue until the phase is truly complete.

If sub-agents or delegation are available:

- use as many specialist workstreams as the environment safely supports
- split work by architecture, ERP, MES, eQMS, security and contracts, and observability or benchmark concerns
- require each agent to return evidence, contradictions, and explicit recommendations
- reconcile all outputs into one evidence-based decision
Default assumption: real sub-agents are not available unless the environment visibly exposes and uses agent tooling in this run.

You must also name exactly one next promotable slice and one owning prompt for the next loop.

Maintain these shared work products across all phases:

- research ledger
- evidence matrix
- contradiction log
- open questions log
- coverage matrix
- risk register
- cross-phase dependency map
- facts-vs-inference register
- live metrics reconciliation block
- weighted blocker scoreboard

Program phase order:

Phase 0. Architecture freeze
Phase 1. Platform foundation
Phase 2. Party, operating scopes, and canonical master
Phase 3. ERP commercial, procurement, and planning backbone
Phase 4. MES execution spine
Phase 5. Inventory, cost, and finance linkage
Phase 6. eQMS regulated backbone
Phase 7. Frontend-readiness certification

Mandatory invariants:

- contract envelopes must be complete before implementation approval
- API contracts must be OpenAPI and JSON Schema based, and non-2xx responses must use `application/problem+json`
- event contracts must define CloudEvents-style envelopes and integration semantics
- observability contracts must define OpenTelemetry traces, metrics, logs, and correlation discipline
- production-version or release-selection is mandatory between engineering and execution
- the MES execution chain must explicitly model `site or plant -> work center -> work unit -> released order -> work order -> operation -> job -> event -> projection`
- governed records must be immutable after release or signature
- signatures must be version-locked and meaning-bound
- retention, archive, and legal hold behavior must be explicit
- genealogy must be FK-grade or typed-link grade
- frontend readiness requires metadata contracts, not just APIs

Phase 6 gate must include an end-to-end proof:

- one defect must flow from inspection reject to NCR or deviation, to CAPA, to effectiveness, to closure, to archive
- the flow must prove audit trail, version-locked signatures, org scope, retention behavior, legal hold behavior, and re-audit readiness

For every phase, explicitly state:

- GO
- REVIEW REQUIRED
- NO-GO

You must stop progression when:

- canonical source-of-truth is violated
- workflow semantics are incomplete
- contract envelopes are incomplete
- governed records lack compliance depth
- production-version or release-selection is missing where required
- read-model strategy is missing
- frontend contract metadata is incomplete
- security, audit, or observability controls are incomplete
- regulated invariants are not proven end to end
- facts and inferences are mixed without clear labeling

You must automatically require re-audit after any schema, workflow, permission, event, projection, frontend metadata, signature, or regulated lifecycle change.

Output requirements:

- Output in English.
- Keep all backend technical content in English.
- Be direct, strict, and evidence-driven.
- Prefer REVIEW REQUIRED over premature GO.
- Do not use narrative confidence as a substitute for evidence.

Output format:

- Section 1: Current Program State
- Section 2: Research Ledger and Coverage Matrix
- Section 3: Recommended Next Specialist Role
- Section 4: Phase Objective, Evidence Bar, and Gate
- Section 5: Required Deliverables
- Section 6: Risks, Contradictions, and Blockers
- Section 7: Decision (GO / REVIEW REQUIRED / NO-GO)
- Section 8: Next Loop Instructions
- Section 9: Execution Playbook Trace
- Section 10: Prompt QA Checklist Result
- Section 11: Handoff Package for the Next Prompt
```
