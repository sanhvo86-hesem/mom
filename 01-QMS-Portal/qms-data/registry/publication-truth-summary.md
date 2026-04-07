# Publication Truth Summary — Platform Global

**Scope**: platform_global
**Truth Model**: `global_canonical_plus_slice_summary`
**Run ID**: `0b987d57-e143-47f7-96c8-815033baec67`
**Generated**: 2026-04-08
**Schema Authority**: `database/migrations (001-079)` → `database/schema.sql`

## Entity Counts

| Metric | Count |
|--------|-------|
| Tables (schema) | 628 |
| Frontend entities | 633 |
| Ready | 533 |
| Partial | 3 |
| Blocked | 97 |
| Tables with fields | 528 |

**633 vs 628**: 5 entities are non-table (virtual/composite views).
**528 vs 628**: 100 tables lack frontend config (97 blocked canonical + 3 partial).
**97 blocked**: Canonical ISA-95 tables from migrations 072-078, not yet onboarded to frontend entity system.

## Workflow Bridge

| Metric | Count |
|--------|-------|
| Ready | 116 |
| Blocked | 0 |
| Unneeded | 415 |

Counting model: only persisted-workflow entities need bridges.

## OpenAPI

- Version: 3.1.2
- Total paths: 30
- Foundation/Governance paths: 10

## Publishability

**Status**: `REVIEW_REQUIRED` — NOT green
**Review required**: 100 entities (97 blocked + 3 partial)

### Anti-false-green statement

This summary honestly reports the platform is NOT fully publishable. The 97 blocked entities are canonical ISA-95 tables that exist in the database schema but do not yet have frontend entity configurations. This is expected — they were added as the schema backbone in migrations 072-078 and will be onboarded progressively.

## Honesty Declarations

| Aspect | Mode | Detail |
|--------|------|--------|
| Benchmark | stability_probe | Smoke-level probe, not production load test |
| Observability | file_export_only | OTel-compatible structured logs to file, no live collector |
| Release confidence | development | Not production-certified |

## Verification

```bash
python tools/verify_schema_authority.py
python tools/registry/verify_publication_truth.py
php tests/foundation_governance_contract_smoke.php
```

## Canonical Artifact Inventory

| Artifact | Location |
|----------|----------|
| Schema authority | `database/schema-authority-summary.json` |
| OpenAPI contract | `api/openapi.yaml` |
| Registry manifest | `qms-data/registry/registry-manifest.json` |
| Registry quality report | `qms-data/registry/registry-quality-report.json` |
| Entity accounting | `qms-data/registry/publication-entity-accounting.json` |
| Slice summary | `qms-data/registry/foundation-governance-publication-summary.json` |
| Prompt authority | `docs/ai-prompts/CURRENT-PLATFORM-AUTHORITY-2026-04-07.md` |
