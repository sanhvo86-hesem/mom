# Prompt 02 Backend Implementation Final Package

Generated at: `2026-04-06T20:29:23.5598179+07:00`

## Prompt 02 Step Plan

1. Step 1 - Architecture conformance and dependency freeze. `completed`
2. Step 2 - Platform contract baseline. `completed`
3. Step 3 - Canonical data, commands, and workflows. `completed`
4. Step 4 - Projections, metadata, integration, observability, and proof. `completed`
5. Step 5 - Final package. `completed`

## Live Metrics Block

```yaml
generated_at:
  registry_quality_report: 2026-04-06T02:22:55.218Z
  frontend_foundation_catalog: 2026-04-06T02:22:55.218Z
  schema_field_audit_full: 2026-04-06T02:25:17.6616283Z
  canonical_vs_hesem_evaluation: 2026-04-06T05:21:30.0779630Z
counts:
  endpoint_count: 2862
  pack_count: 3168
  workflow_engine_bridge_ready: 0
  workflow_engine_bridge_blocked: 115
  frontend_ready_entities: 330
  frontend_partial_entities: 198
  publishability_ready: false
  publishability_review_required_entities: 198
  missing_field_defs: 316
  orphan_tables: 45
  canonical_onboarding_gap_count: 101
```

## Status

- `Prompt 02 package complete`
- `Rollout status: BLOCKED`

## Execution Playbook Trace

1. Confirmed Prompt 01 conformance and froze the compatibility-only runtime boundary.
2. Froze canonical contracts before any implementation-grade design.
3. Froze first-slice data, commands, workflows, and hardening targets.
4. Froze projections, metadata, async boundaries, observability, and proof gates.
5. Converted remaining gaps into fail-closed gates for Prompt 04 instead of premature approval.

## Prompt 02 Frozen Positions For Prompt 04 Reconciliation

### First-Slice Frozen Positions

- `[FACT]` `/api/v1` is target-state authority only. It is not yet a publishable runtime surface; the current published spec and catalogs still have zero first-slice `/api/v1` matches.
- `[FACT]` First-slice canonical public route matrix is:
  - `GET /api/v1/foundation/organizations`
  - `GET /api/v1/foundation/parties`
  - `GET /api/v1/foundation/calendars`
  - `GET /api/v1/governance/approval-groups`
  - `GET /api/v1/governance/approval-groups/{approvalGroupId}`
  - `POST /api/v1/governance/approval-groups/{approvalGroupId}:decide`
  - `GET /api/v1/governance/approval-groups/{approvalGroupId}/timeline`
  - `GET /api/v1/governance/approval-groups/{approvalGroupId}/attachments`
  - `GET /api/v1/governance/attachments/{attachmentId}`
  - `POST /api/v1/governance/attachments`
- `[FACT]` Compatibility-only endpoints must not be surfaced in canonical endpoint or frontend catalogs.
- `[DESIGN CONSTRAINT]` `approval_group` is the approval root. `requestApproval` remains internal/admin only in the first slice.
- `[DESIGN CONSTRAINT]` Internal/admin-only first-slice commands are:
  - `registerOrganizationNode`
  - `amendOrganizationNode`
  - `reparentOrganizationNode`
  - `deactivateOrganizationNode`
  - `registerParty`
  - `amendPartyIdentity`
  - `assignPartyRole`
  - `registerPartySite`
  - `registerPartyContact`
  - `registerCalendar`
  - `registerShift`
  - `requestApproval`
- `[DESIGN CONSTRAINT]` Authoritative read-through query surfaces are `organization`, `party`, and `calendar`, each with explicit `as_of` semantics.
- `[DESIGN CONSTRAINT]` Operational projections are only `approval_queue` and `attachment_timeline`.
- `[DESIGN CONSTRAINT]` Operational projections are never decision authority for release-selection, dispatch, qualification, or execution gating.
- `[DESIGN CONSTRAINT]` `attachment_intake` is transient and non-governed. Immutable canonical `attachment` evidence exists only after verification and token-bound linkage.
- `[DESIGN CONSTRAINT]` `electronic_signature` has no standalone public create, list, detail, update, or delete surface in the first slice.
- `[DESIGN CONSTRAINT]` Evidence immutability is target truth pending DDL hardening. After acceptance, `electronic_signature` and `attachment` must not support update/delete; correction is by supersession or hold/disposition records.
- `[DESIGN CONSTRAINT]` Attachment linkage token must be single-use, expiry-bounded, hash-bound, and target-record-bound.
- `[DESIGN CONSTRAINT]` Signature behavior is frozen as:
  - no standalone public signature route
  - signature evidence bound inside approval decision where required
  - signature requirement matrix must be keyed by approval action or step code before rollout
  - signature evidence exposed only inside approval detail and timeline views
- `[DESIGN CONSTRAINT]` Public metadata rule is fail-closed:
  - supported first-slice capabilities must be explicitly emitted
  - unsupported capabilities must remain explicit `blocked` or `not_applicable`
  - unsupported surfaces must not leak executable actions
- `[DESIGN CONSTRAINT]` `shift` remains in first-slice write truth and is `internal_only` / `blocked` for public publication until first-slice onboarding and metadata closure exist.
- `[DESIGN CONSTRAINT]` Required first-slice ERP read-model fields are:
  - `effective_from`
  - `effective_to`
  - `is_current`
  - `org_scope_path`
  - `superseded_by`
  - `source_system`
  - `source_record_id`
  - default site/contact indicators where applicable
- `[DESIGN CONSTRAINT]` Required approval queue fields are:
  - `approval_group_id`
  - `requested_by`
  - `approver`
  - `company_id`
  - `site_id`
  - `plant_id`
  - `due_at`
  - `pending_age`
  - `approval_mode`
  - escalation/exception status

### Later-Phase Anchor Positions For Prompt 04 Only

- `[LATER-PHASE ANCHOR]` Release-selection is mandatory before execution.
- `[LATER-PHASE ANCHOR]` `dispatch_queue` is the later-phase dispatch write root.
- `[LATER-PHASE ANCHOR]` `job_event` is later-phase MES execution truth.
- `[LATER-PHASE ANCHOR]` Planning, board, and operator surfaces remain projection-backed.
- `[LATER-PHASE ANCHOR]` Future MES and bridge events must carry:
  - site
  - plant
  - work center
  - work unit
  - shift
  - source system
  - adapter or agent
  - offline sync state
  - correlation ID
  - bounded ordering scope
- `[LATER-PHASE ANCHOR]` Future execution ordering must be guaranteed within a bounded partition, at minimum per work unit or equivalent execution scope.
- `[LATER-PHASE ANCHOR]` Shipment-grade genealogy and execution-grade traceability remain unsupported until deferred reconciliation closes.

## Route And Catalog Boundary Matrix

| Category | Scope |
|---|---|
| Canonical target routes | First-slice `/api/v1` matrix above only |
| Compatibility-only routes | Legacy `?action=` endpoints, session-auth compatibility REST paths, runtime JSON shadow paths |
| Blocked routes | Standalone signature routes, blocked analytics routes, unsupported workflow bridge publication routes |
| Catalog rule | Compatibility and blocked routes must not enter canonical endpoint or frontend catalogs |

## Registry Publication Contract

- Required artifact set:
  - `schema-library.json`
  - `relation-map.json`
  - `validation-rules.json`
  - `workflow-library.json`
  - `endpoint-catalog.json`
  - `frontend-foundation-catalog.json`
  - `registry-quality-report.json`
  - `registry-manifest.json`
  - composite `data-fields` artifacts
- Required atomic write order:
  1. staged artifact generation
  2. completeness validation
  3. shared manifest/version stamp assignment
  4. batch promotion
  5. `registry-quality-report.json` regeneration
  6. rollback on any failed write or failed validation
- Publication is target-state design only until implemented; current registry remains runtime-mutable.

## Async Separation Contract

- Canonical `domain_event_outbox` and `domain_event_inbox` are PostgreSQL-only internal platform tables.
- Compatibility `outbox_events` remains non-canonical.
- No proof credit transfers from compatibility outbox telemetry to canonical async readiness.
- Canonical replay, poison handling, dead-letter handling, and diagnostics must be proven independently.

## Hard Gate Matrix

| Gate | Current | Target | Release Effect | Owning Artifact Or Workstream |
|---|---:|---:|---|---|
| `gate.workflow.bridge` | `0 ready / 115 blocked` | slice blockers `0` | no workflow publishability | workflow bridge |
| `gate.slice.catalog_onboarding` | `0` first-slice route matches, `0` first-slice entity matches | full slice onboarding | no public readiness | registry + metadata |
| `gate.schema.slice_field_defs` | `316` missing, `45` orphan tables | slice-owned gaps `0` | no canonical publication | schema + registry |
| `gate.registry.atomic_publication` | mixed timestamps | one manifest batch | no trustworthy metadata completeness | registry pipeline |
| `gate.async.pg_outbox_inbox_proof` | absent | proven | no async claims | platform async |
| `gate.projection.freshness_rebuild` | design only | pass | no operational projection promotion | query/projection |
| `gate.observability.otel_required_attributes` | required, unproven | pass | no rollout approval | observability |
| `gate.benchmark.slice_thresholds` | baseline only | pass | no rollout approval | benchmark |
| `gate.traceability.shipment_genealogy` | deferred | reconciled | no shipment-grade traceability claim | traceability |

## Slice-Specific Onboarding Closure Matrix

| Slice Item | Required Closure |
|---|---|
| `organization` | field definitions, orphan ownership, endpoint catalog row, frontend metadata pack, route parity tests |
| `party` | field definitions, orphan ownership, endpoint catalog row, frontend metadata pack, route parity tests |
| `calendar` | field definitions, orphan ownership, endpoint catalog row, frontend metadata pack, temporal query tests |
| `shift` | blocked/internal-only classification, field definitions, metadata state publication |
| `approval_group` | root-table onboarding, workflow metadata, detail/timeline/attachments metadata, conflict/idempotency tests |
| `attachment` | evidence metadata, token-binding form contract, timeline/detail metadata, quarantine/link tests |

## Prompt QA Checklist Result

### Passed

- architecture conformance
- explicit source hierarchy
- contracts-first ordering
- compatibility boundary freeze
- first-slice freeze
- six-reviewer reconciliation

### Not Closed

- workflow bridge promotion
- first-slice registry onboarding
- metadata publishability
- DDL hardening enforcement
- projection freshness and rebuild proof
- PG-only async proof
- OTel proof
- benchmark proof
- shipment genealogy reconciliation

## Cross-Bundle Sync Requests For Prompt 04

### With Prompt 01

- ratify release-selection naming and placement
- ratify finance posting-bridge depth
- ratify governed-envelope inheritance
- ratify deprecation-window policy

### With Prompt 03

- re-audit public contract corrections
- re-audit DDL hardening
- re-audit workflow bridge activation
- re-audit projection ownership and breach behavior
- re-audit signature, hold, retention, and async separation
- re-audit benchmark and observability proof

### With Prompt 04 Only

- preserve fail-closed wording
- do not reintroduce standalone signature route
- keep blocked analytics out of artifact and build paths
- keep compatibility endpoints out of canonical catalogs
- keep async and publication claims blocked until gates close
- keep shipment-grade genealogy unsupported until reconciliation closes
- keep overall program status at `BLOCKED` or `REVIEW REQUIRED` if any contradiction remains unresolved

## Non-Authorization Clause

Prompt 02 does not authorize:

- merge approval
- contract publication
- metadata publication
- event publication
- unsupported capability exposure
- production rollout

## Six-Reviewer Review Synthesis

- `implementation-architecture` forced the split between first-slice positions and later-phase anchors, aligned approval resource naming, and required a real route/catalog matrix.
- `erp-implementation` required `as_of` semantics for org, party, and calendar, explicit internal-admin commands, `shift` classification, and slice-specific onboarding closure.
- `mes-implementation` required provenance minimums, bounded ordering rules, and an explicit ban on using lagging projections for execution decisions.
- `eqms-implementation` required explicit non-public signature behavior, evidence immutability wording, token-bound attachment rules, and governed retention/hold minimums.
- `platform-implementation` required manifest-batch registry publication, composite `data-fields` handling, PG-only async separation, and named fail-closed gates.
- `delivery-red-team` required dual terminal status, stronger non-authorization wording, and blocker enforcement-grade language.

## Terminal Clause

Prompt 02 bundle sequence is complete; implementation, publication, and rollout remain blocked pending unresolved gates.
