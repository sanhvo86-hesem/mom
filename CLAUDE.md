# HESEM MOM ERP — Claude Code Guide

## MANDATORY: Read Before Doing Anything

**Follow the 4-phase workflow in `.ai/AI-WORKFLOW.md` — no exceptions.**

Quick mandatory sequence every session:
1. Read `.ai/CONVENTIONS.md` — WHERE to put files
2. Read `.ai/repo-map.json` — project topology
3. Read `AGENTS.md` — governance rules
4. THEN locate → plan → execute → verify

**NEVER create files at repo root. NEVER place reports inside `mom/docs/`.**

## MANDATORY: Graphics Authority Link (no-hardcode rule)

**Every UI module resolves visual parameters through the Graphics Authority.
Never hardcode colors, font stacks, font sizes, spacing, radius, shadows,
motion durations, or any other visual token in JS, inline style, or HTML.**

- **Backend authority:** `graphics_token_catalog` + `graphics_token_value` tables
  (migration `148_graphics_authority_tables.sql`). Legacy file authority:
  `mom/data/config/design-system-config.json` — read via
  `DesignTokenCatalogService` so both JSON_ONLY and POSTGRES_PRIMARY modes work.
- **Frontend authority:** `window.GraphicsAuthority.tokens.read('<token_key>')`
  in `mom/scripts/portal/00bb-graphics-authority.js`. For CSS, bind to the
  `css_variable` declared in `graphics_token_catalog` (e.g. `--brand-primary`).
- **Every edit widget must run a simulation scene before committing.** Use
  `ControlKit.*` widget factories — they already stage into the draft buffer
  and expose a Simulate button. Never build a new edit UI that writes directly
  to `HmTheme.saveAdminConfig` or bypasses `PreviewScenes.openSimulationModal`.
- **Adding a new visual parameter:** add a row to `graphics_token_catalog`
  (via a new migration or the admin UI), declare it in the appropriate
  `graphics_component_contract.overridable_tokens` array, add a renderer to
  `PreviewScenes.renderers` if the parameter needs its own scene. Only then
  may a UI module call `GraphicsAuthority.tokens.read()` on the new token_key.
- **When editing an existing module:** before you add any visual literal,
  search `graphics_token_catalog` for an existing token; if one exists, use
  it; if not, add a token first. Hex colors in JS, `'16px'` string padding,
  inline font-family strings, and hardcoded motion durations in diff review
  will be rejected.
- **Preview / simulation is non-optional.** Every "save" action in an admin
  graphics UI MUST flow through `GraphicsAuthority.preview.simulate()` which
  records a row in `graphics_simulation_run` as evidence.
- **Bridge for legacy globals:** `_hmSet`, `_hmSetWithUnit`, and
  `_admGraphicsMarkChange` are preserved as aliases that delegate to
  `GraphicsAuthority.tokens.stage()` / `draft.recordChange()`. Do not call
  them in new code; use the namespaced API.

## MANDATORY: HMV4 Wave 1 Frontend Slice Program

The frontend redesign of HESEM Operations Platform follows a slice-based
prototype program known as **module-template-v4** (HMV4). Each slice is
one root × one pattern (workspace projection or authoritative record
shell).

**Reference documents** (always read these first):
- `_reports/module-template-v4/STRATEGIC_MASTER.md` — strategy + roadmap
- `_reports/module-template-v4/EXECUTIVE_REVIEW_FOR_GPT_PRO.md` — current state
- `_reports/module-template-v4/WAVE1_18_ROOT_SLICE_SEQUENCING_ROADMAP.md` — slice order
- `_reports/module-template-v4/UPGRADE_PROMPTS_MASTER_INDEX.md` — execution prompts
- `docs/adr/` — frozen architectural decisions

**Pre-production posture (FROZEN per ADR-0001)**:
- HMV4 is development/prototype only
- Wording: use `development/prototype`, `current portal safety`,
  `pre-production readiness`; AVOID `production go-live`,
  `production cutover`, `production release`
- All HMV4 surfaces feature-flagged INERT by default
- Fixture data only (no live API)
- No `mom/qms-data` registry promotion without explicit approval

**Forbidden files** (NEVER modify in HMV4 slice work, per ADR-0004):
- `mom/portal.html` (only feature-flag insertion allowed)
- `mom/styles/portal.main.css`
- `mom/styles/eqms-suite.css`
- `mom/styles/density-darkmode.css`
- `mom/scripts/portal/01-module-router.js`
- `mom/scripts/portal/02-state-auth-ui.js`
- `mom/scripts/portal/40-eqms-shell.js`

**HMV4 source files**:
- `mom/scripts/portal/70-module-template-v4-hydration.js`
- `mom/scripts/portal/71-module-template-v4-routes.js`
- `mom/scripts/portal/72-module-template-v4-bridge.js`
- `mom/scripts/portal/73-module-template-v4-renderers.js`
- `mom/scripts/portal/74-module-template-v4-fixtures.js` (fixture-only,
  NEVER loaded by `mom/portal.html`)
- `mom/styles/module-template-v4.tokens.css`
- `mom/styles/module-template-v4.css`
- `mom/templates/module-template-v4/module-template-v4.html`
- `tests/e2e/module-template-v4*.spec.ts` (4+ spec files)
- `tests/fixtures/module-template-v4/**` (JSON + HTML fixtures)

**Slice cycle** (per ADR-0005):

Each slice progresses through: planning → approval → implementation →
QA. Each step has its own Codex prompt with explicit allowed/forbidden
files and required output decision phrase. Reference prompt packs in
`_reports/module-template-v4/UPGRADE_PROMPT_PACK_<N>_*.md`.

**Quality gates per slice** (must all PASS):
1. Node syntax 70-74 (`node --check`)
2. JSON fixture parse (Python `json.loads` over `tests/fixtures/module-template-v4/**/*.json`)
3. Forbidden diff guard (`git diff --name-only | grep <forbidden patterns>` → no match)
4. No fixture production load (`grep "74-module-template-v4-fixtures" mom/portal.html` → no match)
5. Portal feature flag inert by default (`HMV4_PREVIEW_ENABLED=false`,
   `HMV4_FIXTURE_MODE=false`, `HMV4_DISABLE_MUTATION_LAUNCHERS=true`)
6. Playwright E2E 100% pass (`tests/e2e && npm run test:hmv4 -- --project=chromium`)
7. Graphics Authority compliance (no hex/px in JS, per ADR-0009)

**18 Wave 1 roots and current slice progression**:

- Slice 1: DISP (Dispatch Board, WS) — DONE
- Slice 2: NQCASE (Nonconformance Case Record Shell, AR) — DONE
- Slice 3: TRAIN (Training Matrix Workspace) — IN PROGRESS
- Slices 4–8: CAPA, CDOC, INSP, BREL, ECO (quality stream)
- Slices 9–12: JO, SO, WO, CPO (transactional stream)
- Slices 13–18: PO, QUO, PREC, LOT, IREV, MWO (RED roots, full backend)

**When opening this repo cold**:
1. Read `_reports/module-template-v4/STRATEGIC_MASTER.md` and
   `_reports/module-template-v4/EXECUTIVE_REVIEW_FOR_GPT_PRO.md` first
2. Identify current slice from
   `_reports/module-template-v4/WAVE1_18_ROOT_SLICE_SEQUENCING_ROADMAP.md`
3. Honor forbidden file list above
4. Use frozen vocabulary (14 domains, 18 roots, 9 route classes — per
   ADR-0002)
5. Maintain pre-production wording

## MANDATORY: DCC Document Header Standard (controlled docs under mom/docs/**)

**Every controlled QMS document under `mom/docs/**` MUST satisfy the DCC
header pattern.** No exceptions for new authorship.

- **Spec:** `mom/contracts/objects/quality_improvement--document-control/dcc-document-header.standard.md`
- **Audit (executable test):** `php mom/tools/dcc-batch/audit.php`
- **Migrate / fix (idempotent):** `php mom/tools/dcc-batch/migrate.php`

In short:
- Filename starts with the canonical doc code (e.g. `qms-man-001-…html`).
- `<head>` contains the DCC bootstrap `<script>` (after `</title>`).
- `<body>` contains a single `<div class="dcc-header" data-dcc-doc-code="…">`
  near the top of `<div class="page-body">`.
- A row exists in `dcc_document_header` keyed on the canonical code.
- NO legacy `<div class="form-header">`, `<div class="title">`, or
  `<div class="meta">` blocks remain.

**Filename is master** for: filename, slug, on-screen title in listing card.
**DB is master** for: doc_code (ID badge), VN subtitle, revision, owner,
approver, effective_date, status. Renderer
`mom/scripts/portal/11-dcc-header-renderer.js` fetches DB values via
`GET /api/v1/dcc/documents/{code}/header`.

When creating a new doc, copy the head bootstrap + body placeholder verbatim
from a recent peer (e.g. `mom/docs/operations/sops/01-SOP-100/sop-102-…html`).
When editing title / description, use the portal "Chỉnh Sửa Tài Liệu" modal —
it routes through `rename_doc` + DCC upsert. Never edit the inline
`data-dcc-bootstrap` JSON directly; the renderer overrides it on every
render so the edit will be lost.

## AI Context Loading Protocol

**ALWAYS read the index files FIRST before opening any source file.**
This repository has 54 controllers, 122 services, 137 SQL migrations, and 67 contract objects.
The `.ai/` directory is a pre-built knowledge index that lets you find the right file in seconds.

### Step-by-step context loading

1. **`.ai/repo-map.json`** — Start here. Project topology, namespace map, infra services, file counts.
2. **`.ai/route-map.json`** — Find which controller + method handles a given route or action key.
3. **`.ai/db-map/index.json`** — Grep for table name to find its domain. Then read `.ai/db-map/<domain>.json` for full details. Do NOT read the full `.ai/db-map.json` (280K) unless you need cross-domain analysis.
4. **`.ai/contracts-map.json`** — Find which domain owns a resource and which table stores it.
5. **`.ai/symbols.json`** — Grep for a class or method name to find its file path. Do NOT read the full file.
6. **`.ai/module-summaries/<domain>.md`** — Business rules, gotchas, entry points for that domain.

**Only AFTER reading the index, open the minimal set of source files needed.**
Do NOT scan unrelated files. Do NOT read entire directories.

### Token-efficient lookup patterns

```
# Find which domain owns a table:
Grep "table_name" in .ai/db-map/index.json → get domain → Read .ai/db-map/<domain>.json

# Find which file contains a class:
Grep "ClassName" in .ai/symbols.json → get file path → Read that file

# Find which controller handles a route:
Grep "action_key" in .ai/route-map.json → get controller + method
```

### Domains

| Slug | Key | Summaries file |
|------|-----|----------------|
| Master Data | `master_data` | `.ai/module-summaries/master-data.md` |
| Planning & Production | `planning_production` | `.ai/module-summaries/planning-production.md` |
| Quality Improvement | `quality_improvement` | `.ai/module-summaries/quality-improvement.md` |
| Finance | `finance` | `.ai/module-summaries/finance.md` |
| Inventory & Logistics | `inventory_logistics` | `.ai/module-summaries/inventory-logistics.md` |
| Procurement | `procurement_supplier_quality` | `.ai/module-summaries/procurement.md` |
| Commercial & Customer | `commercial_customer` | `.ai/module-summaries/commercial-customer.md` |
| Maintenance & EHS | `maintenance_ehs` | `.ai/module-summaries/maintenance-ehs.md` |
| Analytics | `analytics` | `.ai/module-summaries/analytics.md` |
| MES Execution | `mes_execution` | `.ai/module-summaries/mes-execution.md` |
| Traceability | `traceability_serialization` | `.ai/module-summaries/traceability.md` |
| Core Infrastructure | `core_infrastructure` | `.ai/module-summaries/core-infrastructure.md` |

### When proposing changes, always state

- Which module/domain is affected
- Which endpoint(s) are involved (`route-map.json`)
- Which table(s) are read/written (`db-map/<domain>.json`)
- Regression surface (what else might break)

---

## Project overview

- **Stack:** PHP 8.5+, PostgreSQL, Redis, RabbitMQ
- **Entry point:** `mom/api/index.php`
- **Autoload:** `mom/composer.json` (PSR-4)
- **Namespaces:** `MOM\Api\Controllers\`, `MOM\Api\Services\`, `MOM\Services\`, `MOM\Database\`
- **Middleware pipeline:** CORS → ApiKey → Auth → RateLimit → Audit
- **Data layer:** 4-mode strategy (JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY → POSTGRES_ONLY)

## Re-generating the index

When source files change significantly, re-run:

```bash
php tools/scripts/ai-index/generate.php --verbose
# or
composer --working-dir=mom run ai:index
```

JSON files are fully regenerated. Module summary `.md` files are never overwritten.
