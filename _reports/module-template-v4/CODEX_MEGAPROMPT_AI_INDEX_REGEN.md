# CODEX MEGAPROMPT — .ai/ Index Regeneration

> Paste into Codex local. Codex creates branch `codex/docs-ai-index-regen`,
> regenerates the `.ai/` knowledge index, validates parity, commits.
>
> Approval phrase: `Proceed with .ai/ index regeneration.`

---

## ROLE & CONTEXT

You are Codex local with full repo authority on `sanhvo86-hesem/mom`.

You are regenerating the `.ai/` knowledge index. Per `CLAUDE.md`, this index is read FIRST by AI assistants opening the repo. After Slice 1 + 2 + strategic baseline + 10 ADRs + parallel B/D/E work, the index is stale.

The repo has a regen script at `tools/scripts/ai-index/generate.php` (or `composer ai:index` task in `mom/composer.json`).

This is a **bookkeeping** slice. No business logic, no source code, no tests changed. Pure regeneration of indexed JSON.

## ABSOLUTE NON-NEGOTIABLES

```text
Do NOT modify .ai/module-summaries/*.md (those are hand-authored).
Do NOT modify source code (controllers, services, scripts).
Do NOT modify forbidden files.
Only regenerate .ai/*.json indices via the existing script.
```

## PRE-FLIGHT (must all PASS or STOP)

```bash
git fetch origin
git checkout main
git pull --ff-only

git status --short
# Expected: empty

# Verify regen script exists
ls tools/scripts/ai-index/generate.php 2>/dev/null || ls mom/tools/scripts/ai-index/generate.php 2>/dev/null
# OR
grep -A1 'ai:index' mom/composer.json
# Expected: at least one path/task exists

# Verify .ai/ directory present
ls .ai/repo-map.json .ai/route-map.json .ai/symbols.json
# Expected: all exist

# Verify PHP available
php --version
# Expected: PHP 8.x

# Branch
git checkout -b codex/docs-ai-index-regen
```

If fail, return `AI_INDEX_REGEN_PREFLIGHT_FAIL_<reason>` and stop.

## ALLOWED FILES

```text
.ai/repo-map.json
.ai/route-map.json
.ai/db-map/index.json
.ai/db-map/<domain>.json (multiple files in directory)
.ai/contracts-map.json
.ai/symbols.json
.ai/index.log (regen log; ignored by git per existing .gitignore)
CLAUDE.md (only if baseline counts in the doc need refresh — see Step 6)
_reports/module-template-v4/S_DOCS_AI_INDEX_REGEN_REPORT.md (NEW)
```

## FORBIDDEN

```text
.ai/module-summaries/*.md (HAND-AUTHORED, do not regenerate)
mom/scripts/portal/7?-module-template-v4-*.js
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
mom/portal.html
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/qms-data/**
Any file under mom/api/services/ (no source change)
Any controller (no source change)
```

## STEP 1 — Capture pre-regen counts

```bash
echo "=== BEFORE ==="
jq '.statistics // .meta.statistics // {}' .ai/repo-map.json 2>/dev/null
jq 'keys | length' .ai/symbols.json 2>/dev/null
jq 'keys | length' .ai/contracts-map.json 2>/dev/null
echo ""
echo "Baseline from CLAUDE.md:"
grep -E "controllers, [0-9]+ services, [0-9]+ SQL migrations, [0-9]+ contract" CLAUDE.md
# Expected: "54 controllers, 122 services, 137 SQL migrations, and 67 contract objects"
```

Record these counts in the report.

## STEP 2 — Run the regen script

Try in order until one succeeds:

```bash
# Option A: top-level script
php tools/scripts/ai-index/generate.php --verbose

# Option B: under mom/
php mom/tools/scripts/ai-index/generate.php --verbose

# Option C: composer task
composer --working-dir=mom run ai:index

# Option D: any script the repo provides — look in mom/composer.json scripts
grep -A5 '"scripts"' mom/composer.json | head -20
```

If none of these succeed, document the missing tooling in the report and STOP. Decision: `AI_INDEX_REGEN_FAIL_BLOCK_NEXT`.

## STEP 3 — Verify integrity of regenerated files

```bash
echo "=== JSON parse check ==="
for f in .ai/repo-map.json .ai/route-map.json .ai/contracts-map.json .ai/symbols.json; do
  python3 -c "import json; json.load(open('$f'))" && echo "PASS $f" || echo "FAIL $f"
done

# db-map per-domain
for f in .ai/db-map/*.json; do
  python3 -c "import json; json.load(open('$f'))" && echo "PASS $f" || echo "FAIL $f"
done
```

All must PASS or revert and STOP.

## STEP 4 — Cross-check stats

```bash
echo "=== AFTER ==="
jq '.statistics // .meta.statistics // {}' .ai/repo-map.json 2>/dev/null

# Count controllers
jq '[.controllers // .files.controllers // .[]] | flatten | length' .ai/repo-map.json 2>/dev/null

# Count services
jq '[.services // .files.services // .[]] | flatten | length' .ai/repo-map.json 2>/dev/null

# Count migrations (probably under db-map)
ls mom/api/migrations/*.sql | wc -l

# Count contract objects
ls mom/contracts/objects/**/*.{md,json,yaml} 2>/dev/null | wc -l
```

The structure of the JSON depends on how the regen script outputs. Adapt the jq queries to the actual schema (use `jq 'keys'` to discover top-level keys first).

## STEP 5 — Spot-check HMV4 surface coverage

The regenerated `.ai/symbols.json` should now include the new HMV4 functions added in V18 (NC) and any from Slice 3 if it's landed:

```bash
echo "=== HMV4 symbol coverage ==="
jq '.symbols // .[] | select(type=="object") | select(.name // "" | contains("renderNonconformanceRecord"))' .ai/symbols.json | head -10
jq '.symbols // .[] | select(type=="object") | select(.name // "" | contains("renderDispatchBoardWorkspace"))' .ai/symbols.json | head -10
jq '.symbols // .[] | select(type=="object") | select(.name // "" | contains("renderTrainingMatrixWorkspace"))' .ai/symbols.json | head -10
```

If renderNonconformanceRecord and renderDispatchBoardWorkspace are missing, the regen script may not be parsing JS files. Document this gap.

```bash
echo "=== Route catalog coverage ==="
jq '.routes // .[] | select(type=="object") | select(.path // "" | contains("/ops/records/nonconformance-cases"))' .ai/route-map.json | head -5
```

If route-map.json is purely backend-route-focused (no frontend `/ops/...` routes), that's expected — frontend HMV4 routes live in JS, not API specs. Document this.

## STEP 6 — Update CLAUDE.md baseline counts (if changed)

If controller/service/migration/contract counts have changed, update CLAUDE.md line:

```text
This repository has 54 controllers, 122 services, 137 SQL migrations, and 67 contract objects.
```

Replace with current counts. ONLY edit this line and ONLY if it diverges from current.

## STEP 7 — Generate report

Create `_reports/module-template-v4/S_DOCS_AI_INDEX_REGEN_REPORT.md`:

```markdown
# .ai/ Index Regeneration Report

## Summary
The .ai/ knowledge index has been regenerated to reflect repo state as of
2026-04-25 with Slice 1 + Slice 2 + V20 planning + parallel B/D/E work.

## Branch and working tree
- Branch: codex/docs-ai-index-regen
- Base: origin/main

## Files regenerated (count + paths)
- .ai/repo-map.json
- .ai/route-map.json
- .ai/db-map/*.json (N files)
- .ai/contracts-map.json
- .ai/symbols.json
Files preserved (NOT regenerated):
- .ai/module-summaries/*.md (12 files, hand-authored)

## Statistics: before vs after
| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Controllers | ... | ... | +/- |
| Services | ... | ... | +/- |
| SQL migrations | ... | ... | +/- |
| Contract objects | ... | ... | +/- |
| Routes | ... | ... | +/- |
| Symbols | ... | ... | +/- |

## CLAUDE.md baseline counts updated
- (yes / no, with diff)

## HMV4 surface coverage in symbols
- renderDispatchBoardWorkspace: FOUND / MISSING
- renderNonconformanceRecord: FOUND / MISSING
- renderTrainingMatrixWorkspace: FOUND / MISSING (only if Slice 3 has landed)

## Frontend route coverage in route-map
- /ops/records/nonconformance-cases entries: NONE (expected — frontend routes are JS-resident)
- (or list any unexpected matches)

## JSON parse verification
- PASS for all regenerated JSON files

## Remaining warnings
- (regen script behaviour, unexpected schema, etc.)

## Decision
AI_INDEX_REGEN_PASS_READY_FOR_REVIEW
AI_INDEX_REGEN_PASS_WITH_WARNINGS
AI_INDEX_REGEN_FAIL_BLOCK_NEXT
```

## STEP 8 — Commit and push

```bash
git add .ai/repo-map.json \
        .ai/route-map.json \
        .ai/db-map/ \
        .ai/contracts-map.json \
        .ai/symbols.json \
        CLAUDE.md \
        _reports/module-template-v4/S_DOCS_AI_INDEX_REGEN_REPORT.md

git commit -m "chore(.ai): regenerate index after Slice 1+2 + parallel B/D/E

Refreshes .ai/ knowledge index to reflect repo state as of Slice 2 NC
implementation + Slice 0.5 GA cleanup + ADR program + axe-core integration.

Module summary files preserved (hand-authored).
Baseline counts in CLAUDE.md updated if changed."

git push -u origin codex/docs-ai-index-regen
```

## ROLLBACK PROCEDURE

```bash
git checkout main
git branch -D codex/docs-ai-index-regen
# After push: git push origin --delete codex/docs-ai-index-regen

# To revert just the index (keeps the report):
git checkout main -- .ai/
```

Pure regeneration — old indices can be restored from any prior commit.

## DECISION PHRASE OUTPUT

Return ONE of:

```text
AI_INDEX_REGEN_PASS_READY_FOR_REVIEW
AI_INDEX_REGEN_PASS_WITH_WARNINGS
AI_INDEX_REGEN_FAIL_BLOCK_NEXT
```
