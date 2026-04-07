# Prompt 02 Runnable-Proof And Contract-Alignment Deep Evaluation: Foundation Governance Contract Slice

Date: 2026-04-07
Status: REVIEW REQUIRED BEFORE PROMPT 03
Primary reviewed implementation input: [prompt-02-foundation-governance-runnable-proof-and-contract-alignment-prompt-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-runnable-proof-and-contract-alignment-prompt-2026-04-07.md)

## 1. Executive verdict

This pass improved the slice again.

It is not a no-op.

Real progress landed:

- a dedicated foundation-governance benchmark schema now exists in [fg_benchmark_schema.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/fg_benchmark_schema.sql)
- a dedicated foundation-governance benchmark seed now exists in [fg_benchmark_seed.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/fg_benchmark_seed.sql)
- the benchmark harness now attempts to load those artifacts before running the foundation-governance read mix in [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py#L310)
- the endpoint catalog now marks `governance.approval_group.decide` as blocked/fail-closed
- OpenAPI now documents the blocked workflow-bridge state on the decide route in [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml#L2523)
- smoke verification is stronger than before and now includes behavioral checks for bridge-not-ready and timeline cursor logic in [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php#L456)

However, the slice is still not ready for Prompt 03.

The remaining gap is no longer basic hardening.
It is now proof stabilization and publication integrity.

## 2. What is genuinely better and should be kept

The following changes are real and should remain:

- [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py#L23) declares `FG_BENCH_SCHEMA_PATH`
- [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py#L310) loads FG schema + seed before the FG read mix
- [fg_benchmark_schema.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/fg_benchmark_schema.sql) defines canonical governance benchmark tables such as `org_enterprise`, `org_company`, `party`, `approval`, and `attachment`
- [fg_benchmark_seed.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/fg_benchmark_seed.sql) seeds representative governance data volumes
- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json) now marks `governance.approval_group.decide` with:
  - `status: blocked`
  - `execution_mode: fail_closed`
  - `blocked_reason: workflow_bridge_not_ready`
- [api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml#L2525) explicitly documents `Workflow Bridge Status: BLOCKED`
- [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php#L456) now exercises `ApprovalGroupService::decide()` behaviorally for `bridge_not_ready`
- [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php#L486) now exercises timeline cursor advancement behaviorally

These are meaningful improvements.

## 3. Deep findings

### [P1] The benchmark is still not proof-grade because the real local run aborts

The benchmark harness is better.
But the proof is still not complete because the benchmark does not finish successfully in local execution.

Observed local result on 2026-04-07:

- running [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py) failed during `foundation_governance_read_mix`
- `pgbench` aborted with:
  - `client 7 aborted in command 5 (SQL) of script 0; perhaps the backend died while processing`
  - `client 4 aborted in command 7 (SQL) of script 0; perhaps the backend died while processing`
- immediately afterward, direct `psql` access to `qms_runtime_bench_20260405` returned:
  - `the database system is in recovery mode`

This means the slice has moved from:

- no benchmark support

to:

- benchmark harness present, but runtime proof unstable under the current scenario

That is progress, but not publish-grade proof.

Relevant references:

- [PostgreSQL pgbench documentation](https://www.postgresql.org/docs/current/pgbench.html)
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

Inference:
- The conclusion that the benchmark is unstable is based on the local run result plus repo artifacts, not on the standards alone.

### [P1] No fresh benchmark report artifact was produced

The runtime benchmark report file at [backend-runtime-benchmark-2026-04-05.json](C:/Users/TEST4/qms.hesem.com.vn/_reports/backend-runtime-benchmark-2026-04-05.json) still has:

- `started_at = 2026-04-05`
- `finished_at = 2026-04-05`
- no confirmed fresh `foundation_governance_read_mix` result from this new pass

So although the harness code improved, the repository still does not contain a fresh proof artifact showing successful execution of the new foundation-governance benchmark path.

This is not just a timestamp nit.
It means the slice still lacks a consumable proof artifact for audit, release gating, and future prompt loops.

### [P2] Publication artifacts were patched, but not regenerated cleanly from a single authority

The public artifacts are closer to correct, but they still show evidence of split truth:

- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json) now correctly blocks `governance.approval_group.decide`
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json) now adds top-level fields:
  - `overall: partial`
  - `workflow_ready: false`
  - `workflow_blocker: workflow_bridge_not_ready`
  - `decide_execution_mode: fail_closed`

But the same entity still carries an older nested `readiness` shape with stale values:

- `readiness.overall = ready`
- `readiness.workflow_ready = true`

In addition:

- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json) still reports `_meta.generatedAt = 2026-04-06T02:22:55.218Z`
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json) still reports `_meta.generatedAt = 2026-04-06T02:22:55.218Z`
- the frontend summary still reports:
  - `ready_entities = 330`
  - `partial_entities = 198`
  - `blocked_entities = 0`
  - `workflow_ready_entities = 122`

This strongly suggests patch-level overrides rather than a clean generator publication pass.

That is dangerous because downstream consumers can read different truths from the same artifact.

### [P2] Smoke verification improved, but it still does not prove publication integrity end-to-end

[foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php#L541) is better than before.

It now verifies:

- blocked decide behavior
- controller problem mapping
- cursor advancement logic
- endpoint catalog blocked state
- frontend blocked state
- benchmark harness/schema compatibility

But it still stops short of the full publication integrity proof now needed.

What it does not prove yet:

- that the public registry artifacts were regenerated from the authoritative generator pipeline
- that the nested readiness model and the top-level readiness signals are consistent
- that a fresh benchmark report artifact exists after the new benchmark path landed
- that the benchmark run completed successfully rather than merely being wired into code

So the proof surface is stronger, but still incomplete.

### [P3] OpenAPI is honest enough for runtime state, but still not a cleanly versioned publication state machine

[api/openapi.yaml](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/openapi.yaml#L2525) now explains that the decide route is blocked until the workflow bridge is ready.

That is good.

But the publication model is still mixed:

- route exists
- success response `200` remains in the contract
- current runtime is described as blocked in prose

This is acceptable for a temporary fail-closed slice, but it is not yet the cleanest possible publication posture.

The next pass should decide whether this slice wants:

- a stable future contract plus explicit current blocked runtime state

or:

- a more formal blocked capability response model in the published contract surface

Reference:

- [OpenAPI Specification v3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/info/rfc9457)

## 4. Verification note

This review includes one real local runtime verification that did not exist in the previous pass:

- [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py) was executed locally
- it failed during the foundation-governance read mix
- no fresh benchmark report artifact was written

This makes the remaining proof gap concrete rather than hypothetical.

## 5. Improvement directives for the next pass

The next pass should stay in the same slice and do only the following:

1. stabilize the foundation-governance benchmark so that the real local run does not abort the backend
2. produce a fresh proof artifact after the benchmark succeeds
3. regenerate endpoint and frontend publication artifacts from a single authoritative path
4. remove split-truth readiness fields from `governance.approval_group`
5. strengthen smoke so it checks publication integrity, not just patched output fields

## 6. Recommended next prompt

The next prompt should be a narrow `proof stabilization and publication integrity` pass.

It should not reopen architecture.
It should not move to Prompt 03.
It should focus only on:

- benchmark stabilization
- fresh proof artifact creation
- generator/publication artifact integrity
- smoke validation of that integrity

