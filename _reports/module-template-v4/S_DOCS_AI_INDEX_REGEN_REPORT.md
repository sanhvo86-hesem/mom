# S_DOCS_AI_INDEX_REGEN_REPORT

**Stream:** E1 (Documentation — `.ai/` index regeneration)
**Date:** 2026-04-25
**Branch:** `codex/second-slice-planning-from-dispatch-qa`
**Operator:** Claude Code local
**Decision phrase:** `AI_INDEX_REGEN_PASS_WITH_WARNINGS`

---

## Summary

Re-ran `php tools/scripts/ai-index/generate.php --verbose` after Slice 1
(DISP) + Slice 2 (NQCASE) + Stream B/D/E deliverables landed. All 19
files under `.ai/` were rewritten, but every diff is timestamp-only —
the source-code state captured by the generator was already current as
of the previous regen on 2026-04-24 (commit `2451181d chore: refresh
ai index after vps health fix`). The intervening commits added CSS
tokens, ADR docs, axe-core spec, GitHub Actions workflow, and HMV4 JS
fixtures — none of which are picked up by the PHP-class indexer.

The `CLAUDE.md` baseline ("54 controllers, 122 services, 137 SQL
migrations, 67 contract objects") was much older than `2451181d` and
has been corrected to the current values (89 / 124 / 158 / 68).

## Files regenerated

All paths relative to repo root; all written by
`tools/scripts/ai-index/generate.php`.

| File | Bytes | JSON parse |
|---|---|---|
| `.ai/repo-map.json` | 4 140 | PASS |
| `.ai/route-map.json` | 367 | PASS |
| `.ai/db-map.json` (compact) | 311 845 | PASS |
| `.ai/db-map/index.json` | 31 674 | PASS |
| `.ai/db-map/analytics.json` | 3 423 | PASS |
| `.ai/db-map/commercial-customer.json` | 4 358 | PASS |
| `.ai/db-map/finance.json` | 2 765 | PASS |
| `.ai/db-map/integration-resilience.json` | 613 | PASS |
| `.ai/db-map/inventory-logistics.json` | 7 349 | PASS |
| `.ai/db-map/maintenance-ehs.json` | 6 834 | PASS |
| `.ai/db-map/master-data.json` | 5 759 | PASS |
| `.ai/db-map/mes-execution.json` | 2 110 | PASS |
| `.ai/db-map/planning-production.json` | 7 980 | PASS |
| `.ai/db-map/procurement-supplier-quality.json` | 12 673 | PASS |
| `.ai/db-map/quality-improvement.json` | 13 116 | PASS |
| `.ai/db-map/traceability-serialization.json` | 2 256 | PASS |
| `.ai/db-map/unclassified.json` | 380 773 | PASS |
| `.ai/symbols.json` | 73 886 | PASS |
| `.ai/contracts-map.json` | 62 512 | PASS |

`.ai/module-summaries/*.md` were intentionally NOT regenerated (the
generator preserves hand-authored summaries — confirmed by the
"SKIP (exists)" output for all 12 domain files).

## Statistics: before vs after

Real content delta: **none** (only `_meta.generated_at` changed in
each of the 19 files).

| Metric | CLAUDE.md baseline (pre) | `.ai/repo-map.json` (now) | Source |
|---|---|---|---|
| Controllers | 54 | **89** | `.counts.controllers` |
| Services | 122 | **124** | `.counts.services` |
| Middleware | (not stated) | 6 | `.counts.middleware` |
| SQL migrations | 137 | **158** | `.counts.migrations` |
| DB tables | (not stated) | 839 | `.counts.db_tables` |
| Contract objects | 67 | **68** | `.counts.contracts` |
| PHP classes (symbols.json) | (not stated) | 219 | `.symbols \| length` |
| Domains | 12 | 12 | `.domains \| length` |
| Action routes | (not stated) | 0 | `.counts.action_routes` |
| REST routes | (not stated) | 0 | `.counts.rest_routes` |

**Domain list** (matches CLAUDE.md table — 12 entries):
```
analytics, commercial_customer, finance, integration_resilience,
inventory_logistics, maintenance_ehs, master_data, mes_execution,
planning_production, procurement_supplier_quality,
quality_improvement, traceability_serialization
```

## CLAUDE.md baseline counts updated

`CLAUDE.md:165` — replaced
> "54 controllers, 122 services, 137 SQL migrations, and 67 contract
> objects"

with
> "89 controllers, 124 services, 158 SQL migrations, and 68 contract
> objects (across 839 tables and 12 domains)"

`CLAUDE.md:172` — corrected the soft size hint for `.ai/db-map.json`
from `(280K)` to `(~305K)` to match the current regeneration.

No other CLAUDE.md content modified. The drift was already present
before today: the prior regen (commit `2451181d` on 2026-04-24) had
already captured 89 controllers, but CLAUDE.md was last reconciled at
54.

## Verification

### Step 1 — Regenerate

```
$ php tools/scripts/ai-index/generate.php --verbose
…
Done. Index written to .ai/
  repo-map.json     — 89 controllers, 124 services
  route-map.json    — 0 action routes, 0 REST routes
  db-map.json       — 839 tables from 158 migrations (compact)
  db-map/           — 13 domain files + index.json
  symbols.json      — 219 PHP classes indexed
  contracts-map.json— 68 contracts across 12 domains
  module-summaries/ — 12 domain files
```

### Step 2 — Inspect changes

```
$ git diff --numstat .ai/ | wc -l
19
$ git diff --numstat .ai/ | awk '{print $1"+ "$2"-"}' | sort -u
1+ 1-
```
All 19 files: +1 / -1 (the `generated_at` line only).

### Step 3 — JSON parse integrity

```
PASS: .ai/repo-map.json
PASS: .ai/route-map.json
PASS: .ai/db-map/index.json
PASS: .ai/contracts-map.json
PASS: .ai/symbols.json
PASS: .ai/db-map.json (compact)
PASS: .ai/db-map/*.json (13 files)
```

### Step 5 — HMV4 renderer symbol grep

```
$ jq '.symbols[] | select(.name | contains("renderNonconformanceRecord"))' .ai/symbols.json
jq: error: null and string cannot have their containment checked
$ jq '.symbols[] | select(.name | contains("renderDispatchBoardWorkspace"))' .ai/symbols.json
jq: error: null and string cannot have their containment checked
```

Reason: the indexer scope is **PHP-only**. `.ai/symbols.json` records
PHP classes (with `class`, `namespace`, `methods` keys) — there is no
`name` key, and JS files are not visited. The HMV4 renderers exist as
JS functions:

| Function | Source location |
|---|---|
| `renderNonconformanceRecord` | [mom/scripts/portal/73-module-template-v4-renderers.js:170](mom/scripts/portal/73-module-template-v4-renderers.js:170) |
| `renderDispatchBoardWorkspace` | [mom/scripts/portal/73-module-template-v4-renderers.js:229](mom/scripts/portal/73-module-template-v4-renderers.js:229) |

This is a **scope limitation of the existing generator**, not a
regen failure. Recorded as a warning so future tooling work can
extend symbol indexing to JS.

## Warnings

1. **Symbols indexer is PHP-only.** Wave 1 frontend slice work
   produces JS functions that are invisible to `.ai/symbols.json`.
   Future improvement: extend `tools/scripts/ai-index/generate.php`
   to walk `mom/scripts/portal/*.js` and record exported functions.
2. **Route map is empty (`action_routes: 0`, `rest_routes: 0`).** The
   generator currently writes only the `_meta` envelope and empty
   arrays. CLAUDE.md still claims `route-map.json` is the way to
   "find which controller + method handles a given route" — this is
   aspirational, not factual today. Existing behavior unchanged from
   `2451181d`; not a regression. Tracked for separate work.
3. **`.ai/db-map/unclassified.json` holds 749 of 839 tables.** Most
   tables don't carry a domain owner in their migration. Not a
   blocker for today's slice work, but worth a future pass.
4. **CLAUDE.md baseline drift was multi-commit-old.** The old counts
   (54/122/137/67) predate at least the commit `2451181d`
   (2026-04-24). Recommend re-running `composer --working-dir=mom run
   ai:index` and reconciling CLAUDE.md after every major migration
   batch, not only after slice work.

## Decision

`AI_INDEX_REGEN_PASS_WITH_WARNINGS`

The regeneration itself is clean (all 19 files re-emitted, all parse,
no source-code drift since `2451181d`). The warnings above are
generator scope limitations or pre-existing blanks, not new defects
introduced by this regen. CLAUDE.md is now coherent with `.ai/` for
the first time in several commits.
