# Prompt 02 Proof Stabilization And Publication Integrity Prompt: Foundation Governance Contract Slice

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This prompt performs one narrow follow-up pass on the existing implementation of the `Foundation Governance Contract Slice`.

It must not reopen architecture.
It must not broaden the slice.
It must not turn into another planning package.

Its job is to convert the current hardening/proof work into a stable, publishable proof package by fixing:

- benchmark instability
- missing fresh proof artifacts
- split-truth publication metadata
- smoke gaps around publication integrity

## Primary authority

Use these inputs in this exact order:

1. [prompt-02-foundation-governance-runnable-proof-and-contract-alignment-deep-evaluation-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-runnable-proof-and-contract-alignment-deep-evaluation-2026-04-07.md)
2. [prompt-02-foundation-governance-runnable-proof-and-contract-alignment-prompt-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-runnable-proof-and-contract-alignment-prompt-2026-04-07.md)
3. [prompt-02-foundation-governance-hardening-proof-deep-evaluation-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-hardening-proof-deep-evaluation-2026-04-07.md)
4. [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md)

## Mandatory repo inputs

- [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml)
- [api/index.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php)
- [ApprovalGroupController.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/controllers/ApprovalGroupController.php)
- [ApprovalGroupService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/ApprovalGroupService.php)
- [FoundationGovernanceService.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/services/FoundationGovernanceService.php)
- [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php)
- [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py)
- [foundation_governance_contract_read_mix.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql)
- [fg_benchmark_schema.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/fg_benchmark_schema.sql)
- [fg_benchmark_seed.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/fg_benchmark_seed.sql)
- [generate-module-builder-registry.mjs](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/registry/generate-module-builder-registry.mjs)
- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json)
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)
- [backend-runtime-benchmark-2026-04-05.json](C:/Users/TEST4/qms.hesem.com.vn/_reports/backend-runtime-benchmark-2026-04-05.json)

## Hard constraints

- do not broaden the slice beyond foundation governance
- do not reopen Prompt 01 or Prompt 04
- do not replace code work with another strategy report
- do not claim `PUBLISH READY`
- do not fake benchmark success
- do not leave public artifacts in a split-truth state
- do not keep manual top-level overrides if the canonical generator model can represent the same truth
- do not ship stale `_meta.generatedAt` and summary values if artifacts are supposed to represent current slice status

## Exact targets

### 1. Stabilize the benchmark proof path

The current local evidence shows:

- the harness now loads FG schema + seed
- but the real run aborts during `foundation_governance_read_mix`
- the database subsequently enters recovery mode

You must fix this proof path.

Required workflow:

1. identify the exact failing query or runtime condition in the FG read mix
2. fix the benchmark script, schema, seed, or harness as needed
3. rerun the benchmark until one of the following is true:
   - preferred: the FG read mix completes successfully and produces a fresh report artifact
   - acceptable fail-closed fallback: a smaller deterministic benchmark/probe completes successfully and the reason full pgbench remains blocked is explicitly encoded in the proof artifact

Unacceptable outcomes:

- leaving the benchmark path crashing the backend
- claiming success without a fresh artifact
- silently downgrading the benchmark without saying so

### 2. Produce a fresh proof artifact

After the benchmark path is stabilized, produce a fresh artifact in `_reports` that proves the current slice state.

At minimum:

- it must have a fresh timestamp
- it must state whether `foundation_governance_read_mix` completed successfully
- it must not reuse the old `2026-04-05` evidence as if it were current

If you keep the existing report file name, its contents must be updated to current execution time.
If you create a new report file, update any references that should point to the new artifact.

### 3. Regenerate publication artifacts from a single authority

Current problem:

- `endpoint-catalog.json` and `frontend-foundation-catalog.json` now contain the right intent in places
- but they still carry stale `_meta.generatedAt` and stale summary values
- `governance.approval_group` in `frontend-foundation-catalog.json` currently contains both:
  - nested `readiness` values from an older truth
  - top-level override flags from a newer truth

You must remove this split truth.

Required outcomes:

- regenerate artifacts through the authoritative generator path if possible
- ensure `_meta.generatedAt` reflects the new publication pass
- ensure summaries are recomputed
- ensure `governance.approval_group` has one coherent readiness model
- ensure any blocked workflow state is represented in the canonical contract shape, not via ad hoc duplicate fields

### 4. Strengthen smoke for publication integrity

You must upgrade [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php) so it verifies:

- there is no split-truth readiness state for `governance.approval_group`
- endpoint and frontend publication artifacts are freshly regenerated
- the benchmark proof artifact is fresh and aligned with the current run outcome
- blocked workflow execution remains consistent across OpenAPI, endpoint catalog, and frontend catalog

Do not rely only on string existence checks if a stronger deterministic check is possible.

### 5. Preserve the existing good behavior

Do not regress:

- write-route `AND` security semantics
- persisted requester identity
- service-layer self-approval prohibition
- blocked/fail-closed decision execution while the workflow bridge is not ready
- blocked endpoint status in the endpoint catalog
- OpenAPI documentation of blocked workflow bridge state
- stronger smoke checks already added in the last pass

## Mandatory standards to obey

- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/info/rfc9457)
- [PostgreSQL pgbench documentation](https://www.postgresql.org/docs/current/pgbench.html)
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)

## Working mode

Work directly in the repository.

Do not spend the run writing another broad report first.
Read only what is necessary.
Patch code and artifacts.
Run the proof path.
Then summarize results.

## Required implementation outputs

At the end of the run, produce all of the following:

1. actual repo changes
2. a short list of modified files
3. a `proof outcome` section containing:
   - benchmark stabilized or still blocked
   - fresh proof artifact path
   - publication artifact integrity status
   - blocked approval workflow publication status
4. exact validation commands executed and their outcomes
5. any remaining blockers, if any

## Success criteria

This prompt is successful only if all of the following are true:

- the foundation-governance benchmark path no longer crashes the local proof run
- a fresh proof artifact exists
- endpoint and frontend publication artifacts are regenerated coherently
- `governance.approval_group` no longer carries split-truth readiness signals
- smoke validates the publication-integrity outcome

If full success is still not safely reachable, do not fake completion.
Stabilize as much as possible, record the exact remaining blocker, and stop there.

