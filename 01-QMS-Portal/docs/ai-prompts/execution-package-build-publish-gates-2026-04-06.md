# Execution Package Build and Publish Gates

Generated at: `2026-04-06`
Scope: gate matrix for `Foundation Governance Contract Slice`

## 1. Gate Policy

This matrix separates:

- `build-start gates`: minimum freeze required before coding begins
- `build-complete gates`: minimum evidence required before implementation can be called complete
- `publish gates`: minimum evidence required before frontend publication or release promotion

Every gate is fail-closed.

## 2. Build-start Gates

| Gate ID | Gate | Pass condition | Required artifact |
|---|---|---|---|
| `build.scope.freeze` | exact slice boundary | slice, tables, routes, internal commands, and exclusions are frozen | [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md) |
| `build.aggregate.freeze` | aggregate map | aggregate, commands, events, and invariants are named | [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md) |
| `build.policy.freeze` | policy architecture | `OIDC -> RBAC -> ABAC`, SoD, delegation, and hold rules are frozen | [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md) |
| `build.benchmark.freeze` | benchmark charter | scenarios, datasets, and thresholds are frozen | [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md) |
| `build.artifact.freeze` | artifact targets | contract, metadata, projection, observability, and test outputs are named | [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md) |

## 3. Build-complete Gates

| Gate ID | Gate | Pass condition | Blocking effect |
|---|---|---|---|
| `build.contract.openapi` | OpenAPI authority | slice OpenAPI 3.1.1 is published and lint-clean | no API completion |
| `build.contract.schema` | schema authority | JSON Schema 2020-12 exists for all public request and response bodies | no contract completion |
| `build.contract.problem` | problem details | RFC 9457 types, examples, and parity tests exist | no error-surface completion |
| `build.contract.concurrency` | concurrency semantics | `ETag` and `If-Match` behavior is implemented and tested | no mutable command completion |
| `build.workflow.bridge` | approval bridge | `approval_group` transition path is bridge-backed and tested | no governance completion |
| `build.evidence.immutability` | evidence hardening | verified attachments and signatures are immutable in behavior and tests | no governed evidence completion |
| `build.registry.slice_onboarding` | metadata onboarding | chosen-slice entities have field defs, ownership, endpoint rows, and metadata packs | no frontend package completion |
| `build.projection.ownership` | projection package | projection owner, lag budget, rebuild, and stale-read rules are documented and tested | no operational projection completion |
| `build.async.contract` | async package | AsyncAPI or equivalent event contract exists where async is used | no async readiness claim |
| `build.observability.contract` | observability package | OTel traces, metrics, log schema, and attributes are documented and wired | no rollout proof |
| `build.tests.parity` | parity tests | route parity and blocked-capability tests pass | no catalog promotion |

## 4. Publish Gates

| Gate ID | Gate | Pass condition | Blocking effect |
|---|---|---|---|
| `publish.slice.field_closure` | slice schema closure | chosen-slice missing field defs and orphan ownership gaps are `0` | no frontend publication |
| `publish.slice.bridge_ready` | slice workflow readiness | chosen-slice bridge blockers are `0` | no transition publication |
| `publish.slice.publishability` | slice publishability | chosen-slice capabilities are explicit and publishability is true | no module publication |
| `publish.slice.otel` | live telemetry proof | supported routes and workers publish OTel signals and correlations | no rollout approval |
| `publish.slice.benchmark` | benchmark admissibility | benchmark overlap is nonzero and all thresholds pass | no rollout approval |
| `publish.slice.audit` | re-audit closure | Prompt 03 re-audit returns no critical slice blocker | no promotion |
| `publish.slice.orchestration` | program reconciliation | new Prompt 04 reconciliation approves promotion | no promotion |

## 5. Minimum Proof Pack Before Frontend Publication

The minimum acceptable proof pack is:

- published OpenAPI 3.1.1
- published JSON Schema 2020-12
- published RFC 9457 problem examples
- route and catalog parity tests
- workflow bridge tests for `approval_group`
- metadata packs for list, detail, timeline, attachments, and blocked states
- projection freshness and rebuild proof
- OTel traces and metrics for supported routes and workers
- benchmark report with nonzero supported-path overlap

## 6. Current Gate State

Current known state from live artifacts:

- `workflow_engine_bridge_ready = 0`
- `publishability_ready = false`
- `missing_field_defs = 316`
- `orphan_tables = 45`
- `canonical_onboarding_gap_count = 101`

Therefore:

- build-start gates: `PASS`
- build-complete gates: `OPEN`
- publish gates: `BLOCKED`

## 7. Promotion Rule

No person, prompt, or automation may call this slice publishable by inference.

Promotion requires explicit passing evidence for every publish gate in this document.
