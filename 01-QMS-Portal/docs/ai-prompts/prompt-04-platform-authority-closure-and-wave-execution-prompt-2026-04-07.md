# Prompt 04 — Platform Authority Closure, Approval-Group Metadata Finalization, Observability Proof, and Wave Execution

**Date:** 2026-04-07  
**Target repo:** `sanhvo86-hesem/hesemqms` → `01-QMS-Portal`  
**This prompt comes after:** Prompt 03 bundle is already present in the repo. Do **not** restart broad planning. Do **not** produce another loose architecture memo.  
**Primary objective:** Close the remaining truth gaps so the platform can move from “strong foundation + partial frontend readiness” to **serious, scalable, authority-driven execution**.

---

## 0) Non-negotiable operating stance

You are **not** being asked to write another general report.

You must:

1. **Read the repo first** and treat the repo as the source of truth.
2. **Read all Prompt 03 artifacts already in the repo** before touching anything else.
3. **Assume all remaining blockers are real until disproven repo-locally.**
4. **Implement code, generators, registries, tests, and proof artifacts** where needed.
5. **Fail closed, publish truthfully, and never create “ready/green” metadata that runtime cannot support.**
6. **Do not claim frontend-ready, workflow-ready, observable, or publish-complete unless the repo proves it end-to-end.**
7. **Do not create another planning loop.** This prompt is an **implementation + regeneration + proof** prompt.

If something is still blocked after you inspect the repo, then:
- runtime must say blocked,
- catalogs must say blocked,
- frontend metadata must say blocked,
- registry quality/gate artifacts must say blocked,
- and smoke/publish gates must fail or degrade honestly.

No split truth. No false green. No “GO WITH CONDITIONS” hand-waving unless every condition is machine-readable and explicitly gate-tracked.

---

## 1) Repo state you must start from

Before making changes, read these existing inputs in the repo.

### Prompt / audit / architecture inputs
- `01-QMS-Portal/docs/ai-prompts/prompt-03-platform-re-audit-and-gap-matrix-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-03-world-class-reference-architecture-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-03-domain-map-and-entity-catalog-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-03-frontend-contract-authority-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-03-screen-and-field-definition-catalog-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-03-foundation-governance-slice-re-audit-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-03-foundation-governance-slice-re-audit-output-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-03-priority-waves-and-frontend-readiness-plan-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-03-erp-mes-eqms-domain-closure-and-frontend-readiness-2026-04-07.md`

### Runtime / contract / registry inputs
- `01-QMS-Portal/api/openapi.yaml`
- `01-QMS-Portal/api/controllers/ApprovalGroupController.php`
- `01-QMS-Portal/api/controllers/MasterDataController.php`
- `01-QMS-Portal/api/services/ApprovalGroupService.php`
- `01-QMS-Portal/api/services/ApprovalWorkflowAdapter.php`
- `01-QMS-Portal/api/services/FoundationGovernanceService.php`
- `01-QMS-Portal/api/services/SliceObservability.php`
- `01-QMS-Portal/api/services/WorkflowEngine.php`
- `01-QMS-Portal/tests/foundation_governance_contract_smoke.php`
- `01-QMS-Portal/qms-data/registry/endpoint-catalog.json`
- `01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json`
- `01-QMS-Portal/qms-data/registry/registry-manifest.json`
- `01-QMS-Portal/qms-data/registry/registry-quality-report.json`
- `01-QMS-Portal/qms-data/registry/domain-field-packs.json`
- `01-QMS-Portal/qms-data/registry/data-fields-index.json`
- `01-QMS-Portal/qms-data/registry/data-fields.json`
- `01-QMS-Portal/qms-data/registry/workflow-library.json`
- `01-QMS-Portal/qms-data/registry/relation-map.json`
- `01-QMS-Portal/qms-data/registry/runtime-access-policy.json`

### Reports / proof inputs
- latest benchmark reports under `_reports/`
- latest publication/registry/observability reports under `_reports/`

You must compare these inputs and identify where truth still splits.

---

## 2) What Prompt 04 is responsible for

Prompt 03 already established architecture, domain framing, and priority waves.

Prompt 04 must now do five hard things:

### A. Close the remaining authority gap for `governance.approval_group`
This entity must stop being “half-closed”. Its runtime truth, endpoint truth, frontend truth, field packs, section layouts, capabilities, workflow states, and evidence rules must converge.

### B. Create one canonical publication authority pipeline
All registry and frontend authority artifacts must be generated from **one** canonical source model / orchestration path, not by partially independent helpers that can drift.

### C. Add proof-grade observability and publish-gate evidence
Not just “files exist”; there must be honest trace/log/metric/publication proof for the approval-group flow and canonical foundation-governance writes.

### D. Harden API contract truth
Upgrade the canonical API contract to a stronger modern baseline and stop under-specifying failure semantics, concurrency semantics, and regulated-write behavior.

### E. Convert Prompt 03 wave planning into serious wave execution
Do not leave 198 partial entities as a vague future backlog if a large subset can be closed mechanically or generator-first now.

---

## 3) External standards and models you must anchor to

Use the repo as source of truth for implementation, and these standards/models as decision anchors:

### Contract / error / schema
- **OpenAPI 3.1.2** as the target baseline for the 3.1 line.
- **RFC 9457** for `application/problem+json` error modeling.
- **JSON Schema 2020-12** for schema authority.

### Concurrency / consistency
- strong optimistic concurrency semantics for regulated writes,
- strong validator / precondition modeling,
- PostgreSQL transaction/isolation awareness,
- no weak-truth conflict handling on canonical approval/evidence/governance records.

### Observability
- **OpenTelemetry semantic conventions** for traces, metrics, logs, correlation fields, and DB/HTTP instrumentation.

### Manufacturing / platform architecture
- **ISA-95 / IEC 62264** as the ERP↔MES↔quality integration backbone.
- **ISA-88** where process/equipment/state discipline matters.
- **B2MML** as a semantics reference where message structure or entity alignment helps.
- **MTConnect**, **OPC UA**, and **PackML** where machine/line semantics are modeled or surfaced.

### Regulated-system / quality discipline
- **FDA 21 CFR Part 11**
- **EU GMP Annex 11**
- risk-based AI governance aligned with **NIST AI RMF 1.0** for any AI-assisted flow exposed by the platform.

Do not overcomplicate the codebase with performative standards references. Use them to improve truth, not to decorate documents.

---

## 4) Hard findings you must treat as likely-real until disproven

Start from these assumptions and prove or disprove them repo-locally:

1. `governance.approval_group` is still only **partial** at the frontend-metadata/publication layer.
2. publication artifacts still risk **split truth** if generated through more than one effective authority path.
3. observability is still **not proof-complete** for the slice, especially around approval decisions, canonical writes, and publication generation.
4. the current benchmark/proof package is still weaker than a true publish-grade contract proof.
5. a large number of “partial” entities may actually be **metadata-only closures** that should now be closed systematically instead of manually.
6. the API contract may still lag behind the desired modern baseline if it remains at 3.1.1 and still centers a legacy success/error envelope instead of canonical problem-details modeling.

---

## 5) Mandatory workstream A — Canonical publication authority closure

Build or refactor a **single orchestration path** that generates the registry/publication authority artifacts.

### Requirements

1. There must be **one canonical generator entry path** for publication.
   - Reuse an existing generator/orchestrator if present and correct it.
   - If the repo currently has multiple partially authoritative generators, consolidate or wrap them under one orchestrator.

2. The following artifacts must all be regenerated in one correlated publication run:
   - `endpoint-catalog.json`
   - `frontend-foundation-catalog.json`
   - `registry-manifest.json`
   - `registry-quality-report.json`
   - `domain-field-packs.json`
   - `data-fields-index.json`
   - `data-fields.json`
   - `workflow-library.json`
   - `relation-map.json`
   - any related quality/access/manifest/report artifacts that participate in readiness truth

3. Every generated artifact must share the same canonical run metadata, at minimum:
   - `publication_run_id`
   - `generatedAt`
   - `source_commit` or equivalent repo-local source hash
   - `authority_version`
   - `generator_name`
   - `slice_scope`
   - `upstream_inputs` or equivalent provenance

4. Every generated artifact must be traceable to the same run without hand editing.

5. Smoke/publish gates must fail if:
   - one artifact is stale,
   - one artifact has a mismatched `publication_run_id`,
   - one artifact has mismatched summary counts,
   - one artifact disagrees on readiness/blocker state,
   - or one artifact was manually edited outside the canonical generator path.

### Required invariant checks

Add generator-time and smoke-time invariant checks for:
- endpoint count vs manifest coverage counts,
- field-definition counts vs registry index counts,
- workflow counts vs workflow-library counts,
- partial/ready/blocked summaries vs frontend-foundation-catalog actual entity states,
- bridge-ready/blocked summaries vs runtime truth,
- zero split truth for the same entity/endpoint across endpoint/frontend/manifest/quality-report.

---

## 6) Mandatory workstream B — `governance.approval_group` total closure

This is the most important entity-level closure target.

### You must do all of the following

1. Re-audit `governance.approval_group` across:
   - runtime implementation,
   - controller/service/adapter behavior,
   - OpenAPI contract,
   - endpoint catalog,
   - frontend-foundation catalog,
   - field definitions,
   - field packs,
   - list/detail/form layouts,
   - timeline/reason/evidence metadata,
   - workflow state/capability metadata,
   - permission/e-sign/audit expectations.

2. Close the metadata for this entity **fully**, including at minimum:
   - entity identity / primary key / business key / display key,
   - list columns,
   - detail sections,
   - create/edit/decision forms,
   - command catalog,
   - state machine / workflow mode,
   - evidence attachment model,
   - timeline event model,
   - related records,
   - pack families,
   - validation rules,
   - conflict/precondition behavior,
   - actor / approver / requester / signer semantics,
   - readiness and blocker reasons.

3. If runtime now truly supports the entity end-to-end, then `governance.approval_group` must no longer publish as `partial`.

4. If runtime still has a real blocker, then mark the entity `blocked` consistently everywhere and publish a machine-readable blocker code and blocker reason. Do **not** leave it in fuzzy `partial` if the actual state is “not executable”.

5. Remove nested readiness contradictions inside the entity record. There must not be a top-level `partial` with nested substructures still implying `ready` in a way that misleads the frontend.

6. Ensure the entity’s metadata is strong enough for a serious frontend team to build list/detail/decision UX without guessing business logic.

### Important truth rule

`partial` is allowed only if there is meaningful runtime capability **and** a clearly bounded metadata or non-blocking closure gap remains.  
If the capability cannot be safely executed, use `blocked`, not vague `partial`.

---

## 7) Mandatory workstream C — Observability proof that is actually publish-grade

Use `SliceObservability.php` or replace/refactor it into a stronger canonical helper if needed.

### Add or harden observability for these flows
- approval-group create/update/decide lifecycle,
- workflow bridge call path,
- canonical foundation-governance writes,
- registry/publication generation run,
- benchmark runs tied to publication proof.

### Required telemetry model

At minimum define and emit structured proof for:

#### Traces / spans
- `foundation_governance.approval_group.decide`
- `foundation_governance.approval_group.create`
- `foundation_governance.foundation.write`
- `registry.publication.generate`
- `registry.publication.validate`

#### Metrics
- decision request count
- decision success/fail/blocked count
- workflow bridge success/fail/blocked count
- canonical write success/fail/conflict count
- publication generation success/fail count
- smoke gate pass/fail count
- benchmark scenario pass/fail + latency/TPS summaries

#### Structured logs
Every relevant log event must include enough correlation to support audit/debug/proof, such as:
- `trace_id`
- `span_id` or equivalent
- `correlation_id`
- `publication_run_id`
- `entity_key`
- `endpoint_key`
- `workflow_mode`
- `actor_id` / requester / approver identity where safe and appropriate
- `decision_outcome`
- `blocker_code`
- `record_id`
- `problem_type` / error code

### Proof artifact requirement

If the repo does not yet have a live OTel collector/exporter path, do **not** fake that it does.

Instead:
1. implement file/local proof export for the slice,
2. generate one or more proof artifacts under `_reports/observability/`,
3. explicitly publish whether collector/exporter is:
   - `live_ready`
   - `file_export_only`
   - or `blocked`

The publish artifacts must say the same thing.

---

## 8) Mandatory workstream D — OpenAPI, error contract, and concurrency hardening

The canonical contract must be stronger than it is now.

### Required changes

1. Upgrade `01-QMS-Portal/api/openapi.yaml` to **OpenAPI 3.1.2**.

2. Preserve any unavoidable legacy interface documentation only as a compatibility lane, but make the canonical contract modern and explicit.

3. Add canonical **RFC 9457** problem-details modeling:
   - `application/problem+json`
   - shared problem schema(s)
   - shared problem responses
   - typed `problem.type` URIs or stable type identifiers
   - explicit mapping for validation, auth, forbidden, not found, conflict, precondition required, precondition failed, blocked workflow bridge, and internal error cases

4. Model regulated-write concurrency semantics explicitly:
   - `ETag` response headers where appropriate,
   - `If-Match` request headers for protected updates/decisions where appropriate,
   - `412 Precondition Failed` where validators do not match,
   - `428 Precondition Required` where protected writes require a validator,
   - `409 Conflict` where a business conflict exists beyond validator mismatch.

5. Keep AND security semantics correct for session + CSRF on state-changing routes.

6. Make sure the OpenAPI truth matches runtime truth. Do not document capabilities that are blocked or unimplemented.

### Important compatibility rule

Do not break legacy clients carelessly. If the legacy envelope must remain for compatibility, document it as legacy/deprecated and make the canonical route/response truth unambiguous.

---

## 9) Mandatory workstream E — Turn the 198 partial entities into a wave-execution factory

Do **not** leave the rest of the platform in a hand-curated backlog state if the repo now has enough registry structure to close many entities systematically.

### You must build a partial-entity closure strategy that runs from code

1. Re-scan all partial entities from the current authority artifacts.
2. Classify each partial entity into a machine-readable reason bucket, for example:
   - `metadata_only_gap`
   - `field_pack_gap`
   - `detail_layout_gap`
   - `workflow_blocked`
   - `write_contract_missing`
   - `observability_gap`
   - `evidence_model_gap`
   - `dependency_blocked`
   - `needs_manual_domain_decision`

3. For every entity that is effectively **metadata-only gap**, close it now through generator-driven patterns instead of leaving it partial.

4. Execute at least one serious P1 wave in this prompt, not just a plan.
   - Prefer the highest-leverage metadata-only or low-risk entities first.
   - Reduce the partial count materially.

5. For every entity that remains partial or blocked, publish:
   - reason bucket,
   - blocker code,
   - blocker summary,
   - suggested next wave,
   - whether closure is generator-automatable or manually domain-dependent.

### Deliverable requirement

Create a machine-readable wave/gap ledger, for example under `01-QMS-Portal/qms-data/registry/` or `_reports/registry/`, containing:
- current entity state,
- reason bucket,
- wave assignment,
- closure mode,
- and post-run summary counts.

The goal is to convert “198 partial” from a static headline into an executable reduction program.

---

## 10) Mandatory workstream F — Benchmark and smoke proof that is actually credible

The repo already contains benchmark/proof infrastructure. Use it, fix it, and harden it.

### Benchmark requirements

1. Benchmark scenarios must be tied to **real** runtime paths and **real** tables/routes in the repo.
2. Do not publish benchmark success if the run crashes, recovers, or silently falls back.
3. Add or harden at least these benchmark profiles if practical:
   - `stability_probe`
   - `foundation_governance_read_mix`
   - `approval_group_decision_mix`
   - `publication_generation_validation`

4. Benchmark output files must be timestamped or run-correlated so stale filenames cannot mislead readers.

5. If a profile is not safe to run at meaningful scale in the current repo-local harness, publish that limitation honestly and keep the profile blocked or limited.

### Smoke / publish gate requirements

Upgrade smoke gates so they fail on all of the following:
- stale artifact freshness,
- mismatched `publication_run_id`,
- mismatched counts across authority artifacts,
- contradictory readiness state for any entity/endpoint,
- `approval_group` still split across top-level and nested readiness truth,
- missing observability proof artifacts,
- OpenAPI still below 3.1.2,
- `application/problem+json` missing,
- missing strong precondition modeling for protected writes,
- benchmark artifact missing or stale relative to the publication run,
- benchmark report exists but scenario status is not truly pass.

Make the publish gate strict enough that false green is difficult.

---

## 11) File-change expectations

You are expected to modify code and artifacts, not just docs.

### Likely touchpoints
- `01-QMS-Portal/api/openapi.yaml`
- publication/registry generators under `01-QMS-Portal/scripts/` or the repo’s actual generator path
- runtime services/controllers for approval-group truth / observability / canonical writes where necessary
- smoke/benchmark tooling under `01-QMS-Portal/tests/` and related scripts
- registry artifacts under `01-QMS-Portal/qms-data/registry/`
- proof artifacts under `_reports/`

### You may create new helper files if needed, for example
- registry publication orchestrator
- observability proof exporter/helper
- wave/gap ledger generator
- publish gate validator

But keep the design disciplined and generator-first.

---

## 12) Limits on documentation output

Do **not** create a new sprawling report package.

At most, create:
1. one concise execution summary markdown file,
2. one machine-readable wave/gap ledger file,
3. one machine-readable publish-proof summary file,

plus the regenerated runtime/registry/proof artifacts.

The primary deliverable is **the repo state itself**, not another essay.

---

## 13) Acceptance criteria — Prompt 04 is only successful if all of these are true

### A. Authority / publication
- all authority artifacts are regenerated from one correlated run,
- all share matching run metadata,
- no split truth remains across endpoint/frontend/manifest/quality-report.

### B. Approval-group truth
- `governance.approval_group` is either fully closed and no longer misleadingly partial,
- or truthfully blocked everywhere with clear blocker codes and reasons.

### C. Observability
- slice observability proof exists,
- the publication state truthfully distinguishes live collector vs file-export-only vs blocked,
- and the proof is reflected consistently across artifacts.

### D. API contract
- `openapi.yaml` is upgraded to 3.1.2,
- canonical problem-details modeling exists,
- protected-write concurrency/precondition semantics are explicit,
- security truth matches runtime truth.

### E. Wave execution
- partial entities have been reclassified systematically,
- metadata-only partials are reduced materially,
- remaining partial/blocked entities have machine-readable reasons and wave assignments.

### F. Proof gates
- smoke/publish gates pass honestly,
- benchmark artifacts are fresh and run-correlated,
- no stale or contradictory artifacts remain.

If any of these fail, do **not** declare success.

---

## 14) Required final response format

At the end, respond with exactly these sections and keep them evidence-driven:

### 1. Executive verdict
One of:
- `PASS`
- `PASS WITH EXPLICIT REMAINING BLOCKERS`
- `BLOCKED`
- `FAIL`

### 2. Files changed
Bullet list with purpose.

### 3. What materially improved
Concrete runtime/registry/contract/proof improvements.

### 4. Remaining blockers
Only real blockers, each with blocker code and why it is still blocked.

### 5. Updated counts
At minimum report:
- total entities
- ready / partial / blocked entities
- workflow-ready entities
- publication artifact counts
- benchmark scenario pass/fail counts

### 6. Proof summary
Name the fresh smoke / benchmark / observability / publication artifacts generated in this run.

### 7. No-marketing note
State plainly what is still not ready. No hype.

---

## 15) Blunt final instruction

This prompt is intended to eliminate the last serious category of “looks mature but still drifts under pressure.”

Do not merely tidy text.
Do not merely refresh timestamps.
Do not merely rephrase readiness.
Do not merely add another plan.

**Make the platform authority real, correlated, observable, and scalable.**

