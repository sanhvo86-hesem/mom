# Prompt 02 Proof-Stabilization And Publication-Integrity Deep Evaluation: Foundation Governance Contract Slice

Date: 2026-04-07
Status: REVIEW REQUIRED BEFORE PROMPT 03
Primary reviewed implementation input: [prompt-02-foundation-governance-proof-stabilization-and-publication-integrity-prompt-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-proof-stabilization-and-publication-integrity-prompt-2026-04-07.md)

## 1. Executive verdict

This pass is a real upgrade.

It moved the slice from:

- proof path present but unstable

to:

- proof path executes successfully under a conservative benchmark profile
- approval-group runtime and public contracts are closer to aligned
- split-truth on the approval-group entity itself is materially reduced
- smoke checks now validate more of the publication state

The strongest concrete evidence is the refreshed benchmark report at [backend-runtime-benchmark-2026-04-05.json](C:/Users/TEST4/qms.hesem.com.vn/_reports/backend-runtime-benchmark-2026-04-05.json), which now contains a successful `foundation_governance_read_mix` result dated `2026-04-07`.

However, the slice is still not ready for Prompt 03.

The remaining gap is not basic runtime safety anymore.
It is publication-authority integrity and benchmark-charter quality.

## 2. What is genuinely better and should be kept

The following improvements are real and should remain:

- [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py#L310) now loads FG schema + seed and captures FG benchmark failure or success explicitly
- [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py#L317) now uses a conservative profile that avoids the earlier crash path
- [backend-runtime-benchmark-2026-04-05.json](C:/Users/TEST4/qms.hesem.com.vn/_reports/backend-runtime-benchmark-2026-04-05.json#L198) now records a successful `foundation_governance_read_mix`
- [regenerate_slice_publication.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/registry/regenerate_slice_publication.py) establishes an explicit slice publication step for endpoint and frontend artifacts
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json) now has fresh `_meta.generatedAt` and no longer leaves `governance.approval_group` in the obviously contradictory state from the previous pass
- [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php#L620) now checks more of the publication-integrity path than before

## 3. Deep findings

### [P1] Publication authority is still split across registry artifacts

The current pass refreshed:

- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json)
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)

But it did not refresh:

- [registry-manifest.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-manifest.json)
- [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json)

Those two files still carry `generatedAt = 2026-04-06T02:22:55.218Z` and old frontend summary counts.

So the publication bundle is still split:

- slice-local endpoint/frontend artifacts say one thing
- manifest/quality report still say another

This is not just cosmetic.
It means there is still no single authoritative publication pass for the registry package as a whole.

Relevant references:

- [OpenAPI Specification v3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/info/rfc9457)

Inference:
- The publication-authority problem is inferred from the local artifact set and timestamps, not directly from the standards above.

### [P1] `workflow_ready_entities` in the frontend summary is now corrupted

[frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json) now reports:

- `workflow_ready_entities = 0`

That is almost certainly not the intended truth for the full registry.

The canonical generator in [generate-module-builder-registry.mjs](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/registry/generate-module-builder-registry.mjs#L1601) counts workflow-ready entities from:

- `contract.capabilities.workflow.state === 'ready'`

But the slice publication helper in [regenerate_slice_publication.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/registry/regenerate_slice_publication.py#L118) recomputes `workflow_ready_entities` from top-level `workflow_ready` or nested `readiness.workflow_ready`, which is not the same canonical model used by the generator.

Result:

- the approval-group override was fixed
- the global summary metric was damaged

This is a real publication-integrity bug.

### [P2] The benchmark now proves stability, but not yet production-like behavior

The new benchmark result is good as a stability proof:

- `clients = 2`
- `jobs = 1`
- `duration_seconds = 15`
- `tps_excluding_connect = 701.723905`
- `average_latency_ms = 2.856`

That is a valid no-crash proof.

But it is still a conservative stability probe, not a representative live-traffic benchmark.

The current report still lacks things usually needed for a stronger benchmark charter:

- explicit profile labeling such as `stability_probe` versus `load_profile`
- percentile latency metrics
- explanation of why this concurrency level is representative or intentionally reduced
- a second, moderately realistic profile if safe

Relevant references:

- [PostgreSQL pgbench documentation](https://www.postgresql.org/docs/current/pgbench.html)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)

### [P2] Freshness checks in smoke are still date-threshold based, not run-correlated

[foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php#L620) now checks freshness better than before, but the freshness assertions still compare against a fixed lower bound such as `>= 2026-04-07`.

That means a stale artifact from the same or a later day could still pass in future runs, even if it was not produced by the current execution.

The next pass should correlate freshness to:

- current run time
- report `started_at` / `finished_at`
- file modification time
- or a run identifier shared across regenerated artifacts

### [P3] The benchmark report file name still carries the old date

[backend-runtime-benchmark-2026-04-05.json](C:/Users/TEST4/qms.hesem.com.vn/_reports/backend-runtime-benchmark-2026-04-05.json) now contains fresh `2026-04-07` contents.

This is acceptable as a temporary path if references are stable.
But it weakens traceability because the filename suggests older evidence than the content actually contains.

This is not a blocker by itself, but it is worth cleaning up before publication-grade governance.

## 4. Verification note

This review includes direct local evidence:

- the refreshed report file now contains a successful FG benchmark result
- the updated frontend catalog shows fresh `_meta.generatedAt`
- the endpoint and frontend artifacts now reflect the blocked approval-group decision more honestly than before

So this assessment is based on current repo artifacts, not only on source inspection.

## 5. Improvement directives for the next pass

The next pass should stay inside the same slice and do only the following:

1. unify publication authority across:
   - endpoint catalog
   - frontend foundation catalog
   - registry manifest
   - registry quality report
2. fix `workflow_ready_entities` and any other summary metrics to use the canonical generator model
3. strengthen freshness verification so it is tied to the current run, not a hardcoded date floor
4. upgrade the benchmark report from `stable-enough probe` toward an explicit benchmark charter with named profiles
5. if possible, clean up report naming so traceability matches content time

## 6. Recommended next prompt

The next prompt should be a narrow `publication authority and benchmark charter hardening` pass.

It should not reopen architecture.
It should not move to Prompt 03 yet.
It should focus only on:

- publication bundle unification
- canonical summary metric correctness
- dynamic freshness proof
- benchmark charter clarity

