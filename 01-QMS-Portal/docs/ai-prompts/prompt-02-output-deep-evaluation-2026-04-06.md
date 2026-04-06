# Prompt 02 Output Deep Evaluation

Generated at: `2026-04-06`
Scope: deep evaluation of [prompt-02-backend-implementation-final-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-backend-implementation-final-package-2026-04-06.md)

## Executive Assessment

The latest Prompt 02 output is a strong execution-grade design package.

It is materially better than earlier Prompt 02 runs because it:

- obeys execution-package-first scope
- names one exact delivery slice
- publishes a real artifact manifest
- publishes a real command-event-invariant catalog
- publishes a real policy architecture
- publishes a real benchmark charter
- fails closed as `BUILD READY / PUBLISH BLOCKED`

However, it is still not the best possible next-loop package. The main weakness is no longer architectural ambiguity. The main weakness is codebase-fit and publication exactness.

Prompt 02 now knows what to build. It still needs one more closure pass to prove exactly how that build lands in the current repository, exactly how contract authority becomes single-source, and exactly how registry onboarding closes at the row and entity-key level.

## What Prompt 02 Did Well

### 1. It respected the execution package

The output explicitly declares:

- execution mode: `execution-package-first`
- primary slice: `Foundation Governance Contract Slice`
- reviewer mode is honest about sequential emulation and no real sub-agents

This is important because it avoids the older failure mode where Prompt 02 widened the slice and blurred current-loop ownership.

### 2. It is now build-team assignable

The output includes real implementation structure:

- migrations
- target services
- target contracts
- tests
- benchmark hooks
- observability hooks

This is the right shape for implementation planning.

### 3. It fails closed correctly

The output keeps the right blockers open:

- contract authority split
- workflow bridge zero-ready state
- DDL hardening not implemented
- metadata onboarding absent
- async proof absent
- OTel proof absent
- benchmark proof absent

This is healthy. It avoids false readiness.

## Findings

### [P1] Codebase-fit is still under-specified

Prompt 02 names several new controllers and service paths, but it does not explicitly reconcile them against the current codebase shape.

Local evidence:

- Prompt 02 proposes `FoundationController.php`, `GovernanceController.php`, and `api/services/foundation-governance/*`.
- The current repository already has [MasterDataController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/MasterDataController.php), [EvidenceController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/EvidenceController.php), [RegistryController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/RegistryController.php), [WorkflowEngine.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/WorkflowEngine.php), [EvidenceVaultService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/EvidenceVaultService.php), [AuditTrail.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/AuditTrail.php), and [OutboxWorker.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/OutboxWorker.php).

Why this matters:

- without a reuse-vs-new decision matrix, the implementation can drift into duplicate controllers, duplicate services, or contract authority split across too many roots

Required improvement:

- publish one file-by-file reuse matrix saying `reuse`, `extend`, `wrap`, or `create new` for each touched controller, service, worker, registry artifact, and test root

### [P1] Contract authority is still split in practice

Prompt 02 correctly names the split, but it does not yet close it operationally enough.

Local evidence:

- [prompt-02-backend-implementation-final-package-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-backend-implementation-final-package-2026-04-06.md) acknowledges that current [openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml) is compatibility-oriented.
- The output proposes a new canonical OpenAPI file under `contracts/openapi/`, but it does not specify the one exact publication rule that prevents dual truth between runtime routes, OpenAPI, registry catalogs, and frontend metadata.

Why this matters:

- world-class contract authority requires a single authoritative publication flow, not parallel descriptions that can drift

Required improvement:

- define exact source-of-truth order among route handlers, generated OpenAPI, endpoint catalog, and frontend metadata
- define whether runtime routing is generated from the contract, validated against the contract, or hand-maintained with parity tests

### [P2] Wire-level security, cursor, and problem-detail semantics still need exactness

Prompt 02 is strong at the conceptual level, but some wire-level details remain too generic.

Local evidence:

- it specifies `If-Match`, `ETag`, cursor pagination, OIDC, and ABAC
- it does not yet publish exact security scheme names, cursor envelope schema, `pageInfo` contract, or exact HTTP status mapping for `428`, `412`, and `409`

Why this matters:

- OpenAPI, RFC 9457, Relay-style cursoring, and Dataverse-style optimistic concurrency are only truly usable when the wire contract is exact

Required improvement:

- define exact security schemes in OpenAPI
- define exact cursor request and response schema
- define exact problem-type to HTTP-status matrix
- define exact `If-Match missing` vs `ETag mismatch` vs `invalid transition` semantics

### [P2] `approval_group` public identity is still provisional

Prompt 02 explicitly assumes:

- public `approval_group_id` maps `1:1` to `approval.approval_id`

This is acceptable as a temporary slice-scoped assumption, but it is still an assumption, not a ratified contract.

Why this matters:

- approval-group identity is a public surface
- if multi-step or grouped approvals arrive later, a sloppy identity decision now can break backward compatibility

Required improvement:

- publish an explicit public identity contract
- state whether `approval_group_id` is a permanent public alias, a temporary facade, or a future-stable abstraction with compatibility guarantees

### [P2] Registry onboarding closure remains too abstract

Prompt 02 correctly says onboarding is absent, but it still stops one step short of build-team exactness.

Local evidence:

- it names registry files to regenerate
- it names the slice entity keys
- it does not publish the exact endpoint rows, entity keys, pack IDs, metadata IDs, and capability rows that must be created or changed

Why this matters:

- `publishability_ready = false` and `exact slice entity matches = 0` are not closed by narrative alone

Required improvement:

- publish the exact registry onboarding delta by entity and by route
- define exact new entity keys for `organization`, `party`, `calendar`, `approval_group`, and `attachment`
- define exact blocked-capability rows and exact relation-pack additions

### [P3] Observability and benchmark design are strong but not yet anchored to the current telemetry stack

Prompt 02 names good metrics and trace concepts, but it does not yet define how they plug into the repository's current telemetry and worker reality.

Why this matters:

- rollout credibility depends on actual exporters, sinks, dashboards, and worker instrumentation paths

Required improvement:

- name exact telemetry integration points in the current codebase
- name exact benchmark runner integration with current `tools/benchmark/`

## Alignment With Official References

This evaluation is partly inferential, but it is grounded in official references:

- [Azure CQRS](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs) supports the write-truth vs read-model separation that Prompt 02 now handles correctly.
- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html), [JSON Schema 2020-12](https://json-schema.org/draft/2020-12), and [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) support the need for an exact wire contract, not narrative-only API semantics.
- [Dataverse optimistic concurrency](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimistic-concurrency) supports the need for explicit optimistic concurrency contracts at the table and API layers.
- [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm) reinforces that cursor pagination needs a formal response shape.
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0-18.html) and [NIST SP 800-162 ABAC](https://csrc.nist.gov/pubs/sp/800/162/upd2/final) support the need for exact identity and policy contracts.
- [OpenTelemetry](https://opentelemetry.io/docs/) supports the need for explicit traces, metrics, logs, and correlation publication.
- [FDA Part 11](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application) and [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf) support the fail-closed stance on meaning-bound signatures, immutability, retention, and legal hold.

## Recommended Improvements

Prompt 02 should not be rerun broadly from scratch.

The right next move is a narrow closure pass that produces:

1. a codebase-fit reuse matrix
2. a contract-authority closure pack
3. exact cursor, security, and problem-detail schemas
4. a ratified `approval_group` public identity contract
5. an exact registry onboarding delta
6. a file-by-file tranche-1 patch plan

## Decision

The latest Prompt 02 output is good enough to become the basis for the next closure pass.

It is not yet the best possible input for coding, because it still leaves too much file-placement and publication exactness to implementation-time judgment.

The best next prompt is therefore not Prompt 03 yet. The best next prompt is a narrow Prompt 02 hardening prompt focused on codebase-fit and publication closure for the already-frozen slice.
