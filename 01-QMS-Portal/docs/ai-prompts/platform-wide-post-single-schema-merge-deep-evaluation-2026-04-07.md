# Platform-Wide Post Single-Schema Merge — Deep Evaluation (2026-04-07)

## Executive verdict

### Overall
The repository is now **far beyond planning quality**.
It has the shape of a real registry-driven ERP/MES/eQMS platform with:
- merged schema presence,
- runtime/API slices,
- registry generation tooling,
- smoke harness,
- benchmark harness,
- extensive prompt and evaluation lineage.

### But
It is **not yet fully self-proving at platform-global level**.
The biggest remaining problem is no longer “missing architecture”.
The biggest remaining problem is **authority convergence**:
- schema authority,
- contract authority,
- publication authority,
- reviewer-facing proof authority,
- prompt authority.

## Repo truths confirmed from the public tree

### 1) Single merged schema is now present in the repo tree
`01-QMS-Portal/database/` now contains:
- `schema.sql`
- `migrations/`
- `build_schema_snapshot.php`
- `canonical-erp-mes-eqms-7-layer-blueprint.sql`
- `mes-schema-specification.sql`

This is a strong signal that the platform has crossed from fragmented schema work into a merged-schema phase.

### 2) Foundation/Governance slice is real runtime, not planning
The public API spec already includes Foundation/Governance routes for:
- organizations
- parties
- calendars
- approval-groups
- approval-group detail / decide / timeline / attachments

This means the repo has already crossed the boundary where Prompt 02 is “implementation-driving”, not exploratory.

### 3) Registry backbone is platform-scale
`qms-data/registry/` now contains large canonical assets such as:
- `endpoint-catalog.json`
- `frontend-foundation-catalog.json`
- `registry-manifest.json`
- `registry-quality-report.json`
- `schema-library.json`
- `table-registry.json`
- `workflow-library.json`
- `domain-field-packs.json`
- `data-fields-index.json`

Together with `tools/registry/`, this is a real registry-backed enterprise-runtime architecture.

### 4) Generator chain is substantial
`tools/registry/` contains at least:
- `add_slice_field_definitions.py`
- `generate-data-fields-registry.mjs`
- `generate-enterprise-governance-uplift.mjs`
- `generate-module-builder-registry.mjs`
- `generate-registry-v3.mjs`
- `generate-table-architecture.mjs`
- `generate-workflow-governance.mjs`
- `regenerate_slice_publication.py`

This means the repo has enough machinery to support a single canonical authority path — if that authority is made explicit.

### 5) Benchmark and smoke scaffolding already exist
The public repo exposes:
- `tools/benchmark/benchmark_schema.sql`
- `tools/benchmark/fg_benchmark_schema.sql`
- `tools/benchmark/fg_benchmark_seed.sql`
- `tools/benchmark/foundation_governance_contract_read_mix.sql`
- `tools/benchmark/run_runtime_benchmark.py`
- `tests/backend_smoke.php`
- `tests/foundation_governance_contract_smoke.php`

This is enough to support verification work, but not enough by itself to claim global release truth.

## What improved materially since the earlier Prompt 02 phase

### Prompt debt is now evidence of progress, not failure
The large number of prompt/evaluation files in `docs/ai-prompts` looks messy, but it also proves that:
- the workstream has been progressively audited,
- the repo has accumulated implementation-driving context,
- the team has already burned down many design-stage unknowns.

### Run-id convergence improved
`registry-manifest.json` and `registry-quality-report.json` now show the same timestamp family and the same `publication_run_id`.
That is a real improvement compared with earlier split-run states.

### Public spec already models advanced behaviors
The public `openapi.yaml` now describes:
- Foundation/Governance routes,
- `If-Match`,
- `ETag`,
- `application/problem+json`,
- approval decision error responses,
- and authenticated write semantics.

This is materially ahead of the state described in the earliest Prompt 02 evaluation outputs.

## What is still unresolved

## 1) Schema authority is still implicit, not explicit
The database folder now holds three high-signal SQL artifacts side by side:
- `schema.sql`
- `canonical-erp-mes-eqms-7-layer-blueprint.sql`
- `mes-schema-specification.sql`

A reviewer can infer that `schema.sql` is probably the executable source of truth, but the repo does not yet make that machine-verifiable.

### Why this matters
After a single-schema merge, ambiguity about which schema file is authoritative becomes more dangerous than before:
- generators can read the wrong source,
- reviewers can validate against the wrong artifact,
- prompt outputs can drift into blueprint/spec rather than executable schema.

## 2) Platform publication truth is still not fully converged
The repo now has synchronized run-id metadata, but the canonical metrics still show drift:
- manifest bridge counts differ from quality report bridge counts,
- publishability still shows `review_required`,
- manifest asset accounting still carries an unexplained `533` entity count vs `528` catalog record count.

### Important nuance
This may not be a pure bug.
It may be an **entity-vs-table accounting gap**.
If 533 frontend entities intentionally map onto 528 physical table-backed catalog records plus 5 virtual/composite entities, the repo needs to say so explicitly.
At the moment, it does not.

## 3) Scope semantics are mixed
The publication label still says `foundation_governance_contract_slice`, but the reported numbers are platform-global:
- `entity_count = 533`
- `ready_entities = 425`
- `partial_entities = 108`
- platform-wide workflow counts

This is confusing because it collapses two different truths into one artifact family:
- **global platform truth**
- **Foundation Governance slice truth**

### Recommended target model
Use:
- **global canonical artifacts** for platform-wide counts,
- **compact slice summaries** for Foundation Governance,
- and make the scope explicit in file names and summaries.

## 4) Public reviewer ergonomics are still weak
`frontend-foundation-catalog.json` is too large for GitHub inline rendering.
`endpoint-catalog.json` is also large.
The repo still lacks a small, reviewer-friendly proof package in `qms-data/registry/`.

### Consequence
A public reviewer must still inspect large catalogs or trust narrative claims.
That is exactly what a mature platform should eliminate.

## 5) OpenAPI is still on 3.1.1
This is not catastrophic, because 3.1 patch versions are tooling-compatible by design.
But after a schema merge and publication convergence pass, leaving the spec on 3.1.1 while aiming at stronger truthfulness is unnecessary drift.

## 6) Prompt authority is still too implicit
`docs/ai-prompts` already contains:
- a long Prompt 02 cluster,
- multiple Prompt 03 documents,
- an old Prompt 04 master package.

Without a current-authority reset document, reviewers and future Codex sessions can waste time reopening outdated lanes.

## What should happen next

### Do not reopen Prompt 02 as a separate workstream
Foundation Governance has already done its job.
What remains now belongs to platform-wide convergence.

### Do not broaden architecture again
Architecture is not the bottleneck anymore.
Authority and proof are.

### Do one focused platform pass
The next active pass should simultaneously close:
- schema authority,
- publication authority,
- compact proof package,
- OpenAPI/runtime convergence,
- prompt authority reset.

## Recommended acceptance standard for the next pass

The next pass should not call itself complete until all of the following are true:

1. `database/schema.sql` is declared the executable schema authority in a machine-readable artifact.
2. `schema.sql`, `schema-library.json`, `table-registry.json`, and generator outputs are explainably aligned.
3. `registry-manifest.json` and `registry-quality-report.json` derive from one canonical publication authority and agree on counts.
4. If `533` vs `528` is intentional, the repo contains a compact accounting artifact that explains the distinction.
5. `openapi.yaml` is upgraded to 3.1.2 or intentionally frozen with an explicit rationale.
6. Global compact proof artifacts exist and render in GitHub web UI.
7. Foundation Governance slice has its own compact proof summary separate from platform-global truth.
8. A short current-authority index exists in `docs/ai-prompts`.

## Blunt conclusion

### PASS
for moving to platform-wide Prompt 03 work.

### HOLD
for any claim that the repo is already globally self-proving after the single-schema merge.

The repo is now **strong enough to stop architecture expansion** and **mature enough to demand one canonical truth package**.
That is the correct next phase.
