# Prompt 04 Master Orchestrator Final Package

Generated at: `2026-04-06T20:54:25.6147417+07:00`
Prompt: `04-master-orchestrator-prompt.md`
Scope: Program-level reconciliation for canonical ERP + MES + eQMS backend

## Section 1: Current Program State

- Prompt 04 reconciliation is based on these completed bundle artifacts:
  - `prompt-01-canonical-platform-architecture-package-2026-04-06.md`
  - `prompt-02-backend-implementation-final-package-2026-04-06.md`
  - `prompt-03-backend-audit-final-package-2026-04-06.md`
- Bundle status:
  - Prompt 01: `REVIEW REQUIRED`
  - Prompt 02: `BLOCKED` / `REVIEW REQUIRED`
  - Prompt 03: frontend `REVIEW REQUIRED`, production `NO-GO`
- Program posture: `split-path`
  - canonical remains future business write truth
  - HESEM runtime remains current compatibility and read-side truth
- Phase posture:
  - Phase 0 Architecture freeze: `REVIEW REQUIRED`
  - Phase 1 Platform foundation: `NO-GO`
  - Phase 2 Party, operating scopes, and canonical master: `NO-GO`
  - Phase 3 ERP commercial, procurement, and planning backbone: `NO-GO`
  - Phase 4 MES execution spine: `NO-GO`
  - Phase 5 Inventory, cost, and finance linkage: `NO-GO`
  - Phase 6 eQMS regulated backbone: `NO-GO`
  - Phase 7 Frontend-readiness certification: `NO-GO`

### Live Metrics Reconciliation Block

All later counts in this package reference this normalized block.

```yaml
normalized_at: 2026-04-06T20:54:25.6147417+07:00
sources:
  registry_quality_report:
    file: C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json
    generated_at: 2026-04-06T02:22:55.218Z
    file_last_write: 2026-04-06T09:22:57.7689209+07:00
  frontend_foundation_catalog:
    file: C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json
    generated_at: 2026-04-06T02:22:55.218Z
    file_last_write: 2026-04-06T09:22:57.7608684+07:00
  schema_field_audit_full:
    file: C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/schema-field-audit-full.json
    generated_at: file-embedded timestamp unavailable
    file_last_write: 2026-04-06T09:25:17.6616283+07:00
  canonical_vs_hesem_evaluation:
    file: C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/canonical-vs-hesem-schema-world-evaluation-2026-04-06.md
    generated_at: narrative-only source
    file_last_write: 2026-04-06T12:21:30.0779630+07:00
metrics:
  workflow_engine_bridge_ready: 0
  workflow_engine_bridge_blocked: 115
  frontend_ready_entities: 330
  frontend_partial_entities: 198
  publishability_ready: false
  missing_field_defs: 316
  orphan_tables: 45
  canonical_onboarding_gap_count: 101
```

### Stale Metrics Rejected

- Rejected as stale narrative: `40 ready / 488 partial` in `frontend-foundation-global-blueprint-2026-04-06.md`
- Chosen as live truth: `330 ready / 198 partial` from the live metrics reconciliation block

## Section 2: Research Ledger and Coverage Matrix

### Research Ledger

- Reviewed required local orchestration inputs:
  - all three source prompts
  - all three completed bundle artifacts
  - `greenfield-canonical-first-execution-plan-2026-04-06.md`
  - `canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md`
  - `canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md`
  - `frontend-foundation-global-blueprint-2026-04-06.md`
  - `canonical-vs-hesem-schema-world-evaluation-2026-04-06.md`
  - `frontend-foundation-catalog.json`
  - `registry-quality-report.json`
  - `schema-field-audit-full.json`
  - `34-module-builder-architecture.md`
  - `module-builder-world-class-prompts.md`
- Source hierarchy enforced:
  1. implemented local artifacts
  2. approved canonical architecture and migrations
  3. official standards and protocol specifications
  4. official vendor references
  5. inference only where explicitly marked

### Evidence Matrix

| Requirement | Strongest evidence | Status |
|---|---|---|
| Canonical write truth remains target SSOT | Prompt 01 final package | Covered |
| Compatibility boundary remains active | Prompt 01 and Prompt 02 final packages | Covered |
| Workflow bridge readiness for promotion | Live metrics block | Failed |
| Frontend publishability | Live metrics block | Failed |
| Field definition and orphan closure | Live metrics block | Failed |
| One exact next slice exists | Prompt 02 exact first-slice definition plus Prompt 03 shrink requirement | Covered by Prompt 04 reconciliation |
| Public contract authority | Prompt 03 audit findings | Failed |
| Async, projection, and observability publication | Prompt 02 hard gate matrix plus Prompt 03 audit | Failed |

### Contradiction Log

- Prompt 01 proposes a broader first slice: `Released Definition And Production Release Spine`.
- Prompt 02 proposes a narrower first slice centered on foundation and governance publication.
- Prompt 03 rejects prior state as having no authoritative single first slice and orders `PAUSE AND SHRINK`.
- Reconciliation decision: choose the narrower Prompt 02 slice because it aligns to phase order, current blockers, and Prompt 03 audit posture.

### Open Questions Log

- Final deprecation window policy remains open.
- Final finance posting-bridge depth remains open beyond the current slice.
- Final regulated retention, archive, legal hold, and supersession policy remains open.

### Coverage Matrix

| Coverage Area | Status | Reason |
|---|---|---|
| enterprise foundations and operating-scope model | Partial | tables exist, publication and contract proof do not |
| party master and partner-role model | Partial | canonical tables exist, slice onboarding is not closed |
| master data and engineering definition | Review Required | architecture stronger than current implementation gate |
| commercial lifecycle and procurement lifecycle | No-Go | deferred beyond current promotable slice |
| planning, MRP, capacity, and orchestration | No-Go | release-snapshot and planning proof incomplete |
| MES execution chain and genealogy | No-Go | explicit Wave 2 only; runtime proof absent |
| inventory, costing, and finance linkage | No-Go | deferred; finance bridge unresolved |
| eQMS and regulated records | No-Go | governed envelope depth incomplete |
| identity, access, org scope, and governance | Review Required | policy order is frozen, runtime proof incomplete |
| APIs, schemas, events, and metadata contracts | No-Go | public contract truth split |
| projections, analytics, and boards | No-Go | lag, rebuild, and promotion proof absent |
| observability, benchmark readiness, and rollout risk | No-Go | OTel and benchmark gaps remain |
| versioning, deprecation, and extension policy | Review Required | partial only |
| ERP backbone completeness including finance linkage and traceability | No-Go | not in current promotable slice |

### Risk Register

- Critical risk: split public contract truth
- Critical risk: governed routed-path regression versus required controls
- High risk: workflow bridge remains `0` ready
- High risk: slice onboarding gaps remain machine-detectable
- High risk: benchmark overlap is zero on audited path

### Cross-Phase Dependency Map

- Phase 1 must pass before any Phase 2 or later slice can be promoted.
- Phase 2 and Phase 3 depend on Phase 1 contract authority, workflow bridge, metadata publication, and observability closure.
- Phase 4 depends on later-phase anchors `dispatch_queue`, `job_event`, genealogy typing, and ordering proofs.
- Phase 5 depends on finance posting-bridge ratification and later ledger proof.
- Phase 6 depends on governed-envelope closure and re-audit triggers.
- Phase 7 depends on live publishability, workflow bridge, and supported public contract authority.

### Facts-vs-Inference Register

- Facts:
  - `workflow_engine_bridge_ready = 0`
  - `publishability_ready = false`
  - `missing_field_defs = 316`
  - `orphan_tables = 45`
  - `canonical_onboarding_gap_count = 101`
  - Prompt 02 defines an exact first slice
  - Prompt 03 requires pause-and-shrink
- Inference:
  - the broader Prompt 01 slice should become a later slice, not the next promotable slice
  - the next loop should be implementation-led through Prompt 02

## Section 3: Recommended Next Specialist Role

- `Prompt 02 Backend Implementation Factory`

Reason:

- the blocking evidence is implementation-owned
- Prompt 04 now has enough architecture truth to route work without reopening Prompt 01
- Prompt 03 already supplied the audit no-go boundary and re-audit triggers

## Section 4: Phase Objective, Evidence Bar, and Gate

### Current Phase Gate Template

1. Goal
   - close the next promotable Phase 1 slice to standards-backed, publishable, bridge-ready quality
2. Required inputs
   - Prompt 01 target truths
   - Prompt 02 first-slice frozen positions
   - Prompt 03 audit blockers
   - live metrics reconciliation block
3. Required outputs
   - authoritative `/api/v1` slice contract pack
   - slice onboarding closure
   - workflow bridge target package
   - metadata and projection packages
   - observability and benchmark evidence hooks
4. Required evidence bar
   - OpenAPI 3.1
   - JSON Schema Draft 2020-12
   - RFC 9457
   - `OIDC -> RBAC -> ABAC`
   - `If-Match` and `ETag`
   - explicit blocked capability publication
   - AsyncAPI or CloudEvents where async exists
   - slice-scoped benchmark and OTel proof hooks
5. Completion gate
   - `NO-GO`
6. Common failure modes
   - publishing metadata without contract authority
   - leaking compatibility routes into canonical catalogs
   - promoting workflow UX while bridge readiness remains zero
   - treating audit hooks as proof already passed
7. Coverage areas that must be closed
   - API authority
   - workflow bridge
   - slice onboarding
   - metadata publishability
   - governed evidence rules
   - observability
   - benchmark admissibility
8. Next action
   - route remediation to Prompt 02 on the single selected slice

### Weighted Blocker Scoreboard

| Weight | Blocker Name | Severity | Owning Prompt | Affected Phase | Affected Slice | Evidence Strength | Blocks | Exact Closure Criteria |
|---:|---|---|---|---|---|---|---|---|
| 10 | Split public contract truth | Critical | Prompt 02 | Phase 1 | Foundation Governance Contract Slice | Strong | Both | one authoritative runtime-backed slice OpenAPI or JSON Schema pack with RFC 9457, headers, conflicts, blocked-capability semantics, and route parity |
| 9 | Workflow bridge zero-ready state | Critical | Prompt 02 | Phase 1 | Foundation Governance Contract Slice | Strong | Both | `workflow_engine_bridge_ready > 0` for the chosen slice and no chosen-slice bridge rows remain blocked |
| 9 | Governed evidence and signature gap | Critical | Prompt 02 | Phase 1 and Phase 6 | Foundation Governance Contract Slice | Strong | Both | approval decision, signature meaning, immutability, retention, hold, and self-approval prohibitions are encoded and tested for the chosen slice |
| 8 | Slice onboarding gap | High | Prompt 02 | Phase 1 and Phase 7 | Foundation Governance Contract Slice | Strong | Both | all chosen-slice entities have field definitions, ownership, endpoint rows, metadata packs, and route parity tests |
| 8 | Metadata publishability failure | High | Prompt 02 | Phase 7 | Foundation Governance Contract Slice | Strong | Frontend generation | chosen-slice publishability is true and blocked or unsupported states are explicit |
| 7 | Async, projection, and observability publication gap | High | Prompt 02 | Phase 1 | Foundation Governance Contract Slice | Strong | Production rollout | projection freshness, rebuild, queue, and OTel/correlation artifacts are published for the chosen slice |
| 7 | Benchmark credibility failure | High | Prompt 02 plus Prompt 03 | Phase 1 | Foundation Governance Contract Slice | Strong | Production rollout | benchmark overlap is nonzero for supported slice routes and workload telemetry includes latency, contention, queue, and rebuild metrics |
| 5 | Phase 0 policy ratifications incomplete | Medium | Prompt 04 | Phase 0 | Program-wide | Medium | Both | record deprecation-window posture, finance-bridge depth, and inheritance-map rule in a frozen orchestration package |

## Section 5: Required Deliverables

- authoritative slice contract pack for the chosen slice
- route and catalog boundary matrix implemented and tested
- slice-specific onboarding closure matrix executed for chosen-slice entities
- workflow bridge target package
- blocked capability publication for unsupported slice surfaces
- projection freshness and rebuild package
- OTel and correlation publication package
- benchmark charter tied to supported slice runtime paths
- explicit re-audit handoff package

## Section 6: Risks, Contradictions, and Blockers

### Reviewer Pass 1: architecture-reconciler

- Contradictions across bundles:
  - Prompt 01 broad slice conflicts with later phase ordering and audit shrink needs
- Missing evidence across bundles:
  - forbidden-dependency matrix, projection appendix, bridge transition map
- Unresolved ownership disputes:
  - release-selection naming and policy ratifications
- Recommended reconciliation decisions:
  - keep Prompt 01 as architecture truth, but do not use its broader slice as next promotable slice

### Reviewer Pass 2: implementation-reconciler

- Contradictions across bundles:
  - Prompt 02 slice is narrower than Prompt 01 but closer to current runtime proof
- Missing evidence across bundles:
  - route parity, slice onboarding closure, bridge promotion, OTel proof
- Unresolved ownership disputes:
  - none beyond Prompt 04 slice selection
- Recommended reconciliation decisions:
  - choose the Prompt 02 slice and keep fail-closed wording

### Reviewer Pass 3: audit-reconciler

- Contradictions across bundles:
  - Prompt 03 previously found no authoritative single slice, but newer Prompt 02 bundle now defines one
- Missing evidence across bundles:
  - live benchmark overlap, governed path parity, authoritative public contract
- Unresolved ownership disputes:
  - re-audit ownership after remediation remains with Prompt 03
- Recommended reconciliation decisions:
  - shrink to the narrower foundation-governance slice and require re-audit after any corrective implementation

### Reviewer Pass 4: erp-mes-eqms-consistency

- Contradictions across bundles:
  - Prompt 01 slice crosses into planning release; current audited program state is not ready for that as the next promotable slice
- Missing evidence across bundles:
  - production release snapshots, MES intake, genealogy, finance linkage
- Unresolved ownership disputes:
  - later-slice finance depth remains open
- Recommended reconciliation decisions:
  - defer the broader release spine and first close Phase 1 foundation contracts

### Reviewer Pass 5: program-risk-and-gates

- Contradictions across bundles:
  - metadata richness could be misread as readiness without contract authority
- Missing evidence across bundles:
  - measurable Phase 1 exit checklist proof
- Unresolved ownership disputes:
  - none
- Recommended reconciliation decisions:
  - retain `NO-GO` until blocker scoreboard rows close

### Reviewer Pass 6: red-team-reconciler

- Contradictions across bundles:
  - compatibility runtime continuity can be mistaken for canonical readiness
- Missing evidence across bundles:
  - benchmark admissibility, OTel publication, governed routed-path parity
- Unresolved ownership disputes:
  - none
- Recommended reconciliation decisions:
  - reject any slice that depends on runtime shortcuts or unsupported metadata publication

### Six-Reviewer Review Synthesis

- Reconciled result:
  - Prompt 01 remains architecture truth
  - Prompt 02 provides the exact next slice candidate
  - Prompt 03 forces the slice to be smaller, fail-closed, and re-auditable
- Prompt 04 decision:
  - broader Prompt 01 release spine is not the next promotable slice
  - the next promotable slice is a narrower Phase 1 slice derived from Prompt 02
  - all later counts use the live metrics reconciliation block, not stale narratives

## Section 7: Decision (GO / REVIEW REQUIRED / NO-GO)

Program decision: `NO-GO`

Why:

- Phase 1 platform foundation is not complete
- workflow bridge remains zero-ready
- public contract authority remains split
- metadata publishability remains false
- governed evidence controls are not proven
- benchmark evidence is not admissible for promotion

## Section 8: Next Loop Instructions

- Next prompt to run: `Prompt 02 Backend Implementation Factory`
- Why:
  - remediation is implementation-heavy
  - the selected slice is now exact
  - Prompt 03 already defined the re-audit triggers
- Do not execute Prompt 02 inside this package.

## Section 9: Execution Playbook Trace

1. Read required local prompt and architecture documents.
2. Located the authoritative Prompt 01, Prompt 02, and Prompt 03 final packages.
3. Built the normalized live metrics reconciliation block.
4. Rejected stale narrative counts in favor of live metrics.
5. Emulated six reviewer passes sequentially.
6. Reconciled the competing slice definitions.
7. Chose one exact next promotable slice.
8. Issued a weighted blocker scoreboard and a fail-closed gate decision.

## Section 10: Prompt QA Checklist Result

- the right specialist prompt was used for the current objective: `PASS`
- research ledger, evidence matrix, contradiction log, and coverage matrix exist: `PASS`
- live metrics reconciliation block exists and stale counts were explicitly rejected: `PASS`
- facts, inferences, assumptions, and gaps are separated: `PASS`
- multi-pass outputs were reconciled instead of copied through: `PASS`
- phase exit checklist items are concrete and measurable: `PASS`
- blocked dependencies are explicit: `PASS`
- one exact next promotable slice is named: `PASS`
- weighted blocker scoreboard exists: `PASS`
- ERP, MES, eQMS, platform, and frontend-contract impacts were considered: `PASS`
- governed and contract-affecting changes still trigger re-audit: `PASS`
- the decision is supported by evidence strong enough for the claimed gate: `PASS`
- the next specialist prompt can run from the handoff package without guessing: `PASS`

## Section 11: Handoff Package for the Next Prompt

### Next Promotable Slice

- Slice name: `Foundation Governance Contract Slice`
- Why it is first:
  - it is Phase 1 compliant
  - it is smaller than the broader Prompt 01 architecture slice
  - it directly addresses Prompt 03 `PAUSE AND SHRINK`
  - it closes the highest-leverage blockers before planning, MES, or eQMS expansion
- Owning prompt for the next loop: `Prompt 02 Backend Implementation Factory`

### Included Bounded Contexts

- `FoundationGovernance`
- `PartyMaster`
- `WorkflowOrchestration`
- `ExperienceMetadataContracts`
- `ReadModelsAndProjection`

### Included Canonical Tables

- `org_enterprise`
- `org_company`
- `org_site`
- `org_plant`
- `org_warehouse`
- `org_work_center`
- `org_work_unit`
- `party`
- `party_role`
- `party_site`
- `party_contact`
- `calendar`
- `shift`
- `approval`
- `electronic_signature`
- `attachment`
- `status_code`
- `reason_code`

### Included Contract Families

- `/api/v1/foundation/*`
- `/api/v1/governance/*`
- authn and authz contract family
- RFC 9457 error contract family
- `If-Match` and `ETag` concurrency family
- workflow decision contract family
- attachment and evidence contract family
- metadata publication family
- observability contract family

### Included Projections

- authoritative read-through for `organization`
- authoritative read-through for `party`
- authoritative read-through for `calendar`
- `approval_queue`
- `attachment_timeline`

### Included Workflow Bridge Target

- public `approval_group` resource behavior rooted over canonical `approval` and embedded `electronic_signature` evidence

### Exact Blockers That Must Close Before Promotion

- authoritative slice contract pack absent
- workflow bridge ready count for the slice remains zero
- slice onboarding gaps remain open
- blocked capability publication is incomplete
- signature and evidence immutability rules are not yet proven
- OTel and benchmark slice artifacts are not yet published

### Exact Evidence Needed For The Next Gate

- published slice OpenAPI 3.1 and JSON Schema 2020-12 artifacts
- RFC 9457 examples and parity tests for all supported slice errors
- route and catalog parity tests proving compatibility routes stay out of canonical catalogs
- slice-scoped field-definition and orphan-ownership closure
- workflow bridge tests for `approval_group` decision lifecycle
- metadata packs for list, detail, timeline, attachments, and blocked states
- projection freshness, rebuild, and stale-read behavior for `approval_queue` and `attachment_timeline`
- OTel/correlation publication for supported slice routes and background workers
- slice benchmark with nonzero supported-path overlap

### Re-audit Triggers For Prompt 03

- any schema or DDL change touching the chosen slice
- workflow bridge activation
- signature, retention, archive, or legal-hold behavior change
- metadata promotion for the chosen slice
- projection ownership or stale-read behavior change
- benchmark publication for the chosen slice

## Final Package Status

`NO-GO`

Prompt 04 is complete. The next prompt should be `Prompt 02 Backend Implementation Factory`.
