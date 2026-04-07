# Prompt 08 — Public-Repo Truth Convergence and Global Release Proof
_Date: 2026-04-07_

You are working inside `sanhvo86-hesem/hesemqms`.

## Non-negotiable instruction

Do **not** trust prior chat summaries, prior PASS claims, or prior agent narratives.

Your only authority is:

1. the actual repo tree at `main`
2. the actual contents of files in the repo at `main`
3. generated artifacts you create in this run
4. code + registry + proof that can be committed and pushed

If the repo cannot prove a claim, you must **not** claim it.

---

## Objective

Close the remaining highest-severity platform gap:

> **Public-repo truth does not match claimed publishability status.**

You must make the public repo itself become the single source of truth for:
- publication scope
- ready/partial/blocked counts
- workflow bridge counts
- OpenAPI version
- compact publication proof
- prompt lineage persistence
- artifact existence

This prompt is **not** a planning prompt.
It is an **implementation + publication-convergence prompt**.

---

## Public-repo facts that must be treated as current truth before you change anything

At the moment the public repo still shows all of the following:

- `01-QMS-Portal/api/openapi.yaml` still says `openapi: "3.1.1"`
- `01-QMS-Portal/qms-data/registry/registry-manifest.json` still says:
  - `slice_publication_pass = foundation_governance_contract_slice`
  - `workflow_engine_bridge.ready = 103`
  - `workflow_engine_bridge.blocked = 12`
  - `frontend_foundation.ready_entities = 425`
  - `frontend_foundation.partial_entities = 108`
  - `frontend-foundation-catalog.json.records = 528`
- `01-QMS-Portal/qms-data/registry/registry-quality-report.json` still says:
  - `slice_publication_pass = foundation_governance_contract_slice`
  - `workflow_engine_bridge_ready = 104`
  - `workflow_engine_bridge_blocked = 11`
  - `frontend_ready_entities = 425`
  - `frontend_partial_entities = 108`
  - `publishability_ready = false`
- the public `qms-data/registry/` tree does **not** currently prove presence of:
  - `publication-truth-summary.json`
  - `prompt-lineage-index-2026-04-07.json`
  - `wave-gap-ledger.json`
- the public `tools/registry/` tree does **not** currently prove presence of:
  - `canonical_publication_orchestrator.py`
  - `resolve_all_bridge_blockers.py`
  - `close_partial_entities.py`
- the public `docs/ai-prompts/` tree does **not** currently prove presence of:
  - Prompt 05
  - Prompt 06
  - Prompt 07
  - Prompt 07 execution report

These are the gaps you must close **in the repo itself**.

---

## Your mission

Deliver a repo state where a public reviewer opening GitHub `main` can verify the truth **without chat history**.

You must either:

### Path A — prove global publishability for real
or

### Path B — keep the repo honestly non-global, but fully consistent and reviewable

Both are acceptable.

Dishonest PASS is forbidden.

---

## Hard requirements

### A. Public-repo publication authority
Create or finalize **one canonical publication entrypoint** that generates all canonical artifacts in one run with one `publication_run_id`.

Allowed outcome:
- one Python or Node entrypoint, but it must exist in the public tree

Examples:
- `01-QMS-Portal/tools/registry/canonical_publication_orchestrator.py`
- or another clearly named canonical script

Requirements:
- must generate all canonical publication artifacts
- must stamp one shared `publication_run_id`
- must stamp one shared `generatedAt`
- must be the authority for:
  - `registry-manifest.json`
  - `registry-quality-report.json`
  - `endpoint-catalog.json`
  - `frontend-foundation-catalog.json`
  - any compact truth summary files
- if you choose not to add a new orchestrator file, you must remove all claims that such an orchestrator exists and make one existing script the explicit canonical entrypoint

### B. Metric parity
After regeneration, these canonical artifacts must agree exactly:

- `registry-manifest.json`
- `registry-quality-report.json`
- `endpoint-catalog.json`
- `frontend-foundation-catalog.json`
- any compact truth summary you add

At minimum, the following numbers must reconcile:
- entity count
- ready / partial / blocked counts
- workflow bridge ready / blocked / unneeded
- endpoint count
- field definition count
- publication scope
- publication_run_id
- generatedAt

No split-truth is allowed.

### C. OpenAPI must be truthful and current
If the runtime contract is intended to be 3.1.2, then:
- upgrade `01-QMS-Portal/api/openapi.yaml` to **3.1.2 for real**
- revalidate references and syntax
- keep existing RFC 9457 problem responses
- keep `If-Match` and `ETag` semantics where required

If there is a blocker that prevents 3.1.2 in repo truth, state it honestly and do not claim the upgrade.

### D. Entity accounting closure
Close the current `533` vs `528` accounting gap.

You must choose exactly one:
1. make `frontend-foundation-catalog.json` truly cover all 533 entities, or
2. keep 528 actual frontend records but add explicit machine-readable exclusion accounting for the missing 5, with reason codes and counts, and make manifest/quality-report reflect that rule consistently

The gap must become explainable and machine-verifiable.

### E. Public compact proof artifact
Add a compact GitHub-renderable proof file under:

`01-QMS-Portal/qms-data/registry/publication-truth-summary.json`

This file must be small enough to render in GitHub UI and must include:
- repo truth version
- generatedAt
- publication_run_id
- publication_scope
- openapi_version
- entity_count
- frontend_ready_entities
- frontend_partial_entities
- frontend_blocked_entities
- workflow_engine_bridge_ready
- workflow_engine_bridge_blocked
- publishability_ready
- list of failing gates if not publishable
- list of produced canonical artifacts
- hashes or byte sizes for major artifacts if practical

Do not create a marketing summary.
Create a machine-reviewable truth summary.

### F. Prompt lineage persistence
Create:

`01-QMS-Portal/qms-data/registry/prompt-lineage-index-2026-04-07.json`

This file must index the actual prompt lineage files that exist in the repo:
- prompt id
- filename
- date
- role (`prompt`, `evaluation`, `execution-report`, `package`, etc.)
- predecessor prompt
- successor prompt if known
- exists_in_repo = true

Do **not** include nonexistent files.
If Prompt 05/06/07 docs are missing from the repo, either:
- add them to `01-QMS-Portal/docs/ai-prompts/`, or
- mark them absent and do not pretend the lineage is complete

Preferred outcome:
- actually add the missing Prompt 05/06/07 files and the execution report

### G. Artifact existence gate
Add a publication gate that fails when any claimed artifact is missing from the public repo tree.

Implement either:
- a test
- or a verifier script
- or both

Minimum checks:
- every file named in compact proof exists
- every file named in prompt lineage index exists
- all canonical publication files exist
- if a metric summary references a helper script, that script exists

### H. Publishability truthfulness
Rules:
- `publication_scope = platform_global` is allowed **only if**:
  - partial entities = 0
  - blocked entities = 0
  - workflow bridge blocked = 0
  - publishability_ready = true
  - all canonical artifacts agree
- otherwise keep scope honest:
  - `foundation_governance_contract_slice`
  - or `platform_review_required`
  - or another truthful state

No “PASS” wording unless the repo actually proves it.

### I. Optional real closure path
If you can genuinely close the remaining readiness gaps in this run, do it.

That means:
- eliminate the current 108 partial entities **for real**
- eliminate workflow bridge blocked counts **for real**
- regenerate everything
- then move scope to platform-global only if proof supports it

But do not fake this through summary files only.
The underlying registry/generator truth must change.

### J. GitHub web reviewer ergonomics
Because `frontend-foundation-catalog.json` is too large for GitHub to render inline, add one or both:
- `publication-truth-summary.json`
- `publication-truth-summary.md`

If you add a markdown summary, it must mirror the JSON truth, not drift from it.

---

## Files you are allowed and expected to change

You may change any necessary files, especially:

- `01-QMS-Portal/api/openapi.yaml`
- `01-QMS-Portal/qms-data/registry/*.json`
- `01-QMS-Portal/tools/registry/*`
- `01-QMS-Portal/docs/ai-prompts/*`
- `01-QMS-Portal/tests/*`
- `_reports/*` if needed for proof

---

## Standards and truth anchors to follow

Use these as the contract baseline:

- OpenAPI Specification **3.1.2**
- RFC **9457** Problem Details
- JSON Schema **2020-12**
- OpenTelemetry semantic conventions
- ISA-95 for ERP↔MES architectural vocabulary
- FDA 21 CFR Part 11 expectations for trustworthy electronic records/signatures
- EU GMP Annex 11 expectations for computerized systems
- NIST AI RMF 1.0 for any AI-governed platform behavior

Do not bloat the output with theory.
Use these standards only where they materially affect repo truth, evidence, or contract.

---

## Required output in this run

You must produce:

1. real code / script / registry / prompt file changes
2. regenerated canonical artifacts
3. compact publication truth summary
4. prompt lineage index
5. artifact existence verifier
6. honest execution report:
   - what changed
   - exact before/after numbers
   - whether platform_global was truly achieved
   - if not, what remains and why
7. commit and push all changes

---

## Required acceptance criteria

This run is only successful if all of the following are true in the repo:

### Repository truth criteria
- public tree contains the newly claimed files
- manifest and quality report share the same `publication_run_id`
- manifest and quality report share the same `generatedAt`
- no contradictory ready/partial/blocked or bridge metrics remain
- compact proof file exists and is renderable
- prompt lineage index exists and references real files only

### OpenAPI criteria
- `openapi.yaml` version is truthful
- problem detail / concurrency semantics remain intact

### Publication criteria
- if `platform_global`, then all publishability blockers are zero
- if blockers remain, scope stays honest and compact proof names them explicitly

### Anti-false-green rule
The run fails if:
- chat summary says PASS but repo files say otherwise
- claimed files are not present in repo
- counts diverge across canonical artifacts
- scope says global while publishability is false

---

## Final instruction

Act like a release engineer and a skeptical auditor, not a storyteller.

The public repo at `main` must become sufficient evidence on its own.
