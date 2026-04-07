# Prompt 07 — Global Publishability Truth, Artifact Authority, and Platform Closure

You are operating inside the repository `sanhvo86-hesem/hesemqms`.

Your job is **not** to write another planning package. Your job is to **close the real remaining gaps in code + registry + publication artifacts + proof** so that the repository itself becomes the authoritative source of truth.

## 0. Non-negotiable operating rules

1. **The repository is the only source of truth.** Ignore prior chat summaries unless you can verify them from files in this repo.
2. **No marketing language. No false green. No narrative-only progress.** Every claim must be backed by changed files, regenerated artifacts, or executable proof.
3. **Fail closed.** If a bridge, route, field-definition, workflow, or proof artifact is not truly ready, mark it blocked/partial and explain exactly why.
4. **Do not create ghost artifacts.** If you mention a file in the output summary, that file must exist in the repo after your changes.
5. **Do not fork the truth.** `registry-manifest.json`, `registry-quality-report.json`, `endpoint-catalog.json`, `frontend-foundation-catalog.json`, OpenAPI, benchmark summaries, and publication summaries must be mutually consistent.
6. **Do not stop at slice-scoped success if platform-global truth is still unresolved.** Either achieve platform-global publishability or emit an honest, machine-readable global blocker ledger.
7. **Preserve backward-compatible runtime safety.** No relaxed validation, no permissive workflow shortcut, no fake bridge-ready state.

---

## 1. Verified external baseline you must reconcile against repo-truth

Treat the following as the externally verifiable baseline that must be either matched or deliberately superseded by regenerated files:

### 1.1 `01-QMS-Portal/qms-data/registry/registry-manifest.json`
Current public repo truth shows:
- `_meta.generatedAt = 2026-04-07T03:32:24.724Z`
- `_meta.slice_publication_pass = foundation_governance_contract_slice`
- `_meta.publication_run_id = 97074ae9-bed7-4b4b-8ca0-c4b3e8233e9e`
- `coverage.router_actions = 2862`
- `coverage.field_registry_actions = 2872`
- `coverage.workflow_engine_bridge.ready = 103`
- `coverage.workflow_engine_bridge.blocked = 12`
- `coverage.frontend_foundation.entity_count = 533`
- `coverage.frontend_foundation.ready_entities = 425`
- `coverage.frontend_foundation.partial_entities = 108`
- `coverage.frontend_foundation.workflow_ready_entities = 218`

### 1.2 `01-QMS-Portal/qms-data/registry/registry-quality-report.json`
Current public repo truth shows:
- `_meta.generatedAt = 2026-04-07T03:32:24.724Z`
- `_meta.slice_publication_pass = foundation_governance_contract_slice`
- `_meta.publication_run_id = 97074ae9-bed7-4b4b-8ca0-c4b3e8233e9e`
- `summary.endpoint_count = 2862`
- `summary.workflow_engine_bridge_ready = 104`
- `summary.workflow_engine_bridge_blocked = 11`
- `summary.frontend_foundation_entities = 533`
- `summary.frontend_ready_entities = 425`
- `summary.frontend_partial_entities = 108`
- `summary.publishability_ready = false`
- `publishability.ready = false`
- failed checks still include frontend partial entities and workflow bridge readiness

### 1.3 `01-QMS-Portal/api/openapi.yaml`
Current public repo truth shows:
- `openapi: "3.1.1"`
- canonical governance routes already exist
- RFC 9457 `application/problem+json` responses are present
- the approval-group decision route documents `If-Match` and `ETag`

### 1.4 Public prompt tree visibility
The public `01-QMS-Portal/docs/ai-prompts/` tree visibly contains the Prompt 02 bundle, Prompt 03 bundle, and `prompt-04-master-orchestrator-final-package-2026-04-06.md`. Prompt 05 / Prompt 06 are not externally visible from the public tree page baseline and therefore prompt lineage/provenance must be made explicit and machine-verifiable.

Your task is to make repo-truth stronger than this baseline and eliminate all split-truth.

---

## 2. Mission

Execute a **serious closure pass** that does all of the following:

1. Establish **one canonical global publication authority**.
2. Eliminate all **metric drift** between manifest, quality report, endpoint catalog, frontend catalog, and proof summaries.
3. Upgrade OpenAPI from **3.1.1 to 3.1.2** while preserving existing hardening.
4. Close the remaining **frontend partial entity** and **workflow bridge** gaps with real code/registry changes.
5. Convert publication status from slice-scoped truth into either:
   - **platform-global publishability = true**, or
   - an honest **global blocker ledger** with zero ambiguity.
6. Produce **small, inspectable, machine-readable proof artifacts** that can be verified without opening multi-megabyte catalogs.
7. Make prompt lineage and publication lineage explicit so no future round has to infer what happened from chat summaries.

---

## 3. Standards and design anchors

Anchor your work to these sources and their intent:
- **OpenAPI Specification 3.1.2**
- **RFC 9457** Problem Details for HTTP APIs
- **JSON Schema Draft 2020-12**
- **OpenTelemetry semantic conventions** for traces, metrics, logs, and events
- **ISA-95** as the ERP ↔ MES integration reference frame
- **FDA 21 CFR Part 11** expectations for trustworthy electronic records and electronic signatures
- **EU GMP Annex 11** for computerized systems and data integrity
- **NIST AI RMF 1.0** for any AI-governed platform capabilities or prompt-generation governance

Do not add decorative references. Apply the standards where they materially change contracts, evidence, validation, auditability, publication, and manufacturing-platform integrity.

---

## 4. Mandatory workstreams

### Workstream A — Canonical publication authority
Create or finish a **single publication orchestrator path** that regenerates all canonical platform artifacts in one run.

It must cover at minimum:
- `01-QMS-Portal/qms-data/registry/registry-manifest.json`
- `01-QMS-Portal/qms-data/registry/registry-quality-report.json`
- `01-QMS-Portal/qms-data/registry/endpoint-catalog.json`
- `01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json`
- any compact summary artifacts you add

Requirements:
- one `publication_run_id`
- one `generatedAt`
- one scoped publication status model
- one truth source for bridge counts, entity readiness counts, publishability, and endpoint counts
- no helper script may post-process one artifact into a different truth than the others

If there are existing generators, refactor them. If there are overlapping generators, remove duplication or make them subordinate to one canonical entry point.

### Workstream B — Metric reconciliation and global truth verifier
Add a **global publication truth verifier** that fails when any of the following disagree:
- ready / partial / blocked entity counts
- bridge ready / blocked counts
- endpoint counts
- field-definition counts
- prompt lineage / publication lineage references
- run_id mismatches
- generatedAt mismatches
- slice/global scope mismatches
- claims in small summary artifacts that contradict canonical large catalogs

Create a compact machine-readable artifact, for example:
- `01-QMS-Portal/qms-data/registry/publication-truth-summary.json`
- `01-QMS-Portal/qms-data/registry/publication-truth-verifier.json`

These summary artifacts must be small enough to inspect directly on GitHub web UI and must tell the truth even if the large catalogs are too big to render.

### Workstream C — Close remaining partial entities for real
Use repo-local evidence to close the remaining partial entities.

This means:
- inspect the current reason codes behind partial readiness
- add missing canonical columns / mappings / field definitions / pack-family coverage where justified
- update table-registry / generator logic / domain packs / field catalogs as needed
- do **not** merely relabel partial entities as ready without closing the underlying registry reason

Typical closure categories to address explicitly if they still exist:
- missing timestamps
- missing operation context
- missing execution status
- missing planning fields
- missing traceability identity
- missing attachment contract
- metadata closure gaps for frontend packs, sections, detail layouts, and capabilities

If any entity truly cannot be made ready because the domain model is incomplete, keep it partial and record it in an honest blocker ledger with an exact closure mode.

### Workstream D — Resolve workflow bridge blockers or model them honestly
Current externally visible state still shows bridge drift (`103/12` vs `104/11`) and blocked workflow bridges.

You must:
- identify the exact blocked workflows/entities
- resolve the state-model mismatches if they are automatable
- ensure the bridge authority path is real, not symbolic
- ensure any remaining blocked bridge is fail-closed and consistently reported everywhere

If you can fully close bridge blockers, do it.
If you cannot fully close them, then every artifact must converge on the same remaining blocked count and same exact blocker list.

### Workstream E — OpenAPI and contract authority
Upgrade `01-QMS-Portal/api/openapi.yaml` to **OpenAPI 3.1.2**.

Preserve and harden:
- RFC 9457 problem responses
- `If-Match` / `ETag` conditional semantics
- authenticated + CSRF requirements for state-changing endpoints
- cursor-connection semantics where already adopted

Then ensure the generated endpoint catalog reflects the exact same route and capability truth as OpenAPI and runtime.

No orphan endpoint should remain active in one artifact and blocked in another.

### Workstream F — Proof artifacts that are small, honest, and current
Create or refresh compact proof artifacts under `_reports/` and/or `01-QMS-Portal/qms-data/registry/` that are small enough for external verification.

At minimum include:
- publication truth summary
- benchmark summary (small JSON + human-readable MD)
- observability summary (small JSON + human-readable MD)
- blocker ledger if anything remains incomplete

If observability is still file-export-only, say so clearly.
If benchmark is still a stability probe rather than live-like load, say so clearly.

The point is not to pretend production readiness; the point is to make the repo self-describing and honest.

### Workstream G — Prompt lineage and execution lineage
Make prompt lineage explicit inside the repo.

Create a small index such as:
- `01-QMS-Portal/docs/ai-prompts/prompt-lineage-index-2026-04-07.json`
- and/or `01-QMS-Portal/docs/ai-prompts/prompt-lineage-index-2026-04-07.md`

It must show, at minimum:
- Prompt 02 foundation-governance sequence
- Prompt 03 bundle
- Prompt 04 master orchestrator package
- Prompt 05 / Prompt 06 / this new Prompt 07 if they exist in the repo
- the current canonical prompt to continue from
- the publication run_id(s) associated with closure passes

This index must be truthful and must not reference missing files.

---

## 5. Files you must inspect before changing anything

At minimum inspect:
- `01-QMS-Portal/api/openapi.yaml`
- `01-QMS-Portal/qms-data/registry/registry-manifest.json`
- `01-QMS-Portal/qms-data/registry/registry-quality-report.json`
- `01-QMS-Portal/qms-data/registry/endpoint-catalog.json`
- `01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json`
- `01-QMS-Portal/qms-data/registry/domain-field-packs.json`
- `01-QMS-Portal/qms-data/registry/table-registry.json`
- `01-QMS-Portal/qms-data/registry/workflow-library.json`
- `01-QMS-Portal/tools/registry/generate-module-builder-registry.mjs`
- every publication / truth / bridge / closure helper currently involved
- `01-QMS-Portal/docs/ai-prompts/`
- `_reports/` proof artifacts relevant to benchmark and observability

Do not assume helper scripts mentioned in prior chat summaries actually exist. Verify them from the repo.

---

## 6. Required deliverables

You must commit repo-local changes that result in all of the following deliverables:

1. Updated code and/or generator logic
2. Regenerated canonical artifacts
3. Small truth-summary artifacts
4. Small proof-summary artifacts
5. Prompt lineage index
6. Honest blocker ledger if anything remains incomplete
7. A final execution report in markdown summarizing exactly:
   - what changed
   - which files were regenerated
   - old vs new counts
   - whether platform-global publishability is now true
   - if not, the exact remaining blockers and why they are not automatable

Suggested name:
- `01-QMS-Portal/docs/ai-prompts/prompt-07-execution-report-2026-04-07.md`

---

## 7. Acceptance gates

### Gate A — Internal consistency
All canonical artifacts must agree on:
- entity_count
- ready_entities
- partial_entities
- blocked_entities
- workflow_engine_bridge_ready
- workflow_engine_bridge_blocked
- endpoint_count
- generatedAt
- publication_run_id
- publication scope

### Gate B — OpenAPI truth
- `openapi.yaml` is truly **3.1.2**
- governance conditional-request semantics remain intact
- problem responses remain RFC 9457 modeled
- no security regression on state-changing routes

### Gate C — Publishability
Target state:
- `frontend_partial_entities = 0`
- `frontend_blocked_entities = 0`
- `workflow_engine_bridge_blocked = 0`
- `publishability_ready = true`
- publication scope can be truthfully elevated from slice to global

If you cannot reach this target honestly, then:
- keep `publishability_ready = false`
- emit a complete blocker ledger
- ensure every artifact agrees on the exact remaining blocker counts and reasons

### Gate D — Proof honesty
- observability summary says exactly what exists
- benchmark summary says exactly what was run
- no stale report names with misleading dates unless intentionally preserved and cross-linked by latest pointer + summary

### Gate E — Public verifiability
A reviewer must be able to inspect the small summary artifacts and determine, without loading the giant catalogs, whether the platform is globally publishable.

---

## 8. Output format

When finished, output a blunt execution summary with these sections only:

1. **Verdict**
2. **Files changed**
3. **Counts before vs after**
4. **Remaining blockers (if any)**
5. **Proof artifacts created/refreshed**
6. **Whether global publishability is now true**
7. **No-marketing note**

Do not include vague claims like “significant progress” or “mostly ready.”
Use exact counts, exact file paths, exact run IDs.

---

## 9. Priority

Priority order:
1. repo-truth reconciliation
2. publication authority unification
3. partial-entity closure
4. workflow-bridge closure
5. OpenAPI 3.1.2 upgrade
6. small proof artifacts
7. prompt lineage index

Do the real work. Do not produce another planning loop.
