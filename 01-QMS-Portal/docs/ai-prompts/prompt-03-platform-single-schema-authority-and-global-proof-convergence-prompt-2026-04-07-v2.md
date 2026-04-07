# Prompt 03 Platform Single-Schema Authority And Global Proof Convergence Prompt (2026-04-07, v2)

Paste this file into a fresh GPT Codex section and press Enter with no additional text.

## Purpose

This is a **platform-wide convergence prompt** for the post-single-schema-merge state.

Do not reopen broad architecture research.
Do not restart Foundation Governance tranche planning.
Do not generate another high-level strategy package.
Do not trust previous prompt narratives over current repo truth.

Your job is to make the repo **globally self-explanatory, schema-authoritative, and publication-consistent** after the schema merge.

## Repo truth rule

If any prior prompt output conflicts with current repo files or generated artifacts, **repo truth wins**.

## Mandatory inputs

### Schema / database
- `01-QMS-Portal/database/schema.sql`
- `01-QMS-Portal/database/canonical-erp-mes-eqms-7-layer-blueprint.sql`
- `01-QMS-Portal/database/mes-schema-specification.sql`
- `01-QMS-Portal/database/build_schema_snapshot.php`
- `01-QMS-Portal/database/migrations/`

### Runtime / contract
- `01-QMS-Portal/api/index.php`
- `01-QMS-Portal/api/Router.php`
- `01-QMS-Portal/api/openapi.yaml`
- `01-QMS-Portal/api/controllers/`
- `01-QMS-Portal/api/services/`

### Registry / publication
- `01-QMS-Portal/qms-data/registry/endpoint-catalog.json`
- `01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json`
- `01-QMS-Portal/qms-data/registry/registry-manifest.json`
- `01-QMS-Portal/qms-data/registry/registry-quality-report.json`
- `01-QMS-Portal/qms-data/registry/schema-library.json`
- `01-QMS-Portal/qms-data/registry/table-registry.json`
- `01-QMS-Portal/qms-data/registry/workflow-library.json`
- `01-QMS-Portal/qms-data/registry/domain-field-packs.json`
- `01-QMS-Portal/qms-data/registry/data-fields-index.json`
- `01-QMS-Portal/tools/registry/generate-module-builder-registry.mjs`
- `01-QMS-Portal/tools/registry/generate-registry-v3.mjs`
- `01-QMS-Portal/tools/registry/generate-table-architecture.mjs`
- `01-QMS-Portal/tools/registry/generate-workflow-governance.mjs`
- `01-QMS-Portal/tools/registry/regenerate_slice_publication.py`
- any helper scripts these call

### Tests / proof
- `01-QMS-Portal/tests/backend_smoke.php`
- `01-QMS-Portal/tests/foundation_governance_contract_smoke.php`
- benchmark and report artifacts under `01-QMS-Portal/tools/benchmark/` and `_reports/` if present

### Prompt tree
- `01-QMS-Portal/docs/ai-prompts/`

## Hard constraints

- Do not fabricate artifact existence.
- Do not hand-edit generated JSON outputs unless the file is explicitly intended to be human-authored.
- Do not claim global publishability unless manifest, quality report, compact summaries, and verifier outputs all agree.
- Do not leave schema authority implicit.
- Do not keep slice labels and platform totals mixed in the same ambiguous truth package.
- Do not preserve metric drift for convenience.
- Do not add another long planning narrative instead of fixing the repo.
- Do not silently move blockers out of view.

## Exact work to perform

### 1) Make the merged schema explicit authority

Create a compact machine-readable and reviewer-readable declaration that clearly states:
- `schema.sql` = executable merged schema authority
- `canonical-erp-mes-eqms-7-layer-blueprint.sql` = blueprint/reference only
- `mes-schema-specification.sql` = specification/reference only
- how migrations relate to the merged schema authority
- how `schema-library.json` and `table-registry.json` are validated against the merged schema

Required new artifacts:
- `01-QMS-Portal/qms-data/registry/schema-authority-summary.json`
- `01-QMS-Portal/qms-data/registry/schema-authority-summary.md`

Required fields:
- authority schema path
- supporting reference files
- generation / verification timestamp
- table counts
- parity status with schema-library and table-registry
- any exclusions or derived-only artifacts

### 2) Add schema-to-registry parity verification

Implement a verifier that checks at minimum:
- every publishable table in `table-registry.json` exists in the merged schema authority unless explicitly excluded
- every registry table has primary key / row-version / scope metadata consistent with the merged schema or is explicitly justified
- `schema-library.json` and `table-registry.json` use the same effective table universe for publication
- entity counts and table counts are machine-reconciled, not narrative-only

Required output:
- one compact parity report artifact in `qms-data/registry/`
- one verifier command documented in the markdown summary

### 3) Converge canonical publication metrics

Today the repo still has metric drift:
- manifest bridge counts differ from quality report bridge counts
- entity totals and frontend catalog record totals do not reconcile cleanly

Fix the generator / publication logic so that these artifacts agree from one authority pipeline:
- `endpoint-catalog.json`
- `frontend-foundation-catalog.json`
- `registry-manifest.json`
- `registry-quality-report.json`

Required convergence outcomes:
- same `publication_run_id`
- same effective publication timestamp family
- same bridge-ready / bridge-blocked counts
- same ready / partial / blocked counts where scopes match
- explicit explanation if `entity_count` and `frontend-foundation-catalog.records` legitimately differ

If `533` and `528` are both correct for different reasons, encode the reason in machine-readable summary fields.
If they are not both correct, reconcile them.

### 4) Separate global canonical truth from slice summaries

Replace the current ambiguous “slice label + platform totals” situation with an explicit truth model:
- **global canonical package** for platform-wide publication truth
- **slice summary package** for Foundation Governance only

Required compact artifacts:
- `01-QMS-Portal/qms-data/registry/publication-truth-summary.json`
- `01-QMS-Portal/qms-data/registry/publication-truth-summary.md`
- `01-QMS-Portal/qms-data/registry/foundation-governance-publication-summary.json`
- `01-QMS-Portal/qms-data/registry/foundation-governance-publication-summary.md`

These must be small, GitHub-renderable, and clearly scoped.

### 5) Upgrade or explicitly freeze OpenAPI truthfully

Current public spec is still `3.1.1`.
Choose one of only two acceptable outcomes:

#### Option A — upgrade
Upgrade `api/openapi.yaml` to `3.1.2` and verify the file still truthfully models the runtime behavior already present.

#### Option B — explicit freeze
Keep `3.1.1` and add an explicit statement in the compact proof package explaining why the repo intentionally remains at that patch level for now.

Unacceptable outcome:
- silent drift between publication summaries and spec version
- claiming 3.1.2 in docs while file stays 3.1.1

### 6) Add compact reviewer proof package

The repo must not force reviewers to inspect only very large catalogs.
Generate small GitHub-renderable proof artifacts that summarize:
- publication scope
- publication run ID
- entity counts
- bridge counts
- publishability verdict
- schema authority verdict
- OpenAPI version
- verification commands
- anti-false-green statement

### 7) Reset prompt authority after schema merge

Create a current-authority reset so the repo itself explains the active lane.
Required artifacts:
- `01-QMS-Portal/docs/ai-prompts/CURRENT-PLATFORM-AUTHORITY-POST-SCHEMA-MERGE-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-lineage-index-2026-04-07.json`

The lineage index must classify prompts by role, for example:
- historical
- completed tranche
- superseded
- active authority

### 8) Add a platform preflight verifier

Create or upgrade a verifier so it fails if:
- schema authority summary is missing
- schema parity report is missing or stale
- manifest / quality report metrics drift
- run IDs drift
- compact truth summaries are missing
- slice summary and global summary contradict each other
- OpenAPI version does not match compact truth summary
- publishability says ready in one place and review required in another

This verifier should be platform-level, not only Foundation-Governance-level.

## Deliverables

Required changed and/or new outputs:
- regenerated canonical registry artifacts
- schema authority summary (`.md` + `.json`)
- global publication truth summary (`.md` + `.json`)
- Foundation Governance slice publication summary (`.md` + `.json`)
- prompt lineage index (`.json`)
- current platform authority reset (`.md`)
- platform preflight verifier and/or upgraded smoke
- concise execution report:
  - `01-QMS-Portal/docs/ai-prompts/prompt-03-platform-single-schema-authority-and-global-proof-convergence-execution-report-2026-04-07-v2.md`

## Required final report format

Return:
1. exact files changed
2. whether `schema.sql` is now explicitly the executable schema authority
3. whether blueprint/spec files are now explicitly classified as non-authoritative references
4. whether manifest and quality report now agree on bridge counts and publishability
5. whether `533` vs `528` is reconciled or explicitly explained
6. whether compact proof artifacts now exist
7. whether OpenAPI is now 3.1.2 or intentionally frozen at 3.1.1
8. whether the repo now has a clear current-authority reset after the schema merge
9. exact remaining blockers, if any
10. blunt verdict:
   - `PASS — PLATFORM POST-SCHEMA-MERGE CONVERGENCE ACHIEVED`
   - or `HOLD — PLATFORM AUTHORITY STILL NOT CONVERGED`

## Standards anchors

Use these only as applicable and only where they match actual implementation:
- OpenAPI Specification 3.1.2
- RFC 9457
- JSON Schema 2020-12
- OpenTelemetry HTTP semantic conventions
- PostgreSQL Serializable / serialization-failure retry reality
- FDA 21 CFR Part 11
- EU GMP Annex 11
- ISA-95 where ERP/MES/eQMS integration semantics matter
- NIST AI RMF 1.0 where AI-governed modules are touched

This prompt is not for more research.
It is for **authority convergence, proof convergence, and repo truth convergence** after the schema merge.
