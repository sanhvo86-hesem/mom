# Prompt 06 — Global Publication Authority, Registry Truth Reconciliation, Column Closure, and Final Wave Execution (2026-04-07)

You are working inside the `sanhvo86-hesem/hesemqms` repo.

This is **not** a planning pass.
This is **not** a report-writing pass.
This is an **implementation + truth-reconciliation + proof** pass.

Your job is to read the repo as it exists now, identify the real current state from code and generated artifacts, then close the remaining platform gaps as far as the repo truth actually allows.

You must behave like a senior platform engineer + manufacturing systems architect + validation/governance lead.
Do not market. Do not smooth over contradictions. Do not invent readiness.
If an artifact, metric, or capability is not actually in the repo after your changes, you must not claim it exists.

---

## 0. Read this first — current repo-truth that you must treat as authoritative until you regenerate it

Before changing anything, re-read at minimum:

- `01-QMS-Portal/api/openapi.yaml`
- `01-QMS-Portal/qms-data/registry/registry-manifest.json`
- `01-QMS-Portal/qms-data/registry/registry-quality-report.json`
- `01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json`
- `01-QMS-Portal/qms-data/registry/endpoint-catalog.json`
- `01-QMS-Portal/qms-data/registry/table-registry.json`
- `01-QMS-Portal/qms-data/registry/domain-field-packs.json`
- `01-QMS-Portal/qms-data/registry/workflow-library.json`
- `01-QMS-Portal/tools/registry/generate-module-builder-registry.mjs`
- `01-QMS-Portal/tools/registry/regenerate_slice_publication.py`
- the full Prompt 03 bundle in `01-QMS-Portal/docs/ai-prompts/`
- the currently committed master orchestrator package in `01-QMS-Portal/docs/ai-prompts/`

Assume previous narrative summaries may be wrong.
Use the repo state itself as the source of truth.

At the start of your run, create a short machine-readable truth snapshot from the repo **before** you mutate anything.

---

## 1. Non-negotiable findings you must verify and reconcile

The repo state before your changes is expected to still show contradictions like these. Verify them yourself; do not blindly trust this list:

1. `openapi.yaml` may still be on `3.1.1`, not `3.1.2`.
2. `registry-manifest.json` and `registry-quality-report.json` may share one `publication_run_id` but still disagree on overlapping metrics.
3. Current publication scope may still be **slice-scoped**, e.g. `foundation_governance_contract_slice`, not platform-global.
4. The platform may still be globally **not publishable** because partial entities and workflow bridge blockers remain.
5. `frontend_foundation_entities` may be counted as `533` while `frontend-foundation-catalog.json` records are `528`, meaning accounting still needs explicit reconciliation.
6. `workflow_engine_bridge` counts may still differ between manifest and quality report.
7. Files previously claimed in narrative may still be absent or not surfaced in the committed tree, for example:
   - `wave-gap-ledger.json`
   - `canonical_publication_orchestrator.py`
   - `resolve_all_bridge_blockers.py`
   - publication truth verifier artifacts
8. The repo may still have a split between:
   - registry truth
   - frontend truth
   - publication truth
   - benchmark/proof truth

Your mission is to eliminate that split.

---

## 2. Primary objective

Create a **single, global, canonical publication authority** for the ERP/MES/eQMS platform and use it to drive the registry, frontend foundation contract, publication proof, and gap ledger.

After this run, the platform must end in **one** of only two acceptable states:

### State A — Full success
- platform-global publication authority exists
- all overlapping metrics across manifest / quality report / endpoint catalog / frontend foundation catalog reconcile
- `publishability.ready = true`
- workflow bridge blockers = `0`
- partial frontend entities = `0`
- any claimed benchmark/proof artifacts are fresh and tied to the same run

### State B — Honest constrained state
If you cannot reach State A because a remaining blocker is genuinely non-automatable from repo-local evidence alone, you may stop **only if**:
- all automatable inconsistencies are fixed
- all false-green claims are removed
- every remaining blocker is recorded in a machine-readable ledger with exact entity/workflow/file references
- the final output explicitly says the platform is **not yet globally publishable**
- you provide the narrowest possible blocker set

Anything between A and B with fuzzy claims is a failure.

---

## 3. What you must implement

### 3.1 Create one canonical platform publication entrypoint

Add a new canonical orchestrator, for example:

- `01-QMS-Portal/tools/registry/canonical_publication_orchestrator.py`

This script must become the single entrypoint that regenerates all platform publication artifacts that are supposed to agree with each other.

At minimum it must regenerate or verify, from one execution context and one run id:

- `data-fields-index.json`
- `endpoint-catalog.json`
- `frontend-foundation-catalog.json`
- `registry-manifest.json`
- `registry-quality-report.json`
- `wave-gap-ledger.json`
- publication truth verifier output
- latest aliases for proof artifacts when applicable

Every artifact produced in the same run must carry:
- identical `publication_run_id`
- identical or derivably consistent `generatedAt`
- explicit `publication_scope` or equivalent truth field

Do **not** leave publication split across partially independent helper scripts without one authoritative entrypoint.

---

### 3.2 Create a publication truth verifier

Add a verifier, for example:

- `01-QMS-Portal/tools/registry/publication_truth_verifier.py`

And produce machine-readable output, for example:

- `_reports/publication-truth-verifier-2026-04-07.json`
- `_reports/publication-truth-verifier-latest.json`

The verifier must fail if any of the following are inconsistent:

- manifest vs quality-report overlapping metrics
- frontend entity totals vs frontend catalog coverage totals
- workflow bridge metrics across artifacts
- endpoint counts across artifacts
- publication scope claims across artifacts
- run id mismatch
- stale artifact reuse
- missing artifacts that are referenced by another artifact
- claimed-ready while blocker ledger still exists

This verifier must replace hand-wavy narrative with executable truth.

---

### 3.3 Reconcile the 533 vs 528 accounting gap

This is a hard requirement.

If the platform truly has `533` frontend-foundation entities but only `528` table-backed catalog records, you must make the difference explicit and machine-readable.

Create an explicit accounting model such as:
- `table_backed_entities`
- `non_table_entities`
- `derived_entities`
- `virtual_entities`
- `document_entities`

Whatever the truth is, encode it clearly and make totals reconcile exactly.

After this run, these numbers must not merely “look okay”. They must add up deterministically.

---

### 3.4 Reconcile workflow bridge metrics and close blockers

Today there may still be a mismatch such as `103/12` in one artifact and `104/11` in another.
That is unacceptable.

You must:

1. define a canonical algorithm for workflow bridge classification
2. use it from one source of truth
3. regenerate all affected artifacts from that same logic
4. close as many blocked bridges as possible with real implementation work
5. remove any false bridge-ready status if the runtime is not actually bridged

If a workflow remains blocked, it must be blocked everywhere consistently.
If it becomes bridged, it must be bridged everywhere consistently.
No split truth.

---

### 3.5 Create a real `wave-gap-ledger.json`

Add a machine-readable ledger in:

- `01-QMS-Portal/qms-data/registry/wave-gap-ledger.json`

This ledger must enumerate **every** remaining non-ready entity and workflow blocker.
For each entry include at minimum:

- `kind`: `entity` | `workflow_bridge` | `artifact` | `infrastructure`
- `key`
- `bounded_context`
- `table`
- `reason_code`
- `reason_detail`
- `closure_mode`
- `wave`
- `severity`
- `frontend_impact`
- `runtime_impact`
- `publishability_impact`
- `required_changes`
- `automatable`: true/false
- `evidence`

Reason codes must be precise, e.g.:
- `missing_record_timestamps`
- `missing_operation_context`
- `missing_execution_status`
- `missing_traceability_identity`
- `missing_planning_time_axis`
- `missing_planning_resource_axis`
- `missing_planning_status_axis`
- `missing_attachment_contract`
- `workflow_state_model_mismatch`
- `manual_domain_decision_required`
- `infrastructure_collector_absent`

Do not summarize only. Enumerate exhaustively.

---

### 3.6 Close the remaining partial entities by actual implementation, not by narration

Do not stop at reclassifying.
For the remaining partial entities, attempt actual closure in this order:

#### A. Schema / registry / contract closure
Where missing readiness is caused by absent canonical columns or mappings that should exist, implement them.
That may include:
- SQL migrations
- registry updates
- schema-library updates
- field definitions
- pack family completion
- endpoint contract completion
- workflow metadata completion
- relation map completion
- validation rules

#### B. Backfill / defaulting
Where safe and canonical, backfill new columns using deterministic defaults and migration logic.
Do not invent business meaning silently.

#### C. Honest downgrade
If a capability should **not** exist for a given entity, do not pretend it is partial for a missing feature that is actually out-of-scope.
Instead explicitly encode that the capability is not applicable.

The goal is not to game the ready count.
The goal is to make the contract model true.

---

### 3.7 Specifically attack the common blocker families

You are expected to actively reduce the remaining partial set by addressing the known recurring families, including if necessary by adding migrations and canonical mappings for affected tables:

- timestamps
- operation context
- execution status
- traceability identity
- planning time/status/resource fields
- attachment contracts
- workflow state model mismatch

Do not merely relabel these blockers.
Close them where the domain clearly requires them.

---

### 3.8 Upgrade OpenAPI truth and align it with runtime truth

If the repo still says `openapi: 3.1.1`, either:
- upgrade it to `3.1.2` and keep everything valid, or
- keep `3.1.1` and remove any claim that it is already `3.1.2`

Preferred: upgrade to `3.1.2`.

But the more important requirement is **truth**:
- the file version must match the claim
- error model must remain RFC 9457-based
- optimistic concurrency / `If-Match` / `ETag` semantics must not drift
- blocked transitions must not be exposed as ready actions in registry/frontend artifacts

Do not touch OpenAPI cosmetically only. Keep it aligned with actual runtime and publication truth.

---

### 3.9 Add fresh proof artifacts tied to the same run

Add fresh, machine-readable proof artifacts for this run.
At minimum:

- `_reports/publication-truth-verifier-<date>.json`
- `_reports/publication-truth-verifier-latest.json`
- `_reports/backend-runtime-benchmark-<date>.json`
- `_reports/backend-runtime-benchmark-latest.json`
- `_reports/observability/platform-publication-observability-proof.json`

If observability is still only `file_export_only`, keep it honest.
But the artifact must be fresh and tied to the same publication run.

Benchmarking must be honest.
If you only ran a stability probe, say so.
Do not call it production-load proof.

---

### 3.10 Harden smoke/proof so split truth cannot survive

Upgrade smoke/proof scripts so they fail on:

- stale generated artifacts
- run id mismatch
- metrics mismatch across publication artifacts
- slice scope falsely claimed as global
- bridge blocker counts mismatch
- 533 vs 528 unresolved accounting
- missing gap ledger when partial entities remain
- publishability claimed true while blockers remain

The smoke/proof layer must be strong enough to prevent another false-green summary.

---

## 4. AI governance and critical-use controls

This repo is explicitly building toward ERP + MES + eQMS authority.
Any AI-related functionality must be governed accordingly.

If the repo currently exposes or plans AI-assisted generation, classification, recommendation, or approval support, add a concise but enforceable governance artifact, for example:

- `01-QMS-Portal/docs/ai-governance/critical-use-policy.md`

This policy must at minimum encode:

- AI is **non-authoritative** for regulated / approval / release / compliance-critical decisions unless explicitly validated and approved
- Generative AI / LLM output must require human review before becoming canonical record content in critical workflows
- Auditability, traceability, prompt/version provenance, and human approver capture are mandatory
- Model changes are under change control
- Non-deterministic models must not be silently used as decision authority in GMP-like critical flows

For life-science-grade forward compatibility, use current EC draft Annex 11 / draft Annex 22 expectations as forward-looking hardening input, but do not misstate draft guidance as final binding law.

---

## 5. Standards anchor — use these correctly

Use these as the normative or strategic anchor for your decisions where relevant:

- OpenAPI 3.1.2
- RFC 9457 problem details
- JSON Schema Draft 2020-12
- OpenTelemetry semantic conventions
- PostgreSQL transaction isolation and concurrency correctness
- ISA-95 for ERP↔MES information boundary discipline
- FDA 21 CFR Part 11 for electronic records/signatures controls
- EU GMP Annex 11 for computerised systems controls
- current EC draft revision of Annex 11 and draft Annex 22 as forward-looking hardening input only
- NIST AI RMF 1.0 for AI risk governance

Use standards to increase truth and control.
Do not use them as decoration.

---

## 6. Output discipline

Do **not** produce another giant planning bundle.

You may create only the minimum documentation needed to make this run auditable:

### Required docs
- one short deep-evaluation note for this run
- one short implementation/output note for this run

Preferred names:
- `01-QMS-Portal/docs/ai-prompts/prompt-06-global-publication-authority-and-wave-closure-deep-evaluation-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-06-global-publication-authority-and-wave-closure-output-2026-04-07.md`

These notes must be concise, evidence-backed, and reflect the actual final repo state after regeneration.

No architecture novella.
No marketing language.

---

## 7. Final acceptance gates

Your run is successful only if **all** of the following are true:

1. one canonical publication orchestrator exists and is used
2. publication truth verifier exists and passes on the regenerated artifacts
3. manifest and quality-report match on all overlapping metrics
4. frontend entity accounting reconciles exactly
5. workflow bridge counts reconcile exactly
6. openapi version claim matches the actual file
7. `wave-gap-ledger.json` exists and is exhaustive if anything remains non-ready
8. fresh proof artifacts exist and share the same run correlation where appropriate
9. smoke/proof catches split-truth conditions
10. final output states either:
   - **global publishability achieved**, or
   - **global publishability not yet achieved**, with exact blocker ledger

If anything remains partial or blocked, the output must be explicit and machine-readable.

---

## 8. Working style constraints

- Make changes directly in code, generators, schemas, registry artifacts, migrations, and proof scripts.
- Do not stop after writing analysis.
- Do not fabricate files that are not then committed.
- Do not fabricate metrics.
- Do not claim a file exists unless it is in the tree at the end.
- Prefer deleting stale or misleading claims rather than preserving false optimism.
- Prefer platform-global truth over slice-local convenience.

---

## 9. Deliver the result

When done, provide:

1. a blunt final verdict
2. exact changed files
3. before vs after metrics from regenerated artifacts
4. whether global publishability is now true or false
5. if false, the exact remaining blocker counts by reason code
6. which proof artifacts were freshly generated in this run

No hype. Just truth.
