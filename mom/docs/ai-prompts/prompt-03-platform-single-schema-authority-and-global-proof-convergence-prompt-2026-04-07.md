# Prompt 03 Platform Single-Schema Authority And Global Proof Convergence Prompt (2026-04-07)

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This is the **post-single-schema-merge convergence pass**.

Do not reopen Prompt 02 as a separate workstream.
Do not create another architecture package.
Do not widen the domain model.
Do not produce report-only completion.
Do not claim success from chat history.

Your job is to make the repository **self-proving after the single-schema merge**.

## Execution model

You must execute this prompt as **one coordinated pass with concurrent workstreams**.
You may implement workstreams A–F in parallel, but you must converge them into one truthful result before finishing.

## Repo truth overrides all narrative

Use the following authority order:

1. current repo code and artifacts
2. `CURRENT-PLATFORM-AUTHORITY-2026-04-07.md`
3. `platform-wide-post-single-schema-merge-deep-evaluation-2026-04-07.md`
4. `platform-wide-post-single-schema-merge-gap-matrix-2026-04-07.md`
5. historical prompt files only as background

If historical prompt output conflicts with current repo files, **repo truth wins**.

## Mandatory repo inputs

### Database / schema
- `01-QMS-Portal/database/schema.sql`
- `01-QMS-Portal/database/build_schema_snapshot.php`
- `01-QMS-Portal/database/canonical-erp-mes-eqms-7-layer-blueprint.sql`
- `01-QMS-Portal/database/mes-schema-specification.sql`
- `01-QMS-Portal/database/migrations/`

### Runtime / API
- `01-QMS-Portal/api/openapi.yaml`
- `01-QMS-Portal/api/index.php`
- `01-QMS-Portal/api/Router.php`
- Foundation/Governance controllers/services actually used by the public slice

### Registry / generation
- `01-QMS-Portal/qms-data/registry/registry-manifest.json`
- `01-QMS-Portal/qms-data/registry/registry-quality-report.json`
- `01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json`
- `01-QMS-Portal/qms-data/registry/endpoint-catalog.json`
- `01-QMS-Portal/qms-data/registry/schema-library.json`
- `01-QMS-Portal/qms-data/registry/table-registry.json`
- `01-QMS-Portal/qms-data/registry/workflow-library.json`
- `01-QMS-Portal/qms-data/registry/domain-field-packs.json`
- `01-QMS-Portal/qms-data/registry/data-fields-index.json`
- `01-QMS-Portal/tools/registry/add_slice_field_definitions.py`
- `01-QMS-Portal/tools/registry/generate-data-fields-registry.mjs`
- `01-QMS-Portal/tools/registry/generate-enterprise-governance-uplift.mjs`
- `01-QMS-Portal/tools/registry/generate-module-builder-registry.mjs`
- `01-QMS-Portal/tools/registry/generate-registry-v3.mjs`
- `01-QMS-Portal/tools/registry/generate-table-architecture.mjs`
- `01-QMS-Portal/tools/registry/generate-workflow-governance.mjs`
- `01-QMS-Portal/tools/registry/regenerate_slice_publication.py`

### Proof / tests / benchmark
- `01-QMS-Portal/tests/backend_smoke.php`
- `01-QMS-Portal/tests/foundation_governance_contract_smoke.php`
- `01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py`
- `01-QMS-Portal/tools/benchmark/benchmark_schema.sql`
- `01-QMS-Portal/tools/benchmark/fg_benchmark_schema.sql`
- `01-QMS-Portal/tools/benchmark/fg_benchmark_seed.sql`
- `01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql`
- latest `_reports/` artifacts if available locally

### Prompt lineage / docs
- `01-QMS-Portal/docs/ai-prompts/`
- especially the full `prompt-02-foundation-governance-*` cluster and current Prompt 03 bundle

## Hard constraints

- Do not create ghost artifacts.
- Do not claim a file exists unless it is written to the repo.
- Do not patch generated JSON manually if generator logic is the real source.
- Do not hide unresolved blockers by changing labels only.
- Do not convert platform-global metrics into slice metrics or vice versa without explicit scope labeling.
- Do not keep multiple competing publication authorities.
- Do not preserve obsolete prompt debt as active authority.
- Do not call the platform publishable if canonical artifacts still disagree.
- Do not fake benchmark or runtime proof.
- Do not weaken auditability, optimistic concurrency, or workflow truthfulness.

## Required concurrent workstreams

## Workstream A — Single-schema authority closure

You must make the single merged schema phase explicit.

### Required outcomes
1. Declare `01-QMS-Portal/database/schema.sql` as the **executable schema source of truth**.
2. Reclassify:
   - `canonical-erp-mes-eqms-7-layer-blueprint.sql` as reference/architecture artifact
   - `mes-schema-specification.sql` as specification/reference artifact
3. Create both:
   - `01-QMS-Portal/database/schema-authority.md`
   - `01-QMS-Portal/database/schema-authority.json`

### Required content of `schema-authority.json`
- `authoritative_schema_file`
- `reference_schema_files`
- `snapshot_builder`
- `migration_directory`
- `publication_date`
- `authority_scope`
- `notes_on_blueprint_vs_executable_schema`

### Unacceptable outcome
- leaving schema authority implicit after the merge
- allowing generator scripts to read a reference/spec file as if it were executable truth

## Workstream B — Canonical publication authority and metric convergence

You must converge the registry publication package.

### Required outcomes
1. One canonical publication run must drive:
   - `registry-manifest.json`
   - `registry-quality-report.json`
   - `endpoint-catalog.json`
   - `frontend-foundation-catalog.json`
2. Bridge metrics must come from one function / one orchestrator path.
3. Ready/partial/blocked counts must reconcile across canonical artifacts.
4. If `533 entities` and `528 catalog records` are both correct, make the distinction explicit instead of pretending they are the same thing.

### Required new artifact
Create:
- `01-QMS-Portal/qms-data/registry/publication-entity-accounting.json`

It must explain, in machine-readable form:
- total platform entities
- total table-backed catalog records
- any virtual/composite/non-table entities
- why the counts differ (if they differ)

### Preferred target model
Adopt and document:

`global_canonical_plus_slice_summary`

Meaning:
- global canonical artifacts remain platform-global
- slice summaries are separate compact proof artifacts

## Workstream C — Compact proof package and reviewer ergonomics

You must add small GitHub-renderable proof artifacts.

### Required artifacts
Create both platform-global and slice-specific summaries:
- `01-QMS-Portal/qms-data/registry/publication-truth-summary.md`
- `01-QMS-Portal/qms-data/registry/publication-truth-summary.json`
- `01-QMS-Portal/qms-data/registry/foundation-governance-publication-summary.md`
- `01-QMS-Portal/qms-data/registry/foundation-governance-publication-summary.json`

### Required content
For the global summary:
- scope = platform-global
- publication model
- `publication_run_id`
- generated timestamp
- ready / partial / blocked counts
- bridge ready / blocked counts
- publishability verdict
- benchmark mode honesty
- observability mode honesty
- verification commands
- anti-false-green statement
- explicit reference to `publication-entity-accounting.json`

For the slice summary:
- scope = Foundation Governance slice
- exact slice entity count
- exact public route count
- exact internal command count (if applicable)
- slice status
- slice blockers (or `none` if true)
- benchmark / observability honesty
- relation to platform-global truth

### Unacceptable outcome
- only global summary and no slice summary
- only slice summary and no global summary
- summary claims that contradict canonical artifacts

## Workstream D — OpenAPI/runtime convergence

### Required outcomes
1. Upgrade `openapi.yaml` from `3.1.1` to `3.1.2` unless there is a concrete blocker.
2. Keep Foundation/Governance paths truthful to runtime.
3. Preserve or tighten truthful modeling of:
   - `If-Match`
   - `ETag`
   - `application/problem+json`
   - write-route auth semantics requiring session + CSRF
4. Do not expose platform routes that are not actually registered.
5. If there are runtime routes not represented in the public spec and they are intended public APIs, add them.

### Required verification
- spec version must match the proof summary
- if spec claims a route, runtime registration and endpoint catalog must agree
- if spec claims conditional writes or problem details, runtime or contract layer must back it

## Workstream E — Prompt authority reset and lineage clarity

### Required outcomes
1. Add:
   - `01-QMS-Portal/docs/ai-prompts/prompt-lineage-index-2026-04-07.json`
   - `01-QMS-Portal/docs/ai-prompts/CURRENT-PLATFORM-AUTHORITY-2026-04-07.md`
2. Mark the Prompt 02 cluster as historical-but-important.
3. Mark this prompt as the active lane after single-schema merge.
4. Distinguish:
   - historical slice closure prompts
   - current platform convergence prompt
   - future prompts not yet active

### Unacceptable outcome
- keeping all prompts equally “active” by implication
- forcing future sessions to rediscover the current lane from chat history

## Workstream F — Verifiers and proof regeneration

### Required outcomes
1. Add or strengthen a verifier that fails when:
   - publication artifacts disagree on run-id
   - bridge metrics disagree
   - publishability status disagrees
   - global vs slice summary files are missing or stale
   - `publication-entity-accounting.json` is missing when counts differ
   - spec version disagrees with proof summary
2. If local tooling is available, rerun smoke / publication regeneration / benchmark and write honest updated artifacts.
3. If local tooling is not available, do not fake green results; instead produce truthful “artifact-regenerated vs runtime-not-executed” reporting.

## Deliverables

Make the smallest set of changes necessary, but you may touch code, generators, docs, and generated artifacts.

### Required outputs
- updated schema authority artifacts
- updated OpenAPI spec
- regenerated canonical registry artifacts
- `publication-entity-accounting.json`
- platform-global compact summary files
- Foundation Governance slice compact summary files
- prompt lineage / current-authority files
- any strengthened verifier needed
- concise execution report:
  - `01-QMS-Portal/docs/ai-prompts/prompt-03-platform-single-schema-authority-and-global-proof-convergence-execution-report-2026-04-07.md`

## Required final report format

Return:
1. exact files changed
2. whether `database/schema.sql` is now explicitly declared executable schema authority
3. whether manifest/quality/canonical artifacts now agree on one metric model
4. whether `533 vs 528` was reconciled or explicitly explained
5. whether compact global and slice summaries now exist
6. whether `openapi.yaml` is now 3.1.2
7. whether publishability is now truly green or still honestly blocked
8. whether current prompt authority is now explicit in repo docs
9. exact remaining blockers, if any
10. blunt verdict:
   - `PASS — POST-SCHEMA-MERGE PLATFORM PROOF CONVERGED`
   - or `HOLD — AUTHORITY / PROOF CONVERGENCE STILL INCOMPLETE`

## Standards anchors

Anchor implementation and truthfulness to these only where relevant:
- OpenAPI Specification 3.1.2
- RFC 9457
- JSON Schema 2020-12
- OpenTelemetry HTTP semantic conventions
- PostgreSQL transaction isolation / serialization-failure retry reality
- FDA 21 CFR Part 11
- EU GMP Annex 11
- draft direction of new Annex 22 for AI-governed computerized systems
- ISA-95 for enterprise-control integration framing
- NIST AI RMF 1.0 for AI-governed modules when applicable

Again:
- do not reopen architecture
- do not widen scope
- do not write another report package instead of closing truth
- converge the repo into one post-single-schema authority model
