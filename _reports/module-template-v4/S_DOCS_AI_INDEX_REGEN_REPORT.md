# .ai/ Index Regeneration Report

## Summary
The `.ai/` knowledge index has been regenerated to reflect repo state as of
2026-04-25 with Slice 1 + Slice 2 + V20 planning + parallel B/D/E work.

The generator completed successfully. The regenerated index counts already
matched the current repository baseline, so the JSON content delta is limited
to `_meta.generated_at` timestamps across the generated index files.

## Branch and working tree
- Branch: `codex/docs-ai-index-regen-20260425`
- Base: `origin/main` at `8d3aaf5cc11fa83111b09b647b53b1e32d2f3b95`
- Pre-flight: `main` was up to date with `origin/main` and clean before branch creation.
- Scope note: unrelated local dirty files appeared after the branch was created; they were left unstaged and are outside this bookkeeping commit.

## Files regenerated
- `.ai/repo-map.json`
- `.ai/route-map.json`
- `.ai/db-map.json` (compact index emitted by the existing generator)
- `.ai/db-map/*.json` (14 files: 13 domain files plus `index.json`)
- `.ai/contracts-map.json`
- `.ai/symbols.json`

Files preserved (NOT regenerated):
- `.ai/module-summaries/*.md` (13 files on disk, hand-authored)

## Statistics: before vs after
| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Controllers | 89 | 89 | 0 |
| Services | 124 | 124 | 0 |
| SQL migrations | 158 | 158 | 0 |
| DB tables | 839 | 839 | 0 |
| Contract objects | 68 | 68 | 0 |
| Routes | 0 | 0 | 0 |
| Symbols | 219 | 219 | 0 |

## CLAUDE.md baseline counts updated
- No.
- `CLAUDE.md` already stated: `89 controllers, 124 services, 158 SQL migrations, and 68 contract objects`.
- `git diff -- CLAUDE.md` was empty.

## HMV4 surface coverage in symbols
- `renderDispatchBoardWorkspace`: MISSING from `.ai/symbols.json`; source function FOUND in `mom/scripts/portal/73-module-template-v4-renderers.js`.
- `renderNonconformanceRecord`: MISSING from `.ai/symbols.json`; source function FOUND in `mom/scripts/portal/73-module-template-v4-renderers.js`.
- `renderTrainingMatrixWorkspace`: MISSING from `.ai/symbols.json`; source function FOUND in `mom/scripts/portal/73-module-template-v4-renderers.js`.

Reason: the current `.ai/symbols.json` schema indexes PHP classes and public
methods. It does not parse JavaScript renderer functions.

## Frontend route coverage in route-map
- `/ops/records/nonconformance-cases` entries in `.ai/route-map.json`: NONE.
- This is expected for the current generator because HMV4 frontend routes live in JS fixtures and registries, not in backend route-map output.

## JSON parse verification
- PASS for `.ai/repo-map.json`
- PASS for `.ai/route-map.json`
- PASS for `.ai/db-map.json`
- PASS for `.ai/contracts-map.json`
- PASS for `.ai/symbols.json`
- PASS for every `.ai/db-map/*.json` file

## Remaining warnings
- The existing generator rewrites `_meta.generated_at`, so this regen produced timestamp-only JSON diffs.
- `.ai/symbols.json` remains PHP-only and does not cover HMV4 JavaScript renderers.
- `.ai/route-map.json` remains empty for action and REST routes in this generator output.
- `find mom/contracts/objects ... | wc -l` returns 70 contract files, while the generator indexes 68 contract object directories. The canonical baseline remains 68 contract objects.
- `.ai/db-map.json` was also rewritten by `tools/scripts/ai-index/generate.php`; it is an existing compact AI index file and was kept in scope for generated-index consistency.

## Decision
AI_INDEX_REGEN_PASS_WITH_WARNINGS
