# Prompt 03 Backend Audit Final Package

Generated: 2026-04-06  
Prompt: `03-backend-audit-hardening-prompt.md`  
Scope: Canonical-first backend audit for ERP + MES + eQMS production readiness and backend-dependent frontend generation

## Prompt 03 Step Plan

1. Step 1. Evidence collection and scope freeze - completed
2. Step 2. Contract and invariant audit - completed
3. Step 3. Standards benchmark and production-challenge model - completed
4. Step 4. Findings synthesis, remediation, QA, and final package - completed

## 1. Audit Verdict

Frontend-readiness is `REVIEW REQUIRED`. Production-readiness is `NO-GO`.

The audited backend is not promotable because contract truth is split, governed routed paths are weaker than required, `workflow_engine_bridge_ready = 0`, `publishability_ready = false`, observability is stale and `JSON_ONLY`, and the benchmark pack has `benchmark_overlap_count = 0`.

## 2. Live Metrics Block

```yaml
normalized_at: 2026-04-06T00:00:00+07:00
sources:
  registry_quality_report:
    file: C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json
    generated_at: 2026-04-06T02:22:55.218Z
  endpoint_catalog:
    file: C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json
    generated_at: 2026-04-06T02:22:55.218Z
  workflow_library:
    file: C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/workflow-library.json
    generated_at: 2026-04-05T13:32:47.256Z
  schema_field_audit_full:
    file: C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/schema-field-audit-full.json
    generated_at: 2026-04-06T02:25:17Z
  openapi_yaml:
    file: C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml
    generated_at: 2026-03-28T10:56:00Z
  runtime_observability:
    file: C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/runtime-shadow/runtime-observability.json
    generated_at: 2026-04-01T17:12:56Z
  backend_runtime_benchmark:
    file: C:/Users/TEST4/qms.hesem.com.vn/_reports/backend-runtime-benchmark-2026-04-05.json
    finished_at: 2026-04-05T15:01:33.504770Z
metrics:
  workflow_engine_bridge_ready: 0
  workflow_engine_bridge_blocked: 115
  frontend_ready_entities: 330
  frontend_partial_entities: 198
  publishability_ready: false
  missing_field_defs: 316
  orphan_tables: 45
  canonical_onboarding_gap_count: 101
  registry_endpoint_actions: 2862
  openapi_path_items: 47
  openapi_operations: 53
  openapi_runtime_path_items: 0
  workflow_count: 425
  row_version_tables: 408
  hard_delete_tables: 100
  archive_only_tables: 428
  benchmark_live_table_count: 998
  benchmark_registry_table_count: 528
  benchmark_overlap_count: 0
  benchmark_seed_planning_scenarios: 5040
  benchmark_seed_schedule_blocks: 100000
  benchmark_seed_demand_forecasts: 60000
  benchmark_read_mix_avg_ms: 112.255
  benchmark_read_mix_tps_excluding_connect: 107.302722
  benchmark_optimistic_hot_update_avg_ms: 2.413
  benchmark_optimistic_conflict_rate_pct: 23.69
  benchmark_unsafe_hot_update_avg_ms: 2.541
  benchmark_unsafe_conflict_rate_pct: 0.0
rejected_stale_or_misaligned_counts:
  frontend_blueprint_ready: 40
  frontend_blueprint_partial: 488
  reason: stale or differently scoped versus current registry counts
```

## 3. Evidence Ledger

- Current-state proof reviewed:
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\api\openapi.yaml`
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\api\index.php`
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\api.php`
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\api\controllers\GenericCrudController.php`
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\api\controllers\DocumentController.php`
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\database\schema.sql`
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\qms-data\registry\endpoint-catalog.json`
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\qms-data\registry\workflow-library.json`
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\qms-data\registry\registry-quality-report.json`
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\qms-data\runtime-shadow\runtime-observability.json`
  - `C:\Users\TEST4\qms.hesem.com.vn\_reports\backend-runtime-benchmark-2026-04-05.json`
- Planning only, not runtime proof:
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\docs\greenfield-canonical-first-execution-plan-2026-04-06.md`
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\docs\canonical-erp-mes-eqms-7-layer-architecture-2026-04-05.md`
  - `C:\Users\TEST4\qms.hesem.com.vn\01-QMS-Portal\docs\ai-prompts\ai-prompt-output-evaluation-and-improvement-2026-04-06.md`
- Missing evidence:
  - authoritative `/api/runtime/*` OpenAPI or JSON Schema pack
  - AsyncAPI or equivalent event publication
  - projection rebuild runbooks
  - live OpenTelemetry-grade traces
  - legal-hold proof
  - one exact first-slice manifest

## 4. Coverage Matrix

| Area | Result |
|---|---|
| Canonical model integrity | `FAIL` |
| Bounded-context discipline | `REVIEW REQUIRED` |
| Workflow and orchestration correctness | `FAIL` |
| Frontend-readiness contracts | `REVIEW REQUIRED` |
| API, error, metadata contracts | `FAIL` |
| Query, projection, rebuild discipline | `FAIL` |
| Security, governance, segregation of duties | `FAIL` |
| Observability and diagnosability | `FAIL` |
| ERP realism | `FAIL` |
| MES realism | `FAIL` |
| eQMS realism | `FAIL` |
| Versioning and deprecation discipline | `FAIL` |
| Rollout readiness | `NO-GO` |

## 5. Facts-vs-Inference Register

- Proven fact: runtime surface is larger than published contract: `2862` registry actions vs `53` OpenAPI operations and `0` runtime paths.
- Implemented but nonconforming: row-version and `ETag` behavior exist in code but are not authoritatively published.
- Intended but unproven: canonical workflow bridge, released-snapshot MES truth, typed genealogy, and full projection governance.
- Missing evidence: async envelope ownership, queue lag SLOs, legal hold, and exact first-slice artifact.
- Rejected assumption: blueprint readiness `40/488` is stale versus live registry `330/198`.

## 6. Findings by Severity

- `Critical`: split public contract source of truth. Blocks both. Closure: one authoritative runtime-backed OpenAPI or JSON Schema surface with full error and header publication.
- `Critical`: routed governed document behavior is weaker than legacy or evidence-review behavior. Blocks production rollout. Closure: approval, signature meaning, maker-checker, immutability, retention, and delete rules proven equal or stronger.
- `Critical`: benchmark evidence is inadmissible because `benchmark_overlap_count = 0`. Blocks production rollout. Closure: rerun against real runtime paths with `p50/p95/p99`, lock, deadlock, queue, and rebuild metrics.
- `High`: `workflow_engine_bridge_ready = 0` while `115` entities are bridge-blocked. Blocks both. Closure: bridge-ready transitions for the selected slice or those flows removed from promotable scope.
- `High`: `publishability_ready = false`, `missing_field_defs = 316`, `orphan_tables = 45`. Blocks frontend generation.
- `High`: canonical MES execution and genealogy remain unproven. Blocks production rollout.
- `High`: async/event ownership and observability publication are absent or stale. Blocks production rollout.
- `High`: no exact first slice was published upstream. Blocks both.
- `Medium`: backend technical contract is not fully English-only. Must be corrected before promotion.

## 7. Weighted Blocker Scoreboard

| Blocker | Severity | Scope affected | Evidence strength | Blocks | Recommended owner prompt | Closure criteria |
|---|---|---|---|---|---|---|
| Split public contract truth | Critical | API, frontend, integrations | Strong | Both | Prompt 02 | Authoritative runtime/public contract pack |
| Governed routed-path regression | Critical | eQMS, compliance, auditability | Strong | Production rollout | Prompt 02 | Routed behavior stricter than or equal to governed legacy |
| Benchmark credibility failure | Critical | Rollout, capacity, operability | Strong | Production rollout | Prompt 02 + Prompt 03 | Nonzero live overlap and full workload telemetry |
| Workflow bridge blocked | High | CAPA, inspection, governed transitions | Strong | Both | Prompt 02 | Bridge-ready slice with tested transitions |
| Metadata publishability gaps | High | Frontend generation | Strong | Frontend generation | Prompt 02 | `publishability_ready = true` for the slice |
| Canonical MES proof absent | High | MES rollout | Medium-strong | Production rollout | Prompt 01 + Prompt 02 | Released snapshots and typed genealogy proven |
| Async/event/observability gap | High | Operability, replay, forensics | Strong | Production rollout | Prompt 02 | Async/event publication and live telemetry artifacts |
| Missing exact first slice | High | Program gating | Strong | Both | Prompt 01 + Prompt 04 | One exact promotable slice with manifest and gates |

## 8. Frontend-Readiness Gaps

- Live counts are `330` ready and `198` partial, but they are not promotable because `publishability_ready = false`.
- `316` missing field definitions and `45` orphan tables still break deterministic generation.
- `115` bridge-blocked entities mean governed actions cannot be safely rendered as executable.
- Frontend clients cannot trust the published machine-readable API while `/api/runtime/*` is absent from OpenAPI.

## 9. Production Benchmark and Live-Traffic Model

- Current benchmark is `synthetic-isolated`, APS-only, and not rollout-admissible.
- Measured dataset: `5040` scenarios, `100000` schedule blocks, `60000` forecasts; read average `112.255ms`; optimistic conflict rate `23.69%`.
- Mandatory missing metrics: `p50/p95/p99`, lock waits, deadlocks, queue lag, cold/warm cache split, rebuild/backfill load, thresholds, real overlap.
- Required live scenarios before re-audit:
  - shift-start surge
  - planning refresh
  - work-order release and execution
  - offline replay
  - governed approval contention
  - genealogy recall
  - NCR/CAPA timeline
  - end-of-day or close-period pressure

## 10. Observability and Forensics Review

- `runtime-observability.json` is stale and `JSON_ONLY`, not OpenTelemetry-grade runtime proof.
- Correlation IDs, `traceparent`, queue lag, projection lag, rebuild visibility, and replay localization are not published as authoritative runtime guarantees.
- Incident response and forensic reconstruction remain partial because legacy and routed paths still diverge.

## 11. Compliance and Governance Gaps

- Public non-2xx responses are not aligned to RFC 9457.
- Routed document control does not yet meet FDA Part 11 and EU Annex 11 expectations for signature meaning, maker-checker, immutability, retention, and self-approval prohibition.
- Delegation, legal hold, archive retrieval, and downstream document-change propagation remain unproven.
- Async/event publication does not yet meet AsyncAPI 3.0 or CloudEvents expectations.

## 12. First-Slice Audit Decision

- No authoritative single first slice was found in reviewed Prompt 01 or Prompt 02 outputs.
- `greenfield-canonical-first-execution-plan-2026-04-06.md` lists three early module groups, not one exact slice.
- `ai-prompt-output-evaluation-and-improvement-2026-04-06.md` explicitly says the outputs still do not choose one exact slice.
- Decision: `PAUSE AND SHRINK`.
- Well chosen: directionally yes to start with governance-first foundations.
- Contract depth: `No`.
- Governance depth: `No`.
- Benchmark charter credibility: `No`.
- Audit note: foundation plus controlled documents is the strongest existing candidate in the reviewed notes, but that is a Prompt 04 reconciliation input, not a Prompt 03 authored target state.

## 13. Required Remediation Roadmap

1. Publish one authoritative runtime contract surface with OpenAPI 3.1.1, RFC 9457, concurrency, workflow-blocked responses, pagination, versioning, and deprecations.
2. Reconcile routed and legacy governed document paths to the stricter rule set.
3. Name one exact promotable slice and publish its manifest, included aggregates, workflow target, benchmark charter, and release gate.
4. Close slice-scoped onboarding, field-definition, and orphan-table gaps or narrow scope explicitly.
5. Publish async/event ownership and live observability artifacts.
6. Re-run benchmark and traffic simulation on real runtime paths.

## 14. Closure Criteria and Re-audit Triggers

- Closure criteria:
  - `publishability_ready = true`
  - authoritative public runtime contract exists
  - workflow bridge is ready for the chosen slice
  - slice-scoped onboarding and metadata gaps are closed or formally excluded
  - governed document flows pass parity and compliance checks
  - benchmark overlap is nonzero and fully measured
  - live OpenTelemetry-grade evidence is published
- Re-audit triggers:
  - any new public contract pack
  - workflow bridge rollout or state-model change
  - document approval, signature, delete, or retention changes
  - MES released-snapshot or genealogy rollout
  - benchmark rerun or major schema-onboarding change
  - async/event envelope change

## 15. Decision

`NO-GO`

## 16. Prompt 03 Final Package for Prompt 04

- Treat all current readiness claims as provisional unless backed by authoritative runtime contracts, live telemetry, and a benchmark with nonzero overlap.
- Do not reconcile missing evidence into architecture optimism.
- Separate whole-program blockers from slice-gating blockers; both currently fail.
- Minimum acceptable next-loop evidence:
  - exact slice manifest
  - authoritative API pack
  - compliant governed routed paths
  - async/projection ownership pack
  - live observability artifacts
  - live-aligned benchmark rerun

## 17. Cross-Bundle Sync Requests for Prompt 04

- Prompt 01: publish one exact first promotable slice and formally exclude anything not benchmarkable or not snapshot-safe.
- Prompt 02: publish the authoritative `/api/runtime/*` surface, regulated routed-path proofs, async/event/projection ownership, and fresh telemetry artifacts.
- Prompt 04: arbitrate the authoritative truth source among OpenAPI, endpoint catalog, workflow library, routed controllers, and legacy compatibility paths.
- Prompt 04: reject any promotion claim while `workflow_engine_bridge_ready = 0`, `publishability_ready = false`, `canonical_onboarding_gap_count = 101`, or `benchmark_overlap_count = 0`.

## 18. Six-Reviewer Review Synthesis

- Real parallel sub-agents were used for all six reviewer roles in this step.
- `architecture-audit` forced fail-closed treatment of split contract truth and the missing exact first slice.
- `erp-audit` kept order, finance-close, and integration-backlog realism as unresolved blockers.
- `mes-audit` kept released snapshots, provenance, replay, and typed genealogy as unresolved MES no-go conditions.
- `eqms-audit` kept approval, signature, immutability, and retention defects at critical severity.
- `platform-audit` kept public contract authority, async publication, deprecation discipline, and stale `JSON_ONLY` telemetry as blockers.
- `benchmark-red-team` kept the benchmark classified as `synthetic-isolated` and inadmissible for rollout.

## QA Verdict

`FAIL`

Prompt 03 is complete. This file is complete. Use Prompt 04 separately for program-level reconciliation.
