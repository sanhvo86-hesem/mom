# Platform Post-Merge Public Repo Truth — Deep Evaluation (2026-04-08)

## Executive verdict

**HOLD — public repo truth is stronger than before, but not yet converged to the claimed post-merge pass.**

This is no longer a planning problem.
This is a **materialization and authority-convergence problem**.

## What public `main` now proves

### 1) Single-schema merge is materially reflected in the repo
Public `01-QMS-Portal/database/` now visibly contains:
- `schema.sql`
- `migrations/`
- `build_schema_snapshot.php`
- `canonical-erp-mes-eqms-7-layer-blueprint.sql`
- `mes-schema-specification.sql`

This is meaningful progress: schema consolidation is visible in the repo tree.

### 2) Foundation/Governance is a real runtime slice
Public runtime and API surface now include Foundation and Governance components.
This is not a speculative package anymore.

### 3) Public OpenAPI is materially better than earlier passes
Public `api/openapi.yaml` currently shows:
- `openapi: "3.1.1"`
- `/api/v1/foundation/organizations`
- `/api/v1/foundation/parties`
- `/api/v1/foundation/calendars`
- `/api/v1/governance/approval-groups`
- `If-Match`
- `ETag`
- `application/problem+json`

So contract maturity is real.

### 4) Manifest and quality report now share one run family
Public `registry-manifest.json` and `registry-quality-report.json` both show:
- `generatedAt = 2026-04-07T03:32:24.724Z`
- `publication_run_id = 97074ae9-bed7-4b4b-8ca0-c4b3e8233e9e`
- `slice_publication_pass = foundation_governance_contract_slice`

This is materially better than earlier split run-id states.

## What public `main` still does **not** prove

### P1 — Canonical metrics still do not converge
Public manifest says:
- workflow bridge ready = `103`
- workflow bridge blocked = `12`
- entity_count = `533`
- ready_entities = `425`
- partial_entities = `108`

Public quality report says:
- workflow bridge ready = `104`
- workflow bridge blocked = `11`
- frontend_ready_entities = `425`
- frontend_partial_entities = `108`
- publishability_ready = `false`
- status = `review_required`

So run correlation is fixed, but metric authority is still split.

### P1 — `533` vs `528` is still unresolved in the public repo
Manifest summary uses `533` entities, but the asset metadata still says:
- `frontend-foundation-catalog.json.records = 528`

That mismatch is still visible in public `main`.
It may be explainable, but it is not yet explained by the public repo.

### P1 — The claimed compact proof package is not visible in public tree
The latest claimed pass says public compact proof files now exist, but public `qms-data/registry/` does not show:
- `publication-truth-summary.md`
- `publication-truth-summary.json`
- `foundation-governance-publication-summary.md`
- `foundation-governance-publication-summary.json`
- `schema-authority-summary.json`
- `schema-authority-summary.md`
- `schema-parity-report.json`

### P1 — The claimed verifier scripts are not visible in public tree
Public `01-QMS-Portal/tools/registry/` does not show:
- `verify_schema_authority.py`
- `verify_publication_truth.py`

### P1 — Public OpenAPI still lags the latest claim
The latest claim says OpenAPI is already `3.1.2`.
Public `openapi.yaml` is still `3.1.1`.

### P2 — Prompt authority reset is not visible publicly
Public `docs/ai-prompts/` contains a large historical prompt chain, including many Prompt 02 files and several Prompt 03 files.
But the claimed reset files such as `CURRENT-PLATFORM-AUTHORITY-POST-SCHEMA-MERGE` and the newer v2 prompt package are not visible in public tree.

## Interpretation

The repo is in a better state than earlier rounds.
But the latest claimed pass appears to be either:
- not yet pushed to public `main`, or
- only partially materialized into public tree, or
- implemented in local/generated state without complete public artifact publication.

## Recommended next move

Do **not** create another architecture package.
Do **not** open a broader Prompt 04/05 lane.

Run one narrow repair pass whose only job is to make public repo truth match the claimed v2 convergence state.

That pass must:
1. materialize missing proof files,
2. materialize missing schema authority files,
3. materialize missing verifier scripts,
4. converge manifest and quality-report metrics,
5. resolve or explain `533` vs `528`,
6. either upgrade public OpenAPI to `3.1.2` or downgrade the claim,
7. reset prompt authority in public tree.

## Blunt conclusion

**Not ready to call “platform post-schema-merge convergence achieved” on the basis of public repo truth.**

Closest honest verdict:
**PASS on structural maturity. HOLD on public self-proving convergence.**
