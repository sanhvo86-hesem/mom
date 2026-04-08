# Prompt 02 Foundation Governance Self-Healing Release-Candidate Closure Loop Prompt (2026-04-07)

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Objective

Close **all remaining fixable findings inside the Foundation Governance slice** and do not stop after the first repair pass.

This prompt is a **self-healing closure loop**. It is not a planning prompt.
It is not a platform-global prompt.
It is not a Prompt 03 prompt.
It is the final narrow pass that should make the Foundation Governance slice:

- repo-committed,
- self-proving,
- release-candidate truthful,
- and ready for Prompt 03 re-audit.

## Primary authority order

Use authority in this exact order:

1. current repo code and generated artifacts
2. `prompt-02-foundation-governance-self-healing-release-candidate-closure-loop-deep-evaluation-2026-04-07.md`
3. `prompt-02-foundation-governance-release-candidate-truth-convergence-deep-evaluation-2026-04-07.md`
4. `prompt-02-foundation-governance-release-candidate-truth-convergence-and-live-proof-prompt-2026-04-07.md`
5. earlier Prompt 02 documents only as historical context

If any earlier prompt, report, or chat summary conflicts with the current repo, **repo truth wins**.

## Scope lock

This prompt is only allowed to touch the Foundation Governance slice and the minimum shared generation/proof infrastructure needed to make that slice truthful.

Allowed domains:
- `foundation.organization`
- `foundation.party`
- `foundation.calendar`
- `governance.approval_group`
- governance attachment / timeline surfaces directly required by approval-group UX and proof
- slice publication generators / verifiers / compact summary artifacts

Not allowed:
- platform-global wave planning
- ERP / MES broad redesign
- new architecture decks
- generic “future roadmap” documents
- changing unrelated entity families just to improve metrics cosmetically

## Mandatory repo inputs

### Runtime / API
- `01-QMS-Portal/api/index.php`
- `01-QMS-Portal/api/Router.php`
- `01-QMS-Portal/api/openapi.yaml`
- `01-QMS-Portal/api/controllers/ApprovalGroupController.php`
- `01-QMS-Portal/api/controllers/MasterDataController.php`
- `01-QMS-Portal/api/controllers/EvidenceController.php`
- `01-QMS-Portal/api/services/ApprovalGroupService.php`
- `01-QMS-Portal/api/services/ApprovalWorkflowAdapter.php`
- `01-QMS-Portal/api/services/FoundationGovernanceService.php`
- `01-QMS-Portal/api/services/EvidenceVaultService.php`
- `01-QMS-Portal/api/services/SliceObservability.php`
- `01-QMS-Portal/api/services/GenericCrudService.php`
- `01-QMS-Portal/api/services/WorkflowEngine.php`

### Registry / generation / publication
- `01-QMS-Portal/qms-data/registry/endpoint-catalog.json`
- `01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json`
- `01-QMS-Portal/qms-data/registry/registry-manifest.json`
- `01-QMS-Portal/qms-data/registry/registry-quality-report.json`
- `01-QMS-Portal/qms-data/registry/domain-field-packs.json`
- `01-QMS-Portal/qms-data/registry/workflow-library.json`
- `01-QMS-Portal/qms-data/registry/data-fields-index.json`
- `01-QMS-Portal/tools/registry/generate-module-builder-registry.mjs`
- `01-QMS-Portal/tools/registry/generate-workflow-governance.mjs`
- `01-QMS-Portal/tools/registry/regenerate_slice_publication.py`
- `01-QMS-Portal/tools/registry/add_slice_field_definitions.py`
- any shared helper invoked by these tools

### Proof / tests / reports
- `01-QMS-Portal/tests/foundation_governance_contract_smoke.php`
- `01-QMS-Portal/tools/benchmark/run_runtime_benchmark.py`
- `01-QMS-Portal/tools/benchmark/fg_benchmark_schema.sql`
- `01-QMS-Portal/tools/benchmark/fg_benchmark_seed.sql`
- `01-QMS-Portal/tools/benchmark/foundation_governance_contract_read_mix.sql`
- latest `_reports/backend-runtime-benchmark-*.json`
- latest `_reports/observability/*` relevant to this slice

### Prompt lineage docs that must now exist in repo
- `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-release-candidate-truth-convergence-deep-evaluation-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-release-candidate-truth-convergence-and-live-proof-prompt-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-self-healing-release-candidate-closure-loop-deep-evaluation-2026-04-07.md`
- this prompt file itself

If any of the four files above is missing from the repo at the start of execution, create/land it first.

## Hard constraints

- Do **not** create ghost artifacts.
- Do **not** claim success from chat memory.
- Do **not** stop after the first successful patch if a second inspection still finds a fixable issue.
- Do **not** claim Prompt 03 readiness until the repo itself proves it.
- Do **not** claim global publishability.
- Do **not** patch generated JSON manually unless the generator itself is the subject of the change and then regenerate cleanly.
- Do **not** hide disagreement by deleting evidence of disagreement without replacing it with regenerated truth.
- Do **not** regress current OpenAPI hardening (`If-Match`, `ETag`, `application/problem+json`, AND security semantics).
- Do **not** keep stale summary or benchmark files with misleading timestamps or names if you rerun generation.
- Do **not** leave top-level and nested readiness states contradictory.
- Do **not** return `PASS` while `publication_run_id` or metric drift still exists across canonical artifacts.

## Workstreams

### A — Land the missing release-candidate documentation in the repo

Before doing anything else:

1. ensure the four required prompt files listed above are present in `01-QMS-Portal/docs/ai-prompts/`;
2. update any local index / prompt-chain helper if one exists so these files are discoverable;
3. do not merely mention them in a report — they must physically exist in the repo tree.

### B — Converge public publication truth into one authoritative run

You must make the following agree from one authoritative regeneration path:

- `endpoint-catalog.json`
- `frontend-foundation-catalog.json`
- `registry-manifest.json`
- `registry-quality-report.json`
- `publication-truth-summary.md`
- `publication-truth-summary.json`

They must converge on at least:

- `publication_run_id`
- generation timestamp family
- ready / partial / blocked counts
- workflow bridge ready / blocked counts
- publication scope label
- explicit status of `governance.approval_group`

If one generator produces 419/114 and another produces 425/108, or 103/12 vs 104/11, fix the generator / summary logic and regenerate.

### C — Close every remaining fixable `governance.approval_group` truth gap

You must inspect the entity as represented across:

- endpoint catalog
- frontend foundation catalog
- manifest summary
- quality report
- openapi
- runtime code

Required closure domains:
- overall verdict
- workflow readiness truth
- field definitions
- detail layout / sections
- pack-family mapping
- attachments / timeline support truth
- activity / comments support truth if exposed
- nested readiness coherence

If full closure is achievable, mark it `ready` consistently.
If not, keep it `partial`, but every artifact must expose the same blockers.

### D — Add compact, GitHub-renderable proof artifacts

Create and maintain:

- `01-QMS-Portal/qms-data/registry/publication-truth-summary.md`
- `01-QMS-Portal/qms-data/registry/publication-truth-summary.json`

These must be small enough for easy web review and include:

- slice name
- publication scope
- `publication_run_id`
- generated timestamp
- ready / partial / blocked counts
- workflow bridge ready / blocked counts
- `governance.approval_group` status
- benchmark mode
- observability mode
- verification commands
- anti-false-green statement
- prompt lineage reference (at minimum, the exact prompt file that produced this run)

### E — Preserve and prove contract truth in OpenAPI

OpenAPI currently already contains important hardening. Do not regress it.

Acceptable outcomes:

#### Option 1 — keep 3.1.1 truthfully
If runtime/supporting tools are still anchored to `3.1.1`, keep it there but ensure:
- `If-Match` is modeled only where required,
- `ETag` is modeled only where actually emitted,
- RFC 9457 problem responses are truthful,
- `sessionCookie + csrfHeader` remains modeled as AND,
- summary artifacts state the actual spec version.

#### Option 2 — upgrade cleanly to 3.1.2
Only do this if the repo and tooling are actually ready and you verify no contract drift is introduced.

Unacceptable:
- spec version says one thing while summary says another,
- runtime supports headers/media types that spec omits,
- spec claims headers/media types not supported by runtime.

### F — Strengthen verifier from “smoke” to “release-candidate integrity gate”

`foundation_governance_contract_smoke.php` must fail on:

- missing required release-candidate docs,
- missing compact summary artifacts,
- mismatched `publication_run_id` across canonical artifacts,
- mismatched ready / partial / blocked / bridge counts,
- stale summary files not tied to latest run,
- `governance.approval_group` top-level vs nested contradiction,
- spec version mismatch versus summary,
- summary claims publishable while quality report says review required,
- missing benchmark artifact if benchmark was rerun,
- missing observability proof artifact if summary references one.

Use actual artifact parsing; do not rely on brittle presence-only string checks.

### G — Keep benchmark and observability honest

Benchmark:
- keep current mode honest (`stability_probe` unless you truly run something stronger),
- refresh output artifact if rerun,
- avoid misleading old filenames if possible,
- correlate benchmark reference from compact summary.

Observability:
- keep `file_export_only` if that is the truth,
- add or refresh a compact proof artifact for approval decision + canonical writes where available,
- do not claim collector-backed telemetry unless actually proven.

### H — Mandatory self-healing second pass

After implementing A through G, you must do a second pass inside the same run:

1. re-open the repo tree paths for the newly added docs,
2. re-open the compact summary artifacts,
3. re-open manifest and quality report,
4. compare their metrics again,
5. re-open the approval-group entity representation,
6. re-run the verifier(s),
7. if any fixable finding remains in scope, fix it and regenerate again.

You may stop only when:
- no in-scope fixable finding remains, or
- the remaining blocker is clearly irreducible in the same run and is documented precisely.

## Deliverables

Required repo outputs after completion:

- landed prompt docs listed in this prompt
- regenerated canonical publication artifacts
- `publication-truth-summary.md`
- `publication-truth-summary.json`
- updated verifier / smoke gate
- refreshed observability proof artifact if referenced
- refreshed benchmark artifact if rerun
- concise execution report:
  - `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-self-healing-release-candidate-closure-loop-execution-report-2026-04-07.md`

## Required final report format

Return only:

1. exact files changed
2. whether the missing release-candidate docs are now present in the repo tree
3. whether the six public truth artifacts now share one `publication_run_id`
4. exact ready / partial / blocked / bridge counts after regeneration
5. whether `governance.approval_group` is now `ready` or still `partial`
6. whether compact summary artifacts now exist and are GitHub-renderable
7. whether OpenAPI stayed at 3.1.1 or moved to 3.1.2
8. whether the second self-healing pass found extra issues and whether they were closed
9. exact remaining blockers, if any
10. blunt verdict:
   - `PASS FOR PROMPT 03 RE-AUDIT`
   - or `HOLD — FOUNDATION GOVERNANCE NOT YET RELEASE-CANDIDATE CLOSED`

## Standards anchors

Use these as the truth anchors where applicable:
- OpenAPI Specification 3.1.2
- RFC 9457
- JSON Schema 2020-12
- OpenTelemetry semantic conventions for HTTP/log correlation
- PostgreSQL Serializable / retry reality
- FDA 21 CFR Part 11
- EU GMP Annex 11

This is the last narrow Prompt 02 closure loop.  
Do not expand scope.  
Do not stop early.
