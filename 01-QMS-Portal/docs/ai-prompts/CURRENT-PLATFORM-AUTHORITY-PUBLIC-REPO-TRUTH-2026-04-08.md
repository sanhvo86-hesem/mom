# CURRENT PLATFORM AUTHORITY — PUBLIC REPO TRUTH (2026-04-08)

## Purpose

This file resets the active lane after the post-schema-merge evaluation on 2026-04-08.

The current priority is **not** new architecture.
The current priority is **public repo truth convergence**.

## Blunt status

Public `main` shows:
- schema merge artifacts exist,
- Foundation/Governance runtime routes exist,
- OpenAPI includes Foundation/Governance paths and conditional-write semantics,
- registry manifest and quality report share the same `generatedAt` and `publication_run_id`.

But public `main` still does **not** prove the claimed v2 convergence package.

## Current blockers that still matter

1. `openapi.yaml` is still `3.1.1` in public `main`.
2. `registry-manifest.json` and `registry-quality-report.json` still disagree on workflow bridge counts.
3. `registry-manifest.json` still says `frontend-foundation-catalog.json.records = 528` while summary counts use `533` entities.
4. `registry-quality-report.json` still says `publishability_ready = false` and `review_required = true`.
5. Compact proof files claimed by the latest pass are not visible in public `qms-data/registry/`.
6. `schema-authority-summary.*`, `schema-parity-report.json`, and verifier scripts are not visible in public tree.
7. Prompt authority reset files from the claimed pass are not visible in public `docs/ai-prompts/`.

## Active prompt lane

Run next:
- `prompt-03-platform-post-merge-public-repo-truth-convergence-repair-prompt-2026-04-08.md`

Do not open a new architecture package until public repo truth converges.
