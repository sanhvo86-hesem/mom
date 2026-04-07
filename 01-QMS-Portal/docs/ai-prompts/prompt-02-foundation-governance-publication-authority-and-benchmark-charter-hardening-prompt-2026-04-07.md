# Prompt 02 Publication Authority And Benchmark Charter Hardening Prompt: Foundation Governance Contract Slice

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This prompt performs one narrow follow-up pass on the existing implementation of the `Foundation Governance Contract Slice`.

It must not reopen architecture.
It must not broaden the slice.
It must not turn into another planning package.

Its job is to finish the publication side of the slice by fixing:

- split publication authority across registry artifacts
- incorrect recomputed summary metrics
- weak freshness proof
- under-specified benchmark charter

## Primary authority

Use these inputs in this exact order:

1. [prompt-02-foundation-governance-proof-stabilization-and-publication-integrity-deep-evaluation-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-proof-stabilization-and-publication-integrity-deep-evaluation-2026-04-07.md)
2. [prompt-02-foundation-governance-proof-stabilization-and-publication-integrity-prompt-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-proof-stabilization-and-publication-integrity-prompt-2026-04-07.md)
3. [prompt-02-foundation-governance-runnable-proof-and-contract-alignment-deep-evaluation-2026-04-07.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-runnable-proof-and-contract-alignment-deep-evaluation-2026-04-07.md)
4. [execution-package-foundation-governance-contract-slice-2026-04-06.md](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/ai-prompts/execution-package-foundation-governance-contract-slice-2026-04-06.md)

## Mandatory repo inputs

- [generate-module-builder-registry.mjs](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/registry/generate-module-builder-registry.mjs)
- [regenerate_slice_publication.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/registry/regenerate_slice_publication.py)
- [endpoint-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/endpoint-catalog.json)
- [frontend-foundation-catalog.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json)
- [registry-manifest.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-manifest.json)
- [registry-quality-report.json](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/qms-data/registry/registry-quality-report.json)
- [run_runtime_benchmark.py](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py)
- [foundation_governance_contract_read_mix.sql](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql)
- [backend-runtime-benchmark-2026-04-05.json](C:/Users/TEST4/qms.hesem.com.vn/_reports/backend-runtime-benchmark-2026-04-05.json)
- [foundation_governance_contract_smoke.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/foundation_governance_contract_smoke.php)

## Hard constraints

- do not broaden the slice beyond foundation governance
- do not reopen Prompt 01 or Prompt 04
- do not replace code work with another strategy report
- do not claim `PUBLISH READY`
- do not regress the current successful FG benchmark run
- do not keep a second metadata authority if the canonical generator can own the same truth
- do not leave `registry-manifest.json` and `registry-quality-report.json` stale while endpoint/frontend artifacts are fresh
- do not keep `workflow_ready_entities = 0` if that is merely an artifact of the helper script

## Exact targets

### 1. Unify publication authority across the registry package

Current problem:

- endpoint and frontend slice artifacts are fresh
- manifest and quality report are stale
- slice publication logic currently lives in a post-step helper outside the main generator flow

You must unify this.

Preferred outcome:

- extend the authoritative registry generation path so that endpoint catalog, frontend foundation catalog, registry manifest, and registry quality report are updated coherently in one publication flow

Acceptable fallback:

- keep a slice publication helper, but it must update every dependent artifact coherently and deterministically

Unacceptable outcome:

- leaving `endpoint-catalog.json` and `frontend-foundation-catalog.json` on one truth while `registry-manifest.json` and `registry-quality-report.json` stay on another

### 2. Fix canonical summary metric correctness

Current problem:

- `frontend-foundation-catalog.json` now reports `workflow_ready_entities = 0`
- the canonical generator derives workflow readiness from `contract.capabilities.workflow.state`
- the current helper recomputes workflow summary from a different signal shape

You must restore metric correctness using the canonical model.

Required outcomes:

- `workflow_ready_entities` must be computed from the same canonical logic used by the generator
- `ready_entities`, `partial_entities`, and `blocked_entities` must remain coherent with the actual entity contracts
- no slice-specific override may silently corrupt global summary counts

### 3. Replace static date-threshold freshness checks with run-correlated proof

Current problem:

- smoke freshness checks rely on a fixed lower bound like `>= 2026-04-07`

You must replace this with stronger proof tied to the current run.

Acceptable mechanisms:

- compare artifact timestamps to the current execution window
- compare report `started_at` / `finished_at` to regenerated artifact timestamps
- emit and validate a run identifier shared across regenerated artifacts

Unacceptable outcome:

- a check that can pass indefinitely for stale artifacts produced on the same or a later day

### 4. Harden the benchmark charter

The benchmark currently proves that the FG path is stable enough to run with a conservative profile.

That is useful, but the charter is still weak.

You must improve the benchmark contract by making the report explicit about profile intent.

At minimum:

- mark the current FG benchmark profile as something like `stability_probe` or equivalent
- preserve the current successful run path
- include enough metadata in the report to explain why this profile is intentionally conservative

If safe, you may add one additional moderately stronger profile.
But do not destabilize the slice just to chase bigger numbers.

### 5. Improve report traceability

The current report file name still says `2026-04-05` while the content is fresh from `2026-04-07`.

You should improve traceability by doing one of:

- writing a new report file whose name matches the current run date
- or explicitly encoding report-generation date/version inside a stable path contract and documenting that rule clearly

Do not break downstream references without updating them.

## Mandatory standards to obey

- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/info/rfc9457)
- [PostgreSQL pgbench documentation](https://www.postgresql.org/docs/current/pgbench.html)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [EU Annex 11](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)

## Working mode

Work directly in the repository.

Patch code and artifacts.
Regenerate what must be regenerated.
Run the relevant publication and verification steps.
Then summarize.

## Required implementation outputs

At the end of the run, produce all of the following:

1. actual repo changes
2. a short list of modified files
3. a `publication integrity outcome` section containing:
   - publication authority unified or not
   - summary metrics corrected or not
   - freshness proof dynamic or not
   - benchmark charter improved or not
4. exact validation commands executed and their outcomes
5. any remaining blockers, if any

## Success criteria

This prompt is successful only if all of the following are true:

- endpoint/frontend/manifest/quality-report artifacts are refreshed coherently
- `workflow_ready_entities` and related summary metrics are correct again
- freshness proof is tied to the current run rather than a static date threshold
- the benchmark report clearly communicates the meaning of the current FG benchmark profile

If full success is not safely reachable, do not fake completion.
Fix the highest-impact subset, clearly record the remaining blocker, and stop there.

